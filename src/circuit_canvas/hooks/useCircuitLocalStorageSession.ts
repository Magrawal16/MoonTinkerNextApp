import { useEffect } from "react";
import type Konva from "konva";
import type { CircuitElement, Wire } from "@/circuit_canvas/types/circuit";
import { createInitialLedRuntime } from "@/circuit_canvas/utils/ledBehavior";
import { createInitialRgbLedRuntime } from "@/circuit_canvas/utils/rgbLedBehavior";

export type CircuitSessionStorageKeys = {
  elementsKey: string;
  wiresKey: string;
  codeMapKey: string;
};

function sanitizeElements(elements: CircuitElement[]) {
  return (elements || []).map((el: any) => {
    const isMicrobit = el?.type === "microbit" || el?.type === "microbitWithBreakout";
    const isLed = el?.type === "led";
    const isRgbLed = el?.type === "rgb_led";
    
    return {
      ...el,
      computed: {
        current: undefined,
        voltage: undefined,
        power: undefined,
        measurement: el?.computed?.measurement ?? undefined,
      },
      runtime: isLed
        ? { led: createInitialLedRuntime() }
        : isRgbLed
        ? createInitialRgbLedRuntime()
        : el?.runtime,
      controller: isMicrobit
        ? {
            leds: Array.from({ length: 5 }, () => Array(5).fill(0)),
            pins: {},
            logoTouched: false,
          }
        : el?.controller,
    } as CircuitElement;
  });
}

