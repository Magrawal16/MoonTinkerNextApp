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
import {
  BlocklyPythonIntegration,
  BidirectionalConverter,
} from "../utils/blocklyPythonIntegration";
import CodeEditor from "@/python_code_editor/components/CodeEditor";

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
  // State management
  const [editorMode, setEditorMode] = useState<EditorMode>("text");
  const [bidirectionalConverter, setBidirectionalConverter] =
    useState<BidirectionalConverter | null>(null);
  const [isUpdatingFromBlocks, setIsUpdatingFromBlocks] = useState(false);
  const [isUpdatingFromCode, setIsUpdatingFromCode] = useState(false);
  const [workspaceReady, setWorkspaceReady] = useState(false);
  const [localCode, setLocalCode] = useState<string>(""); // Local state for code editing

  // Refs
  const blocklyRef = useRef<HTMLDivElement>(null);
  const workspaceRef = useRef<Blockly.Workspace | null>(null);
  const mountedRef = useRef(false);
  const lastCodeRef = useRef<string>("");
  const debounceTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const prevControllerRef = useRef<string | null>(activeControllerId);

  // Get current code
  const currentCode = controllerCodeMap[activeControllerId ?? ""] ?? "";

  // Update local code when controller changes or when blocks update the code
  useEffect(() => {
    if (!isUpdatingFromBlocks) {
      setLocalCode(currentCode);
    }
  }, [currentCode, activeControllerId, isUpdatingFromBlocks]);

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
    }

    prevControllerRef.current = activeControllerId;
  }, [activeControllerId, localCode, controllerCodeMap]);

  /**
   * Initialize Blockly workspace with proper error handling
   */
  const initializeWorkspace = useCallback(() => {
    if (!blocklyRef.current) {
      console.log("⚠️ Skipping initialization - no container element");
      return;
    }

    // If workspace already exists and is healthy, don't reinitialize
    if (workspaceRef.current && workspaceRef.current.rendered) {
      console.log("✅ Workspace already exists and is rendered");
      setWorkspaceReady(true);
      return;
    }

    // Clean up existing workspace if it exists but isn't healthy
    if (workspaceRef.current) {
      console.log("🧹 Cleaning up existing workspace before reinitializing");
      try {
        workspaceRef.current.dispose();
      } catch (error) {
        console.warn("⚠️ Error disposing workspace:", error);
      }
      workspaceRef.current = null;
      setWorkspaceReady(false);
    }

    console.log("🚀 Initializing Blockly workspace...");

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

      // Step 3: Create converter
      const converter = new BidirectionalConverter(workspace, pythonGenerator);
      setBidirectionalConverter(converter);

      // Step 4: Set up change listener for blocks → Python conversion
      console.log("🔧 Step 4: Setting up change listener...");

      let conversionTimeout: NodeJS.Timeout | null = null;

      workspace.addChangeListener((event) => {
        // Skip UI events and updates from code conversion
        if (event.isUiEvent || isUpdatingFromCode) return;

        // Skip certain types of events that don't affect code generation
        if (
          event.type === Blockly.Events.VIEWPORT_CHANGE ||
          event.type === Blockly.Events.THEME_CHANGE ||
          event.type === Blockly.Events.CLICK ||
          event.type === Blockly.Events.SELECTED
        ) {
          return;
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
                stopSimulation();
              }
            } catch (error) {
              console.error("❌ Error in change listener conversion:", error);
            } finally {
              setIsUpdatingFromBlocks(false);
            }
          }
        }, 300); // Increased debounce time from 100ms to 300ms
      });

      // Step 5: Mark as ready
      setWorkspaceReady(true);
      console.log("🎉 Workspace initialization complete!");

      // Step 6: Convert current code to blocks if we have code
      setTimeout(() => {
        if (workspace && currentCode.trim() && converter) {
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
      }, 500);
    } catch (error) {
      console.error("❌ Failed to initialize workspace:", error);
      console.error(
        "❌ Error stack:",
        error instanceof Error ? error.stack : "No stack trace"
      );
      // Try to set ready anyway in case of non-critical errors
      setWorkspaceReady(true);
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

      if (workspaceRef.current) {
        workspaceRef.current.dispose();
        workspaceRef.current = null;
      }
      // Clean up debounce timeout
      if (debounceTimeoutRef.current) {
        clearTimeout(debounceTimeoutRef.current);
      }
    };
  }, [initializeWorkspace]);

  /**
   * Handle blocks to code conversion
   */
  const handleBlocksToCode = useCallback(() => {
    console.log("🔄 handleBlocksToCode called", {
      bidirectionalConverter: !!bidirectionalConverter,
      activeControllerId,
      isUpdatingFromBlocks,
      editorMode,
    });

    if (
      !bidirectionalConverter ||
      !activeControllerId ||
      isUpdatingFromBlocks ||
      editorMode !== "block" // Only convert if we're in block mode
    ) {
      console.log("⚠️ Skipping blocks to code conversion - conditions not met");
      return;
    }

    setIsUpdatingFromBlocks(true);
    try {
      const generatedCode = bidirectionalConverter.blocksToPython();

      // Only update if the code actually changed
      if (generatedCode !== lastCodeRef.current) {
        console.log(
          "✅ Blocks converted to code:",
          generatedCode.length,
          "characters"
        );
        lastCodeRef.current = generatedCode;

        setControllerCodeMap((prev) => ({
          ...prev,
          [activeControllerId]: generatedCode,
        }));

        stopSimulation();
      } else {
        console.log("⚡ Code unchanged, skipping update");
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

    setIsUpdatingFromCode(true);
    try {
      // Clear workspace
      workspaceRef.current?.clear();

      // Use the most current code (localCode if it exists and differs, otherwise currentCode)
      const codeToConvert = localCode !== currentCode ? localCode : currentCode;

      // Convert code to blocks
      bidirectionalConverter.pythonToBlocks(codeToConvert);
      lastCodeRef.current = codeToConvert;
    } catch (error) {
      console.error("Error converting Python to blocks:", error);
    } finally {
      setTimeout(() => setIsUpdatingFromCode(false), 100);
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

    // First, flush any pending changes to avoid losing work
    const latestCode = flushPendingChanges();

    if (newMode === "block") {
      // Converting to block mode
      setEditorMode(newMode);

      // Always reinitialize workspace when switching to block mode
      // This ensures a clean state and prevents stale workspace issues
      console.log("🔄 Switching to block mode - reinitializing workspace...");
      setWorkspaceReady(false);

      // Clean up existing workspace first
      if (workspaceRef.current) {
        try {
          workspaceRef.current.dispose();
        } catch (error) {
          console.warn(
            "⚠️ Error disposing workspace during mode switch:",
            error
          );
        }
        workspaceRef.current = null;
      }

      // Wait for the container to be visible, then initialize
      setTimeout(() => {
        initializeWorkspace();
      }, 100);
    } else {
      // Converting to text mode - convert blocks to Python code first
      console.log("🔄 Switching to text mode - converting blocks to code...");

      // Convert blocks to code before switching modes
      if (bidirectionalConverter && activeControllerId && workspaceReady) {
        try {
          const generatedCode = bidirectionalConverter.blocksToPython();
          console.log(
            "✅ Blocks converted to code:",
            generatedCode.length,
            "characters"
          );

          // Update both the controller code map and local code
          setControllerCodeMap((prev) => ({
            ...prev,
            [activeControllerId]: generatedCode,
          }));
          setLocalCode(generatedCode);

          lastCodeRef.current = generatedCode;
          stopSimulation();
        } catch (error) {
          console.error(
            "❌ Error converting blocks to code during mode switch:",
            error
          );
        }
      }

      // Switch to text mode
      setEditorMode(newMode);
    }
  };

  // Convert code to blocks when switching to block mode (removed the conflicting effect)
  // The conversion is now handled directly in handleModeChange for better control

  // Handle workspace resize when container becomes visible
  useEffect(() => {
    if (editorMode === "block" && workspaceRef.current && workspaceReady) {
      // Small delay to ensure the container is fully visible
      const resizeTimer = setTimeout(() => {
        try {
          if (workspaceRef.current && workspaceRef.current.rendered) {
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

  return (
    <div className="flex flex-col h-full w-full">
      {/* Mode Selector Header */}
      <div className="flex items-center justify-between p-3 border-b border-gray-300 bg-gray-50">
        <span className="text-sm font-medium text-gray-700">Editor Mode:</span>

        {/* Slider Toggle */}
        <div className="flex items-center space-x-3">
          <span
            className={`text-sm ${
              editorMode === "text"
                ? "font-semibold text-blue-600"
                : "text-gray-500"
            }`}
          >
            Text
          </span>
          <button
            onClick={() =>
              handleModeChange(editorMode === "text" ? "block" : "text")
            }
            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 ${
              editorMode === "block" ? "bg-blue-600" : "bg-gray-300"
            }`}
            role="switch"
            aria-checked={editorMode === "block"}
          >
            <span
              className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform duration-200 ease-in-out ${
                editorMode === "block" ? "translate-x-6" : "translate-x-1"
              }`}
            />
          </button>
          <span
            className={`text-sm ${
              editorMode === "block"
                ? "font-semibold text-blue-600"
                : "text-gray-500"
            }`}
          >
            Block
          </span>
        </div>
      </div>

      {/* Editor Content */}
      <div className="flex-1 overflow-hidden">
        {editorMode === "text" ? (
          <CodeEditor code={localCode} onChange={handleCodeChange} />
        ) : (
          <div
            ref={blocklyRef}
            className="w-full h-full"
            style={{
              minHeight: "400px",
              minWidth: "300px",
              width: "100%",
              height: "100%",
              position: "relative",
              backgroundColor: "#f9f9f9", // Add background to see container
            }}
          />
        )}
      </div>
    </div>
  );
}

/**
 * Create a simple toolbox for initial testing
 */
function createSimpleToolbox(): string {
  return `
<xml xmlns="https://developers.google.com/blockly/xml">
  <category name="Display" colour="#4C97FF">
    <block type="show_string">
      <field name="TEXT">Hello World!</field>
    </block>
    <block type="microbit_display_scroll">
      <field name="TEXT">Hello!</field>
    </block>
  </category>
  <category name="Control" colour="#FFAB19">
    <block type="pause">
      <field name="TIME">1000</field>
    </block>
  </category>
  <category name="Input" colour="#FF6680">
    <block type="button_is_pressed">
      <field name="BUTTON">button_a</field>
    </block>
  </category>
  <category name="Logic" colour="#5C81A6">
    <block type="logic_boolean"></block>
    <block type="controls_if"></block>
  </category>
  <category name="Math" colour="#5CB3CC">
    <block type="math_number">
      <field name="NUM">0</field>
    </block>
  </category>
</xml>`;
}
