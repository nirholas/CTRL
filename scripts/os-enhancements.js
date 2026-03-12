/* ============================================================
   CTRL — Web OS Enhancement Scripts
   Desktop widget, Quick Settings panel, Calendar, Brightness
   ============================================================ */

(function () {
	'use strict';

	// --- Desktop Clock Widget ---
	function updateDesktopWidget() {
		const dwTime = document.getElementById('dw-time');
		const dwDate = document.getElementById('dw-date');
		const dwGreeting = document.getElementById('dw-greeting');
		if (!dwTime) return;

		const now = new Date();
		const hours = now.getHours();
		let h = hours;
		let ampm = '';

		if (typeof timetypecondition !== 'undefined' && timetypecondition) {
			ampm = hours >= 12 ? ' PM' : ' AM';
			h = hours % 12 || 12;
		}

		dwTime.textContent = (h < 10 && !ampm ? '0' : '') + h + ':' + now.getMinutes().toString().padStart(2, '0') + ampm;

		const options = { weekday: 'long', month: 'long', day: 'numeric' };
		dwDate.textContent = now.toLocaleDateString('en-US', options);

		let greeting = 'Good evening';
		if (hours < 12) greeting = 'Good morning';
		else if (hours < 17) greeting = 'Good afternoon';

		const username = (typeof CurrentUsername !== 'undefined' && CurrentUsername) || '';
		dwGreeting.textContent = username ? greeting + ', ' + username : greeting;
	}

	// --- Quick Settings Panel ---
	window.toggleQuickSettings = function (e) {
		if (e) e.stopPropagation();
		const panel = document.getElementById('quicksettings');
		if (panel.style.display === 'none' || !panel.style.display) {
			// Close notification center if open
			if (typeof closeNotificationCenter === 'function') {
				const nc = document.getElementById('notification-center');
				if (nc && nc.classList.contains('open')) closeNotificationCenter();
			}
			panel.style.display = 'block';
			updateQSTime();
			renderMiniCalendar();
			// Close when clicking outside
			setTimeout(() => {
				document.addEventListener('click', closeQSOnClickOutside);
			}, 0);
		} else {
			closeQuickSettings();
		}
	};

	function closeQuickSettings() {
		const panel = document.getElementById('quicksettings');
		panel.style.display = 'none';
		document.removeEventListener('click', closeQSOnClickOutside);
	}

	function closeQSOnClickOutside(e) {
		const panel = document.getElementById('quicksettings');
		const systray = document.querySelector('.systray');
		if (panel && !panel.contains(e.target) && systray && !systray.contains(e.target)) {
			closeQuickSettings();
		}
	}

	function updateQSTime() {
		const qsTime = document.getElementById('qs-time');
		const qsDate = document.getElementById('qs-date');
		if (!qsTime) return;

		const now = new Date();
		const h = now.getHours();
		let hours = h;
		let ampm = '';

		if (typeof timetypecondition !== 'undefined' && timetypecondition) {
			ampm = h >= 12 ? ' PM' : ' AM';
			hours = h % 12 || 12;
		}

		qsTime.textContent = (hours < 10 && !ampm ? '0' : '') + hours + ':' + now.getMinutes().toString().padStart(2, '0') + ampm;

		const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
		qsDate.textContent = now.toLocaleDateString('en-US', options);
	}

	// --- Mini Calendar ---
	function renderMiniCalendar() {
		const container = document.getElementById('qs-calendar');
		if (!container) return;

		const now = new Date();
		const year = now.getFullYear();
		const month = now.getMonth();
		const today = now.getDate();

		const monthNames = ['January', 'February', 'March', 'April', 'May', 'June',
			'July', 'August', 'September', 'October', 'November', 'December'];

		const firstDay = new Date(year, month, 1).getDay();
		const daysInMonth = new Date(year, month + 1, 0).getDate();
		const daysInPrevMonth = new Date(year, month, 0).getDate();

		let html = '<div class="qs-cal-header"><span>' + monthNames[month] + ' ' + year + '</span></div>';
		html += '<div class="qs-cal-grid">';

		const dayNames = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];
		dayNames.forEach(d => { html += '<span class="day-name">' + d + '</span>'; });

		// Previous month trailing days
		for (let i = firstDay - 1; i >= 0; i--) {
			html += '<span class="day other-month">' + (daysInPrevMonth - i) + '</span>';
		}

		// Current month
		for (let d = 1; d <= daysInMonth; d++) {
			const cls = d === today ? 'day today' : 'day';
			html += '<span class="' + cls + '">' + d + '</span>';
		}

		// Next month leading days
		const totalCells = firstDay + daysInMonth;
		const remaining = (7 - (totalCells % 7)) % 7;
		for (let d = 1; d <= remaining; d++) {
			html += '<span class="day other-month">' + d + '</span>';
		}

		html += '</div>';
		container.innerHTML = html;
	}

	// --- Quick Settings Toggle Buttons ---
	window.toggleQSBtn = function (btn) {
		btn.classList.toggle('active');
	};

	// --- Brightness Control ---
	window.setBrightness = function (val) {
		const v = parseInt(val, 10);
		document.getElementById('main').style.filter = 'brightness(' + (v / 100) + ')';
	};

	// --- Volume Control ---
	const volSlider = document.getElementById('qs-volume');
	if (volSlider) {
		volSlider.addEventListener('input', function (e) {
			if (typeof AudioManager !== 'undefined') {
				AudioManager.setVolume(parseInt(e.target.value, 10) / 100);
			}
		});
	}

	const volIcon = volSlider ? volSlider.previousElementSibling : null;
	if (volIcon) {
		volIcon.style.cursor = 'pointer';
		volIcon.addEventListener('click', function () {
			if (typeof AudioManager !== 'undefined') {
				AudioManager.toggleMute();
				const slider = document.getElementById('qs-volume');
				if (slider) {
					slider.value = AudioManager.isMuted() ? 0 : Math.round(AudioManager.getVolume() * 100);
				}
			}
		});
	}

	// --- Main Update Loop ---
	function tickWidgets() {
		updateDesktopWidget();

		// Sync QS panel if open
		const panel = document.getElementById('quicksettings');
		if (panel && panel.style.display === 'block') {
			updateQSTime();
		}
	}

	// --- System Tray ---

	let systrayInterval = null;
	let notifBadgeCount = 0;

	window.initSystemTray = function () {
		// Start 1-second interval for clock + date
		updateSystrayTime();
		systrayInterval = setInterval(updateSystrayTime, 1000);

		initBatteryMonitor();
		initNetworkMonitor();

		// Set initial badge count from existing notifLog
		if (typeof notifLog !== 'undefined') {
			notifBadgeCount = Object.keys(notifLog).length;
			updateNotifBadge(notifBadgeCount);
		}
	};

	function updateSystrayTime() {
		const timeEl = document.getElementById('time-display');
		const dateShortEl = document.getElementById('date-display-short');
		if (!timeEl) return;

		const now = new Date();
		const h = now.getHours();
		let hours = h;
		let ampm = '';

		if (typeof timetypecondition !== 'undefined' && timetypecondition) {
			ampm = h >= 12 ? ' PM' : ' AM';
			hours = h % 12 || 12;
		}

		const mins = now.getMinutes().toString().padStart(2, '0');
		timeEl.textContent = (hours < 10 && !ampm ? '0' : '') + hours + ':' + mins + ampm;

		if (dateShortEl) {
			const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
				'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
			dateShortEl.textContent = monthNames[now.getMonth()] + ' ' + now.getDate();
		}

		// Also update the desktop widget and QS in sync
		updateDesktopWidget();
		const qsPanel = document.getElementById('quicksettings');
		if (qsPanel && qsPanel.style.display === 'block') {
			updateQSTime();
		}
	}

	// --- Battery Monitor ---

	function initBatteryMonitor() {
		if (!navigator.getBattery) return;

		navigator.getBattery().then(function (battery) {
			const btn = document.getElementById('systray-battery-btn');
			if (btn) btn.style.display = '';

			updateBatteryUI(battery);

			battery.addEventListener('levelchange', function () {
				updateBatteryUI(battery);
			});
			battery.addEventListener('chargingchange', function () {
				updateBatteryUI(battery);
			});
		}).catch(function () {
			// Battery API not available — hide button
		});
	}

	function updateBatteryUI(battery) {
		const iconEl = document.getElementById('systray-battery-icon');
		const pctEl = document.getElementById('systray-battery-pct');
		if (!iconEl) return;

		const level = Math.round(battery.level * 100);
		const charging = battery.charging;

		let icon;
		if (charging) {
			icon = 'battery_charging_full';
		} else if (level >= 90) {
			icon = 'battery_full';
		} else if (level >= 60) {
			icon = 'battery_5_bar';
		} else if (level >= 30) {
			icon = 'battery_3_bar';
		} else if (level >= 10) {
			icon = 'battery_2_bar';
		} else {
			icon = 'battery_alert';
		}

		iconEl.textContent = icon;
		if (pctEl) pctEl.textContent = level + '%';

		const btn = document.getElementById('systray-battery-btn');
		if (btn) btn.title = 'Battery: ' + level + '%' + (charging ? ' (Charging)' : '');
	}

	// --- Network Monitor ---

	function initNetworkMonitor() {
		updateNetworkIcon();

		window.addEventListener('online', updateNetworkIcon);
		window.addEventListener('offline', updateNetworkIcon);
	}

	function updateNetworkIcon() {
		const iconEl = document.getElementById('systray-network-icon');
		if (!iconEl) return;
		iconEl.textContent = navigator.onLine ? 'wifi' : 'wifi_off';

		const btn = document.getElementById('systray-network-btn');
		if (btn) btn.title = navigator.onLine ? 'Connected' : 'Offline';
	}

	window.showNetworkStatus = function () {
		if (typeof toast === 'function') {
			toast(navigator.onLine ? 'Connected to the network' : 'No network connection');
		}
	};

	// --- Notification Badge ---

	window.updateNotifBadge = function (count) {
		notifBadgeCount = count;
		const badge = document.getElementById('systray-notif-badge');
		if (!badge) return;

		if (count > 0) {
			badge.style.display = '';
			badge.textContent = count > 9 ? '9+' : String(count);
		} else {
			badge.style.display = 'none';
			badge.textContent = '0';
		}
	};

	// Increment badge — called from notify() hook
	window.incrementNotifBadge = function () {
		notifBadgeCount++;
		window.updateNotifBadge(notifBadgeCount);
	};

	// Reset badge — called when notifications are cleared
	window.resetNotifBadge = function () {
		window.updateNotifBadge(0);
	};

	// Start widget clock after a slight delay to let other scripts load
	function initEnhancements() {
		tickWidgets();
		setInterval(tickWidgets, 10000);

		// Hide desktop widget when apps are covering it
		const observer = new MutationObserver(() => {
			const widget = document.getElementById('desktop-widget');
			const container = document.getElementById('maxappscontainer');
			if (!widget || !container) return;
			const hasWindows = container.children.length > 0;
			widget.style.opacity = hasWindows ? '0.3' : '1';
			widget.style.transition = 'opacity 0.5s';
		});

		const maxapps = document.getElementById('maxappscontainer');
		if (maxapps) {
			observer.observe(maxapps, { childList: true });
		}
	}

	if (document.readyState === 'loading') {
		document.addEventListener('DOMContentLoaded', initEnhancements);
	} else {
		initEnhancements();
	}
})();

