import { LedRuntimeState, LedVisualState } from "../types/circuit";

const clamp = (value: number, min: number, max: number) => Math.min(Math.max(value, min), max);

// Effective series resistance used by the circuit solver when the LED is ON.
// Tuned to match TinkerCAD-like behavior for "battery directly to LED" scenarios.
export const LED_INTERNAL_RESISTANCE = 6.2; // ohms

// Per-color effective series resistance (piecewise-linear LED model).
// Red is tuned so:
// - 9V battery (Rint=1.45Ω) directly to LED => ~0.915A
// - 1x AA (1.5V) can produce a visible low-current glow
const seriesResistanceMap: Record<string, number> = {
  red: 6.856, // keeps 9V case ~915mA when Vf(red)=1.4V
};

export const LED_LIMITS = {
  forwardVoltageDefault: 2.0, // V
  maxCurrent: 0.02, // A (20 mA)
  maxPower: 0.08, // W (80 mW) — relaxed margin
  maxReverseVoltage: 50, // V — allow all typical low-voltage batteries to reverse-bias without explosion
  // Faster onset for abuse-driven explosion
  thermalExplosionThreshold: 0.6, // lower threshold so sustained abuse triggers sooner
  thermalGain: 2.0, // quicker heat-up under stress
  thermalCooldownPerSec: 0.35, // cooling unchanged
  flickerStart: 0.5, // start flicker earlier as device overheats
  explosionDelayMs: { min: 200, max: 300 }, // faster delay window post-threshold (still non-instant)
};

const forwardVoltageMap: Record<string, number> = {
  // Lower knee for red so a single 1.5V cell can forward-bias slightly (Tinkercad-like "faint glow").
  // Combined with seriesResistanceMap.red this still matches the 9V direct-to-LED current.
  red: 1.4,
  orange: 1.8,
  yellow: 1.9,
  green: 2.0,
  blue: 2.8,
  white: 2.8,
};

const seededRandom = (seed: number) => {
  const x = Math.sin(seed) * 10000;
  return x - Math.floor(x);
};

const explosionDelayMs = (seed: number) => {
  const { min, max } = LED_LIMITS.explosionDelayMs;
  const r = seededRandom(seed || Date.now());
  return min + r * (max - min);
};

export const getLedForwardVoltage = (color?: string) => {
  const key = (color || "red").toLowerCase();
  return forwardVoltageMap[key] ?? LED_LIMITS.forwardVoltageDefault;
};

export const getLedSeriesResistance = (color?: string) => {
  const key = (color || "red").toLowerCase();
  return seriesResistanceMap[key] ?? LED_INTERNAL_RESISTANCE;
};

export const createInitialLedRuntime = (): LedRuntimeState => ({
  brightness: 0,
  thermalEnergy: 0,
  exploded: false,
  visualState: "off",
  flickerSeed: Math.random() * 1000,
  lastUpdateAt: undefined,
});

