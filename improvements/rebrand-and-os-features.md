# CTRL Rebrand & OS Features — Improvements & Remaining Work

**Date:** March 12, 2026 (updated)  
**Status:** Rebrand complete, feature porting in progress  
**Context:** LyraOS → AgentOS → CTRL rebrand. This doc covers what was completed, what still needs work, and feature gaps between `apps/agentos` and `CTRL/`.

---

## Completed

### Rebrand: LyraOS → CTRL in active code
- [x] `CTRL/appdata/files.html` — `lyra-include` → `ctrl-include`, `lyra-icon` → `ctrl-icon`, `lyra.css` → `ctrl.css`
- [x] `CTRL/appdata/files.html.new` — same as above
- [x] `CTRL/index.html` — already set to "CTRL" (title, boot text, comments)
- [x] `CTRL/ctrl.css` — renamed from `lyra.css`, no internal lyra references remain
- [x] `CTRL/ctrl.js` — renamed from `lyra.js`, no internal lyra references remain
- [x] All `CTRL/appdata/*.html` apps — already use `ctrl-include`/`ctrl-icon`/`ctrl.css`
- [x] All `CTRL/CTRL-Store/apps/*.html` — already use `ctrl-include`/`ctrl-icon`
- [x] `CTRL/CNAME` — removed (was `lyra.surf`)
- [x] Zero `lyra`/`LyraOS` references remain in any CTRL active code files

### Verified clean
- `grep -rn -i 'lyra' CTRL/` returns only git history (`.git/logs/`) — no source files affected

### Type Safety Fixes in os-features.js (March 12, 2026)
When porting `os-features.js` to CTRL, these fixes are already applied in the source:
- `trapFocus()` — `focusable[0]` and `focusable[last]` cast to `HTMLElement` (fixes `.focus()` on `Element`)
- `enableMenuKeyboardNav()` — `getItems()` returns `HTMLElement[]` via `Array.from()` instead of `NodeListOf<Element>`
- `observeContextMenus()` — `node` cast as `HTMLElement` instead of `Element`, `items[0]` cast for `.focus()`
- `VirtualList` — added `/** @type {*} */` cast for constructor and self-reference
- Header comment updated: `AgentOS` → `CTRL` (already done in the attached file)

**Note:** These fixes mean the CTRL port should copy from the current `apps/agentos/os-features.js` which already has the correct casts.

---

## Remaining Work for Other Agents

### 1. Port `os-features.js` to CTRL
**Priority:** High  
**Source:** `apps/agentos/os-features.js` (~680 lines)  
**Why:** CTRL's `script.js` and `system32.js` have basic notification and window management, but `os-features.js` adds significant UX features that CTRL currently lacks.

