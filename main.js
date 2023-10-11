// Service Worker
if ("serviceWorker" in navigator) {
    navigator.serviceWorker.register("./sw.js");
}

// Vars
var gridCount = 10;
var gridCellSizeFac = 0.08;
var gridCellSpacingFac = 0.01;

var radiusFactor = 1;

var shapeBatchLength = 3;

var colorBG = 'rgb(14, 14, 14)';
var colorEmpty = 'rgba(120, 120, 120, 0.2)';
var colorFilled = '#787878';
var colorReset = "#ffffff33";

var bw = false;

// Comps

// Setup

var renderRequest = true;

var currentScore = 0;
var highScore = 0;

// Canvas
var portrait = true;
var appOffsetX = 0;
var bottomGrace = 10;
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
            filled: false,
        };
    }
}

// Shapes
var shapeCellSize = 0;
var shapeCellSpacing = 0;
var shapeSizeFac = 0.65;
var shapeStartIndex = 3;
var shapes = [
    // w, h, rest
    // 1x5
    [5, 1, 0, 1,1,1,1,1],
    [1, 5, 0, 1,1,1,1,1],
    // 1x4
    [4, 1, 1, 1,1,1,1],
    [1, 4, 1, 1,1,1,1],
    // 1x3
    [3, 1, 2, 1,1,1],
    [1, 3, 2, 1,1,1],
    // 1x2
    [2, 1, 3, 1,1],
    [1, 2, 3, 1,1],
    // 3x3
    [3, 3, 4, 1,1,1,1,1,1,1,1,1],
    // 2x2 4,
    [2, 2, 4, 1,1,1,1],
    // L
    [3, 3, 5, 1,0,0,1,0,0,1,1,1],
    [3, 3, 5, 1,1,1,1,0,0,1],
    [3, 3, 5, 1,1,1,0,0,1,0,0,1],
    [3, 3, 5, 0,0,1,0,0,1,1,1,1],
    // l
    [2, 2, 6, 1,0,1,1],
    [2, 2, 6, 1,1,1],
    [2, 2, 6, 1,1,0,1],
    [2, 2, 6, 0,1,1,1],
    // 1x1
    [1, 1, 7, 1]
];

// http://czechmate777.github.io/FullPicker/?id=8&#567189#562289#893868#893333#895730#897215#50891B#12896C
var colors = [
    "#567189",
    "#562289",
    "#893868",
    "#893333",
    "#895730",
    "#897215",
    "#50891B",
    "#12896C"
];

var fades = ["11","22","33","44","55","66","77","88","99","aa","bb","cc","dd","ee"];

