"use client";
import React, { useState, useEffect, useRef } from "react";
import { Stage, Layer, Line, Circle } from "react-konva";
import type { KonvaEventObject } from "konva/lib/Node";
import { CircuitElement, Wire } from "@/circuit_canvas/types/circuit";
import RenderElement from "@/circuit_canvas/components/core/RenderElement";
import { DebugBox } from "@/common/components/debugger/DebugBox";
import createElement from "@/circuit_canvas/utils/createElement";
import solveCircuit from "@/circuit_canvas/utils/kirchhoffSolver";
import PropertiesPanel from "@/circuit_canvas/components/core/PropertiesPanel";
import { getCircuitById } from "@/circuit_canvas/utils/circuitStorage";
import Konva from "konva";
import styles from "@/circuit_canvas/styles/CircuitCanvas.module.css";
import CircuitStorage from "@/circuit_canvas/components/core/CircuitStorage";
import useCircuitShortcuts from "@/circuit_canvas/hooks/useCircuitShortcuts";
import { getAbsoluteNodePosition } from "@/circuit_canvas/utils/rotationUtils";
import {
  getCircuitShortcuts,
  getShortcutMetadata,
} from "@/circuit_canvas/utils/circuitShortcuts";
import { SimulatorProxy as Simulator } from "@/python_code_editor/lib/SimulatorProxy";
import CircuitSelector from "@/circuit_canvas/components/toolbar/panels/Palette";
import {
  FaArrowRight,
  FaCode,
  FaPlay,
  FaStop,
  FaRotateRight,
  FaRotateLeft,
} from "react-icons/fa6";
import { FaUndo, FaRedo } from "react-icons/fa";
import { VscDebug } from "react-icons/vsc";
import Loader from "@/circuit_canvas/utils/loadingCircuit";
import {
  ColorPaletteDropdown,
  defaultColors,
} from "@/circuit_canvas/components/toolbar/customization/ColorPallete";
import UnifiedEditor from "@/blockly_editor/components/UnifiedEditor";
import { useViewport } from "@/circuit_canvas/hooks/useViewport";
import HighPerformanceGrid from "./HighPerformanceGrid";
import ElementRotationButtons from "../toolbar/customization/ElementRoationButtons";
import { useMessage } from "@/common/components/ui/GenericMessagePopup";
import { useWireManagement } from "@/circuit_canvas/hooks/useWireManagement";
import { useCircuitHistory } from "@/circuit_canvas/hooks/useCircuitHistory";