export function updateLedRuntime(params: {
  prev?: LedRuntimeState;
  electrical: { forwardVoltage?: number; current?: number; power?: number; color?: string };
  dt: number; // seconds since last tick
  nowMs: number;
}): LedRuntimeState {
  const runtime = { ...(params.prev ?? createInitialLedRuntime()) } as LedRuntimeState;
  const vf = getLedForwardVoltage(params.electrical.color);
  const forwardVoltage = params.electrical.forwardVoltage ?? 0;
  const current = params.electrical.current ?? 0;
  const power = params.electrical.power ?? forwardVoltage * current;
  const reverseVoltage = forwardVoltage < 0 ? -forwardVoltage : 0;
  const lowVoltageBypass = Math.abs(forwardVoltage) <= 2.2; // guard: small cells should never explode

  // Under low-voltage conditions, allow lighting but never accumulate heat or explode.
  if (lowVoltageBypass) {
    const forwardOn = forwardVoltage >= vf && current > 0;
    const forwardCurrent = forwardOn ? Math.max(current, 0) : 0;
    const brightness = forwardOn ? clamp(forwardCurrent / LED_LIMITS.maxCurrent, 0, 1) : 0;
    const cooled = Math.max(0, (runtime.thermalEnergy ?? 0) - LED_LIMITS.thermalCooldownPerSec * params.dt);
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
      thermalEnergy: Math.max(runtime.thermalEnergy, LED_LIMITS.thermalExplosionThreshold),
      visualState: "exploded",
      // Keep the displayed explosion current in sync with whatever the
      // simulation provides (can be a hypothetical "intact" current estimate).
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

  if (reverseVoltage > LED_LIMITS.maxReverseVoltage && !lowVoltageBypass) {
    // Per spec: reverse voltage exceeding limit explodes instantly
    return {
      ...runtime,
      brightness: 0,
      thermalEnergy: Math.max(thermalEnergy, LED_LIMITS.thermalExplosionThreshold),
      exploded: true,
      pendingExplosionAt: undefined,
      smokeStartedAt: runtime.smokeStartedAt ?? params.nowMs,
      failureReason: "reverse",
      visualState: "exploded",
      explosionCurrent: runtime.explosionCurrent ?? current,
      lastUpdateAt: params.nowMs,
    };
  } else {
    // If limits exceeded under forward bias, explode instantly (deterministic)
    // Require a margin above limits to avoid false positives on low-voltage cells
    const overCurrentHard = forwardCurrent > LED_LIMITS.maxCurrent * 1.2;
    const overPowerHard = forwardPower > LED_LIMITS.maxPower * 1.2;
    if (forwardOn && !lowVoltageBypass && (overCurrentHard || overPowerHard)) {
      return {
        ...runtime,
        brightness: 0,
        thermalEnergy: Math.max(thermalEnergy, LED_LIMITS.thermalExplosionThreshold),
        exploded: true,
        pendingExplosionAt: undefined,
        smokeStartedAt: runtime.smokeStartedAt ?? params.nowMs,
        failureReason:
          forwardPower > LED_LIMITS.maxPower ? "overpower" : "overcurrent",
        visualState: "exploded",
        explosionCurrent: current,
        lastUpdateAt: params.nowMs,
      };
    }
    const overCurrentRatio = forwardCurrent > LED_LIMITS.maxCurrent
      ? (forwardCurrent - LED_LIMITS.maxCurrent) / LED_LIMITS.maxCurrent
      : 0;
    const overPowerRatio = forwardPower > LED_LIMITS.maxPower
      ? (forwardPower - LED_LIMITS.maxPower) / LED_LIMITS.maxPower
      : 0;
    const stress = Math.max(overCurrentRatio, overPowerRatio);

    if (forwardOn) {
      const baseRise = forwardCurrent > 0 ? 0.05 : 0;
      thermalEnergy += (baseRise + stress * LED_LIMITS.thermalGain) * params.dt;
    } else {
      thermalEnergy = Math.max(0, thermalEnergy - LED_LIMITS.thermalCooldownPerSec * params.dt);
    }

    if (stress > 0) {
      failureReason = overPowerRatio >= overCurrentRatio ? "overpower" : "overcurrent";
      thermalEnergy += stress * LED_LIMITS.thermalGain * params.dt;
    }

    if (thermalEnergy >= LED_LIMITS.thermalExplosionThreshold && !pendingExplosionAt) {
      pendingExplosionAt = params.nowMs + explosionDelayMs(runtime.flickerSeed + thermalEnergy * 11);
    }

    // Apply gamma correction to make LED more sensitive and prominent at lower currents
    const normalizedCurrent = forwardOn ? clamp(forwardCurrent / LED_LIMITS.maxCurrent, 0, 1) : 0;
    const gamma = 0.5; // <1 makes LED brighter at lower currents (more prominent)
    brightness = Math.pow(normalizedCurrent, gamma);
    
    if (thermalEnergy > LED_LIMITS.flickerStart && brightness > 0) {
      const wobbleStrength = Math.min(0.25, (thermalEnergy - LED_LIMITS.flickerStart) * 0.4);
      const wobble = 1 + wobbleStrength * Math.sin(params.nowMs / 60 + runtime.flickerSeed);
      brightness = clamp(brightness * wobble, 0, 1);
    }

    if (!forwardOn || brightness <= 0) {
      visualState = "off";
    } else if (stress > 0 || thermalEnergy > LED_LIMITS.flickerStart) {
      visualState = "hot";
    } else {
      visualState = "on";
    }
  }

  if (pendingExplosionAt && params.nowMs >= pendingExplosionAt) {
    return {
      ...runtime,
      brightness: 0,
      thermalEnergy: Math.max(thermalEnergy, LED_LIMITS.thermalExplosionThreshold),
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
