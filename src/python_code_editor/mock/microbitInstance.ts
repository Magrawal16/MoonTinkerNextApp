// Compatible microbitInstance.tsx that works with existing architecture

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
  | { type: "button-press"; button: "A" | "B" }
  | { type: "reset" }
  | { 
      type: "ultrasonic-trigger"; 
      trigPin: string; 
      echoPin: string; 
    };

type MicrobitEventCallback = (event: MicrobitEvent) => void;

class ButtonInstance {
  constructor(private name: "A" | "B") {}
  getName(): "A" | "B" { return this.name; }
  toString(): string { return this.name; }
}

class PinInstance {
  constructor(private pinName: string, private simulator: MicrobitSimulator) {}

  write_digital(value: number) {
    this.simulator.digitalWritePin(this.pinName, value);
  }

  read_digital(): number {
    return this.simulator.readDigitalPin(this.pinName);
  }

  write_analog(value: number) {
    this.simulator.analogWritePin(this.pinName, value);
  }

  read_analog(): number {
    return this.simulator.readAnalogPin(this.pinName);
  }
}

// Simple timing module that works with existing setup
class TimeModule {
  private startTime = Date.now() * 1000; // Convert to microseconds

  ticks_us(): number {
    return (Date.now() * 1000) - this.startTime;
  }

  ticks_diff(end: number, start: number): number {
    return end - start;
  }

  sleep_us(microseconds: number): Promise<void> {
    return new Promise(resolve => {
      setTimeout(resolve, microseconds / 1000);
    });
  }

  sleep(milliseconds: number): Promise<void> {
    return new Promise(resolve => {
      setTimeout(resolve, milliseconds);
    });
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
      try {
        cb(event);
      } catch (error) {
        console.error("Error in microbit event callback:", error);
      }
    }
  }
}

export class MicrobitSimulator {
  private digitalWriteListeners: Record<string, Set<(value: number) => void>> = {};
  private ultrasonicSensors: Map<string, {
    trigPin: string;
    echoPin: string;
    onTrigger: (trigPin: string, echoPin: string) => void;
  }> = new Map();

  public readonly pins = {
    digital_write_pin: this.digitalWritePin.bind(this),
    digital_read_pin: this.readDigitalPin.bind(this),
    analog_write_pin: this.analogWritePin.bind(this),
    read_analog_pin: this.readAnalogPin.bind(this),
    onDigitalWrite: (pin: string, cb: (value: number) => void) => {
      if (!this.digitalWriteListeners[pin]) this.digitalWriteListeners[pin] = new Set();
      this.digitalWriteListeners[pin].add(cb);
      return () => this.digitalWriteListeners[pin].delete(cb);
    },
  };

  private externalPinValues: Record<string, { digital: number; analog: number }> = {};
  private pyodide: PyodideInterface;
  private eventEmitter = new MicrobitEventEmitter();
  private ledMatrix: boolean[][] = Array.from({ length: 5 }, () => Array(5).fill(false));
  private pinStates: Record<string, { digital: number; analog: number }> = {};
  private buttonStates: Record<"A" | "B", boolean> = { A: false, B: false };
  private inputHandlers: Record<"A" | "B", any[]> = { A: [], B: [] };
  private foreverCallbacks: Set<any> = new Set();
  private triggerPatternDetector: Map<string, { lastHigh: number; pulseCount: number }> = new Map();

  public readonly Button = {
    A: new ButtonInstance("A"),
    B: new ButtonInstance("B"),
  };

  public readonly DigitalPin: Record<string, string> = {};

  // Create pin instances for direct access (pin0, pin1, etc.)
  public readonly pin0 = new PinInstance("P0", this);
  public readonly pin1 = new PinInstance("P1", this);
  public readonly pin2 = new PinInstance("P2", this);
  // Add more pins as needed...

  public readonly led = {
    plot: this.plot.bind(this),
    unplot: this.unplot.bind(this),
    point: this.point.bind(this),
    toggle: this.toggle.bind(this),
  };

  public readonly input = {
    on_button_pressed: this.onButtonPressed.bind(this),
    _clear: this.clearInputs.bind(this),
  };

  public readonly basic = {
    show_string: this.showString.bind(this),
    forever: this.forever.bind(this),
    pause: this.pause.bind(this),
  };

  public readonly time = new TimeModule();

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

  // Register an ultrasonic sensor with its TRIG and ECHO pins
  registerUltrasonicSensor(
    sensorId: string, 
    trigPin: string, 
    echoPin: string, 
    onTrigger: (trigPin: string, echoPin: string) => void
  ) {
    this.ultrasonicSensors.set(sensorId, { trigPin, echoPin, onTrigger });
    
    // Initialize trigger pattern detection for this pin
    this.triggerPatternDetector.set(trigPin, { lastHigh: 0, pulseCount: 0 });
    
    console.log(`Registered ultrasonic sensor ${sensorId} with TRIG:${trigPin}, ECHO:${echoPin}`);
  }

  unregisterUltrasonicSensor(sensorId: string) {
    const sensor = this.ultrasonicSensors.get(sensorId);
    if (sensor) {
      this.triggerPatternDetector.delete(sensor.trigPin);
      this.ultrasonicSensors.delete(sensorId);
      console.log(`Unregistered ultrasonic sensor ${sensorId}`);
    }
  }

