"use client";

import React, { useState, useEffect, useRef } from "react";
import * as Blockly from "blockly";
import { pythonGenerator } from "blockly/python";
import {
  BlocklyPythonIntegration,
  BidirectionalConverter,
} from "@/blockly_editor/utils/blocklyPythonIntegration";
import CodeEditor from "@/python_code_editor/components/CodeEditor";

export default function BidirectionalDemo() {
  const [pythonCode, setPythonCode] = useState<string>(
    'print("Hello World")\nled.plot(2, 2)\ntime.sleep(1000)'
  );
  const [integration, setIntegration] =
    useState<BlocklyPythonIntegration | null>(null);
  const [bidirectionalConverter, setBidirectionalConverter] =
    useState<BidirectionalConverter | null>(null);

  const blocklyRef = useRef<HTMLDivElement>(null);
  const initializedRef = useRef(false);

  // Initialize Blockly workspace and conversion utilities
  useEffect(() => {
    if (!blocklyRef.current || initializedRef.current) return;

    // Step 1: Register all shared block definitions with Blockly
    BlocklyPythonIntegration.initialize();

    // Step 2: Setup Python code generators for blocks-to-Python conversion
    BlocklyPythonIntegration.setupPythonGenerators(pythonGenerator);

    // Step 3: Create the Blockly workspace with toolbox and trash can
    const workspace = Blockly.inject(blocklyRef.current, {
      toolbox: createToolbox(),
      trashcan: true,
    });

    // Step 4: Create integration objects for bidirectional conversion
    const integ = new BlocklyPythonIntegration(workspace);
    const biConv = new BidirectionalConverter(workspace, pythonGenerator);

    // Step 5: Store the integration objects in component state
    setIntegration(integ);
    setBidirectionalConverter(biConv);
    initializedRef.current = true;

    // Cleanup function to dispose of the workspace when component unmounts
    return () => {
      workspace?.dispose();
    };
  }, []);

  /**
   * Handle Python → Blocks conversion
   * Takes the current Python code and converts it to visual blocks
   */
  const handlePythonToBlocks = () => {
    if (integration && pythonCode.trim()) {
      integration.importPythonCode(pythonCode);
    }
  };

  /**
   * Handle Blocks → Python conversion
   * Takes the current visual blocks and converts them to Python code
   */
  const handleBlocksToPython = () => {
    if (bidirectionalConverter) {
      const generatedPython = bidirectionalConverter.blocksToPython();
      setPythonCode(generatedPython);
    }
  };

  return (
    <div className="p-4 h-screen bg-gray-100">
      <div className="mb-4">
        <h1 className="text-2xl font-bold mb-2">Bidirectional Blockly Demo</h1>
        <p className="text-gray-600 mb-4">
          Convert between Python code and visual blocks. Use the buttons below
          to switch between representations.
        </p>
        <div className="flex gap-2 mb-4">
          <button
            onClick={handlePythonToBlocks}
            className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
            title="Convert the Python code to visual blocks"
          >
            Python → Blocks
          </button>
          <button
            onClick={handleBlocksToPython}
            className="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600"
            title="Convert the visual blocks to Python code"
          >
            Blocks → Python
          </button>
        </div>
      </div>

      <div className="flex gap-4 h-[calc(100vh-120px)]">
        {/* Blockly Editor */}
        <div className="flex-1 bg-white border rounded">
          <div className="p-2 border-b bg-gray-50">
            <h2 className="font-semibold">Blockly Editor</h2>
          </div>
          <div ref={blocklyRef} className="w-full h-[calc(100%-50px)]" />
        </div>

        {/* Python Editor */}
        <div className="flex-1 bg-white border rounded">
          <div className="p-2 border-b bg-gray-50">
            <h2 className="font-semibold">Python Editor</h2>
          </div>
          <div className="h-[calc(100%-50px)]">
            <CodeEditor code={pythonCode} onChange={setPythonCode} />
          </div>
        </div>
      </div>
    </div>
  );
}

/**
 * Create a Blockly toolbox with micro:bit blocks and basic logic blocks
 * The toolbox defines what blocks are available for users to drag into the workspace
 */
function createToolbox(): string {
  return `
<xml xmlns="https://developers.google.com/blockly/xml">
  <category name="Microbit" colour="#4C97FF">
    <block type="on_start"></block>
    <block type="forever"></block>
    <block type="show_string"></block>
    <block type="set_led"></block>
    <block type="pause"></block>
    <block type="button_is_pressed"></block>
  </category>
  <category name="Logic" colour="#5C81A6">
    <block type="controls_if"></block>
    <block type="logic_compare"></block>
  </category>
</xml>`;
}
