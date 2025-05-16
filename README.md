# Snake Game with A* Pathfinding AI

This project is a classic Snake game implemented in JavaScript using the p5.js library for graphics and interaction. The primary focus of this version is to demonstrate the A* (A-star) pathfinding algorithm in action, with the snake's movement being controlled by an AI that uses A* to navigate.

## Features

*   **A\* Pathfinding AI:** The snake intelligently navigates the game grid to find the apple using the A\* algorithm.
*   **Survival Mode:** If a direct path to the apple cannot be found, the AI employs survival tactics:
    1.  It attempts to find a path to its own tail (to move into open space).
    2.  If that fails, it tries to move to an adjacent empty square that offers the most "breathing room" (most open neighbors).
*   **Laser Path Visualization:** Press and hold the **Tab** key to see a "laser" (a red line) drawn from the snake's head along its currently calculated A\* path. This provides a clear visual insight into the AI's decision-making process.
*   **Dynamic Grid:** The game grid and block sizes adapt to the browser window size.
*   **AI-Only Gameplay:** Manual player control has been removed to focus solely on the A\* AI demonstration.

## How to Play / Observe

1.  Clone or download this repository.
2.  Open `index.html` in a modern web browser.
3.  The game will start automatically with the AI controlling the snake.
4.  Observe the snake's movement as it uses A\* to find the apple.
5.  **Press and hold the `Tab` key** to visualize the AI's current intended path as a red laser line.
6.  **Optional Controls:**
    *   **`P` key:** Toggle Pause/Play.
    *   **`Spacebar`:** Temporarily speed up the game (hold down).
    *   **`Up Arrow` / `Down Arrow`:** Adjust game speed (frame rate for observation).

## Project Goal

The main objective of this project is not to create an unbeatable Snake AI or a feature-complete game, but rather to **implement and clearly demonstrate the A\* pathfinding algorithm**. The visualizations and AI behavior are geared towards making the algorithm's operation understandable.

## Code Structure

*   `index.html`: The main HTML file that sets up the page and includes the scripts.
*   `styles.css`: Basic styling for the page.
*   `SnakeGame/`
    *   `sketch.js`: Main p5.js sketch file, handles game loop, setup, drawing, and global variables.
    *   `Snake.js`: Class definition for the snake, including its movement logic, A\* path calculation calls, and collision detection.
    *   `Apple.js`: Class definition for the apple.
    *   `AStar.js`: Implementation of the A\* pathfinding algorithm, including `BinaryHeap`, `GridNode`, and `Graph` classes.

## A\* Implementation Details

The `AStar.js` module provides:
*   A `BinaryHeap` for managing the open set efficiently.
*   `GridNode` objects representing cells in the game grid, storing A\* properties (`f`, `g`, `h`, `parent`, `visited`, `closed`, `weight`).
*   A `Graph` class that converts the game state (snake body as walls) into a traversable graph for the A\* algorithm.
*   The `astar.search` function, which performs the pathfinding using Manhattan distance as the heuristic.

## Future Considerations (Beyond Current Scope)

*   More advanced AI strategies (e.g., Hamiltonian cycles for guaranteed survival, look-ahead for trap avoidance).
*   Deeper A\* visualization: drawing open/closed sets, displaying f/g/h costs on grid cells.
*   Step-by-step A\* execution for educational purposes.

## Acknowledgements

*   Based on the A\* algorithm concepts.
*   Uses the p5.js creative coding library.