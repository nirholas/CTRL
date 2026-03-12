# CTRL — Master Improvements Roadmap

**Date:** March 12, 2026  
**Status:** Phase 1 complete (architecture docs, rebrand, feature analysis). Phase 2 (merge & implementation) not started.  
**Repo:** https://github.com/nirholas/CTRL  
**Workspace:** `/workspaces/swarms/CTRL/`

---

## Executive Summary

CTRL is a web-based OS (forked from NovaOS) that is being enhanced with visual features from **win12** (tjy-gitnub/win12) and UX features from **AgentOS** (`apps/agentos/`). This document serves as the single source of truth for what has been completed, what remains, and how agents should approach the remaining work.

### What's Done
- [x] LyraOS → CTRL full rebrand (code, assets, docs, prompts)
- [x] WIN12-ARCHITECTURE.md — 2,484-line reference document (all 15 sections A–O)
- [x] Merge strategy defined (5 waves: CSS → Desktop → Windows → System → Apps)
- [x] os-features.js ported to CTRL/scripts/ (IframePool, VirtualList, PerfMonitor, Mission Control, Notification Center, Accessibility)
- [x] Browser app rewritten (tabbed browsing, bookmarks, history, keyboard shortcuts)
- [x] File explorer rewritten (tabs, sidebar, grid/list views, context menus, drag-drop)
- [x] Lock screen & login redesigned (two-phase, rate limiting, power functions)
- [x] Type safety fixes across os-features.js
- [x] Prompt 00 (architecture reference) complete

### What's Not Started
- [ ] Win12 CSS visual polish merge (Wave 1)
- [ ] Win12 desktop feature merge (Wave 2)
- [ ] Win12 window management upgrades (Wave 3)
- [ ] Win12 system features (Wave 4: boot, sounds, i18n, PWA)
- [ ] Win12 app ports (Wave 5)
- [ ] 17 missing scripts to port from AgentOS
- [ ] 2 missing apps to port (taskmanager, terminal)
- [ ] AI/crypto/DeFi agent tooling integration

---

## Section 1: Scripts Gap Analysis

### Scripts present in CTRL (`CTRL/scripts/`)
| Script | Purpose |
|--------|---------|
| `kernel.js` | App sandbox, IPC, file type associations |
| `windman.js` | Window management (create, drag, resize, snap) |
| `ntx.js` | NTX IPC event bus |
| `encdec.js` | AES-GCM encryption, PBKDF2 key derivation |
| `readwrite.js` | IndexedDB read/write operations |
| `ctxmenu.js` | Context menu system |
| `edgecases.js` | Browser edge case handlers |
| `dompurify.js` | HTML sanitization |
| `fflate.js` | Compression library |
| `rotur.js` | Rotur integration |
| `scripties.js` | Utility scripts |
| `utility.js` | Helper functions |
| `os-features.js` | Mission Control, Notification Center, Accessibility, IframePool, VirtualList |

### Scripts missing from CTRL (exist in `apps/agentos/scripts/`)