export function useHydrateCircuitFromLocalStorage(params: {
  keys: CircuitSessionStorageKeys;
  setInitializing: (v: boolean) => void;
  setElements: (next: CircuitElement[] | ((prev: CircuitElement[]) => CircuitElement[])) => void;
  setWires: (next: Wire[] | ((prev: Wire[]) => Wire[])) => void;
  initializeHistory: (els: CircuitElement[], ws: Wire[]) => void;
  setHydratedFromStorage: (v: boolean) => void;
  setControllerCodeMap: (next: Record<string, string> | ((prev: Record<string, string>) => Record<string, string>)) => void;
  resetState: () => void;
}) {
  const {
    keys,
    setInitializing,
    setElements,
    setWires,
    initializeHistory,
    setHydratedFromStorage,
    setControllerCodeMap,
    resetState,
  } = params;

  useEffect(() => {
    try {
      const elsRaw = typeof window !== "undefined" ? window.localStorage.getItem(keys.elementsKey) : null;
      const wiresRaw = typeof window !== "undefined" ? window.localStorage.getItem(keys.wiresKey) : null;
      const codeMapRaw = typeof window !== "undefined" ? window.localStorage.getItem(keys.codeMapKey) : null;

      if (elsRaw || wiresRaw) {
        setInitializing(true);

        const savedEls: CircuitElement[] = elsRaw ? JSON.parse(elsRaw) : [];
        const sanitizedEls = sanitizeElements(savedEls || []);
        const savedWires: Wire[] = wiresRaw ? JSON.parse(wiresRaw) : [];

        setElements(sanitizedEls || []);
        setWires(savedWires || []);
        initializeHistory(sanitizedEls || [], savedWires || []);
        setHydratedFromStorage(true);

        let parsedCodeMap: Record<string, string> = {};
        if (codeMapRaw) {
          try {
            parsedCodeMap = JSON.parse(codeMapRaw) as Record<string, string>;
          } catch {
            parsedCodeMap = {};
          }
        }

        const needReconstruct = sanitizedEls
          .filter(
            (el) =>
              (el.type === "microbit" || el.type === "microbitWithBreakout") &&
              !parsedCodeMap[el.id]
          )
          .map((el) => el.id);

        if (needReconstruct.length) {
          Promise.resolve().then(async () => {
            try {
              const BlocklyMod = await import("blockly");
              const Blockly = (BlocklyMod as any).default || BlocklyMod;
              const { pythonGenerator } = await import("blockly/python");

              try {
                const { BlocklyPythonIntegration } = await import(
                  "@/blockly_editor/utils/blocklyPythonConvertor"
                );
                BlocklyPythonIntegration.initialize();
                BlocklyPythonIntegration.setupPythonGenerators(pythonGenerator as any);
              } catch (regErr) {
                console.warn(
                  "⚠️ Failed to initialize Blockly shared blocks for reconstruction:",
                  regErr
                );
              }

              const centralizedXmlRaw =
                typeof window !== "undefined"
                  ? window.localStorage.getItem("moontinker_controllerXmlMap")
                  : null;
              let centralizedXmlMap: Record<string, string> = {};
              if (centralizedXmlRaw) {
                try {
                  centralizedXmlMap = JSON.parse(centralizedXmlRaw);
                } catch {
                  // ignore
                }
              }

              const recovered: Record<string, string> = {};
              needReconstruct.forEach((id) => {
                try {
                  let xml = centralizedXmlMap[id];

                  if (!xml && typeof window !== "undefined") {
                    xml = window.localStorage.getItem(`mt_workspace_${id}`) || "";
                  }

                  if (!xml) return;

                  const tempWs = new Blockly.Workspace();
                  try {
                    const dom = new DOMParser().parseFromString(xml, "text/xml");
                    (Blockly.Xml as any).domToWorkspace(dom.documentElement, tempWs);
                    const code = (pythonGenerator as any).workspaceToCode(tempWs) as string;
                    if (code && code.trim()) recovered[id] = code;
                  } finally {
                    tempWs.dispose();
                  }
                } catch {
                  // ignore per-controller failure
                }
              });

              if (Object.keys(recovered).length) {
                parsedCodeMap = { ...parsedCodeMap, ...recovered };
              }

              setControllerCodeMap(parsedCodeMap);
            } catch (e) {
              console.warn("⚠️ Failed proactive code reconstruction during hydration:", e);
              setControllerCodeMap(parsedCodeMap);
            }
          });
        } else {
          setControllerCodeMap(parsedCodeMap);
        }

        return;
      }
    } catch (e) {
      console.warn("⚠️ Failed to load saved circuit from localStorage:", e);
    }

    resetState();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
}

export function useHydrationRedraw(params: {
  hydratedFromStorage: boolean;
  setHydratedFromStorage: (v: boolean) => void;
  stageRef: React.RefObject<Konva.Stage | null>;
  wireLayerRef: React.RefObject<Konva.Layer | null>;
  updateWiresDirect: () => void;
  updateViewport: (force?: boolean) => void;
}) {
  const {
    hydratedFromStorage,
    setHydratedFromStorage,
    stageRef,
    wireLayerRef,
    updateWiresDirect,
    updateViewport,
  } = params;

  useEffect(() => {
    if (!hydratedFromStorage) return;

    let cancelled = false;
    let attempts = 0;

    const tryRedraw = () => {
      if (cancelled) return;

      const stage = stageRef.current;
      const wireLayer = wireLayerRef.current;

      if (stage && wireLayer) {
        requestAnimationFrame(() => {
          if (cancelled) return;

          try {
            updateWiresDirect();
            wireLayer.batchDraw();
            stage.batchDraw();
            updateViewport(true);
          } finally {
            setHydratedFromStorage(false);
          }
        });
      } else if (attempts < 20) {
        attempts += 1;
        setTimeout(tryRedraw, 25);
      } else {
        setHydratedFromStorage(false);
      }
    };

    tryRedraw();
    return () => {
      cancelled = true;
    };
  }, [
    hydratedFromStorage,
    setHydratedFromStorage,
    stageRef,
    wireLayerRef,
    updateViewport,
    updateWiresDirect,
  ]);
}

export function usePersistCircuitSessionToLocalStorage(params: {
  keys: CircuitSessionStorageKeys;
  elements: CircuitElement[];
  wires: Wire[];
  elementsRef: React.RefObject<CircuitElement[]>;
  wiresRef: React.RefObject<Wire[]>;
  controllerCodeMap: Record<string, string>;
}) {
  const { keys, elements, wires, elementsRef, wiresRef, controllerCodeMap } = params;

  useEffect(() => {
    const t = setTimeout(() => {
      try {
        if (typeof window !== "undefined") {
          const sanitized = sanitizeElements(elementsRef.current || []);
          window.localStorage.setItem(keys.elementsKey, JSON.stringify(sanitized));
          window.localStorage.setItem(keys.wiresKey, JSON.stringify(wiresRef.current || []));
        }
      } catch (e) {
        console.warn("⚠️ Failed to save circuit to localStorage:", e);
      }
    }, 250);

    return () => clearTimeout(t);
  }, [elements, wires, elementsRef, wiresRef, keys.elementsKey, keys.wiresKey]);

  useEffect(() => {
    try {
      if (typeof window !== "undefined") {
        window.localStorage.setItem(keys.codeMapKey, JSON.stringify(controllerCodeMap));
      }
    } catch (e) {
      console.warn("⚠️ Failed to persist controller code map:", e);
    }
  }, [controllerCodeMap, keys.codeMapKey]);
}
