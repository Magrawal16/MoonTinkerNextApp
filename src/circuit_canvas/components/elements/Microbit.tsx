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
  const [imgMicrobit, setImgMicrobit] = useState<HTMLImageElement | null>(null);
  const [imgOnnState, setImgOnnState] = useState<HTMLImageElement | null>(null);
  const [imgOffState, setImgOffState] = useState<HTMLImageElement | null>(null);
  const [btnPressed, setBtnPressed] = useState<"A" | "B" | "AB" | null>(null);

  // Logo (touch sensor) interaction state
  const [logoState, setLogoState] = useState<"idle" | "hover" | "pressed">("idle");
  const isPressingRef = useRef(false);

  // Tunable constants for logo overlay alignment
  // Adjust LOGO_X / LOGO_Y to perfectly cover the SVG logo.
  const LOGO_X = 95.2;     // horizontal position
  const LOGO_Y = 91.2;     // vertical position (was 55; moved down to align)
  const LOGO_W = 29.2;
  const LOGO_H = 16.2;

  useEffect(() => {
    const image = new window.Image();
    image.src = "assets/circuit_canvas/elements/microbit.svg";
    image.onload = () => setImgMicrobit(image);
    image.alt = "Microbit";
  }, []);

  useEffect(() => {
    const image = new window.Image();
    image.src = "assets/circuit_canvas/elements/microbit_usb_onn.svg";
    image.onload = () => setImgOnnState(image);
    image.alt = "Microbit";
  }, []);

  useEffect(() => {
    const image = new window.Image();
    image.src = "assets/circuit_canvas/elements/microbit_usb_off.svg";
    image.onload = () => setImgOffState(image);
    image.alt = "Microbit";
  }, []);

  const handleButtonClick = (btn: "A" | "B" | "AB") => {
    setBtnPressed(btn);
    onControllerInput?.(btn);
    setTimeout(() => setBtnPressed(null), 150);
  };

  // Logo stroke color logic
  const logoStroke =
    !isSimulationOn
      ? "rgb(200,36,52)"
      : logoState === "pressed"
        ? "green"
        : logoState === "hover"
          ? "yellow"
          : "rgb(200,36,52)";

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
  };

  const endPress = (inside: boolean) => {
    isPressingRef.current = false;
    setLogoState(inside ? "hover" : "idle");
  };

  const onLogoUp = () => {
    if (!enableLogoInteraction) return;
    endPress(true);
  };

  // Global mouseup to handle release outside
  useEffect(() => {
    const handleWindowUp = () => {
      if (isPressingRef.current) endPress(false);
    };
    window.addEventListener("mouseup", handleWindowUp);
    window.addEventListener("touchend", handleWindowUp);
    return () => {
      window.removeEventListener("mouseup", handleWindowUp);
      window.removeEventListener("touchend", handleWindowUp);
    };
  }, []);

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
            y={-25}
            shadowColor={props.selected ? "#000000" : undefined}
            shadowBlur={props.selected ? 6 : 0}
            shadowOffset={{ x: 15, y: -15 }}
            shadowOpacity={props.selected ? 0.2 : 0}
          />
        )}
        {imgOnnState && isSimulationOn && (
          <Image
            image={imgOnnState}
            width={220}
            height={220}
            shadowColor={props.selected ? "#000000" : undefined}
            shadowBlur={props.selected ? 10 : 0}
            shadowOffset={{ x: 15, y: -15 }}
            shadowOpacity={props.selected ? 0.2 : 0}
          />
        )}
        {imgMicrobit && (
          <Image
            image={imgMicrobit}
            width={220}
            height={220}
            shadowColor={props.selected ? "#000000" : undefined}
            shadowBlur={props.selected ? 10 : 0}
            shadowOffset={{ x: 15, y: -15 }}
            shadowOpacity={props.selected ? 0.2 : 0}
          />
        )}

        {/* 5x5 LED Grid */}
        {leds[0].map((_, y) =>
          leds.map((col, x) => (
            <Rect
              key={`${x}-${y}`}
              x={83 + x * 12.4}
              y={112 + y * 12.4}
              width={3.5}
              height={10}
              fill={leds[x][y] ? "yellow" : "#333"}
              cornerRadius={3}
            />
          ))
        )}

        {/* Touch (Logo) Sensor Overlay */}
        <Group
          x={LOGO_X}
          y={LOGO_Y}
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
            cornerRadius={20}
            stroke={logoStroke}
            strokeWidth={3}
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
          onClick={(e) => {
            e.cancelBubble = true;
            handleButtonClick("AB");
          }}
          x={164}
          y={96}
        >
          {btnPressed === "AB" && (
            <Rect
              width={12}
              height={12}
              fill=""
              stroke="red"
              strokeWidth={1.5}
              cornerRadius={12}
              x={2.8}
              y={0.6}
            />
          )}
          <Rect width={20} height={20} fill="" cornerRadius={10} shadowBlur={3} />
          <Text text="" fill="white" x={6} y={3} fontSize={12} fontStyle="bold" />
        </Group>

        {/* Button A */}
        <Group
          onClick={(e) => {
            e.cancelBubble = true;
            handleButtonClick("A");
          }}
          x={35}
          y={130}
        >
          {btnPressed === "A" && (
            <Rect
              width={16}
              height={16}
              fill=""
              stroke="#1B5FC5"
              strokeWidth={1.2}
              cornerRadius={12}
              x={2.8}
              y={0.6}
            />
          )}
          <Rect width={20} height={20} fill="" cornerRadius={10} shadowBlur={3} />
          <Text text="" fill="white" x={6} y={3} fontSize={12} fontStyle="bold" />
        </Group>

        {/* Button B */}
        <Group
          onClick={(e) => {
            e.cancelBubble = true;
            handleButtonClick("B");
          }}
          x={165}
          y={130}
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
              y={0.6}
            />
          )}
          <Rect width={20} height={20} fill="" cornerRadius={10} shadowBlur={3} />
          <Text text="" fill="white" x={6} y={3} fontSize={12} fontStyle="bold" />
        </Group>
      </Group>
    </BaseElement>
  );
}