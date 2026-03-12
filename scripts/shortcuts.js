// ── CTRL Global Keyboard Shortcuts ──
// Provides OS-level keyboard shortcuts for window management,
// app launching, navigation, and system actions.

(function () {
    'use strict';

    // ── Shortcut Registry ──
    // Each entry: { modifiers: Set, key: string, action: Function, inputSafe: boolean }
    // inputSafe: true means the shortcut fires even when a text input is focused
    const _shortcuts = [];

    function registerShortcut(modifiers, key, action, inputSafe = false) {
        _shortcuts.push({
            modifiers: new Set(modifiers.map(m => m.toLowerCase())),
            key: key.toLowerCase(),
            action,
            inputSafe
        });
    }

    function matchesShortcut(e, shortcut) {
        const pressed = new Set();
        if (e.ctrlKey) pressed.add('ctrl');
        if (e.altKey) pressed.add('alt');
        if (e.shiftKey) pressed.add('shift');
        if (e.metaKey) pressed.add('meta');

        if (shortcut.modifiers.size !== pressed.size) return false;
        for (const mod of shortcut.modifiers) {
            if (!pressed.has(mod)) return false;
        }
        return e.key.toLowerCase() === shortcut.key;
    }

    // ── Utility: Get focused (topmost) window ──
    function getFocusedWindow() {
        const winKeys = Object.keys(winds);
        if (winKeys.length === 0) return null;

        let topKey = null;
        let topZ = -Infinity;
        for (const key of winKeys) {
            const el = document.getElementById('window' + key);
            if (!el) continue;
            if (winds[key].visualState === 'minimized') continue;
            const z = Number(winds[key].zIndex) || 0;
            if (z > topZ) {
                topZ = z;
                topKey = key;
            }
        }
        return topKey;
    }

    // Make it globally available for other modules
    window.getFocusedWindow = getFocusedWindow;

    // ── Alt+Tab Window Switcher ──
    const _switcher = {
        active: false,
        selectedIndex: 0,
        windowOrder: [],
        overlay: null,
        altHeld: false
    };

    function buildSwitcherOverlay() {
        let overlay = document.getElementById('window-switcher');
        if (!overlay) {
            overlay = document.createElement('div');
            overlay.id = 'window-switcher';
            overlay.setAttribute('role', 'dialog');
            overlay.setAttribute('aria-label', 'Window Switcher');
            document.body.appendChild(overlay);
        }
        _switcher.overlay = overlay;
        return overlay;
    }

    function getSortedWindowKeys() {
        return Object.keys(winds)
            .filter(k => {
                const el = document.getElementById('window' + k);
                return el && winds[k].visualState !== 'hidden';
            })
            .sort((a, b) => (Number(winds[b].zIndex) || 0) - (Number(winds[a].zIndex) || 0));
    }

    function showSwitcher(direction) {
        const winKeys = getSortedWindowKeys();
        if (winKeys.length < 1) return;

        _switcher.windowOrder = winKeys;
        _switcher.active = true;

        // If direction is forward, start at index 1 (next window); backward at last
        if (direction === 'forward') {
            _switcher.selectedIndex = winKeys.length > 1 ? 1 : 0;
        } else {
            _switcher.selectedIndex = winKeys.length - 1;
        }

        renderSwitcher();
    }

    function cycleSwitcher(direction) {
        if (!_switcher.active) return;
        const len = _switcher.windowOrder.length;
        if (len === 0) return;

        if (direction === 'forward') {
            _switcher.selectedIndex = (_switcher.selectedIndex + 1) % len;
        } else {
            _switcher.selectedIndex = (_switcher.selectedIndex - 1 + len) % len;
        }
        renderSwitcher();
    }

    function renderSwitcher() {
        const overlay = buildSwitcherOverlay();
        overlay.innerHTML = '';

        const maxVisible = 8;
        const winKeys = _switcher.windowOrder;
        const total = winKeys.length;
        const startIdx = total > maxVisible
            ? Math.max(0, Math.min(_switcher.selectedIndex - Math.floor(maxVisible / 2), total - maxVisible))
            : 0;
        const endIdx = Math.min(startIdx + maxVisible, total);

        for (let i = startIdx; i < endIdx; i++) {
            const key = winKeys[i];
            const wind = winds[key];
            const item = document.createElement('div');
            item.className = 'window-switcher-item' + (i === _switcher.selectedIndex ? ' selected' : '');

            const iconContainer = document.createElement('div');
            iconContainer.className = 'window-switcher-icon';
            // Try to get the app icon from the taskbar shortcut 
            const taskbarIcon = document.querySelector(`.app-shortcut[winid="${key}"] .appicnspan`);
            if (taskbarIcon) {
                iconContainer.innerHTML = taskbarIcon.innerHTML;
            } else {
                // Fallback: use a generic window icon
                iconContainer.innerHTML = '<span class="material-symbols-outlined" style="font-size:32px;color:var(--col-txt1,#fff)">web_asset</span>';
            }

            const title = document.createElement('div');
            title.className = 'window-switcher-title';
            title.textContent = typeof basename === 'function' ? basename(wind.title || '') : (wind.title || 'Window');

            item.appendChild(iconContainer);
            item.appendChild(title);
            overlay.appendChild(item);
        }

        // Show scroll indicators if needed
        if (total > maxVisible) {
            const indicator = document.createElement('div');
            indicator.className = 'window-switcher-scroll-hint';
            indicator.textContent = `${_switcher.selectedIndex + 1} / ${total}`;
            overlay.appendChild(indicator);
        }

        overlay.classList.add('visible');
    }

    function confirmSwitcher() {
        if (!_switcher.active) return;
        const winKeys = _switcher.windowOrder;
        if (winKeys.length > 0 && winKeys[_switcher.selectedIndex]) {
            const selectedKey = winKeys[_switcher.selectedIndex];
            // Restore if minimized
            if (winds[selectedKey] && winds[selectedKey].visualState === 'minimized') {
                minim(selectedKey);
            }
            putwinontop('window' + selectedKey);
        }
        dismissSwitcher();
    }

    function dismissSwitcher() {
        _switcher.active = false;
        _switcher.windowOrder = [];
        _switcher.selectedIndex = 0;
        const overlay = document.getElementById('window-switcher');
        if (overlay) {
            overlay.classList.remove('visible');
            overlay.classList.add('dismissing');
            setTimeout(() => {
                overlay.classList.remove('dismissing');
                overlay.innerHTML = '';
            }, 200);
        }
    }

    // ── Super (Meta) key detection for lone press ──
    let _metaDownTime = 0;
    let _metaWasAlone = false;

    // ── Show Desktop (minimize all / restore all) ──
    let _allMinimized = false;
    let _preShowDesktopStates = {};

    function toggleShowDesktop() {
        const winKeys = Object.keys(winds);
        if (winKeys.length === 0) return;

        const visibleWindows = winKeys.filter(k => {
            const el = document.getElementById('window' + k);
            return el && winds[k].visualState !== 'minimized';
        });

        if (visibleWindows.length > 0) {
            // Minimize all visible windows
            _preShowDesktopStates = {};
            for (const key of winKeys) {
                _preShowDesktopStates[key] = winds[key].visualState;
            }
            for (const key of visibleWindows) {
                minim(key);
            }
            _allMinimized = true;
        } else if (_allMinimized) {
            // Restore previously visible windows
            for (const key of winKeys) {
                if (_preShowDesktopStates[key] && _preShowDesktopStates[key] !== 'minimized') {
                    if (winds[key] && winds[key].visualState === 'minimized') {
                        minim(key); // toggles back to visible
                    }
                }
            }
            _allMinimized = false;
            _preShowDesktopStates = {};
        }
    }

    // ── Ctrl+Alt+Delete system menu ──
    function showSystemMenu() {
        let menu = document.getElementById('system-menu-overlay');
        if (menu) {
            menu.remove();
            return;
        }

        menu = document.createElement('div');
        menu.id = 'system-menu-overlay';

        const panel = document.createElement('div');
        panel.className = 'system-menu-panel';

        const title = document.createElement('h2');
        title.textContent = 'System';
        title.style.cssText = 'margin:0 0 20px;font-size:18px;font-weight:600;color:#fff;text-align:center;';
        panel.appendChild(title);

        const actions = [
            {
                icon: 'lock',
                label: 'Lock',
                action: () => {
                    closeSystemMenu();
                    lockScreen();
                }
            },
            {
                icon: 'logout',
                label: 'Sign Out',
                action: () => {
                    closeSystemMenu();
                    if (typeof signOut === 'function') {
                        signOut();
                    } else {
                        lockScreen();
                    }
                }
            },
            {
                icon: 'settings',
                label: 'Settings',
                action: () => {
                    closeSystemMenu();
                    if (typeof useHandler === 'function') {
                        useHandler('settings_manager');
                    } else if (typeof openfile === 'function') {
                        openfile('settings');
                    }
                }
            },
            {
                icon: 'list_alt',
                label: 'Task Manager',
                action: () => {
                    showTaskManager();
                }
            }
        ];

        for (const a of actions) {
            const btn = document.createElement('button');
            btn.className = 'system-menu-btn';
            btn.innerHTML = `<span class="material-symbols-outlined">${a.icon}</span><span>${a.label}</span>`;
            btn.addEventListener('click', a.action);
            panel.appendChild(btn);
        }

        // Close button
        const closeBtn = document.createElement('button');
        closeBtn.className = 'system-menu-btn system-menu-close';
        closeBtn.innerHTML = '<span class="material-symbols-outlined">close</span><span>Cancel</span>';
        closeBtn.addEventListener('click', closeSystemMenu);
        panel.appendChild(closeBtn);

        menu.appendChild(panel);
        document.body.appendChild(menu);

        // Close on backdrop click
        menu.addEventListener('click', (e) => {
            if (e.target === menu) closeSystemMenu();
        });
    }

    function closeSystemMenu() {
        const menu = document.getElementById('system-menu-overlay');
        if (menu) {
            menu.classList.add('dismissing');
            setTimeout(() => menu.remove(), 200);
        }
    }

    function showTaskManager() {
        closeSystemMenu();

        let tm = document.getElementById('task-manager-overlay');
        if (tm) { tm.remove(); return; }

        tm = document.createElement('div');
        tm.id = 'task-manager-overlay';

        const panel = document.createElement('div');
        panel.className = 'task-manager-panel';

        const header = document.createElement('div');
        header.className = 'task-manager-header';
        header.innerHTML = '<h2 style="margin:0;font-size:16px;font-weight:600;color:#fff;">Task Manager</h2>';
        const closeBtn = document.createElement('button');
        closeBtn.className = 'task-manager-close';
        closeBtn.innerHTML = '<span class="material-symbols-outlined">close</span>';
        closeBtn.addEventListener('click', () => {
            tm.classList.add('dismissing');
            setTimeout(() => tm.remove(), 200);
        });
        header.appendChild(closeBtn);
        panel.appendChild(header);

        const list = document.createElement('div');
        list.className = 'task-manager-list';

        const winKeys = Object.keys(winds);
        if (winKeys.length === 0) {
            const empty = document.createElement('div');
            empty.className = 'task-manager-empty';
            empty.textContent = 'No windows open';
            list.appendChild(empty);
        } else {
            for (const key of winKeys) {
                const wind = winds[key];
                const row = document.createElement('div');
                row.className = 'task-manager-row';

                const iconEl = document.createElement('div');
                iconEl.className = 'task-manager-icon';
                const taskbarIcon = document.querySelector(`.app-shortcut[winid="${key}"] .appicnspan`);
                if (taskbarIcon) {
                    iconEl.innerHTML = taskbarIcon.innerHTML;
                } else {
                    iconEl.innerHTML = '<span class="material-symbols-outlined" style="font-size:20px">web_asset</span>';
                }

                const nameEl = document.createElement('div');
                nameEl.className = 'task-manager-name';
                nameEl.textContent = typeof basename === 'function' ? basename(wind.title || '') : (wind.title || 'Window');

                const stateEl = document.createElement('div');
                stateEl.className = 'task-manager-state';
                stateEl.textContent = wind.visualState || 'free';

                const endBtn = document.createElement('button');
                endBtn.className = 'task-manager-end';
                endBtn.textContent = 'End';
                endBtn.addEventListener('click', () => {
                    clwin(key);
                    // Refresh task manager
                    row.classList.add('dismissing');
                    setTimeout(() => row.remove(), 200);
                    // If no more windows, show empty message
                    if (Object.keys(winds).length === 0) {
                        list.innerHTML = '<div class="task-manager-empty">No windows open</div>';
                    }
                });

                row.appendChild(iconEl);
                row.appendChild(nameEl);
                row.appendChild(stateEl);
                row.appendChild(endBtn);
                list.appendChild(row);
            }
        }

        panel.appendChild(list);
        tm.appendChild(panel);
        document.body.appendChild(tm);

        tm.addEventListener('click', (e) => {
            if (e.target === tm) {
                tm.classList.add('dismissing');
                setTimeout(() => tm.remove(), 200);
            }
        });
    }

    function lockScreen() {
        if (typeof window.lockScreen === 'function') {
            window.lockScreen();
        }
    }

    function toggleAppLauncher() {
        const appdmod = document.getElementById('appdmod');
        if (!appdmod) return;

        if (appdmod.open) {
            appdmod.close();
        } else {
            if (typeof openn === 'function') {
                openn();
            } else {
                appdmod.showModal();
            }
        }
    }

    function isInputFocused() {
        const tag = document.activeElement?.tagName;
        return tag === 'INPUT' || tag === 'TEXTAREA' || document.activeElement?.isContentEditable;
    }

    // ── Register All Shortcuts ──

    // Alt+F4 — Close focused window
    registerShortcut(['alt'], 'f4', (e) => {
        e.preventDefault();
        const focused = getFocusedWindow();
        if (focused) clwin(focused);
    });

    // Ctrl+W — Close focused window (only when no input focused)
    registerShortcut(['ctrl'], 'w', (e) => {
        const focused = getFocusedWindow();
        if (focused) {
            e.preventDefault();
            clwin(focused);
        }
    });

    // Super+L — Lock screen 
    registerShortcut(['meta'], 'l', (e) => {
        e.preventDefault();
        lockScreen();
    });

    // Ctrl+Alt+L — Lock screen (alternative)
    registerShortcut(['ctrl', 'alt'], 'l', (e) => {
        e.preventDefault();
        lockScreen();
    });

    // Super+D — Show desktop (minimize/restore all)
    registerShortcut(['meta'], 'd', (e) => {
        e.preventDefault();
        toggleShowDesktop();
    });

    // Super+E — Open file manager
    registerShortcut(['meta'], 'e', (e) => {
        e.preventDefault();
        if (typeof useHandler === 'function') {
            useHandler('file_manager');
        } else if (typeof openfile === 'function') {
            openfile('files');
        }
    });

    // Ctrl+Space — Open spotlight/search
    registerShortcut(['ctrl'], ' ', (e) => {
        e.preventDefault();
        // Try the search window dialog first
        const searchWindow = document.getElementById('searchwindow');
        if (searchWindow) {
            if (searchWindow.open) {
                searchWindow.close();
            } else if (typeof searchWindow.showModal === 'function') {
                searchWindow.showModal();
            }
            return;
        }
        // Fallback: open app launcher and focus search
        toggleAppLauncher();
        setTimeout(() => {
            const searchInput = document.getElementById('strtsear') || document.getElementById('CTRLmenusearchinp');
            if (searchInput) searchInput.focus();
        }, 100);
    });

    // F11 — Toggle browser fullscreen
    registerShortcut([], 'f11', (e) => {
        e.preventDefault();
        if (document.fullscreenElement) {
            document.exitFullscreen();
        } else {
            document.documentElement.requestFullscreen().catch(() => {});
        }
    });

    // Ctrl+Alt+Delete — System menu
    registerShortcut(['ctrl', 'alt'], 'delete', (e) => {
        e.preventDefault();
        showSystemMenu();
    }, true);

    // ── Main Keyboard Handler ──
    document.addEventListener('keydown', function _shortcutsKeyHandler(e) {
        // Handle Alt+Tab switcher
        if (e.key === 'Tab' && e.altKey && !e.ctrlKey && !e.metaKey) {
            e.preventDefault();
            if (!_switcher.active) {
                _switcher.altHeld = true;
                showSwitcher(e.shiftKey ? 'backward' : 'forward');
            } else {
                cycleSwitcher(e.shiftKey ? 'backward' : 'forward');
            }
            return;
        }

        // Escape dismisses switcher
        if (e.key === 'Escape' && _switcher.active) {
            e.preventDefault();
            dismissSwitcher();
            return;
        }

        // Track Meta key for lone-press detection
        if (e.key === 'Meta') {
            _metaDownTime = Date.now();
            _metaWasAlone = true;
            return;
        }
        // Any other key pressed while Meta is held → not alone
        if (e.metaKey) {
            _metaWasAlone = false;
        }

        // Check input focus for non-inputSafe shortcuts
        const inputFocused = isInputFocused();

        // Match against registry
        for (const shortcut of _shortcuts) {
            if (!shortcut.inputSafe && inputFocused) continue;
            if (matchesShortcut(e, shortcut)) {
                shortcut.action(e);
                return;
            }
        }
    }, true); // useCapture to intercept before other handlers

    // ── Meta (Super) lone-press detection ──
    document.addEventListener('keyup', function _shortcutsKeyUpHandler(e) {
        // Release Alt → confirm switcher selection
        if ((e.key === 'Alt' || e.key === 'Meta') && _switcher.active) {
            e.preventDefault();
            confirmSwitcher();
            return;
        }

        // Lone Meta press → toggle app launcher
        if (e.key === 'Meta' && _metaWasAlone) {
            const elapsed = Date.now() - _metaDownTime;
            if (elapsed < 500 && elapsed > 50) { // Between 50ms and 500ms
                e.preventDefault();
                toggleAppLauncher();
            }
        }
        _metaWasAlone = false;
    }, true);

    // ── Prevent Alt key from activating browser menu bar ──
    document.addEventListener('keydown', function(e) {
        if (e.altKey && e.key === 'Tab') {
            e.preventDefault();
        }
    });

    console.log('[CTRL] Keyboard shortcuts loaded');
})();
