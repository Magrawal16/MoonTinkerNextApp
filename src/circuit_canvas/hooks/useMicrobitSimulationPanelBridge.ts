import { useCallback, useEffect, useRef } from "react";
import Konva from "konva";
import { SimulatorProxy as Simulator } from "@/python_code_editor/lib/SimulatorProxy";

export type PanelPosition = { left: number; top: number; scale: number };

export function useMicrobitSimulationPanelBridge(
  controllerMap: Record<string, Simulator>
) {
  const controllerMapRef = useRef<Record<string, Simulator>>({});
  useEffect(() => {
    controllerMapRef.current = controllerMap;
  }, [controllerMap]);

  const microbitNodeMapRef = useRef<Record<string, Konva.Group>>({});

  const onMicrobitNode = useCallback((id: string, node: Konva.Group | null) => {
    if (node) {
      microbitNodeMapRef.current[id] = node;
    } else {
      delete microbitNodeMapRef.current[id];
    }
  }, []);

  const getPosition = useCallback((id: string): PanelPosition | null => {
    const microbitNode = microbitNodeMapRef.current[id];
    if (!microbitNode) return null;

    try {
      const stage = microbitNode.getStage();
      if (!stage) return null;

      const container = stage.container();
      if (!container) return null;

      // Important: do NOT use `relativeTo: stage` here.
      // We want the node's rect in the stage/container pixel coordinate space *including*
      // pan/zoom transforms so the overlay follows during drag, pan, and zoom.
      const rect = microbitNode.getClientRect({ skipShadow: true, skipStroke: true });
      const stageBox = container.getBoundingClientRect();

      const stageScale = stage.scaleX() || 1;
      const panelWidthPx = 256; // Tailwind `w-64`
      const gapPx = 14;

      return {
        // Center under the board; include zoom scale since the panel itself scales.
        left: stageBox.left + rect.x + rect.width / 2 - (panelWidthPx * stageScale) / 2,
        // Keep the gap visually consistent with board scale
        top: stageBox.top + rect.y + rect.height + gapPx * stageScale,
        scale: stageScale,
      };
    } catch {
      return null;
    }
  }, []);

  const setTemperature = useCallback((id: string, value: number) => {
    const simulator = controllerMapRef.current[id];
    if (!simulator) return;
    try {
      void simulator.setTemperature(value).catch(() => {});
    } catch {
      // ignore
    }
  }, []);

  const setLightLevel = useCallback((id: string, value: number) => {
    const simulator = controllerMapRef.current[id];
    if (!simulator) return;
    try {
      void simulator.setLightLevel(value).catch(() => {});
    } catch {
      // ignore
    }
  }, []);

  const triggerGesture = useCallback((id: string, gesture: string) => {
    const simulator = controllerMapRef.current[id];
    if (!simulator) return;
    try {
      void simulator.triggerGesture(gesture).catch(() => {});
    } catch {
      // ignore
    }
  }, []);

  return {
    microbitNodeMapRef,
    onMicrobitNode,
    getPosition,
    setTemperature,
    setLightLevel,
    triggerGesture,
  };
}
