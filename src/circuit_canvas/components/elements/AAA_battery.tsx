"use client";
import {
  BaseElement,
  BaseElementProps,
} from "@/circuit_canvas/components/core/BaseElement";
import { useEffect, useState } from "react";
import { Image } from "react-konva";

interface AAA_batteryProps extends BaseElementProps {
  count?: number; // Number of batteries in series (1-4)
}

export default function AAA_battery(props: AAA_batteryProps) {
  const { count = 1, ...baseProps } = props;
  const [img, setImg] = useState<HTMLImageElement | null>(null);

  // Clamp count to valid range
  const batteryCount = Math.max(1, Math.min(4, count));

  // Map count to SVG filename and width
  const batteryConfig = {
    1: { src: "assets/circuit_canvas/elements/AAA_battery.svg", width: 170 },
    2: { src: "assets/circuit_canvas/elements/2_AAA_battery.svg", width: 180 },
    3: { src: "assets/circuit_canvas/elements/3_AAA_battery.svg", width: 200 },
    4: { src: "assets/circuit_canvas/elements/4_AAA_battery.svg", width: 200 },
  };

  const config = batteryConfig[batteryCount as keyof typeof batteryConfig];

  useEffect(() => {
    const image = new window.Image();
    image.src = config.src;
    image.onload = () => setImg(image);
    image.alt = `${batteryCount}x AAA Battery`;
  }, [config.src, batteryCount]);

  return (
    <BaseElement {...baseProps}>
      {img && (
        <Image
          image={img}
          width={config.width}
          height={180}
          shadowColor={baseProps.selected ? "#000000" : undefined}
          shadowBlur={baseProps.selected ? 10 : 0}
          shadowOffset={{ x: 15, y: -15 }}
          shadowOpacity={0}
        />
      )}
    </BaseElement>
  );
}
