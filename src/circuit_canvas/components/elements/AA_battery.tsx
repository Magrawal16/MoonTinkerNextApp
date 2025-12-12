"use client";
import {
  BaseElement,
  BaseElementProps,
} from "@/circuit_canvas/components/core/BaseElement";
import { useEffect, useState } from "react";
import { Image } from "react-konva";

interface AA_batteryProps extends BaseElementProps {
  count?: number; // Number of batteries in series (1-4)
}

export default function AA_battery(props: AA_batteryProps) {
  const { count = 1, ...baseProps } = props;
  const [img, setImg] = useState<HTMLImageElement | null>(null);

  // Clamp count to valid range
  const batteryCount = Math.max(1, Math.min(4, count));

  // Map count to SVG filename and width
  const batteryConfig = {
    1: { src: "assets/circuit_canvas/elements/AA_battery.svg", width: 200 },
    2: { src: "assets/circuit_canvas/elements/2_AA_battery.svg", width: 230 },
    3: { src: "assets/circuit_canvas/elements/3_AA_battery.svg", width: 180 },
    4: { src: "assets/circuit_canvas/elements/4_AA_battery.svg", width: 200 },
  };

  const config = batteryConfig[batteryCount as keyof typeof batteryConfig];

  useEffect(() => {
    const image = new window.Image();
    image.src = config.src;
    image.onload = () => setImg(image);
    image.alt = `${batteryCount}x AA Battery`;
  }, [config.src, batteryCount]);

  return (
    <BaseElement {...baseProps}>
      {img && (
        <Image
          image={img}
          width={config.width}
          height={200}
          shadowColor={baseProps.selected ? "#000000" : undefined}
          shadowBlur={baseProps.selected ? 10 : 0}
          shadowOffset={{ x: 15, y: -15 }}
          shadowOpacity={0}
        />
      )}
    </BaseElement>
  );
}
