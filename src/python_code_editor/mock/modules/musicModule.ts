// musicModule.ts - Music playback bridge for micro:bit simulator
// This module runs in a Web Worker and communicates with the main thread for audio playback

import type { PyodideInterface } from "pyodide";

/**
 * MusicModule - Handles music playback commands in the micro:bit simulator
 * Since Web Audio API is not available in Web Workers, this module acts as a bridge
 * that sends commands to the main thread for actual audio playback
 */
export class MusicModule {
  private pyodide: PyodideInterface;
  private audioCallback: ((cmd: string, ...args: any[]) => Promise<void>) | null = null;

  constructor(pyodide: PyodideInterface) {
    this.pyodide = pyodide;
  }

  /**
   * Set the callback that will handle audio commands in the main thread
   */
  setAudioCallback(callback: (cmd: string, ...args: any[]) => Promise<void>) {
    this.audioCallback = callback;
  }

  /**
   * Play a tone at the specified frequency for a duration
   * This is an async function that blocks until the tone finishes
   */
  private async playTone(frequency: number, durationBeats: number = 1): Promise<void> {
    if (this.audioCallback) {
      await this.audioCallback('play_tone', frequency, durationBeats);
    }
  }

  /**
   * Start playing a continuous tone at the specified frequency
   * Does not block - tone continues until stopped
   */
  private ringTone(frequency: number): void {
    if (this.audioCallback) {
      // Fire and forget for ring_tone (non-blocking)
      void this.audioCallback('ring_tone', frequency);
    }
  }

  /**
   * Pause playback for the specified duration (in beats)
   */
  private async rest(durationBeats: number = 1): Promise<void> {
    if (this.audioCallback) {
      await this.audioCallback('rest', durationBeats);
    }
  }

  /**
   * Stop any currently playing tone
   */
  private stopTone(): void {
    if (this.audioCallback) {
      void this.audioCallback('stop');
    }
  }

  /**
   * Reset the music module state
   */
  public reset(): void {
    this.stopTone();
  }

  /**
   * Get the Python API object for the music module
   */
  public getAPI() {
    return {
      play_tone: this.playTone.bind(this),
      ring_tone: this.ringTone.bind(this),
      rest: this.rest.bind(this),
      stop: this.stopTone.bind(this),
    };
  }
}
