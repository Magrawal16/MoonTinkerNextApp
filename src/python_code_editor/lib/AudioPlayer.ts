// Simple tone player using Web Audio API


export class AudioPlayer {
  private audioCtx: AudioContext | null = null;
  private oscillator: OscillatorNode | null = null;
  private gainNode: GainNode | null = null;
  private isPlaying = false;
  private closed = false;


  constructor() {
    try {
      this.audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
    } catch (err) {
      console.warn("Web Audio API not supported", err);
    }
  }


  async playTone(frequency: number, durationBeats: number = 1) {
    if (!this.audioCtx) return;
    if (this.isPlaying) {
      this.stopTone();
    }

    // Convert beats to milliseconds (assuming 120 BPM = 500ms per beat)
    const durationMs = durationBeats * 500;

    this.oscillator = this.audioCtx.createOscillator();
    this.gainNode = this.audioCtx.createGain();

    this.oscillator.connect(this.gainNode);
    this.gainNode.connect(this.audioCtx.destination);

    this.oscillator.type = "sine"; // could be 'square', 'triangle', 'sawtooth'
    this.oscillator.frequency.setValueAtTime(frequency, this.audioCtx.currentTime);

    this.gainNode.gain.setValueAtTime(0.2, this.audioCtx.currentTime); // soft volume
    this.oscillator.start();

    this.isPlaying = true;

    await new Promise((resolve) => setTimeout(resolve, durationMs));

    this.stopTone();
  }


  ringTone(frequency: number) {
    if (!this.audioCtx) return;
    this.stopTone(); // stop existing tone
    this.oscillator = this.audioCtx.createOscillator();
    this.gainNode = this.audioCtx.createGain();


    this.oscillator.connect(this.gainNode);
    this.gainNode.connect(this.audioCtx.destination);
    this.oscillator.frequency.setValueAtTime(frequency, this.audioCtx.currentTime);
    this.gainNode.gain.setValueAtTime(0.2, this.audioCtx.currentTime);


    this.oscillator.start();
    this.isPlaying = true;
  }


  rest(durationBeats: number = 1) {
    // Silence pause - convert beats to milliseconds (assuming 120 BPM = 500ms per beat)
    const durationMs = durationBeats * 500;
    return new Promise((resolve) => setTimeout(resolve, durationMs));
  }


  stopTone() {
    try {
      this.oscillator?.stop();
      this.oscillator?.disconnect();
      this.gainNode?.disconnect();
    } catch (_) {}
    this.oscillator = null;
    this.gainNode = null;
    this.isPlaying = false;
  }


  dispose() {
    // Idempotent teardown; safe to call multiple times
    try {
      this.stopTone();
      const ctx = this.audioCtx;
      if (!ctx) return;
      // Avoid InvalidStateError: Cannot close a closed AudioContext
      if ((ctx as any).state && (ctx as any).state === "closed") {
        this.audioCtx = null;
        this.closed = true;
        return;
      }
      // Close asynchronously; ignore errors from already-closed contexts
      void ctx.close().catch(() => {});
      this.closed = true;
    } catch (_) {
      // swallow
    } finally {
      this.audioCtx = null;
    }
  }
}
