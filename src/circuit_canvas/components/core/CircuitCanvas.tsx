"use client";
import React, { useState, useEffect, useRef, useCallback } from "react";
import { Stage, Layer, Line, Rect, Star, Circle } from "react-konva";
import type { KonvaEventObject } from "konva/lib/Node";
import { CircuitElement, EditingWire, Wire } from '@/circuit_canvas/types/circuit';
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
import {
  getCircuitShortcuts,
  getShortcutMetadata,
} from "@/circuit_canvas/utils/circuitShortcuts";
// import { Simulator } from "@/lib/code/Simulator";
import { SimulatorProxy as Simulator } from "@/python_code_editor/lib/SimulatorProxy";
import CircuitSelector from "@/circuit_canvas/components/toolbar/panels/Palette";
import { FaArrowRight, FaCode, FaPlay, FaStop } from "react-icons/fa6";
import { VscDebug } from "react-icons/vsc";
import CodeEditor from "@/python_code_editor/components/CodeEditor";
import Loader from "@/common/utils/loader";
import InfiniteGrid from "@/circuit_canvas/components/core/InfiniteGrid";
import AnimatedCircle from "@/circuit_canvas/components/core/AnimatedCircle";
import {
  ColorPaletteDropdown,
  defaultColors,
} from "@/circuit_canvas/components/toolbar/customization/ColorPallete";

