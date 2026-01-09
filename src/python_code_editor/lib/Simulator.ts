// src/python_code_editor/lib/Simulator.ts
import { PythonInterpreter } from "../interpreter/PythonInterpreter";
import { MicrobitEvent } from "../mock/types";
import { MicrobitSimulator } from "../mock/microbitInstance";


type SupportedLanguage = "python";
type SupportedController = "microbit" | "microbitWithBreakout";

interface SimulatorOptions {
  language: SupportedLanguage;
  controller: SupportedController;
  onOutput?: (line: string) => void;
  onEvent?: (event: MicrobitEvent) => void;
}

type ButtonEvent = "A" | "B" | "AB";
type LogoEvent = { type: "logo"; state: "pressed" | "released" };

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

  async initialize() {
    await this.interpreter.initialize();

    if (this.options.onOutput) {
      this.interpreter.setOutputCallback(this.options.onOutput);
    }

    if (
      this.options.language === "python" &&
      (this.options.controller === "microbit" || this.options.controller === "microbitWithBreakout")
    ) {
      this.microbit = new MicrobitSimulator(this.interpreter.getPyodide()!);
      this.interpreter.registerHardwareModule(
        "microbit", // <-- always use "microbit"
        this.microbit.getPythonModule()
      );

      if (this.options.onEvent) {
        this.microbit.subscribe(this.options.onEvent);
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
    if (!this.microbit) throw new Error(this.options.controller + " controller not initialized at get state.");
    return this.microbit.getStateSnapshot();
  }

  getMicrobitInstance(): MicrobitSimulator | null {
    return this.microbit;
  }

  reset() {
    if (this.microbit) {
      this.microbit.reset();
    } else {
      throw new Error(this.options.controller + " controller not initialized at reset state.");
    }
  }

  // --- INPUT API ---

  async simulateInput(event: ButtonEvent | LogoEvent) {
    if (!this.microbit) throw new Error(this.options.controller + " controller not initialized at simulator input.");

    if (typeof event === "string") {
      // buttons
      return this.microbit.pressButton(event);
    }

    if (event.type === "logo") {
      if (event.state === "pressed") return this.microbit.pressLogo();
      if (event.state === "released") return this.microbit.releaseLogo();
    }

    throw new Error("Unsupported input event");
  }

  async pressLogo() {
    if (!this.microbit) throw new Error(this.options.controller + " controller not initialized at press logo.");
    return this.microbit.pressLogo();
  }

  async releaseLogo() {
    if (!this.microbit) throw new Error(this.options.controller + " controller not initialized at release logo.");
    return this.microbit.releaseLogo();
  }

  // --- SENSOR API ---

  setTemperature(value: number) {
    if (!this.microbit) {
      throw new Error("Microbit not initialized at setTemperature.");
    }
    this.microbit.setTemperature(value);
  }

  setLightLevel(value: number) {
  if (!this.microbit) {
    throw new Error("Microbit not initialized at setLightLevel.");
  }
  this.microbit.setLightLevel(value);
  }

  // --- PIN VALUE API (for circuit integration) ---

  setExternalPinValue(pin: string, value: number, type: "digital" | "analog" = "digital") {
    if (!this.microbit) {
      throw new Error("Microbit not initialized at setExternalPinValue.");
    }
    const pinController = this.microbit.getPinController();
    if (type === "digital") {
      pinController.setDigitalValue(pin, value);
    } else {
      pinController.setAnalogValue(pin, value);
    }
  }

  /*
  triggerGesture(gesture: string) {
    if (!this.microbit) {
      throw new Error("Microbit not initialized at triggerGesture.");
    }
    this.microbit.triggerGesture(gesture);
  }
    */

}
