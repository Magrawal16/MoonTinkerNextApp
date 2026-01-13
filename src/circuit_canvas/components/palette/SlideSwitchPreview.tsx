"use client";

import React, { useState, useEffect } from "react";

export function SlideSwitchPreview() {
  const [baseSwitchImg, setBaseSwitchImg] = useState<HTMLImageElement | null>(
    null
  );
  const [stripsImg, setStripsImg] = useState<HTMLImageElement | null>(null);

  useEffect(() => {
    const image = new window.Image();
    image.src = "assets/circuit_canvas/elements/SlideSwitch.svg";
    image.onload = () => setBaseSwitchImg(image);
    image.alt = "Slide Switch Base";
  }, []);

  useEffect(() => {
    const canvas = document.createElement("canvas");
    canvas.width = 60;
    canvas.height = 40;
    const ctx = canvas.getContext("2d");

    if (ctx) {
      ctx.fillStyle = "#afafaf";
      const stripWidth = 8;
      const stripHeight = 40;
      const spacing = 3;
      const totalWidth = 5 * stripWidth + 4 * spacing;
      const startX = (60 - totalWidth) / 2;

      for (let i = 0; i < 5; i++) {
        const x = startX + i * (stripWidth + spacing);
        ctx.fillRect(x, 0, stripWidth, stripHeight);
      }

      const img = new window.Image();
      img.src = canvas.toDataURL();
      img.onload = () => setStripsImg(img);
    }
  }, []);

  return (
    <svg
      viewBox="0 0 150 90"
      width="100%"
      height="100%"
      xmlns="http://www.w3.org/2000/svg"
      style={{ maxWidth: "100px", maxHeight: "60px" }}
    >
      {/* Base switch SVG as background */}
      {baseSwitchImg && (
        <image
          href={baseSwitchImg.src}
          x="0"
          y="0"
          width="150"
          height="90"
        />
      )}

      {/* Strips overlay positioned on the left */}
      {stripsImg && (
        <image
          href={stripsImg.src}
          x="28"
          y="12.5"
          width="55"
          height="32"
        />
      )}
    </svg>
  );
}
