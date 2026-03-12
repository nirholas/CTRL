# CTRL — Master Improvement Plan

> **Last updated:** 2026-03-12  
> **Purpose:** Single entry point for agents picking up CTRL work. Links to detailed task docs and tracks overall progress.  
> **Repo:** `https://github.com/nirholas/CTRL`  
> **Codebase:** Vanilla JS web desktop OS. Kernel/IPC architecture, iframe app sandbox, IndexedDB per-user storage.

---

## Current State

### What's Done
- **Rebrand complete** — All LyraOS/AgentOS references removed from CTRL active code (JS/HTML/CSS/JSON).
- **os-features.js ported** — Copied from `apps/agentos/os-features.js` to `CTRL/scripts/os-features.js`. All selectors updated (`#ctrlnav`). Script tag added to `index.html`.
- **HTML containers added** — Mission Control (`#mission-control`), Notification Center (`#notification-center`), and Show Desktop (`#showDesktopBtn`) containers added to `index.html`.
- **File Explorer rewritten** — 2519 → 1615 lines. Tabs, sidebar tree, grid/list views, context menus, clipboard, drag-drop, keyboard shortcuts.
- **Browser rewritten** — 712 → 1628 lines. Multi-tab, bookmarks, history, new tab page, autocomplete, keyboard shortcuts.
- **4 detailed improvement docs** created (see links below).

### What's Not Done
See the prioritized list below. Each links to a detailed doc with specific tasks, acceptance criteria, and file paths.

---

## Priority Map

### P0 — Critical (Do First)

| # | Task | Doc | Effort |
|---|------|-----|--------|
| 1 | Glass/blur effects on windows, taskbar, context menus, panels | [WIN12-PORTING-TASKS.md](WIN12-PORTING-TASKS.md) TASK-001 | Low |
| 2 | Full CSS variable set (light + dark themes) | [WIN12-PORTING-TASKS.md](WIN12-PORTING-TASKS.md) TASK-002 | Low |
| 3 | Window show/hide/focus animations | [WIN12-PORTING-TASKS.md](WIN12-PORTING-TASKS.md) TASK-003 | Low |
| 4 | Context menu glass styling | [WIN12-PORTING-TASKS.md](WIN12-PORTING-TASKS.md) TASK-004 | Low |
| 5 | Taskbar glass + gradient indicator | [WIN12-PORTING-TASKS.md](WIN12-PORTING-TASKS.md) TASK-005 | Low |
| 6 | Window minimize to taskbar | [WIN12-PORTING-TASKS.md](WIN12-PORTING-TASKS.md) TASK-006 | Medium |
| 7 | Start menu / app launcher restyle | [WIN12-PORTING-TASKS.md](WIN12-PORTING-TASKS.md) TASK-012 | Medium |
| 8 | Settings app shell | [WIN12-PORTING-TASKS.md](WIN12-PORTING-TASKS.md) TASK-013 | High |
| 9 | os-features.js CSS — add styles for Mission Control, Notification Center, Accessibility, Show Desktop, Aero Peek | [rebrand-and-os-features.md](rebrand-and-os-features.md) §1 | Medium |
| 10 | File Explorer: fix folder deletion edge cases, openWith flow, file size column, copy-paste duplicates | [file-explorer.md](file-explorer.md) P0 | Medium |

### P1 — High (Do Next)

| # | Task | Doc | Effort |
|---|------|-----|--------|
| 11 | Window position save/restore for maximize | [WIN12-PORTING-TASKS.md](WIN12-PORTING-TASKS.md) TASK-007 | Low |
| 12 | Z-order management (explicit z-index stack) | [WIN12-PORTING-TASKS.md](WIN12-PORTING-TASKS.md) TASK-008 | Medium |
| 13 | Browser: IframePool integration | [browser-app-improvements.md](browser-app-improvements.md) §1 | Medium |
| 14 | Browser: window title sync with OS | [browser-app-improvements.md](browser-app-improvements.md) §2 | Low |
| 15 | Browser: tab session restore | [browser-app-improvements.md](browser-app-improvements.md) §3 | Medium |
| 16 | Port `permissions.js` and `security.js` from AgentOS | [rebrand-and-os-features.md](rebrand-and-os-features.md) §3 | High |
| 17 | Port `hotkeys.js` and `spotlight.js` from AgentOS | [rebrand-and-os-features.md](rebrand-and-os-features.md) §3 | High |
| 18 | File Explorer: async thumbnail loading with IntersectionObserver | [file-explorer.md](file-explorer.md) P1-5 | Medium |
| 19 | File Explorer: recursive search | [file-explorer.md](file-explorer.md) P1-6 | Medium |
| 20 | Notification center panel styling | [WIN12-PORTING-TASKS.md](WIN12-PORTING-TASKS.md) TASK-014 | Medium |

### P2 — Medium (When Capacity Allows)

