"use client";
import React, { useState, useEffect, useRef } from "react";
import { Stage, Layer, Line } from "react-konva";
import type { KonvaEventObject } from "konva/lib/Node";
import { CircuitElement, EditingWire, Wire } from "@/common/types/circuit";
import RenderElement from "./RenderElement";
import { DebugBox } from "@/components/debug/DebugBox";
import createElement from "@/utils/core/createElement";
import solveCircuit from "@/utils/core/kirchoffSolver";
import PropertiesPanel from "./PropertiesPanel";
import { getCircuitById } from "../../../utils/core/circuitStorage";
import Konva from "konva";
import styles from "./CircuitCanvas.module.css";
import CircuitStorage from "./CircuitStorage";
import useCircuitShortcuts from "@/utils/hooks/useCircuitShortcuts";
import {
  getCircuitShortcuts,
  getShortcutMetadata,
} from "@/utils/core/circuitShortcuts";
import { Simulator } from "@/lib/code/Simulator";
import PopupEditor from "@/components/code/PopupEditor";
import CircuitSelector from "../toolbar/panels/Palette";

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
  const [elements, setElements] = useState<CircuitElement[]>([]);
  const [wires, setWires] = useState<Wire[]>([]);
  const [wireCounter, setWireCounter] = useState(0);
  const [showPalette, setShowPalette] = useState(true);
  const [showDebugBox, setShowDebugBox] = useState(true);
  const elementsRef = useRef<CircuitElement[]>(elements);
  const [creatingWireJoints, setCreatingWireJoints] = useState<
    { x: number; y: number }[]
  >([]);
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
  const [wireDragVersion, setWireDragVersion] = useState(0);

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
  }

  //changing the element state on element position change
  useEffect(() => {
    elementsRef.current = elements;
  }, [elements]);
  //end

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
      Object.values(prev).forEach((sim) => sim.reset());
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
    return elements.flatMap((e) => e.nodes).find((n) => n.id === nodeId);
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
    if (pos) setMousePos(pos);
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
    }
  }

  function handleElementDragMove(e: KonvaEventObject<DragEvent>) {
    e.cancelBubble = true;
    const id = e.target.id();
    const x = e.target.x();
    const y = e.target.y();

    tempDragPositions.current[id] = { x, y };

    // Trigger a light render to update wires
    setWireDragVersion((v) => v + 1); // 👈 create this state
  }

  function getWirePoints(wire: Wire): number[] {
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
      return;
    }

    // Clicked same node again: cancel
    if (creatingWireStartNode === nodeId) {
      setCreatingWireStartNode(null);
      setCreatingWireJoints([]);
      return;
    }

    // Second click: create wire
    pushToHistory();

    const newWire: Wire = {
      id: `wire-${wireCounter}`,
      fromNodeId: creatingWireStartNode,
      toNodeId: nodeId,
      joints: creatingWireJoints,
    };

    setWires([...wires, newWire]);
    setWireCounter((c) => c + 1);
    stopSimulation();

    setCreatingWireStartNode(null);
    setCreatingWireJoints([]);
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

    const stageX = e.clientX;
    const stageY = e.clientY;

    const canvasOffsetLocal = document
      .getElementById("canvas-stage") // optional: give your Stage a container ID
      ?.getBoundingClientRect();

    const canvasX =
      stageX - (canvasOffsetLocal?.left ?? 0) - (canvasOffset?.x || 0);
    const canvasY =
      stageY - (canvasOffsetLocal?.top ?? 0) - (canvasOffset?.y || 0);

    const newElement = createElement({
      type: element.type,
      idNumber: elements.length + 1,
      pos: { x: canvasX, y: canvasY },
      properties: element.defaultProps,
    });

    if (!newElement) return;

    if (newElement.type === "microbit") {
      const simulator = new Simulator({
        language: "python",
        controller: "microbit",
        onOutput: (line) => console.log(`[${newElement.id}]`, line),
        onEvent: (event) => {
          if (event.type === "led-change" || event.type === "reset") {
            const state = simulator.getStates();
            setElements((prev) =>
              prev.map((el) =>
                el.id === newElement.id
                  ? { ...el, controller: { leds: state.leds } }
                  : el
              )
            );
          }
        },
      });
      await simulator.initialize();

      setControllerMap((prev) => ({ ...prev, [newElement.id]: simulator }));
      newElement.controller = { leds: simulator.getStates().leds };
    }
    setElements((prev) => [...prev, newElement]);
  }

  const getWireColor = (wire: Wire): string => {
    const fromPolarity = getNodeById(wire.fromNodeId)?.polarity;
    const toPolarity = getNodeById(wire.toNodeId)?.polarity;

    if (fromPolarity === "negative" && toPolarity === "negative") return "red";
    if (fromPolarity === "positive" && toPolarity === "positive")
      return "green";
    return "black";
  };

  // for canvas zoom in and zoom out
  const handleWheel = (e: Konva.KonvaEventObject<WheelEvent>) => {
    e.evt.preventDefault();
    const scaleBy = 1.05;
    const stage = stageRef.current;

    // Ensure stage and pointer position exist
    if (!stage) return;

    const pointer = stage.getPointerPosition();
    if (!pointer) return; // 🔒 safeguard against undefined

    const oldScale = stage.scaleX();

    const mousePointTo = {
      x: pointer.x / oldScale - stage.x() / oldScale,
      y: pointer.y / oldScale - stage.y() / oldScale,
    };

    const direction = e.evt.deltaY > 0 ? 1 : -1;
    const newScale = direction > 0 ? oldScale / scaleBy : oldScale * scaleBy;

    if (newScale > 2.5 || newScale < 0.5) return;

    stage.scale({ x: newScale, y: newScale });

    const newPos = {
      x: -(mousePointTo.x - pointer.x / newScale) * newScale,
      y: -(mousePointTo.y - pointer.y / newScale) * newScale,
    };

    stage.position(newPos);
    stage.batchDraw();
  };
  // end

  return (
    <div
      // className="flex flex-row items-center justify-between h-screen w-screen relative"
      className={styles.canvasContainer}
      onDrop={handleDrop}
      onDragOver={(e) => e.preventDefault()}
    >
      {/* Debug Box Panel */}
      <div
        className={`${styles.panelLeft} ${showDebugBox ? styles.panelExpanded : styles.panelCollapsed
          }`}
      >
        <button
          className={styles.toggleButton}
          style={{ right: "-0.5rem" }}
          onClick={() => setShowDebugBox((prev) => !prev)}
        >
          {showDebugBox ? "⇠" : "⇢"}
        </button>
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
            className="w-full h-full p-4"
          />
        )}
      </div>

      <PopupEditor
        visible={!!activeControllerId && openCodeEditor}
        code={controllerCodeMap[activeControllerId ?? ""] ?? ""}
        onChange={(newCode) => {
          if (!activeControllerId) return;
          setControllerCodeMap((prev) => ({
            ...prev,
            [activeControllerId]: newCode,
          }));
        }}
        onClose={() => {
          setOpenCodeEditor(false);
          setSimulationRunning(false);
        }}
      />

      {/* Canvas */}
      <div className="flex-grow h-full">
        {/* absolutely position start/stop simulation button at the top center of the screen with padding */}
        <div className={styles.centerControls}>
          <button
            className={`${styles.simulationButton} ${simulationRunning ? styles.simulationStop : styles.simulationStart
              }`}
            onClick={() => {
              if (simulationRunning) {
                stopSimulation();
              } else {
                startSimulation();
              }
            }}
          >
            {simulationRunning ? "Stop Simulation" : "Start Simulation"}
          </button>
          <CircuitStorage
            onCircuitSelect={function (circuitId: string): void {
              const data = getCircuitById(circuitId);
              if (!data) return;
              pushToHistory();
              resetState();
              setElements(data.elements);
              setWires(data.wires);
            }}
            currentElements={elements}
            currentWires={wires}
            getSnapshot={() => stageRef.current?.toDataURL() || ""}
          />
          <div className={styles.tooltipWrapper}>
            <div className={styles.tooltipIcon}>?</div>
            <div className={styles.tooltipContent}>
              <div className={styles.tooltipTitle}>Keyboard Shortcuts</div>
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
        <div className={styles.stageBorders}>
          <Stage
            id="canvas-stage"
            width={
              window.innerWidth -
              (showDebugBox ? 300 : 0) -
              (showPalette ? 300 : 0) -
              (!showDebugBox && !showPalette ? 50 : 0)
            }
            height={window.innerHeight}
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
            <Layer>
              {/* Render wires */}
              {wires.map((wire) => {
                const points = getWirePoints(wire);
                if (points.length == 4) {
                  const [x1, y1, x2, y2] = points;
                  const midX = (x1 + x2) / 2;
                  const midY = (y1 + y2) / 2;
                  points.splice(2, 0, midX, midY);
                }

                return (
                  <React.Fragment key={wire.id}>
                    <Line
                      points={points}
                      stroke={
                        selectedElement?.id === wire.id
                          ? "orange"
                          : getWireColor(wire)
                      }
                      strokeWidth={selectedElement?.id === wire.id ? 6 : 4}
                      hitStrokeWidth={12}
                      tension={0.5}
                      lineCap="round"
                      lineJoin="round"
                      bezier={true}
                      onClick={() => {
                        setSelectedElement({
                          id: wire.id,
                          type: "wire",
                          x: 0,
                          y: 0,
                          nodes: [],
                        });
                      }}
                    />
                  </React.Fragment>
                );
              })}

              {/* Wire being created */}
              {creatingWireStartNode &&
                (() => {
                  const startNode = getNodeById(creatingWireStartNode);
                  if (!startNode) return null;

                  const startPos = {
                    x: startNode.x + (getNodeParent(startNode.id)?.x ?? 0),
                    y: startNode.y + (getNodeParent(startNode.id)?.y ?? 0),
                  };

                  const stage = stageRef.current;
                  if (!stage) return null;

                  const transform = stage.getAbsoluteTransform().copy();
                  transform.invert();
                  const adjustedMousePos = transform.point(mousePos);

                  const adjustedMouseX = adjustedMousePos.x;
                  const adjustedMouseY = adjustedMousePos.y;

                  const inProgressPoints: number[] = [
                    startPos.x,
                    startPos.y,
                    ...creatingWireJoints.flatMap((p) => [p.x, p.y]),
                    adjustedMouseX,
                    adjustedMouseY,
                  ];

                  return (
                    <Line
                      points={inProgressPoints}
                      stroke="black"
                      strokeWidth={2}
                      // dash={[10, 5]}
                      pointerEvents="none"
                      lineCap="round"
                      lineJoin="round"
                    />
                  );
                })()}
              {/* Circuit Elements */}
              {elements.map((element) => (
                <RenderElement
                  key={element.id}
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
                      prev.map((element) =>
                        element.id === id ? { ...element, x, y } : element
                      )
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
                  onControllerInput={(elementId, input) => {
                    const sim = controllerMap[elementId];
                    if (sim && sim.getMicrobitInstance()) {
                      const microbitInstance = sim.getMicrobitInstance();
                      if (
                        microbitInstance?.input &&
                        (input === "A" || input === "B")
                      ) {
                        microbitInstance.input._press_button(
                          input as "A" | "B"
                        );
                      }
                    }
                  }}
                />
              ))}
            </Layer>
          </Stage>
        </div>
      </div>

      {/* Palette Panel */}
      <div
        className={`${styles.panelRight} ${showPalette ? styles.panelExpanded : styles.panelCollapsed
          }`}
      >
        <button
          className={styles.toggleButton}
          style={{ left: "-0.5rem" }}
          onClick={() => setShowPalette((prev) => !prev)}
        >
          {showPalette ? "⇢" : "⇠"}
        </button>
        {showPalette && <CircuitSelector />}
        {showPalette && selectedElement && (
          <PropertiesPanel
            selectedElement={selectedElement}
            wires={wires}
            getNodeById={getNodeById}
            onElementEdit={(updatedElement, deleteElement) => {
              pushToHistory();
              if (deleteElement) {
                const updatedWires = wires.filter(
                  (wire) =>
                    getNodeParent(wire.fromNodeId)?.id !== updatedElement.id &&
                    getNodeParent(wire.toNodeId)?.id !== updatedElement.id
                );

                setWires(updatedWires);
                setElements((prev) =>
                  prev.filter((el) => el.id !== updatedElement.id)
                );
                setSelectedElement(null);
                setCreatingWireStartNode(null);
                setEditingWire(null);
                //computeCircuit(updatedWires);
                stopSimulation();
              } else {
                setElements((prev) =>
                  prev.map((el) =>
                    el.id === updatedElement.id
                      ? {
                        ...el,
                        ...updatedElement,
                        x: el.x,
                        y: el.y,
                      }
                      : el
                  )
                );

                //computeCircuit(wires);
                stopSimulation();
                setSelectedElement(updatedElement);
                setCreatingWireStartNode(null);
                setEditingWire(null);
              }
            }}
            onWireEdit={(updatedWire, deleteElement) => {
              pushToHistory();
              if (deleteElement) {
                setWires((prev) => prev.filter((w) => w.id !== updatedWire.id));
                setSelectedElement(null);
                setCreatingWireStartNode(null);
                setEditingWire(null);
                //computeCircuit(wires.filter((w) => w.id !== updatedWire.id));
                stopSimulation();
              } else {
                setWires((prev) =>
                  prev.map((w) =>
                    w.id === updatedWire.id ? { ...w, ...updatedWire } : w
                  )
                );
                //computeCircuit(wires);
                stopSimulation();
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
            setOpenCodeEditor={function (open: boolean): void {
              setOpenCodeEditor(open);
            }}
          />
        )}
      </div>
    </div>
  );
}