| Script | Priority | Purpose | How to Port |
|--------|----------|---------|-------------|
| `hotkeys.js` | **HIGH** | Global keyboard shortcut system | Copy to `CTRL/scripts/`, adapt selectors to CTRL DOM IDs |
| `permissions.js` | **HIGH** | App permission management (camera, mic, files, network) | Copy to `CTRL/scripts/`, integrate with kernel.js permission checks |
| `security.js` | **HIGH** | Security policies, iframe sandboxing, CSP | Copy to `CTRL/scripts/`, adapt to CTRL's iframe app model |
| `spotlight.js` | **HIGH** | Command palette / quick-launch search (Cmd+K) | Copy to `CTRL/scripts/`, add HTML container to `index.html` |
| `lockscreen.js` | **MEDIUM** | Lock screen with password and two-phase unlock | Copy to `CTRL/scripts/`, integrate with system32.js auth flow |
| `gestures.js` | **MEDIUM** | Touch/trackpad gesture handling (pinch, swipe, rotate) | Copy to `CTRL/scripts/`, wire into windman.js |
| `widgets.js` | **MEDIUM** | Desktop widgets engine (clock, weather, notes, etc.) | Copy to `CTRL/scripts/`, add widget container to `index.html` |
| `shortcuts.js` | **MEDIUM** | Desktop icon shortcut management | Copy to `CTRL/scripts/`, adapt to CTRL's desktop icon system |
| `terminal.js` | **MEDIUM** | Built-in terminal emulator logic | Copy to `CTRL/scripts/`, create `appdata/terminal.html` |
| `dragdrop.js` | **MEDIUM** | Cross-app drag-and-drop operations | Copy to `CTRL/scripts/`, integrate with file explorer and desktop |
| `workspaces.js` | **MEDIUM** | Virtual desktop / workspace switching | Copy to `CTRL/scripts/`, add workspace bar to `index.html` |
| `dock-enhancements.js` | **MEDIUM** | Dock improvements (magnification, indicators, spring-loaded) | Copy to `CTRL/scripts/`, adapt to CTRL's dock element |
| `backup.js` | **MEDIUM** | User data backup/restore (export/import IndexedDB) | Copy to `CTRL/scripts/`, wire into settings app |
| `previews.js` | **LOW** | Hover thumbnails for taskbar window previews | Copy to `CTRL/scripts/`, add preview container to `index.html` |
| `audio.js` | **LOW** | System sound effects engine | Copy to `CTRL/scripts/`, add sound assets |
| `sounds.js` | **LOW** | Sound file management and playback | Copy to `CTRL/scripts/`, paired with audio.js |
| `popout.js` | **LOW** | Pop-out windows (detach apps to native windows) | Copy to `CTRL/scripts/`, test with `window.open()` |

### How agents should port scripts
1. Read the source file in `apps/agentos/scripts/` thoroughly
2. Check for dependencies on AgentOS-specific globals (e.g., `#agentosnav`, `AgentOS-Store`)
3. Replace those with CTRL equivalents (check `CTRL/index.html` for element IDs)
4. Add `<script src="scripts/{name}.js" defer></script>` to `CTRL/index.html` in correct load order
5. Add any required HTML containers to `CTRL/index.html`
6. Test in CTRL by serving locally (`python3 -m http.server 8020` from `CTRL/`)

---

## Section 2: Missing Apps

### Apps in CTRL appdata (14 apps)
`browser.html`, `calculator.html`, `camera.html`, `copilot.html`, `files.html`, `gallery.html`, `liza.html`, `musicplr.html`, `settings.html`, `store.html`, `studio.html`, `text.html`, `time.html`, `welcome.html`

### Apps in CTRL-Store (22 community apps)
`PySphere`, `TicTacToe`, `WCanvas`, `badthings`, `claw`, `cli`, `datamgr`, `dotengine`, `ducksquack`, `json`, `lizabot3`, `nvamine`, `obamafy`, `originAccess`, `owifive`, `paintviz`, `pdfviewer`, `rotur`, `rubixtimer`, `teletextEngine`, `textame`

### Apps missing from CTRL (exist in `apps/agentos/appdata/`)

| App | Priority | Description | How to Port |
|-----|----------|-------------|-------------|
| `taskmanager.html` | **HIGH** | System task manager (process list, CPU/memory, kill processes) | Create `CTRL/appdata/taskmanager.html`, adapt from AgentOS version, use CTRL's `winds` object for process list |
| `terminal.html` | **HIGH** | Built-in terminal emulator | Create `CTRL/appdata/terminal.html`, integrate with `terminal.js` script |
| `app-template.html` | **LOW** | Developer template for building CTRL apps | Copy from AgentOS, update meta tags to `ctrl-include`/`ctrl-icon` |

### Additional apps to build (new, not from AgentOS)

| App | Priority | Description |
|-----|----------|-------------|
| `wallet.html` | **HIGH** | Crypto wallet — display balances, send/receive SOL & tokens |
| `defi-dashboard.html` | **HIGH** | DeFi dashboard — portfolio, positions, yield tracking |
| `agent-monitor.html` | **HIGH** | AI agent monitor — view running agents, logs, status |
| `code-editor.html` | **MEDIUM** | Code editor with syntax highlighting (Monaco-based) |
| `ai-chat.html` | **MEDIUM** | AI chat interface (multi-model, conversation history) |

