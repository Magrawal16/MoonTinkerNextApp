// Lightweight buzzer audio helper for circuit components
let sharedAudioCtx: AudioContext | null = null;

function getAudioCtx() {
  if (sharedAudioCtx) return sharedAudioCtx;
  try {
    sharedAudioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
  } catch (err) {
    // audio not available
    sharedAudioCtx = null;
  }
  return sharedAudioCtx;
}

export function createBuzzerPlayer() {
  const ctx = getAudioCtx();
  let osc: OscillatorNode | null = null;
  let gain: GainNode | null = null;
  let playing = false;

  function start(frequency: number, volume: number) {
    if (!ctx) return;
    // Avoid creating duplicate oscillator
    if (playing) {
      update(frequency, volume);
      return;
    }
    osc = ctx.createOscillator();
    gain = ctx.createGain();
    osc.type = "square"; // buzzer-like timbre
    osc.frequency.setValueAtTime(Math.max(20, frequency), ctx.currentTime);
    gain.gain.setValueAtTime(Math.max(0, Math.min(1, volume)), ctx.currentTime);
    osc.connect(gain).connect(ctx.destination);
    try {
      osc.start();
      playing = true;
    } catch (_) {
      // ignore already-started
    }
  }

  function update(frequency: number, volume: number) {
    if (!ctx || !playing || !osc || !gain) return;
    try {
      osc.frequency.setValueAtTime(Math.max(20, frequency), ctx.currentTime);
      gain.gain.setValueAtTime(Math.max(0, Math.min(1, volume)), ctx.currentTime);
    } catch (_) {}
  }

  function stop() {
    if (!ctx || !playing) return;
    try {
      osc?.stop();
      osc?.disconnect();
      gain?.disconnect();
    } catch (_) {}
    osc = null;
    gain = null;
    playing = false;
  }

  function dispose() {
    stop();
  }

  return { start, update, stop, dispose };
}
