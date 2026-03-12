/**
 * CTRL Backup & Recovery System
 * Provides full data export, import, auto-backup, and recovery.
 */
(function (global) {
    'use strict';

    const BACKUP_DB_NAME = 'CTRL-backups';
    const BACKUP_STORE = 'backups';
    const BACKUP_VERSION = 1;
    const MAX_AUTO_BACKUPS = 5;
    const AUTO_BACKUP_INTERVAL_MS = 30 * 60 * 1000; // 30 minutes
    const BACKUP_FILE_EXTENSION = '.CTRL-backup';

    let autoBackupTimer = null;
    let lastActivityTime = Date.now();

    // ─── IndexedDB helpers for backup store ───

    function openBackupDB() {
        return new Promise((resolve, reject) => {
            const request = indexedDB.open(BACKUP_DB_NAME, BACKUP_VERSION);
            request.onupgradeneeded = (event) => {
                const db = event.target.result;
                if (!db.objectStoreNames.contains(BACKUP_STORE)) {
                    db.createObjectStore(BACKUP_STORE, { keyPath: 'id' });
                }
            };
            request.onsuccess = (event) => resolve(event.target.result);
            request.onerror = (event) => reject(event.target.error);
        });
    }

    // ─── Checksum computation ───

    async function computeChecksum(data) {
        const jsonStr = JSON.stringify(data);
        const encoded = new TextEncoder().encode(jsonStr);
        const hashBuffer = await crypto.subtle.digest('SHA-256', encoded);
        const hashArray = Array.from(new Uint8Array(hashBuffer));
        return 'sha256:' + hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
    }

    async function verifyChecksum(data, expectedChecksum) {
        const actual = await computeChecksum(data);
        return actual === expectedChecksum;
    }

    // ─── Collect all data from the OS ───

    async function collectAllFiles() {
        const files = [];

        async function scanFolder(folderPath, folderObj) {
            for (const [key, value] of Object.entries(folderObj)) {
                if (key.endsWith('/')) {
                    await scanFolder(folderPath + key, value);
                } else if (value && value.id) {
                    try {
                        const content = await ctntMgr.get(value.id);
                        files.push({
                            id: value.id,
                            name: key,
                            folder: folderPath,
                            content: content || '',
                            metadata: value.metadata || {},
                            type: value.type || ''
                        });
                    } catch (err) {
                        console.warn(`Backup: could not read file ${key} (id: ${value.id}):`, err);
                    }
                }
            }
        }

        await updateMemoryData();
        if (memory && memory.root) {
            await scanFolder('', memory.root);
        }
        return files;
    }

    async function collectSettings() {
        try {
            const prefs = await getSetting('full', 'preferences.json', 'System/');
            return prefs || {};
        } catch (err) {
            console.warn('Backup: could not read settings:', err);
            return {};
        }
    }

    async function collectThemes() {
        try {
            const themes = await getSetting('customThemes') || [];
            return Array.isArray(themes) ? themes : [];
        } catch {
            return [];
        }
    }

    async function collectInstalledApps() {
        try {
            const apps = await getFileNamesByFolder('Apps/');
            if (!Array.isArray(apps)) return [];
            return apps.map(app => ({
                id: app.id,
                name: app.name,
                metadata: app.metadata || {}
            }));
        } catch {
            return [];
        }
    }

    async function collectPermissions() {
        try {
            const registry = await getSetting('full', 'AppRegistry.json', 'System/');
            if (!registry || typeof registry !== 'object') return {};
            const perms = {};
            for (const [appId, data] of Object.entries(registry)) {
                if (data && data.perms) {
                    perms[appId] = data.perms;
                }
            }
            return perms;
        } catch {
            return {};
        }
    }

    // ─── BackupManager class ───

    class BackupManager {
        /**
         * Export all user data to a single JSON object.
         */
        async exportAll() {
            const [files, settings, themes, installedApps, permissions] = await Promise.all([
                collectAllFiles(),
                collectSettings(),
                collectThemes(),
                collectInstalledApps(),
                collectPermissions()
            ]);

            const data = {
                files,
                settings,
                themes,
                installedApps,
                permissions
            };

            const checksum = await computeChecksum(data);

            return {
                version: '1.0',
                exportedAt: new Date().toISOString(),
                CTRLVersion: '2.0',
                username: CurrentUsername,
                data,
                checksum
            };
        }

        /**
         * Export and trigger a download of a .CTRL-backup file.
         */
        async downloadBackup() {
            const backup = await this.exportAll();
            const jsonStr = JSON.stringify(backup);

            // Compress with fflate if available
            let blob;
            if (typeof fflate !== 'undefined' && fflate.gzipSync) {
                const encoded = new TextEncoder().encode(jsonStr);
                const compressed = fflate.gzipSync(encoded, { level: 6 });
                blob = new Blob([compressed], { type: 'application/gzip' });
            } else {
                blob = new Blob([jsonStr], { type: 'application/json' });
            }

            const url = URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            const dateStr = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
            link.download = `CTRL-${CurrentUsername}-${dateStr}${BACKUP_FILE_EXTENSION}`;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            setTimeout(() => URL.revokeObjectURL(url), 5000);

            await setSetting('lastBackupDate', new Date().toISOString());
            return { success: true, fileCount: backup.data.files.length };
        }

        /**
         * Validate backup data before importing.
         */
        async validateBackup(backupData) {
            const errors = [];

            if (!backupData || typeof backupData !== 'object') {
                return { valid: false, errors: ['Invalid backup format: not an object'] };
            }

            if (!backupData.version) {
                errors.push('Missing version field');
            } else {
                const majorVersion = parseInt(backupData.version.split('.')[0], 10);
                if (majorVersion > 1) {
                    errors.push(`Incompatible backup version: ${backupData.version}. This version of CTRL supports version 1.x backups.`);
                }
            }

            if (!backupData.data || typeof backupData.data !== 'object') {
                errors.push('Missing or invalid data field');
                return { valid: false, errors };
            }

            if (!Array.isArray(backupData.data.files)) {
                errors.push('Missing or invalid files array');
            }

            if (typeof backupData.data.settings !== 'object') {
                errors.push('Missing or invalid settings object');
            }

            if (backupData.checksum) {
                const valid = await verifyChecksum(backupData.data, backupData.checksum);
                if (!valid) {
                    errors.push('Checksum verification failed: backup data may be corrupted');
                }
            }

            return { valid: errors.length === 0, errors };
        }

        /**
         * Parse and decompress a .CTRL-backup file.
         */
        async parseBackupFile(file) {
            const arrayBuffer = await file.arrayBuffer();
            const bytes = new Uint8Array(arrayBuffer);

            let jsonStr;
            // Check for gzip magic number
            if (bytes[0] === 0x1F && bytes[1] === 0x8B) {
                if (typeof fflate === 'undefined' || !fflate.gunzipSync) {
                    throw new Error('Compressed backup detected but decompression library not available');
                }
                const decompressed = fflate.gunzipSync(bytes);
                jsonStr = new TextDecoder().decode(decompressed);
            } else {
                jsonStr = new TextDecoder().decode(bytes);
            }

            try {
                return JSON.parse(jsonStr);
            } catch {
                throw new Error('Invalid backup file: could not parse JSON');
            }
        }

        /**
         * Import from a backup file. Supports 'merge' and 'replace' modes.
         * @param {File} file - The .CTRL-backup file.
         * @param {string} mode - 'merge' (default) or 'replace'.
         */
        async importBackup(file, mode) {
            mode = mode || 'merge';
            const backupData = await this.parseBackupFile(file);

            const validation = await this.validateBackup(backupData);
            if (!validation.valid) {
                return { success: false, errors: validation.errors, stats: null };
            }

            const stats = { files: 0, settings: 0, themes: 0, apps: 0 };

            if (mode === 'replace') {
                await this._replaceAll(backupData.data, stats);
            } else {
                await this._mergeAll(backupData.data, stats);
            }

            return { success: true, errors: [], stats };
        }

        async _replaceAll(data, stats) {
            // Wipe existing files (except system files) and import all
            await updateMemoryData();

            // Import files
            if (Array.isArray(data.files)) {
                for (const file of data.files) {
                    try {
                        const folder = file.folder || '';
                        await createFile(folder, file.name, file.type || '', file.content || '', file.metadata || {});
                        stats.files++;
                    } catch (err) {
                        console.warn(`Import: failed to create file ${file.name}:`, err);
                    }
                }
            }

            // Replace settings
            if (data.settings && typeof data.settings === 'object') {
                for (const [key, value] of Object.entries(data.settings)) {
                    try {
                        await setSetting(key, value);
                        stats.settings++;
                    } catch (err) {
                        console.warn(`Import: failed to set setting ${key}:`, err);
                    }
                }
            }

            // Import themes
            if (Array.isArray(data.themes)) {
                await setSetting('customThemes', data.themes);
                stats.themes = data.themes.length;
            }
        }

        async _mergeAll(data, stats) {
            await updateMemoryData();

            // Merge files: match by path (folder + name), keep the newer version
            if (Array.isArray(data.files)) {
                for (const file of data.files) {
                    try {
                        const folder = file.folder || '';
                        const existingFile = await getFileByPath(folder + file.name);

                        if (existingFile) {
                            // File exists — compare timestamps if available
                            const existingMod = existingFile.metadata?.datetime;
                            const importMod = file.metadata?.datetime;

                            if (importMod && existingMod && new Date(importMod) <= new Date(existingMod)) {
                                continue; // Keep existing (newer)
                            }
                            // Update existing file with newer imported data
                            await updateFile(folder, existingFile.id, {
                                content: file.content || '',
                                metadata: file.metadata || {},
                                fileName: file.name,
                                type: file.type || ''
                            });
                        } else {
                            // New file — create it
                            await createFile(folder, file.name, file.type || '', file.content || '', file.metadata || {});
                        }
                        stats.files++;
                    } catch (err) {
                        console.warn(`Import: failed to merge file ${file.name}:`, err);
                    }
                }
            }

            // Merge settings: imported values override existing
            if (data.settings && typeof data.settings === 'object') {
                for (const [key, value] of Object.entries(data.settings)) {
                    try {
                        await setSetting(key, value);
                        stats.settings++;
                    } catch (err) {
                        console.warn(`Import: failed to set setting ${key}:`, err);
                    }
                }
            }

            // Merge themes: match by name, update or add
            if (Array.isArray(data.themes)) {
                try {
                    const existingThemes = await getSetting('customThemes') || [];
                    const themeMap = {};
                    for (const theme of existingThemes) {
                        if (theme && theme.name) themeMap[theme.name] = theme;
                    }
                    for (const theme of data.themes) {
                        if (theme && theme.name) themeMap[theme.name] = theme;
                    }
                    const merged = Object.values(themeMap);
                    await setSetting('customThemes', merged);
                    stats.themes = data.themes.length;
                } catch (err) {
                    console.warn('Import: failed to merge themes:', err);
                }
            }
        }

        /**
         * Create an auto-backup in IndexedDB.
         */
        async autoBackup() {
            try {
                const backup = await this.exportAll();
                const jsonStr = JSON.stringify(backup);

                // Compress if fflate is available
                let storedData;
                if (typeof fflate !== 'undefined' && fflate.gzipSync) {
                    const encoded = new TextEncoder().encode(jsonStr);
                    storedData = fflate.gzipSync(encoded, { level: 6 });
                } else {
                    storedData = jsonStr;
                }

                const db = await openBackupDB();
                const tx = db.transaction(BACKUP_STORE, 'readwrite');
                const store = tx.objectStore(BACKUP_STORE);

                const backupEntry = {
                    id: 'auto_' + Date.now(),
                    timestamp: new Date().toISOString(),
                    username: CurrentUsername,
                    size: typeof storedData === 'string' ? storedData.length : storedData.byteLength,
                    compressed: typeof storedData !== 'string',
                    data: storedData,
                    fileCount: backup.data.files.length
                };

                store.put(backupEntry);

                await new Promise((resolve, reject) => {
                    tx.oncomplete = resolve;
                    tx.onerror = () => reject(tx.error);
                });

                // Evict oldest backups if over limit
                await this._evictOldBackups();

                // Show non-intrusive toast
                if (typeof toast === 'function') {
                    toast('Auto-backup saved');
                }

                return backupEntry.id;
            } catch (err) {
                console.error('Auto-backup failed:', err);
                return null;
            }
        }

        async _evictOldBackups() {
            const backups = await this.listAutoBackups();
            if (backups.length <= MAX_AUTO_BACKUPS) return;

            // Sort oldest first
            backups.sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
            const toRemove = backups.slice(0, backups.length - MAX_AUTO_BACKUPS);

            const db = await openBackupDB();
            const tx = db.transaction(BACKUP_STORE, 'readwrite');
            const store = tx.objectStore(BACKUP_STORE);

            for (const backup of toRemove) {
                store.delete(backup.id);
            }

            await new Promise((resolve, reject) => {
                tx.oncomplete = resolve;
                tx.onerror = () => reject(tx.error);
            });
        }

        /**
         * List available auto-backups.
         */
        async listAutoBackups() {
            try {
                const db = await openBackupDB();
                const tx = db.transaction(BACKUP_STORE, 'readonly');
                const store = tx.objectStore(BACKUP_STORE);
                const request = store.getAll();

                const results = await new Promise((resolve, reject) => {
                    request.onsuccess = () => resolve(request.result || []);
                    request.onerror = () => reject(request.error);
                });

                // Filter for current user and return metadata only
                return results
                    .filter(b => b.username === CurrentUsername)
                    .map(b => ({
                        id: b.id,
                        timestamp: b.timestamp,
                        size: b.size,
                        fileCount: b.fileCount || 0
                    }))
                    .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
            } catch (err) {
                console.error('Failed to list auto-backups:', err);
                return [];
            }
        }

        /**
         * Restore from a specific auto-backup.
         */
        async restoreAutoBackup(id) {
            const db = await openBackupDB();
            const tx = db.transaction(BACKUP_STORE, 'readonly');
            const store = tx.objectStore(BACKUP_STORE);
            const request = store.get(id);

            const backupEntry = await new Promise((resolve, reject) => {
                request.onsuccess = () => resolve(request.result);
                request.onerror = () => reject(request.error);
            });

            if (!backupEntry) {
                throw new Error('Auto-backup not found: ' + id);
            }

            let jsonStr;
            if (backupEntry.compressed) {
                if (typeof fflate === 'undefined' || !fflate.gunzipSync) {
                    throw new Error('Compressed backup but decompression library not available');
                }
                const bytes = new Uint8Array(backupEntry.data);
                const decompressed = fflate.gunzipSync(bytes);
                jsonStr = new TextDecoder().decode(decompressed);
            } else {
                jsonStr = backupEntry.data;
            }

            const backupData = JSON.parse(jsonStr);
            const validation = await this.validateBackup(backupData);
            if (!validation.valid) {
                throw new Error('Backup validation failed: ' + validation.errors.join(', '));
            }

            const stats = { files: 0, settings: 0, themes: 0, apps: 0 };
            await this._replaceAll(backupData.data, stats);

            return { success: true, stats };
        }

        /**
         * Delete a specific auto-backup.
         */
        async deleteAutoBackup(id) {
            const db = await openBackupDB();
            const tx = db.transaction(BACKUP_STORE, 'readwrite');
            const store = tx.objectStore(BACKUP_STORE);
            store.delete(id);

            await new Promise((resolve, reject) => {
                tx.oncomplete = resolve;
                tx.onerror = () => reject(tx.error);
            });
        }

        /**
         * Check if data was lost and backups exist (for boot recovery).
         */
        async checkForRecovery() {
            await updateMemoryData();
            const hasData = memory && memory.root && Object.keys(memory.root).length > 0;
            if (hasData) return null;

            const backups = await this.listAutoBackups();
            if (backups.length === 0) return null;

            return backups[0]; // Return newest backup for recovery prompt
        }

        // ─── Auto-backup scheduling ───

        startAutoBackup() {
            if (autoBackupTimer) return;

            // Track user activity
            const activityHandler = () => { lastActivityTime = Date.now(); };
            document.addEventListener('click', activityHandler, { passive: true });
            document.addEventListener('keydown', activityHandler, { passive: true });

            autoBackupTimer = setInterval(async () => {
                // Only backup if user has been active in the interval
                const timeSinceActivity = Date.now() - lastActivityTime;
                if (timeSinceActivity < AUTO_BACKUP_INTERVAL_MS) {
                    await this.autoBackup();
                }
            }, AUTO_BACKUP_INTERVAL_MS);
        }

        stopAutoBackup() {
            if (autoBackupTimer) {
                clearInterval(autoBackupTimer);
                autoBackupTimer = null;
            }
        }

        /**
         * Get backup statistics for the settings UI.
         */
        async getBackupStats() {
            const lastBackupDate = await getSetting('lastBackupDate');
            const autoBackups = await this.listAutoBackups();
            const autoBackupEnabled = (await getSetting('autoBackupEnabled')) !== false;

            let totalFiles = 0;
            try {
                await updateMemoryData();
                const countFiles = (obj) => {
                    for (const [key, value] of Object.entries(obj)) {
                        if (key.endsWith('/')) {
                            countFiles(value);
                        } else if (value && value.id) {
                            totalFiles++;
                        }
                    }
                };
                if (memory && memory.root) countFiles(memory.root);
            } catch { }

            return {
                lastBackupDate,
                autoBackups,
                autoBackupEnabled,
                totalFiles
            };
        }
    }

    // Expose BackupManager globally
    global.BackupManager = BackupManager;
    global.backupManager = new BackupManager();

})(typeof window !== 'undefined' ? window : globalThis);
