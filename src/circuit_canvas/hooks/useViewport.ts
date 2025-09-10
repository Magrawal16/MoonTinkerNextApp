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

  const updateViewport = useCallback((force: boolean = false) => {
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
      // More sensitive resize detection so DevTools open/close repaints grid
      const moveThreshold = 10;      // pan threshold
      const sizeThreshold = 2;       // width/height threshold (smaller so layout changes refresh)
      const scaleThreshold = 0.01;   // scale threshold
      if (force ||
        Math.abs(prev.x - newViewport.x) > moveThreshold ||
        Math.abs(prev.y - newViewport.y) > moveThreshold ||
        Math.abs(prev.width - newViewport.width) > sizeThreshold ||
        Math.abs(prev.height - newViewport.height) > sizeThreshold ||
        Math.abs(prev.scale - newViewport.scale) > scaleThreshold
      ) {
        // Schedule a redraw on next frame so layers (grid) repaint immediately
        requestAnimationFrame(() => {
          if (stageRef.current) stageRef.current.batchDraw();
        });
        return newViewport;
      }
      return prev;
    });
  }, [stageRef]);

  return { viewport, updateViewport };
};
