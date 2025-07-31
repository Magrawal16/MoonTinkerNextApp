"use client";
import {
  BaseElement,
  BaseElementProps,
} from "@/circuit_canvas/components/core/BaseElement";
import { useEffect, useState } from "react";
import { Image, Line } from "react-konva";

export default function Resistor(props: BaseElementProps) {
  const [img, setImg] = useState<HTMLImageElement | null>(null);

  useEffect(() => {
    const image = new window.Image();
    image.src = "assets/circuit_canvas/elements/resistor.svg";
    image.onload = () => setImg(image);
    image.alt = "Resistor";
  }, []);

  return (
    <BaseElement {...props}>
      {img && (
        <Image
          image={img}
          width={40}
          height={40}
          shadowColor={props.selected ? "#000000" : undefined}
          shadowBlur={props.selected ? 4 : 0}
          shadowOffset={{ x: 13, y: -13 }}
          shadowOpacity={props.selected ? 2 : 0}
        />
      )}
      <Line
        points={[0, 0, 0, -3]}
        stroke="black"
        strokeWidth={4}
        hitStrokeWidth={10}
        lineCap="round"
        x={-5}
        y={20}
        rotation={90}
      />
      <Line
        points={[0, 0, 0, -3]}
        stroke="black"
        strokeWidth={4}
        hitStrokeWidth={10}
        lineCap="round"
        x={42}
        y={20}
        rotation={90}
      />
    </BaseElement>
  );
}
