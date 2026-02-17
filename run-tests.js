"use strict";
// Run: npm install && npx playwright install chromium && npm test

const http = require("http");
const path = require("path");
const fs = require("fs");
const { spawn } = require("child_process");

const PORT = 8765;
const BASE = "http://127.0.0.1:" + PORT;

const MIME = { ".html": "text/html", ".js": "application/javascript" };

function serve(dir) {
    return http.createServer((req, res) => {
        const url = req.url === "/" ? "/index.html" : req.url.split("?")[0];
        const file = path.join(dir, url.replace(/^\//, ""));
        const ext = path.extname(file);
        const stream = fs.createReadStream(file);
        stream.on("error", () => {
            res.writeHead(404);
            res.end();
        });
        stream.on("open", () => {
            res.setHeader("Content-Type", MIME[ext] || "application/octet-stream");
        });
        stream.pipe(res);
    }).listen(PORT);
}

async function run() {
    const server = serve(__dirname);
    let exitCode = 1;
    try {
        const { chromium } = await import("playwright");
        const browser = await chromium.launch();
        const page = await browser.newPage();
        await page.goto(BASE + "/test.html", { waitUntil: "networkidle" });
        const results = page.locator("#test-results");
        await results.waitFor({ state: "visible", timeout: 10000 });
        const passed = await results.getAttribute("data-passed");
        const text = await results.textContent();
        console.log(text || "");
        if (passed === "yes") {
            exitCode = 0;
        }
        await browser.close();
    } catch (err) {
        console.error(err.message || err);
    } finally {
        server.close();
        process.exit(exitCode);
    }
}

run();
