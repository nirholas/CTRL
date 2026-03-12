/* ============================================================
   CTRL — Sound Effects System
   Generates short audio clips using Web Audio API oscillators
   and gain envelopes. No external audio files needed.
   ============================================================ */

class CTRLSounds {
    constructor() {
        this.ctx = null;
        this.enabled = true;
        this.volume = 0.3;
    }

    getContext() {
        if (!this.ctx || this.ctx.state === 'closed') {
            this.ctx = new (window.AudioContext || window.webkitAudioContext)();
        }
        // Resume if suspended (autoplay policy)
        if (this.ctx.state === 'suspended') {
            this.ctx.resume();
        }
        return this.ctx;
    }

    async init() {
        try {
            const enabledSetting = await getSetting('soundEnabled');
            this.enabled = enabledSetting !== false;
            const volumeSetting = await getSetting('soundVolume');
            this.volume = (volumeSetting !== null && volumeSetting !== undefined) ? volumeSetting : 0.3;
        } catch (e) {
            console.warn('CTRLSounds: Could not load settings, using defaults.', e);
        }
    }

    /**
     * Boot chime — warm rising chord: two sine waves (C4 + E4) sweeping
     * up to (E4 + G4) over 800ms with a gentle fade-out.
     */
    boot() {
        if (!this.enabled) return;
        try {
            const ctx = this.getContext();
            const now = ctx.currentTime;
            const duration = 0.8;

            // Oscillator 1: C4 (261.63) → E4 (329.63)
            const osc1 = ctx.createOscillator();
            osc1.type = 'sine';
            osc1.frequency.setValueAtTime(261.63, now);
            osc1.frequency.linearRampToValueAtTime(329.63, now + duration);

            // Oscillator 2: E4 (329.63) → G4 (392.00)
            const osc2 = ctx.createOscillator();
            osc2.type = 'sine';
            osc2.frequency.setValueAtTime(329.63, now);
            osc2.frequency.linearRampToValueAtTime(392.00, now + duration);

            // Gain envelope: fade in quickly, sustain, fade out
            const gain = ctx.createGain();
            gain.gain.setValueAtTime(0, now);
            gain.gain.linearRampToValueAtTime(this.volume * 0.6, now + 0.05);
            gain.gain.setValueAtTime(this.volume * 0.6, now + duration * 0.6);
            gain.gain.linearRampToValueAtTime(0, now + duration);

            osc1.connect(gain);
            osc2.connect(gain);
            gain.connect(ctx.destination);

            osc1.start(now);
            osc2.start(now);
            osc1.stop(now + duration);
            osc2.stop(now + duration);
        } catch (e) {
            console.warn('CTRLSounds: boot() failed', e);
        }
    }

    /**
     * Notification — two short high-pitched notes: sine at 880Hz for 100ms,
     * silent 50ms, sine at 1046Hz for 100ms. A gentle "ding-ding".
     */
    notification() {
        if (!this.enabled) return;
        try {
            const ctx = this.getContext();
            const now = ctx.currentTime;

            // Note 1: 880Hz for 100ms
            const osc1 = ctx.createOscillator();
            osc1.type = 'sine';
            osc1.frequency.setValueAtTime(880, now);
            const gain1 = ctx.createGain();
            gain1.gain.setValueAtTime(0, now);
            gain1.gain.linearRampToValueAtTime(this.volume * 0.5, now + 0.01);
            gain1.gain.setValueAtTime(this.volume * 0.5, now + 0.08);
            gain1.gain.linearRampToValueAtTime(0, now + 0.1);
            osc1.connect(gain1);
            gain1.connect(ctx.destination);
            osc1.start(now);
            osc1.stop(now + 0.1);

            // Note 2: 1046Hz for 100ms, starting at 150ms
            const osc2 = ctx.createOscillator();
            osc2.type = 'sine';
            osc2.frequency.setValueAtTime(1046, now + 0.15);
            const gain2 = ctx.createGain();
            gain2.gain.setValueAtTime(0, now + 0.15);
            gain2.gain.linearRampToValueAtTime(this.volume * 0.5, now + 0.16);
            gain2.gain.setValueAtTime(this.volume * 0.5, now + 0.23);
            gain2.gain.linearRampToValueAtTime(0, now + 0.25);
            osc2.connect(gain2);
            gain2.connect(ctx.destination);
            osc2.start(now + 0.15);
            osc2.stop(now + 0.25);
        } catch (e) {
            console.warn('CTRLSounds: notification() failed', e);
        }
    }

