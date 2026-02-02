// AI (computer player) logic
const AI = (() => {
    const THINK_DELAY = 800;
    const SPIN_DELAY = 500;

    function takeTurn() {
        // Simulate "thinking" delay, then auto-spin
        return new Promise((resolve) => {
            setTimeout(() => {
                Spinner.triggerSpin();
                resolve();
            }, THINK_DELAY + Math.random() * SPIN_DELAY);
        });
    }

    return { takeTurn };
})();
