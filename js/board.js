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
        for (let cell = 1; cell <= 100; cell++) {
            const { row, col } = cellToRowCol(cell);
            const x = boardOriginX + col * cellSize;
            const y = boardOriginY + (ROWS - 1 - row) * cellSize;

            // Alternating cell colors
            const colorIdx = (row + col) % 2;
            ctx.fillStyle = colors[colorIdx];
            ctx.fillRect(x, y, cellSize, cellSize);

            // Cell border
            ctx.strokeStyle = '#C8B89A';
            ctx.lineWidth = 1;
            ctx.strokeRect(x, y, cellSize, cellSize);

            // Cell number
            const fontSize = Math.max(8, cellSize * 0.25);
            ctx.fillStyle = '#888';
            ctx.font = `${fontSize}px sans-serif`;
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

        const dx = p2.x - p1.x;
        const dy = p2.y - p1.y;
        const len = Math.sqrt(dx * dx + dy * dy);
        const nx = -dy / len * cellSize * 0.2;
        const ny = dx / len * cellSize * 0.2;

        ctx.strokeStyle = '#4CAF50';
        ctx.lineWidth = Math.max(2, cellSize * 0.06);
        ctx.lineCap = 'round';

        // Left rail
        ctx.beginPath();
        ctx.moveTo(p1.x + nx, p1.y + ny);
        ctx.lineTo(p2.x + nx, p2.y + ny);
        ctx.stroke();

        // Right rail
        ctx.beginPath();
        ctx.moveTo(p1.x - nx, p1.y - ny);
        ctx.lineTo(p2.x - nx, p2.y - ny);
        ctx.stroke();

        // Rungs
        const numRungs = Math.max(3, Math.floor(len / (cellSize * 0.5)));
        for (let i = 1; i < numRungs; i++) {
            const t = i / numRungs;
            const rx = p1.x + dx * t;
            const ry = p1.y + dy * t;
            ctx.beginPath();
            ctx.moveTo(rx + nx, ry + ny);
            ctx.lineTo(rx - nx, ry - ny);
            ctx.stroke();
        }

        // Arrow at the top
        drawArrow(p2.x, p2.y, '#4CAF50');
    }

    function drawSnake(from, to) {
        const p1 = getCellCenter(from);
        const p2 = getCellCenter(to);

        // Draw a wavy line for the snake
        ctx.strokeStyle = '#F44336';
        ctx.lineWidth = Math.max(3, cellSize * 0.1);
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';

        const dx = p2.x - p1.x;
        const dy = p2.y - p1.y;
        const len = Math.sqrt(dx * dx + dy * dy);
        const segments = 20;
        const amplitude = cellSize * 0.25;
        const nx = -dy / len;
        const ny = dx / len;

        ctx.beginPath();
        ctx.moveTo(p1.x, p1.y);
        for (let i = 1; i <= segments; i++) {
            const t = i / segments;
            const mx = p1.x + dx * t;
            const my = p1.y + dy * t;
            const wave = Math.sin(t * Math.PI * 4) * amplitude * (1 - t * 0.5);
            ctx.lineTo(mx + nx * wave, my + ny * wave);
        }
        ctx.stroke();

        // Snake head (circle at 'from')
        ctx.fillStyle = '#D32F2F';
        ctx.beginPath();
        ctx.arc(p1.x, p1.y, cellSize * 0.15, 0, Math.PI * 2);
        ctx.fill();

        // Snake eyes
        ctx.fillStyle = '#FFF';
        ctx.beginPath();
        ctx.arc(p1.x - cellSize * 0.06, p1.y - cellSize * 0.04, cellSize * 0.04, 0, Math.PI * 2);
        ctx.arc(p1.x + cellSize * 0.06, p1.y - cellSize * 0.04, cellSize * 0.04, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = '#000';
        ctx.beginPath();
        ctx.arc(p1.x - cellSize * 0.06, p1.y - cellSize * 0.04, cellSize * 0.02, 0, Math.PI * 2);
        ctx.arc(p1.x + cellSize * 0.06, p1.y - cellSize * 0.04, cellSize * 0.02, 0, Math.PI * 2);
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

            // Player number
            const fontSize = Math.max(8, radius * 1.2);
            ctx.fillStyle = '#FFF';
            ctx.font = `bold ${fontSize}px sans-serif`;
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText(idx + 1, px, py);
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
        const stepDuration = 150;

        function nextStep() {
            if (step >= cells.length) {
                callback();
                return;
            }
            player.position = cells[step];
            draw(players);
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

            const playerIdx = players.indexOf(player);
            const fontSize = Math.max(8, radius * 1.2);
            ctx.fillStyle = '#FFF';
            ctx.font = `bold ${fontSize}px sans-serif`;
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText(playerIdx + 1, x, y);

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
