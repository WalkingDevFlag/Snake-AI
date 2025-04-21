// worker.js - Game Logic Web Worker

// Import the A* pathfinding function (relative path)
try {
    const astarModule = await import('./astar.js');
    var findPathAStar = astarModule.findPathAStar;
} catch(e) {
    console.error("Worker: Failed to import astar.js!", e);
    throw e;
}

// --- Worker State ---
let snakeBody = []; let food = {}; let direction = { x: 0, y: 0 };
let newDirection = { x: 0, y: 0 }; let blockSize = 10; let snakeLineWidth = 8;
let currentGridX = 40; let currentGridY = 30; let isGameOver = false;
let gameStarted = false; let isAiActive = false; let currentPath = [];
let gameLoopInterval = null; let SNAKE_SPEED = 80;

// --- Game Logic Functions ---
function update() { /* ... (same as previous version) ... */
    // --- AI Control ---
    if (isAiActive) {
        if (currentPath.length > 0) { /* Determine direction from path */
            const nextStep = currentPath[0]; const head = snakeBody[0];
            const moveX = nextStep.x - head.x; const moveY = nextStep.y - head.y;
            if ((Math.abs(moveX) === 1 && moveY === 0) || (moveX === 0 && Math.abs(moveY) === 1)) {
                direction = { x: moveX, y: moveY }; currentPath.shift();
            } else { /* Handle invalid path step */
                console.warn("Worker: Invalid step in A* path:", nextStep, "from head:", head);
                isAiActive = false; currentPath = []; postMessage({ type: 'aiStatusUpdate', payload: { isActive: isAiActive, hasPath: false } });
                direction = { ...newDirection }; // Revert to player intent
            }
        } else { /* Handle no path */ direction = { ...newDirection }; }
    } else { /* Player Control */
        if ((newDirection.x !== 0 || newDirection.y !== 0) && !(direction.x === -newDirection.x && direction.y === -newDirection.y)) {
            direction = { ...newDirection };
        }
    }
    if (direction.x === 0 && direction.y === 0) return; // No movement yet

    const head = snakeBody[0];
    const intendedNewHead = { x: head.x + direction.x, y: head.y + direction.y };
    let actualNewHead = intendedNewHead;

    // --- Pre-move Collision Check ---
     if (isAiActive) { /* Check AI suicide */
         const obstaclesNow = new Set(snakeBody.slice(1).map(s => `${s.x},${s.y}`));
         if (obstaclesNow.has(`${intendedNewHead.x},${intendedNewHead.y}`)) {
             console.warn("Worker: AI predicted collision. Deactivating.");
             isAiActive = false; currentPath = []; postMessage({ type: 'aiStatusUpdate', payload: { isActive: isAiActive, hasPath: false } });
             direction = { ...newDirection };
             actualNewHead = { x: head.x + direction.x, y: head.y + direction.y };
             if (checkWallCollision(actualNewHead) || checkSelfCollision(actualNewHead)) { gameOverInternal(); return; }
         } else { /* Check normal collisions for AI move */
              if (checkWallCollision(actualNewHead) || checkSelfCollision(actualNewHead)) { gameOverInternal(); return; }
         }
    } else { /* Player move collision check */
         if (checkWallCollision(actualNewHead) || checkSelfCollision(actualNewHead)) { gameOverInternal(); return; }
    }

    snakeBody.unshift(actualNewHead);

    // --- Post-move Food Check ---
    const headAfterMove = snakeBody[0];
    if (food && headAfterMove.x === food.x && headAfterMove.y === food.y) { // Check if food exists
        food = getRandomFoodPosition();
        if (food) {
            if (isAiActive) {
                currentPath = findPathAStar(snakeBody[0], food, snakeBody, currentGridX, currentGridY);
                postMessage({ type: 'aiStatusUpdate', payload: { isActive: isAiActive, hasPath: currentPath.length > 0 } });
                if (currentPath.length === 0) { console.log("Worker: AI could not find path to new food."); }
            }
        } else {
            console.log("Worker: Win/Error: No space for food.");
            gameOverInternal(); return;
        }
    } else {
        if (snakeBody.length > 1) { snakeBody.pop(); } // Remove tail
    }
}
function checkWallCollision(head) { /* ... (same) ... */ return ( head.x < 0 || head.x >= currentGridX || head.y < 0 || head.y >= currentGridY ); }
function checkSelfCollision(head) { /* ... (same) ... */ for (let i = 1; i < snakeBody.length; i++) { if (head.x === snakeBody[i].x && head.y === snakeBody[i].y) return true; } return false; }
function getRandomFoodPosition() { /* ... (same) ... */
    let newFoodPosition; let attempts = 0; const maxAttempts = currentGridX * currentGridY;
    if (snakeBody.length >= maxAttempts) return null;
    do { newFoodPosition = { x: Math.floor(Math.random() * currentGridX), y: Math.floor(Math.random() * currentGridY) }; attempts++;
    } while (isPositionOnSnake(newFoodPosition) && attempts < maxAttempts * 2);
    if (attempts >= maxAttempts * 2 && isPositionOnSnake(newFoodPosition)) { console.warn("Worker: Could not find empty spot for food."); return null; }
    return newFoodPosition;
}
function isPositionOnSnake(position) { /* ... (same) ... */ if (!position) return false; return snakeBody.some(segment => segment.x === position.x && segment.y === position.y); }
function gameOverInternal() { /* ... (same) ... */
    isGameOver = true; isAiActive = false; currentPath = []; gameStarted = false;
    clearInterval(gameLoopInterval); gameLoopInterval = null;
     postMessage({ type: 'gameOver' });
}
function gameLoop() { /* ... (same) ... */
    if (!gameStarted || isGameOver) return;
    try {
        update();
        if (!isGameOver) {
            postMessage({ type: 'stateUpdate', payload: { snakeBody: snakeBody, food: food ? { ...food } : null } });
        }
    } catch (error) {
         console.error("Worker Error during game loop:", error);
         postMessage({ type: 'error', payload: error.message });
         gameOverInternal();
    }
}

