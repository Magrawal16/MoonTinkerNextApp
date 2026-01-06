import type { PyodideInterface } from "pyodide";
import type { MicrobitEvent } from "./types";

export interface HandlerProxy {
    wrapperProxy: any;
    persistentHandler: any;
}

export interface ButtonState {
    A: boolean;
    B: boolean;
    AB: boolean;
}

export interface PinState {
    digital: number;
    analog: number;
}

export interface ExternalPinValues {
    [pin: string]: PinState;
}

export interface PinController {
    onDigitalWrite: (pin: string, cb: (value: number) => void) => () => void;
    setDigitalValue: (pin: string, value: number) => void;
    setAnalogValue: (pin: string, value: number) => void;
}

export interface ModuleConstructor {
    pyodide: PyodideInterface;
    eventEmitter: EventEmitter;
}

export interface EventEmitter {
    subscribe: (callback: (event: MicrobitEvent) => void) => () => void;
    emit: (event: MicrobitEvent) => void;
}

export interface StateSnapshot {
    pins: Record<string, PinState>;
    leds: number[][];
    buttons: ButtonState;
    logo: boolean;
}

export interface PythonModule {
    pins: {
        digital_write_pin: (pin: string, value: number) => void;
        digital_read_pin: (pin: string) => number;
        analog_write_pin: (pin: string, value: number) => void;
        read_analog_pin: (pin: string) => number;
    };
    led: {
        plot: (x: number, y: number) => void;
        unplot: (x: number, y: number) => void;
        point: (x: number, y: number) => boolean;
        toggle: (x: number, y: number) => void;
        plot_brightness: (x: number, y: number, brightness: number) => void;
    };
    input: {
        button_is_pressed: (button: any) => boolean;
        on_button_pressed: (button: any, handler: () => void) => void;
        on_logo_pressed: (handler: () => void) => void;
        on_logo_released: (handler: () => void) => void;
        logo_is_touched: () => boolean;
        _clear: () => void;
    };
    Button: {
        A: any;
        B: any;
        AB: any;
    };
    DigitalPin: Record<string, string>;
    basic: {
        show_string: (text: string, interval?: number) => Promise<void>;
        show_number: (value: string | number) => Promise<void>;
        show_leds: (pattern: string) => Promise<void>;
        forever: (callback: () => void) => void;
        pause: (ms: number) => Promise<void>;
    };
    music: {
        play_tone: (frequency: number, durationBeats: number) => Promise<void>;
        ring_tone: (frequency: number) => void;
        rest: (durationBeats: number) => Promise<void>;
        stop: () => void;
    };
}