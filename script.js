// --- START OF FILE script.js ---

// script.js - Main Thread Logic (Input, Rendering, Worker Communication)

// Note: Pathfinding imports are not strictly needed here anymore as logic is in worker.
// import { findPathAStar } from './astar.js'; // Keep if needed for debugging/testing on main thread later

document.addEventListener('DOMContentLoaded', () => {
    // --- Canvas Setup ---
    const canvas = document.getElementById('game-canvas');
    if (!canvas) { console.error("Canvas element not found!"); return; }
    const ctx = canvas.getContext('2d');
    if (!ctx) { console.error("Could not get 2D rendering context!"); return; }

    // --- Indicator Elements ---
    let aStarIndicatorElement = null;
    let longestPathIndicatorElement = null;
    let scoreIndicatorElement = null;

    // --- Game Settings ---
    const GRID_SIZE_X_TARGET = 40;
    const GRID_SIZE_Y_TARGET = 30;
    const SNAKE_SPEED = 80; // ms per step
    const MIN_BLOCK_SIZE = 8;
    const PIXEL_GAP = 2; // Gap around the snake line for aesthetics

    // --- State (Main thread copies for drawing and status) ---
    let snakeBody = [];
    let food = null;
    let blockSize = 10;
    let snakeLineWidth = 8;
    let currentGridX = GRID_SIZE_X_TARGET;
    let currentGridY = GRID_SIZE_Y_TARGET;
    let isGameOver = false;
    let gameStarted = false;
    let currentScore = 0;
    // AI Statuses
    let isAStarAiActive = false;
    let aStarHasPath = false;
    let isLongestPathAiActive = false;
    let longestPathHasPath = false;


    // --- Web Worker ---
    let worker = null;
    try {
        worker = new Worker('worker.js', { type: 'module' });
        console.log("Main: Worker created.");
    } catch (error) {
        console.error("Main: Error creating Web Worker:", error);
        alert("Could not initialize the game worker. Check console (F12).");
        return;
    }

    // --- Core Functions (Main Thread) ---

    function calculateBoardAndBlockSize() {
        const windowWidth = window.innerWidth;
        const windowHeight = window.innerHeight;

        // Calculate block size based on fitting the target grid into the window
        const blockWidth = Math.floor(windowWidth / GRID_SIZE_X_TARGET);
        const blockHeight = Math.floor(windowHeight / GRID_SIZE_Y_TARGET);

        // Ensure block size is reasonable and leaves space for gaps
        blockSize = Math.max(MIN_BLOCK_SIZE, (PIXEL_GAP * 2) + 1, Math.min(blockWidth, blockHeight));

        // Calculate snake line width based on block size and gap
        snakeLineWidth = Math.max(1, blockSize - (PIXEL_GAP * 2)); // Ensure at least 1px line

        // Recalculate actual grid size based on chosen block size
        currentGridX = Math.floor(windowWidth / blockSize);
        currentGridY = Math.floor(windowHeight / blockSize);

        // Set canvas dimensions precisely
        canvas.width = currentGridX * blockSize;
        canvas.height = currentGridY * blockSize;

        console.log(`Main: Resized. Block: ${blockSize}px, Grid: ${currentGridX}x${currentGridY}, LineWidth: ${snakeLineWidth}px`);

        // Inform worker of the new configuration
        if (worker) {
            worker.postMessage({
                type: 'configUpdate',
                payload: {
                    blockSize,
                    snakeLineWidth,
                    gridWidth: currentGridX,
                    gridHeight: currentGridY
                }
            });
        }
    }

    function createIndicators() {
        // A* Indicator
        if (!aStarIndicatorElement) {
            aStarIndicatorElement = document.createElement('div');
            aStarIndicatorElement.className = 'indicator a-star-indicator'; // Add base and specific class
            document.body.appendChild(aStarIndicatorElement);
        }
         // Longest Path Indicator
        if (!longestPathIndicatorElement) {
            longestPathIndicatorElement = document.createElement('div');
            longestPathIndicatorElement.className = 'indicator longest-path-indicator'; // Add base and specific class
            document.body.appendChild(longestPathIndicatorElement);
        }
        // Score Indicator
        if (!scoreIndicatorElement) {
            scoreIndicatorElement = document.createElement('div');
            scoreIndicatorElement.className = 'indicator score-indicator'; // Add base and specific class
            document.body.appendChild(scoreIndicatorElement);
        }
         updateIndicators(); // Initial update
    }

    function updateIndicators() {
        if (aStarIndicatorElement) {
            aStarIndicatorElement.textContent = `A* AI (A): ${isAStarAiActive ? 'ON' : 'OFF'}${isAStarAiActive && !aStarHasPath ? ' (No Path)' : ''}`;
            aStarIndicatorElement.style.display = 'block';
        }
        if (longestPathIndicatorElement) {
            longestPathIndicatorElement.textContent = `Long AI (L): ${isLongestPathAiActive ? 'ON' : 'OFF'}${isLongestPathAiActive && !longestPathHasPath ? ' (No Path)' : ''}`;
            longestPathIndicatorElement.style.display = 'block';
        }
         if (scoreIndicatorElement) {
             scoreIndicatorElement.textContent = `Score: ${currentScore}`;
             scoreIndicatorElement.style.display = 'block';
         }
    }

    function requestDraw() {
        requestAnimationFrame(draw);
    }

    // --- CANVAS DRAW FUNCTION (Main Thread) ---
    function draw() {
        // 1. Clear Canvas / Draw Background
        ctx.fillStyle = '#212121'; // Dark grey background
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        // 2. Draw Food
        if (food) {
            ctx.fillStyle = '#FF0000'; // Red food
            // Original square food drawing
            ctx.fillRect(food.x * blockSize, food.y * blockSize, blockSize, blockSize);
            // --- Alternative smaller food drawing (from previous version) ---
            // const foodPadding = Math.max(1, Math.floor(blockSize * 0.1));
            // ctx.fillRect(
            //     food.x * blockSize + foodPadding,
            //     food.y * blockSize + foodPadding,
            //     blockSize - (foodPadding * 2),
            //     blockSize - (foodPadding * 2)
            // );
        }

        // 3. Draw Snake
        if (snakeBody && snakeBody.length > 0) { // Check if snakeBody exists and has segments

            if (snakeBody.length === 1) {
                // --- FIX: Draw single segment as a square (original style) ---
                const head = snakeBody[0];
                ctx.fillStyle = '#39FF14'; // Bright green snake
                ctx.fillRect(head.x * blockSize, head.y * blockSize, blockSize, blockSize);
            } else {
                 // --- FIX: Draw as path with sharp corners (original style) ---
                ctx.beginPath();
                ctx.strokeStyle = '#39FF14'; // Bright green snake
                ctx.lineWidth = snakeLineWidth;
                ctx.lineCap = 'butt';   // Sharp line ends
                ctx.lineJoin = 'miter'; // Sharp corners

                // Start from the center of the tail segment
                const tail = snakeBody[snakeBody.length - 1];
                ctx.moveTo(tail.x * blockSize + blockSize / 2, tail.y * blockSize + blockSize / 2);

                // Draw lines to the center of each subsequent segment towards the head
                for (let i = snakeBody.length - 2; i >= 0; i--) {
                    const segment = snakeBody[i];
                    ctx.lineTo(segment.x * blockSize + blockSize / 2, segment.y * blockSize + blockSize / 2);
                }
                ctx.stroke(); // Draw the path
            }
        }
        // No Game Over text is drawn, as requested.
    }

    // --- Input Handling (Main Thread) ---
    function handleKeyDown(event) {
        let newPlayerDirection = null;
        let isArrowKey = false;
        let toggleAStarAI = false;
        let toggleLongestPathAI = false;

        switch (event.key) {
            case 'ArrowUp': newPlayerDirection = { x: 0, y: -1 }; isArrowKey = true; break;
            case 'ArrowDown': newPlayerDirection = { x: 0, y: 1 }; isArrowKey = true; break;
            case 'ArrowLeft': newPlayerDirection = { x: -1, y: 0 }; isArrowKey = true; break;
            case 'ArrowRight': newPlayerDirection = { x: 1, y: 0 }; isArrowKey = true; break;
            case 'a': case 'A': toggleAStarAI = true; break;
            case 'l': case 'L': toggleLongestPathAI = true; break; // Added 'l' key
            default: return; // Ignore other keys
        }
        event.preventDefault(); // Prevent page scrolling

        if (!worker) return; // Worker must exist

        // --- Game Start / Restart Logic ---
        if ((isGameOver || !gameStarted) && isArrowKey) {
            console.log(`Main: Requesting Start (${isGameOver ? 'Restart' : 'First time'})`);
            isGameOver = false; // Explicitly set game over to false on key press restart
            gameStarted = true; // Mark game as started
             currentScore = 0; // Reset score display immediately
             isAStarAiActive = false; // Reset AI display immediately
             isLongestPathAiActive = false;
             aStarHasPath = false;
             longestPathHasPath = false;
             updateIndicators(); // Update indicators for reset state

            worker.postMessage({
                type: 'start',
                payload: {
                    blockSize, // Send current calculated values
                    snakeLineWidth,
                    gridWidth: currentGridX,
                    gridHeight: currentGridY,
                    snakeSpeed: SNAKE_SPEED
                }
            });
            // Send the first direction immediately after start request
             worker.postMessage({ type: 'input', payload: newPlayerDirection });
            return; // Don't process other inputs on the same keypress
        }

        // --- In-Game Input Logic ---
        if (gameStarted && !isGameOver) {
            if (newPlayerDirection) {
                // Sending player input will automatically disable AI in the worker
                worker.postMessage({ type: 'input', payload: newPlayerDirection });
            }
            if (toggleAStarAI) {
                worker.postMessage({ type: 'toggleAI' });
            }
            if (toggleLongestPathAI) {
                 worker.postMessage({ type: 'toggleLongestPathAI' });
            }
        }
    }

    // --- Worker Message Handler (Main Thread) ---
    worker.onmessage = function(event) {
        const { type, payload } = event.data;
        // console.log("Main: Received message from worker:", type, payload); // Debugging

        switch (type) {
            case 'stateUpdate':
                // Update local copies of state for drawing
                snakeBody = payload.snakeBody || [];
                food = payload.food;
                if (payload.score !== undefined && payload.score !== currentScore) {
                     currentScore = payload.score;
                     updateIndicators(); // Update score display
                 }
                // Request redraw *after* updating state
                requestDraw();
                break;

            case 'aiStatusUpdate':
                // Update local AI status flags and indicator text
                let needsIndicatorUpdate = false;
                if (payload.isAStarActive !== isAStarAiActive || payload.hasAStarPath !== aStarHasPath) {
                    isAStarAiActive = payload.isAStarActive;
                    aStarHasPath = payload.hasAStarPath;
                    needsIndicatorUpdate = true;
                }
                 if (payload.isLongestPathActive !== isLongestPathAiActive || payload.hasLongestPath !== longestPathHasPath) {
                    isLongestPathAiActive = payload.isLongestPathActive;
                    longestPathHasPath = payload.hasLongestPath;
                    needsIndicatorUpdate = true;
                 }
                 if (needsIndicatorUpdate) {
                    updateIndicators();
                 }
                break;

            case 'gameOver':
                console.log("Main: Received game over from worker. Final Score:", payload.score);
                isGameOver = true;
                gameStarted = false;
                // Update final state from worker if needed (e.g., final score)
                if (payload.score !== undefined) {
                    currentScore = payload.score;
                }
                // Ensure AI indicators are off
                isAStarAiActive = false;
                isLongestPathAiActive = false;
                aStarHasPath = false;
                longestPathHasPath = false;
                updateIndicators(); // Update indicators to show final score and AI OFF
                requestDraw(); // Redraw to show final snake position (no game over text)
                break;

            case 'error':
                console.error("Main: Received error from worker:", payload);
                alert(`An error occurred in the game's background process: ${payload}`);
                // Treat worker error as game over
                isGameOver = true;
                gameStarted = false;
                isAStarAiActive = false; // Ensure AI indicators are off
                isLongestPathAiActive = false;
                aStarHasPath = false;
                longestPathHasPath = false;
                updateIndicators();
                requestDraw(); // Draw the last valid state before error potentially
                break;

            default:
                 console.warn("Main: Received unknown message type from worker:", type);
                 break;
        }
    };

    worker.onerror = function(error) {
        console.error("Main: Error in Web Worker (onerror):", error.message, error);
        alert(`A critical error occurred in the game's background process (onerror): ${error.message}. Please check the console (F12) and refresh.`);
        // Attempt to gracefully handle UI
        isGameOver = true;
        gameStarted = false;
        isAStarAiActive = false;
        isLongestPathAiActive = false;
        aStarHasPath = false;
        longestPathHasPath = false;
        updateIndicators();
        draw(); // Draw final state if possible
    };

    // --- Event Listeners ---
    document.addEventListener('keydown', handleKeyDown);

    // Debounced resize handler
    let resizeTimeout;
    window.addEventListener('resize', () => {
        clearTimeout(resizeTimeout);
        resizeTimeout = setTimeout(() => {
            console.log("Main: Resizing...");
            // Stop the game loop in the worker before resizing
            if (worker) worker.postMessage({ type: 'stop' });

            // Recalculate sizes and update canvas
            calculateBoardAndBlockSize();

            // Reset game state on main thread
            isGameOver = true; // Treat resize as needing a restart
            gameStarted = false;
            isAStarAiActive = false; // Reset AI state
            isLongestPathAiActive = false;
            aStarHasPath = false;
            longestPathHasPath = false;
            snakeBody = []; // Clear snake
            food = null;    // Clear food
            currentScore = 0; // Reset score

            updateIndicators(); // Update indicators for reset state
            draw(); // Draw the empty board immediately

            console.log("Main: Resize processed. Press arrow key to restart.");
        }, 250); // 250ms debounce interval
    });

    // --- Initial Setup ---
    calculateBoardAndBlockSize(); // Calculate initial sizes
    createIndicators(); // Create indicator DOM elements
    ctx.fillStyle = '#212121'; // Initial background draw
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    console.log("Main: Initial setup complete. Press an arrow key to start.");

}); // End DOMContentLoaded
// --- END OF FILE script.js ---