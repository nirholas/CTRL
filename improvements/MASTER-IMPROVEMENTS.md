# CTRL — Master Improvements & Remaining Work

> **Generated:** 2026-03-12  
> **Repo:** https://github.com/nirholas/CTRL  
> **Context:** LyraOS → AgentOS → CTRL rebrand complete. This is the consolidated roadmap for all remaining CTRL work. Push all CTRL changes to `nirholas/CTRL`, not `nirholas/swarms`.

---

## Summary of Current State

| Area | Status | Notes |
|------|--------|-------|
| **Rebrand (LyraOS → CTRL)** | DONE | Zero `lyra`/`LyraOS` references in source. Globe logo applied. |
| **Task Manager** | 90% DONE | Full rewrite done. Needs event rename + heartbeat detection. |
| **File Explorer** | PARTIAL | Basic file explorer exists. Needs preview pane, copy/paste, drag-drop. |
| **Browser App** | PARTIAL | Basic browser iframe exists. Needs tabs, bookmarks, history. |
| **Win12 Feature Porting** | NOT STARTED | 48 features identified in `docs/WIN12-ARCHITECTURE.md`. |
| **OS Feature Porting** | NOT STARTED | `os-features.js` from agentos needs to be ported to CTRL. |

---

## Completed Work

### 1. Full Rebrand (DONE)
- All files renamed: `lyra.css` → `ctrl.css`, `lyra.js` → `ctrl.js`, logos
- 230+ text references replaced across 40+ files
- `Lyra-Store/` → `CTRL-Store/`
- Verified: `grep -rn -i 'lyra' CTRL/` returns only `.git/` paths

### 2. Task Manager Rewrite (DONE)
- Processes tab with live window tracking
- Performance tab with sparkline graphs (CPU, Memory, FPS, DOM nodes, Uptime)
- App History tab with cumulative session stats
- Details tab with advanced window info
- Column sorting, row selection, right-click context menu
- File: `appdata/taskmanager.html`

### 3. Logo Replacement (DONE)
- Galaxy-earth globe PNG applied to `ctrllogo.png`, `ctrltext.png`, `ctrlwhite.png`

---

## HIGH PRIORITY — Must Complete

### H1: Rename `agentos-process-*` Events to `ctrl-process-*`
**Files:** `script.js`, `scripts/windman.js`, `scripts/kernel.js`  
**Details:** 5 occurrences of `agentos-process-` custom events. Grep and replace with `ctrl-process-`. Also rename `agentos-icon` meta tag in `appdata/taskmanager.html` line 8.

### H2: Rename `#agentosnav` References
**Files:** `os-features.js` (if ported), `script.js`, `style.css`  
**Details:** Several CSS selectors and JS `querySelector` calls reference `#agentosnav`. Need to identify the CTRL equivalent taskbar element ID and update.

### H3: Delete Stale Temp Files
- `appdata/files.html.new` — orphaned draft with old `lyra-include` references
- `appdata/files.html.bak` — orphaned backup file
- Any other `.bak`/`.new`/`.old` files in the tree

