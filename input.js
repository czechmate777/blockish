"use strict";

function screenToGrid(x, y) {
    const xMid = x - canvas.width / 2;
    const xUnits = xMid / (gridCellSize + gridCellSpacing);
    const xGrid = Math.floor(gridCount / 2 + xUnits);
    const yMid = y - canvas.height / 2 - yOffset;
    const yUnits = yMid / (gridCellSize + gridCellSpacing);
    const yGrid = Math.floor(gridCount / 2 + yUnits);
    return { x: xGrid, y: yGrid };
}

function handlePointerStart(pointerX, pointerY, pointerId) {
    if (shapeTouch.id != null) return;
    if (pointerY > slotsPos - slotsHeight / 2 && pointerY < slotsPos + slotsHeight / 2) {
        renderRequest = true;
        const slot = Math.floor(pointerX / canvas.width * 3);
        if (slot >= 0 && slot < 3 && shapeSlots[slot] != null) {
            shapeTouch = {
                x: pointerX,
                y: pointerY,
                offset: shapes[shapeSlots[slot]][1] * (gridCellSize + gridCellSpacing) / 2 + gridCellSize + gridCellSpacing,
                slot,
                id: pointerId
            };
        }
    } else if (pointerY > 10 && pointerY < canvas.width / 5) {
        if (pointerX < canvas.width / 2) {
            reset();
        } else {
            style = (style + 1) % 5;
            debugTouches++;
            draw();
        }
    }
}

function handlePointerMove(pointerX, pointerY, pointerId) {
    if (shapeTouch.id != null && shapeTouch.id === pointerId) {
        shapeTouch.x = pointerX;
        shapeTouch.y = pointerY;
    } else if (shapeTouch.id == null) {
        const gridPoint = screenToGrid(pointerX, pointerY);
        debugText = `X: ${gridPoint.x}   y: ${gridPoint.y}`;
    }
}

function handlePointerEnd(pointerId) {
    if (shapeTouch.id != null && shapeTouch.id === pointerId) {
        const gridCells = [];
        let canPlace = true;
        const shape = shapes[shapeSlots[shapeTouch.slot]];
        const shapeWidth = shape[0] * (gridCellSize + gridCellSpacing);
        const shapeHeight = shape[1] * (gridCellSize + gridCellSpacing);
        for (let si = 0; si < shape.length - shapeStartIndex; si++) {
            const shapeCellIndex = si + shapeStartIndex;
            if (shape[shapeCellIndex] != 0) {
                const gridCell = screenToGrid(
                    shapeTouch.x + si % shape[0] * (gridCellSize + gridCellSpacing) - shapeWidth / 2 + (gridCellSize + gridCellSpacing) / 2,
                    shapeTouch.y + Math.floor(si / shape[0]) * (gridCellSize + gridCellSpacing) - shapeHeight / 2 + (gridCellSize + gridCellSpacing) / 2 - shapeTouch.offset
                );
                if (grid[gridCell.y] && grid[gridCell.y][gridCell.x] && !grid[gridCell.y][gridCell.x].filled) {
                    gridCells.push(gridCell);
                } else {
                    canPlace = false;
                    break;
                }
            }
        }
        if (canPlace) {
            clearShapeSlot(shapeTouch.slot);
            gridCells.forEach(c => {
                grid[c.y][c.x].filled = true;
                grid[c.y][c.x].color = shape[2];
                scoreAdd(1);
            });
            checkGridLines();
            if (!stillAlive()) reset(true);
            saveProgress();
            renderRequest = true;
        }
        shapeTouch.id = null;
        shapeTouch.slot = null;
    }
    renderRequest = false;
}

canvas.addEventListener("pointerdown", e => {
    e.preventDefault();
    handlePointerStart(e.pageX - appOffsetX, e.pageY, e.pointerId);
});
window.addEventListener("pointermove", e => {
    handlePointerMove(e.pageX - appOffsetX, e.pageY, e.pointerId);
});
window.addEventListener("pointerup", e => handlePointerEnd(e.pointerId));
window.addEventListener("pointercancel", e => handlePointerEnd(e.pointerId));

window.addEventListener("touchstart", e => {
    if (e.changedTouches.length && shapeTouch.id == null) {
        const t = e.changedTouches[0];
        handlePointerStart(t.pageX - appOffsetX, t.pageY, t.identifier);
    }
}, { passive: true });
window.addEventListener("touchmove", e => {
    for (let i = 0; i < e.changedTouches.length; i++) {
        const t = e.changedTouches[i];
        if (t.identifier === shapeTouch.id) {
            handlePointerMove(t.pageX - appOffsetX, t.pageY, t.identifier);
            break;
        }
    }
}, { passive: true });
window.addEventListener("touchend", e => {
    for (let i = 0; i < e.changedTouches.length; i++) {
        handlePointerEnd(e.changedTouches[i].identifier);
    }
});
window.addEventListener("touchcancel", e => {
    for (let i = 0; i < e.changedTouches.length; i++) {
        handlePointerEnd(e.changedTouches[i].identifier);
    }
});
