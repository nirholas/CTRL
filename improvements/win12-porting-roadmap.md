# Win12 Feature Porting — Roadmap & Remaining Work

**Date:** 2026-03-12  
**Reference:** `CTRL/docs/WIN12-ARCHITECTURE.md` (2484 lines, all 15 sections A-O)  
**Status:** Architecture reference document complete. Porting work not yet started.  
**Context:** The win12 repo (`/workspaces/swarms/win12/`) contains a jQuery-based Windows 12 simulator with excellent UI polish. We're extracting its visual patterns and UX features into CTRL (vanilla JS, IndexedDB-backed, iframe-sandboxed apps). The architecture doc is the single source of truth — agents should read it instead of win12 source files.

---

## What Was Completed

### WIN12-ARCHITECTURE.md — Full Reference Document
- [x] Read all 23 win12 source files exhaustively (desktop.js 2546 lines, desktop.css 2829 lines, apps.js 2067 lines, window.js 498 lines, widget.js 270 lines, tab.js 129 lines, etc.)
- [x] Read all key CTRL source files (script.js 2244 lines, system32.js 1180 lines, windman.js 522 lines, style.css 2687 lines, ctrl.css 173 lines, index.html 427 lines)
- [x] **Section A**: Complete file map of win12 repo (core vs asset classification)
- [x] **Section B**: HTML shell architecture — all DOM IDs, CSS/JS load order, boot flow
- [x] **Section C**: CSS visual system — all 26+ root variables (light+dark), glass/blur values for every selector, 7 animation keyframes with code, transition patterns, dark mode, theme colors, scrollbar styling, utility classes
- [x] **Section D**: Window management — `showwin`/`hidewin`/`maxwin`/`minwin`/`resizewin`, drag/snap system, z-order via `wo[]`, 8-direction resize, snap thresholds
- [x] **Section E**: Taskbar — HTML structure, icon add/remove, active indicator, system tray, auto-hide
- [x] **Section F**: Start menu — structure, app categories, search, animation
- [x] **Section G**: Widget system — grid layout, registration, 4 widget types, edit mode, weather/news APIs
- [x] **Section H**: Context menu — `cms` object with 15 named menus, `showcm()` positioning, menu item formats
- [x] **Section I**: App architecture — `apps` global object, full lifecycle, all 25+ apps listed with init/load/remove details, tab system
- [x] **Section J**: Theme & personalization — localStorage keys, color picker, toggle-able effects
- [x] **Section K**: i18n — `jquery.i18n.properties`, language file format, `data-i18n` attributes
- [x] **Section L**: Audio — startup sound, background music, voice input ball
- [x] **Section M**: Boot & login — complete flow from URL load to interactive desktop
- [x] **Section N**: Mapping table — 290 table rows across 7 subsections mapping every win12 component to CTRL equivalent or MISSING
- [x] **Section O**: Porting complexity assessment — 50+ features rated by complexity, 5-phase recommended porting order

### Verification Checks (all passing)
| Check | Required | Actual |
|---|---|---|
| Total lines | 2000+ | 2484 |
| `backdrop-filter` mentions | 5+ | 14 |
| `newwin` mentions | 3+ | 6 |
| `@keyframes` mentions | 5+ | 13 |
| `openapp` mentions | 3+ | 18 |
| `apps.` mentions | 20+ | 27 |
| `localStorage` mentions | 5+ | 23 |
| Sections (A-O) | 15 | 15 |
| Section N mapping rows | 30+ | 290 |

---

## What Needs to Be Done — By Phase

### Phase 1: Visual Foundation (CSS-only, no JS changes)

**Agent instructions:** Edit `CTRL/style.css` and `CTRL/ctrl.css` only. Reference Section C and Section O of `CTRL/docs/WIN12-ARCHITECTURE.md`.

