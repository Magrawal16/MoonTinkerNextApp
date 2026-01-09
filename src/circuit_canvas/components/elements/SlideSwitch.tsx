"use client";

import { useState, useEffect, useRef } from "react";
import { Group, Image, Rect } from "react-konva";
import { BaseElement } from "@/circuit_canvas/components/core/BaseElement";
import { BaseElementProps } from "@/circuit_canvas/types/circuit";

interface SlideSwitchProps extends BaseElementProps {
  position?: "left" | "right"; // left = terminal1+common connected, right = terminal2+common connected
  onPositionChange?: (position: "left" | "right") => void;
  isSimulationOn?: boolean;
}

export default function SlideSwitch({
  position = "left",
  onPositionChange,
  isSimulationOn,
  ...props
}: SlideSwitchProps) {
  const [baseSwitchImg, setBaseSwitchImg] = useState<HTMLImageElement | null>(null);
  const [stripsImg, setStripsImg] = useState<HTMLImageElement | null>(null);
  const [currentPosition, setCurrentPosition] = useState<"left" | "right">(position);

  // Load the base switch SVG (without strips)
  useEffect(() => {
    const image = new window.Image();
    image.src = "assets/circuit_canvas/elements/SlideSwitch.svg";
    image.onload = () => setBaseSwitchImg(image);
    image.alt = "Slide Switch Base";
  }, []);

  // For now, we'll create the strips overlay programmatically
  // You can replace this with a separate SVG file if you create one
  useEffect(() => {
    // Create a canvas to draw the 5 strips
    const canvas = document.createElement('canvas');
    canvas.width = 60;
    canvas.height = 40;
    const ctx = canvas.getContext('2d');
    
    if (ctx) {
      // Draw 5 vertical gray strips
      ctx.fillStyle = '#afafaf'; // Light gray color for strips
      const stripWidth = 8;
      const stripHeight = 40;
      const spacing = 3;
      const totalWidth = 5 * stripWidth + 4 * spacing;
      const startX = (60 - totalWidth) / 2;
      
      for (let i = 0; i < 5; i++) {
        const x = startX + i * (stripWidth + spacing);
        ctx.fillRect(x, 0, stripWidth, stripHeight);
      }
      
      // Convert canvas to image
      const img = new window.Image();
      img.src = canvas.toDataURL();
      img.onload = () => setStripsImg(img);
    }
  }, []);

  useEffect(() => {
    setCurrentPosition(position);
  }, [position]);

  const setCursor = (cursor: string, e: any) => {
    const stage = e?.target?.getStage?.();
    if (stage) stage.container().style.cursor = cursor;
  };

  const handleSwitchClick = (e: any) => {
    if (!isSimulationOn) return;
    
    // Toggle position
    const newPosition = currentPosition === "left" ? "right" : "left";
    setCurrentPosition(newPosition);
    onPositionChange?.(newPosition);
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

  const stripsXPosition = currentPosition === "left" ? 28 : 68;

  return (
    <BaseElement {...props} isSimulationOn={isSimulationOn}>
      <Group>
        {/* Base Switch SVG */}
        {baseSwitchImg && (
          <Image
            image={baseSwitchImg}
            width={150}
            height={90}
            x={0}
            y={0}
            shadowColor={props.selected ? "#000000" : undefined}
            shadowBlur={props.selected ? 10 : 0}
            shadowOffset={{ x: 15, y: -15 }}
            shadowOpacity={0}
            listening={false}
          />
        )}

        {/* Strips Overlay - positioned based on switch state */}
        {stripsImg && (
          <Image
            image={stripsImg}
            width={55}
            height={32}
            x={stripsXPosition}
            y={12.5}
            listening={false}
          />
        )}

        {/* Interactive clickable area covering the entire switch body */}
        <Rect
          x={40}
          y={20}
          width={140}
          height={60}
          fill="transparent"
          onClick={handleSwitchClick}
          onTap={handleSwitchClick}
          onMouseEnter={handleMouseEnter}
          onMouseLeave={handleMouseLeave}
        />
      </Group>
    </BaseElement>
  );
}