/* ============================================================
   Sound System — Mute Toggle & Volume Control
   ============================================================ */

function toggleMute() {
	if (typeof agentSounds === 'undefined') return;
	const nowEnabled = agentSounds.toggle();
	updateSoundTrayIcon();
	if (typeof toast === 'function') {
		toast(nowEnabled ? 'Sound on' : 'Sound off');
	}
}

function updateSoundTrayIcon() {
	const icon = document.getElementById('systray-sound-icon');
	if (!icon) return;
	if (typeof agentSounds !== 'undefined' && agentSounds.enabled) {
		icon.textContent = 'volume_up';
	} else {
		icon.textContent = 'volume_off';
	}
}

function setSoundVolume(val) {
	if (typeof agentSounds === 'undefined') return;
	agentSounds.setVolume(parseInt(val, 10) / 100);
}

function initSoundVolumeSlider() {
	const slider = document.getElementById('qs-volume');
	if (!slider || typeof agentSounds === 'undefined') return;
	slider.value = Math.round(agentSounds.volume * 100);
}

/* ============================================================
   Desktop Icon Drag-and-Drop Rearrangement
   ============================================================ */

function initDesktopDragDrop() {
	const desktop = document.getElementById('desktop');
	if (!desktop) return;

	// Remove previous listeners by cloning event approach — use a flag instead
	if (desktop._dragInitialized) return;
	desktop._dragInitialized = true;

	let dragState = null;

	desktop.addEventListener('mousedown', function (e) {
		const shortcut = e.target.closest('.app-shortcut');
		if (!shortcut || !desktop.contains(shortcut)) return;

		const startX = e.clientX;
		const startY = e.clientY;
		const holdTimer = setTimeout(function () {
			startDrag(shortcut, startX, startY);
		}, 150);

		function onEarlyMove(ev) {
			const dx = ev.clientX - startX;
			const dy = ev.clientY - startY;
			if (Math.abs(dx) > 5 || Math.abs(dy) > 5) {
				clearTimeout(holdTimer);
				startDrag(shortcut, ev.clientX, ev.clientY);
				document.removeEventListener('mousemove', onEarlyMove);
			}
		}

		function onEarlyUp() {
			clearTimeout(holdTimer);
			document.removeEventListener('mousemove', onEarlyMove);
			document.removeEventListener('mouseup', onEarlyUp);
		}

		document.addEventListener('mousemove', onEarlyMove);
		document.addEventListener('mouseup', onEarlyUp);
	});

	function startDrag(shortcut, startX, startY) {
		if (dragState) return;

		const rect = shortcut.getBoundingClientRect();

		// Create drag ghost
		const ghost = shortcut.cloneNode(true);
		ghost.className = 'app-shortcut desktop-drag-ghost';
		ghost.style.width = rect.width + 'px';
		ghost.style.height = rect.height + 'px';
		ghost.style.left = rect.left + 'px';
		ghost.style.top = rect.top + 'px';
		document.body.appendChild(ghost);

		// Hide original
		shortcut.style.opacity = '0.3';

		const offsetX = startX - rect.left;
		const offsetY = startY - rect.top;

		// Create drop indicator
		const indicator = document.createElement('div');
		indicator.className = 'desktop-drop-indicator';
		desktop.appendChild(indicator);
		indicator.style.display = 'none';

		dragState = {
			shortcut: shortcut,
			ghost: ghost,
			indicator: indicator,
			offsetX: offsetX,
			offsetY: offsetY,
			targetElement: null
		};

		shortcut.dataset.wasDragged = 'true';

		document.addEventListener('mousemove', onDragMove);
		document.addEventListener('mouseup', onDragEnd);
	}

	function onDragMove(e) {
		if (!dragState) return;
		e.preventDefault();

		const { ghost, indicator, offsetX, offsetY, shortcut } = dragState;

		// Move ghost to cursor
		ghost.style.left = (e.clientX - offsetX) + 'px';
		ghost.style.top = (e.clientY - offsetY) + 'px';

		// Find which grid cell is under the cursor
		const desktopRect = desktop.getBoundingClientRect();
		const relX = e.clientX - desktopRect.left;
		const relY = e.clientY - desktopRect.top;

		// Find the element under cursor (excluding ghost and indicator)
		ghost.style.pointerEvents = 'none';
		indicator.style.pointerEvents = 'none';
		const elementBelow = document.elementFromPoint(e.clientX, e.clientY);
		const targetShortcut = elementBelow ? elementBelow.closest('.app-shortcut') : null;

		if (targetShortcut && targetShortcut !== shortcut && desktop.contains(targetShortcut) && !targetShortcut.classList.contains('desktop-drag-ghost')) {
			dragState.targetElement = targetShortcut;
			const targetRect = targetShortcut.getBoundingClientRect();
			indicator.style.display = 'block';
			indicator.style.left = (targetRect.left - desktopRect.left) + 'px';
			indicator.style.top = (targetRect.top - desktopRect.top) + 'px';
			indicator.style.width = targetRect.width + 'px';
			indicator.style.height = targetRect.height + 'px';
		} else if (relX >= 0 && relX < desktopRect.width && relY >= 0 && relY < desktopRect.height) {
			dragState.targetElement = null;
			indicator.style.display = 'none';
		} else {
			dragState.targetElement = null;
			indicator.style.display = 'none';
		}
	}

	function onDragEnd(e) {
		if (!dragState) return;
		document.removeEventListener('mousemove', onDragMove);
		document.removeEventListener('mouseup', onDragEnd);

		const { shortcut, ghost, indicator, targetElement } = dragState;

		// Remove ghost and indicator
		if (ghost.parentNode) ghost.parentNode.removeChild(ghost);
		if (indicator.parentNode) indicator.parentNode.removeChild(indicator);

		// Restore original visibility
		shortcut.style.opacity = '';

		// Rearrange if we have a valid target
		if (targetElement && targetElement !== shortcut) {
			const allShortcuts = Array.from(desktop.querySelectorAll('.app-shortcut:not(.desktop-drop-indicator)'));
			const dragIdx = allShortcuts.indexOf(shortcut);
			const dropIdx = allShortcuts.indexOf(targetElement);

			if (dragIdx !== -1 && dropIdx !== -1) {
				// Remove dragged element and insert at target position
				desktop.removeChild(shortcut);
				if (dropIdx < dragIdx) {
					desktop.insertBefore(shortcut, targetElement);
				} else {
					const nextSibling = targetElement.nextElementSibling;
					if (nextSibling) {
						desktop.insertBefore(shortcut, nextSibling);
					} else {
						desktop.appendChild(shortcut);
					}
				}

				// Save new order
				saveDesktopIconOrder();
			}
		}

		dragState = null;
	}
}

