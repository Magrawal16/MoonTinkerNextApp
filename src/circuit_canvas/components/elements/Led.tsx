import { useEffect, useMemo, useRef, useState } from "react";
import { Arc, Circle, Ellipse, Group, Image, Line, Rect } from "react-konva";
import { LedRuntimeState } from "@/circuit_canvas/types/circuit";
import { LED_LIMITS, createInitialLedRuntime } from "@/circuit_canvas/utils/ledBehavior";
import { BaseElement, BaseElementProps } from "@/circuit_canvas/components/core/BaseElement";
import { ShortCircuitNotification } from "./ShortCircuitNotification";

interface LedProps extends BaseElementProps {
  color?: string; // 'red'|'green'|'blue'|'yellow'|'white'|'orange'
  electrical?: {
    current?: number;
    forwardVoltage?: number;
    power?: number;
    explosionCurrentEstimate?: number;
  };
  runtime?: LedRuntimeState;
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
      x: 14 + seeded(s) * 18,
      y: 10 + (seeded(s + 5) - 0.5) * 6,
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

export default function Led(props: LedProps) {
  const fallbackRuntimeRef = useRef<LedRuntimeState>(createInitialLedRuntime());
  const runtime = props.runtime ?? fallbackRuntimeRef.current;
  const [isHovered, setIsHovered] = useState(false);

  const chosenColor = (props.color || "red").toLowerCase();
  const filenameMap: Record<string, string> = {
    red: "red_led.svg",
    green: "green_led.svg",
    blue: "blue_led.svg",
    yellow: "yellow_led.svg",
    white: "white_led.svg",
    orange: "orange_led.svg",
  };
  const asset = filenameMap[chosenColor] || "red_led.svg";
  const ledImage = useKonvaImage(`assets/circuit_canvas/elements/${asset}`);
  const explosionImg = useKonvaImage(
    runtime.exploded ? "assets/circuit_canvas/elements/Explosion.svg" : null
  );
  const baseReady = Boolean(ledImage);

  const brightness = clamp(runtime.brightness ?? 0, 0, 1);
  const isExploded = !!runtime.exploded;
  const isHot = runtime.visualState === "hot" && !isExploded;
  const forwardVoltage = props.electrical?.forwardVoltage ?? 0;
  const currentA = Math.max(0, props.electrical?.current ?? 0);
  const powerW = Math.max(0, props.electrical?.power ?? 0);
  const reverseOver = forwardVoltage < -LED_LIMITS.maxReverseVoltage;
  const overCurrent = currentA > LED_LIMITS.maxCurrent;
  const overPower = powerW > LED_LIMITS.maxPower;

  // Smoke animation state
  const [smokeParticles, setSmokeParticles] = useState<SmokeParticle[]>([]);
  const [smokeTick, setSmokeTick] = useState<number>(() => Date.now());
  const smokeRafRef = useRef<number | null>(null);
  const smokeStartRef = useRef<number | null>(null);
  const soundPlayedRef = useRef(false);

  useEffect(() => {
    if (!isExploded || !runtime.smokeStartedAt) {
      soundPlayedRef.current = false;
      return undefined;
    }
    // Prevent repeats: guard against multiple renders with same explosion
    if (smokeStartRef.current === runtime.smokeStartedAt) return undefined;

    smokeStartRef.current = runtime.smokeStartedAt;
    const seed = runtime.smokeStartedAt + (runtime.flickerSeed || 0);
    setSmokeParticles(createSmokeParticles(seed));
    setSmokeTick(runtime.smokeStartedAt);

    // Play sound only once per explosion
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
  }, [isExploded, runtime.smokeStartedAt, runtime.flickerSeed]);

  useEffect(() => {
    return () => {
      if (smokeRafRef.current) cancelAnimationFrame(smokeRafRef.current);
    };
  }, []);

  const glowColorMap: Record<string, { base: string; shadow: string }> = useMemo(
    () => ({
      red: { base: "rgba(255,40,40,1)", shadow: "#ff4d4d" },
      green: { base: "rgba(40,255,110,1)", shadow: "#45ff6a" },
      blue: { base: "rgba(80,160,255,1)", shadow: "#4da6ff" },
      yellow: { base: "rgba(255,210,40,1)", shadow: "#ffd54d" },
      white: { base: "rgba(255,255,255,1)", shadow: "#ffffff" },
      orange: { base: "rgba(255,140,40,1)", shadow: "#ff994d" },
    }),
    []
  );

  const glowPositionMap = useMemo(
    () => ({
      red: {
        Image: { x: -1, y: -2.5 },
        rect: { x: 7, y: 17, width: 31, height: 10.1 },
        arcTop: { x: 22.5, y: 17, outerRadius: 15.5 },
        arcBottom: { x: 22.5, y: 27 },
      },
      green: {
        Image: { x: -2, y: -1 },
        rect: { x: 7.5, y: 18, width: 31, height: 9.8 },
        arcTop: { x: 23, y: 18, outerRadius: 15.5 },
        arcBottom: { x: 23, y: 27.7 },
      },
      blue: {
        Image: { x: -1, y: -2 },
        rect: { x: 8, y: 18, width: 31, height: 10.1 },
        arcTop: { x: 23.5, y: 18, outerRadius: 15.5 },
        arcBottom: { x: 23.5, y: 28 },
      },
      yellow: {
        Image: { x: 0, y: -3 },
        rect: { x: 7, y: 16.9, width: 31, height: 10 },
        arcTop: { x: 22.5, y: 17, outerRadius: 15.5 },
        arcBottom: { x: 22.5, y: 26.8 },
      },
      white: {
        Image: { x: -1, y: -3 },
        rect: { x: 7.5, y: 17.4, width: 31, height: 10.1 },
        arcTop: { x: 22.5, y: 17.5, outerRadius: 16 },
        arcBottom: { x: 23, y: 27.4 },
      },
      orange: {
        Image: { x: -1.5, y: -2.5 },
        rect: { x: 7.5, y: 16.9, width: 31, height: 10.1 },
        arcTop: { x: 23, y: 17, outerRadius: 15.5 },
        arcBottom: { x: 23, y: 26.9 },
      },
    }),
    []
  );

  const glow = glowColorMap[chosenColor as keyof typeof glowColorMap] || glowColorMap.red;
  const pos = glowPositionMap[chosenColor as keyof typeof glowPositionMap] || glowPositionMap.red;
  const imgPos = glowPositionMap[chosenColor as keyof typeof glowPositionMap] || glowPositionMap.red;

  const glowVisible = brightness > 0.02 && !isExploded;
  const baseOpacity = 1; // keep LED visible at full opacity even when exploded
  const hotOverlayOpacity = isHot ? 0.18 + 0.35 * clamp(runtime.thermalEnergy ?? 0, 0, 1) : 0;

  const smokeElapsed = runtime.smokeStartedAt
    ? Math.max(0, (smokeTick - runtime.smokeStartedAt) / 1000)
    : 0;

  const warningMessage = isExploded
    ? `Current through the LED is ${(((props.electrical?.explosionCurrentEstimate ?? runtime.explosionCurrent ?? currentA) as number) * 1000).toFixed(0)} mA, while absolute maximum is ${(LED_LIMITS.maxCurrent * 1000).toFixed(1)} mA.`
    : reverseOver
    ? `Reverse bias ${(Math.abs(forwardVoltage)).toFixed(2)} V > ${LED_LIMITS.maxReverseVoltage.toFixed(1)} V`
    : overPower
    ? `Power ${(powerW * 1000).toFixed(1)} mW > ${(LED_LIMITS.maxPower * 1000).toFixed(0)} mW`
    : overCurrent
    ? `Current ${(currentA * 1000).toFixed(1)} mA > ${(LED_LIMITS.maxCurrent * 1000).toFixed(0)} mA`
    : undefined;

  return (
    <BaseElement {...props}>
      <Group>
        {ledImage && (
          <Image
            x={imgPos.Image.x}
            y={imgPos.Image.y}
            image={ledImage}
            width={50}
            height={70}
            opacity={baseOpacity}
            shadowColor={props.selected ? "#000000" : undefined}
            shadowBlur={props.selected ? 7 : 0}
            shadowOffset={{ x: 12, y: -12 }}
            shadowOpacity={0}
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => setIsHovered(false)}
          />
        )}

        {baseReady && glowVisible && (
          <Group listening={false}>
            <Rect
              x={pos.rect.x}
              y={pos.rect.y}
              width={pos.rect.width}
              height={pos.rect.height}
              fill={glow.base}
              opacity={0.15 + 0.75 * brightness}
              shadowColor={glow.shadow}
              shadowBlur={40 + 80 * brightness}
              shadowOpacity={0.2 + 0.6 * brightness}
              listening={false}
              globalCompositeOperation="lighten"
            />
            <Arc
              x={pos.arcTop.x}
              y={pos.arcTop.y}
              innerRadius={0}
              outerRadius={pos.arcTop.outerRadius}
              angle={180}
              rotation={180}
              fill={glow.base}
              opacity={0.15 + 0.75 * brightness}
              shadowColor={glow.shadow}
              shadowBlur={40 + 80 * brightness}
              shadowOpacity={0.2 + 0.6 * brightness}
              listening={false}
              globalCompositeOperation="lighten"
            />
            <Ellipse
              x={pos.rect.x + pos.rect.width / 2}
              y={pos.rect.y + pos.rect.height + 10}
              radiusX={pos.rect.width * 0.45}
              radiusY={5}
              fill={glow.base}
              opacity={0.2 + 0.35 * brightness}
              shadowColor={glow.shadow}
              shadowBlur={15 + 35 * brightness}
              shadowOpacity={0.25 + 0.45 * brightness}
              listening={false}
              globalCompositeOperation="lighten"
            />
          </Group>
        )}

        {baseReady && hotOverlayOpacity > 0 && (
          <Rect
            x={pos.rect.x - 4}
            y={pos.rect.y - 8}
            width={pos.rect.width + 8}
            height={pos.rect.height + 18}
            fillLinearGradientStartPoint={{ x: 0, y: 0 }}
            fillLinearGradientEndPoint={{ x: 0, y: pos.rect.height + 18 }}
            fillLinearGradientColorStops={[0, "rgba(255,110,0,0.6)", 1, "rgba(255,40,0,0.1)"]}
            opacity={hotOverlayOpacity}
            listening={false}
            cornerRadius={3}
            shadowColor="rgba(255,120,40,0.6)"
            shadowBlur={30}
          />
        )}

        {baseReady && isExploded && explosionImg && (
          <Image
            image={explosionImg}
            x={5}
            y={8}
            width={35}
            height={35}
            shadowColor="#000000"
            shadowBlur={12}
            shadowOffset={{ x: 1, y: -1 }}
            shadowOpacity={0}
            listening={false}
          />
        )}

        {baseReady && smokeParticles.map((p) => {
          if (!runtime.smokeStartedAt) return null;
          const progress = smokeElapsed / p.lifetime;
          if (progress > 1) return null;
          const x = p.x + p.drift * progress;
          const y = p.y - p.rise * progress;
          const opacity = 0.7; // solid smoke, no fade
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

        {baseReady && isHovered && warningMessage && (
          <ShortCircuitNotification show={true} message={warningMessage} />
        )}
      </Group>
    </BaseElement>
  );
}
