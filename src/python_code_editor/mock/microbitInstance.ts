// microbitInstance.tsx

import type { PyodideInterface } from "pyodide";
import { MicrobitEventEmitter } from "./modules/eventEmitter";
import { ButtonModule } from "./modules/buttonModule";
import { LEDModule } from "./modules/ledModule";
import { PinsModule } from "./modules/pinsModule";
import { LogoTouchModule } from "./modules/logoTouchModule";
import { GestureModule } from "./modules/gestureModule";
import { BasicModule } from "./modules/basicModule";
import { MusicModule } from "./modules/musicModule";
import type { StateSnapshot, PythonModule } from "./interfaces";

export class MicrobitSimulator {
  private readonly eventEmitter: MicrobitEventEmitter;
  private readonly buttonModule: ButtonModule;
  private readonly ledModule: LEDModule;
  private readonly pinsModule: PinsModule;
  private readonly logoTouchModule: LogoTouchModule;
  private readonly gestureModule: GestureModule;
  private readonly basicModule: BasicModule;
  private readonly musicModule: MusicModule;
  private temperature = 25;   // default °C
  private lightLevel = 128;   // default light level
  private audioCallback: ((cmd: string, ...args: any[]) => Promise<void>) | null = null;

  constructor(private readonly pyodide: PyodideInterface) {
    this.eventEmitter = new MicrobitEventEmitter();
    this.buttonModule = new ButtonModule(pyodide, this.eventEmitter);
    this.ledModule = new LEDModule(pyodide, this.eventEmitter);
    this.pinsModule = new PinsModule(pyodide, this.eventEmitter);
    this.logoTouchModule = new LogoTouchModule(pyodide, this.eventEmitter);
    this.gestureModule = new GestureModule(pyodide, this.eventEmitter);
    this.basicModule = new BasicModule(pyodide, this.ledModule);
    // Provide the basic module with a reference to this simulator
    this.basicModule.setMicrobit?.(this);
    this.musicModule = new MusicModule(pyodide);
    // initialize public APIs after modules exist
    this.pins = this.pinsModule.getAPI();
    this.Button = this.buttonModule.Button;
    this.led = this.ledModule.getAPI();
    this.input = {
      ...this.buttonModule.getAPI(),
      ...this.logoTouchModule.getAPI(),
      ...this.gestureModule.getAPI(),
      _clear: this.buttonModule.clearInputs.bind(this.buttonModule),
    };
    this.basic = this.basicModule.getAPI();
    this.music = this.musicModule.getAPI();
    this.DigitalPin = this.pinsModule.DigitalPin;
    this.Gesture = this.gestureModule.Gesture;
  }
  // All pin/led/button/logo functionality is implemented in modules.
  // Leftover/duplicated code removed so the simulator delegates to modules only.

  // API and public members (initialized in constructor)
  public readonly pins: any;
  public readonly Button: any;
  public readonly led: any;
  public readonly input: any;
  public readonly basic: any;
  public readonly music: any;
  public readonly DigitalPin: Record<string, string>;
  public readonly Gesture: any;

  /**
   * Set the audio callback that will be called for music operations
   * This allows the music module to communicate with the main thread for audio playback
   */
  setAudioCallback(callback: (cmd: string, ...args: any[]) => Promise<void>): void {
    this.audioCallback = callback;
    this.musicModule.setAudioCallback(callback);
  }

  subscribe(callback: (event: any) => void): () => void {
    return this.eventEmitter.subscribe(callback);
  }

  reset(): void {
    this.buttonModule.reset();
    this.ledModule.reset();
    this.pinsModule.reset();
    this.logoTouchModule.reset();
    this.gestureModule.reset();
    this.basicModule.reset();
    this.musicModule.reset();
    this.eventEmitter.emit({ type: "reset" });
  }

  getStateSnapshot(): StateSnapshot {
    return {
      pins: this.pinsModule.getState(),
      leds: this.ledModule.getState(),
      buttons: this.buttonModule.getState(),
      logo: this.logoTouchModule.getState(),
    };
  }

  // Convenience methods for UI interaction
  public async pressButton(button: any): Promise<void> {
    return this.buttonModule.pressButton(button);
  }

  public async releaseButton(button: any): Promise<void> {
    return this.buttonModule.releaseButton(button);
  }

  public async pressLogo(): Promise<void> {
    return this.logoTouchModule.pressLogo();
  }

  public async releaseLogo(): Promise<void> {
    return this.logoTouchModule.releaseLogo();
  }

  getPythonModule(): PythonModule {
    // Expose display and Image for display.show(Image.HEART) compatibility
    const display = {
      show: this.basicModule.showImage.bind(this.basicModule),
      clear: this.ledModule.clearDisplay.bind(this.ledModule),
    };
    const Image = new Proxy({}, {
      get: (_, icon: string) => icon
    });
    return {
      pins: this.pinsModule.getAPI(),
      led: this.ledModule.getAPI(),
      input: {
        ...this.buttonModule.getAPI(),
        ...this.logoTouchModule.getAPI(),
        ...this.gestureModule.getAPI(),
        temperature: () => this.getTemperature(),
        light_level: () => this.getLightLevel(),
        _clear: this.buttonModule.clearInputs.bind(this.buttonModule),
      },
      Button: this.buttonModule.Button,
      Gesture: this.gestureModule.Gesture,
      DigitalPin: this.pinsModule.DigitalPin,
      basic: {
        ...this.basicModule.getAPI(),
        temperature: () => this.getTemperature(),
      },
      music: this.musicModule.getAPI(),
      display,
      Image,
    };
  }

  getTemperature(): number {
  return this.temperature;
}
  getLightLevel(): number {
    return this.lightLevel;
  }
  // --- Runtime Sensor APIs ---

  setTemperature(value: number): void {
    this.temperature = value;
  }

  setLightLevel(value: number): void {
  this.lightLevel = Math.max(0, Math.min(255, value));
}

  getPinController() {
    return this.pinsModule.getPinController();
  }

  triggerGesture(gesture: string): void {
    this.eventEmitter.emit({
      type: "gesture",
      gesture,
    });
  }
}