| Task | Priority | Est. Effort | Details |
|---|---|---|---|
| Glass/blur on windows | High | Low | Add `backdrop-filter: blur(60px) saturate(3.5) contrast(0.8)` to `.window` when focused. See Section C "Glass/Blur Effects" for all selectors and exact values |
| Glass/blur on nav/taskbar | High | Low | Add `backdrop-filter: blur(20px) saturate(1.5)` to `nav` and dock elements |
| Glass/blur on context menus | High | Low | Add `backdrop-filter: blur(25px) saturate(2)` to `.contextmenu` |
| Glass/blur on dialogs/modals | Medium | Low | Add blur to `.navWindows`, `#appdmod`, `#searchwindow`, `#bios` |
| Window show/hide animation | High | Low | Add `.show-begin` and `.show` CSS classes with `transform: scale(0.7) → none`, `opacity: 0 → 1` transition at 200ms cubic-bezier(0.9,0,0.1,1) |
| Window minimize animation | High | Low | Add `.min` class: `top: 95%; transform: scale(0.3); opacity: 0` |
| `.notrans` utility class | Medium | Low | Add `.notrans { transition: none !important; }` for drag performance |
| `.nobr` / `.nosd` utility classes | Low | Low | `border-radius: 0 !important` / `box-shadow: none !important` |
| Taskbar icon appear/disappear | Medium | Low | Add `@keyframes task-show` and `@keyframes task-hide` (translateY 20px) |
| Mica material option | Low | Low | Add `--mica: linear-gradient(215deg,#2d161c,#102d53)` and `.mica .window.foc` selector |
| Light mode CSS variables | High | Medium | Add full `:root.light` block with all 26 win12 light-mode variables. See "Root CSS Variables — Light Mode" in Section C |

**How to verify:** Load CTRL in browser, check that windows have frosted glass background, taskbar is translucent, and context menus have blur.

---

### Phase 2: Window Management (JS+CSS)

**Agent instructions:** Edit `CTRL/scripts/windman.js` and `CTRL/style.css`. Reference Section D and Section N "Window Management" table.

| Task | Priority | Est. Effort | Details |
|---|---|---|---|
| Window minimize to taskbar | High | Medium | Implement `minim()` that adds `.min` class, hides window, dims taskbar icon. Restore on taskbar click. Win12's `minwin()` is at window.js:105-125 |
| Taskbar click-to-minimize toggle | High | Medium | If window is focused and user clicks its taskbar icon → minimize. If minimized → restore. If background → focus. Win12's `taskbarclick()` at window.js:450-498 |
| Position save/restore on maximize | Medium | Medium | Before maximizing, save current `left`/`top`/`width`/`height` to `data-pos-x`/`data-pos-y` attributes. On un-maximize, restore. Win12 uses `data-pos-x`, `data-pos-y` |
| Z-order management | Medium | Medium | Implement explicit z-index assignment like win12's `orderwin()`. Maintain an ordered array `wo[]`, set `z-index: 10 + i` (or +50 for topmost). Currently CTRL only uses `normalizeZIndexes()` |
| Window resize (8-direction) | Medium | High | Add 8 resize handles (top, bottom, left, right, 4 corners) as invisible 7px-wide divs. Min width: 400px, min height: 300px. Win12's `resizewin()` at window.js:127-200. CTRL's `windman.js` already has resize stubs at `attachResizeHandlers()` but with 10px handles and 50px min — align to win12 UX |
| Snap preview overlay | Low | Medium | Create `#window-fill` element that shows a blurred preview rectangle when dragging near screen edges. Win12 uses `backdrop-filter: blur(25px)` on `#window-fill` |
| `.window.foc` focus class | Medium | Low | Add `.foc` class to focused window with enhanced glass effect. Remove from others. Tie into `putwinontop()` |

**How to verify:** Open 3+ windows. Click taskbar icons to minimize/restore. Drag title bar to edges for snap. Drag corners to resize. Alt+Tab or click to change focus — focused window should have brighter glass.

---

### Phase 3: Shell Features (JS+CSS / Architecture)

