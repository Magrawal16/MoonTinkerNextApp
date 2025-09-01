import { PythonInterpreter } from "../interpreter/PythonInterpreter";
import { MicrobitSimulator, MicrobitEvent } from "../mock/microbitInstance";

type SupportedLanguage = "python";
type SupportedController = "microbit";

interface SimulatorOptions {
  language: SupportedLanguage;
  controller: SupportedController;
  onOutput?: (line: string) => void;
  onEvent?: (event: MicrobitEvent) => void;
}

export class Simulator {
  private interpreter: PythonInterpreter;
  private microbit: MicrobitSimulator | null = null;

  constructor(private options: SimulatorOptions) {
    if (options.language == "python") {
      this.interpreter = new PythonInterpreter(true);
    } else {
      throw new Error(`Unsupported language: ${options.language}`);
    }
  }

  async initialize(onOutput?: (line: string) => void, onEvent?: (event: MicrobitEvent) => void) {
  await this.interpreter.initialize();

  const outputCallback = onOutput || this.options.onOutput;
  const eventCallback = onEvent || this.options.onEvent;

  if (outputCallback) {
    this.interpreter.setOutputCallback(outputCallback);
  }

  if (
    this.options.language === "python" &&
    this.options.controller === "microbit"
  ) {
    this.microbit = new MicrobitSimulator(this.interpreter.getPyodide()!);
    
    const microbitModule = this.microbit.getPythonModule();
    this.interpreter.registerHardwareModule("microbit", microbitModule);

    // SAFE way to add timing and pin access to Python globals
    try {
      const pythonGlobals = this.interpreter.getPyodide()!.globals;
      if (pythonGlobals && typeof pythonGlobals.set === 'function') {
        pythonGlobals.set('time', microbitModule.time);
        pythonGlobals.set('pin0', microbitModule.pin0);
        pythonGlobals.set('pin1', microbitModule.pin1);
        pythonGlobals.set('pin2', microbitModule.pin2);
      }
    } catch (error) {
      console.warn("Could not set Python globals, timing functions may not work:", error);
    }

    if (eventCallback) {
      this.microbit.subscribe(eventCallback);
    }

    this.microbit.reset();
  }
}

  async run(code: string): Promise<string> {
    if (!this.interpreter.isInitialized()) {
      throw new Error("Simulator not initialized. Call initialize() first.");
    }

    // reset states of microbit
    this.microbit?.reset();
    return await this.interpreter.run(code);
  }

  getStates() {
    if (!this.microbit) throw new Error("Microbit controller not initialized.");
    return this.microbit.getStateSnapshot();
  }

  getMicrobitInstance(): MicrobitSimulator | null {
    return this.microbit;
  }

  // New methods for ultrasonic sensor support
  registerUltrasonicSensor(sensorId: string, trigPin: string, echoPin: string) {
    if (!this.microbit) throw new Error("Microbit controller not initialized.");
    
    // Create a callback that will be called when trigger is detected
    const onTrigger = (trigPin: string, echoPin: string) => {
      // Post message back to main thread about ultrasonic trigger
      if (typeof postMessage !== 'undefined') {
        postMessage({
          type: 'ultrasonic-trigger',
          sensorId,
          trigPin,
          echoPin
        });
      }
    };

    this.microbit.registerUltrasonicSensor(sensorId, trigPin, echoPin, onTrigger);
  }

  unregisterUltrasonicSensor(sensorId: string) {
    if (!this.microbit) throw new Error("Microbit controller not initialized.");
    this.microbit.unregisterUltrasonicSensor(sensorId);
  }

  setExternalPinValue(pin: string, value: number, type: 'digital' | 'analog' = 'digital') {
    if (!this.microbit) throw new Error("Microbit controller not initialized.");
    this.microbit.setExternalPinValue(pin, value, type);
  }

  simulateInput(event: "A" | "B") {
    if (!this.microbit) throw new Error("Microbit controller not initialized.");
    this.microbit.pressButton(event);
  }

  reset() {
    if (this.microbit) {
      this.microbit.reset();
      // stop any ongoing simulation
    } else {
      throw new Error("Microbit controller not initialized.");
    }
  }
}