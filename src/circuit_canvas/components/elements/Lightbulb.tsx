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
  const [isHovered, setIsHovered] = useState(false); // NEW: hover state

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

  // --- Tunable constants ---
  const RATED_POWER_W = 5;
  const OVERLOAD_POWER_W = 7.5;
  const EXTINGUISH_THRESHOLD_W = 0.02;
  const GAMMA = 1.25;
  const HEAT_RISE_MS = 80;
  const COOL_FALL_MS = 80;
  const FRAME_INTERVAL_MS = 1000 / 60;

  // Compute instantaneous target brightness (0..1)
  let target = 0;
  if (rawPowerW > EXTINGUISH_THRESHOLD_W) {
    const rel = Math.min(rawPowerW / RATED_POWER_W, 1.5);
    target = Math.pow(Math.min(rel, 1), 1 / GAMMA);
    if (rel > 1) target = 1 + (rel - 1) * 0.4;
  }

  // Thermal inertia: smoothed brightness state
  const [thermalBrightness, setThermalBrightness] = useState(0);

  // Overload flag based on actual electrical input
  const isOverloaded = rawPowerW > OVERLOAD_POWER_W;

  useEffect(() => {
    if (isOverloaded) {
      setThermalBrightness(0);
      return;
    }
    const heating = target > thermalBrightness;
    const tau = heating ? HEAT_RISE_MS : COOL_FALL_MS;
    const alpha = 1 - Math.exp(-FRAME_INTERVAL_MS / tau);
    const id = requestAnimationFrame(() => {
      setThermalBrightness((prev) => prev + (target - prev) * alpha);
    });
    return () => cancelAnimationFrame(id);
  }, [target, thermalBrightness, isOverloaded]);

  // Clamp displayed brightness (0..~1.2) then derive final 0..1
  const displayBrightnessRaw = thermalBrightness;
  const displayBrightness = Math.min(displayBrightnessRaw, 1);

  // Color mapping (amber → yellow)
  const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
  const tColor = displayBrightness;
  const r = 255;
  // Keep the bulb distinctly yellow even at low brightness.
  const g = Math.round(lerp(180, 255, tColor));
  const b = Math.round(lerp(35, 0, tColor));
  const tint = `rgba(${r},${g},${b},1)`;

  // Glow sizing & opacity
  const clamp01 = (v: number) => Math.max(0, Math.min(1, v));
  const outerRadius = 16 + 94 * displayBrightness;
  const outerOpacity = clamp01(0.24 + 1.35 * displayBrightness);
  const shadowOpacity = clamp01(0.35 + 0.75 * displayBrightness);
  const innerRadius = 11 + 30 * displayBrightness;
  const innerOpacity = clamp01(0.12 + 0.75 * displayBrightness);
  const glassFillOpacity = clamp01(0.12 + 0.85 * displayBrightness);
  const glassFillSoftOpacity = clamp01(0.05 + 0.35 * displayBrightness);
  const showGlow = displayBrightness > 0.004;
  const showGlassFill = displayBrightness > 0.01;

  return (
    <BaseElement {...props}>
      <Group>
        {/* Overloaded state */}
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
                shadowOpacity={0}
                zIndex={1000}
              />
            )}
            {/* Notification only on hover */}
            {isHovered && (
              <ShortCircuitNotification
                show={true}
                message={`Power ${rawPowerW.toFixed(
                  2
                )} W exceeds rated ${RATED_POWER_W.toFixed(2)} W`}
              />
            )}
          </>
        ) : (
          // Normal glow
          showGlow && (
            <Group listening={false}>
              {/* Core glow (helps visibility at low power) */}
              <Circle
                x={75}
                y={60}
                radius={innerRadius}
                fill={tint}
                opacity={innerOpacity}
                shadowColor={tint}
                shadowBlur={24 + 56 * displayBrightness}
                shadowOpacity={shadowOpacity}
              />
              <Circle
                x={75}
                y={60}
                radius={outerRadius}
                fill={tint}
                opacity={outerOpacity}
                shadowColor={tint}
                shadowBlur={38 + 96 * displayBrightness}
                shadowOpacity={shadowOpacity}
              />
            </Group>
          )
        )}

        {/* Bulb image */}
        {img && (
          <>
            <Image
              image={img}
              width={150}
              height={150}
              shadowColor={props.selected ? "#000000" : undefined}
              shadowBlur={props.selected ? 12 : 0}
              shadowOffset={{ x: 15, y: -15 }}
              shadowOpacity={0}
              opacity={isOverloaded ? 0.8 : 1}
              // Hover handlers
              onMouseEnter={() => setIsHovered(true)}
              onMouseLeave={() => setIsHovered(false)}
            />

            {/*
              Glass fill tint: makes the whole bulb dome look illuminated.
              Drawn after the image with source-atop so it only appears where the bulb pixels exist.
              Visual-only; does not change electrical logic.
            */}
            {!isOverloaded && showGlassFill && glassFillOpacity > 0 && (
              <>
                {/* Main dome fill */}
                <Circle
                  listening={false}
                  x={75}
                  y={56}
                  radius={62}
                  fill={tint}
                  opacity={glassFillOpacity}
                  globalCompositeOperation="source-atop"
                />
                {/* Softer halo fill to even out the glass */}
                <Circle
                  listening={false}
                  x={75}
                  y={56}
                  radius={72}
                  fill={tint}
                  opacity={glassFillSoftOpacity}
                  globalCompositeOperation="source-atop"
                />
              </>
            )}
          </>
        )}
      </Group>
    </BaseElement>
  );
}
