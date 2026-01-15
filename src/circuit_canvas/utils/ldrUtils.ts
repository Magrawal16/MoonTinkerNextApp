const MIN_R = 506;
const MAX_R = 180000;

/**
 * Converts light level (0–100) to resistance (log scale)
 * 0   → dark  → MAX_R
 * 100 → bright → MIN_R
 */
export function lightLevelToResistance(lightLevel: number): number {
  const clamped = Math.max(0, Math.min(100, lightLevel));

  // invert so 0 = dark, 100 = bright
  const t = 1 - clamped / 100;

  const lnMin = Math.log(MIN_R);
  const lnMax = Math.log(MAX_R);

  const resistance = Math.exp(lnMin + t * (lnMax - lnMin));

  return Math.round(resistance);
}
