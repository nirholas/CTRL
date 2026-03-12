/**
 * CTRL Permissions & App Sandboxing Module
 * Provides a permission model that gates sensitive operations for apps.
 * Includes: permission registry, prompt UI, audit logging, persistence.
 */
(function (global) {
    'use strict';

    // ── Permission Type Definitions ──
    const PERMISSIONS = {
        'fs.read':        { label: 'Read Files',         description: 'Access your file system to read files',          risk: 'low' },
        'fs.write':       { label: 'Write Files',        description: 'Create, edit, or delete files',                  risk: 'medium' },
        'fs.delete':      { label: 'Delete Files',       description: 'Permanently delete files',                       risk: 'high' },
        'settings.read':  { label: 'Read Settings',      description: 'Read system settings',                           risk: 'low' },
        'settings.write': { label: 'Change Settings',    description: 'Modify system settings',                         risk: 'high' },
        'network':        { label: 'Network Access',     description: 'Connect to external servers',                    risk: 'medium' },
        'notifications':  { label: 'Send Notifications', description: 'Show desktop notifications',                     risk: 'low' },
        'apps.launch':    { label: 'Launch Apps',        description: 'Open other applications',                        risk: 'medium' },
        'clipboard':      { label: 'Clipboard Access',   description: 'Read or write the clipboard',                    risk: 'medium' },
        'camera':         { label: 'Camera Access',      description: 'Use the webcam',                                 risk: 'high' },
    };

    // ── Map NTX message actions → required permissions ──
    const ACTION_PERMISSIONS = {
        'fileGet.byId':            'fs.read',
        'fileGet.nameById':        'fs.read',
        'fileGet.detailsById':     'fs.read',
        'fileGet.byPath':          'fs.read',
        'fileSet.createFile':      'fs.write',
        'fileSet.updateFile':      'fs.write',
        'fileSet.removeFile':      'fs.delete',
        'fileSet.moveFile':        'fs.write',
        'dir.getFolderNames':      'fs.read',
        'dir.remove':              'fs.delete',
        'dir.create':              'fs.write',
        'olp.openFile':            'apps.launch',
        'olp.launch':              'apps.launch',
        'olp.useHandler':          'apps.launch',
        'settings.get':            'settings.read',
        'settings.set':            'settings.write',
        'settings.remove':         'settings.write',
        'settings.resetAll':       'settings.write',
        'settings.ensurePreferencesFile': 'settings.write',
        'sysUI.notify':            'notifications',
        'sysUI.toast':             'notifications',
    };

    // ── In-memory permission state ──
    // Structure: { [appId]: { 'fs.read': true, 'fs.write': false, ... } }
    let grantedPermissions = {};

    // ── Audit Log (rolling, in-memory + IndexedDB) ──
    const MAX_AUDIT_ENTRIES = 200;
    let auditLog = [];
    const AUDIT_DB_NAME = 'CTRL_AuditLog';
    const AUDIT_STORE_NAME = 'entries';

    // ── IndexedDB helpers for audit log ──
    function openAuditDB() {
        return new Promise((resolve, reject) => {
            const request = indexedDB.open(AUDIT_DB_NAME, 1);
            request.onupgradeneeded = (e) => {
                const db = e.target.result;
                if (!db.objectStoreNames.contains(AUDIT_STORE_NAME)) {
                    db.createObjectStore(AUDIT_STORE_NAME, { keyPath: 'id', autoIncrement: true });
                }
            };
            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
    }

    async function persistAuditEntry(entry) {
        try {
            const db = await openAuditDB();
            const tx = db.transaction(AUDIT_STORE_NAME, 'readwrite');
            const store = tx.objectStore(AUDIT_STORE_NAME);
            store.add(entry);

            // Trim to MAX_AUDIT_ENTRIES
            const countReq = store.count();
            countReq.onsuccess = () => {
                const count = countReq.result;
                if (count > MAX_AUDIT_ENTRIES) {
                    const deleteCount = count - MAX_AUDIT_ENTRIES;
                    const cursorReq = store.openCursor();
                    let deleted = 0;
                    cursorReq.onsuccess = (e) => {
                        const cursor = e.target.result;
                        if (cursor && deleted < deleteCount) {
                            cursor.delete();
                            deleted++;
                            cursor.continue();
                        }
                    };
                }
            };
            db.close();
        } catch (err) {
            console.error('Audit log persist failed:', err);
        }
    }

    async function loadAuditLog() {
        try {
            const db = await openAuditDB();
            const tx = db.transaction(AUDIT_STORE_NAME, 'readonly');
            const store = tx.objectStore(AUDIT_STORE_NAME);
            return new Promise((resolve, reject) => {
                const req = store.getAll();
                req.onsuccess = () => {
                    auditLog = req.result || [];
                    db.close();
                    resolve(auditLog);
                };
                req.onerror = () => {
                    db.close();
                    reject(req.error);
                };
            });
        } catch (err) {
            console.error('Audit log load failed:', err);
            return [];
        }
    }

    async function clearAuditLog() {
        try {
            const db = await openAuditDB();
            const tx = db.transaction(AUDIT_STORE_NAME, 'readwrite');
            tx.objectStore(AUDIT_STORE_NAME).clear();
            auditLog = [];
            db.close();
        } catch (err) {
            console.error('Audit log clear failed:', err);
        }
    }

    function addAuditEntry(appId, permission, action, auto) {
        const entry = {
            timestamp: Date.now(),
            appId: appId,
            permission: permission,
            action: action, // 'granted' | 'denied' | 'requested'
            auto: !!auto
        };
        auditLog.push(entry);
        if (auditLog.length > MAX_AUDIT_ENTRIES) {
            auditLog.shift();
        }
        persistAuditEntry(entry);
    }

    // ── Persistence: load/save to CTRL settings store ──
    async function loadPermissions() {
        try {
            if (typeof getSetting !== 'function') return;
            const stored = await getSetting('appPermissions', 'preferences.json', 'System/');
            if (stored && typeof stored === 'object') {
                grantedPermissions = stored;
            }
        } catch (err) {
            console.error('Permission load failed:', err);
        }
    }

    async function savePermissions() {
        try {
            if (typeof setSetting !== 'function') return;
            await setSetting('appPermissions', grantedPermissions, 'preferences.json', 'System/');
        } catch (err) {
            console.error('Permission save failed:', err);
        }
    }

    // ── Core Permission API ──

    /**
     * Check if an app has a specific permission.
     * Returns true/false/undefined (undefined = not yet decided).
     */
    function getPermissionState(appId, permission) {
        if (!grantedPermissions[appId]) return undefined;
        return grantedPermissions[appId][permission];
    }

    /**
     * Check if an app is a system app (gets all permissions automatically).
     */
    function isSystemApp(appId) {
        if (typeof defAppsList === 'undefined') return false;
        // System apps are those from defAppsList — we need to check if
        // the app's file name matches one of the defaults
        // This is done by looking up registry data
        return false; // Will be resolved by checking perms includes 'unsandboxed'
    }

    /**
     * Check if an app has been granted a permission.
     * System apps and apps with 'unsandboxed' permission always return true.
     */
    function hasPermission(appId, permission, appPerms) {
        // System apps or unsandboxed get everything
        if (appPerms && (appPerms.includes('unsandboxed') || appPerms.includes('system'))) {
            return true;
        }
        const state = getPermissionState(appId, permission);
        return state === true;
    }

    /**
     * Grant a permission to an app.
     */
    function grantPermission(appId, permission, remember) {
        if (!grantedPermissions[appId]) grantedPermissions[appId] = {};
        grantedPermissions[appId][permission] = true;
        addAuditEntry(appId, permission, 'granted', false);
        if (remember !== false) savePermissions();
    }

    /**
     * Deny a permission for an app.
     */
    function denyPermission(appId, permission, remember) {
        if (!grantedPermissions[appId]) grantedPermissions[appId] = {};
        grantedPermissions[appId][permission] = false;
        addAuditEntry(appId, permission, 'denied', false);
        if (remember !== false) savePermissions();
    }

    /**
     * Revoke a previously granted/denied permission (reset to undefined).
     */
    function revokePermission(appId, permission) {
        if (grantedPermissions[appId]) {
            delete grantedPermissions[appId][permission];
            if (Object.keys(grantedPermissions[appId]).length === 0) {
                delete grantedPermissions[appId];
            }
            savePermissions();
        }
    }

    /**
     * Reset all permissions for a specific app.
     */
    function resetAppPermissions(appId) {
        delete grantedPermissions[appId];
        savePermissions();
    }

    /**
     * Reset ALL permission decisions for ALL apps.
     */
    function resetAllPermissions() {
        grantedPermissions = {};
        savePermissions();
    }

    /**
     * Get all permissions for a specific app.
     */
    function getAppPermissions(appId) {
        return grantedPermissions[appId] || {};
    }

    /**
     * Get all stored permission data.
     */
    function getAllPermissions() {
        return { ...grantedPermissions };
    }

    /**
     * Get the permission definition for a permission key.
     */
    function getPermissionInfo(permKey) {
        return PERMISSIONS[permKey] || null;
    }

    /**
     * Get the required permission for an NTX action.
     */
    function getRequiredPermission(action) {
        return ACTION_PERMISSIONS[action] || null;
    }

    /**
     * Read declared permissions from app HTML content via meta tag.
     * <meta name="CTRL-permissions" content="fs.read,fs.write,notifications">
     */
    function extractAppDeclaredPermissions(htmlContent) {
        if (!htmlContent || typeof htmlContent !== 'string') return [];
        const parser = new DOMParser();
        const doc = parser.parseFromString(htmlContent, 'text/html');
        const meta = doc.querySelector('meta[name="CTRL-permissions"]');
        if (!meta) return [];
        const content = meta.getAttribute('content');
        if (!content) return [];
        return content.split(',').map(s => s.trim()).filter(s => PERMISSIONS[s]);
    }

    // ── Permission Prompt UI ──

    // Queue for sequential permission prompts (prevent overlapping modals)
    let promptQueue = [];
    let isPrompting = false;

    /**
     * Show a permission prompt modal to the user.
     * Returns a Promise that resolves to { granted: boolean, remember: boolean }.
     */
    function showPermissionPrompt(appId, permission) {
        return new Promise((resolve) => {
            promptQueue.push({ appId, permission, resolve });
            processPromptQueue();
        });
    }

    async function processPromptQueue() {
        if (isPrompting || promptQueue.length === 0) return;
        isPrompting = true;

        const { appId, permission, resolve } = promptQueue.shift();
        const permInfo = PERMISSIONS[permission] || { label: permission, description: 'Unknown permission', risk: 'medium' };

        // Get app name
        let appName = appId;
        try {
            if (typeof getFileNameByID === 'function') {
                const name = await getFileNameByID(appId);
                if (name) appName = name.replace(/\.[^.]+$/, '');
            }
        } catch (e) { /* fallback to appId */ }

        // Get app icon
        let appIconHTML = '';
        try {
            if (typeof getAppIcon === 'function') {
                appIconHTML = await getAppIcon(0, appId);
            }
        } catch (e) { /* no icon */ }

        // Risk-based colors
        const riskColors = {
            low:    { bg: 'rgba(76, 175, 80, 0.15)', border: '#4CAF50', text: '#4CAF50', icon: 'verified_user' },
            medium: { bg: 'rgba(255, 193, 7, 0.15)',  border: '#FFC107', text: '#FFC107', icon: 'shield' },
            high:   { bg: 'rgba(244, 67, 54, 0.15)',  border: '#F44336', text: '#F44336', icon: 'gpp_maybe' },
        };
        const riskStyle = riskColors[permInfo.risk] || riskColors.medium;

        addAuditEntry(appId, permission, 'requested', false);

        // Create modal
        const dialog = document.createElement('dialog');
        dialog.className = 'permission-prompt-modal';
        dialog.style.cssText = `
            position: fixed;
            z-index: 999999;
            border: none;
            border-radius: 16px;
            padding: 0;
            background: var(--col-bg1, #1a1a2e);
            color: var(--col-txt1, #e0e0e0);
            box-shadow: 0 20px 60px rgba(0,0,0,0.5), 0 0 0 1px rgba(255,255,255,0.08);
            max-width: 420px;
            width: 90vw;
            font-family: inherit;
            animation: permFadeIn 0.2s ease-out;
        `;

        dialog.innerHTML = `
            <style>
                @keyframes permFadeIn {
                    from { opacity: 0; transform: scale(0.95) translateY(10px); }
                    to { opacity: 1; transform: scale(1) translateY(0); }
                }
                .perm-prompt-inner {
                    padding: 24px;
                    display: flex;
                    flex-direction: column;
                    gap: 16px;
                }
                .perm-prompt-header {
                    display: flex;
                    align-items: center;
                    gap: 12px;
                }
                .perm-prompt-app-icon {
                    width: 48px;
                    height: 48px;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    border-radius: 12px;
                    background: var(--col-bg2, #252540);
                    flex-shrink: 0;
                }
                .perm-prompt-app-icon svg {
                    width: 32px;
                    height: 32px;
                }
                .perm-prompt-app-name {
                    font-size: 1.1rem;
                    font-weight: 600;
                }
                .perm-prompt-subtitle {
                    font-size: 0.85rem;
                    opacity: 0.65;
                }
                .perm-prompt-permission {
                    display: flex;
                    align-items: center;
                    gap: 12px;
                    padding: 14px;
                    border-radius: 12px;
                    background: ${riskStyle.bg};
                    border: 1px solid ${riskStyle.border}33;
                }
                .perm-prompt-perm-icon {
                    color: ${riskStyle.text};
                    font-size: 28px;
                    flex-shrink: 0;
                }
                .perm-prompt-perm-label {
                    font-weight: 600;
                    font-size: 0.95rem;
                }
                .perm-prompt-perm-desc {
                    font-size: 0.82rem;
                    opacity: 0.7;
                    margin-top: 2px;
                }
                .perm-prompt-risk-badge {
                    display: inline-block;
                    padding: 2px 8px;
                    border-radius: 6px;
                    font-size: 0.72rem;
                    font-weight: 600;
                    text-transform: uppercase;
                    color: ${riskStyle.text};
                    background: ${riskStyle.bg};
                    border: 1px solid ${riskStyle.border}44;
                    margin-top: 4px;
                }
                .perm-prompt-remember {
                    display: flex;
                    align-items: center;
                    gap: 8px;
                    font-size: 0.85rem;
                    opacity: 0.8;
                    cursor: pointer;
                    user-select: none;
                }
                .perm-prompt-remember input {
                    accent-color: var(--col-accent, #6179FF);
                }
                .perm-prompt-buttons {
                    display: flex;
                    gap: 10px;
                    justify-content: flex-end;
                }
                .perm-prompt-buttons button {
                    padding: 10px 24px;
                    border: none;
                    border-radius: 10px;
                    cursor: pointer;
                    font-size: 0.9rem;
                    font-weight: 600;
                    transition: opacity 0.15s, transform 0.1s;
                }
                .perm-prompt-buttons button:hover {
                    opacity: 0.85;
                }
                .perm-prompt-buttons button:active {
                    transform: scale(0.97);
                }
                .perm-btn-deny {
                    background: var(--col-bg3, #333);
                    color: var(--col-txt1, #e0e0e0);
                }
                .perm-btn-allow {
                    background: var(--col-accent, #6179FF);
                    color: #fff;
                }
            </style>
            <div class="perm-prompt-inner">
                <div class="perm-prompt-header">
                    <div class="perm-prompt-app-icon">${appIconHTML || '<span class="material-symbols-rounded" style="font-size:32px">apps</span>'}</div>
                    <div>
                        <div class="perm-prompt-app-name">${typeof escapeHTML === 'function' ? escapeHTML(appName) : appName}</div>
                        <div class="perm-prompt-subtitle">wants to access a protected resource</div>
                    </div>
                </div>
                <div class="perm-prompt-permission">
                    <span class="material-symbols-rounded perm-prompt-perm-icon">${riskStyle.icon}</span>
                    <div>
                        <div class="perm-prompt-perm-label">${typeof escapeHTML === 'function' ? escapeHTML(permInfo.label) : permInfo.label}</div>
                        <div class="perm-prompt-perm-desc">${typeof escapeHTML === 'function' ? escapeHTML(permInfo.description) : permInfo.description}</div>
                        <span class="perm-prompt-risk-badge">${permInfo.risk} risk</span>
                    </div>
                </div>
                <label class="perm-prompt-remember">
                    <input type="checkbox" id="perm-remember-cb" checked>
                    Remember this choice
                </label>
                <div class="perm-prompt-buttons">
                    <button class="perm-btn-deny" id="perm-deny-btn">Deny</button>
                    <button class="perm-btn-allow" id="perm-allow-btn">Allow</button>
                </div>
            </div>
        `;

        document.body.appendChild(dialog);
        dialog.showModal();

        // Focus the allow button for keyboard accessibility
        const allowBtn = dialog.querySelector('#perm-allow-btn');
        const denyBtn = dialog.querySelector('#perm-deny-btn');
        const rememberCb = dialog.querySelector('#perm-remember-cb');

        if (allowBtn) allowBtn.focus();

        function cleanup(granted) {
            const remember = rememberCb ? rememberCb.checked : true;
            dialog.close();
            dialog.remove();
            isPrompting = false;

            if (remember) {
                if (granted) {
                    grantPermission(appId, permission, true);
                } else {
                    denyPermission(appId, permission, true);
                }
            } else {
                // Log but don't persist
                addAuditEntry(appId, permission, granted ? 'granted' : 'denied', false);
            }

            resolve({ granted, remember });
            // Process next in queue
            processPromptQueue();
        }

        allowBtn.addEventListener('click', () => cleanup(true));
        denyBtn.addEventListener('click', () => cleanup(false));

        // Prevent clicking backdrop from doing anything
        dialog.addEventListener('click', (e) => {
            if (e.target === dialog) {
                e.stopPropagation();
            }
        });

        // Prevent Escape from closing without a decision
        dialog.addEventListener('cancel', (e) => {
            e.preventDefault();
        });
    }

    /**
     * Check if an app has a permission, prompting the user if undecided.
     * Returns true if granted, false if denied.
     * This is the main entry point for the permission gate.
     */
    async function checkPermission(appId, permission, appPerms) {
        // Unknown permission type — allow by default (not gated)
        if (!PERMISSIONS[permission]) return true;

        // System/unsandboxed apps bypass
        if (appPerms && (appPerms.includes('unsandboxed') || appPerms.includes('system'))) {
            addAuditEntry(appId, permission, 'granted', true);
            return true;
        }

        // Check stored decision
        const state = getPermissionState(appId, permission);
        if (state === true) {
            addAuditEntry(appId, permission, 'granted', true);
            return true;
        }
        if (state === false) {
            addAuditEntry(appId, permission, 'denied', true);
            return false;
        }

        // No decision yet — prompt the user
        const result = await showPermissionPrompt(appId, permission);
        return result.granted;
    }

    // ── Expose API to global scope ──
    global.PermissionsManager = {
        PERMISSIONS,
        ACTION_PERMISSIONS,
        hasPermission,
        checkPermission,
        grantPermission,
        denyPermission,
        revokePermission,
        resetAppPermissions,
        resetAllPermissions,
        getAppPermissions,
        getAllPermissions,
        getPermissionInfo,
        getRequiredPermission,
        extractAppDeclaredPermissions,
        loadPermissions,
        savePermissions,
        getAuditLog: () => [...auditLog],
        loadAuditLog,
        clearAuditLog,
        addAuditEntry,
    };

})(typeof window !== 'undefined' ? window : globalThis);
