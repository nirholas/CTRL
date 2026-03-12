/* ============================================================
   CTRL — Widget Engine & Dashboard
   Slide-in widget board with clock, system monitor, crypto, notes
   ============================================================ */

var WidgetEngine = (function () {
    'use strict';

    var _registry = new Map();
    var _activeWidgets = [];
    var _boardOpen = false;
    var _timers = [];
    var _startTime = Date.now();

    function registerWidget(type, config) {
        _registry.set(type, config);
    }

    function initBuiltins() {
        registerWidget("clock", {
            name: "Clock",
            icon: "🕐",
            defaultSize: { w: 2, h: 2 },
            render: function (container) {
                container.innerHTML =
                    '<div class="widget-clock">' +
                    '  <div class="widget-clock-time" id="w-clock-time"></div>' +
                    '  <div class="widget-clock-date" id="w-clock-date"></div>' +
                    '</div>';
                this.update(container);
            },
            update: function (container) {
                var now = new Date();
                var timeEl = container.querySelector("#w-clock-time");
                var dateEl = container.querySelector("#w-clock-date");
                if (timeEl) timeEl.textContent = now.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
                if (dateEl) dateEl.textContent = now.toLocaleDateString([], { weekday: "long", month: "long", day: "numeric" });
            },
            interval: 1000
        });

        registerWidget("system-monitor", {
            name: "System Monitor",
            icon: "📊",
            defaultSize: { w: 2, h: 2 },
            render: function (container) {
                container.innerHTML =
                    '<div class="widget-sysmon"><h4>System</h4>' +
                    '  <div class="sysmon-row"><span>Windows</span><span id="w-sysmon-windows">0</span></div>' +
                    '  <div class="sysmon-row"><span>Memory</span><span id="w-sysmon-memory">-</span></div>' +
                    '  <div class="sysmon-row"><span>Uptime</span><span id="w-sysmon-uptime">-</span></div>' +
                    '</div>';
                this.update(container);
            },
            update: function (container) {
                var winCount = container.querySelector("#w-sysmon-windows");
                var memEl = container.querySelector("#w-sysmon-memory");
                var upEl = container.querySelector("#w-sysmon-uptime");
                if (winCount && typeof winds !== 'undefined') winCount.textContent = Object.keys(winds).length;
                if (memEl && /** @type {any} */ (performance).memory) {
                    memEl.textContent = Math.round(/** @type {any} */ (performance).memory.usedJSHeapSize / 1048576) + " MB";
                }
                if (upEl) {
                    var secs = Math.floor((Date.now() - _startTime) / 1000);
                    var h = Math.floor(secs / 3600);
                    var m = Math.floor((secs % 3600) / 60);
                    upEl.textContent = h + "h " + m + "m";
                }
            },
            interval: 2000
        });

        registerWidget("quick-notes", {
            name: "Quick Notes",
            icon: "📝",
            defaultSize: { w: 2, h: 3 },
            render: function (container) {
                var saved = localStorage.getItem("widget-notes") || "";
                container.innerHTML =
                    '<div class="widget-notes"><h4>Quick Notes</h4>' +
                    '<textarea class="widget-notes-input" placeholder="Type a note...">' +
                    saved.replace(/</g, '&lt;') +
                    '</textarea></div>';
                container.querySelector(".widget-notes-input").addEventListener("input", function () {
                    localStorage.setItem("widget-notes", this.value);
                });
            }
        });

        registerWidget("crypto-ticker", {
            name: "Crypto Prices",
            icon: "₿",
            defaultSize: { w: 2, h: 2 },
            render: function (container) {
                container.innerHTML =
                    '<div class="widget-crypto"><h4>Crypto</h4>' +
                    '<div class="crypto-list">' +
                    '  <div class="crypto-row"><span>BTC</span><span id="w-btc">Loading...</span></div>' +
                    '  <div class="crypto-row"><span>ETH</span><span id="w-eth">Loading...</span></div>' +
                    '  <div class="crypto-row"><span>SOL</span><span id="w-sol">Loading...</span></div>' +
                    '</div></div>';
                this.update(container);
            },
            update: function (container) {
                var btc = container.querySelector("#w-btc");
                var eth = container.querySelector("#w-eth");
                var sol = container.querySelector("#w-sol");
                // Simulated—in production, fetch from market-data API
                if (btc) btc.textContent = "$" + (60000 + Math.random() * 5000).toFixed(0);
                if (eth) eth.textContent = "$" + (3000 + Math.random() * 300).toFixed(0);
                if (sol) sol.textContent = "$" + (100 + Math.random() * 30).toFixed(0);
            },
            interval: 30000
        });

        registerWidget("shortcuts", {
            name: "Quick Launch",
            icon: "🚀",
            defaultSize: { w: 2, h: 1 },
            render: function (container) {
                var apps = ["terminal", "files", "browser", "text"];
                container.innerHTML =
                    '<div class="widget-shortcuts">' +
                    apps.map(function (a) {
                        return '<button class="widget-shortcut-btn" data-app="' + a + '" title="' + a + '">' + a.charAt(0).toUpperCase() + '</button>';
                    }).join("") +
                    '</div>';
                container.querySelectorAll(".widget-shortcut-btn").forEach(function (btn) {
                    btn.addEventListener("click", function () {
                        if (typeof openapp === 'function') openapp(btn.dataset.app);
                    });
                });
            }
        });
    }

    function toggleBoard() {
        _boardOpen = !_boardOpen;
        var board = document.getElementById("widget-board");
        if (!board) return;
        board.classList.toggle("open", _boardOpen);
        if (_boardOpen) {
            renderBoard();
        } else {
            clearTimers();
        }
    }

    function clearTimers() {
        _timers.forEach(function (t) { clearInterval(t); });
        _timers = [];
    }

    function renderBoard() {
        var body = document.getElementById("widget-board-body");
        if (!body) return;
        clearTimers();
        loadLayout();
        body.innerHTML = "";

        for (var i = 0; i < _activeWidgets.length; i++) {
            var widget = _activeWidgets[i];
            var def = _registry.get(widget.widgetType);
            if (!def) continue;

            var card = document.createElement("div");
            card.className = "widget-card";
            card.setAttribute("data-widget-id", widget.id);
            card.style.gridColumn = "span " + def.defaultSize.w;
            card.style.gridRow = "span " + def.defaultSize.h;

            var header = document.createElement("div");
            header.className = "widget-card-header";
            header.innerHTML = '<span>' + def.icon + ' ' + def.name + '</span>' +
                '<button class="widget-remove" data-wid="' + widget.id + '" title="Remove">&times;</button>';
            card.appendChild(header);

            var content = document.createElement("div");
            content.className = "widget-card-content";
            card.appendChild(content);
            body.appendChild(card);

            def.render(content, widget.config);

            if (def.interval && def.update) {
                _timers.push(setInterval((function (d, c, cfg) {
                    return function () { d.update(c, cfg); };
                })(def, content, widget.config), def.interval));
            }
        }

        // Delegated remove handler
        body.onclick = function (e) {
            var removeBtn = /** @type {HTMLElement} */ (e.target).closest(".widget-remove");
            if (removeBtn) removeWidget(/** @type {HTMLElement} */ (removeBtn).dataset.wid);
        };
    }

    function addWidget(type) {
        var id = "w-" + Date.now();
        _activeWidgets.push({ id: id, widgetType: type, config: {} });
        saveLayout();
        renderBoard();
    }

    function removeWidget(id) {
        var idx = -1;
        for (var i = 0; i < _activeWidgets.length; i++) {
            if (_activeWidgets[i].id === id) { idx = i; break; }
        }
        if (idx !== -1) {
            _activeWidgets.splice(idx, 1);
            saveLayout();
            renderBoard();
        }
    }

    function saveLayout() {
        try {
            localStorage.setItem("CTRL-widgets", JSON.stringify(_activeWidgets));
        } catch (e) { /* quota exceeded */ }
    }

    function loadLayout() {
        try {
            var saved = localStorage.getItem("CTRL-widgets");
            if (saved) {
                var parsed = JSON.parse(saved);
                _activeWidgets = parsed;
            } else {
                _activeWidgets = [
                    { id: "w-1", widgetType: "clock", config: {} },
                    { id: "w-2", widgetType: "system-monitor", config: {} },
                    { id: "w-3", widgetType: "crypto-ticker", config: {} },
                    { id: "w-4", widgetType: "quick-notes", config: {} }
                ];
            }
        } catch (e) {
            _activeWidgets = [];
        }
    }

    function getAvailableWidgets() {
        var result = [];
        _registry.forEach(function (def, type) {
            result.push({ type: type, name: def.name, icon: def.icon });
        });
        return result;
    }

    initBuiltins();

    return {
        toggleBoard: toggleBoard,
        addWidget: addWidget,
        removeWidget: removeWidget,
        getAvailableWidgets: getAvailableWidgets,
        registerWidget: registerWidget
    };
})();
