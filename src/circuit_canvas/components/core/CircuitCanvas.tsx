import { SaveCircuit } from "@/circuit_canvas/utils/circuitStorage";
  // (autosave feature removed)
"use client";
import React, { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { Stage, Layer, Line, Circle } from "react-konva";
import type { KonvaEventObject } from "konva/lib/Node";
import { CircuitElement, Wire } from "@/circuit_canvas/types/circuit";
import RenderElement from "@/circuit_canvas/components/core/RenderElement";
import { DebugBox } from "@/common/components/debugger/DebugBox";
import createElement, { updateMicrobitNodes } from "@/circuit_canvas/utils/createElement";
import solveCircuit from "@/circuit_canvas/utils/kirchhoffSolver";
import { updateLedRuntime, createInitialLedRuntime } from "@/circuit_canvas/utils/ledBehavior";
import { updateRgbLedRuntime, createInitialRgbLedRuntime } from "@/circuit_canvas/utils/rgbLedBehavior";
import PropertiesPanel from "@/circuit_canvas/components/core/PropertiesPanel";
import { getCircuitById, updateCircuit } from "@/circuit_canvas/utils/circuitStorage";
import { getRandomCircuitName } from "@/circuit_canvas/utils/circuitNames";
import Konva from "konva";
import styles from "@/circuit_canvas/styles/CircuitCanvas.module.css";
import AuthHeader from "@/components/AuthHeader";
import CircuitStorage from "@/circuit_canvas/components/core/CircuitStorage";
import useCircuitShortcuts from "@/circuit_canvas/hooks/useCircuitShortcuts";
import { FaLink, FaDownload, FaUpload, FaFolder, FaWrench, FaPlus, FaCheck, FaClock } from "react-icons/fa6";
import { 
  CollapsibleToolbar, 
  DropdownItem, 
  ToolButton 
} from "@/circuit_canvas/components/toolbar/CollapsibleToolbar";

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
  FaExpand,
  FaCopy,
  FaPaste,
  FaTrash,
  FaNoteSticky,
} from "react-icons/fa6";
import { VscDebug } from "react-icons/vsc";
import Loader from "@/circuit_canvas/utils/loadingCircuit";
import {
  ColorPaletteDropdown,
  defaultColors,
} from "@/circuit_canvas/components/toolbar/customization/ColorPallete";
import UnifiedEditor, { FlashRefHandle } from "@/blockly_editor/components/UnifiedEditor";
import { MicrobitFlasher, FlashProgress } from "@/python_code_editor/utils/microbitFlasher";
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
import { captureFullCircuitSnapshot } from "@/circuit_canvas/utils/canvasTransform";
import { useAutosave } from "@/circuit_canvas/hooks/useAutosave";
import { AutosaveIndicator } from "@/circuit_canvas/components/ui/AutosaveIndicator";

