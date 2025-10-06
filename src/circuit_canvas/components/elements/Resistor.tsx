"use client";
import {
  BaseElement,
  BaseElementProps,
} from "@/circuit_canvas/components/core/BaseElement";
import { useEffect, useState } from "react";
import { Image, Line } from "react-konva";

type ResistorProps = BaseElementProps & {
  resistance?: number; // in ohms
};

function getResistorImagePath(resistance?: number | null): string {
  // Available assets:
  // resistor_5ohm.svg, resistor_10ohm.svg, resistor_15ohm.svg, resistor_20ohm.svg, resistor_25ohm.svg
  // resistor_5kohm.svg, resistor_10kohm.svg, resistor_15kohm.svg, resistor_20kohm.svg, resistor_25kohm.svg
  // Default fallback
  const base = "assets/circuit_canvas/elements/";
  const fallback = base + "resistor_5ohm.svg";
  if (resistance == null || !Number.isFinite(resistance)) return fallback;

  // Match with a small tolerance to allow floating conversions
  const eps = 1e-6;
  const ohmMap: Record<number, string> = {
    5: "resistor_5ohm.svg",
    10: "resistor_10ohm.svg",
    15: "resistor_15ohm.svg",
    20: "resistor_20ohm.svg",
    25: "resistor_25ohm.svg",
  };
  const kohmMap: Record<number, string> = {
    5000: "resistor_5kohm.svg",
    10000: "resistor_10kohm.svg",
    15000: "resistor_15kohm.svg",
    20000: "resistor_20kohm.svg",
    25000: "resistor_25kohm.svg",
  };

  for (const k of Object.keys(ohmMap)) {
    const v = Number(k);
    if (Math.abs(resistance - v) < eps) return base + ohmMap[v];
  }
  for (const k of Object.keys(kohmMap)) {
    const v = Number(k);
    if (Math.abs(resistance - v) < eps) return base + kohmMap[v];
  }
  return fallback;
}

export default function Resistor(props: ResistorProps) {
  const [img, setImg] = useState<HTMLImageElement | null>(null);
  const [src, setSrc] = useState<string>(() => getResistorImagePath(props.resistance));

  useEffect(() => {
    setSrc(getResistorImagePath(props.resistance));
  }, [props.resistance]);

  useEffect(() => {
    const image = new window.Image();
    image.src = src;
    image.onload = () => setImg(image);
    image.alt = "Resistor";
  }, [src]);

  return (
    <BaseElement {...props}>
      {img && (
        <Image
          image={img}
          width={100}
          height={30}
          shadowColor={props.selected ? "#000000" : undefined}
          shadowBlur={props.selected ? 4 : 0}
          shadowOffset={{ x: 13, y: -13 }}
          shadowOpacity={props.selected ? 0.2 : 0}
        />
      )}
      {/* <Line
        points={[0, 0, 0, -3]}
        stroke="black"
        strokeWidth={4}
        hitStrokeWidth={10}
        lineCap="round"
        x={0}
        y={15}
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
      /> */}
    </BaseElement>
  );
}
