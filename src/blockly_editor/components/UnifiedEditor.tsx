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

type EditorMode = "block" | "text";

// Moved to BlockEditorPane

interface UnifiedEditorProps {
  controllerCodeMap: Record<string, string>;
  activeControllerId: string | null;
  setControllerCodeMap: React.Dispatch<
    React.SetStateAction<Record<string, string>>
  >;
  stopSimulation: () => void;
  onSizeChange?: (size: { width: number; height: number }) => void;
  onClose?: () => void;
  controllers?: Array<{ id: string; label: string }>;
  onSelectController?: (id: string) => void;
  onResetRef?: React.MutableRefObject<(() => void) | null>; // Ref to expose reset functionality
  isSimulationOn?: boolean; // Disable editing when simulation is running
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
}: UnifiedEditorProps) {
  const EDITOR_MODE_STORAGE_KEY = "moontinker_lastEditorMode";
  const CONTROLLER_MODE_MAP_KEY = "moontinker_controllerEditorModeMap";
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
  // Load controllerXmlMap from localStorage on mount
  const [controllerXmlMap, setControllerXmlMap] = useState<Record<string, string>>(() => {
    if (typeof window !== 'undefined') {
      try {
        const raw = localStorage.getItem('moontinker_controllerXmlMap');
        if (raw) return JSON.parse(raw);
      } catch {}
    }
    return {};
  });
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

  useEffect(() => {
    activeControllerIdRef.current = activeControllerId;
  }, [activeControllerId]);

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
      // Save XML for the current controller
      if (!controllerId) controllerId = activeControllerId ?? undefined;
      if (controllerId && workspaceRef.current) {
        const xml = Blockly.Xml.workspaceToDom(workspaceRef.current);
        setControllerXmlMap(prev => {
          const updated = { ...prev, [controllerId!]: Blockly.Xml.domToText(xml) };
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
      if (!controllerId) controllerId = activeControllerId ?? undefined;
      if (controllerId && controllerXmlMap[controllerId] && workspaceRef.current) {
        try {
          // Parse XML string to DOM using DOMParser
          const parser = new DOMParser();
          const dom = parser.parseFromString(controllerXmlMap[controllerId], "text/xml");
          const xml = dom.documentElement;
          Blockly.Xml.domToWorkspace(xml, workspaceRef.current);
          return true;
        } catch (e) { return false; }
      }
      return false;
    },
    stopSimulationRef,
    setIsConverting,
    setConversionType,
    isSwitchingControllerRef,
  });

  // Persist controllerXmlMap to localStorage whenever it changes
  useEffect(() => {
    try {
      localStorage.setItem('moontinker_controllerXmlMap', JSON.stringify(controllerXmlMap));
    } catch {}
  }, [controllerXmlMap]);

  // XML operation helpers
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
      // Fallback: DOMParser
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
      // Fallback: XMLSerializer
      try {
        return new XMLSerializer().serializeToString(el);
      } catch (e) {
        throw e;
      }
    },
  });

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

  useEffect(() => {
    controllerXmlMapRef.current = controllerXmlMap;
  }, [controllerXmlMap]);

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
      initializeWorkspace();
    };
    attemptInit();
    return () => { isMounted = false; };
  }, [editorMode, activeControllerId]);

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
      if (workspaceRef.current && bidirectionalConverter) {
        try {
          try { pythonGenerator.init(workspaceRef.current); } catch (e) { }
          const code = bidirectionalConverter.blocksToPython();
          setLocalCode(code);
          setControllerCodeMap(prev => ({ ...prev, [activeControllerId!]: code }));
          textBaselineRef.current = (code ?? "");
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
        textBaselineRef.current = (localCode ?? "");
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
    </div>
  );
}