function saveDesktopIconOrder() {
	const desktop = document.getElementById('desktop');
	if (!desktop) return;
	const order = Array.from(desktop.querySelectorAll('.app-shortcut')).map(function (el) {
		return el.getAttribute('unid');
	}).filter(Boolean);
	setSetting('desktopIconOrder', order);
}

/* ============================================================
   Desktop Context Menu Helper Functions
   ============================================================ */

window.createDesktopFile = async function (type) {
	try {
		const ext = type === 'text' ? 'txt' : type;
		await createFile('Desktop/', 'Untitled', ext, '');
		genDesktop();
	} catch (err) {
		console.error('Failed to create desktop file:', err);
	}
};

window.createDesktopFolder = async function () {
	try {
		await createFolder('Desktop/New Folder');
		genDesktop();
	} catch (err) {
		console.error('Failed to create desktop folder:', err);
	}
};

window.sortDesktopIcons = function (by) {
	const desktop = document.getElementById('desktop');
	if (!desktop) return;

	const shortcuts = Array.from(desktop.querySelectorAll('.app-shortcut'));
	if (shortcuts.length === 0) return;

	shortcuts.sort(function (a, b) {
		const nameA = (a.querySelector('.appname') || {}).textContent || '';
		const nameB = (b.querySelector('.appname') || {}).textContent || '';
		if (by === 'name') {
			return nameA.localeCompare(nameB, undefined, { sensitivity: 'base' });
		}
		if (by === 'type') {
			const extA = nameA.includes('.') ? nameA.split('.').pop().toLowerCase() : '';
			const extB = nameB.includes('.') ? nameB.split('.').pop().toLowerCase() : '';
			return extA.localeCompare(extB) || nameA.localeCompare(nameB, undefined, { sensitivity: 'base' });
		}
		if (by === 'date') {
			// Fall back to DOM order (creation order) since we don't have lastModified on DOM
			return 0;
		}
		return 0;
	});

	// Re-append in sorted order (widget stays as first child)
	shortcuts.forEach(function (el) {
		desktop.appendChild(el);
	});

	saveDesktopIconOrder();
	toast("Sorted by " + by);
};

window.autoArrangeDesktopIcons = async function () {
	try {
		await setSetting('desktopIconOrder', null);
		genDesktop();
	} catch (err) {
		console.error('Failed to auto-arrange icons:', err);
	}
};

// Alias used by the desktop context menu
window.resetDesktopLayout = window.autoArrangeDesktopIcons;

/* ============================================================
   Keyboard Shortcuts System
   ShortcutManager, Alt+Tab Window Switcher, Shortcuts Help Panel
   ============================================================ */

class ShortcutManager {
	constructor() {
		this.shortcuts = new Map();
		this.enabled = true;
		this.helpVisible = false;
	}

	register(combo, description, category, action) {
		this.shortcuts.set(combo, { description, category, action });
	}

	handleKeydown(e) {
		if (!this.enabled) return;
		// Don't intercept when typing in input/textarea unless Ctrl/Alt combo
		if (['INPUT', 'TEXTAREA', 'SELECT'].includes(e.target.tagName) && !e.ctrlKey && !e.altKey && !e.metaKey) return;

		const combo = this.buildCombo(e);
		const shortcut = this.shortcuts.get(combo);
		if (shortcut) {
			e.preventDefault();
			e.stopPropagation();
			shortcut.action();
		}
	}

	buildCombo(e) {
		const parts = [];
		if (e.ctrlKey || e.metaKey) parts.push('ctrl');
		if (e.altKey) parts.push('alt');
		if (e.shiftKey) parts.push('shift');

		let key = e.key.toLowerCase();
		// Normalize special keys
		if (key === ' ') key = 'space';
		if (key === 'arrowleft') key = 'left';
		if (key === 'arrowright') key = 'right';
		if (key === 'arrowup') key = 'up';
		if (key === 'arrowdown') key = 'down';
		if (key === '/') key = '/';
		if (key === '?') key = '?';

		parts.push(key);
		return parts.join('+');
	}
}

/* ─────────── Alt+Tab Window Switcher ─────────── */

