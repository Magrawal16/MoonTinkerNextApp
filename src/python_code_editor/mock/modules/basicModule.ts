import type { PyodideInterface } from "pyodide";
import { LEDModule } from "./ledModule";
import { CHARACTER_PATTERNS } from "../characterPatterns";

export class BasicModule {
    private foreverCallbacks: Set<any> = new Set();
    private hasForeverLoop: boolean = false; // Track if a forever loop is already running
    // Serialize long-running display animations to avoid spamming from forever()
    private currentDisplayToken = 0;
    private displayPromise: Promise<void> | null = null;
    private displayPromiseResolve: (() => void) | null = null;

    constructor(
        private pyodide: PyodideInterface,
        private ledModule: LEDModule
    ) { }

    async showString(text: string, interval: number = 150): Promise<void> {
        // Start a new display session; cancel previous by advancing the token
        const myToken = ++this.currentDisplayToken;
        // Create/replace the display completion promise for the scheduler
        this.displayPromise = new Promise<void>((resolve) => {
            this.displayPromiseResolve = resolve;
        });

        // If a single valid character was passed, render it statically (no scrolling)
        if (typeof text === "string" && text.length === 1 && CHARACTER_PATTERNS[text]) {
            const pattern = CHARACTER_PATTERNS[text];
            this.ledModule.clearDisplay();
            for (let row = 0; row < 5; row++) {
                for (let col = 0; col < 5; col++) {
                    const on = !!(pattern[row] && pattern[row][col]);
                    if (on) this.ledModule.plot(col, row);
                    else this.ledModule.unplot(col, row);
                }
            }
            // Add a small delay so single characters are visible before next operation
            await new Promise((resolve) => setTimeout(resolve, 400));
            // Resolve if this is still the active display
            if (myToken === this.currentDisplayToken) this.displayPromiseResolve?.();
            return;
        }

        // Existing scrolling implementation for strings (unchanged)
        const validChars = text
            .split("")
            .filter((char) => CHARACTER_PATTERNS[char]);

        if (validChars.length === 0) {
            this.ledModule.clearDisplay();
            return;
        }

        const scrollPattern: boolean[][] = [];

        validChars.forEach((char, index) => {
            const pattern = CHARACTER_PATTERNS[char];
            pattern.forEach((row, rowIndex) => {
                if (!scrollPattern[rowIndex]) {
                    scrollPattern[rowIndex] = [];
                }
                scrollPattern[rowIndex].push(...row.map((v) => Boolean(v)));
                if (index < validChars.length - 1) {
                    scrollPattern[rowIndex].push(false);
                }
            });
        });

        for (let rowIndex = 0; rowIndex < 5; rowIndex++) {
            for (let i = 0; i < 5; i++) {
                scrollPattern[rowIndex].push(false);
            }
        }

        let currentOffset = 0;
        const maxOffset = scrollPattern[0].length;

        while (currentOffset < maxOffset) {
            // Abort early if a newer display started
            if (myToken !== this.currentDisplayToken) {
                this.displayPromiseResolve?.();
                return;
            }
            this.ledModule.clearDisplay();

            for (let row = 0; row < 5; row++) {
                for (let col = 0; col < 5; col++) {
                    const patternCol = currentOffset + col;
                    if (
                        patternCol < scrollPattern[row].length &&
                        scrollPattern[row][patternCol]
                    ) {
                        this.ledModule.plot(col, row);
                    }
                }
            }

            currentOffset++;
            if (currentOffset < maxOffset) {
                await new Promise((resolve) => setTimeout(resolve, interval));
            }
        }
        // Finish and let scheduler continue
        if (myToken === this.currentDisplayToken) {
            this.displayPromiseResolve?.();
            // Only clear display if this is still the active display operation
            this.ledModule.clearDisplay();
        }
    }

    /**
     * Show a number (integer or decimal). If the input string contains any alphabetic
     * characters the value is treated as 0. The numeric value is converted to string
     * and displayed using showString (single digit renders statically; longer values scroll).
     */
    async showNumber(value: string | number): Promise<void> {
        let num: number;
        if (typeof value === "string") {
            // If any alphabetic characters are present, treat as 0
            if (/[A-Za-z]/.test(value)) {
                num = 0;
            } else {
                const cleaned = value.replace(/,/g, "").trim();
                num = Number(cleaned);
                if (!Number.isFinite(num)) num = 0;
            }
        } else if (typeof value === "number") {
            num = value;
            if (!Number.isFinite(num)) num = 0;
        } else {
            num = 0;
        }

        // Format number string: keep decimal for non-integers
        const str = Number.isInteger(num) ? num.toString() : num.toString();
        // Await the display operation to ensure it completes before moving on
        await this.showString(str);
    }

