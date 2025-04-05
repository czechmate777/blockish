/**
 * main.js - Refactored code for the Blockish game.
 */

// --- Configuration ---

const Config = {
    GRID_COUNT: 10,             // Number of cells per side in the grid
    GRID_CELL_SIZE_FACTOR: 0.08, // Factor of screen constraint for cell size
    GRID_CELL_SPACING_FACTOR: 0.01,// Factor of screen constraint for cell spacing
    GRID_BORDER_RADIUS_FACTOR: 0.15, // Factor of cell size for corner radius
    GRID_LINE_WIDTH_FACTOR: 0.1, // Factor of cell size for outline width

    SHAPE_BATCH_LENGTH: 3,      // Number of shapes offered at a time
    SHAPE_SIZE_FACTOR: 0.65,    // Factor of grid cell size for shape cell size
    SHAPE_START_INDEX: 3,       // Index in shape data array where block pattern starts

    // Colors
    COLOR_BG: 'rgb(14, 14, 14)',
    COLOR_EMPTY_CELL: 'rgba(120, 120, 120, 0.2)',
    COLOR_FILLED_CELL_DEFAULT: '#787878',
    COLOR_RESET_BUTTON: "#ffffff33",
    SHAPE_COLORS: [ // Colors corresponding to shape type index
        "#567189", "#562289", "#893868", "#893333",
        "#895730", "#897215", "#50891B", "#12896C"
    ],
    FADE_EFFECT_COLORS: ["11", "22", "33", "44", "55", "66", "77", "88", "99", "aa", "bb", "cc", "dd", "ee"],

    BOTTOM_GRACE_PX: 5,         // Minimum space below shape slots
    Y_OFFSET_INITIAL: -50,      // Initial vertical offset for the grid (will be recalculated)
    DEBUG_TOUCH_COUNT_THRESHOLD: 5, // Number of taps on style button to toggle debug
    DEBUG_TOUCH_RESET_MS: 1000, // Time window for debug taps

    LOCAL_STORAGE_KEYS: {
        GRID: "grid",
        SHAPE_SLOTS: "shapeSlots",
        FUTURE_SHAPE_SLOTS: "futureShapeSlots",
        CURRENT_SCORE: "currentScore",
        HIGH_SCORE: "highScore",
        STYLE: "style",
        OLD_SUFFIX: "Old" // Suffix for undo state
    }
};

// --- Shape Definitions ---

const SHAPES_DATA = [
    // Format: [width, height, colorIndex, block1, block2, ...] (1 = filled, 0 = empty)
    // 1x5
    [5, 1, 0, 1, 1, 1, 1, 1],
    [1, 5, 0, 1, 1, 1, 1, 1],
    // 1x4
    [4, 1, 1, 1, 1, 1, 1],
    [1, 4, 1, 1, 1, 1, 1],
    // 1x3
    [3, 1, 2, 1, 1, 1],
    [1, 3, 2, 1, 1, 1],
    // 1x2
    [2, 1, 3, 1, 1],
    [1, 2, 3, 1, 1],
    // 3x3
    [3, 3, 4, 1, 1, 1, 1, 1, 1, 1, 1, 1],
    // 2x2
    [2, 2, 4, 1, 1, 1, 1],
    // L
    [3, 3, 5, 1, 0, 0, 1, 0, 0, 1, 1, 1],
    [3, 3, 5, 1, 1, 1, 1, 0, 0, 1, 0, 0], // Corrected L shape? (Original had just '1')
    [3, 3, 5, 1, 1, 1, 0, 0, 1, 0, 0, 1],
    [3, 3, 5, 0, 0, 1, 0, 0, 1, 1, 1, 1],
    // l (small L)
    [2, 2, 6, 1, 0, 1, 1],
    [2, 2, 6, 1, 1, 0, 1], // Corrected l shape? (Original had just '1')
    [2, 2, 6, 1, 1, 0, 1], // Duplicate? Original had different pattern
    [2, 2, 6, 0, 1, 1, 1],
    // 1x1
    [1, 1, 7, 1]
];


// --- Grid Class ---

class Grid {
    constructor(size) {
        this.size = size;
        this.cells = this.initGrid();
    }

    // Initialize grid with empty cells
    initGrid() {
        const cells = [];
        for (let j = 0; j < this.size; j++) {
            cells[j] = [];
            for (let i = 0; i < this.size; i++) {
                cells[j][i] = {
                    filled: false,
                    colorIndex: null, // Store color index instead of raw color
                    fade: undefined    // Fade effect counter
                };
            }
        }
        return cells;
    }

    // Reset grid to initial empty state
    reset() {
        this.cells = this.initGrid();
    }

    // Check for and clear completed lines (rows and columns)
    checkAndClearLines() {
        let scoreToAdd = 0;
        const rowsToClear = [];
        const colsToClear = Array(this.size).fill(true); // Assume columns are full initially

        // Identify full rows and columns
        for (let j = 0; j < this.size; j++) {
            let rowFull = true;
            for (let i = 0; i < this.size; i++) {
                if (!this.cells[j][i].filled) {
                    rowFull = false;
                    colsToClear[i] = false; // This column isn't full
                }
            }
            if (rowFull) {
                rowsToClear.push(j);
            }
        }

        // Clear full rows
        rowsToClear.forEach(j => {
            for (let i = 0; i < this.size; i++) {
                this.cells[j][i].filled = false;
                this.cells[j][i].fade = Config.FADE_EFFECT_COLORS.length - 1;
            }
            scoreToAdd += this.size;
        });

        // Clear full columns
        colsToClear.forEach((isFull, i) => {
            if (isFull) {
                for (let j = 0; j < this.size; j++) {
                    // Avoid double-clearing and double-scoring if row was already cleared
                    if (this.cells[j][i].filled) {
                        this.cells[j][i].filled = false;
                        this.cells[j][i].fade = Config.FADE_EFFECT_COLORS.length - 1;
                        scoreToAdd++; // Score 1 point per cell in a cleared column
                    }
                }
            }
        });

        return scoreToAdd;
    }

