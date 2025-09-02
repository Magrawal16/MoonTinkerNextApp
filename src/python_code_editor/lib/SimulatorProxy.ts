// src/lib/code/SimulatorProxy.ts
import * as Comlink from "comlink";
import type { MicrobitEvent } from "../mock/microbitInstance";
import { Simulator } from "@/python_code_editor/lib/Simulator";

type SupportedLanguage = "python";
type SupportedController = "microbit";

export interface SimulatorOptions {
  language: SupportedLanguage;
  controller: SupportedController;
  onOutput?: (line: string) => void;
  onEvent?: (event: MicrobitEvent) => void;
}

type State = {
  pins: Record<string, { digital: number; analog: number }>;
  leds: boolean[][];
  buttons: { A: boolean; B: boolean };
};

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
    if (!this.simulatorRemoteInstance) throw new Error("Not initialized.");
    return this.simulatorRemoteInstance.run(code);
  }

  async getStates(): Promise<State> {
    if (!this.simulatorRemoteInstance) throw new Error("Not initialized.");
    return this.simulatorRemoteInstance.getStates();
  }

  async reset() {
    if (!this.simulatorRemoteInstance) throw new Error("Not initialized.");
    return this.simulatorRemoteInstance.reset();
  }

  async disposeAndReload() {
    // // Optional: Call remote dispose if you want to do any cleanup there
    // try {
    //   await this.simulatorRemoteInstance?.dispose?.();
    // } catch (e) {
    //   console.warn("Simulator remote dispose failed:", e);
    // }
    this.simulatorRemoteInstance?.reset();

    // Kill old worker
    this.worker.terminate();

    // Create new worker and reinitialize
    this.worker = this.createWorker();
    this.simulatorRemoteInstance = null;
    await this.initialize();
  }

  async simulateInput(event: "A" | "B") {
    if (!this.simulatorRemoteInstance) throw new Error("Not initialized.");
    return this.simulatorRemoteInstance.simulateInput(event);
  }

  dispose() {
    this.worker.terminate();
  }
}
