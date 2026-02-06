// Sound effects - uses audio files if available, falls back to Web Audio API
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

    // Preloaded audio buffers for Web Audio API (lower latency)
    const audioBuffers = {};

    // Load audio file into Web Audio buffer for low latency playback
    function loadAudioBuffer(name, paths, index = 0) {
        if (index >= paths.length) return;

        fetch(paths[index])
            .then(response => {
                if (!response.ok) throw new Error('Not found');
                return response.arrayBuffer();
            })
            .then(arrayBuffer => getContext().decodeAudioData(arrayBuffer))
            .then(buffer => {
                audioBuffers[name] = buffer;
            })
            .catch(() => {
                loadAudioBuffer(name, paths, index + 1);
            });
    }

    // Preload audio buffers
    function preloadBuffers() {
        const files = {
            tick: ['sounds/tick.mp3', 'sounds/tick.wav', 'sounds/tick.aiff'],
            result: ['sounds/result.mp3', 'sounds/result.wav', 'sounds/result.aiff'],
            step: ['sounds/step.mp3', 'sounds/step.wav', 'sounds/step.aiff'],
            ladder: ['sounds/ladder.mp3', 'sounds/ladder.wav', 'sounds/ladder.aiff'],
            snake: ['sounds/snake.mp3', 'sounds/snake.wav', 'sounds/snake.aiff'],
            win: ['sounds/win.mp3', 'sounds/win.wav', 'sounds/win.aiff']
        };

        for (const [name, paths] of Object.entries(files)) {
            loadAudioBuffer(name, paths);
        }
    }

    // Play audio buffer with low latency or fall back to Web Audio synthesis
    function playFile(name, fallbackFn) {
        if (!enabled) return;
        if (audioBuffers[name]) {
            const ctx = getContext();
            const source = ctx.createBufferSource();
            const gain = ctx.createGain();
            source.buffer = audioBuffers[name];
            source.connect(gain);
            gain.connect(ctx.destination);
            gain.gain.value = 0.5;
            source.start(0);
        } else {
            fallbackFn();
        }
    }

    // Spinner tick sound
    function spinnerTick() {
        playFile('tick', () => {
            const ctx = getContext();
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();

            osc.connect(gain);
            gain.connect(ctx.destination);

            osc.frequency.value = 800;
            osc.type = 'sine';

            gain.gain.setValueAtTime(0.15, ctx.currentTime);
            gain.gain.setTargetAtTime(0.01, ctx.currentTime, 0.03);

            osc.start(ctx.currentTime);
            osc.stop(ctx.currentTime + 0.05);
        });
    }

    // Spinner result sound
    function spinnerResult() {
        playFile('result', () => {
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
        });
    }

    // Step sound (walking on cells)
    function step() {
        playFile('step', () => {
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
        });
    }

    // Ladder climb sound (ascending notes)
    function ladderClimb() {
        playFile('ladder', () => {
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
        });
    }

    // Snake slide sound (descending notes)
    function snakeSlide() {
        playFile('snake', () => {
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
        });
    }

    // Win sound
    function win() {
        playFile('win', () => {
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
        });
    }

    // Initialize - preload audio buffers for low latency
    preloadBuffers();

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
