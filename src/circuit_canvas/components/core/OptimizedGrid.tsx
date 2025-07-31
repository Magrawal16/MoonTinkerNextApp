"use client";

import React, { useMemo, useRef, useEffect } from "react";
import { Layer, Line, Rect, Shape } from "react-konva";

type OptimizedGridProps = {
  virtualSize?: number;
  gridSize?: number;
  viewport?: {
    x: number;
    y: number;
    width: number;
    height: number;
    scale: number;
  };
};

const OptimizedGrid: React.FC<OptimizedGridProps> = ({
  virtualSize = 10000,
  gridSize = 25,
  viewport,
}) => {
  // Custom drawing function for the grid using Canvas API
  const gridShape = useMemo(() => {
    return (
      <Shape
        sceneFunc={(context, shape) => {
          if (!viewport) return;

          const { x, y, width, height, scale } = viewport;

          // Calculate visible bounds with padding
          const padding = gridSize * 3;
          const minX = x - padding;
          const maxX = x + width + padding;
          const minY = y - padding;
          const maxY = y + height + padding;

          // Snap to grid boundaries
          const startX = Math.floor(minX / gridSize) * gridSize;
          const endX = Math.ceil(maxX / gridSize) * gridSize;
          const startY = Math.floor(minY / gridSize) * gridSize;
          const endY = Math.ceil(maxY / gridSize) * gridSize;

          // Set line style
          context.strokeStyle = "#e5e7eb";
          context.lineWidth = 1.3 / scale;
          context.setLineDash([2 / scale, 2 / scale]);

          context.beginPath();

          // Draw vertical lines
          for (let gridX = startX; gridX <= endX; gridX += gridSize) {
            context.moveTo(gridX, startY);
            context.lineTo(gridX, endY);
          }

          // Draw horizontal lines
          for (let gridY = startY; gridY <= endY; gridY += gridSize) {
            context.moveTo(startX, gridY);
            context.lineTo(endX, gridY);
          }

          context.stroke();
        }}
        perfectDrawEnabled={false}
        listening={false}
      />
    );
  }, [viewport, gridSize]);

  return (
    <Layer listening={false}>
      {/* Background */}
      <Rect
        x={-virtualSize / 2}
        y={-virtualSize / 2}
        width={virtualSize}
        height={virtualSize}
        fill="transparent"
        perfectDrawEnabled={false}
      />
      {viewport && gridShape}
    </Layer>
  );
};

export default OptimizedGrid;
