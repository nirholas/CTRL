/* ============================================================
   CTRL — OS Features v2
   Mission Control, Notification Center, Keyboard Shortcuts,
   Window Focus Management, Desktop Interactions,
   Performance Utilities, and Accessibility
   ============================================================ */

(function () {
	'use strict';

	/* ─────────── Iframe Pool ─────────── */

	var IframePool = (function () {
		var _pool = [];
		var MAX_POOL = 3;

		function acquire() {
			/** @type {HTMLIFrameElement} */
			var iframe;
			if (_pool.length > 0) {
				iframe = /** @type {HTMLIFrameElement} */ (_pool.pop());
				iframe.style.display = '';
				return iframe;
			}
			iframe = document.createElement('iframe');
			iframe.style.width = '100%';
			iframe.style.height = '100%';
			iframe.style.border = 'none';
			return iframe;
		}

		function release(iframe) {
			try { iframe.src = 'about:blank'; } catch (e) {}
			iframe.style.display = 'none';
			if (_pool.length < MAX_POOL) {
				_pool.push(iframe);
			} else {
				iframe.remove();
			}
		}

		return { acquire: acquire, release: release };
	})();
	window.IframePool = IframePool;

	/* ─────────── Virtual Scrolling List ─────────── */

	/** @type {*} */
	var VirtualList = function VirtualList(container, items, renderItem, itemHeight) {
		itemHeight = itemHeight || 48;
		this.container = container;
		this.items = items;
		this.renderItem = renderItem;
		this.itemHeight = itemHeight;

		this.container.style.overflow = 'auto';
		this.container.style.position = 'relative';

		this.spacer = document.createElement('div');
		this.spacer.style.height = (items.length * itemHeight) + 'px';
		this.spacer.style.pointerEvents = 'none';
		container.appendChild(this.spacer);

		this.viewport = document.createElement('div');
		this.viewport.style.position = 'absolute';
		this.viewport.style.left = '0';
		this.viewport.style.right = '0';
		container.appendChild(this.viewport);

		/** @type {*} */
		var self = this;
		this.container.addEventListener('scroll', function () { self.render(); }, { passive: true });
		self.render();
	};
	window.VirtualList = VirtualList;

	VirtualList.prototype.render = function () {
		var scrollTop = this.container.scrollTop;
		var viewportHeight = this.container.clientHeight;
		var startIndex = Math.max(0, Math.floor(scrollTop / this.itemHeight) - 5);
		var endIndex = Math.min(this.items.length, Math.ceil((scrollTop + viewportHeight) / this.itemHeight) + 5);

		this.viewport.style.top = (startIndex * this.itemHeight) + 'px';

		var fragment = document.createDocumentFragment();
		for (var i = startIndex; i < endIndex; i++) {
			var el = this.renderItem(this.items[i], i);
			el.style.height = this.itemHeight + 'px';
			fragment.appendChild(el);
		}

		this.viewport.innerHTML = '';
		this.viewport.appendChild(fragment);
	};

	VirtualList.prototype.updateItems = function (newItems) {
		this.items = newItems;
		this.spacer.style.height = (newItems.length * this.itemHeight) + 'px';
		this.render();
	};

	/* ─────────── Performance Monitor (Dev Mode) ─────────── */

	var PerfMonitor = (function () {
		var _enabled = false;
		var _overlay = null;
		var _frameCount = 0;
		var _fps = 0;
		var _lastTime = performance.now();

		function toggle() {
			_enabled = !_enabled;
			if (_enabled) {
				_overlay = document.createElement('div');
				_overlay.id = 'perf-overlay';
				_overlay.style.cssText = 'position:fixed;top:4px;right:4px;background:rgba(0,0,0,0.8);color:#0f0;font-family:monospace;font-size:11px;padding:4px 8px;border-radius:4px;z-index:999999;pointer-events:none;';
				document.body.appendChild(_overlay);
				tick();
			} else if (_overlay) {
				_overlay.remove();
				_overlay = null;
			}
		}

		function tick() {
			if (!_enabled) return;
			_frameCount++;
			var now = performance.now();
			if (now - _lastTime >= 1000) {
				_fps = _frameCount;
				_frameCount = 0;
				_lastTime = now;

				var mem = (/** @type {*} */ (performance).memory) ? ' | Heap: ' + Math.round(/** @type {*} */ (performance).memory.usedJSHeapSize / 1048576) + 'MB' : '';
				var winCount = (typeof winds !== 'undefined') ? Object.keys(winds).length : 0;
				_overlay.textContent = _fps + ' FPS | ' + winCount + ' windows' + mem;
			}
			requestAnimationFrame(tick);
		}

		return { toggle: toggle };
	})();
	window.PerfMonitor = PerfMonitor;

	/* ─────────── Throttled Window Resize Handler ─────────── */

	if (typeof throttle === 'function') {
		window.addEventListener('resize', throttle(function () {
			if (typeof genDesktop === 'function') genDesktop();
			if (typeof genTaskBar === 'function') genTaskBar();
			if (typeof updateNavSize === 'function') updateNavSize();
		}, 200));
	}

	/* ─────────── Mission Control ─────────── */

	let missionControlActive = false;

	window.toggleMissionControl = function () {
		const mc = document.getElementById('mission-control');
		if (!mc) return;

		if (missionControlActive) {
			closeMissionControl();
		} else {
			openMissionControl();
		}
	};

	function openMissionControl() {
		const mc = document.getElementById('mission-control');
		if (!mc) return;

		missionControlActive = true;
		mc.classList.add('active');
		renderMissionControlWindows();

		// Close on background click
		mc.addEventListener('click', mcBackgroundClick);
		// Close on Escape
		document.addEventListener('keydown', mcEscHandler);
	}

	function closeMissionControl() {
		const mc = document.getElementById('mission-control');
		if (!mc) return;

		missionControlActive = false;
		mc.classList.remove('active');
		mc.removeEventListener('click', mcBackgroundClick);
		document.removeEventListener('keydown', mcEscHandler);
	}

	function mcBackgroundClick(e) {
		if (e.target === document.getElementById('mission-control') ||
		    e.target.classList.contains('mc-windows-grid')) {
			closeMissionControl();
		}
	}

	function mcEscHandler(e) {
		if (e.key === 'Escape' && missionControlActive) {
			closeMissionControl();
		}
	}

	function renderMissionControlWindows() {
		const grid = document.getElementById('mc-windows-grid');
		if (!grid) return;

		grid.innerHTML = '';

		const windowKeys = Object.keys(typeof winds !== 'undefined' ? winds : {});

		if (windowKeys.length === 0) {
			grid.innerHTML = '<div class="mc-no-windows">' +
				'<span class="material-symbols-rounded">desktop_windows</span>' +
				'No open windows</div>';
			return;
		}

		windowKeys.forEach(function (winuid) {
			const winData = winds[winuid];
			const winEl = document.getElementById('window' + winuid);
			if (!winEl) return;

			const preview = document.createElement('div');
			preview.className = 'mc-window-preview';
			preview.setAttribute('data-winuid', winuid);

			// Thumbnail area
			const thumb = document.createElement('div');
			thumb.className = 'mc-thumb';

			// Try to capture a visual preview
			const iframe = winEl.querySelector('iframe');
			if (iframe) {
				const thumbIcon = document.createElement('span');
				thumbIcon.className = 'material-symbols-rounded';
				thumbIcon.style.fontSize = '2.5rem';
				thumbIcon.style.opacity = '0.2';
				thumbIcon.textContent = 'web';
				thumb.appendChild(thumbIcon);
			} else {
				const thumbIcon = document.createElement('span');
				thumbIcon.className = 'material-symbols-rounded';
				thumbIcon.style.fontSize = '2.5rem';
				thumbIcon.style.opacity = '0.2';
				thumbIcon.textContent = 'window';
				thumb.appendChild(thumbIcon);
			}

			// Title bar
			const title = document.createElement('div');
			title.className = 'mc-title';
			title.textContent = winData.title || 'Window';

			// Close button
			const closeBtn = document.createElement('button');
			closeBtn.className = 'mc-close-btn';
			closeBtn.innerHTML = '×';
			closeBtn.addEventListener('click', function (e) {
				e.stopPropagation();
				if (typeof clwin === 'function') clwin(winuid);
				if (typeof loadtaskspanel === 'function') loadtaskspanel();
				// Re-render
				setTimeout(renderMissionControlWindows, 100);
			});

			preview.appendChild(thumb);
			preview.appendChild(title);
			preview.appendChild(closeBtn);

			// Click to focus that window
			preview.addEventListener('click', function () {
				closeMissionControl();
				if (typeof putwinontop === 'function') putwinontop('window' + winuid);
				const w = document.getElementById('window' + winuid);
				if (w) {
					w.style.display = 'flex';
					w.style.opacity = '1';
				}
			});

			grid.appendChild(preview);
		});
	}

	/* ─────────── Notification Center ─────────── */

	var notificationCenter = new (function NotificationCenter() {
		this.notifications = [];
		this.unreadCount = 0;
		this.isOpen = false;
		this.dndEnabled = false;
		this.maxNotifications = 100;
		this._timeUpdateInterval = null;
		this._idCounter = 0;

		/** @type {*} */
		var ncSelf = this;

		// --- Relative time formatting ---
		this.relativeTime = function (timestamp) {
			var now = Date.now();
			var diff = now - timestamp;
			if (diff < 60000) return 'Just now';
			if (diff < 3600000) {
				var mins = Math.floor(diff / 60000);
				return mins + (mins === 1 ? ' minute ago' : ' minutes ago');
			}
			if (diff < 86400000) {
				var hrs = Math.floor(diff / 3600000);
				return hrs + (hrs === 1 ? ' hour ago' : ' hours ago');
			}
			var d = new Date(timestamp);
			if (diff < 172800000) {
				return 'Yesterday, ' + d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
			}
			return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) + ', ' +
				d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
		};

		// --- Generate unique notification ID ---
		this._genId = function () {
			ncSelf._idCounter++;
			return 'notif_' + Date.now() + '_' + ncSelf._idCounter;
		};

		// --- Add a notification ---
		this.add = function (opts) {
			var notif = {
				id: ncSelf._genId(),
				title: opts.title || 'Notification',
				body: opts.body || '',
				icon: opts.icon || 'info',
				appId: opts.appId || 'system',
				appName: opts.appName || 'System',
				timestamp: opts.timestamp || Date.now(),
				read: false,
				actions: opts.actions || [],
				persistent: opts.persistent || false,
				priority: opts.priority || 'normal'
			};

			ncSelf.notifications.unshift(notif);
			if (ncSelf.notifications.length > ncSelf.maxNotifications) {
				ncSelf.notifications.pop();
			}

			ncSelf.unreadCount++;
			ncSelf._updateBadge();

			if (ncSelf.isOpen) {
				ncSelf.render();
				// Mark as read after 1.5s if panel is open
				setTimeout(function () {
					if (ncSelf.isOpen && !notif.read) {
						ncSelf.markRead(notif.id);
					}
				}, 1500);
			}

			// Pulse animation on badge
			var badge = document.getElementById('nc-badge');
			if (badge) {
				badge.classList.remove('nc-badge-pulse');
				void badge.offsetWidth;
				badge.classList.add('nc-badge-pulse');
			}

			return notif;
		};

		// --- Remove a single notification ---
		this.remove = function (id) {
			for (var i = 0; i < ncSelf.notifications.length; i++) {
				if (ncSelf.notifications[i].id === id) {
					if (!ncSelf.notifications[i].read) {
						ncSelf.unreadCount = Math.max(0, ncSelf.unreadCount - 1);
					}
					ncSelf.notifications.splice(i, 1);
					break;
				}
			}
			ncSelf._updateBadge();
			ncSelf.render();
		};

		// --- Clear all notifications ---
		this.clearAll = function () {
			ncSelf.notifications = [];
			ncSelf.unreadCount = 0;
			ncSelf._updateBadge();
			ncSelf.render();
			// Also clear the legacy notifLog
			if (typeof notifLog !== 'undefined') {
				if (Array.isArray(notifLog)) {
					notifLog.length = 0;
				} else {
					Object.keys(notifLog).forEach(function (k) { delete notifLog[k]; });
				}
			}
		};

		// --- Clear all from one app ---
		this.clearByApp = function (appId) {
			var remaining = [];
			for (var i = 0; i < ncSelf.notifications.length; i++) {
				if (ncSelf.notifications[i].appId === appId) {
					if (!ncSelf.notifications[i].read) {
						ncSelf.unreadCount = Math.max(0, ncSelf.unreadCount - 1);
					}
				} else {
					remaining.push(ncSelf.notifications[i]);
				}
			}
			ncSelf.notifications = remaining;
			ncSelf._updateBadge();
			ncSelf.render();
		};

		// --- Mark as read ---
		this.markRead = function (id) {
			for (var i = 0; i < ncSelf.notifications.length; i++) {
				if (ncSelf.notifications[i].id === id && !ncSelf.notifications[i].read) {
					ncSelf.notifications[i].read = true;
					ncSelf.unreadCount = Math.max(0, ncSelf.unreadCount - 1);
					break;
				}
			}
			ncSelf._updateBadge();
		};

		// --- Mark all read ---
		this.markAllRead = function () {
			for (var i = 0; i < ncSelf.notifications.length; i++) {
				ncSelf.notifications[i].read = true;
			}
			ncSelf.unreadCount = 0;
			ncSelf._updateBadge();
		};

		// --- Open the panel ---
		this.open = function () {
			var nc = document.getElementById('notification-center');
			if (!nc) return;

			// Close quick settings if open
			var qs = document.getElementById('quicksettings');
			if (qs && qs.style.display === 'block') {
				qs.style.display = 'none';
			}

			ncSelf.isOpen = true;
			nc.style.display = 'block';
			void nc.offsetWidth;
			nc.classList.add('open');
			ncSelf.render();

			// Mark visible notifications as read after 1.5s
			setTimeout(function () {
				if (ncSelf.isOpen) {
					ncSelf.markAllRead();
					ncSelf.render();
				}
			}, 1500);

			ncSelf._startTimeUpdates();

			setTimeout(function () {
				document.addEventListener('click', ncSelf._outsideClickHandler);
				document.addEventListener('keydown', ncSelf._escHandler);
			}, 0);
		};

		// --- Close the panel ---
		this.close = function () {
			var nc = document.getElementById('notification-center');
			if (!nc) return;
			ncSelf.isOpen = false;
			nc.classList.remove('open');
			setTimeout(function () {
				if (!ncSelf.isOpen) nc.style.display = 'none';
			}, 250);
			document.removeEventListener('click', ncSelf._outsideClickHandler);
			document.removeEventListener('keydown', ncSelf._escHandler);
			ncSelf._stopTimeUpdates();
		};

		// --- Toggle ---
		this.toggle = function () {
			if (ncSelf.isOpen) {
				ncSelf.close();
			} else {
				ncSelf.open();
			}
		};

		// --- DND ---
		this.toggleDND = function () {
			ncSelf.dndEnabled = !ncSelf.dndEnabled;
			// Sync global dndEnabled
			if (typeof dndEnabled !== 'undefined') {
				window.dndEnabled = ncSelf.dndEnabled;
			}
			var bellIcon = document.getElementById('nc-bell-icon');
			var dndIcon = document.getElementById('nc-dnd-icon');
			var dndToggle = document.getElementById('nc-dnd-toggle');
			if (bellIcon) {
				bellIcon.textContent = ncSelf.dndEnabled ? 'notifications_paused' : 'notifications';
			}
			if (dndIcon) {
				dndIcon.textContent = ncSelf.dndEnabled ? 'notifications_paused' : 'notifications';
			}
			if (dndToggle) {
				dndToggle.classList.toggle('active', ncSelf.dndEnabled);
			}
			// Persist
			if (typeof setSetting === 'function') {
				setSetting('dndEnabled', ncSelf.dndEnabled);
			}
			// Update quick settings DND button if present
			var qsDnd = document.getElementById('qs-dnd');
			if (qsDnd) {
				if (ncSelf.dndEnabled) {
					qsDnd.classList.add('active');
				} else {
					qsDnd.classList.remove('active');
				}
			}
		};

		// --- Load DND setting ---
		this.loadDNDSetting = function () {
			if (typeof getSetting === 'function') {
				getSetting('dndEnabled').then(function (val) {
					if (val === true || val === 'true') {
						ncSelf.dndEnabled = true;
						var bellIcon = document.getElementById('nc-bell-icon');
						var dndIcon = document.getElementById('nc-dnd-icon');
						if (bellIcon) bellIcon.textContent = 'notifications_paused';
						if (dndIcon) dndIcon.textContent = 'notifications_paused';
					}
				}).catch(function () {});
			}
		};

		// --- Update the badge count ---
		this._updateBadge = function () {
			var badge = document.getElementById('nc-badge');
			if (!badge) return;
			if (ncSelf.unreadCount > 0) {
				badge.style.display = 'flex';
				badge.textContent = ncSelf.unreadCount > 99 ? '99+' : String(ncSelf.unreadCount);
			} else {
				badge.style.display = 'none';
			}
		};

		// --- Outside click handler ---
		this._outsideClickHandler = function (e) {
			var nc = document.getElementById('notification-center');
			var trigger = document.getElementById('nc-trigger');
			if (nc && !nc.contains(e.target) && trigger && !trigger.contains(e.target)) {
				ncSelf.close();
			}
		};

		// --- Escape handler ---
		this._escHandler = function (e) {
			if (e.key === 'Escape') {
				ncSelf.close();
			}
		};

		// --- Start/stop relative time auto-updates ---
		this._startTimeUpdates = function () {
			ncSelf._stopTimeUpdates();
			ncSelf._timeUpdateInterval = setInterval(function () {
				var timeEls = document.querySelectorAll('.nc-item-time[data-ts]');
				timeEls.forEach(function (el) {
					el.textContent = ncSelf.relativeTime(parseInt(el.getAttribute('data-ts'), 10));
				});
			}, 30000);
		};

		this._stopTimeUpdates = function () {
			if (ncSelf._timeUpdateInterval) {
				clearInterval(ncSelf._timeUpdateInterval);
				ncSelf._timeUpdateInterval = null;
			}
		};

		// --- Render the notification list ---
		this.render = function () {
			var list = document.getElementById('nc-list');
			var emptyEl = document.getElementById('nc-empty');
			if (!list || !emptyEl) return;

			var mergedNotifs = ncSelf.notifications.slice();

			if (mergedNotifs.length === 0) {
				list.innerHTML = '';
				list.style.display = 'none';
				emptyEl.style.display = 'flex';
				return;
			}

			list.style.display = 'block';
			emptyEl.style.display = 'none';

			// Group by appId
			var groups = {};
			var groupOrder = [];
			for (var i = 0; i < mergedNotifs.length; i++) {
				var n = mergedNotifs[i];
				var key = n.appId || 'system';
				if (!groups[key]) {
					groups[key] = { appName: n.appName || 'System', appId: key, icon: n.icon, items: [], latestTs: 0 };
					groupOrder.push(key);
				}
				groups[key].items.push(n);
				if (n.timestamp > groups[key].latestTs) {
					groups[key].latestTs = n.timestamp;
				}
			}

			// Sort groups by most recent
			groupOrder.sort(function (a, b) {
				return groups[b].latestTs - groups[a].latestTs;
			});

			list.innerHTML = '';

			for (var g = 0; g < groupOrder.length; g++) {
				var group = groups[groupOrder[g]];

				var groupEl = document.createElement('div');
				groupEl.className = 'nc-group';

				// Group header
				var header = document.createElement('div');
				header.className = 'nc-group-header';
				header.innerHTML = '<span class="nc-app-icon material-symbols-rounded">' +
					ncSelf._escapeHtml(group.icon || 'apps') + '</span>' +
					'<span class="nc-app-name">' + ncSelf._escapeHtml(group.appName) + '</span>';

				var clearBtn = document.createElement('button');
				clearBtn.className = 'nc-group-clear';
				clearBtn.title = 'Clear';
				clearBtn.textContent = '\u2715';
				clearBtn.setAttribute('data-appid', group.appId);
				clearBtn.addEventListener('click', (function (appId) {
					return function (e) {
						e.stopPropagation();
						ncSelf.clearByApp(appId);
					};
				})(group.appId));
				header.appendChild(clearBtn);
				groupEl.appendChild(header);

				// Sort items within group: newest first
				group.items.sort(function (a, b) { return b.timestamp - a.timestamp; });

				for (var j = 0; j < group.items.length; j++) {
					var notif = group.items[j];
					var item = document.createElement('div');
					item.className = 'nc-item' + (notif.read ? '' : ' unread');
					item.setAttribute('data-id', notif.id);

					var content = document.createElement('div');
					content.className = 'nc-item-content';

					var titleEl = document.createElement('div');
					titleEl.className = 'nc-item-title';
					titleEl.textContent = notif.title;
					content.appendChild(titleEl);

					if (notif.body) {
						var bodyEl = document.createElement('div');
						bodyEl.className = 'nc-item-body';
						bodyEl.textContent = notif.body;
						content.appendChild(bodyEl);
					}

					var timeEl = document.createElement('div');
					timeEl.className = 'nc-item-time';
					timeEl.setAttribute('data-ts', notif.timestamp);
					timeEl.textContent = ncSelf.relativeTime(notif.timestamp);
					content.appendChild(timeEl);

					item.appendChild(content);

					// Action buttons
					if (notif.actions && notif.actions.length > 0) {
						var actionsEl = document.createElement('div');
						actionsEl.className = 'nc-item-actions';
						for (var a = 0; a < notif.actions.length; a++) {
							var act = notif.actions[a];
							var actBtn = document.createElement('button');
							actBtn.className = 'nc-action-btn';
							actBtn.textContent = act.label;
							if (act.action && typeof act.action === 'function') {
								actBtn.addEventListener('click', (function (actionFn, notifId) {
									return function (e) {
										e.stopPropagation();
										actionFn();
										ncSelf.remove(notifId);
									};
								})(act.action, notif.id));
							} else {
								actBtn.addEventListener('click', (function (notifId) {
									return function (e) {
										e.stopPropagation();
										ncSelf.remove(notifId);
									};
								})(notif.id));
							}
							actionsEl.appendChild(actBtn);
						}
						item.appendChild(actionsEl);
					}

					// Close/dismiss button
					var closeBtn = document.createElement('button');
					closeBtn.className = 'nc-item-close';
					closeBtn.title = 'Dismiss';
					closeBtn.textContent = '\u2715';
					closeBtn.addEventListener('click', (function (notifId) {
						return function (e) {
							e.stopPropagation();
							ncSelf.remove(notifId);
						};
					})(notif.id));
					item.appendChild(closeBtn);

					// Swipe to dismiss support
					ncSelf._addSwipeToDismiss(item, notif.id);

					groupEl.appendChild(item);
				}

				list.appendChild(groupEl);
			}
		};

		// --- Swipe-to-dismiss gesture ---
		this._addSwipeToDismiss = function (el, notifId) {
			var startX = 0, currentX = 0, isDragging = false;

			el.addEventListener('touchstart', function (e) {
				startX = e.touches[0].clientX;
				currentX = startX;
				isDragging = true;
				el.style.transition = 'none';
			}, { passive: true });

			el.addEventListener('touchmove', function (e) {
				if (!isDragging) return;
				currentX = e.touches[0].clientX;
				var diff = currentX - startX;
				if (diff < 0) {
					el.style.transform = 'translateX(' + diff + 'px)';
					el.style.opacity = Math.max(0, 1 + diff / 200);
				}
			}, { passive: true });

			el.addEventListener('touchend', function () {
				isDragging = false;
				var diff = currentX - startX;
				if (diff < -80) {
					el.style.transition = 'transform 0.2s, opacity 0.2s';
					el.style.transform = 'translateX(-100%)';
					el.style.opacity = '0';
					setTimeout(function () { ncSelf.remove(notifId); }, 200);
				} else {
					el.style.transition = 'transform 0.2s, opacity 0.2s';
					el.style.transform = '';
					el.style.opacity = '';
				}
			});
		};

		// --- HTML escape utility ---
		this._escapeHtml = function (str) {
			var d = document.createElement('div');
			d.appendChild(document.createTextNode(str));
			return d.innerHTML;
		};
	})();

	// Expose globally
	window.notificationCenter = notificationCenter;

	// Legacy compatibility
	window.toggleNotificationCenter = function () {
		notificationCenter.toggle();
	};

	window.closeNotificationCenter = function () {
		notificationCenter.close();
	};

	window.clearAllNotifications = function () {
		notificationCenter.clearAll();
	};

	window.pushNCNotification = function (appName, title, body) {
		notificationCenter.add({
			appName: appName,
			title: title,
			body: body,
			appId: (appName || 'system').toLowerCase().replace(/\s+/g, '-')
		});
	};

	/* ─────────── Keyboard Shortcuts ─────────── */

	document.addEventListener('keydown', function (e) {
		var tag = (/** @type {HTMLElement} */ (e.target).tagName || '').toLowerCase();
		if (tag === 'input' || tag === 'textarea' || tag === 'select') return;

		// Ctrl+Shift+Escape = Task Manager
		if (e.ctrlKey && e.shiftKey && e.key === 'Escape') {
			e.preventDefault();
			if (typeof openapp === 'function') openapp('taskmanager', 1);
			return;
		}

		// Super/Meta + N = Notification Center
		if ((e.metaKey || e.ctrlKey) && e.key === 'n') {
			e.preventDefault();
			notificationCenter.toggle();
			return;
		}

		// Escape closes Mission Control & Notification Center
		if (e.key === 'Escape') {
			if (notificationCenter.isOpen) notificationCenter.close();
			if (missionControlActive) closeMissionControl();
		}

		// F3 = Mission Control
		if (e.key === 'F3') {
			e.preventDefault();
			toggleMissionControl();
			return;
		}
	});

	/* ─────────── Window Focus Class Management ─────────── */

	var originalPutWinOnTop = window.putwinontop;
	if (typeof originalPutWinOnTop === 'function') {
		window.putwinontop = function (windowId) {
			document.querySelectorAll('.window.windowontop').forEach(function (w) {
				w.classList.remove('windowontop');
			});
			originalPutWinOnTop.call(window, windowId);
			var el = document.getElementById(windowId);
			if (el) el.classList.add('windowontop');

			// Update taskbar active indicators (win12-style)
			updateTaskbarIndicators(windowId);
		};
	}

	/* ─────────── Taskbar Active Indicators (Win12-style) ─────────── */

	function updateTaskbarIndicators(focusedWindowId) {
		// Clear all active states
		var navItems = document.querySelectorAll('[navobj]');
		navItems.forEach(function (item) {
			item.removeAttribute('data-active');
		});

		// Mark all open windows' taskbar icons as running
		var openWindows = document.querySelectorAll('.window');
		openWindows.forEach(function (win) {
			var winId = win.id;
			// Find corresponding taskbar item by matching app shortcut click handler
			var navItem = findNavItemForWindow(winId);
			if (navItem) {
				navItem.setAttribute('data-running', 'true');
			}
		});

		// Mark focused window's taskbar icon as active
		if (focusedWindowId) {
			var activeNav = findNavItemForWindow(focusedWindowId);
			if (activeNav) {
				activeNav.setAttribute('data-active', 'true');
			}
		}
	}

	function findNavItemForWindow(windowId) {
		// Windows are named 'window' + uid, try to find matching navobj
		var navItems = document.querySelectorAll('[navobj]');
		for (var i = 0; i < navItems.length; i++) {
			var item = navItems[i];
			// Check if this nav item's unid attribute matches something related
			var unid = item.getAttribute('unid') || '';
			if (unid && windowId && windowId.indexOf(unid) !== -1) {
				return item;
			}
		}
		return null;
	}

	/* ─────────── Desktop Widget Auto-fade ─────────── */

	function updateWidgetVisibility() {
		var widget = document.getElementById('desktop-widget');
		if (!widget) return;
		var hasWindows = typeof winds !== 'undefined' && Object.keys(winds).length > 0;
		widget.style.opacity = hasWindows ? '0.3' : '1';
	}

	var mutObserver = new MutationObserver(updateWidgetVisibility);
	var maxAppsEl = document.getElementById('maxappscontainer');
	if (maxAppsEl) {
		mutObserver.observe(maxAppsEl, { childList: true, subtree: false });
	}
	setInterval(updateWidgetVisibility, 3000);

	/* ─────────── Hot Corner: Mission Control ─────────── */

	var hotCornerTimer = null;

	document.addEventListener('mousemove', function (e) {
		if (e.clientX < 5 && e.clientY < 5) {
			if (!hotCornerTimer && !missionControlActive) {
				hotCornerTimer = setTimeout(function () {
					toggleMissionControl();
					hotCornerTimer = null;
				}, 300);
			}
		} else {
			if (hotCornerTimer) {
				clearTimeout(hotCornerTimer);
				hotCornerTimer = null;
			}
		}
	});

	/* ─────────── Show Desktop ─────────── */

	var desktopShown = false;
	var savedWindowStates = {};

	window.toggleShowDesktop = function () {
		var btn = gid('showDesktopBtn');
		if (!btn) return;

		if (desktopShown) {
			// Restore all windows to their previous states
			Object.keys(savedWindowStates).forEach(function (wid) {
				var state = savedWindowStates[wid];
				var winEl = gid('window' + wid);
				if (winEl && winds[wid]) {
					if (state !== 'minimized') {
						winEl.style.display = 'flex';
						winds[wid].visualState = state;
					}
				}
			});
			savedWindowStates = {};
			desktopShown = false;
			btn.classList.remove('active');
		} else {
			// Save current states and minimize all
			savedWindowStates = {};
			Object.keys(winds).forEach(function (wid) {
				savedWindowStates[wid] = winds[wid].visualState;
				var winEl = gid('window' + wid);
				if (winEl && winds[wid].visualState !== 'minimized') {
					winEl.style.display = 'none';
					winds[wid].visualState = 'minimized';
				}
			});
			desktopShown = true;
			btn.classList.add('active');
		}
		if (typeof loadtaskspanel === 'function') loadtaskspanel();
	};

	window.resetShowDesktop = function () {
		if (desktopShown) {
			desktopShown = false;
			savedWindowStates = {};
			var btn = gid('showDesktopBtn');
			if (btn) btn.classList.remove('active');
		}
	};

	// Aero Peek — hover dims all windows
	function initAeroPeek() {
		var btn = gid('showDesktopBtn');
		if (!btn) return;

		btn.addEventListener('mouseenter', function () {
			if (desktopShown) return;
			Object.keys(typeof winds !== 'undefined' ? winds : {}).forEach(function (wid) {
				var winEl = gid('window' + wid);
				if (winEl && winds[wid].visualState !== 'minimized') {
					winEl.style.opacity = '0.15';
					winEl.style.transition = 'opacity 0.3s';
				}
			});
		});

		btn.addEventListener('mouseleave', function () {
			if (desktopShown) return;
			Object.keys(typeof winds !== 'undefined' ? winds : {}).forEach(function (wid) {
				var winEl = gid('window' + wid);
				if (winEl) {
					winEl.style.opacity = '1';
				}
			});
		});

		// Enable Enter/Space keyboard activation
		btn.addEventListener('keydown', function (e) {
			if (e.key === 'Enter' || e.key === ' ') {
				e.preventDefault();
				toggleShowDesktop();
			}
		});
	}

	// Ctrl+D keyboard shortcut for Show Desktop
	document.addEventListener('keydown', function (e) {
		if (e.ctrlKey && e.key === 'd' && !e.shiftKey && !e.altKey) {
			// Don't intercept if inside an input/textarea
			var tag = (document.activeElement || {}).tagName;
			if (tag === 'INPUT' || tag === 'TEXTAREA') return;
			e.preventDefault();
			toggleShowDesktop();
		}
	});

	/* ─────────── Taskbar Window Count Badges ─────────── */

	window.addWindowBadges = function () {
		// Count windows per appid
		var windowCounts = {};
		Object.values(typeof winds !== 'undefined' ? winds : {}).forEach(function (w) {
			if (w.appid) {
				windowCounts[w.appid] = (windowCounts[w.appid] || 0) + 1;
			}
		});

		// Apply badges to running apps in taskbar
		document.querySelectorAll('#nowrunninapps .app-shortcut.adock').forEach(function (icon) {
			var appid = icon.getAttribute('appid');
			var existing = icon.querySelector('.taskbar-badge');
			if (existing) existing.remove();

			var count = windowCounts[appid] || 0;
			if (count > 0) {
				/** @type {HTMLElement} */ (icon).style.position = 'relative';
				icon.classList.add('has-badge');

				var badge = document.createElement('span');
				badge.className = 'taskbar-badge';
				badge.dataset.count = String(count);
				badge.textContent = String(count);
				icon.appendChild(badge);
			} else {
				icon.classList.remove('has-badge');
			}
		});

		// Also badge dock pinned apps
		document.querySelectorAll('#dock .app-shortcut.adock').forEach(function (icon) {
			var appid = icon.getAttribute('unid') || icon.getAttribute('appid');
			var existing = icon.querySelector('.taskbar-badge');
			if (existing) existing.remove();

			var count = windowCounts[appid] || 0;
			if (count > 0) {
				/** @type {HTMLElement} */ (icon).style.position = 'relative';
				icon.classList.add('has-badge');

				var badge = document.createElement('span');
				badge.className = 'taskbar-badge';
				badge.dataset.count = String(count);
				badge.textContent = String(count);
				icon.appendChild(badge);
			} else {
				icon.classList.remove('has-badge');
			}
		});
	};

	/* ─────────── Init ─────────── */

	function initOSFeatures() {
		// Load DND setting from storage
		notificationCenter.loadDNDSetting();
		// Initialize accessibility
		initAccessibility();
		// Initialize Aero Peek on show desktop button
		initAeroPeek();
		// Initialize touch gestures
		if (typeof GestureManager !== 'undefined') {
			GestureManager.init();
			if ('ontouchstart' in window) document.documentElement.classList.add('touch-device');
		}
		// Ctrl+W toggles widget board
		document.addEventListener('keydown', function (e) {
			if (e.ctrlKey && !e.shiftKey && !e.altKey && e.key === 'w') {
				e.preventDefault();
				if (typeof WidgetEngine !== 'undefined') WidgetEngine.toggleBoard();
			}
		});
	}

	/* ─────────── Accessibility ─────────── */

	/** Screen reader live region — announces messages to assistive tech */
	window.announceToSR = function (message) {
		var region = gid('sr-announcements');
		if (!region) {
			region = document.createElement('div');
			region.id = 'sr-announcements';
			region.setAttribute('role', 'status');
			region.setAttribute('aria-live', 'polite');
			region.setAttribute('aria-atomic', 'true');
			region.className = 'sr-only';
			document.body.appendChild(region);
		}
		region.textContent = '';
		requestAnimationFrame(function () { region.textContent = message; });
	};

	/** Focus trap for modal dialogs — Tab/Shift+Tab cycles within the dialog */
	window.trapFocus = function (dialog) {
		var focusableSelector = 'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])';
		var focusable = dialog.querySelectorAll(focusableSelector);
		if (!focusable.length) return;
		var first = /** @type {HTMLElement} */ (focusable[0]);
		var last = /** @type {HTMLElement} */ (focusable[focusable.length - 1]);

		dialog.addEventListener('keydown', function (e) {
			if (e.key !== 'Tab') return;
			if (e.shiftKey) {
				if (document.activeElement === first) {
					e.preventDefault();
					last.focus();
				}
			} else {
				if (document.activeElement === last) {
					e.preventDefault();
					first.focus();
				}
			}
		});

		first.focus();
	};

	/** Enable arrow-key navigation on menus with [role="menuitem"] children */
	window.enableMenuKeyboardNav = function (menuEl) {
		/** @returns {HTMLElement[]} */
		var getItems = function () {
			return /** @type {HTMLElement[]} */ (Array.from(menuEl.querySelectorAll('[role="menuitem"]:not([disabled])')));
		};
		var currentIndex = 0;

		menuEl.setAttribute('role', 'menu');

		menuEl.addEventListener('keydown', function (e) {
			var allItems = getItems();
			if (!allItems.length) return;

			switch (e.key) {
				case 'ArrowDown':
					e.preventDefault();
					currentIndex = (currentIndex + 1) % allItems.length;
					allItems[currentIndex].focus();
					break;
				case 'ArrowUp':
					e.preventDefault();
					currentIndex = (currentIndex - 1 + allItems.length) % allItems.length;
					allItems[currentIndex].focus();
					break;
				case 'Enter':
				case ' ':
					e.preventDefault();
					allItems[currentIndex].click();
					break;
				case 'Escape':
					e.preventDefault();
					menuEl.style.display = 'none';
					break;
				case 'Home':
					e.preventDefault();
					currentIndex = 0;
					allItems[0].focus();
					break;
				case 'End':
					e.preventDefault();
					currentIndex = allItems.length - 1;
					allItems[currentIndex].focus();
					break;
			}
		});
	};

	/** Make dock items navigable with arrow keys using roving tabindex */
	function setupDockAccessibility() {
		var dock = gid('dock');
		if (!dock) return;

		function refreshDockItems() {
			var items = dock.querySelectorAll('[tabindex], button, a, biv, .app-shortcut');
			items.forEach(function (item, i) {
				if (!item.getAttribute('role')) item.setAttribute('role', 'button');
				item.setAttribute('tabindex', i === 0 ? '0' : '-1');

				item.addEventListener('keydown', function (e) {
					var next;
					if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
						e.preventDefault();
						next = items[i + 1] || items[0];
					} else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
						e.preventDefault();
						next = items[i - 1] || items[items.length - 1];
					} else if (e.key === 'Enter' || e.key === ' ') {
						e.preventDefault();
						item.click();
						return;
					}
					if (next) {
						item.setAttribute('tabindex', '-1');
						next.setAttribute('tabindex', '0');
						next.focus();
					}
				});
			});
		}

		// Refresh on dock mutation (apps added/removed)
		var dockObserver = new MutationObserver(refreshDockItems);
		dockObserver.observe(dock, { childList: true, subtree: true });
		refreshDockItems();
	}

	/** Add ARIA labels to dynamic systray elements that update over time */
	function setupDynamicAriaLabels() {
		// Battery percentage
		var battPct = gid('systray-battery-pct');
		var battBtn = gid('systray-battery-btn');
		if (battPct && battBtn) {
			var battObs = new MutationObserver(function () {
				battBtn.setAttribute('aria-label', 'Battery: ' + (battPct.textContent || 'unknown'));
			});
			battObs.observe(battPct, { childList: true, characterData: true, subtree: true });
		}

		// Time display
		var timeEl = gid('time-display');
		var clockBtn = document.querySelector('.systray-clock-btn');
		if (timeEl && clockBtn) {
			var timeObs = new MutationObserver(function () {
				clockBtn.setAttribute('aria-label', 'Current time: ' + (timeEl.textContent || '--:--') + '. Open quick settings');
			});
			timeObs.observe(timeEl, { childList: true, characterData: true, subtree: true });
		}
	}

	/** Intercept context menu creation and add keyboard nav */
	function observeContextMenus() {
		var body = document.body;
		var ctxObs = new MutationObserver(function (mutations) {
			mutations.forEach(function (m) {
				m.addedNodes.forEach(function (node) {
					var el = /** @type {HTMLElement} */ (node);
					if (el.nodeType === 1 && (el.classList.contains('context-menu') || el.classList.contains('ctx-menu'))) {
						var items = /** @type {NodeListOf<HTMLElement>} */ (el.querySelectorAll('button, [onclick], a, .ctx-item'));
						items.forEach(function (item) {
							if (!item.getAttribute('role')) item.setAttribute('role', 'menuitem');
							item.setAttribute('tabindex', '-1');
						});
						if (items.length) {
							items[0].setAttribute('tabindex', '0');
							items[0].focus();
						}
						enableMenuKeyboardNav(el);
					}
				});
			});
		});
		ctxObs.observe(body, { childList: true, subtree: false });
	}

	/** Add keyboard activation (Enter/Space) to elements with onclick but no semantic role */
	function patchClickableElements() {
		var taskbarNavs = document.querySelectorAll('#ctrlnav [onclick], #ctrlnav biv');
		taskbarNavs.forEach(function (el) {
			if (el.tagName === 'BUTTON' || el.tagName === 'A' || el.tagName === 'INPUT') return;
			if (!el.getAttribute('tabindex')) el.setAttribute('tabindex', '0');
			el.addEventListener('keydown', function (e) {
				if (/** @type {KeyboardEvent} */ (e).key === 'Enter' || /** @type {KeyboardEvent} */ (e).key === ' ') {
					e.preventDefault();
					/** @type {HTMLElement} */ (el).click();
				}
			});
		});
	}

	/** Main accessibility initialization */
	function initAccessibility() {
		// Create screen reader announcement region
		announceToSR('');

		// Set up dock keyboard navigation
		setupDockAccessibility();

		// Dynamic ARIA labels for systray
		setupDynamicAriaLabels();

		// Context menu keyboard nav
		observeContextMenus();

		// Patch non-semantic clickable elements
		patchClickableElements();

		// Add focus trap to existing modal dialogs
		document.querySelectorAll('dialog').forEach(function (dialog) {
			dialog.addEventListener('open', function () {
				trapFocus(dialog);
			});
			// Also trap on showModal
			var origShowModal = dialog.showModal;
			if (origShowModal) {
				dialog.showModal = function () {
					origShowModal.call(dialog);
					trapFocus(dialog);
				};
			}
		});
	}

	if (document.readyState === 'loading') {
		document.addEventListener('DOMContentLoaded', initOSFeatures);
	} else {
		initOSFeatures();
	}

})();
