"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import { Group, Image, Rect, Circle, Text, Line } from "react-konva";
import Konva from "konva";

interface LdrProps {
  id: string;
  x?: number;
  y?: number;
  selected?: boolean;
  draggable?: boolean;
  isSimulationOn?: boolean;
  lightLevel?: number;
  onLightChange?: (light: number) => void;
}

/* =======================
   PHYSICAL CONSTANTS
======================= */
const MIN_R = 506;       // Bright
const MAX_R = 180000;    // Dark

//Hide Resistance from Slider (used for debugging)
const SHOW_RESISTANCE_LABEL = false;

/* =======================
   UI CONSTANTS
======================= */
const WIDTH = 60;
const SLIDER_PADDING = 2;
const TRACK_HEIGHT = 10;
const KNOB_RADIUS = 8;
const SLIDER_OFFSET_Y = -18; // slider ABOVE the LDR

/* =======================
   HELPERS
======================= */
function clamp(v: number, min: number, max: number) {
  return Math.max(min, Math.min(max, v));
}

/* =======================
   PHYSICS
======================= */
function lightToResistance(light: number) {
  const lnMin = Math.log(MIN_R);
  const lnMax = Math.log(MAX_R);
  return Math.exp(
    lnMax - (light / 100) * (lnMax - lnMin)
  );
}

/* =======================
   COMPONENT
======================= */
export default function Ldr(props: LdrProps) {
  const lightLevel = props.lightLevel ?? 50;

  const resistance = useMemo(
    () => lightToResistance(lightLevel),
    [lightLevel]
  );

  const [img, setImg] = useState<HTMLImageElement | null>(null);
  const [isDragging, setIsDragging] = useState(false);

  const groupRef = useRef<Konva.Group>(null);

  useEffect(() => {
    const image = new window.Image();
    image.src = "/assets/circuit_canvas/elements/LDR.svg";
    image.onload = () => setImg(image);
  }, []);

  const aspectRatio = img ? img.naturalHeight / img.naturalWidth : 1;
  const height = WIDTH * aspectRatio;

  const trackWidth = WIDTH - SLIDER_PADDING * 2;

  const knobX = clamp(
    (lightLevel / 100) * trackWidth,
    0,
    trackWidth
  );

  /* =======================
     GLOBAL DRAG HANDLING
  ======================= */
  const handlePointerMove = (e: MouseEvent) => {
    if (!isDragging || !groupRef.current) return;

    const stage = groupRef.current.getStage();
    if (!stage) return;

    const rect = stage.container().getBoundingClientRect();
    const pointerX = e.clientX - rect.left;

    const absPos = groupRef.current.getAbsolutePosition();
    const scale = stage.scaleX() || 1;

    const localX =
      (pointerX / scale) - (absPos.x / scale) - SLIDER_PADDING;

    const x = clamp(localX, 0, trackWidth);
    const newLight = Math.round((x / trackWidth) * 100);

    props.onLightChange?.(newLight);
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
          {/* =======================
              SLIDER (TOP)
          ======================= */}
          {props.isSimulationOn && props.selected && (
            <Group x={SLIDER_PADDING} y={SLIDER_OFFSET_Y}>
              {/* Dark icon (left) */}
              <Group x={-24} y={TRACK_HEIGHT / 2}>
                <Circle radius={6} fill="#333" stroke="#111" strokeWidth={1} />
              </Group>

              {/* Track */}
              <Rect
                width={trackWidth}
                height={TRACK_HEIGHT}
                cornerRadius={TRACK_HEIGHT / 2}
                fill="#e6e6e6"
                stroke="#bbb"
                shadowBlur={2}
                onMouseDown={(e) => {
                  e.cancelBubble = true;
                  setIsDragging(true);
                }}
              />

              {/* Filled progress */}
              <Rect
                width={Math.max(2, knobX)}
                height={TRACK_HEIGHT}
                cornerRadius={TRACK_HEIGHT / 2}
                fillLinearGradientStartPoint={{ x: 0, y: 0 }}
                fillLinearGradientEndPoint={{ x: trackWidth, y: 0 }}
                fillLinearGradientColorStops={[0, "#fff59d", 1, "#ffb74d"]}
                listening={false}
              />

              {/* Knob */}
              <Circle
                x={knobX}
                y={TRACK_HEIGHT / 2}
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

              {/* Resistance Label */}
              {SHOW_RESISTANCE_LABEL && (
              <Text
                y={-TRACK_HEIGHT - 12}
                x={trackWidth / 2 - 40}
                fontSize={12}
                fill="#222"
                text={`${Math.round(resistance)} Ω`}
              />
            )}


              {/* Sun icon (right) */}
              <Group x={trackWidth + 26} y={TRACK_HEIGHT / 2}>
                <Circle radius={6} fill="#FFD54F" stroke="#FB8C00" strokeWidth={1} />
                {[0, 45, 90, 135, 180, 225, 270, 315].map((a) => {
                  const rad = (a * Math.PI) / 180;
                  const x1 = Math.cos(rad) * 8;
                  const y1 = Math.sin(rad) * 8;
                  const x2 = Math.cos(rad) * 12;
                  const y2 = Math.sin(rad) * 12;
                  return (
                    <Line
                      key={a}
                      points={[x1, y1, x2, y2]}
                      stroke="#FB8C00"
                      strokeWidth={2}
                      listening={false}
                    />
                  );
                })}
              </Group>
            </Group>
          )}

          {/* =======================
              LDR BODY
          ======================= */}
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
