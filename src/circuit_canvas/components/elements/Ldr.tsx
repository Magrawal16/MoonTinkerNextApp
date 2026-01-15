"use client";

import React, { useEffect, useMemo, useState } from "react";
import { Group, Image, Rect, Circle, Text, Line } from "react-konva";
import { BaseElement, BaseElementProps } from "@/circuit_canvas/components/core/BaseElement";

interface LdrProps extends BaseElementProps {
  isSimulationOn?: boolean;
  lightLevel?: number;
  onLightChange?: (light: number) => void;
}

/* =======================
   PHYSICAL CONSTANTS
======================= */
const MIN_R = 506;       // Bright
const MAX_R = 180000;    // Dark

/* =======================
   UI CONSTANTS
======================= */
const WIDTH = 60;
const SLIDER_PADDING = 8;
const TRACK_HEIGHT = 10;
const KNOB_RADIUS = 8;
const SLIDER_OFFSET_Y = -18; // 🔼 slider ABOVE the LDR

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
  const [pressed, setPressed] = useState(false);

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
     POINTER → LIGHT UPDATE
  ======================= */
  const updateLightFromPointer = (evt: any) => {
    const stage = evt.target.getStage();
    if (!stage) return;

    const pointer = stage.getPointerPosition();
    if (!pointer) return;

    const group = evt.target.getParent();
    if (!group) return;

    // Convert pointer → local group space (rotation-safe)
    const local = group
      .getAbsoluteTransform()
      .copy()
      .invert()
      .point(pointer);

    const x = clamp(local.x, 0, trackWidth);
    const newLight = Math.round((x / trackWidth) * 100);

    props.onLightChange?.(newLight);
  };

  // clear pressed state on global mouse up (covers leaving the canvas)
  useEffect(() => {
    const onUp = () => setPressed(false);
    window.addEventListener("mouseup", onUp);
    return () => window.removeEventListener("mouseup", onUp);
  }, []);

  return (
    <BaseElement {...props} draggable={!props.isSimulationOn}>
      {img && (
        <Group>
          {/* =======================
              SLIDER (TOP)
          ======================= */}
          {props.isSimulationOn && props.selected && (
            <Group x={SLIDER_PADDING} y={SLIDER_OFFSET_Y}>
              {/* Dark icon (left) */}
              <Group x={-24} y={TRACK_HEIGHT / 2}>
                <Circle radius={6} fill="#333" stroke="#111" strokeWidth={1} />
              </Group>

              {/* Track background */}
              <Rect
                width={trackWidth}
                height={TRACK_HEIGHT}
                cornerRadius={TRACK_HEIGHT / 2}
                fill="#e6e6e6"
                stroke="#bbb"
                shadowBlur={2}
                onMouseDown={(e) => {
                  e.cancelBubble = true;
                  setPressed(true);
                  updateLightFromPointer(e);
                }}
              />

              {/* Filled progress (visualizes light level) */}
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
                radius={pressed ? KNOB_RADIUS + 2 : KNOB_RADIUS}
                fill={pressed ? "#f4f4f4" : "#ffffff"}
                stroke={pressed ? "#444" : "#666"}
                strokeWidth={pressed ? 1.8 : 1.5}
                shadowBlur={pressed ? 10 : 6}
                shadowColor={pressed ? "#222" : "#444"}
                draggable={false} // ❗ IMPORTANT
                onMouseDown={(e) => {
                  e.cancelBubble = true;
                  setPressed(true);
                  updateLightFromPointer(e);
                }}
                onMouseMove={(e) => {
                  if (e.evt.buttons === 1) {
                    e.cancelBubble = true;
                    updateLightFromPointer(e);
                  }
                }}
              />

              {/* Resistance Label (moved above slider) */}
              <Text
                y={-TRACK_HEIGHT - 12}
                x={trackWidth / 2 - 40}
                fontSize={12}
                fill="#222"
                text={`${Math.round(resistance)} Ω`}
              />

              {/* Sun icon (right) */}
              <Group x={trackWidth + 18} y={TRACK_HEIGHT / 2}>
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
            shadowBlur={props.selected ? 6 : 0}
          />
        </Group>
      )}
    </BaseElement>
  );
}
