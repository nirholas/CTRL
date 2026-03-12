# Browser App — Completed Work & Remaining Improvements

**Date:** 2026-03-12
**File:** `CTRL/appdata/browser.html`
**Status:** Core rewrite complete (712 → 1,628 lines)

---

## What Was Completed

### Full Rewrite of `browser.html`

The old browser (single-tab, basic iframe wrapper) was completely replaced with a modern tabbed browser. Here's what's shipped:

| Feature | Status | Details |
|---------|--------|---------|
| **Tab System** | Done | Multiple tabs, dynamic create/close, favicon + title per tab, active tab highlight |
| **Drag-to-Reorder Tabs** | Done | HTML5 drag/drop on tab bar elements |
| **Navigation Bar** | Done | Back, Forward, Reload, Home buttons with per-tab history stack |
| **Address Bar** | Done | Smart URL resolution (`https://` prefix, Google search fallback), lock icon for HTTPS |
| **Address Bar Autocomplete** | Done | Searches bookmarks + history, keyboard arrow-key navigation |
| **Bookmark Bar** | Done | Default bookmarks (Google, YouTube, GitHub, etc.), toggle visibility via menu |
| **Bookmark Toggle (Star)** | Done | Star/unstar current page from address bar |
| **Bookmarks Side Panel** | Done | Full list with click-to-navigate, per-item delete |
| **Browsing History** | Done | Auto-recorded with title + timestamp, side panel, clear all |
| **New Tab Page** | Done | Gradient background, time-based greeting, live clock, search bar, shortcut grid |
| **Error Pages** | Done | Friendly error screen with retry button on iframe load failure |
| **Loading Indicators** | Done | Per-tab spinner + address bar progress bar animation |
| **Keyboard Shortcuts** | Done | `Ctrl+T` (new tab), `Ctrl+W` (close tab), `Ctrl+L` (focus address), `F5` (reload), `Alt+←/→` (back/forward) |
| **CTRL OS Integration** | Done | `greenflag()` init, `NTXSession` for appStorage, `myWindow.params.data` for URL/file launch |
| **Persistence** | Done | Bookmarks, history, bookmark-bar visibility saved via `appStorage` with `localStorage` fallback |
| **Drag-Drop URLs** | Done | Drop `http://` / `https://` URLs onto tab bar to open in new tab |
| **Meta Tags** | Done | `ctrl-include`, `ctrl-icon`, `capabilities` (`.html, web_browser`), `permissions` (`fileGet, system, unsandboxed`) |

### Integration Verification

- `CTRL/script.js` already has `"browser"` in `defAppsList` (line 11) — no change needed
- `openlaunchprotocol()` in `kernel.js` passes data through `Gtodo` → `params` → `myWindow.params.data`
- `greenflag()` reads `myWindow.params.data` and opens URL or file accordingly
- File type associations (`.html` capability) handled by kernel's `fileTypeAssociations` system

---

## What Needs To Be Completed

### Priority 1 — Functional Gaps

#### 1. IframePool Integration
**File:** `CTRL/appdata/browser.html`
**Reference:** `apps/agentos/os-features.js` — `IframePool` class (lines 14-46)

The browser creates raw `<iframe>` elements for each tab. It should use the global `IframePool.acquire()` / `IframePool.release()` from `os-features.js` to recycle iframes when tabs are closed, reducing DOM churn and improving performance with many tabs.

**Changes needed:**
- In `createTabPanel()` / `navigateTab()` — replace `document.createElement('iframe')` with `IframePool.acquire()` (if available on `window.parent`)
- In `closeTab()` — call `IframePool.release(iframe)` instead of just removing the panel
- Guard with `typeof window.parent.IframePool !== 'undefined'` since the browser runs inside an OS iframe

#### 2. Window Title Sync
**File:** `CTRL/appdata/browser.html`

When navigating to a page, the browser should update the OS window title via `myWindow.setTitle(tab.title)` so the taskbar and Mission Control show the current page name instead of "Browser".

