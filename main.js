// Service Worker
if ("serviceWorker" in navigator) {
    navigator.serviceWorker.register("./sw.js");
}

// Vars
var gridCount = 10;
var gridCellSizeFac = 0.08;
var gridCellSpacingFac = 0.01;

var radiusFactor = 0.15;
var style = 0;

var shapeBatchLength = 3;

var undoState = false;

var lw = 0.1;
var color;
var colorBG = 'rgb(14, 14, 14)';
var colorEmpty = 'rgba(120, 120, 120, 0.2)';
var colorFilled = '#787878';
var colorReset = "#ffffff33";

// Comps

// Setup

var renderRequest = true;

var currentScore = 0;
var highScore = 0;

// Canvas
var portrait = true;
var appOffsetX = 0;
var bottomGrace = 5;
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
loadFutureShapeSlots = false;
loadShapeBatch();

var shapeTouch = {
    x: 0,
    y: 0,
    offset: 0,
    slot: null,
    id: null
};

// Screen
var yOffset = -50;

// Debug
var debuggingEnabled = false;
var debugText = "😮 24.12.30.1";
var debugTouches = 0;

setInterval(() => {
    if (debugTouches > 5) {
        debuggingEnabled = !debuggingEnabled;
    }
    debugTouches = 0;
}, 1000);

