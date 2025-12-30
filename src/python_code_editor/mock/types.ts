export type MicrobitEvent =
    | {
        type: "pin-change";
        pin: string;
        value: number;
        pinType: "digital" | "analog";
    }
    | { type: "led-change"; x: number; y: number; value: number }
    | { type: "button-press"; button: "A" | "B" | "AB" }
    | { type: "logo-touch"; state: "pressed" | "released" }
    | { type: "reset" }
    | {
        type: "gesture";
        gesture:
            | "shake"
            | "logo_up"
            | "logo_down"
            | "screen_up"
            | "screen_down"
            | "tilt_left"
            | "tilt_right"
            | "free_fall"
            | "3g"
            | "6g"
            | "8g";
    };

export type PinAPI = {
    digital_write_pin: (pin: string, value: number) => void;
    digital_read_pin: (pin: string) => number;
    analog_write_pin: (pin: string, value: number) => void;
    read_analog_pin: (pin: string) => number;
    onDigitalWrite: (pin: string, cb: (value: number) => void) => () => boolean;
};

export type LEDAPI = {
    plot: (x: number, y: number) => void;
    unplot: (x: number, y: number) => void;
    point: (x: number, y: number) => boolean;
    toggle: (x: number, y: number) => void;
    plot_brightness: (x: number, y: number, brightness: number) => void;
};

export type BasicAPI = {
    show_string: (text: string, interval?: number) => Promise<void>;
    forever: (callback: () => void) => void;
    pause: (ms: number) => Promise<void>;
};

export type ButtonAPI = {
    button_is_pressed: (button: any) => boolean;
    on_button_pressed: (button: any, handler: () => void) => void;
};

export type LogoAPI = {
    on_logo_pressed: (handler: () => void) => void;
    on_logo_released: (handler: () => void) => void;
    logo_is_touched: () => boolean;
};