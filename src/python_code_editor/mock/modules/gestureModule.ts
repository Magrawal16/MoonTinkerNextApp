import type { PyodideInterface } from "pyodide";
import { MicrobitEventEmitter } from "./eventEmitter";

interface HandlerProxy {
    wrapperProxy: any;
    persistentHandler: any;
}

export class GestureInstance {
    constructor(private name: string) {}

    getName(): string {
        return this.name;
    }

    toString(): string {
        return this.name;
    }
}

function normalizeGestureArg(gesture: any): string {
    try {
        if (!gesture && gesture !== 0) return "";
        if (typeof gesture === "string") return gesture;
        if (typeof gesture.getName === "function") return String(gesture.getName());
        if (typeof gesture.toString === "function") return String(gesture.toString());
        if (gesture.name && typeof gesture.name === "string") return gesture.name;
        return String(gesture);
    } catch {
        return "";
    }
}

export class GestureModule {
    private readonly handlers: Record<string, HandlerProxy[]> = {};
    private readonly active: Record<string, boolean> = {};
    private readonly clearTimers: Record<string, ReturnType<typeof setTimeout>> = {};

    private unsubscribe: (() => void) | null = null;

    public readonly Gesture = {
        SHAKE: new GestureInstance("shake"),
        LOGO_UP: new GestureInstance("logo_up"),
        LOGO_DOWN: new GestureInstance("logo_down"),
        SCREEN_UP: new GestureInstance("screen_up"),
        SCREEN_DOWN: new GestureInstance("screen_down"),
        TILT_LEFT: new GestureInstance("tilt_left"),
        TILT_RIGHT: new GestureInstance("tilt_right"),
        FREE_FALL: new GestureInstance("free_fall"),
        THREE_G: new GestureInstance("3g"),
        SIX_G: new GestureInstance("6g"),
        EIGHT_G: new GestureInstance("8g"),
    };

    constructor(
        private pyodide: PyodideInterface,
        private eventEmitter: MicrobitEventEmitter
    ) {
        this.unsubscribe = this.eventEmitter.subscribe((evt: any) => {
            if (!evt) return;
            if (evt.type === "gesture" && typeof evt.gesture === "string") {
                void this.handleGesture(evt.gesture);
            }
            if (evt.type === "reset") {
                this.reset();
            }
        });
    }

    onGesture(gesture: any, handler: any) {
        const name = normalizeGestureArg(gesture);
        if (!name) return;

        const { create_proxy } = this.pyodide.pyimport("pyodide.ffi");
        const persistentHandler = create_proxy(handler);
        const wrapperProxy = create_proxy(() => {
            try {
                return Promise.resolve(persistentHandler());
            } catch (err) {
                console.error("Error in gesture handler:", err);
            }
        });

        if (!this.handlers[name]) this.handlers[name] = [];
        this.handlers[name].push({ wrapperProxy, persistentHandler });
    }

    isGesture(gesture: any): boolean {
        const name = normalizeGestureArg(gesture);
        if (!name) return false;
        return !!this.active[name];
    }

    private markActive(name: string, holdMs = 650) {
        this.active[name] = true;
        if (this.clearTimers[name]) {
            clearTimeout(this.clearTimers[name]);
        }
        this.clearTimers[name] = setTimeout(() => {
            this.active[name] = false;
            delete this.clearTimers[name];
        }, holdMs);
    }

    private async handleGesture(name: string) {
        this.markActive(name);
        const list = this.handlers[name] || [];
        for (const h of list) {
            await h.wrapperProxy();
        }
    }

    cleanupHandlers() {
        for (const key of Object.keys(this.handlers)) {
            for (const h of this.handlers[key]) {
                h.wrapperProxy.destroy?.();
                h.persistentHandler.destroy?.();
            }
        }
        for (const key of Object.keys(this.clearTimers)) {
            clearTimeout(this.clearTimers[key]);
        }
        for (const key of Object.keys(this.handlers)) delete this.handlers[key];
        for (const key of Object.keys(this.active)) delete this.active[key];
        for (const key of Object.keys(this.clearTimers)) delete this.clearTimers[key];
    }

    reset() {
        this.cleanupHandlers();
    }

    dispose() {
        this.unsubscribe?.();
        this.unsubscribe = null;
        this.cleanupHandlers();
    }

    getAPI() {
        return {
            on_gesture: this.onGesture.bind(this),
            is_gesture: this.isGesture.bind(this),
        };
    }
}
