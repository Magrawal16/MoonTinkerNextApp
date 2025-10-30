/**
 * UnifiedEditor - A single editor component that switches between Block and Text modes
 *
 * This component provides:
 * 1. A slider selector to switch between "Block" and "Text" modes
 * 2. Automatic conversion between Python code and Blockly blocks
 * 3. Seamless user experience with preserved code content
 * 4. Integration with the circuit canvas controller system
 */

import React, { useState, useEffect, useRef, useCallback } from "react";
import * as Blockly from "blockly";
import { pythonGenerator } from "blockly/python";
import { FaArrowRight } from "react-icons/fa";
import {
  BlocklyPythonIntegration,
  BidirectionalConverter,
} from "@/blockly_editor/utils/blocklyPythonConvertor";
import CodeEditor from "@/python_code_editor/components/PythonCodeEditor";
import { createToolboxXmlFromBlocks } from "../utils/sharedBlockDefinitions";
import PythonCodePalette from "./PythonCodeBlockSnippetPalette";

type EditorMode = "block" | "text";

interface UnifiedEditorProps {
  controllerCodeMap: Record<string, string>;
  activeControllerId: string | null;
  setControllerCodeMap: React.Dispatch<
    React.SetStateAction<Record<string, string>>
  >;
  stopSimulation: () => void;
}

