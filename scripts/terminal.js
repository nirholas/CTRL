/**
 * CTRL System Terminal
 * Full shell engine with file system integration, command history,
 * autocomplete, and keyboard navigation.
 */
const Terminal = (() => {
    'use strict';

    let cwd = '/';
    let commandHistory = [];
    let historyIndex = -1;
    let outputEl = null;
    let inputEl = null;
    const loginTime = Date.now();

    // ── Path Utilities ──

    function normalizePath(path) {
        if (!path || path === '/') return '/';
        const parts = path.replace(/\/+/g, '/').split('/').filter(Boolean);
        const resolved = [];
        for (const part of parts) {
            if (part === '..') {
                resolved.pop();
            } else if (part !== '.') {
                resolved.push(part);
            }
        }
        return '/' + resolved.join('/');
    }

    function resolvePath(input) {
        if (!input) return cwd;
        let path = input.trim();
        if (path === '~' || path === '') return '/';
        if (path.startsWith('~/')) path = '/' + path.slice(2);
        if (!path.startsWith('/')) {
            path = cwd === '/' ? '/' + path : cwd + '/' + path;
        }
        return normalizePath(path);
    }

    function pathToSegments(path) {
        return path.split('/').filter(Boolean);
    }

    // ── File System Helpers ──

    function getFolderAtPath(path) {
        if (!memory || !memory.root) return null;
        if (path === '/') return memory.root;
        const segments = pathToSegments(path);
        let current = memory.root;
        for (const seg of segments) {
            const key = seg + '/';
            if (current[key] && typeof current[key] === 'object' && !current[key].id) {
                current = current[key];
            } else {
                return null;
            }
        }
        return current;
    }

    function getItemInFolder(folder, name) {
        if (!folder) return null;
        // Check as file first
        if (folder[name] && folder[name].id) return { type: 'file', data: folder[name], key: name };
        // Check as folder
        if (folder[name + '/'] && typeof folder[name + '/'] === 'object') return { type: 'folder', data: folder[name + '/'], key: name + '/' };
        // Partial match (find file by basename without extension)
        for (const key of Object.keys(folder)) {
            if (key.endsWith('/')) continue;
            if (basename(key) === name && folder[key].id) return { type: 'file', data: folder[key], key: key };
        }
        return null;
    }

    function listFolder(folder) {
        if (!folder) return [];
        const entries = [];
        for (const key of Object.keys(folder)) {
            if (key.startsWith('_')) continue;
            if (key.endsWith('/')) {
                entries.push({ name: key, type: 'folder' });
            } else if (folder[key] && folder[key].id) {
                entries.push({ name: key, type: 'file' });
            }
        }
        entries.sort((a, b) => {
            if (a.type !== b.type) return a.type === 'folder' ? -1 : 1;
            return a.name.localeCompare(b.name);
        });
        return entries;
    }

    function cwdToFolderName() {
        // Returns the folder name as used by FS API calls (e.g. "Desktop/" or "Apps/")
        if (cwd === '/') return '';
        return cwd.slice(1) + '/';
    }

    // ── Output Helpers ──

    function print(text) {
        if (!outputEl) return;
        outputEl.value += text + '\n';
        scrollToBottom();
    }

    function printError(msg) {
        print('Error: ' + msg);
    }

    function scrollToBottom() {
        if (!outputEl) return;
        outputEl.scrollTop = outputEl.scrollHeight;
    }

    function printPrompt() {
        if (!inputEl) return;
        const user = (typeof CurrentUsername !== 'undefined' && CurrentUsername) ? CurrentUsername : 'user';
        inputEl.placeholder = user + '@CTRL ' + cwd + ' $';
    }

    // ── Commands ──

    async function cmd_ls(args) {
        const targetPath = args[0] ? resolvePath(args[0]) : cwd;
        const folder = getFolderAtPath(targetPath);
        if (!folder) {
            printError('No such directory: ' + targetPath);
            return;
        }
        const entries = listFolder(folder);
        if (entries.length === 0) {
            print('(empty)');
            return;
        }
        const lines = entries.map(e => e.type === 'folder' ? e.name : '  ' + e.name);
        print(lines.join('\n'));
    }

    async function cmd_cd(args) {
        if (!args[0] || args[0] === '~') {
            cwd = '/';
            printPrompt();
            return;
        }
        const targetPath = resolvePath(args[0]);
        if (targetPath === '/') {
            cwd = '/';
            printPrompt();
            return;
        }
        const folder = getFolderAtPath(targetPath);
        if (!folder) {
            printError('No such directory: ' + targetPath);
            return;
        }
        cwd = targetPath;
        printPrompt();
    }

    async function cmd_pwd() {
        print(cwd);
    }

    async function cmd_cat(args) {
        if (!args[0]) {
            printError('Usage: cat <filename>');
            return;
        }
        const targetPath = resolvePath(args[0]);
        const parentPath = normalizePath(targetPath.substring(0, targetPath.lastIndexOf('/'))) || '/';
        const fileName = targetPath.split('/').filter(Boolean).pop();
        const folder = getFolderAtPath(parentPath);
        if (!folder) {
            printError('No such file: ' + args[0]);
            return;
        }
        const item = getItemInFolder(folder, fileName);
        if (!item || item.type !== 'file') {
            printError('No such file: ' + args[0]);
            return;
        }
        try {
            const fileData = await getFileById(item.data.id);
            if (!fileData || fileData === 3) {
                printError('Could not read file');
                return;
            }
            const ext = mtpetxt(fileData.fileName) || '';
            const textTypes = ['txt', 'md', 'json', 'html', 'css', 'js', 'xml', 'csv', 'osl', 'svg', 'log'];
            if (textTypes.includes(ext.toLowerCase())) {
                let content = fileData.content;
                if (content && typeof content === 'string') {
                    try {
                        content = decodeBase64Content(content);
                    } catch (e) {
                        // Already decoded or not base64
                    }
                }
                print(content || '(empty file)');
            } else {
                print('[binary content: ' + ext + ' file, ' + (fileData.content ? fileData.content.length : 0) + ' bytes]');
            }
        } catch (e) {
            printError('Failed to read file: ' + e.message);
        }
    }

    async function cmd_mkdir(args) {
        if (!args[0]) {
            printError('Usage: mkdir <name>');
            return;
        }
        const name = args[0].replace(/[\/\\]/g, '');
        if (!name) {
            printError('Invalid folder name');
            return;
        }
        const parentFolder = cwdToFolderName();
        const folderPath = parentFolder + name + '/';
        const existing = getFolderAtPath(resolvePath(name));
        if (existing) {
            printError('Folder already exists: ' + name);
            return;
        }
        try {
            await createFolder([folderPath], {});
            await updateMemoryData();
            print('Created directory: ' + name);
        } catch (e) {
            printError('Failed to create folder: ' + e.message);
        }
    }

    async function cmd_touch(args) {
        if (!args[0]) {
            printError('Usage: touch <filename> [type]');
            return;
        }
        const name = args[0];
        const type = args[1] || 'txt';
        const parentFolder = cwdToFolderName();
        try {
            await createFile(parentFolder, name, type, '');
            await updateMemoryData();
            print('Created file: ' + name);
        } catch (e) {
            printError('Failed to create file: ' + e.message);
        }
    }

    async function cmd_rm(args) {
        if (!args[0]) {
            printError('Usage: rm <name>');
            return;
        }
        const folder = getFolderAtPath(cwd);
        if (!folder) {
            printError('Cannot access current directory');
            return;
        }
        const item = getItemInFolder(folder, args[0]);
        if (!item) {
            printError('No such file or directory: ' + args[0]);
            return;
        }
        try {
            if (item.type === 'folder') {
                const folderPath = cwdToFolderName() + args[0] + '/';
                await remfolder(folderPath);
                await updateMemoryData();
                print('Removed directory: ' + args[0]);
            } else {
                await remfile(item.data.id);
                await updateMemoryData();
                print('Removed file: ' + args[0]);
            }
        } catch (e) {
            printError('Failed to remove: ' + e.message);
        }
    }

    async function cmd_mv(args) {
        if (args.length < 2) {
            printError('Usage: mv <source> <destination>');
            return;
        }
        const srcFolder = getFolderAtPath(cwd);
        if (!srcFolder) {
            printError('Cannot access current directory');
            return;
        }
        const srcItem = getItemInFolder(srcFolder, args[0]);
        if (!srcItem || srcItem.type !== 'file') {
            printError('No such file: ' + args[0]);
            return;
        }
        const destPath = resolvePath(args[1]);
        const destFolder = getFolderAtPath(destPath);
        if (!destFolder) {
            printError('Destination directory not found: ' + args[1]);
            return;
        }
        const destFolderName = destPath === '/' ? '' : destPath.slice(1) + '/';
        try {
            await moveFileToFolder(srcItem.data.id, destFolderName);
            await updateMemoryData();
            print('Moved ' + args[0] + ' → ' + destPath);
        } catch (e) {
            printError('Failed to move file: ' + e.message);
        }
    }

    async function cmd_echo(args, rawInput) {
        // Support redirect: echo text > file
        const fullText = rawInput.slice(5).trim(); // Remove 'echo '
        const redirectIndex = fullText.indexOf('>');
        if (redirectIndex !== -1) {
            const text = fullText.slice(0, redirectIndex).trim();
            const fileName = fullText.slice(redirectIndex + 1).trim();
            if (!fileName) {
                printError('No output file specified');
                return;
            }
            const parentFolder = cwdToFolderName();
            try {
                // Check if file exists
                const folder = getFolderAtPath(cwd);
                const existing = folder ? getItemInFolder(folder, fileName) : null;
                if (existing && existing.type === 'file') {
                    // Remove old file and create new one with content
                    await remfile(existing.data.id);
                }
                const ext = mtpetxt(fileName) || 'txt';
                await createFile(parentFolder, fileName, ext, text);
                await updateMemoryData();
                print('Wrote to ' + fileName);
            } catch (e) {
                printError('Failed to write file: ' + e.message);
            }
        } else {
            print(fullText);
        }
    }

    async function cmd_clear() {
        if (outputEl) {
            outputEl.value = '';
        }
    }

    async function cmd_help() {
        const helpText = [
            'CTRL Terminal — Available Commands:',
            '',
            '  ls [path]           List files and folders',
            '  cd <path>           Change directory (.. / ~ supported)',
            '  pwd                 Print working directory',
            '  cat <file>          Print file contents',
            '  mkdir <name>        Create a new folder',
            '  touch <name> [type] Create an empty file (default: txt)',
            '  rm <name>           Remove a file or folder',
            '  mv <src> <dest>     Move a file to a destination folder',
            '  echo <text>         Print text (use > file to write)',
            '  clear               Clear terminal output',
            '  help                Show this help message',
            '  whoami              Print current username',
            '  open <file>         Open a file with its default app',
            '  launch <app>        Launch an installed application',
            '  apps                List installed applications',
            '  history             Show command history',
            '  uptime              Show time since login',
            '  sysinfo             Show system information',
            '  eval <expr>         Evaluate a JavaScript expression',
        ];
        print(helpText.join('\n'));
    }

    async function cmd_whoami() {
        print((typeof CurrentUsername !== 'undefined' && CurrentUsername) ? CurrentUsername : 'unknown');
    }

    async function cmd_open(args) {
        if (!args[0]) {
            printError('Usage: open <filename>');
            return;
        }
        const folder = getFolderAtPath(cwd);
        if (!folder) {
            printError('Cannot access current directory');
            return;
        }
        const item = getItemInFolder(folder, args[0]);
        if (!item || item.type !== 'file') {
            printError('No such file: ' + args[0]);
            return;
        }
        try {
            openfile(item.data.id);
            print('Opening: ' + args[0]);
        } catch (e) {
            printError('Failed to open file: ' + e.message);
        }
    }

    async function cmd_launch(args) {
        if (!args[0]) {
            printError('Usage: launch <appname>');
            return;
        }
        const appName = args.join(' ');
        try {
            // Search in Apps/ folder for matching app
            const appsFolder = getFolderAtPath('/Apps');
            if (appsFolder) {
                for (const key of Object.keys(appsFolder)) {
                    if (key.endsWith('/') || key.startsWith('_')) continue;
                    const name = basename(key).toLowerCase();
                    if (name === appName.toLowerCase() || key.toLowerCase() === appName.toLowerCase()) {
                        if (appsFolder[key] && appsFolder[key].id) {
                            openfile(appsFolder[key].id);
                            print('Launching: ' + basename(key));
                            return;
                        }
                    }
                }
            }
            // Fallback: try openapp directly
            openapp(appName, 1);
            print('Launching: ' + appName);
        } catch (e) {
            printError('Failed to launch app: ' + e.message);
        }
    }

    async function cmd_apps() {
        const appsFolder = getFolderAtPath('/Apps');
        if (!appsFolder) {
            print('No apps folder found.');
            return;
        }
        const entries = [];
        for (const key of Object.keys(appsFolder)) {
            if (key.startsWith('_')) continue;
            if (key.endsWith('/')) {
                entries.push('  [folder] ' + key);
            } else if (appsFolder[key] && appsFolder[key].id) {
                entries.push('  ' + basename(key));
            }
        }
        if (entries.length === 0) {
            print('No apps installed.');
        } else {
            print('Installed Apps:\n' + entries.join('\n'));
        }
    }

    async function cmd_history() {
        if (commandHistory.length === 0) {
            print('No command history.');
            return;
        }
        const lines = commandHistory.map((cmd, i) => '  ' + (i + 1) + '  ' + cmd);
        print(lines.join('\n'));
    }

    async function cmd_uptime() {
        const elapsed = Date.now() - loginTime;
        const seconds = Math.floor(elapsed / 1000);
        const minutes = Math.floor(seconds / 60);
        const hours = Math.floor(minutes / 60);
        const days = Math.floor(hours / 24);
        const parts = [];
        if (days > 0) parts.push(days + 'd');
        if (hours % 24 > 0) parts.push((hours % 24) + 'h');
        if (minutes % 60 > 0) parts.push((minutes % 60) + 'm');
        parts.push((seconds % 60) + 's');
        print('Uptime: ' + parts.join(' '));
    }

    async function cmd_sysinfo() {
        const user = (typeof CurrentUsername !== 'undefined' && CurrentUsername) ? CurrentUsername : 'unknown';
        let storageEstimate = 'N/A';
        try {
            if (navigator.storage && navigator.storage.estimate) {
                const est = await navigator.storage.estimate();
                const usedMB = (est.usage / (1024 * 1024)).toFixed(2);
                const quotaMB = (est.quota / (1024 * 1024)).toFixed(2);
                storageEstimate = usedMB + ' MB / ' + quotaMB + ' MB';
            }
        } catch (e) {
            // Storage API not available
        }
        const info = [
            'CTRL System Information',
            '─────────────────────────',
            '  User:      ' + user,
            '  Platform:  ' + navigator.platform,
            '  Language:  ' + navigator.language,
            '  Storage:   ' + storageEstimate,
            '  UserAgent: ' + navigator.userAgent.slice(0, 80),
        ];
        print(info.join('\n'));
    }

    async function cmd_eval(args, rawInput) {
        const expr = rawInput.slice(5).trim(); // Remove 'eval '
        if (!expr) {
            printError('Usage: eval <expression>');
            return;
        }
        try {
            const result = await eval(expr);
            if (typeof result === 'object' && result !== null) {
                print(JSON.stringify(result, null, 2));
            } else if (result !== undefined) {
                print(String(result));
            } else {
                print('undefined');
            }
        } catch (e) {
            printError(e.message);
        }
    }

    // ── Command Registry ──

    const commands = {
        ls: cmd_ls,
        cd: cmd_cd,
        pwd: cmd_pwd,
        cat: cmd_cat,
        mkdir: cmd_mkdir,
        touch: cmd_touch,
        rm: cmd_rm,
        mv: cmd_mv,
        echo: cmd_echo,
        clear: cmd_clear,
        help: cmd_help,
        whoami: cmd_whoami,
        open: cmd_open,
        launch: cmd_launch,
        apps: cmd_apps,
        history: cmd_history,
        uptime: cmd_uptime,
        sysinfo: cmd_sysinfo,
        eval: cmd_eval,
    };

    // ── Parser & Executor ──

    function parseInput(input) {
        const trimmed = input.trim();
        if (!trimmed) return null;
        // Simple argument splitting respecting double quotes
        const parts = [];
        let current = '';
        let inQuotes = false;
        for (let i = 0; i < trimmed.length; i++) {
            const ch = trimmed[i];
            if (ch === '"') {
                inQuotes = !inQuotes;
            } else if (ch === ' ' && !inQuotes) {
                if (current) {
                    parts.push(current);
                    current = '';
                }
            } else {
                current += ch;
            }
        }
        if (current) parts.push(current);
        return { command: parts[0].toLowerCase(), args: parts.slice(1), raw: trimmed };
    }

    async function execute(input) {
        const user = (typeof CurrentUsername !== 'undefined' && CurrentUsername) ? CurrentUsername : 'user';
        print(user + '@CTRL ' + cwd + ' $ ' + input);

        const parsed = parseInput(input);
        if (!parsed) return;

        commandHistory.push(input);
        historyIndex = commandHistory.length;

        const handler = commands[parsed.command];
        if (!handler) {
            printError('Command not found: ' + parsed.command + '. Type "help" for available commands.');
            return;
        }

        try {
            await handler(parsed.args, parsed.raw);
        } catch (e) {
            printError('Command failed: ' + e.message);
        }
    }

    // ── Autocomplete ──

    function getCompletions(partial) {
        const folder = getFolderAtPath(cwd);
        if (!folder) return [];
        const entries = Object.keys(folder).filter(k => !k.startsWith('_'));
        const lower = partial.toLowerCase();
        const matches = entries.filter(name => {
            const displayName = name.endsWith('/') ? name.slice(0, -1) : name;
            return displayName.toLowerCase().startsWith(lower);
        });
        return matches;
    }

    function autocomplete() {
        if (!inputEl) return;
        const value = inputEl.value;
        const parts = value.split(' ');
        const lastPart = parts[parts.length - 1];
        if (!lastPart) return;

        // If typing a command (first word), complete commands
        if (parts.length === 1) {
            const cmdNames = Object.keys(commands);
            const matches = cmdNames.filter(c => c.startsWith(lastPart.toLowerCase()));
            if (matches.length === 1) {
                inputEl.value = matches[0] + ' ';
            } else if (matches.length > 1) {
                print(matches.join('  '));
            }
            return;
        }

        // Complete file/folder names
        const matches = getCompletions(lastPart);
        if (matches.length === 1) {
            parts[parts.length - 1] = matches[0].endsWith('/') ? matches[0].slice(0, -1) : matches[0];
            inputEl.value = parts.join(' ');
        } else if (matches.length > 1) {
            print(matches.join('  '));
        }
    }

    // ── Input Handling ──

    function handleKeyDown(event) {
        if (event.key === 'Enter') {
            event.preventDefault();
            const value = inputEl.value.trim();
            if (value) {
                execute(value);
            }
            inputEl.value = '';
            return;
        }

        if (event.key === 'ArrowUp') {
            event.preventDefault();
            if (commandHistory.length === 0) return;
            if (historyIndex > 0) historyIndex--;
            inputEl.value = commandHistory[historyIndex] || '';
            return;
        }

        if (event.key === 'ArrowDown') {
            event.preventDefault();
            if (historyIndex < commandHistory.length - 1) {
                historyIndex++;
                inputEl.value = commandHistory[historyIndex] || '';
            } else {
                historyIndex = commandHistory.length;
                inputEl.value = '';
            }
            return;
        }

        if (event.key === 'Tab') {
            event.preventDefault();
            autocomplete();
            return;
        }

        if (event.ctrlKey && event.key === 'c') {
            event.preventDefault();
            const user = (typeof CurrentUsername !== 'undefined' && CurrentUsername) ? CurrentUsername : 'user';
            print(user + '@CTRL ' + cwd + ' $ ' + inputEl.value + '^C');
            inputEl.value = '';
            return;
        }

        if (event.ctrlKey && event.key === 'l') {
            event.preventDefault();
            cmd_clear();
            return;
        }
    }

    // ── Initialization ──

    function init() {
        outputEl = document.getElementById('termoutput');
        inputEl = document.getElementById('terminput');
        if (!outputEl || !inputEl) return;

        inputEl.removeEventListener('keydown', handleKeyDown);
        inputEl.addEventListener('keydown', handleKeyDown);

        printPrompt();

        // Show welcome message
        outputEl.value = [
            'CTRL Terminal v1.0',
            'Type "help" for a list of available commands.',
            '',
        ].join('\n');
    }

    // ── Public API ──

    return { execute, init };
})();

// Replace the old termrun function
function termrun() {
    const inputEl = document.getElementById('terminput');
    if (!inputEl) return;
    const value = inputEl.value.trim();
    if (value) {
        Terminal.execute(value);
    }
    inputEl.value = '';
}
