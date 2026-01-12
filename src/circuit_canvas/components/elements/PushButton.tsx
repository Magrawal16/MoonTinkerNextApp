"use client";

import { useState, useEffect, useRef } from "react";
import { Group, Image, Circle } from "react-konva";
import { BaseElement } from "@/circuit_canvas/components/core/BaseElement";
import { BaseElementProps } from "@/circuit_canvas/types/circuit";

interface PushButtonProps extends BaseElementProps {
  pressed?: boolean;
  onPressChange?: (pressed: boolean) => void;
  isSimulationOn?: boolean;
}

export default function PushButton({
  pressed = false,
  onPressChange,
  isSimulationOn,
  ...props
}: PushButtonProps) {
  const [buttonImg, setButtonImg] = useState<HTMLImageElement | null>(null);
  const [isPressed, setIsPressed] = useState(pressed);
  const isPressing = useRef(false);

  // Load the pushbutton SVG
  useEffect(() => {
    const image = new window.Image();
    image.src = "assets/circuit_canvas/elements/PushButton.svg";
    image.onload = () => setButtonImg(image);
    image.alt = "Push Button";
  }, []);

  useEffect(() => {
    setIsPressed(pressed);
  }, [pressed]);

  const setCursor = (cursor: string, e: any) => {
    const stage = e?.target?.getStage?.();
    if (stage) stage.container().style.cursor = cursor;
  };

  const handleButtonDown = (e: any) => {
    if (!isSimulationOn) return;
    isPressing.current = true;
    setIsPressed(true);
    onPressChange?.(true);
    setCursor("pointer", e);
  };

  const handleButtonUp = (e?: any) => {
    if (!isSimulationOn) return;
    isPressing.current = false;
    setIsPressed(false);
    onPressChange?.(false);
    if (e) setCursor("default", e);
  };

  const handleMouseEnter = (e: any) => {
    if (isSimulationOn) {
      setCursor("pointer", e);
    }
  };

  const handleMouseLeave = (e: any) => {
    if (isSimulationOn) {
      setCursor("default", e);
    }
  };

  useEffect(() => {
    const handleGlobalUp = () => {
      if (isPressing.current) {
        handleButtonUp();
      }
    };
    window.addEventListener("mouseup", handleGlobalUp);
    window.addEventListener("touchend", handleGlobalUp);
    return () => {
      window.removeEventListener("mouseup", handleGlobalUp);
      window.removeEventListener("touchend", handleGlobalUp);
    };
  }, [isSimulationOn]);

  return (
    <BaseElement {...props} isSimulationOn={isSimulationOn}>
      <Group>
        {/* Push Button SVG */}
        {buttonImg && (
          <Image
            image={buttonImg}
            width={55}
            height={75}
            x={0}
            y={0}
            shadowColor={props.selected ? "#000000" : undefined}
            shadowBlur={props.selected ? 10 : 0}
            shadowOffset={{ x: 15, y: -15 }}
            shadowOpacity={0}
            listening={false}
          />
        )}

        {/* Interactive button area with blue ring overlay when pressed */}
        {buttonImg && (
          <Group
            x={28}
            y={38}
            onMouseDown={handleButtonDown}
            onMouseUp={handleButtonUp}
            onTouchStart={handleButtonDown}
            onTouchEnd={handleButtonUp}
            onMouseEnter={handleMouseEnter}
            onMouseLeave={handleMouseLeave}
          >
            {/* Blue ring overlay when button is pressed */}
            {isPressed && isSimulationOn && (
              <Circle
                radius={15.5}
                fill=""
                stroke="#1B5FC5"
                strokeWidth={2.5}
                x={0}
                y={0}
              />
            )}

            {/* Invisible enlarged hit area for easier clicking */}
            <Circle radius={18} fill="transparent" x={0} y={0} />
          </Group>
        )}
      </Group>
    </BaseElement>
  );
}
