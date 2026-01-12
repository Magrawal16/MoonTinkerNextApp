import { useEffect, useMemo, useRef, useState } from "react";
import { Arc, Circle, Ellipse, Group, Image, Rect } from "react-konva";
import { RgbLedRuntimeState } from "@/circuit_canvas/types/circuit";
import { 
  RGB_LED_LIMITS, 
  createInitialRgbLedRuntime,
  getRgbLedColor,
  isRgbLedExploded,
  getRgbLedOverallBrightness
} from "@/circuit_canvas/utils/rgbLedBehavior";
import { BaseElement, BaseElementProps } from "@/circuit_canvas/components/core/BaseElement";
import { ShortCircuitNotification } from "./ShortCircuitNotification";

interface RgbLedProps extends BaseElementProps {
  rgbLedType?: "common-cathode" | "common-anode";
  electrical?: {
    red?: { current?: number; forwardVoltage?: number; power?: number };
    green?: { current?: number; forwardVoltage?: number; power?: number };
    blue?: { current?: number; forwardVoltage?: number; power?: number };
  };
  runtime?: RgbLedRuntimeState;
}

type SmokeParticle = {
  id: number;
  x: number;
  y: number;
  radius: number;
  drift: number;
  rise: number;
  lifetime: number;
};

const clamp = (value: number, min: number, max: number) => Math.min(Math.max(value, min), max);

const seeded = (seed: number) => {
  const x = Math.sin(seed) * 10000;
  return x - Math.floor(x);
};

const createSmokeParticles = (seed: number): SmokeParticle[] => {
  const count = 7;
  const particles: SmokeParticle[] = [];
  for (let i = 0; i < count; i++) {
    const s = seed + i * 17;
    particles.push({
      id: i,
      x: 40 + seeded(s) * 25,
      y: 20 + (seeded(s + 5) - 0.5) * 6,
      radius: 4 + seeded(s + 11) * 5,
      drift: (seeded(s + 23) - 0.5) * 14,
      rise: 26 + seeded(s + 31) * 18,
      lifetime: 1.4 + seeded(s + 41) * 0.9,
    });
  }
  return particles;
};

const useKonvaImage = (src: string | null) => {
  const [image, setImage] = useState<HTMLImageElement | null>(null);

  useEffect(() => {
    if (!src) {
      setImage(null);
      return;
    }
    const img = new window.Image();
    img.src = src;
    img.onload = () => setImage(img);
    img.alt = src;
    return () => setImage(null);
  }, [src]);

  return image;
};

const playPopSound = () => {
  try {
    if (typeof window === "undefined" || typeof AudioContext === "undefined") return;
    const ctx = new AudioContext();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = "square";
    osc.frequency.setValueAtTime(120, ctx.currentTime);
    gain.gain.setValueAtTime(0.18, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.12);
    osc.connect(gain).connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 0.12);
  } catch {
    // ignore audio errors (autoplay/permissions)
  }
};

