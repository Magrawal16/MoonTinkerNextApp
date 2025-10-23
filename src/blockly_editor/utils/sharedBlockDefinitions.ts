import * as Blockly from "blockly";
import { Order } from "blockly/python";

/**
 * Shared interface for block definitions that enables bidirectional conversion
 *
 * This interface ensures that each block type has all the necessary components for:
 * 1. Defining the block's appearance and behavior in Blockly (blockDefinition)
 * 2. Parsing Python code to create blocks (pythonPattern + pythonExtractor + blockCreator)
 * 3. Generating Python code from blocks (pythonGenerator)
 *
 * By using this shared approach, we eliminate code duplication and ensure consistency
 * between Python-to-Blockly and Blockly-to-Python conversions.
 */
export interface SharedBlockDefinition {
  /** Unique identifier for this block type */
  type: string;

  category?: CategoryName;

  /** Blockly JSON definition describing the block's appearance and connections */
  blockDefinition: any;

  /** Regular expression pattern that matches Python code for this block type */
  pythonPattern: RegExp;

  /** Function that generates Python code from a Blockly block instance */
  pythonGenerator: (block: any, generator?: any) => string | [string, number];

  /** Function that extracts values from matched Python code */
  pythonExtractor: (match: RegExpMatchArray) => Record<string, any>;

  /** Function that creates a Blockly block from extracted values */
  blockCreator: (
    workspace: Blockly.Workspace,
    values: Record<string, any>
  ) => Blockly.Block;
}

// categories with name and color
export interface BlockCategory {
  name: string;
  color: string | number; // color can be a string (hex) or number (hue)
}

type CategoryName = (typeof BLOCK_CATEGORIES)[number]["name"];

export const BLOCK_CATEGORIES: BlockCategory[] = [
  { name: "Basic", color: 220 },
  { name: "Input", color: 290 },
  { name: "Led", color: 300 },
  { name: "Logic", color: 180.72 },
  { name: "Math", color: "#F06292" },
  { name: "Variables", color: "#BA68C8" },
];

/**
 * Helper function to safely create and initialize a block
 * Handles both headless and rendered workspaces properly
 */
function createAndInitializeBlock(
  workspace: Blockly.Workspace,
  blockType: string,
  fieldUpdates?: Record<string, any>
): Blockly.Block {
  const block = workspace.newBlock(blockType);

  // Apply field updates first
  if (fieldUpdates) {
    for (const [fieldName, value] of Object.entries(fieldUpdates)) {
      block.setFieldValue(value, fieldName);
    }
  }

  // Only initialize SVG if workspace supports rendering (not headless)
  if (workspace.rendered && (block as any).initSvg) {
    try {
      (block as any).initSvg();
      (block as any).render();
    } catch (error) {
      console.warn("Could not initialize SVG for block:", error);
    }
  }

  return block;
}

/**
 * Shared block definitions for micro:bit blocks
 * This ensures consistency between Python generation and parsing
 */