export default function UnifiedEditor({
  controllerCodeMap,
  activeControllerId,
  setControllerCodeMap,
  stopSimulation,
}: UnifiedEditorProps) {
  // State management - Load persisted editor mode from localStorage
  const [editorMode, setEditorMode] = useState<EditorMode>(() => {
    if (typeof window !== 'undefined') {
      const savedMode = localStorage.getItem('editorMode');
      return (savedMode === 'block' || savedMode === 'text') ? savedMode : 'text';
    }
    return 'text';
  });
  const [bidirectionalConverter, setBidirectionalConverter] =
    useState<BidirectionalConverter | null>(null);
  const [isUpdatingFromBlocks, setIsUpdatingFromBlocks] = useState(false);
  const [isUpdatingFromCode, setIsUpdatingFromCode] = useState(false);
  const [workspaceReady, setWorkspaceReady] = useState(false);
  const [localCode, setLocalCode] = useState<string>(""); // Local state for code editing
  const [validationError, setValidationError] = useState<string | null>(null); // Validation error state
  const [isConverting, setIsConverting] = useState(false); // Loading state for conversions
  const [conversionType, setConversionType] = useState<
    "toBlocks" | "toText" | null
  >(null); // Type of conversion happening
  // Confirmation modal when switching to blocks (clears text)
  const [showBlockModeConfirm, setShowBlockModeConfirm] = useState(false);

  // State for blocks palette
  const [showCodePalette, setShowCodePalette] = useState(false);

  // Hide code palette when no controller is selected
  useEffect(() => {
    if (!activeControllerId) {
      setShowCodePalette(false);
    }
  }, [activeControllerId]);

  // Refs
  const blocklyRef = useRef<HTMLDivElement>(null);
  const workspaceRef = useRef<Blockly.Workspace | null>(null);
  const mountedRef = useRef(false);
  const lastCodeRef = useRef<string>("");
  const debounceTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const prevControllerRef = useRef<string | null>(activeControllerId);
  const localCodeRef = useRef<string>("");
  const prevEditorModeRef = useRef<EditorMode>(editorMode);
  
  // Always call the latest stopSimulation from async listeners
  const stopSimulationRef = useRef(stopSimulation);
  useEffect(() => {
    stopSimulationRef.current = stopSimulation;
  }, [stopSimulation]);

  // Get current code
  let currentCode = controllerCodeMap[activeControllerId ?? ""] ?? "";

  // Update local code when controller changes or when blocks update the code
  useEffect(() => {
    if (!isUpdatingFromBlocks) {
      setLocalCode(currentCode);
    }
    localCodeRef.current = currentCode;
  }, [currentCode, activeControllerId, isUpdatingFromBlocks]);

  // Persist editor mode to localStorage whenever it changes
  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('editorMode', editorMode);
    }
  }, [editorMode]);

  // Reload blocks when switching back to block mode or when controller changes in block mode
  useEffect(() => {
    const prevMode = prevEditorModeRef.current;
    const prevController = prevControllerRef.current;
    
    if (
      editorMode === "block" &&
      activeControllerId &&
      workspaceReady &&
      bidirectionalConverter &&
      !isUpdatingFromBlocks &&
      !isUpdatingFromCode &&
      !isConverting
    ) {
      const currentCode = controllerCodeMap[activeControllerId] || "";
      
      // Check if we're reopening (mode switched to block or controller changed while in block mode)
      const isReopening = 
        (prevMode !== "block" && editorMode === "block") || // Switched to block mode
        (prevController !== activeControllerId && activeControllerId); // Controller changed
      
      if (isReopening && currentCode.trim()) {
        ("🔄 Reloading blocks from saved code...");
        setIsUpdatingFromCode(true);
        try {
          workspaceRef.current?.clear();
          bidirectionalConverter.pythonToBlocks(currentCode);
          lastCodeRef.current = currentCode;
        } catch (error) {
          console.warn("⚠️ Could not reload blocks:", error);
        } finally {
          setTimeout(() => setIsUpdatingFromCode(false), 100);
        }
      }
    }

    // Update refs for next comparison
    prevEditorModeRef.current = editorMode;
  }, [
    editorMode,
    activeControllerId,
    workspaceReady,
    bidirectionalConverter,
    controllerCodeMap,
    isUpdatingFromBlocks,
    isUpdatingFromCode,
    isConverting,
  ]);

  // Save any pending changes when switching controllers
  useEffect(() => {
    const prevController = prevControllerRef.current;

    // If controller changed and we have a previous controller with pending changes
    if (prevController && prevController !== activeControllerId) {
      if (
        debounceTimeoutRef.current &&
        localCode !== controllerCodeMap[prevController]
      ) {
        clearTimeout(debounceTimeoutRef.current);
        debounceTimeoutRef.current = null;

        // Immediately save changes for the previous controller
        setControllerCodeMap((prev) => ({
          ...prev,
          [prevController]: localCode,
        }));
      }

      // Clear Blockly focus when controller changes (but keep the blocks)
      if (workspaceRef.current && editorMode === "block") {
        try {
          Blockly.getSelected()?.unselect();
        } catch (error) {
          console.warn("⚠️ Error clearing focus on controller change:", error);
        }
      }
    }

    prevControllerRef.current = activeControllerId;
  }, [activeControllerId, localCode, controllerCodeMap, editorMode]);

  /**
   * Initialize Blockly workspace with proper error handling
   */
  const initializeWorkspace = useCallback(() => {
    if (!blocklyRef.current) {
      ("⚠️ Skipping initialization - no container element");
      return;
    }

    // If workspace already exists and is healthy, don't reinitialize
    if (workspaceRef.current && workspaceRef.current.rendered) {
      ("✅ Workspace already exists and is rendered");
      setWorkspaceReady(true);
      return;
    }

    // Clean up existing workspace if it exists but isn't healthy
    if (workspaceRef.current) {
      ("🧹 Cleaning up existing workspace before reinitializing");
      try {
        workspaceRef.current.dispose();
      } catch (error) {
        console.warn("⚠️ Error disposing workspace:", error);
      }
      workspaceRef.current = null;
      setWorkspaceReady(false);
    }

    ("🚀 Initializing Blockly workspace...");

    try {
      // Step 1: Initialize block definitions
      BlocklyPythonIntegration.initialize();
      BlocklyPythonIntegration.setupPythonGenerators(pythonGenerator);

      // Step 2: Create workspace with simple toolbox
      const workspace = Blockly.inject(blocklyRef.current, {
        toolbox: createSimpleToolbox(),
        trashcan: true,
        scrollbars: true,
        zoom: {
          controls: true,
          wheel: true,
        },
      });

      if (!workspace) {
        throw new Error("Workspace creation failed - returned null/undefined");
      }

      workspaceRef.current = workspace;

      // --- Runtime enable/disable rules for LED statement blocks ---
      const LED_STATEMENT_BLOCKS = new Set<string>([
        "plot_led",
        "unplot_led",
        "toggle_led",
        "plot_led_brightness",
        "show_leds",
      ]);
      const EVENT_CONTAINER_BLOCKS = new Set<string>([
        "forever",
        "on_start",
        "on_button_pressed",
      ]);

      const disabledTooltip =
        "This block is disabled and will not run. Attach this block to an event to enable it.";

      const updateLedBlockRunState = (blk: Blockly.Block | null | undefined) => {
        if (!blk) return;
        if (!LED_STATEMENT_BLOCKS.has(blk.type)) return;
        const root = blk.getRootBlock();
        const enabled = !!root && EVENT_CONTAINER_BLOCKS.has(root.type);
        try {
          // Force the true disabled state so Blockly applies the faded style and behavior
          const anyBlk: any = blk as any;
          if (typeof anyBlk.setEnabled === "function") {
            anyBlk.setEnabled(enabled);
          } else if (typeof anyBlk.setDisabled === "function") {
            anyBlk.setDisabled(!enabled);
          }
          // Ask Blockly to recompute disabled rendering if API exists
          if (typeof anyBlk.updateDisabled === "function") {
            anyBlk.updateDisabled();
          }
          if (typeof anyBlk.render === "function") {
            anyBlk.render();
          }
          // Ensure SVG reflects state immediately (some themes require the class toggle)
          if (typeof anyBlk.getSvgRoot === "function") {
            const svg = anyBlk.getSvgRoot();
            if (svg && svg.classList) {
              svg.classList.toggle("blocklyDisabled", !enabled);
            }
          }
        } catch (_) {}
        try {
          if (!enabled) {
            blk.setTooltip(disabledTooltip);
          } else {
            const defaultTooltips: Record<string, string> = {
              plot_led: "Turn on LED at (x, y)",
              unplot_led: "Turn off LED at (x, y)",
              toggle_led: "Toggle LED at (x, y)",
              plot_led_brightness: "Plot an LED at (x,y) with brightness 0-255",
              show_leds: "Display pattern on LEDs",
            };
            blk.setTooltip(defaultTooltips[blk.type] || "");
          }
        } catch (_) {}
      };

      const updateAllLedBlockStates = () => {
        try {
          const all = workspaceRef.current?.getAllBlocks(false) || [];
          (all as any[]).forEach((b) => updateLedBlockRunState(b as any));
        } catch (_) {}
      };

      // Step 3: Create converter
      const converter = new BidirectionalConverter(workspace, pythonGenerator);
      setBidirectionalConverter(converter);

      // Step 4: Set up change listener for blocks → Python conversion
      ("🔧 Step 4: Setting up change listener...");

      let conversionTimeout: NodeJS.Timeout | null = null;

      const changeListener = (event: any) => {
        // Don't react while we're programmatically updating blocks from code
        if (isUpdatingFromCode) return;

        // Skip explicit UI-only events (clicks, selection, viewport/theme changes)
        if (
          event.type === (Blockly as any).Events.VIEWPORT_CHANGE ||
          event.type === (Blockly as any).Events.THEME_CHANGE ||
          event.type === (Blockly as any).Events.CLICK ||
          event.type === (Blockly as any).Events.SELECTED
        ) {
          return;
        }

        // Determine if this event actually affects generated code
        const isCreate =
          event.type === (Blockly as any).Events.BLOCK_CREATE ||
          event.type === (Blockly as any).Events.CREATE;
        const isDelete =
          event.type === (Blockly as any).Events.BLOCK_DELETE ||
          event.type === (Blockly as any).Events.DELETE;
        const isChange =
          event.type === (Blockly as any).Events.BLOCK_CHANGE ||
          event.type === (Blockly as any).Events.CHANGE;
        const isMove =
          event.type === (Blockly as any).Events.BLOCK_MOVE ||
          event.type === (Blockly as any).Events.MOVE;

        let affectsCode = false;
        if (isCreate || isDelete) {
          affectsCode = true; // Adding/removing blocks always affects code
        } else if (isChange) {
          const e: any = event;
          // Stop for field value or mutation changes; ignore UI-ish ones
          affectsCode =
            e?.element === "field" ||
            e?.element === "mutation" ||
            e?.element === "disabled"; // disabled can change emitted code
        } else if (isMove) {
          const e: any = event;
          // Only stop if the parent/input connection changed (affects code order/structure)
          const parentChanged = e?.oldParentId !== e?.newParentId;
          const inputChanged = e?.oldInputName !== e?.newInputName;
          affectsCode = Boolean(parentChanged || inputChanged);
        }

        // Update LED enable/disable visuals on any structural event
        try {
          let blocksToUpdate: Blockly.Block[] = [];
          const w = workspaceRef.current;
          if (!w) {
            // no workspace
          } else if ((event as any).blockId) {
            const b = w.getBlockById((event as any).blockId);
            if (b) blocksToUpdate.push(b);
          } else if ((event as any).ids && Array.isArray((event as any).ids)) {
            // e.g., BLOCK_CREATE provides an array of ids
            for (const id of (event as any).ids) {
              const b = w.getBlockById(id);
              if (b) blocksToUpdate.push(b);
            }
          }

          if (blocksToUpdate.length > 0) {
            for (const b of blocksToUpdate) {
              updateLedBlockRunState(b);
              const root = b.getRootBlock();
              if (root) {
                const descendants = root.getDescendants(false) || [];
                (descendants as any[]).forEach((d) => updateLedBlockRunState(d as any));
              }
            }
          } else {
            updateAllLedBlockStates();
          }
        } catch (_) {}

        if (affectsCode) {
          try {
            stopSimulationRef.current?.();
          } catch (_) {
            // ignore
          }
        }

        // Clear existing timeout to debounce rapid changes
        if (conversionTimeout) {
          clearTimeout(conversionTimeout);
        }

        // Debounced block-to-code conversion with longer delay for better performance
        conversionTimeout = setTimeout(() => {
          if (converter && activeControllerId && !isUpdatingFromBlocks) {
            try {
              // Reduced logging for better performance
              setIsUpdatingFromBlocks(true);

              const generatedCode = converter.blocksToPython();
              // Only update if code actually changed
              if (generatedCode !== lastCodeRef.current) {
                setControllerCodeMap((prev) => ({
                  ...prev,
                  [activeControllerId]: generatedCode,
                }));

                lastCodeRef.current = generatedCode;
                // stopSimulation already called above for structural events; keep here for completeness
                stopSimulationRef.current?.();
              }
            } catch (error) {
              console.error("❌ Error in change listener conversion:", error);
            } finally {
              setIsUpdatingFromBlocks(false);
            }
          }
        }, 300); // Increased debounce time from 100ms to 300ms
      };

      workspace.addChangeListener(changeListener);
      // Store reference to remove listener later
      (workspace as any).changeListener = changeListener;

      // Step 5: Mark as ready
      setWorkspaceReady(true);
      ("🎉 Workspace initialization complete!");

      // Step 6: Convert current code to blocks if we have code
      setTimeout(() => {
        const currentCode = localCodeRef.current;
        if (workspace && currentCode.trim() && converter) {
          ("hello world!!!");
          try {
            converter.pythonToBlocks(currentCode);
            lastCodeRef.current = currentCode;
          } catch (error) {
            console.warn("⚠️ Could not convert code to blocks:", error);
          }
        } else if (workspace && !currentCode.trim()) {
          // Add test block if no code exists
          try {
            const block = workspace.newBlock("show_string");
            block.setFieldValue("Hello World!", "TEXT");

            if (workspace.rendered) {
              (block as any).initSvg();
              (block as any).render();
              block.moveBy(20, 20);
            }
          } catch (error) {
            console.warn("⚠️ Could not add test block:", error);
          }
        }

        // Clear loading state after workspace is fully initialized
        setTimeout(() => {
          setIsConverting(false);
          setConversionType(null);
          updateAllLedBlockStates();
        }, 200);
      }, 500);
    } catch (error) {
      console.error("❌ Failed to initialize workspace:", error);
      console.error(
        "❌ Error stack:",
        error instanceof Error ? error.stack : "No stack trace"
      );
      // Try to set ready anyway in case of non-critical errors
      setWorkspaceReady(true);

      // Clear loading state on error
      setIsConverting(false);
      setConversionType(null);
    }
  }, [currentCode, isUpdatingFromCode]);

  /**
   * Mount effect - initialize workspace when component mounts
   */
  useEffect(() => {
    if (mountedRef.current) return;
    mountedRef.current = true;

    // Check container readiness and initialize
    const checkAndInitialize = () => {
      if (!blocklyRef.current) {
        setTimeout(checkAndInitialize, 100);
        return;
      }

      const dimensions = {
        width: blocklyRef.current.offsetWidth,
        height: blocklyRef.current.offsetHeight,
      };

      // If container has no dimensions, wait and retry
      if (dimensions.width === 0 || dimensions.height === 0) {
        setTimeout(checkAndInitialize, 100);
        return;
      }

      // Container is ready, initialize
      initializeWorkspace();
    };

    // Start checking
    setTimeout(checkAndInitialize, 50);

    return () => {
      // Flush any pending changes before unmounting
      if (
        debounceTimeoutRef.current &&
        activeControllerId &&
        localCode !== currentCode
      ) {
        clearTimeout(debounceTimeoutRef.current);
        setControllerCodeMap((prev) => ({
          ...prev,
          [activeControllerId]: localCode,
        }));
      }

      // Clear focus state before disposing workspace
      if (workspaceRef.current) {
        try {
          Blockly.getSelected()?.unselect();
          workspaceRef.current.clearUndo();
          // Remove change listener if it exists
          if ((workspaceRef.current as any).changeListener) {
            workspaceRef.current.removeChangeListener(
              (workspaceRef.current as any).changeListener
            );
            delete (workspaceRef.current as any).changeListener;
          }
        } catch (error) {
          console.warn("⚠️ Error clearing workspace state during cleanup:", error);
        }
        
        try {
          workspaceRef.current.dispose();
        } catch (error) {
          console.warn("⚠️ Error disposing workspace during cleanup:", error);
        }
        workspaceRef.current = null;
      }
      
      // Clean up debounce timeout
      if (debounceTimeoutRef.current) {
        clearTimeout(debounceTimeoutRef.current);
      }
    };
  }, [initializeWorkspace]);

  /**
   * Safety timeout to prevent loading state from getting stuck
   */
  useEffect(() => {
    if (isConverting) {
      const timeout = setTimeout(() => {
        console.warn("⚠️ Conversion taking too long, clearing loading state");
        setIsConverting(false);
        setConversionType(null);
      }, 10000); // 10 second timeout

      return () => clearTimeout(timeout);
    }
  }, [isConverting]);

  /**
   * Handle blocks to code conversion
   */
  const handleBlocksToCode = useCallback(() => {
    if (
      !bidirectionalConverter ||
      !activeControllerId ||
      isUpdatingFromBlocks ||
      editorMode !== "block" // Only convert if we're in block mode
    ) {
      ("⚠️ Skipping blocks to code conversion - conditions not met");
      return;
    }

    setIsUpdatingFromBlocks(true);
    try {
      const generatedCode = bidirectionalConverter.blocksToPython();

      // Only update if the code actually changed
      if (generatedCode !== lastCodeRef.current) {
        lastCodeRef.current = generatedCode;

        setControllerCodeMap((prev) => ({
          ...prev,
          [activeControllerId]: generatedCode,
        }));

        stopSimulationRef.current?.();
      } else {
        ("⚡ Code unchanged, skipping update");
      }
    } catch (error) {
      console.error("❌ Error converting blocks to code:", error);
    } finally {
      setIsUpdatingFromBlocks(false);
    }
  }, [
    bidirectionalConverter,
    activeControllerId,
    setControllerCodeMap,
    stopSimulation,
    isUpdatingFromBlocks,
    editorMode,
  ]);

  /**
   * Convert Python code to blocks when switching to block mode
   */
  const convertCodeToBlocks = useCallback(() => {
    if (!bidirectionalConverter || !workspaceReady || isUpdatingFromBlocks)
      return;

    setIsConverting(true);
    setConversionType("toBlocks");
    setIsUpdatingFromCode(true);

    try {
      // Clear any existing focus/selection before clearing workspace
      try {
        if (workspaceRef.current) {
          Blockly.getSelected()?.unselect();
          // Clear all event listeners temporarily
          workspaceRef.current.clearUndo();
        }
      } catch (e) {
        console.warn("⚠️ Error clearing focus before conversion:", e);
      }

      // Clear workspace
      workspaceRef.current?.clear();

      // Use the most current code (localCode if it exists and differs, otherwise currentCode)
      const codeToConvert = localCode !== currentCode ? localCode : currentCode;

      // Validate code before conversion (additional safety check)
      const validation =
        bidirectionalConverter.validatePythonCode(codeToConvert);
      if (!validation.isValid) {
        console.error(
          "❌ Code validation failed during conversion:",
          validation.errorMessage
        );
        setValidationError(
          validation.errorMessage || "Code cannot be converted to blocks"
        );
        // Switch back to text mode if conversion fails
        setEditorMode("text");
        return;
      }

      // Convert code to blocks
      bidirectionalConverter.pythonToBlocks(codeToConvert);
      lastCodeRef.current = codeToConvert;

      // Clear any validation errors on successful conversion
      setValidationError(null);
    } catch (error) {
      console.error("Error converting Python to blocks:", error);
      // Set error message and switch back to text mode
      const errorMessage =
        error instanceof Error
          ? error.message
          : "Unknown error during conversion";
      setValidationError(errorMessage);
      setEditorMode("text");
    } finally {
      setTimeout(() => {
        setIsUpdatingFromCode(false);
        setIsConverting(false);
        setConversionType(null);
      }, 300); // Add a small delay to ensure smooth transition
    }
  }, [
    bidirectionalConverter,
    workspaceReady,
    currentCode,
    localCode,
    isUpdatingFromBlocks,
  ]);

  /**
   * Handle Python code changes in text mode with debouncing
   */
  const handleCodeChange = useCallback(
    (newCode: string) => {
      if (!activeControllerId || isUpdatingFromBlocks) return;

      // Update local state immediately for responsive UI
      setLocalCode(newCode);

      // Clear validation errors when user starts editing
      if (validationError) {
        setValidationError(null);
      }

      // Clear existing timeout
      if (debounceTimeoutRef.current) {
        clearTimeout(debounceTimeoutRef.current);
      }

      // Debounce the actual controller code map update and simulation stop
      debounceTimeoutRef.current = setTimeout(() => {
        if (newCode !== currentCode) {
          setControllerCodeMap((prev) => ({
            ...prev,
            [activeControllerId]: newCode,
          }));
          stopSimulation();
          lastCodeRef.current = newCode;
        }
      }, 1000); // Wait 1 second after user stops typing
    },
    [
      activeControllerId,
      setControllerCodeMap,
      stopSimulation,
      isUpdatingFromBlocks,
      currentCode,
      validationError,
    ]
  );

  /**
   * Immediately save any pending changes in localCode
   */
  const flushPendingChanges = useCallback(() => {
    if (debounceTimeoutRef.current) {
      clearTimeout(debounceTimeoutRef.current);
      debounceTimeoutRef.current = null;
    }

    if (activeControllerId && localCode !== currentCode) {
      setControllerCodeMap((prev) => ({
        ...prev,
        [activeControllerId]: localCode,
      }));
      lastCodeRef.current = localCode;
      return localCode; // Return the saved code
    }
    return currentCode; // Return current code if no changes
  }, [activeControllerId, localCode, currentCode, setControllerCodeMap]);

  /**
   * Handle mode switch with conversion
   */
  const handleModeChange = (newMode: EditorMode) => {
    if (newMode === editorMode) return;

    // Clear any existing validation errors
    setValidationError(null);

    // First, flush any pending changes to avoid losing work
    const latestCode = flushPendingChanges();

    if (newMode === "block") {
      // New behavior: don't convert text to blocks. Ask user for confirmation
      // that switching to blocks will clear text code, then show default blocks.
      setShowBlockModeConfirm(true);
      return;
    } else {
      // Converting to text mode - convert blocks to Python code first
      ("🔄 Switching to text mode - converting blocks to code...");

      // Set loading state for conversion to text
      setIsConverting(true);
      setConversionType("toText");

      // Clear any Blockly selection/focus before converting
      try {
        if (workspaceRef.current) {
          Blockly.getSelected()?.unselect();
        }
      } catch (error) {
        console.warn("⚠️ Error clearing Blockly selection:", error);
      }

      // Convert blocks to code before switching modes
      if (bidirectionalConverter && activeControllerId && workspaceReady) {
        try {
          const generatedCode = bidirectionalConverter.blocksToPython();
          // Update both the controller code map and local code
          setControllerCodeMap((prev) => ({
            ...prev,
            [activeControllerId]: generatedCode,
          }));
          setLocalCode(generatedCode);

          lastCodeRef.current = generatedCode;
          stopSimulationRef.current?.();
        } catch (error) {
          console.error(
            "❌ Error converting blocks to code during mode switch:",
            error
          );
        }
      }

      // Switch to text mode
      setEditorMode(newMode);

      // Clear loading state after a brief delay
      setTimeout(() => {
        setIsConverting(false);
        setConversionType(null);
      }, 300);
    }
  };

  // Confirm and perform switch to Block mode clearing text
  const confirmSwitchToBlock = useCallback(() => {
    if (!activeControllerId) {
      setShowBlockModeConfirm(false);
      return;
    }
    
    // Clear any Blockly selection/focus before disposal
    try {
      if (workspaceRef.current) {
        Blockly.getSelected()?.unselect();
        // Remove all change listeners
        const workspace = workspaceRef.current;
        (workspace as any).removeChangeListener((workspace as any).changeListener);
        workspaceRef.current.clearUndo();
      }
    } catch (error) {
      console.warn("⚠️ Error clearing workspace state:", error);
    }

    // Dispose existing workspace completely
    setWorkspaceReady(false);
    if (workspaceRef.current) {
      try {
        workspaceRef.current.dispose();
      } catch (error) {
        console.warn("⚠️ Error disposing workspace during confirm switch:", error);
      }
      workspaceRef.current = null;
    }

    // Clear converter reference
    setBidirectionalConverter(null);

    // Clear code for this controller
    setControllerCodeMap((prev) => ({ ...prev, [activeControllerId]: "" }));
    setLocalCode("");
    localCodeRef.current = "";
    lastCodeRef.current = "";

    // Prepare and switch mode
    setIsConverting(true);
    setConversionType("toBlocks");
    setEditorMode("block");
    setValidationError(null);

    // Initialize fresh workspace after a delay to ensure DOM is ready
    setTimeout(() => {
      initializeWorkspace();
      setTimeout(() => {
        setIsConverting(false);
        setConversionType(null);
      }, 300);
    }, 150);

    setShowBlockModeConfirm(false);
  }, [activeControllerId, initializeWorkspace, setControllerCodeMap]);

  const cancelSwitchToBlock = useCallback(() => {
    setShowBlockModeConfirm(false);
  }, []);

  // Handle workspace resize when container becomes visible
  useEffect(() => {
    if (editorMode === "block" && workspaceRef.current && workspaceReady) {
      // Small delay to ensure the container is fully visible
      const resizeTimer = setTimeout(() => {
        try {
          if (workspaceRef.current && workspaceRef.current.rendered) {
            // Clear any stale focus state before resizing
            try {
              Blockly.getSelected()?.unselect();
            } catch (e) {
              // Ignore focus clearing errors
            }

            // Use proper Blockly API for resizing
            const workspace = workspaceRef.current as any;
            if (workspace.resizeContents) {
              workspace.resizeContents();
            }

            // Trigger a refresh of the workspace display
            setTimeout(() => {
              if (workspaceRef.current) {
                try {
                  // Force a redraw using the workspace's resize method
                  const svgWorkspace = workspaceRef.current as any;
                  if (svgWorkspace.resizeContents) {
                    svgWorkspace.resizeContents();
                  }
                } catch (resizeError) {
                  console.warn("⚠️ Error in workspace refresh:", resizeError);
                }
              }
            }, 50);
          }
        } catch (error) {
          console.warn("⚠️ Error resizing workspace:", error);
        }
      }, 150);

      return () => clearTimeout(resizeTimer);
    }
  }, [editorMode, workspaceReady]);

  const handleCodeInsert = useCallback((code: string) => {
    if (!activeControllerId) return;

    // Get current code
    const currentCode = localCode;
    let newCode = currentCode;

    // Determine the category based on code content
    const isImport = code.trim().startsWith('import ') || code.trim().startsWith('from ');
    const isFunction = code.trim().startsWith('def ') || code.trim().startsWith('async def ');

    // Handle different insertion strategies based on code type
    if (isImport) {
      // Import statements should be at the top
      const lines = currentCode.split('\n');

      // Find the last import statement or the top of the file
      let lastImportIndex = -1;
      for (let i = 0; i < lines.length; i++) {
        if (lines[i].trim().startsWith('import ') || lines[i].trim().startsWith('from ')) {
          lastImportIndex = i;
        } else if (lines[i].trim().length > 0 && !lines[i].trim().startsWith('#')) {
          // Found a non-import, non-comment line - stop searching
          break;
        }
      }

      // Insert after the last import or at the beginning
      if (lastImportIndex >= 0) {
        lines.splice(lastImportIndex + 1, 0, code);
      } else {
        // No imports found, add at the top
        lines.unshift(code);
      }

      // Ensure there's a blank line after imports if there are other statements
      if (lines.length > lastImportIndex + 2 && lines[lastImportIndex + 2].trim().length > 0) {
        lines.splice(lastImportIndex + 2, 0, '');
      }

      newCode = lines.join('\n');
    } else if (isFunction) {
      // Function definitions should be at the top level, after imports
      const lines = currentCode.split('\n');
      let insertIndex = lines.length;

      // Find the end of imports and any top-level code
      for (let i = 0; i < lines.length; i++) {
        const line = lines[i].trim();
        if (line.startsWith('def ') || line.startsWith('async def ') || line.startsWith('class ')) {
          insertIndex = i;
          break;
        }
      }

      // Add a blank line before the function if needed
      if (insertIndex > 0 && lines[insertIndex - 1].trim() !== '') {
        lines.splice(insertIndex, 0, '');
        insertIndex++;
      }

      lines.splice(insertIndex, 0, code);
      newCode = lines.join('\n');
    } else {
      // For other code, just append with proper indentation
      const lines = currentCode.split('\n');
      const lastLine = lines[lines.length - 1] || '';

      // Calculate current indentation level
      const indentMatch = lastLine.match(/^(\s*)/);
      const currentIndent = indentMatch ? indentMatch[1] : '';

      // Add indentation to the new code if it's not a top-level statement
      const codeLines = code.split('\n');
      const formattedCode = codeLines.map(line => {
        // Don't add extra indentation to empty lines or comments
        if (line.trim() === '' || line.trim().startsWith('#')) return line;

        // Check if this line should be at the top level
        const isTopLevel = line.trim().startsWith('import ') ||
          line.trim().startsWith('from ') ||
          line.trim().startsWith('def ') ||
          line.trim().startsWith('async def ') ||
          line.trim().startsWith('class ') ||
          line.trim().startsWith('while ') ||
          line.trim().startsWith('for ') ||
          line.trim().startsWith('if ') ||
          line.trim().startsWith('elif ') ||
          line.trim().startsWith('else:');

        return isTopLevel ? line : currentIndent + line;
      }).join('\n');

      // Add a blank line if the current code doesn't end with one
      const separator = currentCode.trim() === '' ? '' : '\n\n';
      newCode = currentCode + separator + formattedCode;
    }

    handleCodeChange(newCode);
  }, [activeControllerId, localCode, handleCodeChange]);

  return (
    <div className="flex flex-col h-full w-full bg-white rounded-xl shadow-sm overflow-hidden relative">
      {/* Blocks Palette Panel */}
      <PythonCodePalette
        showCodePalette={showCodePalette}
        setShowCodePalette={setShowCodePalette}
        onCodeInsert={handleCodeInsert}
      />

      {!activeControllerId ? (
        <div className="flex flex-1 items-center justify-center text-gray-500 text-lg font-medium bg-gray-50">
          Please select a controller.
        </div>
      ) : (
        <>
          {/* Mode Selector Header */}
          <div
            className="flex items-center justify-between px-4 py-3 border-b border-gray-200 bg-gray-100"
            style={{
              marginLeft: showCodePalette ? "320px" : "0px",
              transition: "margin-left 300ms",
            }}
          >
            <div className="flex items-center gap-3">
              {/* Code Palette Toggle Button */}
              <button
                onClick={() => setShowCodePalette((prev) => !prev)}
                className="flex items-center justify-center w-fit px-2 py-1 bg-blue-100 hover:bg-yellow-200 text-blue-800 text-sm rounded-md transition-all duration-200 border border-blue-200 hover:border-yellow-300"
                title={
                  showCodePalette ? "Hide Code Palette" : "Show Code Palette"
                }
              >
                <span
                  style={{
                    display: "inline-block",
                    transition: "transform 0.5s ease-in-out",
                    transform: showCodePalette
                      ? "rotate(180deg)"
                      : "rotate(0deg)",
                  }}
                  className="flex items-center justify-center"
                >
                  <FaArrowRight className="w-3 h-3" />
                </span>
              </button>

              <span className="text-sm text-gray-700 font-medium">
                Editor Mode
              </span>
            </div>

            {/* Toggle */}
            <div className="flex items-center gap-3">
              <span
                className={`text-sm transition-colors ${editorMode === "text"
                    ? "font-semibold text-blue-600"
                    : isConverting
                      ? "text-gray-400"
                      : "text-gray-500"
                  }`}
              >
                Text
              </span>
              <button
                onClick={() =>
                  handleModeChange(editorMode === "text" ? "block" : "text")
                }
                disabled={isConverting}
                className={`relative w-10 h-5 flex items-center rounded-full p-1 transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-blue-400 ${isConverting
                    ? "bg-gray-300 cursor-not-allowed opacity-60"
                    : editorMode === "block"
                      ? "bg-blue-600"
                      : "bg-gray-300"
                  }`}
                role="switch"
                aria-checked={editorMode === "block"}
                aria-disabled={isConverting}
              >
                <span
                  className={`h-4 w-4 bg-white rounded-full shadow-md transform transition-transform duration-200 ${editorMode === "block" ? "translate-x-5" : "translate-x-0"
                    }`}
                />
              </button>
              <span
                className={`text-sm transition-colors ${editorMode === "block"
                    ? "font-semibold text-blue-600"
                    : isConverting
                      ? "text-gray-400"
                      : "text-gray-500"
                  }`}
              >
                Block
              </span>
            </div>
          </div>

          {/* Validation Error Display */}
          {validationError && (
            <div
              className="mt-2 p-3 bg-red-50 border border-red-200 rounded-lg"
              style={{
                marginLeft: showCodePalette ? "324px" : "4px",
                marginRight: "16px",
                transition: "margin-left 300ms",
              }}
            >
              <div className="flex items-start gap-2">
                <svg
                  className="w-5 h-5 text-red-500 mt-0.5 flex-shrink-0"
                  fill="currentColor"
                  viewBox="0 0 20 20"
                >
                  <path
                    fillRule="evenodd"
                    d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                    clipRule="evenodd"
                  />
                </svg>
                <div className="flex-1">
                  <h4 className="text-sm font-medium text-red-800">
                    Cannot switch to Block mode
                  </h4>
                  <p className="text-sm text-red-700 mt-1">{validationError}</p>
                  <p className="text-xs text-red-600 mt-2">
                    Only supported micro:bit Python commands can be converted to
                    blocks. Please use only the available block commands or
                    switch to text mode for advanced coding.
                  </p>
                </div>
                <button
                  onClick={() => setValidationError(null)}
                  className="text-red-400 hover:text-red-600 p-1"
                  aria-label="Dismiss error"
                >
                  <svg
                    className="w-4 h-4"
                    fill="currentColor"
                    viewBox="0 0 20 20"
                  >
                    <path
                      fillRule="evenodd"
                      d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
                      clipRule="evenodd"
                    />
                  </svg>
                </button>
              </div>
            </div>
          )}

          {/* Editor Content */}
          <div
            className="flex-1 overflow-hidden bg-white relative"
            style={{
              marginLeft: showCodePalette ? "320px" : "0px",
              transition: "margin-left 300ms",
            }}
          >
            {/* Confirm: Switch to Block clears text */}
            {showBlockModeConfirm && (
              <div className="absolute inset-0 bg-black/30 z-50 flex items-center justify-center">
                <div className="bg-white rounded-lg shadow-xl border w-[520px] max-w-[90%] p-5">
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">Are you sure?</h3>
                  <p className="text-sm text-gray-700">
                    Enabling the blocks editor will clear any code you have in the text
                    editor. Are you sure you want to continue?
                  </p>
                  <div className="mt-5 flex justify-end gap-3">
                    <button
                      onClick={cancelSwitchToBlock}
                      className="px-4 py-2 rounded-md border border-gray-300 text-gray-700 hover:bg-gray-50"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={confirmSwitchToBlock}
                      className="px-4 py-2 rounded-md bg-blue-600 text-white hover:bg-blue-700"
                    >
                      Continue
                    </button>
                  </div>
                </div>
              </div>
            )}
            {/* Loading Overlay */}
            {isConverting && (
              <div className="absolute inset-0 bg-white bg-opacity-80 backdrop-blur-sm z-50 flex items-center justify-center">
                <div className="flex flex-col items-center gap-4 p-8 bg-white rounded-lg shadow-lg border">
                  {/* Spinner */}
                  <div className="w-12 h-12 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin"></div>

                  {/* Loading Text */}
                  <div className="text-center">
                    <h3 className="text-lg font-semibold text-gray-800 mb-1">
                      {conversionType === "toBlocks"
                        ? "Converting to Blocks..."
                        : "Converting to Text..."
                      }</h3>
                    <p className="text-sm text-gray-600">
                      {conversionType === "toBlocks"
                        ? "Transforming your Python code into visual blocks"
                        : "Generating Python code from your blocks"}
                    </p>
                  </div>
                </div>
              </div>
            )}

            {editorMode === "text" ? (
              <CodeEditor code={localCode} onChange={handleCodeChange} />
            ) : (
              <div
                ref={blocklyRef}
                className="w-full h-full"
                style={{
                  minHeight: "200px",
                  minWidth: "300px",
                  height: "100%",
                  backgroundColor: "#f0f4f8",
                }}
              />
            )}
          </div>
        </>
      )}
    </div>
  );
}

/**
 * Create a simple toolbox for initial testing
 */
function createSimpleToolbox(): string {
  return createToolboxXmlFromBlocks();
}