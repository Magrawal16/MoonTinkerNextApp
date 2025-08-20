/**
 * Bidirectional Python ↔ Blockly Integration
 *
 * This module provides a complete system for converting between Python code and Blockly visual blocks.
 *
 * ARCHITECTURE OVERVIEW:
 * =====================
 *
 * 1. SharedBlockDefinitions (sharedBlockDefinitions.ts)
 *    - Contains SHARED_MICROBIT_BLOCKS: array of block definitions
 *    - Each definition includes:
 *      * blockDefinition: Blockly JSON (appearance, connections, fields)
 *      * pythonPattern: Regex for matching Python code
 *      * pythonGenerator: Function to convert block → Python
 *      * pythonExtractor: Function to extract values from Python matches
 *      * blockCreator: Function to create block from extracted values
 *
 * 2. SharedBlockRegistry
 *    - Manages registration of blocks with Blockly
 *    - Provides pattern matching and block creation utilities
 *    - Ensures consistent behavior between conversion directions
 *
 * 3. EnhancedPythonToBlocklyConverter
 *    - Processes Python code line by line
 *    - Matches lines against known patterns
 *    - Creates and connects blocks in the workspace
 *
 * 4. BlocklyPythonIntegration (this file)
 *    - High-level interface for Python ↔ Blockly conversion
 *    - Handles block initialization and positioning
 *    - Provides utility methods for compatibility checking
 *
 * 5. BidirectionalConverter
 *    - Convenience class combining both conversion directions
 *    - Useful for real-time sync between Python and Blockly editors
 *
 * USAGE:
 * ======
 *
 * 1. Initialize once per application:
 *    BlocklyPythonIntegration.initialize();
 *    BlocklyPythonIntegration.setupPythonGenerators(pythonGenerator);
 *
 * 2. Create converter for a workspace:
 *    const integration = new BlocklyPythonIntegration(workspace);
 *
 * 3. Convert Python to blocks:
 *    integration.importPythonCode(pythonCode);
 *
 * 4. Convert blocks to Python:
 *    const pythonCode = integration.exportToPython(pythonGenerator);
 *
 * The system is designed to eliminate code duplication and ensure that both conversion
 * directions use the same block definitions, maintaining consistency and reducing bugs.
 */

import * as Blockly from "blockly";
import {
  EnhancedPythonToBlocklyConverter,
  SharedBlockRegistry,
} from "./sharedBlockDefinitions";

/**
 * Integration utilities for adding Python-to-Blockly conversion to existing Blockly editors
 *
 * This class provides a high-level interface for:
 * 1. Converting Python code to Blockly blocks
 * 2. Converting Blockly blocks back to Python code
 * 3. Managing the bidirectional conversion process
 *
 * It uses SharedBlockRegistry for consistent block definitions between both directions.
 */
export class BlocklyPythonIntegration {
  private workspace: Blockly.Workspace;
  private converter: EnhancedPythonToBlocklyConverter;

  /**
   * Create a new integration instance for a specific Blockly workspace
   * @param workspace The Blockly workspace to operate on
   */
  constructor(workspace: Blockly.Workspace) {
    this.workspace = workspace;
    this.converter = new EnhancedPythonToBlocklyConverter(workspace);
  }

  /**
   * Initialize the integration by registering all shared block definitions with Blockly
   * This must be called once before using any conversion features
   */
  static initialize(): void {
    SharedBlockRegistry.registerBlocks();
  }

  /**
   * Setup Python code generators for converting blocks back to Python
   * This registers the Python generation functions for each block type
   * @param pythonGenerator The Blockly Python generator instance
   */
  static setupPythonGenerators(pythonGenerator: any): void {
    SharedBlockRegistry.registerPythonGenerators(pythonGenerator);
  }

