/**
 * FilePreview — generates HTML previews for files by type.
 * Supports images (thumbnails), text/code (first lines), audio/video (metadata icons),
 * and generic fallbacks. Includes a time-based cache to avoid re-fetching.
 */
const FilePreview = (() => {
    const previewCache = new Map();
    const CACHE_TTL = 60000; // 1 minute

    /**
     * Generate an HTML preview for a given file ID.
     * @param {string} fileId - The file's unique ID in the CTRL filesystem.
     * @param {number} maxWidth - Max width for image thumbnails (default 200).
     * @param {number} maxHeight - Max height for image thumbnails (default 150).
     * @returns {Promise<string>} HTML string of the preview.
     */
    async function generate(fileId, maxWidth = 200, maxHeight = 150) {
        if (!fileId) return defaultPreview();

        const cached = previewCache.get(fileId);
        if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
            return cached.html;
        }

        try {
            const file = await getFileById(fileId);
            if (!file || file === 0 || file === 3 || !file.content) {
                return defaultPreview();
            }

            const name = file.fileName || (await getFileNameByID(fileId)) || 'Unknown';
            const ext = mtpetxt(name) || '';
            const baseType = getbaseflty(ext);

            let html;
            switch (baseType) {
                case 'image':
                    html = imagePreview(file.content, name, maxWidth, maxHeight);
                    break;
                case 'document':
                case 'code':
                case 'webpage':
                    html = textPreview(file.content, name, ext);
                    break;
                case 'music':
                case 'audio':
                    html = audioPreview(name, ext);
                    break;
                case 'video':
                    html = videoPreview(name, ext);
                    break;
                case 'app':
                    html = appPreview(name);
                    break;
                default:
                    html = genericPreview(name, ext);
            }

            previewCache.set(fileId, { html, timestamp: Date.now() });
            return html;
        } catch (e) {
            console.warn('FilePreview.generate error:', e);
            return defaultPreview();
        }
    }

    function sanitize(str) {
        if (typeof escapeHTML === 'function') return escapeHTML(str);
        return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
    }

    function imagePreview(content, name, maxWidth, maxHeight) {
        const safeName = sanitize(name);
        // content is a data URI like data:image/png;base64,...
        return `<div class="file-preview image-preview">
            <img src="${sanitize(content)}" alt="${safeName}" loading="lazy"
                 style="max-width:${maxWidth}px; max-height:${maxHeight}px;">
            <span class="preview-name">${safeName}</span>
        </div>`;
    }

    function textPreview(content, name, ext) {
        const safeName = sanitize(name);
        let text = '';
        try {
            if (typeof content === 'string' && content.includes('base64,')) {
                text = atob(content.split('base64,')[1]);
            } else if (typeof content === 'string') {
                text = content;
            }
        } catch (e) {
            text = '[Unable to decode]';
        }

        const maxChars = 300;
        const truncated = text.length > maxChars;
        const preview = sanitize(text.substring(0, maxChars));
        const lineCount = text.split('\n').length;
        const charCount = text.length;

        return `<div class="file-preview text-preview">
            <div class="preview-header">${safeName}</div>
            <pre class="preview-code">${preview}${truncated ? '…' : ''}</pre>
            <div class="preview-meta">${lineCount} line${lineCount !== 1 ? 's' : ''} · ${formatSize(charCount)}</div>
        </div>`;
    }

    function audioPreview(name, ext) {
        const safeName = sanitize(name);
        const safeExt = sanitize(ext);
        return `<div class="file-preview media-preview">
            <span class="material-symbols-rounded preview-media-icon">music_note</span>
            <span class="preview-name">${safeName}</span>
            <span class="preview-type">.${safeExt} audio</span>
        </div>`;
    }

    function videoPreview(name, ext) {
        const safeName = sanitize(name);
        const safeExt = sanitize(ext);
        return `<div class="file-preview media-preview">
            <span class="material-symbols-rounded preview-media-icon">videocam</span>
            <span class="preview-name">${safeName}</span>
            <span class="preview-type">.${safeExt} video</span>
        </div>`;
    }

    function appPreview(name) {
        const safeName = sanitize(name);
        return `<div class="file-preview app-preview">
            <span class="material-symbols-rounded preview-media-icon">apps</span>
            <span class="preview-name">${safeName}</span>
            <span class="preview-type">Application</span>
        </div>`;
    }

    function genericPreview(name, ext) {
        const safeName = sanitize(name);
        const safeExt = sanitize(ext);
        return `<div class="file-preview generic-preview">
            <span class="material-symbols-rounded preview-media-icon">description</span>
            <span class="preview-name">${safeName}</span>
            <span class="preview-type">${safeExt ? '.' + safeExt + ' file' : 'File'}</span>
        </div>`;
    }

    function defaultPreview() {
        return `<div class="file-preview generic-preview">
            <span class="material-symbols-rounded preview-media-icon">help_outline</span>
            <span class="preview-name">No preview available</span>
        </div>`;
    }

    function formatSize(bytes) {
        if (bytes < 1024) return bytes + ' B';
        if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
        return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
    }

    function clearCache() {
        previewCache.clear();
    }

    return { generate, clearCache };
})();
