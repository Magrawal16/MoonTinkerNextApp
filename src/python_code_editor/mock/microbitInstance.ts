// microbitInstance.tsx

import type { PyodideInterface } from "pyodide";
import { CHARACTER_PATTERNS } from "./characterPatterns";

export type MicrobitEvent =
  | {
      type: "pin-change";
      pin: string;
      value: number;
      pinType: "digital" | "analog";
    }
  | { type: "led-change"; x: number; y: number; value: number }
  | { type: "button-press"; button: "A" | "B" | "AB" }
  | { type: "logo-touch"; state: "pressed" | "released" } // <-- NEW
  | { type: "reset" };

type MicrobitEventCallback = (event: MicrobitEvent) => void;

interface HandlerProxy {
  wrapperProxy: any;
  persistentHandler: any;
}

class ButtonInstance {
  constructor(private name: "A" | "B" | "AB") {}

  getName(): "A" | "B" | "AB" {
    return this.name;
  }

  toString(): string {
    return this.name;
  }
}

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
  private digitalWriteListeners: Record<string, Set<(value: number) => void>> =
    {};

  // --- NEW: Logo touch state + handlers
  private logoTouched = false;
  private logoPressedHandlers: HandlerProxy[] = [];
  private logoReleasedHandlers: HandlerProxy[] = [];
  // ---

  public readonly pins = {
    digital_write_pin: (pin: string, value: number) => {
      // Use the unified path that emits events and notifies listeners
      this.digitalWritePin(pin, value);
      if (value === 1) {
        this.triggerPinHigh(pin);
      }
    },
    digital_read_pin: (pin: string) => {
      // Always return dummy value (simulate echo)
      return 1; // or 0, as needed for demo
    },
    analog_write_pin: this.analogWritePin.bind(this),
    read_analog_pin: this.readAnalogPin.bind(this),

    // NEW: subscribe to writes on a specific digital pin
    onDigitalWrite: (pin: string, cb: (value: number) => void) => {
      if (!this.digitalWriteListeners[pin])
        this.digitalWriteListeners[pin] = new Set();
      this.digitalWriteListeners[pin].add(cb);
      return () => this.digitalWriteListeners[pin].delete(cb);
    },
  };

  public readonly TRIGG = {
    digital_write_pin: this.digitalWritePin.bind(this),
  };

  public readonly ECHO = {
    digital_read_pin: this.readDigitalPin.bind(this),
  };

  // NEW: Allow external components to set pin values (for sensor simulation)
  private externalPinValues: Record<
    string,
    { digital: number; analog: number }
  > = {};

  // Method for external components (like sensors) to set pin values
  public setExternalPinValue(
    pin: string,
    value: number,
    type: "digital" | "analog" = "digital"
  ) {
    if (!this.externalPinValues[pin]) {
      this.externalPinValues[pin] = { digital: 0, analog: 0 };
    }
    this.externalPinValues[pin][type] = value;
  }

  // Update the read methods to check external values first
  private readDigitalPin(pin: string) {
    // Check if external component has set a value for this pin
    if (this.externalPinValues[pin]?.digital !== undefined) {
      return this.externalPinValues[pin].digital;
    }
    return this.pinStates[pin].digital;
  }

  private readAnalogPin(pin: string) {
    // Check if external component has set a value for this pin
    if (this.externalPinValues[pin]?.analog !== undefined) {
      return this.externalPinValues[pin].analog;
    }
    return this.pinStates[pin].analog;
  }

  // NEW: Method to get access to pin operations for external components
  public getPinController() {
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

  private digitalWritePin(pin: string, value: number) {
    this.pinStates[pin].digital = value;
    // notify generic event stream
    this.eventEmitter.emit({
      type: "pin-change",
      pin,
      value,
      pinType: "digital",
    });
    // NEW: notify direct listeners
    const listeners = this.digitalWriteListeners[pin];
    if (listeners) for (const cb of listeners) cb(value);
  }

  private pyodide: PyodideInterface;
  private eventEmitter = new MicrobitEventEmitter();
  private ledMatrix: boolean[][] = Array.from({ length: 5 }, () =>
    Array(5).fill(false)
  );
  private pinStates: Record<string, { digital: number; analog: number }> = {};
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
  private foreverCallbacks: Set<any> = new Set();

  public readonly Button = {
    A: new ButtonInstance("A"),
    B: new ButtonInstance("B"),
    AB: new ButtonInstance("AB"),
  };

  public readonly DigitalPin: Record<string, string> = {};

  public readonly led = {
    plot: this.plot.bind(this),
    unplot: this.unplot.bind(this),
    point: this.point.bind(this),
    toggle: this.toggle.bind(this),
  };

  public readonly input = {
    on_button_pressed: this.onButtonPressed.bind(this),
    // --- NEW: logo touch registration (Python API)
    on_logo_pressed: this.onLogoPressed.bind(this),
    on_logo_released: this.onLogoReleased.bind(this),
    logo_is_touched: this.logoIsTouched.bind(this),
    _clear: this.clearInputs.bind(this),
  };
  public readonly basic = {
    show_string: this.showString.bind(this),
    forever: this.forever.bind(this),
    pause: this.pause.bind(this),
  };

  public readonly microbit = {
    get_distance: this.showString.bind(this),
    forever: this.forever.bind(this),
    pause: this.pause.bind(this),
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

  private async showString(
    text: string,
    interval: number = 150
  ): Promise<void> {
    const validChars = text
      .split("")
      .filter((char) => CHARACTER_PATTERNS[char]);

    if (validChars.length === 0) {
      this.clearDisplay();
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
      this.clearDisplay();

      for (let row = 0; row < 5; row++) {
        for (let col = 0; col < 5; col++) {
          const patternCol = currentOffset + col;
          if (
            patternCol < scrollPattern[row].length &&
            scrollPattern[row][patternCol]
          ) {
            this.plot(row, col); // This should plot horizontally
          }
        }
      }

      currentOffset++;
      if (currentOffset < maxOffset) {
        await new Promise((resolve) => setTimeout(resolve, interval));
      }
    }

    this.clearDisplay();
  }

  private forever(callback: () => void) {
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

  private async pause(ms: number) {
    return new Promise<void>((resolve) => setTimeout(resolve, ms));
  }

  private clearDisplay() {
    for (let y = 0; y < 5; y++) {
      for (let x = 0; x < 5; x++) {
        this.unplot(x, y);
      }
    }
  }

  reset() {
    this.foreverCallbacks.forEach((callback) => {
      if (callback.destroy) {
        callback.destroy();
      }
    });
    this.foreverCallbacks.clear();

    for (const pin in this.pinStates) {
      this.pinStates[pin] = { digital: 0, analog: 0 };
    }
    for (let y = 0; y < 5; y++) {
      for (let x = 0; x < 5; x++) {
        this.ledMatrix[y][x] = false;
      }
    }
    this.buttonStates = { A: false, B: false, AB: false };

    // --- NEW: reset logo
    this.logoTouched = false;
    this.cleanupLogoHandlers();
    // ---

    this.clearInputs();
    this.eventEmitter.emit({ type: "reset" });
  }

  // ----- NEW: LOGO TOUCH SUPPORT -----

  // Python: input.on_logo_pressed(handler)
  private onLogoPressed(handler: any) {
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

  // Python: input.on_logo_released(handler)
  private onLogoReleased(handler: any) {
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

  // Python: input.logo_is_touched()
  private logoIsTouched(): boolean {
    return this.logoTouched;
  }

  // JS API: programmatic press/release from UI
  public async pressLogo() {
    this.logoTouched = true;
    for (const h of this.logoPressedHandlers) {
      await h.wrapperProxy();
    }
    this.eventEmitter.emit({ type: "logo-touch", state: "pressed" });
  }

  public async releaseLogo() {
    this.logoTouched = false;
    for (const h of this.logoReleasedHandlers) {
      await h.wrapperProxy();
    }
    this.eventEmitter.emit({ type: "logo-touch", state: "released" });
  }

  private cleanupLogoHandlers() {
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

  private analogWritePin(pin: string, value: number) {
    this.pinStates[pin].analog = value;
    this.eventEmitter.emit({
      type: "pin-change",
      pin,
      value,
      pinType: "analog",
    });
  }

  private plot(x: number, y: number) {
    this.ledMatrix[y][x] = true;
    this.eventEmitter.emit({ type: "led-change", x, y, value: 1 });
  }

  private unplot(x: number, y: number) {
    this.ledMatrix[y][x] = false;
    this.eventEmitter.emit({ type: "led-change", x, y, value: 0 });
  }

  private toggle(x: number, y: number) {
    this.ledMatrix[y][x] = !this.ledMatrix[y][x];
    this.eventEmitter.emit({
      type: "led-change",
      x,
      y,
      value: this.ledMatrix[y][x] ? 1 : 0,
    });
  }

  private point(x: number, y: number) {
    return this.ledMatrix[y][x];
  }

  // Fixed onButtonPressed method
  private onButtonPressed(button: ButtonInstance, handler: any) {
    const buttonName = button.getName();

    const { create_proxy } = this.pyodide.pyimport("pyodide.ffi");

    // Create a persistent proxy for the handler to prevent automatic destruction
    const persistentHandler = create_proxy(handler);

    const wrapperProxy = create_proxy(() => {
      try {
        return Promise.resolve(persistentHandler()); // Use the persistent proxy
      } catch (err) {
        console.error("Error in button handler:", err);
      }
    });

    // Store both proxies so we can clean them up later
    this.inputHandlers[buttonName].push({
      wrapperProxy,
      persistentHandler,
    });
  }

  // Updated pressButton method
  public async pressButton(button: ButtonInstance | "A" | "B" | "AB") {
    const buttonName = typeof button === "string" ? button : button.getName();
    this.buttonStates[buttonName] = true;

    for (const handlerProxy of this.inputHandlers[buttonName]) {
      await handlerProxy.wrapperProxy(); // Use the wrapper proxy
    }

    this.eventEmitter.emit({ type: "button-press", button: buttonName });
  }

  // Updated clearInputs method
  private clearInputs() {
    this.inputHandlers.A.forEach((handlerProxy) => {
      handlerProxy.wrapperProxy.destroy?.();
      handlerProxy.persistentHandler.destroy?.();
    });
    this.inputHandlers.B.forEach((handlerProxy) => {
      handlerProxy.wrapperProxy.destroy?.();
      handlerProxy.persistentHandler.destroy?.();
    });
    this.inputHandlers.AB.forEach((handlerProxy) => {
      handlerProxy.wrapperProxy.destroy?.();
      handlerProxy.persistentHandler.destroy?.();
    });
    this.inputHandlers = { A: [], B: [], AB: [] };

    // --- NEW: also clear logo handlers
    this.cleanupLogoHandlers();
  }

  getStateSnapshot() {
    return {
      pins: { ...this.pinStates },
      leds: this.ledMatrix.map((row) => [...row]),
      buttons: { ...this.buttonStates },
      logo: this.logoTouched, // <-- NEW
    };
  }

  getPythonModule() {
    return {
      pins: this.pins,
      led: this.led,
      input: this.input,
      Button: this.Button,
      DigitalPin: this.DigitalPin,
      basic: this.basic,
    };
  }

  private triggerPinHigh(pin: string) {
    // Simulate ultrasonic trigger (for demo, emit event or log)
    // Example: emit event to UI or set a flag
    if (this.eventEmitter) {
      this.eventEmitter.emit({
        type: "pin-change",
        pin,
        value: 1,
        pinType: "digital",
      });
    }
    // You can also set a flag or perform other logic here
  }
}