**Changes needed:**
- After `tab.title` is set in `iframe.onload`, call `myWindow.setTitle(tab.title)` if `myWindow.setTitle` exists
- Also update on tab switch: `switchTab()` should call `myWindow.setTitle(getActiveTab().title)`

#### 3. Tab Session Restore
**File:** `CTRL/appdata/browser.html`

The browser loses all tabs on close. It should persist the tab list (URLs) to `appStorage` and restore them on next launch.

**Changes needed:**
- Add `saveSession()` that stores `tabs.map(t => ({ url: t.url, title: t.title }))` via `saveData("session", ...)`
- Call `saveSession()` on tab navigations, tab close, and periodically
- In `greenflag()`, load session and restore tabs (unless launched with a specific URL/file)

#### 4. Find in Page
**File:** `CTRL/appdata/browser.html`

No `Ctrl+F` find-in-page support. Due to cross-origin iframe restrictions, this is limited, but for same-origin content (like local HTML files), it could be implemented.

**Changes needed:**
- `Ctrl+F` shortcut opens a find bar overlay
- For same-origin iframes: use `iframe.contentWindow.find(query)` API
- For cross-origin: show "Find is not available for this page"

#### 5. Downloads Handling
**File:** `CTRL/appdata/browser.html`

Clicks on download links inside iframes currently have no UI feedback. The browser should intercept download attempts where possible and show a notification or redirect to the CTRL file system.

---

### Priority 2 — UX Polish

#### 6. Tab Overflow & Scroll Buttons
When many tabs are open, the tab bar scrolls but has no visual indicator. Add left/right chevron buttons that appear when tabs overflow, and a tab count badge.

#### 7. Smooth Animations
- Tab close should have a shrink/fade animation before removal
- Tab open should have a slide-in animation
- Side panels should slide in/out instead of instant show/hide (use CSS transitions on `transform: translateX()`)

#### 8. Context Menus
Right-clicking on tabs should show: "Close Tab", "Close Other Tabs", "Close Tabs to the Right", "Duplicate Tab", "Pin Tab".
Right-clicking on the content area should show: "Back", "Forward", "Reload", "View Source" (for same-origin content).

#### 9. Favicon Quality
Currently uses `origin + "/favicon.ico"` which is low-res and often missing. Improve by:
- Trying Google's favicon API: `https://www.google.com/s2/favicons?domain=HOSTNAME&sz=32`
- Caching favicons per domain in memory to avoid repeated 404s
- Falling back to a color-coded letter avatar based on domain initial

#### 10. Keyboard Tab Switching
Add `Ctrl+1` through `Ctrl+9` shortcuts to switch to tab N (Ctrl+9 = last tab, matching Chrome behavior).

#### 11. Zoom Controls
Add zoom in/out (`Ctrl+Plus`, `Ctrl+Minus`, `Ctrl+0` reset) using CSS `transform: scale()` on the iframe container.

---

### Priority 3 — Performance & Architecture

#### 12. Virtual Scrolling for History
**Reference:** `apps/agentos/os-features.js` — `VirtualList` class (lines 53-100)

The history panel renders all items into the DOM. For 200+ history entries, this causes lag. Use the `VirtualList` from `os-features.js` to render only visible items.

**Changes needed:**
- In `renderHistoryPanel()`, replace full DOM render with `new VirtualList(container, browsingHistory, renderItem, 48)`
- Access `VirtualList` from `window.parent.VirtualList` if available

#### 13. Memory Leak Prevention
- When closing a tab, explicitly set `iframe.src = 'about:blank'` before removing from DOM to help browsers release memory
- Clear `URL.createObjectURL()` blob URLs with `URL.revokeObjectURL()` after use (for local HTML file viewing)
- Limit max open tabs (e.g., 20) with a user-facing message

#### 14. CSP-Safe Inline Styles
Move all inline `onclick` handlers to `addEventListener` calls. The current implementation uses `onclick="browser.newTab()"` in HTML which would be blocked by strict Content-Security-Policy. Most are fine since apps are loaded from blobs, but migrating to event listeners is cleaner.