    // Check if a shape can be placed at a given grid coordinate (top-left)
    canPlaceShape(shapeData, gridX, gridY) {
        const shapeWidth = shapeData[0];
        const shapePattern = shapeData.slice(Config.SHAPE_START_INDEX);

        for (let i = 0; i < shapePattern.length; i++) {
            if (shapePattern[i] !== 0) { // If it's part of the shape
                const cellX = gridX + (i % shapeWidth);
                const cellY = gridY + Math.floor(i / shapeWidth);

                // Check bounds and if the target cell is already filled
                if (cellY >= this.size || cellY < 0 ||
                    cellX >= this.size || cellX < 0 ||
                    this.cells[cellY][cellX].filled) {
                    return false; // Cannot place here
                }
            }
        }
        return true; // Can place
    }

    // Place a shape onto the grid
    placeShape(shapeData, gridCellsToFill) {
        let scoreToAdd = 0;
        const colorIndex = shapeData[2];
        gridCellsToFill.forEach(cellPos => {
            if (this.cells[cellPos.y] && this.cells[cellPos.y][cellPos.x]) {
                this.cells[cellPos.y][cellPos.x].filled = true;
                this.cells[cellPos.y][cellPos.x].colorIndex = colorIndex;
                scoreToAdd++;
            }
        });
        return scoreToAdd;
    }

    // Convert grid state to string for saving
    serialize() {
        return this.cells.flat().map(cell =>
            Object.entries(cell)
            .filter(([key, value]) => value !== null && value !== undefined && value !== false) // Only save non-default values
            .map(([key, value]) => `${key},${value}`)
            .join(',')
        ).join('|');
    }


    // Load grid state from string
    deserialize(savedString) {
        this.reset(); // Start with a clean grid
        if (!savedString) return;

        savedString.split("|").forEach((cellString, index) => {
            if (!cellString) return; // Skip empty entries if any

            const j = Math.floor(index / this.size);
            const i = index % this.size;

            if (this.cells[j] && this.cells[j][i]) {
                cellString.split(',').forEach((pair, pIndex, pairs) => {
                    if (pIndex % 2 === 0) { // Key
                        const key = pairs[pIndex];
                        const valueStr = pairs[pIndex + 1];
                        let value;

                        // Basic type conversion based on default cell structure
                        if (typeof this.cells[j][i][key] === 'boolean') {
                            value = valueStr === 'true';
                        } else if (typeof this.cells[j][i][key] === 'number') {
                            value = parseInt(valueStr, 10);
                        } else if (key === 'fade' && valueStr === 'undefined') {
                            value = undefined;
                        }
                         else {
                            value = valueStr; // Assume string or handle other types as needed
                        }
                         // Assign if the key exists in the cell structure
                         if (key in this.cells[j][i]) {
                            this.cells[j][i][key] = value;
                        }
                    }
                });
                 // Explicitly set filled if not present in saved data (meaning it was false)
                 if (!cellString.includes('filled,')) {
                     this.cells[j][i].filled = false;
                 }
            }
        });
    }
}


// --- Game Class ---

class Game {
    constructor(gridSize, shapeBatchLength, shapesData) {
        this.grid = new Grid(gridSize);
        this.shapeBatchLength = shapeBatchLength;
        this.shapesData = shapesData;

        this.shapeSlots = Array(shapeBatchLength).fill(null);
        this.futureShapeSlots = Array(shapeBatchLength).fill(null); // For undo
        this.loadFutureShapes = false; // Flag to load future shapes (after undo)

        this.currentScore = 0;
        this.highScore = 0;
        this.undoStateAvailable = false; // Can the player currently undo?
        this.isGameOver = false;

        // UI related state (might move to UI class later)
        this.displayStyle = 0; // 0: Colored, 1: Mono, 2: Outline Colored, 3: Outline Mono, 4: Gradient
        this.debuggingEnabled = false;
        this.debugTouches = 0;
        this.debugTimer = null;
    }

    // Start a new game or reset the current one
    resetGame(forceReset = false) {
         if (this.undoStateAvailable && !forceReset) {
            // Perform Undo
            this.loadState(true); // Load the 'Old' state
            this.undoStateAvailable = false; // Undo used
            this.isGameOver = false; // Game is not over after undo
        } else {
            // Perform Reset
            this.saveState(true); // Save current state as undo state *before* resetting
            this.grid.reset();
            this.currentScore = 0;
            // Don't reset high score here, loadState handles it
            this.loadShapeBatch();
            this.undoStateAvailable = false; // Cannot undo a fresh reset immediately
            this.isGameOver = false;
            this.saveState(); // Save the fresh state
        }
    }

    // Load a new batch of shapes into the slots
    loadShapeBatch() {
         if (this.loadFutureShapes && this.futureShapeSlots.some(s => s !== null)) {
            // If undoing, load the saved future shapes
            this.shapeSlots = [...this.futureShapeSlots];
            this.loadFutureShapes = false; // Reset flag
        } else {
            // Otherwise, generate new random shapes
            for (let i = 0; i < this.shapeBatchLength; i++) {
                this.shapeSlots[i] = Math.floor(Math.random() * this.shapesData.length);
            }
            // When loading a fresh batch, future shapes are the same initially
             this.futureShapeSlots = [...this.shapeSlots];
        }
    }


    // Clear a shape slot after placement
    clearShapeSlot(slotIndex) {
        this.shapeSlots[slotIndex] = null;
        // Check if all slots are empty to load a new batch
        if (this.shapeSlots.every(s => s === null)) {
            this.loadShapeBatch();
        }
    }

    // Add points to the score and update high score if needed
    addScore(points) {
        this.currentScore += points;
        if (this.currentScore > this.highScore) {
            this.highScore = this.currentScore;
        }
    }

    // Attempt to place a shape dragged onto the grid
    placeShape(shapeIndex, gridCellsToFill) {
         this.saveState(true); // Save current state for potential undo

        const shapeData = this.shapesData[shapeIndex];
        const placementScore = this.grid.placeShape(shapeData, gridCellsToFill);
        this.addScore(placementScore);

        const lineClearScore = this.grid.checkAndClearLines();
        this.addScore(lineClearScore);

        if (!this.isAlive()) {
            this.isGameOver = true;
            // Consider triggering a game over sequence in UI
             console.log("Game Over!"); // Placeholder
             // Maybe reset automatically or show a message/button
             // For now, let's make reset mandatory by disabling undo
             this.undoStateAvailable = false;
        } else {
            this.undoStateAvailable = true; // Successful move, allow undo
        }

        this.saveState(); // Save the new state
    }


