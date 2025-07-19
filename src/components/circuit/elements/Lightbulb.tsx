import {
  BaseElement,
  BaseElementProps,
} from "@/components/circuit/core/BaseElement";
import { useEffect, useState } from "react";
import { Group, Circle, Image } from "react-konva";

interface LightbulbProps extends BaseElementProps {
  power?: number;
}

export default function Lightbulb(props: LightbulbProps) {
  const [img, setImg] = useState<HTMLImageElement | null>(null);
  useEffect(() => {
    const image = new window.Image();
    image.src = "/circuit_elements/bulb-off.svg"; // Always use the "off" bulb
    image.onload = () => setImg(image);
    image.alt = "Lightbulb";
  }, []);

  // Normalize brightness between 0 and 1
  // Clamp power to a minimum of 0
  const power = Math.max(0, (props.power ?? 0) - 0.001);
  // Assume max power for full brightness is 60 (adjust as needed)
  const maxPower = 300;
  // Normalize brightness between 0 and 1
  const brightness = Math.min(1, power / maxPower);
  return (
    <BaseElement {...props}>
      <Group>
        {/* Glow layer */}
        {brightness > 0 && (
          <Circle
            x={20}
            y={20}
            radius={20 + 10 * brightness}
            fill="yellow"
            opacity={0.2 + 0.4 * brightness}
            shadowBlur={10 + 30 * brightness}
          />
        )}

        {/* Bulb image */}
        {img && (
          <Image
            image={img}
            width={40}
            height={40}
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
