"use client";
import React, { useEffect, useRef, useState } from "react";
import {
  BaseElement,
  BaseElementProps,
} from "@/circuit_canvas/components/core/BaseElement";
import { Circle, Group, Line, Image, Path, Arc, Rect } from "react-konva";
import Konva from "konva";
import { KonvaEventObject } from "konva/lib/Node";

interface PotentiometerProps extends BaseElementProps {
  resistance?: number; // Total resistance between ends A and B
  ratio?: number; // Wiper position from 0 to 1
  onRatioChange?: (ratio: number) => void; // Called when user moves the knob
}

function Potentiometer(props: PotentiometerProps) {
  // Tinkercad-compatible potentiometer dial
  // LEFT endpoint = 225° (7:30 position)
  // RIGHT endpoint = 135° (4:30 position)  
  // Sweep is 270° through the top (no rotation allowed between 135°–225°)
  const SWEEP_START = 225;  // Left endpoint
  const SWEEP_END = 135;    // Right endpoint
  const SWEEP_LENGTH = 270; // Total degrees of valid rotation
  
  // Convert angle (degrees) to ratio (0-1) - EXACT Tinkercad mapping
  const angleToRatio = (angleDeg: number): number => {
    // Normalize angle to 0–360
    angleDeg = ((angleDeg % 360) + 360) % 360;
    
    // Calculate distance from sweep start (225°) going clockwise through the top
    let dist = (angleDeg - SWEEP_START + 360) % 360;
    
    // Clamp to sweep length
    if (dist > SWEEP_LENGTH) dist = SWEEP_LENGTH;
    
    return Math.min(1, Math.max(0, dist / SWEEP_LENGTH));
  };
  
  // Convert ratio (0-1) to angle (degrees)
  const ratioToAngle = (ratio: number): number => {
    // Clamp ratio to 0-1
    ratio = Math.min(1, Math.max(0, ratio));
    
    // Calculate angle from ratio
    const offset = ratio * SWEEP_LENGTH;
    let angle = SWEEP_START + offset;
    
    // Normalize to 0-360
    if (angle >= 360) angle -= 360;
    
    return angle;
  };
  
  // Check if angle is in the dead zone (135° to 225°)
  const isInDeadZone = (deg: number): boolean => {
    const normalized = ((deg % 360) + 360) % 360;
    return normalized > SWEEP_END && normalized < SWEEP_START;
  };
  
  // Get initial angle from props.ratio
  const getInitialAngle = (): number => {
    if (typeof props.ratio === "number") {
      return ratioToAngle(props.ratio);
    }
    return SWEEP_START; // Start at left endpoint (ratio = 0)
  };
  
  const initialAngle = getInitialAngle();
  const [angle, setAngle] = useState(initialAngle);
  const [isDragging, setIsDragging] = useState(false);
  const [img, setImg] = useState<HTMLImageElement | null>(null);
  const groupRef = useRef<Konva.Group>(null);
  const lastValidAngleRef = useRef(initialAngle); 

  useEffect(() => {
    const image = new window.Image();
    image.src = "/assets/circuit_canvas/elements/potentiometer.svg";
    image.onload = () => setImg(image);
    image.alt = "Potentiometer";
  }, []);

  const centerX = 31.4;
  const centerY = 24.5;

  // Helper to check if angle is on the left side of valid range (225° to 360°)
  const isOnLeftSide = (deg: number): boolean => {
    const normalized = ((deg % 360) + 360) % 360;
    return normalized >= SWEEP_START && normalized <= 360;
  };

  // Helper to check if angle is on the right side of valid range (0° to 135°)
  const isOnRightSide = (deg: number): boolean => {
    const normalized = ((deg % 360) + 360) % 360;
    return normalized >= 0 && normalized <= SWEEP_END;
  };

  // Sync angle when props.ratio changes
  useEffect(() => {
    if (typeof props.ratio === "number") {
      const newAngle = ratioToAngle(props.ratio);
      const currentRatio = angleToRatio(angle);
      if (Math.abs(props.ratio - currentRatio) > 0.01) {
        setAngle(newAngle);
        lastValidAngleRef.current = newAngle;
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [props.ratio]);

  // Call onRatioChange only if ratio changed meaningfully
  useEffect(() => {
    const ratio = angleToRatio(angle);
    if (props.ratio === undefined || Math.abs(ratio - props.ratio) > 0.01) {
      props.onRatioChange?.(ratio);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [angle]);

  const handlePointerMove = (e: MouseEvent | TouchEvent) => {
    if (!isDragging || !groupRef.current) return;

    const stage = groupRef.current.getStage();
    if (!stage) return;

    let pointerX: number, pointerY: number;
    if ('touches' in e && e.touches.length > 0) {
      const rect = stage.container().getBoundingClientRect();
      pointerX = e.touches[0].clientX - rect.left;
      pointerY = e.touches[0].clientY - rect.top;
    } else if ('clientX' in e) {
      const rect = stage.container().getBoundingClientRect();
      pointerX = e.clientX - rect.left;
      pointerY = e.clientY - rect.top;
    } else {
      return;
    }

    // Get absolute position of the group
    const absPos = groupRef.current.getAbsolutePosition();
    const scale = stage.scaleX() || 1;

    const dx = (pointerX / scale) - (absPos.x / scale + centerX);
    const dy = (pointerY / scale) - (absPos.y / scale + centerY);

    let newAngle = Math.atan2(dy, dx) * (180 / Math.PI);
    
    newAngle = ((newAngle + 90) % 360 + 360) % 360;

    if (isInDeadZone(newAngle)) {
      return;
    }

    const lastAngle = lastValidAngleRef.current;
    
    const calculateAngularDistance = (from: number, to: number) => {
      const diff = ((to - from + 540) % 360) - 180;
      return Math.abs(diff);
    };
    
    const angularDistance = calculateAngularDistance(lastAngle, newAngle);
    
    if (angularDistance > 90) {
      const wasOnLeft = isOnLeftSide(lastAngle);
      const wasOnRight = isOnRightSide(lastAngle);
      const nowOnLeft = isOnLeftSide(newAngle);
      const nowOnRight = isOnRightSide(newAngle);
      
      if ((wasOnLeft && nowOnRight) || (wasOnRight && nowOnLeft)) {
        if (wasOnLeft) {
          newAngle = SWEEP_START; // Left endpoint (225°)
        } else {
          newAngle = SWEEP_END;   // Right endpoint (135°)
        }
      }
    }

    lastValidAngleRef.current = newAngle;
    setAngle(newAngle);
  };

  const handlePointerDown = (e: KonvaEventObject<MouseEvent | TouchEvent>) => {
    e.cancelBubble = true;
    setIsDragging(true);
  };

  const handlePointerUp = () => {
    setIsDragging(false);
  };

  useEffect(() => {
    if (!isDragging) return;

    const handleMove = (e: MouseEvent | TouchEvent) => {
      handlePointerMove(e);
    };

    const handleUp = () => {
      setIsDragging(false);
    };

    window.addEventListener('mousemove', handleMove);
    window.addEventListener('touchmove', handleMove);
    window.addEventListener('mouseup', handleUp);
    window.addEventListener('touchend', handleUp);

    return () => {
      window.removeEventListener('mousemove', handleMove);
      window.removeEventListener('touchmove', handleMove);
      window.removeEventListener('mouseup', handleUp);
      window.removeEventListener('touchend', handleUp);
    };
  }, [isDragging]);

  return (
    <BaseElement {...props}>
      <Group ref={groupRef}>
        {/* Base potentiometer SVG image */}
        {img && (
          <Image
            image={img}
            width={60}
            height={75}
            shadowColor={props.selected ? "#000000" : undefined}
            shadowBlur={props.selected ? 10 : 0}
            shadowOffset={{ x: 10, y: -10 }}
            shadowOpacity={0}
          />
        )}

        {/* New Dial UI - Blue outer ring with counter-rotation */}
        <Group
          x={centerX}
          y={centerY}
          rotation={-angle * 0.3} // Counter-rotation for realistic feel
        >
          {/* Blue outer ring */}
          <Circle
            x={0}
            y={0}
            radius={13}
            fill="#2E86DE"
            stroke="#1B5FAA"
            strokeWidth={1}
          />
          
          {/* Tick marks on the blue ring */}
          {[0, 45, 90, 135, 180, 225, 270, 315].map((tickAngle) => (
            <Line
              key={tickAngle}
              points={[0, -7.5, 0, -12]}
              stroke="#1A3A5C"
              strokeWidth={2}
              rotation={tickAngle}
              lineCap="round"
            />
          ))}
        </Group>

        {/* Inner gray/light blue circle (static) */}
        <Circle
          x={centerX}
          y={centerY}
          radius={10}
          fill="#D6E6F5"
          stroke="#B8D4ED"
          strokeWidth={1}
        />

        {/* Yellow rotating arrow */}
        <Group
          x={centerX}
          y={centerY}
          rotation={angle}
        >
          {/* Arrow shaft */}
          <Rect
            x={-2}
            y={-8}
            width={4}
            height={10}
            fill="#E91E63"
            stroke="#C2185B"
            strokeWidth={0.5}
            cornerRadius={10}
          />
          {/* Arrow head (triangle) */}
          <Line
            points={[0, -12, -3.5, -5, 3.5, -5]}
            fill="#E91E63"
            stroke="#C2185B"
            strokeWidth={0.5}
            closed={true}
          />
        </Group>

        {/* Pink/Red center dot */}
        <Circle
          x={centerX}
          y={centerY}
          radius={3.5}
          fill="#E91E63"
          stroke="#C2185B"
          strokeWidth={0.5}
        />

        {/* Interactive dial overlay - invisible circular clickable area */}
        <Circle
          x={centerX}
          y={centerY}
          radius={18}
          fill="transparent"
          onMouseDown={handlePointerDown}
          onTouchStart={handlePointerDown}
          onMouseEnter={(e) => {
            const stage = e.target.getStage();
            if (stage) stage.container().style.cursor = "grab";
          }}
          onMouseLeave={(e) => {
            if (!isDragging) {
              const stage = e.target.getStage();
              if (stage) stage.container().style.cursor = "default";
            }
          }}
        />
      </Group>
    </BaseElement>
  );
}

export default React.memo(Potentiometer);
