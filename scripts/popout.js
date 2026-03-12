/* ============================================================
   CTRL — Pop-Out Window & Virtual Monitor Manager
   ============================================================ */

var PopoutManager = (function () {
    'use strict';

    var _popouts = new Map(); // winId → Window reference

    function popout(winuid) {
        var windInfo = winds[winuid];
        if (!windInfo) return;

        var width = 800, height = 600;
        var left = window.screenX + 50;
        var top = window.screenY + 50;

        var popup = window.open("", "CTRL-popout-" + winuid,
            "width=" + width + ",height=" + height + ",left=" + left + ",top=" + top + ",menubar=no,toolbar=no,location=no,status=no"
        );

        if (!popup) {
            if (typeof toast === 'function') toast("Pop-up blocked. Allow pop-ups for this site.");
            return;
        }

        var title = windInfo.title || "CTRL";
        var safeWinuid = winuid.replace(/[^a-zA-Z0-9_-]/g, '');

        popup.document.write(
            '<!DOCTYPE html><html><head><meta charset="UTF-8">' +
            '<title>' + title.replace(/</g, '&lt;') + '</title>' +
            '<style>*{margin:0;padding:0;box-sizing:border-box}body{background:#101010;overflow:hidden}iframe{width:100vw;height:100vh;border:none}</style>' +
            '</head><body>' +
            '<iframe id="popout-frame" sandbox="allow-scripts allow-same-origin allow-popups allow-forms"></iframe>' +
            '<script>' +
            'var frame=document.getElementById("popout-frame");' +
            'window.addEventListener("message",function(e){' +
            '  if(e.data&&e.data.type==="popout-content")frame.src=e.data.blobUrl;' +
            '  if(e.data&&e.data.type==="popout-theme")document.body.style.background=e.data.bg;' +
            '});' +
            'window.addEventListener("message",function(e){' +
            '  if(e.data&&e.data.transactionId&&e.data.action&&e.source===frame.contentWindow){' +
            '    window.opener&&window.opener.postMessage(Object.assign({},e.data,{_popoutWinId:"' + safeWinuid + '"}),"*");' +
            '  }' +
            '});' +
            'window.opener&&window.opener.postMessage({type:"popout-ready",winId:"' + safeWinuid + '"},"*");' +
            'window.addEventListener("beforeunload",function(){' +
            '  window.opener&&window.opener.postMessage({type:"popout-closed",winId:"' + safeWinuid + '"},"*");' +
            '});' +
            '</script></body></html>'
        );
        popup.document.close();

        _popouts.set(winuid, popup);

        var mainWin = document.getElementById("window" + winuid);
        if (mainWin) mainWin.style.display = "none";
        windInfo._poppedOut = true;
    }

    function popin(winuid) {
        var popup = _popouts.get(winuid);
        if (popup && !popup.closed) popup.close();
        _popouts.delete(winuid);

        var mainWin = document.getElementById("window" + winuid);
        if (mainWin) mainWin.style.display = "flex";
        if (winds[winuid]) winds[winuid]._poppedOut = false;
    }

    function isPopout(winuid) {
        return _popouts.has(winuid) && !_popouts.get(winuid).closed;
    }

    function closeAll() {
        _popouts.forEach(function (popup) {
            if (!popup.closed) popup.close();
        });
        _popouts.clear();
    }

    // Handle messages from popout windows
    window.addEventListener("message", function (e) {
        if (!e.data) return;
        if (e.data.type === "popout-ready") {
            var winuid = e.data.winId;
            var popup = _popouts.get(winuid);
            if (popup && winds[winuid] && winds[winuid].src) {
                popup.postMessage({ type: "popout-content", blobUrl: winds[winuid].src }, "*");
            }
        }
        if (e.data.type === "popout-closed") {
            var wid = e.data.winId;
            _popouts.delete(wid);
            var mainWin = document.getElementById("window" + wid);
            if (mainWin) mainWin.style.display = "flex";
            if (winds[wid]) winds[wid]._poppedOut = false;
        }
    });

    // Clean up all popouts when main page closes
    window.addEventListener("beforeunload", function () {
        closeAll();
    });

    return { popout: popout, popin: popin, isPopout: isPopout, closeAll: closeAll };
})();

/* ── Virtual Monitors (split-screen simulation) ── */
var VirtualMonitors = (function () {
    'use strict';

    var _splitMode = "single";

    function setSplit(mode) {
        _splitMode = mode;
        var desktop = document.getElementById("desktop");
        if (!desktop) return;

        switch (mode) {
            case "dual-h":
                desktop.style.display = "grid";
                desktop.style.gridTemplateColumns = "1fr 1fr";
                desktop.style.gap = "2px";
                ensureMonitorContainers(2);
                break;
            case "dual-v":
                desktop.style.display = "grid";
                desktop.style.gridTemplateRows = "1fr 1fr";
                desktop.style.gap = "2px";
                ensureMonitorContainers(2);
                break;
            default:
                desktop.style.display = "";
                desktop.style.gridTemplateColumns = "";
                desktop.style.gridTemplateRows = "";
                desktop.style.gap = "";
                removeMonitorContainers();
        }
    }

    function ensureMonitorContainers(count) {
        var desktop = document.getElementById("desktop");
        if (!desktop) return;
        for (var i = 0; i < count; i++) {
            if (!document.getElementById("monitor-" + i)) {
                var mon = document.createElement("div");
                mon.id = "monitor-" + i;
                mon.className = "virtual-monitor";
                mon.setAttribute("data-monitor", String(i));
                desktop.appendChild(mon);
            }
        }
    }

    function removeMonitorContainers() {
        document.querySelectorAll(".virtual-monitor").forEach(function (m) { m.remove(); });
    }

    function getMode() { return _splitMode; }

    return { setSplit: setSplit, getMode: getMode };
})();
