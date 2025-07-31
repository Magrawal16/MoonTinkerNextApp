import {
  BaseElement,
  BaseElementProps,
} from "@/circuit_canvas/components/core/BaseElement";
import { useEffect, useState } from "react";
import { Group, Circle, Image, Line } from "react-konva";
import { ShortCircuitNotification } from "./ShortCircuitNotification";

interface LedProps extends BaseElementProps {
  power?: number;
}

export default function Led(props: LedProps) {
  const [img, setImg] = useState<HTMLImageElement | null>(null);
  const [explosion, setExplosion] = useState<HTMLImageElement | null>(null);

  useEffect(() => {
    const image = new window.Image();
    image.src = "assets/circuit_canvas/elements/led.svg";
    image.onload = () => setImg(image);
    image.alt = "LED";

    const explosionImage = new window.Image();
    explosionImage.src = "assets/circuit_canvas/elements/Explosion.svg";
    explosionImage.onload = () => setExplosion(explosionImage);
    explosionImage.alt = "Bulb Explosion";
  }, []);

  const power = Math.max(0, props.power ?? 0);

  // You can tune these for your simulation:
  const maxPower = 300; // visual scaling (full brightness)
  const maxSafePower = 350; // safety threshold for short circuit
  const brightness = Math.min(1, power / maxPower);
  const isOverloaded = power > maxSafePower;

  return (
    <BaseElement {...props}>
      <Group>
        {/* Always show the LED image, undimmed */}
        {img && (
          <Image
            image={img}
            width={75}
            height={75}
            shadowColor={props.selected ? "#000000" : undefined}
            shadowBlur={props.selected ? 7 : 0}
            shadowOffset={{ x: 12, y: -12 }}
            shadowOpacity={props.selected ? 2 : 0}
            opacity={isOverloaded ? 0.8 : 1}
          />
        )}

        {/* Overload/short circuit effect (overlays LED) */}
        {isOverloaded ? (
          <>
            {/* Explosion effect */}
            {explosion && (
              <Image
                image={explosion}
                x={18}
                y={15}
                width={35}
                height={35}
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
              message={`Current through the LED is ${power.toFixed(
                2
              )} mA, while absolute maximum is ${maxPower} mA`}
            />
          </>
        ) : (
          // Normal LED glow
          brightness > 0 && (
            <Circle
              x={34.3}
              y={36}
              radius={20 + 10 * brightness}
              fill="red"
              opacity={0.2 + 0.4 * brightness}
              shadowBlur={10 + 30 * brightness}
            />
          )
        )}
      </Group>
    </BaseElement>
  );
}
