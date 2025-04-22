// --- START OF FILE worker.js ---

// worker.js - Game Logic Web Worker

// Import pathfinding functions
let findPathAStar;
let findLongestPath;
try {
    const astarModule = await import('./astar.js');
    findPathAStar = astarModule.findPathAStar;
    const longestPathModule = await import('./longest_path.js');
    findLongestPath = longestPathModule.findLongestPath;
    if (!findPathAStar || !findLongestPath) throw new Error("Pathfinding functions not loaded");
} catch(e) {
    console.error("Worker: Failed to import pathfinding modules!", e);
    // Post error back to main thread before throwing, as throwing might terminate worker abruptly
    postMessage({ type: 'error', payload: `Failed to load pathfinding modules: ${e.message}` });
    throw e;
}


// --- Worker State ---
let snakeBody = []; let food = {}; let direction = { x: 0, y: 0 };
let newDirection = { x: 0, y: 0 }; let blockSize = 10; // Default, updated on start
let snakeLineWidth = 8; // Default, updated on start
let currentGridX = 40; let currentGridY = 30; let isGameOver = false;
let gameStarted = false;
let isAiActive = false; // Standard A* AI
let isLongestPathAiActive = false; // Longest Path AI
let currentPath = [];
let gameLoopInterval = null; let SNAKE_SPEED = 80; // Default, updated on start
let score = 0; // Score counter

// --- Utility ---
// Helper to ensure only one AI mode is active at a time
function setActiveAiMode(mode) { // mode = 'astar', 'longest', or 'none'
    isAiActive = (mode === 'astar');
    isLongestPathAiActive = (mode === 'longest');
    currentPath = []; // Reset path when switching modes or turning off
    recalculateAiPath(); // Try to find a path immediately for the new mode
    sendAiStatusUpdate();
}

// Helper to send combined AI status
function sendAiStatusUpdate() {
    postMessage({
        type: 'aiStatusUpdate',
        payload: {
            isAStarActive: isAiActive,
            hasAStarPath: isAiActive && currentPath.length > 0, // Path relevant only if active
            isLongestPathActive: isLongestPathAiActive,
            hasLongestPath: isLongestPathAiActive && currentPath.length > 0, // Path relevant only if active
        }
    });
}

// Helper to calculate the path based on the active AI mode
function recalculateAiPath() {
    if (!gameStarted || isGameOver || snakeBody.length === 0 || !food) {
        currentPath = [];
        return;
    }

    if (isAiActive) { // Standard A*
        currentPath = findPathAStar(snakeBody[0], food, snakeBody, currentGridX, currentGridY);
        if (currentPath.length === 0) console.log("Worker: A* AI could not find path.");
    } else if (isLongestPathAiActive) { // Longest Path Heuristic
        currentPath = findLongestPath(snakeBody[0], food, snakeBody, currentGridX, currentGridY);
         if (currentPath.length === 0) console.log("Worker: Longest Path AI could not find path.");
    } else { // No AI active
        currentPath = [];
    }
    // Send update after recalculation, showing whether the active AI found a path
    sendAiStatusUpdate();
}


