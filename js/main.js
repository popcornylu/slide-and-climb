// Game flow control
const Game = (() => {
    const PLAYER_COLORS = ['#E74C3C', '#3498DB', '#2ECC71', '#F1C40F'];
    const PLAYER_COLOR_NAMES = ['紅', '藍', '綠', '黃'];

    let players = [];
    let currentPlayerIdx = 0;
    let gameActive = false;
    let isProcessing = false;

    // DOM elements (initialized in init())
    let setupScreen, gameScreen, winScreen, winMessage;
    let playerCountSelect, playerSettings, startBtn, restartBtn;
    let currentTurnDiv, playerPositionsDiv, spinHint;

    function init() {
        setupScreen = document.getElementById('setup-screen');
        gameScreen = document.getElementById('game-screen');
        winScreen = document.getElementById('win-screen');
        winMessage = document.getElementById('win-message');
        playerCountSelect = document.getElementById('player-count');
        playerSettings = document.getElementById('player-settings');
        startBtn = document.getElementById('start-btn');
        restartBtn = document.getElementById('restart-btn');
        currentTurnDiv = document.getElementById('current-turn');
        playerPositionsDiv = document.getElementById('player-positions');
        spinHint = document.getElementById('spin-hint');

        playerCountSelect.addEventListener('change', updatePlayerSettings);
        startBtn.addEventListener('click', startGame);
        restartBtn.addEventListener('click', restartGame);

        Board.init(document.getElementById('board-canvas'));
        Spinner.init(document.getElementById('spinner-canvas'));
        Spinner.setOnResult(onSpinResult);

        updatePlayerSettings();
        handleResize();
        window.addEventListener('resize', handleResize);
        window.addEventListener('orientationchange', () => {
            setTimeout(handleResize, 100);
        });
    }

    function updatePlayerSettings() {
        const count = parseInt(playerCountSelect.value);
        playerSettings.innerHTML = '';

        for (let i = 0; i < count; i++) {
            const div = document.createElement('div');
            div.className = 'player-setting';

            const colorDot = document.createElement('span');
            colorDot.className = 'color-dot';
            colorDot.style.backgroundColor = PLAYER_COLORS[i];

            const label = document.createElement('span');
            label.className = 'player-label';
            label.textContent = `P${i + 1} (${PLAYER_COLOR_NAMES[i]})`;

            const toggle = document.createElement('button');
            toggle.className = 'type-toggle';
            toggle.textContent = i === 0 ? '玩家' : '電腦';
            toggle.dataset.isComputer = i === 0 ? 'false' : 'true';
            toggle.addEventListener('click', () => {
                const isComp = toggle.dataset.isComputer === 'true';
                toggle.dataset.isComputer = (!isComp).toString();
                toggle.textContent = !isComp ? '電腦' : '玩家';
            });

            div.appendChild(colorDot);
            div.appendChild(label);
            div.appendChild(toggle);
            playerSettings.appendChild(div);
        }
    }

    function startGame() {
        const count = parseInt(playerCountSelect.value);
        players = [];

        const toggles = playerSettings.querySelectorAll('.type-toggle');
        for (let i = 0; i < count; i++) {
            const isComputer = toggles[i].dataset.isComputer === 'true';
            const name = `P${i + 1}`;
            players.push(new Player(i, name, PLAYER_COLORS[i], isComputer));
        }

        currentPlayerIdx = 0;
        gameActive = true;
        isProcessing = false;

        Board.generateBoard();

        setupScreen.classList.add('hidden');
        gameScreen.classList.remove('hidden');
        winScreen.classList.add('hidden');

        // Short delay to ensure layout is ready after display change
        requestAnimationFrame(() => {
            handleResize();
            updateUI();
            startTurn();
        });
    }

    function restartGame() {
        winScreen.classList.add('hidden');
        gameScreen.classList.add('hidden');
        setupScreen.classList.remove('hidden');
        gameActive = false;
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
        currentTurnDiv.innerHTML = `<span class="turn-indicator" style="color:${cp.color}">` +
            `▶ ${cp.name} (${PLAYER_COLOR_NAMES[cp.index]}) 的回合</span>`;

        let posHtml = '';
        players.forEach(p => {
            posHtml += `<div class="player-pos" style="border-left: 4px solid ${p.color}">` +
                `${p.name} (${PLAYER_COLOR_NAMES[p.index]}): 位置 ${p.position || '起點'}` +
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
        if (!gameActive || isProcessing) return;

        const cp = players[currentPlayerIdx];
        updateUI();

        if (cp.isComputer) {
            AI.takeTurn();
        }
    }

    function onSpinResult(value) {
        if (!gameActive || isProcessing) return;
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
        winMessage.textContent = `${player.name} (${PLAYER_COLOR_NAMES[player.index]}) 獲勝！🎉`;
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