---

## Section 3: Win12 → CTRL Merge (5 Waves)

The merge strategy uses `CTRL/docs/WIN12-ARCHITECTURE.md` (2,484 lines) as the single source of truth. Agents should read that document before starting any wave.

### Wave 1: CSS Visual Polish (CSS-only, no JS changes)
**Status:** Not started  
**Difficulty:** Low  
**Reference:** WIN12-ARCHITECTURE.md Section C (CSS Visual System)

| Feature | Win12 Source | CTRL Target | Details |
|---------|-------------|-------------|---------|
| Glass/blur effects | `desktop.css` — `backdrop-filter: blur(20px) saturate(1.5)` | `CTRL/style.css` | Add to `.window`, `.titbar`, start menu, context menu, notification center |
| Dark mode system | `:root.dark` class with CSS variable overrides | `CTRL/style.css` | Add `:root.dark` block, wire toggle to settings app |
| Animation keyframes | 12+ `@keyframes` defs for window open/close/minimize/snap | `CTRL/style.css` | Port keyframes: `winopen`, `winclose`, `winmin`, `snappreview`, etc. |
| Scrollbar styling | `::-webkit-scrollbar` rules (6px, rounded, translucent) | `CTRL/style.css` | Copy scrollbar rules |
| Theme color system | `--theme-1`, `--theme-2` CSS variables with HSL values | `CTRL/style.css` | Add theme variable system, wire to settings personalization |
| Font system | `system-ui` stack with CJK fallbacks | `CTRL/style.css` | Already uses system-ui; verify CJK support |

**Agent instructions:**
1. Read WIN12-ARCHITECTURE.md Section C completely
2. Read `win12/desktop.css` for exact values (do NOT guess)
3. Add new CSS rules to `CTRL/style.css` — do not remove existing rules
4. Test dark mode toggle by adding `.dark` class to `<html>` element
5. Verify glass effects work on Chromium (backdrop-filter requires `-webkit-` prefix on some versions)

### Wave 2: Desktop Features (JS + HTML + CSS)
**Status:** Not started  
**Difficulty:** Medium  
**Reference:** WIN12-ARCHITECTURE.md Sections E, F, G

| Feature | Win12 Source | CTRL Target | Details |
|---------|-------------|-------------|---------|
| Widget system | `widget.js` (270 LOC) + `widget.css` | `CTRL/scripts/widgets.js` | Port from AgentOS or adapt win12's — add widget grid to desktop |
| Control panel / quick settings | `desktop.js` `#control` section | `CTRL/index.html` + `CTRL/style.css` | Add quick settings popup (Wi-Fi, Bluetooth, brightness sliders) |
| Start menu redesign | `desktop.js` + `desktop.html` `#start-menu` | `CTRL/index.html` + `CTRL/script.js` | Add search bar, pinned apps grid, recommended section |
| Desktop icon grid | `desktop.css` flex column wrap | `CTRL/style.css` | Improve desktop icon layout with proper grid spacing |

### Wave 3: Window Management Upgrades (JS-heavy)
**Status:** Not started  
**Difficulty:** High  
**Reference:** WIN12-ARCHITECTURE.md Section D

| Feature | Win12 Source | CTRL Target | Details |
|---------|-------------|-------------|---------|
| 8-directional resize | `window.js` full resize system | `CTRL/scripts/windman.js` | Replace or enhance current resize with 8 handles (N, S, E, W, NE, NW, SE, SW) |
| Snap preview indicator | `#window-fill` element + snap detection | `CTRL/index.html` + `windman.js` | Show translucent preview when dragging window to screen edge |
| Snap zones | Top=maximize, Left/Right=half, corners=quarter | `windman.js` | Add pixel threshold detection for all snap positions |
| Window tab system | `tab.js` (129 LOC) + `tab.css` | `CTRL/scripts/tabs.js` | Add tab bar to supported windows (file explorer, browser already have tabs) |
| Taskbar window previews | `#taskbar-preview` hover thumbnail | `CTRL/scripts/previews.js` | Show live thumbnail of window content on taskbar hover |

