class Snake {
    constructor() {
        this.x = floor(blocksX / 2);
        this.y = floor(blocksY / 2);
        this.tailBlocks = [];
        // Initial tail setup
        if (this.x > 2) {
            this.tailBlocks.push(createVector(this.x - 3, this.y));
            this.tailBlocks.push(createVector(this.x - 2, this.y));
            this.tailBlocks.push(createVector(this.x - 1, this.y));
        } else { 
            this.tailBlocks.push(createVector(0, this.y));
            if (blocksX > 1) this.tailBlocks.push(createVector(1, this.y));
            if (blocksX > 2 && this.x > 1) this.tailBlocks.push(createVector(this.x - 1, this.y));
            else if (blocksX > 2) this.tailBlocks.push(createVector(2, this.y));
        }

        this.velX = 1;
        this.velY = 0;
        this.apple = new Apple(this);
        this.addCount = 0;
        this.dead = false;

        this.path = [];
        this.currentPathIndex = 0;
        this.survivalMode = false;
        // this.controlledByPlayer = false; // Removed - AI is always active
        this.weWin = false;
    }

    show() {
        noStroke();
        // Color changes based on survivalMode, not player control
        this.survivalMode ? fill(150, 0, 0) : fill(0, 150, 0);


        rect(this.x * blockSize + outlineLength, this.y * blockSize + outlineLength, blockSize - outlineLength * 2, blockSize - outlineLength * 2);

        if (this.tailBlocks.length > 0) {
            const lastTailBlock = this.tailBlocks[this.tailBlocks.length - 1];
             rect((this.x + lastTailBlock.x) * blockSize / 2.0 + outlineLength, 
                  (this.y + lastTailBlock.y) * blockSize / 2.0 + outlineLength, 
                  blockSize - outlineLength * 2, blockSize - outlineLength * 2);
        }
       
        for (let i = 0; i < this.tailBlocks.length; i++) {
            rect(this.tailBlocks[i].x * blockSize + outlineLength, this.tailBlocks[i].y * blockSize + outlineLength, blockSize - outlineLength * 2, blockSize - outlineLength * 2);
            if (i < this.tailBlocks.length - 1) {
                let x = (this.tailBlocks[i].x + this.tailBlocks[i + 1].x) / 2 * blockSize;
                let y = (this.tailBlocks[i].y + this.tailBlocks[i + 1].y) / 2 * blockSize;
                rect(x + outlineLength, y + outlineLength, blockSize - outlineLength * 2, blockSize - outlineLength * 2);
            }
        }

        if (!this.weWin) {
            this.apple.show();
        }
    }

    move() {
        if (this.weWin || this.dead) return;

        // AI LOGIC IS NOW ALWAYS ACTIVE (no check for controlledByPlayer)
        if (!this.path || this.currentPathIndex >= this.path.length) {
            this.calculatePath();
        }

        if (this.path && this.path.length > 0 && this.currentPathIndex < this.path.length) {
            const nextNode = this.path[this.currentPathIndex];
            this.velX = nextNode.x - this.x;
            this.velY = nextNode.y - this.y;
            this.currentPathIndex++;
        } else {
            // AI is stuck or path calculation failed to provide a move.
            if (this.velX === 0 && this.velY === 0) {
                // console.warn("Snake AI: No move determined, velocity is zero. Likely trapped.");
            }
        }
        // END OF AI ALWAYS ACTIVE LOGIC

        if (this.addCount <= 0) {
            if (this.tailBlocks.length > 0) { // Ensure tail exists before shifting
                this.tailBlocks.shift();
            }
        } else {
            this.addCount--;
        }
        this.tailBlocks.push(createVector(this.x, this.y));
        this.x += this.velX;
        this.y += this.velY;
    }

    isSnakeBodyAt(x, y, excludeHead = false, excludeTailTip = false) {
        if (!excludeHead && this.x === x && this.y === y) {
            return true;
        }
        for (let i = 0; i < this.tailBlocks.length; i++) {
            if (excludeTailTip && i === 0 && this.addCount <= 0) {
                continue;
            }
            if (this.tailBlocks[i].x === x && this.tailBlocks[i].y === y) {
                return true;
            }
        }
        return false;
    }

    getGraphNode(graph, x, y) {
        // Check bounds against graph's own dimensions
        if (graph && x >= 0 && x < graph.blocksX && y >=0 && y < graph.blocksY && graph.grid[x] && graph.grid[x][y]) {
            return graph.grid[x][y];
        }
        return null;
    }

