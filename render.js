"use strict";

function draw() {
    ctx.fillStyle = colorBG;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

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
            if (grid[j][i].filled) {
                if ((style === 0 || style === 2) && colors[grid[j][i].color] != undefined) {
                    color = colors[grid[j][i].color];
                } else if (style === 4) {
                    const lr = Math.floor((i + 1) / gridCount * 255).toString(16);
                    const ud = Math.floor((j + 1) / gridCount * 255).toString(16);
                    color = `#${ud}77${lr}`;
                } else {
                    color = colorFilled;
                }
                drawGridRect(i, j);
            } else {
                color = colorEmpty;
                drawGridRect(i, j);
                if (grid[j][i].fade != undefined) {
                    const scale = (grid[j][i].fade + 1) / fades.length;
                    if ((style === 0 || style === 2) && colors[grid[j][i].color] != undefined) {
                        color = colors[grid[j][i].color] + fades[grid[j][i].fade];
                    } else if (style !== 4) {
                        color = colorFilled + fades[grid[j][i].fade];
                    }
                    drawGridRect(i, j, scale);
                    grid[j][i].fade = --grid[j][i].fade < 0 ? undefined : grid[j][i].fade;
                }
            }
        }
    }

    ctx.shadowBlur = gridCellSpacing;
    ctx.shadowOffsetX = gridCellSpacing;
    ctx.shadowOffsetY = gridCellSpacing;
    ctx.shadowColor = "#000000cc";
    shapeSlots.forEach((shapeIndex, slotIndex) => {
        if (shapeIndex != null) {
            if (shapeTouch.id != null && slotIndex === shapeTouch.slot) {
                drawShape(shapeTouch.x, shapeTouch.y - shapeTouch.offset, shapeIndex, gridCellSize, gridCellSpacing);
            } else {
                drawShape(canvas.width / 3 * slotIndex + canvas.width / 6, slotsPos, shapeIndex, shapeCellSize, shapeCellSpacing);
            }
        }
    });
    ctx.shadowBlur = 0;
    ctx.shadowOffsetX = 0;
    ctx.shadowOffsetY = 0;

    ctx.fillStyle = colorFilled;
    ctx.textAlign = "left";
    ctx.font = canvas.width / 10 + "px arial";
    ctx.fillText(currentScore, 10, canvas.width / 10, canvas.width / 2 - canvas.width / 10);
    ctx.fillStyle = colorEmpty;
    ctx.textAlign = "right";
    ctx.font = canvas.width / 10 + "px arial";
    ctx.fillText(highScore, canvas.width - 10, canvas.width / 10, canvas.width / 2 - canvas.width / 10);
    ctx.fillStyle = colorReset;
    ctx.textAlign = "right";
    ctx.font = canvas.width / 10 + "px arial";
    ctx.fillText(undoState ? "↺ " : "↶ ", canvas.width / 2, canvas.width / 10);
    ctx.fillStyle = colorReset;
    ctx.textAlign = "left";
    ctx.font = canvas.width / 10 + "px arial";
    ctx.fillText("🎨", canvas.width / 2, canvas.width / 10);

    if (debuggingEnabled) {
        ctx.fillStyle = colorFilled;
        ctx.textAlign = "center";
        ctx.fillText(debugText, canvas.width / 2, canvas.height / 2);
    }

    if (gameOver) {
        ctx.fillStyle = "rgba(0, 0, 0, 0.75)";
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        const centerX = canvas.width / 2;
        const centerY = canvas.height / 2;

        ctx.fillStyle = "#ffffff";
        ctx.textAlign = "center";
        ctx.font = "bold " + canvas.width / 8 + "px arial";
        ctx.fillText("Game Over", centerX, centerY - canvas.width / 6);

        ctx.font = canvas.width / 6 + "px arial";
        ctx.fillText(currentScore, centerX, centerY + canvas.width / 20);

        if (isNewHighScore) {
            ctx.fillStyle = "#ffd700";
            ctx.font = "bold " + canvas.width / 12 + "px arial";
            ctx.fillText("🏆 New High Score!", centerX, centerY + canvas.width / 5);
        }

        const btnW = canvas.width * 0.55;
        const btnH = canvas.width / 9;
        const btnX = centerX - btnW / 2;
        const btnY = canvas.height - canvas.width / 4 - btnH / 2;
        shareBtn.x = btnX;
        shareBtn.y = btnY;
        shareBtn.w = btnW;
        shareBtn.h = btnH;

        ctx.fillStyle = "rgba(255, 255, 255, 0.15)";
        ctx.beginPath();
        roundRect(btnX, btnY, btnW, btnH, btnH * radiusFactor * 2);
        ctx.fill();
        ctx.fillStyle = "rgba(255, 255, 255, 0.85)";
        ctx.font = canvas.width / 16 + "px arial";
        ctx.fillText("📤 Share Score", centerX, btnY + btnH * 0.68);

        ctx.fillStyle = "rgba(255, 255, 255, 0.35)";
        ctx.font = canvas.width / 18 + "px arial";
        ctx.fillText("Tap anywhere to restart", centerX, canvas.height - canvas.width / 14);
    }
}