// --- Game Logic Functions ---
function update() {
    // --- AI Control ---
    if (isAiActive || isLongestPathAiActive) {
        if (currentPath.length > 0) {
            const nextStep = currentPath[0];
            const head = snakeBody[0];
            const moveX = nextStep.x - head.x;
            const moveY = nextStep.y - head.y;

            // Basic validation of the next step from path
            if ((Math.abs(moveX) === 1 && moveY === 0) || (moveX === 0 && Math.abs(moveY) === 1)) {
                // Check for immediate suicidal move *before* committing direction
                const intendedNewHead = { x: head.x + moveX, y: head.y + moveY };
                const obstaclesNow = new Set(snakeBody.slice(1).map(s => `${s.x},${s.y}`)); // Body excluding head

                if (checkWallCollision(intendedNewHead) || obstaclesNow.has(`${intendedNewHead.x},${intendedNewHead.y}`)) {
                    console.warn(`Worker: AI detected imminent collision (Wall or Self) for move (${moveX},${moveY}). Recalculating.`);
                    currentPath = []; // Invalidate current path
                    recalculateAiPath(); // Try to find a new path immediately
                    // If still no path after recalc, AI might stall for one frame, which is okay.
                    // If a new path *was* found, the next iteration might use it.
                    // We don't change direction this frame to avoid the collision.
                    // Fallback to player direction if available? Or just stop? Let's just stop for this frame.
                    // Need to be careful not to create infinite recalc loops.
                    // Maybe turn off AI if recalc fails twice? For now, just recalc once.
                    direction = { x: 0, y: 0 }; // Prevent movement this tick
                } else {
                    // Valid move, update direction and remove step from path
                    direction = { x: moveX, y: moveY };
                    currentPath.shift();
                }
            } else {
                console.warn("Worker: Invalid step in AI path:", nextStep, "from head:", head, ". Path Len:", currentPath.length, "Clearing path.");
                currentPath = []; // Invalid path, clear it
                recalculateAiPath(); // Attempt to recover
                direction = { x: 0, y: 0 }; // Halt movement
            }
        } else {
             // AI is active but has no path (or path ran out)
             // console.log("Worker: AI active but no current path segment.");
             recalculateAiPath(); // Try to find one
             // If a path is found, it will be used next tick. If not, AI stalls.
             // We could potentially add a simple survival heuristic here (e.g., turn left if wall ahead)
             // but for now, it just waits for a valid path.
             direction = { x: 0, y: 0 }; // Halt movement if no path found/recalculated
        }
    } else { // Player Control
        // Only update direction if it's a valid move (not reversing)
        if ((newDirection.x !== 0 || newDirection.y !== 0) &&
            !(snakeBody.length > 1 && direction.x === -newDirection.x && direction.y === -newDirection.y))
        {
            direction = { ...newDirection };
        }
        // Reset player's intended direction after applying it or ignoring it
        // This prevents holding down a key from overriding AI indefinitely after AI is turned off
        // newDirection = { x: 0, y: 0 }; // Let's rethink this - player *should* be able to hold key
    }

    // If no movement determined (start, AI stall, player hasn't pressed key), skip rest
    if (direction.x === 0 && direction.y === 0 && snakeBody.length > 1) {
        // console.log("Worker: No direction change, skipping update logic.");
        // Send state just to keep main thread visuals alive if needed
        postStateUpdate();
        return;
    }
    // Allow initial move even if direction is 0,0 (first key press)
    if (direction.x === 0 && direction.y === 0 && snakeBody.length === 1 && !gameStarted) return;


    const head = snakeBody[0];
    const actualNewHead = { x: head.x + direction.x, y: head.y + direction.y };

    // --- Collision Check ---
    if (checkWallCollision(actualNewHead) || checkSelfCollision(actualNewHead)) {
        gameOverInternal();
        return;
    }

    // --- Move Snake ---
    snakeBody.unshift(actualNewHead);

    // --- Food Check ---
    const headAfterMove = snakeBody[0];
    let ateFood = false;
    if (food && headAfterMove.x === food.x && headAfterMove.y === food.y) {
        ateFood = true;
        score++; // Increment score
        food = getRandomFoodPosition();
        if (!food) {
            console.log("Worker: Win/Error: No space for new food.");
            gameOverInternal(); // Or handle win condition differently
            return;
        }
        // Don't pop tail if food eaten
    } else {
        // Pop tail if no food eaten (and snake has moved)
         if (snakeBody.length > 1) { // Don't pop if only head exists
            snakeBody.pop();
         }
    }

     // --- Recalculate AI path if needed ---
     // Recalculate if AI is active AND (food was eaten OR the current path is now empty)
    if ((isAiActive || isLongestPathAiActive) && (ateFood || currentPath.length === 0)) {
         // console.log(`Worker: Recalculating AI path. Reason: ${ateFood ? 'Ate Food' : 'Path Empty'}`);
        recalculateAiPath();
        // Note: sendAiStatusUpdate is called within recalculateAiPath
    }

    // --- Post state AFTER potentially recalculating path ---
    postStateUpdate();
}

function checkWallCollision(head) { return ( head.x < 0 || head.x >= currentGridX || head.y < 0 || head.y >= currentGridY ); }
function checkSelfCollision(head) { for (let i = 1; i < snakeBody.length; i++) { if (head.x === snakeBody[i].x && head.y === snakeBody[i].y) return true; } return false; }
function getRandomFoodPosition() {
    let newFoodPosition; let attempts = 0; const maxAttempts = currentGridX * currentGridY;
    if (snakeBody.length >= maxAttempts) return null; // No space left
    const occupied = new Set(snakeBody.map(segment => `${segment.x},${segment.y}`));
    do { newFoodPosition = { x: Math.floor(Math.random() * currentGridX), y: Math.floor(Math.random() * currentGridY) }; attempts++;
    } while (occupied.has(`${newFoodPosition.x},${newFoodPosition.y}`) && attempts < maxAttempts * 2); // Increased attempts margin slightly

    if (occupied.has(`${newFoodPosition.x},${newFoodPosition.y}`)) {
        console.warn("Worker: Could not find empty spot for food after extensive search.");
        // Maybe try iterating systematically instead of pure random? For now, return null.
        return null;
    }
    return newFoodPosition;
}
// isPositionOnSnake is effectively replaced by the Set check in getRandomFoodPosition

function gameOverInternal() {
    console.log("Worker: Game Over. Final Score:", score);
    isGameOver = true;
    isAiActive = false; // Turn off AI on game over
    isLongestPathAiActive = false;
    currentPath = [];
    gameStarted = false;
    if (gameLoopInterval) {
        clearInterval(gameLoopInterval);
        gameLoopInterval = null;
    }
    postMessage({ type: 'gameOver', payload: { score: score } }); // Send final score
    sendAiStatusUpdate(); // Ensure indicators are OFF
}

