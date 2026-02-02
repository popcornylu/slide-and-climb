// Spinner (wheel) logic and animation
const Spinner = (() => {
    let canvas, ctx;
    let spinning = false;
    let currentAngle = 0;
    let onResult = null;
    let enabled = true;
    let logicalSize = 0;

    const SEGMENTS = 6;
    const SEGMENT_ANGLE = (Math.PI * 2) / SEGMENTS;
    const COLORS = ['#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FFEAA7', '#DDA0DD'];
    const NUMBERS = [1, 2, 3, 4, 5, 6];

    function init(canvasEl) {
        canvas = canvasEl;
        ctx = canvas.getContext('2d');

        canvas.addEventListener('click', handleClick);
        canvas.addEventListener('touchstart', (e) => {
            e.preventDefault();
            handleClick(e);
        }, { passive: false });
    }

    function handleClick() {
        if (!spinning && enabled) {
            spin();
        }
    }

    function resize(size) {
        const dpr = window.devicePixelRatio || 1;
        logicalSize = size;
        canvas.width = size * dpr;
        canvas.height = size * dpr;
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        draw();
    }

    function setEnabled(val) {
        enabled = val;
        canvas.style.opacity = val ? '1' : '0.5';
        canvas.style.cursor = val ? 'pointer' : 'default';
    }

    function setOnResult(cb) {
        onResult = cb;
    }

    function spin() {
        if (spinning) return;
        spinning = true;

        // Determine result first
        const result = Math.floor(Math.random() * 6) + 1;
        const resultIdx = result - 1;

        // We want the center of segment resultIdx to be at -PI/2 (top, under pointer).
        // Segment i is drawn at currentAngle + i*SEGMENT_ANGLE to currentAngle + (i+1)*SEGMENT_ANGLE.
        // Center of segment resultIdx on screen = currentAngle + resultIdx*SEGMENT_ANGLE + SEGMENT_ANGLE/2
        // We need: finalAngle + resultIdx*SEGMENT_ANGLE + SEGMENT_ANGLE/2 = -PI/2 (mod 2PI)
        // finalAngle = -PI/2 - resultIdx*SEGMENT_ANGLE - SEGMENT_ANGLE/2 + 2*PI*k
        const baseTarget = -Math.PI / 2 - resultIdx * SEGMENT_ANGLE - SEGMENT_ANGLE / 2;

        // Add randomness within segment (so it doesn't always land dead center)
        const jitter = (Math.random() - 0.5) * SEGMENT_ANGLE * 0.6;

        // Add multiple full rotations for visual effect, always spinning "forward" (decreasing angle = clockwise)
        const extraRotations = (5 + Math.floor(Math.random() * 3)) * Math.PI * 2;

        // Compute final angle: go to baseTarget + jitter, then subtract extra rotations
        // to ensure we spin clockwise past the target multiple times
        let finalAngle = baseTarget + jitter;
        // Make sure finalAngle is below currentAngle by enough rotations
        while (finalAngle > currentAngle) {
            finalAngle -= Math.PI * 2;
        }
        finalAngle -= extraRotations;

        const startAngle = currentAngle;
        const duration = 3000 + Math.random() * 1000;
        const startTime = performance.now();

        function animate(now) {
            const elapsed = now - startTime;
            const t = Math.min(1, elapsed / duration);
            // Ease out cubic
            const eased = 1 - Math.pow(1 - t, 3);
            currentAngle = startAngle + (finalAngle - startAngle) * eased;
            draw();

            if (t < 1) {
                requestAnimationFrame(animate);
            } else {
                currentAngle = finalAngle;
                spinning = false;
                draw();
                if (onResult) {
                    onResult(result);
                }
            }
        }

        requestAnimationFrame(animate);
    }

    function draw() {
        if (!canvas || logicalSize === 0) return;
        const w = logicalSize;
        const h = logicalSize;
        const cx = w / 2;
        const cy = h / 2;
        const radius = Math.min(cx, cy) * 0.85;

        ctx.clearRect(0, 0, w, h);

        // Draw segments
        for (let i = 0; i < SEGMENTS; i++) {
            const startA = currentAngle + i * SEGMENT_ANGLE;
            const endA = startA + SEGMENT_ANGLE;

            ctx.beginPath();
            ctx.moveTo(cx, cy);
            ctx.arc(cx, cy, radius, startA, endA);
            ctx.closePath();
            ctx.fillStyle = COLORS[i];
            ctx.fill();
            ctx.strokeStyle = '#FFF';
            ctx.lineWidth = 2;
            ctx.stroke();

            // Draw number
            const textAngle = startA + SEGMENT_ANGLE / 2;
            const textR = radius * 0.65;
            const tx = cx + Math.cos(textAngle) * textR;
            const ty = cy + Math.sin(textAngle) * textR;

            const fontSize = Math.max(14, radius * 0.3);
            ctx.fillStyle = '#FFF';
            ctx.font = `bold ${fontSize}px sans-serif`;
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';

            ctx.save();
            ctx.shadowColor = 'rgba(0,0,0,0.3)';
            ctx.shadowBlur = 3;
            ctx.fillText(NUMBERS[i], tx, ty);
            ctx.restore();
        }

        // Center circle
        ctx.beginPath();
        ctx.arc(cx, cy, radius * 0.15, 0, Math.PI * 2);
        ctx.fillStyle = '#FFF';
        ctx.fill();
        ctx.strokeStyle = '#DDD';
        ctx.lineWidth = 2;
        ctx.stroke();

        // Pointer (triangle at top)
        const pointerSize = radius * 0.18;
        ctx.fillStyle = '#333';
        ctx.beginPath();
        ctx.moveTo(cx, cy - radius - pointerSize * 0.3);
        ctx.lineTo(cx - pointerSize * 0.5, cy - radius + pointerSize);
        ctx.lineTo(cx + pointerSize * 0.5, cy - radius + pointerSize);
        ctx.closePath();
        ctx.fill();

        // Outer ring
        ctx.beginPath();
        ctx.arc(cx, cy, radius, 0, Math.PI * 2);
        ctx.strokeStyle = '#555';
        ctx.lineWidth = 3;
        ctx.stroke();
    }

    function triggerSpin() {
        if (!spinning) {
            spin();
        }
    }

    return {
        init,
        resize,
        draw,
        setEnabled,
        setOnResult,
        triggerSpin,
        get spinning() { return spinning; }
    };
})();
