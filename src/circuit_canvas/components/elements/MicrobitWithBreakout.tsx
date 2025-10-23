"use client";

import {
  BaseElementProps,
  MicrobitProps,
} from "@/circuit_canvas/types/circuit";
import { BaseElement } from "@/circuit_canvas/components/core/BaseElement";
import { useEffect, useState, useRef } from "react";
import { Group, Image, Rect, Text, Circle } from "react-konva";

export default function Microbit({
  leds,
  onControllerInput,
  isSimulationOn,
  ...props
}: MicrobitProps & BaseElementProps) {
  const [imgMicrobitWithBreakout, setImgMicrobitWithBreakout] = useState<HTMLImageElement | null>(null);
  const [imgOnnState, setImgOnnState] = useState<HTMLImageElement | null>(null);
  const [imgOffState, setImgOffState] = useState<HTMLImageElement | null>(null);
  const [btnPressed, setBtnPressed] = useState<"A" | "B" | "AB" | null>(null);

  // Logo (touch sensor) interaction state
  const [logoState, setLogoState] = useState<"idle" | "hover" | "pressed">("idle");
  const isPressingRef = useRef(false);

  // Tunable constants for logo overlay alignment
  // Adjust LOGO_X / LOGO_Y to perfectly cover the SVG logo.
  const LOGO_X = 101;     // horizontal position
  const LOGO_Y = 87.3;     // vertical position (was 55; moved down to align)
  const LOGO_W = 23.2;
  const LOGO_H = 14;

  useEffect(() => {
    const image = new window.Image();
    image.src = "assets/circuit_canvas/elements/microbit_with_breakout.svg";
    image.onload = () => setImgMicrobitWithBreakout(image);
    image.alt = "MicrobitWithBreakout";
  }, []);

  useEffect(() => {
    const image = new window.Image();
    image.src = "assets/circuit_canvas/elements/microbit_usb_onn.svg";
    image.onload = () => setImgOnnState(image);
    image.alt = "MicrobitWithBreakout";
  }, []);

  useEffect(() => {
    const image = new window.Image();
    image.src = "assets/circuit_canvas/elements/microbit_usb_off.svg";
    image.onload = () => setImgOffState(image);
    image.alt = "MicrobitWithBreakout";
  }, []);

  const handleButtonClick = (btn: "A" | "B" | "AB") => {
    setBtnPressed(btn);
    onControllerInput?.(btn);
    setTimeout(() => setBtnPressed(null), 150);
  };

  // Logo stroke color logic
  const logoStroke =
    !isSimulationOn
      ? "rgb(46,197,150)"
      : logoState === "pressed"
        ? "green"
        : logoState === "hover"
          ? "yellow"
          : "rgb(46,197,150)";

  const enableLogoInteraction = isSimulationOn;

  const setCursor = (cursor: string, e: any) => {
    const stage = e?.target?.getStage?.();
    if (stage) stage.container().style.cursor = cursor;
  };

  const onLogoEnter = (e: any) => {
    if (!enableLogoInteraction) return;
    if (!isPressingRef.current) setLogoState("hover");
    setCursor("pointer", e);
  };

  const onLogoLeave = (e: any) => {
    if (!enableLogoInteraction) return;
    if (isPressingRef.current) {
      // user dragged outside while pressing
      setLogoState("pressed");
    } else {
      setLogoState("idle");
      setCursor("default", e);
    }
  };

  const onLogoDown = (e: any) => {
    if (!enableLogoInteraction) return;
    isPressingRef.current = true;
    setLogoState("pressed");
    setCursor("pointer", e);

     // --- NEW: notify controller (pressed)
    onControllerInput?.({ type: "logo", state: "pressed" });
  };

  const endPress = (inside: boolean) => {
    isPressingRef.current = false;
    setLogoState(inside ? "hover" : "idle");
  };

  const onLogoUp = () => {
    if (!enableLogoInteraction) return;
    endPress(true);

    // --- NEW: notify controller (released)
    onControllerInput?.({ type: "logo", state: "released" });
  };

  // Global mouseup to handle release outside
  useEffect(() => {
    const handleWindowUp = () => {
      if (isPressingRef.current) {
        endPress(false);

        // --- NEW: ensure release is sent even if pointer leaves hit area
        if (enableLogoInteraction) {
          onControllerInput?.({ type: "logo", state: "released" });
        }
      }
    };
    window.addEventListener("mouseup", handleWindowUp);
    window.addEventListener("touchend", handleWindowUp);
    return () => {
      window.removeEventListener("mouseup", handleWindowUp);
      window.removeEventListener("touchend", handleWindowUp);
    };
  }, [enableLogoInteraction, onControllerInput]);

  const onLogoClick = () => {
    // Hook for future logo touch event dispatch if needed
  };

  return (
    <BaseElement {...props}>
      <Group>
        {imgOffState && !isSimulationOn && (
          <Image
            image={imgOffState}
            width={220}
            height={220}
            x={0}
            y={-89}
            shadowColor={props.selected ? "#000000" : undefined}
            shadowBlur={props.selected ? 6 : 0}
            shadowOffset={{ x: 15, y: -15 }}
            shadowOpacity={0}
          />
        )}
        {imgOnnState && isSimulationOn && (
          <Image
            image={imgOnnState}
            width={220}
            height={220}
            x={0.7}
            y={-71}
            shadowColor={props.selected ? "#000000" : undefined}
            shadowBlur={props.selected ? 10 : 0}
            shadowOffset={{ x: 15, y: -15 }}
            shadowOpacity={0}
          />
        )}
        {imgMicrobitWithBreakout && (
          <Image
            image={imgMicrobitWithBreakout}
            width={220}
            height={220}
            shadowColor={props.selected ? "#000000" : undefined}
            shadowBlur={props.selected ? 10 : 0}
            shadowOffset={{ x: 15, y: -15 }}
            shadowOpacity={0}
          />
        )}

        {/* 5x5 LED Grid */}
        {leds[0].map((_, y) =>
          leds.map((col, x) => {
            const b = Math.max(0, Math.min(255, Number(leds[x][y] || 0)));
            const on = b > 0;
            const opacity = b / 255;
            return (
              <Rect
                key={`${x}-${y}`}
                x={85 + x * 11.8}
                y={44.4 + y * 13}
                width={4}
                height={10.1}
                fill={on ? "yellow" : "#333"}
                opacity={on ? opacity : 1}
                cornerRadius={3}
              />
            );
          })
        )}

        {/* Touch (Logo) Sensor Overlay */}
        <Group
          x={LOGO_X-2}
          y={LOGO_Y-63.2}
          listening={true}
          onMouseEnter={onLogoEnter}
          onMouseLeave={onLogoLeave}
          onMouseDown={onLogoDown}
          onMouseUp={onLogoUp}
          onClick={onLogoClick}
          onTouchStart={onLogoDown}
          onTouchEnd={onLogoUp}
        >
          {/* Outer oval */}
          <Rect
            width={LOGO_W}
            height={LOGO_H}
            cornerRadius={24}
            stroke={logoStroke}
            strokeWidth={3.7}
            fill="rgba(0,0,0,0.55)"
            opacity={0.95}
          />
          {/* Inner pads */}
          <Circle x={LOGO_W * 0.30} y={LOGO_H / 2} radius={2.5} fill={logoStroke} />
          <Circle x={LOGO_W * 0.70} y={LOGO_H / 2} radius={2.5} fill={logoStroke} />
          {/* Invisible enlarged hit area */}
          <Rect
            width={LOGO_W + 6}
            height={LOGO_H + 6}
            x={-3}
            y={-3}
            cornerRadius={24}
            fill="transparent"
          />
        </Group>

        {/* Button AB */}
        <Group
          onClick={(e : any) => {
            e.cancelBubble = true;
            handleButtonClick("AB");
          }}
          x={157.1}
          y={20}
        >
          {btnPressed === "AB" && (
            <Rect
              width={12}
              height={12}
              fill=""
              stroke="red"
              strokeWidth={1.5}
              cornerRadius={12}
              x={5.3}
              y={10}
            />
          )}
          <Rect width={12} height={12} x={5.4} y={10} fill="" cornerRadius={10} shadowBlur={3} />
          <Text text="" fill="white" x={6} y={3} fontSize={12} fontStyle="bold" />
        </Group>

        {/* Button A */}
        <Group
          onClick={(e : any) => {
            e.cancelBubble = true;
            handleButtonClick("A");
          }}
          x={39.4}
          y={60}
        >
          {btnPressed === "A" && (
            <Rect
              width={16}
              height={16}
              fill=""
              stroke="#1B5FC5"
              strokeWidth={1.2}
              cornerRadius={12}
              x={5.3}
              y={7}
            />
          )}
          <Rect width={10} height={15} x={8} y={6} fill="" cornerRadius={10} shadowBlur={3} />
          <Text text="" fill="white" x={6} y={3} fontSize={12} fontStyle="bold" />
        </Group>

        {/* Button B */}
        <Group
          onClick={(e : any) => {
            e.cancelBubble = true;
            handleButtonClick("B");
          }}
          x={158.9}
          y={60}
        >
          {btnPressed === "B" && (
            <Rect
              width={16}
              height={16}
              fill=""
              stroke="#1B5FC5"
              strokeWidth={1.2}
              cornerRadius={12}
              x={1.6}
              y={7}
            />
          )}
          <Rect width={10} height={15} x={5} y={5} fill="" cornerRadius={10} shadowBlur={3} />
          <Text text="" fill="white" x={6} y={3} fontSize={12} fontStyle="bold" />
        </Group>
      </Group>
    </BaseElement>
  );
}