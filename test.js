"use strict";

(function () {
    function assert(condition, message) {
        if (!condition) {
            throw new Error(message || "Assertion failed");
        }
    }

    const results = [];
    let passed = 0;
    let failed = 0;

    function run(name, fn) {
        try {
            fn();
            passed++;
            results.push({ name, ok: true });
        } catch (e) {
            failed++;
            results.push({ name, ok: false, error: e.message });
        }
    }

    const B = window.blockish;
    assert(B, "window.blockish must be defined");

    // --- Tests ---

    run("checkGridLines clears a full row and adds 10 points", function () {
        B.clearGridForTest();
        B.currentScore = 0;
        B.highScore = 0;
        const grid = B.grid;
        const n = B.gridCount;
        // Fill bottom row
        for (let i = 0; i < n; i++) {
            grid[n - 1][i].filled = true;
        }
        B.checkGridLines();
        assert(B.currentScore === 10, "expected currentScore 10, got " + B.currentScore);
        for (let i = 0; i < n; i++) {
            assert(!grid[n - 1][i].filled, "row should be cleared");
        }
    });

    run("stillAlive returns true when a shape can be placed", function () {
        B.clearGridForTest();
        B.setShapeSlotsForTest([0]); // first shape is 5x1 horizontal line
        assert(B.stillAlive() === true, "empty grid with one shape should be alive");
    });

    run("stillAlive returns false when no shape fits", function () {
        B.clearGridForTest();
        B.setShapeSlotsForTest([0]); // 5x1
        const grid = B.grid;
        const n = B.gridCount;
        // Fill entire grid
        for (let j = 0; j < n; j++) {
            for (let i = 0; i < n; i++) {
                grid[j][i].filled = true;
            }
        }
        assert(B.stillAlive() === false, "full grid with one shape should be dead");
    });

    run("undo restores previous state", function () {
        B.clearGridForTest();
        B.setShapeSlotsForTest([0, 1, 2]);
        B.currentScore = 0;
        B.highScore = 0;
        const grid = B.grid;
        const n = B.gridCount;
        grid[0][0].filled = true;
        grid[0][0].color = 0;
        B.saveProgress();
        grid[1][1].filled = true;
        grid[1][1].color = 0;
        B.saveProgress();
        B.reset();
        assert(grid[0][0].filled === true, "undo should restore first cell");
        assert(grid[1][1].filled === false, "undo should clear second cell");
    });

    run("undo then redo then undo restores correctly", function () {
        B.clearGridForTest();
        B.setShapeSlotsForTest([0, 1, 2]);
        B.currentScore = 0;
        const grid = B.grid;
        grid[0][0].filled = true;
        grid[0][0].color = 0;
        B.saveProgress();
        grid[1][1].filled = true;
        grid[1][1].color = 0;
        B.saveProgress();
        B.reset();
        grid[1][1].filled = true;
        grid[1][1].color = 0;
        B.saveProgress();
        B.reset();
        assert(grid[0][0].filled === true && grid[1][1].filled === false, "second undo should restore to state after first undo");
    });

    run("undo then reset gives fresh shape slots", function () {
        B.clearGridForTest();
        B.setShapeSlotsForTest([0, 1, 2]);
        B.currentScore = 5;
        B.saveProgress();
        const grid = B.grid;
        grid[0][0].filled = true;
        grid[0][0].color = 0;
        B.saveProgress();
        B.reset();
        B.reset();
        const slots = B.shapeSlots;
        assert(slots.length === 3, "after reset should have 3 shape slots");
        for (let i = 0; i < 3; i++) {
            assert(typeof slots[i] === "number" && slots[i] >= 0 && slots[i] < B.shapes.length, "each slot should be a valid shape index");
        }
        assert(B.currentScore === 0, "reset should clear score");
    });

    run("saved state excludes fade", function () {
        B.clearGridForTest();
        const grid = B.grid;
        grid[0][0].filled = false;
        grid[0][0].fade = 5;
        B.saveProgress();
        const saved = window.localStorage.getItem("grid");
        assert(saved !== null && saved.indexOf("fade") === -1, "saved grid should not contain fade");
    });

    run("loaded state has no fade on cells", function () {
        B.clearGridForTest();
        const grid = B.grid;
        grid[0][0].fade = 5;
        B.saveProgress();
        B.loadProgress();
        const n = B.gridCount;
        for (let j = 0; j < n; j++) {
            for (let i = 0; i < n; i++) {
                assert(grid[j][i].fade === undefined, "loaded cell should have no fade");
            }
        }
    });

    // --- Report ---
    const el = document.getElementById("test-results");
    let html = "";
    results.forEach(function (r) {
        if (r.ok) {
            html += '<span class="pass">✓ ' + r.name + "</span>\n";
        } else {
            html += '<span class="fail">✗ ' + r.name + ": " + (r.error || "failed") + "</span>\n";
        }
    });
    html += "\n" + passed + " passed, " + failed + " failed.";
    el.innerHTML = html;
    el.setAttribute("data-passed", failed === 0 ? "yes" : "no");

    if (typeof console !== "undefined") {
        console.log(passed + " passed, " + failed + " failed.");
        if (failed > 0) {
            results.filter(function (r) { return !r.ok; }).forEach(function (r) {
                console.error(r.name + ": " + r.error);
            });
        }
    }
})();