const WindowSwitcher = (() => {
	let altHeld = false;
	let switcherVisible = false;
	let selectedIndex = 0;
	let windowList = [];

	function getOrderedWindows() {
		if (typeof winds === 'undefined') return [];
		return Object.keys(winds)
			.filter(wid => {
				const el = document.getElementById('window' + wid);
				return el && winds[wid].visualState !== 'minimized';
			})
			.sort((a, b) => (Number(winds[b].zIndex) || 0) - (Number(winds[a].zIndex) || 0));
	}

	function show() {
		windowList = getOrderedWindows();
		if (windowList.length === 0) return;

		if (windowList.length === 1) {
			// Single window — just focus it
			if (typeof putwinontop === 'function') putwinontop('window' + windowList[0]);
			return;
		}

		switcherVisible = true;
		selectedIndex = 1; // Start on the second window (next one)
		if (selectedIndex >= windowList.length) selectedIndex = 0;

		renderSwitcher();

		const overlay = document.getElementById('window-switcher');
		if (overlay) overlay.style.display = 'flex';
	}

	function hide() {
		switcherVisible = false;
		const overlay = document.getElementById('window-switcher');
		if (overlay) overlay.style.display = 'none';

		// Focus the selected window
		if (windowList.length > 0 && selectedIndex < windowList.length) {
			const winuid = windowList[selectedIndex];
			const winEl = document.getElementById('window' + winuid);
			if (winEl) {
				winEl.style.display = 'flex';
				if (winds[winuid]) winds[winuid].visualState = 'free';
			}
			if (typeof putwinontop === 'function') putwinontop('window' + winuid);
		}

		windowList = [];
		selectedIndex = 0;
	}

	function cycleNext() {
		if (!switcherVisible || windowList.length === 0) return;
		selectedIndex = (selectedIndex + 1) % windowList.length;
		updateHighlight();
	}

	function cyclePrev() {
		if (!switcherVisible || windowList.length === 0) return;
		selectedIndex = (selectedIndex - 1 + windowList.length) % windowList.length;
		updateHighlight();
	}

	function renderSwitcher() {
		const list = document.getElementById('ws-list');
		if (!list) return;

		list.innerHTML = '';

		windowList.forEach((wid, idx) => {
			const winData = winds[wid];
			const item = document.createElement('div');
			item.className = 'ws-item' + (idx === selectedIndex ? ' active' : '');
			item.setAttribute('data-ws-idx', idx);

			// Icon
			const iconWrap = document.createElement('div');
			iconWrap.className = 'ws-item-icon';
			const winEl = document.getElementById('window' + wid);
			const headerIcon = winEl ? winEl.querySelector('.windowchrmheadicon img, .windowchrmheadicon svg') : null;
			if (headerIcon) {
				iconWrap.appendChild(headerIcon.cloneNode(true));
			} else {
				const fallback = document.createElement('span');
				fallback.className = 'material-symbols-rounded';
				fallback.textContent = 'window';
				fallback.style.fontSize = '28px';
				fallback.style.opacity = '0.6';
				iconWrap.appendChild(fallback);
			}

			// Title
			const titleEl = document.createElement('div');
			titleEl.className = 'ws-item-title';
			titleEl.textContent = winData.title || 'Window';

			item.appendChild(iconWrap);
			item.appendChild(titleEl);

			// Click to select
			item.addEventListener('click', () => {
				selectedIndex = idx;
				hide();
			});

			list.appendChild(item);
		});
	}

	function updateHighlight() {
		const list = document.getElementById('ws-list');
		if (!list) return;

		const items = list.querySelectorAll('.ws-item');
		items.forEach((item, idx) => {
			if (idx === selectedIndex) {
				item.classList.add('active');
			} else {
				item.classList.remove('active');
			}
		});
	}

	// Track Alt key state
	document.addEventListener('keydown', (e) => {
		if (e.key === 'Alt') {
			altHeld = true;
		}
	});

	document.addEventListener('keyup', (e) => {
		if (e.key === 'Alt') {
			altHeld = false;
			if (switcherVisible) {
				hide();
			}
		}
	});

	// Lose focus → treat as Alt release
	window.addEventListener('blur', () => {
		if (switcherVisible) {
			altHeld = false;
			hide();
		}
	});

	return { show, hide, cycleNext, cyclePrev, isVisible: () => switcherVisible };
})();

/* ─────────── Shortcuts Help Panel ─────────── */

function showShortcutsHelp() {
	const dialog = document.getElementById('shortcuts-help');
	if (!dialog) return;

	const body = document.getElementById('shortcuts-body');
	if (!body) return;

	// Group shortcuts by category
	const groups = {};
	window.shortcutManager.shortcuts.forEach((data, combo) => {
		const cat = data.category || 'Other';
		if (!groups[cat]) groups[cat] = [];
		groups[cat].push({ combo, description: data.description });
	});

	let html = '';
	Object.keys(groups).forEach(category => {
		html += '<div class="shortcuts-category">' + category + '</div>';
		groups[category].forEach(item => {
			const keys = item.combo.split('+').map(k => {
				// Capitalize display name
				const display = k.charAt(0).toUpperCase() + k.slice(1);
				return '<kbd class="shortcuts-key">' + display + '</kbd>';
			}).join('<span style="opacity:0.3;margin:0 2px">+</span>');

			html += '<div class="shortcuts-row">' +
				'<span class="shortcuts-desc">' + item.description + '</span>' +
				'<span class="shortcuts-combo">' + keys + '</span>' +
				'</div>';
		});
	});

	body.innerHTML = html;

	dialog.showModal();
	window.shortcutManager.helpVisible = true;
}

function hideShortcutsHelp() {
	const dialog = document.getElementById('shortcuts-help');
	if (dialog && dialog.open) {
		dialog.close();
		window.shortcutManager.helpVisible = false;
	}
}

/* ─────────── Get Focused Window ─────────── */

function getFocusedWindowUid() {
	if (typeof winds === 'undefined') return null;
	const keys = Object.keys(winds);
	if (keys.length === 0) return null;

	let topUid = null;
	let topZ = -Infinity;
	keys.forEach(wid => {
		const el = document.getElementById('window' + wid);
		if (!el) return;
		const z = Number(el.style.zIndex) || 0;
		if (z > topZ) {
			topZ = z;
			topUid = wid;
		}
	});
	return topUid;
}

/* ─────────── Register Default Shortcuts ─────────── */

function registerDefaultShortcuts() {
	const sm = window.shortcutManager;

	// --- System ---
	sm.register('ctrl+space', 'Open Spotlight search', 'System', () => {
		if (typeof opensearchpanel === 'function') opensearchpanel();
	});

	sm.register('ctrl+alt+l', 'Lock screen', 'System', () => {
		if (typeof lockScreen === 'function') {
			lockScreen();
		}
	});

	sm.register('ctrl+alt+delete', 'System setup / restart', 'System', () => {
		if (typeof launchbios === 'function') launchbios();
	});

	// --- Window Management ---
	sm.register('alt+tab', 'Switch windows', 'Window Management', () => {
		WindowSwitcher.show();
	});

	sm.register('alt+shift+tab', 'Switch windows (reverse)', 'Window Management', () => {
		if (WindowSwitcher.isVisible()) {
			WindowSwitcher.cyclePrev();
		} else {
			WindowSwitcher.show();
		}
	});

	sm.register('ctrl+alt+left', 'Snap window left', 'Window Management', () => {
		const uid = getFocusedWindowUid();
		if (!uid) return;
		const winEl = document.getElementById('window' + uid);
		if (winEl && typeof snapWindow === 'function') snapWindow(winEl, 'left-half');
	});

	sm.register('ctrl+alt+right', 'Snap window right', 'Window Management', () => {
		const uid = getFocusedWindowUid();
		if (!uid) return;
		const winEl = document.getElementById('window' + uid);
		if (winEl && typeof snapWindow === 'function') snapWindow(winEl, 'right-half');
	});

	sm.register('ctrl+alt+up', 'Maximize window', 'Window Management', () => {
		const uid = getFocusedWindowUid();
		if (!uid) return;
		if (typeof maximizeWindow === 'function') maximizeWindow(uid);
	});

	sm.register('ctrl+alt+down', 'Restore / minimize window', 'Window Management', () => {
		const uid = getFocusedWindowUid();
		if (!uid) return;
		if (winds[uid] && winds[uid].visualState === 'fullscreen') {
			if (typeof resetWindow === 'function') resetWindow(uid);
		} else {
			if (typeof minim === 'function') minim(uid);
		}
	});

	sm.register('ctrl+w', 'Close window', 'Window Management', () => {
		const uid = getFocusedWindowUid();
		if (uid && typeof clwin === 'function') clwin(uid);
	});

	sm.register('ctrl+alt+m', 'Minimize window', 'Window Management', () => {
		const uid = getFocusedWindowUid();
		if (uid && typeof minim === 'function') minim(uid);
	});

	// --- Apps ---
	sm.register('ctrl+alt+t', 'Open Terminal', 'Apps', () => {
		if (typeof openapp === 'function') openapp('terminal', 1);
	});

	sm.register('ctrl+alt+e', 'Open File Manager', 'Apps', () => {
		if (typeof openapp === 'function') openapp('files', 1);
	});

	sm.register('ctrl+alt+s', 'Open Settings', 'Apps', () => {
		if (typeof openapp === 'function') openapp('settings', 1);
	});

	sm.register('ctrl+alt+b', 'Open Browser', 'Apps', () => {
		if (typeof openapp === 'function') openapp('browser', 1);
	});

	// --- Utility ---
	sm.register('ctrl+/', 'Show keyboard shortcuts', 'Utility', () => {
		const dialog = document.getElementById('shortcuts-help');
		if (dialog && dialog.open) {
			hideShortcutsHelp();
		} else {
			showShortcutsHelp();
		}
	});

	sm.register('ctrl+?', 'Show keyboard shortcuts', 'Utility', () => {
		const dialog = document.getElementById('shortcuts-help');
		if (dialog && dialog.open) {
			hideShortcutsHelp();
		} else {
			showShortcutsHelp();
		}
	});

	sm.register('ctrl+alt+r', 'Refresh desktop', 'Utility', () => {
		if (typeof genDesktop === 'function') genDesktop();
		if (typeof genTaskBar === 'function') genTaskBar();
	});

	// --- Existing shortcuts migrated from os-features.js ---
	sm.register('ctrl+m', 'Toggle Mission Control', 'System', () => {
		if (typeof toggleMissionControl === 'function') toggleMissionControl();
	});

	sm.register('ctrl+n', 'Toggle Notification Center', 'System', () => {
		if (typeof toggleNotificationCenter === 'function') toggleNotificationCenter();
	});

	sm.register('f3', 'Mission Control', 'System', () => {
		if (typeof toggleMissionControl === 'function') toggleMissionControl();
	});

	sm.register('escape', 'Close overlay / panel', 'System', () => {
		// Close shortcuts help if open
		const helpDialog = document.getElementById('shortcuts-help');
		if (helpDialog && helpDialog.open) {
			hideShortcutsHelp();
			return;
		}
		// Close Mission Control
		if (typeof toggleMissionControl === 'function') {
			const mc = document.getElementById('mission-control');
			if (mc && mc.classList.contains('active')) {
				toggleMissionControl();
				return;
			}
		}
		// Close Notification Center
		if (typeof toggleNotificationCenter === 'function') {
			const nc = document.getElementById('notification-center');
			if (nc && nc.classList.contains('open')) {
				toggleNotificationCenter();
				return;
			}
		}
	});
}

