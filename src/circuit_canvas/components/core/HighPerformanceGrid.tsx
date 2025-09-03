"use client";

import React, { useMemo } from "react";
import { Layer, Shape } from "react-konva";

type HighPerformanceGridProps = {
  gridSize?: number;
  viewport?: {
    x: number;
    y: number;
    width: number;
    height: number;
    scale: number;
  };
};

const HighPerformanceGrid: React.FC<HighPerformanceGridProps> = ({
  gridSize = 25,
  viewport,
}) => {
  const gridShape = useMemo(() => {
    return (
      <Shape
        sceneFunc={(context, shape) => {
          // 1. DON'T DRAW IF NO VIEWPORT
          if (!viewport) return;

          const { x, y, width, height, scale } = viewport;

          // 2. ADAPTIVE GRID: Make grid lines larger when zoomed out
          let effectiveGridSize = gridSize;
          if (scale < 0.8) effectiveGridSize = gridSize * 2;
          if (scale < 0.4) effectiveGridSize = gridSize * 4;
          if (scale < 0.2) effectiveGridSize = gridSize * 8;

          // 3. CALCULATE the VISIBLE RECTANGLE (what the user can see)
          const visibleLeft = x;
          const visibleRight = x + width;
          const visibleTop = y;
          const visibleBottom = y + height;

          // 4. Find the first grid line inside/just outside the visible area
          const startX = Math.floor(visibleLeft / effectiveGridSize) * effectiveGridSize;
          const startY = Math.floor(visibleTop / effectiveGridSize) * effectiveGridSize;

          // 5. HARD LIMIT: Calculate how many lines we NEED to draw to cover the screen
          const neededXLines = Math.ceil(width / effectiveGridSize) + 2; // +2 for padding
          const neededYLines = Math.ceil(height / effectiveGridSize) + 2;

          // 6. HARD LIMIT: Set an ABSOLUTE MAXIMUM number of lines to draw
          const maxLines = 150; // <- This is the magic number! Prevents thousands of lines.
          const totalLinesToDrawX = Math.min(neededXLines, maxLines);
          const totalLinesToDrawY = Math.min(neededYLines, maxLines);

          // If we hit the limit, don't draw a grid. It's better to have no grid than a laggy app.
          if (totalLinesToDrawX <= 0 || totalLinesToDrawY <= 0) return;

          context.beginPath();
          context.strokeStyle = `rgba(180, 180, 180, ${0.2 + 0.4 * Math.min(1, scale)})`; // Lighter, more transparent lines
          context.lineWidth = 1 / scale; // Thinner lines when zoomed out

          // 7. ONLY DRAW THE LINES WE ABSOLUTELY NEED
          // Draw vertical lines
          for (let i = 0; i < totalLinesToDrawX; i++) {
            const lineX = startX + i * effectiveGridSize;
            // Check if the line is even visible before drawing it
            if (lineX > visibleRight) break; // Stop if we're past the visible area
            context.moveTo(lineX, visibleTop);
            context.lineTo(lineX, visibleBottom);
          }

          // Draw horizontal lines
          for (let i = 0; i < totalLinesToDrawY; i++) {
            const lineY = startY + i * effectiveGridSize;
            if (lineY > visibleBottom) break;
            context.moveTo(visibleLeft, lineY);
            context.lineTo(visibleRight, lineY);
          }

          context.stroke();
          context.setLineDash([]); // Ensure solid lines
        }}
        perfectDrawEnabled={false} // Good for performance
        listening={false} // Cannot be clicked/dragged
      />
    );
  }, [viewport, gridSize]); // Only re-calculate when viewport or gridSize changes

  return (
    <Layer listening={false} perfectDrawEnabled={false}>
      {gridShape}
    </Layer>
  );
};

export default HighPerformanceGrid;