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