    // Check if any of the current shapes can be placed anywhere on the grid
    isAlive() {
        const uniqueShapeIndices = [...new Set(this.shapeSlots.filter(s => s !== null))];

        for (const shapeIndex of uniqueShapeIndices) {
            const shapeData = this.shapesData[shapeIndex];
             const shapeWidth = shapeData[0];
             const shapeHeight = shapeData[1];

            // Iterate through all possible top-left grid positions
             // Optimization: Adjust bounds based on shape size
             for (let j = 0; j <= this.grid.size - shapeHeight; j++) {
                 for (let i = 0; i <= this.grid.size - shapeWidth; i++) {
                    if (this.grid.canPlaceShape(shapeData, i, j)) {
                        return true; // Found a possible move
                    }
                }
            }
        }
        return false; // No shape can be placed anywhere
    }

    // Save game state to localStorage
     saveState(isUndoState = false) {
        const suffix = isUndoState ? Config.LOCAL_STORAGE_KEYS.OLD_SUFFIX : "";
        try {
            localStorage.setItem(Config.LOCAL_STORAGE_KEYS.GRID + suffix, this.grid.serialize());
            localStorage.setItem(Config.LOCAL_STORAGE_KEYS.SHAPE_SLOTS + suffix, this.shapeSlots.map(s => s === null ? "" : s).join(','));
            // Only save future shapes for the main state, not the undo state
            if (!isUndoState) {
                localStorage.setItem(Config.LOCAL_STORAGE_KEYS.FUTURE_SHAPE_SLOTS, this.futureShapeSlots.map(s => s === null ? "" : s).join(','));
            }
            localStorage.setItem(Config.LOCAL_STORAGE_KEYS.CURRENT_SCORE + suffix, this.currentScore.toString());
            localStorage.setItem(Config.LOCAL_STORAGE_KEYS.HIGH_SCORE + suffix, this.highScore.toString());
             // Style is global, saved separately (or could be part of game state)
             if (!isUndoState) {
                localStorage.setItem(Config.LOCAL_STORAGE_KEYS.STYLE, this.displayStyle.toString());
            }
        } catch (e) {
            console.error("Failed to save state:", e);
        }
    }

    // Load game state from localStorage
     loadState(loadUndoState = false) {
        const suffix = loadUndoState ? Config.LOCAL_STORAGE_KEYS.OLD_SUFFIX : "";
         this.loadFutureShapes = loadUndoState; // Set flag if loading undo state

        try {
            const savedGrid = localStorage.getItem(Config.LOCAL_STORAGE_KEYS.GRID + suffix);
            this.grid.deserialize(savedGrid);

            const savedSlots = localStorage.getItem(Config.LOCAL_STORAGE_KEYS.SHAPE_SLOTS + suffix);
            if (savedSlots) {
                this.shapeSlots = savedSlots.split(',').map(s => s === "" ? null : parseInt(s));
            } else if (!loadUndoState) {
                 // If loading main state and no slots found, load a new batch
                 this.loadShapeBatch();
             }


             // Only load future shapes when loading the main state
             if (!loadUndoState) {
                const savedFutureSlots = localStorage.getItem(Config.LOCAL_STORAGE_KEYS.FUTURE_SHAPE_SLOTS);
                if (savedFutureSlots) {
                    this.futureShapeSlots = savedFutureSlots.split(',').map(s => s === "" ? null : parseInt(s));
                } else {
                    // If no future shapes saved, sync with current slots
                    this.futureShapeSlots = [...this.shapeSlots];
                }
            }


            this.currentScore = parseInt(localStorage.getItem(Config.LOCAL_STORAGE_KEYS.CURRENT_SCORE + suffix) || '0');
             // High score should persist across resets/undos unless loading old high score
             // Load the main high score unless specifically loading undo state's high score for display perhaps?
             // Let's stick to loading the primary high score always.
            this.highScore = parseInt(localStorage.getItem(Config.LOCAL_STORAGE_KEYS.HIGH_SCORE) || '0');


            // Load style only when loading the main state
            if (!loadUndoState) {
                 this.displayStyle = parseInt(localStorage.getItem(Config.LOCAL_STORAGE_KEYS.STYLE) || '0');
             }

             // After loading an undo state, the main state becomes the undo state.
            // However, the logic in resetGame handles saving the previous state before loading.
            // We just need to update the availability flag.
            this.undoStateAvailable = !loadUndoState && !!savedGrid; // Can undo if loaded main state successfully and it existed

        } catch (e) {
            console.error("Failed to load state:", e);
             if (!loadUndoState) this.resetGame(true); // Force reset if loading fails
        }
    }

     // Cycle through display styles
    cycleStyle() {
        this.displayStyle = (this.displayStyle + 1) % 5; // 5 styles: 0, 1, 2, 3, 4
        this.saveState(); // Save the style change
        this.handleDebugToggle(); // Check if this triggers debug mode
    }

    // Toggle debug mode based on rapid taps
    handleDebugToggle() {
        this.debugTouches++;
        clearTimeout(this.debugTimer);
        this.debugTimer = setTimeout(() => {
            this.debugTouches = 0;
        }, Config.DEBUG_TOUCH_RESET_MS);

        if (this.debugTouches > Config.DEBUG_TOUCH_COUNT_THRESHOLD) {
            this.debuggingEnabled = !this.debuggingEnabled;
            this.debugTouches = 0; // Reset count after toggle
            console.log("Debugging:", this.debuggingEnabled);
        }
    }
}

// --- UI / Renderer Class ---

class UI {
    constructor(canvasId, gameInstance) {
        this.canvas = document.getElementById(canvasId) || this.createCanvas();
        this.ctx = this.canvas.getContext('2d');
        this.game = gameInstance; // Reference to the game logic

        // Calculated layout variables
        this.isPortrait = true;
        this.appOffsetX = 0; // For centering horizontally
        this.gridRenderWidth = 0;
        this.gridCellRenderSize = 0;
        this.gridCellRenderSpacing = 0;
        this.shapeCellRenderSize = 0;
        this.shapeCellRenderSpacing = 0;
        this.slotsRenderHeight = 0;
        this.slotsRenderYPos = 0;
        this.gridRenderYOffset = Config.Y_OFFSET_INITIAL;

        // Drawing state
         this.activeColor = Config.COLOR_FILLED_CELL_DEFAULT; // Current color being used
         this.renderRequestPending = true; // Should we draw next frame?
         this.isRendering = true; // Is the draw loop active?
         this.renderCancelTimer = null; // Timer to stop rendering when idle

        this.refreshScreenSize(); // Initial calculation
    }

