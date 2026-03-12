# File Explorer — Completed Work & Remaining Improvements

**File:** `CTRL/appdata/files.html`
**Backup:** `CTRL/appdata/files.html.bak` (original 2519-line version)
**Status:** Core rewrite complete (1615 lines). Functional with tabs, navigation, sidebar, views, context menus, and file operations.

---

## What Was Done

### Complete Rewrite
The old file explorer (~2519 lines, single-tab, inline styles mixed with logic) was replaced with a clean, modular implementation:

| Feature | Status |
|---|---|
| Tab bar (new tab, close tab, middle-click close) | ✅ Done |
| Back / Forward / Up navigation with history stack | ✅ Done |
| Breadcrumb path bar (click segments, click-to-edit raw path) | ✅ Done |
| Collapsible sidebar folder tree with expand/collapse | ✅ Done |
| Resizable sidebar (drag handle, persists width via settings) | ✅ Done |
| Grid view (icon + name, image thumbnails for images) | ✅ Done |
| List view (sortable columns: Name, Type, Size, Modified) | ✅ Done |
| Right-click context menu (files: Open, Open With, Cut, Copy, Delete, Rename, Properties) | ✅ Done |
| Right-click empty space (New File, New Folder, Paste, Import, Refresh, Sort by, View) | ✅ Done |
| Inline rename (F2, click-to-edit, auto-select name before extension) | ✅ Done |
| Delete confirmation dialog | ✅ Done |
| Properties dialog (name, path, size, type, created, ID) | ✅ Done |
| New File / New Folder dialogs with Enter-key submit | ✅ Done |
| Import files (file picker + drag-and-drop from desktop) | ✅ Done |
| Clipboard operations (cut / copy / paste across folders) | ✅ Done |
| Drag-and-drop files to folders (both in grid and sidebar tree) | ✅ Done |
| Search / filter bar (filters current folder items by name) | ✅ Done |
| Keyboard shortcuts (Ctrl+T/W/A/C/X/V, F2, F5, Del, Enter, Alt+arrows) | ✅ Done |
| Multi-select (click, Ctrl+click toggle, Shift+click range) | ✅ Done |
| Session types: normal, opener, saveas, showFile, showDir, directory | ✅ Done |
| View preference saved via `ntxSession.send('settings.set')` | ✅ Done |
| eventBus filesystem change listener for auto-refresh | ✅ Done |
| Legacy `getMenuItems()` compat for parent context menu system | ✅ Done |
| Status bar with item count and view toggle buttons | ✅ Done |

### API Integration
- Uses `window.parent.memory.root` for folder tree
- Uses `window.parent.getAllItemsInFolder(path)` for directory listings
- Uses `window.parent.createFile()`, `createFolder()`, `remfile()`, `remfolder()`, `updateFile()`, `moveFileToFolder()`, `openfile()`, `updateMemoryData()` for all file operations
- Uses `ntxSession.send()` for `fileGet.byId`, `settings.get/set`, `utility.getBaseFileType`, `olp.useHandler`, `olp.launch`
- Uses `myWindow.setTitle()`, `myWindow.close()`, `myWindow.params` for window manager integration
- Uses `eventBus.listen()` for filesystem change notifications

---

## What Needs To Be Completed

### P0 — Must Fix

1. **Folder selection for deletion uses paths, not IDs.**
   Folders returned by `getAllItemsInFolder()` have no `id` field — only `name` (with trailing `/`) and `path`. The `itemKey()` helper falls back to `path` for folders. Deleting a folder calls `remfolder(path)` which works, but edge cases with deeply-nested paths haven't been tested. Ensure `remfolder()` handles all path formats.

2. **`openWith()` integration is incomplete.**
   The `openWith()` function calls `ntxSession.send('olp.useHandler', 'file_manager', { opener: 'app', dir: 'Apps/' })` to pick an app, then `ntxSession.send('olp.launch', appId, fileId)`. This flow hasn't been tested end-to-end. Verify the OLP handler chain works and consider adding a file type filter.

