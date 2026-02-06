// Board data and rendering
const Board = (() => {
    const ROWS = 10;
    const COLS = 10;

    const NUM_LADDERS = 9;
    const NUM_SNAKES = 9;

    // Ladders: bottom -> top (generated each game)
    let ladders = {};
    // Snakes: head -> tail (generated each game)
    let snakes = {};

    function generateBoard() {
        ladders = {};
        snakes = {};
        const used = new Set([1, 100]); // never place on start or finish

        // Special rainbow ladder to 100: start from row 6-8 (cells 61-80)
        const rainbowStart = randInt(61, 80);
        used.add(rainbowStart);
        used.add(100);
        ladders[rainbowStart] = 100;

        // Generate ladders (bottom in rows 1-8, top must be higher row)
        let placed = 0;
        while (placed < NUM_LADDERS) {
            const bottom = randInt(2, 80);
            if (used.has(bottom)) continue;

            const bottomRow = Math.floor((bottom - 1) / COLS);
            // Top must be at least 2 rows above, max row 9
            const minTop = (bottomRow + 2) * COLS + 1;
            if (minTop > 99) continue;
            const top = randInt(minTop, Math.min(99, (bottomRow + 5) * COLS));
            if (top > 99 || used.has(top)) continue;

            ladders[bottom] = top;
            used.add(bottom);
            used.add(top);
            placed++;
        }

        // Generate snakes (head in rows 2-9, tail must be lower row)
        placed = 0;
        while (placed < NUM_SNAKES) {
            const head = randInt(21, 99);
            if (used.has(head)) continue;

            const headRow = Math.floor((head - 1) / COLS);
            // Tail must be at least 2 rows below
            const maxTail = (headRow - 1) * COLS;
            if (maxTail < 2) continue;
            const tail = randInt(Math.max(2, (headRow - 4) * COLS + 1), maxTail);
            if (tail < 2 || used.has(tail)) continue;

            snakes[head] = tail;
            used.add(head);
            used.add(tail);
            placed++;
        }
    }

    function randInt(min, max) {
        return Math.floor(Math.random() * (max - min + 1)) + min;
    }

    let canvas, ctx;
    let cellSize = 0;
    let boardOriginX = 0;
    let boardOriginY = 0;
    let logicalWidth = 0;
    let logicalHeight = 0;

    function init(canvasEl) {
        canvas = canvasEl;
        ctx = canvas.getContext('2d');
    }

    // Convert cell number (1-100) to row/col (0-indexed from bottom-left)
    function cellToRowCol(cell) {
        const index = cell - 1;
        const row = Math.floor(index / COLS);
        const col = index % COLS;
        // Even rows (0,2,4,...) go left-to-right, odd rows go right-to-left
        const actualCol = row % 2 === 0 ? col : (COLS - 1 - col);
        return { row, col: actualCol };
    }

    // Get pixel center of a cell on the canvas
    function getCellCenter(cell) {
        const { row, col } = cellToRowCol(cell);
        // Row 0 is at the bottom of the board
        const x = boardOriginX + col * cellSize + cellSize / 2;
        const y = boardOriginY + (ROWS - 1 - row) * cellSize + cellSize / 2;
        return { x, y };
    }

    function resize(width, height) {
        const dpr = window.devicePixelRatio || 1;
        logicalWidth = width;
        logicalHeight = height;
        canvas.width = width * dpr;
        canvas.height = height * dpr;
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        cellSize = Math.min(width, height) / ROWS;
        boardOriginX = (width - cellSize * COLS) / 2;
        boardOriginY = (height - cellSize * ROWS) / 2;
    }

    function draw(players) {
        if (logicalWidth === 0 || logicalHeight === 0) return;
        ctx.clearRect(0, 0, logicalWidth, logicalHeight);
        drawCells();
        drawSnakesAndLadders();
        if (players) {
            drawPlayers(players);
        }
    }

    function drawCells() {
        const colors = ['#FFF8E7', '#F0E6D3'];

        // Collect ladder and snake start/end cells
        const ladderStarts = new Set();
        const ladderEnds = new Set();
        const snakeStarts = new Set();
        const snakeEnds = new Set();
        for (const [start, end] of Object.entries(ladders)) {
            ladderStarts.add(parseInt(start));
            ladderEnds.add(end);
        }
        for (const [start, end] of Object.entries(snakes)) {
            snakeStarts.add(parseInt(start));
            snakeEnds.add(end);
        }

        for (let cell = 1; cell <= 100; cell++) {
            const { row, col } = cellToRowCol(cell);
            const x = boardOriginX + col * cellSize;
            const y = boardOriginY + (ROWS - 1 - row) * cellSize;

            // Cell background: rainbow for 100, green for ladder ends, red for snake ends, else default
            if (cell === 100) {
                const gradient = ctx.createLinearGradient(x, y, x + cellSize, y + cellSize);
                gradient.addColorStop(0, '#FF6B6B');
                gradient.addColorStop(0.25, '#FECA57');
                gradient.addColorStop(0.5, '#48DBFB');
                gradient.addColorStop(0.75, '#FF9FF3');
                gradient.addColorStop(1, '#54A0FF');
                ctx.fillStyle = gradient;
            } else if (ladderEnds.has(cell)) {
                ctx.fillStyle = '#C8E6C9'; // light green
            } else if (snakeEnds.has(cell)) {
                ctx.fillStyle = '#FFCDD2'; // light red
            } else {
                const colorIdx = (row + col) % 2;
                ctx.fillStyle = colors[colorIdx];
            }
            ctx.fillRect(x, y, cellSize, cellSize);

            // Cell border
            ctx.strokeStyle = '#C8B89A';
            ctx.lineWidth = 1;
            ctx.strokeRect(x, y, cellSize, cellSize);

            // Cell number: green for ladder starts, red for snake starts, else default
            const fontSize = Math.max(8, cellSize * 0.25);
            if (ladderStarts.has(cell)) {
                ctx.fillStyle = '#2E7D32'; // dark green
            } else if (snakeStarts.has(cell)) {
                ctx.fillStyle = '#C62828'; // dark red
            } else {
                ctx.fillStyle = '#555';
            }
            ctx.font = `bold ${fontSize}px sans-serif`;
            ctx.textAlign = 'left';
            ctx.textBaseline = 'top';
            ctx.fillText(cell, x + 2, y + 2);
        }
    }

    function drawSnakesAndLadders() {
        // Draw ladders
        for (const [startStr, end] of Object.entries(ladders)) {
            const start = parseInt(startStr);
            drawLadder(start, end);
        }
        // Draw snakes
        for (const [startStr, end] of Object.entries(snakes)) {
            const start = parseInt(startStr);
            drawSnake(start, end);
        }
    }

    function drawLadder(from, to) {
        const p1 = getCellCenter(from);
        const p2 = getCellCenter(to);
        const isRainbow = to === 100;

        if (isRainbow) {
            const gradient = ctx.createLinearGradient(p1.x, p1.y, p2.x, p2.y);
            gradient.addColorStop(0, '#FF6B6B');
            gradient.addColorStop(0.25, '#FECA57');
            gradient.addColorStop(0.5, '#48DBFB');
            gradient.addColorStop(0.75, '#FF9FF3');
            gradient.addColorStop(1, '#54A0FF');
            ctx.strokeStyle = gradient;
            ctx.lineWidth = Math.max(5, cellSize * 0.12);
        } else {
            ctx.strokeStyle = '#4CAF50';
            ctx.lineWidth = Math.max(3, cellSize * 0.08);
        }
        ctx.lineCap = 'round';

        ctx.beginPath();
        ctx.moveTo(p1.x, p1.y);
        ctx.lineTo(p2.x, p2.y);
        ctx.stroke();

        // Arrow at the top
        drawArrow(p2.x, p2.y, isRainbow ? '#FECA57' : '#4CAF50');
    }

    function drawSnake(from, to) {
        const p1 = getCellCenter(from);
        const p2 = getCellCenter(to);

        // Simple red line
        ctx.strokeStyle = '#F44336';
        ctx.lineWidth = Math.max(3, cellSize * 0.08);
        ctx.lineCap = 'round';

        ctx.beginPath();
        ctx.moveTo(p1.x, p1.y);
        ctx.lineTo(p2.x, p2.y);
        ctx.stroke();

        // Circle at the head (from)
        ctx.fillStyle = '#D32F2F';
        ctx.beginPath();
        ctx.arc(p1.x, p1.y, cellSize * 0.12, 0, Math.PI * 2);
        ctx.fill();
    }

    function drawArrow(x, y, color) {
        const size = cellSize * 0.15;
        ctx.fillStyle = color;
        ctx.beginPath();
        ctx.moveTo(x, y - size);
        ctx.lineTo(x - size * 0.7, y + size * 0.3);
        ctx.lineTo(x + size * 0.7, y + size * 0.3);
        ctx.closePath();
        ctx.fill();
    }

    function drawPlayers(players) {
        // Group players by position to offset them
        const positionGroups = {};
        players.forEach((p, idx) => {
            if (p.position < 1) return;
            if (!positionGroups[p.position]) positionGroups[p.position] = [];
            positionGroups[p.position].push(idx);
        });

        players.forEach((player, idx) => {
            if (player.position < 1) return;
            const center = getCellCenter(player.position);
            const group = positionGroups[player.position];
            const groupIdx = group.indexOf(idx);
            const total = group.length;

            // Offset multiple players on the same cell
            const offsets = [
                { dx: -0.2, dy: -0.2 },
                { dx: 0.2, dy: -0.2 },
                { dx: -0.2, dy: 0.2 },
                { dx: 0.2, dy: 0.2 }
            ];

            let px = center.x;
            let py = center.y;
            if (total > 1) {
                px += offsets[groupIdx].dx * cellSize;
                py += offsets[groupIdx].dy * cellSize;
            }

            // Draw player token
            const radius = cellSize * 0.2;
            ctx.fillStyle = player.color;
            ctx.beginPath();
            ctx.arc(px, py, radius, 0, Math.PI * 2);
            ctx.fill();

            ctx.strokeStyle = '#FFF';
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.arc(px, py, radius, 0, Math.PI * 2);
            ctx.stroke();

            // Player number (use name like "P1", "P2")
            const fontSize = Math.max(8, radius * 1.2);
            ctx.fillStyle = '#FFF';
            ctx.font = `bold ${fontSize}px sans-serif`;
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText(player.name.replace('P', ''), px, py);
        });
    }

    // Animate a player token moving along cells
    function animateMove(player, fromCell, toCell, players, callback) {
        const startPos = fromCell < 1 ? 0 : fromCell;
        const cells = [];

        if (startPos < toCell) {
            for (let c = startPos + 1; c <= toCell; c++) {
                cells.push(c);
            }
        } else if (startPos > toCell) {
            for (let c = startPos - 1; c >= toCell; c--) {
                cells.push(c);
            }
        }

        let step = 0;
        const stepDuration = 500;

        function nextStep() {
            if (step >= cells.length) {
                callback();
                return;
            }
            player.position = cells[step];
            draw(players);
            Sound.step();
            step++;
            setTimeout(nextStep, stepDuration);
        }

        nextStep();
    }

    // Animate ladder/snake transport
    function animateTransport(player, fromCell, toCell, players, callback) {
        const from = getCellCenter(fromCell);
        const to = getCellCenter(toCell);
        const duration = 500;
        const startTime = performance.now();

        function step(now) {
            const t = Math.min(1, (now - startTime) / duration);
            const eased = t * t * (3 - 2 * t); // smoothstep
            const x = from.x + (to.x - from.x) * eased;
            const y = from.y + (to.y - from.y) * eased;

            // Temporarily set position to draw others correctly
            const origPos = player.position;
            player.position = -1; // hide from normal draw
            draw(players);
            player.position = origPos;

            // Draw the moving token
            const radius = cellSize * 0.2;
            ctx.fillStyle = player.color;
            ctx.beginPath();
            ctx.arc(x, y, radius, 0, Math.PI * 2);
            ctx.fill();
            ctx.strokeStyle = '#FFF';
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.arc(x, y, radius, 0, Math.PI * 2);
            ctx.stroke();

            const fontSize = Math.max(8, radius * 1.2);
            ctx.fillStyle = '#FFF';
            ctx.font = `bold ${fontSize}px sans-serif`;
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText(player.name.replace('P', ''), x, y);

            if (t < 1) {
                requestAnimationFrame(step);
            } else {
                player.position = toCell;
                draw(players);
                callback();
            }
        }

        requestAnimationFrame(step);
    }

    return {
        init,
        resize,
        draw,
        generateBoard,
        getCellCenter,
        cellToRowCol,
        animateMove,
        animateTransport,
        get ladders() { return ladders; },
        get snakes() { return snakes; },
        get cellSize() { return cellSize; }
    };
})();
