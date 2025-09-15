import {
  BaseElement,
  BaseElementProps,
} from "@/circuit_canvas/components/core/BaseElement";
import { useEffect, useState } from "react";
import { Group, Circle, Image } from "react-konva";
import { ShortCircuitNotification } from "./ShortCircuitNotification";

interface LightbulbProps extends BaseElementProps {
  power?: number; // Or you can use "current"/"voltage"
}

export default function Lightbulb(props: LightbulbProps) {
  const [img, setImg] = useState<HTMLImageElement | null>(null);
  const [explosion, setExplosion] = useState<HTMLImageElement | null>(null);

  useEffect(() => {
    const image = new window.Image();
    image.src = "assets/circuit_canvas/elements/bulb.svg";
    image.onload = () => setImg(image);
    image.alt = "Lightbulb";

    const explosionImage = new window.Image();
    explosionImage.src = "assets/circuit_canvas/elements/Explosion.svg";
    explosionImage.onload = () => setExplosion(explosionImage);
    explosionImage.alt = "Bulb Explosion";
  }, []);

  // Raw electrical power (assumed in watts) coming from solver; clamp to >=0
  const rawPowerW = Math.max(0, props.power ?? 0);

  /*
    Incandescent bulb visual model (simplified):
      - A tungsten filament's light output roughly follows power^n where n ~ 1.2–1.6 near rated.
      - Color temperature increases with filament temperature (low power = dull red, high = bright warm white).
      - Thermal inertia: brightness changes are not instantaneous (filament heats/cools over tens of ms to seconds).
  */

  // --- Tunable constants ---
  const RATED_POWER_W = 5;           // Visual full brightness reference (e.g., 5W miniature bulb)
  const OVERLOAD_POWER_W = 7.5;      // Above this show overload effect
  const EXTINGUISH_THRESHOLD_W = 0.02; // Below this treat bulb as off
  const GAMMA = 1.25;                // Brightness exponent (>1 darkens low end somewhat)
  const HEAT_RISE_MS = 250;          // Approx heating time constant (ms)
  const COOL_FALL_MS = 400;          // Cooling slower than heating
  const FRAME_INTERVAL_MS = 1000 / 60; // Assuming ~60 FPS render cadence

  // Compute instantaneous target brightness (0..1)
  let target = 0;
  if (rawPowerW > EXTINGUISH_THRESHOLD_W) {
    const rel = Math.min(rawPowerW / RATED_POWER_W, 1.5); // allow slight overdrive >1 for hotspot
    target = Math.pow(Math.min(rel, 1), 1 / GAMMA); // gamma mapping (invert since we want power^n -> brightness)
    // If over-rated but within 1.5x, gently push brightness above 1 for a stronger glow falloff later
    if (rel > 1) target = 1 + (rel - 1) * 0.4; // cap around 1.2 at 1.5x
  }

  // Thermal inertia: we keep an internal smoothed brightness state
  const [thermalBrightness, setThermalBrightness] = useState(0);
  useEffect(() => {
    // Decide smoothing factor per frame based on heating vs cooling
    const heating = target > thermalBrightness;
    const tau = heating ? HEAT_RISE_MS : COOL_FALL_MS; // time constant
    const alpha = 1 - Math.exp(-FRAME_INTERVAL_MS / tau); // exponential smoothing per frame
    const id = requestAnimationFrame(() => {
      setThermalBrightness((prev) => prev + (target - prev) * alpha);
    });
    return () => cancelAnimationFrame(id);
  }, [target, thermalBrightness]);

  // Clamp displayed brightness (0..~1.2) then derive final 0..1 for most visuals
  const displayBrightnessRaw = thermalBrightness;
  const displayBrightness = Math.min(displayBrightnessRaw, 1);
  const overloadFactor = Math.max(0, displayBrightnessRaw - 1) / 0.2; // 0..1 if over 1

  // Overload flag based on actual electrical input
  const isOverloaded = rawPowerW > OVERLOAD_POWER_W;

  // Color mapping: keep a saturated warm yellow at high power (closer to earlier look)
  // Blend from deep amber (255,100,20) to rich golden yellow (255,215,0) instead of pale warm white.
  const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
  const tColor = displayBrightness; // 0..1
  const r = 255;
  const g = Math.round(lerp(100, 215, tColor));
  const b = Math.round(lerp(20, 0, tColor));
  const tint = `rgba(${r},${g},${b},1)`;

  // Glow sizing & opacity
  const outerRadius = 10 + 70 * displayBrightness; // scales with brightness
  const outerOpacity = 0.10 + 0.70 * displayBrightness; // soft ramp
  const hotspotRadius = 2 + 14 * displayBrightness;
  const hotspotOpacity = 0.25 + 0.65 * displayBrightness;

  const showGlow = displayBrightness > 0.01;

  return (
    <BaseElement {...props}>
      <Group>
        {/* Overloaded visual: short circuit */}
  {isOverloaded ? (
          <>
            {/* Explosion effect */}
            {explosion && (
              <Image
                image={explosion}
                x={37.5}
                y={30}
                width={75}
                height={75}
                shadowColor="#000000"
                shadowBlur={12}
                shadowOffset={{ x: 1, y: -1 }}
                shadowOpacity={2}
                zIndex={1000}
              />
            )}
            {/* Notification overlay */}
            <ShortCircuitNotification
              show={isOverloaded}
              message={`Power ${rawPowerW.toFixed(2)} W exceeds rated ${RATED_POWER_W.toFixed(2)} W`}
            />
          </>
        ) : (
          showGlow && (
            <Group listening={false}>
              {/* Outer diffuse glow */}
              <Circle
                x={75}
                y={60}
                radius={outerRadius}
                fill={tint}
                opacity={outerOpacity}
                shadowColor={tint}
                shadowBlur={20 + 40 * displayBrightness}
                shadowOpacity={0.5 + 0.4 * displayBrightness}
              />
              
            </Group>
          )
        )}

        {/* Always show bulb image. If overloaded, dim it for effect. */}
        {img && (
          <Image
            image={img}
            width={150}
            height={150}
            shadowColor={props.selected ? "#000000" : undefined}
            shadowBlur={props.selected ? 12 : 0}
            shadowOffset={{ x: 15, y: -15 }}
            shadowOpacity={props.selected ? 2 : 0}
            opacity={isOverloaded ? 0.8 : 1}
          />
        )}
      </Group>
    </BaseElement>
  );
}
