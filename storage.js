"use strict";

function loadProgress(undoOnly = false) {
    const store = localStorage;
    let storeSuffix = "";
    if (undoOnly) {
        storeSuffix = "Old";
        loadFutureShapeSlots = true;
    }
    currentScore = store["currentScore" + storeSuffix] ? parseInt(store["currentScore" + storeSuffix]) : currentScore;
    highScore = store["highScore" + storeSuffix] ? parseInt(store["highScore" + storeSuffix]) : highScore;
    style = store.style ? parseInt(store.style) : style;

    if (store["grid" + storeSuffix]) {
        store["grid" + storeSuffix].split("|").forEach((inString, index) => {
            const j = Math.floor(index / gridCount);
            const i = index % gridCount;
            const inVals = inString.split(",");
            for (let s = 0; s < inVals.length; s += 2) {
                switch (typeof grid[j][i][inVals[s]]) {
                    case "boolean":
                        grid[j][i][inVals[s]] = inVals[s + 1] === 'true';
                        break;
                    default:
                        grid[j][i][inVals[s]] = inVals[s + 1];
                        break;
                }
            }
            delete grid[j][i].fade;
        });
    }

    if (store["shapeSlots" + storeSuffix]) {
        shapeSlots = store["shapeSlots" + storeSuffix].split(",", shapeBatchLength).map(s => {
            return s === "" ? null : parseInt(s);
        });
    }
}

function saveProgress() {
    undoState = false;
    localStorage.gridOld = localStorage.grid;
    localStorage.shapeSlotsOld = localStorage.shapeSlots;
    localStorage.currentScoreOld = localStorage.currentScore;
    localStorage.highScoreOld = localStorage.highScore;
    localStorage.grid = grid.flat().map(c =>
        Object.entries(c).filter(([key]) => key !== "fade").join(",")
    ).join("|");
    localStorage.shapeSlots = shapeSlots;
    localStorage.futureShapeSlots = futureShapeSlots;
    localStorage.currentScore = currentScore;
    localStorage.highScore = highScore;
    localStorage.style = style;
}