/* ─────────── Alt+Tab Additional Key Handling ─────────── */

// Handle Tab presses while Alt is held (for cycling through the switcher)
// This must be a separate listener since the ShortcutManager combo-matches won't re-fire Tab
document.addEventListener('keydown', (e) => {
	if (e.key === 'Tab' && e.altKey && WindowSwitcher.isVisible()) {
		e.preventDefault();
		e.stopPropagation();
		if (e.shiftKey) {
			WindowSwitcher.cyclePrev();
		} else {
			WindowSwitcher.cycleNext();
		}
	}
});

/* ─────────── Initialize Shortcut System ─────────── */

function initShortcutSystem() {
	window.shortcutManager = new ShortcutManager();
	document.addEventListener('keydown', (e) => window.shortcutManager.handleKeydown(e));
	registerDefaultShortcuts();
}

if (document.readyState === 'loading') {
	document.addEventListener('DOMContentLoaded', initShortcutSystem);
} else {
	initShortcutSystem();
}

/* ============================================================
   Runtime Lock Screen — password-protected with inactivity timer
   & Screensaver with floating clock
   ============================================================ */

(function () {
	'use strict';

	let _lockClockInterval = null;
	let _lockTimerId = null;
	let _screensaverTimerId = null;
	let _screensaverDriftInterval = null;
	let _lockTimeoutMs = 300000; // 5 min default
	let _screensaverActive = false;

	/* ─────── Helpers ─────── */

	function formatLockTime(now) {
		let h = now.getHours();
		let ampm = '';
		if (typeof timetypecondition !== 'undefined' && timetypecondition) {
			ampm = h >= 12 ? ' PM' : ' AM';
			h = h % 12 || 12;
		}
		return (h < 10 && !ampm ? '0' : '') + h + ':' + now.getMinutes().toString().padStart(2, '0') + ampm;
	}

	function formatLockDate(now) {
		return now.toLocaleDateString('en-US', {
			weekday: 'long',
			month: 'long',
			day: 'numeric'
		});
	}

	function updateLockClock() {
		const now = new Date();
		const timeEl = document.getElementById('lock-time');
		const dateEl = document.getElementById('lock-date');
		if (timeEl) timeEl.textContent = formatLockTime(now);
		if (dateEl) dateEl.textContent = formatLockDate(now);
	}

	/* ─────── Lock Screen ─────── */

	function lockScreen() {
		const lockDialog = document.getElementById('runtime-lockscreen');
		if (!lockDialog) return;
		if (lockDialog.open) return;

		// Don't lock if login modal is open (user hasn't logged in yet)
		const loginMod = document.getElementById('loginmod');
		if (loginMod && loginMod.open) return;

		// Dismiss screensaver if active
		dismissScreensaver();

		// Set wallpaper background
		const bgEl = document.getElementById('runtime-lock-bg');
		const bgImage1 = document.getElementById('bgimage1');
		if (bgEl) {
			bgEl.src = (bgImage1 && bgImage1.src) ? bgImage1.src :
				(typeof CTRLFeaturedImage !== 'undefined' ? CTRLFeaturedImage : '');
		}

		// Set username
		const usernameEl = document.getElementById('lock-username');
		if (usernameEl) {
			usernameEl.textContent = (typeof CurrentUsername !== 'undefined' && CurrentUsername) || 'User';
		}

		// Set avatar (first letter of username)
		const avatarEl = document.getElementById('lock-avatar');
		if (avatarEl) {
			const name = (typeof CurrentUsername !== 'undefined' && CurrentUsername) || 'U';
			const firstLetter = name.charAt(0).toUpperCase();
			avatarEl.innerHTML = '<span class="lock-avatar-letter">' + firstLetter + '</span>';
		}

		// Update clock immediately
		updateLockClock();

		// Start clock interval
		if (_lockClockInterval) clearInterval(_lockClockInterval);
		_lockClockInterval = setInterval(updateLockClock, 1000);

		// Clear password and error
		const pwdInput = document.getElementById('lock-password');
		const errorEl = document.getElementById('lock-error');
		if (pwdInput) pwdInput.value = '';
		if (errorEl) {
			errorEl.textContent = '';
			errorEl.classList.remove('visible');
		}

		// Remove any leftover shake
		const inputWrap = document.getElementById('lock-form');
		if (inputWrap) inputWrap.classList.remove('shake');

		lockDialog.showModal();

		// Focus password input after animation
		setTimeout(function () {
			if (pwdInput) pwdInput.focus();
		}, 300);

		// Cancel inactivity timers while locked
		clearTimeout(_lockTimerId);
		clearTimeout(_screensaverTimerId);
	}

	async function unlockScreen() {
		const pwdInput = document.getElementById('lock-password');
		const errorEl = document.getElementById('lock-error');
		const inputWrap = document.getElementById('lock-form');
		const lockDialog = document.getElementById('runtime-lockscreen');

		if (!pwdInput || !lockDialog) return;

		const enteredPwd = pwdInput.value;

		// Validate password
		let isCorrect = false;
		if (typeof checkPassword === 'function') {
			isCorrect = await checkPassword(enteredPwd);
		}

		if (isCorrect) {
			// Clear interval
			if (_lockClockInterval) {
				clearInterval(_lockClockInterval);
				_lockClockInterval = null;
			}

			// Clear input
			pwdInput.value = '';

			// Dismiss with animation
			lockDialog.classList.add('lockscreen-dismiss');
			setTimeout(function () {
				lockDialog.close();
				lockDialog.classList.remove('lockscreen-dismiss');
			}, 400);

			// Restart inactivity timer
			resetLockTimer();
		} else {
			// Show error
			if (errorEl) {
				errorEl.textContent = 'Incorrect password';
				errorEl.classList.add('visible');
			}

			// Shake animation
			if (inputWrap) {
				inputWrap.classList.remove('shake');
				void inputWrap.offsetWidth; // force reflow for re-trigger
				inputWrap.classList.add('shake');
				setTimeout(function () {
					inputWrap.classList.remove('shake');
				}, 500);
			}

			// Clear input and refocus
			pwdInput.value = '';
			pwdInput.focus();
		}
	}

	/* ─────── Password Visibility Toggle ─────── */

	function initToggleVisibility() {
		const toggleBtn = document.getElementById('lock-toggle-vis');
		const pwdInput = document.getElementById('lock-password');
		if (!toggleBtn || !pwdInput) return;

		toggleBtn.addEventListener('click', function (e) {
			e.preventDefault();
			e.stopPropagation();
			if (pwdInput.type === 'password') {
				pwdInput.type = 'text';
				toggleBtn.querySelector('.material-symbols-rounded').textContent = 'visibility_off';
			} else {
				pwdInput.type = 'password';
				toggleBtn.querySelector('.material-symbols-rounded').textContent = 'visibility';
			}
			pwdInput.focus();
		});
	}

	/* ─────── Form Submit ─────── */

	function initLockForm() {
		const form = document.getElementById('lock-form');
		if (!form) return;

		form.addEventListener('submit', function (e) {
			e.preventDefault();
			unlockScreen();
		});
	}

	/* ─────── Screensaver ─────── */

	function updateScreensaverClock() {
		const now = new Date();
		const timeEl = document.getElementById('screensaver-time');
		const dateEl = document.getElementById('screensaver-date');
		if (timeEl) timeEl.textContent = formatLockTime(now);
		if (dateEl) dateEl.textContent = formatLockDate(now);
	}

	function randomScreensaverPosition() {
		const clock = document.getElementById('screensaver-clock');
		if (!clock) return;
		// Keep away from edges by at least 10%
		const maxX = 70; // percent
		const maxY = 70;
		const x = 10 + Math.random() * maxX;
		const y = 10 + Math.random() * maxY;
		clock.style.left = x + '%';
		clock.style.top = y + '%';
	}

	function showScreensaver() {
		if (_screensaverActive) return;

		const loginMod = document.getElementById('loginmod');
		if (loginMod && loginMod.open) return;

		const lockDialog = document.getElementById('runtime-lockscreen');
		if (lockDialog && lockDialog.open) return;

		_screensaverActive = true;
		const el = document.getElementById('screensaver');
		if (!el) return;

		updateScreensaverClock();
		randomScreensaverPosition();
		el.style.display = 'block';

		// Drift clock position every 10 seconds
		_screensaverDriftInterval = setInterval(function () {
			updateScreensaverClock();
			randomScreensaverPosition();
		}, 10000);
	}

	function dismissScreensaver() {
		if (!_screensaverActive) return;
		_screensaverActive = false;

		const el = document.getElementById('screensaver');
		if (el) el.style.display = 'none';

		if (_screensaverDriftInterval) {
			clearInterval(_screensaverDriftInterval);
			_screensaverDriftInterval = null;
		}
	}

	function initScreensaverDismiss() {
		const el = document.getElementById('screensaver');
		if (!el) return;

		['mousemove', 'mousedown', 'keydown', 'touchstart'].forEach(function (evtType) {
			el.addEventListener(evtType, function () {
				dismissScreensaver();
				resetLockTimer();
			}, { passive: true });
		});
	}

	/* ─────── Inactivity Timer ─────── */

	function resetLockTimer() {
		clearTimeout(_lockTimerId);
		clearTimeout(_screensaverTimerId);

		if (_lockTimeoutMs <= 0) return; // disabled

		// Don't set timers if login modal is open or already locked
		const loginMod = document.getElementById('loginmod');
		if (loginMod && loginMod.open) return;
		const lockDialog = document.getElementById('runtime-lockscreen');
		if (lockDialog && lockDialog.open) return;

		// Screensaver activates at 50% of lock timeout
		const screensaverDelay = Math.floor(_lockTimeoutMs * 0.5);

		_screensaverTimerId = setTimeout(function () {
			showScreensaver();
		}, screensaverDelay);

		_lockTimerId = setTimeout(function () {
			dismissScreensaver();
			lockScreen();
		}, _lockTimeoutMs);
	}

	async function initLockTimer() {
		// Read setting
		try {
			if (typeof getSetting === 'function') {
				const saved = await getSetting('lockTimeout');
				if (saved !== null && saved !== undefined) {
					const parsed = parseInt(saved, 10);
					if (!isNaN(parsed) && parsed >= 0) {
						_lockTimeoutMs = parsed;
					}
				}
			}
		} catch (e) {
			// Use default
		}

		// Debounced reset on user activity
		let debounceTimer = null;
		function onActivity() {
			if (debounceTimer) return;
			debounceTimer = setTimeout(function () {
				debounceTimer = null;
			}, 500);
			resetLockTimer();
		}

		['mousemove', 'keydown', 'mousedown', 'touchstart', 'scroll'].forEach(function (evtType) {
			document.addEventListener(evtType, onActivity, { passive: true });
		});

		// Listen for setting changes
		if (typeof eventBusWorker !== 'undefined' && eventBusWorker.listen) {
			eventBusWorker.listen({
				type: 'settings',
				event: 'set',
				key: 'lockTimeout',
				callback: async function () {
					try {
						const val = await getSetting('lockTimeout');
						const parsed = parseInt(val, 10);
						if (!isNaN(parsed) && parsed >= 0) {
							_lockTimeoutMs = parsed;
							resetLockTimer();
						}
					} catch (e) { }
				}
			});
		}

		// Start the timer
		resetLockTimer();
	}

	/* ─────── Ctrl+Alt+L Keyboard Shortcut ─────── */

	document.addEventListener('keydown', function (e) {
		if (e.ctrlKey && e.altKey && e.key.toLowerCase() === 'l') {
			e.preventDefault();
			lockScreen();
		}
	});

	/* ─────── Expose lockScreen globally ─────── */

	window.lockScreen = lockScreen;
	window.unlockScreen = unlockScreen;
	window.initLockTimer = initLockTimer;
	window.resetLockTimer = resetLockTimer;

	/* ─────── Initialize ─────── */

	function initRuntimeLockScreen() {
		initLockForm();
		initToggleVisibility();
		initScreensaverDismiss();
	}

	if (document.readyState === 'loading') {
		document.addEventListener('DOMContentLoaded', initRuntimeLockScreen);
	} else {
		initRuntimeLockScreen();
	}
})();