3. **File size not available from `getAllItemsInFolder()`.**
   The API (`system32.js:695`) returns `{ name, type, path, id?, metadata? }` — no `size` field. The list view "Size" column is always empty for files. To fix: either add `size` to `getAllItemsInFolder()` output or lazy-load it via `ntxSession.send('fileGet.byId', id)` and measure `content.length`.

4. **Copy operation creates a duplicate with same name.**
   `doPaste()` in copy mode creates a file with the original `fileName`. If pasting into the same folder, this may overwrite or conflict. Add a "Copy of " prefix or " (1)" suffix when the target folder already contains a file with that name.

### P1 — Should Improve

5. **Image thumbnail loading is synchronous and blocking.**
   `renderGridView()` calls `ntxSession.send('fileGet.byId', file.id)` for every image file sequentially (awaited in loop). For a folder with many images, this freezes the UI. Refactor to:
   - Render all items first with placeholder icons
   - Then load thumbnails asynchronously in parallel with `Promise.all()` batches
   - Use `IntersectionObserver` to lazy-load only visible thumbnails

6. **Search only filters current folder, not recursively.**
   The search bar filters `cachedItems` (current folder only). A proper file search should recursively walk `window.parent.memory.root` and show results from all subdirectories. Consider adding a "Search everywhere" toggle or a recursive search mode.

7. **No undo for delete operations.**
   Deletion calls `remfile()`/`remfolder()` immediately with no recycle bin. Consider implementing a soft-delete that moves files to a `System/Trash/` folder first, with a "Restore" option. The `moveFileToFolder()` API already exists for this.

8. **Drag-and-drop from sidebar doesn't highlight drop target in file grid.**
   Files can be dropped onto folder items in the grid, but there's no visual feedback when dragging over the general file area. Add a `dragover` highlight to folder items and a "drop here" indicator for the file area.

9. **Tab state is not persisted across window sessions.**
   Closing and reopening the File Explorer loses all tabs. Consider saving tab paths to `appStorage` and restoring on `greenflag()`.

10. **Sort preference is not persisted.**
    `sortBy` and `sortAsc` reset to defaults on reload. Save them alongside `defFileLayout` via settings.

### P2 — Nice To Have

11. **Breadcrumb overflow handling.**
    Long paths push breadcrumb segments offscreen. Add horizontal scroll or ellipsis collapsing for deep paths (show first segment, `...`, last 2 segments).

12. **File type icons could be richer.**
    The `getIconHtml()` function maps extensions to Material Symbols icons. Could be extended with:
    - `.md` → `markdown` icon
    - `.pdf` → `picture_as_pdf`
    - `.zip` → `folder_zip`
    - `.html` → `html`
    - `.css` → `css`
    - `.js` → `javascript`
    - Custom SVG icons per app type

13. **Column width persistence in list view.**
    List view columns have fixed widths. Allow drag-to-resize columns and persist widths in settings.

14. **Multi-file drag-and-drop.**
    Currently only single files can be dragged. When multiple files are selected, dragging one should move all selected files.

15. **Keyboard navigation within file grid.**
    Arrow keys don't move focus between file items. Add roving tabindex or arrow-key navigation within the grid/list views.

16. **Context menu keyboard navigation.**
    The context menu opens on right-click but isn't keyboard-navigable (arrow keys, Enter to select). The parent OS has `enableMenuKeyboardNav()` in `os-features.js` — adapt the same pattern.

17. **Folder size display.**
    Right-click Properties on a folder could show total file count and aggregate size of contents.

18. **Favorites / Quick Access sidebar section.**
    Add a pinned "Quick Access" section above the folder tree for starred/frequently-accessed folders. Could use `appStorage` to persist.

19. **File preview panel.**
    Optional right-side panel showing a preview of the selected file (text content, image, metadata) — similar to Finder's Quick Look or Windows preview pane.

