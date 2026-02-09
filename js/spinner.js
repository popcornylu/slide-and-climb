// Spinner (wheel) logic and animation
const Spinner = (() => {
    let canvas, ctx;
    let spinning = false;
    let currentAngle = 0;
    let onResult = null;
    let enabled = true;
    let logicalSize = 0;
    let paused = false;
    let pausedAt = 0;
    let accumulatedPause = 0;
    let animationId = null;

    // Default mode: numbers 1-6
    let mode = 'numbers';
    let segments = 6;
    let segmentAngle = (Math.PI * 2) / 6;
    let segmentColors = ['#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FFEAA7', '#DDA0DD'];
    let segmentLabels = ['1', '2', '3', '4', '5', '6'];

    // Player mode data
    let playerData = null;

    // Highlight state: which segment is highlighted (-1 = none, during spin = current segment)
    let highlightedSegment = -1;
    let showResult = false;

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
        canvas.style.cursor = val ? 'pointer' : 'default';
        // Don't change opacity - let the highlight effect handle visual feedback
    }

    function setOnResult(cb) {
        onResult = cb;
    }

    // Set player mode for turn order determination
    function setPlayerMode(players) {
        mode = 'players';
        playerData = players;
        segments = players.length;
        segmentAngle = (Math.PI * 2) / segments;
        segmentColors = players.map(p => p.color);
        segmentLabels = players.map(p => p.name);
        draw();
    }

    // Reset to number mode (1-6)
    function setNumberMode() {
        mode = 'numbers';
        playerData = null;
        segments = 6;
        segmentAngle = (Math.PI * 2) / 6;
        segmentColors = ['#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FFEAA7', '#DDA0DD'];
        segmentLabels = ['1', '2', '3', '4', '5', '6'];
        highlightedSegment = -1;
        showResult = false;
        draw();
    }

    function spin() {
        if (spinning) return;
        spinning = true;
        showResult = false;

        // Resume audio context on user interaction
        Sound.resume();

        // Determine result first (0-indexed)
        const resultIdx = Math.floor(Math.random() * segments);

        // We want the center of segment resultIdx to be at -PI/2 (top, under pointer).
        const baseTarget = -Math.PI / 2 - resultIdx * segmentAngle - segmentAngle / 2;

        // Add randomness within segment (so it doesn't always land dead center)
        const jitter = (Math.random() - 0.5) * segmentAngle * 0.6;

        // Add multiple full rotations for visual effect
        const extraRotations = (5 + Math.floor(Math.random() * 3)) * Math.PI * 2;

        let finalAngle = baseTarget + jitter;
        while (finalAngle > currentAngle) {
            finalAngle -= Math.PI * 2;
        }
        finalAngle -= extraRotations;

        const startAngle = currentAngle;
        const duration = 4500 + Math.random() * 1500;
        let startTime = performance.now();
        let lastSegment = getSegmentAtPointer(startAngle);
        accumulatedPause = 0;

        function animate(now) {
            if (paused) {
                animationId = requestAnimationFrame(animate);
                return;
            }

            const elapsed = now - startTime - accumulatedPause;
            const t = Math.min(1, elapsed / duration);
            const eased = 1 - Math.pow(1 - t, 3);
            currentAngle = startAngle + (finalAngle - startAngle) * eased;

            // Update highlighted segment and play tick sound when crossing boundary
            const currentSegment = getSegmentAtPointer(currentAngle);
            highlightedSegment = currentSegment;
            if (currentSegment !== lastSegment) {
                Sound.spinnerTick();
                lastSegment = currentSegment;
            }

            draw();

            if (t < 1) {
                animationId = requestAnimationFrame(animate);
            } else {
                currentAngle = finalAngle;
                spinning = false;
                animationId = null;
                showResult = true;
                highlightedSegment = resultIdx;
                draw();
                Sound.spinnerResult();

                // Reset highlight after 1.5 seconds
                setTimeout(() => {
                    showResult = false;
                    highlightedSegment = -1;
                    draw();
                }, 1500);

                if (onResult) {
                    // In number mode, return 1-6; in player mode, return player index
                    const result = mode === 'numbers' ? resultIdx + 1 : resultIdx;
                    onResult(result);
                }
            }
        }

        animationId = requestAnimationFrame(animate);
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
        for (let i = 0; i < segments; i++) {
            const startA = currentAngle + i * segmentAngle;
            const endA = startA + segmentAngle;

            const isHighlighted = (spinning || showResult) && (i === highlightedSegment);
            const isDimmed = showResult && !isHighlighted;

            ctx.beginPath();
            ctx.moveTo(cx, cy);
            ctx.arc(cx, cy, radius, startA, endA);
            ctx.closePath();

            // Apply color with dimming effect
            let color = segmentColors[i];
            if (isDimmed) {
                color = dimColor(color, 0.4);
            } else if (isHighlighted && spinning) {
                color = brightenColor(color, 1.2);
            }
            ctx.fillStyle = color;
            ctx.fill();

            ctx.strokeStyle = isDimmed ? '#666' : '#FFF';
            ctx.lineWidth = 2;
            ctx.stroke();

            // Draw label
            const textAngle = startA + segmentAngle / 2;
            const textR = radius * 0.65;
            const tx = cx + Math.cos(textAngle) * textR;
            const ty = cy + Math.sin(textAngle) * textR;

            const fontSize = Math.max(14, radius * 0.3);
            ctx.fillStyle = isDimmed ? 'rgba(255,255,255,0.4)' : '#FFF';
            ctx.font = `bold ${fontSize}px sans-serif`;
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';

            ctx.save();
            ctx.shadowColor = 'rgba(0,0,0,0.5)';
            ctx.shadowBlur = isHighlighted ? 5 : 3;
            ctx.fillText(segmentLabels[i], tx, ty);
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

    // Dim a color by multiplying RGB values
    function dimColor(hex, factor) {
        const rgb = hexToRgb(hex);
        return `rgb(${Math.floor(rgb.r * factor)}, ${Math.floor(rgb.g * factor)}, ${Math.floor(rgb.b * factor)})`;
    }

    // Brighten a color
    function brightenColor(hex, factor) {
        const rgb = hexToRgb(hex);
        return `rgb(${Math.min(255, Math.floor(rgb.r * factor))}, ${Math.min(255, Math.floor(rgb.g * factor))}, ${Math.min(255, Math.floor(rgb.b * factor))})`;
    }

    // Convert hex color to RGB
    function hexToRgb(hex) {
        const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
        return result ? {
            r: parseInt(result[1], 16),
            g: parseInt(result[2], 16),
            b: parseInt(result[3], 16)
        } : { r: 128, g: 128, b: 128 };
    }

    // Get which segment is under the pointer (top) at given wheel angle
    function getSegmentAtPointer(angle) {
        // Pointer is at -PI/2 (top). Normalize angle to find segment.
        const pointerAngle = -Math.PI / 2;
        let relativeAngle = pointerAngle - angle;
        // Normalize to [0, 2*PI)
        relativeAngle = ((relativeAngle % (Math.PI * 2)) + Math.PI * 2) % (Math.PI * 2);
        return Math.floor(relativeAngle / segmentAngle) % segments;
    }

    function triggerSpin() {
        if (!spinning) {
            spin();
        }
    }

    function pause() {
        if (!paused) {
            paused = true;
            pausedAt = performance.now();
        }
    }

    function unpause() {
        if (paused) {
            accumulatedPause += performance.now() - pausedAt;
            paused = false;
        }
    }

    return {
        init,
        resize,
        draw,
        setEnabled,
        setOnResult,
        triggerSpin,
        setPlayerMode,
        setNumberMode,
        pause,
        unpause,
        get spinning() { return spinning; }
    };
})();
