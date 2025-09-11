import {
  BaseElement,
  BaseElementProps,
} from "@/circuit_canvas/components/core/BaseElement";
import { useEffect, useState } from "react";
import { Group, Image, Line } from "react-konva";
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

  // Tunable simulation constants
  const maxPower = 300; // visual scaling (full brightness)
  const maxSafePower = 350; // safety threshold for short circuit
  const brightness = Math.min(1, power / maxPower);
  const isOverloaded = power > maxSafePower;

  return (
    <BaseElement {...props}>
      <Group>
        {/* Always show the LED image */}
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

        {/* Overload/short circuit effect */}
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
          brightness > 0 && (
            <>
              {/* Outer glow */}
              <Line
                x={-3}
                y={5}
                points={[
                  30, 40, // left start
                  34, 30, // top left
                  37.5, 40, // center bottom
                  41, 30, // top right
                  45, 40, // right end
                ]}
                stroke="rgba(255,100,100,0.4)"
                strokeWidth={3 + 4 * brightness}
                shadowColor="red"
                shadowBlur={15 + 40 * brightness}
                shadowOpacity={0.7}
                lineCap="round"
                lineJoin="round"
                listening={false}
                globalCompositeOperation="lighten"
              />
              {/* Inner bright core */}
              <Line
                x={-3}
                y={5}
                points={[
                  30, 40, // left start
                  34, 30, // top left
                  37.5, 40, // center bottom
                  41, 30, // top right
                  45, 40, // right end
                ]}
                stroke="yellow"
                strokeWidth={1 + 2 * brightness}
                shadowColor="white"
                shadowBlur={10 + 30 * brightness}
                shadowOpacity={0.9}
                lineCap="round"
                lineJoin="round"
                listening={false}
                globalCompositeOperation="lighten"
              />
            </>
          )
        )}
      </Group>
    </BaseElement>
  );
}