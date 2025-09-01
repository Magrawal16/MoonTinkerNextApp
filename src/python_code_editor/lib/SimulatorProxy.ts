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
  private ultrasonicTriggerCallbacks: Map<string, (trigPin: string, echoPin: string) => void> = new Map();
  private isInitialized: boolean = false;

  constructor(opts: SimulatorOptions) {
    this.options = {
      ...opts,
      onOutput: opts.onOutput ? Comlink.proxy(opts.onOutput) : undefined,
      onEvent: opts.onEvent ? Comlink.proxy(opts.onEvent) : undefined,
    };
    this.worker = this.createWorker();
    this.setupWorkerMessageHandler();
  }

  private createWorker(): Worker {
    return new Worker(
      new URL("../workers/simulator.worker.ts", import.meta.url),
      { type: "module" }
    );
  }

  private setupWorkerMessageHandler() {
    this.worker.addEventListener('message', (event) => {
      const { data } = event;
      
      if (data.type === 'ultrasonic-trigger') {
        const { sensorId, trigPin, echoPin } = data;
        const callback = this.ultrasonicTriggerCallbacks.get(sensorId);
        if (callback) {
          callback(trigPin, echoPin);
        }
      }
    });
  }

  async initialize() {
    try {
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

      this.isInitialized = true;
    } catch (error) {
      console.error("Failed to initialize simulator:", error);
      this.isInitialized = false;
      throw error;
    }
  }

  async run(code: string): Promise<string> {
    if (!this.isInitialized || !this.simulatorRemoteInstance) {
      throw new Error("Not initialized.");
    }
    return this.simulatorRemoteInstance.run(code);
  }

  async getStates(): Promise<State> {
    if (!this.isInitialized || !this.simulatorRemoteInstance) {
      throw new Error("Not initialized.");
    }
    return this.simulatorRemoteInstance.getStates();
  }

  async reset() {
    if (!this.isInitialized || !this.simulatorRemoteInstance) {
      console.warn("Simulator not initialized, skipping reset.");
      return;
    }
    return this.simulatorRemoteInstance.reset();
  }

  // New methods for ultrasonic sensor support
  async registerUltrasonicSensor(
    sensorId: string, 
    trigPin: string, 
    echoPin: string, 
    onTrigger: (trigPin: string, echoPin: string) => void
  ) {
    if (!this.isInitialized || !this.simulatorRemoteInstance) {
      console.warn("Simulator not initialized, storing callback for later registration.");
      // Store the callback anyway for when simulator becomes available
      this.ultrasonicTriggerCallbacks.set(sensorId, onTrigger);
      return;
    }
    
    // Store the callback
    this.ultrasonicTriggerCallbacks.set(sensorId, onTrigger);
    
    // Register with the remote simulator
    try {
      return await this.simulatorRemoteInstance.registerUltrasonicSensor(sensorId, trigPin, echoPin);
    } catch (error) {
      console.error("Failed to register ultrasonic sensor:", error);
    }
  }

  async unregisterUltrasonicSensor(sensorId: string) {
    // Remove the callback regardless of initialization status
    this.ultrasonicTriggerCallbacks.delete(sensorId);

    // Only try to unregister from remote if initialized
    if (this.isInitialized && this.simulatorRemoteInstance) {
      try {
        return await this.simulatorRemoteInstance.unregisterUltrasonicSensor(sensorId);
      } catch (error) {
        console.error("Failed to unregister ultrasonic sensor:", error);
      }
    } else {
      console.warn("Simulator not initialized, only removed local callback.");
    }
  }

  async setExternalPinValue(pin: string, value: number, type: 'digital' | 'analog' = 'digital') {
    if (!this.isInitialized || !this.simulatorRemoteInstance) {
      console.warn("Simulator not initialized, cannot set external pin value.");
      return;
    }
    try {
      return await this.simulatorRemoteInstance.setExternalPinValue(pin, value, type);
    } catch (error) {
      console.error("Failed to set external pin value:", error);
    }
  }

  async disposeAndReload() {
    // Clear callbacks
    this.ultrasonicTriggerCallbacks.clear();
    this.isInitialized = false;
    
    // Reset the remote instance if it exists
    if (this.simulatorRemoteInstance) {
      try {
        await this.simulatorRemoteInstance.reset();
      } catch (error) {
        console.warn("Error during simulator reset:", error);
      }
    }

    // Kill old worker
    this.worker.terminate();

    // Create new worker and reinitialize
    this.worker = this.createWorker();
    this.setupWorkerMessageHandler();
    this.simulatorRemoteInstance = null;
    
    try {
      await this.initialize();
    } catch (error) {
      console.error("Failed to reinitialize simulator:", error);
    }
  }

  async simulateInput(event: "A" | "B") {
    if (!this.isInitialized || !this.simulatorRemoteInstance) {
      throw new Error("Not initialized.");
    }
    return this.simulatorRemoteInstance.simulateInput(event);
  }

  dispose() {
    this.ultrasonicTriggerCallbacks.clear();
    this.isInitialized = false;
    this.worker.terminate();
  }

  // Helper method to check initialization status
  getInitializationStatus(): boolean {
    return this.isInitialized;
  }
}