# Snake-AI

This repository contains a snake game AI implemented using pathfinding algorithms, inspired by Code Bullet's "Snake AI which always wins (sometimes)" video. The AI explores maze-solving techniques to navigate the snake, find food, and avoid obstacles. The AI navigates the grid efficiently, ensuring it never traps itself (until the grid is full), and uses A* pathfinding to find shortcuts to the apple.

## Features

*   AI-controlled snake player.
*   Guaranteed survival strategy based on a Hamiltonian cycle.
*   A* pathfinding for optimized apple collection along the cycle.
*   Dynamic grid size based on the browser window size.
*   Simple visualization using p5.js.
*   Speed control using the Space bar (hold to speed up).

## Technology Used

*   HTML
*   CSS
*   JavaScript
*   [p5.js](https://p5js.org/) (Core and Sound libraries loaded via CDN)

## How to Run

1.  **Clone or Download:** Get the project files (`index.html`, `styles.css`, and the `SnakeGame` directory containing the `.js` files).
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

## File Structure

*   `index.html`: Main HTML file, loads libraries and game scripts.
*   `styles.css`: Basic styling for the page.
*   `SnakeGame/`: Directory containing the game logic:
    *   `sketch.js`: Main p5.js sketch setup and draw loop.
    *   `Snake.js`: Defines the Snake class and its AI logic.
    *   `Apple.js`: Defines the Apple class.
    *   `HamiltonianCycle.js`: Defines classes for generating the cycle and supporting A* pathfinding.