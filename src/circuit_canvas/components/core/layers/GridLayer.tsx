"use client";

import React from "react";
import HighPerformanceGrid from "../HighPerformanceGrid";

type GridLayerProps = {
  viewport?: {
    x: number;
    y: number;
    width: number;
    height: number;
    scale: number;
  };
  gridSize?: number;
};

// Thin wrapper to standardize layer structure for future extensions
const GridLayer: React.FC<GridLayerProps> = ({ viewport, gridSize = 25 }) => {
  return <HighPerformanceGrid viewport={viewport} gridSize={gridSize} />;
};

export default GridLayer;