**Agent instructions:** These are larger features. Each may need new files or significant edits to `CTRL/script.js`, `CTRL/index.html`, `CTRL/style.css`.

| Task | Priority | Est. Effort | Details |
|---|---|---|---|
| Dark/light mode toggle | High | Medium | Add `toggletheme()` function that toggles `.dark` class on `:root`. Store in localStorage key `'theme'`. Redefine all CSS vars for light mode. Win12's toggle at desktop.js line ~2200 |
| Start menu / app launcher upgrade | High | High | CTRL has `#appdmod` dialog for app listing, but it's basic. Port win12's start menu: pinned apps grid (top), all apps list (scrollable), user profile section, power buttons. Reference Section F |
| Quick settings panel | Medium | High | New `#control`-equivalent panel with toggles: Wi-Fi, Bluetooth, Airplane, Night light, DND. Brightness slider. Win12 has 6 toggles + slider in `#control`. Reference Section E "System Tray" |
| Calendar/date popup | Medium | Medium | New `#datebox`-equivalent panel shown on clock click. Month grid with day cells, current day highlighted. Win12 renders via JS in `desktop.js` |
| Toast notification system | Medium | Medium | New `.msg` element that slides in from right, auto-dismisses after 5s. Win12's toast at desktop.css `.msg` selector. CTRL already has `toast()` in script.js but lacks the visual styling from win12 |
| Modal dialog system | Medium | Medium | New `shownotice(name)`/`closenotice()` system with `#notice-back` overlay + `#notice` content panel. Win12's `nts` object pattern. CTRL has modals but win12's are more polished |
| Dropdown menu system | Low | Medium | New `showdp()/hidedp()` system for app menubars (File, Edit, View). Win12's `dps` object with named menus. CTRL has no dropdown menus |
| Tooltip system | Low | Low | New `#descp` element shown on hover (500ms delay) for elements with `win12_title` attribute. Simple positioning system |
| Desktop icons | Medium | Medium | Render app shortcuts as a draggable icon grid on `#desktop`. Save positions to storage. Win12's `desktopItem[]` + `saveDesktop()` |

**How to verify:** Toggle dark/light mode — all UI should update. Open start menu — should show pinned apps + full list. Click clock — calendar should appear. Trigger a notification — toast should animate in from right.

---

### Phase 4: Apps & Widgets (New iframe apps)

**Agent instructions:** Create new files in `CTRL/appdata/`. Each app is a self-contained HTML file loaded in a sandboxed iframe. Use `NTXSession` API for OS integration.

| Task | Priority | Est. Effort | Details |
|---|---|---|---|
| Settings app | High | High | Multi-page settings: System (display, sound, storage), Personalization (theme, accent color, wallpaper), Apps, Accounts, Time & Language, Privacy, Update. Win12's `apps.setting` has 14 pages. Reference Section I |
| Calculator app | Low | Low | Port win12's `Calculator` class (uses `Big.js` for precision). 0-9 keys, ±×÷, square/sqrt, backspace, clear. Win12's `calculator_kernel.js` is 129 lines |
| Task manager | Medium | High | Process list from `winds{}`, CPU/memory/disk simulated graphs (SVG or Chart.js), sort by name/CPU/memory, end-task button. Win12's `apps.taskmgr` at apps.js:250-500 |
| Tab system component | Medium | High | Reusable tab bar that any window can adopt. New tab, close tab, drag reorder, rename. Port win12's `m_tab` from tab.js (129 lines). CTRL's browser already has tabs — extract shared component |
| Widget panel | Medium | High | New side panel with widget grid. Registration system: `widgets.add()`, `widgets.remove()`. Desktop widget placement. Win12's `widget.js` reference |
| System monitor widget | Low | Medium | SVG circular gauge showing CPU/memory/disk/wifi percentages. Reads from `winds{}` for window count, simulates others. Win12's widget.js:160-230 |
| AI copilot window | Low | Medium | Chat interface with message history, connects to LLM API endpoint. Win12 uses Qwen3-Max via yunzhiapi.cn — CTRL should use a configurable endpoint |