Features to port (adapt `#agentosnav` → CTRL's equivalent selectors):

| Feature | Lines | Description | CTRL has it? |
|---------|-------|-------------|-------------|
| **IframePool** | 13-44 | Reusable iframe pool (acquire/release) for app windows | No |
| **VirtualList** | 49-98 | Virtual scrolling for large lists (file explorer, store) | No |
| **PerfMonitor** | 104-143 | Dev-mode FPS/memory overlay (Ctrl+Shift+P toggle) | No |
| **Mission Control** | 159-265 | Exposé-style window overview (F3 trigger) | No |
| **NotificationCenter** | 271-600 | Grouped notifications, swipe-to-dismiss, DND, badges | Partial (basic `ntx.js`) |
| **Keyboard Shortcuts** | 600-625 | Ctrl+Shift+Esc, Meta+N, F3, Escape handlers | Partial |
| **Show Desktop** | 658-730 | Minimize all / restore all (Ctrl+D) | No |
| **Aero Peek** | 732-760 | Hover taskbar edge to make windows translucent | No |
| **Window Badges** | 762-830 | Per-app window count badges on taskbar/dock | No |
| **Accessibility** | 832-680 | Screen reader, focus traps, menu keyboard nav, ARIA | No |
| **Hot Corner** | 640-656 | Top-left corner triggers Mission Control | No |

**How to port:**
1. Create `CTRL/scripts/os-features.js`
2. Copy the IIFE from `apps/agentos/os-features.js`
3. Replace `#agentosnav` with CTRL's nav element ID (check `CTRL/index.html` for the taskbar container ID)
4. Add `<script src="scripts/os-features.js" defer></script>` to `CTRL/index.html`
5. Add required HTML containers to `CTRL/index.html`:
   - `<div id="mission-control">` with `<div id="mc-windows-grid">`
   - `<div id="notification-center">` with list/empty elements
   - `<div id="showDesktopBtn">` in taskbar
6. Add required CSS to `CTRL/style.css` for mission control, notification center, and accessibility

### 2. Port `os-enhancements.js` to CTRL
**Priority:** Medium  
**Source:** `apps/agentos/os-enhancements.js`  
**Why:** Additional polish features from AgentOS that CTRL doesn't have yet.

**Action:** Read the file, identify which enhancements apply, port to `CTRL/scripts/os-enhancements.js`.

### 3. Port missing scripts from AgentOS
**Priority:** Medium  

Scripts in `apps/agentos/scripts/` that CTRL doesn't have:

| Script | Purpose | Priority |
|--------|---------|----------|
| `audio.js` | System sound effects | Low |
| `backup.js` | User data backup/restore | Medium |
| `dragdrop.js` | Drag and drop operations | Medium |
| `gestures.js` | Touch/trackpad gesture handling | Medium |
| `hotkeys.js` | Global hotkey system | High |
| `lockscreen.js` | Lock screen with password | Medium |
| `permissions.js` | App permission management | High |
| `popout.js` | Pop-out windows | Low |
| `previews.js` | Hover previews / thumbnails | Low |
| `security.js` | Security policies & sandboxing | High |
| `shortcuts.js` | Desktop shortcut management | Medium |
| `sounds.js` | Sound management | Low |
| `spotlight.js` | Spotlight/command palette search | High |
| `terminal.js` | Built-in terminal emulator | Medium |
| `widgets.js` | Desktop widgets engine | Medium |
| `workspaces.js` | Virtual desktop / workspace support | Medium |
| `dock-enhancements.js` | Dock improvements | Medium |

### 4. Port missing appdata apps
**Priority:** Low  

Apps in `apps/agentos/appdata/` that CTRL doesn't have:

| App | CTRL equivalent |
|-----|----------------|
| `appstore.html` | CTRL has `store.html` — verify feature parity |
| `app-template.html` | Developer template — port for store devs |
| `assistant.html` | CTRL has `copilot.html` — verify feature parity |
| `taskmanager.html` | Missing — should port |
| `terminal.html` | Missing — should port |

### 5. Clean up backup files
**Priority:** Low  
Remove stale backup files that were created during development:
- `CTRL/appdata/files.html.new` — leftover from file explorer rewrite
- `CTRL/appdata/files.html.bak` — backup of old files app

### 6. Historical docs — leave as-is
The following files reference "LyraOS" in historical context (documenting the rebrand journey). These are intentional references and should **NOT** be changed:
- `apps/agentos/docs/DESIGN-AUDIT.md`
- `apps/agentos/DESIGN-AUDIT.md`
- `prompts/lyraos-merge/*.md`
- `prompts/archived/agentos-rebrand/*.md`
- `prompts/agentos-design-revival/*.md`
- `prompts/10-file-explorer-app.md`
- `prompts/11-browser-app.md`

---

## How to Improve CTRL

### Architecture
1. **Add a module loader** — CTRL loads scripts via `<script>` tags. Consider a lightweight module system or at minimum a dependency-ordered load sequence.
2. **Event bus** — AgentOS's `os-features.js` uses global functions (`window.toggleMissionControl`). A proper pub/sub event bus would decouple features.
3. **App manifest system** — The `ctrl-include` / `ctrl-icon` meta tag system works but should be documented with a schema for store developers.

### Performance
1. **Port IframePool** — Currently each window creates/destroys iframes. The pool pattern from `os-features.js` reduces DOM churn.
2. **Port VirtualList** — File explorer and store should use virtual scrolling for large lists.
3. **Lazy-load scripts** — Not all scripts need to load at boot. `gestures.js`, `widgets.js`, `sounds.js` can load on first use.

### UX
1. **Port Mission Control** — The F3 window overview is the single biggest UX gap vs AgentOS.
2. **Port Spotlight/Command Palette** — Quick-launch and search across apps/files/settings.
3. **Port Accessibility** — Screen reader support, focus traps, keyboard nav, ARIA labels.
4. **Port Notification Center** — The grouped notification system from `os-features.js` is much richer than `ntx.js`.
5. **Port Show Desktop + Aero Peek** — Quick desktop access with visual feedback.

### Security
1. **Port permissions.js** — App sandboxing and permission gates.
2. **Port security.js** — XSS protection, CSP headers, iframe sandboxing.
3. **Audit DOMPurify usage** — Both have `dompurify.js` but verify it's applied to all user-generated content.

### Quality
1. **Remove backup files** — `files.html.new`, `files.html.bak` should be deleted after verifying the current `files.html` is correct.
2. **Consistent meta tags** — All apps should use `ctrl-include` and `ctrl-icon` (now verified complete).
3. **Add a CTRL README** — Document the project, architecture, how to add apps, dev setup.