  /**
   * Convert Python code to blocks and add them to the workspace
   * This is the main entry point for Python-to-Blockly conversion
   */
  importPythonCode(pythonCode: string): void {
    // Use the shared converter to create blocks from Python code
    const blocks = this.converter.convertPythonToBlocks(pythonCode);

    // Initialize each block's SVG representation and render it in the workspace
    // This makes the blocks visible in the Blockly editor
    blocks.forEach((block) => {
      try {
        // Cast to any to access Blockly's internal rendering methods
        const blockAny = block as any;
        if (blockAny.initSvg) {
          blockAny.initSvg();
        }
        if (blockAny.render) {
          blockAny.render();
        }
      } catch (error) {
        console.error("Error initializing block:", error);
      }
    });

    // Position blocks in a neat vertical arrangement so they're easy to see
    this.positionBlocks(blocks);
  }

  /**
   * Convert current Blockly blocks in the workspace to Python code
   * @param pythonGenerator The Blockly Python generator instance
   * @returns Generated Python code as a string
   */
  exportToPython(pythonGenerator: any): string {
    return pythonGenerator.workspaceToCode(this.workspace);
  }

  /**
   * Position blocks in a neat vertical arrangement starting from the top-left
   * Only positions top-level blocks (blocks without parents) to avoid conflicts
   */
  private positionBlocks(blocks: Blockly.Block[]): void {
    let x = 20; // Starting X position (pixels from left edge)
    let y = 20; // Starting Y position (pixels from top edge)
    const spacing = 100; // Vertical spacing between blocks

    // Filter to only position blocks that don't have parent connections
    // Connected blocks will move together with their parent
    const topLevelBlocks = blocks.filter((block) => !block.getParent());

    topLevelBlocks.forEach((block, index) => {
      try {
        // Move the block to the calculated position
        block.moveBy(x, y);
        // Increase Y position for the next block (stacks them vertically)
        y += spacing;
      } catch (error) {
        console.warn("Failed to position block:", block.type, error);
      }
    });
  }
  /**
   * Check if the given Python code can be converted to blocks
   * Tests the code against all known block patterns
   * @param pythonCode The Python code to test
   * @returns True if at least one block pattern matches the code
   */
  static isCompatiblePython(pythonCode: string): boolean {
    const matchingBlocks = SharedBlockRegistry.matchesPythonPattern(pythonCode);
    return matchingBlocks.length > 0;
  }

  /**
   * Validate if ALL lines of Python code can be converted to blocks
   * This ensures complete conversion compatibility before allowing mode switch
   * @param pythonCode The Python code to validate
   * @returns Object with validation result and details about unconvertible lines
   */
  static validateFullConversion(pythonCode: string): {
    isValid: boolean;
    unconvertibleLines: string[];
    lineNumbers: number[];
    errorMessage?: string;
  } {
    const lines = pythonCode.split("\n");
    const unconvertibleLines: string[] = [];
    const lineNumbers: number[] = [];

    // Process each line to check convertibility
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();

      // Skip empty lines and comments - these are allowed
      if (!line || line.startsWith("#")) {
        continue;
      }

      // Check if this line matches any known block pattern
      const matchingBlocks = SharedBlockRegistry.matchesPythonPattern(line);

      if (matchingBlocks.length === 0) {
        // This line cannot be converted to any block
        unconvertibleLines.push(line);
        lineNumbers.push(i + 1); // 1-based line numbers for user display
      }
    }

    const isValid = unconvertibleLines.length === 0;

    let errorMessage: string | undefined;
    if (!isValid) {
      if (unconvertibleLines.length === 1) {
        errorMessage = `Line ${lineNumbers[0]} cannot be converted to blocks: "${unconvertibleLines[0]}"`;
      } else {
        errorMessage = `${unconvertibleLines.length} lines cannot be converted to blocks. First unsupported line ${lineNumbers[0]}: "${unconvertibleLines[0]}"`;
      }
    }