**How to verify:** Open each app from the app launcher. Settings should save/load preferences. Calculator should handle decimal arithmetic. Task manager should list open windows.

---

### Phase 5: Polish & Infrastructure

| Task | Priority | Est. Effort | Details |
|---|---|---|---|
| i18n framework | Medium | High | Replace all hardcoded strings with keyed lookups. Win12 uses `jquery.i18n.properties` — CTRL should use a lighter vanilla JS solution. Create `lang/` folder with `lang_en.json`. Reference Section K |
| Boot/shutdown animations | Low | Low | Show gradient + spinner on shutdown, loading bar on boot. Win12's `boot.html` → `desktop.html` flow. CTRL already has a boot splash in `#edison` |
| PWA support | Low | Medium | Add service worker + `manifest.json` for installability. Win12 has this at `sw.js` + `pwa/manifest.json` |
| Search panel | Medium | Medium | Global search across apps, files, settings. Win12's `#search-win` with category tabs (Apps, Documents, Web, Settings). CTRL has search in `#searchwindow` but only searches app names |
| Keyboard shortcuts alignment | Medium | Low | Add F5 (refresh desktop), Ctrl+Win (start menu). CTRL already has Ctrl+F, Ctrl+S, Ctrl+/, Ctrl+Space. Merge with win12 shortcuts. `os-features.js` adds Ctrl+Shift+Esc, F3, Ctrl+N, Ctrl+D |
| Battery monitoring | Low | Low | `navigator.getBattery()` for charge level/status. CTRL already has battery display in nav — just needs the API hookup |
| Voice input | Low | Medium | `webkitSpeechRecognition` for voice commands. Win12 has a draggable voice ball. CTRL has no voice input |
| BIOS simulator (novelty) | Low | Low | Fun retro BIOS screen. Win12's `bios_kernel.js` (237 lines) has keyboard nav. CTRL has `#bios` dialog — could enhance |

---

## What `os-features.js` Already Provides

The `apps/agentos/os-features.js` file (already documented in `rebrand-and-os-features.md`) provides several features that overlap with the win12 porting list. When porting, **do not duplicate** — integrate:

| os-features.js Feature | Overlaps With | Action |
|---|---|---|
| `IframePool` (acquire/release) | Window creation | Use pool in `windman.js` `createWindowShell()` |
| `VirtualList` | Explorer file listing, Store app list | Already integrated or ready to use |
| `PerfMonitor` | Task manager CPU display | Could feed data to task manager widget |
| Mission Control (`toggleMissionControl`) | Win12 has no equivalent | Keep as CTRL-unique feature |
| `notificationCenter` (grouped, swipe-to-dismiss) | Win12 toast `.msg` system | CTRL's is already more advanced — just needs glass styling |
| `toggleShowDesktop` + Aero Peek | Win12 has no equivalent | Keep as CTRL-unique feature |
| `addWindowBadges` (taskbar count badges) | Win12 taskbar `count` attribute | Similar concept — use CTRL's badge approach |
| Accessibility (trapFocus, SR announcements, dock keyboard nav) | Win12 has none | Keep — CTRL is ahead here |
| Hot corner (Mission Control) | Win12 has no equivalent | Keep as CTRL-unique feature |

**Key insight:** CTRL is actually *ahead* of win12 in notification center, accessibility, mission control, Aero Peek, and window badges. The porting work is primarily about **visual polish** (glass/blur/animation) and **shell features** (start menu, quick settings, widgets) where win12 excels.

---

## How to Improve the Porting Process

### For Agents Working on Visual Porting (Phases 1-2)