    /**
     * Show a 5x5 LED pattern from a triple-quoted string using '#' for on and '.' (or space) for off.
     * Compatible with MakeCode's Python form:
     *   basic.show_leds("""
     *   . # . . .
     *   . . # . .
     *   . . . # .
     *   . . . . #
     *   # . . . .
     *   """)
     */
    async showLeds(pattern: string): Promise<void> {
        if (typeof pattern !== "string") {
            return;
        }
        
        // Start a new display session; cancel previous by advancing the token
        const myToken = ++this.currentDisplayToken;
        // Create/replace the display completion promise for the scheduler
        this.displayPromise = new Promise<void>((resolve) => {
            this.displayPromiseResolve = resolve;
        });
        
        // Normalize line endings and extract only '#' and '.' markers
        const markers = pattern
            .replace(/\r/g, "")
            // Remove anything that's not a marker or newline
            .replace(/[^#.\n]/g, "")
            .split("")
            .filter((c) => c === "#" || c === ".");

        // If we didn't get 25 markers, try a line-based approach (take first 5 lines with 5 markers each)
        let cells: ("#" | ".")[] = [];
        if (markers.length >= 25) {
            cells = markers.slice(0, 25) as ("#" | ".")[];
        } else {
            const lines = pattern.replace(/\r/g, "").split(/\n/).filter(Boolean);
            for (const line of lines.slice(0, 5)) {
                const row = (line.match(/[#.]/g) || []).slice(0, 5) as ("#" | ".")[];
                while (row.length < 5) row.push(".");
                cells.push(...row);
                if (cells.length >= 25) break;
            }
            while (cells.length < 25) cells.push(".");
        }

        // Apply to LED matrix, row-major order
        this.ledModule.clearDisplay();
        for (let y = 0; y < 5; y++) {
            for (let x = 0; x < 5; x++) {
                const idx = y * 5 + x;
                if (cells[idx] === "#") this.ledModule.plot(x, y);
                else this.ledModule.unplot(x, y);
            }
        }
        
        // Add a small delay so the pattern is visible before next operation
        await new Promise((resolve) => setTimeout(resolve, 400));
        // Resolve if this is still the active display
        if (myToken === this.currentDisplayToken) this.displayPromiseResolve?.();
    }

    forever(callback: () => void) {
        // Only allow one forever loop - ignore subsequent calls
        if (this.hasForeverLoop) {
            console.warn("Multiple forever loops detected. Only the first forever loop will run.");
            return;
        }
        this.hasForeverLoop = true;
        const proxy = this.pyodide.pyimport("pyodide.ffi.create_proxy")(callback);
        this.foreverCallbacks.add(proxy);
        this.startIndividualForeverLoop(proxy);
    }

    private startIndividualForeverLoop(callback: any) {
        const runCallback = async () => {
            // If this callback has been removed/destroyed, stop the loop immediately
            if (!this.foreverCallbacks.has(callback)) return;
            try {
                // Wait for any ongoing display operation to complete first
                if (this.displayPromise) {
                    try { await this.displayPromise; } catch (_) { /* no-op */ }
                }
                await this.pause(300);
                await callback();
                // If a display animation is running (e.g., show_string scrolling),
                // wait for it to complete before scheduling the next tick. This avoids
                // stacking animations when forever() body triggers display repeatedly.
                if (this.displayPromise) {
                    try { await this.displayPromise; } catch (_) { /* no-op */ }
                }
            } catch (error: any) {
                // If the PyProxy was destroyed (e.g., due to reset), stop the loop silently
                const msg = String(error?.message || error || "");
                if (msg.includes("already been destroyed")) {
                    return;
                }
                console.error("Error in forever loop:", error);
            }
            // Do not reschedule if this callback was removed in the interim
            if (!this.foreverCallbacks.has(callback)) return;
            setTimeout(runCallback, 20);
        };
        // Start immediately but will wait for any display promise inside runCallback
        setTimeout(runCallback, 0);
    }

    async pause(ms: number) {
        return new Promise<void>((resolve) => setTimeout(resolve, ms));
    }

    reset() {
        // Cancel any scheduled forever callbacks
        this.foreverCallbacks.forEach((callback) => {
            if (callback.destroy) {
                callback.destroy();
            }
        });
        this.foreverCallbacks.clear();
        this.hasForeverLoop = false; // Reset the forever loop flag
        // Abort any in-progress display (e.g., scrolling show_string)
        this.currentDisplayToken++;
        try { this.displayPromiseResolve?.(); } catch (_) { }
        this.displayPromise = null;
        this.displayPromiseResolve = null;
        // Clear LED matrix immediately
        this.ledModule.clearDisplay();
    }

    getAPI() {
        return {
            show_string: this.showString.bind(this),
            show_number: this.showNumber.bind(this),
            show_leds: this.showLeds.bind(this),
            forever: this.forever.bind(this),
            pause: this.pause.bind(this),
        };
    }
}