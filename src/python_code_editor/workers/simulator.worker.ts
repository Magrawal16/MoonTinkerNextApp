// src/workers/simulator.worker.ts
import * as Comlink from "comlink";
import { PythonInterpreter } from "../interpreter/PythonInterpreter";
import { MicrobitSimulator } from "../mock/microbitInstance";
import type { MicrobitEvent } from "../mock//types";

type SupportedLanguage = "python";
type SupportedController = "microbit" | "microbitWithBreakout";

interface SimulatorOptions {
  language: SupportedLanguage;
  controller: SupportedController;
}

type ButtonEvent = "A" | "B" | "AB";
type LogoEvent = { type: "logo"; state: "pressed" | "released" };
type ButtonObject = { type: "button"; button: ButtonEvent; state: "pressed" | "released" };

class Simulator {
  private interpreter: PythonInterpreter | null = null;
  private microbit: MicrobitSimulator | null = null;

  private onOutput?: (line: string) => void;
  private onEvent?: (event: MicrobitEvent) => void;

  private options: SimulatorOptions;

  constructor(opts: SimulatorOptions) {
    this.options = opts;
  }

  async initialize(
    onOutput?: Comlink.Remote<(line: string) => void>,
    onEvent?: Comlink.Remote<(event: MicrobitEvent) => void>,
    onAudio?: Comlink.Remote<(cmd: string, ...args: any[]) => Promise<void>>
  ) {
    this.onOutput = onOutput as (line: string) => void;
    this.onEvent = onEvent as (event: MicrobitEvent) => void;

    if (this.options.language !== "python") {
      throw new Error(`Unsupported language: ${this.options.language}`);
    }

    this.interpreter = new PythonInterpreter(true);
    await this.interpreter.initialize();

    if (this.onOutput) {
      this.interpreter.setOutputCallback(this.onOutput);
    }

    if (
      this.options.language === "python" &&
      (this.options.controller === "microbit" || this.options.controller === "microbitWithBreakout")
    ) {
      this.microbit = new MicrobitSimulator(this.interpreter.getPyodide()!);
      
      // Set up audio callback if provided
      if (onAudio) {
        this.microbit.setAudioCallback(onAudio as (cmd: string, ...args: any[]) => Promise<void>);
      }
      
      this.interpreter.registerHardwareModule(
        "microbit", // <-- always use "microbit"
        this.microbit.getPythonModule()
      );

      if (this.onEvent) {
        this.microbit.subscribe(this.onEvent);
      }

      this.microbit.reset();
    }
  }

  async dispose() {
    try {
      await this.interpreter?.run(`
      import asyncio
      for task in asyncio.all_tasks():
          task.cancel()
    `);
    } catch (e) {
      console.warn("Dispose error:", e);
    }
  }

  async run(code: string): Promise<string> {
    if (!this.interpreter || !this.interpreter.isInitialized()) {
      throw new Error("Simulator not initialized. Call initialize() first.");
    }

    this.microbit?.reset();
    return this.interpreter.run(code);
  }

  /**
   * Stop any running user program immediately. Cancels all asyncio tasks
   * in the interpreter and resets the micro:bit peripherals/state.
   */
  async stop() {
    if (!this.interpreter) return;
    try {
      await this.interpreter.run(`
import asyncio
for task in asyncio.all_tasks():
    task.cancel()
`);
    } catch (_) { }
    try { this.microbit?.reset(); } catch (_) { }
  }

  getStates() {
    if (!this.microbit) {
      throw new Error(this.options.controller + " controller not initialized at get states.");
    }
    return this.microbit.getStateSnapshot();
  }

  reset() {
    if (!this.microbit) {
      throw new Error(this.options.controller + " controller not initialized at reset.");
    }
    this.microbit.reset();
  }

  // --- INPUT API ---

  async simulateInput(event: ButtonEvent | LogoEvent | ButtonObject) {
    if (!this.microbit) {
      throw new Error(this.options.controller + " controller not initialized at simulate input.");
    }
    try {
      // Debug: log incoming input events
      // eslint-disable-next-line no-console
      console.debug("Simulator.simulateInput event:", event);
    } catch (e) { }

    if (typeof event === "string") {
      // A / B / AB
      await this.microbit.pressButton(event);
      return;
    }

    if ((event as ButtonObject).type === "button") {
      const be = event as ButtonObject;
      if (be.state === "pressed") return this.microbit.pressButton(be.button);
      if (be.state === "released") return this.microbit.releaseButton(be.button);
    }

    if (event.type === "logo") {
      if (event.state === "pressed") return this.microbit.pressLogo();
      if (event.state === "released") return this.microbit.releaseLogo();
    }

    throw new Error(`Unsupported input event: ${JSON.stringify(event)}`);
  }

  async pressLogo() {
    if (!this.microbit) throw new Error(this.options.controller + " controller not initialized at press logo.");
    return this.microbit.pressLogo();
  }

  async releaseLogo() {
    if (!this.microbit) throw new Error(this.options.controller + " controller not initialized at release logo.");
    return this.microbit.releaseLogo();
  }

  async pressButton(button: ButtonEvent) {
    if (!this.microbit) throw new Error(this.options.controller + " controller not initialized at press button.");
    return this.microbit.pressButton(button);
  }
}

Comlink.expose(Simulator);