/* ============================================================
   App Launcher / Start Menu
   ============================================================ */

var _startMenuAllApps = [];

function openAppLauncher() {
	var startmenu = gid('startmenu');
	if (!startmenu) return;

	if (startmenu.open) {
		closeAppLauncher();
		return;
	}

	var searchWin = gid('searchwindow');
	if (searchWin && searchWin.open) {
		searchWin.close();
	}

	var appdmod = gid('appdmod');
	if (appdmod && appdmod.open) {
		appdmod.close();
	}

	populateStartMenu().then(function () {
		startmenu.showModal();
		var searchInput = gid('sm-search');
		if (searchInput) {
			searchInput.value = '';
			searchInput.focus();
		}
	});
}

function closeAppLauncher() {
	var startmenu = gid('startmenu');
	if (startmenu && startmenu.open) {
		startmenu.close();
	}
}

async function populateStartMenu() {
	var pinnedGrid = gid('sm-pinned');
	var allAppsGrid = gid('sm-allappsgrid');
	var usernameEl = gid('sm-username');
	var avatarEl = gid('sm-avatar');
	var searchInput = gid('sm-search');
	var startmenu = gid('startmenu');
	if (!pinnedGrid || !allAppsGrid || !startmenu) return;

	pinnedGrid.innerHTML = '';
	allAppsGrid.innerHTML = '';

	var username = (typeof CurrentUsername !== 'undefined' && CurrentUsername) ? CurrentUsername : 'User';
	if (usernameEl) usernameEl.textContent = username;
	if (avatarEl) avatarEl.textContent = username.slice(0, 2);

	var apps = [];
	try {
		apps = await getFileNamesByFolder('Apps');
		apps.sort(function (a, b) { return a.name.localeCompare(b.name); });
		_startMenuAllApps = apps;
	} catch (e) {
		console.error('Start menu: Error loading apps:', e);
	}

	var pinnedKeys = [];
	try {
		var savedPinned = await getSetting('pinnedApps');
		if (Array.isArray(savedPinned) && savedPinned.length > 0) {
			pinnedKeys = savedPinned;
		} else if (typeof defAppsList !== 'undefined' && Array.isArray(defAppsList)) {
			pinnedKeys = defAppsList;
		}
	} catch (e) {
		if (typeof defAppsList !== 'undefined' && Array.isArray(defAppsList)) {
			pinnedKeys = defAppsList;
		}
	}

	var normalizedPinned = pinnedKeys.map(function (key) {
		return String(key || '').toLowerCase();
	});
	var pinnedApps = apps.filter(function (app) {
		var appName = (app.name || '').replace(/\.[^/.]+$/, '').toLowerCase();
		var appFile = (app.name || '').toLowerCase();
		var appId = String(app.id || '').toLowerCase();
		return normalizedPinned.indexOf(appId) !== -1 || normalizedPinned.indexOf(appName) !== -1 || normalizedPinned.indexOf(appFile) !== -1;
	});

	if (pinnedApps.length === 0 && apps.length > 0) {
		pinnedApps = apps.slice(0, 12);
	}

	for (var i = 0; i < pinnedApps.length; i++) {
		var pinnedEl = await createStartMenuAppElement(pinnedApps[i].id, pinnedApps[i].name);
		if (pinnedEl) pinnedGrid.appendChild(pinnedEl);
	}

	if (pinnedGrid.children.length === 0) {
		var emptyPinned = document.createElement('div');
		emptyPinned.className = 'sm-empty';
		emptyPinned.textContent = 'No pinned apps yet';
		pinnedGrid.appendChild(emptyPinned);
	}

	for (var a = 0; a < apps.length; a++) {
		var appEl = await createStartMenuAppElement(apps[a].id, apps[a].name);
		if (appEl) allAppsGrid.appendChild(appEl);
	}

	if (allAppsGrid.children.length === 0) {
		var emptyApps = document.createElement('div');
		emptyApps.className = 'sm-empty';
		emptyApps.textContent = 'No apps installed';
		allAppsGrid.appendChild(emptyApps);
	}

	if (searchInput && !searchInput.dataset.bound) {
		searchInput.addEventListener('input', function () {
			filterLauncherApps(searchInput.value);
		});
		searchInput.dataset.bound = '1';
	}

	if (!startmenu.dataset.boundClose) {
		startmenu.addEventListener('click', function (event) {
			if (event.target === startmenu) {
				closeAppLauncher();
			}
		});
		startmenu.dataset.boundClose = '1';
	}
}

