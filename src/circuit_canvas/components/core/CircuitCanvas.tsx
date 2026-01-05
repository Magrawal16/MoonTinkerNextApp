import { SaveCircuit } from "@/circuit_canvas/utils/circuitStorage";
  // (autosave feature removed)
"use client";
import React, { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { Stage, Layer, Line, Circle } from "react-konva";
import type { KonvaEventObject } from "konva/lib/Node";
import { CircuitElement, Wire } from "@/circuit_canvas/types/circuit";
import RenderElement from "@/circuit_canvas/components/core/RenderElement";
import { DebugBox } from "@/common/components/debugger/DebugBox";
import createElement from "@/circuit_canvas/utils/createElement";
import solveCircuit from "@/circuit_canvas/utils/kirchhoffSolver";
import { updateLedRuntime, createInitialLedRuntime } from "@/circuit_canvas/utils/ledBehavior";
import PropertiesPanel from "@/circuit_canvas/components/core/PropertiesPanel";
import { getCircuitById } from "@/circuit_canvas/utils/circuitStorage";
import Konva from "konva";
import styles from "@/circuit_canvas/styles/CircuitCanvas.module.css";
import AuthHeader from "@/components/AuthHeader";
import CircuitStorage from "@/circuit_canvas/components/core/CircuitStorage";
import useCircuitShortcuts from "@/circuit_canvas/hooks/useCircuitShortcuts";
import { FaLink, FaDownload, FaUpload } from "react-icons/fa6";

import { getAbsoluteNodePosition } from "@/circuit_canvas/utils/rotationUtils";
import {
  getCircuitShortcuts,
  getShortcutMetadata,
} from "@/circuit_canvas/utils/circuitShortcuts";
import { SimulatorProxy as Simulator } from "@/python_code_editor/lib/SimulatorProxy";
import CircuitSelector from "@/circuit_canvas/components/toolbar/panels/Palette";
import { NotesTool } from "@/circuit_canvas/components/toolbar/NotesTool";
import {
  FaArrowRight,
  FaCode,
  FaPlay,
  FaStop,
  FaRotateRight,
  FaRotateLeft,
  FaExpand,
  FaCopy,
  FaPaste,
  FaTrash,
} from "react-icons/fa6";
import { VscDebug } from "react-icons/vsc";
import Loader from "@/circuit_canvas/utils/loadingCircuit";
import {
  ColorPaletteDropdown,
  defaultColors,
} from "@/circuit_canvas/components/toolbar/customization/ColorPallete";
import UnifiedEditor from "@/blockly_editor/components/UnifiedEditor";
import { useViewport } from "@/circuit_canvas/hooks/useViewport";
import GridLayer from "./layers/GridLayer";
import { useMessage } from "@/common/components/ui/GenericMessagePopup";
import { useWireManagement } from "@/circuit_canvas/hooks/useWireManagement";
import { useCircuitHistory } from "@/circuit_canvas/hooks/useCircuitHistory";
import Note from "@/circuit_canvas/components/elements/Note";
import { MicrobitSimulationPanel } from "../simulation/MicrobitSimulationPanel"; 
import { AnimatePresence } from "framer-motion";
import { useMicrobitSimulationPanelBridge } from "@/circuit_canvas/hooks/useMicrobitSimulationPanelBridge";
import { useSimulationTimer } from "@/circuit_canvas/hooks/useSimulationTimer";
import {
  useHydrateCircuitFromLocalStorage,
  useHydrationRedraw,
  usePersistCircuitSessionToLocalStorage,
} from "@/circuit_canvas/hooks/useCircuitLocalStorageSession";
import { useMicrobitSimulators } from "@/circuit_canvas/hooks/useMicrobitSimulators";


export default function CircuitCanvas({ importedCircuit }: { importedCircuit?: string | null }) {
  // Import modal state
  const [showImportModal, setShowImportModal] = useState(false);
  const [importInput, setImportInput] = useState("");
  const [importError, setImportError] = useState<string | null>(null);

  // LocalStorage keys for session persistence
    // Notification system
    const { showMessage } = useMessage();
  const CIRCUIT_ELEMENTS_KEY = "mt_circuit_elements";
  const CIRCUIT_WIRES_KEY = "mt_circuit_wires";
  const CODE_MAP_KEY = "mt_controller_code_map";
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
  const [codeEditorSize, setCodeEditorSize] = useState<{ width: number; height: number }>({
    width: 900,
    height: 600,
  });
  const [viewportWidth, setViewportWidth] = useState<number>(
    typeof window !== "undefined" ? window.innerWidth : 1920
  );
  const [controllerCodeMap, setControllerCodeMap] = useState<
    Record<string, string>
  >({});
  const [showNewSessionModal, setShowNewSessionModal] = useState(false);
  // Delete confirmation modal for programmable controllers (micro:bit variants)
  const [showDeleteControllerModal, setShowDeleteControllerModal] = useState(false);
  const [pendingControllerDelete, setPendingControllerDelete] = useState<CircuitElement | null>(null);

  const [controllerMap, setControllerMap] = useState<Record<string, Simulator>>(
    {}
  );

  const stageRef = useRef<Konva.Stage | null>(null);
  const wireLayerRef = useRef<Konva.Layer | null>(null);

  const {
    microbitNodeMapRef,
    onMicrobitNode: handleMicrobitNode,
    getPosition: getMicrobitPanelPosition,
    setTemperature: setMicrobitTemperature,
    setLightLevel: setMicrobitLightLevel,
    triggerGesture: triggerMicrobitGesture,
  } = useMicrobitSimulationPanelBridge(controllerMap);


  // Ref to reset UnifiedEditor during new session
  const editorResetRef = useRef<(() => void) | null>(null);

  // Viewport tracking for grid optimization
  const { viewport, updateViewport } = useViewport(stageRef);

  const [elements, setElements] = useState<CircuitElement[]>([]);
  const [showPalette, setShowPalette] = useState(true);
  const [showDebugBox, setShowDebugBox] = useState(false);
  const elementsRef = useRef<CircuitElement[]>(elements);
  // Indicates we hydrated from storage and need an initial forced redraw once Stage mounts
  const [hydratedFromStorage, setHydratedFromStorage] = useState(false);
  // Track initial loading state (hydration + simulator init) to show loading overlay
  const [initializing, setInitializing] = useState(false);

  const [simulationRunning, setSimulationRunning] = useState(false);
  const simulationRunningRef = useRef(simulationRunning);
  const simulationFrameRef = useRef<number | null>(null);
  const lastTickRef = useRef<number | null>(null);
  const { simulationTime, formatTime } = useSimulationTimer(simulationRunning);
  const [hoveredWireId, setHoveredWireId] = useState<string | null>(null);
  const [snapTarget, setSnapTarget] = useState<{ dragNodeId: string; targetNodeId: string; offset: { x: number; y: number } } | null>(null);
  const dragStartWireCountRef = useRef(0);
  const [copiedElement, setCopiedElement] = useState<CircuitElement | null>(null);
  const [notesToolActive, setNotesToolActive] = useState(false);



  // Auto-import if ?circuit= param is present or importedCircuit prop is set
  useEffect(() => {
    if (typeof window === "undefined") return;
    let encoded = null;
    const params = new URLSearchParams(window.location.search);
    if (params.get("circuit")) {
      encoded = params.get("circuit");
    } else if (importedCircuit) {
      encoded = importedCircuit;
    }
    if (encoded) {
      try {
        const json = atob(decodeURIComponent(encoded));
        const data = JSON.parse(json);
        if (data.elements && data.wires) {
          // Debug: log imported data
          console.log("[Import] Loaded circuit:", data);
          pushToHistory(data.elements, data.wires);
          resetState();
          setElements(
            data.elements.map((el: any) => {
              if ((el.type === "microbit" || el.type === "microbitWithBreakout") && !simulationRunningRef.current) {
                return {
                  ...el,
                  controller: {
                    leds: Array.from({ length: 5 }, () => Array(5).fill(0)),
                    pins: {},
                    logoTouched: false,
                  },
                };
              }
              return el;
            })
          );
          setWires(data.wires);
          if (data.controllerCodeMap) setControllerCodeMap(data.controllerCodeMap);
        } else {
          console.warn("[Import] No elements or wires in imported data", data);
        }
      } catch (e) {
        console.error("[Import] Failed to decode circuit:", e);
      }
    }
    // eslint-disable-next-line
  }, [importedCircuit]);

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
  // Progress overlay refs (avoid frequent React re-renders)
  const progressRef = useRef<HTMLDivElement | null>(null);
  const progressRafRef = useRef<number | null>(null);
  // Cache of last controller state snapshot per micro:bit to avoid redundant setElements loops
  const controllerStateCacheRef = useRef<Record<string, string>>({});

  useEffect(() => {
    elementsRef.current = elements;
  }, [elements]);

  // (note IDs computed on-demand; no counter needed)

  // Keep editor selection in sync with the canvas selection
  useEffect(() => {
    if (
      selectedElement &&
      (selectedElement.type === "microbit" || selectedElement.type === "microbitWithBreakout")
    ) {
      setActiveControllerId(selectedElement.id);
    }
  }, [selectedElement]);

  // (moved below where `wires` is declared)

  const getNodeById = useCallback((nodeId: string) => {
    return elementsRef.current
      .flatMap((e) => e.nodes)
      .find((n) => n.id === nodeId);
  }, []);

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
    selectedWireColor,
    creatingWireStartNode,
    creatingWireJoints,
  // ...existing code...
    wiresRef,
    wireRefs,
    inProgressWireRef,
    animatedCircleRef,
    draggingJoint,
    setWires,
    setSelectedWireColor,
    setCreatingWireStartNode,
  // ...existing code...
    getWirePoints,
    updateWiresDirect,
    updateInProgressWire,
    handleNodeClick,
    handleNodePointerDown,
    handleNodePointerUp,
    handleStageClickForWire,
    handleWireEdit,
    getWireColor,
    resetWireState,
    loadWires,
    handleJointDragStart,
    handleJointDragMove,
    handleJointDragEnd,
    addJointToWire,
    removeJointFromWire,
    draggingEndpoint,
    hoveredNodeForEndpoint,
    handleEndpointDragStart,
    handleEndpointDragMove,
    handleEndpointDragEnd,
  } = useWireManagement({
    elements,
    stageRef,
    wireLayerRef,
    getNodeById,
    getNodeParent,
    pushToHistorySnapshot: (els, ws) => pushToHistory(els, ws),
    stopSimulation,
  });

  

  const PROPERTIES_PANEL_WIDTH = 240;
  const propertiesPanelRight = useMemo(() => {
    const padding = 12;
    const maxRight = Math.max(padding, viewportWidth - PROPERTIES_PANEL_WIDTH - padding);
    if (!openCodeEditor) return padding;
    return Math.min(codeEditorSize.width - 290, maxRight);
  }, [openCodeEditor, codeEditorSize.width, viewportWidth]);

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

  // Load saved circuit and code map from localStorage on first mount; else start clean
  useHydrateCircuitFromLocalStorage({
    keys: {
      elementsKey: CIRCUIT_ELEMENTS_KEY,
      wiresKey: CIRCUIT_WIRES_KEY,
      codeMapKey: CODE_MAP_KEY,
    },
    setInitializing,
    setElements,
    setWires,
    initializeHistory,
    setHydratedFromStorage,
    setControllerCodeMap,
    resetState,
  });

  // After hydrating from storage, force wire geometry and redraw once Stage exists.
  useHydrationRedraw({
    hydratedFromStorage,
    setHydratedFromStorage,
    stageRef,
    wireLayerRef,
    updateWiresDirect,
    updateViewport,
  });

  usePersistCircuitSessionToLocalStorage({
    keys: {
      elementsKey: CIRCUIT_ELEMENTS_KEY,
      wiresKey: CIRCUIT_WIRES_KEY,
      codeMapKey: CODE_MAP_KEY,
    },
    elements,
    wires,
    elementsRef,
    wiresRef,
    controllerCodeMap,
  });

  const { createAndAttachSimulator } = useMicrobitSimulators({
    elements,
    controllerMap,
    setControllerMap,
    setElements,
    simulationRunningRef,
    controllerStateCacheRef,
    initializing,
    setInitializing,
  });

  // Start a new session: clear all app-local storage and reset editor/canvas
  const performNewSessionClear = useCallback(() => {
    try {
      if (typeof window !== 'undefined') {
        // Remove all keys that belong to MoonTinker (mt_*)
        const keysToRemove: string[] = [];
        for (let i = 0; i < window.localStorage.length; i++) {
          const k = window.localStorage.key(i) || '';
          if (k.startsWith('mt_')) keysToRemove.push(k);
        }
        keysToRemove.forEach((k) => window.localStorage.removeItem(k));
        // Also remove blockly xml map key used by the Blockly editor
        try { window.localStorage.removeItem('moontinker_controllerXmlMap'); } catch {}
      }
    } catch (e) {
      console.warn("⚠️ Failed to clear localStorage for new session:", e);
    }

    // Stop any running simulation and dispose controllers
    try { stopSimulation(); } catch (_) {}
    setControllerMap((prev) => {
      try { Object.values(prev).forEach((sim) => sim.dispose()); } catch (_) {}
      return {};
    });

    // Reset UnifiedEditor state
    if (editorResetRef.current) {
      try { editorResetRef.current(); } catch (e) {
        console.warn("⚠️ Failed to reset editor:", e);
      }
    }

    // Reset app state
    setControllerCodeMap({});
    setActiveControllerId(null);
    setOpenCodeEditor(false);
    setCopiedElement(null); 
    resetState();
    // Also reset history root to empty
    initializeHistory([], []);
  }, [stopSimulation, initializeHistory]);

  const openNewSessionModal = useCallback(() => {
    setShowNewSessionModal(true);
  }, []);

  // Open delete confirmation for a programmable controller
  const openDeleteControllerModal = useCallback((element: CircuitElement) => {
    setPendingControllerDelete(element);
    setShowDeleteControllerModal(true);
  }, []);

  const confirmNewSession = useCallback(() => {
    setShowNewSessionModal(false);
    performNewSessionClear();
  }, [performNewSessionClear]);

  const cancelNewSession = useCallback(() => {
    setShowNewSessionModal(false);
  }, []);

  const cancelDeleteController = useCallback(() => {
    setShowDeleteControllerModal(false);
    setPendingControllerDelete(null);
  }, []);

  const confirmDeleteController = useCallback(() => {
    if (!pendingControllerDelete) return;
    const id = pendingControllerDelete.id;
    // Record deletion for undo (element & wires only; code/workspace purge not undoable)
    pushToHistory(elementsRef.current, wiresRef.current);

    // Dispose simulator instance if exists
    setControllerMap(prev => {
      const sim = prev[id];
      try { sim?.dispose(); } catch (_) {}
      const { [id]: _removed, ...rest } = prev;
      return rest;
    });

    // Remove element and its wires
    setElements(prev => prev.filter(el => el.id !== id));
    setWires(prev => prev.filter(w => (
      getNodeParent(w.fromNodeId)?.id !== id && getNodeParent(w.toNodeId)?.id !== id
    )));

    // Purge controller code & editor/workspace persistence (fresh when re-added)
    setControllerCodeMap(prev => {
      const { [id]: _code, ...rest } = prev;
      return rest;
    });
    try {
      if (typeof window !== 'undefined') {
        window.localStorage.removeItem(`mt_workspace_${id}`);
        window.localStorage.removeItem(`mt_last_editor_mode_${id}`);
        // Remove from moontinker_controllerXmlMap as well
        try {
          const raw = window.localStorage.getItem('moontinker_controllerXmlMap');
          if (raw) {
            const parsed = JSON.parse(raw);
            if (parsed && typeof parsed === 'object' && id in parsed) {
              delete parsed[id];
              window.localStorage.setItem('moontinker_controllerXmlMap', JSON.stringify(parsed));
            }
          }
        } catch {}
        // CODE_MAP_KEY save will happen automatically on next effect; removing entry is enough
      }
    } catch (_) {}

    // Clear cached controller state snapshot to avoid stale reapplication
    delete controllerStateCacheRef.current[id];

    // Clear selection/editor context
    setSelectedElement(null);
    setCreatingWireStartNode(null);
    if (activeControllerId === id) {
      setActiveControllerId(null);
      setOpenCodeEditor(false); // close editor if it was showing deleted controller
    }

    // If a simulation was running, ensure immediate stop (LEDs/pins already cleared by stop)
    try { stopSimulation(); } catch (_) {}

    setShowDeleteControllerModal(false);
    setPendingControllerDelete(null);
  }, [pendingControllerDelete, pushToHistory, getNodeParent, activeControllerId, stopSimulation]);

  // Update viewport on mount and resize
  useEffect(() => {
    const handleResize = () => {
      updateViewport(true);
      setViewportWidth(window.innerWidth);
    };
    updateViewport(); // Initial update
    setViewportWidth(window.innerWidth);
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

    // Synchronously update ref to avoid a brief window where events still think simulation is running
    simulationRunningRef.current = false;
    if (simulationFrameRef.current) {
      cancelAnimationFrame(simulationFrameRef.current);
      simulationFrameRef.current = null;
    }
    lastTickRef.current = null;
    // Make UI responsive while applying batch updates
    React.startTransition(() => {
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
          // Reset LED runtime to initial state (no explosion, no thermal energy)
          runtime: el.type === "led"
            ? { led: createInitialLedRuntime() }
            : el.runtime,
          // Immediately clear controller visuals (LEDs off, pins cleared)
          controller: el.controller
            ? {
                leds: Array.from({ length: 5 }, () => Array(5).fill(0)),
                pins: {},
                logoTouched: false,
              }
            : el.controller,
        }))
      );
    });

    // Stop tones and cancel running tasks immediately; reset micro:bit state
    try {
      Object.values(controllerMap).forEach((sim) => {
        // Fire-and-forget; no need to block UI
        try { void sim.stop(); } catch (_) {}
      });
    } catch (_) {}

    // Stop and hide the progress overlay if it was running
    if (progressRafRef.current) {
      cancelAnimationFrame(progressRafRef.current);
      progressRafRef.current = null;
    }
    setStopDisabled(false);
    if (progressRef.current) {
      progressRef.current.style.width = "0%";
    }
  }

  // Attempt to reconstruct Python source for any controller whose code entry is missing
  const ensureAllControllerCode = useCallback(async (): Promise<Record<string,string>> => {
    const idsNeeding = elementsRef.current
      .filter(el => (el.type === 'microbit' || el.type === 'microbitWithBreakout') && !controllerCodeMap[el.id])
      .map(el => el.id);
    if (!idsNeeding.length) {
      return { ...controllerCodeMap };
    }
    try {
      const blocklyMod = await import('blockly');
      const Blockly = (blocklyMod as any).default || blocklyMod;
      // Import python generator
      const { pythonGenerator } = await import('blockly/python');
      // Register shared custom blocks & generators before loading any XML
      try {
        const { BlocklyPythonIntegration } = await import('@/blockly_editor/utils/blocklyPythonConvertor');
        BlocklyPythonIntegration.initialize();
        BlocklyPythonIntegration.setupPythonGenerators(pythonGenerator as any);
      } catch (regErr) {
        console.warn('⚠️ Failed to init shared blocks in ensureAllControllerCode:', regErr);
      }
      
      const centralizedXmlRaw = typeof window !== 'undefined' ? window.localStorage.getItem('moontinker_controllerXmlMap') : null;
      let centralizedXmlMap: Record<string, string> = {};
      if (centralizedXmlRaw) {
        try { centralizedXmlMap = JSON.parse(centralizedXmlRaw); } catch(e) {}
      }
      
      const updated: Record<string,string> = {};
      idsNeeding.forEach(id => {
        try {
          let xmlText = centralizedXmlMap[id];
          
          if (!xmlText && typeof window !== 'undefined') {
            xmlText = window.localStorage.getItem(`mt_workspace_${id}`) || '';
          }
          
          if (!xmlText) return;
          const tempWs = new Blockly.Workspace();
          try {
            const parser = new DOMParser();
            const dom = parser.parseFromString(xmlText, 'text/xml');
            (Blockly.Xml as any).domToWorkspace(dom.documentElement, tempWs);
            const code = (pythonGenerator as any).workspaceToCode(tempWs) as string;
            if (code && code.trim()) {
              updated[id] = code;
            }
          } finally {
            tempWs.dispose();
          }
        } catch (e) {
          console.warn('⚠️ Failed to reconstruct code for controller', id, e);
        }
      });
      let merged = { ...controllerCodeMap };
      if (Object.keys(updated).length) {
        merged = { ...merged, ...updated };
        setControllerCodeMap(merged);
      }
      return merged;
    } catch (e) {
      console.warn('⚠️ Blockly dynamic import failed while reconstructing controller code:', e);
      return { ...controllerCodeMap };
    }
  }, [controllerCodeMap]);

  async function startSimulation() {
    // Start flag first to update UI immediately
    // Update ref synchronously so early simulator LED/pin events right after initialization are not dropped.
    simulationRunningRef.current = true;
    setSimulationRunning(true);
    lastTickRef.current = null;

    setElements(prev => prev.map(el => {
      if (el.type === 'powersupply') {
        const isOn = (el.properties as any)?.isOn === true;
        const vSet = (el.properties as any)?.vSet ?? el.properties?.voltage ?? 5;
        return {
          ...el,
          properties: {
            ...el.properties,
            voltage: isOn ? vSet : 0,
            ...(el.properties as any),
            isOn,
            vSet,
          } as any,
        };
      }
      return el;
    }));

    // Ensure every micro:bit has an initialized simulator BEFORE running user code.
    // (Keep initialization behavior deterministic; we instead smooth the overlay dismissal
    // and prewarm sims on drop to reduce perceived startup delay.)
    const microbitElements = elementsRef.current.filter(
      (el) => el.type === "microbit" || el.type === "microbitWithBreakout"
    );
    const effectiveSims: Record<string, Simulator> = { ...controllerMap };
    for (const el of microbitElements) {
      if (!effectiveSims[el.id]) {
        const sim = await createAndAttachSimulator(el);
        if (sim) effectiveSims[el.id] = sim;
      }
    }

    // Recreate any missing controller code (e.g., after a refresh before opening editor) and capture synchronously
    const effectiveCodeMap = await ensureAllControllerCode();

    // Compute circuit in a transition to keep UI responsive
    React.startTransition(() => {
      computeCircuit(wiresRef.current || []);
    });

    // Show non-blocking progress overlay for the stop button cooldown
    const duration = 3000;
    setStopDisabled(true);
    if (progressRef.current) {
      // Reset to full width at start
      progressRef.current.style.width = "100%";
    }
    const startTs = performance.now();
    const step = (now: number) => {
      const elapsed = now - startTs;
      const remaining = Math.max(0, duration - elapsed);
      const pct = (remaining / duration) * 100;
      if (progressRef.current) {
        progressRef.current.style.width = `${pct}%`;
      }
      if (remaining > 0 && simulationRunningRef.current) {
        progressRafRef.current = requestAnimationFrame(step);
      } else {
        progressRafRef.current = null;
        setStopDisabled(false);
      }
    };
    progressRafRef.current = requestAnimationFrame(step);

    // Run user code for all controllers using effectiveCodeMap so we don't depend on async state propagation
    microbitElements.forEach((el) => {
      const sim = effectiveSims[el.id];
      const code = effectiveCodeMap[el.id] ?? '';
      if (sim && code) {
        try { void sim.run(code); } catch (e) { console.warn('⚠️ Failed to start simulator code for', el.id, e); }
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
  // ...existing code...
        // ...existing code...
        // ...existing code...
    // ...existing code...
        pushToHistory: () => pushToHistory(elementsRef.current, wiresRef.current),
        pushToHistorySnapshot: (els, ws) => pushToHistory(els, ws),
        stopSimulation,
        resetState,
        openNewSessionModal,
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
        onRequestControllerDelete: (el) => openDeleteControllerModal(el),
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

  const handleStageMouseMove = useCallback((e: KonvaEventObject<PointerEvent>) => {
    const pos = e.target.getStage()?.getPointerPosition();
    if (!pos) return;
    // Only update React state if we're NOT creating a wire to avoid re-renders
    if (!creatingWireStartNode) {
      setMousePos(pos);
    } else {
      // If creating a wire, update in-progress wire directly without React re-render
      updateInProgressWire(pos);
    }
  }, [creatingWireStartNode, updateInProgressWire]);

  // Place note at a specific canvas position
  const placeNoteAtPosition = useCallback((canvasX: number, canvasY: number) => {
    setElements((prev) => {
      // Compute next ID based on current state to avoid race conditions
      const escape = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      const rx = new RegExp(`^${escape("note")}-(\\d+)$`);
      const used = new Set<number>();
      prev.forEach((el) => {
        if (el.type !== "note") return;
        const m = el.id.match(rx);
        if (m) {
          const n = Number(m[1]);
          if (!Number.isNaN(n)) used.add(n);
        }
      });
      let idNumber = 1;
      while (used.has(idNumber)) idNumber += 1;

      const newNote = createElement({
        type: "note",
        idNumber,
        pos: { x: canvasX, y: canvasY },
        properties: {
          text: "",
        },
      });

      if (!newNote) return prev;

      const next = [...prev, newNote];
      pushToHistory(next, wires);
      setSelectedElement(newNote);
      setShowPropertiesPannel(true);
      return next;
    });
  }, [pushToHistory, wires]);

  const handleStageClick = useCallback((e: KonvaEventObject<MouseEvent>) => {
    const pos = e.target.getStage()?.getPointerPosition();
    if (!pos) return;

    // Handle notes tool placement
    if (notesToolActive) {
      const className = e.target.getClassName?.();
      const clickedEmpty = className === "Stage" || className === "Layer";
      if (clickedEmpty) {
        const stage = stageRef.current;
        if (!stage) return;
        const scale = stage.scaleX();
        const stagePos = stage.position();
        const canvasX = (pos.x - stagePos.x) / scale;
        const canvasY = (pos.y - stagePos.y) / scale;
        placeNoteAtPosition(canvasX, canvasY);
        setNotesToolActive(false);
        return;
      }
    }

    // If not wiring/editing and user clicked on empty canvas (Stage/Layer), clear selection and close editor
      if (!creatingWireStartNode) {
        const className = e.target.getClassName?.();
        const clickedEmpty = className === "Stage" || className === "Layer";
          if (clickedEmpty) {
          setSelectedElement(null);
          setShowPropertiesPannel(false);
          setOpenCodeEditor(false);
          // Keep last active controller id for quick reopen via Code button
          return; // do not process further
        }
      }

    if (creatingWireStartNode) {
      handleStageClickForWire(pos);
    }
  }, [creatingWireStartNode, handleWireEdit, handleStageClickForWire, notesToolActive, placeNoteAtPosition]);

  // Optimized drag move handler - updates wires directly without React re-render
  const handleElementDragMove = useCallback((e: KonvaEventObject<DragEvent>) => {
    e.cancelBubble = true;
    // Normalize ID by removing microbit- prefix if present
    const rawId = e.target.id();
    const id = rawId.startsWith('microbit-') ? rawId.replace('microbit-', '') : rawId;
    let x = e.target.x();
    let y = e.target.y();

    // Check for node snap targets
    const SNAP_DIST = 25; // px - detection radius
    const draggedEl = getElementById(id);
    
    if (draggedEl) {
      let closestDist = Infinity;
      let snapData: { dragNodeId: string; targetNodeId: string; offsetX: number; offsetY: number } | null = null;
      
      elementsRef.current.forEach((other) => {
        if (other.id === draggedEl.id) return;
        other.nodes.forEach((otherNode) => {
          const otherPos = getAbsoluteNodePosition(otherNode, other);
          draggedEl.nodes.forEach((dNode) => {
            const dPos = getAbsoluteNodePosition(dNode, { ...draggedEl, x, y });
            const dx = otherPos.x - dPos.x;
            const dy = otherPos.y - dPos.y;
            const dist = Math.hypot(dx, dy);
            if (dist <= SNAP_DIST && dist < closestDist) {
              closestDist = dist;
              snapData = { dragNodeId: dNode.id, targetNodeId: otherNode.id, offsetX: dx, offsetY: dy };
            }
          });
        });
      });

      if (snapData) {
        // Adjust position to snap
        const snap: { dragNodeId: string; targetNodeId: string; offsetX: number; offsetY: number } = snapData;
        x = x + snap.offsetX;
        y = y + snap.offsetY;
        e.target.x(x);
        e.target.y(y);
        setSnapTarget({ 
          dragNodeId: snap.dragNodeId, 
          targetNodeId: snap.targetNodeId, 
          offset: { x: snap.offsetX, y: snap.offsetY } 
        });
      } else {
        setSnapTarget(null);
      }
    }

    tempDragPositions.current[id] = { x, y };

    // Directly update wires in Konva without triggering React re-render
    updateWiresDirect();
  }, [updateWiresDirect, getElementById]);

  const solveAndUpdateElements = useCallback(
    (prevElements: CircuitElement[], wiresSnapshot: Wire[], dtSeconds: number) => {
      const solved = solveCircuit(prevElements, wiresSnapshot);
      const solvedMap = new Map(solved.map((el) => [el.id, el] as const));
      const nowMs = typeof performance !== "undefined" ? performance.now() : Date.now();

      return prevElements.map((oldEl) => {
        const updated = solvedMap.get(oldEl.id);
        if (!updated) return oldEl;

        let next: CircuitElement = {
          ...oldEl,
          ...updated,
          controller: oldEl.controller,
        };

        if (updated.type === "led") {
          const wasExploded = !!oldEl.runtime?.led?.exploded;
          const currentForRuntime = wasExploded
            ? (updated.computed?.explosionCurrentEstimate ?? updated.computed?.current ?? 0)
            : (updated.computed?.current ?? 0);

          const runtime = updateLedRuntime({
            prev: oldEl.runtime?.led,
            electrical: {
              forwardVoltage: updated.computed?.forwardVoltage ?? updated.computed?.voltage ?? 0,
              current: currentForRuntime,
              power: updated.computed?.power ?? 0,
              color: updated.properties?.color,
            },
            dt: dtSeconds,
            nowMs,
          });

          next = {
            ...next,
            runtime: { ...(oldEl.runtime || {}), led: runtime },
          };
        }

        return next;
      });
    },
    []
  );

  const runSimulationStep = useCallback(
    (dtSeconds: number, wiresSnapshot?: Wire[]) => {
      const snapshot = wiresSnapshot ?? wiresRef.current ?? [];
      setElements((prevElements) => {
        const next = solveAndUpdateElements(prevElements, snapshot, dtSeconds);
        elementsRef.current = next;
        return next;
      });
    },
    [solveAndUpdateElements, wiresRef]
  );

  const computeCircuit = useCallback(
    (wiresSnapshot: Wire[], dtSeconds = 0) => {
      runSimulationStep(dtSeconds, wiresSnapshot);
    },
    [runSimulationStep]
  );

  // Continuous simulation tick (dt-driven) for LED thermal model and circuit recompute
  useEffect(() => {
    if (!simulationRunning) {
      if (simulationFrameRef.current) {
        cancelAnimationFrame(simulationFrameRef.current);
        simulationFrameRef.current = null;
      }
      lastTickRef.current = null;
      return;
    }

    const tick = (timestamp: number) => {
      if (!simulationRunningRef.current) return;
      const last = lastTickRef.current ?? timestamp;
      const dt = Math.max(0, (timestamp - last) / 1000);
      lastTickRef.current = timestamp;
      runSimulationStep(dt);
      simulationFrameRef.current = requestAnimationFrame(tick);
    };

    simulationFrameRef.current = requestAnimationFrame(tick);

    return () => {
      if (simulationFrameRef.current) cancelAnimationFrame(simulationFrameRef.current);
      simulationFrameRef.current = null;
      lastTickRef.current = null;
    };
  }, [simulationRunning, runSimulationStep]);

  // handle resistance change for potentiometer
  const handleRatioChange = useCallback((elementId: string, ratio: number) => {
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
  }, [simulationRunning, computeCircuit, wires]);

  const handleModeChange = useCallback((elementId: string, mode: "voltage" | "current" | "resistance") => {
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
  }, [simulationRunning, computeCircuit, wires]);

  // Compute the next available numeric suffix for a given element type (e.g., microbit-1, microbit-2)
  const getNextIdNumberForType = useCallback((type: string) => {
    const escape = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const rx = new RegExp(`^${escape(type)}-(\\d+)$`);
    const used = new Set<number>();
    (elementsRef.current || []).forEach((el) => {
      if (el.type !== type) return;
      const m = el.id.match(rx);
      if (m) {
        const n = Number(m[1]);
        if (!Number.isNaN(n)) used.add(n);
      }
    });
    let next = 1;
    while (used.has(next)) next += 1;
    return next;
  }, []);

  const handleDrop = useCallback(async (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    if (simulationRunning) {
      stopSimulation();
    }

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
      // Choose the smallest unused number for this specific type to avoid duplicate keys
      idNumber: getNextIdNumberForType(element.type),
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
    if (newElement.type === "microbit" || newElement.type === "microbitWithBreakout") {
      setActiveControllerId(newElement.id);
      // Force block mode for this controller in localStorage
      try {
        // Set global last editor mode
        localStorage.setItem("moontinker_lastEditorMode", "block");
        // Set per-controller mode map
        const CONTROLLER_MODE_MAP_KEY = "moontinker_controllerEditorModeMap";
        const raw = localStorage.getItem(CONTROLLER_MODE_MAP_KEY);
        const parsed = (raw ? JSON.parse(raw) : {}) || {};
        parsed[newElement.id] = "block";
        localStorage.setItem(CONTROLLER_MODE_MAP_KEY, JSON.stringify(parsed));
      } catch {}
      // Pre-warm micro:bit simulators immediately on drop so starting simulation is instant.
      void createAndAttachSimulator(newElement);
    }
  }, [simulationRunning, stopSimulation, stageRef, createElement, pushToHistory, wires, getNextIdNumberForType, createAndAttachSimulator]);

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

    if (newScale < 0.2 || newScale > 5) return;

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

  // Fit all elements to view
  const handleFitToView = useCallback(() => {
    const stage = stageRef.current;
    if (!stage || elements.length === 0) return;

    // Calculate bounding box of all elements
    let minX = Infinity;
    let minY = Infinity;
    let maxX = -Infinity;
    let maxY = -Infinity;

    elements.forEach((element) => {
      // Approximate element size (you can adjust based on your element types)
      const elementWidth = 100;
      const elementHeight = 100;

      minX = Math.min(minX, element.x - elementWidth / 2);
      minY = Math.min(minY, element.y - elementHeight / 2);
      maxX = Math.max(maxX, element.x + elementWidth / 2);
      maxY = Math.max(maxY, element.y + elementHeight / 2);
    });

    // Add padding
    const padding = 50;
    minX -= padding;
    minY -= padding;
    maxX += padding;
    maxY += padding;

    const boundingWidth = maxX - minX;
    const boundingHeight = maxY - minY;

    // Calculate scale to fit everything
    const stageWidth = stage.width();
    const stageHeight = stage.height();

    const scaleX = stageWidth / boundingWidth;
    const scaleY = stageHeight / boundingHeight;
    const newScale = Math.min(scaleX, scaleY, 2); // Cap at 2x zoom

    // Calculate center position
    const centerX = (minX + maxX) / 2;
    const centerY = (minY + maxY) / 2;

    // Position to center the bounding box
    const newPos = {
      x: stageWidth / 2 - centerX * newScale,
      y: stageHeight / 2 - centerY * newScale,
    };

    stage.scale({ x: newScale, y: newScale });
    stage.position(newPos);
    stage.batchDraw();

    updateViewport();
  }, [elements, updateViewport]);

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

  // --- Export/Import logic (must be after all hooks/state) ---
  // Export circuit as a shareable link
  const handleExportCircuit = useCallback(() => {
    try {
      // Only include controllerCodeMap for micro:bit controllers present in the circuit
      const microbitIds = elements
        .filter(el => el.type === "microbit" || el.type === "microbitWithBreakout")
        .map(el => el.id);
      const filteredControllerCodeMap = Object.fromEntries(
        Object.entries(controllerCodeMap).filter(([id]) => microbitIds.includes(id))
      );
      const data = {
        elements,
        wires,
        controllerCodeMap: filteredControllerCodeMap,
      };
      const json = JSON.stringify(data);
      const encoded = encodeURIComponent(btoa(json));
      const url = `${window.location.origin}${window.location.pathname}?circuit=${encoded}`;
      navigator.clipboard.writeText(url);
      showMessage("Circuit link copied to clipboard!", "success");
    } catch (e) {
      showMessage("Failed to export circuit.", "error");
    }
  }, [elements, wires, controllerCodeMap, showMessage]);

  // Import circuit from a link (show modal)
  const handleImportCircuit = useCallback(() => {
    setImportInput("");
    setImportError(null);
    setShowImportModal(true);
  }, []);

  // Confirm import from modal
  const [importLoading, setImportLoading] = useState(false);
  const handleImportConfirm = useCallback(() => {
    if (!importInput) {
      setImportError("Please paste a link.");
      return;
    }
    setImportLoading(true);
    setTimeout(() => {
      try {
        const url = new URL(importInput);
        const encoded = url.searchParams.get("circuit");
        if (!encoded) throw new Error("No circuit data found in link.");
        const json = atob(decodeURIComponent(encoded));
        const data = JSON.parse(json);
        if (!data.elements || !data.wires) throw new Error("Invalid circuit data.");
        pushToHistory(elements, wires);
        resetState();
        setElements(data.elements);
        setWires(data.wires);
        // Only restore controllerCodeMap for micro:bit controllers present in the imported circuit
        if (data.controllerCodeMap) {
          const microbitIds = data.elements
            .filter((el: any) => el.type === "microbit" || el.type === "microbitWithBreakout")
            .map((el: any) => el.id);
          const filteredControllerCodeMap = Object.fromEntries(
            Object.entries(data.controllerCodeMap)
              .filter(([id]) => microbitIds.includes(id))
              .map(([id, val]) => [id, String(val)])
          ) as Record<string, string>;
          setControllerCodeMap(filteredControllerCodeMap);
        }
        setShowImportModal(false);
        setImportInput("");
        setImportError(null);
        showMessage("Circuit imported from link!", "success");
      } catch (e: any) {
        setImportError(e?.message || "Failed to import circuit.");
        showMessage("Failed to import circuit.", "error");
      } finally {
        setImportLoading(false);
      }
    }, 300);
  }, [importInput, pushToHistory, elements, wires, resetState, setElements, setWires, setControllerCodeMap, showMessage]);

  const handleImportCancel = useCallback(() => {
    setShowImportModal(false);
    setImportInput("");
    setImportError(null);
  }, []);

  // Auto-import if ?circuit= param is present
  useEffect(() => {
    if (typeof window === "undefined") return;
    const params = new URLSearchParams(window.location.search);
    const encoded = params.get("circuit");
    if (encoded) {
      try {
        const json = atob(decodeURIComponent(encoded));
        const data = JSON.parse(json);
        if (data.elements && data.wires) {
          pushToHistory(elements, wires);
          resetState();
          setElements(data.elements);
          setWires(data.wires);
          if (data.controllerCodeMap) setControllerCodeMap(data.controllerCodeMap);
        }
      } catch {}
    }
    // eslint-disable-next-line
  }, []);

  return (
    <div
      className={styles.canvasContainer}
      onDrop={handleDrop}
      onDragOver={(e) => e.preventDefault()}
    >
      {/* Loading Overlay - shown during initial hydration & simulator initialization */}
      {initializing && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-gray-900/40 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl p-8 flex flex-col items-center gap-4 min-w-[320px]">
            <div className="relative w-16 h-16">
              {/* Spinning loader */}
              <div className="absolute inset-0 border-4 border-blue-200 rounded-full"></div>
              <div className="absolute inset-0 border-4 border-transparent border-t-blue-600 rounded-full animate-spin"></div>
            </div>
            <div className="text-center">
              <h3 className="text-lg font-semibold text-gray-900 mb-1">Loading previous circuits...</h3>
            </div>
          </div>
        </div>
      )}

      {/* Debug Panel */}
      {showDebugBox && (
        <DebugBox
          data={{
            mousePos,
            canvasOffset,
            draggingElement,
            selectedElement,
            // ...existing code...
              // ...existing code...
            elements,
            wires,
          }}
          onClose={() => setShowDebugBox(false)}
        />
      )}

      {/* Left Side: Main Canvas */}
      <div className="flex-grow h-full flex flex-col">
        {/* Toolbar */}
        <div
          id="circuit-top-toolbar"
          className="w-full h-12 bg-gray-100 flex items-center px-4 space-x-4 py-2 justify-between shadow-md"
        >
          {/* Controls */}
          <div className="flex items-center gap-4">
            {/* Export Button */}
            <button
              onClick={handleExportCircuit}
              className="px-2 py-1 bg-blue-100 rounded border border-blue-300 text-blue-800 text-sm font-medium shadow hover:bg-blue-200 transition-colors"
              title="Export circuit as shareable link"
            >
              <FaLink className="inline-block mr-1" />
              Export
            </button>

            {/* Import Button */}
            <button
              onClick={handleImportCircuit}
              className="px-2 py-1 bg-green-100 rounded border border-green-300 text-green-800 text-sm font-medium shadow hover:bg-green-200 transition-colors"
              title="Import circuit from link"
            >
              <FaUpload className="inline-block mr-1" />
              Import
            </button>
            {/* Color Palette */}
            <div title="Wire colour">
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
            </div>

            {/* Notes Tool */}
            <NotesTool
              isActive={notesToolActive}
              onClick={() => {
                setNotesToolActive(!notesToolActive);
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
                        ? { ...el, rotation: ((el.rotation || 0) - 30 + 360) % 360 }
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



            {/* Copy Button */}
            <button
              onClick={() => {
                if (!selectedElement || selectedElement.type === "wire") return;
                setCopiedElement(selectedElement);
              }}
              disabled={!selectedElement || selectedElement.type === "wire"}
              className="p-1 bg-gray-200 rounded disabled:opacity-50 hover:bg-gray-300 transition-colors"
              title="Copy"
            >
              <FaCopy size={14} />
            </button>

            {/* Paste Button */}
            <button
              onClick={() => {
                if (!copiedElement) return;
                if (simulationRunning) stopSimulation();
                
                const newElement = createElement({
                  type: copiedElement.type,
                  idNumber: getNextIdNumberForType(copiedElement.type),
                  pos: { x: copiedElement.x + 50, y: copiedElement.y + 50 },
                  properties: { ...copiedElement.properties },
                });
                
                if (!newElement) return;
                
                setElements((prev) => {
                  const next = [...prev, newElement];
                  pushToHistory(next, wires);
                  return next;
                });
                
                setSelectedElement(newElement);
                setShowPropertiesPannel(true);
              }}
              disabled={!copiedElement}
              className="p-1 bg-gray-200 rounded disabled:opacity-50 hover:bg-gray-300 transition-colors"
              title="Paste"
            >
              <FaPaste size={14} />
            </button>

            {/* Delete/Trash Button */}
            <button
              onClick={() => {
                if (!selectedElement) return;
                if (simulationRunning) stopSimulation();
                
                if (selectedElement.type === "wire") {
                  // Delete wire
                  setWires((prev) => {
                    const next = prev.filter((w) => w.id !== selectedElement.id);
                    pushToHistory(elementsRef.current, next);
                    return next;
                  });
                } else {
                  if (selectedElement.type === "microbit" || selectedElement.type === "microbitWithBreakout") {
                    openDeleteControllerModal(selectedElement);
                    return;
                  }
                  
                  const elementNodeIds = selectedElement.nodes.map((n) => n.id);
                  setWires((prev) => prev.filter((w) => 
                    !elementNodeIds.includes(w.fromNodeId) && 
                    !elementNodeIds.includes(w.toNodeId)
                  ));
                  setElements((prev) => {
                    const next = prev.filter((el) => el.id !== selectedElement.id);
                    pushToHistory(next, wiresRef.current);
                    return next;
                  });
                }
                
                setSelectedElement(null);
                setShowPropertiesPannel(false);
                setCreatingWireStartNode(null);
              }}
              disabled={!selectedElement}
              className="p-1 bg-gray-200 rounded disabled:opacity-50 hover:bg-gray-300 transition-colors"
              title="Delete"
            >
              <FaTrash size={14} />
            </button>

            {/* Fit to View Button */}
            <button
              onClick={handleFitToView}
              disabled={elements.length === 0}
              className="p-1 bg-gray-200 rounded disabled:opacity-50 hover:bg-gray-300 transition-colors"
              title="Fit to View"
            >
              <FaExpand size={14} />
            </button>

            {/* Tooltip Group + Simulation Timer */}
            <div className="relative group flex items-center gap-3">
              {/* Trigger Button */}
              <div className="w-6 h-6 flex items-center justify-center shadow-lg bg-gray-200 rounded-full cursor-pointer hover:shadow-blue-400 hover:scale-105 transition">
                ?
              </div>
              {/* Simulation Timer (only while running) */}
              {simulationRunning && (
                <div className="text-gray-500 font-semibold text-lg" style={{letterSpacing: '0.5px'}}>
                  Simulator time: <span style={{fontFamily: 'monospace', fontWeight: 700}}>{formatTime(simulationTime)}</span>
                </div>
              )}
              {/* Tooltip Box */}
              <div className="absolute bg-gray-100 bg-clip-padding border border-gray-300 shadow-2xl rounded-xl text-sm top-full left-0 mt-2 w-[300px] z-50 p-3 opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none group-hover:pointer-events-auto">
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
                className={`rounded-sm border-2 border-gray-300 shadow-lg text-black px-1 py-1 text-sm cursor-pointer ${simulationRunning
                  ? "bg-red-300 hover:shadow-red-600"
                  : "bg-emerald-300 hover:shadow-emerald-600"
                  } flex items-center space-x-2 hover:scale-105 ${stopDisabled ? "opacity-50 cursor-not-allowed" : ""
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
                  ref={progressRef}
                  className="absolute top-0 left-0 h-full bg-red-400 opacity-50 rounded-sm z-0"
                  style={{ width: "100%" }}
                />
              )}
            </div>

            <button
              onClick={() => {
                // Toggle: if editor is already open, close it
                if (openCodeEditor) {
                  setOpenCodeEditor(false);
                  return;
                }

                // If a micro:bit is selected, open for that; else open editor with no active controller
                if (selectedElement && (selectedElement.type === "microbit" || selectedElement.type === "microbitWithBreakout")) {
                  setActiveControllerId(selectedElement.id);
                } else {
                  setActiveControllerId(null);
                }
                setOpenCodeEditor(true);
              }}
              title={(function(){
                if (openCodeEditor) return "Close code editor";
                if (selectedElement && (selectedElement.type === "microbit" || selectedElement.type === "microbitWithBreakout")) return "Open code editor for selected micro:bit";
                return "Open code editor and select a micro:bit from dropdown";
              })()}
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

            <button
              onClick={openNewSessionModal}
              className="rounded-sm border-1 border-red-200 shadow-lg bg-red-50 hover:shadow-red-300 text-red-700 px-1 py-1 text-sm cursor-pointer flex items-center space-x-2 hover:scale-105"
              // title="Clear saved circuit and editor data in this browser"
            >
              <span>Start a new session</span>
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

            <AuthHeader inline />

            {/* auth dropdown removed (use global AuthHeader component) */}
          </div>
        </div>
        {selectedElement && showPropertiesPannel ? (
          <div
            className={`absolute top-2 me-73 mt-12 z-40 rounded-xl border border-gray-300 w-[240px] max-h-[90%] overflow-y-auto backdrop-blur-sm bg-white/10 shadow-2xl transition-all duration-200 ${propertiesPanelClosing ? "opacity-0 translate-y-1" : "opacity-100 translate-y-0"}`}
            style={{ right: `${propertiesPanelRight}px` }}
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
                    // For programmable controllers, show confirmation instead of immediate deletion
                    if (updatedElement.type === "microbit" || updatedElement.type === "microbitWithBreakout") {
                      openDeleteControllerModal(updatedElement);
                      return;
                    }
                    // Record deletion so it can be undone
                    pushToHistory(elements, wiresRef.current);
                    const updatedWires = wires.filter(
                      (w) =>
                        getNodeParent(w.fromNodeId)?.id !==
                        updatedElement.id &&
                        getNodeParent(w.toNodeId)?.id !== updatedElement.id
                    );
                    setWires(updatedWires);
                    setElements((prev) =>
                      prev.filter((el) => el.id !== updatedElement.id)
                    );
                    setSelectedElement(null);
                    setCreatingWireStartNode(null);
                    // ...existing code...
                      // ...existing code...
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
                      pushToHistory(elementsRef.current, next);
                      return next;
                    });
                    setSelectedElement(null);
                    setCreatingWireStartNode(null);
                    // ...existing code...
                      // ...existing code...
                    stopSimulation();
                  } else {
                    setWires((prev) => {
                      const next = prev.map((w) =>
                        w.id === updatedWire.id ? { ...w, ...updatedWire } : w
                      );
                      // Push AFTER edit
                      pushToHistory(elementsRef.current, next);
                      return next;
                    });
                    stopSimulation();
                    // Keep wire selected after update (don't deselect)
                    // ...existing code...
                      // ...existing code...
                  }
                }}
                // ...existing code...
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
          {/* ...existing code... */}
          
          {/* Stage Canvas */}
          {loadingSavedCircuit ? (
            <Loader />
          ) : (<>
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
              <GridLayer viewport={viewport} gridSize={25} />
              {/* Elements layer (no nodes) so bodies render below wires */}
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
                    handleNodePointerDown={handleNodePointerDown}
                    handleNodePointerUp={handleNodePointerUp}
                    snapTargetNodeId={snapTarget?.targetNodeId || null}
                    handleRatioChange={handleRatioChange}
                    handleModeChange={handleModeChange}
                    onUpdateElementProperties={(id, properties) => {
                      setElements((prev) => {
                        const next = prev.map((el) =>
                          el.id === id
                            ? {
                                ...el,
                                properties: { ...el.properties, ...properties },
                              }
                            : el
                        );
                        elementsRef.current = next;
                        pushToHistory(next, wiresRef.current);
                        return next;
                      });
                    }}
                    onPowerSupplySettingsChange={(id, settings) => {
                      setElements((prev) =>
                        prev.map((el) =>
                          el.id === id
                            ? {
                                ...el,
                                properties: {
                                  ...el.properties,
                                  voltage: settings.isOn ? settings.vSet : 0,
                                  resistance: el.properties?.resistance ?? 0.2,
                                  isOn: settings.isOn,
                                  vSet: settings.vSet,
                                  iLimit: settings.iLimit,
                                },
                              }
                            : el
                        )
                      );
                      if (simulationRunning) {
                        computeCircuit(wiresRef.current || []);
                      }
                    }}
                    // Body layer should not render nodes (nodes are in the overlay layer)
                    showNodes={false}
                    // Use the body group as the anchor for the micro:bit simulation panel
                    onMicrobitNode={handleMicrobitNode}
                    onDragStart={() => {
                      pushToHistory(elements, wires);
                      setDraggingElement(element.id);
                      stageRef.current?.draggable(false);
                      // Track initial wire count to detect disconnections
                      dragStartWireCountRef.current = wiresRef.current.length;
                      if (!creatingWireStartNode) {
                        const current = getElementById(element.id) || element;
                        setSelectedElement(current);
                        setShowPropertiesPannel(true);
                        if (element.type === "microbit" || element.type === "microbitWithBreakout") {
                          setActiveControllerId(element.id);
                        }
                      }
                    }}
                    onDragEnd={(e) => {
                      // Normalize ID by removing microbit- prefix if present
                      const rawId = e.target.id();
                      const draggedId = rawId.startsWith('microbit-') ? rawId.replace('microbit-', '') : rawId;
                      const x = e.target.x();
                      const y = e.target.y();

                      // If snapping, create an invisible wire for the circuit solver
                      if (snapTarget) {
                        const { dragNodeId, targetNodeId } = snapTarget;
                        // Check if an active wire already exists between these endpoints
                        const activeIdx = wiresRef.current.findIndex(
                          (w) =>
                            !w.deleted &&
                            ((w.fromNodeId === dragNodeId && w.toNodeId === targetNodeId) ||
                              (w.fromNodeId === targetNodeId && w.toNodeId === dragNodeId))
                        );
                        if (activeIdx === -1) {
                          // If a deleted hidden wire exists, revive it; otherwise create a new one
                          const deletedIdx = wiresRef.current.findIndex(
                            (w) =>
                              w.deleted &&
                              ((w.fromNodeId === dragNodeId && w.toNodeId === targetNodeId) ||
                                (w.fromNodeId === targetNodeId && w.toNodeId === dragNodeId))
                          );

                          if (deletedIdx !== -1) {
                            const revived = {
                              ...wiresRef.current[deletedIdx],
                              deleted: false,
                              hidden: true,
                              joints: [],
                              color: selectedWireColor,
                            } as Wire;
                            const nextWires = [...wiresRef.current];
                            nextWires[deletedIdx] = revived;
                            setWires(nextWires);
                            pushToHistory(elementsRef.current, nextWires);
                            stopSimulation();
                          } else {
                            const newWire: Wire = {
                              id: `wire-${Date.now()}-${Math.random()}`,
                              fromNodeId: dragNodeId,
                              toNodeId: targetNodeId,
                              joints: [],
                              color: selectedWireColor,
                              hidden: true, // Mark as hidden for visual purposes
                            };
                            const nextWires = [...wiresRef.current, newWire];
                            setWires(nextWires);
                            pushToHistory(elementsRef.current, nextWires);
                            stopSimulation();
                          }
                        }
                      }

                      setElements((prev) => {
                        const next = prev.map((el) =>
                          el.id === draggedId ? { ...el, x, y } : el
                        );
                        elementsRef.current = next;
                        if (!snapTarget) {
                          pushToHistory(next, wiresRef.current);
                        }
                        return next;
                      });
                      
                      // When not snapped after drag, remove any hidden node-to-node
                      // wires attached to this element whose endpoints are no longer
                      // within snapping distance. This prevents ghost electrical
                      // connections from lingering after visually disconnecting nodes.
                      if (!snapTarget) {
                        const draggedElement = getElementById(draggedId);
                        if (draggedElement && Array.isArray(draggedElement.nodes)) {
                          const draggedNodeIds = new Set(
                            draggedElement.nodes.map((n) => n.id)
                          );

                          let changed = false;
                          const updatedWires = wiresRef.current.map((w) => {
                            if (!w.hidden || w.deleted) return w;
                            const touchesDragged =
                              draggedNodeIds.has(w.fromNodeId) ||
                              draggedNodeIds.has(w.toNodeId);
                            if (!touchesDragged) return w;

                            const fromNode = getNodeById(w.fromNodeId);
                            const toNode = getNodeById(w.toNodeId);
                            const fromParent = fromNode ? getNodeParent(fromNode.id) : null;
                            const toParent = toNode ? getNodeParent(toNode.id) : null;
                            if (!fromNode || !toNode || !fromParent || !toParent) return w;

                            const p1 = getAbsoluteNodePosition(fromNode, fromParent);
                            const p2 = getAbsoluteNodePosition(toNode, toParent);
                            const dist = Math.hypot(p1.x - p2.x, p1.y - p2.y);
                            const UNSNAP_DIST = 25; // match snap detection radius
                            if (dist > UNSNAP_DIST) {
                              changed = true;
                              return { ...w, deleted: true };
                            }
                            return w;
                          });

                          if (changed) {
                            setWires(updatedWires);
                            pushToHistory(elementsRef.current, updatedWires);
                            stopSimulation();
                          }
                        }
                      }

                      setDraggingElement(null);
                      setSnapTarget(null);
                      stageRef.current?.draggable(true);
                    }}
                    onSelect={(id) => {
                      if (creatingWireStartNode) return;
                      const element = getElementById(id);
                      setSelectedElement(element ?? null);
                      setShowPropertiesPannel(true);
                      // Prevent closing the code editor if it's already open and the same microbit is re-selected
                      if (element?.type === "microbit" || element?.type === "microbitWithBreakout") {
                        setActiveControllerId(element.id);
                        // If editor is open, switch to the newly selected microbit and keep it open
                        setOpenCodeEditor((prev) => prev ? true : false);
                      } else {
                        // Close editor when non-microbit is selected
                        setOpenCodeEditor(false);
                      }
                    }}
                    selectedElementId={selectedElement?.id || null}
                    onControllerInput={(elementId: string, input: any) => {
                      const sim = controllerMap[elementId];
                      if (!sim) return;
                      const anySim = sim as any;
                      if (input === "A" || input === "B" || input === "AB") {
                        anySim.simulateInput?.(input);
                        return;
                      }
                      if (typeof input === "object" && input?.type === "button") {
                        // forward structured button press/release to simulator
                        anySim.simulateInput?.(input);
                        return;
                      }
                      if (typeof input === "object" && input?.type === "logo") {
                        if (input.state === "pressed") {
                          (anySim.pressLogo?.() ?? anySim.simulateInput?.(input));
                        } else if (input.state === "released") {
                          (anySim.releaseLogo?.() ?? anySim.simulateInput?.(input));
                        }
                      }
                    }}
                    showBody={true}
                  />
                ))}
              </Layer>

              {/* Wires layer sits above element bodies */}
              <Layer ref={wireLayerRef}>
                {wires.map((wire) => {
                  // Skip rendering hidden wires (used for node-to-node snaps that are electrically connected)
                  // Also skip deleted wires
                  if (wire.hidden || wire.deleted) return null;

                  // Calculate wire points, considering if an endpoint is being dragged
                  let points = getWirePoints(wire);

                  // If this wire's endpoint is being dragged, rebuild points using the drag position
                  if (draggingEndpoint?.wireId === wire.id) {
                    const fromNode = getNodeById(wire.fromNodeId);
                    const toNode = getNodeById(wire.toNodeId);
                    const fromParent = fromNode ? getNodeParent(fromNode.id) : null;
                    const toParent = toNode ? getNodeParent(toNode.id) : null;

                    if (fromNode && toNode && fromParent && toParent) {
                      const startPos = draggingEndpoint.end === "from"
                        ? draggingEndpoint.currentPos
                        : getAbsoluteNodePosition(fromNode, fromParent);

                      const endPos = draggingEndpoint.end === "to"
                        ? draggingEndpoint.currentPos
                        : getAbsoluteNodePosition(toNode, toParent);

                      const jointPoints = wire.joints.flatMap((pt) => [pt.x, pt.y]);
                      points = [startPos.x, startPos.y, ...jointPoints, endPos.x, endPos.y];
                    }
                  }

                  // Don't add midpoint for auto-routed wires - they already have proper joints
                  const needsMidpoint = points.length === 4 && wire.joints.length === 0;
                  if (needsMidpoint) {
                    const [x1, y1, x2, y2] = points;
                    const midX = (x1 + x2) / 2;
                    const midY = (y1 + y2) / 2;
                    points.splice(2, 0, midX, midY);
                  }
                  const isSelected = selectedElement?.id === wire.id;
                  const isHovered = !simulationRunning && !creatingWireStartNode && hoveredWireId === wire.id && !(selectedElement?.id === wire.id);
                  const baseColor = getWireColor(wire) || "black";
                  const isDragging = draggingJoint?.wireId === wire.id;

                  return [
                    isHovered && (
                      <Line
                        key={`hover-outline-${wire.id}`}
                        points={points}
                        stroke={baseColor}
                        strokeWidth={isSelected ? 7 : 6}
                        lineCap="round"
                        lineJoin="round"
                        tension={0}
                        opacity={0.18}
                        shadowColor={baseColor}
                        shadowBlur={10}
                        shadowOpacity={0}
                        shadowEnabled
                        listening={false}
                        perfectDrawEnabled={false}
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
                      tension={0}
                      lineCap="round"
                      lineJoin="round"
                      shadowColor={isSelected ? "#4A90E2" : baseColor}
                      shadowEnabled
                      shadowBlur={isSelected ? 12 : 2}
                      shadowOpacity={isSelected ? 0.8 : 0}
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
                        if (!simulationRunning && !isDragging) setHoveredWireId(wire.id);
                      }}
                      onMouseLeave={() => {
                        if (hoveredWireId === wire.id) setHoveredWireId(null);
                      }}
                      listening={!isDragging}
                      perfectDrawEnabled={false}
                    />,
                    // Render draggable joint circles when wire is selected
                    isSelected && wire.joints.map((joint, idx) => {
                      const stage = stageRef.current;
                      const scaleFactor = stage ? 1 / stage.scaleX() : 1;
                      return (
                        <Circle
                          key={`joint-${wire.id}-${idx}`}
                          x={joint.x}
                          y={joint.y}
                          radius={4 * scaleFactor}
                          fill="white"
                          stroke={baseColor}
                          strokeWidth={1.5 * scaleFactor}
                          draggable
                          onDragStart={(e) => {
                            e.cancelBubble = true; // Prevent stage drag
                            handleJointDragStart(wire.id, idx);
                          }}
                          onDragMove={(e) => {
                            e.cancelBubble = true; // Prevent stage drag
                            const newPos = e.target.position();
                            handleJointDragMove(wire.id, idx, newPos);
                          }}
                          onDragEnd={(e) => {
                            e.cancelBubble = true; // Prevent stage drag
                            const finalPos = e.target.position();
                            handleJointDragEnd(wire.id, idx, finalPos);
                          }}
                          onMouseEnter={(e) => {
                            const container = e.target.getStage()?.container();
                            if (container) {
                              container.style.cursor = 'move';
                            }
                          }}
                          onMouseLeave={(e) => {
                            const container = e.target.getStage()?.container();
                            if (container) {
                              container.style.cursor = 'default';
                            }
                          }}
                          onDblClick={(e) => {
                            e.cancelBubble = true; // Prevent stage interactions
                            // Double-click to remove joint
                            removeJointFromWire(wire.id, idx);
                          }}
                          perfectDrawEnabled={false}
                          shadowForStrokeEnabled={false}
                          hitStrokeWidth={10}
                        />
                      );
                    }),
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
                  shadowOpacity={0}
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
                  shadowOpacity={0}
                  visible={!!creatingWireStartNode}
                />
              </Layer>

              {/* Nodes overlay layer on top for visibility and interactions */}
              <Layer>
                {elements.map((element) => (
                  <RenderElement
                    key={`nodes-${element.id}`}
                    isSimulationOn={simulationRunning}
                    element={element}
                    wires={wires}
                    elements={elements}
                    onDragMove={handleElementDragMove}
                    handleNodeClick={handleNodeClick}
                    handleNodePointerDown={handleNodePointerDown}
                    handleNodePointerUp={handleNodePointerUp}
                    snapTargetNodeId={snapTarget?.targetNodeId || null}
                    handleRatioChange={handleRatioChange}
                    handleModeChange={handleModeChange}
                    onPowerSupplySettingsChange={() => {}}
                    onDragStart={() => { }}
                    onDragEnd={() => { }}
                    onSelect={() => { }}
                    selectedElementId={selectedElement?.id || null}
                    onControllerInput={() => { }}
                    // Keep nodes visible during endpoint drag so snap target/tooltip are visible
                    showNodes={true}
                    showBody={false}
                    hoveredNodeForEndpoint={hoveredNodeForEndpoint}
                  />
                ))}
              </Layer>

              {/* Endpoint circles layer - on top of everything for easy interaction */}
              <Layer>
                {wires.map((wire) => {
                  const isSelected = selectedElement?.id === wire.id;
                  if (!isSelected || wire.deleted) return null;

                  const stage = stageRef.current;
                  const scaleFactor = stage ? 1 / stage.scaleX() : 1;
                  const baseColor = getWireColor(wire) || "black";
                  
                  // Get start and end positions
                  const fromNode = getNodeById(wire.fromNodeId);
                  const toNode = getNodeById(wire.toNodeId);
                  const fromParent = fromNode ? getNodeParent(fromNode.id) : null;
                  const toParent = toNode ? getNodeParent(toNode.id) : null;

                  if (!fromNode || !toNode || !fromParent || !toParent) return null;

                  const startPos = getAbsoluteNodePosition(fromNode, fromParent);
                  const endPos = getAbsoluteNodePosition(toNode, toParent);

                  // If dragging an endpoint, use the current drag position
                  const effectiveStartPos = draggingEndpoint?.wireId === wire.id && draggingEndpoint.end === "from"
                    ? draggingEndpoint.currentPos
                    : startPos;
                  
                  const effectiveEndPos = draggingEndpoint?.wireId === wire.id && draggingEndpoint.end === "to"
                    ? draggingEndpoint.currentPos
                    : endPos;

                  return [
                    // Start point (from)
                    <Circle
                      key={`endpoint-from-${wire.id}`}
                      x={effectiveStartPos.x}
                      y={effectiveStartPos.y}
                      radius={5 * scaleFactor}
                      fill="#4CAF50"
                      stroke="white"
                      strokeWidth={1.5 * scaleFactor}
                      draggable
                      onDragStart={(e) => {
                        e.cancelBubble = true;
                        handleEndpointDragStart(wire.id, "from");
                      }}
                      onDragMove={(e) => {
                        e.cancelBubble = true;
                        const x = e.target.x();
                        const y = e.target.y();
                        handleEndpointDragMove(wire.id, "from", { x, y });
                      }}
                      onDragEnd={(e) => {
                        e.cancelBubble = true;
                        const x = e.target.x();
                        const y = e.target.y();
                        handleEndpointDragEnd(wire.id, "from", { x, y });
                      }}
                      onMouseEnter={(e) => {
                        const container = e.target.getStage()?.container();
                        if (container) {
                          container.style.cursor = 'grab';
                        }
                      }}
                      onMouseLeave={(e) => {
                        const container = e.target.getStage()?.container();
                        if (container) {
                          container.style.cursor = 'default';
                        }
                      }}
                      perfectDrawEnabled={false}
                      shadowForStrokeEnabled={false}
                      hitStrokeWidth={10}
                      shadowColor="#4CAF50"
                      shadowBlur={draggingEndpoint?.wireId === wire.id && draggingEndpoint.end === "from" ? 10 : 0}
                      shadowEnabled
                    />,
                    // End point (to)
                    <Circle
                      key={`endpoint-to-${wire.id}`}
                      x={effectiveEndPos.x}
                      y={effectiveEndPos.y}
                      radius={5 * scaleFactor}
                      fill="#FF5722"
                      stroke="white"
                      strokeWidth={1.5 * scaleFactor}
                      draggable
                      onDragStart={(e) => {
                        e.cancelBubble = true;
                        handleEndpointDragStart(wire.id, "to");
                      }}
                      onDragMove={(e) => {
                        e.cancelBubble = true;
                        const x = e.target.x();
                        const y = e.target.y();
                        handleEndpointDragMove(wire.id, "to", { x, y });
                      }}
                      onDragEnd={(e) => {
                        e.cancelBubble = true;
                        const x = e.target.x();
                        const y = e.target.y();
                        handleEndpointDragEnd(wire.id, "to", { x, y });
                      }}
                      onMouseEnter={(e) => {
                        const container = e.target.getStage()?.container();
                        if (container) {
                          container.style.cursor = 'grab';
                        }
                      }}
                      onMouseLeave={(e) => {
                        const container = e.target.getStage()?.container();
                        if (container) {
                          container.style.cursor = 'default';
                        }
                      }}
                      perfectDrawEnabled={false}
                      shadowForStrokeEnabled={false}
                      hitStrokeWidth={10}
                      shadowColor="#FF5722"
                      shadowBlur={draggingEndpoint?.wireId === wire.id && draggingEndpoint.end === "to" ? 10 : 0}
                      shadowEnabled
                    />,
                  ];
                })}
              </Layer>

            </Stage>
            <AnimatePresence>
            {simulationRunning &&
            Object.entries(microbitNodeMapRef.current).map(
              ([id]) => {
                const element = elements.find((el) => el.id === id);

                if (
                  !element ||
                  (element.type !== "microbit" &&
                    element.type !== "microbitWithBreakout")
                ) {
                  return null;
                }

                const simulator = controllerMap[id];
                if (!simulator) return null;

                return (
                  <MicrobitSimulationPanel
                    key={id}
                    elementId={id}
                    element={element}
                    getPosition={getMicrobitPanelPosition}
                    setTemperature={setMicrobitTemperature}
                    setLightLevel={setMicrobitLightLevel}
                    triggerGesture={triggerMicrobitGesture}
                  />
                );
              }
            )}
            </AnimatePresence>
            </>)}
        </div>
      </div>

      {/* Notes tool instruction message */}
      {notesToolActive && (
        <div className="absolute top-20 left-1/2 transform -translate-x-1/2 z-50 bg-blue-500 text-white px-4 py-2 rounded-lg shadow-lg">
          Click on the canvas to add a note
        </div>
      )}

      <div
        id="circuit-palette-panel"
        className={`transition-all duration-300 h-max mt-15 m-0.5 overflow-visible absolute top-0 right-0 z-30 ${showPalette ? "w-72" : "w-10"}`}
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

      {/* Conditionally render editor only when open to properly clean up DOM (toolbox, etc.) */}
      {openCodeEditor && (
        <div
          className="absolute right-0 top-13 z-50"
        >
          <UnifiedEditor
            controllerCodeMap={controllerCodeMap}
            activeControllerId={activeControllerId}
            setControllerCodeMap={setControllerCodeMap}
            stopSimulation={stopSimulation}
            onSizeChange={setCodeEditorSize}
            onClose={() => setOpenCodeEditor(false)}
            onResetRef={editorResetRef}
            isSimulationOn={simulationRunning}
            controllers={(() => {
              const list = elements.filter((el) => el.type === "microbit" || el.type === "microbitWithBreakout");
              let microbitCount = 0;
              let breakoutCount = 0;
              return list.map((el) => {
                if (el.type === "microbitWithBreakout") {
                  breakoutCount++;
                  return {
                    id: el.id,
                    label: `Micro:bit + Breakout ${breakoutCount}`,
                    kind: "microbitWithBreakout" as const,
                  };
                } else {
                  microbitCount++;
                  return {
                    id: el.id,
                    label: `Micro:bit ${microbitCount}`,
                    kind: "microbit" as const,
                  };
                }
              });
            })()}
            onSelectController={(id) => {
              // Switch active controller and reflect selection in canvas
              setActiveControllerId(id);
              const el = elements.find((e) => e.id === id) || null;
              if (el) {
                setSelectedElement(el);
                setShowPropertiesPannel(true);
              }
            }}
          />
        </div>
      )}

      {/* Import Circuit Modal */}
      {showImportModal && (
        <div
          className="fixed inset-0 z-[1000] flex items-center justify-center bg-gray-900/30 dark:bg-black/40 backdrop-blur-[2px]"
          role="dialog"
          aria-modal="true"
          aria-labelledby="import-circuit-title"
          aria-describedby="import-circuit-desc"
          onKeyDown={(e) => { if (e.key === 'Escape') handleImportCancel(); }}
        >
          <div className="w-[430px] max-w-[94vw] rounded-2xl bg-white text-gray-900 shadow-2xl border border-gray-200 p-5 animate-[fadeIn_.12s_ease-out]">
            <div className="flex items-start gap-3">
              <div className="mt-1 flex h-10 w-10 items-center justify-center rounded-full bg-green-50 text-green-600 border border-green-100">
                {/* Import icon */}
                <FaUpload size={20} />
              </div>
              <div className="flex-1">
                <h3 id="import-circuit-title" className="text-lg font-semibold tracking-tight">Import Circuit from Link</h3>
                <p id="import-circuit-desc" className="mt-2 text-sm leading-6 text-gray-600">
                  Paste a circuit link below to import a saved circuit layout and code.
                </p>
                <input
                  type="text"
                  className="mt-3 w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
                  placeholder="Paste circuit link here..."
                  value={importInput}
                  onChange={e => setImportInput(e.target.value)}
                  autoFocus
                  disabled={importLoading}
                />
                {importError && (
                  <div className="mt-2 text-xs text-red-600">{importError}</div>
                )}
              </div>
            </div>
            <div className="mt-5 flex justify-end gap-3">
              <button
                onClick={handleImportCancel}
                className="px-3.5 py-2 rounded-md border border-gray-300 bg-white text-gray-800 text-sm shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-400"
                disabled={importLoading}
              >
                Cancel
              </button>
              <button
                onClick={handleImportConfirm}
                className="px-3.5 py-2 rounded-md bg-green-600 text-white text-sm font-medium shadow hover:bg-green-500 focus:outline-none focus:ring-2 focus:ring-green-400"
                disabled={importLoading}
              >
                {importLoading ? 'Importing...' : 'Import'}
              </button>
            </div>
          </div>
        </div>
      )}
      {showNewSessionModal && (
        <div
          className="fixed inset-0 z-[999] flex items-center justify-center bg-gray-900/20 dark:bg-black/30 backdrop-blur-[2px]"
          role="dialog"
          aria-modal="true"
          aria-labelledby="new-session-title"
          aria-describedby="new-session-desc"
          onKeyDown={(e) => {
            if (e.key === 'Escape') cancelNewSession();
          }}
        >
          <div className="w-[420px] max-w-[92vw] rounded-2xl bg-white text-gray-900 shadow-2xl border border-gray-200 p-5 animate-[fadeIn_.12s_ease-out]">
            <div className="flex items-start gap-3">
              <div className="mt-1 flex h-10 w-10 items-center justify-center rounded-full bg-red-50 text-red-600 border border-red-100">
                {/* Warning icon */}
                <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M1 21h22L12 2 1 21zm12-3h-2v2h2v-2zm0-8h-2v6h2V10z"/></svg>
              </div>
              <div className="flex-1">
                <h3 id="new-session-title" className="text-lg font-semibold tracking-tight">Start a new session?</h3>
                <p id="new-session-desc" className="mt-2 text-sm leading-6 text-gray-600">
                  This will permanently clear your saved circuit layout, micro:bit code, and Blockly workspaces stored in this browser.
                  You cannot undo this.
                </p>
              </div>
            </div>

            <div className="mt-5 flex justify-end gap-3">
              <button
                onClick={cancelNewSession}
                className="px-3.5 py-2 rounded-md border border-gray-300 bg-white text-gray-800 text-sm shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-400"
              >
                Cancel
              </button>
              <button
                onClick={confirmNewSession}
                className="px-3.5 py-2 rounded-md bg-red-600 text-white text-sm font-medium shadow hover:bg-red-500 focus:outline-none focus:ring-2 focus:ring-red-400"
              >
                Yes, clear everything
              </button>
            </div>
          </div>
        </div>
      )}
      {showDeleteControllerModal && pendingControllerDelete && (
        <div
          className="fixed inset-0 z-[1000] flex items-center justify-center bg-gray-900/30 dark:bg-black/40 backdrop-blur-[2px]"
          role="dialog"
          aria-modal="true"
          aria-labelledby="delete-controller-title"
          aria-describedby="delete-controller-desc"
          onKeyDown={(e) => { if (e.key === 'Escape') cancelDeleteController(); }}
        >
          <div className="w-[430px] max-w-[94vw] rounded-2xl bg-white text-gray-900 shadow-2xl border border-gray-200 p-5 animate-[fadeIn_.12s_ease-out]">
            <div className="flex items-start gap-3">
              <div className="mt-1 flex h-10 w-10 items-center justify-center rounded-full bg-amber-50 text-amber-600 border border-amber-100">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M12 5.99 19.53 19H4.47L12 5.99M12 2 1 21h22L12 2zm-1 14v2h2v-2h-2zm0-6v4h2v-4h-2z"/></svg>
              </div>
              <div className="flex-1">
                <h3 id="delete-controller-title" className="text-lg font-semibold tracking-tight">Delete micro:bit?</h3>
                <p id="delete-controller-desc" className="mt-2 text-sm leading-6 text-gray-600">
                  Deleting this controller will permanently remove its Python code and Blockly workspace. Re-adding a micro:bit will create a fresh instance. This cannot be undone.
                </p>
                <div className="mt-2 text-xs text-gray-500">
                  ID: {pendingControllerDelete.id}
                </div>
              </div>
            </div>
            <div className="mt-5 flex justify-end gap-3">
              <button
                onClick={cancelDeleteController}
                className="px-3.5 py-2 rounded-md border border-gray-300 bg-white text-gray-800 text-sm shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-400"
              >
                Cancel
              </button>
              <button
                onClick={confirmDeleteController}
                className="px-3.5 py-2 rounded-md bg-amber-600 text-white text-sm font-medium shadow hover:bg-amber-500 focus:outline-none focus:ring-2 focus:ring-amber-400"
              >
                Yes, delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