    /**
     * Window open — quiet "whoosh": white noise burst through a bandpass
     * filter (800Hz center), 150ms, quick attack + decay.
     */
    windowOpen() {
        if (!this.enabled) return;
        try {
            const ctx = this.getContext();
            const now = ctx.currentTime;
            const duration = 0.15;

            // White noise via buffer
            const bufferSize = ctx.sampleRate * duration;
            const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
            const data = buffer.getChannelData(0);
            for (let i = 0; i < bufferSize; i++) {
                data[i] = Math.random() * 2 - 1;
            }

            const noise = ctx.createBufferSource();
            noise.buffer = buffer;

            // Bandpass filter at 800Hz
            const filter = ctx.createBiquadFilter();
            filter.type = 'bandpass';
            filter.frequency.setValueAtTime(800, now);
            filter.Q.setValueAtTime(1.5, now);

            // Gain envelope: quick attack, decay
            const gain = ctx.createGain();
            gain.gain.setValueAtTime(0, now);
            gain.gain.linearRampToValueAtTime(this.volume * 0.3, now + 0.02);
            gain.gain.linearRampToValueAtTime(0, now + duration);

            noise.connect(filter);
            filter.connect(gain);
            gain.connect(ctx.destination);

            noise.start(now);
            noise.stop(now + duration);
        } catch (e) {
            console.warn('CTRLSounds: windowOpen() failed', e);
        }
    }

    /**
     * Window close — same as windowOpen but with descending pitch
     * (bandpass center sweeps from 800Hz to 400Hz), shorter at 100ms.
     */
    windowClose() {
        if (!this.enabled) return;
        try {
            const ctx = this.getContext();
            const now = ctx.currentTime;
            const duration = 0.1;

            const bufferSize = ctx.sampleRate * duration;
            const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
            const data = buffer.getChannelData(0);
            for (let i = 0; i < bufferSize; i++) {
                data[i] = Math.random() * 2 - 1;
            }

            const noise = ctx.createBufferSource();
            noise.buffer = buffer;

            // Bandpass filter sweeping from 800Hz down to 400Hz
            const filter = ctx.createBiquadFilter();
            filter.type = 'bandpass';
            filter.frequency.setValueAtTime(800, now);
            filter.frequency.linearRampToValueAtTime(400, now + duration);
            filter.Q.setValueAtTime(1.5, now);

            const gain = ctx.createGain();
            gain.gain.setValueAtTime(0, now);
            gain.gain.linearRampToValueAtTime(this.volume * 0.25, now + 0.015);
            gain.gain.linearRampToValueAtTime(0, now + duration);

            noise.connect(filter);
            filter.connect(gain);
            gain.connect(ctx.destination);

            noise.start(now);
            noise.stop(now + duration);
        } catch (e) {
            console.warn('CTRLSounds: windowClose() failed', e);
        }
    }

    /**
     * Error — two low-pitched buzzes: square wave at 200Hz for 80ms,
     * silent 60ms, square wave at 180Hz for 80ms. Clearly "wrong"
     * without being annoying.
     */
    error() {
        if (!this.enabled) return;
        try {
            const ctx = this.getContext();
            const now = ctx.currentTime;

            // Buzz 1: 200Hz for 80ms
            const osc1 = ctx.createOscillator();
            osc1.type = 'square';
            osc1.frequency.setValueAtTime(200, now);
            const gain1 = ctx.createGain();
            gain1.gain.setValueAtTime(0, now);
            gain1.gain.linearRampToValueAtTime(this.volume * 0.3, now + 0.01);
            gain1.gain.setValueAtTime(this.volume * 0.3, now + 0.07);
            gain1.gain.linearRampToValueAtTime(0, now + 0.08);
            osc1.connect(gain1);
            gain1.connect(ctx.destination);
            osc1.start(now);
            osc1.stop(now + 0.08);

            // Buzz 2: 180Hz for 80ms, starting at 140ms
            const osc2 = ctx.createOscillator();
            osc2.type = 'square';
            osc2.frequency.setValueAtTime(180, now + 0.14);
            const gain2 = ctx.createGain();
            gain2.gain.setValueAtTime(0, now + 0.14);
            gain2.gain.linearRampToValueAtTime(this.volume * 0.3, now + 0.15);
            gain2.gain.setValueAtTime(this.volume * 0.3, now + 0.21);
            gain2.gain.linearRampToValueAtTime(0, now + 0.22);
            osc2.connect(gain2);
            gain2.connect(ctx.destination);
            osc2.start(now + 0.14);
            osc2.stop(now + 0.22);
        } catch (e) {
            console.warn('CTRLSounds: error() failed', e);
        }
    }