  private detectTriggerPulse(pin: string, value: number) {
    const detector = this.triggerPatternDetector.get(pin);
    if (!detector) return;

    const now = Date.now();

    if (value === 1) {
      // Pin went HIGH
      detector.lastHigh = now;
    } else if (value === 0 && detector.lastHigh > 0) {
      // Pin went LOW - check if this was a valid trigger pulse (2-20 microseconds)
      const pulseWidth = (now - detector.lastHigh) * 1000; // Convert to microseconds
      
      if (pulseWidth >= 2 && pulseWidth <= 50) { // Allow some tolerance
        detector.pulseCount++;
        
        // Find the ultrasonic sensor using this TRIG pin
        for (const [sensorId, sensor] of this.ultrasonicSensors) {
          if (sensor.trigPin === pin) {
            console.log(`Ultrasonic trigger detected on ${pin}, pulse width: ${pulseWidth.toFixed(1)}μs`);
            sensor.onTrigger(sensor.trigPin, sensor.echoPin);
            break;
          }
        }
      }
      
      detector.lastHigh = 0;
    }
  }

  public setExternalPinValue(pin: string, value: number, type: 'digital' | 'analog' = 'digital') {
    if (!this.externalPinValues[pin]) {
      this.externalPinValues[pin] = { digital: 0, analog: 0 };
    }
    this.externalPinValues[pin][type] = value;
    
    // Emit pin change event for external updates (like ECHO pin from sensor)
    this.eventEmitter.emit({ type: "pin-change", pin, value, pinType: type });
  }

  public readDigitalPin(pin: string): number {
    if (this.externalPinValues[pin]?.digital !== undefined) {
      return this.externalPinValues[pin].digital;
    }
    return this.pinStates[pin]?.digital || 0;
  }

  public readAnalogPin(pin: string): number {
    if (this.externalPinValues[pin]?.analog !== undefined) {
      return this.externalPinValues[pin].analog;
    }
    return this.pinStates[pin]?.analog || 0;
  }

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
        this.setExternalPinValue(pin, value, 'digital');
      },
      setAnalogValue: (pin: string, value: number) => {
        this.setExternalPinValue(pin, value, 'analog');
      }
    };
  }

  public digitalWritePin(pin: string, value: number) {
    if (!this.pinStates[pin]) {
      this.pinStates[pin] = { digital: 0, analog: 0 };
    }
    this.pinStates[pin].digital = value;
    
    // Detect ultrasonic trigger patterns
    this.detectTriggerPulse(pin, value);
    
    // Emit generic pin change event
    this.eventEmitter.emit({ type: "pin-change", pin, value, pinType: "digital" });
    
    // Notify direct listeners
    const listeners = this.digitalWriteListeners[pin];
    if (listeners) {
      for (const cb of listeners) {
        try {
          cb(value);
        } catch (error) {
          console.error("Error in digital write listener:", error);
        }
      }
    }
  }

  public analogWritePin(pin: string, value: number) {
    if (!this.pinStates[pin]) {
      this.pinStates[pin] = { digital: 0, analog: 0 };
    }
    this.pinStates[pin].analog = value;
    this.eventEmitter.emit({
      type: "pin-change",
      pin,
      value,
      pinType: "analog",
    });
  }

  private async showString(text: string, interval: number = 150): Promise<void> {
    const validChars = text.split("").filter((char) => CHARACTER_PATTERNS[char]);

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
          if (patternCol < scrollPattern[row].length && scrollPattern[row][patternCol]) {
            this.plot(row, col);
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
    try {
      const proxy = this.pyodide.pyimport("pyodide.ffi.create_proxy")(callback);
      this.foreverCallbacks.add(proxy);
      this.startIndividualForeverLoop(proxy);
    } catch (error) {
      console.error("Error in forever callback setup:", error);
    }
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
    return new Promise<void>((resolve) => {
      setTimeout(resolve, ms);
    });
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
      try {
        if (callback.destroy) {
          callback.destroy();
        }
      } catch (error) {
        console.warn("Error destroying callback:", error);
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
    this.buttonStates = { A: false, B: false };
    this.clearInputs();
    this.ultrasonicSensors.clear();
    this.triggerPatternDetector.clear();
    this.externalPinValues = {};
    this.eventEmitter.emit({ type: "reset" });
    console.log("Microbit state reset");
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

  private onButtonPressed(button: ButtonInstance, handler: () => void) {
    const buttonName = button.getName();
    try {
      const proxy = this.pyodide.pyimport("pyodide.ffi.create_proxy")(handler);
      this.inputHandlers[buttonName].push(proxy);
    } catch (error) {
      console.error("Error setting up button handler:", error);
    }
  }

  public pressButton(button: ButtonInstance | "A" | "B") {
    const buttonName = typeof button === "string" ? button : button.getName();
    this.buttonStates[buttonName] = true;
    this.inputHandlers[buttonName].forEach((h) => {
      try {
        h();
      } catch (error) {
        console.error("Error in button handler:", error);
      }
    });
    this.eventEmitter.emit({ type: "button-press", button: buttonName });
  }

  private clearInputs() {
    this.inputHandlers.A.forEach((p) => {
      try {
        p.destroy?.();
      } catch (error) {
        console.warn("Error destroying input handler:", error);
      }
    });
    this.inputHandlers.B.forEach((p) => {
      try {
        p.destroy?.();
      } catch (error) {
        console.warn("Error destroying input handler:", error);
      }
    });
    this.inputHandlers = { A: [], B: [] };
  }

  getStateSnapshot() {
    return {
      pins: { ...this.pinStates, ...this.externalPinValues },
      leds: this.ledMatrix.map((row) => [...row]),
      buttons: { ...this.buttonStates },
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
      time: this.time,
      // Direct pin access
      pin0: this.pin0,
      pin1: this.pin1,
      pin2: this.pin2,
      // Add more pins as needed
    };
  }
}