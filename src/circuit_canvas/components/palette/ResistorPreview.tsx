"use client";

import React, { useState, useEffect } from "react";

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
};

function compute1KOhmBands() {
  return ["brown", "black", "red"];
}

export function ResistorPreview() {
  const [baseResistorImg, setBaseResistorImg] = useState<HTMLImageElement | null>(null);
  const [bandsImg, setbandsImg] = useState<HTMLImageElement | null>(null);

  // Load the base resistor SVG
  useEffect(() => {
    const image = new window.Image();
    image.src = "assets/circuit_canvas/elements/resistor.svg";
    image.onload = () => setBaseResistorImg(image);
    image.alt = "Resistor Base";
  }, []);

  // Create canvas with 1kΩ resistor bands
  useEffect(() => {
    const canvas = document.createElement("canvas");
    canvas.width = 120;
    canvas.height = 40;
    const ctx = canvas.getContext("2d");

    if (ctx) {
      const bands = compute1KOhmBands();
      const bandWidth = 5;
      const bandHeight = 15;
      const bandSpacing = 6;
      const totalWidth = 4 * bandWidth + 3 * bandSpacing;
      const startX = (120 - totalWidth) / 2;

      // Draw 4 bands
      bands.forEach((bandColor, index) => {
        const x = startX + index * (bandWidth + bandSpacing);
        ctx.fillStyle = COLOR_MAP[bandColor] || "#000000";
        ctx.fillRect(x, 0, bandWidth, bandHeight);
      });

      const img = new window.Image();
      img.src = canvas.toDataURL();
      img.onload = () => setbandsImg(img);
    }
  }, []);

  return (
    <svg
      viewBox="25 0 100 90"
      width="100%"
      height="100%"
      xmlns="http://www.w3.org/2000/svg"
      style={{ maxWidth: "100px", maxHeight: "52px" }}
    >
      {/* Base resistor SVG as background */}
      {baseResistorImg && (
        <image
          href={baseResistorImg.src}
          x="2"
          y="20"
          width="150"
          height="90"
        />
      )}

      {/* Resistor bands overlay */}
      {bandsImg && (
        <image
          href={bandsImg.src}
          x="22"
          y="56"
          width="120"
          height="40"
        />
      )}
    </svg>
  );
}
