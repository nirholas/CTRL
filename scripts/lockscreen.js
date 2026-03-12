/* ============================================================
   CTRL — Lock Screen (two-phase: cover → login)
   Phase 1: Cover with clock, slide-up to dismiss
   Phase 2: Login with avatar + password
   Also: shutdown / restart overlays, idle lock, Win+L
   ============================================================ */

(function () {
	'use strict';

	/* ─── state ─── */
	var clockInterval = null;
	var isLocked = false;
	var failedTimestamps = [];
	var RATE_LIMIT_MAX = 3;
	var RATE_LIMIT_WINDOW_MS = 30000;
	var lockoutUntil = 0;

	/* ─── DOM refs (resolved once per lock) ─── */
	function $(id) { return document.getElementById(id); }

	/* ════════════════════════════════════════════════════════
	   LOCK  — show the overlay (cover + login behind it)
	   ════════════════════════════════════════════════════════ */

	window.lockScreen = function lockScreen() {
		var overlay = $('lockscreen-overlay');
		if (!overlay || isLocked) return;
		isLocked = true;

		// Close quick-settings / notification center
		var qs = $('quicksettings');
		if (qs) qs.style.display = 'none';
		if (typeof closeNotificationCenter === 'function') closeNotificationCenter();
		if (typeof closeQuickSettings === 'function') closeQuickSettings();

		// Dismiss screensaver
		if (typeof dismissScreensaver === 'function') dismissScreensaver();

		/* background */
		var bgEl = $('lockscreen-bg');
		var wallpaper = $('bgimage1');
		if (bgEl) {
			bgEl.src = (wallpaper && wallpaper.src) ? wallpaper.src
				: (typeof CTRLFeaturedImage !== 'undefined' ? CTRLFeaturedImage : '');
		}

		/* username */
		var username = (typeof CurrentUsername !== 'undefined' && CurrentUsername) || 'User';
		var usernameEl = $('lock-username');
		if (usernameEl) usernameEl.textContent = username;

		/* avatar */
		_setAvatar(username);

		/* reset cover → visible, login → hidden */
		var cover = $('lock-cover');
		var login = $('lock-login');
		if (cover) { cover.classList.remove('dismissed'); }
		if (login) { login.classList.remove('visible'); }

		/* reset password field */
		var passInput = $('lock-password');
		if (passInput) { passInput.value = ''; passInput.type = 'password'; }
		var errorEl = $('lock-error');
		if (errorEl) { errorEl.textContent = ''; errorEl.classList.remove('visible'); }
		var toggleBtn = $('lock-toggle-vis');
		if (toggleBtn) {
			var icon = toggleBtn.querySelector('.material-symbols-rounded');
			if (icon) icon.textContent = 'visibility';
		}

		/* clock */
		_updateClock();
		if (clockInterval) clearInterval(clockInterval);
		clockInterval = setInterval(_updateClock, 1000);

		/* show overlay */
		overlay.classList.remove('hidden', 'lockscreen-dismiss');
		overlay.style.display = '';

		/* lock sound */
		if (typeof agentSounds !== 'undefined' && typeof agentSounds.lock === 'function') agentSounds.lock();

		/* attach cover dismiss listeners */
		_attachCoverListeners();
	};

	/* ════════════════════════════════════════════════════════
	   LOCK — initial boot gate (no sound, auto-check password)
	   Called once from DOMContentLoaded to decide if we show
	   the lock screen or skip straight to desktop.
	   ════════════════════════════════════════════════════════ */

	window.lockScreenBoot = async function lockScreenBoot() {
		// If user has default password ('CTRL'), skip lock screen entirely
		var hasDefaultPassword = false;
		try {
			if (typeof checkPassword === 'function') {
				hasDefaultPassword = await checkPassword('CTRL');
			}
		} catch (e) { /* ignore */ }

		if (hasDefaultPassword) {
			// No real password — hide lockscreen and go to desktop
			var overlay = $('lockscreen-overlay');
			if (overlay) { overlay.classList.add('hidden'); overlay.style.display = 'none'; }
			return false; // caller should proceed to startup()
		}

		// User has a real password — show the lock screen
		isLocked = true;
		var overlay = $('lockscreen-overlay');
		if (!overlay) return false;

		/* background */
		var bgEl = $('lockscreen-bg');
		if (bgEl && typeof CTRLFeaturedImage !== 'undefined') bgEl.src = CTRLFeaturedImage;

		/* username */
		var username = 'User';
		try {
			if (typeof sharedStore !== 'undefined') {
				var users = await sharedStore.getAllUsers();
				if (users && users.length > 0) {
					username = users[0];
					if (typeof CurrentUsername !== 'undefined') CurrentUsername = username;
				}
			}
		} catch (e) { /* ignore */ }

		var usernameEl = $('lock-username');
		if (usernameEl) usernameEl.textContent = username;
		_setAvatar(username);

		/* cover visible, login hidden */
		var cover = $('lock-cover');
		var login = $('lock-login');
		if (cover) cover.classList.remove('dismissed');
		if (login) login.classList.remove('visible');

		/* reset password */
		var passInput = $('lock-password');
		if (passInput) { passInput.value = ''; passInput.type = 'password'; }
		var errorEl = $('lock-error');
		if (errorEl) { errorEl.textContent = ''; errorEl.classList.remove('visible'); }

		/* clock */
		_updateClock();
		if (clockInterval) clearInterval(clockInterval);
		clockInterval = setInterval(_updateClock, 1000);

		/* show */
		overlay.classList.remove('hidden', 'lockscreen-dismiss');
		overlay.style.display = '';

		_attachCoverListeners();
		return true; // caller should NOT call startup() yet
	};

	/* ════════════════════════════════════════════════════════
	   COVER DISMISS  — slide cover up, reveal login
	   ════════════════════════════════════════════════════════ */

	function _attachCoverListeners() {
		var cover = $('lock-cover');
		var overlay = $('lockscreen-overlay');
		if (!cover || !overlay) return;

		function dismissCover(e) {
			// Ignore modifier-only keypresses
			if (e && e.type === 'keydown') {
				if (['Tab', 'Shift', 'Control', 'Alt', 'Meta', 'CapsLock'].indexOf(e.key) !== -1) return;
			}
			cover.classList.add('dismissed');
			var login = $('lock-login');
			if (login) login.classList.add('visible');

			// Focus password input after transition
			setTimeout(function () {
				var passInput = $('lock-password');
				if (passInput) passInput.focus();
			}, 380);

			// Remove these listeners
			overlay.removeEventListener('click', dismissCover);
			overlay.removeEventListener('keydown', dismissCover);
			overlay.removeEventListener('touchstart', dismissCover);
		}

		overlay.addEventListener('click', dismissCover);
		overlay.addEventListener('keydown', dismissCover);
		overlay.addEventListener('touchstart', dismissCover, { passive: true });
	}

	/* ════════════════════════════════════════════════════════
	   UNLOCK  — validate password and dismiss overlay
	   ════════════════════════════════════════════════════════ */

	window.unlockScreen = async function unlockScreen() {
		var passInput = $('lock-password');
		if (!passInput) return;

		var enteredPassword = passInput.value;
		if (!enteredPassword) {
			_showError('Please enter your password');
			_shakeInput();
			return;
		}

		/* rate limiting */
		var now = Date.now();
		if (lockoutUntil > now) {
			var sec = Math.ceil((lockoutUntil - now) / 1000);
			_showError('Too many attempts. Try again in ' + sec + 's');
			passInput.value = '';
			return;
		}

		/* validate */
		var valid = false;
		try {
			if (typeof checkPassword === 'function') {
				valid = await checkPassword(enteredPassword);
			}
		} catch (e) { valid = false; }

		if (valid) {
			isLocked = false;
			if (typeof agentSounds !== 'undefined' && typeof agentSounds.unlock === 'function') agentSounds.unlock();

			if (clockInterval) { clearInterval(clockInterval); clockInterval = null; }
			passInput.value = '';
			passInput.type = 'password';

			var errorEl = $('lock-error');
			if (errorEl) { errorEl.textContent = ''; errorEl.classList.remove('visible'); }
			failedTimestamps = [];
			lockoutUntil = 0;

			/* animate out */
			var overlay = $('lockscreen-overlay');
			if (overlay) {
				overlay.classList.add('lockscreen-dismiss');
				setTimeout(function () {
					overlay.classList.add('hidden');
					overlay.style.display = 'none';
					overlay.classList.remove('lockscreen-dismiss');
				}, 360);
			}

			/* make desktop visible if not already */
			_revealDesktop();

			/* If first boot, trigger startup() */
			if (typeof startup === 'function' && !window._CTRLDesktopBooted) {
				window._CTRLDesktopBooted = true;
				password = enteredPassword;
				startup();
			}

			/* reset inactivity timer */
			if (typeof InactivityLock !== 'undefined' && InactivityLock.resetTimer) InactivityLock.resetTimer();
		} else {
			/* failed */
			var ct = Date.now();
			failedTimestamps.push(ct);
			failedTimestamps = failedTimestamps.filter(function (ts) { return ct - ts < RATE_LIMIT_WINDOW_MS; });

			if (failedTimestamps.length >= RATE_LIMIT_MAX) {
				lockoutUntil = ct + RATE_LIMIT_WINDOW_MS;
				_showError('Too many attempts. Try again in 30 seconds');
				failedTimestamps = [];
			} else {
				_showError('Incorrect password');
			}

			_shakeInput();
			passInput.value = '';
			passInput.focus();

			if (typeof agentSounds !== 'undefined' && typeof agentSounds.error === 'function') agentSounds.error();
		}
	};

	function _revealDesktop() {
		['workspace', 'desktop'].forEach(function (id) {
			var el = $(id);
			if (el) el.classList.add('desktop-ready');
		});
		document.querySelectorAll('.layer44').forEach(function (el) {
			el.classList.add('desktop-ready');
		});
	}

	/* ════════════════════════════════════════════════════════
	   HELPERS
	   ════════════════════════════════════════════════════════ */

	function _setAvatar(username) {
		var avatarEl = $('lock-avatar');
		if (!avatarEl) return;

		// Try loading user icon from IndexedDB
		if (typeof sharedStore !== 'undefined' && username) {
			sharedStore.get(username, 'icon').then(function (icon) {
				if (icon && typeof isValidURL === 'function' && isValidURL(/** @type {string} */ (icon))) {
					var img = document.createElement('img');
					img.src = /** @type {string} */ (icon);
					img.alt = 'avatar';
					img.style.width = '100%';
					img.style.height = '100%';
					img.style.objectFit = 'cover';
					avatarEl.textContent = '';
					avatarEl.appendChild(img);
				} else {
					_setAvatarLetter(avatarEl, username);
				}
			}).catch(function () {
				_setAvatarLetter(avatarEl, username);
			});
		} else {
			_setAvatarLetter(avatarEl, username);
		}
	}

	function _setAvatarLetter(avatarEl, username) {
		var letter = (username || 'U').charAt(0).toUpperCase();
		var span = document.createElement('span');
		span.className = 'lock-avatar-letter';
		span.textContent = letter;
		avatarEl.textContent = '';
		avatarEl.appendChild(span);
	}

	function _showError(message) {
		var errorEl = $('lock-error');
		if (!errorEl) return;
		errorEl.textContent = message;
		errorEl.classList.remove('visible');
		void errorEl.offsetWidth; // reflow
		errorEl.classList.add('visible');
	}

	function _shakeInput() {
		var wrap = document.querySelector('#lock-form');
		if (!wrap) return;
		wrap.classList.remove('shake');
		void wrap.offsetWidth;
		wrap.classList.add('shake');
		setTimeout(function () { wrap.classList.remove('shake'); }, 500);
	}

	/* ─── Clock ─── */

	function _updateClock() {
		var timeEl = $('lock-cover-time');
		var dateEl = $('lock-cover-date');

		var now = new Date();
		var hours = now.getHours();
		var ampm = '';

		// Respect 12h/24h preference
		if (typeof timetypecondition !== 'undefined' && timetypecondition) {
			ampm = hours >= 12 ? ' PM' : ' AM';
			hours = hours % 12 || 12;
		}

		var mins = now.getMinutes().toString().padStart(2, '0');
		var timeStr = hours + ':' + mins + ampm;

		if (timeEl && timeEl.textContent !== timeStr) {
			timeEl.textContent = timeStr;
		}

		if (dateEl) {
			var dateStr = now.toLocaleDateString('en-US', {
				weekday: 'long',
				month: 'long',
				day: 'numeric'
			});
			if (dateEl.textContent !== dateStr) dateEl.textContent = dateStr;
		}
	}

	/* ════════════════════════════════════════════════════════
	   SHUTDOWN / RESTART / SLEEP
	   ════════════════════════════════════════════════════════ */

	window.CTRLShutdown = function CTRLShutdown() {
		var overlay = $('power-overlay');
		if (!overlay) return;
		var msg = $('power-message');
		var hint = $('power-hint');
		var spinner = $('power-spinner');

		if (msg) msg.textContent = 'Shutting down...';
		if (spinner) spinner.style.display = 'block';
		if (hint) hint.style.display = 'none';

		overlay.style.display = 'flex';

		if (typeof agentSounds !== 'undefined' && typeof agentSounds.shutdown === 'function') agentSounds.shutdown();

		// After 2s show "Press F5 to restart"
		setTimeout(function () {
			if (spinner) spinner.style.display = 'none';
			if (hint) { hint.textContent = 'Press F5 to restart'; hint.style.display = ''; }
			if (msg) msg.textContent = '';
		}, 2000);
	};

	window.CTRLRestart = function CTRLRestart() {
		var overlay = $('power-overlay');
		if (!overlay) return;
		var msg = $('power-message');
		var spinner = $('power-spinner');

		if (msg) msg.textContent = 'Restarting...';
		if (spinner) spinner.style.display = 'block';

		overlay.style.display = 'flex';

		if (typeof agentSounds !== 'undefined' && typeof agentSounds.shutdown === 'function') agentSounds.shutdown();

		setTimeout(function () {
			location.reload();
		}, 2000);
	};

	window.CTRLSleep = function CTRLSleep() {
		// Sleep = lock screen + dim
		lockScreen();
	};

	/* ════════════════════════════════════════════════════════
	   EVENT LISTENERS (password form, visibility toggle, etc.)
	   ════════════════════════════════════════════════════════ */

	function _initPasswordListeners() {
		var form = $('lock-form');
		if (form) {
			form.addEventListener('submit', function (e) {
				e.preventDefault();
				unlockScreen();
			});
		}

		/* toggle password visibility */
		var toggleBtn = $('lock-toggle-vis');
		if (toggleBtn) {
			toggleBtn.addEventListener('click', function (e) {
				e.preventDefault();
				e.stopPropagation();
				var passInput = $('lock-password');
				var icon = toggleBtn.querySelector('.material-symbols-rounded');
				if (!passInput || !icon) return;

				if (passInput.type === 'password') {
					passInput.type = 'text';
					icon.textContent = 'visibility_off';
				} else {
					passInput.type = 'password';
					icon.textContent = 'visibility';
				}
				passInput.focus();
			});
		}
	}

	/* ─── Keyboard shortcut: Win+L / Ctrl+L to lock ─── */

	function _initLockShortcut() {
		document.addEventListener('keydown', function (e) {
			if ((e.metaKey || e.ctrlKey) && e.key === 'l') {
				if (isLocked) return;
				e.preventDefault();
				lockScreen();
			}
		});
	}

	/* ─── Block shortcuts while locked ─── */

	function _initShortcutSuppression() {
		document.addEventListener('keydown', function (e) {
			if (!isLocked) return;
			var overlay = $('lockscreen-overlay');
			if (!overlay || overlay.classList.contains('hidden')) return;

			var isPasswordField = e.target && e.target.id === 'lock-password';
			if (isPasswordField) {
				// Allow normal typing, block OS shortcuts (except clipboard)
				if (e.ctrlKey || e.metaKey || e.altKey) {
					if (['a', 'c', 'v', 'x'].indexOf(e.key) === -1) {
						e.preventDefault();
						e.stopPropagation();
					}
				}
				return;
			}

			// Except Enter (for submit) and Tab (for navigation), block all
			if (e.key !== 'Tab' && e.key !== 'Enter') {
				e.preventDefault();
				e.stopPropagation();
			}
		}, true);

		// Block clicks outside overlay while locked
		document.addEventListener('click', function (e) {
			if (!isLocked) return;
			var overlay = $('lockscreen-overlay');
			if (!overlay || overlay.classList.contains('hidden')) return;

			if (!overlay.contains(e.target)) {
				e.preventDefault();
				e.stopPropagation();
			}
		}, true);
	}

	/* ─── Expose isLocked ─── */

	window.isScreenLocked = function () { return isLocked; };

	/* ════════════════════════════════════════════════════════
	   INIT
	   ════════════════════════════════════════════════════════ */

	function init() {
		_initPasswordListeners();
		_initLockShortcut();
		_initShortcutSuppression();
	}

	if (document.readyState === 'loading') {
		document.addEventListener('DOMContentLoaded', init);
	} else {
		init();
	}
})();
