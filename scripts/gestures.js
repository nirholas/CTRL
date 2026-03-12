/* ============================================================
   CTRL — Touch Gesture Manager
   Supports swipe navigation, long-press context, and pinch prevention
   ============================================================ */

var GestureManager = (function () {
    'use strict';

    var _startX = 0, _startY = 0, _startTime = 0;
    var _isGesture = false;
    var SWIPE_THRESHOLD = 60;
    var SWIPE_TIME = 300;
    var LONG_PRESS_TIME = 500;
    var _longPressTimer = null;

    function init() {
        if (!('ontouchstart' in window)) return;

        document.addEventListener('touchstart', onTouchStart, { passive: true });
        document.addEventListener('touchmove', onTouchMove, { passive: true });
        document.addEventListener('touchend', onTouchEnd, { passive: true });

        // Prevent pinch-to-zoom on the OS shell (apps in iframes can still zoom)
        document.addEventListener('gesturestart', function (e) { e.preventDefault(); });
        document.addEventListener('touchmove', function (e) {
            if (e.touches.length > 1) e.preventDefault();
        }, { passive: false });
    }

    function onTouchStart(e) {
        if (e.touches.length !== 1) return;
        var t = e.touches[0];
        _startX = t.clientX;
        _startY = t.clientY;
        _startTime = Date.now();
        _isGesture = false;

        _longPressTimer = setTimeout(function () {
            _isGesture = true;
            var target = document.elementFromPoint(_startX, _startY);
            handleLongPress(target, _startX, _startY);
        }, LONG_PRESS_TIME);
    }

    function onTouchMove() {
        clearTimeout(_longPressTimer);
    }

    function onTouchEnd(e) {
        clearTimeout(_longPressTimer);
        if (_isGesture) return;

        var ct = e.changedTouches[0];
        var dx = ct.clientX - _startX;
        var dy = ct.clientY - _startY;
        var dt = Date.now() - _startTime;

        if (dt > SWIPE_TIME) return;
        if (Math.abs(dx) < SWIPE_THRESHOLD && Math.abs(dy) < SWIPE_THRESHOLD) return;

        if (Math.abs(dx) > Math.abs(dy)) {
            handleSwipe(dx > 0 ? 'right' : 'left');
        } else {
            handleSwipe(dy > 0 ? 'down' : 'up');
        }
    }

    function handleSwipe(direction) {
        var fromEdge = {
            left: _startX < 20,
            right: _startX > window.innerWidth - 20,
            top: _startY < 20,
            bottom: _startY > window.innerHeight - 20
        };

        // Swipe up from bottom → show taskbar
        if (direction === 'up' && fromEdge.bottom) {
            if (typeof TaskbarManager !== 'undefined' && TaskbarManager.show) TaskbarManager.show();
            return;
        }

        // Swipe down from top → notification center
        if (direction === 'down' && fromEdge.top) {
            if (typeof notificationCenter !== 'undefined' && notificationCenter.toggle) notificationCenter.toggle();
            return;
        }

        // Swipe right from left edge → app launcher / start menu
        if (direction === 'right' && fromEdge.left) {
            if (typeof openAppLauncher === 'function') openAppLauncher();
            return;
        }

        // Swipe left from right edge → quick settings
        if (direction === 'left' && fromEdge.right) {
            if (typeof toggleQuickSettings === 'function') toggleQuickSettings();
            return;
        }
    }

    function handleLongPress(target, x, y) {
        if (!target) return;

        // Long press on desktop → context menu
        if (target.closest && target.closest('#desktop') && !target.closest('.window')) {
            if (typeof openContextMenu === 'function') openContextMenu(x, y);
            if (navigator.vibrate) navigator.vibrate(50);
            return;
        }

        // Long press on desktop icon → select for move
        var desktopEntry = target.closest && target.closest('.desktopentry');
        if (desktopEntry) {
            desktopEntry.classList.add('selected');
            if (navigator.vibrate) navigator.vibrate(30);
        }
    }

    return { init: init };
})();
