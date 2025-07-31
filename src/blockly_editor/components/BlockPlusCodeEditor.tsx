/**
 * BlockPlusCodeEditor - A bidirectional editor combining Blockly visual blocks and Python code
 *
 * This component provides:
 * 1. Side-by-side Blockly and Python editors
 * 2. Bidirectional conversion between blocks and code
 * 3. Real-time synchronization between both views
 * 4. Integration with controller code management
 */

import React, { useState, useEffect, useRef, useCallback } from "react";
import * as Blockly from "blockly";
import { pythonGenerator } from "blockly/python";
import {
  BlocklyPythonIntegration,
  BidirectionalConverter,
} from "../utils/blocklyPythonIntegration";
import CodeEditor from "@/python_code_editor/components/CodeEditor";

interface BlockPlusTextEditorProps {
  controllerCodeMap: Record<string, string>;
  activeControllerId: string | null;
  setControllerCodeMap: React.Dispatch<
    React.SetStateAction<Record<string, string>>
  >;
  stopSimulation: () => void;
}

export default function BlockPlusTextEditor({
  controllerCodeMap,
  activeControllerId,
  setControllerCodeMap,
  stopSimulation,
}: BlockPlusTextEditorProps) {
  // State management
  const [bidirectionalConverter, setBidirectionalConverter] =
    useState<BidirectionalConverter | null>(null);
  const [isUpdatingFromBlocks, setIsUpdatingFromBlocks] = useState(false);
  const [isUpdatingFromCode, setIsUpdatingFromCode] = useState(false);
  const [workspaceReady, setWorkspaceReady] = useState(false);

  // Refs
  const blocklyRef = useRef<HTMLDivElement>(null);
  const workspaceRef = useRef<Blockly.Workspace | null>(null);
  const mountedRef = useRef(false);

  // Get current code
  const currentCode = controllerCodeMap[activeControllerId ?? ""] ?? "";

  /**
   * Initialize Blockly workspace with proper error handling
   */
  const initializeWorkspace = useCallback(() => {
    if (!blocklyRef.current || workspaceRef.current) {
      console.log(
        "⚠️ Skipping initialization - no container or workspace exists"
      );
      return;
    }

    console.log("🚀 Initializing Blockly workspace...");
    console.log("📦 Container element:", blocklyRef.current);
    console.log("📏 Container dimensions:", {
      width: blocklyRef.current.offsetWidth,
      height: blocklyRef.current.offsetHeight,
    });

    try {
      // Step 1: Initialize block definitions
      console.log("🔧 Step 1: Initializing block definitions...");
      BlocklyPythonIntegration.initialize();
      BlocklyPythonIntegration.setupPythonGenerators(pythonGenerator);
      console.log("✅ Block definitions initialized");

      // Step 2: Create workspace with minimal config first
      console.log("🔧 Step 2: Creating Blockly workspace...");
      const workspace = Blockly.inject(blocklyRef.current, {
        toolbox: createSimpleToolbox(),
        trashcan: true,
        scrollbars: true,
        zoom: {
          controls: true,
          wheel: true,
        },
      });

      console.log("✅ Workspace created successfully:", workspace);
      console.log("🎨 Workspace rendered:", workspace.rendered);

      if (!workspace) {
        throw new Error("Workspace creation failed - returned null/undefined");
      }

      workspaceRef.current = workspace;

      // Step 3: Create converter
      console.log("🔧 Step 3: Creating bidirectional converter...");
      const converter = new BidirectionalConverter(workspace, pythonGenerator);
      setBidirectionalConverter(converter);
      console.log("✅ Converter created");

      // Step 4: Set up change listener
      console.log("🔧 Step 4: Setting up change listener...");
      workspace.addChangeListener((event) => {
        if (event.isUiEvent || isUpdatingFromCode) return;

        // Debounced block-to-code conversion
        setTimeout(() => {
          handleBlocksToCode();
        }, 100);
      });
      console.log("✅ Change listener added");

      // Step 5: Mark as ready
      console.log("🔧 Step 5: Marking workspace as ready...");
      setWorkspaceReady(true);
      console.log("🎉 Workspace initialization complete!");

      // Step 6: Add test block after a delay
      setTimeout(() => {
        if (workspace && !currentCode.trim()) {
          try {
            console.log("🧩 Adding test block...");
            const block = workspace.newBlock("show_string");
            block.setFieldValue("Hello World!", "TEXT");

            if (workspace.rendered) {
              (block as any).initSvg();
              (block as any).render();
              block.moveBy(20, 20);
              console.log("✅ Test block added successfully");
            } else {
              console.log(
                "⚠️ Workspace not rendered, skipping SVG initialization"
              );
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

    console.log("🏗️ Component mounted, starting initialization...");

    // Check container readiness and initialize
    const checkAndInitialize = () => {
      if (!blocklyRef.current) {
        console.log("⏳ Container not ready, retrying...");
        setTimeout(checkAndInitialize, 100);
        return;
      }

      const dimensions = {
        width: blocklyRef.current.offsetWidth,
        height: blocklyRef.current.offsetHeight,
      };

      console.log("📐 Container check:", dimensions);

      // If container has no dimensions, wait and retry
      if (dimensions.width === 0 || dimensions.height === 0) {
        console.log("⏳ Container has no dimensions, retrying in 100ms...");
        setTimeout(checkAndInitialize, 100);
        return;
      }

      // Container is ready, initialize
      initializeWorkspace();
    };

    // Start checking
    setTimeout(checkAndInitialize, 50);

    return () => {
      if (workspaceRef.current) {
        console.log("🧹 Cleaning up workspace");
        workspaceRef.current.dispose();
        workspaceRef.current = null;
      }
    };
  }, [initializeWorkspace]);

  /**
   * Convert blocks to Python code
   */
  const handleBlocksToCode = useCallback(() => {
    if (
      !bidirectionalConverter ||
      !activeControllerId ||
      isUpdatingFromBlocks
    ) {
      return;
    }

    setIsUpdatingFromBlocks(true);
    try {
      const generatedCode = bidirectionalConverter.blocksToPython();

      setControllerCodeMap((prev) => ({
        ...prev,
        [activeControllerId]: generatedCode,
      }));

      stopSimulation();
    } catch (error) {
      console.error("Error converting blocks to code:", error);
    } finally {
      setIsUpdatingFromBlocks(false);
    }
  }, [
    bidirectionalConverter,
    activeControllerId,
    setControllerCodeMap,
    stopSimulation,
    isUpdatingFromBlocks,
  ]);

  /**
   * Convert Python code to blocks
   */
  const handleCodeToBlocks = useCallback(
    (newCode: string) => {
      if (!bidirectionalConverter || isUpdatingFromCode || !workspaceReady) {
        return;
      }

      setIsUpdatingFromCode(true);
      try {
        // Clear workspace
        workspaceRef.current?.clear();

        // Convert code to blocks
        bidirectionalConverter.pythonToBlocks(newCode);
      } catch (error) {
        console.error("Error converting code to blocks:", error);
      } finally {
        setIsUpdatingFromCode(false);
      }
    },
    [bidirectionalConverter, isUpdatingFromCode, workspaceReady]
  );

  /**
   * Handle code editor changes
   */
  const handleCodeChange = useCallback(
    (newCode: string) => {
      if (!activeControllerId) return;

      // Update code map immediately
      setControllerCodeMap((prev) => ({
        ...prev,
        [activeControllerId]: newCode,
      }));

      stopSimulation();

      // Convert to blocks with debounce
      setTimeout(() => {
        handleCodeToBlocks(newCode);
      }, 500);
    },
    [
      activeControllerId,
      setControllerCodeMap,
      stopSimulation,
      handleCodeToBlocks,
    ]
  );

  /**
   * Sync blocks when active controller changes
   */
  useEffect(() => {
    if (
      bidirectionalConverter &&
      currentCode &&
      !isUpdatingFromBlocks &&
      workspaceReady
    ) {
      handleCodeToBlocks(currentCode);
    }
  }, [
    activeControllerId,
    bidirectionalConverter,
    currentCode,
    isUpdatingFromBlocks,
    workspaceReady,
    handleCodeToBlocks,
  ]);

  /**
   * Debug function
   */
  const debugWorkspace = () => {
    console.log("=== WORKSPACE DEBUG ===");
    console.log("📦 Container:", blocklyRef.current);
    console.log("🏗️ Workspace:", workspaceRef.current);
    console.log("🎨 Workspace rendered:", workspaceRef.current?.rendered);
    console.log("✅ Workspace ready:", workspaceReady);
    console.log("🔄 Converter:", bidirectionalConverter);
    console.log("🔀 Mounted:", mountedRef.current);
    console.log("📝 Current code:", currentCode);
    console.log("🔒 Updating from blocks:", isUpdatingFromBlocks);
    console.log("🔒 Updating from code:", isUpdatingFromCode);

    if (blocklyRef.current) {
      console.log("📏 Container dimensions:", {
        width: blocklyRef.current.offsetWidth,
        height: blocklyRef.current.offsetHeight,
        clientWidth: blocklyRef.current.clientWidth,
        clientHeight: blocklyRef.current.clientHeight,
      });
      console.log("🎨 Container style:", getComputedStyle(blocklyRef.current));
    }

    if (workspaceRef.current) {
      console.log("🧩 All blocks:", workspaceRef.current.getAllBlocks());
      console.log("🔧 Toolbox:", (workspaceRef.current as any).toolbox_);
    }

    // Try to force initialization if not ready
    if (!workspaceReady && !workspaceRef.current) {
      console.log("🚨 Forcing initialization...");
      initializeWorkspace();
    }
  };

  return (
    <div className="flex flex-col w-full h-full gap-4 min-h-[500px]">
      {/* Header */}
      <div className="flex justify-between items-center p-3 bg-gray-50 border rounded-lg">
        <div>
          <h3 className="text-lg font-semibold text-gray-800">
            Bidirectional Editor
          </h3>
          <p className="text-sm text-gray-600">
            {activeControllerId
              ? `Controller: ${activeControllerId}`
              : "No Controller Selected"}
          </p>
        </div>

        <div className="flex gap-2 items-center">
          <button
            onClick={() => handleCodeToBlocks(currentCode)}
            className="px-4 py-2 text-sm bg-blue-500 text-white rounded hover:bg-blue-600 disabled:opacity-50"
            disabled={
              !bidirectionalConverter || !currentCode.trim() || !workspaceReady
            }
            title="Convert Python code to blocks"
          >
            Code → Blocks
          </button>

          <button
            onClick={handleBlocksToCode}
            className="px-4 py-2 text-sm bg-green-500 text-white rounded hover:bg-green-600 disabled:opacity-50"
            disabled={!bidirectionalConverter || !workspaceReady}
            title="Convert blocks to Python code"
          >
            Blocks → Code
          </button>

          <button
            onClick={debugWorkspace}
            className="px-3 py-2 text-sm bg-yellow-500 text-white rounded hover:bg-yellow-600"
            title="Debug workspace"
          >
            🐛 Debug
          </button>

          <div className="flex items-center gap-2 text-sm">
            <span
              className={`w-2 h-2 rounded-full ${
                workspaceReady ? "bg-green-500" : "bg-red-500"
              }`}
            ></span>
            <span className="text-gray-600">
              {workspaceReady ? "Ready" : "Loading..."}
            </span>
          </div>
        </div>
      </div>

      {/* Editor panels */}
      <div className="flex flex-row w-full flex-1 gap-4">
        {/* Blockly Panel */}
        <div className="flex-1 flex flex-col border border-gray-300 rounded-lg overflow-hidden">
          <div className="px-4 py-2 bg-gray-100 border-b">
            <h4 className="text-sm font-medium text-gray-700">Visual Blocks</h4>
          </div>
          <div
            ref={blocklyRef}
            className="flex-1"
            style={{
              minHeight: "400px",
              minWidth: "300px",
              width: "100%",
              height: "100%",
              position: "relative",
              backgroundColor: "#f9f9f9", // Add background to see container
            }}
          />
        </div>

        {/* Code Panel */}
        <div className="flex-1 flex flex-col border border-gray-300 rounded-lg overflow-hidden">
          <div className="px-4 py-2 bg-gray-100 border-b">
            <h4 className="text-sm font-medium text-gray-700">Python Code</h4>
          </div>
          <div className="flex-1">
            <CodeEditor code={currentCode} onChange={handleCodeChange} />
          </div>
        </div>
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
