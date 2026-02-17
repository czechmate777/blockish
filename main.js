"use strict";

// Service Worker
if ("serviceWorker" in navigator) {
    navigator.serviceWorker.register("./sw.js");
}

loadProgress();
loadShapeBatch();
refreshScreenSize();
draw();
tick();

window.addEventListener("resize", refreshScreenSize);

// Test surface for test.html / test.js
function clearGridForTest() {
    for (let i = 0; i < gridCount; i++) {
        for (let j = 0; j < gridCount; j++) {
            grid[j][i] = { filled: false };
        }
    }
}

function setShapeSlotsForTest(slots) {
    shapeSlots.length = 0;
    for (let i = 0; i < slots.length; i++) {
        shapeSlots[i] = slots[i];
    }
    futureShapeSlots = shapeSlots.slice();
}

window.blockish = {
    grid,
    gridCount,
    shapes,
    shapeStartIndex,
    get shapeSlots() { return shapeSlots; },
    get currentScore() { return currentScore; },
    get highScore() { return highScore; },
    set currentScore(v) { currentScore = v; },
    set highScore(v) { highScore = v; },
    checkGridLines,
    stillAlive,
    scoreAdd,
    clearGridForTest,
    setShapeSlotsForTest
};