// Draw
function draw() {
    // Blank
    ctx.fillStyle = colorBG;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Grid Frame
    rect({
        x: canvas.width / 2,
        y: canvas.height / 2 + yOffset,
        w: gridWidth + gridCellSpacing * 4,
        s: 3,
        c: colorFilled,
        r: gridCellSize * radiusFactor * 2.5,
        l: gridCellSize * lw
    });

    for (let j = 0; j < gridCount; j++) {
        for (let i = 0; i < gridCount; i++) {
            // Cell is filled
            if (grid[j][i].filled) {
                if ((style == 0 || style == 2) && colors[grid[j][i].color] != undefined) { // Coloured
                    color = colors[grid[j][i].color];
                }
                else if (style == 4) { // Gradient
                    // left-right
                    var lr = Math.floor((i+1)/gridCount*255).toString(16)
                    // up-down
                    var ud = Math.floor((j+1)/gridCount*255).toString(16)
                    color = `#${ud}77${lr}`;
                }
                else { // Mono
                    color = colorFilled;
                }
                drawGridRect(i, j);
            }
            // Cell is empty
            else {
                // Draw empty bottom layer
                color = colorEmpty;
                drawGridRect(i, j);
                
                // Draw fade layer if needed
                if (grid[j][i].fade != undefined) {
                    if ((style == 0 || style == 2) && colors[grid[j][i].color] != undefined) { // Coloured
                        color = colors[grid[j][i].color] + fades[grid[j][i].fade];
                    }
                    else if (style == 4) { // Gradient
                    }
                    else { // Mono
                        color = colorFilled + fades[grid[j][i].fade];
                    }
                    drawGridRect(i, j);
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
    ctx.textAlign = "left";
    ctx.font = canvas.width/10 + "px arial";
    ctx.fillText(currentScore, 10, canvas.width/10, canvas.width/2 - canvas.width/10);
    ctx.fillStyle = colorEmpty;
    ctx.textAlign = "right";
    ctx.font = canvas.width/10 + "px arial";
    ctx.fillText(highScore, canvas.width - 10, canvas.width/10, canvas.width/2 - canvas.width/10);

    ctx.fillStyle = colorReset;
    ctx.textAlign = "right";
    ctx.font = canvas.width/10 + "px arial";
    if (undoState) {
        ctx.fillText("↺ ", canvas.width/2, canvas.width/10);
    }
    else {
        ctx.fillText("⎌ ", canvas.width/2, canvas.width/10);
    }
    
    ctx.fillStyle = colorReset;
    ctx.textAlign = "left";
    ctx.font = canvas.width/10 + "px arial";
    ctx.fillText("🎨", canvas.width/2, canvas.width/10);

    // Debug
    if (debuggingEnabled) {
        ctx.fillStyle = colorFilled;
        ctx.textAlign = "center";
        ctx.fillText(debugText, canvas.width/2, canvas.height/2);
    }
}

function rect(obj) {
    // Normalize values
    obj.w ??= obj.h;
    obj.h ??= obj.w;
    obj.c ??= color;
    obj.s ??= style;
    obj.r ??= obj.w * radiusFactor;
    obj.l ??= obj.w * lw;

    ctx.beginPath();

    if (obj.s == 0 || obj.s == 1 || obj.s == 4) {
        ctx.roundRect(obj.x - obj.w/2, obj.y - obj.h/2, obj.w, obj.h, obj.r);
        ctx.fillStyle = obj.c;
        ctx.fill();
    }
    else {
        ctx.roundRect(
            obj.x - obj.w/2 + obj.l/2,
            obj.y - obj.h/2 + obj.l/2,
            obj.w - obj.l,
            obj.h - obj.l,
            obj.r
        );
        ctx.lineWidth = obj.l;
        ctx.strokeStyle = obj.c
        ctx.stroke();
    }
}

function drawGridRect(i, j) {
    rect({
        x: canvas.width/2 - (gridWidth - gridCellSize)/2 + i*(gridCellSize+gridCellSpacing),
        y: canvas.height/2 - (gridWidth - gridCellSize)/2 + j*(gridCellSize+gridCellSpacing) + yOffset,
        w: gridCellSize
    });
}

function drawShape(x, y, shapeIndex, cellSize, padding) {
    var shape = shapes[shapeIndex];
    if ((style == 0 || style == 2) && colors[shape[2]] != undefined) {
        color = colors[shape[2]];
    }
    else {
        color = colorFilled;
    }
    var shapeWidth = (shape[0]-1)*(cellSize+padding);
    var shapeHeight = (shape[1]-1)*(cellSize+padding);
    for (let si = 0; si < shape.length-shapeStartIndex; si++) {
        var shapeCellIndex = si + shapeStartIndex;
        if (shape[shapeCellIndex] != 0) {
            rect({
                x: x - shapeWidth/2 + si%shape[0] * (cellSize+padding),
                y: y - shapeHeight/2 + Math.floor(si/shape[0]) * (cellSize+padding),
                w: cellSize
            });
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

function loadProgress(undoOnly = false) {
    var store = localStorage;
    var storeSuffix = "";
    if (undoOnly) {
        storeSuffix = "Old";
        loadFutureShapeSlots = true;
    }
    currentScore = store["currentScore" + storeSuffix] ? parseInt(store["currentScore" + storeSuffix]) : currentScore;
    highScore = store["highScore" + storeSuffix] ? parseInt(store["highScore" + storeSuffix]) : highScore;
    style = store.style ? parseInt(store.style) : style;

    if (store["grid" + storeSuffix]) {
        store["grid" + storeSuffix].split("|").forEach((inString, index) => {
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

    if (store["shapeSlots" + storeSuffix]) {
        shapeSlots = store["shapeSlots" + storeSuffix].split(",", shapeSlots.length).map(s => {
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
    undoState = false;

    localStorage.gridOld = localStorage.grid;
    localStorage.shapeSlotsOld = localStorage.shapeSlots;
    localStorage.currentScoreOld = localStorage.currentScore;
    localStorage.highScoreOld = localStorage.highScore;

    localStorage.grid = grid.flat().map(c => Object.entries(c)).join("|");
    localStorage.shapeSlots = shapeSlots;
    localStorage.futureShapeSlots = futureShapeSlots;
    localStorage.currentScore = currentScore;
    localStorage.highScore = highScore;
    localStorage.style = style;
}

function reset(force) {
    if (undoState || force) {
        undoState = false;

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
    else {
        undoState = true;
        loadProgress(true);
    }
}

function loadShapeBatch() {
    if (loadFutureShapeSlots) {
        shapeSlots = futureShapeSlots;
    }
    else {
        for (let s = 0; s < shapeBatchLength; s++) {
            shapeSlots[s] = Math.floor(Math.random()*shapes.length);
            futureShapeSlots = shapeSlots;
        }
    }
}

function clearShapeSlot(slotIndex) {
    shapeSlots[slotIndex] = null;
    if (shapeSlots.every(s => s == null)) {
        loadShapeBatch();
    }
    loadFutureShapeSlots = false;
}

function scoreAdd(points) {
    currentScore += points;
    if (currentScore > highScore) {
        highScore = currentScore;
    }
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
    // Top bar touches
    else if (shapeTouch.id == null && touchY > 10 && touchY < canvas.width/5) {
        if (touchX < canvas.width/2) {
            reset();
        }
        else {
            style = (style + 1) % 5;
            debugTouches++;
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
    else {
        // Clean up this dupe
        for (let ti = 0; ti < e.changedTouches.length; ti++) {
            var t = e.changedTouches[ti];
            var gridPoint = screenToGrid(t.pageX, t.pageY);
            debugText = `X: ${gridPoint.x}   y: ${gridPoint.y}`;
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
                reset(true);
            }
            saveProgress();
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
    var yMid = y-canvas.height/2 - yOffset;
    var yUnits = yMid/(gridCellSize+gridCellSpacing);
    var yGrid = Math.floor(gridCount/2 + yUnits);

    return {x: xGrid, y: yGrid};
}

function refreshScreenSize() {
    portrait = true;
    canvas.height = window.innerHeight;
    canvas.width = Math.min(window.innerWidth, window.innerHeight * 0.7);
    appOffsetX = (window.innerWidth - canvas.width) / 2;
    screenConstraint = Math.min(canvas.width, canvas.height);
    gridCellSize = gridCellSizeFac * screenConstraint;
    gridCellSpacing = gridCellSpacingFac * screenConstraint;
    gridWidth = gridCount*gridCellSize+(gridCount-1)*gridCellSpacing;

    slotsHeight = canvas.width/3;
    slotsPos = Math.min(
        // Tall screen
        canvas.height/2 + gridWidth/2 + slotsHeight*0.65,
        // Short screen
        canvas.height - slotsHeight/2 - bottomGrace
    );

    yOffset = slotsPos - slotsHeight*0.65 - canvas.height/2 - gridWidth/2

    shapeCellSize = gridCellSize * shapeSizeFac;
    shapeCellSpacing = gridCellSpacing * shapeSizeFac;
    draw();
}

window.addEventListener('resize', refreshScreenSize);