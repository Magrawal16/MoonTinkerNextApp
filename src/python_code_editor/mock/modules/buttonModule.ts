import type { PyodideInterface } from "pyodide";
import { MicrobitEventEmitter } from "./eventEmitter";
import type { MicrobitEvent } from "../types";

interface HandlerProxy {
    wrapperProxy: any;
    persistentHandler: any;
}

export class ButtonInstance {
    constructor(private name: "A" | "B" | "AB") { }

    getName(): "A" | "B" | "AB" {
        return this.name;
    }

    toString(): string {
        return this.name;
    }
}

export class ButtonModule {
    private buttonStates: Record<"A" | "B" | "AB", boolean> = {
        A: false,
        B: false,
        AB: false,
    };

    private inputHandlers: Record<"A" | "B" | "AB", HandlerProxy[]> = {
        A: [],
        B: [],
        AB: [],
    };

    public readonly Button = {
        A: new ButtonInstance("A"),
        B: new ButtonInstance("B"),
        AB: new ButtonInstance("AB"),
    };

    constructor(
        private pyodide: PyodideInterface,
        private eventEmitter: MicrobitEventEmitter
    ) { }

    buttonIsPressed(button: any): boolean {
        try {
            if (!button && button !== 0) return false;

            if (typeof button === "string") {
                const name = button as "A" | "B" | "AB";
                // Debug: record calls from Python or other callers
                try { console.debug(`[ButtonModule] buttonIsPressed(${String(name)}) => ${!!this.buttonStates[name]}`); } catch (e) { }
                return !!this.buttonStates[name];
            }

            if (typeof button.getName === "function") {
                const name = button.getName();
                return !!this.buttonStates[name as "A" | "B" | "AB"];
            }

            if (typeof button.toString === "function") {
                const s = String(button.toString());
                const m = s.match(/A|B|AB/);
                if (m) return !!this.buttonStates[m[0] as "A" | "B" | "AB"];
            }

            if (button.name && typeof button.name === "string") {
                const name = button.name;
                return !!this.buttonStates[name as "A" | "B" | "AB"];
            }

            return false;
        } catch (err) {
            console.warn("buttonIsPressed error:", err);
            return false;
        }
    }

    onButtonPressed(button: ButtonInstance, handler: any) {
        const buttonName = button.getName();
        const { create_proxy } = this.pyodide.pyimport("pyodide.ffi");
        const persistentHandler = create_proxy(handler);
        const wrapperProxy = create_proxy(() => {
            try {
                return Promise.resolve(persistentHandler());
            } catch (err) {
                console.error("Error in button handler:", err);
            }
        });

        this.inputHandlers[buttonName].push({
            wrapperProxy,
            persistentHandler,
        });
    }

    async pressButton(button: ButtonInstance | "A" | "B" | "AB") {
        const buttonName = typeof button === "string" ? button : button.getName();
        this.buttonStates[buttonName] = true;
        try { console.debug(`[ButtonModule] pressButton(${buttonName})`); } catch (e) { }

        for (const handlerProxy of this.inputHandlers[buttonName]) {
            await handlerProxy.wrapperProxy();
        }

        this.eventEmitter.emit({ type: "button-press", button: buttonName });
    }

    async releaseButton(button: ButtonInstance | "A" | "B" | "AB") {
        const buttonName = typeof button === "string" ? button : button.getName();
        this.buttonStates[buttonName] = false;
        try { console.debug(`[ButtonModule] releaseButton(${buttonName})`); } catch (e) { }
        this.eventEmitter.emit({ type: "button-release", button: buttonName });
    }

    clearInputs() {
        Object.keys(this.inputHandlers).forEach((button) => {
            this.inputHandlers[button as "A" | "B" | "AB"].forEach((handlerProxy) => {
                handlerProxy.wrapperProxy.destroy?.();
                handlerProxy.persistentHandler.destroy?.();
            });
        });
        this.inputHandlers = { A: [], B: [], AB: [] };
    }

    reset() {
        this.buttonStates = { A: false, B: false, AB: false };
        this.clearInputs();
    }

    getState() {
        return { ...this.buttonStates };
    }

    getAPI() {
        return {
            button_is_pressed: this.buttonIsPressed.bind(this),
            on_button_pressed: this.onButtonPressed.bind(this),
        };
    }
}