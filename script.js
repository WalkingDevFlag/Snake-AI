// script.js - Main Thread Logic (Input, Rendering, Worker Communication)

import { findPathAStar } from './astar.js'; // This import is technically not needed here anymore, but harmless

document.addEventListener('DOMContentLoaded', () => {
    // --- Canvas Setup ---
    const canvas = document.getElementById('game-canvas');
    if (!canvas) { console.error("Canvas element not found!"); return; }
    const ctx = canvas.getContext('2d');
    if (!ctx) { console.error("Could not get 2D rendering context!"); return; }

    let aiIndicatorElement = null;

    // --- Game Settings ---
    const GRID_SIZE_X_TARGET = 40;
    const GRID_SIZE_Y_TARGET = 30;
    const SNAKE_SPEED = 80;
    const MIN_BLOCK_SIZE = 8;
    const PIXEL_GAP = 2;

    // --- State (Main thread copies for drawing) ---
    let snakeBody = [];
    let food = null;
    let blockSize = 10;
    let snakeLineWidth = 8;
    let currentGridX = GRID_SIZE_X_TARGET;
    let currentGridY = GRID_SIZE_Y_TARGET;
    let isGameOver = false;
    let isAiActive = false;
    let aiHasPath = false;
    let gameStarted = false;

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

    function calculateBoardAndBlockSize() { /* ... (same as before) ... */
        const windowWidth = window.innerWidth; const windowHeight = window.innerHeight;
        const blockWidth = Math.floor(windowWidth / GRID_SIZE_X_TARGET); const blockHeight = Math.floor(windowHeight / GRID_SIZE_Y_TARGET);
        blockSize = Math.max(MIN_BLOCK_SIZE, (PIXEL_GAP * 2) + 1, Math.min(blockWidth, blockHeight));
        snakeLineWidth = Math.max(1, blockSize - (PIXEL_GAP * 2));
        currentGridX = Math.floor(windowWidth / blockSize); currentGridY = Math.floor(windowHeight / blockSize);
        canvas.width = currentGridX * blockSize; canvas.height = currentGridY * blockSize;
        if (worker) { worker.postMessage({ type: 'configUpdate', payload: { blockSize, snakeLineWidth, gridWidth: currentGridX, gridHeight: currentGridY } }); }
    }

    function updateAiIndicator() { /* ... (same as before) ... */
        if (!aiIndicatorElement) { aiIndicatorElement = document.createElement('div'); aiIndicatorElement.className = 'ai-indicator'; document.body.appendChild(aiIndicatorElement); }
        aiIndicatorElement.textContent = `AI: ${isAiActive ? 'ON' : 'OFF'}${isAiActive && !aiHasPath ? ' (No Path)' : ''}`;
        aiIndicatorElement.style.display = 'block';
    }

    function requestDraw() { requestAnimationFrame(draw); }

    // --- CANVAS DRAW FUNCTION (Main Thread - Game Over Text Removed) ---
    function draw() {
        // 1. Clear Canvas / Draw Background
        ctx.fillStyle = '#212121';
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        // 2. Draw Food
        if (food) {
            ctx.fillStyle = '#FF0000';
            ctx.fillRect(food.x * blockSize, food.y * blockSize, blockSize, blockSize);
        }

        // 3. Draw Snake
        if (snakeBody.length === 1) {
            // Draw single segment as a square
            const head = snakeBody[0];
            ctx.fillStyle = '#39FF14';
             ctx.fillRect(head.x * blockSize, head.y * blockSize, blockSize, blockSize);
        } else if (snakeBody.length > 1) {
            // Draw as path
            ctx.beginPath();
            ctx.strokeStyle = '#39FF14';
            ctx.lineWidth = snakeLineWidth;
            ctx.lineCap = 'butt';
            ctx.lineJoin = 'miter'; // Sharp corners

            const tail = snakeBody[snakeBody.length - 1];
            ctx.moveTo(tail.x * blockSize + blockSize / 2, tail.y * blockSize + blockSize / 2);
            for (let i = snakeBody.length - 2; i >= 0; i--) {
                const segment = snakeBody[i];
                ctx.lineTo(segment.x * blockSize + blockSize / 2, segment.y * blockSize + blockSize / 2);
            }
            ctx.stroke();
        }

        // --- Game Over Text Removed ---
        // if (isGameOver) {
        //      ctx.fillStyle = 'rgba(200, 0, 0, 0.7)';
        //      ctx.font = '30px sans-serif';
        //      ctx.textAlign = 'center';
        //      ctx.fillText('Game Over! Press Arrow Key.', canvas.width / 2, canvas.height / 2); // REMOVED THIS LINE
        // }
    }

    // --- Input Handling (Main Thread) ---
    function handleKeyDown(event) { /* ... (same as before) ... */
        let newPlayerDirection = null; let isArrowKey = false; let toggleAI = false;
        switch (event.key) {
            case 'ArrowUp': newPlayerDirection = { x: 0, y: -1 }; isArrowKey = true; break;
            case 'ArrowDown': newPlayerDirection = { x: 0, y: 1 }; isArrowKey = true; break;
            case 'ArrowLeft': newPlayerDirection = { x: -1, y: 0 }; isArrowKey = true; break;
            case 'ArrowRight': newPlayerDirection = { x: 1, y: 0 }; isArrowKey = true; break;
            case 'a': case 'A': toggleAI = true; break; default: return;
        } event.preventDefault();
        if (!worker) return;
        if (isGameOver && isArrowKey) {
            console.log("Main: Requesting Start (Restart)"); isGameOver = false; gameStarted = true;
            worker.postMessage({ type: 'start', payload: { blockSize, snakeLineWidth, gridWidth: currentGridX, gridHeight: currentGridY, snakeSpeed: SNAKE_SPEED } });
            worker.postMessage({ type: 'input', payload: newPlayerDirection }); return;
        }
        if (!isGameOver && !gameStarted && isArrowKey) {
             console.log("Main: Requesting Start (First time)"); gameStarted = true;
             worker.postMessage({ type: 'start', payload: { blockSize, snakeLineWidth, gridWidth: currentGridX, gridHeight: currentGridY, snakeSpeed: SNAKE_SPEED } });
             worker.postMessage({ type: 'input', payload: newPlayerDirection }); return;
         }
         if (gameStarted && !isGameOver) {
             if (newPlayerDirection) { worker.postMessage({ type: 'input', payload: newPlayerDirection }); }
             if (toggleAI) { worker.postMessage({ type: 'toggleAI' }); }
         }
    }

    // --- Worker Message Handler (Main Thread) ---
    worker.onmessage = function(event) { /* ... (same as before) ... */
        const { type, payload } = event.data;
        switch (type) {
            case 'stateUpdate': snakeBody = payload.snakeBody || []; food = payload.food; requestDraw(); break;
            case 'aiStatusUpdate': isAiActive = payload.isActive; aiHasPath = payload.hasPath; updateAiIndicator(); break;
            case 'gameOver': isGameOver = true; gameStarted = false; isAiActive = false; aiHasPath = false; updateAiIndicator(); requestDraw(); console.log("Main: Received game over from worker."); break;
            case 'error': console.error("Main: Received error from worker:", payload); alert(`An error occurred in the game's background process: ${payload}`); isGameOver = true; gameStarted = false; isAiActive = false; aiHasPath = false; updateAiIndicator(); requestDraw(); break;
        }
    };
    worker.onerror = function(error) { /* ... (same as before) ... */
        console.error("Main: Error in Web Worker:", error.message, error); alert(`An error occurred in the game's background process (onerror): ${error.message}`);
        isGameOver = true; gameStarted = false; updateAiIndicator(); draw();
    };

    // --- Event Listeners ---
    document.addEventListener('keydown', handleKeyDown);
    let resizeTimeout; window.addEventListener('resize', () => { clearTimeout(resizeTimeout); resizeTimeout = setTimeout(() => { console.log("Main: Resizing..."); if (worker) worker.postMessage({ type: 'stop' }); calculateBoardAndBlockSize(); isGameOver = true; gameStarted = false; isAiActive = false; aiHasPath = false; snakeBody = []; food = null; updateAiIndicator(); draw(); console.log("Main: Resize processed. Press arrow key to restart."); }, 250); });

    // --- Initial Setup ---
    calculateBoardAndBlockSize(); updateAiIndicator();
    ctx.fillStyle = '#212121'; ctx.fillRect(0, 0, canvas.width, canvas.height);
    console.log("Main: Initial setup complete. Press arrow key to start.");

}); // End DOMContentLoaded