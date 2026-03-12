/* ============================================================
   CTRL — System Audio Manager
   Centralized Web Audio API volume control with master gain
   ============================================================ */

const AudioManager = (() => {
    let audioCtx = null;
    let masterGain = null;
    let volume = 0.7;
    let muted = false;

    function init() {
        audioCtx = new (window.AudioContext || window.webkitAudioContext)();
        masterGain = audioCtx.createGain();
        masterGain.connect(audioCtx.destination);
        masterGain.gain.value = volume;
    }

    function getContext() {
        if (!audioCtx) init();
        if (audioCtx.state === 'suspended') audioCtx.resume();
        return audioCtx;
    }

    function getMasterGain() {
        if (!masterGain) init();
        return masterGain;
    }

    function setVolume(val) {
        volume = Math.max(0, Math.min(1, val));
        if (masterGain) {
            masterGain.gain.setTargetAtTime(muted ? 0 : volume, audioCtx.currentTime, 0.02);
        }
        setSetting('systemVolume', volume);
        updateVolumeIcon();
    }

    function getVolume() {
        return volume;
    }

    function isMuted() {
        return muted;
    }

    function toggleMute() {
        muted = !muted;
        if (masterGain) {
            masterGain.gain.setTargetAtTime(muted ? 0 : volume, audioCtx.currentTime, 0.02);
        }
        updateVolumeIcon();
        return muted;
    }

    function updateVolumeIcon() {
        const slider = document.getElementById('qs-volume');
        const icon = slider ? slider.previousElementSibling : null;
        if (!icon) return;
        if (muted || volume === 0) {
            icon.textContent = 'volume_off';
        } else if (volume < 0.5) {
            icon.textContent = 'volume_down';
        } else {
            icon.textContent = 'volume_up';
        }
    }

    function playTone(frequency, duration, type) {
        frequency = frequency || 440;
        duration = duration || 0.15;
        type = type || 'sine';
        var ctx = getContext();
        var osc = ctx.createOscillator();
        var gain = ctx.createGain();
        osc.type = type;
        osc.frequency.setValueAtTime(frequency, ctx.currentTime);
        gain.gain.setValueAtTime(0.3, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);
        osc.connect(gain);
        gain.connect(getMasterGain());
        osc.start(ctx.currentTime);
        osc.stop(ctx.currentTime + duration);
    }

    function playBeeps() {
        var ctx = getContext();
        var now = ctx.currentTime;
        var duration = 0.1;
        var fadeDuration = 0.02;
        var pitch = 700;
        var rhythm = [
            [0, 0.2, 0.4, 0.6],
            [1.2, 1.4, 1.6, 1.8],
            [2.4, 2.6, 2.8, 3.0]
        ];
        var gap = 0.1;
        var getOffsetTime = function (index, time) {
            return now + time + index * (4 * (duration + gap));
        };
        rhythm.forEach(function (set, index) {
            set.forEach(function (time) {
                var offsetTime = getOffsetTime(index, time);
                var oscillator = ctx.createOscillator();
                var gainNode = ctx.createGain();
                oscillator.type = 'triangle';
                oscillator.frequency.setValueAtTime(pitch, offsetTime);
                gainNode.gain.setValueAtTime(0, offsetTime);
                gainNode.gain.linearRampToValueAtTime(1, offsetTime + fadeDuration);
                gainNode.gain.linearRampToValueAtTime(0, offsetTime + duration - fadeDuration);
                oscillator.connect(gainNode);
                gainNode.connect(getMasterGain());
                oscillator.start(offsetTime);
                oscillator.stop(offsetTime + duration);
            });
        });
    }

    async function loadSavedVolume() {
        try {
            var saved = await getSetting('systemVolume');
            if (saved !== undefined && saved !== null) {
                volume = parseFloat(saved);
                if (isNaN(volume)) volume = 0.7;
                volume = Math.max(0, Math.min(1, volume));
                if (masterGain) masterGain.gain.value = volume;
            }
            var slider = document.getElementById('qs-volume');
            if (slider) slider.value = Math.round(volume * 100);
            updateVolumeIcon();
        } catch (e) {
            // Use defaults on error
        }
    }

    return {
        init: init,
        getContext: getContext,
        getMasterGain: getMasterGain,
        setVolume: setVolume,
        getVolume: getVolume,
        isMuted: isMuted,
        toggleMute: toggleMute,
        playTone: playTone,
        playBeeps: playBeeps,
        loadSavedVolume: loadSavedVolume,
        updateVolumeIcon: updateVolumeIcon
    };
})();