export default function CircuitCanvas({ importedCircuit }: { importedCircuit?: string | null }) {
  // Import modal state
  const [showImportModal, setShowImportModal] = useState(false);
  const [importInput, setImportInput] = useState("");
  type AuthContextType = { role?: string } | null;
  const authContext = React.useContext(require("@/providers/AuthProvider").AuthContext) as AuthContextType;
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
  const [controllerXmlMap, setControllerXmlMap] = useState<Record<string, string>>({});
  const [showNewSessionModal, setShowNewSessionModal] = useState(false);
  // Delete confirmation modal for programmable controllers (micro:bit variants)
  const [showDeleteControllerModal, setShowDeleteControllerModal] = useState(false);
  const [pendingControllerDelete, setPendingControllerDelete] = useState<CircuitElement | null>(null);

  const [controllerMap, setControllerMap] = useState<Record<string, Simulator>>(
    {}
  );
  const controllerMapRef = useRef<Record<string, Simulator>>({});

  // Keep controllerMapRef in sync with controllerMap state
  useEffect(() => {
    controllerMapRef.current = controllerMap;
  }, [controllerMap]);

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
  
  // Check WebUSB support independently (doesn't require editor to be open)
  const isWebUSBSupported = typeof window !== 'undefined' && MicrobitFlasher.isWebUSBSupported();
  
  // Shared microbit flasher instance - used by both CircuitCanvas and UnifiedEditor
  const sharedFlasherRef = useRef<MicrobitFlasher | null>(null);
  const [microbitConnectionStatus, setMicrobitConnectionStatus] = useState<'connected' | 'disconnected' | 'not-supported'>('disconnected');
  const [microbitDeviceInfo, setMicrobitDeviceInfo] = useState<{ boardVersion?: string; shortId: string } | undefined>(undefined);
  const [isFlashing, setIsFlashing] = useState(false);
  const [flashProgress, setFlashProgress] = useState<FlashProgress | null>(null);
  const [showFlashModal, setShowFlashModal] = useState(false);
  const [flashStatus, setFlashStatus] = useState<'idle' | 'success' | 'error'>('idle');
  
  // Initialize shared flasher
  useEffect(() => {
    if (!sharedFlasherRef.current && isWebUSBSupported) {
      sharedFlasherRef.current = new MicrobitFlasher();
      sharedFlasherRef.current.onStatusChange((status, deviceInfo) => {
        setMicrobitConnectionStatus(status);
        setMicrobitDeviceInfo(deviceInfo);
      });
      sharedFlasherRef.current.initialize().catch((err) => {
        console.warn('Failed to initialize microbit flasher:', err);
      });
    }
  }, [isWebUSBSupported]);
  
  // Handlers for connect/disconnect
  const handleConnectMicrobit = useCallback(async () => {
    if (!sharedFlasherRef.current) return;
    try {
      await sharedFlasherRef.current.connect();
    } catch (error) {
      console.error('Failed to connect to micro:bit:', error);
    }
  }, []);
  
  const handleDisconnectMicrobit = useCallback(async () => {
    if (!sharedFlasherRef.current) return;
    try {
      await sharedFlasherRef.current.disconnect();
    } catch (error) {
      console.error('Failed to disconnect from micro:bit:', error);
    }
  }, []);
  
  // Standalone HEX download handler - works even when editor is closed
  const handleDownloadHex = useCallback(async () => {
    if (!sharedFlasherRef.current) return;
    
    // Get code for active controller, or first available controller
    let code = '';
    if (activeControllerId && controllerCodeMap[activeControllerId]) {
      code = controllerCodeMap[activeControllerId];
    } else {
      // Find first controller with code
      const firstCode = Object.values(controllerCodeMap).find(c => c && c.trim());
      if (firstCode) code = firstCode;
    }
    
    if (!code.trim()) {
      alert('No code to download. Please add some code first.');
      return;
    }
    
    try {
      await sharedFlasherRef.current.downloadHex(code);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      alert(`Failed to download HEX file: ${errorMessage}`);
    }
  }, [activeControllerId, controllerCodeMap]);
  
  // Flash progress callback
  const handleFlashProgress = useCallback((progress: FlashProgress) => {
    setFlashProgress(progress);
    if (progress.stage === 'complete') {
      setFlashStatus('success');
      setTimeout(() => {
        setShowFlashModal(false);
        setFlashProgress(null);
        setFlashStatus('idle');
      }, 2000);
    } else if (progress.stage === 'error') {
      setFlashStatus('error');
    }
  }, []);
  
  // Standalone flash handler - works even when editor is closed
  const handleFlashToMicrobit = useCallback(async () => {
    if (!sharedFlasherRef.current) return;
    if (isFlashing) return;
    
    // Get code for active controller, or first available controller
    let code = '';
    if (activeControllerId && controllerCodeMap[activeControllerId]) {
      code = controllerCodeMap[activeControllerId];
    } else {
      // Find first controller with code
      const firstCode = Object.values(controllerCodeMap).find(c => c && c.trim());
      if (firstCode) code = firstCode;
    }
    
    if (!code.trim()) {
      alert('No code to flash. Please add some code first.');
      return;
    }
    
    setIsFlashing(true);
    setFlashStatus('idle');
    setShowFlashModal(true);
    setFlashProgress({ stage: 'connecting', progress: 0, message: 'Connecting to micro:bit...' });
    
    try {
      const success = await sharedFlasherRef.current.flash(code, handleFlashProgress);
      if (!success && flashProgress?.stage !== 'error') {
        setFlashStatus('error');
      }
    } catch (error) {
      setFlashStatus('error');
      setFlashProgress({
        stage: 'error',
        progress: 0,
        message: error instanceof Error ? error.message : 'Unknown error occurred'
      });
    } finally {
      setIsFlashing(false);
    }
  }, [isFlashing, activeControllerId, controllerCodeMap, handleFlashProgress, flashProgress]);
  
  // Close flash modal
  const handleCloseFlashModal = useCallback(() => {
    if (!isFlashing) {
      setShowFlashModal(false);
      setFlashProgress(null);
      setFlashStatus('idle');
    }
  }, [isFlashing]);
  
  // Ref to access code-related flash functionality from UnifiedEditor (download HEX, flash)
  const editorFlashRef = useRef<FlashRefHandle | null>(null);

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
  // Transient visual feedback for rotate tool buttons
  const [rotateLeftFlash, setRotateLeftFlash] = useState(false);
  const [rotateRightFlash, setRotateRightFlash] = useState(false);



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
  const [currentCircuitName, setCurrentCircuitName] = useState<string>("");
  const [currentCircuitId, setCurrentCircuitId] = useState<string>("");
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

  
  const [autosaveEnabled, setAutosaveEnabled] = useState(true);
  const { status: autosaveStatus, triggerManualSave } = useAutosave({
    circuitId: currentCircuitId,
    circuitName: currentCircuitName,
    elements,
    wires,
    controllerCodeMap,
    controllerXmlMap,
    isSimulationRunning: simulationRunning,
    stageRef,
    enabled: autosaveEnabled,
    debounceMs: 2500,
    isCreatingWire: !!creatingWireStartNode,
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

  // Position properties panel vertically aligned with the selected element (keep right-aligned)
  // Compute initial vertical position when panel is opened and keep it fixed (do not follow drags)
  useEffect(() => {
    if (!showPropertiesPannel || !selectedElement) {
      // panel top is fixed; no dynamic update needed
      return;
    }
    const stage = stageRef.current;
    if (!stage) return;

    try {
      const rect = stage.container().getBoundingClientRect();
      const scale = stage.scaleX() || 1;

      let anchorY = 0;

      if (selectedElement.type === 'wire') {
        const wire = wires.find((w) => w.id === selectedElement.id);
        if (wire) {
          const fromNode = getNodeById(wire.fromNodeId);
          const toNode = getNodeById(wire.toNodeId);
          if (fromNode && toNode) {
            const p1 = getAbsoluteNodePosition(fromNode, getElementById(fromNode.parentId) || ({} as any));
            const p2 = getAbsoluteNodePosition(toNode, getElementById(toNode.parentId) || ({} as any));
            anchorY = (p1.y + p2.y) / 2;
          }
        }
      } else {
        const el = getElementById(selectedElement.id) || selectedElement;
        if (el.nodes && el.nodes.length) {
          const n = el.nodes[0];
          const abs = getAbsoluteNodePosition(n, el);
          anchorY = abs.y;
        } else {
          anchorY = el.y;
        }
      }

      const stagePos = stage.position();
      const clientY = rect.top + stagePos.y + anchorY * scale;

      // Use a fixed offset so panel aligns with component box left corner visually
      const PANEL_H = 220;
      const desiredTop = Math.round(clientY - 40); // shift upward to align with component box top
      const top = Math.max(12, Math.min(desiredTop, window.innerHeight - PANEL_H - 12));
      // panel top is fixed; no dynamic update needed
    } catch (e) {
      // ignore
    }
    // Intentionally omit `elements` and `wires` so panel position stays fixed after opening
  }, [showPropertiesPannel, selectedElement, propertiesPanelRight]);

  // (properties panel uses right-aligned placement by default; don't anchor to elements)

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

  // Persist circuit name to localStorage
  useEffect(() => {
    if (currentCircuitName) {
      try {
        localStorage.setItem('mt_circuit_name', currentCircuitName);
      } catch (e) {
        console.warn("Failed to save circuit name to localStorage:", e);
      }
    }
  }, [currentCircuitName]);

  // Persist circuit ID to localStorage
  useEffect(() => {
    if (currentCircuitId) {
      try {
        localStorage.setItem('mt_circuit_id', currentCircuitId);
      } catch (e) {
        console.warn("Failed to save circuit ID to localStorage:", e);
      }
    }
  }, [currentCircuitId]);

  // Load circuit name from localStorage on mount; if creating new and no saved name, set random
  useEffect(() => {
    try {
      if (typeof window !== 'undefined') {
        const params = new URLSearchParams(window.location.search);
        const isCreatingNew = params.get("new") === "1";

        const savedName = localStorage.getItem('mt_circuit_name');
        if (savedName && savedName.trim()) {
          setCurrentCircuitName(savedName);
        } else if (isCreatingNew) {
          // First-time new circuit: generate and persist a random name
          const name = getRandomCircuitName();
          setCurrentCircuitName(name);
          try { localStorage.setItem('mt_circuit_name', name); } catch {}
        }
      }
    } catch (e) {
      console.warn("Failed to load circuit name from localStorage:", e);
    }
  }, []);

  // Load circuit ID from localStorage on mount
  useEffect(() => {
    try {
      const savedId = localStorage.getItem('mt_circuit_id');
      if (savedId) {
        setCurrentCircuitId(savedId);
      }
    } catch (e) {
      console.warn("Failed to load circuit ID from localStorage:", e);
    }
  }, []);

  // If currentCircuitId changes and we have a circuit loaded, fetch its name from API
  useEffect(() => {
    if (currentCircuitId) {
      getCircuitById(currentCircuitId).then((circuit) => {
        if (circuit?.name) {
          setCurrentCircuitName(circuit.name);
        }
      }).catch((e) => {
        console.warn("Failed to fetch circuit name:", e);
      });
    }
  }, [currentCircuitId]);

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
    setControllerXmlMap({});
    setActiveControllerId(null);
    setOpenCodeEditor(false);
    setCopiedElement(null);
    setCurrentCircuitName(getRandomCircuitName()); // Set random circuit name for new session
    setCurrentCircuitId(""); // Clear circuit ID when creating new session
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
    setControllerXmlMap(prev => {
      const { [id]: _xml, ...rest } = prev as any;
      return rest as Record<string, string>;
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

  // Keyboard shortcuts visual feedback (flash rotate buttons); actual rotation handled via useCircuitShortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      if (
        target.tagName === 'INPUT' ||
        target.tagName === 'TEXTAREA' ||
        target.isContentEditable
      ) {
        return;
      }
      // Visual flash only; do not rotate here to avoid double-handling
      if (!selectedElement) return;
      const hasModifier = e.ctrlKey || e.metaKey || e.shiftKey || e.altKey;
      if ((e.key === 'r' || e.key === 'R') && !hasModifier) {
        setRotateRightFlash(true);
        window.setTimeout(() => setRotateRightFlash(false), 160);
      } else if ((e.key === 'a' || e.key === 'A') && !hasModifier) {
        setRotateLeftFlash(true);
        window.setTimeout(() => setRotateLeftFlash(false), 160);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedElement, pushToHistory, stopSimulation, updateWiresDirect]);

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
        prev.map((el) => {
          const resetRuntime =
            el.type === "led"
              ? { led: createInitialLedRuntime() }
              : el.type === "rgbled"
              ? { rgbled: createInitialRgbLedRuntime() }
              : el.runtime;
          return {
            ...el,
            // set computed values to undefined when simulation stops
            computed: {
              current: undefined,
              voltage: undefined,
              power: undefined,
              measurement: el.computed?.measurement ?? undefined,
            },
            // Reset runtime for elements that have per-tick state
            runtime: resetRuntime,
            // Immediately clear controller visuals (LEDs off, pins cleared)
            controller: el.controller
              ? {
                  leds: Array.from({ length: 5 }, () => Array(5).fill(0)),
                  pins: {},
                  logoTouched: false,
                }
              : el.controller,
          };
        })
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
      
      // Prefer XML map from backend/state; fallback to localStorage
      let centralizedXmlMap: Record<string, string> = controllerXmlMap || {};
      if ((!centralizedXmlMap || Object.keys(centralizedXmlMap).length === 0) && typeof window !== 'undefined') {
        const centralizedXmlRaw = window.localStorage.getItem('moontinker_controllerXmlMap');
        if (centralizedXmlRaw) {
          try { centralizedXmlMap = JSON.parse(centralizedXmlRaw); } catch(e) {}
        }
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
  }, [controllerCodeMap, controllerXmlMap]);

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

  // Update micro:bit pin values based on solved circuit
  const updateMicrobitPinValues = useCallback(
    async (elements: CircuitElement[], wires: Wire[]) => {
      // Find all micro:bit elements
      const microbits = elements.filter(
        (el) => el.type === "microbit" || el.type === "microbitWithBreakout"
      );

      for (const microbit of microbits) {
        const simulator = controllerMapRef.current[microbit.id];
        if (!simulator) continue;

        // Build a union-find structure for node equivalence classes
        const allNodes = elements.flatMap((el) => el.nodes || []);
        const nodeParent = new Map<string, string>();
        
        // Initialize each node as its own parent
        for (const node of allNodes) {
          if (!node) continue;
          nodeParent.set(node.id, node.id);
        }

        // Union-Find helper functions
        const find = (nodeId: string): string => {
          if (nodeParent.get(nodeId) !== nodeId) {
            nodeParent.set(nodeId, find(nodeParent.get(nodeId)!));
          }
          return nodeParent.get(nodeId)!;
        };

        const union = (nodeId1: string, nodeId2: string) => {
          const root1 = find(nodeId1);
          const root2 = find(nodeId2);
          if (root1 !== root2) {
            nodeParent.set(root1, root2);
          }
        };

        // Merge nodes connected by wires
        for (const wire of wires) {
          if (wire.hidden || wire.deleted) continue;
          
          const fromNodeId = (wire as any).fromNodeId;
          const toNodeId = (wire as any).toNodeId;
          
          const hasFrom = nodeParent.has(fromNodeId);
          const hasTo = nodeParent.has(toNodeId);
          
          if (hasFrom && hasTo) {
            union(fromNodeId, toNodeId);
          }
        }

        // Merge nodes connected through closed switches
        for (const element of elements) {
          if (element.type === "slideswitch" && element.nodes && element.nodes.length >= 3) {
            const position = element.properties?.switchPosition ?? "left";
            const terminal1 = element.nodes[0];
            const common = element.nodes[1];
            const terminal2 = element.nodes[2];

            if (position === "left" && terminal1 && common) {
              union(terminal1.id, common.id);
            } else if (position === "right" && terminal2 && common) {
              union(terminal2.id, common.id);
            }
          } else if (element.type === "pushbutton" && element.nodes && element.nodes.length >= 2) {
            const isPressed = element.properties?.pressed ?? false;
            if (isPressed) {
              const node1 = element.nodes[0];
              const node2 = element.nodes[1];
              if (node1 && node2) {
                union(node1.id, node2.id);
              }
            }
          }
        }

        // Force path compression for all nodes before checking equivalence
        for (const [nodeId] of nodeParent) {
          find(nodeId);
        }

        // Now check each pin on the micro:bit
        const pinNodes = microbit.nodes?.filter(
          (node) => node?.placeholder && node.placeholder.match(/^P\d+$/)
        );

        if (!pinNodes) continue;

        for (const pinNode of pinNodes) {
          if (!pinNode) continue;
          const pinName = pinNode.placeholder;
          if (!pinName) continue;

          let pinVoltage = 0;

          // Get the root of the equivalence class for this pin
          const pinRoot = find(pinNode.id);

          // Find all nodes in the same equivalence class
          const equivalentNodes = allNodes.filter(
            (node) => node && find(node.id) === pinRoot
          );

          // Check if any node in the equivalence class is a 3V or GND node
          for (const node of equivalentNodes) {
            if (!node) continue;

            if (node.placeholder === "3V" || node.placeholder === "3.3V") {
              pinVoltage = 3.3;
              break;
            } else if (node.placeholder === "GND") {
              pinVoltage = 0;
              break;
            }
          }

          // Convert voltage to digital value (threshold at 1.65V for 3.3V logic)
          const digitalValue = pinVoltage >= 1.65 ? 1 : 0;

          // Update the simulator's external pin value
          try {
            await simulator.setExternalPinValue(pinName, digitalValue, "digital");
          } catch (error) {
            // Silently ignore errors during pin value updates
          }
        }
      }
    },
    [controllerMapRef]
  );

  const solveAndUpdateElements = useCallback(
    (prevElements: CircuitElement[], wiresSnapshot: Wire[], dtSeconds: number) => {
      const solved = solveCircuit(prevElements, wiresSnapshot);
      const solvedMap = new Map(solved.map((el) => [el.id, el] as const));
      const nowMs = typeof performance !== "undefined" ? performance.now() : Date.now();

      // Update micro:bit pin values based on the circuit topology
      void updateMicrobitPinValues(solved, wiresSnapshot);

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

         if (updated.type === "rgbled") {
          const computedData = updated.computed as any;
          const runtime = updateRgbLedRuntime({
            prev: (oldEl.runtime as any)?.rgbled,
            electrical: {
              red: {
                forwardVoltage: computedData?.red?.forwardVoltage ?? 0,
                current: computedData?.red?.current ?? 0,
                power: computedData?.red?.power ?? 0,
              },
              green: {
                forwardVoltage: computedData?.green?.forwardVoltage ?? 0,
                current: computedData?.green?.current ?? 0,
                power: computedData?.green?.power ?? 0,
              },
              blue: {
                forwardVoltage: computedData?.blue?.forwardVoltage ?? 0,
                current: computedData?.blue?.current ?? 0,
                power: computedData?.blue?.power ?? 0,
              },
            },
            dt: dtSeconds,
            nowMs,
          });

          next = {
            ...next,
            runtime: { ...(oldEl.runtime || {}), rgbled: runtime } as any,
          };
        }

        return next;
      });
    },
    [updateMicrobitPinValues]
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
    // Update the ratio in elements state. The animation loop will pick up
    // the change and re-solve the circuit automatically when simulation is running.
    // We avoid calling computeCircuit manually to prevent race conditions
    // between the manual call and the animation loop.
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
    // When simulation is NOT running, we still update the state but don't
    // need to solve. When it IS running, the animation loop handles solving.
  }, []);

  const handleModeChange = useCallback((elementId: string, mode: "voltage" | "current" | "resistance") => {
    // Update the mode in elements state. The animation loop will pick up
    // the change and re-solve the circuit automatically when simulation is running.
    setElements((prev) => {
      const next = prev.map((el) =>
        el.id === elementId
          ? {
            ...el,
            properties: { ...el.properties, mode },
          }
          : el
      );

      // If this element is currently selected in the Properties Panel,
      // update the selectedElement reference so the panel shows the new mode immediately.
      if (selectedElement && selectedElement.id === elementId) {
        const updated = next.find((e) => e.id === elementId) || null;
        setSelectedElement(updated);
      }

      return next;
    });
  }, [selectedElement]);

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
          className="w-full bg-gray-100 flex flex-col px-4 py-2 gap-2 shadow-md"
        >
          {/* Logo on the extreme left */}
          <div className="flex items-center gap-3 w-full">
            {/* Logo links to saved_circuits */}
            <a href="/saved_circuits" aria-label="Go to Saved Circuits">
              <img
                src="/assets/common/mp_logo.svg"
                alt="MoonTinker Logo"
                className={`h-9 w-auto mr-2 select-none transform transition-transform duration-150 hover:scale-105 active:scale-95 cursor-pointer ${styles.logo}`}
                style={{ display: 'block' }}
              />
            </a>
            {/* Display current circuit name - editable */}
            <div className="flex items-center gap-3">
              {currentCircuitName && (
                <input
                  type="text"
                  value={currentCircuitName}
                  onChange={(e) => setCurrentCircuitName(e.target.value)}
                  onBlur={async () => {
                    if (currentCircuitId && currentCircuitName.trim()) {
                      try {
                        const success = await updateCircuit(currentCircuitId, { name: currentCircuitName.trim() });
                        if (success) {
                          showMessage('Circuit renamed successfully', 'success');
                        } else {
                          showMessage('Failed to rename circuit', 'error');
                        }
                      } catch (error) {
                        showMessage('Failed to rename circuit', 'error');
                      }
                    }
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.currentTarget.blur();
                    }
                  }}
                  className="px-2 py-1 bg-transparent text-lg text-gray-800 font-normal focus:outline-none focus:ring-2 focus:ring-blue-500 rounded transition-colors hover:underline"
                  style={{ minWidth: '200px', width: 'auto' }}
                  size={currentCircuitName.length || 20}
                  placeholder="Circuit Name"
                />
              )}
            </div>

            
            {/* ...existing code for the rest of the header controls... */}
            {/* File Menu - Contains Export & Import (moved to right group) */}

            {/* Color Palette and shortcuts moved to tools row (after Fit to View) */}
            <div className="ml-auto flex items-center gap-2">
              {/* File Menu - Contains Export & Import */}

              {/* Autosave Indicator always visible if circuit loaded */}
              {currentCircuitId && (
                <AutosaveIndicator 
                  status={autosaveStatus.status}
                  lastSaved={autosaveStatus.lastSaved}
                  error={autosaveStatus.error}
                />
              )}


              <CollapsibleToolbar
                label="Circuit"
                icon={<FaFolder size={16} />}
                direction="dropdown"
              >
                <DropdownItem
                  icon={<FaPlus size={16} />}
                  label="New"
                  onClick={openNewSessionModal}
                  className="bg-orange-100 hover:!bg-orange-200 text-orange-800 font-semibold"
                />
                <DropdownItem
                  icon={<FaLink size={16} />}
                  label="Export"
                  onClick={handleExportCircuit}
                  className="bg-blue-100 hover:!bg-blue-200 text-blue-800"
                />
                <DropdownItem
                  icon={<FaUpload size={16} />}
                  label="Import"
                  onClick={handleImportCircuit}
                  className="bg-green-100 hover:!bg-green-200 text-green-800"
                />
                {/* Autosave toggle button inside Circuit dropdown, will be hidden for students in next step */}
                {currentCircuitId && authContext?.role !== 'Student' && (
                  <DropdownItem
                    icon={autosaveEnabled ? <FaCheck /> : <FaClock />}
                    label={autosaveEnabled ? 'Autosave On' : 'Autosave Off'}
                    onClick={() => setAutosaveEnabled(!autosaveEnabled)}
                    className={
                      (autosaveEnabled
                        ? 'bg-purple-100 hover:!bg-purple-200 text-purple-800'
                        : 'bg-purple-50 hover:!bg-purple-100 text-purple-400') +
                      ' font-semibold border-0 w-full flex items-center gap-2 rounded-md transition-colors duration-150 py-2 px-3'
                    }
                  />
                )}
              </CollapsibleToolbar>
              

              <CircuitStorage
                onCircuitSelect={async (circuitId) => {
                  const data = await getCircuitById(circuitId);
                  if (!data) return;
                  setCurrentCircuitName(data.name);
                  setCurrentCircuitId(circuitId);
                  pushToHistory(elements, wires);
                  resetState();
                  setLoadingSavedCircuit(true);
                  setElements(data.elements);
                  loadWires(data.wires);
                  // Load controller code if available
                  if (data.controllerCodeMap) {
                    setControllerCodeMap(data.controllerCodeMap);
                  }
                  if (data.controllerXmlMap) {
                    setControllerXmlMap(data.controllerXmlMap);
                  }
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
                getSnapshot={() => stageRef.current ? captureFullCircuitSnapshot(stageRef.current, 50) : ""}
                onOpenModal={() => {
                  stopSimulation();
                  setSelectedElement(null);
                }}
                onCircuitNameChange={(name) => setCurrentCircuitName(name)}
                currentCircuitId={currentCircuitId}
                currentCircuitName={currentCircuitName}
                controllerCodeMap={controllerCodeMap}
                onControllerCodeMapLoad={(codeMap) => setControllerCodeMap(codeMap)}
                controllerXmlMap={controllerXmlMap}
                onControllerXmlMapLoad={(xmlMap) => setControllerXmlMap(xmlMap)}
              />

              <AuthHeader inline />
            </div>
          </div>

          <div className="flex flex-row items-center gap-2">

            {/* removed Run/Code/Debugger/Auth from top row; moved to second row */}
            {/* Second header row: tools */}
            <div className="w-full flex items-center justify-between">
              <div className="flex items-center gap-1 px-2 py-1 bg-gray-50 rounded-lg border border-gray-200">
                <ToolButton
                  icon={<FaNoteSticky size={18} />}
                  title="Notes Tool"
                  onClick={() => setNotesToolActive(!notesToolActive)}
                  className={notesToolActive ? "!bg-blue-500 !text-white" : ""}
                />

                <div className="w-px h-5 bg-gray-300 mx-1" />

                <ToolButton
                  icon={<FaRotateLeft size={18} />}
                  title="Rotate Left (A)"
                  disabled={!selectedElement}
                  onClick={() => {
                    if (!selectedElement) return;
                    setElements((prev) => {
                      const next = prev.map((el) =>
                        el.id === selectedElement.id
                          ? { ...el, rotation: ((el.rotation || 0) - 30 + 360) % 360 }
                          : el
                      );
                      elementsRef.current = next;
                      updateWiresDirect();
                      pushToHistory(next, wiresRef.current);
                      return next;
                    });
                    stopSimulation();
                  }}
                  className={rotateLeftFlash ? "!bg-gray-200 !scale-95" : ""}
                />

                <ToolButton
                  icon={<FaRotateRight size={18} />}
                  title="Rotate Right (R)"
                  disabled={!selectedElement}
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
                  className={rotateRightFlash ? "!bg-gray-200 !scale-95" : ""}
                />

                <div className="w-px h-5 bg-gray-300 mx-1" />

                <ToolButton
                  icon={<FaCopy size={18} />}
                  title="Copy"
                  disabled={!selectedElement || selectedElement.type === "wire"}
                  onClick={() => {
                    if (!selectedElement || selectedElement.type === "wire") return;
                    setCopiedElement(selectedElement);
                  }}
                />

                <ToolButton
                  icon={<FaPaste size={18} />}
                  title="Paste"
                  disabled={!copiedElement}
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
                />

                <div className="w-px h-5 bg-gray-300 mx-1" />

                <ToolButton
                  icon={<FaTrash size={18} />}
                  title="Delete"
                  disabled={!selectedElement}
                  onClick={() => {
                    if (!selectedElement) return;
                    if (simulationRunning) stopSimulation();
                    if (selectedElement.type === "wire") {
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
                />

                <ToolButton
                  icon={<FaExpand size={18} />}
                  title="Fit to View"
                  disabled={elements.length === 0}
                  onClick={handleFitToView}
                />
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

                {/* Tooltip Group + Keyboard Shortcuts */}
                <div className="relative group flex items-center gap-3">
                  <div className="w-6 h-6 flex items-center justify-center shadow-lg bg-gray-200 rounded-full cursor-pointer hover:shadow-blue-400 hover:scale-105 transition">?
                  </div>
                  <div className="absolute bg-gray-100 bg-clip-padding border border-gray-300 shadow-2xl rounded-xl text-sm top-full left-0 mt-2 w-[300px] z-50 p-3 opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none group-hover:pointer-events-auto">
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
                                  <kbd className="inline-block bg-gray-100 text-gray-800 px-2 py-1 rounded border border-gray-300 text-xs font-mono">{k}</kbd>
                                  {i < s.keys.length - 1 && (<span className="mx-1">+</span>)}
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

              

              <div className="flex items-center gap-2">
                {/* Micro:bit status / HEX / WebUSB controls moved next to Run button */}
                {elements.some((el) => el.type === "microbit" || el.type === "microbitWithBreakout") && (
                  <div className="flex items-center gap-2 px-2 py-1 bg-gray-50 rounded-sm border border-gray-200 mr-2">
                    {isWebUSBSupported && (
                      <div 
                        className="flex items-center gap-2 px-2 py-1 group relative"
                        title={
                          microbitConnectionStatus === 'connected'
                            ? `micro:bit connected via USB${microbitDeviceInfo ? ` (${microbitDeviceInfo.boardVersion || ''} #${microbitDeviceInfo.shortId})` : ''}`
                            : 'micro:bit not connected'
                        }
                      >
                        <span className="text-sm text-gray-600 font-medium">Status</span>
                        <span className="relative flex h-3 w-3">
                          {microbitConnectionStatus === 'connected' && (
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                          )}
                          <span className={`relative inline-flex rounded-full h-3 w-3 ${
                            microbitConnectionStatus === 'connected'
                              ? 'bg-emerald-500'
                              : 'bg-orange-400'
                          }`}></span>
                        </span>
                        <div className="absolute top-full left-1/2 -translate-x-1/2 mt-2 px-2 py-1.5 bg-gray-900 text-white text-xs rounded shadow-lg opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none whitespace-nowrap z-[100]">
                          {microbitConnectionStatus === 'connected' ? (
                            <div className="flex flex-col gap-0.5">
                              <span className="font-medium text-emerald-400">Connected</span>
                              {microbitDeviceInfo && (
                                <span className="text-gray-300">
                                  {microbitDeviceInfo.boardVersion || 'micro:bit'} • ID: {microbitDeviceInfo.shortId}
                                </span>
                              )}
                            </div>
                          ) : (
                            'Disconnected'
                          )}
                        </div>
                      </div>
                    )}

                    {isWebUSBSupported && (
                      <button
                        onClick={() => {
                          if (microbitConnectionStatus === 'connected') {
                            handleDisconnectMicrobit();
                          } else {
                            handleConnectMicrobit();
                          }
                        }}
                        disabled={isFlashing}
                        className={`flex items-center gap-2 px-3 py-1.5 rounded text-sm font-medium transition-all duration-200 border ${
                          isFlashing
                            ? 'bg-gray-100 border-gray-200 text-gray-400 cursor-not-allowed'
                            : microbitConnectionStatus === 'connected'
                            ? 'bg-orange-500 border-orange-500 text-white hover:bg-orange-600 shadow-sm'
                            : 'bg-indigo-500 border-indigo-500 text-white hover:bg-indigo-600 shadow-sm'
                        }`}
                        title={microbitConnectionStatus === 'connected' ? 'Disconnect micro:bit' : 'Connect to micro:bit'}
                      >
                        {microbitConnectionStatus === 'connected' ? (
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
                          </svg>
                        ) : (
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                          </svg>
                        )}
                      </button>
                    )}

                    <button
                      onClick={handleDownloadHex}
                      className="flex items-center gap-2 px-3 py-1.5 rounded text-sm font-medium transition-all duration-200 border bg-blue-500 border-blue-500 text-white hover:bg-blue-600 shadow-sm"
                      title="Download HEX file - drag to MICROBIT drive to flash"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                    </button>

                    {isWebUSBSupported && (
                      <button
                        onClick={handleFlashToMicrobit}
                        disabled={isFlashing || microbitConnectionStatus !== 'connected'}
                        className={`flex items-center gap-2 px-3 py-1.5 rounded text-sm font-medium transition-all duration-200 border ${
                          isFlashing
                            ? 'bg-gray-100 border-gray-200 text-gray-400 cursor-not-allowed'
                            : microbitConnectionStatus !== 'connected'
                            ? 'bg-gray-100 border-gray-200 text-gray-400 cursor-not-allowed'
                            : 'bg-green-500 border-green-500 text-white hover:bg-green-600 shadow-sm'
                        }`}
                        title={
                          isFlashing 
                            ? 'Flashing in progress...' 
                            : microbitConnectionStatus !== 'connected'
                            ? 'Connect micro:bit first to enable direct flashing'
                            : 'Flash directly to micro:bit via USB'
                        }
                      >
                        {isFlashing ? (
                          <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                        ) : (
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                          </svg>
                        )}
                      </button>
                    )}
                  </div>
                )}
                <div className="relative">
                  <button
                      className={`rounded border border-gray-300 shadow text-black px-3 py-2 text-sm font-medium cursor-pointer ${
                      simulationRunning
                      ? "bg-blue-300 hover:shadow-blue-400"
                      : "bg-emerald-300 hover:shadow-emerald-400"
                      } flex items-center space-x-1.5 hover:scale-105 transition-all duration-200 ${stopDisabled ? "opacity-50 cursor-not-allowed" : ""
                      } relative z-10`}
                    onClick={() =>
                      simulationRunning ? stopSimulation() : startSimulation()
                    }
                    disabled={stopDisabled && simulationRunning}
                    title={simulationRunning ? "Stop simulation" : "Run simulation"}
                  >
                    {simulationRunning ? (
                      <>
                        <FaStop size={16} />
                        <span className="font-mono font-bold text-gray-900">{formatTime(simulationTime)}</span>
                      </>
                    ) : (
                      <>
                        <FaPlay size={16} />
                        <span className="text-sm font-medium">Run</span>
                      </>
                    )}
                  </button>

                  {/* Progress bar overlay */}
                  {simulationRunning && stopDisabled && (
                    <div
                      ref={progressRef}
                      className="absolute top-0 left-0 h-full bg-blue-200 opacity-50 rounded-sm z-0"
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
                  disabled={!elements.some(el => el.type === "microbit" || el.type === "microbitWithBreakout")}
                  title={!elements.some(el => el.type === "microbit" || el.type === "microbitWithBreakout") ? "Add a micro:bit or micro:bit with breakout to enable code editor" : "Open block/text editor"}
                  className={`px-3 py-2 rounded border shadow text-sm font-medium flex flex-row gap-2 items-center justify-center transition-all duration-200 ${
                    !elements.some(el => el.type === "microbit" || el.type === "microbitWithBreakout")
                      ? "bg-gray-200 border-gray-300 text-gray-400 cursor-not-allowed opacity-50"
                      : "bg-[#F4F5F6] border-gray-300 text-black cursor-pointer hover:shadow-blue-400 hover:scale-105"
                  }`}
                >
                    <FaCode size={16} />
                    <span className="text-sm font-medium">Code</span>
                </button>

                <button
                  onClick={() => setShowDebugBox((prev) => !prev)}
                  className="px-3 py-2 bg-[#F4F5F6] rounded border border-gray-300 shadow text-black text-sm font-medium cursor-pointer flex flex-row gap-2 items-center justify-center hover:shadow-blue-400 hover:scale-105"
                >
                    <VscDebug size={16} />
                    <span className="text-sm font-medium">Debugger</span>
                </button>


                
              </div>
            </div>
          </div>
        </div>
        {selectedElement && showPropertiesPannel ? (
          <div
            className={`absolute me-73 z-40 rounded-xl border border-gray-300 w-[240px] max-h-[90%] overflow-y-auto backdrop-blur-sm bg-white/10 shadow-2xl transition-all duration-200 ${propertiesPanelClosing ? "opacity-0 translate-y-1" : "opacity-100 translate-y-0"}`}
            style={{
              right: `${propertiesPanelRight}px`,
              top: openCodeEditor ? '132px' : '108px',
            }}
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
                      const next = prev.map((el) => {
                        if (el.id === updatedElement.id) {
                          let updated = { ...el, ...updatedElement, x: el.x, y: el.y };
                          // If microbit color changed, update node positions
                          if ((el.type === "microbit" || el.type === "microbitWithBreakout") && 
                              el.properties?.color !== updatedElement.properties?.color) {
                            updated = updateMicrobitNodes(updated);
                          }
                          return updated;
                        }
                        return el;
                      });
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
                      if (simulationRunning) {
                        computeCircuit(wiresRef.current || []);
                      }
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
        className={`transition-all duration-300 h-max mt-15 m-0.5 overflow-visible absolute right-0 z-30 ${showPalette ? "w-72" : "w-10"}`}
        style={{
          pointerEvents: "auto",
          top: "72px",
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
          className="absolute right-0 z-50"
          style={{ top: '108px' }}
        >
          <UnifiedEditor
            controllerCodeMap={controllerCodeMap}
            activeControllerId={activeControllerId}
            setControllerCodeMap={setControllerCodeMap}
            stopSimulation={stopSimulation}
            onSizeChange={setCodeEditorSize}
            onClose={() => setOpenCodeEditor(false)}
            onResetRef={editorResetRef}
            onFlashRef={editorFlashRef}
            sharedFlasher={sharedFlasherRef.current}
            onFlashingChange={setIsFlashing}
            isSimulationOn={simulationRunning}
            externalControllerXmlMap={controllerXmlMap}
            onControllerXmlMapChange={setControllerXmlMap}
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

      {/* Flash Modal */}
      {showFlashModal && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-[200]">
          <div className="bg-[#252526] border border-[#3c3c3c] rounded-lg shadow-2xl p-6 max-w-md w-full mx-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-white font-semibold text-lg flex items-center gap-2">
                <svg className="w-5 h-5 text-[#007acc]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
                Flashing micro:bit
              </h3>
              {!isFlashing && (
                <button 
                  onClick={handleCloseFlashModal}
                  className="text-[#858585] hover:text-white transition"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              )}
            </div>
            
            {flashProgress && (
              <div className="space-y-4">
                {/* Progress Bar */}
                <div className="relative">
                  <div className="h-2 bg-[#3c3c3c] rounded-full overflow-hidden">
                    <div 
                      className={`h-full transition-all duration-300 ${
                        flashProgress.stage === 'error' 
                          ? 'bg-[#F48771]' 
                          : flashProgress.stage === 'complete' 
                            ? 'bg-[#4EC9B0]' 
                            : 'bg-[#007acc]'
                      }`}
                      style={{ width: `${flashProgress.progress}%` }}
                    />
                  </div>
                </div>
                
                {/* Stage indicator */}
                <div className="flex items-center gap-3">
                  {flashProgress.stage === 'error' ? (
                    <div className="w-8 h-8 rounded-full bg-[#F48771]/20 flex items-center justify-center">
                      <svg className="w-5 h-5 text-[#F48771]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </div>
                  ) : flashProgress.stage === 'complete' ? (
                    <div className="w-8 h-8 rounded-full bg-[#4EC9B0]/20 flex items-center justify-center">
                      <svg className="w-5 h-5 text-[#4EC9B0]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                    </div>
                  ) : (
                    <div className="w-8 h-8 rounded-full bg-[#007acc]/20 flex items-center justify-center">
                      <div className="w-4 h-4 border-2 border-[#007acc] border-t-transparent rounded-full animate-spin" />
                    </div>
                  )}
                  <div className="flex-1">
                    <p className="text-white text-sm font-medium capitalize">{flashProgress.stage}</p>
                    <p className="text-[#858585] text-xs">{flashProgress.message}</p>
                  </div>
                  <span className="text-[#858585] text-sm font-mono">{flashProgress.progress}%</span>
                </div>
                
                {/* Error retry button */}
                {flashProgress.stage === 'error' && (
                  <div className="space-y-3 mt-4">
                    <p className="text-[#cccccc] text-xs">
                      Flashing failed. You can try again or download the HEX file to drag and drop onto your MICROBIT drive.
                    </p>
                    <div className="flex gap-2">
                      <button
                        onClick={handleFlashToMicrobit}
                        className="flex-1 px-4 py-2 bg-[#007acc] hover:bg-[#1177bb] text-white rounded text-sm font-medium transition"
                      >
                        Try Again
                      </button>
                      <button
                        onClick={() => {
                          handleDownloadHex();
                          handleCloseFlashModal();
                        }}
                        className="flex-1 px-4 py-2 bg-[#4d9f4d] hover:bg-[#5cb85c] text-white rounded text-sm font-medium transition"
                      >
                        Download HEX
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}
            
            {/* Preparing stage info */}
            {flashProgress?.stage === 'preparing' && (
              <div className="mt-4 p-3 bg-[#1e1e1e] rounded border border-[#3c3c3c]">
                <p className="text-[#cccccc] text-xs leading-relaxed">
                  Fetching MicroPython runtime and embedding your Python code...
                </p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