    createCanvas() {
        const canvas = document.createElement('canvas');
        canvas.id = 'gameCanvas'; // Give it an ID
        document.body.appendChild(canvas);
        return canvas;
    }

     // Recalculate dimensions based on window size
     refreshScreenSize() {
        const DYNAMIC_Y_OFFSET_ENABLED = true; // Use the dynamic offset calculation

        this.isPortrait = window.innerHeight >= window.innerWidth; // Simple check
        // Adjust canvas size - constrain width in portrait, height in landscape (example)
        // Original logic: Constrain width to 70% of height, always centered.
        this.canvas.height = window.innerHeight;
        this.canvas.width = Math.min(window.innerWidth, window.innerHeight * 0.7); // Keep original constraint
        this.appOffsetX = (window.innerWidth - this.canvas.width) / 2;

        const screenConstraint = Math.min(this.canvas.width, this.canvas.height);

        // Grid dimensions
        this.gridCellRenderSize = Config.GRID_CELL_SIZE_FACTOR * screenConstraint;
        this.gridCellRenderSpacing = Config.GRID_CELL_SPACING_FACTOR * screenConstraint;
        this.gridRenderWidth = Config.GRID_COUNT * this.gridCellRenderSize + (Config.GRID_COUNT - 1) * this.gridCellRenderSpacing;

        // Shape slot dimensions
        this.slotsRenderHeight = this.canvas.width / 3; // Height based on canvas width
        this.slotsRenderYPos = Math.min(
            // Default: Position below grid
            this.canvas.height / 2 + this.gridRenderWidth / 2 + this.slotsRenderHeight * 0.65,
             // Alternative: Clamp to bottom if screen is short
             this.canvas.height - this.slotsRenderHeight / 2 - Config.BOTTOM_GRACE_PX
        );

        // Calculate grid Y offset to center remaining space or based on slots
        if (DYNAMIC_Y_OFFSET_ENABLED) {
             // Calculate required top space for grid + top UI (score etc.)
             const topSpaceNeeded = this.gridRenderWidth / 2 + (this.canvas.width / 10) * 1.5; // Approx score height + padding
             // Calculate required bottom space for grid + slots
             const bottomSpaceNeeded = this.gridRenderWidth / 2 + (this.canvas.height - this.slotsRenderYPos) + this.slotsRenderHeight / 2;

             // Calculate the total vertical space needed vs available
             // Adjust offset to push grid up if needed
             const totalVerticalSpace = this.gridRenderWidth + this.slotsRenderHeight * 1.15 + Config.BOTTOM_GRACE_PX + (this.canvas.width / 10); // Grid + Slots + buffer
             // Original dynamic calculation:
             this.gridRenderYOffset = this.slotsRenderYPos - this.slotsRenderHeight * 0.65 - this.canvas.height / 2 - this.gridRenderWidth / 2;
             // Let's try centering the grid/slots block instead
             const contentHeight = this.gridRenderWidth + this.slotsRenderHeight * 1.15; // Approx combined height
             const topMargin = (this.canvas.height - contentHeight) / 2;
             this.gridRenderYOffset = topMargin + this.gridRenderWidth / 2 - this.canvas.height / 2;


        } else {
             this.gridRenderYOffset = Config.Y_OFFSET_INITIAL; // Use fixed offset
        }


        // Shape dimensions (for drawing in slots and when dragged)
        this.shapeCellRenderSize = this.gridCellRenderSize * Config.SHAPE_SIZE_FACTOR;
        this.shapeCellRenderSpacing = this.gridCellRenderSpacing * Config.SHAPE_SIZE_FACTOR;

        this.requestRedraw(); // Redraw after resize
    }

    // Request a redraw for the next frame
    requestRedraw() {
        this.renderRequestPending = true;
        this.isRendering = true; // Ensure rendering loop is active
        clearTimeout(this.renderCancelTimer); // Cancel any pending stop
    }

    // Signal that drawing might not be needed soon
    signalNoRedrawNeeded() {
         this.renderRequestPending = false;
         // Debounce stopping rendering
         clearTimeout(this.renderCancelTimer);
         this.renderCancelTimer = setTimeout(() => {
             if (!this.renderRequestPending) { // Check again in case something happened
                 this.isRendering = false;
                // console.log("Stopping render loop");
             }
         }, 250); // Stop rendering after 250ms of inactivity
    }


    // Main draw loop, called via requestAnimationFrame
    draw() {
         if (!this.isRendering) return; // Skip drawing if not needed

        // Clear canvas
        this.ctx.fillStyle = Config.COLOR_BG;
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

        // Draw Grid Frame
        this.drawRect({
            x: this.canvas.width / 2,
            y: this.canvas.height / 2 + this.gridRenderYOffset,
            w: this.gridRenderWidth + this.gridCellRenderSpacing * 4, // Add padding
            h: this.gridRenderWidth + this.gridCellRenderSpacing * 4, // Square frame
             fillColor: null, // Don't fill the frame itself
             strokeColor: Config.COLOR_FILLED_CELL_DEFAULT,
             radius: this.gridCellRenderSize * Config.GRID_BORDER_RADIUS_FACTOR * 2.5,
             lineWidth: this.gridCellRenderSize * Config.GRID_LINE_WIDTH_FACTOR,
            useStroke: true // Explicitly use stroke
        });


        // Draw Grid Cells
        for (let j = 0; j < this.game.grid.size; j++) {
            for (let i = 0; i < this.game.grid.size; i++) {
                this.drawGridCell(i, j);
            }
        }

        // Draw Shapes (in slots and dragged)
        this.drawShapes();

        // Draw Scores and UI Elements
        this.drawUI();

        // Draw Debug Info if enabled
        this.drawDebug();

        // Reset render request flag for next cycle
        // this.renderRequestPending = false; // Moved to signalNoRedrawNeeded
    }

