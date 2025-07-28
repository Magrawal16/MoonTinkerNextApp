import {
  BaseElement,
  BaseElementProps,
} from "@/circuit_canvas/components/core/BaseElement";
import { useEffect, useState } from "react";
import { Group, Circle, Image } from "react-konva";

interface LightbulbProps extends BaseElementProps {
  power?: number;
}

export default function Lightbulb(props: LightbulbProps) {
  const [img, setImg] = useState<HTMLImageElement | null>(null);
  useEffect(() => {
    const image = new window.Image();
    image.src = "assets/circuit_canvas/elements/bulb.svg";
    image.onload = () => setImg(image);
    image.alt = "Lightbulb";
  }, []);

  // Normalize brightness between 0 and 1
  // Clamp power to a minimum of 0
  const rawPower = Math.max(0, props.power ?? 0);

  // Simulate a more natural perceived brightness curve
  const maxPower = 5; // maximum power for full brightness
  const normalizedPower = Math.min(rawPower / maxPower, 1);

  // Apply square root to simulate human brightness perception
  const brightness = Math.sqrt(normalizedPower);
  return (
    <BaseElement {...props}>
      <Group>
        {/* Glow layer */}
        {brightness > 0 && (
          <Circle
            x={75}
            y={60}
            radius={20 + 50 * brightness}
            fill="yellow"
            opacity={0.2 + 0.4 * brightness}
            shadowBlur={10 + 30 * brightness}
          />
        )}

        {/* Bulb image */}
        {img && (
          <Image
            image={img}
            width={150}
            height={150}
            shadowColor={props.selected ? "blue" : undefined}
            shadowBlur={props.selected ? 15 : 0}
            shadowOffset={{ x: 0, y: 0 }}
            shadowOpacity={props.selected ? 0.6 : 0}
          />
        )}
      </Group>
    </BaseElement>
  );
}
