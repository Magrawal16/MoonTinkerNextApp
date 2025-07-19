import type { PyodideInterface } from "pyodide";

export type MicrobitEvent =
  | {
      type: "pin-change";
      pin: string;
      value: number;
      pinType: "digital" | "analog";
    }
  | { type: "led-change"; x: number; y: number; value: number }
  | { type: "button-press"; button: "A" | "B" }
  | { type: "reset" };

type MicrobitEventCallback = (event: MicrobitEvent) => void;

class MicrobitEventEmitter {
  private listeners: Set<MicrobitEventCallback> = new Set();

  subscribe(callback: MicrobitEventCallback) {
    this.listeners.add(callback);
    return () => this.listeners.delete(callback);
  }

  emit(event: MicrobitEvent) {
    for (const cb of this.listeners) {
      cb(event);
    }
  }
}

export class MicrobitSimulator {
  private pyodide: PyodideInterface;
  private eventEmitter = new MicrobitEventEmitter();
  private ledMatrix: boolean[][] = Array.from({ length: 5 }, () =>
    Array(5).fill(false)
  );
  private pinStates: Record<string, { digital: number; analog: number }> = {};
  private buttonStates: Record<"A" | "B", boolean> = { A: false, B: false };
  private inputHandlers: Record<"A" | "B", any[]> = { A: [], B: [] };

  public readonly DigitalPin: Record<string, string> = {};
  public readonly pins = {
    digital_write_pin: this.digitalWritePin.bind(this),
    read_digital_pin: this.readDigitalPin.bind(this),
    analog_write_pin: this.analogWritePin.bind(this),
    read_analog_pin: this.readAnalogPin.bind(this),
  };
  public readonly led = {
    plot: this.plot.bind(this),
    unplot: this.unplot.bind(this),
    point: this.point.bind(this),
  };
  public readonly input = {
    on_button_pressed: this.onButtonPressed.bind(this),
    _press_button: this.pressButton.bind(this),
    _clear: this.clearInputs.bind(this),
  };

  constructor(pyodide: PyodideInterface) {
    this.pyodide = pyodide;

    for (let i = 0; i <= 20; i++) {
      const pin = `P${i}`;
      this.pinStates[pin] = { digital: 0, analog: 0 };
      this.DigitalPin[pin] = pin;
    }
  }

  subscribe(callback: MicrobitEventCallback) {
    return this.eventEmitter.subscribe(callback);
  }

  reset() {
    for (const pin in this.pinStates) {
      this.pinStates[pin] = { digital: 0, analog: 0 };
    }
    for (let x = 0; x < 5; x++)
      for (let y = 0; y < 5; y++) this.ledMatrix[x][y] = false;
    this.buttonStates = { A: false, B: false };
    this.clearInputs();
    this.eventEmitter.emit({ type: "reset" });
    console.log("Microbit state reset");
  }

  private digitalWritePin(pin: string, value: number) {
    this.pinStates[pin].digital = value;
    this.eventEmitter.emit({
      type: "pin-change",
      pin,
      value,
      pinType: "digital",
    });
  }

  private readDigitalPin(pin: string) {
    return this.pinStates[pin].digital;
  }

  private analogWritePin(pin: string, value: number) {
    this.pinStates[pin].analog = value;
  }

  private readAnalogPin(pin: string) {
    return this.pinStates[pin].analog;
  }

  private plot(x: number, y: number) {
    this.ledMatrix[x][y] = true;
    this.eventEmitter.emit({ type: "led-change", x, y, value: 1 });
  }

  private unplot(x: number, y: number) {
    this.ledMatrix[x][y] = false;
    this.eventEmitter.emit({ type: "led-change", x, y, value: 0 });
  }

  private point(x: number, y: number) {
    return this.ledMatrix[x][y];
  }

  private onButtonPressed(button: "A" | "B", handler: any) {
    const proxy = this.pyodide.pyimport("pyodide.ffi.create_proxy")(handler);
    this.inputHandlers[button].push(proxy);
  }

  private pressButton(button: "A" | "B") {
    this.buttonStates[button] = true;
    this.inputHandlers[button].forEach((h) => h());
  }

  private clearInputs() {
    this.inputHandlers.A.forEach((p) => p.destroy?.());
    this.inputHandlers.B.forEach((p) => p.destroy?.());
    this.inputHandlers = { A: [], B: [] };
  }

  getStateSnapshot() {
    return {
      pins: { ...this.pinStates },
      leds: this.ledMatrix.map((row) => [...row]),
      buttons: { ...this.buttonStates },
    };
  }

  getPythonModule() {
    return {
      pins: this.pins,
      led: this.led,
      input: this.input,
      DigitalPin: this.DigitalPin,
    };
  }
}
