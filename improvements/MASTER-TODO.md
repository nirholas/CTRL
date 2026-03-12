# CTRL — Master Improvement Plan

**Date:** 2026-03-12  
**Repo:** `nirholas/CTRL` (https://github.com/nirholas/CTRL)  
**Source codebase (reference):** `apps/agentos/` in `nirholas/swarms`  
**Win12 reference:** `win12/` in `nirholas/swarms`

---

## Current State Summary

### Rebrand Status: COMPLETE
The rename chain was **LyraOS → AgentOS → CTRL**. All active code in `CTRL/` is clean:
- Zero `lyra`/`LyraOS`/`agentOS`/`AgentOS` references in source files
- Branded files: `ctrl.css`, `ctrl.js`, `ctrllogo.png`, `ctrltext.png`, `ctrlwhite.png`
- Store directory: `CTRL-Store/`
- Nav element ID: `#ctrlnav`
- Meta tags: `ctrl-include`, `ctrl-icon`

### What Was Completed (This Session)
1. **Full audit** — confirmed zero stale brand references in all `CTRL/` source files
2. **Dependency install** for `packages/pump-agent-swarm/` (build errors were caused by missing `node_modules`, not source code bugs)
3. **Documentation** — updated `improvements/rebrand-and-os-features.md` with type safety fixes and porting instructions

### What Exists in `CTRL/` Today
| Component | Status | Notes |
|-----------|--------|-------|
| Kernel (`system32.js`) | Working | App lifecycle, IPC, IndexedDB storage |
| Window manager (`scripts/windman.js`) | Working | Create/close/drag/maximize — no minimize, no resize, no snap |
| Desktop shell (`script.js`) | Working | App launcher, taskbar, file associations |
| Context menus (`scripts/ctxmenu.js`) | Working | Basic right-click menus — no glass styling |
| Notifications (`scripts/ntx.js`) | Basic | Simple notification push — no grouping, no center panel |
| File explorer (`appdata/files.html`) | Rewritten | Tabs, sidebar, grid/list, context menus, drag-drop (see `file-explorer.md`) |
| Browser (`appdata/browser.html`) | Rewritten | Multi-tab with bookmarks, history, address bar (see `browser-app-improvements.md`) |
| Copilot (`appdata/copilot.html`) | Working | Sperax DeFi Copilot iframe wrapper |
| Settings (`appdata/settings.html`) | Exists | Needs feature completion |
| CSS theming | Partial | Dark mode only, no light mode, no accent color customization |
| Accessibility | None in CTRL | Full implementation exists in `apps/agentos/os-features.js` |
| Mission Control | None | Full implementation exists in `apps/agentos/os-features.js` |
| Spotlight search | None in CTRL | Full implementation exists in `apps/agentos/os-enhancements.js` (678 lines) |
| Quick settings panel | None in CTRL | Full implementation exists in `apps/agentos/os-enhancements.js` |
| System tray (battery/network/clock) | None in CTRL | Full implementation exists in `apps/agentos/os-enhancements.js` |

---

## Priority 1: Files to Port from `apps/agentos/` → `CTRL/`

These files exist in `apps/agentos/` but are missing from `CTRL/`. They contain working, tested features.

### Scripts Missing from `CTRL/scripts/`

| File | Lines | What It Adds | Port Priority |
|------|-------|-------------|---------------|
| `audio.js` | — | System sound effects | Low |
| `backup.js` | — | User data backup/restore | Medium |
| `dock-enhancements.js` | — | Dock polish (badges, hover effects) | Medium |
| `dragdrop.js` | — | Drag-and-drop operations between apps | Medium |
| `gestures.js` | — | Touch/trackpad gesture handling | Medium |
| `hotkeys.js` | ~498 | Global keyboard shortcuts system | **High** |
| `lockscreen.js` | — | Lock screen with password | Medium |
| `permissions.js` | — | App permission management | **High** |
| `popout.js` | — | Pop-out windows | Low |
| `previews.js` | — | Hover previews / thumbnails | Low |
| `security.js` | — | Security policies & sandboxing | **High** |
| `shortcuts.js` | ~605 | Desktop shortcut management | Medium |
| `sounds.js` | — | Sound management | Low |
| `spotlight.js` | ~678 | Spotlight/command palette search | **High** |
| `terminal.js` | — | Built-in terminal emulator | Medium |
| `widgets.js` | ~260 | Desktop widgets engine | Medium |
| `workspaces.js` | — | Virtual desktop / workspace support | Medium |

### Root JS Files Missing from `CTRL/`

| File | Lines | What It Adds | Port Priority |
|------|-------|-------------|---------------|
| `os-features.js` | 1,308 | IframePool, VirtualList, PerfMonitor, Mission Control, NotificationCenter, Show Desktop, Aero Peek, Window Badges, Accessibility, Hot Corner | **High** |
| `os-enhancements.js` | 2,080 | Quick Settings panel, System Tray (battery/network/clock), Mini Calendar, Brightness/Volume, Desktop Drag-Drop, Sound controls, Spotlight Search | **High** |

### Apps Missing from `CTRL/appdata/`

| File | Description | CTRL Alternative |
|------|-------------|-----------------|
| `app-template.html` | Developer template for building apps | None — should port |
| `appstore.html` | App store UI | `store.html` exists — verify parity |
| `assistant.html` | AI assistant app | `copilot.html` exists (Sperax) |
| `taskmanager.html` | Running apps viewer with force-close | None — should port |
| `terminal.html` | Built-in terminal | None — should port |

---

## Priority 2: How to Port `os-features.js`

This is the single highest-impact file to bring to CTRL. Detailed instructions:

### Step 1: Copy and Rename
```bash
cp apps/agentos/os-features.js CTRL/scripts/os-features.js
```

### Step 2: Apply Selector Renames
| AgentOS Selector | CTRL Selector |
|-----------------|---------------|
| `#agentosnav` | `#ctrlnav` |
| `agentos.css` | `ctrl.css` |
| `agentos-include` | `ctrl-include` |

Only one reference to `#agentosnav` appears (in `patchClickableElements()`). Change:
```js
var taskbarNavs = document.querySelectorAll('#agentosnav [onclick], #agentosnav biv');
```
to:
```js
var taskbarNavs = document.querySelectorAll('#ctrlnav [onclick], #ctrlnav biv');
```

### Step 3: Update Header Comment
Change `AgentOS — OS Features v2` to `CTRL — OS Features v2`

### Step 4: Add Script Tag to `CTRL/index.html`
After the existing script tags (line ~15), add:
```html
<script src="scripts/os-features.js" defer></script>
```

### Step 5: Add Required HTML Containers to `CTRL/index.html`
Add before `</body>`:
```html
<!-- Mission Control -->
<div id="mission-control">
    <div id="mc-windows-grid"></div>
</div>

<!-- Notification Center -->
<div id="notification-center">
    <div id="nc-header">
        <span id="nc-bell-icon" class="material-symbols-rounded">notifications</span>
        <span>Notifications</span>
        <button id="nc-dnd-toggle" onclick="notificationCenter.toggleDND()">
            <span id="nc-dnd-icon" class="material-symbols-rounded">notifications</span>
        </button>
        <button onclick="notificationCenter.clearAll()">Clear all</button>
    </div>
    <div id="nc-list"></div>
    <div id="nc-empty" style="display:none;">
        <span class="material-symbols-rounded">notifications_none</span>
        No notifications
    </div>
</div>

<!-- Notification Badge (add inside #ctrlnav systray area) -->
<!-- <span id="nc-badge" style="display:none;"></span> -->
<!-- <span id="nc-trigger" onclick="notificationCenter.toggle()">...</span> -->
```

### Step 6: Add CSS
Add to `CTRL/style.css` — styles for:
- `#mission-control` — fullscreen overlay with grid layout
- `.mc-window-preview`, `.mc-thumb`, `.mc-title`, `.mc-close-btn`
- `#notification-center` — slide-in panel from right
- `.nc-group`, `.nc-item`, `.nc-item-time`, `.nc-badge-pulse`
- `.sr-only` — screen reader only class
- `.taskbar-badge` — window count badge on taskbar icons

### Features Gained After Port
- **IframePool** — recycled iframes for app windows (perf boost)
- **VirtualList** — virtual scrolling for large lists
- **PerfMonitor** — dev FPS/memory overlay
- **Mission Control** — F3 window overview (Exposé-style)
- **NotificationCenter** — grouped notifications with swipe dismiss, DND, badges
- **Show Desktop** — Ctrl+D minimize/restore all
- **Aero Peek** — hover taskbar edge to fade windows
- **Window Badges** — per-app count on taskbar/dock
- **Accessibility** — screen reader, focus traps, keyboard nav, ARIA
- **Hot Corner** — top-left triggers Mission Control

---

## Priority 3: How to Port `os-enhancements.js`

### Step 1: Copy and Rename
```bash
cp apps/agentos/os-enhancements.js CTRL/scripts/os-enhancements.js
```

### Step 2: Apply Selector Renames
Same pattern as os-features.js — replace `#agentosnav` → `#ctrlnav`.

### Step 3: Add Script Tag
```html
<script src="scripts/os-enhancements.js" defer></script>
```

### Step 4: Add Required HTML
The enhancements file expects these elements in `index.html`:
- `#quicksettings` — Quick Settings panel
- `#qs-brightness-slider`, `#qs-volume-slider` — sliders
- `#systray-battery-pct`, `#systray-battery-btn` — battery display
- `#time-display`, `.systray-clock-btn` — clock/time
- `#qs-dnd` — DND toggle in quick settings

### Features Gained
- **Quick Settings** — brightness, volume, DND, WiFi toggles
- **System Tray** — battery level, network status, clock
- **Mini Calendar** — date picker in quick settings
- **Brightness/Volume** — slider controls
- **Spotlight Search** — Ctrl+Space command palette (apps, files, settings, store)
- **Desktop Drag-Drop** — selection rectangle on desktop
- **Sound System** — mute/unmute, volume slider, tray icon

---

## Priority 4: Cleanup Items

### Files to Remove
| File | Reason |
|------|--------|
| `CTRL/appdata/files.html.bak` | Old file explorer backup |
| `CTRL/appdata/files.html.new` | Leftover from rewrite |
| `CTRL/assets/speraxlogo.jpg` | Old Sperax logo — unreferenced |
| `CTRL/assets/speraxlogo.png` | Old Sperax logo — unreferenced |
| `CTRL/assets/speraxos.svg` | Old SperaxOS logo — unreferenced |
| `CTRL/CNAME` | Empty file, no custom domain configured |

### Config Items to Review
| Item | Current Value | Action |
|------|--------------|--------|
| Google Analytics `G-MSQVF245Z2` | In `index.html` line 22 | Verify this is YOUR property, or replace/remove |
| `CTRL/sw.js` | Service worker | Verify cache list matches current file names |
| `CTRL/webmanifest.json` | PWA manifest | Verify icon paths and app name are "CTRL" |

### Stale Asset References
- `CTRL/assets/hi.txt` — verify purpose or remove
- Various screenshot PNGs at root (`app search wide.png`, `file select narrow.png`, etc.) — move to `docs/` or `screens/` if used in README, else remove

---

## Improvement Architecture: Long-Term

### 1. Consolidate Enhancement Files (IMP-002)
Currently there are overlapping systems:
- `os-features.js` (1,308 lines) — monolithic, overlaps with dedicated scripts
- `os-enhancements.js` (2,080 lines) — monolithic, overlaps with dedicated scripts
- `scripts/hotkeys.js` (498 lines) — dedicated keyboard shortcuts
- `scripts/shortcuts.js` (605 lines) — dedicated desktop shortcuts
- `scripts/spotlight.js` (678 lines) — dedicated search
- `scripts/widgets.js` (260 lines) — dedicated widgets
- `scripts/lockscreen.js` — dedicated lock screen
- `scripts/sounds.js` — dedicated sound

**Recommended approach:** Port `os-features.js` and `os-enhancements.js` as-is first (get features working), then break them apart into the dedicated `scripts/` files in a second pass. Don't refactor while porting — too risky.

### 2. CSS Architecture (IMP-001)
Current state: multiple overlapping CSS files. Target:
1. `ctrl.css` — design tokens only (CSS variables, light/dark)
2. `style.css` — all component styles (single file, no `!important`)
3. Remove any `os-design-system.css` or `os-enhancements.css` if they exist

### 3. Module System
Currently everything is `<script>` tags with globals. Consider a lightweight approach:
- Keep globals for now (minimal refactor risk)
- Add `jsconfig.json` with `checkJs: true` for type safety
- Consider ES modules (`type="module"`) for new scripts only

---

## Cross-Reference to Other Docs

| Document | Focus Area |
|----------|-----------|
| `improvements/WIN12-PORTING-TASKS.md` | 30 specific tasks for porting win12 visual features (glass blur, animations, start menu, widgets, etc.) |
| `improvements/browser-app-improvements.md` | 18 improvements for the tabbed browser app |
| `improvements/file-explorer.md` | 20 improvements for the file explorer app |
| `improvements/rebrand-and-os-features.md` | Rebrand status, os-features.js porting details, script inventory |
| `docs/WIN12-ARCHITECTURE.md` | 2,484-line reference doc of win12 internals (the Rosetta Stone for porting) |

---

## Agent Quick-Start Checklist

1. Clone CTRL: `git clone https://github.com/nirholas/CTRL.git`
2. Serve locally: `python3 -m http.server 8020` (or any static server)
3. Open `http://localhost:8020` — you'll see the boot → login → desktop flow
4. Read this doc for priorities
5. Read `docs/WIN12-ARCHITECTURE.md` Section N (mapping table) before any porting work
6. For any porting task: read the source in `apps/agentos/` (from `nirholas/swarms`), rename selectors, test in browser
7. Commit to `nirholas/CTRL` repo on `main` branch

### Git Config
```bash
git config user.name "nirholas"
git config user.email "nirholas@users.noreply.github.com"
```

---

## Task Priority Matrix

| Priority | Tasks | Impact |
|----------|-------|--------|
| **Do First** | Port `os-features.js` → `CTRL/scripts/` | Adds 11 features in one file |
| **Do Second** | Port `os-enhancements.js` → `CTRL/scripts/` | Adds system tray, quick settings, spotlight |
| **Do Third** | WIN12 TASK-001 through TASK-005 (CSS-only) | Visual polish — glass blur, variables, animations |
| **Do Fourth** | Port `hotkeys.js`, `permissions.js`, `security.js` | Core OS infrastructure |
| **Do Fifth** | WIN12 TASK-006, 012, 018 (JS+CSS) | Minimize, start menu, settings |
| **Then** | Browser + File Explorer improvements | App-level polish |
| **Nice to have** | i18n, PWA, boot sequence, desktop icons | Full OS experience |
