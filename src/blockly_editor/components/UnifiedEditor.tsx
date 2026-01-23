"use client";
import React, { useState, useEffect, useRef, useCallback } from "react";
import * as Blockly from "blockly";
import { pythonGenerator } from "blockly/python"; 
import {
  BidirectionalConverter,
  BlocklyPythonIntegration,
} from "@/blockly_editor/utils/blocklyPythonConvertor";
import { CodeEditorPane } from "./UnifiedEditor/CodeEditorPane";
import { useEditorResizing } from "./UnifiedEditor/useEditorResizing";
import { useWorkspaceInitialization } from "./UnifiedEditor/useWorkspaceInitialization";
import { EditorHeader } from "./UnifiedEditor/EditorHeader";
import { ValidationError } from "./UnifiedEditor/ValidationError";
import { BlockModeConfirmModal } from "./UnifiedEditor/BlockModeConfirmModal";
import { LoadingOverlay } from "./UnifiedEditor/LoadingOverlay";
import { handleCodeInsertLogic } from "./UnifiedEditor/codeInsertion";
import { SearchPalettePane } from "./UnifiedEditor/SearchPalettePane";
import { BlockEditorPane } from "./UnifiedEditor/BlockEditorPane";
import { useState as useLocalState } from "react";
import BlockSearchPalette from "./BlockSearchPalette";
import { getCategoryMeta } from "@/blockly_editor/utils/sharedBlockDefinitions";
import { maskEditingTextFields } from "./UnifiedEditor/workspaceStyles";
import { useToolboxSearch } from "./UnifiedEditor/hooks/useToolboxSearch";
import { MicrobitFlasher, FlashProgress, ConnectionStatusType, DeviceInfo } from "@/python_code_editor/utils/microbitFlasher";

type EditorMode = "block" | "text";

// Moved to BlockEditorPane

// Interface exposed via onFlashRef for parent components to access flash functionality
export interface FlashRefHandle {
  handleDownloadHex: () => void;
  handleFlashToMicrobit: () => void;
  handleConnectMicrobit: () => void;
  handleDisconnectMicrobit: () => void;
  isFlashing: boolean;
  isWebUSBSupported: boolean;
  microbitConnectionStatus: ConnectionStatusType;
  microbitDeviceInfo?: DeviceInfo;
  hasActiveController: boolean;
}

interface UnifiedEditorProps {
  controllerCodeMap: Record<string, string>;
  activeControllerId: string | null;
  setControllerCodeMap: React.Dispatch<
    React.SetStateAction<Record<string, string>>
  >;
  stopSimulation: () => void;
  onSizeChange?: (size: { width: number; height: number }) => void;
  onClose?: () => void;
  controllers?: Array<{ id: string; label: string; kind?: "microbit" | "microbitWithBreakout" }>;
  onSelectController?: (id: string) => void;
  onResetRef?: React.MutableRefObject<(() => void) | null>; // Ref to expose reset functionality
  isSimulationOn?: boolean; // Disable editing when simulation is running
  onFlashRef?: React.MutableRefObject<FlashRefHandle | null>; // Ref to expose flash functionality
  sharedFlasher?: MicrobitFlasher | null; // Shared flasher instance from parent
  onFlashingChange?: (isFlashing: boolean) => void; // Callback to notify parent of flashing state
  externalControllerXmlMap?: Record<string, string>; // XML map from backend
  onControllerXmlMapChange?: (xmlMap: Record<string, string>) => void; // Notify parent of XML updates
}