    return {
      isValid,
      unconvertibleLines,
      lineNumbers,
      errorMessage,
    };
  }

  /**
   * Preview what block types would be created from Python code without actually creating them
   * Useful for showing users what will happen before conversion
   * @param pythonCode The Python code to analyze
   * @returns Array of block type names that would be created
   */
  static previewConversion(pythonCode: string): string[] {
    const matches = SharedBlockRegistry.matchesPythonPattern(pythonCode);
    return matches.map((match) => match.type);
  }

  /**
   * Get all supported Python patterns for documentation purposes
   * Returns a mapping of block types to their corresponding regex patterns
   * @returns Object mapping block type names to regex pattern strings
   */
  static getSupportedPatterns(): Record<string, string> {
    const patterns: Record<string, string> = {};

    SharedBlockRegistry.getBlockTypes().forEach((type) => {
      const blockDef = SharedBlockRegistry.getBlockDefinition(type);
      if (blockDef) {
        patterns[type] = blockDef.pythonPattern.source;
      }
    });

    return patterns;
  }
}

/**
 * Utility class for bidirectional conversion between Python and Blockly
 *
 * This class combines both conversion directions (Python ↔ Blockly) into a single interface.
 * It's designed for editors that need to sync changes between Python code and visual blocks.
 */
export class BidirectionalConverter {
  private integration: BlocklyPythonIntegration;
  private pythonGenerator: any;

  /**
   * Create a new bidirectional converter
   * @param workspace The Blockly workspace to operate on
   * @param pythonGenerator The Blockly Python generator for blocks-to-Python conversion
   */
  constructor(workspace: Blockly.Workspace, pythonGenerator: any) {
    this.integration = new BlocklyPythonIntegration(workspace);
    this.pythonGenerator = pythonGenerator;
  }

  /**
   * Convert Python code to Blockly blocks
   * Clears existing blocks and replaces them with blocks generated from the Python code
   * @param pythonCode The Python code to convert
   * @throws Error if the Python code cannot be fully converted to blocks
   */
  pythonToBlocks(pythonCode: string): void {
    // Validate that all code can be converted before proceeding
    const validation =
      BlocklyPythonIntegration.validateFullConversion(pythonCode);

    if (!validation.isValid) {
      throw new Error(
        validation.errorMessage || "Code cannot be fully converted to blocks"
      );
    }

    this.integration.importPythonCode(pythonCode);
  }

  /**
   * Validate if Python code can be fully converted to blocks
   * @param pythonCode The Python code to validate
   * @returns Validation result with details about any issues
   */
  validatePythonCode(pythonCode: string): {
    isValid: boolean;
    unconvertibleLines: string[];
    lineNumbers: number[];
    errorMessage?: string;
  } {
    return BlocklyPythonIntegration.validateFullConversion(pythonCode);
  }

  /**
   * Convert current Blockly blocks to Python code
   * @returns The generated Python code
   */
  blocksToPython(): string {
    return this.integration.exportToPython(this.pythonGenerator);
  }

  /**
   * Synchronize from Python code: convert to blocks, then back to Python
   * This normalizes the Python code according to block representations
   * @param pythonCode The input Python code
   * @returns Normalized Python code after round-trip conversion
   */
  syncFromPython(pythonCode: string): string {
    // Convert Python to blocks (may filter/transform unsupported code)
    this.pythonToBlocks(pythonCode);

    // Convert back to Python to get the normalized version
    return this.blocksToPython();
  }

  /**
   * Test round-trip conversion to see if the code is preserved accurately
   * Useful for validating that conversion doesn't lose important information
   * @param pythonCode The original Python code to test
   * @returns Object containing original code, converted code, and whether they match semantically
   */
  testRoundTrip(pythonCode: string): {
    original: string;
    converted: string;
    matches: boolean;
  } {
    const original = pythonCode.trim();
    const converted = this.syncFromPython(pythonCode).trim();

    return {
      original,
      converted,
      matches: this.semanticallyEqual(original, converted),
    };
  }

  /**
   * Simple semantic equality check for Python code
   * Normalizes whitespace and compares the essential structure
   * Note: This is a basic implementation that could be enhanced for more complex cases
   * @param code1 First code string to compare
   * @param code2 Second code string to compare
   * @returns True if the codes are semantically equivalent
   */
  private semanticallyEqual(code1: string, code2: string): boolean {
    // Remove whitespace and normalize for basic comparison
    const normalize = (code: string) =>
      code.replace(/\s+/g, " ").replace(/\n/g, " ").trim();

    return normalize(code1) === normalize(code2);
  }
}