export default function RgbLed(props: RgbLedProps) {
  const fallbackRuntimeRef = useRef<RgbLedRuntimeState>(createInitialRgbLedRuntime());
  const runtime = props.runtime ?? fallbackRuntimeRef.current;
  const [isHovered, setIsHovered] = useState(false);

  // Load the RGB LED image
  const rgbLedImage = useKonvaImage("assets/circuit_canvas/elements/rgb_led.svg");
  const explosionImg = useKonvaImage(
    isRgbLedExploded(runtime) ? "assets/circuit_canvas/elements/Explosion.svg" : null
  );
  const baseReady = Boolean(rgbLedImage);

  // Get individual channel states
  const redState = runtime.red;
  const greenState = runtime.green;
  const blueState = runtime.blue;

  // Calculate combined color and brightness
  const combinedColor = useMemo(() => getRgbLedColor(runtime), [runtime]);
  const overallBrightness = getRgbLedOverallBrightness(runtime);
  const isExploded = isRgbLedExploded(runtime);

  // Check for warning conditions on each channel
  const redCurrent = Math.max(0, props.electrical?.red?.current ?? 0);
  const greenCurrent = Math.max(0, props.electrical?.green?.current ?? 0);
  const blueCurrent = Math.max(0, props.electrical?.blue?.current ?? 0);
  
  const redPower = Math.max(0, props.electrical?.red?.power ?? 0);
  const greenPower = Math.max(0, props.electrical?.green?.power ?? 0);
  const bluePower = Math.max(0, props.electrical?.blue?.power ?? 0);

  const redForwardV = props.electrical?.red?.forwardVoltage ?? 0;
  const greenForwardV = props.electrical?.green?.forwardVoltage ?? 0;
  const blueForwardV = props.electrical?.blue?.forwardVoltage ?? 0;

  const reverseOverRed = redForwardV < -RGB_LED_LIMITS.maxReverseVoltage;
  const reverseOverGreen = greenForwardV < -RGB_LED_LIMITS.maxReverseVoltage;
  const reverseOverBlue = blueForwardV < -RGB_LED_LIMITS.maxReverseVoltage;

  const overCurrentRed = redCurrent > RGB_LED_LIMITS.maxCurrent;
  const overCurrentGreen = greenCurrent > RGB_LED_LIMITS.maxCurrent;
  const overCurrentBlue = blueCurrent > RGB_LED_LIMITS.maxCurrent;

  const overPowerRed = redPower > RGB_LED_LIMITS.maxPower;
  const overPowerGreen = greenPower > RGB_LED_LIMITS.maxPower;
  const overPowerBlue = bluePower > RGB_LED_LIMITS.maxPower;

  // Determine if any channel is hot
  const isHot = (redState.visualState === "hot" || greenState.visualState === "hot" || blueState.visualState === "hot") && !isExploded;

  // Smoke animation state
  const [smokeParticles, setSmokeParticles] = useState<SmokeParticle[]>([]);
  const [smokeTick, setSmokeTick] = useState<number>(() => Date.now());
  const smokeRafRef = useRef<number | null>(null);
  const smokeStartRef = useRef<number | null>(null);
  const soundPlayedRef = useRef(false);

  // Get earliest smoke start time from any channel
  const smokeStartedAt = useMemo(() => {
    const times = [redState.smokeStartedAt, greenState.smokeStartedAt, blueState.smokeStartedAt].filter(Boolean) as number[];
    return times.length > 0 ? Math.min(...times) : undefined;
  }, [redState.smokeStartedAt, greenState.smokeStartedAt, blueState.smokeStartedAt]);

  useEffect(() => {
    if (!isExploded || !smokeStartedAt) {
      soundPlayedRef.current = false;
      return undefined;
    }
    if (smokeStartRef.current === smokeStartedAt) return undefined;

    smokeStartRef.current = smokeStartedAt;
    const seed = smokeStartedAt + (redState.flickerSeed + greenState.flickerSeed + blueState.flickerSeed);
    setSmokeParticles(createSmokeParticles(seed));
    setSmokeTick(smokeStartedAt);

    if (!soundPlayedRef.current) {
      playPopSound();
      soundPlayedRef.current = true;
    }

    const animate = () => {
      setSmokeTick(Date.now());
      smokeRafRef.current = requestAnimationFrame(animate);
    };
    animate();

    return () => {
      if (smokeRafRef.current) cancelAnimationFrame(smokeRafRef.current);
      smokeRafRef.current = null;
    };
  }, [isExploded, smokeStartedAt, redState.flickerSeed, greenState.flickerSeed, blueState.flickerSeed]);

  useEffect(() => {
    return () => {
      if (smokeRafRef.current) cancelAnimationFrame(smokeRafRef.current);
    };
  }, []);

  // Glow position for RGB LED (centered on the bulb area)
  const glowPosition = useMemo(() => ({
    rect: { x: 25, y: 20, width: 55, height: 25 },
    arcTop: { x: 52, y: 20, outerRadius: 27 },
  }), []);

  const glowVisible = overallBrightness > 0.02 && !isExploded;
  const baseOpacity = 1;
  const hotOverlayOpacity = isHot ? 0.18 + 0.35 * clamp(
    Math.max(redState.thermalEnergy ?? 0, greenState.thermalEnergy ?? 0, blueState.thermalEnergy ?? 0), 
    0, 1
  ) : 0;

  const smokeElapsed = smokeStartedAt
    ? Math.max(0, (smokeTick - smokeStartedAt) / 1000)
    : 0;

  // Generate warning message
  const warningMessage = useMemo(() => {
    if (isExploded) {
      const maxCurrent = Math.max(
        (props.electrical?.red?.current ?? 0),
        (props.electrical?.green?.current ?? 0),
        (props.electrical?.blue?.current ?? 0)
      );
      return `Current through RGB LED channel is ${(maxCurrent * 1000).toFixed(0)} mA, while absolute maximum is ${(RGB_LED_LIMITS.maxCurrent * 1000).toFixed(1)} mA per channel.`;
    }
    if (reverseOverRed || reverseOverGreen || reverseOverBlue) {
      const channel = reverseOverRed ? "Red" : reverseOverGreen ? "Green" : "Blue";
      const voltage = reverseOverRed ? redForwardV : reverseOverGreen ? greenForwardV : blueForwardV;
      return `${channel} channel: Reverse bias ${Math.abs(voltage).toFixed(2)} V > ${RGB_LED_LIMITS.maxReverseVoltage.toFixed(1)} V`;
    }
    if (overPowerRed || overPowerGreen || overPowerBlue) {
      const channel = overPowerRed ? "Red" : overPowerGreen ? "Green" : "Blue";
      const power = overPowerRed ? redPower : overPowerGreen ? greenPower : bluePower;
      return `${channel} channel: Power ${(power * 1000).toFixed(1)} mW > ${(RGB_LED_LIMITS.maxPower * 1000).toFixed(0)} mW`;
    }
    if (overCurrentRed || overCurrentGreen || overCurrentBlue) {
      const channel = overCurrentRed ? "Red" : overCurrentGreen ? "Green" : "Blue";
      const current = overCurrentRed ? redCurrent : overCurrentGreen ? greenCurrent : blueCurrent;
      return `${channel} channel: Current ${(current * 1000).toFixed(1)} mA > ${(RGB_LED_LIMITS.maxCurrent * 1000).toFixed(0)} mA`;
    }
    return undefined;
  }, [
    isExploded, reverseOverRed, reverseOverGreen, reverseOverBlue,
    overPowerRed, overPowerGreen, overPowerBlue,
    overCurrentRed, overCurrentGreen, overCurrentBlue,
    redForwardV, greenForwardV, blueForwardV,
    redPower, greenPower, bluePower,
    redCurrent, greenCurrent, blueCurrent,
    props.electrical
  ]);

  return (
    <BaseElement {...props}>
      <Group>
        {/* RGB LED Image */}
        {rgbLedImage && (
          <Image
            x={0}
            y={0}
            image={rgbLedImage}
            width={105}
            height={110}
            opacity={baseOpacity}
            shadowColor={props.selected ? "#000000" : undefined}
            shadowBlur={props.selected ? 7 : 0}
            shadowOffset={{ x: 12, y: -12 }}
            shadowOpacity={0}
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => setIsHovered(false)}
          />
        )}

        {/* RGB Glow Effect */}
        {baseReady && glowVisible && (
          <Group listening={false}>
            {/* Main glow rectangle */}
            <Rect
              x={glowPosition.rect.x}
              y={glowPosition.rect.y}
              width={glowPosition.rect.width}
              height={glowPosition.rect.height}
              fill={combinedColor}
              opacity={0.15 + 0.75 * overallBrightness}
              shadowColor={combinedColor}
              shadowBlur={40 + 80 * overallBrightness}
              shadowOpacity={0.2 + 0.6 * overallBrightness}
              listening={false}
              globalCompositeOperation="lighten"
            />
            {/* Top arc glow */}
            <Arc
              x={glowPosition.arcTop.x}
              y={glowPosition.arcTop.y}
              innerRadius={0}
              outerRadius={glowPosition.arcTop.outerRadius}
              angle={180}
              rotation={180}
              fill={combinedColor}
              opacity={0.15 + 0.75 * overallBrightness}
              shadowColor={combinedColor}
              shadowBlur={40 + 80 * overallBrightness}
              shadowOpacity={0.2 + 0.6 * overallBrightness}
              listening={false}
              globalCompositeOperation="lighten"
            />
            {/* Bottom reflection */}
            <Ellipse
              x={glowPosition.rect.x + glowPosition.rect.width / 2}
              y={glowPosition.rect.y + glowPosition.rect.height + 15}
              radiusX={glowPosition.rect.width * 0.4}
              radiusY={6}
              fill={combinedColor}
              opacity={0.2 + 0.35 * overallBrightness}
              shadowColor={combinedColor}
              shadowBlur={15 + 35 * overallBrightness}
              shadowOpacity={0.25 + 0.45 * overallBrightness}
              listening={false}
              globalCompositeOperation="lighten"
            />
          </Group>
        )}

        {/* Hot overlay effect */}
        {baseReady && hotOverlayOpacity > 0 && (
          <Rect
            x={glowPosition.rect.x - 4}
            y={glowPosition.rect.y - 8}
            width={glowPosition.rect.width + 8}
            height={glowPosition.rect.height + 18}
            fillLinearGradientStartPoint={{ x: 0, y: 0 }}
            fillLinearGradientEndPoint={{ x: 0, y: glowPosition.rect.height + 18 }}
            fillLinearGradientColorStops={[0, "rgba(255,110,0,0.6)", 1, "rgba(255,40,0,0.1)"]}
            opacity={hotOverlayOpacity}
            listening={false}
            cornerRadius={3}
            shadowColor="rgba(255,120,40,0.6)"
            shadowBlur={30}
          />
        )}

        {/* Explosion image */}
        {baseReady && isExploded && explosionImg && (
          <Image
            image={explosionImg}
            x={30}
            y={10}
            width={45}
            height={45}
            shadowColor="#000000"
            shadowBlur={12}
            shadowOffset={{ x: 1, y: -1 }}
            shadowOpacity={0}
            listening={false}
          />
        )}

        {/* Smoke particles */}
        {baseReady && smokeParticles.map((p) => {
          if (!smokeStartedAt) return null;
          const progress = smokeElapsed / p.lifetime;
          if (progress > 1) return null;
          const x = p.x + p.drift * progress;
          const y = p.y - p.rise * progress;
          const opacity = 0.7;
          const scale = 1 + progress * 0.8;
          return (
            <Circle
              key={p.id}
              x={x}
              y={y}
              radius={p.radius * scale}
              fill="rgba(80,80,80,0.4)"
              opacity={opacity}
              shadowBlur={4}
              shadowColor="rgba(60,60,60,0.4)"
              listening={false}
            />
          );
        })}

        {/* Warning notification on hover */}
        {baseReady && isHovered && warningMessage && (
          <ShortCircuitNotification show={true} message={warningMessage} />
        )}
      </Group>
    </BaseElement>
  );
}
