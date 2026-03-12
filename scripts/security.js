/**
 * CTRL Security & Sanitization Module
 * Provides XSS protection, input validation, and content sanitization.
 */
(function (global) {
    'use strict';

    const SANITIZE_PROFILES = {
        default: {
            ALLOWED_TAGS: ['b', 'i', 'em', 'strong', 'a', 'p', 'br', 'ul', 'ol', 'li',
                'h1', 'h2', 'h3', 'code', 'pre', 'span', 'div', 'img', 'small', 'hr', 'blockquote'],
            ALLOWED_ATTR: ['href', 'src', 'alt', 'class', 'style', 'title', 'target'],
            ALLOW_DATA_ATTR: false,
            ADD_ATTR: ['target']
        },
        strict: {
            ALLOWED_TAGS: ['b', 'i', 'em', 'strong', 'br', 'span'],
            ALLOWED_ATTR: ['class'],
            ALLOW_DATA_ATTR: false
        },
        rich: {
            ALLOWED_TAGS: ['b', 'i', 'em', 'strong', 'a', 'p', 'br', 'ul', 'ol', 'li',
                'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'code', 'pre', 'span', 'div', 'img',
                'table', 'thead', 'tbody', 'tr', 'td', 'th', 'caption', 'figure',
                'figcaption', 'blockquote', 'hr', 'small', 'sub', 'sup', 'mark',
                'details', 'summary', 'dl', 'dt', 'dd', 'abbr', 'cite'],
            ALLOWED_ATTR: ['href', 'src', 'alt', 'class', 'style', 'title', 'target',
                'colspan', 'rowspan', 'width', 'height', 'scope'],
            ALLOW_DATA_ATTR: false,
            ADD_ATTR: ['target']
        },
        plain: {
            ALLOWED_TAGS: [],
            KEEP_CONTENT: true
        }
    };

    /**
     * Sanitize HTML content using DOMPurify with configurable profiles.
     * @param {string} html - Raw HTML string to sanitize.
     * @param {string} profile - Profile name: 'default', 'strict', 'rich', 'plain'.
     * @returns {string} Sanitized HTML string.
     */
    function sanitizeHTML(html, profile) {
        if (typeof html !== 'string') return '';
        if (typeof DOMPurify === 'undefined') {
            console.warn('DOMPurify not loaded, falling back to escapeHTML');
            return escapeHTML(html);
        }
        const config = SANITIZE_PROFILES[profile] || SANITIZE_PROFILES['default'];
        return DOMPurify.sanitize(html, config);
    }

    /**
     * Escape HTML special characters to prevent XSS when inserting text into HTML.
     * @param {string} str - Raw text string.
     * @returns {string} Escaped string safe for insertion into HTML.
     */
    function escapeHTML(str) {
        if (typeof str !== 'string') return '';
        const map = {
            '&': '&amp;',
            '<': '&lt;',
            '>': '&gt;',
            '"': '&quot;',
            "'": '&#x27;',
            '/': '&#x2F;'
        };
        return str.replace(/[&<>"'/]/g, ch => map[ch]);
    }

    /**
     * Sanitize a file name to prevent path traversal and special character issues.
     * @param {string} name - Raw file name.
     * @returns {string} Sanitized file name.
     */
    function sanitizeFileName(name) {
        if (typeof name !== 'string') return 'unnamed';
        // Remove path traversal attempts
        name = name.replace(/\.\.\//g, '').replace(/\.\.\\/g, '');
        // Remove characters that are unsafe in file names
        name = name.replace(/[<>:"/\\|?*\x00-\x1f]/g, '');
        // Trim whitespace and dots from start/end
        name = name.replace(/^[\s.]+|[\s.]+$/g, '');
        // Limit length
        if (name.length > 255) name = name.substring(0, 255);
        // Fallback if empty
        if (!name) name = 'unnamed';
        return name;
    }

    /**
     * Validate a color code string.
     * @param {string} color - Color code (hex format).
     * @returns {boolean} True if valid hex color.
     */
    function isValidColor(color) {
        if (typeof color !== 'string') return false;
        return /^#[0-9a-fA-F]{3,8}$/.test(color);
    }

    /**
     * Validate a URL string.
     * @param {string} url - URL string to validate.
     * @returns {boolean} True if valid URL.
     */
    function isValidURL(url) {
        if (typeof url !== 'string') return false;
        try {
            const parsed = new URL(url);
            return ['http:', 'https:', 'data:', 'blob:'].includes(parsed.protocol);
        } catch {
            return false;
        }
    }

    /**
     * Validate and sanitize a text input: strip control characters, limit length.
     * @param {string} text - Raw text input.
     * @param {number} maxLength - Maximum allowed length.
     * @returns {string} Sanitized text.
     */
    function sanitizeTextInput(text, maxLength) {
        if (typeof text !== 'string') return '';
        maxLength = maxLength || 1024;
        // Strip control characters except newline, tab, carriage return
        text = text.replace(/[\x00-\x08\x0b\x0c\x0e-\x1f\x7f]/g, '');
        if (text.length > maxLength) text = text.substring(0, maxLength);
        return text;
    }

    /**
     * Validate a numeric input within bounds.
     * @param {*} value - Value to validate.
     * @param {number} min - Minimum allowed value.
     * @param {number} max - Maximum allowed value.
     * @param {number} fallback - Fallback value if validation fails.
     * @returns {number} Validated number or fallback.
     */
    function validateNumber(value, min, max, fallback) {
        const num = Number(value);
        if (isNaN(num)) return fallback;
        if (num < min) return min;
        if (num > max) return max;
        return num;
    }

    /**
     * Sanitize an SVG string for use as an app icon.
     * Strips any non-SVG content and validates structure.
     * @param {string} svg - Raw SVG string.
     * @returns {string} Sanitized SVG or empty string.
     */
    function sanitizeSVGIcon(svg) {
        if (typeof svg !== 'string') return '';
        if (typeof DOMPurify === 'undefined') return '';
        return DOMPurify.sanitize(svg, {
            USE_PROFILES: { svg: true, svgFilters: true },
            ADD_TAGS: ['use'],
            ADD_ATTR: ['xlink:href', 'xml:space'],
            ALLOW_DATA_ATTR: false
        });
    }

    /**
     * Check if a postMessage event source is a valid app iframe.
     * Only accepts messages from our own iframe children.
     * @param {MessageEventSource} source - The event.source from postMessage.
     * @returns {boolean} True if the source is a known iframe.
     */
    function isValidAppOrigin(source) {
        if (!source) return false;
        const iframes = document.querySelectorAll('iframe');
        for (const iframe of iframes) {
            if (iframe.contentWindow === source) return true;
        }
        return false;
    }

    /**
     * Validate the structure of an incoming NTX postMessage payload.
     * @param {*} data - The event.data from postMessage.
     * @returns {boolean} True if payload has valid structure.
     */
    function isValidNTXPayload(data) {
        if (typeof data !== 'object' || data === null) return false;
        if (typeof data.transactionId !== 'string' || !data.transactionId) return false;
        if (data.transactionId.length > 200) return false;
        if (typeof data.action !== 'string' || !data.action) return false;
        if (!data.action.includes('.')) return false;
        if (data.action.length > 100) return false;
        if (data.params !== undefined && !Array.isArray(data.params)) return false;
        return true;
    }

    // Expose to global scope
    global.sanitizeHTML = sanitizeHTML;
    global.escapeHTML = escapeHTML;
    global.sanitizeFileName = sanitizeFileName;
    global.sanitizeSVGIcon = sanitizeSVGIcon;
    global.isValidColor = isValidColor;
    global.isValidURL = isValidURL;
    global.sanitizeTextInput = sanitizeTextInput;
    global.validateNumber = validateNumber;
    global.isValidAppOrigin = isValidAppOrigin;
    global.isValidNTXPayload = isValidNTXPayload;

})(typeof window !== 'undefined' ? window : globalThis);
