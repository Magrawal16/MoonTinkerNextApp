import { LedVisualState, RgbLedChannelState, RgbLedRuntimeState } from "../types/circuit";

const clamp = (value: number, min: number, max: number) => Math.min(Math.max(value, min), max);

/**
 * RGB LED Electrical Parameters
 * 
 * RGB LEDs contain 3 separate LED dies (Red, Green, Blue) in one package.
 * Each color has different forward voltage characteristics:
 * - Red: ~1.8-2.2V (using 2.0V)
 * - Green: ~2.8-3.2V (using 3.0V)  
 * - Blue: ~2.8-3.4V (using 3.2V)
 * 
 * Max current per channel: 20mA typical
 * Max power per channel: ~60-80mW
 */

// Internal resistance for each color channel
export const RGB_LED_INTERNAL_RESISTANCE = {
  red: 6.2,   // ohms
  green: 6.5, // ohms (slightly higher for green/blue)
  blue: 6.5,  // ohms
};

// Series resistance for simulation (affects current limiting behavior)
export const RGB_LED_SERIES_RESISTANCE: Record<string, number> = {
  red: 6.856,
  green: 5.5,
  blue: 5.5,
};

export const RGB_LED_LIMITS = {
  // Forward voltage per color
  forwardVoltage: {
    red: 2.0,   // V
    green: 3.0, // V
    blue: 3.2,  // V
  },
  maxCurrent: 0.02, // A (20 mA)
  // Max power per channel
  maxPower: 0.065, // W (65 mW)
  // Max reverse voltage before damage
  maxReverseVoltage: 5, // V (lower than single LED, typical for RGB)
  // Thermal behavior
  thermalExplosionThreshold: 0.6,
  thermalGain: 1.5,
  thermalCooldownPerSec: 0.4, 
  flickerStart: 0.5,
  explosionDelayMs: { min: 200, max: 300 },
};

// Forward voltage map for RGB LED channels
const forwardVoltageMap: Record<string, number> = {
  red: RGB_LED_LIMITS.forwardVoltage.red,
  green: RGB_LED_LIMITS.forwardVoltage.green,
  blue: RGB_LED_LIMITS.forwardVoltage.blue,
};

const seededRandom = (seed: number) => {
  const x = Math.sin(seed) * 10000;
  return x - Math.floor(x);
};

const explosionDelayMs = (seed: number) => {
  const { min, max } = RGB_LED_LIMITS.explosionDelayMs;
  const r = seededRandom(seed || Date.now());
  return min + r * (max - min);
};

/**
 * Get forward voltage for a specific RGB LED channel
 */
export const getRgbLedForwardVoltage = (channel: "red" | "green" | "blue") => {
  return forwardVoltageMap[channel] ?? RGB_LED_LIMITS.forwardVoltage.red;
};

/**
 * Get series resistance for a specific RGB LED channel
 */
export const getRgbLedSeriesResistance = (channel: "red" | "green" | "blue") => {
  return RGB_LED_SERIES_RESISTANCE[channel] ?? RGB_LED_INTERNAL_RESISTANCE.red;
};

/**
 * Get internal resistance for a specific RGB LED channel
 */
export const getRgbLedInternalResistance = (channel: "red" | "green" | "blue") => {
  return RGB_LED_INTERNAL_RESISTANCE[channel] ?? RGB_LED_INTERNAL_RESISTANCE.red;
};

/**
 * Create initial runtime state for a single RGB LED channel
 */
export const createInitialRgbLedChannelRuntime = (): RgbLedChannelState => ({
  brightness: 0,
  thermalEnergy: 0,
  exploded: false,
  visualState: "off",
  flickerSeed: Math.random() * 1000,
  lastUpdateAt: undefined,
});

/**
 * Create initial runtime state for the entire RGB LED
 */
export const createInitialRgbLedRuntime = (): RgbLedRuntimeState => ({
  red: createInitialRgbLedChannelRuntime(),
  green: createInitialRgbLedChannelRuntime(),
  blue: createInitialRgbLedChannelRuntime(),
});

/**
 * Update runtime state for a single RGB LED channel
 */
