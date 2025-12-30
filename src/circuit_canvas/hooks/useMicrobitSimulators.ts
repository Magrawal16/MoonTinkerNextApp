import React, { useCallback, useEffect, useRef } from "react";
import type { CircuitElement } from "@/circuit_canvas/types/circuit";
import { SimulatorProxy as Simulator } from "@/python_code_editor/lib/SimulatorProxy";

export function useMicrobitSimulators(params: {
  elements: CircuitElement[];
  controllerMap: Record<string, Simulator>;
  setControllerMap: React.Dispatch<React.SetStateAction<Record<string, Simulator>>>;
  setElements: React.Dispatch<React.SetStateAction<CircuitElement[]>>;
  simulationRunningRef: React.RefObject<boolean>;
  controllerStateCacheRef: React.RefObject<Record<string, string>>;
  initializing: boolean;
  setInitializing: (v: boolean) => void;
}) {
  const {
    elements,
    controllerMap,
    setControllerMap,
    setElements,
    simulationRunningRef,
    controllerStateCacheRef,
    initializing,
    setInitializing,
  } = params;

  // Prevent duplicated initialization work when multiple call-sites race
  // (e.g., effect-driven creation + on-drop prewarming + startSimulation ensuring).
  const inFlightInitRef = useRef<Record<string, Promise<Simulator | null>>>({});

  const createAndAttachSimulator = useCallback(
    (element: CircuitElement): Promise<Simulator | null> => {
      const existing = inFlightInitRef.current[element.id];
      if (existing) return existing;

      const promise = (async (): Promise<Simulator | null> => {
        try {
          const controllerType =
            element.type === "microbit" ? "microbit" : "microbitWithBreakout";

          const simulator = new Simulator({
            language: "python",
            controller: controllerType,
            onEvent: async (event) => {
              if (!simulationRunningRef.current && event.type !== "reset") return;

              const applyControllerState = async () => {
                const state = await simulator.getStates();
                const key = JSON.stringify({
                  leds: state.leds,
                  pins: state.pins,
                  logo: !!state.logo,
                });

                if (
                  controllerStateCacheRef.current[element.id] === key &&
                  event.type !== "reset"
                ) {
                  return;
                }

                controllerStateCacheRef.current[element.id] = key;
                React.startTransition(() => {
                  setElements((prev) =>
                    prev.map((el) =>
                      el.id === element.id
                        ? {
                            ...el,
                            controller: {
                              leds: state.leds,
                              pins: state.pins,
                              logoTouched: !!state.logo,
                            },
                          }
                        : el
                    )
                  );
                });
              };

              if (event.type === "reset") {
                controllerStateCacheRef.current[element.id] = "";
                React.startTransition(() => {
                  setElements((prev) =>
                    prev.map((el) =>
                      el.id === element.id
                        ? {
                            ...el,
                            controller: {
                              leds: Array.from({ length: 5 }, () =>
                                Array(5).fill(0)
                              ),
                              pins: {},
                              logoTouched: false,
                            },
                          }
                        : el
                    )
                  );
                });
              } else if (
                event.type === "led-change" ||
                event.type === "pin-change" ||
                event.type === "logo-touch"
              ) {
                void applyControllerState();
              }
            },
          });

          await simulator.initialize();
          const states = await simulator.getStates();

          setControllerMap((prev) => ({ ...prev, [element.id]: simulator }));
          setElements((prev) =>
            prev.map((el) =>
              el.id === element.id
                ? {
                    ...el,
                    controller: {
                      leds: states.leds,
                      pins: states.pins,
                      logoTouched: !!states.logo,
                    },
                  }
                : el
            )
          );

          return simulator;
        } catch (e) {
          console.warn(
            `⚠️ Failed to initialize simulator for ${element.id}:`,
            e
          );
          return null;
        } finally {
          delete inFlightInitRef.current[element.id];
        }
      })();

      inFlightInitRef.current[element.id] = promise;
      return promise;
    },
    [controllerStateCacheRef, setControllerMap, setElements, simulationRunningRef]
  );

  useEffect(() => {
    const microbits = elements.filter(
      (el) => el.type === "microbit" || el.type === "microbitWithBreakout"
    );

    microbits.forEach((el) => {
      if (!controllerMap[el.id]) {
        void createAndAttachSimulator(el);
      }
    });

    if (initializing) {
      if (microbits.length === 0) {
        setInitializing(false);
      } else if (microbits.every((el) => controllerMap[el.id])) {
        // Smoother dismissal than a fixed timeout:
        // - wait a couple animation frames so the browser paints
        // - then wait for idle time if available (with timeout fallback)
        let raf1 = 0;
        let raf2 = 0;
        let idleId: number | null = null;
        let timeoutId: number | null = null;
        let cancelled = false;

        const dismiss = () => {
          if (cancelled) return;
          setInitializing(false);
        };

        raf1 = window.requestAnimationFrame(() => {
          raf2 = window.requestAnimationFrame(() => {
            const ric = (window as any).requestIdleCallback as
              | ((cb: () => void, opts?: { timeout?: number }) => number)
              | undefined;
            const cic = (window as any).cancelIdleCallback as
              | ((id: number) => void)
              | undefined;

            if (ric && cic) {
              idleId = ric(dismiss, { timeout: 300 });
            } else {
              timeoutId = window.setTimeout(dismiss, 0);
            }
          });
        });

        return () => {
          cancelled = true;
          if (raf1) window.cancelAnimationFrame(raf1);
          if (raf2) window.cancelAnimationFrame(raf2);
          if (timeoutId) window.clearTimeout(timeoutId);
          const cic = (window as any).cancelIdleCallback as
            | ((id: number) => void)
            | undefined;
          if (idleId != null && cic) cic(idleId);
        };
      }
    }
  }, [
    elements,
    controllerMap,
    createAndAttachSimulator,
    initializing,
    setInitializing,
  ]);

  return { createAndAttachSimulator };
}
