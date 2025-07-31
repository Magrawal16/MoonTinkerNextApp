import {
  BaseElement,
  BaseElementProps,
} from "@/circuit_canvas/components/core/BaseElement";
import { useEffect, useState } from "react";
import { Group, Circle, Image, Line } from "react-konva";
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

  // Clamp power to minimum of 0
  const rawPower = Math.max(0, props.power ?? 0);
  // Constants for display/thresholds
  const maxPower = 5; // for normal brightness scaling (visual only)
  const maxSafePower = 7; // safe max; anything above triggers "overload"
  const normalizedPower = Math.min(rawPower / maxPower, 1);
  const brightness = Math.sqrt(normalizedPower);
  const isOverloaded = rawPower > maxSafePower;

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
              message={`Current through the LED is ${rawPower.toFixed(
                2
              )} W, while absolute maximum is ${maxPower} W`}
            />
          </>
        ) : (
          // Normal yellow bulb glow
          brightness > 0 && (
            <Circle
              x={75}
              y={60}
              radius={20 + 50 * brightness}
              fill="yellow"
              opacity={0.2 + 0.4 * brightness}
              shadowBlur={10 + 30 * brightness}
            />
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