export function updateRgbLedChannelRuntime(params: {
  prev?: RgbLedChannelState;
  electrical: { forwardVoltage?: number; current?: number; power?: number };
  channel: "red" | "green" | "blue";
  dt: number; // seconds since last tick
  nowMs: number;
}): RgbLedChannelState {
  const runtime = { ...(params.prev ?? createInitialRgbLedChannelRuntime()) } as RgbLedChannelState;
  const vf = getRgbLedForwardVoltage(params.channel);
  const forwardVoltage = params.electrical.forwardVoltage ?? 0;
  const current = params.electrical.current ?? 0;
  const power = params.electrical.power ?? forwardVoltage * current;
  const reverseVoltage = forwardVoltage < 0 ? -forwardVoltage : 0;
  const lowVoltageBypass = Math.abs(forwardVoltage) <= 2.2;

  // Under low-voltage conditions, allow lighting but never accumulate heat or explode.
  if (lowVoltageBypass) {
    const forwardOn = forwardVoltage >= vf && current > 0;
    const forwardCurrent = forwardOn ? Math.max(current, 0) : 0;
    const brightness = forwardOn ? clamp(forwardCurrent / RGB_LED_LIMITS.maxCurrent, 0, 1) : 0;
    const cooled = Math.max(0, (runtime.thermalEnergy ?? 0) - RGB_LED_LIMITS.thermalCooldownPerSec * params.dt);
    const visualState: LedVisualState = forwardOn ? "on" : "off";
    return {
      ...runtime,
      brightness,
      thermalEnergy: cooled,
      exploded: false,
      pendingExplosionAt: undefined,
      smokeStartedAt: undefined,
      failureReason: undefined,
      visualState,
      lastUpdateAt: params.nowMs,
    };
  }

  // Once exploded, stay broken.
  if (runtime.exploded) {
    return {
      ...runtime,
      brightness: 0,
      thermalEnergy: Math.max(runtime.thermalEnergy, RGB_LED_LIMITS.thermalExplosionThreshold),
      visualState: "exploded",
      explosionCurrent: current,
      lastUpdateAt: params.nowMs,
    };
  }

  let thermalEnergy = runtime.thermalEnergy;
  let brightness = 0;
  let visualState: LedVisualState = runtime.visualState ?? "off";
  let pendingExplosionAt = runtime.pendingExplosionAt;
  let smokeStartedAt = runtime.smokeStartedAt;
  let failureReason = runtime.failureReason;

  const forwardOn = forwardVoltage >= vf && current > 0;
  const forwardCurrent = forwardOn ? Math.max(current, 0) : 0;
  const forwardPower = forwardOn ? Math.max(power, 0) : 0;

  if (reverseVoltage > RGB_LED_LIMITS.maxReverseVoltage && !lowVoltageBypass) {
    // Reverse voltage exceeding limit explodes instantly
    return {
      ...runtime,
      brightness: 0,
      thermalEnergy: Math.max(thermalEnergy, RGB_LED_LIMITS.thermalExplosionThreshold),
      exploded: true,
      pendingExplosionAt: undefined,
      smokeStartedAt: runtime.smokeStartedAt ?? params.nowMs,
      failureReason: "reverse",
      visualState: "exploded",
      explosionCurrent: runtime.explosionCurrent ?? current,
      lastUpdateAt: params.nowMs,
    };
  } else {
    // If limits exceeded under forward bias, explode instantly
    const overCurrentHard = forwardCurrent > RGB_LED_LIMITS.maxCurrent * 1.2;
    const overPowerHard = forwardPower > RGB_LED_LIMITS.maxPower * 1.2;
    if (forwardOn && !lowVoltageBypass && (overCurrentHard || overPowerHard)) {
      return {
        ...runtime,
        brightness: 0,
        thermalEnergy: Math.max(thermalEnergy, RGB_LED_LIMITS.thermalExplosionThreshold),
        exploded: true,
        pendingExplosionAt: undefined,
        smokeStartedAt: runtime.smokeStartedAt ?? params.nowMs,
        failureReason:
          forwardPower > RGB_LED_LIMITS.maxPower ? "overpower" : "overcurrent",
        visualState: "exploded",
        explosionCurrent: current,
        lastUpdateAt: params.nowMs,
      };
    }
    
    const overCurrentRatio = forwardCurrent > RGB_LED_LIMITS.maxCurrent
      ? (forwardCurrent - RGB_LED_LIMITS.maxCurrent) / RGB_LED_LIMITS.maxCurrent
      : 0;
    const overPowerRatio = forwardPower > RGB_LED_LIMITS.maxPower
      ? (forwardPower - RGB_LED_LIMITS.maxPower) / RGB_LED_LIMITS.maxPower
      : 0;
    const stress = Math.max(overCurrentRatio, overPowerRatio);

    if (forwardOn) {
      if (stress > 0) {
        thermalEnergy += stress * RGB_LED_LIMITS.thermalGain * params.dt;
      }
    } else {
      thermalEnergy = Math.max(0, thermalEnergy - RGB_LED_LIMITS.thermalCooldownPerSec * params.dt);
    }

    if (stress > 0) {
      failureReason = overPowerRatio >= overCurrentRatio ? "overpower" : "overcurrent";
    }

    if (thermalEnergy >= RGB_LED_LIMITS.thermalExplosionThreshold && !pendingExplosionAt) {
      pendingExplosionAt = params.nowMs + explosionDelayMs(runtime.flickerSeed + thermalEnergy * 11);
    }

    // Calculate brightness linearly based on current (matches Tinkercad behavior)
    // At max current (20mA), brightness = 1.0; at 0 current, brightness = 0.0
    const normalizedCurrent = forwardOn ? clamp(forwardCurrent / RGB_LED_LIMITS.maxCurrent, 0, 1) : 0;
    brightness = normalizedCurrent;
    
    if (thermalEnergy > RGB_LED_LIMITS.flickerStart && brightness > 0) {
      const wobbleStrength = Math.min(0.25, (thermalEnergy - RGB_LED_LIMITS.flickerStart) * 0.4);
      const wobble = 1 + wobbleStrength * Math.sin(params.nowMs / 60 + runtime.flickerSeed);
      brightness = clamp(brightness * wobble, 0, 1);
    }

    if (!forwardOn || brightness <= 0) {
      visualState = "off";
    } else if (stress > 0 || thermalEnergy > RGB_LED_LIMITS.flickerStart) {
      visualState = "hot";
    } else {
      visualState = "on";
    }
  }

  if (pendingExplosionAt && params.nowMs >= pendingExplosionAt) {
    return {
      ...runtime,
      brightness: 0,
      thermalEnergy: Math.max(thermalEnergy, RGB_LED_LIMITS.thermalExplosionThreshold),
      exploded: true,
      pendingExplosionAt: undefined,
      smokeStartedAt: runtime.smokeStartedAt ?? params.nowMs,
      failureReason: failureReason ?? runtime.failureReason,
      visualState: "exploded",
      explosionCurrent: current,
      lastUpdateAt: params.nowMs,
    };
  }

  return {
    ...runtime,
    brightness,
    thermalEnergy: clamp(thermalEnergy, 0, 2),
    exploded: false,
    pendingExplosionAt,
    smokeStartedAt,
    failureReason,
    visualState,
    lastUpdateAt: params.nowMs,
  };
}