     // Draw a single grid cell based on its state
     drawGridCell(i, j) {
        const cell = this.game.grid.cells[j][i];
        const cellX = this.canvas.width / 2 - (this.gridRenderWidth - this.gridCellRenderSize) / 2 + i * (this.gridCellRenderSize + this.gridCellRenderSpacing);
        const cellY = this.canvas.height / 2 - (this.gridRenderWidth - this.gridCellRenderSize) / 2 + j * (this.gridCellRenderSize + this.gridCellRenderSpacing) + this.gridRenderYOffset;

        let fillColor = Config.COLOR_EMPTY_CELL; // Default empty
        let strokeColor = null;
        let useStroke = false;
        let colorIndex = cell.colorIndex; // Get color index from cell

        if (cell.filled) {
             useStroke = (this.game.displayStyle === 2 || this.game.displayStyle === 3);
             fillColor = this.getCellColor(colorIndex, i, j); // Get color based on style and index
            if (useStroke) {
                strokeColor = fillColor; // Use same color for stroke
                 fillColor = null; // Don't fill if using stroke style
            }
        }

        // Draw base cell (empty or filled)
        this.drawRect({
            x: cellX,
            y: cellY,
            w: this.gridCellRenderSize,
            fillColor: fillColor,
            strokeColor: strokeColor,
             radius: this.gridCellRenderSize * Config.GRID_BORDER_RADIUS_FACTOR,
             lineWidth: this.gridCellRenderSize * Config.GRID_LINE_WIDTH_FACTOR,
             useStroke: useStroke
        });


         // Draw fade effect overlay if applicable
         if (cell.fade !== undefined && cell.fade >= 0) {
            const fadeAlpha = Config.FADE_EFFECT_COLORS[cell.fade];
            const fadeFillColor = this.getCellColor(colorIndex, i, j) + (fadeAlpha || 'ff'); // Add alpha hex

             this.drawRect({
                x: cellX,
                y: cellY,
                w: this.gridCellRenderSize,
                fillColor: fadeFillColor,
                radius: this.gridCellRenderSize * Config.GRID_BORDER_RADIUS_FACTOR
            });

            // Decrement fade counter for next frame (logic perhaps belongs in Game update?)
             // Let's keep it simple here for now. If causing issues, move to game logic tick.
             this.game.grid.cells[j][i].fade--;
            if (this.game.grid.cells[j][i].fade < 0) {
                this.game.grid.cells[j][i].fade = undefined;
            }
            this.requestRedraw(); // Need to redraw next frame for fade
        }
    }

    // Determine cell color based on style and index
     getCellColor(colorIndex, gridI, gridJ) {
         switch (this.game.displayStyle) {
            case 0: // Colored Fill
            case 2: // Colored Stroke
                 return Config.SHAPE_COLORS[colorIndex] || Config.COLOR_FILLED_CELL_DEFAULT;
            case 4: // Gradient Fill
                const intensityCol = Math.floor(((gridI + 1) / Config.GRID_COUNT) * 255).toString(16).padStart(2, '0');
                const intensityRow = Math.floor(((gridJ + 1) / Config.GRID_COUNT) * 255).toString(16).padStart(2, '0');
                 // Example: Blue-ish to Pink-ish gradient L->R, Dark->Light T->B
                 // return `#${intensityRow}77${intensityCol}`;
                 // Let's try a different gradient: Green (top-left) to Magenta (bottom-right)
                 const green = Math.floor((1 - (gridI / Config.GRID_COUNT)) * 180 + 50).toString(16).padStart(2, '0');
                const blue = Math.floor(((gridJ / Config.GRID_COUNT)) * 180 + 50).toString(16).padStart(2, '0');
                const red = Math.floor(((gridI + gridJ) / (Config.GRID_COUNT * 2)) * 180 + 50).toString(16).padStart(2, '0');
                return `#${red}${green}${blue}`; // R G B
            case 1: // Mono Fill
            case 3: // Mono Stroke
            default:
                 return Config.COLOR_FILLED_CELL_DEFAULT;
         }
    }

    // Draw shapes in slots or being dragged
    drawShapes(draggedShapeInfo = null) { // Pass dragged shape info here
        // Apply shadow for shapes
        this.ctx.shadowBlur = this.gridCellRenderSpacing; // Use grid spacing for blur
        this.ctx.shadowOffsetX = this.gridCellRenderSpacing;
        this.ctx.shadowOffsetY = this.gridCellRenderSpacing;
        this.ctx.shadowColor = "#000000cc";

        this.game.shapeSlots.forEach((shapeIndex, slotIndex) => {
            if (shapeIndex !== null) {
                 const isDragged = draggedShapeInfo && draggedShapeInfo.slot === slotIndex;
                if (isDragged) {
                    // Draw shape at touch coordinates
                    this.drawShape(
                        draggedShapeInfo.x,
                        draggedShapeInfo.y - draggedShapeInfo.offset, // Apply offset
                        shapeIndex,
                        this.gridCellRenderSize, // Use grid cell size when dragging
                        this.gridCellRenderSpacing
                    );
                } else {
                    // Draw shape in its slot position
                    const slotX = this.canvas.width / 3 * slotIndex + this.canvas.width / 6;
                    this.drawShape(
                        slotX,
                        this.slotsRenderYPos,
                        shapeIndex,
                        this.shapeCellRenderSize, // Use smaller size in slots
                        this.shapeCellRenderSpacing
                    );
                }
            }
        });

        // Clear shadow for other elements
        this.ctx.shadowBlur = 0;
        this.ctx.shadowOffsetX = 0;
        this.ctx.shadowOffsetY = 0;
    }