20. **Accessibility improvements.**
    - Add `role="treegrid"` on file grid, `role="tree"` on sidebar
    - Add `aria-label` on navigation buttons
    - Add `aria-selected` on selected items
    - Support screen reader announcements via parent's `announceToSR()` from `os-features.js`
    - Trap focus in dialogs (parent's `trapFocus()` is available)

---

## Architecture Notes for Other Agents

### File System Model
CTRL uses an in-memory JS object tree at `window.parent.memory.root`. Folders are keys ending with `/` (e.g., `"Downloads/"`, `"Apps/"`). Files are objects with `{ id, metadata }`. The real file content is stored in IndexedDB (see `scripts/readwrite.js`) and accessed via `getFileById(id)`.

### NTX Session Bridge
Apps run in iframes and communicate with the parent via `ntxSession.send(namespace.method, ...args)`. The mapping is defined in `scripts/ntx.js`. Key namespaces:
- `fileGet` — `byId`, `nameById`, `detailsById`, `byPath`
- `fileSet` — `createFile`, `updateFile`, `removeFile`, `moveFile`
- `dir` — `getFolderNames`, `remove`, `create`
- `olp` — `openFile`, `launch`, `useHandler`
- `settings` — `get`, `set`, `remove`
- `utility` — `timeAgo`, `getBaseFileType`, `getBaseName`, `mtpetxt`
- `sysUI` — `confirm`, `dropdown`, `ask`, `toast`, `notify`

### Window Manager
- `myWindow` — the window instance, provided by the parent
- `myWindow.params.data` — launch parameters (opener type, initial path, etc.)
- `myWindow.params.trid` — transaction ID for OLP return values
- `myWindow.setTitle(title)` — sets the window title bar
- `myWindow.close()` — closes the window
- `greenflag()` — entry point called by the window manager after iframe loads

### CSS Theme System
Apps inherit CSS variables from the parent:
- `--col-bg1`, `--col-bg2`, `--col-bg3` — background levels
- `--col-bgh` — accent/highlight color
- `--col-txt1`, `--col-txth` — text colors
- `--siz-radius1` — border radius
- Load via `<meta name="ctrl-include" content="ctrl.css material-symbols-rounded">`

### Event System
- `eventBus.listen({ type: 'memory', event: '*', callback })` — subscribe to filesystem changes
- Callback receives `{ event: 'update' }` when files change

### Context Menu Integration
The file explorer manages its own context menus within the iframe (`.ctx-menu` class). For compatibility with the parent's context menu system (`scripts/ctxmenu.js`), the legacy `getMenuItems(target)` function is exported, returning `[{ label, action, icon? }]` items.

---

## Files Changed

| File | Action | Lines |
|---|---|---|
| `CTRL/appdata/files.html` | **Replaced** (full rewrite) | 1615 |
| `CTRL/appdata/files.html.bak` | **Created** (backup of original) | 2519 |

## Testing Checklist

- [ ] Open Files app → should show Downloads/ with grid view
- [ ] Click folders to navigate, breadcrumbs update correctly
- [ ] Back/Forward/Up buttons work with history
- [ ] Click breadcrumb path bar → type raw path → Enter navigates
- [ ] Toggle Grid/List views, preference persists across reopen
- [ ] Right-click file → Open, Rename, Delete, Properties all work
- [ ] Right-click empty space → New File, New Folder, Import work
- [ ] F2 inline rename with auto-select before extension
- [ ] Ctrl+C → navigate to different folder → Ctrl+V copies file
- [ ] Ctrl+X → Ctrl+V moves file
- [ ] Drag file onto folder in grid → file moves
- [ ] Drag file onto sidebar tree folder → file moves
- [ ] Ctrl+T opens new tab, Ctrl+W closes tab
- [ ] Middle-click tab closes it
- [ ] Shift+click selects range, Ctrl+click toggles selection
- [ ] Delete key prompts confirmation, then deletes
- [ ] Import dialog → select files → Import button works
- [ ] Drag files from desktop onto file area → triggers import
- [ ] Search box filters current folder items
- [ ] Sidebar folder tree expands/collapses, click navigates
- [ ] Sidebar resize drag handle works
- [ ] Open as file picker (opener session) → select file → Open button returns ID
- [ ] Open as save-as (saveas session) → enter name → Save button returns path+name
- [ ] Narrow window (≤500px) → sidebar auto-collapses