function rect(obj) {
    obj.w = obj.w == null ? obj.h : obj.w;
    obj.h = obj.h == null ? obj.w : obj.h;
    obj.c = obj.c == null ? color : obj.c;
    obj.s = obj.s == null ? style : obj.s;
    obj.r = obj.r == null ? obj.w * radiusFactor : obj.r;
    obj.l = obj.l == null ? obj.w * lw : obj.l;
    ctx.beginPath();
    if (obj.s === 0 || obj.s === 1 || obj.s === 4) {
        roundRect(obj.x - obj.w / 2, obj.y - obj.h / 2, obj.w, obj.h, obj.r);
        ctx.fillStyle = obj.c;
        ctx.fill();
    } else {
        roundRect(
            obj.x - obj.w / 2 + obj.l / 2,
            obj.y - obj.h / 2 + obj.l / 2,
            obj.w - obj.l,
            obj.h - obj.l,
            obj.r
        );
        ctx.lineWidth = obj.l;
        ctx.strokeStyle = obj.c;
        ctx.stroke();
    }
}

function roundRect(x, y, w, h, r) {
    if (ctx.roundRect) {
        ctx.roundRect(x, y, w, h, r);
    } else {
        ctx.rect(x, y, w, h);
    }
}

function drawGridRect(i, j, scale) {
    scale = scale == null ? 1 : scale;
    rect({
        x: canvas.width / 2 - (gridWidth - gridCellSize) / 2 + i * (gridCellSize + gridCellSpacing),
        y: canvas.height / 2 - (gridWidth - gridCellSize) / 2 + j * (gridCellSize + gridCellSpacing) + yOffset,
        w: gridCellSize * scale
    });
}

function drawShape(x, y, shapeIndex, cellSize, padding) {
    const shape = shapes[shapeIndex];
    color = ((style === 0 || style === 2) && colors[shape[2]] != undefined) ? colors[shape[2]] : colorFilled;
    const shapeWidth = (shape[0] - 1) * (cellSize + padding);
    const shapeHeight = (shape[1] - 1) * (cellSize + padding);
    for (let si = 0; si < shape.length - shapeStartIndex; si++) {
        const shapeCellIndex = si + shapeStartIndex;
        if (shape[shapeCellIndex] != 0) {
            rect({
                x: x - shapeWidth / 2 + si % shape[0] * (cellSize + padding),
                y: y - shapeHeight / 2 + Math.floor(si / shape[0]) * (cellSize + padding),
                w: cellSize
            });
        }
    }
}

function tick() {
    if (rendering) draw();
    if (renderRequest !== renderRequestOld) {
        if (renderRequest) {
            rendering = true;
        } else {
            clearTimeout(renderCancelId);
            renderCancelId = setTimeout(() => {
                if (!renderRequest) rendering = false;
            }, 250);
        }
        renderRequestOld = renderRequest;
    }
    requestAnimationFrame(tick);
}

function refreshScreenSize() {
    portrait = true;
    canvas.height = window.innerHeight;
    canvas.width = Math.min(window.innerWidth, window.innerHeight * 0.7);
    appOffsetX = (window.innerWidth - canvas.width) / 2;
    screenConstraint = Math.min(canvas.width, canvas.height);
    gridCellSize = gridCellSizeFac * screenConstraint;
    gridCellSpacing = gridCellSpacingFac * screenConstraint;
    gridWidth = gridCount * gridCellSize + (gridCount - 1) * gridCellSpacing;
    slotsHeight = canvas.width / 3;
    slotsPos = Math.min(
        canvas.height / 2 + gridWidth / 2 + slotsHeight * 0.65,
        canvas.height - slotsHeight / 2 - bottomGrace
    );
    yOffset = slotsPos - slotsHeight * 0.65 - canvas.height / 2 - gridWidth / 2;
    shapeCellSize = gridCellSize * shapeSizeFac;
    shapeCellSpacing = gridCellSpacing * shapeSizeFac;
    draw();
}
