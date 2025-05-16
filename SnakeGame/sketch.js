// var blocksX = 160;
// var blocksY = 80;
var blocksX = 40;
// var blocksX = 16;
var blocksY = 20;

let maxBlocks = 1000;
// var blocksY = 8;
let blockSize;
let xOffset = 0;
let yOffset = 0;

let s;
// let noDieMode = true; // REMOVED: No longer used for manual play
let pause = false;

let speedMultiplier = 1;
let hc;
let outlineLength = 3;

// Removed welcomeText variable declaration

let previousHeadPositions = [];

// Global variable for overlay visibility
let showHamiltonianOverlay = false;

function preload() {
    // Removed image loading for welcomeText
    // welcomeText = loadImage("SnakeGame/s/welcomeText.png");
}

function setup() {
    setupElements(); // This function is defined in your HTML script block
    window.canvas = createCanvas(windowWidth - 18, windowHeight);
    canvas.position(0, 0);
    window.canvas.style('z-index', 1);

    // ADDED: Event listener to prevent default Tab behavior on keydown
    // This ensures the browser's tabbing is stopped even on prolonged presses.
    window.addEventListener('keydown', function(e) {
        if (e.keyCode === 9 || e.key === 'Tab') { // 9 is the keyCode for Tab
            e.preventDefault(); // Prevent the default tabbing behavior
        }
    }, false); // 'false' for event bubbling phase is standard

    setBlocks();
    blockSize = min(width / blocksX, height / blocksY);
    outlineLength = blockSize / 15;
    xOffset = (width - blockSize * blocksX) / 2.0;
    yOffset = (height - blockSize * blocksY) / 2.0;

    s = new Snake();

    hc = new HamiltonianCycle(blocksX, blocksY);
    s.resetOnHamiltonian(hc.cycle);
    frameRate(30);

    // .touchStarted(onclick);
}

function setBlocks() {
    let testBlockSize = 1;
    while (true) {
        if (floor(canvas.width / testBlockSize) * floor(canvas.height / testBlockSize) < maxBlocks) {
            blockSize = testBlockSize;
            blocksX = floor(canvas.width / blockSize) - floor(canvas.width / blockSize) % 2;
            blocksY = floor(canvas.height / blockSize) - floor(canvas.height / blockSize) % 2;
            return;
        } else {
            testBlockSize++;
        }
    }
}

function windowResized() {
    resizeCanvas(windowWidth - 18, windowHeight);
    blockSize = min(width / blocksX, height / blocksY);
    outlineLength = blockSize / 15;
    xOffset = (width - blockSize * blocksX) / 2.0;
    yOffset = (height - blockSize * blocksY) / 2.0;
    // onResize(); // REMOVED: onResize is not defined
}

function drawHamiltonianOverlay() {
    if (!hc || !hc.cycle || hc.cycle.length === 0) {
        return; // Do nothing if Hamiltonian cycle data isn't available
    }

    push(); // Isolate drawing styles and transformations for the overlay

    const gridColor = color(100, 100, 100, 120);
    const cyclePathColor = color(255, 255, 255, 160); // Translucent white for path
    const cycleNodeColor = color(255, 255, 255, 180); // Translucent white for numbers

    stroke(gridColor);
    strokeWeight(1);
    for (let i = 0; i <= blocksX; i++) {
        line(i * blockSize, 0, i * blockSize, blocksY * blockSize);
    }
    for (let j = 0; j <= blocksY; j++) {
        line(0, j * blockSize, blocksX * blockSize, j * blockSize);
    }

    stroke(cyclePathColor);
    strokeWeight(max(1, blockSize / 12));
    noFill();
    beginShape();
    for (let i = 0; i < hc.cycle.length; i++) {
        let node = hc.cycle[i];
        vertex(node.x * blockSize + blockSize / 2, node.y * blockSize + blockSize / 2);
    }
    if (hc.cycle.length > 0) {
       vertex(hc.cycle[0].x * blockSize + blockSize / 2, hc.cycle[0].y * blockSize + blockSize / 2);
    }
    endShape();

    fill(cycleNodeColor);
    noStroke();
    textAlign(CENTER, CENTER);
    let textSizeVal = constrain(blockSize * 0.3, 6, 18);
    textSize(textSizeVal);
    for (let i = 0; i < hc.cycle.length; i++) {
        let node = hc.cycle[i];
        text(i, node.x * blockSize + blockSize / 2, node.y * blockSize + blockSize / 2);
    }
    pop();
}

function draw() {
    if (!pause) {
        background(20);

        textAlign(CENTER, CENTER);
        fill(255);
        noStroke();
        textSize(100);
        if (canvas.width > 700) {
            // Removed the drawing of the welcomeText image and its overlay
        }

        fill(15);
        rect(0, 0, width, yOffset);
        rect(0, 0, xOffset, height);
        rect(width, height, -width, -yOffset);
        rect(width, height, -xOffset, -height);
        if (canvas.width > 700) {
            push();
            fill(255, 30);
            noStroke();
            textSize(blockSize * 0.4);
            textAlign(LEFT, CENTER);
            text("By WalkingDevFlag", 20, canvas.height - 30);
            pop();
        }
        push();
        translate(xOffset, yOffset);

        fill(0);
        s.show();
        for (let i = 0; i < speedMultiplier; i++) {
            s.update();
        }

        if (showHamiltonianOverlay) {
            drawHamiltonianOverlay();
        }
        pop();
    }
}

function keyPressed() {
    // Handle Tab key press for overlay state
    if (keyCode === TAB) {
        showHamiltonianOverlay = true;
        return false; 
    }

    // REMOVED: Toggle between manual and AI mode (H key)
    // if (key === 'h' || key === 'H') {
    //     s.controlledByPlayer = !s.controlledByPlayer;
    //     return; 
    // }

    // REMOVED: Manual control block
    // if (s.controlledByPlayer) { ... }

    // AI mode controls / Game speed controls
    switch (keyCode) {
        case UP_ARROW:
            // s.velX = 0; // REMOVED: AI controls direction
            // s.velY = -1; // REMOVED: AI controls direction
            pause = false;
            frameRate(30); // Increase AI speed by increasing framerate
            break;
        case DOWN_ARROW:
            // s.velX = 0; // REMOVED: AI controls direction
            // s.velY = 1; // REMOVED: AI controls direction
            pause = false;
            frameRate(10); // Decrease AI speed by decreasing framerate
            break;
    }
    switch (key) {
        case ' ':
            speedMultiplier = 30; // Increase updates per frame (makes AI faster)
            break;
    }
}

function keyReleased() {
    // Handle Tab key release for overlay state
    if (keyCode === TAB) {
        showHamiltonianOverlay = false;
        return false; 
    }

    switch (key) {
        case ' ':
            speedMultiplier = 1; // Reset updates per frame
            break;
    }
}