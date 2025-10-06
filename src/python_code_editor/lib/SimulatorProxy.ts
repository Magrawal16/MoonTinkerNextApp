// src/lib/code/SimulatorProxy.ts
import * as Comlink from "comlink";
import type { MicrobitEvent } from "../mock/microbitInstance";
import { Simulator } from "@/python_code_editor/lib/Simulator";

type SupportedLanguage = "python";
type SupportedController = "microbit" | "microbitWithBreakout";

export interface SimulatorOptions {
  language: SupportedLanguage;
  controller: SupportedController;
  onOutput?: (line: string) => void;
  onEvent?: (event: MicrobitEvent) => void;
}

type State = {
  pins: Record<string, { digital: number; analog: number }>;
  leds: boolean[][];
  buttons: { A: boolean; B: boolean; AB: boolean }; // AB present in snapshot
  logo: boolean; // <- NEW: logo touch state
};

type ButtonEvent = "A" | "B" | "AB";
type LogoEvent = { type: "logo"; state: "pressed" | "released" };

export class SimulatorProxy {
  private worker: Worker;
  private simulatorRemoteInstance: Comlink.Remote<any> | null = null;
  private options: SimulatorOptions;

  constructor(opts: SimulatorOptions) {
    this.options = {
      ...opts,
      onOutput: opts.onOutput ? Comlink.proxy(opts.onOutput) : undefined,
      onEvent: opts.onEvent ? Comlink.proxy(opts.onEvent) : undefined,
    };
    this.worker = this.createWorker();
  }

  private createWorker(): Worker {
    return new Worker(
      new URL("../workers/simulator.worker.ts", import.meta.url),
      { type: "module" }
    );
  }

  async initialize() {
    const SimulatorConstructor = Comlink.wrap<typeof Simulator>(this.worker);

    const { language, controller } = this.options;
    console.log(controller, +" in SimulatorProxy controller");
    this.simulatorRemoteInstance = await new SimulatorConstructor({
      language,
      controller,
    });

    if (!this.simulatorRemoteInstance) {
      throw new Error("SimulatorProxy not initialized after creation.");
    }

    await this.simulatorRemoteInstance.initialize(
      this.options.onOutput,
      this.options.onEvent
    );
  }

  async run(code: string): Promise<string> {
    if (!this.simulatorRemoteInstance) throw new Error("Not initialized at run.");
    return this.simulatorRemoteInstance.run(code);
  }

  async getStates(): Promise<State> {
    if (!this.simulatorRemoteInstance) throw new Error("Not initialized at get states.");
    return this.simulatorRemoteInstance.getStates();
  }

  async reset() {
    if (!this.simulatorRemoteInstance) throw new Error("Not initialized at reset.");
    return this.simulatorRemoteInstance.reset();
  }

  async disposeAndReload() {
    this.simulatorRemoteInstance?.reset();
    this.worker.terminate();
    this.worker = this.createWorker();
    this.simulatorRemoteInstance = null;
    await this.initialize();
  }

  // --- INPUT API ---

  async simulateInput(event: ButtonEvent | LogoEvent) {
    if (!this.simulatorRemoteInstance) throw new Error("Not initialized.");

    if (typeof event === "string") {
      // Button A/B/AB
      return this.simulatorRemoteInstance.simulateInput(event);
    }

    // Logo event
    if (event.type === "logo") {
      if (event.state === "pressed") {
        return this.simulatorRemoteInstance.pressLogo();
      } else {
        return this.simulatorRemoteInstance.releaseLogo();
      }
    }

    throw new Error("Unsupported input event");
  }

  // Convenience methods (optional)
  async pressLogo() {
    if (!this.simulatorRemoteInstance) throw new Error("Not initialized at press logo.");
    return this.simulatorRemoteInstance.pressLogo();
  }

  async releaseLogo() {
    if (!this.simulatorRemoteInstance) throw new Error("Not initialized at release logo.");
    return this.simulatorRemoteInstance.releaseLogo();
  }

  dispose() {
    this.worker.terminate();
  }
}
