"use client";

import React, { useEffect, useMemo, useState } from "react";
import {
  BaseElement,
  BaseElementProps,
} from "@/circuit_canvas/components/core/BaseElement";
import { Image, Rect, Group } from "react-konva";

type ResistorProps = BaseElementProps & {
  resistance?: number;
  width?: number;
  height?: number;
  bandWidths?: number[];
  bandHeights?: number[];
  bandSpacing?: number; // fallback if bandGaps not provided
  bandGaps?: number[];  // NEW: per-band gaps between bands
};

// Color map used for resistor bands
const COLOR_MAP: Record<string, string> = {
  black: "#000000",
  brown: "#8B4513",
  red: "#D32F2F",
  orange: "#FB8C00",
  yellow: "#FDD835",
  green: "#2E7D32",
  blue: "#1976D2",
  violet: "#6A1B9A",
  gray: "#757575",
  white: "#FFFFFF",
  gold: "#D4AF37",
  silver: "#C0C0C0",
  transparent: "transparent",
};

/**
 * Compute 4-band resistor colors:
 * returns [band1, band2, multiplier, tolerance]
 * fallback -> 5 Ω (brown, black, black, gold)
 */
function computeBands(resistance: number | null | undefined) {
  if (resistance == null || !Number.isFinite(resistance) || resistance <= 0) {
    return ["brown", "black", "black", "gold"];
  }

  // Avoid zeros / negative; keep at least small positive
  const R = Math.max(0.001, resistance);

  // Normalize to two significant digits (10..99) with a multiplier exponent
  const log10 = Math.log10(R);
  let exp = Math.floor(log10) - 1; // multiplier exponent
  let sig = Math.round(R / Math.pow(10, exp));

  // Handle rounding edgecases
  if (sig >= 100) {
    sig = Math.round(sig / 10);
    exp += 1;
  }
  if (sig < 10) {
    // push one digit / adjust if rounding produced <10
    sig = Math.round(sig * 10);
    exp -= 1;
  }

  const first = Math.floor(sig / 10);
  const second = sig % 10;

  const digitToColor = (d: number) => {
    switch (d) {
      case 0:
        return "black";
      case 1:
        return "brown";
      case 2:
        return "red";
      case 3:
        return "orange";
      case 4:
        return "yellow";
      case 5:
        return "green";
      case 6:
        return "blue";
      case 7:
        return "violet";
      case 8:
        return "gray";
      case 9:
        return "white";
      default:
        return "black";
    }
  };

  const multiplierToColor = (m: number) => {
    if (m === -1) return "gold";
    if (m === -2) return "silver";
    switch (m) {
      case 0:
        return "black";
      case 1:
        return "brown";
      case 2:
        return "red";
      case 3:
        return "orange";
      case 4:
        return "yellow";
      case 5:
        return "green";
      case 6:
        return "blue";
      case 7:
        return "violet";
      case 8:
        return "gray";
      case 9:
        return "white";
      default:
        return "white";
    }
  };

  const band1 = digitToColor(first);
  const band2 = digitToColor(second);
  const band3 = multiplierToColor(exp);
  const tolerance = "gold";

  return [band1, band2, band3, tolerance];
}

/** Use public path (served by Next.js from /public) */
function getResistorBasePath() {
  return "/assets/circuit_canvas/elements/resistor.svg";
}

export default function Resistor(props: ResistorProps) {
  const [img, setImg] = useState<HTMLImageElement | null>(null);
  const src = useMemo(() => getResistorBasePath(), []);

  useEffect(() => {
    const image = new window.Image();
    image.src = src;
    image.onload = () => setImg(image);
    image.alt = "Resistor";
  }, [src]);

  // compute bands from props.resistance
  const bands = useMemo(() => computeBands(props.resistance), [props.resistance]);

  // layout: image width/height (defaults kept for compatibility)
  const { width = 50, height = 60 } = props;

  // default band sizing & positioning (keeps previous behavior)
  const defaultBandWidth = Math.max(3, Math.round(width * 0.045));
  const defaultBandHeight = Math.round(height * 0.9);
  const defaultSpacing = Math.round(defaultBandWidth * 0.6);

  // New: accept per-band arrays; fallback to defaults
  const nBands = bands.length; // expected 4
  const bandWidths = (props.bandWidths && props.bandWidths.slice(0, nBands)) ??
    Array(nBands).fill(defaultBandWidth);
  const bandHeights = (props.bandHeights && props.bandHeights.slice(0, nBands)) ??
    Array(nBands).fill(defaultBandHeight);

  // If user provided fewer entries, pad to length nBands
  while (bandWidths.length < nBands) bandWidths.push(defaultBandWidth);
  while (bandHeights.length < nBands) bandHeights.push(defaultBandHeight);

  // NEW: per-band gaps
  const bandGaps = (props.bandGaps && props.bandGaps.slice(0, nBands - 1)) ??
    Array(nBands - 1).fill(typeof props.bandSpacing === "number" ? props.bandSpacing : defaultSpacing);
  while (bandGaps.length < nBands - 1) bandGaps.push(defaultSpacing);

  // compute total width occupied by bands and position them centered
  const totalBandsWidth = bandWidths.reduce((s, w) => s + w, 0) + bandGaps.reduce((s, g) => s + g, 0);
  const startX = Math.round((width - totalBandsWidth) / 2);
  const bandY = Math.round((height - Math.max(...bandHeights)) / 2);

  // accumulate x positions for each band (so different widths and gaps are supported)
  const bandXs: number[] = [];
  let acc = startX;
  for (let i = 0; i < nBands; i++) {
    bandXs.push(acc);
    acc += bandWidths[i] + (i < bandGaps.length ? bandGaps[i] : 0);
  }

  return (
    <BaseElement {...props}>
      {img && (
        <Group>
          <Image
            image={img}
            width={width}
            height={height}
            shadowColor={props.selected ? "#000000" : undefined}
            shadowBlur={props.selected ? 4 : 0}
            shadowOffset={{ x: 13, y: -13 }}
            shadowOpacity={props.selected ? 0.2 : 0}
            x={6.2}
            y={-2}
          />
          {bands.map((b, idx) => {
            const w = Math.max(1, Math.round(bandWidths[idx]));
            const h = Math.max(2, Math.round(bandHeights[idx]));
            // Center each band individually
            const bandY = Math.round((height - h) / 2);
            const rectHeight = h - 43 > 0 ? h - 43 : Math.max(2, h);
            return (
              <Rect
                key={idx}
                x={bandXs[idx] + 7}
                y={bandY - 2}
                width={w}
                height={rectHeight}
                cornerRadius={1}
                fill={COLOR_MAP[b] || "transparent"}
                stroke={b === "white" ? "#aaa" : undefined}
                strokeWidth={b === "white" ? 0.6 : 0}
              />
            );
          })}
        </Group>
      )}
    </BaseElement>
  );
}