**Agent instructions:**
1. Read WIN12-ARCHITECTURE.md Section D line by line
2. Read both `win12/module/window.js` AND `CTRL/scripts/windman.js` to understand both APIs
3. Use CTRL's architecture (windman.js has `createWindow()`, `moveWindow()`, `resizeWindow()`) — do NOT copy win12's jQuery approach
4. Preserve backward compatibility with existing apps that use `windman.js` functions

### Wave 4: System Features
**Status:** Not started  
**Difficulty:** Medium  
**Reference:** WIN12-ARCHITECTURE.md Sections K, L, M

| Feature | Win12 Source | CTRL Target | Details |
|---------|-------------|-------------|---------|
| Boot sequence | `boot_kernel.js` + `boot.html` | `CTRL/bios.html` + `CTRL/scripts/` | CTRL already has a boot screen — enhance with progress bar and animation |
| System sounds | `media/` audio files + desktop.js hooks | `CTRL/assets/` + `CTRL/scripts/audio.js` | Add startup sound, notification ding, error beep, window open/close |
| i18n system | `lang/lang_en.properties` + `jquery.i18n` | `CTRL/scripts/i18n.js` | Build a lightweight i18n system (no jQuery dependency) |
| PWA support | `pwa/` manifest + service worker | `CTRL/sw.js` + `CTRL/webmanifest.json` | CTRL already has basic PWA — verify installability and offline support |
| BIOS simulator | `bios_kernel.js` + `bios.html` | `CTRL/bios.html` | CTRL has bios.html — enhance with win12's keyboard nav and config toggles |

### Wave 5: App Ports (rebuild as CTRL iframe apps)
**Status:** Not started  
**Difficulty:** High (each app is self-contained)  
**Reference:** WIN12-ARCHITECTURE.md Sections H, I

Win12 has 20+ inline DOM apps. These cannot be directly copied — they must be rebuilt as CTRL iframe apps using the `ctrl-include`/`ctrl-icon` meta tag system.

Priority apps to port from win12:
| App | Win12 Source | Priority | Effort |
|-----|-------------|----------|--------|
| Task Manager | `apps.js` task manager section | **HIGH** | Medium — CTRL already has process data in `winds` |
| Whiteboard | `apps.js` whiteboard + `whiteboard.css` | **MEDIUM** | Medium — HTML5 canvas app |
| Defender/Security | `apps.js` defender + `defender.css` | **LOW** | Low — UI shell for security status |
| MS Store equivalent | `apps.js` msstore + `msstore.css` | **LOW** | CTRL already has `store.html` — compare features |
| Run dialog | `apps.js` run dialog | **LOW** | Low — simple command input dialog |

---

## Section 4: Existing App Improvements

### Browser (`CTRL/appdata/browser.html`)
See `CTRL/improvements/browser-app-improvements.md` for the full list. Key remaining items:
- **P0:** IframePool integration, window title sync, tab session restore
- **P1:** Find in page, downloads handling
- **P2:** Tab overflow scroll buttons, smooth animations

### File Explorer (`CTRL/appdata/files.html`)
See `CTRL/improvements/file-explorer.md` for the full list. Key remaining items:
- **P0:** Folder deletion edge cases, openWith() integration, file size display, copy duplicate naming
- **P1:** Async image thumbnails, recursive search, undo for delete
- **P2:** Folder size calculation, recent files list

### Lock Screen (`apps/agentos/improvements/15-lock-screen-login-redesign.md`)
Port the completed lock screen from AgentOS to CTRL:
- Two-phase lock (cover → login) with clock display
- Power functions (shutdown, restart, sleep)
- Rate limiting (3 attempts / 30s lockout)
- Inactivity lock integration

### Notification Center (already in `CTRL/scripts/os-features.js`)
- Tighten types for `notificationCenter.add()` — currently accepts `unknown`
- Audit all apps for legacy `notify()` / `notifLog` usage — migrate to `pushNCNotification()`
- Add keyboard dismiss (Delete key) for accessibility