    calculatePath() {
        this.path = [];
        this.currentPathIndex = 0;
        this.survivalMode = false; // Reset survival mode assumption

        // --- Grid for path to Apple ---
        let gridDataForApple = [];
        for (let c = 0; c < blocksX; c++) { // Using global blocksX/Y for iteration limit
            gridDataForApple[c] = [];
            for (let r = 0; r < blocksY; r++) {
                gridDataForApple[c][r] = this.isSnakeBodyAt(c, r, true, true) ? 0 : 1;
            }
        }
        // Ensure apple's current location is targetable (walkable)
        if (this.apple.x >= 0 && this.apple.x < blocksX && this.apple.y >= 0 && this.apple.y < blocksY) {
             gridDataForApple[this.apple.x][this.apple.y] = 1;
        }

        // Pass global blocksX/Y to Graph constructor
        const astarGraphApple = new AStar.Graph(gridDataForApple, { diagonal: false }, blocksX, blocksY);
        const startNode = this.getGraphNode(astarGraphApple, this.x, this.y);
        const appleNode = this.getGraphNode(astarGraphApple, this.apple.x, this.apple.y);

        if (startNode && appleNode) {
            let pathToApple = AStar.astar.search(astarGraphApple, startNode, appleNode);
            if (pathToApple && pathToApple.length > 0) {
                this.path = pathToApple;
                return;
            }
        }
        
        this.survivalMode = true;

        if (this.tailBlocks.length > 0) {
            let gridDataForTail = [];
            const tailTargetPos = this.tailBlocks[0];

            for (let c = 0; c < blocksX; c++) {
                gridDataForTail[c] = [];
                for (let r = 0; r < blocksY; r++) {
                    gridDataForTail[c][r] = (this.isSnakeBodyAt(c, r, true, false) && !(c === tailTargetPos.x && r === tailTargetPos.y)) ? 0 : 1;
                }
            }
            if (tailTargetPos.x >= 0 && tailTargetPos.x < blocksX && tailTargetPos.y >= 0 && tailTargetPos.y < blocksY) {
                gridDataForTail[tailTargetPos.x][tailTargetPos.y] = 1;
            }

            const astarGraphTail = new AStar.Graph(gridDataForTail, { diagonal: false }, blocksX, blocksY);
            const startNodeSurvival = this.getGraphNode(astarGraphTail, this.x, this.y);
            const tailNodeAsTarget = this.getGraphNode(astarGraphTail, tailTargetPos.x, tailTargetPos.y);

            if (startNodeSurvival && tailNodeAsTarget) {
                let pathToTail = AStar.astar.search(astarGraphTail, startNodeSurvival, tailNodeAsTarget);
                if (pathToTail && pathToTail.length > 0) {
                    this.path = pathToTail;
                    return;
                }
            }
        }

        let gridDataForAdjacent = [];
         for (let c = 0; c < blocksX; c++) {
            gridDataForAdjacent[c] = [];
            for (let r = 0; r < blocksY; r++) {
                gridDataForAdjacent[c][r] = this.isSnakeBodyAt(c, r, true, true) ? 0 : 1;
            }
        }
        const astarGraphAdjacent = new AStar.Graph(gridDataForAdjacent, { diagonal: false }, blocksX, blocksY);
        const currentHeadNodeForAdjacent = this.getGraphNode(astarGraphAdjacent, this.x, this.y);
        
        if (currentHeadNodeForAdjacent) {
            const immediateNeighbors = astarGraphAdjacent.neighbors(currentHeadNodeForAdjacent);
            let bestNeighbor = null;
            let maxOpenness = -1;

            for (const neighbor of immediateNeighbors) {
                if (!neighbor.isWall()) {
                    let openness = 0;
                    const subNeighbors = astarGraphAdjacent.neighbors(neighbor);
                    for (const subNeighbor of subNeighbors) {
                        if (!subNeighbor.isWall()) {
                            openness++;
                        }
                    }
                    if (this.x === neighbor.x && this.y === neighbor.y) openness = -1;

                    if (openness > maxOpenness) {
                        maxOpenness = openness;
                        bestNeighbor = neighbor;
                    }
                }
            }

            if (bestNeighbor) {
                this.path = [bestNeighbor];
                return;
            }
        }
        
        this.path = []; // Truly trapped
    }

    drawLaserPath() {
        if (!this.path || this.path.length === 0) return;

        push();
        stroke(255, 0, 0, 200); 
        strokeWeight(max(1, blockSize / 8)); 
        noFill();

        let prevX = this.x * blockSize + blockSize / 2;
        let prevY = this.y * blockSize + blockSize / 2;

        for (let i = this.currentPathIndex; i < this.path.length; i++) {
            const node = this.path[i];
            const currentX = node.x * blockSize + blockSize / 2;
            const currentY = node.y * blockSize + blockSize / 2;
            line(prevX, prevY, currentX, currentY);
            prevX = currentX;
            prevY = currentY;

            if (!this.survivalMode && node.x === this.apple.x && node.y === this.apple.y) {
                break;
            }
        }
        pop();
    }

    update() {
        if (!this.dead && !this.weWin) {
            this.move();
            this.checkCollisions();
        }
    }

    checkCollisions() {
        if (this.weWin || this.dead) return;

        if (blocksX * blocksY <= (this.tailBlocks.length + 1)) { 
            this.weWin = true;
            pause = true; 
            return;
        }

        if (this.x < 0 || this.x >= blocksX || this.y < 0 || this.y >= blocksY) {
            this.dead = true;
            return;
        }
        
        for (let i = 0; i < this.tailBlocks.length; i++) {
            if (this.tailBlocks[i].x === this.x && this.tailBlocks[i].y === this.y) {
                this.dead = true;
                return;
            }
        }

        if (this.x === this.apple.x && this.y === this.apple.y) {
            this.ateApple();
        }
    }

    ateApple() {
        this.addCount += 4;
        this.apple = new Apple(this);

        // AI ALWAYS RECALCULATES PATH (no check for controlledByPlayer)
        this.calculatePath();
    }

    isAppleOnSnake(appleObj) {
        return this.isSnakeBodyAt(appleObj.x, appleObj.y, false, false);
    }
}