"use client";

import React, { useMemo } from "react";
import { Layer, Line, Rect } from "react-konva";

type InfiniteGridProps = {
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

const InfiniteGrid: React.FC<InfiniteGridProps> = ({
  virtualSize = 10000,
  gridSize = 20, // Increased default for better performance
  viewport,
}) => {
  const gridLines = useMemo(() => {
    // If viewport is provided, only render visible grid lines
    if (viewport) {
      const { x, y, width, height, scale } = viewport;

      // Calculate visible bounds with some padding
      const padding = gridSize * 5;
      const minX = x - padding;
      const maxX = x + width + padding;
      const minY = y - padding;
      const maxY = y + height + padding;

      // Snap to grid boundaries
      const startX = Math.floor(minX / gridSize) * gridSize;
      const endX = Math.ceil(maxX / gridSize) * gridSize;
      const startY = Math.floor(minY / gridSize) * gridSize;
      const endY = Math.ceil(maxY / gridSize) * gridSize;

      const lines = [];

      // Only create lines within visible area
      for (let x = startX; x <= endX; x += gridSize) {
        lines.push(
          <Line
            key={`v-${x}`}
            points={[x, startY, x, endY]}
            stroke="#e5e7eb"
            strokeWidth={1.3 / scale} // Adjust for zoom
            strokeDash={[2 / scale, 2 / scale]} // Adjust for zoom
            perfectDrawEnabled={false}
            shadowForStrokeEnabled={false}
          />
        );
      }

      for (let y = startY; y <= endY; y += gridSize) {
        lines.push(
          <Line
            key={`h-${y}`}
            points={[startX, y, endX, y]}
            stroke="#e5e7eb"
            strokeWidth={1.3 / scale} // Adjust for zoom
            strokeDash={[2 / scale, 2 / scale]} // Adjust for zoom
            perfectDrawEnabled={false}
            shadowForStrokeEnabled={false}
          />
        );
      }

      return lines;
    }

    // Fallback: render limited grid for better performance
    const maxLines = 200; // Limit total lines for performance
    const actualGridSize = Math.max(gridSize, virtualSize / maxLines);
    const lineCount = Math.floor(virtualSize / actualGridSize);

    const lines = [];

    for (let i = 0; i <= lineCount; i++) {
      const x = -virtualSize / 2 + i * actualGridSize;
      const y = -virtualSize / 2 + i * actualGridSize;

      lines.push(
        <Line
          key={`v-${i}`}
          points={[x, -virtualSize / 2, x, virtualSize / 2]}
          stroke="#e5e7eb"
          strokeWidth={1.3}
          strokeDash={[2, 2]}
          perfectDrawEnabled={false}
          shadowForStrokeEnabled={false}
        />
      );

      lines.push(
        <Line
          key={`h-${i}`}
          points={[-virtualSize / 2, y, virtualSize / 2, y]}
          stroke="#e5e7eb"
          strokeWidth={1.3}
          strokeDash={[2, 2]}
          perfectDrawEnabled={false}
          shadowForStrokeEnabled={false}
        />
      );
    }

    return lines;
  }, [virtualSize, gridSize, viewport]);

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
      {gridLines}
    </Layer>
  );
};

export default InfiniteGrid;