async function createStartMenuAppElement(appId, appName) {
	if (!appId) return null;

	var btn = document.createElement('button');
	btn.className = 'sm-app';
	btn.type = 'button';
	btn.setAttribute('data-app-id', appId);
	btn.setAttribute('data-app-name', appName || '');

	var iconWrap = document.createElement('div');
	iconWrap.className = 'sm-app-icon';

	try {
		var icon = await getAppIcon(false, appId);
		if (icon) {
			iconWrap.innerHTML = icon;
		}
	} catch (e) {
		iconWrap.innerHTML = '<span class="material-symbols-rounded" style="font-size:20px;opacity:0.5">apps</span>';
	}

	var nameEl = document.createElement('span');
	nameEl.className = 'sm-app-name';
	var displayName = (appName || 'App').replace(/\.[^/.]+$/, '');
	nameEl.textContent = displayName;
	nameEl.title = displayName;

	btn.appendChild(iconWrap);
	btn.appendChild(nameEl);

	btn.addEventListener('click', function () {
		openfile(appId);
		closeAppLauncher();
	});

	return btn;
}

function filterLauncherApps(query) {
	var pinnedGrid = gid('sm-pinned');
	var allAppsGrid = gid('sm-allappsgrid');
	if (!pinnedGrid || !allAppsGrid) return;

	var normalized = (query || '').trim().toLowerCase();
	var pinnedChildren = pinnedGrid.querySelectorAll('.sm-app');
	var allChildren = allAppsGrid.querySelectorAll('.sm-app');
	var matchCount = 0;

	pinnedChildren.forEach(function (child) {
		var name = (child.getAttribute('data-app-name') || '').toLowerCase();
		child.style.display = (!normalized || name.indexOf(normalized) !== -1) ? '' : 'none';
	});

	allChildren.forEach(function (child) {
		var name = (child.getAttribute('data-app-name') || '').toLowerCase();
		if (!normalized || name.indexOf(normalized) !== -1) {
			child.style.display = '';
			matchCount++;
		} else {
			child.style.display = 'none';
		}
	});

	var existingNoResults = allAppsGrid.querySelector('.sm-empty.search-empty');
	if (normalized && matchCount === 0) {
		if (!existingNoResults) {
			var noRes = document.createElement('div');
			noRes.className = 'sm-empty search-empty';
			noRes.textContent = 'No apps found';
			allAppsGrid.appendChild(noRes);
		}
	} else if (existingNoResults) {
		existingNoResults.remove();
	}
}

document.addEventListener('keydown', function (e) {
	if (e.key === 'Escape') {
		var startmenu = gid('startmenu');
		if (startmenu && startmenu.open) {
			closeAppLauncher();
		}
	}
});

/* ============================================================
   Spotlight / Global Search
   ============================================================ */

var _spotlightDebounceTimer = null;
var _spotlightActiveIndex = -1;
var _spotlightStoreCache = null;

function openSpotlight() {
	var spotlight = gid('spotlight');
	if (spotlight && spotlight.open) {
		closeSpotlight();
		return;
	}

	// Close launcher if open
	var launcher = gid('startmenu');
	if (launcher && launcher.open) {
		closeAppLauncher();
	}

	// Close search window if open
	var searchWin = gid('searchwindow');
	if (searchWin && searchWin.open) {
		searchWin.close();
	}

	spotlight.showModal();

	// Clear previous state
	var input = gid('spotlight-input');
	var results = gid('spotlight-results');
	var empty = gid('spotlight-empty');
	input.value = '';
	results.innerHTML = '';
	empty.style.display = 'none';
	_spotlightActiveIndex = -1;

	input.focus();

	// Pre-populate with recent apps
	_spotlightShowRecent();
}

function closeSpotlight() {
	var spotlight = gid('spotlight');
	if (spotlight && spotlight.open) {
		spotlight.close();
	}
}

