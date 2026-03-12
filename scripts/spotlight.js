// ═══════════════════════════════════════════════════════════════
// CTRL Spotlight — Universal Search
// Triggered via Ctrl+Space. Searches apps, files, file contents,
// settings, recent apps, quick actions, and inline calculator.
// Uses real CTRL APIs: memory["root"], getFileNamesByFolder,
// getFileById, ctntMgr, openfile, openapp, useHandler, etc.
// ═══════════════════════════════════════════════════════════════

(function () {
  'use strict';

  // ── Helpers ──────────────────────────────────────────────────
  function _esc(str) {
    if (!str) return '';
    var d = document.createElement('div');
    d.appendChild(document.createTextNode(str));
    return d.innerHTML;
  }

  // ── Safe Math Evaluator (no eval) ───────────────────────────
  // Tokeniser → recursive-descent parser supporting:
  //  +  -  *  /  %  ^  ()  sqrt  sin  cos  log  pi  e
  function spotlightSafeMath(expr) {
    var tokens = [];
    var src = expr.replace(/\s+/g, '');
    var i = 0;
    while (i < src.length) {
      var ch = src[i];
      // number (int or float)
      if (/\d/.test(ch) || (ch === '.' && i + 1 < src.length && /\d/.test(src[i + 1]))) {
        var num = '';
        while (i < src.length && (/\d/.test(src[i]) || src[i] === '.')) { num += src[i]; i++; }
        tokens.push({ type: 'num', value: parseFloat(num) });
        continue;
      }
      // identifiers: sqrt, sin, cos, log, pi, e
      if (/[a-zA-Z]/.test(ch)) {
        var id = '';
        while (i < src.length && /[a-zA-Z]/.test(src[i])) { id += src[i]; i++; }
        var lower = id.toLowerCase();
        if (lower === 'pi') { tokens.push({ type: 'num', value: Math.PI }); continue; }
        if (lower === 'e' && (i >= src.length || src[i] !== '(')) { tokens.push({ type: 'num', value: Math.E }); continue; }
        if (['sqrt', 'sin', 'cos', 'log'].indexOf(lower) !== -1) { tokens.push({ type: 'fn', value: lower }); continue; }
        return undefined; // unknown identifier
      }
      if ('+-*/%^()'.indexOf(ch) !== -1) { tokens.push({ type: 'op', value: ch }); i++; continue; }
      return undefined; // illegal character
    }

    var pos = 0;
    function peek() { return pos < tokens.length ? tokens[pos] : null; }
    function consume(expected) {
      var t = tokens[pos];
      if (!t) throw new Error('Unexpected end');
      if (expected && t.value !== expected) throw new Error('Expected ' + expected);
      pos++;
      return t;
    }
    // expr → term (('+' | '-') term)*
    function parseExpr() {
      var left = parseTerm();
      while (peek() && (peek().value === '+' || peek().value === '-')) {
        var op = consume().value;
        var right = parseTerm();
        left = op === '+' ? left + right : left - right;
      }
      return left;
    }
    // term → factor (('*' | '/' | '%') factor)*
    function parseTerm() {
      var left = parsePower();
      while (peek() && (peek().value === '*' || peek().value === '/' || peek().value === '%')) {
        var op = consume().value;
        var right = parsePower();
        if (op === '*') left *= right;
        else if (op === '/') { if (right === 0) throw new Error('Div/0'); left /= right; }
        else left %= right;
      }
      return left;
    }
    // power → unary ('^' unary)*  (right-assoc)
    function parsePower() {
      var base = parseUnary();
      if (peek() && peek().value === '^') {
        consume();
        var exp = parsePower(); // right-assoc recursion
        return Math.pow(base, exp);
      }
      return base;
    }
    // unary → ('-' | '+') unary | atom
    function parseUnary() {
      if (peek() && peek().value === '-') { consume(); return -parseUnary(); }
      if (peek() && peek().value === '+') { consume(); return parseUnary(); }
      return parseAtom();
    }
    // atom → number | '(' expr ')' | fn '(' expr ')'
    function parseAtom() {
      var t = peek();
      if (!t) throw new Error('Unexpected end');
      if (t.type === 'num') { consume(); return t.value; }
      if (t.type === 'fn') {
        var fn = consume().value;
        consume('(');
        var arg = parseExpr();
        consume(')');
        if (fn === 'sqrt') return Math.sqrt(arg);
        if (fn === 'sin') return Math.sin(arg);
        if (fn === 'cos') return Math.cos(arg);
        if (fn === 'log') return Math.log(arg);
      }
      if (t.value === '(') { consume('('); var v = parseExpr(); consume(')'); return v; }
      throw new Error('Unexpected token ' + t.value);
    }

    try {
      var result = parseExpr();
      if (pos !== tokens.length) return undefined; // trailing junk
      if (!isFinite(result)) return undefined;
      return result;
    } catch (_) {
      return undefined;
    }
  }

  // ── File-list cache ─────────────────────────────────────────
  // Walks memory["root"] exactly like prepareArrayToSearch() in
  // script.js, producing [{name, id, type, path}] entries.
  var _fileCache = null;
  var _fileCacheTime = 0;
  var CACHE_TTL = 30000; // 30 s

  function _buildFileCache() {
    var list = [];
    var root = (typeof memory !== 'undefined' && memory && memory.root) ? memory.root : null;
    if (!root) return list;
    (function scan(prefix, node) {
      for (var key in node) {
        if (!node.hasOwnProperty(key)) continue;
        var item = node[key];
        if (item && typeof item === 'object') {
          if (item.id) {
            var ext = (typeof mtpetxt === 'function') ? mtpetxt(key) : '';
            var displayName = ext === 'app' ? ((typeof basename === 'function') ? basename(key) : key) : key;
            list.push({ name: displayName, rawName: key, id: item.id, type: ext === 'app' ? 'app' : 'file', path: prefix, metadata: item.metadata });
          } else if (key.endsWith('/')) {
            list.push({ name: key, rawName: key, id: item._id || (prefix + key), type: 'folder', path: prefix + key });
            scan(prefix + key, item);
          }
        }
      }
    })('', root);
    return list;
  }

  function getSpotlightFileList() {
    var now = Date.now();
    if (_fileCache && (now - _fileCacheTime) < CACHE_TTL) return _fileCache;
    _fileCache = _buildFileCache();
    _fileCacheTime = now;
    return _fileCache;
  }

  function invalidateFileCache() { _fileCache = null; }

  // ── SpotlightSearch class ──────────────────────────────────
  function SpotlightSearch() {
    this.isOpen = false;
    this.results = [];
    this.selectedIndex = 0;
    this.providers = [];
    this._debounceTimer = null;
    this._searchGeneration = 0;

    this.overlay = document.getElementById('spotlight');
    this.input = document.getElementById('spotlight-input');
    this.resultsDiv = document.getElementById('spotlight-results');

    var self = this;
    if (this.input) {
      this.input.addEventListener('input', function () { self._onInput(); });
      this.input.addEventListener('keydown', function (e) { self._onKeyDown(e); });
    }
    // Click backdrop to close
    if (this.overlay) {
      this.overlay.addEventListener('mousedown', function (e) {
        if (e.target === self.overlay) self.close();
      });
    }

    // Global keyboard shortcut: Ctrl+Space / Super
    document.addEventListener('keydown', function (e) {
      if ((e.ctrlKey && e.code === 'Space') || (e.metaKey && e.key === ' ' && !e.shiftKey && !e.altKey)) {
        e.preventDefault();
        self.toggle();
      }
    });

    // Register all providers
    this.providers = [
      new SpotlightProviderCalculator(),
      new SpotlightProviderApps(),
      new SpotlightProviderRecent(),
      new SpotlightProviderFiles(),
      new SpotlightProviderFileContents(),
      new SpotlightProviderSettings(),
      new SpotlightProviderQuickActions()
    ];
  }

  SpotlightSearch.prototype.open = function () {
    this.isOpen = true;
    this.overlay.style.display = 'flex';
    this.input.value = '';
    this.results = [];
    this.selectedIndex = 0;
    this._renderEmpty();
    invalidateFileCache(); // refresh on open
    var inp = this.input;
    setTimeout(function () { inp.focus(); }, 20);
  };

  SpotlightSearch.prototype.close = function () {
    this.isOpen = false;
    this.overlay.style.display = 'none';
    this.input.value = '';
    this.results = [];
    this.selectedIndex = 0;
    this.resultsDiv.innerHTML = '';
  };

  SpotlightSearch.prototype.toggle = function () {
    if (this.isOpen) this.close(); else this.open();
  };

  // ── Input handler (debounced 150ms) ────────────────────────
  SpotlightSearch.prototype._onInput = function () {
    var self = this;
    clearTimeout(this._debounceTimer);
    this._debounceTimer = setTimeout(function () { self._runSearch(); }, 150);
  };

  SpotlightSearch.prototype._runSearch = function () {
    var query = this.input.value.trim();
    if (!query) { this.results = []; this._renderEmpty(); return; }
    var gen = ++this._searchGeneration;
    var self = this;
    var promises = this.providers.map(function (p) {
      return p.search(query).catch(function () { return []; });
    });
    Promise.all(promises).then(function (arrays) {
      if (gen !== self._searchGeneration) return; // stale
      var all = [];
      arrays.forEach(function (arr) { all = all.concat(arr.slice(0, 5)); });
      all = self._rank(all, query);
      self.results = all.slice(0, 12);
      self.selectedIndex = 0;
      self._render();
    });
  };

  // ── Ranking ────────────────────────────────────────────────
  SpotlightSearch.prototype._rank = function (results, query) {
    var q = query.toLowerCase();
    var historySet = {};
    if (typeof appsHistory !== 'undefined' && Array.isArray(appsHistory)) {
      appsHistory.forEach(function (h) { historySet[h.toLowerCase()] = true; });
    }
    results.forEach(function (r) {
      var t = r.title.toLowerCase();
      var score = 0;
      if (t === q) score = 100;
      else if (t.startsWith(q)) score = 80;
      else if (t.indexOf(q) !== -1) score = 60;
      else if (r._contentMatch) score = 40;
      else if (_fuzzy(t, q)) score = 20;
      if (historySet[t]) score += 15;
      if (r.category === 'Apps') score += 10;
      r.relevance = score;
    });
    results.sort(function (a, b) { return b.relevance - a.relevance; });
    return results;
  };

  function _fuzzy(str, pattern) {
    var pi = 0, si = 0;
    var s = str.toLowerCase(), p = pattern.toLowerCase();
    while (pi < p.length && si < s.length) { if (p[pi] === s[si]) pi++; si++; }
    return pi === p.length;
  }

  // ── Keyboard nav ───────────────────────────────────────────
  SpotlightSearch.prototype._onKeyDown = function (e) {
    if (e.key === 'ArrowDown') { e.preventDefault(); this._selectNext(); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); this._selectPrev(); }
    else if (e.key === 'Enter') { e.preventDefault(); this._execSelected(); }
    else if (e.key === 'Escape') { e.preventDefault(); this.close(); }
    else if (e.key === 'Tab') {
      e.preventDefault();
      if (this.results.length > 0) {
        this.input.value = this.results[this.selectedIndex].title;
        this._onInput();
      }
    }
  };

  SpotlightSearch.prototype._selectNext = function () {
    if (!this.results.length) return;
    this.selectedIndex = (this.selectedIndex + 1) % this.results.length;
    this._updateSelection();
  };

  SpotlightSearch.prototype._selectPrev = function () {
    if (!this.results.length) return;
    this.selectedIndex = (this.selectedIndex - 1 + this.results.length) % this.results.length;
    this._updateSelection();
  };

  SpotlightSearch.prototype._execSelected = function () {
    if (!this.results.length) return;
    var r = this.results[this.selectedIndex];
    if (r && typeof r.action === 'function') { r.action(); this.close(); }
  };

  // ── Rendering ──────────────────────────────────────────────
  SpotlightSearch.prototype._renderEmpty = function () {
    this.resultsDiv.innerHTML = '';
  };

  SpotlightSearch.prototype._render = function () {
    var container = this.resultsDiv;
    container.innerHTML = '';
    if (!this.results.length) {
      container.innerHTML = '<div class="spotlight-no-results">No results</div>';
      return;
    }
    // Group by category preserving order
    var groups = [];
    var groupMap = {};
    this.results.forEach(function (r) {
      if (!groupMap[r.category]) { groupMap[r.category] = []; groups.push(r.category); }
      groupMap[r.category].push(r);
    });

    var globalIdx = 0;
    var self = this;
    groups.forEach(function (cat) {
      var catEl = document.createElement('div');
      catEl.className = 'spotlight-category';
      var label = document.createElement('div');
      label.className = 'spotlight-category-label';
      label.textContent = cat;
      catEl.appendChild(label);
      container.appendChild(catEl);

      groupMap[cat].forEach(function (r) {
        var row = document.createElement('div');
        row.className = 'spotlight-result' + (globalIdx === self.selectedIndex ? ' selected' : '');
        row.setAttribute('data-idx', globalIdx);

        var iconSpan = document.createElement('span');
        iconSpan.className = 'material-symbols-rounded';
        iconSpan.textContent = r.icon || 'search';
        row.appendChild(iconSpan);

        var textWrap = document.createElement('div');
        textWrap.className = 'spotlight-result-text';
        var titleDiv = document.createElement('div');
        titleDiv.className = 'spotlight-result-title';
        titleDiv.textContent = r.title;
        textWrap.appendChild(titleDiv);
        if (r.subtitle) {
          var subDiv = document.createElement('div');
          subDiv.className = 'spotlight-result-subtitle';
          subDiv.textContent = r.subtitle;
          textWrap.appendChild(subDiv);
        }
        row.appendChild(textWrap);

        var kbd = document.createElement('kbd');
        kbd.className = 'spotlight-result-shortcut';
        kbd.textContent = '↵';
        row.appendChild(kbd);

        (function (result) {
          row.addEventListener('click', function () {
            if (typeof result.action === 'function') result.action();
            self.close();
          });
        })(r);
        container.appendChild(row);
        globalIdx++;
      });
    });
  };

  SpotlightSearch.prototype._updateSelection = function () {
    var rows = this.resultsDiv.querySelectorAll('.spotlight-result');
    for (var i = 0; i < rows.length; i++) {
      rows[i].classList.toggle('selected', i === this.selectedIndex);
    }
    // scroll into view
    if (rows[this.selectedIndex]) {
      rows[this.selectedIndex].scrollIntoView({ block: 'nearest' });
    }
  };

  // ════════════════════════════════════════════════════════════
  // PROVIDERS — each has .search(query) → Promise<Result[]>
  // Result: { title, subtitle, icon, category, action, _contentMatch? }
  // ════════════════════════════════════════════════════════════

  // ── 1. Apps ────────────────────────────────────────────────
  function SpotlightProviderApps() {}
  SpotlightProviderApps.prototype.search = function (query) {
    var q = query.toLowerCase();
    var list = getSpotlightFileList();
    var results = [];
    for (var i = 0; i < list.length; i++) {
      var f = list[i];
      if (f.type !== 'app') continue;
      if (f.name.toLowerCase().indexOf(q) === -1 && !_fuzzy(f.name, q)) continue;
      (function (file) {
        results.push({
          title: file.name,
          subtitle: 'App',
          icon: 'apps',
          category: 'Apps',
          action: function () { openfile(file.id); }
        });
      })(f);
    }
    return Promise.resolve(results);
  };

  // ── 2. Files (name search across all folders) ──────────────
  function SpotlightProviderFiles() {}
  SpotlightProviderFiles.prototype.search = function (query) {
    var q = query.toLowerCase();
    var list = getSpotlightFileList();
    var results = [];
    for (var i = 0; i < list.length; i++) {
      var f = list[i];
      if (f.type === 'app') continue; // apps handled separately
      if (f.name.toLowerCase().indexOf(q) === -1 && !_fuzzy(f.name, q)) continue;
      (function (file) {
        results.push({
          title: file.name,
          subtitle: file.path || '/',
          icon: file.type === 'folder' ? 'folder' : 'description',
          category: 'Files',
          action: function () {
            if (file.type === 'folder') {
              useHandler('file_manager', { opener: 'showDir', path: file.path });
            } else {
              openfile(file.id);
            }
          }
        });
      })(f);
    }
    return Promise.resolve(results);
  };

  // ── 3. File Contents (full-text via ctntMgr) ──────────────
  function SpotlightProviderFileContents() {}
  SpotlightProviderFileContents.prototype.search = function (query) {
    var q = query.toLowerCase();
    if (q.length < 3) return Promise.resolve([]); // skip trivial queries

    var list = getSpotlightFileList();
    var fileItems = [];
    for (var i = 0; i < list.length; i++) {
      if (list[i].type === 'file' && list[i].id) fileItems.push(list[i]);
    }
    // Limit to first 30 files for performance
    fileItems = fileItems.slice(0, 30);

    var promises = fileItems.map(function (f) {
      return ctntMgr.get(f.id).then(function (content) {
        if (content && typeof content === 'string' && content.toLowerCase().indexOf(q) !== -1) {
          return {
            title: f.name,
            subtitle: (f.path || '/') + ' — content match',
            icon: 'text_snippet',
            category: 'File Contents',
            _contentMatch: true,
            action: function () { openfile(f.id); }
          };
        }
        return null;
      }).catch(function () { return null; });
    });
    return Promise.all(promises).then(function (arr) {
      return arr.filter(function (r) { return r !== null; });
    });
  };

  // ── 4. Settings (real categories from Settings.app) ────────
  function SpotlightProviderSettings() {
    this.entries = [
      { label: 'System',          desc: 'Storage, Battery, Devices, Activity, Performance', data: 'system' },
      { label: 'Preferences',     desc: 'Smart search, Focus mode, Time, Reset',            data: 'preferences' },
      { label: 'Display',         desc: 'Theme, Colors, Wallpaper, Custom visuals',         data: 'personalize' },
      { label: 'Networking',      desc: 'Rotur connection settings',                        data: 'networking' },
      { label: 'User',            desc: 'User account settings',                            data: 'user' },
      { label: 'Defaults',        desc: 'Default app associations',                         data: 'defaults' },
      { label: 'About',           desc: 'Version, Credits, Membership',                     data: 'about' },
      { label: 'Storage',         desc: 'Manage file storage and erase data',               data: 'system' },
      { label: 'Battery',         desc: 'Battery and power settings',                       data: 'system' },
      { label: 'Wallpaper',       desc: 'Change desktop wallpaper',                         data: 'personalize' },
      { label: 'App Settings',    desc: 'Configure individual app settings',                data: 'appsets' }
    ];
  }
  SpotlightProviderSettings.prototype.search = function (query) {
    var q = query.toLowerCase();
    var results = [];
    for (var i = 0; i < this.entries.length; i++) {
      var s = this.entries[i];
      if (s.label.toLowerCase().indexOf(q) === -1 && s.desc.toLowerCase().indexOf(q) === -1 && !_fuzzy(s.label, q)) continue;
      (function (setting) {
        results.push({
          title: setting.label,
          subtitle: setting.desc,
          icon: 'settings',
          category: 'Settings',
          action: function () { useHandler('settings_manager', { data: setting.data }); }
        });
      })(s);
    }
    return Promise.resolve(results);
  };

  // ── 5. Recent (appsHistory is string[]) ────────────────────
  function SpotlightProviderRecent() {}
  SpotlightProviderRecent.prototype.search = function (query) {
    var q = query.toLowerCase();
    if (typeof appsHistory === 'undefined' || !Array.isArray(appsHistory) || !appsHistory.length) {
      return Promise.resolve([]);
    }
    // appsHistory contains app *titles* (e.g. "Calculator").
    // Resolve each to its file entry by matching rawName.
    var list = getSpotlightFileList();
    var titleToFile = {};
    for (var i = 0; i < list.length; i++) {
      if (list[i].type === 'app') {
        titleToFile[list[i].name.toLowerCase()] = list[i];
        // Also index by rawName without extension for fuzzy match
        if (list[i].rawName) {
          var base = (typeof basename === 'function') ? basename(list[i].rawName) : list[i].rawName;
          titleToFile[base.toLowerCase()] = list[i];
        }
      }
    }
    var results = [];
    var seen = {};
    for (var j = appsHistory.length - 1; j >= 0; j--) {
      var title = appsHistory[j];
      if (!title || seen[title]) continue;
      seen[title] = true;
      if (title.toLowerCase().indexOf(q) === -1 && !_fuzzy(title, q)) continue;
      var matched = titleToFile[title.toLowerCase()];
      (function (appTitle, fileEntry) {
        results.push({
          title: appTitle,
          subtitle: 'Recently opened',
          icon: 'history',
          category: 'Recent',
          recent: true,
          action: function () {
            if (fileEntry) openfile(fileEntry.id);
            else if (typeof openapp === 'function') openapp(appTitle);
          }
        });
      })(title, matched);
    }
    return Promise.resolve(results);
  };

  // ── 6. Quick Actions (real CTRL functions) ──────────────
  function SpotlightProviderQuickActions() {
    this.actions = [
      {
        name: 'Lock Screen', icon: 'lock',
        action: function () {
          if (typeof showloginmod === 'function') showloginmod();
        }
      },
      {
        name: 'Clear Notifications', icon: 'notifications_off',
        action: function () {
          if (typeof clearAllNotifications === 'function') clearAllNotifications();
          else if (typeof displayNotifications === 'function') displayNotifications('clear');
        }
      },
      {
        name: 'Open Terminal', icon: 'terminal',
        action: function () {
          // Open the terminal app from the Apps folder
          var list = getSpotlightFileList();
          for (var i = 0; i < list.length; i++) {
            if (list[i].type === 'app' && list[i].name.toLowerCase().indexOf('terminal') !== -1) {
              openfile(list[i].id);
              return;
            }
          }
          // Fallback: try opening by handler
          if (typeof useHandler === 'function') useHandler('terminal');
        }
      },
      {
        name: 'Open Settings', icon: 'settings',
        action: function () { useHandler('settings_manager'); }
      },
      {
        name: 'Open File Manager', icon: 'folder',
        action: function () { useHandler('file_manager'); }
      },
      {
        name: 'Open Calculator', icon: 'calculate',
        action: function () {
          var list = getSpotlightFileList();
          for (var i = 0; i < list.length; i++) {
            if (list[i].type === 'app' && list[i].name.toLowerCase().indexOf('calculator') !== -1) {
              openfile(list[i].id);
              return;
            }
          }
        }
      }
    ];
  }
  SpotlightProviderQuickActions.prototype.search = function (query) {
    var q = query.toLowerCase();
    var results = [];
    for (var i = 0; i < this.actions.length; i++) {
      var a = this.actions[i];
      if (a.name.toLowerCase().indexOf(q) === -1 && !_fuzzy(a.name, q)) continue;
      results.push({
        title: a.name,
        subtitle: 'Quick Action',
        icon: a.icon,
        category: 'Quick Actions',
        action: a.action
      });
    }
    return Promise.resolve(results);
  };

  // ── 7. Calculator (inline math via safe parser) ────────────
  function SpotlightProviderCalculator() {}
  SpotlightProviderCalculator.prototype.search = function (query) {
    // Only attempt if query contains at least one operator or function call
    if (!/[\d]/.test(query)) return Promise.resolve([]);
    if (!/[+\-*/%^()]/.test(query) && !/\b(sqrt|sin|cos|log)\s*\(/i.test(query)) return Promise.resolve([]);
    var result = spotlightSafeMath(query);
    if (result === undefined || result === null) return Promise.resolve([]);
    var display = Number.isInteger(result) ? result.toString() : parseFloat(result.toPrecision(12)).toString();
    return Promise.resolve([{
      title: display,
      subtitle: query + ' =',
      icon: 'calculate',
      category: 'Calculator',
      relevance: 100,
      action: function () {
        if (navigator.clipboard && navigator.clipboard.writeText) {
          navigator.clipboard.writeText(display);
          if (typeof toast === 'function') toast('Copied ' + display);
        }
      }
    }]);
  };

  // ── Initialise on DOM ready ────────────────────────────────
  window.addEventListener('DOMContentLoaded', function () {
    window.spotlightSearch = new SpotlightSearch();
  });
})();