/**
 * Update runtime state for all RGB LED channels
 */
export function updateRgbLedRuntime(params: {
  prev?: RgbLedRuntimeState;
  electrical: {
    red: { forwardVoltage?: number; current?: number; power?: number };
    green: { forwardVoltage?: number; current?: number; power?: number };
    blue: { forwardVoltage?: number; current?: number; power?: number };
  };
  dt: number;
  nowMs: number;
}): RgbLedRuntimeState {
  const prev = params.prev ?? createInitialRgbLedRuntime();
  
  return {
    red: updateRgbLedChannelRuntime({
      prev: prev.red,
      electrical: params.electrical.red,
      channel: "red",
      dt: params.dt,
      nowMs: params.nowMs,
    }),
    green: updateRgbLedChannelRuntime({
      prev: prev.green,
      electrical: params.electrical.green,
      channel: "green",
      dt: params.dt,
      nowMs: params.nowMs,
    }),
    blue: updateRgbLedChannelRuntime({
      prev: prev.blue,
      electrical: params.electrical.blue,
      channel: "blue",
      dt: params.dt,
      nowMs: params.nowMs,
    }),
  };
}

/**
 * Calculate combined RGB color from channel brightness values
 */
export function getRgbLedColor(runtime: RgbLedRuntimeState): string {
  const r = Math.round(runtime.red.brightness * 255);
  const g = Math.round(runtime.green.brightness * 255);
  const b = Math.round(runtime.blue.brightness * 255);
  return `rgb(${r}, ${g}, ${b})`;
}

/**
 * Check if any channel of the RGB LED has exploded
 */
export function isRgbLedExploded(runtime: RgbLedRuntimeState): boolean {
  return runtime.red.exploded || runtime.green.exploded || runtime.blue.exploded;
}

/**
 * Get overall brightness (max of all channels)
 */
export function getRgbLedOverallBrightness(runtime: RgbLedRuntimeState): number {
  return Math.max(runtime.red.brightness, runtime.green.brightness, runtime.blue.brightness);
}