export default function CircuitCanvasOptimized() {
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

  const [selectedWireColor, setSelectedWireColor] = useState<string>("#000000");

  const stageRef = useRef<Konva.Stage | null>(null);
  const wireLayerRef = useRef<Konva.Layer | null>(null);

  // Store refs to wire Line components for direct updates
  const wireRefs = useRef<Record<string, Konva.Line>>({});

  // Ref for the in-progress wire during creation
  const inProgressWireRef = useRef<Konva.Line | null>(null);
  const animatedCircleRef = useRef<Konva.Circle | null>(null);

  const [elements, setElements] = useState<CircuitElement[]>([]);
  const [wires, setWires] = useState<Wire[]>([]);
  const [wireCounter, setWireCounter] = useState(0);
  const [showPalette, setShowPalette] = useState(true);
  const [showDebugBox, setShowDebugBox] = useState(false);
  const elementsRef = useRef<CircuitElement[]>(elements);
  const [creatingWireJoints, setCreatingWireJoints] = useState<
    { x: number; y: number }[]
  >([]);
  // @ts-ignore
  const [history, setHistory] = useState<
    { elements: CircuitElement[]; wires: Wire[] }[]
  >([]);
  const [simulationRunning, setSimulationRunning] = useState(false);
  const [selectedElement, setSelectedElement] = useState<CircuitElement | null>(
    null
  );
  const [creatingWireStartNode, setCreatingWireStartNode] = useState<
    string | null
  >(null);
  const [editingWire, setEditingWire] = useState<EditingWire | null>(null);
  const tempDragPositions = useRef<{ [id: string]: { x: number; y: number } }>(
    {}
  );
  const [loadingSavedCircuit, setLoadingSavedCircuit] = useState(false);

  useEffect(() => {
    elementsRef.current = elements;
  }, [elements]);

  useEffect(() => {
    resetState();
  }, []);

  function resetState() {
    pushToHistory();
    setElements([]);
    setWires([]);
    setWireCounter(0);
    setCreatingWireStartNode(null);
    setEditingWire(null);
    // Clear wire refs
    wireRefs.current = {};
    // Hide in-progress wire components
    if (inProgressWireRef.current) {
      inProgressWireRef.current.visible(false);
    }
    if (animatedCircleRef.current) {
      animatedCircleRef.current.visible(false);
    }
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
  //end

  useEffect(() => {
    if (!creatingWireStartNode) {
      setCreatingWireJoints([]);
      if (inProgressWireRef.current) {
        inProgressWireRef.current.visible(false);
      }
      if (animatedCircleRef.current) {
        animatedCircleRef.current.visible(false);
      }
    }
  }, [creatingWireStartNode]);

  function stopSimulation() {
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

  function pushToHistory() {
    setHistory((prev) => {
      const next = [
        ...prev,
        {
          elements: JSON.parse(JSON.stringify(elements)),
          wires: JSON.parse(JSON.stringify(wires)),
        },
      ];

      return next.length > 50 ? next.slice(1) : next;
    });
  }

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

  // Optimized function to calculate wire points
  const getWirePoints = useCallback(
    (wire: Wire): number[] => {
      const fromNode = getNodeById(wire.fromNodeId);
      const toNode = getNodeById(wire.toNodeId);
      if (!fromNode || !toNode) return [];

      const fromParent = getNodeParent(fromNode.id);
      const toParent = getNodeParent(toNode.id);

      const start = {
        x: fromNode.x + (fromParent?.x ?? 0),
        y: fromNode.y + (fromParent?.y ?? 0),
      };

      const end = {
        x: toNode.x + (toParent?.x ?? 0),
        y: toNode.y + (toParent?.y ?? 0),
      };

      // Include joints between start and end
      const jointPoints = wire.joints.flatMap((pt) => [pt.x, pt.y]);

      return [start.x, start.y, ...jointPoints, end.x, end.y];
    },
    [getNodeParent]
  );

  // Optimized function to update wires directly in Konva
  const updateWiresDirect = useCallback(() => {
    wires.forEach((wire) => {
      const wireLineRef = wireRefs.current[wire.id];
      if (wireLineRef) {
        const newPoints = getWirePoints(wire);
        // Apply the same midpoint logic as in JSX rendering
        if (newPoints.length === 4) {
          const [x1, y1, x2, y2] = newPoints;
          const midX = (x1 + x2) / 2;
          const midY = (y1 + y2) / 2;
          newPoints.splice(2, 0, midX, midY);
        }
        wireLineRef.points(newPoints);
      }
    });

    // Batch the layer redraw for performance
    if (wireLayerRef.current) {
      wireLayerRef.current.batchDraw();
    }
  }, [wires, getWirePoints]);

  // Optimized function to update in-progress wire during creation
  const updateInProgressWire = useCallback(
    (mousePos: { x: number; y: number }) => {
      if (!creatingWireStartNode || !stageRef.current) return;

      const startNode = getNodeById(creatingWireStartNode);
      if (!startNode) return;

      const startPos = {
        x: startNode.x + (getNodeParent(startNode.id)?.x ?? 0),
        y: startNode.y + (getNodeParent(startNode.id)?.y ?? 0),
      };

      const stage = stageRef.current;
      const transform = stage.getAbsoluteTransform().copy();
      transform.invert();
      const adjustedMouse = transform.point(mousePos);

      const inProgressPoints = [
        startPos.x,
        startPos.y,
        ...creatingWireJoints.flatMap((p) => [p.x, p.y]),
        adjustedMouse.x,
        adjustedMouse.y,
      ];

      // Update in-progress wire directly
      if (inProgressWireRef.current) {
        inProgressWireRef.current.points(inProgressPoints);
      }

      // Update animated circle position
      if (animatedCircleRef.current) {
        animatedCircleRef.current.x(adjustedMouse.x);
        animatedCircleRef.current.y(adjustedMouse.y);
      }

      // Batch redraw
      if (wireLayerRef.current) {
        wireLayerRef.current.batchDraw();
      }
    },
    [creatingWireStartNode, creatingWireJoints, getNodeParent]
  );

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
        pushToHistory,
        stopSimulation,
        resetState,
        getNodeParent,
        toggleSimulation: () => {
          if (simulationRunning) {
            stopSimulation();
          } else {
            startSimulation();
          }
        },
        undo: () => {
          setHistory((prev) => {
            if (prev.length === 0) return prev;
            const last = prev[prev.length - 1];
            setElements(last.elements);
            setWires(last.wires);
            stopSimulation();
            return prev.slice(0, -1);
          });
        },
      }),
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

    if (editingWire) {
      const updated = wires.filter((w) => w.id !== editingWire.wireId);
      setWires(updated);
      //computeCircuit(updated);
      stopSimulation();
      setEditingWire(null);
      return;
    }

    if (creatingWireStartNode) {
      const stage = stageRef.current;
      if (!stage || !pos) return;

      const transform = stage.getAbsoluteTransform().copy();
      transform.invert();
      const adjusted = transform.point(pos);

      setCreatingWireJoints((prev) => [
        ...prev,
        { x: adjusted.x, y: adjusted.y },
      ]);

      // Update in-progress wire to include the new joint
      updateInProgressWire(pos);
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

  function handleNodeClick(nodeId: string) {
    if (editingWire) {
      // complete wire editing logic
      pushToHistory();
      setWires((prev) =>
        prev.map((wire) =>
          wire.id === editingWire.wireId
            ? { ...wire, [editingWire.end]: nodeId }
            : wire
        )
      );
      setEditingWire(null);
      return;
    }

    // First click: set start node
    if (!creatingWireStartNode) {
      setCreatingWireStartNode(nodeId);
      setCreatingWireJoints([]);

      // Show and initialize in-progress wire components
      if (
        inProgressWireRef.current &&
        animatedCircleRef.current &&
        stageRef.current
      ) {
        const stage = stageRef.current;
        const scaleFactor = 1 / stage.scaleX();

        // Show components
        inProgressWireRef.current.visible(true);
        animatedCircleRef.current.visible(true);

        // Initialize scaling
        animatedCircleRef.current.scaleX(scaleFactor);
        animatedCircleRef.current.scaleY(scaleFactor);
        inProgressWireRef.current.strokeWidth(2 / stage.scaleX());
      }
      return;
    }

    // Clicked same node again: cancel
    if (creatingWireStartNode === nodeId) {
      setCreatingWireStartNode(null);
      setCreatingWireJoints([]);

      // Hide in-progress wire components
      if (inProgressWireRef.current) {
        inProgressWireRef.current.visible(false);
      }
      if (animatedCircleRef.current) {
        animatedCircleRef.current.visible(false);
      }
      return;
    }

    // Second click: create wire
    pushToHistory();

    const newWire: Wire = {
      id: `wire-${wireCounter}`,
      fromNodeId: creatingWireStartNode,
      toNodeId: nodeId,
      joints: creatingWireJoints,
      color: selectedWireColor,
    };

    setWires([...wires, newWire]);
    setWireCounter((c) => c + 1);
    stopSimulation();

    setCreatingWireStartNode(null);
    setCreatingWireJoints([]);

    // Hide in-progress wire components
    if (inProgressWireRef.current) {
      inProgressWireRef.current.visible(false);
    }
    if (animatedCircleRef.current) {
      animatedCircleRef.current.visible(false);
    }
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
    // stopSimulation();
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
    pushToHistory();

    const elementData = e.dataTransfer.getData("application/element-type");
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

    // Immediately add to canvas
    setElements((prev) => [...prev, newElement]);

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
                      },
                    }
                    : el
                )
              );
            }
            if (event.type === "led-change") {
              const state = await simulator.getStates();
              const leds = state.leds;
              setElements((prev) =>
                prev.map((el) =>
                  el.id === newElement.id ? { ...el, controller: { leds } } : el
                )
              );
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
              ? { ...el, controller: { leds: states.leds } }
              : el
          )
        );
      })();
    }
  }

  const getWireColor = (wire: Wire): string => {
    return wire.color || "#000000";
  };

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
        <div className="w-full h-12 bg-[#F4F5F6] flex items-center px-4 space-x-4 py-2 justify-between">
          {/* Controls */}
          <div className="flex items-center gap-4">
            <ColorPaletteDropdown
              colors={defaultColors}
              selectedColor={selectedWireColor}
              onColorSelect={(color) => {
                setSelectedWireColor(color);
                const wire = wires.find((w) => w.id === selectedElement?.id);
                if (wire) {
                  wire.color = color;
                  setWires((prev) => [...prev]);
                }
              }}
            />

            {/* Tooltip Group */}
            <div className="relative group">
              {/* Trigger Button */}
              <div className="w-6 h-6 flex items-center justify-center bg-gray-200 rounded-full cursor-pointer hover:bg-gray-300 transition">
                ?
              </div>

              {/* Tooltip Box */}
              <div className="absolute backdrop-blur-sm bg-white/10 bg-clip-padding border border-gray-300 shadow-2xl rounded-xl text-sm top-full left-0 mt-2 w-[300px] z-50 p-3  opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none group-hover:pointer-events-auto">
                <div className="font-semibold text-sm mb-2 text-gray-800">Keyboard Shortcuts</div>
                <table className="w-full text-sm border-separate border-spacing-y-1">
                  <thead>
                    <tr>
                      <th className="text-left w-32 font-medium text-gray-700">Keybind</th>
                      <th className="text-left font-medium text-gray-700">Action</th>
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
                              {i < s.keys.length - 1 && <span className="mx-1">+</span>}
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
            <button
              className={`rounded-sm border-2 border-gray-300 shadow-sm text-black px-1 py-1 text-sm cursor-pointer ${simulationRunning ? "bg-red-300" : "bg-emerald-300"} flex items-center space-x-2`}
              onClick={() => simulationRunning ? stopSimulation() : startSimulation()}
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

            <button
              onClick={() => setOpenCodeEditor((prev) => !prev)}
              className="px-1 py-1 bg-[#F4F5F6] rounded-sm border-2 border-gray-300 shadow-sm text-black text-sm cursor-pointer flex flex-row gap-2 items-center justify-center"
            >
              <FaCode />
              <span>Code</span>
            </button>

            <button
              onClick={() => setShowDebugBox((prev) => !prev)}
              className="px-1 py-1 bg-[#F4F5F6] rounded-sm border-2 border-gray-300 shadow-sm text-black text-sm cursor-pointer flex flex-row gap-2 items-center justify-center"
            >
              <VscDebug />
              <span>Debugger</span>
            </button>

            <CircuitStorage
              onCircuitSelect={(circuitId) => {
                const data = getCircuitById(circuitId);
                if (!data) return;
                pushToHistory();
                resetState();
                setLoadingSavedCircuit(true);
                setElements(data.elements);
                setWires(data.wires);
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
        {selectedElement && (
          <div className="absolute top-2 me-73 mt-12 right-3 z-40 rounded-xl border border-gray-300 w-[240px] max-h-[90%] overflow-y-auto backdrop-blur-sm bg-white/10 shadow-2xl">
            <div className="flex items-center justify-start px-3 py-2 border-b border-gray-200">
              <button
                onClick={() => setSelectedElement(null)}
                className="w-3 h-3 rounded-full bg-red-500 hover:bg-red-600 transition-all duration-150"
                title="Close"
              />
            </div>

            <div className="p-1">
              <PropertiesPanel
                selectedElement={selectedElement}
                wires={wires}
                getNodeById={getNodeById}
                onElementEdit={(updatedElement, deleteElement) => {
                  pushToHistory();
                  if (deleteElement) {
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
                    setElements((prev) =>
                      prev.map((el) =>
                        el.id === updatedElement.id
                          ? { ...el, ...updatedElement, x: el.x, y: el.y }
                          : el
                      )
                    );
                    stopSimulation();
                    setSelectedElement(updatedElement);
                    setCreatingWireStartNode(null);
                  }
                }}
                onWireEdit={(updatedWire, deleteElement) => {
                  pushToHistory();
                  if (deleteElement) {
                    setWires((prev) => prev.filter((w) => w.id !== updatedWire.id));
                    setSelectedElement(null);
                    setCreatingWireStartNode(null);
                    setEditingWire(null);
                    stopSimulation();
                  } else {
                    setWires((prev) =>
                      prev.map((w) =>
                        w.id === updatedWire.id ? { ...w, ...updatedWire } : w
                      )
                    );
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
                wireColor={wires.find((w) => w.id === selectedElement.id)?.color}
              />
            </div>
          </div>
        )}



        <div className="relative w-full flex-1 h-full p-1 overflow-hidden">
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
              }}
              draggable={draggingElement == null}
              onWheel={handleWheel}
            >
              <InfiniteGrid />
              <Layer ref={wireLayerRef}>
                {wires.map((wire) => {
                  const points = getWirePoints(wire);
                  if (points.length === 4) {
                    const [x1, y1, x2, y2] = points;
                    const midX = (x1 + x2) / 2;
                    const midY = (y1 + y2) / 2;
                    points.splice(2, 0, midX, midY);
                  }

                  return (
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
                      stroke={getWireColor(wire) || "black"}
                      strokeWidth={selectedElement?.id === wire.id ? 4 : 3.5}
                      hitStrokeWidth={16}
                      tension={0.3}
                      lineCap="round"
                      lineJoin="round"
                      bezier
                      shadowColor={
                        selectedElement?.id === wire.id ? "#f97316" : getWireColor(wire)
                      }
                      shadowBlur={selectedElement?.id === wire.id ? 8 : 2}
                      shadowOpacity={selectedElement?.id === wire.id ? 0.9 : 0.25}
                      opacity={0.95}
                      onClick={() =>
                        setSelectedElement({
                          id: wire.id,
                          type: "wire",
                          x: 0,
                          y: 0,
                          nodes: [],
                        })
                      }
                    />
                  );
                })}

                <Circle
                  ref={(ref) => {
                    animatedCircleRef.current = ref;
                  }}
                  x={0}
                  y={0}
                  radius={5}
                  fill="yellow"
                  shadowColor="red"
                  shadowBlur={10}
                  shadowOpacity={1}
                  shadowForStrokeEnabled={true}
                  stroke="orange"
                  strokeWidth={3}
                  opacity={1}
                  visible={false}
                />
                <Line
                  ref={(ref) => {
                    inProgressWireRef.current = ref;
                  }}
                  points={[]}
                  stroke="blue"
                  strokeWidth={2}
                  pointerEvents="none"
                  lineCap="round"
                  lineJoin="round"
                  dash={[3, 3]}
                  shadowColor="blue"
                  shadowBlur={4}
                  shadowOpacity={0.4}
                  visible={false}
                />
              </Layer>

              <Layer>
                {elements.map((element) => (
                  <RenderElement
                    key={element.id}
                    isSimulationOn={simulationRunning}
                    element={element}
                    onDragMove={handleElementDragMove}
                    handleNodeClick={handleNodeClick}
                    handleRatioChange={handleRatioChange}
                    handleModeChange={handleModeChange}
                    onDragStart={() => {
                      pushToHistory();
                      setDraggingElement(element.id);
                      stageRef.current?.draggable(false);
                    }}
                    onDragEnd={(e) => {
                      setDraggingElement(null);
                      stageRef.current?.draggable(true);
                      const id = e.target.id();
                      const x = e.target.x();
                      const y = e.target.y();
                      setElements((prev) =>
                        prev.map((el) => (el.id === id ? { ...el, x, y } : el))
                      );
                    }}
                    onSelect={(id) => {
                      const element = getElementById(id);
                      setSelectedElement(element ?? null);
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
                      if (sim && (input === "A" || input === "B")) {
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
        className={`transition-all duration-300 h-screen mt-12 bg-[#F4F5F6] overflow-visible absolute top-0 right-0 z-30 ${showPalette ? "w-72" : "w-10"}`}
        style={{ pointerEvents: "auto" }}
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

      {/* Code Editor */}
      {openCodeEditor && (
        <div className="absolute right-0 top-0 h-full w-[500px] bg-white border-l border-gray-300 shadow-xl z-50 transition-transform duration-300"
          style={{
            transform: openCodeEditor ? "translateX(0)" : "translateX(100%)",
          }}
        >
          <div className="flex justify-between items-center p-2 border-b border-gray-300 bg-gray-100">
            <span className="font-semibold">Code Editor</span>
            <button
              className="text-sm text-gray-600 hover:text-black"
              onClick={() => setOpenCodeEditor(false)}
            >
              ✕
            </button>
          </div>
          <div className="p-4 overflow-auto h-full">
            <CodeEditor
              code={controllerCodeMap[activeControllerId ?? ""] ?? ""}
              onChange={(newCode) => {
                if (!activeControllerId) return;
                setControllerCodeMap((prev) => ({
                  ...prev,
                  [activeControllerId]: newCode,
                }));
                stopSimulation();
              }}
            />
          </div>
        </div>
      )}
    </div>
  );

}