    // Draw a single shape pattern
     drawShape(centerX, centerY, shapeIndex, cellRenderSize, cellRenderSpacing) {
        if (shapeIndex === null || shapeIndex === undefined) return;

        const shapeData = this.game.shapesData[shapeIndex];
        if (!shapeData) return; // Invalid index safeguard

        const shapeWidth = shapeData[0];
         const shapeHeight = shapeData[1]; // Added for centering calculation
        const colorIndex = shapeData[2];
        const shapePattern = shapeData.slice(Config.SHAPE_START_INDEX);

         // Use grid function to get base color based on current style
         const fillColor = this.getCellColor(colorIndex, 0, 0); // Use 0,0 for i,j as shape color isn't grid-pos dependent
         const useStroke = (this.game.displayStyle === 2 || this.game.displayStyle === 3);
         const strokeColor = useStroke ? fillColor : null;
         const actualFillColor = useStroke ? null : fillColor;


         // Calculate total width/height for centering
         const totalWidth = shapeWidth * cellRenderSize + (shapeWidth - 1) * cellRenderSpacing;
         const totalHeight = shapeHeight * cellRenderSize + (shapeHeight - 1) * cellRenderSpacing;
         const startX = centerX - totalWidth / 2;
         const startY = centerY - totalHeight / 2;

        for (let i = 0; i < shapePattern.length; i++) {
            if (shapePattern[i] !== 0) {
                const cellX = startX + (i % shapeWidth) * (cellRenderSize + cellRenderSpacing) + cellRenderSize / 2; // Center of the cell
                const cellY = startY + Math.floor(i / shapeWidth) * (cellRenderSize + cellRenderSpacing) + cellRenderSize / 2; // Center of the cell

                this.drawRect({
                    x: cellX,
                    y: cellY,
                    w: cellRenderSize,
                    fillColor: actualFillColor,
                     strokeColor: strokeColor,
                     radius: cellRenderSize * Config.GRID_BORDER_RADIUS_FACTOR,
                     lineWidth: cellRenderSize * Config.GRID_LINE_WIDTH_FACTOR, // Scale line width too
                     useStroke: useStroke
                });
            }
        }
    }

    // Draw score, buttons, etc.
     drawUI() {
        const fontSize = this.canvas.width / 10; // Base font size on canvas width
        this.ctx.font = `${fontSize}px sans-serif`; // Use a modern font

        // Current Score (Top Left)
        this.ctx.fillStyle = Config.COLOR_FILLED_CELL_DEFAULT;
        this.ctx.textAlign = "left";
        this.ctx.fillText(this.game.currentScore, 15, fontSize * 1.1, this.canvas.width / 2 - 30); // Add padding

        // High Score (Top Right)
        this.ctx.fillStyle = Config.COLOR_EMPTY_CELL; // Dimmer color for high score
        this.ctx.textAlign = "right";
        this.ctx.fillText(this.game.highScore, this.canvas.width - 15, fontSize * 1.1, this.canvas.width / 2 - 30); // Add padding

        // Reset/Undo Button (Top Center Left)
        this.ctx.fillStyle = Config.COLOR_RESET_BUTTON;
        this.ctx.textAlign = "right"; // Align to the right of the center point
         const resetButtonX = this.canvas.width * 0.4; // Position left of center
        this.ctx.fillText(this.game.undoStateAvailable ? "↺" : "⎌", resetButtonX, fontSize * 1.1);

        // Style Button (Top Center Right)
        this.ctx.fillStyle = Config.COLOR_RESET_BUTTON; // Same style as reset
        this.ctx.textAlign = "left"; // Align to the left of the center point
         const styleButtonX = this.canvas.width * 0.6; // Position right of center
        this.ctx.fillText("🎨", styleButtonX, fontSize * 1.1);
    }


    // Draw debug information
    drawDebug() {
        if (this.game.debuggingEnabled) {
            this.ctx.fillStyle = "rgba(255, 0, 0, 0.7)";
            this.ctx.textAlign = "center";
            this.ctx.font = "14px monospace";
            this.ctx.fillText(`Debug Active | Style: ${this.game.displayStyle}`, this.canvas.width / 2, this.canvas.height - 60);
             // Add more debug info as needed
             // this.ctx.fillText(`Touch ID: ${inputHandler.touchState.id}`, this.canvas.width / 2, this.canvas.height - 40);
             // this.ctx.fillText(`Grid Offset Y: ${this.gridRenderYOffset.toFixed(1)}`, this.canvas.width / 2, this.canvas.height - 20);
        }
    }

    /**
     * Utility function to draw a rounded rectangle.
     * Can handle both fill and stroke based on parameters.
     * obj Properties:
     * x, y: center coordinates
     * w, h: width, height
     * radius: corner radius
     * fillColor: fill color (or null/undefined for no fill)
     * strokeColor: stroke color (or null/undefined for no stroke)
     * lineWidth: line width for stroke
     * useStroke: boolean, if true prioritize stroke over fill (legacy style 2/3)
     */
     drawRect(obj) {
        const x = obj.x - obj.w / 2;
        const y = obj.y - obj.h / 2;
        const w = obj.w;
        const h = obj.h;
        const r = obj.radius === undefined ? w * Config.GRID_BORDER_RADIUS_FACTOR : obj.radius; // Default radius
        const lw = obj.lineWidth === undefined ? w * Config.GRID_LINE_WIDTH_FACTOR : obj.lineWidth; // Default line width

        this.ctx.beginPath();

        // Use native roundRect if available, otherwise fallback (basic rect)
        if (this.ctx.roundRect) {
            this.ctx.roundRect(x, y, w, h, r);
        } else {
            // Fallback for older browsers (simple rectangle)
            this.ctx.rect(x, y, w, h);
        }

        // Handle stroke/fill based on provided colors and style
         if (obj.useStroke && obj.strokeColor) { // Prioritize stroke for specific styles
            this.ctx.lineWidth = lw;
            this.ctx.strokeStyle = obj.strokeColor;
            this.ctx.stroke();
        } else {
            // Standard fill then stroke
            if (obj.fillColor) {
                this.ctx.fillStyle = obj.fillColor;
                this.ctx.fill();
            }
            if (obj.strokeColor) {
                this.ctx.lineWidth = lw;
                this.ctx.strokeStyle = obj.strokeColor;
                this.ctx.stroke();
            }
        }
    }

    // Convert screen coordinates to grid cell indices
    screenToGridCoords(screenX, screenY) {
         const gridCenterX = this.canvas.width / 2;
         const gridCenterY = this.canvas.height / 2 + this.gridRenderYOffset;

         const gridOffsetX = screenX - gridCenterX;
         const gridOffsetY = screenY - gridCenterY;

         // Calculate distance from grid center in cell units
         // Add half cell size to offset origin to top-left corner of the grid area
         const xUnits = gridOffsetX / (this.gridCellRenderSize + this.gridCellRenderSpacing);
         const yUnits = gridOffsetY / (this.gridCellRenderSize + this.gridCellRenderSpacing);

         // Calculate grid index (add gridCount/2 to shift origin from center to 0,0)
         const gridX = Math.floor(Config.GRID_COUNT / 2 + xUnits);
         const gridY = Math.floor(Config.GRID_COUNT / 2 + yUnits);

        return { x: gridX, y: gridY };
    }
}