---

## Section 5: Type Safety & Code Quality

### Remaining type issues in os-features.js
1. **`winds` global not declared** — Add to type declarations: `Record<string, { title, appid, visualState }>`
2. **`notificationCenter.add()` too loose** — Should accept `AddNotificationOpts`, return `OSNotification`
3. **60+ `any` types in declarations** — Priority: `gid()` → `HTMLElement | null`, `getSetting()` → `Promise<unknown>`
4. **Missing utility declarations** — `throttle`, `genDesktop`, `genTaskBar`, `updateNavSize`, `GestureManager`, `WidgetEngine`
5. **Dead code** — `VirtualList.prototype.updateItems` defined but never called; document or remove

### JSDoc gaps
Key functions lacking parameter/return annotations:
- `renderMissionControlWindows()` — complex DOM builder
- `notificationCenter.render()` — 100+ line DOM builder
- `setupDockAccessibility()` — roving tabindex implementation
- All accessibility functions in `initAccessibility()`

---

## Section 6: Architecture Improvements

### 1. Module System
**Problem:** CTRL loads all scripts via `<script>` tags with no dependency management.  
**Solution:** Add a lightweight module loader or at minimum enforce a documented load order.  
**Impact:** Prevents race conditions, enables lazy-loading of non-critical scripts.

### 2. Event Bus Decoupling
**Problem:** Features communicate via global `window.` functions (e.g., `window.toggleMissionControl`).  
**Solution:** Build on CTRL's existing NTX event bus. Have features register event handlers instead of polluting the global namespace.  
**Impact:** Cleaner architecture, easier testing, no naming collisions.

### 3. App Manifest Schema
**Problem:** The `ctrl-include` / `ctrl-icon` meta tag system works but has no formal schema or documentation.  
**Solution:** Create a JSON schema for app manifests. Document required vs optional meta tags. Add validation in the CTRL-Store submission process.  
**Impact:** Better developer experience for store app developers.

### 4. Lazy Script Loading
**Problem:** All scripts load at boot, increasing initial load time.  
**Solution:** Only load `kernel.js`, `windman.js`, `ntx.js`, `system32.js`, `script.js` at boot. Load `gestures.js`, `widgets.js`, `sounds.js`, `os-features.js` on first use.  
**Impact:** Faster boot time, lower memory usage.

### 5. State Management
**Problem:** Window state (`winds`), settings, and app data are scattered across global variables.  
**Solution:** Create a centralized state store with typed getters/setters. Use CTRL's IndexedDB layer for persistence.  
**Impact:** Predictable state, easier debugging, enables undo/redo.

---

## Section 7: AI & DeFi Integration (Strategic — Future)

These are the distinctive features that will set CTRL apart from other web OS projects.

### AI Agent Integration
| Feature | Priority | Description |
|---------|----------|-------------|
| Agent Runtime | **HIGH** | Run AI agents inside CTRL — each agent gets an iframe sandbox with NTX IPC access |
| Agent Monitor App | **HIGH** | Dashboard showing running agents, logs, metrics, kill/restart controls |
| Copilot Enhancement | **HIGH** | Upgrade `copilot.html` to support multiple LLM backends (OpenAI, Anthropic, local) |
| Agent-to-Agent Communication | **MEDIUM** | Let agents communicate via NTX event bus — enables agent swarms within CTRL |
| MCP Server Integration | **MEDIUM** | Connect CTRL to MCP servers for tool use — file system, browser, terminal access for agents |
| Voice Interface | **LOW** | Voice-activated agent commands using Web Speech API |

### Crypto/DeFi Integration
| Feature | Priority | Description |
|---------|----------|-------------|
| Wallet App | **HIGH** | SOL/SPL token wallet with balance, send/receive, transaction history |
| DeFi Dashboard | **HIGH** | Portfolio tracker, yield positions, P&L in real time |
| Token Screener | **MEDIUM** | Integrate with pump-agent-swarm screener API for token discovery |
| DEX Aggregator | **MEDIUM** | Swap interface using Jupiter or similar aggregator |
| NFT Gallery | **LOW** | Display and manage Solana NFTs |
| On-chain Notifications | **LOW** | Push notifications for on-chain events (transfers, swaps, liquidations) |

