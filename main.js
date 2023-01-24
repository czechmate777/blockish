// Vars
var gridCount = 10;
var gridCellSizeFac = 0.07;
var gridCellSpacingFac = 0.01;

var shapeBatchLength = 3;

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
var shapeCellSize = 0;
var shapeCellSpacing = 0;
var shapeSizeFac = 0.5;
var shapeStartIndex = 2;
var shapes = [
    // w, h, rest
    // 1x5
    [5, 1, 1,1,1,1,1],
    [1, 5, 1,1,1,1,1],
    // 1x4
    [4, 1, 1,1,1,1],
    [1, 4, 1,1,1,1],
    // 1x3
    [3, 1, 1,1,1],
    [1, 3, 1,1,1],
    // 1x2
    [2, 1, 1,1],
    [1, 2, 1,1],
    // 3x3
    [3, 3, 1,1,1,1,1,1,1,1,1],
    // 2x2
    [2, 2, 1,1,1,1],
    // L
    [3, 3, 1,0,0,1,0,0,1,1,1],
    [3, 3, 1,1,1,1,0,0,1],
    [3, 3, 1,1,1,0,0,1,0,0,1],
    [3, 3, 0,0,1,0,0,1,1,1,1],
    // l
    [2, 2, 1,0,1,1],
    [2, 2, 1,1,1],
    [2, 2, 1,1,0,1],
    [2, 2, 0,1,1,1]
];

var slotsHeight = 0;
var slotsPos = 0;

// ToDo: load this from memory
shapeSlots = [];
loadShapeBatch();

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

    // Shapes
    ctx.fillStyle = colorCellFilled;
    shapeSlots.forEach((shapeIndex, slotIndex) => {
        var shape = shapes[shapeIndex];
        var drawPoint;
        var shapeWidth;
        var shapeHeight;
        if (shapeTouch != null & slotIndex == shapeTouch?.slotIndex) {
            drawPoint = shapeTouch.x
        }
        var drawPoint = canvas.width/3 * (slotIndex) + canvas.width/6;
        var shapeWidth = shape[0]*(shapeCellSize+shapeCellSpacing);
        var shapeHeight = shape[1]*(shapeCellSize+shapeCellSpacing);
        for (let si = 0; si < shape.length-shapeStartIndex; si++) {
            var shapeCellIndex = si + shapeStartIndex;
            if (shape[shapeCellIndex] != 0) {
                ctx.fillRect(
                    drawPoint - shapeWidth/2 + si%shape[0] * (shapeCellSize+shapeCellSpacing) + shapeCellSpacing/2,
                    slotsPos - shapeHeight/2 + Math.floor(si/shape[0]) * (shapeCellSize+shapeCellSpacing) + shapeCellSpacing/2,
                    shapeCellSize,
                    shapeCellSize
                );
            }
        }
    });
}

function tick() {
    draw();
    requestAnimationFrame(tick);
}
refreshScreenSize();
tick();

function loadShapeBatch() {
    for (let s = 0; s < shapeBatchLength; s++) {
        shapeSlots[s] = Math.floor(Math.random()*shapes.length);
    }
}

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

var shapeTouch = null;

window.addEventListener('touchstart', e => {
    var touchX = e.changedTouches[0].pageX;
    var touchY = e.changedTouches[0].pageY;
    
    // Only care about touches if they are over the slots
    if (shapeTouch == null && touchY > canvas.height-slotsHeight) {
        shapeTouch = e.changedTouches[0];
        shapeTouch.slotIndex = Math.floor(touchX/canvas.width*3);
        console.log("Starting touch. "+ shapeTouch.slotIndex);
        console.log(e.changedTouches);
    }
});

window.addEventListener('touchmove', function(e){
    if (shapeTouch) {
        for (let ti = 0; ti < e.changedTouches.length; ti++) {
            var t = e.changedTouches[ti];
            if (t.identifier == shapeTouch.identifier) {
                shapeTouch = t;
            }
        };
    }
});

function touchEnd(e) {
    if (shapeTouch && e.changedTouches[0].identifier == shapeTouch.identifier) {
        shapeTouch = null;
        // Return shape back or settle it
        console.log("Ending touch.");
    }
}
window.addEventListener('touchcancel', touchEnd);
window.addEventListener('touchend', touchEnd);


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
    slotsHeight = canvas.width/3;
    slotsPos = canvas.height - slotsHeight/2;
    screenConstraint = Math.min(canvas.width, canvas.height);
    gridCellSize = gridCellSizeFac * screenConstraint;
    gridCellSpacing = gridCellSpacingFac * screenConstraint;
    gridWidth = gridCount*gridCellSize+(gridCount-1)*gridCellSpacing;

    shapeCellSize = gridCellSize * shapeSizeFac;
    shapeCellSpacing = gridCellSpacing * shapeSizeFac;
}

window.addEventListener('resize', refreshScreenSize);