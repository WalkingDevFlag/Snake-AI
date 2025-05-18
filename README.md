# Snake AI 

[![JavaScript](https://img.shields.io/badge/JavaScript-F7DF1E?style=for-the-badge&logo=javascript&logoColor=black)](https://developer.mozilla.org/en-US/docs/Web/JavaScript)
[![p5.js](https://img.shields.io/badge/p5.js-ED225D?style=for-the-badge&logo=p5.js&logoColor=white)](https://p5js.org/)
[![HTML5](https://img.shields.io/badge/HTML5-E34F26?style=for-the-badge&logo=html5&logoColor=white)](https://developer.mozilla.org/en-US/docs/Web/Guide/HTML/HTML5)
[![CSS3](https://img.shields.io/badge/CSS3-1572B6?style=for-the-badge&logo=css3&logoColor=white)](https://developer.mozilla.org/en-US/docs/Web/CSS)

This project implements a Snake AI that uses the A* (A-star) search algorithm as its core pathfinding logic to navigate towards the apple. This approach is inspired by early explorations into AI for Snake, similar to initial concepts discussed in CodeBullet's video "[I Created a PERFECT SNAKE A.I.](https://www.youtube.com/watch?v=tjQIO1rqTBE)".

## Demo

![Snake AI A* Demo](demo.gif)


## Features

*   **Intelligent AI Opponent:** The snake is fully controlled by an AI.
*   **A* Pathfinding:** The AI uses the A* algorithm to find the shortest path to the apple, treating the snake's body as obstacles.
*   **Survival Mode:**
    *   If a direct path to the apple cannot be found (e.g., it's blocked), the AI enters "survival mode."
    *   In survival mode, it first attempts to find a path to its own tail, effectively "chasing" its tail to stay alive and potentially open up new paths.
    *   If even pathing to its tail isn't possible, it will try to move to an adjacent empty square that offers the most open space, as a last resort to avoid immediate collision.
*   **A* Path Visualization:** Press and hold the `Tab` key to visualize the current path calculated by the A* algorithm (drawn as a "laser" line from the snake's head).
*   **Adjustable AI Speed:**
    *   `Up Arrow`: Increases AI speed (by increasing frame rate).
    *   `Down Arrow`: Decreases AI speed (by decreasing frame rate).
    *   `Space Bar` (hold): Drastically increases AI speed (by increasing updates per frame).
*   **Pause Functionality:** Press `P` to toggle pause/resume the game.
*   **Dynamic Grid:** The game grid size (`blocksX`, `blocksY`) and rendering (`blockSize`) adapt based on window dimensions and a `maxBlocks` constraint.
*   **Automatic Restart:** The game restarts if the snake fills the entire board (win condition) or if the snake collides.

## How it Works

The AI's strategy primarily relies on the A* search algorithm:

1.  **Path to Apple:**
    *   The game board is represented as a grid. The A* algorithm searches for the shortest path from the snake's head to the apple's current location.
    *   The snake's own body segments (excluding the head and, in some cases, the very tip of the tail when pathing to it) are considered unwalkable obstacles in the grid.
    *   If a valid path to the apple is found, the snake follows this path.

2.  **Survival Mode (Fallback Strategy):**
    *   **Path to Tail:** If A* cannot find a path to the apple (e.g., the apple is completely walled off by the snake's body), the AI switches to `survivalMode`. Its first attempt in this mode is to calculate a path to its own tail block. This encourages the snake to move in a way that might free up space or "uncoil" itself.
    *   **Most Open Adjacent Cell:** If pathing to the tail is also not possible (e.g., the snake is in a very tight spot), the AI will look at its immediate adjacent cells. It will choose to move to the valid (non-obstacle) adjacent cell that has the most open neighboring cells around *it*. This is a heuristic to try and move towards more open space.
    *   **No Path:** If none of the above yield a move, the snake is considered trapped, and will likely collide on its next forced move.

The path is recalculated whenever the snake eats an apple or if its current path becomes invalid (e.g., leading to a collision).


## Setup and Installation

1.  **Clone the repository or download the files:**
    ```bash
    git clone https://github.com/WalkingDevFlag/Snake-AI.git
    cd Snake-AI
    ```
2.  **Run a Local Web Server:** Because browsers have security restrictions about opening local files that load other files, you need to serve the `index.html` file through a simple local web server.
    *   If you have Python 3 installed, open your terminal or command prompt, navigate to the project's main directory (the one containing `index.html`), and run:
        ```bash
        python -m http.server
        ```
    *   If you have Node.js installed, you can use `npx`:
        ```bash
        npx http-server
        ```
    *   Alternatively, use any simple web server tool you prefer.
3.  **Open in Browser:** Once the server is running, open your web browser and go to the address provided by the server (usually `http://localhost:8000` or `http://127.0.0.1:8000`). You should see the Snake AI running.

## Controls

*   **`Tab` Key:** Press and **hold** to display the A* path visualization (a "laser" line showing the snake's intended path). Release to hide.
*   **`Up Arrow` Key:** Increases the AI's speed (by increasing the game's frame rate).
*   **`Down Arrow` Key:** Decreases the AI's speed (by decreasing the game's frame rate).
*   **`Space Bar`:** Press and **hold** to significantly speed up the AI (by increasing the number of snake updates per frame). Release to return to the speed set by arrow keys/default.
*   **`P` Key:** Toggles pause/resume for the game.

## Technologies Used

*   **JavaScript (ES6+)**
*   **p5.js:** A JavaScript library for creative coding, used here for graphics, canvas management, and event handling.
*   **HTML5**
*   **CSS3**

## Acknowledgements

*   This project is inspired by the creative AI explorations by **CodeBullet**, particularly the general concept of applying pathfinding algorithms to the game of Snake, as seen in videos like "[I Created a PERFECT SNAKE A.I.](https://www.youtube.com/watch?v=tjQIO1rqTBE)". The A* approach here reflects a more fundamental pathfinding strategy.

## License

This project is licensed under the MIT License. See the [LICENSE](LICENSE.md) file for details

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
