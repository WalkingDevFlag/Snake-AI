// --- START OF FILE longest_path.js ---

// longest_path.js - Longest Path Heuristic Module
// We'll use the A* module internally

// --- FIX: Only import the exported function ---
import { findPathAStar } from './astar.js';
// Removed: nodeToString, stringToNode, heuristic as they are not exported from astar.js

/**
 * Tries to find a "longer" path to the food by first attempting to path
 * towards the snake's tail if there's enough space, otherwise defaults
 * to the direct A* path to the food.
 *
 * @param {object} startNode The snake's head {x, y}
 * @param {object} goalNode The food's location {x, y}
 * @param {array} snakeBody Array of snake segments [{x, y}, ...]
 * @param {number} gridWidth Width of the grid
 * @param {number} gridHeight Height of the grid
 * @returns {array} The calculated path [{x, y}, ...] or [] if no path found.
 */
export function findLongestPath(startNode, goalNode, snakeBody, gridWidth, gridHeight) {
    // 1. Find the direct path to food (shortest path)
    const pathToFood = findPathAStar(startNode, goalNode, snakeBody, gridWidth, gridHeight);

    // If no path to food exists at all, we can't do anything
    if (!pathToFood || pathToFood.length === 0) {
        // console.log("Longest Path: No path to food found initially.");
        return [];
    }

    // 2. Determine the target near the tail
    // Need at least head, body, tail segments for this heuristic to make sense
    if (snakeBody.length < 3) {
        // Not long enough to meaningfully chase tail, just go for food
        // console.log("Longest Path: Snake too short, using food path.");
        return pathToFood;
    }
    // Target the cell *before* the actual tail segment
    const tailTargetNode = snakeBody[snakeBody.length - 2]; // The segment the tail will move into next

    // 3. Find path to the tail target
    // Pass the snake body *excluding the very last segment* as obstacles.
    // This allows the pathfinder to consider the space the tail currently occupies as valid
    // ONLY if the destination is the tile immediately adjacent to the tail tip.
    const snakeBodyForTailPath = snakeBody.slice(0, -1); // Exclude the actual tail tip
    const pathToTail = findPathAStar(startNode, tailTargetNode, snakeBodyForTailPath, gridWidth, gridHeight);

    // 4. Decide whether to use the tail path (Heuristic)
    const availableSpace = gridWidth * gridHeight - snakeBody.length;
    // Threshold: Need more free space as snake grows. Tunable parameter.
    const spaceThreshold = Math.max(10, snakeBody.length * 1.5);

    // Use tail path ONLY if:
    // a) A path to the pre-tail node exists.
    // b) There's sufficient free space (less likely to get trapped).
    // c) The path to the tail is actually longer than the path to the food (otherwise, why bother?)
    const useTailPath = pathToTail &&
                        pathToTail.length > 0 &&
                        availableSpace > spaceThreshold &&
                        pathToTail.length > pathToFood.length; // Check if tail path is longer

    // console.log(`LP Debug: FoodPath:${pathToFood.length}, TailPath:${pathToTail?.length}, Available:${availableSpace}, Threshold:${spaceThreshold.toFixed(1)}, UseTail:${useTailPath}`);

    if (useTailPath) {
        // Safety check: From the *end* of the proposed tail path, can we still reach the food?
        // This prevents chasing tail into a dead end *if* easily detectable.
        // Note: This check is heuristic, not foolproof.
        const lastStepOfTailPath = pathToTail[pathToTail.length - 1]; // The node we'd reach
        // Simulate the snake state *after* following the *entire* tail path is complex.
        // Let's simplify: Check from the *first step* of the tail path instead.
        if (pathToTail.length > 0) {
            const nextPosAfterOneStep = pathToTail[0]; // Where head will be after 1 step
            // Simulate the move for collision checking for the *next* A* search
            const simulatedSnakeBody = [nextPosAfterOneStep, ...snakeBody.slice(0,-1)]; // Head moves, tail drops
            const pathExistsFromNextStep = findPathAStar(nextPosAfterOneStep, goalNode, simulatedSnakeBody, gridWidth, gridHeight);

            if (pathExistsFromNextStep && pathExistsFromNextStep.length > 0) {
                // console.log("Longest Path: Using tail path (passed safety check).");
                return pathToTail;
            } else {
                 // console.log("Longest Path: Tail path seems unsafe (no path to food from next step), using food path.");
                return pathToFood; // Tail path seems unsafe, revert to direct food path
            }
        } else {
             // console.log("Longest Path: Tail path empty (shouldn't happen if useTailPath true), using food path.");
             return pathToFood; // Safeguard
        }
    } else {
        // console.log("Longest Path: Conditions not met for tail path, using food path.");
        return pathToFood; // Default to the direct path to food
    }
}
// --- END OF FILE longest_path.js ---