    /**
     * Click — extremely short tick: white noise, 15ms, highpass filtered
     * at 4000Hz, very low volume. Barely perceptible.
     */
    click() {
        if (!this.enabled) return;
        try {
            const ctx = this.getContext();
            const now = ctx.currentTime;
            const duration = 0.015;

            const bufferSize = ctx.sampleRate * duration;
            const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
            const data = buffer.getChannelData(0);
            for (let i = 0; i < bufferSize; i++) {
                data[i] = Math.random() * 2 - 1;
            }

            const noise = ctx.createBufferSource();
            noise.buffer = buffer;

            const filter = ctx.createBiquadFilter();
            filter.type = 'highpass';
            filter.frequency.setValueAtTime(4000, now);

            const gain = ctx.createGain();
            gain.gain.setValueAtTime(0, now);
            gain.gain.linearRampToValueAtTime(this.volume * 0.15, now + 0.002);
            gain.gain.linearRampToValueAtTime(0, now + duration);

            noise.connect(filter);
            filter.connect(gain);
            gain.connect(ctx.destination);

            noise.start(now);
            noise.stop(now + duration);
        } catch (e) {
            console.warn('CTRLSounds: click() failed', e);
        }
    }

    /**
     * Lock — descending tone: sine 600Hz → 400Hz over 300ms with smooth fade.
     */
    lock() {
        if (!this.enabled) return;
        try {
            const ctx = this.getContext();
            const now = ctx.currentTime;
            const duration = 0.3;

            const osc = ctx.createOscillator();
            osc.type = 'sine';
            osc.frequency.setValueAtTime(600, now);
            osc.frequency.linearRampToValueAtTime(400, now + duration);

            const gain = ctx.createGain();
            gain.gain.setValueAtTime(0, now);
            gain.gain.linearRampToValueAtTime(this.volume * 0.4, now + 0.02);
            gain.gain.setValueAtTime(this.volume * 0.4, now + duration * 0.6);
            gain.gain.linearRampToValueAtTime(0, now + duration);

            osc.connect(gain);
            gain.connect(ctx.destination);

            osc.start(now);
            osc.stop(now + duration);
        } catch (e) {
            console.warn('CTRLSounds: lock() failed', e);
        }
    }

    /**
     * Unlock — ascending tone: sine 400Hz → 600Hz over 300ms with smooth fade.
     */
    unlock() {
        if (!this.enabled) return;
        try {
            const ctx = this.getContext();
            const now = ctx.currentTime;
            const duration = 0.3;

            const osc = ctx.createOscillator();
            osc.type = 'sine';
            osc.frequency.setValueAtTime(400, now);
            osc.frequency.linearRampToValueAtTime(600, now + duration);

            const gain = ctx.createGain();
            gain.gain.setValueAtTime(0, now);
            gain.gain.linearRampToValueAtTime(this.volume * 0.4, now + 0.02);
            gain.gain.setValueAtTime(this.volume * 0.4, now + duration * 0.6);
            gain.gain.linearRampToValueAtTime(0, now + duration);

            osc.connect(gain);
            gain.connect(ctx.destination);

            osc.start(now);
            osc.stop(now + duration);
        } catch (e) {
            console.warn('CTRLSounds: unlock() failed', e);
        }
    }

    /**
     * Minimize — soft descending swoosh: white noise through bandpass filter
     * sweeping from 1200Hz down to 400Hz over 200ms.
     */
    minimize() {
        if (!this.enabled) return;
        try {
            const ctx = this.getContext();
            const now = ctx.currentTime;
            const duration = 0.2;

            const bufferSize = ctx.sampleRate * duration;
            const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
            const data = buffer.getChannelData(0);
            for (let i = 0; i < bufferSize; i++) {
                data[i] = Math.random() * 2 - 1;
            }

            const noise = ctx.createBufferSource();
            noise.buffer = buffer;

            const filter = ctx.createBiquadFilter();
            filter.type = 'bandpass';
            filter.frequency.setValueAtTime(1200, now);
            filter.frequency.linearRampToValueAtTime(400, now + duration);
            filter.Q.setValueAtTime(2, now);

            const gain = ctx.createGain();
            gain.gain.setValueAtTime(0, now);
            gain.gain.linearRampToValueAtTime(this.volume * 0.2, now + 0.02);
            gain.gain.linearRampToValueAtTime(0, now + duration);

            noise.connect(filter);
            filter.connect(gain);
            gain.connect(ctx.destination);

            noise.start(now);
            noise.stop(now + duration);
        } catch (e) {
            console.warn('CTRLSounds: minimize() failed', e);
        }
    }

