"use client";

import React, { useMemo } from "react";
import { Layer, Rect, Shape } from "react-konva";

type HighPerformanceGridProps = {
  virtualSize?: number;
  gridSize?: number;
  viewport?: {
    x: number;
    y: number;
    width: number;
    height: number;
    scale: number;
  };
  adaptive?: boolean; // Automatically adjust grid density based on zoom
};

const HighPerformanceGrid: React.FC<HighPerformanceGridProps> = ({
  virtualSize = 10000,
  gridSize = 25,
  viewport,
  adaptive = true,
}) => {
  const gridShape = useMemo(() => {
    return (
      <Shape
        sceneFunc={(context, shape) => {
          if (!viewport) return;

          const { x, y, width, height, scale } = viewport;

          // Adaptive grid density based on zoom level
          let effectiveGridSize = gridSize;
          if (adaptive) {
            // When zoomed in (scale > 1), use larger grid spacing for less clutter
            if (scale > 2) effectiveGridSize = gridSize * 4;
            else if (scale > 1.5) effectiveGridSize = gridSize * 2;
            // When zoomed out (scale < 1), use smaller grid spacing for more reference points
            else if (scale < 0.5) effectiveGridSize = gridSize / 4;
            else if (scale < 0.8) effectiveGridSize = gridSize / 2;
          }

          // Calculate visible bounds with minimal padding
          const padding = effectiveGridSize * 2;
          const minX = x - padding;
          const maxX = x + width + padding;
          const minY = y - padding;
          const maxY = y + height + padding;

          // Snap to grid boundaries
          const startX =
            Math.floor(minX / effectiveGridSize) * effectiveGridSize;
          const endX = Math.ceil(maxX / effectiveGridSize) * effectiveGridSize;
          const startY =
            Math.floor(minY / effectiveGridSize) * effectiveGridSize;
          const endY = Math.ceil(maxY / effectiveGridSize) * effectiveGridSize;

          // Limit max number of lines for extreme performance
          const maxLines = 100;
          const xLines = Math.min(
            maxLines,
            (endX - startX) / effectiveGridSize
          );
          const yLines = Math.min(
            maxLines,
            (endY - startY) / effectiveGridSize
          );

          if (xLines <= 0 || yLines <= 0) return;

          // Set line style with opacity based on zoom
          const opacity = Math.max(0.3, Math.min(1, scale));
          context.strokeStyle = `rgba(229, 231, 235, ${opacity})`;
          context.lineWidth = Math.max(0.5, 1.3 / scale);

          // Use dashed lines when zoomed out, solid lines when zoomed in
          if (scale < 1) {
            context.setLineDash([2 / scale, 2 / scale]);
          } else {
            context.setLineDash([]);
          }

          context.beginPath();

          // Draw vertical lines
          const xStep = (endX - startX) / xLines;
          for (let i = 0; i <= xLines; i++) {
            const gridX = startX + i * xStep;
            context.moveTo(gridX, startY);
            context.lineTo(gridX, endY);
          }

          // Draw horizontal lines
          const yStep = (endY - startY) / yLines;
          for (let i = 0; i <= yLines; i++) {
            const gridY = startY + i * yStep;
            context.moveTo(startX, gridY);
            context.lineTo(endX, gridY);
          }

          context.stroke();
        }}
        perfectDrawEnabled={false}
        listening={false}
        hitStrokeWidth={0}
      />
    );
  }, [viewport, gridSize, adaptive]);

  if (!viewport) return null;

  return (
    <Layer listening={false} perfectDrawEnabled={false}>
      {gridShape}
    </Layer>
  );
};

export default HighPerformanceGrid;
