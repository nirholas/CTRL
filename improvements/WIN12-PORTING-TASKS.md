# WIN12 Porting — Agent Task Board

> **Source**: `CTRL/docs/WIN12-ARCHITECTURE.md` (2484 lines, 17 sections, 48 MISSING entries)
> **Target codebase**: `CTRL/` — vanilla JS web OS (kernel/IPC architecture, iframe app sandbox, IndexedDB per-user storage)
> **Reference codebase**: `win12/` — jQuery-based Windows 12 simulator with polished UI
> **Date**: 2026-03-12

---

## How to Use This Document

Each task below is a self-contained work unit an agent can pick up independently.
Tasks are grouped by phase (highest impact first) and tagged with:

- **Complexity**: `CSS-only` | `JS+CSS` | `Architecture` | `New app`
- **Effort**: `Low` | `Medium` | `High`
- **Priority**: `P0` (critical) | `P1` (high) | `P2` (medium) | `P3` (nice-to-have)
- **Files to modify**: exact paths relative to `CTRL/`
- **Reference**: section in `WIN12-ARCHITECTURE.md` to read first

**Before starting any task**: Read the referenced section in `docs/WIN12-ARCHITECTURE.md` for exact CSS values, class names, function signatures, and DOM structure from win12.

---

## Phase 1 — Visual Foundation (CSS-Only, Immediate Impact)

### TASK-001: Glass/Blur Effects
- **Priority**: P0
- **Complexity**: CSS-only | Effort: Low
- **Status**: NOT STARTED
- **Description**: Add `backdrop-filter: saturate(3.5) contrast(0.8) blur(60px)` to focused windows, taskbar, context menus, and panels. Win12 uses this extensively for its premium feel.
- **Files to modify**: `style.css`, `ctrl.css`
- **Reference**: WIN12-ARCHITECTURE.md Section C (CSS Visual System), Section N (CSS Visual mapping table)
- **Acceptance criteria**:
  - Focused windows (`.window` equivalent) get glass blur
  - Taskbar (`<nav>`) gets glass blur
  - Context menus get glass blur
  - Unfocused windows use `var(--unfoc)` solid background (no blur)

### TASK-002: Full CSS Variable Set (Light + Dark)
- **Priority**: P0
- **Complexity**: CSS-only | Effort: Low
- **Status**: NOT STARTED
- **Description**: CTRL currently has dark-only variables (`--col-bg1:#101010`, etc.). Win12 has a complete light+dark scheme using `:root` (light) and `:root.dark` (dark). Extend `ctrl.css` `:root` to include all win12 variable names so theming is possible.
- **Files to modify**: `ctrl.css`
- **Reference**: WIN12-ARCHITECTURE.md Section C lines on `:root` (40 light-mode variables) and `:root.dark` (dark-mode overrides)
- **Key variables to add**:
  - `--bg70`, `--bg50`, `--bg30` (alpha backgrounds for glass)
  - `--unfoc` (unfocused window solid color)
  - `--hover-b` (button hover color)
  - `--sd` (shadow color)
  - `--theme-1` / `--theme-2` (accent gradient pair: `#ad6eca` / `#3b91d8`)
  - `--bgul` (wallpaper URL)
  - `--mica` (mica gradient)
- **Acceptance criteria**:
  - `:root` declares full light-mode variable set
  - `:root.dark` declares dark-mode overrides
  - All existing CTRL components still render correctly with new variables

### TASK-003: Window Show/Hide/Focus Animations
- **Priority**: P0
- **Complexity**: CSS-only | Effort: Low
- **Status**: NOT STARTED
- **Description**: Win12 windows have a smooth show animation: `.show-begin` (sets `display:flex`) → `.show` (removes scale transform, fades in). CTRL windows appear/disappear instantly. Port the two-class transition pattern.
- **Files to modify**: `style.css`, `scripts/windman.js`
- **Reference**: WIN12-ARCHITECTURE.md Section D (Window Management), Appendix "Window Show Animation (CSS)"
- **CSS to add**:
  ```css
  .window { transform: scale(0.7); opacity: 0; transition: cubic-bezier(0.9,0,0.1,1) 200ms; }
  .window.show-begin { display: flex; flex-direction: column; }
  .window.show { transform: none; opacity: 1; }
  ```
