// Player class
class Player {
    constructor(index, name, color, isComputer) {
        this.index = index;
        this.name = name;
        this.color = color;
        this.isComputer = isComputer;
        this.position = 0; // 0 = not on board yet, 1-100 = on board
    }

    reset() {
        this.position = 0;
    }
}
