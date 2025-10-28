import type { PyodideInterface } from "pyodide";
import { LEDModule } from "./ledModule";
import { CHARACTER_PATTERNS } from "../characterPatterns";

export class BasicModule {
    private foreverCallbacks: Set<any> = new Set();

    constructor(
        private pyodide: PyodideInterface,
        private ledModule: LEDModule
    ) { }

    async showString(text: string, interval: number = 150): Promise<void> {
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

        this.ledModule.clearDisplay();
    }

    forever(callback: () => void) {
        const proxy = this.pyodide.pyimport("pyodide.ffi.create_proxy")(callback);
        this.foreverCallbacks.add(proxy);
        this.startIndividualForeverLoop(proxy);
    }

    private startIndividualForeverLoop(callback: any) {
        const runCallback = async () => {
            try {
                await callback();
            } catch (error) {
                console.error("Error in forever loop:", error);
            }
            setTimeout(runCallback, 20);
        };
        setTimeout(runCallback, 20);
    }

    async pause(ms: number) {
        return new Promise<void>((resolve) => setTimeout(resolve, ms));
    }

    reset() {
        this.foreverCallbacks.forEach((callback) => {
            if (callback.destroy) {
                callback.destroy();
            }
        });
        this.foreverCallbacks.clear();
    }

    getAPI() {
        return {
            show_string: this.showString.bind(this),
            forever: this.forever.bind(this),
            pause: this.pause.bind(this),
        };
    }
}