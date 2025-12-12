import {
  BaseElement,
  BaseElementProps,
} from "@/circuit_canvas/components/core/BaseElement";
import { useEffect, useState } from "react";
import { Group, Circle, Image, Ellipse, Arc, Rect } from "react-konva";
import { ShortCircuitNotification } from "./ShortCircuitNotification";

interface LedProps extends BaseElementProps {
  power?: number;
  color?: string; // 'red'|'green'|'blue'|'yellow'|'white'|'orange'
}

export default function Led(props: LedProps) {
  const [img, setImg] = useState<HTMLImageElement | null>(null);
  const [explosion, setExplosion] = useState<HTMLImageElement | null>(null);
  const [isHovered, setIsHovered] = useState(false); // NEW: hover state

  useEffect(() => {
    const chosen = (props.color || 'red').toLowerCase();
    const filenameMap: Record<string, string> = {
      red: 'red_led.svg',
      green: 'green_led.svg',
      blue: 'blue_led.svg',
      yellow: 'yellow_led.svg',
      white: 'white_led.svg',
      orange: 'orange_led.svg',
    };
    const asset = filenameMap[chosen] || 'red_led.svg';
    const image = new window.Image();
    image.src = `assets/circuit_canvas/elements/${asset}`;
    image.onload = () => setImg(image);
    image.alt = `LED ${chosen}`;

    const explosionImage = new window.Image();
    explosionImage.src = "assets/circuit_canvas/elements/Explosion.svg";
    explosionImage.onload = () => setExplosion(explosionImage);
    explosionImage.alt = "Bulb Explosion";
  }, [props.color]);

  // Treat incoming value as electrical power in milliwatts (mW) if solver provides power.
  // If solver supplies current (mA) instead, adjust mapping accordingly (see comments below).
  const powerMw = Math.max(0, props.power ?? 0);

  /*
    Physically inspired LED brightness model (simplified):
    Luminous flux ~ proportional to current above forward knee (Ifwd_knee) and saturates.
    Electrical power P = I * V. For a typical red LED Vf ~ 2.0V at nominal current.
    We approximate current from power by assuming Vf roughly constant once conducting:
        I_est ≈ P / Vf
    Then relative brightness ~ (I_est - I_knee)/(I_full - I_knee) with clamping and a gamma curve.

    We work directly with power to avoid extra solver demands.
  */

  // --- Tunable physical constants (approximate) ---
  const VF_EST = 2.0;            // Estimated forward voltage (V) for the LED color
  const I_KNEE_MA = 0.2;         // Knee current (mA) where emission begins to be faintly visible
  const I_FULL_MA = 20;          // Nominal current (mA) for full brightness
  const OVERLOAD_CURRENT_MA = 40; // Overload threshold (mA) for visual warning

  // Convert power (mW) to estimated current in mA: P(mW) = V * I(mA)  => I = P / V
  const iEstmA = VF_EST > 0 ? powerMw / VF_EST : 0; // since powerMw is mW and Vf in V, division yields mA

  // Normalized conduction (0..1) ignoring below knee
  let conduction = (iEstmA - I_KNEE_MA) / (I_FULL_MA - I_KNEE_MA);
  conduction = Math.min(Math.max(conduction, 0), 1);
  //if (conduction < 0) conduction = 0;
  //if (conduction > 1) conduction = 1;

  // Apply gamma so low currents still noticeable but fade occurs smoothly
  const GAMMA = 0.55; // <1 => boosts low end slightly while still allowing fade
  const brightness = conduction === 0 ? 0 : Math.pow(conduction, GAMMA);

  const isOverloaded = iEstmA > OVERLOAD_CURRENT_MA;

  // Visibility thresholds
  const VISIBLE_THRESHOLD = 0.02; // below this brightness we render nothing

  // Color specific glow tints (keep same red fallback values for others)
  const glowColorMap: Record<string, { base: string; shadow: string }> = {
    red: { base: 'rgba(255,40,40,1)', shadow: '#ff4d4d' },
    green: { base: 'rgba(40,255,110,1)', shadow: '#45ff6a' },
    blue: { base: 'rgba(80,160,255,1)', shadow: '#4da6ff' },
    yellow: { base: 'rgba(255,210,40,1)', shadow: '#ffd54d' },
    white: { base: 'rgba(255,255,255,1)', shadow: '#ffffff' },
    orange: { base: 'rgba(255,140,40,1)', shadow: '#ff994d' },
  };
  const glow = glowColorMap[(props.color || 'red').toLowerCase()] || glowColorMap.red;

  // Positions and sizes for glow effects per color (to align with LED image)
  const glowPositionMap: Record<
    string,
    {
      Image: {x: number; y: number;};
      rect: { x: number; y: number; width: number; height: number }; 
      arcTop: { x: number; y: number, outerRadius: number }; 
      arcBottom: { x: number; y: number } }
  > = {
    red: {
      Image: {x: -1, y: -2.5},
      rect: { x: 7, y: 17, width: 31, height: 10.1 },
      arcTop: { x: 22.5, y: 17, outerRadius: 15.5 },
      arcBottom: { x: 22.5, y: 27 },
    },
    green: {
      Image: {x: -2, y: -1},
      rect: { x: 7.5, y: 18, width: 31, height: 9.8 },  
      arcTop: { x: 23, y: 18, outerRadius: 15.5 },
      arcBottom: { x: 23, y: 27.7 },
    },
    blue: {
      Image: {x: -1, y: -2},
      rect: { x: 8, y: 18, width: 31, height: 10.1 },
      arcTop: { x: 23.5, y: 18, outerRadius: 15.5 },
      arcBottom: { x: 23.5, y: 28 },
    },
    yellow: {
      Image: {x: 0, y: -3},
      rect: { x: 7, y: 16.9, width: 31, height: 10 },
      arcTop: { x: 22.5, y: 17, outerRadius: 15.5 },
      arcBottom: { x: 22.5, y: 26.8 },
    },
    white: {
      Image: {x: -1, y: -3},
      rect: { x: 7.5, y: 17.4, width: 31, height: 10.1 },
      arcTop: { x: 22.5, y: 17.5, outerRadius: 16 },
      arcBottom: { x: 23, y: 27.4 },
    },
    orange: {
      Image: {x: -1.5, y: -2.5},
      rect: { x: 7.5, y: 16.9, width: 31, height: 10.1 },
      arcTop: { x: 23, y: 17, outerRadius: 15.5 },
      arcBottom: { x: 23, y: 26.9 },
    },
  };
  const chosenColor = (props.color || "red").toLowerCase();
  const pos = glowPositionMap[chosenColor] || glowPositionMap.red;
  const imgPos = glowPositionMap[chosenColor] || glowPositionMap.red;

  return (
    <BaseElement {...props}>
      <Group>
        {/* Always show the LED image, undimmed */}
        {img && (
          <Image
            x={imgPos.Image.x}
            y={imgPos.Image.y}
            image={img}
            width={50}
            height={70}
            shadowColor={props.selected ? "#000000" : undefined}
            shadowBlur={props.selected ? 7 : 0}
            shadowOffset={{ x: 12, y: -12 }}
            shadowOpacity={0}
            opacity={isOverloaded ? 0.8 : 1}
            onMouseEnter={() => setIsHovered(true)}  // Hover start
            onMouseLeave={() => setIsHovered(false)} // Hover end
          />
        )}

        {/* Overload/short circuit effect (overlays LED) */}
        {isOverloaded ? (
          <>
            {/* Explosion effect */}
            {explosion && (
              <Image
                image={explosion}
                x={5}
                y={8}
                width={35}
                height={35}
                shadowColor="#000000"
                shadowBlur={12}
                shadowOffset={{ x: 1, y: -1 }}
                shadowOpacity={0}
                zIndex={1000}
                onMouseEnter={() => setIsHovered(true)}  // Hover start
                onMouseLeave={() => setIsHovered(false)} // Hover end
              />
            )}
            {/* Show warning when hovered-Notification overlay */}
            {isHovered && (
            <ShortCircuitNotification
              show={true}
              message={`Approx current ${iEstmA.toFixed(2)} mA (over ${OVERLOAD_CURRENT_MA} mA)`}
            />
            )}
          </>
        ) : (
          // Normal LED glow with physically-inspired fade: nothing rendered below threshold
          brightness > VISIBLE_THRESHOLD && (
            <Group listening={false}>
              <Rect
                x={pos.rect.x}
                y={pos.rect.y}
                width={pos.rect.width}
                height={pos.rect.height}
                fill={glow.base}
                opacity={0.25 + 0.4 * brightness}
                cornerRadius={0}
                shadowColor={glow.shadow}
                shadowBlur={30 + 60 * brightness}
                shadowOpacity={0}
                listening={false}
                globalCompositeOperation="lighten"
              />

              {/* Semicircle top only, removed bottom arc for better look */}
              <Arc
                x={pos.arcTop.x}
                y={pos.arcTop.y }
                innerRadius={0}
                outerRadius={pos.arcTop.outerRadius}
                angle={180}
                rotation={180}
                fill={glow.base}
                opacity={0.25 + 0.4 * brightness}
                shadowColor={glow.shadow}
                shadowBlur={30 + 60 * brightness}
                shadowOpacity={0}
                listening={false}
                globalCompositeOperation="lighten"
              />

              {/* Add a soft bottom glow using Ellipse */}
              <Ellipse
                x={pos.rect.x + pos.rect.width / 2}
                y={pos.rect.y + pos.rect.height + 10}
                radiusX={pos.rect.width * 0.45}
                radiusY={5}
                fill={glow.base}
                opacity={0.15 + 0.16 * brightness}
                shadowColor={glow.shadow}
                shadowBlur={12 + 20 * brightness}
                shadowOpacity={0.12 + 0.13 * brightness}
                listening={false}
                globalCompositeOperation="lighten"
              />

              {/* Optionally, keep a subtle fade at the bottom for extra realism */}
              <Rect
                x={pos.rect.x}
                y={pos.rect.y + pos.rect.height - 5}
                width={pos.rect.width}
                height={4}
                fillLinearGradientStartPoint={{ x: 0, y: 0 }}
                fillLinearGradientEndPoint={{ x: 0, y: 4 }}
                fillLinearGradientColorStops={[0, glow.base, 1, 'rgba(0,0,0,0)']}
                opacity={0.12 + 0.15 * brightness}
                listening={false}
                globalCompositeOperation="lighten"
              />
            </Group>
          )
        )}
      </Group>
    </BaseElement>
  );
}