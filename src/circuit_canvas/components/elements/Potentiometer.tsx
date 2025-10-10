"use client";
import React, { useEffect, useRef, useState } from "react";
import {
  BaseElement,
  BaseElementProps,
} from "@/circuit_canvas/components/core/BaseElement";
import { Circle, Group, Line } from "react-konva";
import Konva from "konva";
import { KonvaEventObject } from "konva/lib/Node";

interface PotentiometerProps extends BaseElementProps {
  resistance?: number; // Total resistance between ends A and B
  ratio?: number; // Wiper position from 0 to 1
  onRatioChange?: (ratio: number) => void; // Called when user moves the knob
}

function Potentiometer(props: PotentiometerProps) {
  const [angle, setAngle] = useState(135);
  const [isDragging, setIsDragging] = useState(false);
  const groupRef = useRef<Konva.Group>(null);

  const minAngle = 45;
  const maxAngle = 315;
  const centerX = 25;
  const centerY = 25;
  const clampAngle = (deg: number) => {
    if (deg < minAngle && deg > 180) return minAngle;
    if (deg > maxAngle && deg < 360) return maxAngle;
    return Math.max(minAngle, Math.min(maxAngle, deg));
  };

  const ratioFromAngle = (ang: number) =>
    (ang - minAngle) / (maxAngle - minAngle);

  const angleFromRatio = (ratio: number) =>
    clampAngle(ratio * (maxAngle - minAngle) + minAngle);

  // Update angle only if ratio changes and differs significantly
  useEffect(() => {
    if (typeof props.ratio === "number") {
      const newAngle = angleFromRatio(props.ratio);
      if (Math.abs(newAngle - angle) > 0.01) {
        setAngle(newAngle);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [props.ratio]); // intentionally ignore 'angle' here to avoid loop

  // Call onRatioChange only if ratio changed meaningfully
  useEffect(() => {
    const ratio = ratioFromAngle(angle);
    if (props.ratio === undefined || Math.abs(ratio - props.ratio) > 0.01) {
      props.onRatioChange?.(ratio);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [angle]); // intentionally ignoring props.ratio and onRatioChange references

  const handlePointerMove = (e: KonvaEventObject<MouseEvent | TouchEvent>) => {
    if (!isDragging || !groupRef.current) return;

    const stage = e.target.getStage();
    const pointer = stage?.getPointerPosition();
    const absPos = groupRef.current.getAbsolutePosition();
    if (!pointer || !absPos) return;

    const dx = pointer.x - (absPos.x + centerX);
    const dy = pointer.y - (absPos.y + centerY);

    let rawAngle = (Math.atan2(dy, dx) * 180) / Math.PI + 90;
    if (rawAngle < 0) rawAngle += 360;

    if (rawAngle >= minAngle && rawAngle <= maxAngle) {
      setAngle(clampAngle(rawAngle));
    }
  };

  return (
    <BaseElement {...props}>
      <Group
        ref={groupRef}
        onMouseMove={handlePointerMove}
        onTouchMove={handlePointerMove}
        onMouseUp={() => setIsDragging(false)}
        onTouchEnd={() => setIsDragging(false)}
      >
        <Line
          points={[0, 0, 0, -15]}
          stroke="black"
          strokeWidth={4}
          hitStrokeWidth={10}
          lineCap="round"
          x={centerX + 15}
          y={centerY - 10}
        />
        <Line
          points={[0, 0, 0, -15]}
          stroke="black"
          strokeWidth={4}
          hitStrokeWidth={10}
          lineCap="round"
          x={centerX - 0}
          y={centerY - 15}
          shadowColor={props.selected ? "#000000" : undefined}
          shadowBlur={props.selected ? 10 : 0}
          shadowOffset={{ x: 10, y: 10 }}
          shadowOpacity={props.selected ? 0.2 : 0}
        />
        <Line
          points={[0, 0, 0, -15]}
          stroke="black"
          strokeWidth={4}
          hitStrokeWidth={10}
          lineCap="round"
          x={centerX - 15}
          y={centerY - 10}
          shadowColor={props.selected ? "#000000" : undefined}
          shadowBlur={props.selected ? 10 : 0}
          shadowOffset={{ x: 10, y: 10 }}
          shadowOpacity={props.selected ? 0.2 : 0}
        />
        <Circle
          x={centerX}
          y={centerY}
          radius={24}
          fill="#e0e0e0"
          stroke="black"
          strokeWidth={2}
          shadowColor={props.selected ? "#000000" : undefined}
          shadowBlur={props.selected ? 10 : 0}
          shadowOffset={{ x: 10, y: 10 }}
          shadowOpacity={props.selected ? 0.2 : 0}
        />

        <Line
          points={[0, 0, 0, -15]}
          stroke="black"
          strokeWidth={4}
          hitStrokeWidth={10}
          lineCap="round"
          x={centerX}
          y={centerY}
          rotation={angle}
          onMouseDown={(e) => {
            e.cancelBubble = true;
            setIsDragging(true);
          }}
          onDragMove={(e) => {
            e.cancelBubble = true;
            setIsDragging(true);
          }}
        />
      </Group>
    </BaseElement>
  );
}

export default React.memo(Potentiometer);
