"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import { Group, Image, Rect, Circle, Text, Line } from "react-konva";
import Konva from "konva";

interface Lm35Props{
  id: string;
  x?: number;
  y?: number;
  selected?: boolean;
  draggable?: boolean;
  isSimulationOn?: boolean;
  temperature?: number;
  onTemperatureChange?: (temp: number) => void;
}

/* =======================
   UI CONSTANTS
======================= */
const WIDTH = 60;
const SLIDER_PADDING = 2;
const TRACK_HEIGHT = 12;
const KNOB_RADIUS = 8;
const SLIDER_OFFSET_Y = -22; // slider ABOVE the LM35

/* =======================
   HELPERS
======================= */
function clamp(v: number, min: number, max: number) {
  return Math.max(min, Math.min(max, v));
}

/* =======================
   TEMPERATURE RANGE
======================= */
const MIN_TEMP = -55; // °C
const MAX_TEMP = 150; // °C

export default function Lm35(props: Lm35Props) {
  const temperature = props.temperature ?? 25;

  const [img, setImg] = useState<HTMLImageElement | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const groupRef = useRef<Konva.Group>(null);

  useEffect(() => {
    const image = new window.Image();
    image.src = "/assets/circuit_canvas/elements/LM35.svg";
    image.onload = () => setImg(image);
  }, []);

  const aspectRatio = img ? img.naturalHeight / img.naturalWidth : 1;
  const height = WIDTH * aspectRatio;
  const trackWidth = WIDTH - SLIDER_PADDING * 2;

  const tNorm = (temperature - MIN_TEMP) / (MAX_TEMP - MIN_TEMP);
  const knobX = clamp(tNorm * trackWidth, 0, trackWidth);

  /* =======================
     GLOBAL DRAG HANDLING (reuse LDR pattern)
  ======================= */
  const handlePointerMove = (e: MouseEvent) => {
    if (!isDragging || !groupRef.current) return;

    const stage = groupRef.current.getStage();
    if (!stage) return;

    const rect = stage.container().getBoundingClientRect();
    const pointerX = e.clientX - rect.left;

    const absPos = groupRef.current.getAbsolutePosition();
    const scale = stage.scaleX() || 1;

    const localX = (pointerX / scale) - (absPos.x / scale) - SLIDER_PADDING;
    const x = clamp(localX, 0, trackWidth);
    const newTemp = Math.round(((x / trackWidth) * (MAX_TEMP - MIN_TEMP) + MIN_TEMP) * 10) / 10;

    props.onTemperatureChange?.(newTemp);
  };

  useEffect(() => {
    if (!isDragging) return;
    const handleMove = (e: MouseEvent) => handlePointerMove(e);
    const handleUp = () => setIsDragging(false);

    window.addEventListener("mousemove", handleMove);
    window.addEventListener("mouseup", handleUp);

    return () => {
      window.removeEventListener("mousemove", handleMove);
      window.removeEventListener("mouseup", handleUp);
    };
  }, [isDragging]);

  return (
    <>
      {img && (
        <Group ref={groupRef} x={props.x} y={props.y}>
          {/* Slider (visible when selected & simulation is on) */}
          {props.isSimulationOn && props.selected && (
            <Group x={SLIDER_PADDING} y={SLIDER_OFFSET_Y}>
              {/* Cold icon */}
              <Group x={-29} y={(TRACK_HEIGHT / 2)-4.5}>
                <Text text="❄️" fontSize={14} listening={false} />
              </Group>

              {/* Track */}
              <Rect
                width={trackWidth}
                height={TRACK_HEIGHT}
                cornerRadius={TRACK_HEIGHT / 2}
                fill="#e6f3ff"
                stroke="#bbb"
                shadowBlur={2}
                onMouseDown={(e) => {
                  e.cancelBubble = true;
                  setIsDragging(true);
                }}
              />

              {/* Gradient filled progress */}
              <Rect
                width={Math.max(2, knobX)}
                height={TRACK_HEIGHT}
                cornerRadius={TRACK_HEIGHT / 2}
                fillLinearGradientStartPoint={{ x: 0, y: 0 }}
                fillLinearGradientEndPoint={{ x: trackWidth, y: 0 }}
                fillLinearGradientColorStops={[0, "#4fc3f7", 0.5, "#fff59d", 1, "#ff7043"]}
                listening={false}
              />

              {/* Knob */}
              <Group x={knobX} y={TRACK_HEIGHT / 2}>
                <Circle
                  radius={isDragging ? KNOB_RADIUS + 2 : KNOB_RADIUS}
                  fill={isDragging ? "#f4f4f4" : "#ffffff"}
                  stroke={isDragging ? "#444" : "#666"}
                  strokeWidth={isDragging ? 1.8 : 1.5}
                  shadowBlur={isDragging ? 10 : 6}
                  shadowColor={isDragging ? "#222" : "#444"}
                  onMouseDown={(e) => {
                    e.cancelBubble = true;
                    setIsDragging(true);
                  }}
                />
                {/* Temperature pointer text */}
                <Text
                  y={-22}
                  x={-18}
                  fontSize={12}
                  fill="#222"
                  text={`${temperature}°C`}
                />
              </Group>

              {/* Hot icon */}
              <Group x={trackWidth + 8} y={(TRACK_HEIGHT / 2)-4.5}>
                <Text text="🔥" fontSize={14} listening={false} />
              </Group>
            </Group>
          )}

          {/* LM35 body image */}
          <Image
            image={img}
            width={WIDTH}
            height={height}
            y={0}
          />
        </Group>
      )}
    </>
  );
}