var slotsHeight = 0;
var slotsPos = 0;

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
    ctx.strokeStyle = colorFilled;
    ctx.lineWidth = gridCellSpacing;
    ctx.beginPath();
    ctx.roundRect(
        canvas.width/2 - (gridWidth + gridCellSpacing*3)/2,
        canvas.height/2 - (gridWidth + gridCellSpacing*3)/2,
        gridWidth + gridCellSpacing*3,
        gridWidth + gridCellSpacing*3,
        gridCellSpacing*radiusFactor*2
    );
    ctx.stroke();

    for (let j = 0; j < gridCount; j++) {
        for (let i = 0; i < gridCount; i++) {
            if (grid[j][i].filled) {
                if (!bw && colors[grid[j][i].color] != undefined) {
                    ctx.fillStyle = colors[grid[j][i].color];
                }
                else {
                    ctx.fillStyle = colorFilled;
                }
                ctx.beginPath();
                ctx.roundRect(
                    canvas.width/2 - gridWidth/2 + i*(gridCellSize+gridCellSpacing),
                    canvas.height/2 - gridWidth/2 + j*(gridCellSize+gridCellSpacing),
                    gridCellSize,
                    gridCellSize,
                    gridCellSpacing*radiusFactor
                );
                ctx.fill();
            }
            else {
                ctx.fillStyle = colorEmpty;
                ctx.beginPath();
                ctx.roundRect(
                    canvas.width/2 - gridWidth/2 + i*(gridCellSize+gridCellSpacing),
                    canvas.height/2 - gridWidth/2 + j*(gridCellSize+gridCellSpacing),
                    gridCellSize,
                    gridCellSize,
                    gridCellSpacing*radiusFactor
                );
                ctx.fill();
                if (grid[j][i].fade != undefined) {
                    if (!bw && colors[grid[j][i].color] != undefined) {
                        ctx.fillStyle = colors[grid[j][i].color] + fades[grid[j][i].fade];
                    }
                    else {
                        ctx.fillStyle = colorFilled + fades[grid[j][i].fade];
                    }
                    ctx.beginPath();
                    ctx.roundRect(
                        canvas.width/2 - gridWidth/2 + i*(gridCellSize+gridCellSpacing),
                        canvas.height/2 - gridWidth/2 + j*(gridCellSize+gridCellSpacing),
                        gridCellSize,
                        gridCellSize,
                        gridCellSpacing*radiusFactor
                    );
                    ctx.fill();

                    grid[j][i].fade = --grid[j][i].fade < 0 ? undefined : grid[j][i].fade;
                }
            }
        }
    }

    // Shapes
    ctx.shadowBlur = gridCellSpacing;
    ctx.shadowOffsetX = gridCellSpacing;
    ctx.shadowOffsetY = gridCellSpacing;
    ctx.shadowColor = "#000000cc";

    shapeSlots.forEach((shapeIndex, slotIndex) => {
        if (shapeIndex != null) {
            // Shape is being dragged
            if (shapeTouch.id != null & slotIndex == shapeTouch.slot) {
                drawShape(shapeTouch.x, shapeTouch.y-shapeTouch.offset, shapeIndex, gridCellSize, gridCellSpacing);
            }
            // Shape in slot
            else {
                drawShape(canvas.width/3 * (slotIndex) + canvas.width/6, slotsPos, shapeIndex, shapeCellSize, shapeCellSpacing);
            }
        }
    });

    ctx.shadowBlur = 0;
    ctx.shadowOffsetX = 0;
    ctx.shadowOffsetY = 0;

    // Scores
    ctx.fillStyle = colorFilled;
    ctx.textAlign = "left"
    ctx.font = canvas.width/10 + "px arial";
    ctx.fillText(currentScore, 10, canvas.width/10, canvas.width/2 - canvas.width/10);
    ctx.fillStyle = colorEmpty;
    ctx.textAlign = "right"
    ctx.font = canvas.width/10 + "px arial";
    ctx.fillText(highScore, canvas.width - 10, canvas.width/10, canvas.width/2 - canvas.width/10);

    ctx.fillStyle = colorReset;
    ctx.textAlign = "right"
    ctx.font = canvas.width/10 + "px arial";
    ctx.fillText("↺ ", canvas.width/2, canvas.width/10);
    
    ctx.fillStyle = colorReset;
    ctx.textAlign = "left"
    ctx.font = canvas.width/10 + "px arial";
    ctx.fillText("🎨", canvas.width/2, canvas.width/10);
}

function rect(x, y, w, h, s) {
    if (s) {
        ctx.strokeRect(x - w/2, y - (h ?? w)/2, w, (h ?? w));
    }
    else {
        ctx.fillRect(x - w/2, y - (h ?? w)/2, w, (h ?? w));
    }
}

function drawShape(x, y, shapeIndex, cellSize, padding) {
    var shape = shapes[shapeIndex];
    if (!bw && colors[shape[2]] != undefined) {
        ctx.fillStyle = colors[shape[2]];
    }
    else {
        ctx.fillStyle = colorFilled;
    }
    var shapeWidth = shape[0]*(cellSize+padding);
    var shapeHeight = shape[1]*(cellSize+padding);
    for (let si = 0; si < shape.length-shapeStartIndex; si++) {
        var shapeCellIndex = si + shapeStartIndex;
        if (shape[shapeCellIndex] != 0) {
            ctx.beginPath();
            ctx.roundRect(
                x - shapeWidth/2 + si%shape[0] * (cellSize+padding) + padding/2,
                y - shapeHeight/2 + Math.floor(si/shape[0]) * (cellSize+padding) + padding/2,
                cellSize,
                cellSize,
                padding*radiusFactor
            );
            ctx.fill();
        }
    }
}

var rendering = true;
var renderRequestOld = renderRequest;
var renderCancelId = null;
function tick() {
    if (rendering) {
        draw();
    }
    if (renderRequest != renderRequestOld) {
        if (renderRequest) {
            rendering = true;
        }
        else {
            clearTimeout(renderCancelId);
            renderCancelId = setTimeout(() => {
                if (!renderRequest) {
                    rendering = false;
                }
            }, 250);
        }
        renderRequestOld = renderRequest;
    }

    
    requestAnimationFrame(tick);
}

loadProgress();
refreshScreenSize();
draw();
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

    if (localStorage.bw) {
        bw = localStorage.bw === 'true';
    }
}