---

### Priority 4 — Integration with CTRL OS

#### 15. URL Protocol Handler
**File:** `CTRL/scripts/kernel.js`

Register the browser as the system URL handler so any app can call `openlaunchprotocol(browserAppId, url)` to open a URL. Currently the browser app's file ID in the Apps folder varies per installation. Consider adding a well-known handler name:

```js
// In kernel.js or script.js initialization:
handlers['web_browser'] = browserAppId;
```

Then any app can do:
```js
useHandler('web_browser', { url: 'https://example.com' });
```

#### 16. Notification Integration
When a page finishes loading after a long wait, or when a page fails to load, push a notification via `window.parent.pushNCNotification()` so the user sees feedback even if the browser window is minimized.

#### 17. Quick Settings Integration
Add a "Default Browser" toggle or selector in the CTRL quick settings or system settings, so users can pick which app handles web URLs if multiple browser-like apps are installed.

#### 18. Print Support
Add a Print menu item that calls `iframe.contentWindow.print()` for same-origin content. Wire to `Ctrl+P` shortcut.

---

## Architecture Notes for Agents

### Key Files
| File | Purpose |
|------|---------|
| `CTRL/appdata/browser.html` | The browser app (self-contained HTML/CSS/JS) |
| `CTRL/scripts/kernel.js` | App launcher, window manager, `openapp()`, `openlaunchprotocol()` |
| `CTRL/system32.js` | System APIs — `appStorage.get/set/remove` (line 641) |
| `CTRL/script.js` | Desktop init, `defAppsList`, `fileTypeAssociations` |
| `apps/agentos/os-features.js` | `IframePool`, `VirtualList`, `PerfMonitor` — reusable utilities |

### Integration Pattern
1. The OS kernel loads `appdata/browser.html` into a blob URL and renders it in an iframe
2. On iframe load, kernel posts `{ type: "myWindow", data: { appID, windowID, params } }` message
3. The app's `greenflag()` listens for this message and initializes
4. The app communicates with OS via `NTXSession` (IPC over `postMessage`) for:
   - `appStorage.get/set/remove` — per-app persistent storage
   - `fileGet.byId` — read files from the virtual filesystem
   - `sysUI.clwin` — close own window
   - `sysUI.setTitle` — update window title

### Storage Keys Used
| Key | Format | Description |
|-----|--------|-------------|
| `browser_bookmarks` | `JSON array` of `{ title, url, icon }` | User's bookmarks |
| `browser_history` | `JSON array` of `{ url, title, time }` | Browsing history (max 200) |
| `browser_bookmarkBarVisible` | `boolean` | Whether bookmark bar is shown |
| `browser_session` | *(proposed)* `JSON array` of `{ url, title }` | Tab session for restore |

### Testing Checklist
- [ ] Browser opens with New Tab Page showing greeting, clock, search, shortcuts
- [ ] Typing a URL in address bar navigates to it
- [ ] Typing a search query triggers Google search
- [ ] Back/Forward buttons work per-tab (not globally)
- [ ] Opening 5+ tabs — tab bar scrolls, all tabs are accessible
- [ ] Drag-reorder tabs works
- [ ] Close tab via X button and Ctrl+W
- [ ] Bookmarks: star a page, see it in bookmark bar, click bookmark to navigate
- [ ] History: navigate to pages, open history panel, see entries with timestamps
- [ ] Keyboard shortcuts: Ctrl+T, Ctrl+W, Ctrl+L, F5 all work
- [ ] Opening browser with a URL (via `openlaunchprotocol`) navigates to that URL
- [ ] Opening browser with an HTML file ID renders the file content
- [ ] Error page shows when an iframe fails to load
- [ ] Bookmarks and history persist across browser close/reopen
- [ ] Browser respects OS theme variables (`--col-bg1`, `--col-bg2`, `--col-txt1`)