// --- Worker Message Handler ---
self.onmessage = function(event) { /* ... (same as previous version) ... */
    const { type, payload } = event.data;
    try {
        switch (type) {
            case 'start':
                if (gameStarted) return;
                blockSize = payload.blockSize; snakeLineWidth = payload.snakeLineWidth;
                currentGridX = payload.gridWidth; currentGridY = payload.gridHeight;
                SNAKE_SPEED = payload.snakeSpeed;
                isGameOver = false; isAiActive = false; currentPath = [];
                snakeBody = [{ x: Math.floor(currentGridX / 2), y: Math.floor(currentGridY / 2) }];
                direction = { x: 0, y: 0 }; newDirection = { x: 0, y: 0 };
                food = getRandomFoodPosition();
                gameStarted = true;
                if (!gameLoopInterval) { gameLoopInterval = setInterval(gameLoop, SNAKE_SPEED); }
                postMessage({ type: 'stateUpdate', payload: { snakeBody, food, isGameOver: false }});
                postMessage({ type: 'aiStatusUpdate', payload: { isActive: isAiActive, hasPath: false } });
                break;
            case 'stop':
                 gameStarted = false; isGameOver = true; isAiActive = false; currentPath = [];
                 clearInterval(gameLoopInterval); gameLoopInterval = null;
                 break;
            case 'configUpdate':
                 blockSize = payload.blockSize; snakeLineWidth = payload.snakeLineWidth;
                 currentGridX = payload.gridWidth; currentGridY = payload.gridHeight;
                 break;
            case 'input':
                 if (gameStarted && !isGameOver) {
                     newDirection = payload;
                     if (isAiActive) {
                         isAiActive = false; currentPath = [];
                         postMessage({ type: 'aiStatusUpdate', payload: { isActive: isAiActive, hasPath: false } });
                     }
                 }
                 break;
            case 'toggleAI':
                 if (gameStarted && !isGameOver) {
                     isAiActive = !isAiActive; currentPath = [];
                     if (isAiActive) {
                         if (snakeBody.length > 0 && food) {
                            currentPath = findPathAStar(snakeBody[0], food, snakeBody, currentGridX, currentGridY);
                            if (currentPath.length === 0) { console.log("Worker: AI activated but could not find initial path."); }
                         } else { isAiActive = false; }
                     }
                     postMessage({ type: 'aiStatusUpdate', payload: { isActive: isAiActive, hasPath: currentPath.length > 0 } });
                 }
                break;
        }
    } catch (error) {
        console.error("Worker Error handling message:", type, error);
        postMessage({ type: 'error', payload: `Error handling ${type}: ${error.message}` });
        gameOverInternal();
    }
};