- **JS change**: In `windman.js`, when opening a window: add `show-begin` class, then on next frame add `show` class. On close: remove `show`, wait for transition, then remove `show-begin`.
- **Acceptance criteria**:
  - Windows scale up smoothly on open
  - Windows scale down on close
  - No layout shift during animation

### TASK-004: Context Menu Glass Styling
- **Priority**: P0
- **Complexity**: CSS-only | Effort: Low
- **Status**: NOT STARTED
- **Description**: CTRL has `scripts/ctxmenu.js` for context menus but the styling doesn't match win12's frosted glass look. Add glass blur, rounded corners, shadow, and hover states matching win12's `#cm` styles.
- **Files to modify**: `style.css` (context menu rules)
- **Reference**: WIN12-ARCHITECTURE.md Section H (Context Menu System)
- **Key CSS properties**:
  - `backdrop-filter: saturate(3) blur(60px)`
  - `border-radius: 10px`
  - `border: 1.5px solid #6f6f6f30`
  - `box-shadow: 3px 2px 12px var(--sd)`
  - Menu items: `border-radius: 5px`, hover: `background: var(--hover-b)`
- **Acceptance criteria**:
  - Context menus have frosted glass appearance
  - Hover highlights are rounded
  - Separator lines use `border-top: 1px solid var(--border)`

### TASK-005: Taskbar Glass + Gradient Indicator
- **Priority**: P0
- **Complexity**: CSS-only | Effort: Low
- **Status**: NOT STARTED
- **Description**: Style the `<nav>` taskbar with glass blur and add a colored underline indicator for the active app (win12 uses `linear-gradient(var(--theme-1), var(--theme-2))` on active dock items).
- **Files to modify**: `style.css`
- **Reference**: WIN12-ARCHITECTURE.md Section E (Taskbar System)
- **Acceptance criteria**:
  - Taskbar has frosted glass background
  - Active app has gradient underline indicator
  - Hover effects on taskbar items

---

## Phase 2 — Window Management (JS+CSS)

### TASK-006: Window Minimize to Taskbar
- **Priority**: P0
- **Complexity**: JS+CSS | Effort: Medium
- **Status**: NOT STARTED
- **Description**: CTRL has no minimize. Win12's `minwin(name)` hides the window and restores it on taskbar click. Build `minwin()` that sets `display:none` + adds `.min` class, and `taskbarclick()` that toggles between show/minimize.
- **Files to modify**: `scripts/windman.js`, `script.js`, `style.css`
- **Reference**: WIN12-ARCHITECTURE.md Section D (`minwin`), Section E (`taskbarclick`)
- **Implementation notes**:
  - Add `.min` class to window element
  - Track `visualState: 'minimized'` in `winds{}` object
  - On taskbar icon click: if minimized → restore; if focused → minimize; if unfocused → focus
  - Store previous position/size before minimize for restore
- **Acceptance criteria**:
  - Minimize button works on window title bar
  - Clicking taskbar icon toggles minimize/restore
  - Minimized windows don't appear in the workspace

### TASK-007: Position Save/Restore for Maximize
- **Priority**: P1
- **Complexity**: JS+CSS | Effort: Low
- **Status**: NOT STARTED
- **Description**: Win12 saves `data-pos-x`, `data-pos-y`, `data-pos-w`, `data-pos-h` before maximizing so restoring returns to the original position. CTRL's maximize doesn't save position.
- **Files to modify**: `scripts/windman.js`
- **Reference**: WIN12-ARCHITECTURE.md Section D (`maxwin`, `data-pos-x/y` save)
- **Acceptance criteria**:
  - Before maximize: store x/y/w/h on the window element or in `winds{}`
  - Un-maximize: restore to exact saved position and size
  - Double-click title bar toggles maximize

