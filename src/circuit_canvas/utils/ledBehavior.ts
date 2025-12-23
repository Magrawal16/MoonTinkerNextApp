import { LedRuntimeState, LedVisualState } from "../types/circuit";

const clamp = (value: number, min: number, max: number) => Math.min(Math.max(value, min), max);

export const LED_INTERNAL_RESISTANCE = 100; // ohms – approximates ~20 mA at ~2 V

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
  red: 1.0,
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
        explosionCurrent: runtime.explosionCurrent ?? current,
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

    brightness = forwardOn ? clamp(forwardCurrent / LED_LIMITS.maxCurrent, 0, 1) : 0;
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
      explosionCurrent: runtime.explosionCurrent ?? current,
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
