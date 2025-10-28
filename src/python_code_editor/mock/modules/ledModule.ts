import type { PyodideInterface } from "pyodide";
import { MicrobitEventEmitter } from "../modules/eventEmitter";

export class LEDModule {
    private ledMatrix: number[][] = Array.from({ length: 5 }, () =>
        Array(5).fill(0)
    );

    constructor(
        private pyodide: PyodideInterface,
        private eventEmitter: MicrobitEventEmitter
    ) { }

    plot(x: number, y: number) {
        this.ledMatrix[y][x] = 255;
        this.eventEmitter.emit({ type: "led-change", x, y, value: 255 });
    }

    unplot(x: number, y: number) {
        this.ledMatrix[y][x] = 0;
        this.eventEmitter.emit({ type: "led-change", x, y, value: 0 });
    }

    toggle(x: number, y: number) {
        this.ledMatrix[y][x] = this.ledMatrix[y][x] > 0 ? 0 : 255;
        this.eventEmitter.emit({
            type: "led-change",
            x,
            y,
            value: this.ledMatrix[y][x],
        });
    }

    point(x: number, y: number): boolean {
        return this.ledMatrix[y][x] > 0;
    }

    plot_brightness(x: number, y: number, brightness: number) {
        const b = Math.max(0, Math.min(255, Math.floor(brightness || 0)));
        this.ledMatrix[y][x] = b;
        this.eventEmitter.emit({ type: "led-change", x, y, value: b });
    }

    clearDisplay() {
        for (let y = 0; y < 5; y++) {
            for (let x = 0; x < 5; x++) {
                this.unplot(x, y);
            }
        }
    }

    reset() {
        for (let y = 0; y < 5; y++) {
            for (let x = 0; x < 5; x++) {
                this.ledMatrix[y][x] = 0;
            }
        }
    }

    getState() {
        return this.ledMatrix.map((row) => [...row]);
    }

    getAPI() {
        return {
            plot: this.plot.bind(this),
            unplot: this.unplot.bind(this),
            point: this.point.bind(this),
            toggle: this.toggle.bind(this),
            plot_brightness: this.plot_brightness.bind(this),
        };
    }
}