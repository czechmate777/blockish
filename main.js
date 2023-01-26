// Vars
var gridCount = 10;
var gridCellSizeFac = 0.08;
var gridCellSpacingFac = 0.01;

var shapeBatchLength = 3;

var colorBG = 'rgb(24, 24, 24)';
var colorCellEmpty = 'rgba(120, 120, 120, 0.3)';
var colorCellFilled = 'rgba(120, 120, 120, 0.75)';

// Comps

// Setup

currentScore = 0;
highScore = 0;

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
var shapeSizeFac = 0.65;
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

var shapeTouch = {
    x: 0,
    y: 0,
    offset: 0,
    slot: null,
    id: null
};

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
        if (shapeIndex != null) {
            if (shapeTouch.id != null & slotIndex == shapeTouch.slot) {
                drawShape(shapeTouch.x, shapeTouch.y-shapeTouch.offset, shapeIndex, gridCellSize, gridCellSpacing);
            }
            else {
                drawShape(canvas.width/3 * (slotIndex) + canvas.width/6, slotsPos, shapeIndex, shapeCellSize, shapeCellSpacing);
            }
        }
    });

    // Scores
    ctx.fillStyle = colorCellFilled;
    ctx.textAlign = "left"
    ctx.font = canvas.width/10 + "px arial";
    ctx.fillText(currentScore, 10, canvas.width/10, canvas.width/2);
    ctx.fillStyle = colorCellEmpty;
    ctx.textAlign = "right"
    ctx.font = canvas.width/10 + "px arial";
    ctx.fillText(highScore, canvas.width - 10, canvas.width/10, canvas.width/2);
}

function drawShape(x, y, shapeIndex, cellSize, padding) {
    var shape = shapes[shapeIndex];
    var shapeWidth = shape[0]*(cellSize+padding);
    var shapeHeight = shape[1]*(cellSize+padding);
    for (let si = 0; si < shape.length-shapeStartIndex; si++) {
        var shapeCellIndex = si + shapeStartIndex;
        if (shape[shapeCellIndex] != 0) {
            ctx.fillRect(
                x - shapeWidth/2 + si%shape[0] * (cellSize+padding) + padding/2,
                y - shapeHeight/2 + Math.floor(si/shape[0]) * (cellSize+padding) + padding/2,
                cellSize,
                cellSize
            );
        }
    }
}

function tick() {
    draw();
    requestAnimationFrame(tick);
}
loadProgress();
refreshScreenSize();
tick();

function loadProgress() {
    currentScore = localStorage.currentScore ? parseInt(localStorage.currentScore) : currentScore;
    highScore = localStorage.highScore ? parseInt(localStorage.highScore) : highScore;

    if (localStorage.grid) {
        localStorage.grid.split("|").forEach((inString, index) => {
            const j = Math.floor(index/gridCount);
            const i = index%gridCount;
            inVals = inString.split(",");
            for (let s = 0; s < inVals.length; s+=2) {
                switch (typeof(grid[j][i][inVals[s]])) {
                    case "boolean":
                        grid[j][i][inVals[s]] = inVals[s+1] === 'true' ? true : false;
                        break;
                
                    default:
                        grid[j][i][inVals[s]] = inVals[s+1];
                        break;
                }
            }
        });
    }

    if (localStorage.shapeSlots) {
        shapeSlots = localStorage.shapeSlots.split(",", shapeSlots.length).map(s => {
            if (s == "") {
                return null;
            }
            else {
                return parseInt(s);
            }
        });
    }
}

function saveProgress() {
    localStorage.grid = grid.flat().map(c => Object.entries(c)).join("|");
    localStorage.shapeSlots = shapeSlots;
    localStorage.currentScore = currentScore;
    localStorage.highScore = highScore;
}

function reset() {
    // Grid
    for (let i = 0; i < gridCount; i++) {
        grid[i] = [];
        for (let j = 0; j < gridCount; j++) {
            grid[i][j] = {
                filled: false
            };
        }
    }

    loadShapeBatch();

    currentScore = 0;
}

function loadShapeBatch() {
    for (let s = 0; s < shapeBatchLength; s++) {
        shapeSlots[s] = Math.floor(Math.random()*shapes.length);
    }
}

function clearShapeSlot(slotIndex) {
    shapeSlots[slotIndex] = null;
    if (shapeSlots.every(s => s == null)) {
        loadShapeBatch();
    }
    saveProgress();
}

function scoreAdd(points) {
    currentScore += points;
    if (currentScore > highScore) {
        highScore = currentScore;
    }
    saveProgress();
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
        scoreAdd(gridCount);
    });

    cols.forEach((filled, index) => {
        if (filled) {
            for (let row = 0; row < gridCount; row++) {
                grid[row][index].filled = false;
                scoreAdd(1);
            }
        }
    });
}

window.addEventListener('touchstart', e => {
    var touchX = e.changedTouches[0].pageX;
    var touchY = e.changedTouches[0].pageY;
    
    // Touches if they are over the slots
    if (shapeTouch.id == null && touchY > canvas.height-slotsHeight) {
        var slot = Math.floor(touchX/canvas.width*3);
        shapeTouch = {
            x: touchX,
            y: touchY,
            offset: shapes[shapeSlots[slot]][1]*(gridCellSize+gridCellSpacing)/2 + gridCellSize+gridCellSpacing,
            slot: slot,
            id: e.changedTouches[0].identifier
        };
    }
    else if (shapeTouch.id == null && touchY < canvas.width/5) {
        reset();
    }
});

window.addEventListener('touchmove', function(e){
    if (shapeTouch.id) {
        for (let ti = 0; ti < e.changedTouches.length; ti++) {
            var t = e.changedTouches[ti];
            if (t.identifier == shapeTouch.id) {
                shapeTouch.x = t.pageX;
                shapeTouch.y = t.pageY;
            }
        };
    }
});

function touchEnd(e) {
    if (shapeTouch.id && e.changedTouches[0].identifier == shapeTouch.id) {
        var gridCells = [];
        var canPlace = true;
        var shape = shapes[shapeSlots[shapeTouch.slot]];
        var shapeWidth = shape[0]*(gridCellSize+gridCellSpacing);
        var shapeHeight = shape[1]*(gridCellSize+gridCellSpacing);
        for (let si = 0; si < shape.length-shapeStartIndex; si++) {
            var shapeCellIndex = si + shapeStartIndex;
            if (shape[shapeCellIndex] != 0) {
                var gridCell = screenToGrid(
                    shapeTouch.x + si%shape[0] * (gridCellSize+gridCellSpacing) - shapeWidth/2 + (gridCellSize+gridCellSpacing)/2,
                    shapeTouch.y + Math.floor(si/shape[0]) * (gridCellSize+gridCellSpacing) - shapeHeight/2 + (gridCellSize+gridCellSpacing)/2 - shapeTouch.offset
                );
                if (grid[gridCell.y] && grid[gridCell.y][gridCell.x] && !grid[gridCell.y][gridCell.x].filled) {
                    gridCells[gridCells.length] = gridCell;
                }
                else {
                    canPlace = false;
                    break;
                }
            }
        }
        if (canPlace) {
            // Clear the slot
            clearShapeSlot(shapeTouch.slot);

            // Place the shape on the grid
            gridCells.forEach(c => {
                grid[c.y][c.x].filled = true;
                scoreAdd(1);
            });

            // Check for filled rows
            checkGridLines();
        }
        shapeTouch.id = shapeTouch.slot = null;
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