### TASK-008: Z-Order Management
- **Priority**: P1
- **Complexity**: JS+CSS | Effort: Medium
- **Status**: NOT STARTED
- **Description**: Win12's `orderwin()` reassigns z-index to all windows based on focus order. CTRL relies on implicit DOM order. Implement explicit z-index management so clicking a window reliably brings it to front.
- **Files to modify**: `scripts/windman.js`, `script.js`
- **Reference**: WIN12-ARCHITECTURE.md Section D (`orderwin`, `focwin`, `wo[]` array)
- **Implementation notes**:
  - Maintain a focus stack (array of window IDs ordered by last-focused)
  - On focus: move window to top of stack, reassign z-index 50..50+n
  - Remove from stack on close
- **Acceptance criteria**:
  - Clicking any window brings it fully to front
  - New windows open on top
  - Z-index is consistent after rapid window switching

### TASK-009: Window Resize (8-Direction)
- **Priority**: P2
- **Complexity**: JS+CSS | Effort: High
- **Status**: NOT STARTED
- **Description**: CTRL windows are not resizable. Win12 has 8-direction resize via invisible edge/corner handles. Build the resize system.
- **Files to modify**: `scripts/windman.js`, `style.css`
- **Reference**: WIN12-ARCHITECTURE.md Section D (`resizewin()`, 8-direction handles)
- **Implementation notes**:
  - Add 8 invisible resize handles (n, s, e, w, ne, nw, se, sw) as positioned elements around window border
  - Each handle sets appropriate cursor and drags the corresponding edge
  - Minimum size enforcement (e.g., 200x150)
  - Add `.notrans` class during resize to disable CSS transitions
- **Acceptance criteria**:
  - All 8 resize directions work
  - Cursor changes on hover over edges/corners
  - Minimum window size is enforced
  - Transitions disabled during drag for smooth resizing

### TASK-010: Window Snap (Half-Screen)
- **Priority**: P2
- **Complexity**: JS+CSS | Effort: Medium
- **Status**: NOT STARTED
- **Description**: Win12 supports snap-left and snap-right when dragging to screen edges. CTRL's `windman.js` has snap zone detection but it needs polish. Add `.left` and `.right` CSS classes and a snap preview overlay.
- **Files to modify**: `scripts/windman.js`, `style.css`
- **Reference**: WIN12-ARCHITECTURE.md Section D (Window drag/snap, `#window-fill` preview)
- **Acceptance criteria**:
  - Dragging to left edge snaps window to left half
  - Dragging to right edge snaps window to right half
  - Dragging to top edge maximizes
  - Preview overlay shows target zone before drop
  - Un-snap by dragging away from edge

### TASK-011: Taskbar Click-to-Minimize Toggle
- **Priority**: P2
- **Complexity**: JS+CSS | Effort: Medium
- **Status**: NOT STARTED
- **Description**: Win12's `taskbarclick()` cycles: click focused app → minimize; click minimized app → restore; click unfocused app → focus. Requires TASK-006 (minimize) first.
- **Dependencies**: TASK-006
- **Files to modify**: `script.js` (taskbar click handler)
- **Reference**: WIN12-ARCHITECTURE.md Section E (`taskbarclick`)
- **Acceptance criteria**:
  - Taskbar icon click on focused window minimizes it
  - Taskbar icon click on minimized window restores it
  - Taskbar icon click on unfocused window brings it to front

---

## Phase 3 — Shell Features (JS+CSS / Architecture)

### TASK-012: Start Menu Panel
- **Priority**: P0
- **Complexity**: Architecture | Effort: High
- **Status**: NOT STARTED
- **Description**: CTRL has no start menu (the biggest single MISSING feature). Win12's `#start-menu` has a pinned apps grid, all-apps alphabetic list, user profile section, and power buttons. Build the full panel.
- **Files to modify**: `index.html`, `style.css`, `script.js` (new `startmenu.js` in `scripts/`)
- **Reference**: WIN12-ARCHITECTURE.md Section F (Start Menu System — full layout, grid dimensions, animation, DOM structure)
- **Implementation notes**:
  - Start menu is a full panel with slide-up animation
  - Pinned apps grid (4-column layout)
  - "All apps" button toggles to alphabetic list with letter headers
  - User profile at bottom-left
  - Power button at bottom-right (sleep/shutdown/restart)
  - Search bar at top
  - Show/hide with `openDockWidget("start-menu")` pattern
  - Backdrop: glass blur