function postStateUpdate() {
     postMessage({
        type: 'stateUpdate',
        payload: {
            snakeBody: snakeBody,
            food: food ? { ...food } : null,
            score: score // Include score in state updates
        }
    });
}

function gameLoop() {
    if (!gameStarted || isGameOver) {
        // console.log("Worker: Game loop called but not running.");
        return;
    }
    try {
        update();
        // State update is now inside update() to ensure it happens after potential AI path recalc
    } catch (error) {
         console.error("Worker Error during game loop:", error, error.stack);
         postMessage({ type: 'error', payload: error.message });
         gameOverInternal();
    }
}

// --- Worker Message Handler ---
self.onmessage = function(event) {
    const { type, payload } = event.data;
    // console.log("Worker received message:", type, payload); // Debugging messages
    try {
        switch (type) {
            case 'start':
                if (gameStarted && !isGameOver) { // Prevent restart if already running mid-game
                     console.log("Worker: Ignoring start command, game already in progress.");
                     return;
                 }
                console.log("Worker: Starting game with config:", payload);
                blockSize = payload.blockSize;
                snakeLineWidth = payload.snakeLineWidth;
                currentGridX = payload.gridWidth;
                currentGridY = payload.gridHeight;
                SNAKE_SPEED = payload.snakeSpeed;

                isGameOver = false;
                isAiActive = false; // Ensure AI is off at start
                isLongestPathAiActive = false;
                currentPath = [];
                score = 0; // Reset score
                snakeBody = [{ x: Math.floor(currentGridX / 2), y: Math.floor(currentGridY / 2) }];
                direction = { x: 0, y: 0 }; // Reset initial direction
                newDirection = { x: 0, y: 0 }; // Reset intended direction
                food = getRandomFoodPosition();
                gameStarted = true;

                if (gameLoopInterval) { // Clear any previous interval just in case
                     clearInterval(gameLoopInterval);
                 }
                gameLoopInterval = setInterval(gameLoop, SNAKE_SPEED);

                postStateUpdate(); // Send initial state
                sendAiStatusUpdate(); // Send initial AI status (both off)
                break;

            case 'stop': // Usually called on resize
                 console.log("Worker: Stopping game loop.");
                 gameStarted = false;
                 isGameOver = true; // Treat stop as game over for state purposes
                 isAiActive = false;
                 isLongestPathAiActive = false;
                 currentPath = [];
                 if (gameLoopInterval) {
                    clearInterval(gameLoopInterval);
                    gameLoopInterval = null;
                 }
                 // Don't reset score here, gameOverInternal does that if needed
                 // postMessage({ type: 'gameOver', payload: { score: score } }); // Maybe send final score on stop too? No, rely on restart.
                 break;

            case 'configUpdate': // Update grid dimensions if needed mid-game (e.g., future feature)
                 console.log("Worker: Updating config:", payload);
                 blockSize = payload.blockSize;
                 snakeLineWidth = payload.snakeLineWidth;
                 currentGridX = payload.gridWidth;
                 currentGridY = payload.gridHeight;
                 // AI might need path recalculation if grid changes significantly
                 if(isAiActive || isLongestPathAiActive) recalculateAiPath();
                 break;

            case 'input': // Player direction input
                 if (gameStarted && !isGameOver && payload) {
                    // console.log("Worker: Received player input:", payload);
                     // Set the *intended* direction
                     newDirection = payload;
                     // If AI is active, player input turns it off
                     if (isAiActive || isLongestPathAiActive) {
                         console.log("Worker: Player input disabling AI.");
                         setActiveAiMode('none');
                         // Apply player's direction immediately now that AI is off
                         if (!(snakeBody.length > 1 && direction.x === -newDirection.x && direction.y === -newDirection.y)){
                             direction = { ...newDirection };
                         }
                     }
                 }
                 break;

            case 'toggleAI': // Toggle standard A*
                 if (gameStarted && !isGameOver) {
                    console.log("Worker: Toggling A* AI.");
                    setActiveAiMode(isAiActive ? 'none' : 'astar');
                 }
                break;

            case 'toggleLongestPathAI': // Toggle Longest Path AI
                 if (gameStarted && !isGameOver) {
                    console.log("Worker: Toggling Longest Path AI.");
                    setActiveAiMode(isLongestPathAiActive ? 'none' : 'longest');
                 }
                 break;

            default:
                console.warn("Worker: Received unknown message type:", type);
                break;
        }
    } catch (error) {
        console.error("Worker Error handling message:", type, error, error.stack);
        postMessage({ type: 'error', payload: `Error handling ${type}: ${error.message}` });
        gameOverInternal(); // Treat errors as game-ending
    }
};

console.log("Worker: Initialized and message handler set.");
// --- END OF FILE worker.js ---