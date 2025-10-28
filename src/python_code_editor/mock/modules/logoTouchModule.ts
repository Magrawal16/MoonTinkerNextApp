import type { PyodideInterface } from "pyodide";
import { MicrobitEventEmitter } from "./eventEmitter";

interface HandlerProxy {
    wrapperProxy: any;
    persistentHandler: any;
}

export class LogoTouchModule {
    private logoTouched = false;
    private logoPressedHandlers: HandlerProxy[] = [];
    private logoReleasedHandlers: HandlerProxy[] = [];

    constructor(
        private pyodide: PyodideInterface,
        private eventEmitter: MicrobitEventEmitter
    ) { }

    onLogoPressed(handler: any) {
        const { create_proxy } = this.pyodide.pyimport("pyodide.ffi");
        const persistentHandler = create_proxy(handler);
        const wrapperProxy = create_proxy(() => {
            try {
                return Promise.resolve(persistentHandler());
            } catch (err) {
                console.error("Error in logo pressed handler:", err);
            }
        });
        this.logoPressedHandlers.push({ wrapperProxy, persistentHandler });
    }

    onLogoReleased(handler: any) {
        const { create_proxy } = this.pyodide.pyimport("pyodide.ffi");
        const persistentHandler = create_proxy(handler);
        const wrapperProxy = create_proxy(() => {
            try {
                return Promise.resolve(persistentHandler());
            } catch (err) {
                console.error("Error in logo released handler:", err);
            }
        });
        this.logoReleasedHandlers.push({ wrapperProxy, persistentHandler });
    }

    logoIsTouched(): boolean {
        return this.logoTouched;
    }

    async pressLogo() {
        this.logoTouched = true;
        for (const h of this.logoPressedHandlers) {
            await h.wrapperProxy();
        }
        this.eventEmitter.emit({ type: "logo-touch", state: "pressed" });
    }

    async releaseLogo() {
        this.logoTouched = false;
        for (const h of this.logoReleasedHandlers) {
            await h.wrapperProxy();
        }
        this.eventEmitter.emit({ type: "logo-touch", state: "released" });
    }

    cleanupHandlers() {
        this.logoPressedHandlers.forEach((h) => {
            h.wrapperProxy.destroy?.();
            h.persistentHandler.destroy?.();
        });
        this.logoReleasedHandlers.forEach((h) => {
            h.wrapperProxy.destroy?.();
            h.persistentHandler.destroy?.();
        });
        this.logoPressedHandlers = [];
        this.logoReleasedHandlers = [];
    }

    reset() {
        this.logoTouched = false;
        this.cleanupHandlers();
    }

    getState() {
        return this.logoTouched;
    }

    getAPI() {
        return {
            on_logo_pressed: this.onLogoPressed.bind(this),
            on_logo_released: this.onLogoReleased.bind(this),
            logo_is_touched: this.logoIsTouched.bind(this),
        };
    }
}