- **Acceptance criteria**:
  - Start menu opens/closes with smooth animation
  - Pinned apps grid displays and launches apps
  - All-apps list shows installed apps alphabetically
  - Search filters app list
  - Power buttons work (at minimum: log out)
  - Click outside or Escape closes the menu

### TASK-013: Dark/Light Mode Toggle
- **Priority**: P1
- **Complexity**: JS+CSS | Effort: Medium
- **Status**: NOT STARTED
- **Dependencies**: TASK-002 (CSS variables)
- **Description**: CTRL is dark-only. Win12 has `toggletheme()` that adds/removes `.dark` on `:root`. Build the toggle and persist preference.
- **Files to modify**: `ctrl.css`, `script.js` or new `scripts/theme.js`
- **Reference**: WIN12-ARCHITECTURE.md Section J (Theme & Personalization), Section N CSS mapping
- **Acceptance criteria**:
  - Toggle switches between light and dark mode
  - Preference persists across sessions (IndexedDB via system32)
  - All UI elements respond to theme change (taskbar, windows, menus, panels)

### TASK-014: Theme Accent Color Customization
- **Priority**: P1
- **Complexity**: JS+CSS | Effort: Medium
- **Status**: NOT STARTED
- **Description**: Win12 uses `--theme-1` / `--theme-2` for a dual-accent gradient. CTRL has a single `--colors-accent`. Add support for user-selectable accent colors with persistence.
- **Files to modify**: `ctrl.css`, `script.js`
- **Reference**: WIN12-ARCHITECTURE.md Section J
- **Acceptance criteria**:
  - User can pick accent color(s) (Settings UI or quick settings)
  - Accent color applies to buttons, indicators, active states, selection highlights
  - Persisted via IndexedDB

### TASK-015: Toast Notification System
- **Priority**: P1
- **Complexity**: JS+CSS | Effort: Medium
- **Status**: NOT STARTED
- **Description**: Win12 has `.msg` toast notifications that slide in from the right with title, body, icon, and auto-dismiss. CTRL has no toast system.
- **Files to modify**: `style.css`, new `scripts/toast.js` or extend `os-features.js`
- **Reference**: WIN12-ARCHITECTURE.md Section N (`.msg` toast)
- **Acceptance criteria**:
  - Toast appears in top-right corner
  - Slide-in animation
  - Auto-dismiss after configurable timeout (default 5s)
  - Manual dismiss via close button or swipe
  - Stacks multiple toasts vertically
  - Respects DND mode

### TASK-016: Modal Dialog System
- **Priority**: P1
- **Complexity**: JS+CSS | Effort: Medium
- **Status**: NOT STARTED
- **Description**: Win12 has `#notice-back` + `#notice` for modal dialogs (confirm, alert, prompt). CTRL has no modal dialog system.
- **Files to modify**: `style.css`, new `scripts/dialog.js`
- **Reference**: WIN12-ARCHITECTURE.md Section N (`#notice-back` + `#notice`)
- **Implementation notes**:
  - Backdrop overlay dims the desktop
  - Dialog panel: glass blur, centered, rounded corners
  - API: `showDialog({ title, body, buttons: [{label, action}] })` returns Promise
  - Focus trapped within dialog
  - Escape to cancel/close
- **Acceptance criteria**:
  - `showDialog()` function is globally available
  - Backdrop blocks interaction with windows behind
  - Focus trap works (Tab cycles within dialog)
  - Promise resolves with the button clicked