function saveProgress() {
    localStorage.grid = grid.flat().map(c => Object.entries(c)).join("|");
    localStorage.shapeSlots = shapeSlots;
    localStorage.currentScore = currentScore;
    localStorage.highScore = highScore;
    localStorage.bw = bw;
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

    draw();
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
    var rows = [];
    var cols = [];
    for (let f = 0; f < gridCount; f++) {
        cols[f] = true;
    }

    for (let j = 0; j < gridCount; j++) {

        if (grid[j].every(x => x.filled)) {
            rows[rows.length] = j;
        }
        for (let i = 0; i < gridCount; i++) {
            if (!grid[j][i].filled) {
                cols[i] = false;
            }
        }
    }

    rows.forEach(row => {
        grid[row].forEach(c => {
            c.filled = false;
            c.fade = fades.length-1;
        });
        scoreAdd(gridCount);
    });

    cols.forEach((filled, index) => {
        if (filled == true) {
            for (let row = 0; row < gridCount; row++) {
                grid[row][index].filled = false;
                grid[row][index].fade = fades.length-1;
                scoreAdd(1);
            }
        }
    });
}

function stillAlive() {
    // Try and place all available shapes on grid
    // If one succeeds, we are still alive
    // TODO: Remove duplicate searches if multiple slots have same shape

    // Slots
    for (let slotIndex = 0; slotIndex < shapeSlots.length; slotIndex++) {
        if (shapeSlots[slotIndex] == null) {
            continue;
        }
        var shape = shapes[shapeSlots[slotIndex]];
        // Grid
        for (let j = 0; j < gridCount; j++) {
            for (let i = 0; i < gridCount; i++) {
                // Shape cells
                var canPlace = true;
                for (let si = 0; si < shape.length-shapeStartIndex; si++) {
                    var shapeCellIndex = si + shapeStartIndex;
                    if (shape[shapeCellIndex] != 0) {
                        // Check for filled cell
                        let x = i + si%shape[0];
                        let y = j + Math.floor(si/shape[0]);
                        if (grid[y] && grid[y][x] && !grid[y][x].filled) {
                            // Valid location, do nothing
                        }
                        else {
                            // Can't place, skip location
                            canPlace = false;
                            break;
                        }
                    }
                }
                // If whole shape fit in this grid location, return not dead
                if (canPlace) {
                    return true;
                }
            }
        }
    }

    // if we get here and nothing fits, death
    return false;
}

window.addEventListener('touchstart', e => {
    renderRequest = true;

    var touchX = e.changedTouches[0].pageX - appOffsetX;
    var touchY = e.changedTouches[0].pageY;
    
    // Touches if they are over the slots
    if (shapeTouch.id == null && touchY > slotsPos-slotsHeight/2 && touchY < slotsPos+slotsHeight/2) {
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
        if (touchX < canvas.width/2) {
            reset();
        }
        else {
            bw = !bw;
            draw();
        }
    }
});

window.addEventListener('touchmove', function(e){
    if (shapeTouch.id != null) {
        for (let ti = 0; ti < e.changedTouches.length; ti++) {
            var t = e.changedTouches[ti];
            if (t.identifier == shapeTouch.id) {
                shapeTouch.x = t.pageX - appOffsetX;
                shapeTouch.y = t.pageY;
            }
        };
    }
});

function touchEnd(e) {
    if (shapeTouch.id != null && e.changedTouches[0].identifier == shapeTouch.id) {
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
                grid[c.y][c.x].color = shape[2];
                scoreAdd(1);
            });

            // Check for filled rows
            checkGridLines();

            // Check for death
            if(!stillAlive()) {
                reset();
            }
        }
        shapeTouch.id = shapeTouch.slot = null;
    }
    renderRequest = false;
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
    canvas.height = window.innerHeight;
    canvas.width = Math.min(window.innerWidth, window.innerHeight * 5/8);
    appOffsetX = (window.innerWidth - canvas.width) / 2;
    screenConstraint = Math.min(canvas.width, canvas.height);
    gridCellSize = gridCellSizeFac * screenConstraint;
    gridCellSpacing = gridCellSpacingFac * screenConstraint;
    gridWidth = gridCount*gridCellSize+(gridCount-1)*gridCellSpacing;

    slotsHeight = canvas.width/3;
    slotsPos = Math.min(
        // Tall screen
        canvas.height/2 + gridWidth/2 + slotsHeight*0.75,
        // Short screen
        canvas.height - slotsHeight/2 - bottomGrace
    );

    shapeCellSize = gridCellSize * shapeSizeFac;
    shapeCellSpacing = gridCellSpacing * shapeSizeFac;
    draw();
}

window.addEventListener('resize', refreshScreenSize);