### H4: Task Manager "Not Responding" Detection
**File:** `appdata/taskmanager.html`  
**Details:** `getProcessStatus()` is a stub. Implement `postMessage` heartbeat ping into each iframe — if no response within 3s, mark as "Not Responding". Add End Task confirmation dialog for system apps. Add force-kill timeout (3s fallback if `clwin()` doesn't remove the window).

---

## MEDIUM PRIORITY — Feature Porting

### M1: Port `os-features.js` from AgentOS
**Source:** `apps/agentos/os-features.js` (680 lines, type-safe JSDoc version)  
**Target:** `CTRL/os-features.js`

Features to port (update selectors for CTRL DOM):

| Feature | Description | Effort |
|---------|-------------|--------|
| IframePool | Reusable iframe pool for app windows | Low |
| VirtualList | Virtual scrolling for large lists | Low |
| PerfMonitor | Dev FPS/memory overlay (Ctrl+Shift+P) | Low |
| Mission Control | Exposé-style window overview (F3) | Medium |
| Notification Center | Grouped notifications with swipe-to-dismiss | Medium |
| Show Desktop | Aero Peek + minimize all (Ctrl+D) | Low |
| Taskbar Badges | Window count badges on dock icons | Low |
| Keyboard Shortcuts | Ctrl+Shift+Esc, Ctrl+N, Escape handlers | Low |
| Accessibility | Focus traps, ARIA labels, keyboard nav, screen reader | Medium |
| Hot Corner | Top-left corner → Mission Control trigger | Low |

### M2: Port `os-enhancements.js` from AgentOS
**Source:** `apps/agentos/os-enhancements.js` (2080 lines)  
**Target:** `CTRL/os-enhancements.js`  
**Details:** Extended UI enhancements. Audit contents, port what's relevant, adapt to CTRL DOM.

### M3: Port `os-design-system.css` from AgentOS
**Source:** `apps/agentos/os-design-system.css` (4222 lines)  
**Target:** Merge into `CTRL/ctrl.css` or create `CTRL/os-design-system.css`  
**Details:** CSS design tokens, component styles, animation definitions. Merge with existing CTRL variables.

### M4: Port Apps from AgentOS → CTRL
Move these app files from `apps/agentos/appdata/` to `CTRL/appdata/`:

| App | Source | Priority |
|-----|--------|----------|
| Terminal | `terminal.html` | HIGH — essential dev tool |
| Task Manager | Already ported | DONE |
| Browser | `browser.html` | MEDIUM |
| Assistant (AI) | `assistant.html` | MEDIUM |
| App Store | `appstore.html` | MEDIUM |

---

## WIN12 PORTING — Feature Tasks

See `improvements/WIN12-PORTING-TASKS.md` for the full 48-task breakdown. Top priorities:

### Phase 1 — Visual Foundation (CSS-only)

| Task ID | Feature | Effort | Priority |
|---------|---------|--------|----------|
| TASK-001 | Glass/blur effects (`backdrop-filter`) | Low | P0 |
| TASK-002 | Full CSS variable set (light + dark) | Low | P0 |
| TASK-003 | Window title bar polish (traffic lights, blur) | Low | P0 |
| TASK-004 | Taskbar glass + centered icons | Low | P1 |
| TASK-005 | Context menu glass styling | Low | P1 |
| TASK-006 | Window shadow system | Low | P1 |
| TASK-007 | Start menu glass panel | Low | P1 |

### Phase 2 — Animations (JS+CSS)

| Task ID | Feature | Effort | Priority |
|---------|---------|--------|----------|
| TASK-008 | Window open/close/minimize animations | Medium | P1 |
| TASK-009 | Start menu slide animation | Low | P1 |
| TASK-010 | Taskbar hover/active animations | Low | P2 |
| TASK-011 | Icon bounce on dock | Low | P2 |

### Phase 3 — Window Manager Enhancements

| Task ID | Feature | Effort | Priority |
|---------|---------|--------|----------|
| TASK-012 | Window snap zones (half/quarter screen) | Medium | P1 |
| TASK-013 | Multi-tab system for apps | Medium | P1 |
| TASK-014 | Window cascade/tile commands | Low | P2 |

### Phase 4 — Apps & Widgets

| Task ID | Feature | Effort | Priority |
|---------|---------|--------|----------|
| TASK-020 | Desktop widgets (weather, clock, calc) | High | P2 |
| TASK-021 | Calculator app with scientific mode | Medium | P2 |
| TASK-025 | BIOS simulator | Medium | P3 |
| TASK-026 | Blue screen of death | Low | P3 |
| TASK-027 | Shutdown animation | Low | P3 |

---

## CTRL-Store Overhaul

**Current state:** Consumer-focused apps (games, utilities).  
**Target:** Agent/DeFi-focused app store.

### Remove
- Irrelevant games (obamafy, ducksquack, tictactoe where appropriate)
- Outdated/broken apps

### Add
| App | Description | Priority |
|-----|-------------|----------|
| Swarm Dashboard | Real-time agent swarm monitoring | HIGH |
| DeFi Portfolio | Wallet balances, token positions, P&L | HIGH |
| Trade Terminal | Execute trades, set stops, manage positions | HIGH |
| Agent Logs | Streaming logs from running agents | MEDIUM |
| Alert Manager | Price alerts, anomaly notifications | MEDIUM |
| Market Scanner | Token screening and discovery | MEDIUM |

### Update
- `CTRL-Store/db/v2.json` — new app registry entries
- `CTRL-Store/db/themes.json` — dark/trading-floor themes

---

## Backend Integration (Future)

Currently CTRL is purely static HTML/JS. Future work to connect to swarms backend:

| Integration | Target File | Backend Endpoint |
|-------------|-------------|-----------------|
| Real user preferences | `appdata/settings.html` | User settings API |
| Live agent alerts | Notification Center JS | WebSocket stream |
| Agent data/logs | `appdata/files.html` | Log storage API |
| Shell/CLI access | `appdata/terminal.html` | Backend shell API |
| Agent status | System tray widgets | Health check API |

---

## Repo Maintenance

- [ ] Verify `webmanifest.json` — app name, icons, start_url all reflect CTRL
- [ ] Rewrite `README.md` for CTRL project identity
- [ ] Decide on CNAME for GitHub Pages (was `lyra.surf`, now removed)
- [ ] Decide if CTRL stays as embedded repo in swarms or becomes a proper git submodule
- [ ] Git identity for all commits: `nirholas` / `nirholas@users.noreply.github.com`

---

## Related Documents

| Document | Path | Covers |
|---|---|---|
| Win12 Architecture Reference | `docs/WIN12-ARCHITECTURE.md` | Full win12 internals for porting |
| Win12 Porting Tasks | `improvements/WIN12-PORTING-TASKS.md` | 48 task breakdown |
| Browser App Improvements | `improvements/browser-app-improvements.md` | Browser app gaps |
| File Explorer Improvements | `improvements/file-explorer.md` | File explorer gaps |
| Rebrand & OS Features | `improvements/rebrand-and-os-features.md` | Feature porting details |