### TASK-017: Tooltip System
- **Priority**: P2
- **Complexity**: JS+CSS | Effort: Low
- **Status**: NOT STARTED
- **Description**: Win12 has `#descp` positioned tooltip on hover over taskbar items and buttons. CTRL has no hover tooltip.
- **Files to modify**: `style.css`, new `scripts/tooltip.js` or extend existing
- **Reference**: WIN12-ARCHITECTURE.md Section N (`#descp` tooltip)
- **Acceptance criteria**:
  - Tooltip appears above hovered element after 500ms delay
  - Tooltip follows cursor horizontally
  - Tooltip dismisses on mouse leave
  - Respects viewport bounds (doesn't clip off-screen)

---

## Phase 4 — Apps & Widgets (New App / Architecture)

### TASK-018: Settings App
- **Priority**: P0
- **Complexity**: New app | Effort: High
- **Status**: NOT STARTED
- **Description**: CTRL has no settings UI. Win12's `apps.setting` has pages for personalization (wallpaper, theme, accent color), system info, about. Build as an iframe app in `appdata/`.
- **Files to modify**: new `appdata/settings.html` (exists but may need rebuild)
- **Reference**: WIN12-ARCHITECTURE.md Section I (App Architecture), Section J (Theme/Personalization)
- **Implementation notes**:
  - Multi-page layout (sidebar navigation)
  - Pages: Personalization (wallpaper picker, theme toggle, accent color), System (device info, storage usage), About
  - Communicates with main OS via NTX API for applying theme changes
  - Persists settings via `system32.js` IndexedDB
- **Acceptance criteria**:
  - Settings app opens as iframe window
  - Wallpaper can be changed (from presets or URL)
  - Theme can be toggled light/dark
  - Accent color can be changed
  - Changes apply immediately and persist across sessions

### TASK-019: Calculator App
- **Priority**: P2
- **Complexity**: New app | Effort: Low
- **Status**: NOT STARTED
- **Description**: Port win12's `Calculator` class from `calculator_kernel.js`. Uses Big.js for precision. Build as iframe app.
- **Files to modify**: new `appdata/calculator.html` (exists — verify and update)
- **Reference**: WIN12-ARCHITECTURE.md Section I (Calculator class, `apps.calc`)
- **Acceptance criteria**:
  - Standard calculator operations (+, -, ×, ÷)
  - Decimal precision via Big.js
  - Keyboard input support
  - Memory functions (M+, M-, MR, MC)

### TASK-020: Tab System for Windows
- **Priority**: P2
- **Complexity**: JS+CSS | Effort: High
- **Status**: NOT STARTED
- **Description**: Win12's `m_tab` system in `tab.js` adds tabs to any window (like browser tabs). CTRL windows have no tab support. Build a reusable tab bar component.
- **Files to modify**: `scripts/windman.js`, `style.css`, new `scripts/tabs.js`
- **Reference**: WIN12-ARCHITECTURE.md Section D (tab system in `tab.js`)
- **Implementation notes**:
  - Tab bar below title bar
  - Add/remove/reorder tabs
  - Each tab can host a different iframe
  - Active tab highlighted, others dimmed
  - Close button per tab
  - "+" button to add new tab
- **Acceptance criteria**:
  - Any window can opt into tabbed mode
  - Tabs switch content within the same window frame
  - Tab close works without closing the window
  - At least File Explorer and Browser support tabs

### TASK-021: Widget Panel
- **Priority**: P2
- **Complexity**: Architecture | Effort: High
- **Status**: NOT STARTED
- **Description**: Win12 has a full widget system with a slide-out panel, widget registration, and desktop widget grid. CTRL has `scripts/widgets.js` (260 lines) but it's minimal. Build the full panel.
- **Files to modify**: `scripts/widgets.js`, `style.css`, `index.html`
- **Reference**: WIN12-ARCHITECTURE.md Section G (Widget System), Section N (Widgets mapping)
- **Implementation notes**:
  - Widget panel slides from left edge
  - Widget registration API: `registerWidget(id, { title, icon, render, update })`
  - Default widgets: clock, weather (API), system monitor (CPU/RAM rings)
  - Widget edit mode: drag to reorder
  - Desktop widget placement (optional, lower priority)
- **Acceptance criteria**:
  - Panel slides open/closed
  - At least 2 working widgets (clock, system info)
  - Widgets auto-update on an interval
  - Widget API documented for third-party widgets

### TASK-022: Task Manager
- **Priority**: P2
- **Complexity**: New app | Effort: High
- **Status**: NOT STARTED
- **Description**: Win12 has `apps.taskmgr` with process list, CPU/memory charts, and force-close. Build as iframe app that uses NTX API to query running windows.
- **Files to modify**: `appdata/taskmanager.html` (exists — verify and update)
- **Reference**: WIN12-ARCHITECTURE.md Section I (`apps.taskmgr`)
- **Acceptance criteria**:
  - Lists all open windows/apps with their status
  - Shows memory usage if available (`performance.memory`)
  - Force-close button per process
  - SVG/Canvas performance charts (optional but desirable)

---

## Phase 5 — Polish & Nice-to-Haves

### TASK-023: Utility CSS Classes
- **Priority**: P2
- **Complexity**: CSS-only | Effort: Low
- **Status**: NOT STARTED
- **Description**: Win12 uses `.nobr` (no border-radius), `.nosd` (no shadow), `.notrans` (no transitions) utility classes. CTRL lacks these. Add them.
- **Files to modify**: `ctrl.css` or `style.css`
- **Reference**: WIN12-ARCHITECTURE.md Section C
- **Acceptance criteria**: Classes exist and work as expected

### TASK-024: Mica Material Effect
- **Priority**: P3
- **Complexity**: CSS-only | Effort: Low
- **Status**: NOT STARTED
- **Description**: Win12's `:root.mica .window.foc` uses a fixed gradient background (`--mica`) that simulates frosted glass over the wallpaper without `backdrop-filter`. Lower GPU cost alternative.
- **Files to modify**: `ctrl.css`, `style.css`
- **Reference**: WIN12-ARCHITECTURE.md Appendix "Mica Material"
- **Acceptance criteria**: When mica mode is active, focused windows show through-gradient effect

### TASK-025: Boot/Shutdown Sequences
- **Priority**: P3
- **Complexity**: JS+CSS | Effort: Low
- **Status**: NOT STARTED
- **Description**: Win12 has `boot.html` (loading bar + logo), `shutdown.html` (spinner + fade to black). CTRL goes straight to login. Add visual sequences.
- **Files to modify**: `index.html` or new `boot.html`, `style.css`
- **Reference**: WIN12-ARCHITECTURE.md Section M (Boot & Login)
- **Acceptance criteria**:
  - Boot sequence shows logo + progress animation before login
  - Shutdown shows spinner + fade before redirect/close

### TASK-026: i18n Framework
- **Priority**: P2
- **Complexity**: Architecture | Effort: High
- **Status**: NOT STARTED
- **Description**: Win12 uses jquery.i18n.properties for multi-language support. CTRL has no i18n. Build a vanilla JS equivalent.
- **Files to modify**: new `scripts/i18n.js`, translation JSON files
- **Reference**: WIN12-ARCHITECTURE.md Section K (i18n System)
- **Implementation notes**:
  - Key-value translation files per locale (JSON)
  - `t('key')` function returns translated string
  - Language selector in settings
  - Fallback to English
  - Apply translations to all UI text on language change
- **Acceptance criteria**:
  - At least English + one other language
  - All static UI text uses translation keys
  - Language switch applies without page reload

### TASK-027: Search Panel
- **Priority**: P2
- **Complexity**: JS+CSS | Effort: Medium
- **Status**: NOT STARTED
- **Description**: Win12's `#search-win` provides system-wide search for apps, files, and settings. CTRL has `scripts/spotlight.js` (678 lines) — evaluate if it covers this or if it needs enhancement.
- **Files to modify**: `scripts/spotlight.js`, `style.css`
- **Reference**: WIN12-ARCHITECTURE.md Section F (Search in start menu)
- **Acceptance criteria**:
  - Search finds installed apps by name
  - Search finds files in the virtual filesystem
  - Results categorized (Apps, Files, Settings)
  - Keyboard navigation through results

### TASK-028: Desktop Icons
- **Priority**: P2
- **Complexity**: JS+CSS | Effort: Medium
- **Status**: NOT STARTED
- **Description**: Win12 has a `#desktop` area with draggable app icons in a grid. CTRL has no desktop icons.
- **Files to modify**: `index.html`, `style.css`, `script.js`
- **Reference**: WIN12-ARCHITECTURE.md Section N (`#desktop` icon area)
- **Implementation notes**:
  - CSS Grid layout on desktop area
  - Icons are draggable (snap to grid)
  - Double-click opens app
  - Right-click shows context menu
  - Default icons: Files, Terminal, Settings, Browser
- **Acceptance criteria**:
  - Desktop shows icon grid
  - Double-click launches corresponding app
  - Icons can be rearranged by drag
  - Right-click context menu on icons

### TASK-029: PWA Support
- **Priority**: P3
- **Complexity**: Architecture | Effort: Medium
- **Status**: NOT STARTED
- **Description**: Win12 registers a service worker for offline support. CTRL has `sw.js` but verify it's properly configured.
- **Files to modify**: `sw.js`, `webmanifest.json`, `script.js`
- **Reference**: WIN12-ARCHITECTURE.md Section N (PWA/service worker)
- **Acceptance criteria**:
  - Service worker registered and caching assets
  - App installable from browser
  - Works offline with cached assets

### TASK-030: Keyboard Shortcuts System
- **Priority**: P2
- **Complexity**: JS+CSS | Effort: Low
- **Status**: PARTIAL — `scripts/hotkeys.js` (498 lines) and `scripts/shortcuts.js` (605 lines) exist
- **Description**: Verify existing shortcut system covers win12 shortcuts and add missing ones.
- **Reference**: WIN12-ARCHITECTURE.md Appendix "Global Keyboard Shortcuts"
- **Key shortcuts to verify**:
  - F5 = refresh desktop
  - Ctrl+Win / Super = start menu
  - Ctrl+Shift+Escape = task manager
  - Ctrl+D = show desktop
  - F3 = mission control
- **Acceptance criteria**: All shortcuts work and are discoverable (help overlay)

---

## Improvement Suggestions — Beyond Win12 Parity

These are improvements that go beyond porting win12 features. They address issues found during code analysis.

### IMP-001: CSS Architecture Cleanup
- **Priority**: P1
- **Description**: The DESIGN-AUDIT.md documents that CSS tripled from ~2,837 to ~9,063 lines across 4 overlapping files (`style.css`, `ctrl.css`, `os-enhancements.css`, `os-design-system.css`) with competing `!important` declarations. Consolidate into a clean layered architecture:
  1. `ctrl.css` — design tokens (variables only)
  2. `style.css` — component styles
  3. Remove `os-design-system.css` and `os-enhancements.css` entirely by merging into `style.css`
- **Files**: `style.css`, `ctrl.css`, `os-design-system.css`, `os-enhancements.css`
- **Acceptance criteria**: No `!important` declarations except for accessibility overrides. Single source of truth for each component's styles.

### IMP-002: Duplicate Code in os-features.js and os-enhancements.js
- **Priority**: P1
- **Description**: Both `os-features.js` (1,308 lines) and `os-enhancements.js` (2,080 lines) contain overlapping functionality: keyboard shortcuts, notification logic, lock screen, spotlight search. Meanwhile, dedicated files exist in `scripts/` for all of these (`hotkeys.js`, `shortcuts.js`, `lockscreen.js`, `spotlight.js`, `sounds.js`, `widgets.js`). The monolithic enhancement files should be deprecated and their unique logic migrated to the dedicated `scripts/` modules.
- **Files**: `os-features.js`, `os-enhancements.js`, `scripts/*.js`
- **Acceptance criteria**:
  - All unique logic from os-features.js is in dedicated scripts/ files
  - All unique logic from os-enhancements.js is in dedicated scripts/ files
  - os-features.js and os-enhancements.js are removed or reduced to thin shims
  - No functionality regression

### IMP-003: Type Safety Improvements
- **Priority**: P2
- **Description**: The codebase uses JSDoc `@type` annotations inconsistently (some casts like `/** @type {HTMLIFrameElement} */` in os-features.js, but most code lacks type info). Add a `jsconfig.json` with `checkJs: true` and add JSDoc types to all public APIs in `scripts/`.
- **Files**: `jsconfig.json`, all `scripts/*.js`
- **Acceptance criteria**: `jsconfig.json` enables type checking; public functions in core scripts have JSDoc `@param`/`@returns` annotations; no type errors

### IMP-004: Performance — Reduce Interval Polling
- **Priority**: P2
- **Description**: Multiple `setInterval` calls update UI elements independently (clock every 1s, widget updates every 3s, battery polling, network monitoring, notification badge). Consolidate into a single `requestAnimationFrame` loop or a shared tick system.
- **Files**: `os-enhancements.js`, `scripts/widgets.js`, `script.js`
- **Acceptance criteria**: Single coordinated update loop; no more than 2 active `setInterval` timers at any time

### IMP-005: Security — CSP Headers and iframe Sandbox
- **Priority**: P1
- **Description**: iframe apps from `appdata/` have full access to parent DOM via NTX message passing. Review `scripts/ntx.js` and `scripts/permissions.js` to ensure:
  - Apps can't read other apps' data
  - Apps can't modify kernel state directly
  - File system access is scoped to app's directory
  - Add `sandbox` attribute restrictions to app iframes where possible
- **Files**: `scripts/ntx.js`, `scripts/permissions.js`, `scripts/kernel.js`
- **Acceptance criteria**: iframe apps cannot escalate privileges beyond their declared permissions

### IMP-006: Accessibility Audit
- **Priority**: P1
- **Description**: `os-features.js` has good accessibility foundations (screen reader announcements, focus traps, keyboard navigation, ARIA labels). But coverage is incomplete — window title bars lack ARIA roles, taskbar items need `aria-label`, and many interactive elements use `<div>` or `<biv>` instead of semantic elements.
- **Files**: `index.html`, `style.css`, `scripts/windman.js`
- **Acceptance criteria**:
  - All interactive elements have keyboard activation
  - Window title bars have `role="toolbar"` and button roles
  - Taskbar items have `aria-label` with app name
  - Focus management: opening a window focuses it; closing returns focus to previous

---

## Cross-Reference: Architecture Doc Sections

| Section | Topic | Key Info For Agents |
|---|---|---|
| A | File Map | Complete list of win12 source files with line counts |
| B | HTML Shell | DOM structure, element IDs, container hierarchy |
| C | CSS Visual System | All CSS variables, glass blur values, animation timings, scrollbar styles |
| D | Window Management | `showwin`/`hidewin`/`maxwin`/`minwin`/`focwin`/`resizewin` — full function signatures and behavior |
| E | Taskbar System | Dock layout, icon management, `taskbarclick()`, hover previews |
| F | Start Menu | Full DOM structure, pinned grid, all-apps list, animation CSS |
| G | Widget System | Widget registration, panel layout, desktop widget grid, update loop |
| H | Context Menu | Menu builder pattern, submenus, shortcut hints, DOM structure |
| I | App Architecture | `apps` object, app lifecycle, Explorer/Settings/Calculator/Terminal internals |
| J | Theme & Personalization | CSS variables, `toggletheme()`, accent colors, wallpaper picker |
| K | i18n | `loadlang()`, jquery.i18n.properties, translation file structure |
| L | Audio | Sound system, audio element pooling, system sounds list |
| M | Boot & Login | Boot sequence, BIOS, login screen, shutdown animation |
| N | Mapping Table | **The Rosetta Stone** — every win12 component mapped to its CTRL equivalent or MISSING |
| O | Porting Complexity | Priority matrix with effort estimates and dependencies |

---

## Quick Stats

- **Total tasks**: 30 (TASK-001 through TASK-030)
- **Improvement suggestions**: 6 (IMP-001 through IMP-006)
- **P0 tasks**: 7 (TASK-001, 002, 003, 004, 005, 006, 012, 018)
- **P1 tasks**: 7 (TASK-007, 008, 013, 014, 015, 016, IMP-001, IMP-002, IMP-005, IMP-006)
- **P2 tasks**: 12
- **P3 tasks**: 4
- **CSS-only (quick wins)**: 7 tasks
- **New apps to build**: 5 (settings, calculator, tab system, widget panel, task manager)
- **Architecture-level changes**: 5 (start menu, widget panel, i18n, PWA, CSS cleanup)

---

*Generated from analysis of `CTRL/docs/WIN12-ARCHITECTURE.md` (2484 lines) and the CTRL codebase.*
*Reference codebase: `win12/` at `/workspaces/swarms/win12/`*
