import type { PyodideInterface } from "pyodide";
import { MicrobitEventEmitter } from "./eventEmitter";

export class PinsModule {
    private pinStates: Record<string, { digital: number; analog: number }> = {};
    private digitalWriteListeners: Record<string, Set<(value: number) => void>> = {};
    private externalPinValues: Record<
        string,
        { digital: number; analog: number }
    > = {};

    public readonly DigitalPin: Record<string, string> = {};

    constructor(
        private pyodide: PyodideInterface,
        private eventEmitter: MicrobitEventEmitter
    ) {
        for (let i = 0; i <= 20; i++) {
            const pin = `P${i}`;
            this.pinStates[pin] = { digital: 0, analog: 0 };
            this.DigitalPin[pin] = pin;
        }
    }

    digitalWritePin(pin: string, value: number) {
        this.pinStates[pin].digital = value;
        this.eventEmitter.emit({
            type: "pin-change",
            pin,
            value,
            pinType: "digital",
        });
        const listeners = this.digitalWriteListeners[pin];
        if (listeners) for (const cb of listeners) cb(value);
    }

    analogWritePin(pin: string, value: number) {
        this.pinStates[pin].analog = value;
        this.eventEmitter.emit({
            type: "pin-change",
            pin,
            value,
            pinType: "analog",
        });
    }

    readDigitalPin(pin: string) {
        if (this.externalPinValues[pin]?.digital !== undefined) {
            return this.externalPinValues[pin].digital;
        }
        return this.pinStates[pin].digital;
    }

    readAnalogPin(pin: string) {
        if (this.externalPinValues[pin]?.analog !== undefined) {
            return this.externalPinValues[pin].analog;
        }
        return this.pinStates[pin].analog;
    }

    setExternalPinValue(
        pin: string,
        value: number,
        type: "digital" | "analog" = "digital"
    ) {
        if (!this.externalPinValues[pin]) {
            this.externalPinValues[pin] = { digital: 0, analog: 0 };
        }
        this.externalPinValues[pin][type] = value;
    }

    getPinController() {
        return {
            onDigitalWrite: (pin: string, cb: (value: number) => void) => {
                if (!this.digitalWriteListeners[pin]) {
                    this.digitalWriteListeners[pin] = new Set();
                }
                this.digitalWriteListeners[pin].add(cb);
                return () => this.digitalWriteListeners[pin].delete(cb);
            },
            setDigitalValue: (pin: string, value: number) => {
                this.setExternalPinValue(pin, value, "digital");
            },
            setAnalogValue: (pin: string, value: number) => {
                this.setExternalPinValue(pin, value, "analog");
            },
        };
    }

    reset() {
        for (const pin in this.pinStates) {
            this.pinStates[pin] = { digital: 0, analog: 0 };
        }
        this.externalPinValues = {};
    }

    getState() {
        return { ...this.pinStates };
    }

    getAPI() {
        return {
            digital_write_pin: this.digitalWritePin.bind(this),
            digital_read_pin: this.readDigitalPin.bind(this),
            analog_write_pin: this.analogWritePin.bind(this),
            read_analog_pin: this.readAnalogPin.bind(this),
            onDigitalWrite: (pin: string, cb: (value: number) => void) => {
                if (!this.digitalWriteListeners[pin]) {
                    this.digitalWriteListeners[pin] = new Set();
                }
                this.digitalWriteListeners[pin].add(cb);
                return () => this.digitalWriteListeners[pin].delete(cb);
            },
        };
    }
}