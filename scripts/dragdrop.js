/**
 * DragDropBridge — system-level drag-and-drop between CTRL windows.
 *
 * Because each app runs inside a sandboxed iframe, native HTML5 drag events
 * cannot cross window boundaries.  The bridge solves this by:
 *   1. Letting an app signal "I started dragging something" via postMessage.
 *   2. Placing transparent overlay divs on every *other* open window so that
 *      dragover / drop events are captured by the parent document.
 *   3. Forwarding the dropped payload into the target window's iframe via
 *      postMessage with type === "CTRL-drop".
 *
 * Desktop → window drops are also supported: regular desktop items that set
 * data-file-id / data-file-name will automatically feed into the bridge on
 * dragstart.
 */

const DragDropBridge = (() => {
    let dragData = null;
    let overlays = [];

    /**
     * Called when an app (or the desktop) starts a drag operation.
     * @param {Object} data   Payload describing the dragged item.
     *   - fileId   {string}  Unique file id
     *   - fileName {string}  Human-readable name
     *   - fileType {string=} MIME or extension hint
     *   - content  {string=} Optional inline content (small files only)
     * @param {string} sourceWinuid  The winuid of the window that initiated the drag.
     */
    function startDrag(data, sourceWinuid) {
        dragData = { ...data, sourceWinuid, timestamp: Date.now() };
        createDropOverlays(sourceWinuid);
    }

    /**
     * Build transparent overlay divs on top of every visible window except
     * the source.  This lets the parent document capture dragover/drop even
     * though iframes normally swallow pointer events.
     */
    function createDropOverlays(excludeWinuid) {
        removeOverlays();

        Object.keys(winds).forEach(winuid => {
            if (winuid === excludeWinuid) return;

            const windowEl = document.getElementById("window" + winuid);
            if (!windowEl) return;

            // Skip minimised / hidden windows
            const state = winds[winuid].visualState;
            if (state === "minimized" || state === "hidden") return;

            const overlay = document.createElement("div");
            overlay.className = "drag-drop-overlay";
            overlay.dataset.winuid = winuid;

            overlay.addEventListener("dragover", (e) => {
                e.preventDefault();
                e.dataTransfer.dropEffect = "copy";
                overlay.classList.add("drag-hover");
            });

            overlay.addEventListener("dragleave", () => {
                overlay.classList.remove("drag-hover");
            });

            overlay.addEventListener("drop", (e) => {
                e.preventDefault();
                overlay.classList.remove("drag-hover");
                handleDrop(winuid, dragData);
                endDrag();
            });

            windowEl.appendChild(overlay);
            overlays.push(overlay);
        });
    }

    /**
     * Deliver the drop payload to the target window's iframe via postMessage.
     */
    function handleDrop(targetWinuid, data) {
        if (!data) return;

        const targetIframe = iframeReferences[targetWinuid];
        if (targetIframe) {
            targetIframe.postMessage({
                type: "CTRL-drop",
                data: {
                    fileId: data.fileId || null,
                    fileName: data.fileName || null,
                    fileType: data.fileType || null,
                    content: data.content || null
                }
            }, "*");
        }
    }

    /**
     * Clean up after a drag operation completes (or is cancelled).
     */
    function endDrag() {
        dragData = null;
        removeOverlays();
    }

    function removeOverlays() {
        overlays.forEach(o => o.remove());
        overlays = [];
    }

    // ── Desktop → window drag support ──────────────────────────────────
    // Desktop shortcut items that carry data-file-id feed into the bridge
    // automatically, so a user can drag a desktop icon into any open window.
    document.body.addEventListener("dragstart", (e) => {
        const target = e.target?.closest?.("[unid]");
        if (!target) return;

        const fileId = target.getAttribute("unid");
        const fileName = target.getAttribute("data-file-name") ||
                          target.querySelector(".flfrname, .appicnlabel, .appicnspan + span, span")?.textContent?.trim() ||
                          "";

        if (fileId) {
            startDrag({ fileId, fileName });
        }
    });

    document.body.addEventListener("dragend", () => {
        endDrag();
    });

    return { startDrag, endDrag, handleDrop };
})();
