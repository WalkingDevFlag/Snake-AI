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
// let noDieMode = true; // Not really relevant if AI is always on
let pause = false;

let speedMultiplier = 1;
let outlineLength = 3;

// let previousHeadPositions = []; // Not currently used

// For laser path visualization
let showLaserPath = false;

function preload() {
    // Welcome text image loading removed
}

function setup() {
    setupElements();
    window.canvas = createCanvas(windowWidth - 18, windowHeight);
    canvas.position(0, 0);
    window.canvas.style('z-index', 1);

    window.addEventListener('keydown', function(e) {
        if (e.keyCode === 9 || e.key === 'Tab') { 
            e.preventDefault(); 
        }
    }, false);

    setBlocks();
    blockSize = min(width / blocksX, height / blocksY);
    outlineLength = blockSize / 15;
    xOffset = (width - blockSize * blocksX) / 2.0;
    yOffset = (height - blockSize * blocksY) / 2.0;

    s = new Snake();
    s.calculatePath(); // Initial path calculation for the AI

    frameRate(30);
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
    onResize();
}


function draw() {
    if (!pause) {
        background(20);

        textAlign(CENTER, CENTER);
        fill(255);
        noStroke();
        textSize(100);
        // Welcome text drawing removed

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

        if (showLaserPath && s && s.path && s.path.length > 0) {
            s.drawLaserPath();
        }

        pop();
    }
}

function keyPressed() {
    if (keyCode === TAB) {
        showLaserPath = true;
        return false; // p5.js good practice
    }

    // 'H' key for toggling manual/AI control is removed.

    // Player direct control (arrow keys for snake movement) is removed.

    // Debug/speed controls (optional to keep)
    switch (keyCode) {
        case UP_ARROW: // Example: Normal speed (or remove)
            pause = false;
            frameRate(30);
            break;
        case DOWN_ARROW: // Example: Slower speed (or remove)
            pause = false;
            frameRate(10);
            break;
    }
    switch (key) {
        case ' ': // Example: Fast forward (or remove)
            speedMultiplier = 30;
            break;
        case 'p': // Example: Toggle pause
        case 'P':
            pause = !pause;
            break;
    }
}

function keyReleased() {
    if (keyCode === TAB) {
        showLaserPath = false;
        return false; // p5.js good practice
    }

    switch (key) {
        case ' ': // Corresponds to keyPressed ' ' for fast forward
            speedMultiplier = 1;
            break;
    }
}