1. **Always read Section C first** — it has every CSS variable, blur value, and animation defined with exact values. Copy/paste the values directly.
2. **Test in both dark and light mode** — win12 has full dual-theme support. Don't add glass effects that only look good in dark mode.
3. **Use CTRL's existing CSS variable system** — map win12 vars to CTRL vars rather than introducing a parallel system. E.g., win12's `--bg` maps to CTRL's `--col-bg1`.
4. **Don't add jQuery** — win12 uses jQuery everywhere. All ported code must be vanilla JS. Convert `$(selector)` → `document.querySelector()` / `document.querySelectorAll()`.
5. **Respect CTRL's IndexedDB persistence** — win12 uses localStorage for everything. CTRL uses encrypted IndexedDB via `system32.js`. Use `getSetting()`/`setSetting()` instead of `localStorage`.

### For Agents Working on Shell Features (Phase 3)

1. **Read Section N mapping table first** — it tells you exactly what exists and what's MISSING.
2. **Use `<dialog>` elements** — CTRL already uses HTML `<dialog>` for modals (loginmod, edison, appdmod, searchwindow, bios, sleepwindow, terminal). New panels should follow this pattern.
3. **Event bus for IPC** — CTRL has `eventBusWorker` in `system32.js` for cross-iframe communication. Use `deliver()` and `listen()` instead of direct DOM manipulation across boundaries.
4. **Don't break the sandbox** — CTRL apps run in iframes. They communicate with the OS via `ctrl.js` (the app-facing API: `ctrlOS.ask()`, `ctrlOS.say()`, `ctrlOS.openFile()`, etc.). Don't bypass this by reaching into `window.parent` directly.

### For Agents Working on Apps (Phase 4)

1. **Use the app template** — All CTRL apps in `appdata/` follow a pattern: self-contained HTML, `<script>` imports `ctrl.js`, init via `greenflag()`, uses `NTXSession` for storage.
2. **Don't duplicate browser/explorer** — These apps are already rewritten (see `browser-app-improvements.md` and `file-explorer.md`). Focus on new apps.
3. **Win12 apps are monolithic** — `apps.js` has all apps in one 2067-line file. CTRL separates each app into its own HTML file in `appdata/`. Don't create a monolithic apps.js.
4. **File system access** — Use `ctrlOS.getFileById()`, `ctrlOS.createFile()`, etc. from `ctrl.js`. Don't access IndexedDB directly from app code.

### Architecture Improvements to Consider

1. **Shared component library** — The tab system, context menu, and toolbar are reimplemented in each app (browser, explorer). Extract into a shared `CTRL/libs/components.js` that apps can import.
2. **Theme change propagation** — When dark/light toggle happens, iframes need to be notified via eventBus so apps update their styling too.
3. **Window state persistence** — Save window positions/sizes to IndexedDB so they restore on reboot. Win12 doesn't do this, but CTRL could.
4. **Proper z-index layers** — Define z-index tiers: desktop(0-9), windows(10-99), taskbar(100-199), panels(200-299), overlays(300-399), modals(400+). Currently ad-hoc.
5. **CSS variable bridge** — Create a `CTRL/libs/theme-bridge.js` that maps win12 variable names to CTRL variable names, so ported CSS can reference either.

---

## File Reference

| Document | Location | Purpose |
|---|---|---|
| Win12 architecture reference | `CTRL/docs/WIN12-ARCHITECTURE.md` | Complete win12 internals — THE source of truth for porting |
| This document | `CTRL/improvements/win12-porting-roadmap.md` | What's done, what's remaining, agent guidance |
| Rebrand & OS features | `CTRL/improvements/rebrand-and-os-features.md` | LyraOS→CTRL rebrand status, os-features.js porting |
| Browser improvements | `CTRL/improvements/browser-app-improvements.md` | Browser app rewrite status |
| File explorer improvements | `CTRL/improvements/file-explorer.md` | File explorer rewrite status |
| Win12 source (read-only ref) | `/workspaces/swarms/win12/` | Original source — DON'T modify, just reference |
| CTRL source | `/workspaces/swarms/CTRL/` | Active codebase — push to `github.com/nirholas/CTRL` |