export const SHARED_MICROBIT_BLOCKS: SharedBlockDefinition[] = [
  {
    // basic blocks
    type: "show_string",
    category: "Basic",
    blockDefinition: {
      type: "show_string",
      message0: "show string %1",
      args0: [
        {
          type: "field_input",
          name: "TEXT",
          text: "Hello!",
        },
      ],
      previousStatement: null,
      nextStatement: null,
      tooltip: "Show a string on the display",
    },
    pythonPattern: /basic\.show_string\((['"])(.+?)\1\)/g,
    pythonGenerator: (block) => {
      const text = block.getFieldValue("TEXT");
      return `basic.show_string(${JSON.stringify(text)})\n`;
    },
    pythonExtractor: (match) => ({
      TEXT: match[2],
    }),
    blockCreator: (workspace, values) => {
      return createAndInitializeBlock(workspace, "show_string", {
        TEXT: values.TEXT,
      });
    },
  },
  {
    type: "pause",
    category: "Basic",
    blockDefinition: {
      type: "pause",
      message0: "pause %1 ms",
      args0: [
        {
          type: "field_number",
          name: "TIME",
          value: 1000,
        },
      ],
      previousStatement: null,
      nextStatement: null,
      tooltip: "Pause execution",
    },
    pythonPattern: /basic\.pause\((\d+)\)/g,
    pythonGenerator: (block) => {
      const time = block.getFieldValue("TIME");
      return `basic.pause(${time})\n`;
    },
    pythonExtractor: (match) => ({
      TIME: parseInt(match[1]),
    }),
    blockCreator: (workspace, values) => {
      return createAndInitializeBlock(workspace, "pause", {
        TIME: values.TIME,
      });
    },
  },

  // led blocks
  {
    type: "plot_led",
    category: "Led",
    blockDefinition: {
      type: "plot_led",
      message0: "plot x: %1 y: %2",
      args0: [
        { type: "field_number", name: "X", value: 0, min: 0, max: 4 },
        { type: "field_number", name: "Y", value: 0, min: 0, max: 4 },
      ],
      previousStatement: null,
      nextStatement: null,
      tooltip: "Turn on LED at (x, y)",
    },
    pythonPattern: /led\.plot\((\d+),\s*(\d+)\)/g,
    pythonGenerator: (block) => {
      const x = block.getFieldValue("X");
      const y = block.getFieldValue("Y");
      return `led.plot(${x}, ${y})\n`;
    },
    pythonExtractor: (match) => ({
      X: parseInt(match[1]),
      Y: parseInt(match[2]),
    }),
    blockCreator: (workspace, values) => {
      const block = workspace.newBlock("plot_led");
      block.setFieldValue(values.X, "X");
      block.setFieldValue(values.Y, "Y");
      return block;
    },
  },
  {
    type: "unplot_led",
    category: "Led",
    blockDefinition: {
      type: "unplot_led",
      message0: "unplot x: %1 y: %2",
      args0: [
        { type: "field_number", name: "X", value: 0, min: 0, max: 4 },
        { type: "field_number", name: "Y", value: 0, min: 0, max: 4 },
      ],
      previousStatement: null,
      nextStatement: null,
      tooltip: "Turn off LED at (x, y)",
    },
    pythonPattern: /led\.unplot\((\d+),\s*(\d+)\)/g,
    pythonGenerator: (block) => {
      const x = block.getFieldValue("X");
      const y = block.getFieldValue("Y");
      return `led.unplot(${x}, ${y})\n`;
    },
    pythonExtractor: (match) => ({
      X: parseInt(match[1]),
      Y: parseInt(match[2]),
    }),
    blockCreator: (workspace, values) => {
      const block = workspace.newBlock("unplot_led");
      block.setFieldValue(values.X, "X");
      block.setFieldValue(values.Y, "Y");
      return block;
    },
  },
  {
    type: "show_leds",
    blockDefinition: {
      type: "show_leds",
      message0: "show leds %1",
      args0: [
        {
          type: "field_multilinetext",
          name: "PATTERN",
          text: "00000\n00000\n00000\n00000\n00000",
        },
      ],
      previousStatement: null,
      nextStatement: null,
      tooltip: "Display pattern on LEDs",
    },
    pythonPattern: /display\.show\(Image\((['"'])((?:[01]{5}\n?){5})\1\)\)/g,
    pythonGenerator: (block) => {
      const pattern = block.getFieldValue("PATTERN");
      return `display.show(Image("${pattern}"))\n`;
    },
    pythonExtractor: (match) => ({
      PATTERN: match[2],
    }),
    blockCreator: (workspace, values) => {
      const block = workspace.newBlock("show_leds");
      block.setFieldValue(values.PATTERN, "PATTERN");
      return block;
    },
  },
  {
    // Led: plot with brightness (0..255)
    type: "plot_led_brightness",
    category: "Led",
    blockDefinition: {
      type: "plot_led_brightness",
      message0: "plot x %1 y %2 brightness %3",
      args0: [
        { type: "field_number", name: "X", value: 0, min: 0, max: 4 },
        { type: "field_number", name: "Y", value: 0, min: 0, max: 4 },
        { type: "field_slider", name: "BRIGHTNESS", value: 255, min: 0, max: 255, precision: 1 },
      ],
      previousStatement: null,
      nextStatement: null,
      tooltip: "Plot an LED at (x,y) with brightness 0-255",
    },
    // Custom Python mapping for our editor
    pythonPattern: /led\.plot_brightness\((\d+),\s*(\d+),\s*(\d+)\)/g,
    pythonGenerator: (block) => {
      const x = block.getFieldValue("X");
      const y = block.getFieldValue("Y");
      const b = block.getFieldValue("BRIGHTNESS");
      return `led.plot_brightness(${x}, ${y}, ${b})\n`;
    },
    pythonExtractor: (match) => ({
      X: parseInt(match[1]),
      Y: parseInt(match[2]),
      BRIGHTNESS: parseInt(match[3]),
    }),
    blockCreator: (workspace, values) => {
      const block = workspace.newBlock("plot_led_brightness");
      block.setFieldValue(values.X, "X");
      block.setFieldValue(values.Y, "Y");
      block.setFieldValue(values.BRIGHTNESS, "BRIGHTNESS");
      return block;
    },
  },
  {
    type: "toggle_led",
    category: "Led",
    blockDefinition: {
      type: "toggle_led",
      message0: "toggle x: %1 y: %2",
      args0: [
        { type: "field_number", name: "X", value: 0, min: 0, max: 4 },
        { type: "field_number", name: "Y", value: 0, min: 0, max: 4 },
      ],
      previousStatement: null,
      nextStatement: null,
      tooltip: "Toggle LED at (x, y)",
    },
    pythonPattern: /led\.toggle\((\d+),\s*(\d+)\)/g,
    pythonGenerator: (block) => {
      const x = block.getFieldValue("X");
      const y = block.getFieldValue("Y");
      return `led.toggle(${x}, ${y})\n`;
    },
    pythonExtractor: (match) => ({
      X: parseInt(match[1]),
      Y: parseInt(match[2]),
    }),
    blockCreator: (workspace, values) => {
      const block = workspace.newBlock("toggle_led");
      block.setFieldValue(values.X, "X");
      block.setFieldValue(values.Y, "Y");
      return block;
    },
  },
  {
    type: "point_led",
    category: "Led",
    blockDefinition: {
      type: "point_led",
      message0: "point x: %1 y: %2",
      args0: [
        { type: "field_number", name: "X", value: 0, min: 0, max: 4 },
        { type: "field_number", name: "Y", value: 0, min: 0, max: 4 },
      ],
      output: "Boolean",
      tooltip: "Check if LED at (x, y) is on",
    },
    pythonPattern: /led\.point\((\d+),\s*(\d+)\)/g,
    pythonGenerator: (block) => {
      const x = block.getFieldValue("X");
      const y = block.getFieldValue("Y");
      return [`led.point(${x}, ${y})`, 0];
    },
    pythonExtractor: (match) => ({
      X: parseInt(match[1]),
      Y: parseInt(match[2]),
    }),
    blockCreator: (workspace, values) => {
      const block = workspace.newBlock("point_led");
      block.setFieldValue(values.X, "X");
      block.setFieldValue(values.Y, "Y");
      return block;
    },
  },

  // logic blocks
  // if statement
  {
    type: "if_statement",
    category: "Logic",
    blockDefinition: {
      type: "if_statement",
      message0: "if %1 %2",
      args0: [
        {
          type: "input_value",
          name: "CONDITION",
          check: "Boolean",
        },
        {
          type: "input_statement",
          name: "DO",
        },
      ],
      previousStatement: null,
      nextStatement: null,
      tooltip: "If statement",
    },
    pythonPattern: /if\s+(.*?)\s*:\s*([\s\S]*?)(?=\n(?:\S|$))/g,
    pythonGenerator: (block, generator) => {
      const condition = generator.valueToCode(block, "CONDITION", Order.NONE);
      const statements = generator.statementToCode(block, "DO");
      return `if ${condition}:\n${statements.replace(/^/gm, "    ")}`;
    },
    pythonExtractor: (match) => ({
      CONDITION: match[1].trim(),
      STATEMENTS: match[2].trim(),
    }),
    blockCreator: (workspace, values) => {
      const block = workspace.newBlock("if_statement");
      block.setFieldValue(values.CONDITION, "CONDITION");
      return block;
    },
  },

  // input blocks
  {
    type: "button_is_pressed",
    category: "Input",
    blockDefinition: {
      type: "button_is_pressed",
      message0: "button %1 is pressed",
      args0: [
        {
          type: "field_dropdown",
          name: "BUTTON",
          options: [
            ["A", "A"],
            ["B", "B"],
            ["AB", "AB"],
          ],
        },
      ],
      output: "Boolean",
      tooltip: "Check if button is pressed",
    },
    pythonPattern: /button_([ab])\.is_pressed\(\)/gi,
    pythonGenerator: (block, generator) => {
      const button = block.getFieldValue("BUTTON").toLowerCase();
      return [
        `button_${button}.is_pressed()`,
        (generator as any).ORDER_NONE || 0,
      ];
    },
    pythonExtractor: (match) => ({
      BUTTON: match[1].toUpperCase(),
    }),
    blockCreator: (workspace, values) => {
      const block = workspace.newBlock("button_is_pressed");
      block.setFieldValue(values.BUTTON, "BUTTON");
      return block;
    },
  },
  {
    type: "forever",
    blockDefinition: {
      type: "forever",
      message0: "forever %1 %2",
      args0: [{ type: "input_dummy" }, { type: "input_statement", name: "DO" }],
      previousStatement: null,
      nextStatement: null,
      tooltip: "Runs code forever",
    },
    pythonPattern: /while\s+True\s*:([\s\S]*?)(?=\n(?:\S|$))/g,
    pythonGenerator: (block, generator) => {
      const statements = generator.statementToCode(block, "DO");
      return `while True:\n${statements.replace(/^/gm, "    ")}\n`;
    },
    pythonExtractor: (match) => ({
      STATEMENTS: match[1].trim(),
    }),
    blockCreator: (workspace, values) => {
      const block = workspace.newBlock("forever");
      // Note: Nested statements need to be handled separately
      return block;
    },
  },
  {
    type: "on_start",
    blockDefinition: {
      type: "on_start",
      message0: "on start %1 %2",
      args0: [{ type: "input_dummy" }, { type: "input_statement", name: "DO" }],
      tooltip: "Runs once at the start",
      nextStatement: null,
    },
    pythonPattern: /def\s+on_start\(\s*\)\s*:([\s\S]*?)(?=\n(?:\S|$))/g,
    pythonGenerator: (block, generator) => {
      const statements = generator.statementToCode(block, "DO");
      return `def on_start():\n${statements.replace(
        /^/gm,
        "    "
      )}\non_start()\n`;
    },
    pythonExtractor: (match) => ({
      STATEMENTS: match[1].trim(),
    }),
    blockCreator: (workspace, values) => {
      const block = workspace.newBlock("on_start");
      // Note: Nested statements need to be handled separately
      return block;
    },
  },
  {
    type: "microbit_accelerometer",
    blockDefinition: {
      type: "microbit_accelerometer",
      message0: "accelerometer %1",
      args0: [
        {
          type: "field_dropdown",
          name: "AXIS",
          options: [
            ["x", "x"],
            ["y", "y"],
            ["z", "z"],
          ],
        },
      ],
      output: "Number",
      tooltip: "Get accelerometer reading",
    },
    pythonPattern: /accelerometer\.get_([xyz])\(\)/g,
    pythonGenerator: (block, generator) => {
      const axis = block.getFieldValue("AXIS");
      return [
        `accelerometer.get_${axis}()`,
        (generator as any).ORDER_NONE || 0,
      ];
    },
    pythonExtractor: (match) => ({
      AXIS: match[1],
    }),
    blockCreator: (workspace, values) => {
      const block = workspace.newBlock("microbit_accelerometer");
      block.setFieldValue(values.AXIS, "AXIS");
      return block;
    },
  },
  {
    type: "microbit_pin_read",
    blockDefinition: {
      type: "microbit_pin_read",
      message0: "read analog pin %1",
      args0: [
        {
          type: "field_dropdown",
          name: "PIN",
          options: [
            ["0", "0"],
            ["1", "1"],
            ["2", "2"],
          ],
        },
      ],
      output: "Number",
      tooltip: "Read analog value from pin",
    },
    pythonPattern: /pin(\d+)\.read_analog\(\)/g,
    pythonGenerator: (block, generator) => {
      const pin = block.getFieldValue("PIN");
      return [`pin${pin}.read_analog()`, (generator as any).ORDER_NONE || 0];
    },
    pythonExtractor: (match) => ({
      PIN: match[1],
    }),
    blockCreator: (workspace, values) => {
      const block = workspace.newBlock("microbit_pin_read");
      block.setFieldValue(values.PIN, "PIN");
      return block;
    },
  },
  {
    type: "microbit_pin_write",
    blockDefinition: {
      type: "microbit_pin_write",
      message0: "write analog pin %1 value %2",
      args0: [
        {
          type: "field_dropdown",
          name: "PIN",
          options: [
            ["0", "0"],
            ["1", "1"],
            ["2", "2"],
          ],
        },
        {
          type: "field_number",
          name: "VALUE",
          value: 512,
          min: 0,
          max: 1023,
        },
      ],
      previousStatement: null,
      nextStatement: null,
      tooltip: "Write analog value to pin",
    },
    pythonPattern: /pin(\d+)\.write_analog\((\d+)\)/g,
    pythonGenerator: (block) => {
      const pin = block.getFieldValue("PIN");
      const value = block.getFieldValue("VALUE");
      return `pin${pin}.write_analog(${value})\n`;
    },
    pythonExtractor: (match) => ({
      PIN: match[1],
      VALUE: parseInt(match[2]),
    }),
    blockCreator: (workspace, values) => {
      const block = workspace.newBlock("microbit_pin_write");
      block.setFieldValue(values.PIN, "PIN");
      block.setFieldValue(values.VALUE, "VALUE");
      return block;
    },
  },
];

/**
 * Utility functions for working with shared block definitions
 *
 * This registry manages all block definitions and provides methods for:
 * - Registering blocks with Blockly
 * - Setting up Python code generators
 * - Finding blocks that match Python patterns
 * - Creating blocks from Python code
 */
export class SharedBlockRegistry {
  /**
   * Register all shared block definitions with Blockly
   * This makes the blocks available in the Blockly editor toolbox and workspace
   */
  static registerBlocks(): void {
    // Set block color to match category color before registering

    Blockly.utils.colour.setHsvSaturation(1);
    Blockly.utils.colour.setHsvValue(0.8314);
    SHARED_MICROBIT_BLOCKS.forEach((block) => {
      const category = block.category ?? "Uncategorized";
      const categoryObj = BLOCK_CATEGORIES.find((c) => c.name === category);
      if (categoryObj) {
        block.blockDefinition.colour = categoryObj.color;
      }
    });
    const blockDefinitions = SHARED_MICROBIT_BLOCKS.map(
      (block) => block.blockDefinition
    );
    Blockly.defineBlocksWithJsonArray(blockDefinitions);
  }

  /**
   * Register Python code generators for all block types
   * This enables blocks-to-Python conversion
   * @param pythonGenerator The Blockly Python generator instance
   */
  static registerPythonGenerators(pythonGenerator: any): void {
    SHARED_MICROBIT_BLOCKS.forEach((block) => {
      pythonGenerator.forBlock[block.type] = block.pythonGenerator;
    });
  }

  /**
   * Find a block definition by its type name
   * @param type The block type to find
   * @returns The block definition, or undefined if not found
   */
  static getBlockDefinition(type: string): SharedBlockDefinition | undefined {
    return SHARED_MICROBIT_BLOCKS.find((block) => block.type === type);
  }

  /**
   * Get all registered block type names
   * @returns Array of block type strings
   */
  static getBlockTypes(): string[] {
    return SHARED_MICROBIT_BLOCKS.map((block) => block.type);
  }

  /**
   * Find all block definitions that match the given Python code
   * Tests the code against each block's Python pattern
   * @param code The Python code to test
   * @returns Array of matching block definitions
   */
  static matchesPythonPattern(code: string): SharedBlockDefinition[] {
    const matches: SharedBlockDefinition[] = [];

    SHARED_MICROBIT_BLOCKS.forEach((block) => {
      // Reset regex state before testing
      block.pythonPattern.lastIndex = 0;
      if (block.pythonPattern.test(code)) {
        matches.push(block);
      }
    });

    return matches;
  }

  /**
   * Create a block from Python code using the appropriate block definition
   * @param workspace The Blockly workspace to create the block in
   * @param pythonCode The Python code line to parse
   * @param blockType The type of block to create
   * @returns The created block, or null if creation failed
   */
  static createBlockFromPython(
    workspace: Blockly.Workspace,
    pythonCode: string,
    blockType: string
  ): Blockly.Block | null {
    const blockDef = this.getBlockDefinition(blockType);
    if (!blockDef) {
      return null;
    }

    // Reset regex state and try to match the Python code
    blockDef.pythonPattern.lastIndex = 0;
    const match = blockDef.pythonPattern.exec(pythonCode);
    if (!match) {
      return null;
    }

    // Extract values from the matched Python code and create the block
    const values = blockDef.pythonExtractor(match);
    return blockDef.blockCreator(workspace, values);
  }
}

/**
 * Enhanced converter that uses shared block definitions for consistent bidirectional conversion
 *
 * This converter processes Python code line by line, matching each line against known patterns
 * and creating corresponding Blockly blocks. It handles block connections automatically.
 */
export class EnhancedPythonToBlocklyConverter {
  private workspace: Blockly.Workspace;

  constructor(workspace: Blockly.Workspace) {
    this.workspace = workspace;
  }

  /**
   * Convert Python code to Blockly blocks using shared definitions
   *
   * Process:
   * 1. Split Python code into individual lines
   * 2. For each line, find matching block patterns
   * 3. Create blocks using the shared block definitions
   * 4. Connect sequential blocks together
   *
   * @param pythonCode The complete Python code to convert
   * @returns Array of created Blockly blocks
   */
  convertPythonToBlocks(pythonCode: string): Blockly.Block[] {
    const blocks: Blockly.Block[] = [];
    const lines = pythonCode.split("\n");
    let currentLine = 0;

    // Process each line of Python code
    while (currentLine < lines.length) {
      const line = lines[currentLine].trim();

      // Skip empty lines and comments
      if (!line || line.startsWith("#")) {
        currentLine++;
        continue;
      }

      // Find block patterns that match this line
      const matchingBlocks = SharedBlockRegistry.matchesPythonPattern(line);

      if (matchingBlocks.length > 0) {
        // Use the first matching block type (most specific match)
        const blockDef = matchingBlocks[0];
        const block = SharedBlockRegistry.createBlockFromPython(
          this.workspace,
          line,
          blockDef.type
        );

        if (block) {
          blocks.push(block);
        }
      }

      currentLine++;
    }

    // Connect blocks that should be in sequence (e.g., statements in a program)
    this.connectSequentialBlocks(blocks);

    return blocks;
  }

  /**
   * Connect blocks that should be in sequence (statements that execute one after another)
   *
   * This method links blocks together using Blockly's connection system.
   * Only connects blocks that have the appropriate connection points:
   * - Current block must have a 'nextConnection'
   * - Next block must have a 'previousConnection'
   *
   * @param blocks Array of blocks to connect in order
   */
  private connectSequentialBlocks(blocks: Blockly.Block[]): void {
    for (let i = 0; i < blocks.length - 1; i++) {
      const currentBlock = blocks[i];
      const nextBlock = blocks[i + 1];

      // Only connect if both blocks have the right connection types
      if (currentBlock.nextConnection && nextBlock.previousConnection) {
        try {
          currentBlock.nextConnection.connect(nextBlock.previousConnection);
        } catch (error) {
          // Connection failed - blocks might already be connected or incompatible
          console.warn("Failed to connect blocks:", error);
        }
      }
    }
  }

  /**
   * Convert Python code to a specific block type (for targeted conversion)
   * @param pythonCode The Python code to convert
   * @param blockType The specific block type to create
   * @returns The created block, or null if conversion failed
   */
  convertToSpecificBlock(
    pythonCode: string,
    blockType: string
  ): Blockly.Block | null {
    return SharedBlockRegistry.createBlockFromPython(
      this.workspace,
      pythonCode,
      blockType
    );
  }
}

/**
 * Utility function to update existing BlocklyEditor to use shared definitions
 */
export function createUpdatedBlocklyEditor() {
  return {
    initializeSharedBlocks: () => {
      SharedBlockRegistry.registerBlocks();
    },

    setupPythonGenerators: (pythonGenerator: any) => {
      SharedBlockRegistry.registerPythonGenerators(pythonGenerator);
    },

    createConverter: (workspace: Blockly.Workspace) => {
      return new EnhancedPythonToBlocklyConverter(workspace);
    },
  };
}

export function createToolboxXmlFromBlocks(): string {
  // Default category name and color if not specified
  const DEFAULT_CATEGORY = "Uncategorized";
  const DEFAULT_COLOR = "#999999";

  // Helper: map category name -> color
  const categoryColorMap: Record<string, string> = {};
  BLOCK_CATEGORIES.forEach(({ name, color }) => {
    categoryColorMap[name] = color.toString(); // Convert to string if number
  });

  // Group blocks by category name
  const blocksByCategory: Record<string, SharedBlockDefinition[]> = {};
  for (const block of SHARED_MICROBIT_BLOCKS) {
    const category = block.category ?? DEFAULT_CATEGORY;
    if (!blocksByCategory[category]) {
      blocksByCategory[category] = [];
    }
    blocksByCategory[category].push(block);
  }

  // Helper: generate block XML string with default field values from blockDefinition
  function generateBlockXml(block: SharedBlockDefinition): string {
    // Look for fields with default values in blockDefinition.args0
    const args = block.blockDefinition.args0 || [];
    let fieldsXml = "";
    for (const arg of args) {
      if ("name" in arg) {
        // Only generate fields for these arg types: field_input, field_number, field_dropdown, field_multilinetext
        if (
          arg.type === "field_input" ||
          arg.type === "field_number" ||
          arg.type === "field_dropdown" ||
          arg.type === "field_multilinetext"
        ) {
          let defaultValue = "";
          if ("text" in arg) defaultValue = arg.text;
          else if ("value" in arg) defaultValue = arg.value;
          else if (
            "options" in arg &&
            Array.isArray(arg.options) &&
            arg.options.length > 0
          ) {
            // For dropdown, use first option's value as default
            defaultValue = arg.options[0][1];
          }
          fieldsXml += `\n      <field name="${arg.name}">${defaultValue}</field>`;
        }
      }
    }
    return `<block type="${block.type}">${fieldsXml}\n    </block>`;
  }

  // Compose category XML blocks
  let xml = `<xml xmlns="https://developers.google.com/blockly/xml">\n`;

  // Sort categories alphabetically or keep order as in BLOCK_CATEGORIES
  const categoriesInOrder = Object.keys(blocksByCategory).sort((a, b) => {
    const aIndex = BLOCK_CATEGORIES.findIndex((c) => c.name === a);
    const bIndex = BLOCK_CATEGORIES.findIndex((c) => c.name === b);
    if (aIndex === -1 && bIndex === -1) return a.localeCompare(b);
    if (aIndex === -1) return 1;
    if (bIndex === -1) return -1;
    return aIndex - bIndex;
  });

  for (const categoryName of categoriesInOrder) {
    const color = categoryColorMap[categoryName] ?? DEFAULT_COLOR;
    xml += `  <category name="${categoryName}" colour="${color}">\n`;

    const blocks = blocksByCategory[categoryName];
    for (const block of blocks) {
      xml += `    ${generateBlockXml(block)}\n`;
    }

    xml += `  </category>\n`;
  }

  xml += `</xml>`;
  (xml);
  return xml;
}
