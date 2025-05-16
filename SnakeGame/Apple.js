class Apple {
    constructor(snake) {
        this.x = floor(random(blocksX));
        this.y = floor(random(blocksY));

        while (snake.isAppleOnSnake(this)) {
            this.x = floor(random(blocksX));
            this.y = floor(random(blocksY));
        }
        // print(snake, this); // Removed print statement
    }


    show() {
        noStroke();
        fill(255, 0, 0);
        rect(this.x * blockSize + outlineLength, this.y * blockSize + outlineLength, 
             blockSize - 2*outlineLength, blockSize - 2*outlineLength);
    }

    isAtPosition(x, y) {
        return this.x === x && this.y === y;
    }


}