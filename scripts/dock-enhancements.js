/* ============================================================
   CTRL — Dock & Taskbar Enhancements
   App Grouping, Thumbnail Previews, Jump Lists (Right-click),
   Pinned Apps, Auto-Hide, Taskbar Position
   ============================================================ */

(function () {
    'use strict';

    /* ─────────────────────────────────────────────
       Utility: DOM reference shorthand
       ───────────────────────────────────────────── */
    const $ = (sel) => document.querySelector(sel);
    const $$ = (sel) => document.querySelectorAll(sel);

    /* ─────────────────────────────────────────────
       § 1. APP GROUPING IN DOCK
       When multiple windows of the same app are open,
       show a single dock icon with count indicators.
       ───────────────────────────────────────────── */

    function getWindowsByAppId() {
        const groups = {};
        if (typeof winds === 'undefined') return groups;
        for (const [winuid, data] of Object.entries(winds)) {
            if (!data.appid) continue;
            if (data.visualState === 'hidden') continue;
            if (!document.getElementById('window' + winuid)) continue;
            if (!groups[data.appid]) groups[data.appid] = [];
            groups[data.appid].push({ winuid, data });
        }
        return groups;
    }

    // Override loadtaskspanel to support grouping
    const _origLoadTasksPanel = typeof loadtaskspanel === 'function' ? loadtaskspanel : null;

    async function groupedLoadTasksPanel() {
        const appbar = document.getElementById('nowrunninapps');
        if (!appbar) return;

        const groups = getWindowsByAppId();
        const currentItems = Array.from(appbar.querySelectorAll('.dock-group-item'));
        const currentAppIds = new Set(currentItems.map(el => el.dataset.appid));
        const activeAppIds = new Set(Object.keys(groups));

        // Remove groups that no longer have windows
        for (const item of currentItems) {
            if (!activeAppIds.has(item.dataset.appid)) {
                item.classList.add('closeEffect');
                setTimeout(() => { if (item.parentNode) item.parentNode.removeChild(item); }, 500);
            }
        }

        // Add or update groups
        for (const [appid, windowList] of Object.entries(groups)) {
            let existing = appbar.querySelector(`.dock-group-item[data-appid="${CSS.escape(appid)}"]`);
            if (existing) {
                // Update the count indicator
                updateDockIndicator(existing, windowList.length);
                // Update the stored window list
                existing.dataset.winids = JSON.stringify(windowList.map(w => w.winuid));
                continue;
            }

            // Create new grouped dock item
            const groupDiv = document.createElement('div');
            groupDiv.className = 'app-shortcut ctxAvail tooltip adock sizableuielement dock-group-item';
            groupDiv.dataset.appid = appid;
            groupDiv.dataset.winids = JSON.stringify(windowList.map(w => w.winuid));
            groupDiv.dataset.addedAt = performance.now();

            // Click handler: 1 window → focus, multiple → show preview
            groupDiv.addEventListener('click', () => {
                const winids = JSON.parse(groupDiv.dataset.winids || '[]');
                if (winids.length === 1) {
                    putwinontop('window' + winids[0]);
                    minim(winids[0]);
                } else if (winids.length > 1) {
                    showDockThumbnailPreview(groupDiv, appid, winids);
                }
            });

            // Hover handler: show preview
            groupDiv.addEventListener('mouseenter', () => {
                const winids = JSON.parse(groupDiv.dataset.winids || '[]');
                if (winids.length > 0) {
                    _hoverTimeout = setTimeout(() => {
                        showDockThumbnailPreview(groupDiv, appid, winids);
                    }, 400);
                }
            });
            groupDiv.addEventListener('mouseleave', () => {
                clearTimeout(_hoverTimeout);
            });

            // Right-click handler for jump list
            groupDiv.addEventListener('contextmenu', (e) => {
                e.preventDefault();
                e.stopPropagation();
                showJumpList(e, groupDiv, appid);
            });

            const iconSpan = document.createElement('span');
            iconSpan.classList.add('appicnspan');
            const icon = await getAppIcon(0, appid);
            insertSVG(icon || defaultAppIcon, iconSpan);

            const tooltip = document.createElement('span');
            tooltip.className = 'tooltiptext';
            const appName = windowList[0]?.data?.title || 'App';
            tooltip.textContent = basename(appName);

            groupDiv.appendChild(iconSpan);
            groupDiv.appendChild(tooltip);

            // Indicator dots
            const indicator = document.createElement('div');
            indicator.className = 'dock-indicator';
            groupDiv.appendChild(indicator);
            updateDockIndicator(groupDiv, windowList.length);

            appbar.appendChild(groupDiv);
        }

        // Show/hide appbar
        if (Object.keys(groups).length === 0) {
            appbar.style.display = 'none';
        } else {
            appbar.style.display = 'flex';
        }
    }

    let _hoverTimeout = null;

    function updateDockIndicator(element, count) {
        let indicator = element.querySelector('.dock-indicator');
        if (!indicator) {
            indicator = document.createElement('div');
            indicator.className = 'dock-indicator';
            element.appendChild(indicator);
        }
        indicator.innerHTML = '';
        if (count <= 0) {
            indicator.style.display = 'none';
            return;
        }
        indicator.style.display = 'flex';
        if (count >= 3) {
            const bar = document.createElement('div');
            bar.className = 'dock-indicator-bar';
            indicator.appendChild(bar);
        } else {
            for (let i = 0; i < count; i++) {
                const dot = document.createElement('div');
                dot.className = 'dock-indicator-dot';
                indicator.appendChild(dot);
            }
        }
    }

    // Replace the global loadtaskspanel
    if (typeof window !== 'undefined') {
        window.loadtaskspanel = groupedLoadTasksPanel;
    }

    /* ─────────────────────────────────────────────
       § 2. THUMBNAIL PREVIEW ON HOVER
       Shows a small preview popup above the dock icon
       ───────────────────────────────────────────── */

    let activePreviewPopup = null;

    function showDockThumbnailPreview(triggerEl, appid, winids) {
        closeDockPreview();

        const popup = document.createElement('div');
        popup.className = 'dock-preview-popup';

        const shown = winids.slice(0, 4);
        shown.forEach(winuid => {
            const winEl = document.getElementById('window' + winuid);
            const winData = winds[winuid];
            if (!winEl || !winData) return;

            const item = document.createElement('div');
            item.className = 'dock-preview-item';

            // Header with title and close
            const header = document.createElement('div');
            header.className = 'dock-preview-header';

            const titleSpan = document.createElement('span');
            titleSpan.className = 'preview-title';
            titleSpan.textContent = winData.title ? basename(winData.title) : 'Window';

            const closeBtn = document.createElement('button');
            closeBtn.className = 'preview-close';
            closeBtn.textContent = '×';
            closeBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                clwin(winuid);
                loadtaskspanel();
                closeDockPreview();
            });

            header.appendChild(titleSpan);
            header.appendChild(closeBtn);

            // Thumbnail area — CSS-scaled snapshot
            const thumbDiv = document.createElement('div');
            thumbDiv.className = 'preview-thumbnail';

            // Clone the window content at reduced scale
            const contentEl = winEl.querySelector('.windowcontent');
            if (contentEl) {
                const clone = contentEl.cloneNode(false);
                clone.className = 'preview-thumbnail-content';
                // Copy a visual representation from the iframe
                const iframe = contentEl.querySelector('iframe');
                if (iframe) {
                    const placeholder = document.createElement('div');
                    placeholder.className = 'preview-iframe-placeholder';
                    const iconDiv = document.createElement('div');
                    iconDiv.className = 'preview-iframe-icon';
                    const appIconSpan = winEl.querySelector('.windowdataspan svg');
                    if (appIconSpan) {
                        iconDiv.innerHTML = appIconSpan.outerHTML;
                    } else {
                        const matIcon = document.createElement('span');
                        matIcon.className = 'material-symbols-rounded';
                        matIcon.textContent = 'web';
                        matIcon.style.fontSize = '2rem';
                        matIcon.style.opacity = '0.4';
                        iconDiv.appendChild(matIcon);
                    }
                    placeholder.appendChild(iconDiv);
                    clone.appendChild(placeholder);
                } else {
                    // Try to clone non-iframe content
                    try {
                        const contentClone = contentEl.cloneNode(true);
                        contentClone.className = 'preview-thumbnail-content';
                        contentClone.querySelectorAll('iframe').forEach(f => f.remove());
                        clone.innerHTML = contentClone.innerHTML;
                    } catch (e) {
                        const matIcon = document.createElement('span');
                        matIcon.className = 'material-symbols-rounded';
                        matIcon.textContent = 'window';
                        matIcon.style.fontSize = '2rem';
                        matIcon.style.opacity = '0.3';
                        clone.appendChild(matIcon);
                    }
                }
                thumbDiv.appendChild(clone);
            }

            item.appendChild(header);
            item.appendChild(thumbDiv);

            item.addEventListener('click', () => {
                closeDockPreview();
                putwinontop('window' + winuid);
                const w = document.getElementById('window' + winuid);
                if (w) {
                    w.style.display = 'flex';
                    w.style.opacity = '1';
                    if (winds[winuid]?.visualState === 'minimized') {
                        minim(winuid);
                    }
                }
            });

            popup.appendChild(item);
        });

        // Position popup above the trigger element
        const rect = triggerEl.getBoundingClientRect();
        const nav = document.getElementById('ctrlnav');
        const navRect = nav ? nav.getBoundingClientRect() : { top: window.innerHeight - 48 };

        popup.style.position = 'fixed';
        popup.style.zIndex = '10000';

        document.body.appendChild(popup);

        // Measure and position
        const popRect = popup.getBoundingClientRect();
        let left = rect.left + rect.width / 2 - popRect.width / 2;
        left = Math.max(8, Math.min(left, window.innerWidth - popRect.width - 8));
        let top = navRect.top - popRect.height - 8;
        if (top < 8) top = 8;

        popup.style.left = left + 'px';
        popup.style.top = top + 'px';

        activePreviewPopup = popup;

        // Close on click outside
        setTimeout(() => {
            document.addEventListener('click', _previewOutsideClick);
            document.addEventListener('contextmenu', _previewOutsideClick);
        }, 0);
    }

    function _previewOutsideClick(e) {
        if (activePreviewPopup && !activePreviewPopup.contains(e.target)) {
            closeDockPreview();
        }
    }

    function closeDockPreview() {
        if (activePreviewPopup) {
            activePreviewPopup.remove();
            activePreviewPopup = null;
        }
        document.removeEventListener('click', _previewOutsideClick);
        document.removeEventListener('contextmenu', _previewOutsideClick);
    }

    /* ─────────────────────────────────────────────
       § 3. RIGHT-CLICK CONTEXT MENU (JUMP LIST)
       ───────────────────────────────────────────── */

    let activeJumpList = null;

    async function showJumpList(event, triggerEl, appid) {
        closeJumpList();
        closeDockPreview();

        const menu = document.createElement('div');
        menu.className = 'dock-jump-list';

        // --- App name header ---
        const appName = typeof getFileNameByID === 'function'
            ? (await getFileNameByID(appid) || 'App')
            : 'App';
        const headerItem = document.createElement('div');
        headerItem.className = 'jump-list-header';
        headerItem.textContent = basename(appName);
        menu.appendChild(headerItem);

        // --- Separator ---
        menu.appendChild(createSeparator());

        // --- Pin / Unpin ---
        const pinnedApps = await loadPinnedApps();
        const isPinned = pinnedApps.includes(appid);
        const pinItem = createMenuItem(
            isPinned ? 'keep_off' : 'keep',
            isPinned ? 'Unpin from dock' : 'Pin to dock',
            async () => {
                if (isPinned) {
                    await removePinnedApp(appid);
                } else {
                    await addPinnedApp(appid);
                }
                genTaskBar();
                closeJumpList();
            }
        );
        menu.appendChild(pinItem);

        // --- Open new window ---
        const newWinItem = createMenuItem('open_in_new', 'Open new window', () => {
            openfile(appid);
            closeJumpList();
        });
        menu.appendChild(newWinItem);

        // --- Close all windows ---
        const winids = JSON.parse(triggerEl.dataset.winids || '[]');
        if (winids.length > 0) {
            const closeAllItem = createMenuItem('close', 'Close all windows', () => {
                winids.forEach(wid => clwin(wid));
                loadtaskspanel();
                closeJumpList();
            });
            menu.appendChild(closeAllItem);
        }

        // --- Separator + Recent items ---
        const isFileManager = appName.toLowerCase().includes('file');
        if (isFileManager) {
            menu.appendChild(createSeparator());
            const recentLabel = document.createElement('div');
            recentLabel.className = 'jump-list-section';
            recentLabel.textContent = 'Recent folders';
            menu.appendChild(recentLabel);

            const rootFolders = typeof getFolderNames === 'function' ? await getFolderNames() : [];
            const shown = rootFolders.slice(0, 3);
            shown.forEach(folder => {
                const item = createMenuItem('folder', folder.replace(/\/$/, ''), () => {
                    if (typeof useHandler === 'function') {
                        useHandler('file_manager', { opener: 'showDir', path: folder });
                    }
                    closeJumpList();
                });
                menu.appendChild(item);
            });
        } else if (typeof appsHistory !== 'undefined' && appsHistory.length > 0) {
            const recentForApp = appsHistory.filter(h =>
                h && h.toLowerCase().includes(basename(appName).toLowerCase())
            ).slice(-3);
            if (recentForApp.length > 0) {
                menu.appendChild(createSeparator());
                const recentLabel = document.createElement('div');
                recentLabel.className = 'jump-list-section';
                recentLabel.textContent = 'Recent';
                menu.appendChild(recentLabel);
                recentForApp.forEach(item => {
                    const menuItem = createMenuItem('history', basename(item), () => {
                        openfile(appid);
                        closeJumpList();
                    });
                    menu.appendChild(menuItem);
                });
            }
        }

        // Position
        menu.style.position = 'fixed';
        menu.style.zIndex = '10001';
        document.body.appendChild(menu);

        const menuRect = menu.getBoundingClientRect();
        const triggerRect = triggerEl.getBoundingClientRect();
        const nav = document.getElementById('ctrlnav');
        const navRect = nav ? nav.getBoundingClientRect() : { top: window.innerHeight - 48 };

        let left = triggerRect.left;
        left = Math.max(8, Math.min(left, window.innerWidth - menuRect.width - 8));

        let top = navRect.top - menuRect.height - 8;
        if (top < 8) top = 8;

        menu.style.left = left + 'px';
        menu.style.top = top + 'px';

        activeJumpList = menu;

        setTimeout(() => {
            document.addEventListener('click', _jumpListOutsideClick);
            document.addEventListener('contextmenu', _jumpListOutsideClick);
        }, 0);
    }

    function _jumpListOutsideClick(e) {
        if (activeJumpList && !activeJumpList.contains(e.target)) {
            closeJumpList();
        }
    }

    function closeJumpList() {
        if (activeJumpList) {
            activeJumpList.remove();
            activeJumpList = null;
        }
        document.removeEventListener('click', _jumpListOutsideClick);
        document.removeEventListener('contextmenu', _jumpListOutsideClick);
    }

    function createMenuItem(icon, label, onclick) {
        const item = document.createElement('div');
        item.className = 'jump-list-item';
        const iconSpan = document.createElement('span');
        iconSpan.className = 'material-symbols-rounded';
        iconSpan.textContent = icon;
        const labelSpan = document.createElement('span');
        labelSpan.textContent = label;
        item.appendChild(iconSpan);
        item.appendChild(labelSpan);
        item.addEventListener('click', onclick);
        return item;
    }

    function createSeparator() {
        const sep = document.createElement('div');
        sep.className = 'jump-list-separator';
        return sep;
    }

    // Expose jump list for dock items
    window.showJumpList = showJumpList;

    /* ─────────────────────────────────────────────
       § 4. PINNED APPS
       Pinned apps always remain in the dock.
       ───────────────────────────────────────────── */

    const DEFAULT_PINNED_HANDLERS = ['file_manager', 'browser', 'settings_manager'];

    async function loadPinnedApps() {
        if (typeof getSetting !== 'function') return [];
        const pinned = await getSetting('pinnedApps');
        return Array.isArray(pinned) ? pinned : [];
    }

    async function savePinnedApps(list) {
        if (typeof setSetting !== 'function') return;
        await setSetting('pinnedApps', list);
    }

    async function addPinnedApp(appid) {
        const pinned = await loadPinnedApps();
        if (!pinned.includes(appid)) {
            pinned.push(appid);
            await savePinnedApps(pinned);
        }
    }

    async function removePinnedApp(appid) {
        let pinned = await loadPinnedApps();
        pinned = pinned.filter(id => id !== appid);
        await savePinnedApps(pinned);
    }

    async function initDefaultPinnedApps() {
        const pinned = await loadPinnedApps();
        if (pinned.length > 0) return; // already initialized

        // Resolve handler names to app IDs
        const resolved = [];
        for (const handlerName of DEFAULT_PINNED_HANDLERS) {
            if (typeof handlers !== 'undefined' && handlers[handlerName]) {
                resolved.push(handlers[handlerName]);
            }
        }
        if (resolved.length > 0) {
            await savePinnedApps(resolved);
        }
    }

    // Enhance realgenTaskBar to include pinned apps
    const _origRealGenTaskBar = typeof realgenTaskBar === 'function' ? realgenTaskBar : null;

    async function enhancedGenTaskBar() {
        if (_origRealGenTaskBar) {
            await _origRealGenTaskBar();
        }

        // After generating dock, ensure pinned apps are present
        const dock = document.getElementById('dock');
        if (!dock) return;

        const pinned = await loadPinnedApps();
        if (pinned.length === 0) {
            await initDefaultPinnedApps();
            return;
        }

        const groups = getWindowsByAppId();

        for (const appid of pinned) {
            // Skip if already shown in dock from realgenTaskBar
            if (dock.querySelector(`[unid="${CSS.escape(appid)}"]`)) continue;

            // Check if running
            const isRunning = !!groups[appid];

            const appShortcutDiv = document.createElement('div');
            appShortcutDiv.setAttribute('draggable', 'true');
            appShortcutDiv.setAttribute('ondragstart', 'dragfl(event, this)');
            appShortcutDiv.setAttribute('unid', appid);
            appShortcutDiv.className = 'app-shortcut ctxAvail tooltip adock sizableuielement pinned-dock-app';
            if (!isRunning) {
                appShortcutDiv.classList.add('pinned-inactive');
            }

            const iconSpan = document.createElement('span');
            iconSpan.classList.add('appicnspan');

            const tooltipSpan = document.createElement('span');
            tooltipSpan.className = 'tooltiptext';

            appShortcutDiv.appendChild(iconSpan);
            appShortcutDiv.appendChild(tooltipSpan);

            // Pin indicator
            const pinIndicator = document.createElement('div');
            pinIndicator.className = 'dock-pin-indicator';
            appShortcutDiv.appendChild(pinIndicator);

            // Load icon asynchronously
            getAppIcon(0, appid).then(icon => {
                insertSVG(icon || defaultAppIcon, iconSpan);
            });

            // Load app name
            if (typeof getFileNameByID === 'function') {
                getFileNameByID(appid).then(name => {
                    tooltipSpan.textContent = name ? basename(name) : 'App';
                });
            }

            appShortcutDiv.addEventListener('click', () => openfile(appid));

            // Right-click for jump list on pinned items
            appShortcutDiv.addEventListener('contextmenu', (e) => {
                e.preventDefault();
                e.stopPropagation();
                showJumpList(e, appShortcutDiv, appid);
            });

            // Insert pinned apps before the regular dock items (at the start)
            if (dock.firstChild) {
                dock.insertBefore(appShortcutDiv, dock.firstChild);
            } else {
                dock.appendChild(appShortcutDiv);
            }
        }

        // Setup drag-to-reorder for pinned apps
        setupPinnedDragReorder();
    }

    // Replace realgenTaskBar globally
    if (typeof window !== 'undefined') {
        window.realgenTaskBar = enhancedGenTaskBar;
        // Re-wrap with debounce when genTaskBar is reassigned
        if (typeof debounce === 'function') {
            window.genTaskBar = debounce(enhancedGenTaskBar, 500);
        }
    }

    /* ─── Drag-to-reorder pinned apps ─── */

    function setupPinnedDragReorder() {
        const dock = document.getElementById('dock');
        if (!dock) return;

        const pinnedItems = dock.querySelectorAll('.pinned-dock-app');
        pinnedItems.forEach(item => {
            item.addEventListener('dragstart', (e) => {
                e.dataTransfer.setData('text/plain', item.getAttribute('unid'));
                item.classList.add('dragging-pinned');
            });
            item.addEventListener('dragend', () => {
                item.classList.remove('dragging-pinned');
            });
            item.addEventListener('dragover', (e) => {
                e.preventDefault();
                const dragging = dock.querySelector('.dragging-pinned');
                if (dragging && dragging !== item) {
                    const rect = item.getBoundingClientRect();
                    const midX = rect.left + rect.width / 2;
                    if (e.clientX < midX) {
                        dock.insertBefore(dragging, item);
                    } else {
                        dock.insertBefore(dragging, item.nextSibling);
                    }
                }
            });
            item.addEventListener('drop', async (e) => {
                e.preventDefault();
                // Persist new order
                const pinnedElements = dock.querySelectorAll('.pinned-dock-app');
                const newOrder = Array.from(pinnedElements).map(el => el.getAttribute('unid'));
                await savePinnedApps(newOrder);
            });
        });
    }

    /* ─────────────────────────────────────────────
       § 5. AUTO-HIDE TASKBAR
       ───────────────────────────────────────────── */

    let autoHideEnabled = false;
    let autoHideTimer = null;

    async function loadAutoHideSetting() {
        if (typeof getSetting !== 'function') return;
        const val = await getSetting('taskbarAutoHide');
        autoHideEnabled = !!val;
        applyAutoHide();
    }

    function applyAutoHide() {
        const nav = document.getElementById('CTRLnav');
        if (!nav) return;

        if (autoHideEnabled) {
            nav.classList.add('taskbar-autohide');
            nav.classList.add('taskbar-hidden');
            setupAutoHideListeners();
        } else {
            nav.classList.remove('taskbar-autohide');
            nav.classList.remove('taskbar-hidden');
            removeAutoHideListeners();
        }
    }

    function setupAutoHideListeners() {
        document.addEventListener('mousemove', _autoHideMouseMove);
        const nav = document.getElementById('CTRLnav');
        if (nav) {
            nav.addEventListener('mouseenter', _autoHideEnter);
            nav.addEventListener('mouseleave', _autoHideLeave);
        }
    }

    function removeAutoHideListeners() {
        document.removeEventListener('mousemove', _autoHideMouseMove);
        const nav = document.getElementById('CTRLnav');
        if (nav) {
            nav.removeEventListener('mouseenter', _autoHideEnter);
            nav.removeEventListener('mouseleave', _autoHideLeave);
        }
    }

    function _autoHideMouseMove(e) {
        const nav = document.getElementById('CTRLnav');
        if (!nav) return;

        const pos = _getTaskbarPosition();
        const threshold = 5;

        let shouldReveal = false;
        if (pos === 'bottom') shouldReveal = e.clientY >= window.innerHeight - threshold;
        else if (pos === 'top') shouldReveal = e.clientY <= threshold;
        else if (pos === 'left') shouldReveal = e.clientX <= threshold;
        else if (pos === 'right') shouldReveal = e.clientX >= window.innerWidth - threshold;

        if (shouldReveal) {
            nav.classList.remove('taskbar-hidden');
        }
    }

    function _autoHideEnter() {
        clearTimeout(autoHideTimer);
        const nav = document.getElementById('CTRLnav');
        if (nav) nav.classList.remove('taskbar-hidden');
    }

    function _autoHideLeave() {
        if (!autoHideEnabled) return;
        clearTimeout(autoHideTimer);
        autoHideTimer = setTimeout(() => {
            const nav = document.getElementById('CTRLnav');
            if (nav) nav.classList.add('taskbar-hidden');
        }, 800);
    }

    // Expose for settings
    window.setTaskbarAutoHide = async function (enabled) {
        autoHideEnabled = !!enabled;
        if (typeof setSetting === 'function') {
            await setSetting('taskbarAutoHide', autoHideEnabled);
        }
        applyAutoHide();
    };

    /* ─────────────────────────────────────────────
       § 6. TASKBAR POSITION
       Supports: bottom (default), top, left, right
       ───────────────────────────────────────────── */

    let currentTaskbarPosition = 'bottom';

    function _getTaskbarPosition() {
        return currentTaskbarPosition || 'bottom';
    }

    async function loadTaskbarPosition() {
        if (typeof getSetting !== 'function') return;
        const pos = await getSetting('taskbarPosition');
        if (pos && ['top', 'bottom', 'left', 'right'].includes(pos)) {
            currentTaskbarPosition = pos;
        }
        applyTaskbarPosition(currentTaskbarPosition);
    }

    function applyTaskbarPosition(position) {
        const nav = document.getElementById('CTRLnav');
        const workspace = document.getElementById('workspace');
        if (!nav || !workspace) return;

        // Remove all position classes
        nav.classList.remove('taskbar-top', 'taskbar-bottom', 'taskbar-left', 'taskbar-right');

        // Add the new position class
        nav.classList.add('taskbar-' + position);
        currentTaskbarPosition = position;

        // Adjust workspace layout
        if (position === 'left' || position === 'right') {
            workspace.style.flexDirection = 'row';
            if (position === 'left') {
                workspace.style.flexDirection = 'row-reverse';
            }
        } else {
            workspace.style.flexDirection = 'column';
            if (position === 'top') {
                workspace.style.flexDirection = 'column-reverse';
            }
        }

        // Update nav size
        if (typeof updateNavSize === 'function') updateNavSize();
    }

    window.setTaskbarPosition = async function (position) {
        if (!['top', 'bottom', 'left', 'right'].includes(position)) return;
        if (typeof setSetting === 'function') {
            await setSetting('taskbarPosition', position);
        }
        applyTaskbarPosition(position);
    };

    /* ─────────────────────────────────────────────
       § INITIALIZATION
       ───────────────────────────────────────────── */

    // Hook into startup
    if (typeof onstartup !== 'undefined' && Array.isArray(onstartup)) {
        onstartup.push(async () => {
            await loadAutoHideSetting();
            await loadTaskbarPosition();
            await initDefaultPinnedApps();
        });
    } else {
        // Fallback: init when DOM is ready
        document.addEventListener('DOMContentLoaded', async () => {
            setTimeout(async () => {
                await loadAutoHideSetting();
                await loadTaskbarPosition();
                await initDefaultPinnedApps();
            }, 2000);
        });
    }

})();
