/* ============================================================
   CTRL — Virtual Desktops / Workspaces
   Multiple workspace support with Mission Control overview,
   slide animations, keyboard shortcuts, and persistence.
   ============================================================ */

const WorkspaceManager = (() => {
    'use strict';

    let workspaces = [{ id: 1, name: 'Desktop 1', windows: [] }];
    let activeWorkspace = 1;
    let _nextId = 2;
    let _animating = false;
    let _overviewActive = false;
    const MAX_WORKSPACES = 6;

    /* ─── Helpers ─── */

    function getActive() {
        return workspaces.find(w => w.id === activeWorkspace);
    }

    function _getWorkspace(id) {
        return workspaces.find(w => w.id === id);
    }

    /* ─── Visibility ─── */

    function _applyVisibility() {
        const active = getActive();
        if (!active) return;
        const activeWinIds = active.windows;

        Object.keys(typeof winds !== 'undefined' ? winds : {}).forEach(winuid => {
            const el = document.getElementById('window' + winuid);
            if (!el) return;
            if (activeWinIds.includes(winuid)) {
                if (winds[winuid].visualState !== 'minimized') {
                    el.style.display = '';
                }
            } else {
                el.style.display = 'none';
            }
        });
    }

    /* ─── Slide Animation ─── */

    function _animateSwitch(direction, callback) {
        const container = document.getElementById('maxappscontainer');
        if (!container) { callback(); return; }

        _animating = true;
        const slideOut = direction === 'right' ? '-100%' : '100%';
        const slideIn = direction === 'right' ? '100%' : '-100%';

        container.style.transition = 'transform 300ms cubic-bezier(0.4, 0, 0.2, 1)';
        container.style.transform = 'translateX(' + slideOut + ')';

        setTimeout(() => {
            container.style.transition = 'none';
            container.style.transform = 'translateX(' + slideIn + ')';
            callback();
            container.offsetHeight; // reflow
            container.style.transition = 'transform 300ms cubic-bezier(0.4, 0, 0.2, 1)';
            container.style.transform = 'translateX(0)';

            setTimeout(() => {
                container.style.transition = '';
                container.style.transform = '';
                _animating = false;
            }, 310);
        }, 310);
    }

    /* ─── Switching ─── */

    function switchTo(id, direction) {
        if (id === activeWorkspace) return;
        if (_animating) return;
        const ws = _getWorkspace(id);
        if (!ws) return;

        if (_overviewActive) hideOverview();

        const oldId = activeWorkspace;
        if (!direction) {
            const oldIdx = workspaces.findIndex(w => w.id === oldId);
            const newIdx = workspaces.findIndex(w => w.id === id);
            direction = newIdx > oldIdx ? 'right' : 'left';
        }

        _animateSwitch(direction, () => {
            activeWorkspace = id;
            _applyVisibility();
            updateSwitcherUI();
            if (typeof loadtaskspanel === 'function') loadtaskspanel();
            saveToDisk();
        });
    }

    function switchNext() {
        const idx = workspaces.findIndex(w => w.id === activeWorkspace);
        if (idx < workspaces.length - 1) switchTo(workspaces[idx + 1].id, 'right');
    }

    function switchPrev() {
        const idx = workspaces.findIndex(w => w.id === activeWorkspace);
        if (idx > 0) switchTo(workspaces[idx - 1].id, 'left');
    }

    /* ─── Workspace CRUD ─── */

    function addWorkspace(name) {
        if (workspaces.length >= MAX_WORKSPACES) return null;
        const id = _nextId++;
        workspaces.push({ id, name: name || 'Desktop ' + id, windows: [] });
        updateSwitcherUI();
        saveToDisk();
        return id;
    }

    function removeWorkspace(id) {
        if (workspaces.length <= 1) return;
        const idx = workspaces.findIndex(w => w.id === id);
        if (idx === -1) return;

        const ws = workspaces[idx];
        const targetIdx = idx > 0 ? idx - 1 : 1;
        const target = workspaces[targetIdx];

        ws.windows.forEach(winuid => {
            if (!target.windows.includes(winuid)) target.windows.push(winuid);
            if (winds[winuid]) winds[winuid].workspace = target.id;
        });

        workspaces.splice(idx, 1);

        if (activeWorkspace === id) {
            activeWorkspace = target.id;
            _applyVisibility();
        }

        updateSwitcherUI();
        saveToDisk();
    }

    function renameWorkspace(id, newName) {
        const ws = _getWorkspace(id);
        if (ws && newName && newName.trim()) {
            ws.name = newName.trim();
            updateSwitcherUI();
            saveToDisk();
        }
    }

    /* ─── Window Management ─── */

    function registerWindow(winuid) {
        const active = getActive();
        if (active && !active.windows.includes(winuid)) {
            active.windows.push(winuid);
            if (winds[winuid]) winds[winuid].workspace = activeWorkspace;
            updateSwitcherUI();
        }
    }

    function unregisterWindow(winuid) {
        workspaces.forEach(ws => {
            ws.windows = ws.windows.filter(id => id !== winuid);
        });
        updateSwitcherUI();
    }

    function moveWindowToWorkspace(winuid, targetId) {
        workspaces.forEach(ws => {
            ws.windows = ws.windows.filter(id => id !== winuid);
        });

        const target = _getWorkspace(targetId);
        if (target && !target.windows.includes(winuid)) {
            target.windows.push(winuid);
        }
        if (winds[winuid]) winds[winuid].workspace = targetId;

        const el = document.getElementById('window' + winuid);
        if (el) {
            el.style.display = targetId !== activeWorkspace ? 'none' : '';
        }

        if (typeof loadtaskspanel === 'function') loadtaskspanel();
        updateSwitcherUI();
        saveToDisk();
    }

    function moveWindowToNextWorkspace(winuid) {
        if (!winds[winuid]) return;
        const currentWsId = winds[winuid].workspace || activeWorkspace;
        const idx = workspaces.findIndex(w => w.id === currentWsId);
        if (idx < workspaces.length - 1) {
            moveWindowToWorkspace(winuid, workspaces[idx + 1].id);
        }
    }

    function moveWindowToPrevWorkspace(winuid) {
        if (!winds[winuid]) return;
        const currentWsId = winds[winuid].workspace || activeWorkspace;
        const idx = workspaces.findIndex(w => w.id === currentWsId);
        if (idx > 0) {
            moveWindowToWorkspace(winuid, workspaces[idx - 1].id);
        }
    }

    function moveWindowToNewWorkspace(winuid) {
        const newId = addWorkspace();
        if (newId) moveWindowToWorkspace(winuid, newId);
    }

    function getWorkspaces() {
        return workspaces.map(w => ({
            ...w,
            isActive: w.id === activeWorkspace
        }));
    }

    function getWindowWorkspace(winuid) {
        const ws = workspaces.find(w => w.windows.includes(winuid));
        return ws ? ws.id : null;
    }

    function isWindowInActiveWorkspace(winuid) {
        const active = getActive();
        return active ? active.windows.includes(winuid) : true;
    }

    /* ─── Workspace Indicator (Taskbar Dots) ─── */

    function updateSwitcherUI() {
        const container = document.getElementById('workspace-switcher');
        if (!container) return;

        container.innerHTML = '';

        workspaces.forEach(ws => {
            const dot = document.createElement('div');
            dot.className = 'workspace-dot' + (ws.id === activeWorkspace ? ' active' : '');
            dot.setAttribute('data-ws', ws.id);
            dot.title = ws.name + ' (' + ws.windows.length + ' window' + (ws.windows.length !== 1 ? 's' : '') + ')';

            dot.addEventListener('click', (e) => {
                e.stopPropagation();
                switchTo(ws.id);
            });

            dot.addEventListener('contextmenu', (e) => {
                e.preventDefault();
                e.stopPropagation();
                _showDotContextMenu(e, ws);
            });

            container.appendChild(dot);
        });

        if (workspaces.length < MAX_WORKSPACES) {
            const addBtn = document.createElement('button');
            addBtn.className = 'workspace-add';
            addBtn.title = 'Add workspace';
            addBtn.textContent = '+';
            addBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                const newId = addWorkspace();
                if (newId) switchTo(newId, 'right');
            });
            container.appendChild(addBtn);
        }
    }

    function _showDotContextMenu(e, ws) {
        const existing = document.querySelector('.ws-dot-ctx');
        if (existing) existing.remove();

        const menu = document.createElement('div');
        menu.className = 'ws-dot-ctx contextmenu';
        menu.style.position = 'fixed';
        menu.style.zIndex = '10000';

        const renameItem = document.createElement('div');
        renameItem.className = 'ctxmenuitem';
        renameItem.innerHTML = '<span class="material-symbols-rounded">edit</span><span>Rename Workspace</span>';
        renameItem.addEventListener('click', () => {
            menu.remove();
            const newName = prompt('Rename workspace:', ws.name);
            if (newName) renameWorkspace(ws.id, newName);
        });
        menu.appendChild(renameItem);

        const removeItem = document.createElement('div');
        removeItem.className = 'ctxmenuitem';
        removeItem.innerHTML = '<span class="material-symbols-rounded">delete</span><span>Remove Workspace</span>';
        if (workspaces.length <= 1) {
            removeItem.style.opacity = '0.4';
            removeItem.style.pointerEvents = 'none';
        } else {
            removeItem.addEventListener('click', () => {
                menu.remove();
                removeWorkspace(ws.id);
            });
        }
        menu.appendChild(removeItem);

        document.body.appendChild(menu);

        const menuRect = menu.getBoundingClientRect();
        let x = e.clientX;
        let y = e.clientY - menuRect.height;
        if (y < 0) y = e.clientY;
        if (x + menuRect.width > window.innerWidth) x = window.innerWidth - menuRect.width;
        menu.style.left = x + 'px';
        menu.style.top = y + 'px';
        menu.style.display = 'block';

        const closeHandler = (ev) => {
            if (!menu.contains(ev.target)) {
                menu.remove();
                document.removeEventListener('click', closeHandler, true);
            }
        };
        setTimeout(() => document.addEventListener('click', closeHandler, true), 0);
    }

    /* ─── Mission Control / Overview ─── */

    function showOverview() {
        if (_overviewActive) return;
        _overviewActive = true;

        const overlay = document.getElementById('workspace-overview');
        if (!overlay) return;

        overlay.style.display = 'flex';
        overlay.offsetHeight; // reflow
        overlay.classList.add('active');

        _renderOverviewThumbnails();
        _renderOverviewWindows();

        overlay.addEventListener('click', _overviewBgClick);
        document.addEventListener('keydown', _overviewEscHandler);
    }

    function hideOverview() {
        if (!_overviewActive) return;
        _overviewActive = false;

        const overlay = document.getElementById('workspace-overview');
        if (!overlay) return;

        overlay.classList.remove('active');
        overlay.removeEventListener('click', _overviewBgClick);
        document.removeEventListener('keydown', _overviewEscHandler);

        setTimeout(() => {
            if (!_overviewActive) overlay.style.display = 'none';
        }, 350);
    }

    function toggleOverview() {
        _overviewActive ? hideOverview() : showOverview();
    }

    function _overviewBgClick(e) {
        if (e.target.id === 'workspace-overview' || e.target.classList.contains('overview-windows-area')) {
            hideOverview();
        }
    }

    function _overviewEscHandler(e) {
        if (e.key === 'Escape') {
            e.preventDefault();
            hideOverview();
        }
    }

    function _renderOverviewThumbnails() {
        const bar = document.getElementById('overview-workspaces-bar');
        if (!bar) return;
        bar.innerHTML = '';

        workspaces.forEach(ws => {
            const thumb = document.createElement('div');
            thumb.className = 'workspace-thumbnail' + (ws.id === activeWorkspace ? ' active' : '');
            thumb.setAttribute('data-ws-id', ws.id);
            thumb.draggable = true;

            const label = document.createElement('div');
            label.className = 'ws-thumb-label';
            label.textContent = ws.name;
            thumb.appendChild(label);

            const preview = document.createElement('div');
            preview.className = 'ws-thumb-preview';

            ws.windows.forEach(winuid => {
                if (!winds[winuid] || winds[winuid].visualState === 'minimized') return;
                const winEl = document.getElementById('window' + winuid);
                if (!winEl) return;

                const miniWin = document.createElement('div');
                miniWin.className = 'ws-thumb-window';
                const scaleX = 160 / window.innerWidth;
                const scaleY = 100 / window.innerHeight;
                miniWin.style.left = (winEl.offsetLeft * scaleX) + 'px';
                miniWin.style.top = (winEl.offsetTop * scaleY) + 'px';
                miniWin.style.width = Math.max(8, winEl.offsetWidth * scaleX) + 'px';
                miniWin.style.height = Math.max(5, winEl.offsetHeight * scaleY) + 'px';
                preview.appendChild(miniWin);
            });

            thumb.appendChild(preview);

            thumb.addEventListener('click', (e) => {
                e.stopPropagation();
                if (ws.id !== activeWorkspace) switchTo(ws.id);
                hideOverview();
            });

            // Drag reorder
            thumb.addEventListener('dragstart', (e) => {
                e.dataTransfer.setData('text/plain', ws.id.toString());
                thumb.classList.add('dragging');
            });
            thumb.addEventListener('dragend', () => thumb.classList.remove('dragging'));
            thumb.addEventListener('dragover', (e) => {
                e.preventDefault();
                thumb.classList.add('drag-over');
            });
            thumb.addEventListener('dragleave', () => thumb.classList.remove('drag-over'));
            thumb.addEventListener('drop', (e) => {
                e.preventDefault();
                thumb.classList.remove('drag-over');
                const draggedId = parseInt(e.dataTransfer.getData('text/plain'));
                _reorderWorkspaces(draggedId, ws.id);
            });

            bar.appendChild(thumb);
        });

        if (workspaces.length < MAX_WORKSPACES) {
            const addThumb = document.createElement('div');
            addThumb.className = 'workspace-thumbnail ws-thumb-add';
            addThumb.innerHTML = '<span class="material-symbols-rounded">add</span>';
            addThumb.title = 'New workspace';
            addThumb.addEventListener('click', (e) => {
                e.stopPropagation();
                const newId = addWorkspace();
                if (newId) {
                    switchTo(newId, 'right');
                    hideOverview();
                }
            });
            bar.appendChild(addThumb);
        }
    }

    function _renderOverviewWindows() {
        const area = document.getElementById('overview-windows-grid');
        if (!area) return;
        area.innerHTML = '';

        const active = getActive();
        if (!active) return;

        const visibleWindows = active.windows.filter(winuid =>
            winds[winuid] && winds[winuid].visualState !== 'minimized' && document.getElementById('window' + winuid)
        );

        if (visibleWindows.length === 0) {
            area.innerHTML = '<div class="overview-no-windows">' +
                '<span class="material-symbols-rounded">desktop_windows</span>' +
                '<p>No windows on this workspace</p></div>';
            return;
        }

        visibleWindows.forEach(winuid => {
            const winEl = document.getElementById('window' + winuid);
            if (!winEl) return;

            const card = document.createElement('div');
            card.className = 'window-card';
            card.setAttribute('data-winuid', winuid);

            const preview = document.createElement('div');
            preview.className = 'window-card-preview';

            const svg = winEl.querySelector('.windowdataspan svg');
            if (svg) {
                const clone = svg.cloneNode(true);
                clone.style.width = '48px';
                clone.style.height = '48px';
                clone.style.opacity = '0.3';
                preview.appendChild(clone);
            } else {
                const ph = document.createElement('span');
                ph.className = 'material-symbols-rounded';
                ph.style.fontSize = '3rem';
                ph.style.opacity = '0.2';
                ph.textContent = 'window';
                preview.appendChild(ph);
            }

            card.appendChild(preview);

            const info = document.createElement('div');
            info.className = 'window-card-info';

            const iconSpan = document.createElement('span');
            iconSpan.className = 'window-card-icon';
            const headerSvg = winEl.querySelector('.windowdataspan svg');
            if (headerSvg) {
                const ic = headerSvg.cloneNode(true);
                ic.style.width = '16px';
                ic.style.height = '16px';
                iconSpan.appendChild(ic);
            }

            const titleSpan = document.createElement('span');
            titleSpan.className = 'window-card-title';
            const titleEl = winEl.querySelector('.title');
            titleSpan.textContent = titleEl?.textContent || winds[winuid].title || 'Window';

            const closeBtn = document.createElement('button');
            closeBtn.className = 'window-card-close';
            closeBtn.innerHTML = '&times;';
            closeBtn.title = 'Close';
            closeBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                if (typeof clwin === 'function') clwin(winuid);
                if (typeof loadtaskspanel === 'function') loadtaskspanel();
                setTimeout(() => {
                    _renderOverviewWindows();
                    _renderOverviewThumbnails();
                }, 150);
            });

            info.appendChild(iconSpan);
            info.appendChild(titleSpan);
            info.appendChild(closeBtn);
            card.appendChild(info);

            card.addEventListener('click', () => {
                hideOverview();
                const w = document.getElementById('window' + winuid);
                if (w) {
                    w.style.display = 'flex';
                    w.style.opacity = '1';
                }
                if (typeof putwinontop === 'function') putwinontop('window' + winuid);
            });

            area.appendChild(card);
        });
    }

    function _reorderWorkspaces(fromId, toId) {
        const fromIdx = workspaces.findIndex(w => w.id === fromId);
        const toIdx = workspaces.findIndex(w => w.id === toId);
        if (fromIdx === -1 || toIdx === -1 || fromIdx === toIdx) return;
        const [moved] = workspaces.splice(fromIdx, 1);
        workspaces.splice(toIdx, 0, moved);
        _renderOverviewThumbnails();
        updateSwitcherUI();
        saveToDisk();
    }

    /* ─── Persistence ─── */

    async function saveToDisk() {
        if (typeof setSetting !== 'function') return;
        try {
            await setSetting('virtualWorkspaces', {
                workspaces: workspaces.map(ws => ({ id: ws.id, name: ws.name })),
                activeWorkspace,
                nextId: _nextId
            });
        } catch (e) {
            console.warn('WorkspaceManager: persist failed', e);
        }
    }

    async function loadFromDisk() {
        if (typeof getSetting !== 'function') return;
        try {
            const data = await getSetting('virtualWorkspaces');
            if (data && Array.isArray(data.workspaces) && data.workspaces.length > 0) {
                workspaces = data.workspaces.map(ws => ({
                    id: ws.id,
                    name: ws.name,
                    windows: []
                }));
                activeWorkspace = data.activeWorkspace || workspaces[0].id;
                _nextId = data.nextId || (Math.max(...workspaces.map(w => w.id)) + 1);
            }
        } catch (e) {
            console.warn('WorkspaceManager: restore failed', e);
        }
        updateSwitcherUI();
    }

    /* ─── Keyboard Shortcuts ─── */

    document.addEventListener('keydown', function (e) {
        const tag = (e.target.tagName || '').toLowerCase();
        if (tag === 'input' || tag === 'textarea' || tag === 'select' || e.target.isContentEditable) return;

        // Ctrl+Alt+Right → next workspace
        if (e.ctrlKey && e.altKey && !e.shiftKey && e.key === 'ArrowRight') {
            e.preventDefault();
            switchNext();
            return;
        }
        // Ctrl+Alt+Left → prev workspace
        if (e.ctrlKey && e.altKey && !e.shiftKey && e.key === 'ArrowLeft') {
            e.preventDefault();
            switchPrev();
            return;
        }
        // Ctrl+Alt+1-6 → switch to workspace N
        if (e.ctrlKey && e.altKey && !e.shiftKey) {
            const num = parseInt(e.key);
            if (num >= 1 && num <= 6 && workspaces[num - 1]) {
                e.preventDefault();
                switchTo(workspaces[num - 1].id);
                return;
            }
        }
        // Ctrl+Alt+Shift+Right → move focused window to next workspace
        if (e.ctrlKey && e.altKey && e.shiftKey && e.key === 'ArrowRight') {
            e.preventDefault();
            const focused = typeof nowapp !== 'undefined' ? nowapp : null;
            if (focused && winds[focused]) moveWindowToNextWorkspace(focused);
            return;
        }
        // Ctrl+Alt+Shift+Left → move focused window to prev workspace
        if (e.ctrlKey && e.altKey && e.shiftKey && e.key === 'ArrowLeft') {
            e.preventDefault();
            const focused = typeof nowapp !== 'undefined' ? nowapp : null;
            if (focused && winds[focused]) moveWindowToPrevWorkspace(focused);
            return;
        }
        // F3 → toggle overview
        if (e.key === 'F3') {
            e.preventDefault();
            toggleOverview();
            return;
        }
        // Super+Tab → toggle overview
        if (e.metaKey && e.key === 'Tab') {
            e.preventDefault();
            toggleOverview();
            return;
        }
    });

    /* ─── Three-finger swipe gesture ─── */

    let _touchStartY = null;
    let _touchFingers = 0;

    document.addEventListener('touchstart', function (e) {
        if (e.touches.length === 3) {
            _touchStartY = e.touches[0].clientY;
            _touchFingers = 3;
        }
    }, { passive: true });

    document.addEventListener('touchend', function (e) {
        if (_touchFingers === 3 && _touchStartY !== null) {
            const endY = e.changedTouches[0]?.clientY;
            if (endY !== undefined) {
                const dy = _touchStartY - endY;
                if (dy > 60) showOverview();
                else if (dy < -60) hideOverview();
            }
        }
        _touchStartY = null;
        _touchFingers = 0;
    }, { passive: true });

    /* ─── Build Overview DOM ─── */

    function _buildOverlayDOM() {
        if (document.getElementById('workspace-overview')) return;

        const overlay = document.createElement('div');
        overlay.id = 'workspace-overview';
        overlay.className = 'workspace-overview';
        overlay.style.display = 'none';

        const bar = document.createElement('div');
        bar.id = 'overview-workspaces-bar';
        bar.className = 'overview-workspaces-bar';

        const area = document.createElement('div');
        area.className = 'overview-windows-area';

        const grid = document.createElement('div');
        grid.id = 'overview-windows-grid';
        grid.className = 'overview-windows-grid';

        area.appendChild(grid);
        overlay.appendChild(bar);
        overlay.appendChild(area);
        document.body.appendChild(overlay);
    }

    /* ─── Init ─── */

    function init() {
        _buildOverlayDOM();
        updateSwitcherUI();
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        setTimeout(init, 50);
    }

    /* ─── Public API ─── */

    return {
        switchTo,
        switchNext,
        switchPrev,
        addWorkspace,
        removeWorkspace,
        renameWorkspace,
        registerWindow,
        unregisterWindow,
        moveWindowToWorkspace,
        moveWindowToNextWorkspace,
        moveWindowToPrevWorkspace,
        moveWindowToNewWorkspace,
        getWorkspaces,
        getActive,
        getWindowWorkspace,
        updateSwitcherUI,
        isWindowInActiveWorkspace,
        showOverview,
        hideOverview,
        toggleOverview,
        loadFromDisk,
        saveToDisk
    };
})();

/* Override Mission Control to use Workspace Overview */
if (typeof window !== 'undefined') {
    window.toggleMissionControl = function () {
        WorkspaceManager.toggleOverview();
    };
}
