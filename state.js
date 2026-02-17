"use strict";

let style = 0;
let undoState = false;
let renderRequest = true;
let currentScore = 0;
let highScore = 0;

let portrait = true;
let appOffsetX = 0;
const canvas = document.createElement('canvas');
const ctx = canvas.getContext('2d');
document.body.appendChild(canvas);

let gridWidth = 0;
let gridCellSize = 0;
let gridCellSpacing = 0;
let screenConstraint = 0;

const grid = [];
for (let i = 0; i < gridCount; i++) {
    grid[i] = [];
    for (let j = 0; j < gridCount; j++) {
        grid[i][j] = { filled: false };
    }
}

let shapeCellSize = 0;
let shapeCellSpacing = 0;
let slotsHeight = 0;
let slotsPos = 0;

let shapeSlots = [];
let futureShapeSlots = [];
let loadFutureShapeSlots = false;

let shapeTouch = { x: 0, y: 0, offset: 0, slot: null, id: null };
let yOffset = -50;

let debuggingEnabled = false;
let debugText = "😮 " + appVersion;
let debugTouches = 0;

setInterval(() => {
    if (debugTouches > 5) {
        debuggingEnabled = !debuggingEnabled;
    }
    debugTouches = 0;
}, 1000);

let rendering = true;
let renderRequestOld = renderRequest;
let renderCancelId = null;
let color;