// --- Input Handler Class ---

class InputHandler {
    constructor(canvas, gameInstance, uiInstance) {
        this.canvas = canvas;
        this.game = gameInstance;
        this.ui = uiInstance;

        this.touchState = {
            id: null,       // Identifier of the touch controlling a shape
            slot: null,     // Index of the shape slot being dragged
            startX: 0,      // Initial touch X
            startY: 0,      // Initial touch Y
            currentX: 0,    // Current touch X
            currentY: 0,    // Current touch Y
            offsetX: 0,     // Vertical offset from touch point to shape center
            offsetY: 0      // Horizontal offset (usually 0, but could be used)
        };

        this.boundTouchStart = this.handleTouchStart.bind(this);
        this.boundTouchMove = this.handleTouchMove.bind(this);
        this.boundTouchEnd = this.handleTouchEnd.bind(this);

        this.addEventListeners();
    }

    addEventListeners() {
        window.addEventListener('touchstart', this.boundTouchStart, { passive: false });
        window.addEventListener('touchmove', this.boundTouchMove, { passive: false });
        window.addEventListener('touchend', this.boundTouchEnd);
        window.addEventListener('touchcancel', this.boundTouchEnd); // Treat cancel like end
    }

    removeEventListeners() {
        window.removeEventListener('touchstart', this.boundTouchStart);
        window.removeEventListener('touchmove', this.boundTouchMove);
        window.removeEventListener('touchend', this.boundTouchEnd);
        window.removeEventListener('touchcancel', this.boundTouchEnd);
    }

     handleTouchStart(event) {
         event.preventDefault(); // Prevent scrolling/zooming etc.
         this.ui.requestRedraw(); // Ensure drawing is active

         const touch = event.changedTouches[0]; // Get the first touch that changed
         const touchX = touch.pageX - this.ui.appOffsetX; // Adjust for canvas offset
         const touchY = touch.pageY;


         // Check if touching a shape slot
         if (this.touchState.id === null && // Only start drag if not already dragging
             touchY > this.ui.slotsRenderYPos - this.ui.slotsRenderHeight / 2 &&
             touchY < this.ui.slotsRenderYPos + this.ui.slotsRenderHeight / 2)
         {
             const slotIndex = Math.floor(touchX / (this.canvas.width / Config.SHAPE_BATCH_LENGTH)); // Determine which slot (0, 1, 2)

             if (slotIndex >= 0 && slotIndex < this.game.shapeSlots.length && this.game.shapeSlots[slotIndex] !== null) {
                 const shapeIndex = this.game.shapeSlots[slotIndex];
                 const shapeData = this.game.shapesData[shapeIndex];
                 const shapeHeight = shapeData[1]; // Get shape height in blocks

                 // Calculate vertical offset from touch point to the center of the shape block cluster
                  // This makes dragging feel more natural, grabbing near the center
                  const shapeRenderHeight = (shapeHeight * this.ui.gridCellRenderSize + (shapeHeight - 1) * this.ui.gridCellRenderSpacing);
                  // Original Offset: Offset based on grid size + padding. Let's use shape center.
                  // const originalOffset = shapeHeight * (this.ui.gridCellRenderSize + this.ui.gridCellRenderSpacing) / 2 + this.ui.gridCellRenderSize + this.ui.gridCellRenderSpacing;
                  const newOffsetY = touchY - this.ui.slotsRenderYPos; // Offset relative to slot center Y


                 this.touchState = {
                     id: touch.identifier,
                     slot: slotIndex,
                     startX: touchX,
                     startY: touchY,
                     currentX: touchX,
                     currentY: touchY,
                     offsetX: 0, // Horizontal offset can be added if needed
                     offsetY: newOffsetY // Vertical offset from touch Y to shape center Y
                 };
                 return; // Successfully started dragging a shape
             }
         }

         // Check if touching UI buttons (Reset/Undo, Style)
         const fontSize = this.canvas.width / 10;
         const buttonYMin = 10;
         const buttonYMax = fontSize * 1.2; // Generous touch area
         const resetButtonXMax = this.canvas.width * 0.45; // Area for reset/undo
         const styleButtonXMin = this.canvas.width * 0.55; // Area for style

         if (this.touchState.id === null && touchY > buttonYMin && touchY < buttonYMax) {
             if (touchX < resetButtonXMax) {
                 // Touched Reset/Undo Area
                 this.game.resetGame(); // Let game logic handle undo vs reset
                 this.ui.requestRedraw();
             } else if (touchX > styleButtonXMin) {
                 // Touched Style Area
                 this.game.cycleStyle();
                 this.ui.requestRedraw();
             }
         }
     }


     handleTouchMove(event) {
         if (this.touchState.id === null) return; // Not dragging anything

         event.preventDefault(); // Prevent scrolling while dragging

         for (let i = 0; i < event.changedTouches.length; i++) {
             const touch = event.changedTouches[i];
             if (touch.identifier === this.touchState.id) {
                 this.touchState.currentX = touch.pageX - this.ui.appOffsetX;
                 this.touchState.currentY = touch.pageY;
                 this.ui.requestRedraw(); // Need to redraw the dragged shape

                  // Optional: Add hover effect on grid while dragging
                  // const gridCoords = this.ui.screenToGridCoords(this.touchState.currentX, this.touchState.currentY - this.touchState.offsetY);
                  // this.ui.highlightPlacement(this.game.shapesData[this.game.shapeSlots[this.touchState.slot]], gridCoords.x, gridCoords.y);

                 break; // Found the touch, no need to check others
             }
         }
     }

