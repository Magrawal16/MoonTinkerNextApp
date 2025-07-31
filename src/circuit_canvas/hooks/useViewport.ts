import { useState, useCallback, RefObject } from "react";
import Konva from "konva";

export type Viewport = {
  x: number;
  y: number;
  width: number;
  height: number;
  scale: number;
};

export const useViewport = (stageRef: RefObject<Konva.Stage | null>) => {
  const [viewport, setViewport] = useState<Viewport>({
    x: 0,
    y: 0,
    width: 800,
    height: 600,
    scale: 1,
  });

  const updateViewport = useCallback(() => {
    if (!stageRef.current) return;

    const stage = stageRef.current;
    const scale = stage.scaleX();
    const position = stage.position();
    const size = stage.size();

    // Calculate the visible area in world coordinates
    const newViewport: Viewport = {
      x: -position.x / scale,
      y: -position.y / scale,
      width: size.width / scale,
      height: size.height / scale,
      scale: scale,
    };

    setViewport((prev) => {
      // Only update if there's a significant change
      const threshold = 10;
      if (
        Math.abs(prev.x - newViewport.x) > threshold ||
        Math.abs(prev.y - newViewport.y) > threshold ||
        Math.abs(prev.width - newViewport.width) > threshold ||
        Math.abs(prev.height - newViewport.height) > threshold ||
        Math.abs(prev.scale - newViewport.scale) > 0.01
      ) {
        return newViewport;
      }
      return prev;
    });
  }, [stageRef]);

  return { viewport, updateViewport };
};