---

## Section 8: Reference Documents

| Document | Path | Description |
|----------|------|-------------|
| WIN12 Architecture | `CTRL/docs/WIN12-ARCHITECTURE.md` | 2,484-line reference for porting win12 features (Sections A–O) |
| Merge Prompt 00 | `prompts/ctrl-merge/00-win12-architecture-reference.md` | Agent prompt that produced the architecture doc |
| Browser Improvements | `CTRL/improvements/browser-app-improvements.md` | Browser app detailed task list |
| File Explorer Improvements | `CTRL/improvements/file-explorer.md` | File explorer detailed task list |
| Rebrand Status | `CTRL/improvements/rebrand-and-os-features.md` | LyraOS→CTRL rebrand details and os-features port guide |
| Lock Screen Status | `apps/agentos/improvements/15-lock-screen-login-redesign.md` | Lock screen rewrite details |
| Type Safety Status | `apps/agentos/improvements/type-safety-and-rebrand-status.md` | TypeScript/JSDoc fixes and remaining type issues |

---

## Section 9: Quick Start for Agents

### Serving CTRL locally
```bash
cd /workspaces/swarms/CTRL
python3 -m http.server 8020
# Open http://localhost:8020 in browser
```

### Key files to read first
1. `CTRL/index.html` — main shell, all DOM containers, script load order
2. `CTRL/script.js` — desktop logic, app launcher, settings, taskbar
3. `CTRL/scripts/kernel.js` — app sandbox, IPC, file type associations
4. `CTRL/scripts/windman.js` — window management API
5. `CTRL/system32.js` — boot, auth, encryption, user management

### Coding conventions
- **No jQuery** — CTRL uses vanilla JS. Never add jQuery dependencies.
- **Iframe sandboxing** — All apps run inside `<iframe>` elements. Use NTX IPC for parent communication.
- **Meta tags** — Apps must include `<meta name="ctrl-include">` and `<meta name="ctrl-icon">` in their HTML.
- **IndexedDB + AES-GCM** — User data is encrypted per-user. Use `readwrite.js` API, never access IndexedDB directly.
- **CSS variables** — Use existing CSS custom properties from `style.css` and `ctrl.css`. Do not hardcode colors.

### Git workflow
```bash
cd /workspaces/swarms/CTRL
git config user.name "nirholas" && git config user.email "nirholas@users.noreply.github.com"
# CTRL changes push to: https://github.com/nirholas/CTRL
git add -A && git commit -m "description" && git push origin main
```

---

## Section 10: Priority Order for Agents

If you're an agent picking up work on CTRL, tackle items in this order:

### Tier 1 — Foundation (do these first)
1. Port `hotkeys.js` and `spotlight.js` scripts → keyboard shortcuts + command palette
2. Port `permissions.js` and `security.js` → app permission system
3. Port `lockscreen.js` → lock screen with auth
4. Create `taskmanager.html` app → system task manager
5. Create `terminal.html` app → built-in terminal

### Tier 2 — Visual Polish (Wave 1 merge)
6. Add glass/blur effects from win12 CSS
7. Add dark mode system with CSS variable overrides
8. Add window open/close animations
9. Add scrollbar and theme color system

### Tier 3 — Desktop Features (Wave 2 merge)
10. Port `widgets.js` → desktop widgets
11. Build quick settings popup (control panel)
12. Enhance start menu (search, pinned apps grid)
13. Port `gestures.js` → touch support

### Tier 4 — Window Management (Wave 3 merge)
14. Add 8-directional resize to windman.js
15. Add snap preview + snap zones
16. Add taskbar window previews
17. Port `workspaces.js` → virtual desktops

### Tier 5 — AI + DeFi (Strategic)
18. Build wallet app
19. Build DeFi dashboard
20. Enhance copilot with multi-model support
21. Build agent runtime + monitor
