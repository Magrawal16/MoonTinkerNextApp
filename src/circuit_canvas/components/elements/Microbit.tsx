"use client";

import {
  BaseElement,
  BaseElementProps,
} from "@/circuit_canvas/components/core/BaseElement";
import { useEffect, useState } from "react";
import { Group, Image, Rect, Text } from "react-konva";

interface MicrobitProps extends BaseElementProps {
  onControllerInput?: (input: "A" | "B") => void;
  leds: boolean[][];
  isSimulationOn?: boolean;
}

export default function Microbit({
  leds,
  onControllerInput,
  isSimulationOn,
  ...props
}: MicrobitProps) {
  const [imgMicrobit, setImgMicrobit] = useState<HTMLImageElement | null>(null);
  const [imgOnnState, setImgOnnState] = useState<HTMLImageElement | null>(null);
  const [imgOffState, setImgOffState] = useState<HTMLImageElement | null>(null);
  const [btnPressed, setBtnPressed] = useState<'A' | 'B' | null>(null);
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

  const handleButtonClick = (btn: "A" | "B") => {
    setBtnPressed(btn);
    onControllerInput?.(btn);
    setTimeout(() => setBtnPressed(null), 150);
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
            shadowOpacity={props.selected ? 2 : 0}
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
            shadowOpacity={props.selected ? 2 : 0}
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
            shadowOpacity={props.selected ? 2 : 0}
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

        {/* Button A */}
        <Group
          onClick={(e) => {
            e.cancelBubble = true;
            handleButtonClick("A");
          }}
          x={35}
          y={130}
        >
          {/* Blue Circle when pressed */}
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
          <Rect
            width={20}
            height={20}
            fill=""
            cornerRadius={10}
            shadowBlur={3}
          />
          <Text
            text=""
            fill="white"
            x={6}
            y={3}
            fontSize={12}
            fontStyle="bold"
          />
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
          {/* Blue Circle when pressed */}
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
          <Rect
            width={20}
            height={20}
            fill=""
            cornerRadius={10}
            shadowBlur={3}
          />
          <Text
            text=""
            fill="white"
            x={6}
            y={3}
            fontSize={12}
            fontStyle="bold"
          />
        </Group>
      </Group>
    </BaseElement>
  );
}
