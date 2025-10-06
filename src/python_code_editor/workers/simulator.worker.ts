// src/workers/simulator.worker.ts
import * as Comlink from "comlink";
import { PythonInterpreter } from "../interpreter/PythonInterpreter";
import { MicrobitSimulator } from "../mock/microbitInstance";
import type { MicrobitEvent } from "../mock/microbitInstance";

type SupportedLanguage = "python";
type SupportedController = "microbit" | "microbitWithBreakout";

interface SimulatorOptions {
  language: SupportedLanguage;
  controller: SupportedController;
}

type ButtonEvent = "A" | "B" | "AB";
type LogoEvent = { type: "logo"; state: "pressed" | "released" };

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
    onEvent?: Comlink.Remote<(event: MicrobitEvent) => void>
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
      this.interpreter.registerHardwareModule(
        this.options.controller,
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
    console.log("Resetting " + this.options.controller + " state");
    this.microbit.reset();
  }

  // --- INPUT API ---

  async simulateInput(event: ButtonEvent | LogoEvent) {
    if (!this.microbit) {
      throw new Error(this.options.controller + " controller not initialized at simulate input.");
    }

    if (typeof event === "string") {
      // A / B / AB
      await this.microbit.pressButton(event);
      return;
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
}

Comlink.expose(Simulator);
