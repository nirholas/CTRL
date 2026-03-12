/**
 * CTRL — Global Keyboard Shortcuts Framework
 * Provides a centralized hotkey registry, global keydown listener,
 * per-app shortcut scoping, and a shortcut help viewer.
 */
(function (global) {
    'use strict';

    /* ─────────── Hotkey Registry ─────────── */

    const hotkeyRegistry = new Map();
    const appHotkeyRegistry = new Map(); // appId -> Map<combo, { callback, description }>
    let _metaKeyDown = false;
    let _metaKeyUsedWithCombo = false;

    /**
     * Normalize a key combo string for consistent lookup.
     * Input: "Ctrl+Shift+F" → "ctrl+shift+f"
     * Modifiers are sorted alphabetically: alt, ctrl, meta, shift
     */
    function normalizeCombo(combo) {
        if (typeof combo !== 'string') return '';
        const parts = combo.toLowerCase().split('+').map(function (p) { return p.trim(); });
        const modifiers = [];
        let key = '';
        const modSet = new Set(['ctrl', 'alt', 'shift', 'meta', 'super']);

        for (var i = 0; i < parts.length; i++) {
            var p = parts[i];
            if (p === 'super') p = 'meta';
            if (modSet.has(p)) {
                modifiers.push(p);
            } else {
                key = p;
            }
        }
        modifiers.sort();
        if (key) modifiers.push(key);
        return modifiers.join('+');
    }

    /**
     * Register a global system hotkey.
     * @param {string} combo - Key combination, e.g. "Ctrl+Shift+F", "Alt+F4", "Super"
     * @param {Function} callback - Function to invoke when the combination is pressed.
     * @param {string} description - Human-readable description for the help viewer.
     */
    function registerHotkey(combo, callback, description) {
        if (typeof callback !== 'function') return;
        var normalized = normalizeCombo(combo);
        if (!normalized) return;
        hotkeyRegistry.set(normalized, {
            callback: callback,
            description: description || '',
            combo: combo
        });
    }

    /**
     * Unregister a global hotkey.
     * @param {string} combo - Key combination to remove.
     */
    function unregisterHotkey(combo) {
        hotkeyRegistry.delete(normalizeCombo(combo));
    }

    /**
     * Register an app-scoped hotkey that only fires when that app's window is focused.
     * @param {string} appId - The window/app identifier (winuid).
     * @param {string} combo - Key combination.
     * @param {Function} callback - Function to invoke.
     * @param {string} description - Human-readable description.
     */
    function registerAppHotkey(appId, combo, callback, description) {
        if (typeof callback !== 'function' || !appId) return;
        var normalized = normalizeCombo(combo);
        if (!normalized) return;
        if (!appHotkeyRegistry.has(appId)) {
            appHotkeyRegistry.set(appId, new Map());
        }
        appHotkeyRegistry.get(appId).set(normalized, {
            callback: callback,
            description: description || '',
            combo: combo
        });
    }

    /**
     * Unregister an app-scoped hotkey.
     */
    function unregisterAppHotkey(appId, combo) {
        if (!appHotkeyRegistry.has(appId)) return;
        appHotkeyRegistry.get(appId).delete(normalizeCombo(combo));
    }

    /**
     * Remove all hotkeys for a given app (called when window closes).
     */
    function clearAppHotkeys(appId) {
        appHotkeyRegistry.delete(appId);
    }

    /**
     * Build the combo string from a keyboard event.
     */
    function comboFromEvent(event) {
        var parts = [];
        if (event.altKey) parts.push('alt');
        if (event.ctrlKey) parts.push('ctrl');
        if (event.metaKey) parts.push('meta');
        if (event.shiftKey) parts.push('shift');

        var key = event.key.toLowerCase();
        // Normalize special key names
        if (key === 'escape') key = 'escape';
        else if (key === 'delete') key = 'delete';
        else if (key === ' ') key = 'space';
        else if (key === 'arrowup') key = 'arrowup';
        else if (key === 'arrowdown') key = 'arrowdown';
        else if (key === 'arrowleft') key = 'arrowleft';
        else if (key === 'arrowright') key = 'arrowright';

        // Don't add modifier keys as the "key" part
        var modKeys = new Set(['control', 'alt', 'shift', 'meta', 'os']);
        if (!modKeys.has(key)) {
            parts.push(key);
        }

        parts.sort();
        return parts.join('+');
    }

    /**
     * Check if the active element is a text input field.
     */
    function isTypingInInput() {
        var el = document.activeElement;
        if (!el) return false;
        var tag = el.tagName.toLowerCase();
        if (tag === 'input') {
            var type = (el.type || 'text').toLowerCase();
            var textTypes = new Set(['text', 'password', 'email', 'search', 'url', 'tel', 'number']);
            return textTypes.has(type);
        }
        return tag === 'textarea' || tag === 'select' || el.isContentEditable;
    }

    // System-level combos that should work even when typing in input fields
    var systemLevelCombos = new Set();

    function markAsSystemLevel(combo) {
        systemLevelCombos.add(normalizeCombo(combo));
    }

    /* ─────────── Global Keydown Listener ─────────── */

    document.addEventListener('keydown', function (event) {
        // Track Meta key for standalone "Super" tap detection
        if (event.key === 'Meta' || event.key === 'OS') {
            _metaKeyDown = true;
            _metaKeyUsedWithCombo = false;
            return;
        }

        // If Meta is held and another key is pressed, it's a combo not a tap
        if (_metaKeyDown) {
            _metaKeyUsedWithCombo = true;
        }

        var combo = comboFromEvent(event);
        var typing = isTypingInInput();

        // Try app-scoped hotkeys first (only if that app's window is focused)
        if (typeof nowapp !== 'undefined' && nowapp && appHotkeyRegistry.has(nowapp)) {
            var appEntry = appHotkeyRegistry.get(nowapp).get(combo);
            if (appEntry && !typing) {
                event.preventDefault();
                event.stopPropagation();
                appEntry.callback(event);
                return;
            }
        }

        // Check global registry
        var entry = hotkeyRegistry.get(combo);
        if (entry) {
            // If typing in input, only fire system-level shortcuts
            if (typing && !systemLevelCombos.has(combo)) {
                return;
            }
            event.preventDefault();
            event.stopPropagation();
            entry.callback(event);
        }
    }, true); // Use capture phase to intercept before app handlers

    /* ─────────── Meta/Super Key Tap Detection ─────────── */

    document.addEventListener('keyup', function (event) {
        if ((event.key === 'Meta' || event.key === 'OS') && _metaKeyDown) {
            _metaKeyDown = false;
            if (!_metaKeyUsedWithCombo) {
                // Standalone Super key tap
                var superEntry = hotkeyRegistry.get('meta');
                if (superEntry) {
                    event.preventDefault();
                    superEntry.callback(event);
                }
            }
        }
    }, true);

    /* ─────────── Per-App Shortcut Context via postMessage ─────────── */

    window.addEventListener('message', function (event) {
        var msg = event.data;
        if (!msg || typeof msg !== 'object') return;

        if (msg.type === 'register-hotkey' && msg.combo && msg.appId) {
            registerAppHotkey(msg.appId, msg.combo, function () {
                // Forward the shortcut trigger back to the iframe
                if (event.source) {
                    event.source.postMessage({
                        type: 'hotkey-triggered',
                        combo: msg.combo
                    }, '*');
                }
            }, msg.description || '');
        }

        if (msg.type === 'unregister-hotkey' && msg.combo && msg.appId) {
            unregisterAppHotkey(msg.appId, msg.combo);
        }
    });

    /* ─────────── Window Cycling Helpers ─────────── */

    function getOrderedWindowKeys(reverse) {
        if (typeof winds === 'undefined') return [];
        var keys = Object.keys(winds).filter(function (k) {
            return document.getElementById('window' + k);
        });
        keys.sort(function (a, b) {
            var zA = Number(winds[a].zIndex) || 0;
            var zB = Number(winds[b].zIndex) || 0;
            return zA - zB;
        });
        if (reverse) keys.reverse();
        return keys;
    }

    function cycleWindows(reverse) {
        var keys = getOrderedWindowKeys(false);
        if (keys.length < 2) return;

        // Find the current top window
        var topKey = keys[keys.length - 1];
        var idx = keys.indexOf(topKey);
        var nextIdx;

        if (reverse) {
            // Current top goes behind; bring up the one on bottom
            nextIdx = 0;
        } else {
            // Cycle: bring the bottom-most window to front
            nextIdx = 0;
        }

        var nextKey = keys[nextIdx];
        var nextEl = document.getElementById('window' + nextKey);
        if (nextEl) {
            nextEl.style.display = 'flex';
            if (typeof winds !== 'undefined' && winds[nextKey]) {
                winds[nextKey].visualState = 'free';
            }
            if (typeof putwinontop === 'function') putwinontop('window' + nextKey);
            if (typeof nowapp !== 'undefined') {
                nowapp = nextKey;
            }
        }
    }

    function showDesktop() {
        if (typeof winds === 'undefined') return;
        var keys = Object.keys(winds);
        var allMinimized = keys.every(function (k) {
            return winds[k].visualState === 'minimized';
        });

        if (allMinimized) {
            // Restore all windows
            keys.forEach(function (k) {
                var el = document.getElementById('window' + k);
                if (el) {
                    el.style.display = 'flex';
                    winds[k].visualState = 'free';
                }
            });
        } else {
            // Minimize all windows
            keys.forEach(function (k) {
                var el = document.getElementById('window' + k);
                if (el) {
                    el.style.display = 'none';
                    winds[k].visualState = 'minimized';
                }
            });
        }
    }

    function lockScreen() {
        if (typeof window.lockScreen === 'function') {
            window.lockScreen();
        } else if (typeof showloginmod === 'function') {
            showloginmod();
        }
    }

    function toggleFullscreen() {
        if (typeof nowapp === 'undefined' || !nowapp) return;
        var winEl = document.getElementById('window' + nowapp);
        if (!winEl) return;
        if (typeof flwin === 'function') flwin(winEl);
    }

    function closeFocusedWindow() {
        if (typeof nowapp === 'undefined' || !nowapp) return;
        if (typeof clwin === 'function') clwin(nowapp);
        if (typeof loadtaskspanel === 'function') loadtaskspanel();
    }

    /* ─────────── Shortcut Help Viewer ─────────── */

    function showShortcutHelp() {
        var entries = [];
        hotkeyRegistry.forEach(function (val) {
            if (val.description) {
                entries.push({ combo: val.combo, description: val.description });
            }
        });

        entries.sort(function (a, b) {
            return a.combo.localeCompare(b.combo);
        });

        var tableRows = entries.map(function (e) {
            var comboDisplay = (typeof escapeHTML === 'function' ? escapeHTML(e.combo) : e.combo);
            var descDisplay = (typeof escapeHTML === 'function' ? escapeHTML(e.description) : e.description);
            return '<tr><td><kbd>' + comboDisplay + '</kbd></td><td>' + descDisplay + '</td></tr>';
        }).join('');

        var helpHTML = '<style>' +
            '* { box-sizing: border-box; margin: 0; padding: 0; }' +
            'body { font-family: system-ui, -apple-system, sans-serif; background: var(--col-bg1, #1a1a2e); color: var(--col-txt1, #e0e0e0); padding: 1.5rem; }' +
            'h2 { margin-bottom: 1rem; font-weight: 600; }' +
            'table { width: 100%; border-collapse: collapse; }' +
            'thead th { text-align: left; padding: 0.6rem 0.8rem; border-bottom: 2px solid rgba(255,255,255,0.15); font-weight: 600; font-size: 0.85rem; text-transform: uppercase; letter-spacing: 0.05em; }' +
            'tbody td { padding: 0.5rem 0.8rem; border-bottom: 1px solid rgba(255,255,255,0.07); }' +
            'kbd { display: inline-block; padding: 0.15rem 0.5rem; border-radius: 0.3rem; background: rgba(255,255,255,0.1); border: 1px solid rgba(255,255,255,0.2); font-family: monospace; font-size: 0.85rem; white-space: nowrap; }' +
            'tbody tr:hover { background: rgba(255,255,255,0.04); }' +
            '</style>' +
            '<h2>Keyboard Shortcuts</h2>' +
            '<table><thead><tr><th>Shortcut</th><th>Action</th></tr></thead>' +
            '<tbody>' + tableRows + '</tbody></table>';

        if (typeof openwindow === 'function') {
            openwindow('Keyboard Shortcuts', helpHTML, '<svg xmlns="http://www.w3.org/2000/svg" height="24" viewBox="0 -960 960 960" width="24" fill="currentColor"><path d="M160-200q-33 0-56.5-23.5T80-280v-400q0-33 23.5-56.5T160-760h640q33 0 56.5 23.5T880-680v400q0 33-23.5 56.5T800-200H160Zm0-80h640v-400H160v400Zm160-40h320v-80H320v80ZM200-440h80v-80h-80v80Zm120 0h80v-80h-80v80Zm120 0h80v-80h-80v80Zm120 0h80v-80h-80v80Zm120 0h80v-80h-80v80ZM200-560h80v-80h-80v80Zm120 0h80v-80h-80v80Zm120 0h80v-80h-80v80Zm120 0h80v-80h-80v80Zm120 0h80v-80h-80v80ZM160-280v-400 400Z"/></svg>');
        }
    }

    /* ─────────── Register Default System Shortcuts ─────────── */

    function registerDefaultShortcuts() {
        // Super key (Meta tap) — toggle app menu
        registerHotkey('Super', function () {
            if (typeof openn === 'function') openn();
        }, 'Open/close app menu');
        markAsSystemLevel('Super');

        // Alt+F4 — close focused window
        registerHotkey('Alt+F4', closeFocusedWindow, 'Close focused window');
        markAsSystemLevel('Alt+F4');

        // Ctrl+Q — close focused window
        registerHotkey('Ctrl+Q', closeFocusedWindow, 'Close focused window');
        markAsSystemLevel('Ctrl+Q');

        // Alt+Tab — cycle windows forward
        registerHotkey('Alt+Tab', function () {
            cycleWindows(false);
        }, 'Cycle windows forward');
        markAsSystemLevel('Alt+Tab');

        // Alt+Shift+Tab — cycle windows reverse
        registerHotkey('Alt+Shift+Tab', function () {
            cycleWindows(true);
        }, 'Cycle windows backward');
        markAsSystemLevel('Alt+Shift+Tab');

        // Ctrl+D — show desktop (minimize all)
        registerHotkey('Ctrl+D', showDesktop, 'Show desktop / Restore windows');

        // Ctrl+Shift+D — restore windows (same toggle behavior)
        registerHotkey('Ctrl+Shift+D', showDesktop, 'Restore all windows');

        // Ctrl+L — lock screen
        registerHotkey('Ctrl+L', lockScreen, 'Lock screen');
        markAsSystemLevel('Ctrl+L');

        // F11 — toggle fullscreen on focused window
        registerHotkey('F11', toggleFullscreen, 'Toggle fullscreen');
        markAsSystemLevel('F11');

        // Ctrl+Shift+Esc — open task manager
        registerHotkey('Ctrl+Shift+Escape', function () {
            if (typeof openapp === 'function') openapp('taskmanager', 1);
        }, 'Open Task Manager');
        markAsSystemLevel('Ctrl+Shift+Escape');

        // Ctrl+E — open file manager
        registerHotkey('Ctrl+E', function () {
            if (typeof openapp === 'function') openapp('files', 1);
        }, 'Open File Manager');

        // Ctrl+/ — open search panel
        registerHotkey('Ctrl+/', function () {
            if (typeof opensearchpanel === 'function') opensearchpanel();
        }, 'Open search');

        // Ctrl+Space — open app menu
        registerHotkey('Ctrl+Space', function () {
            if (typeof openn === 'function') openn();
        }, 'Open app menu');

        // Ctrl+? (Ctrl+Shift+/) — show keyboard shortcuts help
        registerHotkey('Ctrl+Shift+?', showShortcutHelp, 'Show keyboard shortcuts');
        registerHotkey('Ctrl+Shift+/', showShortcutHelp, 'Show keyboard shortcuts');

        // Ctrl+F — open files app
        registerHotkey('Ctrl+F', function () {
            if (typeof openapp === 'function') openapp('files', 1);
        }, 'Open Files');

        // Ctrl+S — open settings
        registerHotkey('Ctrl+S', function () {
            if (typeof openapp === 'function') openapp('settings', 1);
        }, 'Open Settings');

        // Ctrl+Alt+T — open terminal
        registerHotkey('Ctrl+Alt+T', function () {
            if (typeof openapp === 'function') openapp('terminal', 1);
        }, 'Open Terminal');

        // Ctrl+M — toggle Mission Control
        registerHotkey('Ctrl+M', function () {
            if (typeof toggleMissionControl === 'function') toggleMissionControl();
        }, 'Toggle Mission Control');

        // F3 — Mission Control
        registerHotkey('F3', function () {
            if (typeof toggleMissionControl === 'function') toggleMissionControl();
        }, 'Mission Control');

        // Ctrl+N — toggle Notification Center
        registerHotkey('Ctrl+N', function () {
            if (typeof toggleNotificationCenter === 'function') toggleNotificationCenter();
        }, 'Toggle Notification Center');
    }

    // Auto-register defaults on load
    registerDefaultShortcuts();

    /* ─────────── Get All Registered Shortcuts ─────────── */

    function getAllShortcuts() {
        var result = [];
        hotkeyRegistry.forEach(function (val, key) {
            result.push({
                combo: val.combo,
                normalized: key,
                description: val.description
            });
        });
        return result;
    }

    /* ─────────── Expose to Global Scope ─────────── */

    global.registerHotkey = registerHotkey;
    global.unregisterHotkey = unregisterHotkey;
    global.registerAppHotkey = registerAppHotkey;
    global.unregisterAppHotkey = unregisterAppHotkey;
    global.clearAppHotkeys = clearAppHotkeys;
    global.showShortcutHelp = showShortcutHelp;
    global.getAllShortcuts = getAllShortcuts;
    global.hotkeyRegistry = hotkeyRegistry;

})(typeof window !== 'undefined' ? window : globalThis);
