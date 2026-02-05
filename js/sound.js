// Sound effects using Web Audio API
const Sound = (() => {
    let audioCtx = null;
    let enabled = true;

    function getContext() {
        if (!audioCtx) {
            audioCtx = new (window.AudioContext || window.webkitAudioContext)();
        }
        return audioCtx;
    }

    function resume() {
        const ctx = getContext();
        if (ctx.state === 'suspended') {
            ctx.resume();
        }
    }

    // Spinner tick sound
    function spinnerTick() {
        if (!enabled) return;
        const ctx = getContext();
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();

        osc.connect(gain);
        gain.connect(ctx.destination);

        osc.frequency.value = 800;
        osc.type = 'sine';

        gain.gain.setValueAtTime(0.15, ctx.currentTime);
        gain.gain.exponentialDecayTo = 0.01;
        gain.gain.setTargetAtTime(0.01, ctx.currentTime, 0.03);

        osc.start(ctx.currentTime);
        osc.stop(ctx.currentTime + 0.05);
    }

    // Spinner result sound
    function spinnerResult() {
        if (!enabled) return;
        const ctx = getContext();
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();

        osc.connect(gain);
        gain.connect(ctx.destination);

        osc.frequency.value = 600;
        osc.type = 'sine';

        gain.gain.setValueAtTime(0.2, ctx.currentTime);
        gain.gain.setTargetAtTime(0.01, ctx.currentTime + 0.1, 0.1);

        osc.start(ctx.currentTime);
        osc.stop(ctx.currentTime + 0.3);
    }

    // Step sound (walking on cells)
    function step() {
        if (!enabled) return;
        const ctx = getContext();
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();

        osc.connect(gain);
        gain.connect(ctx.destination);

        osc.frequency.value = 300 + Math.random() * 100;
        osc.type = 'sine';

        gain.gain.setValueAtTime(0.12, ctx.currentTime);
        gain.gain.setTargetAtTime(0.01, ctx.currentTime, 0.05);

        osc.start(ctx.currentTime);
        osc.stop(ctx.currentTime + 0.1);
    }

    // Ladder climb sound (ascending notes)
    function ladderClimb() {
        if (!enabled) return;
        const ctx = getContext();
        const notes = [400, 500, 600, 700, 800];

        notes.forEach((freq, i) => {
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();

            osc.connect(gain);
            gain.connect(ctx.destination);

            osc.frequency.value = freq;
            osc.type = 'sine';

            const startTime = ctx.currentTime + i * 0.08;
            gain.gain.setValueAtTime(0.15, startTime);
            gain.gain.setTargetAtTime(0.01, startTime + 0.05, 0.03);

            osc.start(startTime);
            osc.stop(startTime + 0.12);
        });
    }

    // Snake slide sound (descending notes)
    function snakeSlide() {
        if (!enabled) return;
        const ctx = getContext();
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();

        osc.connect(gain);
        gain.connect(ctx.destination);

        osc.type = 'sine';
        osc.frequency.setValueAtTime(800, ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(200, ctx.currentTime + 0.4);

        gain.gain.setValueAtTime(0.15, ctx.currentTime);
        gain.gain.setTargetAtTime(0.01, ctx.currentTime + 0.3, 0.1);

        osc.start(ctx.currentTime);
        osc.stop(ctx.currentTime + 0.5);
    }

    // Win sound
    function win() {
        if (!enabled) return;
        const ctx = getContext();
        const notes = [523, 659, 784, 1047]; // C5, E5, G5, C6

        notes.forEach((freq, i) => {
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();

            osc.connect(gain);
            gain.connect(ctx.destination);

            osc.frequency.value = freq;
            osc.type = 'sine';

            const startTime = ctx.currentTime + i * 0.15;
            gain.gain.setValueAtTime(0.2, startTime);
            gain.gain.setTargetAtTime(0.01, startTime + 0.1, 0.1);

            osc.start(startTime);
            osc.stop(startTime + 0.3);
        });
    }

    return {
        resume,
        spinnerTick,
        spinnerResult,
        step,
        ladderClimb,
        snakeSlide,
        win
    };
})();
