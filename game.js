"use strict";

function loadShapeBatch() {
    if (loadFutureShapeSlots) {
        shapeSlots = futureShapeSlots;
    } else {
        for (let s = 0; s < shapeBatchLength; s++) {
            shapeSlots[s] = Math.floor(Math.random() * shapes.length);
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
    const rows = [];
    const cols = [];
    for (let f = 0; f < gridCount; f++) {
        cols[f] = true;
    }
    for (let j = 0; j < gridCount; j++) {
        if (grid[j].every(x => x.filled)) {
            rows.push(j);
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
            c.fade = fades.length - 1;
        });
        scoreAdd(gridCount);
    });
    cols.forEach((filled, index) => {
        if (filled === true) {
            for (let row = 0; row < gridCount; row++) {
                grid[row][index].filled = false;
                grid[row][index].fade = fades.length - 1;
                scoreAdd(1);
            }
        }
    });
}

function stillAlive() {
    for (let slotIndex = 0; slotIndex < shapeSlots.length; slotIndex++) {
        if (shapeSlots[slotIndex] == null) continue;
        const shape = shapes[shapeSlots[slotIndex]];
        for (let j = 0; j < gridCount; j++) {
            for (let i = 0; i < gridCount; i++) {
                let canPlace = true;
                for (let si = 0; si < shape.length - shapeStartIndex; si++) {
                    const shapeCellIndex = si + shapeStartIndex;
                    if (shape[shapeCellIndex] != 0) {
                        const x = i + si % shape[0];
                        const y = j + Math.floor(si / shape[0]);
                        if (!grid[y] || !grid[y][x] || grid[y][x].filled) {
                            canPlace = false;
                            break;
                        }
                    }
                }
                if (canPlace) return true;
            }
        }
    }
    return false;
}

function reset(force) {
    if (undoState || force) {
        undoState = false;
        loadFutureShapeSlots = false;
        for (let i = 0; i < gridCount; i++) {
            grid[i] = [];
            for (let j = 0; j < gridCount; j++) {
                grid[i][j] = { filled: false };
            }
        }
        loadShapeBatch();
        currentScore = 0;
        draw();
    } else {
        undoState = true;
        loadProgress(true);
        draw();
        // Persist restored state so a later redo + undo loads the right backup
        saveProgress();
        undoState = true;
    }
}