     handleTouchEnd(event) {
         if (this.touchState.id === null) return; // Not dragging anything

         let touchEnded = false;
         for (let i = 0; i < event.changedTouches.length; i++) {
             if (event.changedTouches[i].identifier === this.touchState.id) {
                 touchEnded = true;
                 break;
             }
         }

         if (!touchEnded) return; // This touch end event wasn't for our dragged shape

         // --- Placement Logic ---
         const shapeIndex = this.game.shapeSlots[this.touchState.slot];
         const shapeData = this.game.shapesData[shapeIndex];
         const shapeWidthBlocks = shapeData[0];
         const shapeHeightBlocks = shapeData[1];
         const shapePattern = shapeData.slice(Config.SHAPE_START_INDEX);

         // Calculate the effective center X/Y for placement check, accounting for offset
         const effectiveCenterX = this.touchState.currentX - this.touchState.offsetX;
         const effectiveCenterY = this.touchState.currentY - this.touchState.offsetY;

         // Calculate the total render size of the shape when placed (using grid cell size)
         const shapeRenderWidth = shapeWidthBlocks * this.ui.gridCellRenderSize + (shapeWidthBlocks - 1) * this.ui.gridCellRenderSpacing;
         const shapeRenderHeight = shapeHeightBlocks * this.ui.gridCellRenderSize + (shapeHeightBlocks - 1) * this.ui.gridCellRenderSpacing;

         // Calculate the top-left screen coordinate of the shape's bounding box
         const shapeTopLeftScreenX = effectiveCenterX - shapeRenderWidth / 2;
         const shapeTopLeftScreenY = effectiveCenterY - shapeRenderHeight / 2;


         const potentialGridCells = []; // Store {x, y} of grid cells this shape *would* occupy
         let canPlace = true;

         // Iterate through the shape pattern to find the top-leftmost block
         let firstBlockIndex = -1;
         for(let i = 0; i < shapePattern.length; ++i) {
             if (shapePattern[i] !== 0) {
                 firstBlockIndex = i;
                 break;
             }
         }
         if (firstBlockIndex === -1) { // Empty shape? Should not happen
             canPlace = false;
         } else {
             // Calculate the screen coordinates of the center of the top-leftmost block of the shape
             const firstBlockCol = firstBlockIndex % shapeWidthBlocks;
             const firstBlockRow = Math.floor(firstBlockIndex / shapeWidthBlocks);
             const firstBlockScreenX = shapeTopLeftScreenX + firstBlockCol * (this.ui.gridCellRenderSize + this.ui.gridCellRenderSpacing) + this.ui.gridCellRenderSize / 2;
             const firstBlockScreenY = shapeTopLeftScreenY + firstBlockRow * (this.ui.gridCellRenderSize + this.ui.gridCellRenderSpacing) + this.ui.gridCellRenderSize / 2;


             // Determine the grid cell corresponding to the top-leftmost block
             const topLeftGridCell = this.ui.screenToGridCoords(firstBlockScreenX, firstBlockScreenY);


             // Now, check placement relative to this anchor grid cell
             for (let i = 0; i < shapePattern.length; i++) {
                 if (shapePattern[i] !== 0) {
                     const blockColOffset = i % shapeWidthBlocks;
                     const blockRowOffset = Math.floor(i / shapeWidthBlocks);

                     const targetGridX = topLeftGridCell.x + blockColOffset - (firstBlockIndex % shapeWidthBlocks);
                     const targetGridY = topLeftGridCell.y + blockRowOffset - Math.floor(firstBlockIndex / shapeWidthBlocks);


                     // Check grid bounds and if cell is already filled
                     if (targetGridX < 0 || targetGridX >= Config.GRID_COUNT ||
                         targetGridY < 0 || targetGridY >= Config.GRID_COUNT ||
                         this.game.grid.cells[targetGridY][targetGridX].filled)
                     {
                         canPlace = false;
                         break; // Stop checking as soon as one block fails
                     } else {
                         potentialGridCells.push({ x: targetGridX, y: targetGridY });
                     }
                 }
             }
         }


         if (canPlace && potentialGridCells.length > 0) {
             // --- Place the shape ---
             const originalSlot = this.touchState.slot; // Keep track before resetting state

             this.game.placeShape(shapeIndex, potentialGridCells); // Let game logic handle score, line clear, saving etc.
             this.game.clearShapeSlot(originalSlot); // Clear the used slot AFTER placement
         } else {
             // Snap back animation could be added here if desired
             console.log("Cannot place shape here.");
         }

         // Reset touch state regardless of placement success
         this.touchState.id = null;
         this.touchState.slot = null;

         this.ui.signalNoRedrawNeeded(); // Stop continuous redraw after touch ends
          this.ui.requestRedraw(); // Request one final draw to show result
     }

}

// --- Main Application Setup ---

(function main() {
    // Service Worker Registration (Keep as is)
    if ("serviceWorker" in navigator) {
        navigator.serviceWorker.register("./sw.js").then(reg => {
            console.log("Service Worker Registered", reg);
        }).catch(err => {
            console.error("Service Worker Registration Failed:", err);
        });
    }

    // Create Core Components
    const game = new Game(Config.GRID_COUNT, Config.SHAPE_BATCH_LENGTH, SHAPES_DATA);
    const ui = new UI(null, game); // Pass null to auto-create canvas
    const inputHandler = new InputHandler(ui.canvas, game, ui);

    // Load initial state
    game.loadState();
    ui.refreshScreenSize(); // Ensure layout is correct after loading

    // Animation Loop
    let lastTimestamp = 0;
    function animationLoop(timestamp) {
         // Calculate delta time if needed for physics or smooth animations
         const deltaTime = timestamp - lastTimestamp;
         lastTimestamp = timestamp;

         if (ui.isRendering) { // Only draw if needed
             // Pass dragged shape info to UI draw function
             let draggedShapeInfo = null;
             if (inputHandler.touchState.id !== null) {
                 draggedShapeInfo = {
                     x: inputHandler.touchState.currentX,
                     y: inputHandler.touchState.currentY,
                     offset: inputHandler.touchState.offsetY, // Pass the calculated offset
                     slot: inputHandler.touchState.slot
                 };
             }
             // It might be cleaner for drawShapes to access inputHandler directly?
             // Or pass necessary info explicitly. Let's pass it.
             ui.drawShapes(draggedShapeInfo); // Redraw shapes (potentially moving)
             ui.draw(); // Redraw the entire UI
         }

        requestAnimationFrame(animationLoop);
    }

    // Start the loop
    requestAnimationFrame(animationLoop);

    // Handle Resize
    window.addEventListener('resize', () => {
        ui.refreshScreenSize();
        ui.requestRedraw(); // Ensure redraw on resize
    });

})(); // Immediately Invoke Function Expression (IIFE)