function _spotlightShowRecent() {
	var results = gid('spotlight-results');
	var empty = gid('spotlight-empty');
	results.innerHTML = '';
	empty.style.display = 'none';
	_spotlightActiveIndex = -1;

	if (typeof appsHistory === 'undefined' || !appsHistory || appsHistory.length === 0) {
		return;
	}

	var recent = appsHistory.slice(0, 4);
	var html = '<div class="spotlight-category">Recent</div>';
	recent.forEach(function (appName) {
		var safeName = _spotlightEscape(appName);
		html += '<div class="spotlight-item" onclick="openapp(\'' + safeName.replace(/'/g, "\\'") + '\', 1); closeSpotlight();" tabindex="-1">' +
			'<div class="spotlight-item-icon"><span class="material-symbols-rounded">history</span></div>' +
			'<div class="spotlight-item-info">' +
			'<div class="spotlight-item-name">' + safeName + '</div>' +
			'<div class="spotlight-item-desc">Recently opened</div>' +
			'</div></div>';
	});
	results.innerHTML = html;
}

function _spotlightEscape(str) {
	var div = document.createElement('div');
	div.textContent = str;
	return div.innerHTML;
}

function _spotlightGetFileIcon(fileName) {
	if (!fileName) return 'description';
	var ext = fileName.split('.').pop().toLowerCase();
	var iconMap = {
		'png': 'image', 'jpg': 'image', 'jpeg': 'image', 'gif': 'image', 'svg': 'image', 'webp': 'image',
		'mp3': 'music_note', 'wav': 'music_note', 'ogg': 'music_note',
		'mp4': 'movie', 'webm': 'movie', 'avi': 'movie',
		'txt': 'article', 'md': 'article', 'doc': 'article',
		'pdf': 'picture_as_pdf',
		'zip': 'folder_zip', 'tar': 'folder_zip', 'gz': 'folder_zip',
		'app': 'apps',
		'lnk': 'link',
		'osl': 'code'
	};
	return iconMap[ext] || 'description';
}

var _spotlightSettingsList = [
	{ name: 'Theme', desc: 'Change appearance theme' },
	{ name: 'Wallpaper', desc: 'Change desktop wallpaper' },
	{ name: 'Taskbar', desc: 'Taskbar position and behavior' },
	{ name: 'Notifications', desc: 'Notification preferences' },
	{ name: 'Sound', desc: 'Sound and volume settings' },
	{ name: 'Display', desc: 'Display and brightness' },
	{ name: 'Privacy', desc: 'Privacy and security settings' },
	{ name: 'Storage', desc: 'Storage management' },
	{ name: 'About', desc: 'About this system' }
];

function searchSpotlight(query) {
	clearTimeout(_spotlightDebounceTimer);
	_spotlightDebounceTimer = setTimeout(function () {
		_spotlightExecuteSearch(query);
	}, 150);
}

function _spotlightExecuteSearch(query) {
	var results = gid('spotlight-results');
	var empty = gid('spotlight-empty');

	if (!query || !query.trim()) {
		_spotlightShowRecent();
		return;
	}

	var q = query.trim().toLowerCase();
	var allResults = [];

	// Search Apps (installed)
	try {
		var apps = getFileNamesByFolder('Apps/');
		if (Array.isArray(apps)) {
			apps.forEach(function (app) {
				var name = app.name || '';
				var score = _spotlightScore(name, q);
				if (score > 0) {
					allResults.push({
						name: name,
						desc: 'App',
						icon: 'apps',
						category: 'Apps',
						score: score + 10, // Apps bonus
						action: 'openfile(\'' + _spotlightEscape(String(app.id || '')).replace(/'/g, "\\'") + '\'); closeSpotlight();'
					});
				}
			});
		}
	} catch (e) {}

	// Search Files (all folders)
	try {
		var folders = ['Desktop/', 'Documents/', 'Downloads/', 'Music/', 'Pictures/', 'Videos/'];
		// Also try dynamic folder list
		try {
			var dynamicFolders = getFolderNames();
			if (Array.isArray(dynamicFolders)) {
				dynamicFolders.forEach(function (f) {
					if (folders.indexOf(f) === -1) folders.push(f);
				});
			}
		} catch (e2) {}

		folders.forEach(function (folder) {
			try {
				var files = getFileNamesByFolder(folder);
				if (Array.isArray(files)) {
					files.forEach(function (file) {
						var name = file.name || '';
						// Skip .app files (already in Apps category)
						if (name.endsWith('.app')) return;
						var score = _spotlightScore(name, q);
						if (score > 0) {
							allResults.push({
								name: name,
								desc: folder.replace(/\/$/, ''),
								icon: _spotlightGetFileIcon(name),
								category: 'Files',
								score: score,
								action: 'openfile(\'' + _spotlightEscape(String(file.id || '')).replace(/'/g, "\\'") + '\'); closeSpotlight();'
							});
						}
					});
				}
			} catch (e3) {}
		});
	} catch (e) {}

	// Search Settings
	_spotlightSettingsList.forEach(function (setting) {
		var score = _spotlightScore(setting.name, q);
		if (score > 0) {
			allResults.push({
				name: setting.name,
				desc: setting.desc,
				icon: 'settings',
				category: 'Settings',
				score: score,
				action: 'openapp(\'Settings\', 1); closeSpotlight();'
			});
		}
	});

	// Search Store (cached)
	if (_spotlightStoreCache && Array.isArray(_spotlightStoreCache)) {
		_spotlightStoreCache.forEach(function (app) {
			var name = app.name || app.title || '';
			var score = _spotlightScore(name, q);
			if (score > 0) {
				allResults.push({
					name: name,
					desc: 'Store',
					icon: 'store',
					category: 'Store',
					score: score,
					action: 'openapp(\'Store\', 1); closeSpotlight();'
				});
			}
		});
	}

	// Sort: highest score first
	allResults.sort(function (a, b) { return b.score - a.score; });

	// Group by category, limit 8 per category
	var groups = {};
	var categoryOrder = ['Apps', 'Files', 'Settings', 'Store'];
	allResults.forEach(function (r) {
		if (!groups[r.category]) groups[r.category] = [];
		if (groups[r.category].length < 8) {
			groups[r.category].push(r);
		}
	});

	// Render
	var html = '';
	var totalCount = 0;
	categoryOrder.forEach(function (cat) {
		if (!groups[cat] || groups[cat].length === 0) return;
		html += '<div class="spotlight-category">' + _spotlightEscape(cat) + '</div>';
		groups[cat].forEach(function (r) {
			html += '<div class="spotlight-item" onclick="' + r.action + '" tabindex="-1">' +
				'<div class="spotlight-item-icon"><span class="material-symbols-rounded">' + _spotlightEscape(r.icon) + '</span></div>' +
				'<div class="spotlight-item-info">' +
				'<div class="spotlight-item-name">' + _spotlightEscape(r.name) + '</div>' +
				'<div class="spotlight-item-desc">' + _spotlightEscape(r.desc) + '</div>' +
				'</div></div>';
			totalCount++;
		});
	});

	results.innerHTML = html;
	_spotlightActiveIndex = -1;

	if (totalCount === 0) {
		empty.style.display = 'flex';
	} else {
		empty.style.display = 'none';
	}
}

function _spotlightScore(name, query) {
	var n = name.toLowerCase();
	// Exact match
	if (n === query) return 100;
	// Prefix match
	if (n.startsWith(query)) return 80;
	// Contains match
	if (n.indexOf(query) !== -1) return 60;
	// Fuzzy match using calculateSimilarity if available
	if (typeof calculateSimilarity === 'function') {
		var sim = calculateSimilarity(query, n);
		if (sim > 0.4) return Math.round(sim * 40);
	}
	return 0;
}

function _spotlightNavigate(direction) {
	var items = gid('spotlight-results').querySelectorAll('.spotlight-item');
	if (items.length === 0) return;

	// Remove current active
	if (_spotlightActiveIndex >= 0 && _spotlightActiveIndex < items.length) {
		items[_spotlightActiveIndex].classList.remove('active');
	}

	if (direction === 'down') {
		_spotlightActiveIndex = (_spotlightActiveIndex + 1) % items.length;
	} else {
		_spotlightActiveIndex = (_spotlightActiveIndex - 1 + items.length) % items.length;
	}

	items[_spotlightActiveIndex].classList.add('active');
	items[_spotlightActiveIndex].scrollIntoView({ block: 'nearest' });
}

function _spotlightExecuteActive() {
	var items = gid('spotlight-results').querySelectorAll('.spotlight-item');
	if (_spotlightActiveIndex >= 0 && _spotlightActiveIndex < items.length) {
		items[_spotlightActiveIndex].click();
	} else if (items.length > 0) {
		// If nothing selected, execute first result
		items[0].click();
	}
}

// Fetch store catalog for search (cached)
function _spotlightFetchStore() {
	try {
		fetch('CTRL-Store/db/v2.json')
			.then(function (r) { return r.json(); })
			.then(function (data) {
				if (Array.isArray(data)) {
					_spotlightStoreCache = data;
				} else if (data && typeof data === 'object') {
					// v2.json may have apps as a property
					_spotlightStoreCache = data.apps || data.list || Object.values(data);
				}
			})
			.catch(function () {});
	} catch (e) {}
}

// Initialize spotlight event listeners
(function initSpotlight() {
	function bindEvents() {
		var input = gid('spotlight-input');
		if (input) {
			input.addEventListener('input', function (e) {
				searchSpotlight(e.target.value);
			});

			input.addEventListener('keydown', function (e) {
				if (e.key === 'ArrowDown') {
					e.preventDefault();
					_spotlightNavigate('down');
				} else if (e.key === 'ArrowUp') {
					e.preventDefault();
					_spotlightNavigate('up');
				} else if (e.key === 'Enter') {
					e.preventDefault();
					_spotlightExecuteActive();
				} else if (e.key === 'Escape') {
					e.preventDefault();
					closeSpotlight();
				}
			});
		}

		// Global Ctrl+Space shortcut
		document.addEventListener('keydown', function (e) {
			if ((e.ctrlKey || e.metaKey) && e.key === ' ') {
				e.preventDefault();
				openSpotlight();
			}
		});

		// Pre-fetch store data
		_spotlightFetchStore();
	}

	if (document.readyState === 'loading') {
		document.addEventListener('DOMContentLoaded', bindEvents);
	} else {
		bindEvents();
	}
})();
