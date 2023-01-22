// Vars
var gridCount = 10;
var gridCellSizeFac = 0.07;
var gridCellSpacingFac = 0.01;

var colorBG = 'rgb(24, 24, 24)';
var colorCellEmpty = 'rgba(120, 120, 120, 0.3)';
var colorCellFilled = 'rgba(120, 120, 120, 0.75)';

// Setup

// Canvas
var portrait = true;
var canvas = document.createElement('canvas');
var ctx = canvas.getContext('2d');
document.body.appendChild(canvas);

// Grid
var gridWidth = 0;
var gridCellSize = 0;
var gridCellSpacing = 0;
var screenConstraint = 0;

var grid = [];
for (let i = 0; i < gridCount; i++) {
    grid[i] = [];
    for (let j = 0; j < gridCount; j++) {
        grid[i][j] = {
            filled: false
        };
    }
}

// Shapes
var shapes = [
    // 1x5
    [1, 1, 1, 1, 1],
    // 1x4
    [1, 1, 1, 1],
    // 1x3
    [1, 1, 1],
    // 1x2
    [1, 1],
    // 3x3
    [1, 1, 1, 0, 0, 1, 1, 1, 0, 0, 1, 1, 1],
    // 2x2
    [1, 1, 0, 0, 0, 1, 1],
    // L
    [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 1, 1],
    // l
    [1, 0, 0, 0, 0, 1, 1]
];

// Draw
function draw() {
    // Blank
    ctx.fillStyle = colorBG;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Grid
    for (let j = 0; j < grid.length; j++) {
        for (let i = 0; i < grid[j].length; i++) {
            ctx.fillStyle = grid[j][i].filled ? colorCellFilled : colorCellEmpty;
            ctx.fillRect(
                canvas.width/2 - gridWidth/2 + i*(gridCellSize+gridCellSpacing),
                canvas.height/2 - gridWidth/2 + j*(gridCellSize+gridCellSpacing),
                gridCellSize,
                gridCellSize
            )
        }
    }
}

function tick() {
    draw();
    requestAnimationFrame(tick);
}
refreshScreenSize();
tick();

function checkGridLines() {
    var rowsToClear = {x: [], y: []};

    var cols = [];
    for (let f = 0; f < gridCount; f++) {
        cols[f] = true;
    }

    for (let j = 0; j < gridCount; j++) {

        if (grid[j].every(x => x.filled)) {
            rowsToClear.y[rowsToClear.x.length] = j;
        }
        for (let i = 0; i < gridCount; i++) {
            if (!grid[j][i].filled) {
                cols[i] = false;
            }
        }
    }

    rowsToClear.y.forEach(row => {
        grid[row].forEach(c => c.filled = false);
    });

    cols.forEach((filled, index) => {
        if (filled) {
            for (let row = 0; row < gridCount; row++) {
                grid[row][index].filled = false;
            }
        }
    });
}

window.addEventListener('touchstart', e => {
    var touchX = e.changedTouches[0].pageX;
    var touchY = e.changedTouches[0].pageY;
    var gridCords = screenToGrid(touchX, touchY);
    
    grid[gridCords.y][gridCords.x].filled = !grid[gridCords.y][gridCords.x].filled;
    checkGridLines();
});

function screenToGrid(x, y) {
    var xMid = x-canvas.width/2;
    var xUnits = xMid/(gridCellSize+gridCellSpacing);
    var xGrid = Math.floor(gridCount/2 + xUnits);
    var yMid = y-canvas.height/2;
    var yUnits = yMid/(gridCellSize+gridCellSpacing);
    var yGrid = Math.floor(gridCount/2 + yUnits);

    return {x: xGrid, y: yGrid};
}

function refreshScreenSize() {
    portrait = true;
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    screenConstraint = Math.min(canvas.width, canvas.height);
    gridCellSize = gridCellSizeFac * screenConstraint;
    gridCellSpacing = gridCellSpacingFac * screenConstraint;
    gridWidth = gridCount*gridCellSize+(gridCount-1)*gridCellSpacing;
}

window.addEventListener('resize', refreshScreenSize);