| # | Task | Doc | Effort |
|---|------|-----|--------|
| 21 | Window resize (8-direction) | [WIN12-PORTING-TASKS.md](WIN12-PORTING-TASKS.md) TASK-009 | High |
| 22 | Window snap (half-screen) | [WIN12-PORTING-TASKS.md](WIN12-PORTING-TASKS.md) TASK-010 | Medium |
| 23 | Taskbar click-to-minimize toggle | [WIN12-PORTING-TASKS.md](WIN12-PORTING-TASKS.md) TASK-011 | Medium |
| 24 | Browser: find in page (Ctrl+F) | [browser-app-improvements.md](browser-app-improvements.md) §4 | Medium |
| 25 | Browser: downloads handling | [browser-app-improvements.md](browser-app-improvements.md) §5 | Medium |
| 26 | Port `workspaces.js` (virtual desktops) | [rebrand-and-os-features.md](rebrand-and-os-features.md) §3 | Medium |
| 27 | Port `gestures.js` (touch/trackpad) | [rebrand-and-os-features.md](rebrand-and-os-features.md) §3 | Medium |
| 28 | Port `terminal.html` app | [rebrand-and-os-features.md](rebrand-and-os-features.md) §4 | Medium |
| 29 | Port `taskmanager.html` app | [rebrand-and-os-features.md](rebrand-and-os-features.md) §4 | Medium |
| 30 | File Explorer: undo/recycle bin (soft delete) | [file-explorer.md](file-explorer.md) P1-7 | Medium |
| 31 | Login / lock screen | [WIN12-PORTING-TASKS.md](WIN12-PORTING-TASKS.md) TASK-016 | High |
| 32 | Widget system | [WIN12-PORTING-TASKS.md](WIN12-PORTING-TASKS.md) TASK-019 | High |

### P3 — Nice to Have

| # | Task | Doc | Effort |
|---|------|-----|--------|
| 33 | Window shake to minimize others | [WIN12-PORTING-TASKS.md](WIN12-PORTING-TASKS.md) TASK-024 | Low |
| 34 | Battery indicator polish | [WIN12-PORTING-TASKS.md](WIN12-PORTING-TASKS.md) TASK-025 | Low |
| 35 | Tab overflow + scroll buttons (browser) | [browser-app-improvements.md](browser-app-improvements.md) §6 | Low |
| 36 | Breadcrumb overflow (file explorer) | [file-explorer.md](file-explorer.md) P2-11 | Low |
| 37 | Richer file type icons | [file-explorer.md](file-explorer.md) P2-12 | Low |
| 38 | System sounds (port `audio.js`/`sounds.js`) | [rebrand-and-os-features.md](rebrand-and-os-features.md) §3 | Low |
| 39 | Desktop widgets engine | [rebrand-and-os-features.md](rebrand-and-os-features.md) §3 | Medium |
| 40 | Remove backup files (`files.html.new`, `files.html.bak`) | [rebrand-and-os-features.md](rebrand-and-os-features.md) §5 | Low |

---

## Detailed Documents

| Document | Coverage |
|----------|----------|
| [rebrand-and-os-features.md](rebrand-and-os-features.md) | Rebrand status, os-features.js porting guide, missing AgentOS scripts, architecture/security recommendations |
| [browser-app-improvements.md](browser-app-improvements.md) | Browser rewrite status, IframePool integration, session restore, find-in-page, downloads |
| [file-explorer.md](file-explorer.md) | File explorer rewrite status, P0 bugs, P1 improvements, P2 polish |
| [WIN12-PORTING-TASKS.md](WIN12-PORTING-TASKS.md) | 30 tasks for porting win12 visual/UX features to CTRL, organized by phase |

---

## Architecture Notes for Agents

### Key Files
| File | Purpose |
|------|---------|
| `index.html` | Main OS shell — taskbar, workspace, dialogs, script loading |
| `ctrl.css` | Theme variables + core component styles |
| `style.css` | Layout, window, taskbar, context menu styling |
| `ctrl.js` | Boot sequence, app registry |
| `script.js` | App management, dock, start menu, search |
| `system32.js` | Core OS APIs (filesystem, IPC, memory) |
| `scripts/kernel.js` | Kernel IPC (ntxSession, eventBus, OLP) |
| `scripts/windman.js` | Window manager (create, move, resize, maximize, close) |
| `scripts/os-features.js` | IframePool, VirtualList, Mission Control, Notifications, Accessibility, Show Desktop, Aero Peek |
| `scripts/ctxmenu.js` | Context menu system |
| `scripts/readwrite.js` | File read/write operations |
| `appdata/*.html` | Individual apps (browser, files, settings, store, etc.) |

### Conventions
- **Nav element:** `<nav id="ctrlnav">` — never use old IDs (`agentosnav`, `lyranav`).
- **App meta tags:** `<meta name="ctrl-include">`, `<meta name="ctrl-icon">` in all app HTML files.
- **CSS file:** `ctrl.css` (was `lyra.css` → `agentos.css`).
- **IPC:** Apps communicate with the OS via `ntxSession.send(channel, ...args)` through the kernel.
- **Window API:** `myWindow.setTitle()`, `myWindow.close()`, `myWindow.params` for app-to-window-manager communication.
- **Filesystem:** `window.parent.memory.root` for the virtual FS tree, `window.parent.createFile()` / `remfile()` / etc. for mutations.

### Don'ts
- Do NOT reference `lyra`, `LyraOS`, `AgentOS`, or `agentos` in any new code.
- Do NOT use jQuery — CTRL is vanilla JS only. Win12 uses jQuery but all ports must be converted.
- Do NOT add `<script>` tags for new scripts without also adding `defer` (to avoid blocking page load).
- Do NOT modify `apps/agentos/` — that's the legacy codebase. All new work goes in `CTRL/`.

---

## Quick Start for Agents

1. Read this document first.
2. Pick a task from the Priority Map above.
3. Read the linked detailed document section for full context.
4. If the task references `WIN12-ARCHITECTURE.md`, read the relevant section in `CTRL/docs/WIN12-ARCHITECTURE.md`.
5. Implement in the specified files.
6. Test in browser (the OS runs as a static site — open `CTRL/index.html`).
7. Commit and push to `https://github.com/nirholas/CTRL`.