export default function UnifiedEditor({
  controllerCodeMap,
  activeControllerId,
  setControllerCodeMap,
  stopSimulation,
  onSizeChange,
  onClose,
  controllers = [],
  onSelectController,
  onResetRef,
  isSimulationOn = false,
  onFlashRef,
  sharedFlasher,
  onFlashingChange,
  externalControllerXmlMap,
  onControllerXmlMapChange,
}: UnifiedEditorProps) {
  const EDITOR_MODE_STORAGE_KEY = "moontinker_lastEditorMode";
  const CONTROLLER_MODE_MAP_KEY = "moontinker_controllerEditorModeMap";
  const ACTIVE_CONTROLLER_KIND_STORAGE_KEY = "moontinker_activeControllerKind";
  // Lockout state to prevent immediate switch back to text mode
  const [blockModeLockout, setBlockModeLockout] = useState(false);
  const blockModeLockoutRef = useRef(false);
  // Keep ref in sync with state
  useEffect(() => {
    blockModeLockoutRef.current = blockModeLockout;
  }, [blockModeLockout]);
  // --- State and Refs ---
  const [editorMode, setEditorMode] = useState<EditorMode>(() => {
    if (typeof window === "undefined") return "block";
    try {
      const raw = localStorage.getItem(EDITOR_MODE_STORAGE_KEY);
      return raw === "text" || raw === "block" ? raw : "block";
    } catch {
      return "block";
    }
  });
  // Controller XML state: prefer external map from backend, fallback to localStorage
  const [controllerXmlMap, setControllerXmlMap] = useState<Record<string, string>>(() => {
    if (externalControllerXmlMap && Object.keys(externalControllerXmlMap).length > 0) {
      return externalControllerXmlMap;
    }
    if (typeof window !== 'undefined') {
      try {
        const raw = localStorage.getItem('moontinker_controllerXmlMap');
        if (raw) return JSON.parse(raw);
      } catch {}
    }
    return {};
  });

  // Sync internal XML map when external map changes (only if content differs)
  useEffect(() => {
    if (!externalControllerXmlMap || Object.keys(externalControllerXmlMap).length === 0) return;
    // Only update if content actually changed (deep comparison)
    const hasChanges = Object.keys(externalControllerXmlMap).some(
      key => controllerXmlMapRef.current[key] !== externalControllerXmlMap[key]
    );
    if (!hasChanges) return;
    setControllerXmlMap(externalControllerXmlMap);
    controllerXmlMapRef.current = externalControllerXmlMap;
  }, [externalControllerXmlMap ? JSON.stringify(externalControllerXmlMap) : '']);
  const [workspaceXml, setWorkspaceXml] = useState<string>("");
  const [bidirectionalConverter, setBidirectionalConverter] = useState<BidirectionalConverter | null>(null);
  const [isUpdatingFromBlocks, setIsUpdatingFromBlocks] = useState(false);
  const [isUpdatingFromCode, setIsUpdatingFromCode] = useState(false);
  const [workspaceReady, setWorkspaceReady] = useState(false);
  const [localCode, setLocalCode] = useState<string>("");
  const [validationError, setValidationError] = useState<string | null>(null);
  const [isConverting, setIsConverting] = useState(false);
  const [conversionType, setConversionType] = useState<"toBlocks" | "toText" | null>(null);
  const [showBlockModeConfirm, setShowBlockModeConfirm] = useState(false);
  const [showCodePalette, setShowCodePalette] = useState(false);
  const [showBlockSearch, setShowBlockSearch] = useState(false);
  const [toolboxSearch, setToolboxSearch] = useLocalState("");

  // Flash/Upload state for micro:bit - uses shared flasher from parent
  const [isFlashing, setIsFlashing] = useState(false);
  const [flashProgress, setFlashProgress] = useState<FlashProgress | null>(null);
  const [showFlashModal, setShowFlashModal] = useState(false);
  const [flashStatus, setFlashStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const isWebUSBSupported = typeof window !== 'undefined' && MicrobitFlasher.isWebUSBSupported();
  
  // Notify parent when flashing state changes
  useEffect(() => {
    onFlashingChange?.(isFlashing);
  }, [isFlashing, onFlashingChange]);

  const isDraggingRef = useRef(false);
  const { editorSize, resizeRef, handleResizeStart } = useEditorResizing(editorMode);
  const blocklyRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!onSizeChange) return;
    const width = parseFloat(editorSize.width);
    const height = parseFloat(editorSize.height);
    if (Number.isNaN(width) || Number.isNaN(height)) return;
    onSizeChange({ width, height });
  }, [editorSize, onSizeChange]);
  const workspaceRef = useRef<Blockly.Workspace | null>(null);
  const lastCodeRef = useRef<string>("");
  const debounceTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const stopSimulationRef = useRef(stopSimulation);
  const localCodeRef = useRef<string>("");
  const previousControllerIdRef = useRef<string | null>(null);
  const controllerXmlMapRef = useRef<Record<string, string>>(controllerXmlMap);
  const activeControllerIdRef = useRef<string | null>(activeControllerId);
  
  activeControllerIdRef.current = activeControllerId;
  controllerXmlMapRef.current = controllerXmlMap;
  
  const isUpdatingFromCodeRef = useRef<boolean>(isUpdatingFromCode);
  // Track text edits relative to the code generated from blocks when entering text mode
  const textBaselineRef = useRef<string>("");
  const textModifiedRef = useRef<boolean>(false);
  // Flag to prevent code generation during controller switches
  const isSwitchingControllerRef = useRef<boolean>(false);
  const { onToolboxSearch } = useToolboxSearch(workspaceRef);

  // Persist editor mode so it can be restored on next reopen
  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      localStorage.setItem(EDITOR_MODE_STORAGE_KEY, editorMode);
    } catch {}
  }, [editorMode]);

  // Persist editor mode per-controller ONLY when mode changes (not when controller changes)
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!activeControllerId) return;
    try {
      const raw = localStorage.getItem(CONTROLLER_MODE_MAP_KEY);
      const parsed = (raw ? JSON.parse(raw) : {}) as Record<string, unknown>;
      const current = parsed?.[activeControllerId];
      if (current === editorMode) return;
      const next = { ...(parsed || {}), [activeControllerId]: editorMode };
      localStorage.setItem(CONTROLLER_MODE_MAP_KEY, JSON.stringify(next));
    } catch {}
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editorMode]);

  // Restore editor mode when switching controllers (do not run mode-switch reset/conversion logic)
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!activeControllerId) return;
    try {
      const raw = localStorage.getItem(CONTROLLER_MODE_MAP_KEY);
      const parsed = (raw ? JSON.parse(raw) : {}) as Record<string, unknown>;
      const desired = parsed?.[activeControllerId];
      const desiredMode: EditorMode | null = desired === "block" || desired === "text" ? desired : null;
      if (!desiredMode) return;
      if (desiredMode === editorMode) return;
      setShowCodePalette(false);
      setEditorMode(desiredMode);
    } catch {}
  }, [activeControllerId]);


  // Persist the selected controller kind so shared Blockly blocks (e.g., pin dropdowns)
  // can adapt options based on whether the board is a breakout variant.
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!activeControllerId) return;
    const meta = controllers?.find((c) => c.id === activeControllerId);
    const kind = meta?.kind;
    if (!kind) return;
    try {
      localStorage.setItem(ACTIVE_CONTROLLER_KIND_STORAGE_KEY, kind);
    } catch {}
  }, [activeControllerId, controllers]);

  useEffect(() => {
    isUpdatingFromCodeRef.current = isUpdatingFromCode;
  }, [isUpdatingFromCode]);

  const hardResetToBlocks = useCallback(() => {
    try { if (workspaceRef.current) { workspaceRef.current.dispose(); } } catch(_) {}
    workspaceRef.current = null;
    setWorkspaceReady(false);
    if (activeControllerId) {
      setControllerXmlMap(prev => {
        const { [activeControllerId]: _removed, ...rest } = prev as any;
        try { localStorage.setItem('moontinker_controllerXmlMap', JSON.stringify(rest)); } catch {}
        return rest;
      });
    }
    setWorkspaceXml("");
    setControllerCodeMap(prev => ({ ...prev, [activeControllerId!]: "" }));
    setLocalCode("");
    localCodeRef.current = "";
    lastCodeRef.current = "";
    textBaselineRef.current = "";
    textModifiedRef.current = false;
    setShowCodePalette(false);
    setEditorMode("block");
    setShowBlockModeConfirm(false);
  }, [activeControllerId, setControllerCodeMap, setWorkspaceReady]);

  // Full editor reset for new session
  const fullEditorReset = useCallback(() => {
    try { if (workspaceRef.current) { workspaceRef.current.dispose(); } } catch(_) {}
    workspaceRef.current = null;
    setWorkspaceReady(false);
    setControllerXmlMap({});
    controllerXmlMapRef.current = {};
    setWorkspaceXml("");
    setLocalCode("");
    localCodeRef.current = "";
    lastCodeRef.current = "";
    textBaselineRef.current = "";
    textModifiedRef.current = false;
    setShowCodePalette(false);
    setShowBlockSearch(false);
    setEditorMode("block");
    setShowBlockModeConfirm(false);
    setValidationError(null);
    setBidirectionalConverter(null);
    previousControllerIdRef.current = null;
  }, [setControllerCodeMap, setWorkspaceReady]);

  // Expose reset function to parent via ref
  useEffect(() => {
    if (onResetRef) {
      onResetRef.current = fullEditorReset;
    }
  }, [onResetRef, fullEditorReset]);

  const xmlHelpers = useRef({
    textToDom: (xmlText: string) => {
      const anyB: any = Blockly as any;
      const tryFns = [
        anyB?.Xml?.textToDom,
        anyB?.utils?.xml?.textToDom,
      ].filter(Boolean);
      for (const fn of tryFns) {
        try { return fn(xmlText); } catch (_) {}
      }
      try {
        const parser = new DOMParser();
        const doc = parser.parseFromString(xmlText, 'text/xml');
        return doc.documentElement as unknown as Element;
      } catch (e) {
        throw e;
      }
    },
    domToText: (el: Element) => {
      const anyB: any = Blockly as any;
      const tryFns = [
        anyB?.Xml?.domToText,
        anyB?.utils?.xml?.domToText,
      ].filter(Boolean);
      for (const fn of tryFns) {
        try { return fn(el); } catch (_) {}
      }
      try {
        return new XMLSerializer().serializeToString(el);
      } catch (e) {
        throw e;
      }
    },
  });

  // --- Workspace Initialization Hook ---
  // This must come after all state/refs/hooks
  // Provide all required props for useWorkspaceInitialization
  const { initializeWorkspace } = useWorkspaceInitialization({
    blocklyRef,
    workspaceRef,
    setWorkspaceReady,
    setBidirectionalConverter,
    setIsUpdatingFromBlocks,
    setControllerCodeMap,
    activeControllerId,
    activeControllerIdRef,
    // The following are required by the hook interface
    saveWorkspaceState: (controllerId?: string) => {
      // Save XML for the current controller (initialization: no parent notify)
      if (!controllerId) controllerId = activeControllerIdRef.current ?? undefined;
      if (controllerId && workspaceRef.current) {
        const xml = Blockly.Xml.workspaceToDom(workspaceRef.current);
        const xmlText = Blockly.Xml.domToText(xml);
        controllerXmlMapRef.current = { ...controllerXmlMapRef.current, [controllerId]: xmlText };
        setControllerXmlMap(prev => {
          const updated = { ...prev, [controllerId!]: xmlText };
          try {
            localStorage.setItem('moontinker_controllerXmlMap', JSON.stringify(updated));
          } catch {}
          return updated;
        });
      }
    },
    isUpdatingFromCodeRef,
    localCodeRef,
    lastCodeRef,
    loadWorkspaceState: (controllerId?: string) => {
      // Load XML for the given controller
      if (!controllerId) controllerId = activeControllerIdRef.current ?? undefined;
      const xmlMap = controllerXmlMapRef.current;
      const xmlText = controllerId ? xmlMap[controllerId] : undefined;
      
      if (!controllerId || !xmlText || !xmlText.trim() || !workspaceRef.current) {
        return false;
      }
      
      if (!xmlText.includes('<block')) {
        return false;
      }
      
      try {
        const xmlDom = xmlHelpers.current.textToDom(xmlText);
        
        if (xmlDom.querySelector && xmlDom.querySelector('parsererror')) {
          return false;
        }
        
        workspaceRef.current.clear();
        (Blockly.Xml as any).domToWorkspace(xmlDom, workspaceRef.current);
        
        const loadedBlocks = workspaceRef.current.getAllBlocks(false);
        if (loadedBlocks.length === 0) {
          return false;
        }
        
        return true;
      } catch {
        return false;
      }
    },
    stopSimulationRef,
    setIsConverting,
    setConversionType,
    isSwitchingControllerRef,
  });

  // Notify parent of XML changes via debounce to avoid rapid re-renders
  useEffect(() => {
    if (!controllerXmlMap || Object.keys(controllerXmlMap).length === 0) return;
    const timer = setTimeout(() => {
      try { onControllerXmlMapChange?.(controllerXmlMap); } catch {}
    }, 300);
    return () => clearTimeout(timer);
  }, [controllerXmlMap, onControllerXmlMapChange]);

  const saveWorkspaceState = useCallback((controllerId?: string) => {
    const id = controllerId ?? activeControllerId;
    if (!id || !workspaceRef.current) return;
    try {
      const xml = (Blockly.Xml as any).workspaceToDom(workspaceRef.current);
      const xmlText = xmlHelpers.current.domToText(xml);
      // Save to ref immediately for sync access
      controllerXmlMapRef.current = { ...controllerXmlMapRef.current, [id]: xmlText };
      // Update state for React
      setControllerXmlMap(prev => {
        const updated = { ...prev, [id]: xmlText };
        try {
          localStorage.setItem('moontinker_controllerXmlMap', JSON.stringify(updated));
        } catch {}
        return updated;
      });
      setWorkspaceXml(xmlText);
    } catch (e) {
      console.warn("⚠️ Failed to save workspace XML:", e);
    }
  }, [activeControllerId]);

  const loadWorkspaceState = useCallback((controllerId?: string): boolean => {
    const id = controllerId ?? activeControllerId;
    if (!id || !workspaceRef.current) {
      console.warn(`[loadWorkspaceState] Skipped: id=${id}, workspace=${!!workspaceRef.current}`);
      return false;
    }
    try {
      const xmlText = controllerXmlMapRef.current[id];
      if (xmlText) {
        const xmlDom = xmlHelpers.current.textToDom(xmlText);
        workspaceRef.current.clear();
        (Blockly.Xml as any).domToWorkspace(xmlDom, workspaceRef.current);
        setWorkspaceXml(xmlText);
        return true;
      }
    } catch (e) {
      console.warn("⚠️ Failed to load workspace XML:", e);
    }
    return false;
  }, [activeControllerId]);

  useEffect(() => {
    stopSimulationRef.current = stopSimulation;
  }, [stopSimulation]);


  let currentCode = controllerCodeMap[activeControllerId ?? ""] ?? "";

  useEffect(() => {
    // Only sync localCode from controllerCodeMap when in block mode
    if (editorMode === "block" && !isUpdatingFromBlocks) {
      setLocalCode(currentCode);
    }
    localCodeRef.current = currentCode;
  }, [currentCode, activeControllerId, isUpdatingFromBlocks, editorMode]);

  // Ensure controller code is synced when switching controllers
  useEffect(() => {
    if (!activeControllerId) return;
    
    const code = controllerCodeMap[activeControllerId] ?? "";
    setLocalCode(code);
    localCodeRef.current = code;
    lastCodeRef.current = code;
    
    // Reset text modification tracking
    textBaselineRef.current = code;
    textModifiedRef.current = false;
  }, [activeControllerId]);

  // Auto-select first controller if none is active but controllers exist
  useEffect(() => {
    if (!activeControllerId && controllers.length > 0 && onSelectController) {
      onSelectController(controllers[0].id);
    }
  }, [activeControllerId, controllers, onSelectController]);

  // Handle switching between controllers: save current state, load new state
  useEffect(() => {
    if (!activeControllerId || !workspaceRef.current || !workspaceReady) return;
    
    const prevId = previousControllerIdRef.current;
    
    // Only process if we're actually switching controllers
    if (prevId && prevId !== activeControllerId) {
      // SET FLAG: Prevent code generation during the switch
      isSwitchingControllerRef.current = true;
      
      // Pause event listeners to prevent code generation during switch
      setIsUpdatingFromBlocks(true);
      
      try {
        // IMPORTANT: Save the previous controller's state FIRST before clearing
        saveWorkspaceState(prevId);
        
        // Clear workspace and dispose all blocks
        try {
          workspaceRef.current.clear();
        } catch (e) {
          console.warn("⚠️ Failed to clear workspace during controller switch:", e);
        }
        
        // Load the new controller's workspace state
        const loaded = loadWorkspaceState(activeControllerId);
      } finally {
        // CRITICAL: Must resume code generation and clear the switch flag
        // Use a small timeout to ensure all state updates and DOM operations complete
        setTimeout(() => {
          isSwitchingControllerRef.current = false;
          setIsUpdatingFromBlocks(false);
        }, 50);
      }
    } else if (!prevId) {
      // First time - just load
      loadWorkspaceState(activeControllerId);
    }
    
    // Update previous controller ref
    previousControllerIdRef.current = activeControllerId;
  }, [activeControllerId, workspaceReady, loadWorkspaceState, saveWorkspaceState, setIsUpdatingFromBlocks]);

  // Enable masking of SVG text while HTML inputs are focused
  useEffect(() => {
    try { maskEditingTextFields(); } catch (_) {}
  }, []);

  // Patch: Set data-category and data-icon attributes on toolbox rows for custom CSS
  useEffect(() => {
    if (!workspaceRef.current || !workspaceReady) return;
    setTimeout(() => {
      const ws = workspaceRef.current;
      if (!ws) return;
      const toolbox = typeof (ws as any).getToolbox === "function" ? (ws as any).getToolbox() : null;
      if (!toolbox) return;
      const categories = toolbox.getToolboxItems ? toolbox.getToolboxItems() : [];
      categories.forEach((cat: any) => {
        if (!cat || typeof cat.getName !== "function") return;
        const name = cat.getName();
        const el = cat.rowDiv_ || cat.htmlDiv_ || null;
        if (el && name) {
          const cleanName = name.replace(/^[^\w\d]+\s*/, "").trim();
          const meta = getCategoryMeta(cleanName);
          el.setAttribute("data-category", cleanName);
          el.setAttribute("data-icon", meta.icon);
        }
      });
    }, 100);
  }, [workspaceReady, toolboxSearch]);

  // 3. TRACK DRAGGING & PREVENT CRASHES
  useEffect(() => {
    if (!workspaceRef.current || !workspaceReady) return;

    const onDrag = (event: any) => {
      if (event.type === Blockly.Events.BLOCK_DRAG) {
        isDraggingRef.current = !!event.isStart; // True if starting, False if ending
      }
    };

    workspaceRef.current.addChangeListener(onDrag);
    return () => {
      if (workspaceRef.current) {
         try { workspaceRef.current.removeChangeListener(onDrag); } catch(e){}
      }
    };
  }, [workspaceReady]);

   // 3b. ENFORCE BUTTON HANDLER UNIQUENESS (MakeCode-style)
  useEffect(() => {
    if (!workspaceRef.current || !workspaceReady) return;
    
    let cleanupListener: ((event: any) => void) | null = null;
    
    // Import the enforcer dynamically to avoid circular deps
    import("@/blockly_editor/utils/sharedBlockDefinitions").then(({ enforceButtonHandlerUniqueness }) => {
      if (workspaceRef.current) {
        cleanupListener = enforceButtonHandlerUniqueness(workspaceRef.current);
      }
    });
    
    // Cleanup: remove listener on unmount
    return () => {
      if (cleanupListener && workspaceRef.current) {
        try { 
          workspaceRef.current.removeChangeListener(cleanupListener); 
        } catch(e) {
          console.warn("Failed to remove button handler listener:", e);
        }
      }
    };
  }, [workspaceReady]);

  // NOTE: Code generation is handled by workspace listeners created in useWorkspaceInitialization.


  // --- Initialization & Resize Logic ---
  useEffect(() => {
    if (editorMode !== "block") {
      if (workspaceRef.current) {
        // Close any open field editors (dropdowns, text inputs) before disposing
        try {
          (Blockly as any).WidgetDiv?.hide();
          (Blockly as any).DropDownDiv?.hideWithoutAnimation();
          (Blockly as any).Tooltip?.hide();
          // Unfocus any selected block
          const ws = workspaceRef.current as any;
          if (ws.hideChaff) ws.hideChaff();
        } catch {}
        try {
          const id = activeControllerIdRef.current;
          if (id) {
            const xml = (Blockly.Xml as any).workspaceToDom(workspaceRef.current);
            const xmlText = xmlHelpers.current.domToText(xml);
            controllerXmlMapRef.current = { ...controllerXmlMapRef.current, [id]: xmlText };
            setControllerXmlMap(prev => {
              const updated = { ...prev, [id]: xmlText };
              try {
                localStorage.setItem('moontinker_controllerXmlMap', JSON.stringify(updated));
              } catch {}
              return updated;
            });
          }
        } catch (e) {
          console.warn("⚠️ Failed to save workspace before dispose:", e);
        }
        try { workspaceRef.current.dispose(); } catch (_) {}
        workspaceRef.current = null;
        setWorkspaceReady(false);
      }
      return;
    }
    if (workspaceRef.current) {
        try { Blockly.svgResize(workspaceRef.current as any); } catch(_){}
        return; 
    }

    let isMounted = true;
    const attemptInit = () => {
      if (!isMounted) return;
      if (!blocklyRef.current) return requestAnimationFrame(attemptInit);
      if (blocklyRef.current.offsetWidth === 0) return setTimeout(attemptInit, 50);
      if (!activeControllerIdRef.current && controllers.length > 0) {
        return setTimeout(attemptInit, 50);
      }
      initializeWorkspace();
    };
    attemptInit();
    return () => { isMounted = false; };
  }, [editorMode, activeControllerId, controllers.length]);

  useEffect(() => {
    return () => {
      if (workspaceRef.current) {
        // Close any open field editors before unmount
        try {
          (Blockly as any).WidgetDiv?.hide();
          (Blockly as any).DropDownDiv?.hideWithoutAnimation();
          (Blockly as any).Tooltip?.hide();
          const ws = workspaceRef.current as any;
          if (ws.hideChaff) ws.hideChaff();
        } catch {}
        try {
          const id = activeControllerIdRef.current;
          if (id) {
            const xml = (Blockly.Xml as any).workspaceToDom(workspaceRef.current);
            const xmlText = xmlHelpers.current.domToText(xml);
            controllerXmlMapRef.current = { ...controllerXmlMapRef.current, [id]: xmlText };
            try {
              const updated = { ...controllerXmlMapRef.current, [id]: xmlText };
              localStorage.setItem('moontinker_controllerXmlMap', JSON.stringify(updated));
            } catch {}
          }
        } catch (e) {
          console.warn("⚠️ Failed to save workspace on unmount:", e);
        }
      }
    };
  }, []);

  useEffect(() => {
    if (!workspaceRef.current || !workspaceReady) return;
    const handleResize = () => { try { Blockly.svgResize(workspaceRef.current as any); } catch(e){} };
    handleResize();
    setTimeout(handleResize, 100);
    let observer: ResizeObserver | null = null;
    if (blocklyRef.current) {
        observer = new ResizeObserver(() => handleResize());
        observer.observe(blocklyRef.current);
    }
    return () => observer?.disconnect();
  }, [workspaceReady, editorSize]);

  // --- Handlers ---
  // Helper: Normalize code for meaningful comparison (ignore whitespace-only changes)
  const normalizeCode = (code: string): string => {
    return (code ?? "")
      .split("\n")
      .map(line => line.trim())
      .filter(line => line.length > 0)
      .join("\n")
      .trim();
  };

  const handleCodeChange = useCallback((newCode: string) => {
      // Critical: Validate activeControllerId exists to prevent wrong controller updates
      if (!activeControllerId || isUpdatingFromBlocks) return;
      setLocalCode(newCode);
      setValidationError(null);
      // Track if user modified text relative to baseline from blocks (ignore whitespace changes)
      try {
        const normalizedNew = normalizeCode(newCode);
        const normalizedBaseline = normalizeCode(textBaselineRef.current);
        textModifiedRef.current = normalizedNew !== normalizedBaseline;
      } catch (_) {}
      if (debounceTimeoutRef.current) clearTimeout(debounceTimeoutRef.current);
      debounceTimeoutRef.current = setTimeout(() => {
        if (newCode !== currentCode) {
          // Double-check activeControllerId is still valid before updating
          setControllerCodeMap((prev) => {
            if (!activeControllerId) return prev; // Safety guard
            return { ...prev, [activeControllerId]: newCode };
          });
          stopSimulation();
          lastCodeRef.current = newCode;
        }
      }, 1000);
    }, [activeControllerId, isUpdatingFromBlocks, currentCode, setControllerCodeMap, stopSimulation]);

  const handleModeChange = (newMode: EditorMode) => {
    if (newMode === editorMode) return;
    // Prevent switching to text mode if lockout is active
    if (editorMode === "block" && newMode === "text" && blockModeLockoutRef.current) {
      return;
    }
    setValidationError(null);
    if (debounceTimeoutRef.current) {
      clearTimeout(debounceTimeoutRef.current);
      setControllerCodeMap(prev => ({ ...prev, [activeControllerId!]: localCode }));
    }
    if (newMode === "block") {
      setShowCodePalette(false);
      if (textModifiedRef.current) {
        setShowBlockModeConfirm(true);
        return;
      }
      // No meaningful modifications, switch directly
      confirmSwitchToBlock();
      // Start lockout for 1 second after switching to block mode
      setBlockModeLockout(true);
      setTimeout(() => setBlockModeLockout(false), 1000);
    } else {
      setIsConverting(true);
      setConversionType("toText");
      // Default code with just forever block (on_start generates inline code, so empty = nothing)
      let defaultCode = `def on_forever():\n    pass\nbasic.forever(on_forever)\n`;
      if (workspaceRef.current && bidirectionalConverter) {
        try {
          try { pythonGenerator.init(workspaceRef.current); } catch (e) { }
          const code = bidirectionalConverter.blocksToPython();
          // If code is empty, use default template
          const codeToSet = code && code.trim().length > 0 ? code : defaultCode;
          setLocalCode(codeToSet);
          setControllerCodeMap(prev => ({ ...prev, [activeControllerId!]: codeToSet }));
          textBaselineRef.current = (codeToSet ?? "");
          textModifiedRef.current = false;
          // Ensure editor mode is set after code is updated
          setTimeout(() => {
            setEditorMode(newMode);
            setIsConverting(false);
            setConversionType(null);
          }, 0);
          return;
        } catch (e) { }
      }
      if (!workspaceRef.current) {
        // If localCode is empty, use default template
        const codeToSet = localCode && localCode.trim().length > 0 ? localCode : defaultCode;
        setLocalCode(codeToSet);
        textBaselineRef.current = (codeToSet ?? "");
        textModifiedRef.current = false;
      }
      setEditorMode(newMode);
      setTimeout(() => { setIsConverting(false); setConversionType(null); }, 300);
    }
  };

  const confirmSwitchToBlock = () => {
    if (workspaceRef.current) {
        try { workspaceRef.current.dispose(); } catch(_) {}
        workspaceRef.current = null;
    }
    setWorkspaceReady(false);
    setControllerCodeMap(prev => ({ ...prev, [activeControllerId!]: "" }));
    setLocalCode("");
    setShowCodePalette(false); // Hide code snippets window when confirming block mode
    setEditorMode("block");
    setShowBlockModeConfirm(false);
  };

  const handleCodeInsert = (code: string) => {
    const newCode = handleCodeInsertLogic(code, localCode);
    handleCodeChange(newCode);
  };

  // Flash progress callback
  const handleFlashProgress = useCallback((progress: FlashProgress) => {
    setFlashProgress(progress);
    if (progress.stage === 'complete') {
      setFlashStatus('success');
      setTimeout(() => {
        setShowFlashModal(false);
        setFlashStatus('idle');
        setFlashProgress(null);
      }, 2000);
    } else if (progress.stage === 'error') {
      // Check if user cancelled - close modal silently
      if (progress.message?.toLowerCase().includes('cancelled') || 
          progress.message?.toLowerCase().includes('canceled')) {
        setTimeout(() => {
          setShowFlashModal(false);
          setFlashStatus('idle');
          setFlashProgress(null);
        }, 500);
      } else {
        setFlashStatus('error');
      }
    }
  }, []);

  // Get the current code to flash (from localCode which is synced with controllerCodeMap)
  const getCurrentCodeForFlash = useCallback(() => {
    // Use localCode which holds the current state
    return localCode || '';
  }, [localCode]);

  // Handle download HEX file
  const handleDownloadHex = useCallback(async () => {
    if (!sharedFlasher) {
      console.warn('No shared flasher available');
      return;
    }
    const code = getCurrentCodeForFlash();
    if (!code.trim()) {
      alert('No code to download. Please add some code first.');
      return;
    }
    try {
      await sharedFlasher.downloadHex(code);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      alert(`Failed to download HEX file: ${errorMessage}`);
    }
  }, [getCurrentCodeForFlash, sharedFlasher]);

  // Handle flash to micro:bit using WebUSB
  const handleFlashToMicrobit = useCallback(async () => {
    if (!sharedFlasher) {
      console.warn('No shared flasher available');
      return;
    }
    if (isFlashing) return;
    
    const code = getCurrentCodeForFlash();
    if (!code.trim()) {
      alert('No code to flash. Please add some code first.');
      return;
    }
    
    setIsFlashing(true);
    onFlashingChange?.(true);
    setFlashStatus('idle');
    setShowFlashModal(true);
    setFlashProgress({ stage: 'connecting', progress: 0, message: 'Connecting to micro:bit...' });
    
    try {
      const success = await sharedFlasher.flash(code, handleFlashProgress);
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
      onFlashingChange?.(false);
    }
  }, [isFlashing, getCurrentCodeForFlash, handleFlashProgress, flashProgress, sharedFlasher, onFlashingChange]);

  // Close flash modal
  const handleCloseFlashModal = useCallback(() => {
    if (!isFlashing) {
      setShowFlashModal(false);
      setFlashProgress(null);
      setFlashStatus('idle');
    }
  }, [isFlashing]);

  // Handle connect to micro:bit
  const handleConnectMicrobit = useCallback(async () => {
    if (!sharedFlasher) {
      console.warn('No shared flasher available');
      return;
    }
    try {
      const success = await sharedFlasher.connect();
      if (!success) {
        console.log('Connection cancelled or failed');
      }
    } catch (error) {
      console.error('Failed to connect to micro:bit:', error);
    }
  }, [sharedFlasher]);

  // Handle disconnect from micro:bit
  const handleDisconnectMicrobit = useCallback(async () => {
    if (!sharedFlasher) {
      console.warn('No shared flasher available');
      return;
    }
    try {
      await sharedFlasher.disconnect();
    } catch (error) {
      console.error('Failed to disconnect from micro:bit:', error);
    }
  }, [sharedFlasher]);

  // Expose flash functionality to parent via ref
  useEffect(() => {
    if (onFlashRef) {
      onFlashRef.current = {
        handleDownloadHex,
        handleFlashToMicrobit,
        handleConnectMicrobit,
        handleDisconnectMicrobit,
        isFlashing,
        isWebUSBSupported,
        microbitConnectionStatus: sharedFlasher?.getConnectionStatus() || 'disconnected',
        microbitDeviceInfo: sharedFlasher?.getDeviceInfo(),
        hasActiveController: !!activeControllerId,
      };
    }
  }, [onFlashRef, handleDownloadHex, handleFlashToMicrobit, handleConnectMicrobit, handleDisconnectMicrobit, isFlashing, isWebUSBSupported, sharedFlasher, activeControllerId]);

  return (
    <div
      ref={resizeRef}
      className="flex flex-col bg-gradient-to-br from-white to-slate-50 rounded-2xl shadow-2xl overflow-hidden relative border-2 border-gray-200/50 backdrop-blur-sm"
      style={{
        width: editorSize.width,
        height: editorSize.height,
        minWidth: "300px",
        minHeight: "200px",
      }}
    >
      <div className="absolute top-0 right-0 bottom-0 w-1 cursor-ew-resize z-50" onMouseDown={(e) => handleResizeStart(e, "right")} />
      <div className="absolute bottom-0 left-0 right-0 h-1 cursor-ns-resize z-50" onMouseDown={(e) => handleResizeStart(e, "bottom")} />
      <div className="absolute top-0 left-0 bottom-0 w-1 cursor-ew-resize z-50" onMouseDown={(e) => handleResizeStart(e, "left")} />
      <div className="absolute bottom-0 left-0 w-4 h-4 cursor-nesw-resize z-50" onMouseDown={(e) => handleResizeStart(e, "corner-bottom-left")} />
      <div className="absolute bottom-0 right-0 w-4 h-4 cursor-nwse-resize z-50" onMouseDown={(e) => handleResizeStart(e, "corner-bottom-right")} />

      <SearchPalettePane
        showCodePalette={showCodePalette}
        setShowCodePalette={setShowCodePalette}
        onCodeInsert={handleCodeInsert}
      />

      {/* Always show header so the dropdown is available even if none active */}
      <EditorHeader
        editorMode={editorMode}
        showCodePalette={showCodePalette}
        isConverting={isConverting}
        setShowCodePalette={setShowCodePalette}
        handleModeChange={handleModeChange}
        toolboxSearch={toolboxSearch}
        setToolboxSearch={setToolboxSearch}
        onToolboxSearch={onToolboxSearch}
        onClose={onClose}
        controllers={controllers}
        activeControllerId={activeControllerId}
        blockModeLockout={blockModeLockout}
        onSelectController={(id) => {
          if (onSelectController) onSelectController(id);
        }}
      />

      {!activeControllerId && controllers.length === 0 ? (
        <div className="flex flex-1 items-center justify-center text-gray-500 font-medium bg-gray-50">
          No programmable components in this circuit
        </div>
      ) : (
        <>

          {validationError && (
            <ValidationError
              validationError={validationError}
              showCodePalette={showCodePalette}
              onDismiss={() => setValidationError(null)}
            />
          )}

          <div
            className="flex-1 overflow-hidden bg-white relative"
            style={{
              marginLeft: showCodePalette ? "320px" : "0px",
              transition: "margin-left 300ms",
            }}
          >
            {showBlockModeConfirm && (
              <BlockModeConfirmModal
                onConfirm={() => {
                  // If text was modified, we hard reset; otherwise normal switch
                  setShowBlockModeConfirm(false);
                  if (textModifiedRef.current) {
                    hardResetToBlocks();
                  } else {
                    confirmSwitchToBlock();
                  }
                }}
                onCancel={() => setShowBlockModeConfirm(false)}
                title={textModifiedRef.current ? "Switching to Blocks will reset workspace" : "Clear and Switch to Block Mode?"}
                description={textModifiedRef.current ? "Detected modifications in Python text mode. Switching back to Block mode will <strong>reset the block editor to default</strong> and discard current text-based changes." : "Enabling the blocks editor will <strong>clear any code</strong> you have in the text editor and start fresh. This action cannot be undone."}
                warningTitle={textModifiedRef.current ? "Text Changes Detected" : "Warning"}
                warningDetail={textModifiedRef.current ? "Because the Python code was modified, the Block editor cannot be reconstructed reliably and will start fresh (empty)." : "All your current Python code will be permanently deleted. Make sure to capture important code before continuing."}
                confirmLabel={textModifiedRef.current ? "Continue & Reset Blocks" : "Continue & Clear"}
              />
            )}
            {isConverting && <LoadingOverlay conversionType={conversionType} />}

            {editorMode === "text" ? (
              <CodeEditorPane code={localCode} onChange={handleCodeChange} isSimulationOn={isSimulationOn} />
            ) : (
              <BlockEditorPane blocklyRef={blocklyRef} />
            )}
          </div>
        </>
      )}

      {/* Flash Modal */}
      {showFlashModal && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
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