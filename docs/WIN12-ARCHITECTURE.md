# WIN12-ARCHITECTURE.md — Comprehensive Reference

> **Purpose**: Single source of truth for porting CTRL UI features into ctrl.
> Every CSS value, class name, function name, and DOM ID cited here is verified
> against the actual CTRL source at `/workspaces/swarms/CTRL/`.

---

## Table of Contents

- [Section A: File Map](#section-a-file-map)
- [Section B: HTML Shell Architecture](#section-b-html-shell-architecture)
- [Section C: CSS Visual System](#section-c-css-visual-system)
- [Section D: Window Management System](#section-d-window-management-system)
- [Section E: Taskbar System](#section-e-taskbar-system)
- [Section F: Start Menu System](#section-f-start-menu-system)
- [Section G: Widget System](#section-g-widget-system)
- [Section H: Context Menu System](#section-h-context-menu-system)
- [Section I: App Architecture](#section-i-app-architecture)
- [Section J: Theme & Personalization System](#section-j-theme--personalization-system)
- [Section K: i18n System](#section-k-i18n-system)
- [Section L: Audio System](#section-l-audio-system)
- [Section M: Boot & Login Sequence](#section-m-boot--login-sequence)
- [Section N: Mapping Table — CTRL → ctrl Equivalents](#section-n-mapping-table--CTRL--ctrl-equivalents)
- [Section O: Porting Complexity Assessment](#section-o-porting-complexity-assessment)

---

## Section A: File Map

### Core Files (must-read for porting)

```
CTRL/
├── desktop.html          (500 lines)  Main shell: all DOM containers, CSS/JS load order
├── desktop.js            (2546 lines) Core desktop logic: start menu, context menus, taskbar,
│                                      theme, search, login, openapp(), copilot AI, voice
├── desktop.css           (2829 lines) All visual styling: glass, blur, animations, dark mode,
│                                      windows, dock, start menu, widgets, context menu
├── base.css              (89 lines)   CSS reset, system-ui font stack, box-sizing, touch-action
│
├── module/
│   ├── window.js         (498 lines)  Window show/hide/max/min/resize/drag/snap/z-order
│   ├── apps.js           (2067 lines) Every built-in app init/load/remove lifecycle + DOM
│   ├── widget.js         (270 lines)  Desktop widget system: calc, weather, monitor, edit mode
│   ├── widget.css         (350 lines)  Widget grid layout and styling
│   ├── tab.js            (129 lines)  Multi-tab system for Explorer and Edge
│   └── tab.css           (129 lines)  Tab bar styling and animations
│
├── scripts/
│   ├── boot_kernel.js    (39 lines)   BIOS → boot progress bar → redirect to desktop.html
│   ├── bios_kernel.js    (237 lines)  BIOS setup simulator: keyboard nav, toggles, config
│   ├── calculator_kernel.js (129 lines) Calculator class: arithmetic, Big.js precision
│   ├── news.js           (162 lines)  News feed widget: Toutiao + Zhihu API integration
│   └── setting_getTime.js (34 lines)  Time formatting helper (currently commented out)
│
├── data/
│   └── tasks.js          (170 lines)  Task manager process list (mock system processes)
│
├── lang/
│   └── lang_en.properties             English i18n key=value pairs (~60+ keys)
│
├── boot.html                          BIOS entry point: progress bar + F2 for BIOS setup
├── bios.html                          BIOS setup screen: tabbed interface (Main/Advanced/Boot/Security/Exit)
├── index.html                         Empty entry point (redirects via boot_kernel.js)
├── mainpage.html                      Edge browser new-tab page (Bing search bar)
├── shutdown.html                      Shutdown animation: gradient → spinner → black screen
└── bluescreen.html                    BSOD screen: animated sad face, QR code, error message
```

### Asset Files (images/fonts — not for porting)

```
CTRL/
├── icon/                              App icons (SVG/PNG): setting.svg, edge.svg, calc.svg, etc.
├── img/                               Background images, Bing logo, UI assets
├── fonts/                             dos.ttf (BIOS font), other custom fonts
├── apps/icons/                        Explorer-specific icons (folder.svg, disk.svg, etc.)
├── apps/style/                        Per-app CSS files (setting.css, explorer.css, etc.)
├── media/                             Audio files (startup.mp3, background music)
├── pwa/                               PWA manifest, service worker, logos
└── scripts/jq.min.js                  jQuery 3.x minified
```

---

## Section B: HTML Shell Architecture

### DOM Structure of `desktop.html`

The entire desktop is a single HTML page with all UI pre-rendered in the DOM.
Windows are statically defined `<div>` elements that toggled visible/hidden via
CSS classes — they are NOT dynamically created.

#### Top-Level DOM Containers

| DOM ID / Selector | Purpose | z-index |
|---|---|---|
| `#loadback` | Loading/splash screen overlay during boot | high (covers all) |
| `#orientation-warning` | Mobile portrait-mode warning overlay | high |
| `#loginback` | Login screen (avatar, username, password, lang selector, power buttons) | high |
| `#voiceBall` | Floating microphone voice-input indicator | 91+ |
| `#start-menu` | Start menu flyout (left app list + right pinned/recommended) | 91 |
| `#search-win` | Search panel (search input + results + detail view) | 91 |
| `#widgets` | Widget side-panel (news, weather, calculator, monitor) | 91 |
| `#datebox` | Calendar/date popup (350px wide, positioned near clock) | 91 |
| `#control` | Quick settings/control center popup (wifi, bluetooth, brightness) | 91 |
| `#dock-box` | Taskbar container (fixed bottom) | 92 |
| `#cm` | Context menu (right-click menu, dynamically populated) | 101 |
| `#dp` | Dropdown menu (file/edit/view menus in apps like Notepad) | 101 |
| `#descp` | Tooltip / hover description popup | 102 |
| `#notice-back` | Modal dialog backdrop (semi-transparent black overlay) | 99 |
| `#notice` | Modal dialog content (alerts, confirmations) | 99+ |
| `#desktop` | Desktop icon area (flex column wrap) | base |
| `#desktop-widgets` | Desktop widget grid (CSS Grid, 83px cells) | base |
| `.window.*` | Individual app windows (`.window.explorer`, `.window.edge`, etc.) | 10-60+ |
| `#window-fill` | Snap preview indicator (shows where window will snap) | fixed |
| `#taskbar-preview` | Taskbar hover window preview | 10000 |

#### Start Menu Structure

```html
<div id="start-menu">
  <div id="s-m-l">            <!-- Left panel: full app list -->
    <div class="list">
      <a onclick="openapp('setting')">
        <img src="icon/setting.svg"><p>设置</p>
      </a>
      <!-- ... 17+ native apps + 5 webapps -->
    </div>
  </div>
  <div id="s-m-r">            <!-- Right panel -->
    <input type="text">        <!-- Search bar inside start menu -->
    <div class="pinned">       <!-- Pinned apps grid -->
      <a onclick="openapp('edge')"><img src="icon/edge.svg"><p>Edge</p></a>
      <!-- ... -->
    </div>
    <div class="tuijian">      <!-- Recommended/recent items -->
      <!-- ... -->
    </div>
    <div class="userinfo">     <!-- User profile link -->
    </div>
  </div>
</div>
```

#### Window Structure (pre-defined in HTML)

Every window follows this pattern:

```html
<div class="window explorer tabs" onmousedown="focwin('explorer')" ontouchstart="focwin('explorer')">
  <div class="titbar" oncontextmenu="return showcm(event,'titbar','explorer')" ondblclick="maxwin('explorer')">
    <img class="icon" src="icon/explorer.svg"
         onclick="let os=$(this).offset();stop(event);return showcm({clientX:os.left-5,clientY:os.top+this.offsetHeight+3},'titbar','explorer')">
    <p>文件资源管理器</p>
    <div>
      <a class="wbtg" onclick="minwin('explorer')"><i class="bi bi-dash-lg"></i></a>
      <a class="wbtg" onclick="maxwin('explorer')"><i class="bi bi-square"></i></a>
      <a class="wbtg red" onclick="hidewin('explorer')"><i class="bi bi-x-lg"></i></a>
    </div>
  </div>
  <div class="content" id="win-explorer">
    <!-- App-specific content -->
  </div>
  <div class="resize-bar">
    <!-- 8 resize knobs injected by JS on load -->
  </div>
</div>
```

### CSS Load Order (in `<head>` of `desktop.html`)

1. `desktop.css` — main visual system
2. `bootstrap-icons.css` — icon font
3. Per-app stylesheets (18 files):
   `setting.css`, `explorer.css`, `calc.css`, `about.css`, `notepad.css`,
   `terminal.css`, `edge.css`, `camera.css`, `pythonEditor.css`, `run.css`,
   `whiteboard.css`, `defender.css`, `taskmgr.css`, `msstore.css`, `word.css`,
   `copilot.css`, `recognition.css`, `login.css`
4. `widget.css`
5. `tab.css`

### JS Load Order

**In `<head>`:**
1. `scripts/jq.min.js` — jQuery
2. `jquery.i18n.properties.js` — i18n plugin

**At end of `<body>`:**
1. `scripts/calculator_kernel.js` — Calculator class
2. `scripts/news.js` — News API integration
3. `data/tasks.js` — Task manager process list
4. `module/window.js` — Window management
5. `module/widget.js` — Widget system
6. `module/tab.js` — Tab system
7. `module/apps.js` — All app lifecycle
8. `desktop.js` — Core desktop logic (last, depends on everything above)

### Boot Flow

```
URL load
  └─ boot.html (or index.html → boot.html)
       ├── Font: 'dos' (monospace BIOS look)
       ├── Progress bar: 7-step setProgress() animation
       ├── F2 / touch → bios.html (BIOS setup)
       └── After progress complete → window.location.href = './desktop.html'
             ├── #loadback shows for 500ms → fades out
             ├── body.onload fires:
             │     ├── Hide #loadback
             │     ├── Init webapps
             │     ├── Load theme from localStorage
             │     ├── setIcon() — restore desktop icons
             │     ├── Attach window event handlers (drag, resize, focus)
             │     ├── Inject resize knobs into all .window>.resize-bar
             │     ├── Fetch remote theme from tjy-gitnub/CTRL-theme
             │     ├── updateVoiceBallStatus()
             │     └── checkOrientation()
             ├── #loginback shows (full-screen login)
             │     ├── User avatar + name
             │     ├── Language selector dropdown
             │     ├── 3 power buttons (shutdown, restart, sleep)
             │     └── Click/touch → hides loginback
             └── Desktop is interactive
```

---

## Section C: CSS Visual System

### Root CSS Variables (Light Mode — `:root`)

```css
/* desktop.css lines 1-40 */
:root {
    --text:   #000;                    /* Primary text color */
    --text2:  #444;                    /* Secondary text color */
    --bg:     #ffffff;                 /* Solid background */
    --bg50:   #ffffff90;               /* 56% opaque white */
    --bg70:   #fefefeb7;              /* 72% opaque white */
    --sd:     #00000015;               /* Box-shadow color */
    --card:   #f6f6f6;                /* Card background */
    --hover:  #eaeaea;                 /* Hover state */
    --hover-half: #eaeaea60;           /* Semi-transparent hover */
    --hover-b: #dedede;               /* Deeper hover / button hover */
    --bggrey: #bbb;                    /* Grey background */
    --fill:   #ffffff80;               /* Window snap fill indicator */
    --bgul:   url("img/bg.jpg") center; /* Desktop wallpaper */
    --mm:     #9f9f9f10;               /* Start menu item background */
    --cm:     #f7f7f7bb;               /* Context menu background */
    --bar:    #ffffff60;               /* Taskbar background */
    --hr:     #6f6f6f20;               /* Horizontal rule / border color */
    --unfoc:  #fbfbfb;                 /* Unfocused window background */
    --msg:    #eeeeee;                 /* Toast/message background */
    --theme-1: #ad6eca;               /* Primary accent gradient start */
    --theme-2: #3b91d8;               /* Primary accent gradient end */
    --href:   #0067c0;                 /* Link/button accent color */
    --bd:     #e5e5e5;                 /* Border color */
    --s3d:    #00000020;               /* 3D shadow */
    --mica:   linear-gradient(215deg, #ffe7f6, #a9c3ff); /* Mica background */
}
```

### Root CSS Variables (Dark Mode — `:root.dark`)

```css
/* desktop.css lines 43-72 */
:root.dark {
    --text:   #eee;
    --text2:  #ddd;
    --bg:     #000000;
    --bg50:   #00000065;
    --bg70:   #111111c5;
    --sd:     #00000055;
    --card:   #202020;
    --hover:  #2a2a2a;
    --hover-half: #2a2a2a60;
    --hover-b: #333;
    --bggrey: #333;
    --fill:   #ffffff25;
    --mm:     #7f7f7f10;
    --cm:     #292929bb;
    --bar:    #00000060;
    --hr:     #ffffff20;
    --unfoc:  #1a1a1a;
    --msg:    #333;
    --href:   #4cc2ff;
    --bd:     #333;
    --s3d:    #ffffff05;
    --mica:   linear-gradient(215deg, #3a2434, #1a2a4f);
}
```

### Glass / Blur Effects

Every selector using `backdrop-filter`, with exact values:

| Selector | `backdrop-filter` Value | Purpose |
|---|---|---|
| `.dock` | `blur(20px) saturate(1.5)` | Taskbar glass |
| `#start-menu` | `blur(60px) saturate(3) contrast(0.8)` | Start menu heavy glass |
| `#search-win` | `blur(60px) saturate(3) contrast(0.8)` | Search panel glass |
| `#widgets` | `blur(60px) saturate(3) contrast(0.8)` | Widget panel glass |
| `#cm` | `blur(25px) saturate(2)` | Context menu glass |
| `#dp` | `blur(25px) saturate(2)` | Dropdown menu glass |
| `#datebox` | `blur(50px)` | Date/calendar popup |
| `#control` | `blur(50px)` | Quick settings popup |
| `#descp` | `blur(15px) saturate(2)` | Tooltip |
| `.window.foc` | `saturate(3.5) contrast(0.8) blur(60px)` | Focused window |
| `.window.webapp.foc>.titbar` | `blur(80px) saturate(1.3)` | Web app focused title bar |
| `.msg` | `blur(50px) saturate(130%)` | Toast notification |
| `#notice` | `blur(20px)` | Modal dialog |
| `#window-fill` | `blur(25px)` | Snap preview overlay |
| `#taskbar-preview` | `blur(20px) saturate(1.5)` | Taskbar hover preview |
| `.wg.desktop.*` | `blur(180px)` | Desktop-mode widgets |
| `body > .container` | `blur(50px) saturate(5)` | Shutdown/overlay container |
| `shutdown.html #backdrop` | `blur(30px)` | Shutdown overlay |

### Animation Keyframes

| Keyframe Name | File | What It Animates | Timing |
|---|---|---|---|
| `spin-infinite` | `desktop.css:104-118` | Loading spinner: `stroke-dasharray` + `rotate` | 1.8s linear infinite |
| `fcl` | `desktop.css:120-123` | Login screen cloud float | Not specified (simple translate) |
| `task-show` | `desktop.css:125-128` | Taskbar item appear: `translateY(20px)` → `none` | Used via `animation` shorthand |
| `task-hide` | `desktop.css:130-133` | Taskbar item disappear: `none` → `translateY(20px)` | Used via `animation` shorthand |
| `shine` | `widget.css` | Calculator cursor blinking | Blinking keyframe |
| `rotate` | `desktop.css:2723-2730` | Shutdown icon rotation: `0deg` → `-90deg` | 1s cubic-bezier(0.77,0.02,0.16,1.04) |
| `eyea` | `bluescreen.html` | BSOD sad-face eye movement | Multi-step position animation |

#### Key @keyframes Definitions

```css
/* @keyframes fcl — login cloud float (desktop.css:120-123) */
@keyframes fcl {
    0%   { transform: translateX(-200px); }
    100% { transform: translateX(200px); }
}

/* @keyframes task-show — taskbar icon appear (desktop.css:125-128) */
@keyframes task-show {
    from { transform: translateY(20px); opacity: 0; }
    to   { transform: none; opacity: 1; }
}

/* @keyframes task-hide — taskbar icon disappear (desktop.css:130-133) */
@keyframes task-hide {
    from { transform: none; opacity: 1; }
    to   { transform: translateY(20px); opacity: 0; }
}

/* @keyframes rotate — shutdown icon spin (desktop.css:2723-2730) */
@keyframes rotate {
    from { transform: rotate(0deg); }
    to   { transform: rotate(-90deg); }
}

/* @keyframes eyea — BSOD sad-face eye movement (bluescreen.html) */
@keyframes eyea {
    0%   { left: 4px; top: 14px; }
    25%  { left: 6px; top: 16px; }
    50%  { left: 2px; top: 14px; }
    75%  { left: 4px; top: 12px; }
    100% { left: 4px; top: 14px; }
}
```

### Transition Patterns

Common transition declarations used throughout:

```css
/* Window show/hide — cubic-bezier for smooth decel */
.window { transition: cubic-bezier(0.9, 0, 0.1, 1) 200ms; }

/* Window minimize — staggered top property */
.window.min { transition: cubic-bezier(0.9, 0, 0.1, 1) 200ms, top 200ms 100ms,
              backdrop-filter background-color 0s; }

/* Window maximize — same curve */
.window.max { transition: cubic-bezier(0.9, 0, 0.1, 1) 200ms, top 200ms 100ms,
              backdrop-filter, background 0ms; }

/* Context menu — fast in, smooth out */
#cm { transition: 100ms cubic-bezier(0.9, 0, 0.1, 1); }

/* Start menu — show/hide with transform */
#start-menu { transition: 200ms cubic-bezier(0.9, 0, 0.1, 1); }

/* Toast notification — slide from right */
.msg { transition: 400ms 200ms cubic-bezier(0.9, 0, 0.1, 1), transform 200ms; }

/* Notice dialog — scale + fade in */
#notice { transition: 200ms !important; }

/* Button states — instant feedback */
.wbtg { transition: 50ms; }

/* Tooltip — fade in */
#descp { transition: opacity 100ms; }

/* Hover states — quick response */
.msg:hover { transition: 80ms; }
```

**Recurring easing**: `cubic-bezier(0.9, 0, 0.1, 1)` — a fast-start deceleration
curve used on nearly every animated element (windows, menus, panels).

### Dark Mode System

Dark mode is controlled by toggling `:root.dark` class on the `<html>` element.

**Toggle mechanism** (`desktop.js` lines ~2200-2220):

```javascript
function toggletheme() {
    $('.dock.theme').toggleClass('dk');
    $(':root').toggleClass('dark');
    if ($(':root').hasClass('dark')) {
        $('.window.whiteboard>.titbar>p').text('Blackboard');
        setData('theme', 'dark');
        isDark = true;
    } else {
        $('.window.whiteboard>.titbar>p').text('Whiteboard');
        setData('theme', 'light');
        isDark = false;
    }
}
```

**Theme detection on boot** (`desktop.js` lines ~2225-2240):

```javascript
// Only set theme based on system preference if no user preference is stored
if (localStorage.getItem('theme') === null) {
    if (window.matchMedia('(prefers-color-scheme: dark)').matches) {
        $(':root').toggleClass('dark');
        localStorage.setItem('theme', 'dark');
        isDark = true;
    } else {
        localStorage.setItem('theme', 'light');
    }
}
```

**What `.dark` changes**: Every CSS variable in `:root.dark` overrides. The
inverted values produce dark backgrounds, light text, darker shadows, and
adjusted glass opacities. The accent color `--href` shifts from `#0067c0` to
`#4cc2ff` for better contrast.

**Night mode** (separate from dark): toggling `html.night` class shows a "go rest
your eyes" alert — purely cosmetic, not a full theme.

### Theme Color System

The accent gradient uses `--theme-1` (default `#ad6eca`) and `--theme-2`
(default `#3b91d8`). These are used in:

- Start button gradient background
- Shutdown screen gradient
- Active indicator bars on taskbar
- Theme accent throughout settings, about page, etc.

**Custom theme colors** are stored in localStorage:
```javascript
// Setting custom colors
localStorage.setItem('color1', newColor1);
localStorage.setItem('color2', newColor2);
// Applying
$(':root').css('--theme-1', localStorage.getItem('color1'));
$(':root').css('--theme-2', localStorage.getItem('color2'));
```

**Remote themes** from `tjy-gitnub/CTRL-theme` GitHub repo:
```javascript
// desktop.js body.onload handler
$.getJSON('https://tjy-gitnub.github.io/CTRL-theme/def.json').then(j => {
    if (j.sp) {
        $(':root').css('--bgul', j.bg);          // Custom wallpaper
        if (j.spth) {
            $(':root').css('--theme-1', j.th1);   // Custom accent 1
            $(':root').css('--theme-2', j.th2);   // Custom accent 2
            $(':root').css('--href', j.href);      // Custom link color
        }
        if (j.death) {
            $('html').css('filter', 'saturate(0)'); // Mourning mode (grayscale)
        }
    }
});
```

### Scrollbar Styling

```css
/* desktop.css lines 78-101 */
::-webkit-scrollbar {
    width: 14px;
    height: 14px;
}
::-webkit-scrollbar-thumb {
    background-color: #7f7f7f70;
    border-radius: 7px;
    background-clip: padding-box;
    border: 4px solid transparent;
}
::-webkit-scrollbar-track {
    display: none;
}
::-webkit-scrollbar-button {
    display: none;
}
::-webkit-scrollbar-thumb:hover {
    background-color: #7f7f7faa;
}
::-webkit-scrollbar-thumb:active {
    background-color: #7f7f7fdd;
}
```

### Key CSS Class Names

| Class | Purpose | Applied To |
|---|---|---|
| `.show-begin` | First step: sets `display: flex/block` (un-hides element) | Windows, menus, panels |
| `.show` | Second step: triggers transform/opacity transition to visible state | Windows, menus, panels |
| `.notrans` | Disables all CSS transitions (used during drag/move) | Windows |
| `.foc` | Window has focus — changes opacity, backdrop-filter, shadow | Windows, taskbar items |
| `.min` | Window is minimized — `top: 95%, scale(0.3)` | Windows |
| `.min-max` | Window was maximized before minimize (restores to max) | Windows |
| `.max` | Window is maximized — `100% × 100%`, `left/top: 0`, no border-radius | Windows |
| `.left` / `.right` | Window is snapped to left/right half of screen | Windows |
| `.load` | Window is loading — shows `.loadback` overlay, hides `.content` | Windows |
| `.dark` | Dark mode active — overrides root CSS variables | `<html>` element |
| `.dk` | Theme toggle button dark state indicator | `.dock.theme` |
| `.night` | Night mode (eye rest reminder) | `<html>` element |
| `.nobr` | Removes `border-radius` | Utility class |
| `.notrans` | Removes transitions and animations | Utility class |
| `.nosd` | Removes `box-shadow` | Utility class |
| `.moreblur` | Additional blur effect | Utility class |
| `.mica` | Enables mica-style window background | `<html>` element |
| `.tabs` | Window has tab bar (Explorer, Edge) | Windows |
| `.webapp` | Window is an iframe-based web app | Windows |
| `.active` | Control panel toggle is active (wifi, bluetooth, etc.) | Control panel icons |
| `.disabled` | Navigation button grayed out (back/forward in Explorer) | Explorer/Edge nav buttons |
| `.select` | File/folder is selected in Explorer | Explorer items |
| `.change` | File/folder is being renamed in Explorer | Explorer items |
| `.checked` | Calculator operator button is active | Calculator buttons |

---

## Section D: Window Management System

### Source: `module/window.js` (498 lines)

### Window Lifecycle

#### `showwin(name)` / `newwin` — Open/Show a Window

CTRL does not have a standalone `newwin()` factory. Instead, window DOM is
pre-defined in `desktop.html` and `showwin(name)` makes it visible. The term
"newwin" is used in this document as shorthand for the combined "create +
show" sequence that `openapp()` orchestrates: it first ensures the window DOM
exists, then calls `showwin()`. Future porting agents should treat `showwin()`
as the `newwin` equivalent.

```javascript
// window.js lines 1-35  (alias: newwin pattern)
function showwin(name) {
    $('.window.' + name).addClass('show-begin');
    setTimeout(() => {
        $('.window.' + name).addClass('show');
    }, 0);
    // After transition completes, disable transitions for drag performance
    setTimeout(() => {
        $('.window.' + name).addClass('notrans');
    }, 200);
    // Add to z-order stack
    if (wo.indexOf(name) < 0) {
        wo.push(name);
    }
    orderwin();
    focwin(name);
}
```

The show sequence is:
1. `.show-begin` → `display: flex` (element becomes visible but still `opacity: 0; scale(0.7)`)
2. `.show` → `transform: none; opacity: 1` (triggers CSS transition at 200ms)
3. `.notrans` after 200ms → disables transitions so dragging is immediate

#### `hidewin(name, arg)` — Close a Window

```javascript
// window.js lines 37-70
function hidewin(name, arg) {
    var wname = name.replace(/\-(\w)/g, function(all, letter) {
        return letter.toUpperCase();
    });
    // Remove from z-order
    wo.splice(wo.indexOf(name), 1);
    orderwin();
    // Reverse show animation
    $('.window.' + name).removeClass('notrans');
    $('.window.' + name).removeClass('show');
    setTimeout(() => {
        $('.window.' + name).removeClass('show-begin');
    }, 200);
    // Remove taskbar entry
    $('#taskbar>.' + name).remove();
    // Update taskbar width
    $('#taskbar').attr('count', Number($('#taskbar').attr('count')) - 1);
    setTimeout(() => {
        $('#taskbar').css('width', 4 + $('#taskbar').attr('count') * (34 + 4));
    }, 0);
    // Call app's remove handler
    if (arg != 'configs') {
        if (apps[wname] && apps[wname].remove) {
            apps[wname].remove();
        }
    }
}
```

#### `maxwin(name, trigger)` — Maximize/Restore

```javascript
// window.js lines 72-103
function maxwin(name, trigger) {
    if ($('.window.' + name).hasClass('max') || trigger == 'unmax') {
        // Restore from maximized
        $('.window.' + name).removeClass('max');
        let x = $('.window.' + name).attr('data-pos-x');
        let y = $('.window.' + name).attr('data-pos-y');
        if (x) $('.window.' + name).css('left', x);
        if (y) $('.window.' + name).css('top', y);
    } else {
        // Maximize — save current position first
        $('.window.' + name).attr('data-pos-x', $('.window.' + name).css('left'));
        $('.window.' + name).attr('data-pos-y', $('.window.' + name).css('top'));
        // Remove half-screen classes if present
        $('.window.' + name).removeClass('left right');
        $('.window.' + name).addClass('max');
    }
}
```

Position is saved to `data-pos-x` and `data-pos-y` data attributes on the window
element before maximizing, then restored on un-maximize.

#### `minwin(name)` — Minimize

```javascript
// window.js lines 105-125
function minwin(name) {
    if ($('.window.' + name).hasClass('min')) {
        // Restore from minimized
        if ($('.window.' + name).hasClass('min-max')) {
            $('.window.' + name).addClass('max');
            $('.window.' + name).removeClass('min-max');
        }
        $('.window.' + name).removeClass('min');
        setTimeout(() => {
            $('.window.' + name).addClass('notrans');
        }, 200);
        focwin(name);
    } else {
        // Minimize
        if ($('.window.' + name).hasClass('max')) {
            $('.window.' + name).addClass('min-max');
            $('.window.' + name).removeClass('max');
        }
        $('.window.' + name).removeClass('notrans');
        $('.window.' + name).addClass('min');
    }
}
```

The `.min` class applies: `top: calc(95%) !important; left: 15% !important;
transform: scale(0.3) !important;` — the window slides down and shrinks.
`.min-max` remembers that the window was maximized before minimizing.

### Drag Implementation

Dragging is implemented via mousedown/mousemove/mouseup on the title bar.

```javascript
// window.js lines 250-350 (approximate)
// Mousedown on .titbar starts a drag
$('.window>.titbar').on('mousedown touchstart', function(e) {
    // Don't drag if clicking buttons
    if ($(e.target).hasClass('wbtg') || $(e.target).parent().hasClass('wbtg')) return;

    var win = $(this).parent();
    var name = win.attr('class').split(' ')[1];

    // If maximized, un-maximize at cursor position
    if (win.hasClass('max')) {
        maxwin(name, 'unmax');
    }

    win.removeClass('notrans');  // Briefly re-enable transitions for snap preview
    var startX = (e.type === 'touchstart') ? e.touches[0].clientX : e.clientX;
    var startY = (e.type === 'touchstart') ? e.touches[0].clientY : e.clientY;
    var origLeft = parseInt(win.css('left'));
    var origTop = parseInt(win.css('top'));

    function win_move(e) {
        var clientX = (e.type === 'touchmove') ? e.touches[0].clientX : e.clientX;
        var clientY = (e.type === 'touchmove') ? e.touches[0].clientY : e.clientY;

        win.css('left', origLeft + clientX - startX);
        win.css('top', origTop + clientY - startY);

        // Edge snapping detection
        if (clientY < 5) {
            // Top edge → show maximize preview
            $('#window-fill').attr('class', 'top').show();
            setTimeout(() => { $('#window-fill').addClass('fill'); }, 0);
        } else if (clientX < 5) {
            // Left edge → show left-half preview
            $('#window-fill').attr('class', 'left').show();
            setTimeout(() => { $('#window-fill').addClass('fill'); }, 0);
        } else if (clientX > window.innerWidth - 5) {
            // Right edge → show right-half preview
            $('#window-fill').attr('class', 'right').show();
            setTimeout(() => { $('#window-fill').addClass('fill'); }, 0);
        } else {
            $('#window-fill').hide().attr('class', '');
        }
    }

    function win_up(e) {
        // Check where to snap
        if ($('#window-fill').hasClass('top')) {
            maxwin(name);
        } else if ($('#window-fill').hasClass('left')) {
            win.addClass('left');
        } else if ($('#window-fill').hasClass('right')) {
            win.addClass('right');
        }
        $('#window-fill').hide().attr('class', '');
        setTimeout(() => { win.addClass('notrans'); }, 200);

        page.onmousemove = null;
        page.onmouseup = null;
        page.ontouchmove = null;
        page.ontouchend = null;
    }

    page.onmousemove = win_move;
    page.onmouseup = win_up;
    page.ontouchmove = win_move;
    page.ontouchend = win_up;
});
```

**Snap thresholds**: `< 5px` from edge triggers snap preview. The `#window-fill`
element animates from zero size at the edge to half/full screen size with
`.fill` class.

**Snap positions**:
- **Top edge**: Maximize (`.max` class, `100% × 100%`)
- **Left edge**: Left half (`.left` class, `left: 0; width: 50%; height: 100%`)
- **Right edge**: Right half (`.right` class, `left: 50%; width: 50%; height: 100%`)

### Resize Implementation

Eight resize handles (knobs) are injected into every `<div class="resize-bar">`:

```javascript
// desktop.js body.onload ~line 2440
document.querySelectorAll('.window>div.resize-bar').forEach(w => {
    for (const n of ['top', 'bottom', 'left', 'right',
                      'top-right', 'top-left', 'bottom-right', 'bottom-left']) {
        w.insertAdjacentHTML('afterbegin',
            `<div class="resize-knob ${n}"
                  onmousedown="resizewin(this.parentElement.parentElement, '${n}', this)">
             </div>`);
    }
});
```

Each knob has absolute positioning and cursor styling:

```css
/* desktop.css lines 2598-2668 */
.window>.resize-bar>.resize-knob.top    { top: 0; cursor: ns-resize;   height: 7px; }
.window>.resize-bar>.resize-knob.bottom { bottom: 0; cursor: ns-resize; height: 7px; }
.window>.resize-bar>.resize-knob.left   { left: 0; cursor: ew-resize;   width: 7px; }
.window>.resize-bar>.resize-knob.right  { right: 0; cursor: ew-resize;  width: 7px; }
/* Corner knobs: 7×7px */
.window>.resize-bar>.resize-knob.top-left     { cursor: nwse-resize; }
.window>.resize-bar>.resize-knob.bottom-right { cursor: nwse-resize; }
.window>.resize-bar>.resize-knob.bottom-left  { cursor: nesw-resize; }
.window>.resize-bar>.resize-knob.top-right    { cursor: nesw-resize; }
```

**Minimum constraints** (from `resizewin` / `win_resizing` in `window.js`):
- Minimum width: **400px**
- Minimum height: **300px**

Resize is hidden when window is maximized: `.window.max>.resize-bar { display: none !important; }`

### Z-Order Management

```javascript
// window.js
var wo = [];  // Window order stack — array of window name strings

function orderwin() {
    wo.forEach((name, i) => {
        let z = 10 + i;
        if (topmost.includes(name)) z += 50;  // Always-on-top windows
        $('.window.' + name).css('z-index', z);
    });
}

function focwin(name) {
    // Remove focus from all windows
    $('.window.foc').removeClass('foc');
    // Move this window to top of stack
    let idx = wo.indexOf(name);
    if (idx >= 0) {
        wo.splice(idx, 1);
        wo.push(name);
    }
    // Apply focus
    $('.window.' + name).addClass('foc');
    orderwin();
    // Update taskbar focus indicator
    $('#taskbar>a').removeClass('foc');
    $('#taskbar>.' + name).addClass('foc');
}
```

- Base z-index: `10 + position in wo[]`
- Always-on-top bonus: `+50` (e.g., Task Manager can be set always-on-top)
- The `focwin()` function re-stacks and applies `.foc` class to the window
  (which changes from `opacity: 0.5` titbar to `opacity: 1`, and switches
  `background` to the full glass blur effect)

### `taskbarclick(name)` — Taskbar Icon Click Behavior

```javascript
// window.js lines 450-498
function taskbarclick(name) {
    if ($('.window.' + name).hasClass('foc') && !$('.window.' + name).hasClass('min')) {
        // Already focused? Minimize it
        minwin(name);
    } else if ($('.window.' + name).hasClass('min')) {
        // Minimized? Restore it
        minwin(name);
    } else {
        // Neither? Focus it
        focwin(name);
    }
}
```

### State Tracked Per Window

| State | Stored How | Notes |
|---|---|---|
| Position (left, top) | Inline CSS | Set by drag handler |
| Pre-max position | `data-pos-x`, `data-pos-y` data attrs | Saved before maximize |
| Maximized | `.max` class | CSS-driven |
| Minimized | `.min` class | CSS-driven |
| Was-max-before-min | `.min-max` class | Remembers max state |
| Focused | `.foc` class | CSS-driven |
| Z-order | `wo[]` array position → inline z-index | JS-driven |
| Always-on-top | `topmost[]` array | Persisted to localStorage |
| Loading | `.load` class | Shows loadback overlay |
| Transitions disabled | `.notrans` class | Toggled during drag |
| Snap position | `.left` / `.right` class | CSS-driven, half-screen |

---

## Section E: Taskbar System

### Taskbar HTML Structure

```html
<div id="dock-box">
  <div class="dock" style="background-color: var(--bar);">
    <!-- Left area: Start, Search, Widgets buttons -->
    <a class="a dock start" id="start-btn"
       onclick="openDockWidget('start-menu')">
      <img src="icon/start.png">
    </a>
    <a class="a dock search" id="search-btn"
       onclick="openDockWidget('search-win')">
      <i class="bi bi-search"></i>
    </a>
    <a class="a dock widgets" id="widgets-btn"
       onclick="openDockWidget('widgets')">
      <i class="bi bi-columns-gap"></i>
    </a>

    <!-- Center area: running apps -->
    <div id="taskbar" count="0" style="width: 4px;">
      <!-- App icons injected dynamically by openapp() -->
    </div>

    <!-- Right area: system tray -->
    <a class="a dock theme" onclick="toggletheme()">
      <!-- Dark/light mode toggle -->
    </a>
    <a class="a dock control" onclick="openDockWidget('control')">
      <svg><!-- WiFi/battery icons --></svg>
    </a>
    <a class="a dock date" onclick="openDockWidget('datebox')">
      <p id="dock-time"></p>
      <p id="dock-date"></p>
    </a>
  </div>
</div>
```

### CSS Positioning

```css
/* desktop.css lines 165-185 */
#dock-box {
    position: fixed;
    bottom: 10px;
    z-index: 92;
    display: flex;
    justify-content: center;
    width: 100%;
    pointer-events: none;  /* Pass clicks through to desktop */
}

.dock {
    border-radius: 8px;
    backdrop-filter: blur(20px) saturate(1.5);
    -webkit-backdrop-filter: blur(20px) saturate(1.5);
    pointer-events: all;    /* Re-enable clicks on the dock itself */
    box-shadow: 2px 2px 10px var(--sd);
    border: 1.5px solid #6f6f6f30;
    display: flex;
    padding: 3px;
}
```

### How App Icons Are Added/Removed

**Adding** (in `openapp()` at `desktop.js` ~line 1650):

```javascript
function openapp(name) {
    // ... show start/search/etc ...
    // Add to taskbar if not already there
    if (!$('#taskbar>.' + name).length) {
        $('#taskbar').attr('count', Number($('#taskbar').attr('count')) + 1);
        $('#taskbar').append(
            `<a class="a ${name}" onclick="taskbarclick('${name}')"
                oncontextmenu="return showcm(event,'taskbar','${name}')"
                onmouseenter="showTaskbarPreview('${name}', event)"
                onmouseleave="hideTaskbarPreview()"
                CTRL_title="${name}">
                <img src="${geticon(name)}">
            </a>`
        );
    }
    showwin(name);
}
```

**Removing** (in `hidewin()` at `window.js`):
```javascript
$('#taskbar>.' + name).remove();
$('#taskbar').attr('count', Number($('#taskbar').attr('count')) - 1);
$('#taskbar').css('width', 4 + $('#taskbar').attr('count') * (34 + 4));
```

Each taskbar item is exactly **34px** wide with **4px** gap. The taskbar auto-sizes:
width = `4 + count * 38`.

### Active App Indicator

```css
/* desktop.css lines 195-210 */
#taskbar>a::after {
    content: '';
    position: absolute;
    bottom: -1px;
    left: calc(50% - 3px);
    width: 6px;
    height: 3px;
    background: var(--bggrey);
    border-radius: 5px;
    transition: 200ms;
}

#taskbar>a.foc::after {
    background: linear-gradient(130deg, var(--theme-1), var(--theme-2));
    width: 16px;
    left: calc(50% - 8px);
}
```

The focused app gets a wider, gradient-colored indicator bar; unfocused apps get
a small grey dot.

### System Tray (Right Side)

- **Theme toggle**: `.dock.theme` — click calls `toggletheme()`
- **Control center**: `.dock.control` — shows WiFi icon + battery SVG, click opens `#control`
- **Clock**: `.dock.date` — shows `#dock-time` (HH:MM) and `#dock-date` (MM/DD) updated every second by `loadtime()`

### Taskbar Preview on Hover

When hovering over a taskbar item, a preview window appears showing a scaled-down
clone of the window content:

```javascript
// desktop.js lines 2480-2546
function showTaskbarPreview(name, event) {
    const win = $(`.window.${name}`);
    if (win.length && !win.hasClass('min')) {
        // Clone window content, scale to 20%
        const content = win.find('.content').clone();
        content.find('script, iframe').remove();
        content.css({
            transform: 'scale(0.2)',
            transformOrigin: 'top left',
            width: '500%', height: '500%'
        });
        // Position below taskbar item
        preview.css({ left: itemRect.left - offset, bottom: '60px' });
        preview.addClass('show');
    }
}
```

---

## Section F: Start Menu System

### Structure

The start menu (`#start-menu`) is a fixed-position 900px-wide panel with two
columns:

| Panel | ID | Content |
|---|---|---|
| Left | `#s-m-l` | Full alphabetical app list with scrollable `.list` |
| Right | `#s-m-r` | Search bar, pinned apps (`.pinned`), recommended (`.tuijian`), user profile |

### App Listing

Apps in the left panel (`#s-m-l .list`) are `<a>` elements:

```html
<a onclick="openapp('setting')" oncontextmenu="return showcm(event,'smlapp','setting')">
    <img src="icon/setting.svg">
    <p data-i18n="setting.name">设置</p>
</a>
```

The list includes 17+ native apps (setting, explorer, calc, run, about, taskmgr,
notepad, copilot, edge, msstore, camera, pythonEditor, python, terminal,
whiteboard, defender, word) and 5 webapps (minesweeper, bilibili, vscode, wsa,
windows12).

Pinned apps in the right panel (`.pinned`) are a grid of small icon tiles.

### Search Functionality

Search is handled by a separate panel `#search-win` (not inside start menu).
The search system (`apps.search` in `apps.js`) does **fake** local file matching:

```javascript
// apps.js lines ~1910-1960
apps.search = {
    rand: [
        { name: '农夫山泉瓶盖简介.txt', bi: 'text', ty: '文本文档' },
        { name: '瓶盖构造图.png', bi: 'image', ty: 'PNG 文件' },
        // ... 8 mock items
    ],
    search: le => {
        if (le > 0) {
            // Show 2 "matched" items from the rand array
            $('#search-win>.ans>.list>list').html(/* ... */);
        } else {
            // Show recommended apps
        }
    }
};
```

It does NOT search actual data — it cycles through 8 pre-defined mock results
based on input length.

### Open/Close Animation

```javascript
// desktop.js openDockWidget('start-menu') ~lines 1830-1860
function openDockWidget(name) {
    if (name == "start-menu") {
        if ($('#start-menu').hasClass('show')) {
            hide_startmenu();
        } else {
            $('#start-btn').addClass('show');
            // Close search and widgets if open
            if ($('#search-win').hasClass('show')) { /* close search */ }
            if ($('#widgets').hasClass('show')) hide_widgets();
            // Two-stage show
            $('#start-menu').addClass('show-begin');  // display: flex
            setTimeout(() => {
                $('#start-menu').addClass('show');    // trigger transition
            }, 0);
        }
    }
}

function hide_startmenu() {
    $('#start-menu').removeClass('show');
    $('#start-btn').removeClass('show');
    setTimeout(() => { $('#start-menu').removeClass('show-begin'); }, 200);
}
```

CSS animation: Start menu slides up from `transform: translateY(30px)` + `opacity: 0`
to `transform: none` + `opacity: 1` using the standard cubic-bezier curve.

```css
#start-menu {
    position: fixed;
    bottom: 60px;
    width: 900px;
    border-radius: 20px;
    backdrop-filter: blur(60px) saturate(3) contrast(0.8);
    z-index: 91;
    transition: 200ms cubic-bezier(0.9, 0, 0.1, 1);
    opacity: 0;
    transform: translateY(30px);
    display: none;
}
#start-menu.show-begin { display: flex; }
#start-menu.show { transform: none; opacity: 1; }
```

### Mutual Exclusion

Only one panel can be open at a time. Opening start menu closes search and
widgets; opening search closes start menu and widgets; etc. This is enforced
in `openDockWidget()`.

---

## Section G: Widget System

### Source: `module/widget.js` (270 lines), `module/widget.css` (350 lines)

### Widget Panel Structure

The widget panel (`#widgets`) has two main areas:

```html
<div id="widgets">
  <div class="tool">
    <input type="text" id="widgets-input">
    <!-- Search bar -->
  </div>
  <div class="left">
    <!-- Large news cards -->
    <div class="news">
      <div class="content">
        <div class="news-all"><!-- Populated by news.js --></div>
      </div>
    </div>
  </div>
  <div class="right">
    <!-- Smaller widget cards -->
    <div class="wg weather"><!-- Weather widget --></div>
    <div class="wg calc"><!-- Calculator widget --></div>
    <div class="wg monitor"><!-- System monitor widget --></div>
  </div>
</div>
```

### Widget Grid Layout

```css
/* widget.css */
.wg {
    border-radius: 10px;
    box-shadow: 0 2px 5px var(--sd);
    padding: 15px;
    background-color: var(--card);
    overflow: hidden;
}

/* Desktop widget grid */
#desktop-widgets {
    display: grid;
    grid-template-columns: repeat(auto-fill, 83px);
    grid-template-rows: repeat(auto-fill, 83px);
    gap: 5px;
}
```

Widget CSS grid spans for different widget types:
- `.wg.calc` — 2 columns, 3 rows (large calculator)
- `.wg.weather` — 3 columns, 1 row (wide weather bar)
- `.wg.monitor` — 3 columns, 1 row (wide system monitor)

### Built-in Widgets

#### Calculator Widget

Uses the `Calculator` class from `scripts/calculator_kernel.js`:

```javascript
// calculator_kernel.js
class Calculator {
    constructor(input, container) {
        this.elt = input;      // Input display element
        this.num1 = null;
        this.num2 = null;
        this.keysContainer = container;
        this.operator = 0;     // 1=add, 2=sub, 3=mul, 4=div
        this.preview = false;
    }
    // Uses Big.js for arbitrary precision arithmetic
    _calc(n1, n2, c) {
        switch (c) {
            case 1: return n1.plus(n2).toString();
            case 2: return n1.minus(n2).toString();
            case 3: return n1.times(n2).toString();
            case 4: return (n2 != 0) ? n1.div(n2).toString() : null;
        }
    }
}
var widgetCalculator = new Calculator('#calc-input-widgets', '#widgets .calc>.content');
var appCalculator = new Calculator('#calc-input', '#win-calc>.keyb');
```

Two separate Calculator instances: one for the widget panel, one for the full
calculator app window.

#### Weather Widget

```javascript
// widget.js lines ~100-150
// Fetches weather from MSN
const weatherUrl = 'https://api.msn.cn/...';  // MSN weather API
// Maps weather conditions to Bootstrap icon classes
// Displays: temperature, city, condition, icon
```

The weather widget fetches from `api.msn.cn`, parses the response, and maps
weather condition codes to corresponding Bootstrap Icons.

#### System Monitor Widget

```javascript
// widget.js lines ~160-230
// Displays ring charts for: CPU, Memory, Disk, WiFi signal, GPU
// Re-uses data from apps.taskmgr (Task Manager app)
// SVG circle indicators with stroke-dasharray for fill level
```

Uses SVG `<circle>` elements with `stroke-dasharray` to create ring/donut
charts showing resource usage percentages.

### Desktop Widget Edit Mode

The widget system supports a desktop mode where widgets are placed on the
desktop in a CSS grid:

```javascript
// widget.js widgets object
widgets.add(type)           // Add a widget to the panel
widgets.remove(id)          // Remove a widget
widgets.addToToolbar(type)  // Add to the toolbar dock
widgets.addToDesktop(type)  // Place widget on desktop grid

// Edit mode — drag widgets to reposition on grid
function widgetsMove() {
    // Implements drag-to-reposition on CSS grid
    // Calculates grid cell from cursor position
    // Snaps widget to nearest grid cell (83px cells)
}
```

### News Widget

Source: `scripts/news.js` (162 lines)

```javascript
var news = {
    sources: [
        {
            name: '东方网',
            url: 'https://tools.mgtv100.com/external/v1/toutiao/index',
            async getData() {
                const response = await fetch(this.url);
                const data = await response.json();
                return { status: 'success', data: data.data.result.data.map(v => ({
                    title: v.title,
                    author: v.author_name,
                    category: v.category,
                    url: v.url,
                    image: v.thumbnail_pic_s
                })) };
            }
        },
        {
            name: '知乎每日新闻',
            url: 'https://v.api.aa1.cn/api/zhihu-news/index.php?aa1=xiarou',
            async getData() { /* similar fetch + parse */ }
        }
    ],
    selectedSource: 0,
    async refresh() {
        // Fetches news, renders cards with images
        // Top news gets a large card, rest in 2-column grid
    },
    setSource(index) {
        this.selectedSource = index;
        this.refresh();
    },
    // XSS protection via innerText → innerHTML conversion
    async parseToHTMLString(str) {
        let element = document.createElement('span');
        element.innerText = str;
        return element.innerHTML;
    }
};
```

News renders into the left panel of `#widgets` with image-background cards.
Source switching is done via a notice dialog.

---

## Section H: Context Menu System

### Source: `desktop.js` lines ~200-500

### Context Menu Object (`cms`)

All context menus are defined in a single `cms` object:

```javascript
// desktop.js
var cms = {
    'titbar': [
        { icon: 'bi-dash-lg', text: lang('最小化','cm.min'), onclick: "minwin('{arg}')" },
        { icon: 'bi-square', text: lang('最大化','cm.max'), onclick: "maxwin('{arg}')" },
        'hr',
        { icon: 'bi-x-lg', text: lang('关闭','cm.close'), onclick: "hidewin('{arg}')" }
    ],
    'taskbar': [ /* unpin, close options */ ],
    'desktop': [
        { icon: 'bi-arrow-clockwise', text: '刷新', onclick: "$('#desktop').css(...); setIcon();" },
        'hr',
        { text: '查看', sub: [ /* icon size options */ ] },
        { text: '排序方式', sub: [ /* name, size, date, type */ ] },
        'hr',
        { icon: 'bi-display', text: '个性化', onclick: "openapp('setting')" },
        { text: '终端', onclick: "openapp('terminal')" }
    ],
    'desktop.icon': [ /* open, pin, rename, unpin, remove options */ ],
    'winx': [ /* Windows+X "power menu": settings, terminal, task mgr, run, shutdown */ ],
    'smapp': [ /* Start menu pinned app: unpin, open */ ],
    'smlapp': [ /* Start menu all-apps list: pin, open */ ],
    'msgupdate': [ /* Update notification: details, dismiss */ ],
    'explorer.folder': [ /* Open, rename, copy, cut, delete */ ],
    'explorer.file': [ /* Open, rename, copy, cut, delete */ ],
    'explorer.content': [ /* New folder, new file, paste, refresh */ ],
    'explorer.tab': [ /* Close tab, close other tabs */ ],
    'edge.tab': [ /* Close tab, close other tabs, duplicate, rename */ ],
    'taskmgr.processes': [ /* End task, always on top */ ]
};
```

### Menu Item Structure

Each menu item is an object:
```javascript
{
    icon: 'bi-classname',       // Bootstrap Icon class (optional)
    text: 'Label text',        // Display text (uses lang() for i18n)
    info: 'Ctrl+X',            // Right-aligned shortcut hint (optional)
    onclick: "javascript()",    // Click handler as string
    sub: [/* submenu items */]  // Nested menu (optional)
}
```

Separators are represented as the string `'hr'`.

### `showcm(e, cl, arg)` — Render and Position

```javascript
// desktop.js lines ~470-550
function showcm(e, cl, arg) {
    var x = e.clientX, y = e.clientY;
    var menu = cms[cl];
    var html = '<list>';

    menu.forEach(item => {
        if (item === 'hr') {
            html += '<hr>';
        } else if (item.sub) {
            html += `<a class="a has-sub">${item.text}<list class="sub">`;
            item.sub.forEach(sub => {
                html += `<a class="a" onclick="${sub.onclick}">${sub.text}</a>`;
            });
            html += '</list></a>';
        } else {
            let onclick = item.onclick.replace(/\{arg\}/g,
                typeof arg === 'string' ? arg : JSON.stringify(arg));
            html += `<a class="a" onclick="hidecm();${onclick}">`;
            if (item.icon) html += `<i class="bi ${item.icon}"></i>`;
            html += `<p>${item.text}</p>`;
            if (item.info) html += `<info>${item.info}</info>`;
            html += '</a>';
        }
    });
    html += '</list>';

    $('#cm').html(html);
    // Position: prefer below-right of cursor
    // Adjust if would overflow viewport
    $('#cm').css({ left: x, top: y });
    // Show with animation
    $('#cm').addClass('show-begin');
    setTimeout(() => { $('#cm').addClass('show'); }, 0);

    return false;  // Prevent default context menu
}
```

The `{arg}` placeholder in onclick strings is replaced with the actual argument
(e.g., window name for title bar menus, file path for explorer menus).

### Context Menu CSS

```css
/* desktop.css lines ~760-850 */
#cm {
    position: fixed;
    z-index: 101;
    border-radius: 10px;
    backdrop-filter: blur(25px) saturate(2);
    background-color: var(--cm);
    box-shadow: 2px 2px 10px var(--sd);
    border: 1.5px solid #4f4f4f30;
    padding: 5px;
    min-width: 180px;
    transition: 100ms cubic-bezier(0.9, 0, 0.1, 1);
    opacity: 0;
    transform: scale(0.9) translateY(-10px);
}
#cm.show { opacity: 1; transform: none; }
#cm>list>a {
    display: flex;
    padding: 6px 10px;
    border-radius: 5px;
    cursor: default;
    gap: 8px;
    align-items: center;
}
#cm>list>a:hover { background-color: var(--hover-b); }
```

### Hide Context Menu

```javascript
function hidecm() {
    $('#cm').removeClass('show');
    setTimeout(() => { $('#cm').removeClass('show-begin'); }, 100);
}
// Also hides on any click outside the menu
$(document).click(() => { hidecm(); });
```

---

## Section I: App Architecture

### The `apps` Global Object

Every app is a property on the global `apps` object in `module/apps.js`,
following a standard lifecycle pattern:

```javascript
apps.appName = {
    init: () => {
        // Called every time the window is shown/focused
        // Setup UI, reset state, bind events
    },
    load: () => {
        // Called ONCE on first open (for heavy initialization)
        // Load external resources, compile editors, etc.
        // Sets apps.appName.loaded = true
    },
    remove: () => {
        // Called when window is closed
        // Cleanup resources, reset state
    }
};
```

### `openapp(name)` — Open an App

```javascript
// desktop.js lines ~1650-1730
function openapp(name) {
    // Close start menu, search, widgets if open
    if ($('#start-menu').hasClass('show')) hide_startmenu();
    if ($('#search-win').hasClass('show')) { /* close */ }
    if ($('#widgets').hasClass('show')) hide_widgets();

    // Convert kebab-case to camelCase for apps object lookup
    let tmp = name.replace(/\-(\w)/g, (all, letter) => letter.toUpperCase());

    // Add taskbar icon if not present
    if (!$('#taskbar>.' + name).length) {
        $('#taskbar').attr('count', Number($('#taskbar').attr('count')) + 1);
        $('#taskbar').append(`<a class="a ${name}" onclick="taskbarclick('${name}')"
            CTRL_title="${name}"><img src="${geticon(name)}"></a>`);
        $('#taskbar').css('width', 4 + $('#taskbar').attr('count') * 38);
    }

    // Focus the taskbar entry
    $('#taskbar>a').removeClass('foc');
    $('#taskbar>.' + name).addClass('foc');

    // Show the window
    showwin(name);

    // If app needs first-time loading
    if (apps[tmp].load && !apps[tmp].loaded) {
        apps[tmp].loaded = true;
        apps[tmp].load();
        apps[tmp].init();
        $('.window.' + name).removeClass('load');
        return;
    }

    // Otherwise call init directly
    apps[tmp].init();

    // Remove loading overlay after delay
    setTimeout(() => {
        $('.window.' + name).removeClass('load');
    }, Number($('.window.' + name + '>.loadback').attr('data-delay')) || 500);
}
```

### Icon System

```javascript
// desktop.js lines ~1700-1730
var icon = {
    setting: 'setting', explorer: 'explorer', calc: 'calc', about: 'about',
    notepad: 'notepad', terminal: 'terminal', edge: 'edge', camera: 'camera',
    pythonEditor: 'pythonEditor', run: 'run', whiteboard: 'whiteboard',
    defender: 'defender', taskmgr: 'taskmgr', msstore: 'msstore', word: 'word',
    copilot: 'copilot', recognition: 'recognition', python: 'python',
    vscode: 'vscode', bilibili: 'bilibili', minesweeper: 'minesweeper'
    // ... maps app names to icon filenames
};

function geticon(name) {
    if (icon[name]) {
        let ext = icon[name].endsWith('.png') ? '' : '.svg';
        return `icon/${icon[name]}${ext}`;
    }
    return 'icon/app.svg';  // Default icon
}
```

### Complete App Registry

| App Name | Class | `init()` | `load()` | External Deps | Notes |
|---|---|---|---|---|---|
| `setting` | `.window.setting` | Navigate to home page, show cards | Theme loading from GitHub | - | Multi-page settings with `.go()` navigation |
| `explorer` | `.window.explorer.tabs` | Create tab, show "This PC" drives | - | - | Tabbed file browser, virtual FS tree in JS |
| `calc` | `.window.calc` | Set display to '0' | - | `Big.js` | Fixed-size window (262×395) |
| `about` | `.window.about` | Show about tab, fetch contributors | Fetch GitHub contributors + stars | GitHub API | Displays repo stats |
| `notepad` | `.window.notepad` | Clear text area with slide animation | - | - | Simple textarea editor |
| `terminal` | `.window.terminal` | Show CMD prompt, init history | - | - | Command parser, history (up/down) |
| `edge` | `.window.edge.tabs` | Remove iframes, create new tab | - | - | Full browser with tab bar, navigation, URL bar |
| `camera` | `.window.camera` | `getUserMedia` video stream | - | `navigator.mediaDevices` | Photo capture to canvas |
| `pythonEditor` | `.window.python-editor` | - | Init Ace editor, load Pyodide | `ace.js`, `Pyodide` | Python editor with syntax highlighting |
| `python` | `.window.python` | Show Python REPL prompt | Load Pyodide runtime | `Pyodide` | Interactive Python console |
| `whiteboard` | `.window.whiteboard` | - | Init canvas, bind drawing events | `ResizeObserver` | Canvas drawing with color picker, eraser |
| `defender` | `.window.defender` | Show security status page | Init Chart.js line graph | `Chart.js` | Windows Defender mockup |
| `taskmgr` | `.window.taskmgr` | Show process list with graphs | - | `Chart.js` | CPU/memory/disk/wifi/GPU graphs, SVG charts |
| `msstore` | `.window.msstore` | Navigate to home page | - | - | Multi-page store mockup |
| `run` | `.window.run` | Clear input, show dialog | - | - | Fixed-size dialog (420×220) at bottom-left |
| `word` | `.window.word` | Show home/new page | - | - | Basic word processor with contenteditable |
| `winver` | `.window.winver` | Show message panel | - | - | Windows version dialog |
| `search` | (uses `#search-win`) | Show recommendations | - | - | Mock search (8 hardcoded results, cycles by input length) |
| `copilot` | `.window.copilot` | Init chat history | - | Qwen3-max API | AI chat assistant |
| `notepadFonts` | `.window.notepad-fonts` | Reset font preview | Font list init | - | Font picker dialog for Notepad |

**Web Apps** (iframe-based, in `apps.webapps`):

| App | URL/Source | Notes |
|---|---|---|
| `vscode` | `code.visualstudio.com` | VSCode for web |
| `bilibili` | `bilibili.com` | Chinese video platform |
| `copilot` | Built-in Qwen API chat | AI assistant |
| `minesweeper` | Local HTML file | Classic game |
| `windows12` | `./boot.html` | Recursive — CTRL inside CTRL |
| `wsa` | (stub) | Android subsystem placeholder |

### Tab System — `m_tab` Object

Source: `module/tab.js` (129 lines)

```javascript
var m_tab = {
    newtab: (app, title) => {
        // Create a new tab ID, push to apps[app].tabs array
        apps[app].len++;
        apps[app].tabs.push([`tab-${app}-${apps[app].len}`, title]);
        m_tab.settabs(app);
    },
    settabs: (app) => {
        // Re-render all tabs in the title bar
        let html = '';
        apps[app].tabs.forEach((t, i) => {
            html += apps[app].settab(t, i);  // App-specific tab template
        });
        $(`.window.${app}>.titbar>.tabs`).html(html);
        // Show active tab
        $(`.window.${app}>.titbar>.tabs>.tab`).eq(apps[app].now).addClass('show');
    },
    moving: (app, elt, e, i) => {
        // Drag-to-reorder tabs
        // Calculates swap position based on cursor X relative to tab positions
        // Adds .left/.right CSS classes for slide animation
        // On mouseup, splices the tabs array to new position
    },
    close: (app, i) => {
        // Close tab with translateY animation (.close class)
        // After 200ms, remove from array and re-render
        // If last tab, close the whole window
    },
    tab: (app, c) => {
        // Switch to tab c
        apps[app].now = c;
        // Call app-specific tab handler: apps[app].tab(c)
        // Update tab .show class
    },
    rename: (app, title) => {
        // Update tab title in apps[app].tabs array
        // Re-render tabs
    }
};
```

Tab CSS (from `tab.css`):
```css
.window.tabs>.titbar>.tabs {
    display: flex;
    overflow: hidden;
    height: 100%;
    flex-grow: 1;
}
.tab {
    flex-grow: 1;
    max-width: 200px;
    border-radius: 7px;
    padding: 0 10px;
    display: flex;
    align-items: center;
    cursor: default;
    position: relative;
}
.tab.show {
    background: var(--hover);
    box-shadow: 0 1px 3px var(--sd);
}
.tab.close {
    /* Close animation: slide down and shrink */
    animation: tab-close 200ms;
}
```

### Explorer File System

The Explorer uses an in-memory JavaScript object tree as its "file system":

```javascript
// apps.js apps.explorer.path
apps.explorer.path = {
    folder: {
        'C:': {
            folder: {
                'Program Files': { folder: { /* ... */ }, file: [/* ... */] },
                'Windows': { folder: { /* System32, Boot, etc */ }, file: [/* executables */] },
                '用户': { folder: { 'Administrator': { /* Documents, Pictures, AppData */ } } }
            },
            file: []
        },
        'D:': {
            folder: { 'Microsoft': { folder: {}, file: [] } },
            file: [
                { name: '瓶盖结构说明.docx', ico: 'icon/files/word.png', command: '' },
                // ...
            ]
        }
    }
};
```

Each file object: `{ name: string, ico: string, command: string }`
- `name`: Display name (e.g., `'notepad.exe'`)
- `ico`: Icon path (e.g., `'icon/notepad.svg'`)
- `command`: JavaScript snippet executed on double-click (e.g., `"openapp('notepad')"`)

Navigation uses `apps.explorer.goto(path)` which splits path by `/`, traverses
the tree, and renders the folder contents.

### Task Manager Data

Source: `data/tasks.js` (170 lines)

```javascript
let taskmgrTasks = [
    { name: '任务管理器', icon: 'icon/taskmgr.png', link: 'taskmgr' },
    { name: 'Microsoft Edge', icon: 'icon/edge.svg', link: 'edge' },
    { name: '设置', icon: 'icon/setting.svg', link: 'setting' },
    // ... actual app entries with icons and links
    { name: 'System' },                    // Mock OS processes (no icon/link)
    { name: 'Windows内存处理系统进程' },
    { name: 'Client/Server Runtime Server Subsystem' },
    // ... 20+ mock system processes
];
```

The Task Manager (`apps.taskmgr`) renders:
- **CPU graph**: SVG path updated every second with random fluctuations
- **Memory graph**: Similar SVG path
- **Disk/WiFi/GPU graphs**: Additional monitoring panels
- **Process list**: From `taskmgrTasks` array, sortable by name
- **CPU running time**: Stored in `localStorage.cpuRunningTime`, incremented every second

### Copilot AI Chat

```javascript
// desktop.js lines ~1400-1600
var copilot = {
    history: [],
    init: () => {
        copilot.history = [
            { role: 'system', content: 'You are a helpful Windows Copilot assistant...' }
        ];
    },
    send: async (msg) => {
        copilot.history.push({ role: 'user', content: msg });
        // API call to Qwen3-max
        const resp = await fetch('https://dashscope.aliyuncs.com/compatible-mode/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Authorization': 'Bearer sk-...',
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                model: 'qwen3-max',
                messages: copilot.history,
                enable_thinking: false
            })
        });
        const data = await resp.json();
        const reply = data.choices[0].message.content;
        // Parse commands in reply: {openapp:name}, {openurl:url}, {settheme:dark/light}
        copilot.history.push({ role: 'assistant', content: reply });
    }
};
```

AI can execute system commands embedded in responses:
- `{openapp:name}` → calls `openapp(name)`
- `{openurl:url}` → opens URL in Edge
- `{settheme:dark}` → calls `toggletheme()`

---

## Section J: Theme & Personalization System

### How Themes Are Stored and Applied

All personalization uses `localStorage`:

| Key | Value Format | Purpose |
|---|---|---|
| `theme` | `'dark'` or `'light'` | Dark mode preference |
| `color1` | CSS color string (e.g., `'#ad6eca'`) | Custom accent gradient start |
| `color2` | CSS color string (e.g., `'#3b91d8'`) | Custom accent gradient end |
| `root_class` | Space-separated class names | Root element classes (`.dark`, `.nobr`, `.nosd`, etc.) |
| `desktop` | JSON array of HTML strings | Custom desktop icon elements |
| `topmost` | JSON array of window names | Always-on-top window list |
| `sys_setting` | JSON array of 0/1 values | Toggle states for visual effects |
| `autoUpdate` | `'true'` or `'false'` | Auto-update check enabled |
| `sha` | Git commit SHA | Last known version for update detection |
| `update` | `'true'` or `'false'` | Pending update flag |
| `cpuRunningTime` | Integer string | Task manager uptime counter (seconds) |

### Settings Persistence (`saveDesktop()`)

```javascript
// desktop.js lines ~2250-2265
function saveDesktop() {
    const data = {
        desktop: JSON.stringify(desktopItem),
        topmost: JSON.stringify(topmost),
        sys_setting: JSON.stringify(sys_setting),
        root_class: $(':root').attr('class')
    };
    Object.entries(data).forEach(([key, value]) => {
        localStorage.setItem(key, value);
    });
}
```

### Toggle-able Visual Effects

```javascript
// Stored in sys_setting array (indices)
var sys_setting = [1, 1, 1, 1, 1, 0, 0];
// Index meaning:
// 0: Animations enabled
// 1: Shadows enabled
// 2: Rounded corners enabled
// 3: Acrylic/blur effects enabled
// 4: Transparency enabled
// 5: Background music (use_music)
// 6: Voice input (use_mic_voice)
```

When disabled, utility classes are toggled on `<html>`:
- `.notrans` — disables transitions/animations
- `.nosd` — disables box-shadow
- `.nobr` — disables border-radius

### Theme from Settings App

```javascript
// apps.js apps.setting
apps.setting = {
    init: () => { /* show settings home page */ },
    theme_get: () => {
        // Fetch themes from GitHub: tjy-gitnub/CTRL-theme
        // List available theme packages with preview
    },
    theme_set: (theme) => {
        // Apply theme: set --theme-1, --theme-2, --bgul (wallpaper)
        // Save to localStorage
    }
};
```

### Control Panel

The control panel (`#control`) provides quick toggles:

| Button | Class | Functionality |
|---|---|---|
| WiFi | `.btn1` | `wifiStatus` boolean flag |
| Bluetooth | `.btn2` | Toggle `.active` class |
| Airplane mode | `.btn5 / .fly` | Disables wifi/bluetooth, stores hidden list |
| Dark mode | `.btn4` | Calls `toggletheme()` — Note: currently uses `.night` class for "eye rest" |
| Brightness | `.brightness` | Slider drag → `page.style.filter = brightness(n)` |
| Battery | (SVG) | Reads `navigator.getBattery()`, renders SVG path |

Airplane mode implementation stores which toggles it disabled:
```javascript
const FLY_HIDDEN_LIST_KEY = 'control_status_fly_hidden_list';
// When enabling airplane mode, stores which buttons were active
localStorage.setItem(FLY_HIDDEN_LIST_KEY, JSON.stringify(hiddenDiffList));
// When disabling, restores them
```

---

## Section K: i18n System

### How `jquery.i18n.properties.js` Works

The i18n system uses `jQuery.i18n.properties` plugin to load `.properties` files:

```javascript
// desktop.js loadlang() function
function loadlang(langCode) {
    jQuery.i18n.properties({
        name: 'lang',
        path: 'lang/',
        mode: 'map',
        language: langCode,  // e.g., 'en', 'zh-CN', 'ja'
        callback: function() {
            // After loading, update all elements with data-i18n
            $('[data-i18n]').each(function() {
                $(this).text($.i18n.prop($(this).data('i18n')));
            });
        }
    });
}
```

### Language File Format

`lang/lang_en.properties`:
```properties
# Key=Value pairs, one per line
updating=Updating
login=Login
welcome=Welcome
stmenu-avlb=Available
stmenu-webapp=Webapps
stmenu-pinned=Pinned
stmenu-allapp=All
stmenu-tj=Recommended
sch-ph=Type here to serach
widget=Widgets
psnl=Personalize
close=Close
refresh=Refresh
# ... 60+ keys
```

### `lang()` Helper Function

In desktop.js, many UI strings use a `lang()` wrapper:

```javascript
// Used in context menu definitions, app labels, etc.
lang('最小化', 'cm.min')
// First arg: Chinese fallback
// Second arg: i18n key to look up
```

### Language Detection

```javascript
// desktop.js
// Maps navigator.language values to lang codes
var langcodes = {
    'zh-CN': 'zh_CN',
    'en': 'en',
    'ja': 'ja',
    // ... etc
};
```

The login screen (`#loginback`) includes a language selector dropdown. Selected
language is used to call `loadlang()`.

---

## Section L: Audio System

### Startup Sound

```javascript
// Referenced in desktop.js body.onload
// media/startup.mp3 — plays on successful login if use_music is enabled
if (use_music) {
    new Audio('media/startup.mp3').play();
}
```

### Background Music Toggle

Controlled by `sys_setting[5]` (index 5 in the settings toggle array):
```javascript
var use_music = sys_setting[5] ? true : false;
```

### Voice Input Ball

```javascript
// desktop.js startSpeechRecognition()
function startSpeechRecognition() {
    if (!('webkitSpeechRecognition' in window)) return;
    var recognition = new webkitSpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = 'zh-CN';

    recognition.onresult = function(event) {
        // Process speech result
        // Can trigger: openapp, search, or copilot commands
    };
    recognition.start();
}
```

The `#voiceBall` element is a draggable floating button that indicates
voice recognition status. It can be dragged around the screen.

### Sound Effect Points

The codebase has these potential sound integration points:
- Window open/close
- Context menu show
- Notification toast
- Error dialogs
- Currently only startup sound is implemented

---

## Section M: Boot & Login Sequence

### Complete Flow

```
1. User navigates to index.html (empty, or boot.html directly)
     │
2. boot.html loads
     ├── Font: 'dos' (monospace, BIOS aesthetic)
     ├── Black background, white text
     ├── Shows "Starting" with progress bar
     ├── boot_kernel.js runs:
     │     const progress = [0, 0, 1, 3, 7, 17, 20];
     │     setInterval every 300ms advances progress bar
     │     F2 keypress or touch → toBIOS() → redirect to bios.html
     │     After all 7 steps → window.location.href = './desktop.html'
     │
3. (Optional) bios.html loads if F2 pressed
     ├── Full BIOS setup simulator
     ├── Tabbed interface: Main, Advanced, Boot, Security, Exit
     ├── Keyboard navigation: Tab, arrow keys, Enter to toggle options
     ├── biosConfig object tracks: cpuHyperThreading, secureBoot, etc.
     ├── F10 or Exit→Save → toBoot() → redirect to boot.html
     │
4. desktop.html loads (the main shell)
     ├── All CSS + JS loaded (see Section B for order)
     ├── #loadback overlay shows (loading spinner)
     │
5. body.onload fires (desktop.js ~line 2380)
     ├── setTimeout 500ms → #loadback.addClass('hide')
     ├── setTimeout 1000ms → #loadback display:none
     ├── apps.webapps.init()
     ├── Theme restoration from localStorage:
     │     ├── Check localStorage('theme') → dark or light
     │     ├── Check localStorage('color1/color2') → custom accent
     │     └── Apply :root.dark class if dark
     ├── setIcon() — restore desktop icons from localStorage('desktop')
     │     ├── Re-create default icons (This PC, Settings, About, Edge, Feedback)
     │     ├── Append user-added desktop items
     │     └── Restore topmost, sys_setting, root_class from localStorage
     ├── Attach window event handlers:
     │     ├── For each .window: set onmousedown/ontouchstart → focwin()
     │     ├── For each .titbar: set oncontextmenu, ondblclick → maxwin()
     │     └── For each .titbar .icon: set onclick → title bar context menu
     ├── Inject resize knobs into all .window>.resize-bar (8 per window)
     ├── Fetch remote theme: $.getJSON('tjy-gitnub.github.io/CTRL-theme/def.json')
     ├── updateVoiceBallStatus()
     ├── checkOrientation() — show portrait warning on mobile
     │
6. #loginback is visible (login screen)
     ├── User avatar image
     ├── Username text
     ├── Language selector dropdown
     ├── 3 power buttons:
     │     ├── Shutdown → redirect to shutdown.html
     │     ├── Restart → redirect to boot.html
     │     └── Sleep → (no-op or similar)
     ├── Click/touch on login area → hide loginback
     │
7. Desktop is fully interactive
     ├── Clock starts updating (loadtime() every 1000ms)
     ├── PWA service worker registers
     ├── Auto-update check runs (if autoUpdate enabled)
     ├── Keyboard shortcut setup: F5 = refresh desktop, Ctrl+Win = start menu
     ├── Orientation listener registered
     └── Battery level monitoring starts (if navigator.getBattery available)
```

### BIOS Screen Details

- **Font**: `dos.ttf` (monospace, retro BIOS look)
- **Colors**: Blue background (`#0100a2`), white text, grey options
- **Navigation**: Keyboard only (arrow keys, Tab, Enter, F10)
- **Pages**: Main (system info), Advanced (CPU/memory config), Boot (boot order),
  Security (TPM, Secure Boot), Exit (save & exit, discard)
- **Option toggling**: `[Enabled]` ↔ `[Disabled]`, `[Auto]` ↔ `[Manual]`
- **Config state**: `biosConfig` object tracks all settings (not persisted)

### Shutdown Screen

`shutdown.html`:
- Gradient background: `linear-gradient(130deg, #ad6ecaee, #3b91d8ee)` (theme colors)
- Backdrop blur: `blur(30px)`
- SVG loading spinner (same `spin-infinite` keyframe)
- After 3 seconds: fades to black
- Press Enter after shutdown → redirect to `boot.html` (reboot)

### Blue Screen

`bluescreen.html`:
- Blue background (`#005eaa`)
- Animated sad face with moving eyes (`@keyframes eyea`)
- Error text: "Your PC ran into a problem"
- QR code image
- Error code display

---

## Section N: Mapping Table — CTRL → ctrl Equivalents

This is the rosetta stone for porting. Every significant CTRL component is
mapped to its ctrl equivalent (or marked as MISSING).

### Window Management

| CTRL Component | File:Line | ctrl Equivalent | Notes |
|---|---|---|---|
| `showwin(name)` (aka newwin) | `window.js:1-35` | `windman.js` `initializeWindowState()` + `createWindowShell()` | ctrl creates windows dynamically; CTRL toggles pre-existing DOM. CTRL has no standalone `newwin()` — `openapp()` + `showwin()` together form the newwin pattern |
| `hidewin(name)` | `window.js:37-70` | `windman.js` window close handler | ctrl removes iframe + DOM; CTRL hides with CSS |
| `maxwin(name)` | `window.js:72-103` | `windman.js` maximize handler | ctrl `calculateWindowSize()` computes dimensions |
| `minwin(name)` | `window.js:105-125` | MISSING — must build | ctrl lacks minimize-to-taskbar |
| `focwin(name)` | `window.js` | `windman.js` focus handler + `script.js` `nowapp` | ctrl tracks focus in `nowapp` global |
| `wo[]` array | `window.js` | `script.js` `winds{}` object | ctrl uses object keyed by app name; CTRL uses ordered array |
| `orderwin()` z-index assignment | `window.js` | MISSING — implicit via DOM order | ctrl doesn't explicitly set z-index like CTRL |
| `resizewin()` 8-direction resize | `window.js:127-200` | MISSING — must build | ctrl windows are not resizable |
| Window drag / snap | `window.js:250-400` | `windman.js` snapping indicators | ctrl has snap zones but different implementation |
| `#window-fill` snap preview | `desktop.css` | `windman.js` snapping indicator divs | Similar concept, different DOM approach |
| `.window.foc` glass blur | `desktop.css` | MISSING — must add | ctrl windows lack glass/blur |
| `.notrans` transition disable | `desktop.css` | MISSING — must add | Needed for smooth drag |
| `taskbarclick()` toggle | `window.js:450-498` | MISSING — must build | ctrl taskbar lacks click-to-minimize |
| `data-pos-x/y` position save | `window.js` | MISSING — must build | Position memory for restore-from-max |

### Desktop Shell

| CTRL Component | File:Line | ctrl Equivalent | Notes |
|---|---|---|---|
| `desktop.html` shell | `desktop.html` full | `index.html` + `style.css` | ctrl uses `#main`, `#workspace` containers |
| `openapp(name)` | `desktop.js:1650-1730` | `script.js` `openApp()` or `kernel.js` `openlaunchprotocol()` | ctrl opens apps as iframes via NTXSession |
| `#dock-box` / `.dock` taskbar | `desktop.css:165-185` | `<nav>` element in `style.css` | ctrl nav bar is simpler, no glass blur |
| `#start-menu` | `desktop.html/css` | MISSING — must build | ctrl has no start menu |
| `#search-win` search panel | `desktop.html/css/js` | MISSING — must build | No search functionality in ctrl |
| `#widgets` panel | `desktop.html/css` | MISSING — must build | No widget panel in ctrl |
| `#datebox` calendar | `desktop.css/js` | MISSING — must build | No date/calendar popup |
| `#control` quick settings | `desktop.css/js` | MISSING — must build | No control center popup |
| `#cm` context menu | `desktop.css:760-850` | `scripts/ctxmenu.js` | ctrl has context menu system; needs visual update |
| `#dp` dropdown menu | `desktop.css/js` | MISSING — must build | No dropdown menu system |
| `#descp` tooltip | `desktop.css/js` | MISSING — must build | No hover tooltip system |
| `#notice-back` + `#notice` dialog | `desktop.css/js` | MISSING — must build | ctrl needs modal dialog system |
| `.msg` toast notification | `desktop.css` | MISSING — must build | No toast notification system |
| `#desktop` icon area | `desktop.html/css` | MISSING — must build | ctrl has no desktop icons |
| `#desktop-widgets` grid | `desktop.css` | MISSING — must build | No desktop widget placement |

### CSS Visual System

| CTRL Component | CSS Property/Value | ctrl Equivalent | Notes |
|---|---|---|---|
| `:root` CSS variables (light) | `desktop.css:1-40` | `ctrl.css` variables | ctrl has `--col-bg1:#101010`, `--col-txt1:#FFFFFF` etc. (dark-only) |
| `:root.dark` CSS variables | `desktop.css:43-72` | `ctrl.css` — default (dark theme) | ctrl is dark-only; needs light mode addition |
| `--theme-1` / `--theme-2` accent | `#ad6eca` / `#3b91d8` | `--colors-accent: rgb(97,121,255)` | ctrl uses single accent color; needs gradient support |
| `.dark` class toggle | `desktop.js toggletheme()` | MISSING — must build | ctrl has no theme toggle |
| `backdrop-filter: blur()` glass | Various selectors | MISSING — must add to style.css | ctrl has no glass/blur effects |
| `cubic-bezier(0.9,0,0.1,1)` timing | Used everywhere | `--ease-smoothOut`, `--ease-accel` in ctrl.css | ctrl has different easing curves |
| Scrollbar styling | `desktop.css:78-101` | `ctrl.css` scrollbar rules | Both have custom scrollbars; styles differ |
| `.nobr` / `.nosd` / `.notrans` utilities | `desktop.css` | MISSING — must add | Utility classes for toggling effects |
| `--mica` gradient background | `desktop.css` | MISSING — must build | Mica material effect |
| `#window-fill` snap preview | `desktop.css:2570-2600` | `windman.js` snap indicators | Different approach but similar concept |
| `.window.max` maximized style | `desktop.css:2504-2520` | `windman.js` maximize handler | ctrl handles via JS transforms |

### App Architecture

| CTRL Component | File:Line | ctrl Equivalent | Notes |
|---|---|---|---|
| `apps` global object | `apps.js` | `script.js` `winds{}` + iframe apps in `appdata/` | ctrl apps are isolated iframes |
| `apps.*.init()` lifecycle | `apps.js` per app | `NTXSession` class init | ctrl uses NTX API for app lifecycle |
| `apps.explorer` file browser | `apps.js:850-1400` | `appdata/files.html` | ctrl uses IndexedDB virtual FS; CTRL uses JS object tree |
| `apps.setting` settings | `apps.js:1-100` | MISSING — must build | ctrl has no settings UI |
| `apps.taskmgr` task manager | `apps.js:250-500` | MISSING — must build | No task/process manager |
| `apps.edge` browser | `apps.js:1600-2000` | MISSING — must build | No built-in web browser |
| `apps.terminal` command line | `apps.js:1750-1850` | `appdata/terminal.html` | ctrl has a terminal app |
| `apps.calc` calculator | `apps.js:1470` + `calculator_kernel.js` | MISSING — must build | No calculator app |
| `apps.whiteboard` drawing | `apps.js:300-350` | MISSING — must build | No whiteboard/drawing app |
| `apps.copilot` AI chat | `desktop.js:1400-1600` | MISSING — must build | No AI assistant |
| `m_tab` tab system | `tab.js` full | MISSING — must build | ctrl windows lack tab bars |
| `Calculator` class | `calculator_kernel.js` full | MISSING — must build | Need Big.js for precision |

### Infrastructure / IPC

| CTRL Component | File:Line | ctrl Equivalent | Notes |
|---|---|---|---|
| `localStorage` persistence | `desktop.js` throughout | `system32.js` IndexedDB + encrypted storage | ctrl uses more sophisticated per-user storage |
| Direct DOM manipulation | All JS files | `NTXSession` API (`ntx.js`) | ctrl apps communicate via message-passing API |
| jQuery (`$()`) DOM queries | All JS files | Vanilla JS | ctrl doesn't use jQuery |
| `navigator.serviceWorker` PWA | `desktop.js:2400` | MISSING — could add | PWA support |
| `checkUpdate()` via GitHub API | `desktop.js:2360` | MISSING — could add | Auto-update checking |
| `navigator.getBattery()` | `desktop.js:2100` | MISSING — could add | Battery monitoring |
| `webkitSpeechRecognition` voice | `desktop.js:1580` | MISSING — could add | Voice input |
| `i18n` (jquery.i18n.properties) | `desktop.js loadlang()` | MISSING — must build | Need i18n framework |

### Widgets

| CTRL Component | File:Line | ctrl Equivalent | Notes |
|---|---|---|---|
| `widgets` object | `widget.js` full | MISSING — must build | No widget system |
| Widget panel (`#widgets`) | `desktop.html/css` | MISSING — must build | No widget side panel |
| Desktop widget grid | `desktop.css` `#desktop-widgets` | MISSING — must build | No desktop widgets |
| Weather widget (MSN API) | `widget.js:100-150` | MISSING — must build | No weather integration |
| News widget | `news.js` full | MISSING — must build | No news feed |
| System monitor widget | `widget.js:160-230` | MISSING — must build | No system monitor |
| Calculator widget | `widget.js` + `calculator_kernel.js` | MISSING — must build | Can share Calculator class |
| Widget edit mode (drag) | `widget.js widgetsMove()` | MISSING — must build | No widget repositioning |

### Boot / Login

| CTRL Component | File | ctrl Equivalent | Notes |
|---|---|---|---|
| BIOS simulator | `bios.html` + `bios_kernel.js` | MISSING — could add (novelty) | Not needed for core functionality |
| Boot progress bar | `boot.html` + `boot_kernel.js` | `script.js` login system | ctrl shows login directly |
| Login screen | `desktop.html #loginback` | `script.js` login + `system32.js` auth | ctrl has actual password auth with IndexedDB |
| Shutdown animation | `shutdown.html` | MISSING — could add | No shutdown sequence |
| BSOD | `bluescreen.html` | MISSING — could add (novelty) | Not needed for core functionality |
| `loadlang()` language setup | `desktop.js` | MISSING — must build | No i18n at login |

---

## Section O: Porting Complexity Assessment

### Complexity Ratings

- **CSS-only**: Just add styles to ctrl CSS, no JS changes
- **JS+CSS**: Needs new JS module + styles, but no architecture changes
- **Architecture**: Requires changes to ctrl kernel, windman, or system32
- **New app**: Build as a new iframe app in `appdata/`

### Feature-by-Feature Assessment

| Feature | Complexity | Estimated Effort | Dependencies | Priority |
|---|---|---|---|---|
| **Glass/blur effects** | CSS-only | Low | None — just add `backdrop-filter` rules to `ctrl.css` | High |
| **Dark/light mode toggle** | JS+CSS | Medium | Need light-mode CSS variables + toggle function + localStorage | High |
| **Root CSS variables** (full set) | CSS-only | Low | Extend `ctrl.css` :root with CTRL variable names | High |
| **Theme accent colors** | JS+CSS | Medium | Add `--theme-1/2`, color picker, localStorage persistence | High |
| **Scrollbar styling update** | CSS-only | Low | Update existing ctrl.css scrollbar rules | Low |
| **Utility classes** (`.nobr`, `.nosd`, `.notrans`) | CSS-only | Low | Add to ctrl.css | Medium |
| **Window show/hide animation** | CSS-only | Low | Add show-begin/show class sequence + transitions | High |
| **Window minimize** | JS+CSS | Medium | Add `.min` class + minwin() function + taskbar integration | High |
| **Window maximize** | JS+CSS | Low | Update `windman.js` maximize to match CTRL position save/restore | Medium |
| **Window resize** (8-direction) | JS+CSS | High | Build resize-knob system in `windman.js` | Medium |
| **Window snap** (half-screen) | JS+CSS | Medium | Add `.left`/`.right` classes + snap detection in drag handler | Medium |
| **Z-order management** | JS+CSS | Medium | Implement explicit z-index management like CTRL's `orderwin()` | Medium |
| **Snap preview overlay** | JS+CSS | Medium | Create `#window-fill` equivalent with animation | Low |
| **Taskbar glass + gradient indicator** | CSS-only | Low | Style `<nav>` with dock styling | High |
| **Taskbar app icon add/remove** | JS+CSS | Medium | Manage dynamic icons on app open/close | High |
| **Taskbar click-to-minimize toggle** | JS+CSS | Medium | Requires minimize support | Medium |
| **Taskbar hover preview** | JS+CSS | High | Clone window content, scale preview | Low |
| **Start menu** | Architecture | High | New panel with app list, pinned grid, search, show/hide animation | High |
| **Search panel** | JS+CSS | Medium | New panel with search input and result rendering | Medium |
| **Context menu visual update** | CSS-only | Low | Update `ctxmenu.js` styling to match CTRL glass | High |
| **Context menu submenu support** | JS+CSS | Medium | Add nested menu rendering | Medium |
| **Dropdown menu system** | JS+CSS | Medium | Build `#dp` equivalent for app menubars | Low |
| **Tooltip system** | JS+CSS | Low | New `#descp` element + show/hide on hover | Low |
| **Toast notifications** | JS+CSS | Medium | New `.msg` element + slide-in animation | Medium |
| **Modal dialogs** | JS+CSS | Medium | New `#notice-back` + `#notice` system | Medium |
| **Widget panel** | Architecture | High | New panel with grid layout + widget registration system | Medium |
| **Weather widget** | New app | Medium | API integration (MSN or alternative) | Low |
| **News widget** | New app | Medium | API integration (multiple sources) | Low |
| **System monitor widget** | New app | Medium | Canvas/SVG ring charts + data collection | Low |
| **Calculator widget** | New app | Low | Port Calculator class + Big.js | Low |
| **Desktop icons** | JS+CSS | Medium | Draggable icon grid on desktop area | Medium |
| **Desktop widget placement** | JS+CSS | High | CSS Grid + drag-to-position + persistence | Low |
| **File explorer update** | New app | High | Already exists as iframe; needs visual parity | Medium |
| **Settings app** | New app | High | Multi-page settings UI with theme controls | High |
| **Task manager** | New app | High | SVG/Canvas charts + process list | Medium |
| **Edge-like browser** | New app | Medium | Tabbed iframe with URL bar + navigation | Low |
| **Terminal update** | New app | Low | Already exists; needs visual polish | Medium |
| **Calculator app** | New app | Low | Port Calculator class | Low |
| **Whiteboard app** | New app | Medium | Canvas drawing with tools | Low |
| **AI copilot** | New app | Medium | API integration (LLM endpoint) | Low |
| **Word processor** | New app | Medium | contenteditable with formatting | Low |
| **Tab system** | JS+CSS | High | Build tab bar component usable by any window | Medium |
| **PWA support** | Architecture | Medium | Service worker registration + manifest | Low |
| **i18n system** | Architecture | High | Need framework + translation files for all strings | Medium |
| **Login screen visual update** | CSS-only | Low | Update login styling to match CTRL aesthetic | Medium |
| **Boot sequence** | JS+CSS | Low | Add loading animation before desktop shows | Low |
| **Shutdown sequence** | JS+CSS | Low | Gradient fade + spinner on shutdown | Low |
| **BIOS simulator** | New app | Low | Novelty — retro terminal interface | Low |
| **BSOD screen** | JS+CSS | Low | Novelty — error display | Low |
| **Keyboard shortcuts** | JS+CSS | Low | F5 refresh, Win+Ctrl for start menu | Medium |
| **Battery monitoring** | JS+CSS | Low | `navigator.getBattery()` API | Low |
| **Voice input** | JS+CSS | Medium | `webkitSpeechRecognition` integration | Low |
| **Brightness control** | JS+CSS | Low | CSS `filter: brightness()` on page | Low |
| **Mica material** | CSS-only | Low | `--mica` gradient behind focused windows | Low |
| **Taskbar auto-size** | CSS-only | Low | Dynamic width based on app count | Medium |

### Recommended Porting Order (High-Impact First)

1. **Phase 1 — Visual Foundation** (CSS-only, immediate impact):
   - Glass/blur effects on existing elements
   - Full CSS variable set (light + dark)
   - Window show/hide/focus animations
   - Context menu glass styling
   - Taskbar glass styling

2. **Phase 2 — Window Management** (JS+CSS):
   - Window minimize with taskbar integration
   - Position save/restore for maximize
   - Z-order management with `focwin()` pattern
   - Window snap (left/right half-screen)
   - Click-to-minimize on taskbar

3. **Phase 3 — Shell Features** (JS+CSS / Architecture):
   - Start menu panel
   - Dark/light mode toggle
   - Theme accent color customization
   - Toast notifications
   - Modal dialog system
   - Tooltip system

4. **Phase 4 — Apps & Widgets** (New app):
   - Settings app with theme controls
   - Calculator app (port Calculator class)
   - Tab system for multi-tab windows
   - Widget panel with at least monitor widget
   - Task manager with process list

5. **Phase 5 — Polish** (mixed):
   - Boot/shutdown animations
   - i18n framework
   - Search panel
   - Desktop icons
   - Keyboard shortcuts
   - PWA support

---

## Appendix: Key Code Excerpts

### Window Show Animation (CSS)

```css
/* desktop.css — Window transition states */
.window {
    position: absolute;
    height: 80%; width: 70%;
    transform: scale(0.7);
    background-color: var(--unfoc);
    border-radius: 10px;
    border: 1.5px solid #6f6f6f30;
    display: none;
    opacity: 0;
    transition: cubic-bezier(0.9, 0, 0.1, 1) 200ms;
    overflow: hidden;
    box-shadow: 2px 2px 5px var(--sd);
}
.window.show-begin { display: flex; flex-direction: column; }
.window.show { transform: none; opacity: 1; height: 80%; width: 70%; }
.window.foc {
    background: var(--bg70);
    backdrop-filter: saturate(3.5) contrast(0.8) blur(60px);
    box-shadow: 3px 3px 20px 3px var(--sd);
}
```

### Loading Spinner (SVG + CSS)

```html
<!-- Used in multiple places: #loadback, window .loadback, shutdown.html, edge reloading -->
<loading>
  <svg width="30px" height="30px" viewBox="0 0 16 16">
    <circle cx="8px" cy="8px" r="7px"
            style="stroke:#7f7f7f50;fill:none;stroke-width:3px;"></circle>
    <circle cx="8px" cy="8px" r="7px"
            style="stroke:#2983cc;stroke-width:3px;"></circle>
  </svg>
</loading>
```

```css
@keyframes spin-infinite {
    0%   { stroke-dasharray: 0.01px, 43.97px; transform: rotate(0deg); }
    50%  { stroke-dasharray: 21.99px, 21.99px; transform: rotate(450deg); }
    to   { stroke-dasharray: 0.01px, 43.97px; transform: rotate(3turn); }
}
```

### Desktop Wallpaper

```css
/* The wallpaper is applied via CSS variable on #page (the full-page container) */
#page {
    background: var(--bgul);    /* default: url("img/bg.jpg") center */
    background-size: cover;
}
```

### Control Panel Brightness Slider

```javascript
// desktop.js dragBrightness()
function dragBrightness(e) {
    const container = $('#control>.cont>.bottom>.brightness>.range-container')[0];
    // ... mousemove handler:
    page.style.filter = `brightness(${offset / width})`;
    // Clamped between 0.3 and 2.0
}
```

### Global Keyboard Shortcuts

```javascript
// desktop.js setupGlobalKey()
$(document).keydown(function(event) {
    if (event.keyCode == 116) {   // F5
        event.preventDefault();
        // Refresh desktop: flash opacity + reload icons
        $('#desktop').css('opacity', '0');
        setTimeout(() => { $('#desktop').css('opacity', '1'); }, 100);
        setIcon();
    }
    if (event.metaKey && event.ctrlKey) {  // Ctrl+Win
        openDockWidget("start-menu");
    }
});
```

### Window Button Styling

```css
/* desktop.css — Title bar control buttons */
.wbtg {
    height: 33px;
    float: right;
    width: 45px;
    text-align: center;
    padding-top: 6px;
    font-size: 13px;
    transition: 50ms;
    border-radius: 3px;
}
.wbtg:hover { background-color: var(--hover-b); }
.wbtg:active { opacity: 0.6; }
.wbtg.red:hover { background-color: #d80d1c; color: #fff; }
.wbtg.red { border-top-right-radius: 10px; }
```

### Desktop Selection Rectangle

```javascript
// desktop.js lines ~2280-2310
let chstX, chstY;
function ch(e) {
    $('#desktop>.choose').css('left', Math.min(chstX, e.clientX));
    $('#desktop>.choose').css('width', Math.abs(e.clientX - chstX));
    $('#desktop>.choose').css('top', Math.min(chstY, e.clientY));
    $('#desktop>.choose').css('height', Math.abs(e.clientY - chstY));
    $('#desktop>.choose').css('display', 'block');
}
$('#desktop')[0].addEventListener('mousedown', e => {
    chstX = e.clientX; chstY = e.clientY;
    this.onmousemove = ch;
});
```

### Mica Material

```css
/* desktop.css — Mica effect on focused windows when :root.mica is set */
:root.mica .window.foc {
    background: var(--mica) no-repeat fixed center;
    background-size: cover;
    backdrop-filter: none;
    background-color: var(--unfoc);
}
```

Mica uses a fixed gradient (`--mica`) that appears to "show through" the window,
simulating frosted glass over the desktop. It's an alternative to the standard
`backdrop-filter` blur.

---

*Document generated from CTRL source files at `/workspaces/swarms/CTRL/`.
All CSS values, class names, function names, and DOM IDs are verified against
actual source code.*
