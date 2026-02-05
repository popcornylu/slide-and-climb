// Game flow control
const Game = (() => {
    const PLAYER_COLORS = ['#E74C3C', '#3498DB', '#2ECC71', '#F1C40F'];
    const PLAYER_COLOR_NAMES = ['紅', '藍', '綠', '黃'];

    let players = [];
    let currentPlayerIdx = 0;
    let gameActive = false;
    let isProcessing = false;
    let isPaused = false;

    // Turn order determination phase
    let turnOrderPhase = false;
    let firstPlayerIdx = 0;

    // Setup state
    let selectedPlayerCount = 3;
    let playerColorIndices = [0, 1, 2, 3]; // Each player's color index

    // DOM elements (initialized in init())
    let setupScreen, gameScreen, winScreen, winMessage, pauseScreen;
    let step1, step2, playerCards, startBtn, restartBtn, nextStepBtn, backBtn;
    let pauseBtn, resumeBtn, pauseRestartBtn, endGameBtn;
    let currentTurnDiv, playerPositionsDiv, spinHint;

    function init() {
        setupScreen = document.getElementById('setup-screen');
        gameScreen = document.getElementById('game-screen');
        winScreen = document.getElementById('win-screen');
        winMessage = document.getElementById('win-message');
        pauseScreen = document.getElementById('pause-screen');
        step1 = document.getElementById('step1-player-count');
        step2 = document.getElementById('step2-player-settings');
        playerCards = document.getElementById('player-cards');
        startBtn = document.getElementById('start-btn');
        restartBtn = document.getElementById('restart-btn');
        nextStepBtn = document.getElementById('next-step-btn');
        backBtn = document.getElementById('back-btn');
        pauseBtn = document.getElementById('pause-btn');
        resumeBtn = document.getElementById('resume-btn');
        pauseRestartBtn = document.getElementById('pause-restart-btn');
        endGameBtn = document.getElementById('end-game-btn');
        currentTurnDiv = document.getElementById('current-turn');
        playerPositionsDiv = document.getElementById('player-positions');
        spinHint = document.getElementById('spin-hint');

        // Player count buttons
        document.querySelectorAll('.count-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                document.querySelectorAll('.count-btn').forEach(b => b.classList.remove('selected'));
                btn.classList.add('selected');
                selectedPlayerCount = parseInt(btn.dataset.count);
            });
        });

        nextStepBtn.addEventListener('click', showStep2);
        backBtn.addEventListener('click', showStep1);
        startBtn.addEventListener('click', startGame);
        restartBtn.addEventListener('click', restartGame);
        pauseBtn.addEventListener('click', pauseGame);
        resumeBtn.addEventListener('click', resumeGame);
        pauseRestartBtn.addEventListener('click', pauseRestart);
        endGameBtn.addEventListener('click', endGame);

        Board.init(document.getElementById('board-canvas'));
        Spinner.init(document.getElementById('spinner-canvas'));
        Spinner.setOnResult(onSpinResult);

        handleResize();
        window.addEventListener('resize', handleResize);
        window.addEventListener('orientationchange', () => {
            setTimeout(handleResize, 100);
        });
    }

    function showStep1() {
        step1.classList.remove('hidden');
        step2.classList.add('hidden');
    }

    function showStep2() {
        step1.classList.add('hidden');
        step2.classList.remove('hidden');
        // Reset color assignments
        playerColorIndices = [0, 1, 2, 3];
        updatePlayerCards();
    }

    function getUsedColorIndices(excludePlayer) {
        const used = [];
        for (let i = 0; i < selectedPlayerCount; i++) {
            if (i !== excludePlayer) {
                used.push(playerColorIndices[i]);
            }
        }
        return used;
    }

    function getNextAvailableColor(currentColorIndex, excludePlayer) {
        const used = getUsedColorIndices(excludePlayer);
        let nextIndex = (currentColorIndex + 1) % 4;
        while (used.includes(nextIndex)) {
            nextIndex = (nextIndex + 1) % 4;
        }
        return nextIndex;
    }

    function updatePlayerCards() {
        playerCards.innerHTML = '';

        for (let i = 0; i < selectedPlayerCount; i++) {
            const card = document.createElement('div');
            card.className = 'player-card';

            const header = document.createElement('div');
            header.className = 'player-card-header';
            header.textContent = `P${i + 1}`;

            const colorSelector = document.createElement('div');
            colorSelector.className = 'color-selector';
            colorSelector.style.backgroundColor = PLAYER_COLORS[playerColorIndices[i]];
            colorSelector.dataset.playerIndex = i;
            colorSelector.addEventListener('click', () => {
                const playerIdx = parseInt(colorSelector.dataset.playerIndex);
                playerColorIndices[playerIdx] = getNextAvailableColor(playerColorIndices[playerIdx], playerIdx);
                colorSelector.style.backgroundColor = PLAYER_COLORS[playerColorIndices[playerIdx]];
                colorLabel.textContent = PLAYER_COLOR_NAMES[playerColorIndices[playerIdx]];
            });

            const colorLabel = document.createElement('span');
            colorLabel.className = 'color-label';
            colorLabel.textContent = PLAYER_COLOR_NAMES[playerColorIndices[i]];

            const colorRow = document.createElement('div');
            colorRow.className = 'color-row';
            colorRow.appendChild(colorSelector);
            colorRow.appendChild(colorLabel);

            const toggle = document.createElement('button');
            toggle.className = 'type-toggle';
            toggle.textContent = i === 0 ? '玩家' : '電腦';
            toggle.dataset.isComputer = i === 0 ? 'false' : 'true';
            toggle.addEventListener('click', () => {
                const isComp = toggle.dataset.isComputer === 'true';
                toggle.dataset.isComputer = (!isComp).toString();
                toggle.textContent = !isComp ? '電腦' : '玩家';
            });

            card.appendChild(header);
            card.appendChild(colorRow);
            card.appendChild(toggle);
            playerCards.appendChild(card);
        }
    }

    function startGame() {
        players = [];

        const toggles = playerCards.querySelectorAll('.type-toggle');
        for (let i = 0; i < selectedPlayerCount; i++) {
            const isComputer = toggles[i].dataset.isComputer === 'true';
            const name = `P${i + 1}`;
            const colorIndex = playerColorIndices[i];
            players.push(new Player(i, name, PLAYER_COLORS[colorIndex], isComputer));
            players[i].colorIndex = colorIndex;
        }

        currentPlayerIdx = 0;
        gameActive = false;
        isProcessing = false;

        // Start turn order determination phase
        turnOrderPhase = true;
        firstPlayerIdx = 0;

        Board.generateBoard();

        setupScreen.classList.add('hidden');
        gameScreen.classList.remove('hidden');
        winScreen.classList.add('hidden');

        // Short delay to ensure layout is ready after display change
        requestAnimationFrame(() => {
            handleResize();
            startTurnOrderSpin();
        });
    }

    function startTurnOrderSpin() {
        // Set spinner to player mode
        Spinner.setPlayerMode(players);
        Spinner.setEnabled(false);

        currentTurnDiv.innerHTML = `<span class="turn-indicator">🎲 決定誰先開始...</span>`;

        let posHtml = '<div class="turn-order-title">參賽玩家：</div>';
        players.forEach(p => {
            const colorName = PLAYER_COLOR_NAMES[p.colorIndex];
            posHtml += `<div class="player-pos" style="border-left: 4px solid ${p.color}">` +
                `${p.name} (${colorName})${p.isComputer ? ' 🤖' : ''}</div>`;
        });
        playerPositionsDiv.innerHTML = posHtml;

        spinHint.textContent = '轉動中...';

        // Auto spin after a short delay
        setTimeout(() => {
            Spinner.triggerSpin();
        }, 800);
    }

    function onTurnOrderResult(winnerIdx) {
        const winner = players[winnerIdx];
        const winnerColorName = PLAYER_COLOR_NAMES[winner.colorIndex];

        spinHint.textContent = `${winner.name} (${winnerColorName}) 先開始！`;
        currentTurnDiv.innerHTML = `<span class="turn-indicator" style="color:${winner.color}">` +
            `🎉 ${winner.name} (${winnerColorName}) 先開始！</span>`;

        // Reorder players so winner goes first
        // e.g., if winnerIdx=2 and we have [P1,P2,P3,P4], new order is [P3,P4,P1,P2]
        const reordered = [];
        for (let i = 0; i < players.length; i++) {
            reordered.push(players[(winnerIdx + i) % players.length]);
        }
        players = reordered;

        // Show final order
        let posHtml = '<div class="turn-order-title">遊戲順序：</div>';
        players.forEach((p, idx) => {
            const colorName = PLAYER_COLOR_NAMES[p.colorIndex];
            posHtml += `<div class="player-pos" style="border-left: 4px solid ${p.color}">` +
                `${idx + 1}. ${p.name} (${colorName})${p.isComputer ? ' 🤖' : ''}</div>`;
        });
        playerPositionsDiv.innerHTML = posHtml;

        setTimeout(() => {
            // Switch spinner back to number mode
            Spinner.setNumberMode();

            // End turn order phase, start actual game
            turnOrderPhase = false;
            currentPlayerIdx = 0;
            gameActive = true;
            updateUI();
            startTurn();
        }, 2000);
    }

    function restartGame() {
        winScreen.classList.add('hidden');
        gameScreen.classList.add('hidden');
        setupScreen.classList.remove('hidden');
        showStep1();
        gameActive = false;
        turnOrderPhase = false;
        isPaused = false;
        Spinner.setNumberMode();
    }

    function pauseGame() {
        if (!gameActive && !turnOrderPhase) return;
        isPaused = true;
        pauseScreen.classList.remove('hidden');
        Spinner.setEnabled(false);
    }

    function resumeGame() {
        isPaused = false;
        pauseScreen.classList.add('hidden');
        if (gameActive && !isProcessing) {
            const cp = players[currentPlayerIdx];
            if (!cp.isComputer) {
                Spinner.setEnabled(true);
            }
        }
    }

    function pauseRestart() {
        pauseScreen.classList.add('hidden');
        isPaused = false;
        // Reset game state and restart with same settings
        players.forEach(p => p.position = 0);
        currentPlayerIdx = 0;
        gameActive = false;
        isProcessing = false;
        turnOrderPhase = true;
        Board.draw(players);
        startTurnOrderSpin();
    }

    function endGame() {
        pauseScreen.classList.add('hidden');
        restartGame();
    }

    function handleResize() {
        if (gameScreen.classList.contains('hidden')) return;

        const boardContainer = document.getElementById('board-container');
        const spinnerContainer = document.getElementById('spinner-container');

        // Board sizing
        const boardRect = boardContainer.getBoundingClientRect();
        const boardSize = Math.floor(Math.min(boardRect.width, boardRect.height));
        if (boardSize > 0) {
            Board.resize(boardSize, boardSize);
            const boardCanvas = document.getElementById('board-canvas');
            boardCanvas.style.width = boardSize + 'px';
            boardCanvas.style.height = boardSize + 'px';
        }

        // Spinner sizing
        const spinnerRect = spinnerContainer.getBoundingClientRect();
        const spinnerSize = Math.floor(Math.min(spinnerRect.width, spinnerRect.height, 200));
        if (spinnerSize > 0) {
            Spinner.resize(spinnerSize);
            const spinnerCanvas = document.getElementById('spinner-canvas');
            spinnerCanvas.style.width = spinnerSize + 'px';
            spinnerCanvas.style.height = spinnerSize + 'px';
        }

        Board.draw(players);
        Spinner.draw();
    }

    function updateUI() {
        if (!gameActive) return;

        const cp = players[currentPlayerIdx];
        const cpColorName = PLAYER_COLOR_NAMES[cp.colorIndex];
        currentTurnDiv.innerHTML = `<span class="turn-indicator" style="color:${cp.color}">` +
            `▶ ${cp.name} (${cpColorName}) 的回合</span>`;

        let posHtml = '';
        players.forEach(p => {
            const colorName = PLAYER_COLOR_NAMES[p.colorIndex];
            posHtml += `<div class="player-pos" style="border-left: 4px solid ${p.color}">` +
                `${p.name} (${colorName}): 位置 ${p.position || '起點'}` +
                `${p.isComputer ? ' 🤖' : ''}</div>`;
        });
        playerPositionsDiv.innerHTML = posHtml;

        // Update spin hint
        if (cp.isComputer) {
            spinHint.textContent = '電腦思考中...';
            Spinner.setEnabled(false);
        } else {
            spinHint.textContent = '點擊轉盤';
            Spinner.setEnabled(true);
        }
    }

    function startTurn() {
        if (!gameActive || isProcessing || isPaused) return;

        const cp = players[currentPlayerIdx];
        updateUI();

        if (cp.isComputer) {
            AI.takeTurn();
        }
    }

    function onSpinResult(value) {
        // Handle turn order phase (value is player index in this mode)
        if (turnOrderPhase) {
            onTurnOrderResult(value);
            return;
        }

        if (!gameActive || isProcessing || isPaused) return;
        isProcessing = true;

        Spinner.setEnabled(false);
        spinHint.textContent = `轉到 ${value}！`;

        const cp = players[currentPlayerIdx];
        const currentPos = cp.position;
        let newPos = currentPos + value;

        // If not on board yet, start from position 0 + value
        if (currentPos === 0) {
            newPos = value;
        }

        // Must land exactly on 100
        if (newPos > 100) {
            spinHint.textContent = `轉到 ${value}，超過 100，不動！`;
            setTimeout(() => {
                isProcessing = false;
                nextPlayer();
            }, 1000);
            return;
        }

        // Animate movement
        Board.animateMove(cp, currentPos, newPos, players, () => {
            // Check for snake or ladder
            if (Board.ladders[newPos]) {
                const dest = Board.ladders[newPos];
                spinHint.textContent = `梯子！${newPos} → ${dest}`;
                setTimeout(() => {
                    Board.animateTransport(cp, newPos, dest, players, () => {
                        cp.position = dest;
                        checkWinOrNext();
                    });
                }, 400);
            } else if (Board.snakes[newPos]) {
                const dest = Board.snakes[newPos];
                spinHint.textContent = `滑梯！${newPos} → ${dest}`;
                setTimeout(() => {
                    Board.animateTransport(cp, newPos, dest, players, () => {
                        cp.position = dest;
                        checkWinOrNext();
                    });
                }, 400);
            } else {
                cp.position = newPos;
                checkWinOrNext();
            }
        });
    }

    function checkWinOrNext() {
        const cp = players[currentPlayerIdx];
        if (cp.position === 100) {
            gameActive = false;
            isProcessing = false;
            showWin(cp);
            return;
        }
        setTimeout(() => {
            isProcessing = false;
            nextPlayer();
        }, 500);
    }

    function nextPlayer() {
        currentPlayerIdx = (currentPlayerIdx + 1) % players.length;
        startTurn();
    }

    function showWin(player) {
        const colorName = PLAYER_COLOR_NAMES[player.colorIndex];
        winMessage.textContent = `${player.name} (${colorName}) 獲勝！🎉`;
        winMessage.style.color = player.color;
        winScreen.classList.remove('hidden');
    }

    // Init on DOM ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }

    return { players };
})();