    /**
     * Maximize — soft ascending whoosh: white noise through bandpass filter
     * sweeping from 400Hz up to 1200Hz over 200ms.
     */
    maximize() {
        if (!this.enabled) return;
        try {
            const ctx = this.getContext();
            const now = ctx.currentTime;
            const duration = 0.2;

            const bufferSize = ctx.sampleRate * duration;
            const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
            const data = buffer.getChannelData(0);
            for (let i = 0; i < bufferSize; i++) {
                data[i] = Math.random() * 2 - 1;
            }

            const noise = ctx.createBufferSource();
            noise.buffer = buffer;

            const filter = ctx.createBiquadFilter();
            filter.type = 'bandpass';
            filter.frequency.setValueAtTime(400, now);
            filter.frequency.linearRampToValueAtTime(1200, now + duration);
            filter.Q.setValueAtTime(2, now);

            const gain = ctx.createGain();
            gain.gain.setValueAtTime(0, now);
            gain.gain.linearRampToValueAtTime(this.volume * 0.2, now + 0.02);
            gain.gain.linearRampToValueAtTime(0, now + duration);

            noise.connect(filter);
            filter.connect(gain);
            gain.connect(ctx.destination);

            noise.start(now);
            noise.stop(now + duration);
        } catch (e) {
            console.warn('CTRLSounds: maximize() failed', e);
        }
    }

    /**
     * Alert — 3 quick beeps using triangle wave at 800Hz,
     * with 60ms gaps between them. Total ~400ms.
     */
    alert() {
        if (!this.enabled) return;
        try {
            const ctx = this.getContext();
            const now = ctx.currentTime;

            for (let i = 0; i < 3; i++) {
                const offset = i * 0.13;
                const osc = ctx.createOscillator();
                osc.type = 'triangle';
                osc.frequency.setValueAtTime(800, now + offset);

                const gain = ctx.createGain();
                gain.gain.setValueAtTime(0, now + offset);
                gain.gain.linearRampToValueAtTime(this.volume * 0.4, now + offset + 0.01);
                gain.gain.setValueAtTime(this.volume * 0.4, now + offset + 0.06);
                gain.gain.linearRampToValueAtTime(0, now + offset + 0.07);

                osc.connect(gain);
                gain.connect(ctx.destination);

                osc.start(now + offset);
                osc.stop(now + offset + 0.07);
            }
        } catch (e) {
            console.warn('CTRLSounds: alert() failed', e);
        }
    }

    /**
     * Dispatch to a named sound generator.
     * Silently no-ops if the sound name is unknown or context isn't ready.
     */
    play(soundName) {
        const sounds = {
            startup: 'boot',
            boot: 'boot',
            windowOpen: 'windowOpen',
            windowClose: 'windowClose',
            minimize: 'minimize',
            maximize: 'maximize',
            notification: 'notification',
            error: 'error',
            alert: 'alert',
            click: 'click',
            lock: 'lock',
            unlock: 'unlock'
        };
        const method = sounds[soundName];
        if (method && typeof this[method] === 'function') {
            this[method]();
        }
    }

    /**
     * Set volume (0-1 float).
     */
    setVolume(val) {
        this.volume = Math.max(0, Math.min(1, val));
        setSetting('soundVolume', this.volume);
    }

    /**
     * Set enabled state explicitly.
     */
    setEnabled(enabled) {
        this.enabled = !!enabled;
        setSetting('soundEnabled', this.enabled);
    }

    /**
     * Toggle enabled state, returns new state.
     */
    toggle() {
        this.enabled = !this.enabled;
        setSetting('soundEnabled', this.enabled);
        return this.enabled;
    }
}

/* Lazy AudioContext initialization — browsers require a user gesture
   before creating an AudioContext. We listen for the first interaction
   event and pre-warm the context so subsequent play() calls work
   immediately. */
(function initLazyAudioContext() {
    function onFirstInteraction() {
        if (typeof window.agentSounds !== 'undefined' && window.agentSounds) {
            window.agentSounds.getContext();
        }
        document.removeEventListener('mousedown', onFirstInteraction);
        document.removeEventListener('keydown', onFirstInteraction);
        document.removeEventListener('touchstart', onFirstInteraction);
    }
    document.addEventListener('mousedown', onFirstInteraction, { once: true });
    document.addEventListener('keydown', onFirstInteraction, { once: true });
    document.addEventListener('touchstart', onFirstInteraction, { once: true });
})();
