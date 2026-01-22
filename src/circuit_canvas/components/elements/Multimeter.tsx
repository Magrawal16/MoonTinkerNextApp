"use client";
import {
  BaseElement,
  BaseElementProps,
} from "@/circuit_canvas/components/core/BaseElement";
import { useEffect, useState } from "react";
import { Image, Text, Group, Line, Circle } from "react-konva";

interface MultimeterProps extends BaseElementProps {
  measurement?: number;
  measurementUnit?: "ohm" | "kohm";
  initialMode?: Mode;
  onModeChange: (id: string, mode: Mode) => void;
  isSimulationOn?: boolean;
}

type Mode = "voltage" | "current" | "resistance";

export default function Multimeter(props: MultimeterProps) {
  const [img, setImg] = useState<HTMLImageElement | null>(null);
  const [mode, setMode] = useState<Mode>(props.initialMode || "voltage");

  useEffect(() => {
    if (props.initialMode && props.initialMode !== mode) {
      setMode(props.initialMode);
    }
  }, []);

  const handleModeChange = (newMode: Mode) => {
    setMode(newMode);
    props.onModeChange(props.id, newMode);
  };

  const formatOhms = (r: number, unit?: "ohm" | "kohm") => {
    if (Number.isNaN(r)) return "Error"; // powered circuit or invalid measurement
    if (!isFinite(r)) return "OL"; // over-limit / open-loop
    const ar = Math.abs(r);
    
    // Treat very small values as effectively 0 (< 0.01 Ω)
    if (ar < 0.01) return unit === "kohm" ? "0.00 kΩ" : "0.00 Ω";
    
    if (ar >= 1_000_000) return `${(r / 1_000_000).toFixed(2)} MΩ`;
    
    // If a unit preference is specified (from connected potentiometer/resistor), use it
    if (unit === "kohm") {
      return `${(r / 1_000).toFixed(2)} kΩ`;
    }
    if (unit === "ohm") {
      return `${r.toFixed(2)} Ω`;
    }
    
    // Default behavior: show kΩ for values >= 1Ω
    if (ar >= 1) return `${(r / 1_000).toFixed(2)} kΩ`;
    return `${r.toFixed(2)} Ω`;
  };

  const getDisplayValue = () => {
    // Hide any cached value when simulation is off
    if (!props.isSimulationOn) {
      return "";
    }

    if (props.measurement === undefined) {
      return "";
    }

    switch (mode) {
      case "voltage":
        return `${props.measurement.toFixed(2)} V`;
      case "current":
        return `${props.measurement.toFixed(2)} A`;
      case "resistance":
        return formatOhms(props.measurement, props.measurementUnit);
      default:
        return "---";
    }
  };

  useEffect(() => {
    const image = new window.Image();
    image.src = "assets/circuit_canvas/elements/multimeter.svg";
    image.onload = () => setImg(image);
    image.alt = "Multimeter";
  }, []);
  const baseReady = Boolean(img);

  const SCALE = 180 / 240; // ~0.3333

  // Circle button placement tuned to overlay multimeter.svg right-side pads
  const BTN_X = 211; // center X in the 240px-wide SVG space
  const BTN_R = 7;  // circle radius
  const buttonDefs = [
    { cy: 27, label: "A", mode: "current" as const },
    { cy: 46, label: "V", mode: "voltage" as const },
    { cy: 64, label: "Ω", mode: "resistance" as const },
  ] as const;

  return (
    <BaseElement {...props}>
      <Group scale={{ x: SCALE, y: SCALE }}>
        {img && (
          <Image
            image={img}
            width={240}
            height={100}
            shadowColor={props.selected ? "#000000" : undefined}
            shadowBlur={props.selected ? 10 : 0}
            shadowOffset={{ x: 20, y: 20 }}
            shadowOpacity={0}
          />
        )}
        {/* <Line
          points={[0, 0, 0, -5]}
          stroke="red"
          strokeWidth={4}
          hitStrokeWidth={10}
          lineCap="round"
          x={12.5}
          y={-1}
          height={-1}
        />
        <Line
          points={[0, 0, 0, -5]}
          stroke="black"
          strokeWidth={4}
          hitStrokeWidth={10}
          lineCap="round"
          x={40}
          y={-1}
          height={-1}
        /> */}
        {baseReady && (
          <Text
            x={35}
            y={35}
            width={150}
            align="center"
            fontSize={24}
            fill="black"
            stroke="none"
            strokeWidth={1}
            text={getDisplayValue()}
          />
        )}
        {baseReady && buttonDefs.map((btn) => {
          const selected = mode === btn.mode;
          const FONT = Math.round(BTN_R * 1.2); // scale label with circle radius
          return (
            <Group
              key={btn.label}
              onClick={() => handleModeChange(btn.mode)}
              onTap={() => handleModeChange(btn.mode)}
            >
              <Circle
                x={BTN_X}
                y={btn.cy}
                radius={BTN_R}
                fill={selected ? "#666" : "#ddd"}
                stroke="black"
                strokeWidth={1.5}
                shadowEnabled={selected}
                shadowColor={selected ? "#222" : undefined}
                shadowBlur={selected ? 6 : 0}
                shadowOpacity={0}
              />
              <Text
                x={BTN_X - BTN_R}
                y={btn.cy - FONT / 2}
                width={BTN_R * 2}
                text={btn.label}
                fontSize={FONT}
                align="center"
                fill={selected ? "#fff" : "#000"}
                stroke="none"
                strokeWidth={0}
              />
            </Group>
          );
        })}
      </Group>
    </BaseElement>
  );
}