export default function CircuitCanvas() {
  const [mousePos, setMousePos] = useState<{ x: number; y: number }>({
    x: 0,
    y: 0,
  });
  const [canvasOffset, setCanvasOffset] = useState({ x: 0, y: 0 });
  const [draggingElement, setDraggingElement] = useState<string | null>(null);
  const [activeControllerId, setActiveControllerId] = useState<string | null>(
    null
  );
  const [openCodeEditor, setOpenCodeEditor] = useState(false);
  const [controllerCodeMap, setControllerCodeMap] = useState<
    Record<string, string>
  >({});

  const [controllerMap, setControllerMap] = useState<Record<string, Simulator>>(
    {}
  );

  const stageRef = useRef<Konva.Stage | null>(null);
  const wireLayerRef = useRef<Konva.Layer | null>(null);

  // Viewport tracking for grid optimization
  const { viewport, updateViewport } = useViewport(stageRef);

  const [elements, setElements] = useState<CircuitElement[]>([]);
  const [showPalette, setShowPalette] = useState(true);
  const [showDebugBox, setShowDebugBox] = useState(false);
  const elementsRef = useRef<CircuitElement[]>(elements);

  const [simulationRunning, setSimulationRunning] = useState(false);
  const simulationRunningRef = useRef(simulationRunning);
  const [hoveredWireId, setHoveredWireId] = useState<string | null>(null);
  const { showMessage } = useMessage();
  const [microbitControls, setMicrobitControls] = useState<{
    [elementId: string]: {
      pins: Record<string, number>;
      leds: boolean[][];
    };
  }>({});

  const handleMicrobitPinChange = (elementId: string, pin: number, value: number) => {
  setMicrobitControls(prev => ({
    ...prev,
    [elementId]: {
      ...prev[elementId],
      pins: {
        ...(prev[elementId]?.pins || {}),
        [`pin${pin}`]: value
      }
    }
  }));
  
  // Update the circuit simulation
  if (simulationRunning) {
    computeCircuit(wires);
  }
};

const handleMicrobitLedChange = (elementId: string, leds: boolean[][]) => {
  setMicrobitControls(prev => ({
    ...prev,
    [elementId]: {
      ...prev[elementId],
      leds
    }
  }));
  
  // Update the element's controller state
  setElements(prev => prev.map(el => 
    el.id === elementId && el.type === "microbit" 
      ? { 
          ...el, 
          controller: { 
            ...el.controller, 
            leds 
          } 
        } 
      : el
  ));
};

  useEffect(() => {
    simulationRunningRef.current = simulationRunning;
  }, [simulationRunning]);

  const [selectedElement, setSelectedElement] = useState<CircuitElement | null>(
    null
  );
  const [showPropertiesPannel, setShowPropertiesPannel] = useState(false);
  const [propertiesPanelClosing, setPropertiesPanelClosing] = useState(false);

  const tempDragPositions = useRef<{ [id: string]: { x: number; y: number } }>(
    {}
  );
  const [loadingSavedCircuit, setLoadingSavedCircuit] = useState(false);
  const [stopDisabled, setStopDisabled] = useState(false);
  const [stopTimeout, setStopTimeout] = useState(0);
  const [maxStopTimeout, setMaxStopTimeout] = useState(0);

  useEffect(() => {
    elementsRef.current = elements;
  }, [elements]);

  // (moved below where `wires` is declared)

  function getNodeById(nodeId: string) {
    return elementsRef.current
      .flatMap((e) => e.nodes)
      .find((n) => n.id === nodeId);
  }

  const getElementById = React.useCallback(
    (elementId: string): CircuitElement | null => {
      const base = elementsRef.current.find((e) => e.id === elementId);
      if (!base) return null;

      const tempPos = tempDragPositions.current[elementId];
      return tempPos ? { ...base, x: tempPos.x, y: tempPos.y } : base;
    },
    []
  );

  const getNodeParent = React.useCallback(
    (nodeId: string): CircuitElement | null => {
      const node = elementsRef.current
        .flatMap((e) => e.nodes)
        .find((n) => n.id === nodeId);
      if (!node) return null;

      return getElementById(node.parentId);
    },
    [getElementById]
  );

  // Use the history hook
  const { history, pushToHistory, initializeHistory, undo, redo, clearHistory, canUndo, canRedo, syncProperties } =
    useCircuitHistory();

  // Initialize wire management hook
  const {
    wires,
    wireCounter,
    selectedWireColor,
    creatingWireStartNode,
    creatingWireJoints,
    editingWire,
    wiresRef,
    wireRefs,
    inProgressWireRef,
    animatedCircleRef,
    setWires,
    setWireCounter,
    setSelectedWireColor,
    setCreatingWireStartNode,
    setCreatingWireJoints,
    setEditingWire,
    getWirePoints,
    updateWiresDirect,
    updateInProgressWire,
    handleNodeClick,
    handleStageClickForWire,
    handleWireEdit,
    getWireColor,
    resetWireState,
    loadWires,
    sanitizeWireIds,
  } = useWireManagement({
    elements,
    stageRef,
    wireLayerRef,
    getNodeById,
    getNodeParent,
    pushToHistorySnapshot: (els, ws) => pushToHistory(els, ws),
    stopSimulation,
  });

  // When undo/redo or any state change removes the currently selected entity,
  // fade out and close the Properties Panel gracefully.
  useEffect(() => {
    if (!showPropertiesPannel || !selectedElement) return;
    const exists = selectedElement.type === "wire"
      ? wires.some((w) => w.id === selectedElement.id)
      : elements.some((el) => el.id === selectedElement.id);
    if (!exists) {
      setPropertiesPanelClosing(true);
      const t = setTimeout(() => {
        setShowPropertiesPannel(false);
        setSelectedElement(null);
        setPropertiesPanelClosing(false);
      }, 180);
      return () => clearTimeout(t);
    }
  }, [elements, wires, selectedElement, showPropertiesPannel]);

  useEffect(() => {
    resetState();
  }, []);

  // Update viewport on mount and resize
  useEffect(() => {
    const handleResize = () => updateViewport(true);
    updateViewport(); // Initial update
    window.addEventListener("resize", handleResize);
    const handleVisibility = () => {
      if (document.visibilityState === "visible") {
        updateViewport(true);
      }
    };
    document.addEventListener("visibilitychange", handleVisibility);
    // Detect container size changes (e.g., DevTools open/close) using ResizeObserver
    let observer: ResizeObserver | null = null;
    if (stageRef.current?.container()) {
      observer = new ResizeObserver(() => {
        // queue microtask to ensure Konva has applied size changes
        Promise.resolve().then(() => updateViewport(true));
      });
      observer.observe(stageRef.current.container());
    }
    return () => {
      window.removeEventListener("resize", handleResize);
      document.removeEventListener("visibilitychange", handleVisibility);
      if (observer && stageRef.current?.container()) {
        observer.unobserve(stageRef.current.container());
      }
    };
  }, [updateViewport]);

  // Fallback: force a batchDraw on pointer enter in case browser paused canvas while DevTools open
  useEffect(() => {
    const container = stageRef.current?.container();
    if (!container) return;
    const handleEnter = () => {
      if (stageRef.current) {
        // If there was a blank region, forcing viewport recalculation ensures grid draw
        updateViewport(true);
        stageRef.current.batchDraw();
      }
    };
    container.addEventListener("pointerenter", handleEnter);
    return () => container.removeEventListener("pointerenter", handleEnter);
  }, []);

  function resetState() {
  // Reset canvas and seed history with an initial empty state
  setElements([]);
  resetWireState();
  clearHistory();
  initializeHistory([], []);
  }

  //changing the element state on element position change
  useEffect(() => {
    elementsRef.current = elements;

    // Clean up temp positions for elements that have been updated in state
    // This prevents wire jumping after drag end
    Object.keys(tempDragPositions.current).forEach((id) => {
      const element = elements.find((el) => el.id === id);
      const tempPos = tempDragPositions.current[id];
      if (
        element &&
        tempPos &&
        element.x === tempPos.x &&
        element.y === tempPos.y
      ) {
        // Element state matches temp position, safe to clear
        delete tempDragPositions.current[id];
      }
    });
  }, [elements]);

  function stopSimulation() {
    if (!simulationRunning) return;

    setSimulationRunning(false);
    setElements((prev) =>
      prev.map((el) => ({
        ...el,
        // set computed values to undefined when simulation stops
        computed: {
          current: undefined,
          voltage: undefined,
          power: undefined,
          measurement: el.computed?.measurement ?? undefined,
        },
      }))
    );
    setControllerMap((prev) => {
      Object.values(prev).forEach((sim) => sim.disposeAndReload());
      return prev; // Keep the map intact!
    });
  }

  function startSimulation() {
    setSimulationRunning(true);
    computeCircuit(wires);

    const timeoutDuration = 3000;
    setMaxStopTimeout(timeoutDuration);
    setStopTimeout(timeoutDuration);
    setStopDisabled(true);

    const interval = setInterval(() => {
      setStopTimeout((prev) => {
        if (prev <= 0) {
          clearInterval(interval);
          setStopDisabled(false);
          return 0;
        }
        return prev - 50;
      });
    }, 50);

    // Run user code for all controllers
    elements.forEach((el) => {
      if (el.type === "microbit") {
        const sim = controllerMap[el.id];
        const code = controllerCodeMap[el.id] ?? "";
        if (sim && code) {
          sim.run(code);
        }
      }
    });
  }

  useCircuitShortcuts({
    getShortcuts: () =>
      getCircuitShortcuts({
        elements,
        wires,
        selectedElement,
        setElements,
        setWires,
        setSelectedElement,
        setCreatingWireStartNode,
        setEditingWire,
        pushToHistory: () => pushToHistory(elements, wires),
        stopSimulation,
        resetState,
        getNodeParent,
        updateWiresDirect,
        setActiveControllerId,
        toggleSimulation: () => {
          if (simulationRunning) {
            stopSimulation();
          } else {
            startSimulation();
          }
        },
        undo: () =>
          undo(
            (els) => {
              // Sync refs first, then state, then immediate wire redraw
              elementsRef.current = els;
              setElements(els);
              updateWiresDirect();
            },
            (ws) => {
              setWires(ws); // custom setter keeps wiresRef in sync
              updateWiresDirect();
            },
            stopSimulation,
            () => elementsRef.current
          ),
        redo: () =>
          redo(
            (els) => {
              elementsRef.current = els;
              setElements(els);
              updateWiresDirect();
            },
            (ws) => {
              setWires(ws);
              updateWiresDirect();
            },
            stopSimulation,
            () => elementsRef.current
          ),
        isSimulationOn: simulationRunning,
      }),
    disableShortcut: openCodeEditor,
    disabledSimulationOnnOff: stopDisabled,
  });

  function handleStageMouseMove(e: KonvaEventObject<PointerEvent>) {
    const pos = e.target.getStage()?.getPointerPosition();
    if (pos) {
      // Only update React state if we're NOT creating a wire to avoid re-renders
      if (!creatingWireStartNode) {
        setMousePos(pos);
      }

      // If creating a wire, update in-progress wire directly without React re-render
      if (creatingWireStartNode) {
        updateInProgressWire(pos);
      }
    }
  }

  function handleStageClick(e: KonvaEventObject<MouseEvent>) {
    const pos = e.target.getStage()?.getPointerPosition();
    if (!pos) return;

    // If not wiring/editing and user clicked on empty canvas (Stage/Layer), clear selection
    if (!creatingWireStartNode && !editingWire) {
      const className = e.target.getClassName?.();
      const clickedEmpty = className === "Stage" || className === "Layer";
      if (clickedEmpty) {
        setSelectedElement(null);
        setShowPropertiesPannel(false);
        setActiveControllerId(null);
        return; // do not process further
      }
    }

    if (editingWire) {
      handleWireEdit(editingWire.wireId);
      return;
    }

    if (creatingWireStartNode) {
      handleStageClickForWire(pos);
    }
  }

  // Optimized drag move handler - updates wires directly without React re-render
  function handleElementDragMove(e: KonvaEventObject<DragEvent>) {
    e.cancelBubble = true;
    const id = e.target.id();
    const x = e.target.x();
    const y = e.target.y();

    tempDragPositions.current[id] = { x, y };

    // Directly update wires in Konva without triggering React re-render
    updateWiresDirect();
  }

  function computeCircuit(wiresSnapshot: Wire[]) {
    setElements((prevElements) => {
      const solved = solveCircuit(prevElements, wiresSnapshot);

      return prevElements.map((oldEl) => {
        const updated = solved.find((e) => e.id === oldEl.id);
        if (!updated) return oldEl; // If it's missing from the solved list, preserve it

        return {
          ...oldEl, // keep everything (e.g., controller state, UI stuff)
          ...updated, // overwrite any simulated data (like computed values)
          controller: oldEl.controller, // explicitly preserve controller just in case
        };
      });
    });
  }

  // handle resistance change for potentiometer
  function handleRatioChange(elementId: string, ratio: number) {
    setElements((prev) =>
      prev.map((el) =>
        el.id === elementId
          ? {
              ...el,
              properties: { ...el.properties, ratio },
            }
          : el
      )
    );
    if (simulationRunning) {
      computeCircuit(wires);
    }
  }

  function handleModeChange(elementId: string, mode: "voltage" | "current") {
    setElements((prev) =>
      prev.map((el) =>
        el.id === elementId
          ? {
              ...el,
              properties: { ...el.properties, mode },
            }
          : el
      )
    );
    if (simulationRunning) computeCircuit(wires);
  }

  async function handleDrop(e: React.DragEvent<HTMLDivElement>) {
    e.preventDefault();
    if (simulationRunning) {
      stopSimulation();
    }

    const elementData = e.dataTransfer.getData("application/element-type");
    console.log("Element data on drop:", elementData);
    if (!elementData) return;

    const element = JSON.parse(elementData);

    const stage = stageRef.current;
    if (!stage) return;

    // DOM coordinates
    const pointerX = e.clientX;
    const pointerY = e.clientY;

    // Get bounding box of canvas DOM
    const containerRect = stage.container().getBoundingClientRect();

    // Convert screen coords to stage coords
    const xOnStage = pointerX - containerRect.left;
    const yOnStage = pointerY - containerRect.top;

    // Convert to actual canvas position (account for pan & zoom)
    const scale = stage.scaleX();
    const position = stage.position();

    const canvasX = (xOnStage - position.x) / scale - 33;
    const canvasY = (yOnStage - position.y) / scale - 35;

    const newElement = createElement({
      type: element.type,
      idNumber: elements.length + 1,
      pos: { x: canvasX, y: canvasY },
      properties: element.defaultProps,
    });

    if (!newElement) return;

    // Immediately add to canvas and record history AFTER the change
    setElements((prev) => {
      const next = [...prev, newElement];
      pushToHistory(next, wires);
      return next;
    });

    // Select the newly dropped element (Tinkercad-like behavior)
    setSelectedElement(newElement);
    setShowPropertiesPannel(true);
    setActiveControllerId(null);
    if (newElement.type === "microbit") {
      setActiveControllerId(newElement.id);
    }

    if (newElement.type === "microbit") {
      // Init simulator in the background (non-blocking)
      void (async () => {
        const simulator = new Simulator({
          language: "python",
          controller: "microbit",
          onOutput: (line) => console.log(`[${newElement.id}]`, line),
          onEvent: async (event) => {
            if (event.type === "reset") {
              setElements((prev) =>
                prev.map((el) =>
                  el.id === newElement.id
                    ? {
                        ...el,
                        controller: {
                          leds: Array(5).fill(Array(5).fill(false)),
                          pins: {},
                        },
                      }
                    : el
                )
              );
            }
            if (event.type === "led-change") {
              const state = await simulator.getStates();
              const leds = state.leds;
              const pins = state.pins;
              setElements((prev) =>
                prev.map((el) =>
                  el.id === newElement.id
                    ? { ...el, controller: { leds, pins } }
                    : el
                )
              );
            }
            if (event.type === "pin-change") {
              const state = await simulator.getStates();
              const pins = state.pins;
              const leds = state.leds;
              setElements((prev) =>
                prev.map((el) =>
                  el.id === newElement.id
                    ? { ...el, controller: { leds, pins } }
                    : el
                )
              );

              if (simulationRunningRef.current) {
                //showMessage("Simulation running, computing circuit...", "info");
                computeCircuit(wiresRef.current);
              } else {
                showMessage(
                  "Simulation not running, skipping circuit computation.",
                  "info"
                );
              }
            }
          },
        });

        await simulator.initialize();
        const states = await simulator.getStates();

        // Update map and controller LED state
        setControllerMap((prev) => ({ ...prev, [newElement.id]: simulator }));
        setElements((prev) =>
          prev.map((el) =>
            el.id === newElement.id
              ? { ...el, controller: { leds: states.leds, pins: states.pins } } // Initialize controller state
              : el
          )
        );
      })();
    }
  }

  // for canvas zoom in and zoom out
  const handleWheel = (e: Konva.KonvaEventObject<WheelEvent>) => {
    e.evt.preventDefault();

    const stage = stageRef.current;
    if (!stage) return;

    const scaleBy = 1.05;
    const oldScale = stage.scaleX();
    const pointer = stage.getPointerPosition();
    if (!pointer) return;

    const direction = e.evt.deltaY > 0 ? 1 : -1;
    const newScale = direction > 0 ? oldScale / scaleBy : oldScale * scaleBy;

    if (newScale < 0.5 || newScale > 2.5) return;

    // Get the position of the pointer relative to the stage's current transform
    const mousePointTo = {
      x: (pointer.x - stage.x()) / oldScale,
      y: (pointer.y - stage.y()) / oldScale,
    };

    // Apply the new scale
    stage.scale({ x: newScale, y: newScale });

    // Calculate new position to keep pointer under cursor
    const newPos = {
      x: pointer.x - mousePointTo.x * newScale,
      y: pointer.y - mousePointTo.y * newScale,
    };

    stage.position(newPos);
    stage.batchDraw();

    // Update viewport for grid optimization
    updateViewport();
  };

  // end
  const [pulse, setPulse] = useState(1);

  useEffect(() => {
    let scale = 1;
    let direction = 1;
    let rafId: number;
    let frameCount = 0;

    const animate = () => {
      scale += direction * 0.03;
      if (scale > 1.5) direction = -1;
      if (scale < 1) direction = 1;

      frameCount++;
      if (frameCount % 5 === 0) {
        setPulse(scale); // 🔄 Update every 5 frames (~12 FPS)
      }

      rafId = requestAnimationFrame(animate);
    };

    return () => cancelAnimationFrame(rafId);
  }, []);

  // Animate the in-progress wire circle
  useEffect(() => {
    let animationFrame: number;
    let startTime: number | null = null;

    const animateCircle = (timestamp: number) => {
      if (!startTime) startTime = timestamp;
      const elapsed = timestamp - startTime;

      if (animatedCircleRef.current && creatingWireStartNode) {
        const scale = 1 + 0.2 * Math.sin(elapsed * 0.005);
        const baseScale = stageRef.current ? 1 / stageRef.current.scaleX() : 1;
        animatedCircleRef.current.scaleX(scale * baseScale);
        animatedCircleRef.current.scaleY(scale * baseScale);
      }

      animationFrame = requestAnimationFrame(animateCircle);
    };

    if (creatingWireStartNode) {
      animationFrame = requestAnimationFrame(animateCircle);
    }

    return () => {
      if (animationFrame) {
        cancelAnimationFrame(animationFrame);
      }
    };
  }, [creatingWireStartNode]);

  const handlePropertiesPannelClose = () => {
    setShowPropertiesPannel(false);
  };

  // Clear any selected wire/element when user begins creating a new wire
  useEffect(() => {
    if (creatingWireStartNode) {
      if (selectedElement) setSelectedElement(null);
      if (showPropertiesPannel) setShowPropertiesPannel(false);
    }
  }, [creatingWireStartNode]);

  const handleFlashCode = async (code: string) => {
  if (activeControllerId) {
    const element = elements.find(el => el.id === activeControllerId);
    if (element && element.type === "microbit") {
      // This would need to be implemented to communicate with the Microbit component
      // You might need to use a ref or context to access the flash method
      console.log("Flashing code to Micro:bit:", code);
    }
  }
};

  return (
    <div
      className={styles.canvasContainer}
      onDrop={handleDrop}
      onDragOver={(e) => e.preventDefault()}
    >
      {/* Debug Panel */}
      {showDebugBox && (
        <DebugBox
          data={{
            mousePos,
            canvasOffset,
            draggingElement,
            selectedElement,
            editingWire,
            elements,
            wires,
          }}
          onClose={() => setShowDebugBox(false)}
        />
      )}

      {/* Left Side: Main Canvas */}
      <div className="flex-grow h-full flex flex-col">
        {/* Toolbar */}
        <div className="w-full h-12 bg-[#F4F5F6] flex items-center px-4 space-x-4 py-2 justify-between mt-1">
          {/* Controls */}
          <div className="flex items-center gap-4">
            {/* Color Palette */}
            <ColorPaletteDropdown
              colors={defaultColors}
              selectedColor={selectedWireColor}
              onColorSelect={(color) => {
                setSelectedWireColor(color);
                const selectedId = selectedElement?.id;
                if (!selectedId) return;
                // If a wire is selected, change its color, push AFTER change
                setWires((prev) => {
                  const exists = prev.some((w) => w.id === selectedId);
                  if (!exists) return prev;
                  const next = prev.map((w) =>
                    w.id === selectedId ? { ...w, color } : w
                  );
                  // Push AFTER mutation so undo only reverts the color
                  pushToHistory(elementsRef.current, next);
                  return next;
                });
              }}
            />

            {/* Rotation Buttons */}
            <div className="flex items-center gap-1">
              <button
                onClick={() => {
                  if (!selectedElement) return;
                  setElements((prev) => {
                    const next = prev.map((el) =>
                      el.id === selectedElement.id
                        ? {
                            ...el,
                            rotation: ((el.rotation || 0) - 30 + 360) % 360,
                          }
                        : el
                    );
                    // Update ref immediately so wire math sees new rotation
                    elementsRef.current = next;
                    // Update wires instantly (no visual delay)
                    updateWiresDirect();
                    // Push AFTER the change so undo reverts only the rotation
                    pushToHistory(next, wiresRef.current);
                    return next;
                  });
                  stopSimulation();
                }}
                disabled={!selectedElement}
                className="p-1 bg-gray-200 rounded disabled:opacity-50 hover:bg-gray-300 transition-colors"
                title="Rotate Left"
              >
                <FaRotateLeft size={14} />
              </button>
              <button
                onClick={() => {
                  if (!selectedElement) return;
                  setElements((prev) => {
                    const next = prev.map((el) =>
                      el.id === selectedElement.id
                        ? { ...el, rotation: ((el.rotation || 0) + 30) % 360 }
                        : el
                    );
                    elementsRef.current = next;
                    updateWiresDirect();
                    pushToHistory(next, wiresRef.current);
                    return next;
                  });
                  stopSimulation();
                }}
                disabled={!selectedElement}
                className="p-1 bg-gray-200 rounded disabled:opacity-50 hover:bg-gray-300 transition-colors"
                title="Rotate Right"
              >
                <FaRotateRight size={14} />
              </button>
            </div>

            {/* Tooltip Group */}
            <div className="relative group">
              {/* Trigger Button */}
              <div className="w-6 h-6 flex items-center justify-center shadow-lg bg-gray-200 rounded-full cursor-pointer hover:shadow-blue-400 hover:scale-105 transition">
                ?
              </div>

              {/* Tooltip Box */}
              <div className="absolute backdrop-blur-sm bg-white/10 bg-clip-padding border border-gray-300 shadow-2xl rounded-xl text-sm top-full left-0 mt-2 w-[300px] z-50 p-3 opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none group-hover:pointer-events-auto">
                <div className="font-semibold text-sm mb-2 text-gray-800">
                  Keyboard Shortcuts
                </div>
                <table className="w-full text-sm border-separate border-spacing-y-1">
                  <thead>
                    <tr>
                      <th className="text-left w-32 font-medium text-gray-700">
                        Keybind
                      </th>
                      <th className="text-left font-medium text-gray-700">
                        Action
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {getShortcutMetadata().map((s) => (
                      <tr key={s.name}>
                        <td className="py-1 pr-4 align-top">
                          {s.keys.map((k, i) => (
                            <React.Fragment key={`${s.name}-key-${k}`}>
                              <kbd className="inline-block bg-gray-100 text-gray-800 px-2 py-1 rounded border border-gray-300 text-xs font-mono">
                                {k}
                              </kbd>
                              {i < s.keys.length - 1 && (
                                <span className="mx-1">+</span>
                              )}
                            </React.Fragment>
                          ))}
                        </td>
                        <td className="py-1 align-middle">{s.description}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          <div className="flex flex-row items-center gap-2">
            <div className="relative">
              <button
                className={`rounded-sm border-2 border-gray-300 shadow-lg text-black px-1 py-1 text-sm cursor-pointer ${
                  simulationRunning
                    ? "bg-red-300 hover:shadow-red-600"
                    : "bg-emerald-300 hover:shadow-emerald-600"
                } flex items-center space-x-2 hover:scale-105 ${
                  stopDisabled ? "opacity-50 cursor-not-allowed" : ""
                } relative z-10`}
                onClick={() =>
                  simulationRunning ? stopSimulation() : startSimulation()
                }
                disabled={stopDisabled && simulationRunning}
              >
                {simulationRunning ? (
                  <>
                    <FaStop />
                    <span>Stop Simulation</span>
                  </>
                ) : (
                  <>
                    <FaPlay />
                    <span>Start Simulation</span>
                  </>
                )}
              </button>

              {/* Progress bar overlay */}
              {simulationRunning && stopDisabled && (
                <div
                  className="absolute top-0 left-0 h-full bg-red-400 opacity-50 rounded-sm transition-all duration-50 z-0"
                  style={{
                    width: `${(stopTimeout / maxStopTimeout) * 100}%`,
                    transition: "width 50ms linear",
                  }}
                />
              )}
            </div>

            <button
              onClick={() => setOpenCodeEditor((prev) => !prev)}
              className="px-1 py-1 bg-[#F4F5F6] rounded-sm border-2 border-gray-300 shadow-lg text-black text-sm cursor-pointer flex flex-row gap-2 items-center justify-center hover:shadow-blue-400 hover:scale-105"
            >
              <FaCode />
              <span>Code</span>
            </button>

            <button
              onClick={() => setShowDebugBox((prev) => !prev)}
              className="px-1 py-1 bg-[#F4F5F6] rounded-sm border-2 border-gray-300 shadow-lg text-black text-sm cursor-pointer flex flex-row gap-2 items-center justify-center hover:shadow-blue-400 hover:scale-105"
            >
              <VscDebug />
              <span>Debugger</span>
            </button>

            <CircuitStorage
              onCircuitSelect={(circuitId) => {
                const data = getCircuitById(circuitId);
                if (!data) return;
                pushToHistory(elements, wires);
                resetState();
                setLoadingSavedCircuit(true);
                setElements(data.elements);
                loadWires(data.wires);
                setTimeout(() => {
                  const pos = stageRef.current?.getPointerPosition();
                  if (pos) setMousePos(pos);
                }, 0);
                setTimeout(() => {
                  setLoadingSavedCircuit(false);
                }, 500);
              }}
              currentElements={elements}
              currentWires={wires}
              getSnapshot={() => stageRef.current?.toDataURL() || ""}
            />
          </div>
        </div>
        {selectedElement && showPropertiesPannel ? (
          <div
            className={`absolute top-2 me-73 mt-12 right-3 z-40 rounded-xl border border-gray-300 w-[240px] max-h-[90%] overflow-y-auto backdrop-blur-sm bg-white/10 shadow-2xl transition-all duration-200 ${
              propertiesPanelClosing
                ? "opacity-0 translate-y-1"
                : "opacity-100 translate-y-0"
            }`}
          >
            <div className="p-1">
              <div className="flex items-center justify-start px-3 py-2 border-b border-gray-200">
                <button
                  onClick={handlePropertiesPannelClose}
                  className="w-3 h-3 rounded-full bg-red-500 hover:bg-red-600 transition-all duration-150"
                  title="Close"
                />
              </div>
              <PropertiesPanel
                selectedElement={selectedElement}
                wires={wires}
                getNodeById={getNodeById}
                onElementEdit={(updatedElement, deleteElement) => {
                  if (deleteElement) {
                    // Record deletion so it can be undone
                    pushToHistory(elements, wiresRef.current);
                    const updatedWires = wires.filter(
                      (w) =>
                        getNodeParent(w.fromNodeId)?.id !== updatedElement.id &&
                        getNodeParent(w.toNodeId)?.id !== updatedElement.id
                    );
                    setWires(updatedWires);
                    setElements((prev) =>
                      prev.filter((el) => el.id !== updatedElement.id)
                    );
                    setSelectedElement(null);
                    setCreatingWireStartNode(null);
                    setEditingWire(null);
                    stopSimulation();
                  } else {
                    // Property edits should NOT affect history; apply without push
                    setElements((prev) => {
                      const next = prev.map((el) =>
                        el.id === updatedElement.id
                          ? { ...el, ...updatedElement, x: el.x, y: el.y }
                          : el
                      );
                      // Keep property cache in sync so undo/redo retains these values
                      syncProperties(next);
                      elementsRef.current = next;
                      updateWiresDirect();
                      return next;
                    });
                    stopSimulation();
                    setSelectedElement(updatedElement);
                    setCreatingWireStartNode(null);
                  }
                }}
                onWireEdit={(updatedWire, deleteElement) => {
                  if (deleteElement) {
                    setWires((prev) => {
                      const next = prev.filter((w) => w.id !== updatedWire.id);
                      // Push AFTER delete for single-step undo
                      pushToHistory(elements, next);
                      return next;
                    });
                    setSelectedElement(null);
                    setCreatingWireStartNode(null);
                    setEditingWire(null);
                    stopSimulation();
                  } else {
                    setWires((prev) => {
                      const next = prev.map((w) =>
                        w.id === updatedWire.id ? { ...w, ...updatedWire } : w
                      );
                      // Push AFTER edit
                      pushToHistory(elements, next);
                      return next;
                    });
                    stopSimulation();
                    setSelectedElement(null);
                    setEditingWire(null);
                  }
                }}
                onEditWireSelect={(wire) => {
                  setSelectedElement({
                    id: wire.id,
                    type: "wire",
                    x: 0,
                    y: 0,
                    nodes: [],
                  });
                }}
                setOpenCodeEditor={setOpenCodeEditor}
                wireColor={
                  wires.find((w) => w.id === selectedElement.id)?.color
                }
              />
            </div>
          </div>
        ) : null}

        <div className="relative w-full flex-1 h-[460px] p-1 overflow-hidden">
          {/* Stage Canvas */}
          {loadingSavedCircuit ? (
            <Loader />
          ) : (
            <Stage
              id="canvas-stage"
              width={window.innerWidth}
              height={window.innerHeight - 48}
              onMouseMove={handleStageMouseMove}
              onClick={handleStageClick}
              ref={stageRef}
              x={canvasOffset.x}
              y={canvasOffset.y}
              onDragMove={(e) => {
                if (draggingElement !== null) return;
                const stage = e.target;
                setCanvasOffset({ x: stage.x(), y: stage.y() });
                updateViewport();
              }}
              draggable={draggingElement == null}
              onWheel={handleWheel}
            >
              <HighPerformanceGrid viewport={viewport} gridSize={25} />
              <Layer ref={wireLayerRef}>
                {wires.map((wire) => {
                  const points = getWirePoints(wire);
                  if (points.length === 4) {
                    const [x1, y1, x2, y2] = points;
                    const midX = (x1 + x2) / 2;
                    const midY = (y1 + y2) / 2;
                    points.splice(2, 0, midX, midY);
                  }
                  const isSelected = selectedElement?.id === wire.id;
                  const isHovered =
                    !simulationRunning &&
                    !creatingWireStartNode &&
                    hoveredWireId === wire.id &&
                    !(selectedElement?.id === wire.id);
                  const baseColor = getWireColor(wire) || "black";

                  return [
                    isHovered && (
                      <Line
                        key={`hover-outline-${wire.id}`}
                        points={points}
                        stroke={baseColor}
                        strokeWidth={isSelected ? 7 : 6}
                        lineCap="round"
                        lineJoin="round"
                        tension={0.1}
                        bezier
                        opacity={0.18}
                        shadowColor={baseColor}
                        shadowBlur={10}
                        shadowOpacity={0.6}
                        shadowEnabled
                        listening={false}
                      />
                    ),
                    <Line
                      key={wire.id}
                      ref={(ref) => {
                        if (ref) {
                          wireRefs.current[wire.id] = ref;
                        } else {
                          delete wireRefs.current[wire.id];
                        }
                      }}
                      points={points}
                      stroke={baseColor}
                      strokeWidth={isSelected ? 4 : 3}
                      hitStrokeWidth={18}
                      tension={0.1}
                      lineCap="round"
                      lineJoin="round"
                      bezier
                      shadowColor={isSelected ? "blue" : baseColor}
                      shadowEnabled
                      shadowBlur={isSelected ? 5 : 2}
                      shadowOpacity={isSelected ? 0.9 : 0.25}
                      opacity={0.95}
                      onClick={() => {
                        setSelectedElement({
                          id: wire.id,
                          type: "wire",
                          x: 0,
                          y: 0,
                          nodes: [],
                        });
                        setShowPropertiesPannel(true);
                      }}
                      onMouseEnter={() => {
                        if (!simulationRunning) setHoveredWireId(wire.id);
                      }}
                      onMouseLeave={() => {
                        if (hoveredWireId === wire.id) setHoveredWireId(null);
                      }}
                    />,
                  ];
                })}

                <Circle
                  ref={(ref) => {
                    animatedCircleRef.current = ref;
                  }}
                  x={0}
                  y={0}
                  radius={5}
                  fill="yellow"
                  shadowColor="yellow"
                  shadowOpacity={2}
                  shadowForStrokeEnabled={true}
                  stroke="orange"
                  strokeWidth={3}
                  opacity={1}
                  visible={!!creatingWireStartNode}
                  shadowBlur={15}
                  shadowEnabled={true}
                  shadowOffset={{ x: 2, y: 2 }}
                />
                <Line
                  ref={(ref) => {
                    inProgressWireRef.current = ref;
                  }}
                  points={(function () {
                    if (!creatingWireStartNode) return [] as number[];
                    const startNode = getNodeById(creatingWireStartNode);
                    const startParent = startNode
                      ? getNodeParent(startNode.id)
                      : null;
                    if (!startNode || !startParent) return [] as number[];
                    const startPos = getAbsoluteNodePosition(
                      startNode,
                      startParent
                    );
                    const jointPoints = creatingWireJoints.flatMap((p) => [
                      p.x,
                      p.y,
                    ]);
                    return [startPos.x, startPos.y, ...jointPoints];
                  })()}
                  stroke="blue"
                  strokeWidth={2}
                  pointerEvents="none"
                  lineCap="round"
                  lineJoin="round"
                  dash={[3, 3]}
                  shadowColor="blue"
                  shadowBlur={4}
                  shadowOpacity={0.4}
                  visible={!!creatingWireStartNode}
                />
              </Layer>

              <Layer>
                {elements.map((element) => (
                  <RenderElement
                    key={element.id}
                    isSimulationOn={simulationRunning}
                    element={element}
                    wires={wires}
                    elements={elements}
                    onDragMove={handleElementDragMove}
                    handleNodeClick={handleNodeClick}
                    handleRatioChange={handleRatioChange}
                    handleModeChange={handleModeChange}
                    onDragStart={() => {
                      pushToHistory(elements, wires);
                      setDraggingElement(element.id);
                      stageRef.current?.draggable(false);
                      // Select element on drag start (Tinkercad-like behavior)
                      if (!creatingWireStartNode) {
                        const current = getElementById(element.id) || element;
                        setSelectedElement(current);
                        setShowPropertiesPannel(true);
                        setActiveControllerId(null);
                        if (element.type === "microbit") {
                          setActiveControllerId(element.id);
                        }
                      }
                    }}
                    onDragEnd={(e) => {
                      setDraggingElement(null);
                      stageRef.current?.draggable(true);
                      const id = e.target.id();
                      const x = e.target.x();
                      const y = e.target.y();
                      setElements((prev) => {
                        const next = prev.map((el) =>
                          el.id === id ? { ...el, x, y } : el
                        );
                        // Push snapshot AFTER move so undo returns to the prior position
                        pushToHistory(next, wires);
                        return next;
                      });
                    }}
                    onSelect={(id) => {
                      if (creatingWireStartNode) return;
                      const element = getElementById(id);
                      setSelectedElement(element ?? null);
                      setShowPropertiesPannel(true);
                      setActiveControllerId(null);
                      setOpenCodeEditor(false);
                      if (element?.type === "microbit") {
                        setActiveControllerId(element.id);
                      }
                    }}
                    selectedElementId={selectedElement?.id || null}
                    // @ts-ignore
                    onControllerInput={(elementId, input) => {
                      const sim = controllerMap[elementId];
                      if (
                        sim &&
                        (input === "A" || input === "B" || input === "AB")
                      ) {
                        sim.simulateInput(input);
                      }
                    }}
                  />
                ))}
              </Layer>
            </Stage>
          )}
        </div>
      </div>

      <div
        className={`transition-all duration-300 h-max mt-15 m-0.5 overflow-visible absolute top-0 right-0 z-30 ${
          showPalette ? "w-72" : "w-10"
        } `}
        style={{
          pointerEvents: "auto",
          // Glass effect
          background: "rgba(255, 255, 255, 0.1)", // white with 10% opacity
          backdropFilter: "blur(15px)", // blur the background behind
          WebkitBackdropFilter: "blur(15px)", // fix for Safari
          border: "0.3px solid rgba(255, 255, 255, 0.3)", // subtle white border
          boxShadow: "0 8px 32px 0 rgba(31, 38, 135, 0.37)", // soft shadow for depth
          borderRadius: "15px", // rounded corners
        }}
      >
        <button
          className={styles.toggleButton}
          style={{ left: "-0.5rem" }}
          onClick={() => setShowPalette((prev) => !prev)}
        >
          <span
            style={{
              display: "inline-block",
              transition: "transform 0.5s",
              transform: showPalette ? "rotate(0deg)" : "rotate(180deg)",
            }}
            className="flex items-center justify-center w-full h-full text-center"
          >
            <FaArrowRight />
          </span>
        </button>
        {showPalette && <CircuitSelector />}
      </div>

      {openCodeEditor && (
        <div
          className="absolute right-0 top-10 h-[460px] w-[700px] bg-white border-l border-gray-300 shadow-xl z-50 transition-transform duration-300"
          style={{
            transform: openCodeEditor ? "translateX(0)" : "translateX(100%)",
          }}
        >
          {/* Header with close */}
          <div className="flex justify-between items-center p-2 border-b border-gray-300 bg-gray-100">
            <span className="font-semibold">Editor</span>
            <button
              className="text-sm text-gray-600 hover:text-black"
              onClick={() => setOpenCodeEditor(false)}
            >
              ✕
            </button>
          </div>

          {/* Editor */}
          <div className="flex flex-col h-full w-full">
            <div className="flex-1 overflow-hidden">
              <UnifiedEditor
                controllerCodeMap={controllerCodeMap}
                activeControllerId={activeControllerId}
                setControllerCodeMap={setControllerCodeMap}
                stopSimulation={stopSimulation}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
