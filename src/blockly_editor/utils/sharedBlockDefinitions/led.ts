import { SharedBlockDefinition } from "../sharedBlockDefinitions";

export const LED_BLOCKS: SharedBlockDefinition[] = [
  {
    type: "plot_led",
    category: "Led",
    blockDefinition: { type: "plot_led", message0: "plot x: %1 y: %2", args0: [ { type: "input_value", name: "X", check: "Number" }, { type: "input_value", name: "Y", check: "Number" } ], inputsInline: true, previousStatement: null, nextStatement: null, tooltip: "Turn on LED at (x, y)" },
    pythonPattern: /led\.plot\((\d+),\s*(\d+)\)/g,
    pythonGenerator: (block, generator) => {
      const x = generator.valueToCode(block, "X", (generator as any).ORDER_NONE) || "0";
      const y = generator.valueToCode(block, "Y", (generator as any).ORDER_NONE) || "0";
      return `led.plot(${x}, ${y})\n`;
    },
    pythonExtractor: (match) => ({ X: parseInt(match[1]), Y: parseInt(match[2]) }),
    blockCreator: (workspace, values) => workspace.newBlock("plot_led"),
  },
  {
    type: "unplot_led",
    category: "Led",
    blockDefinition: { type: "unplot_led", message0: "unplot x: %1 y: %2", args0: [ { type: "input_value", name: "X", check: "Number" }, { type: "input_value", name: "Y", check: "Number" } ], inputsInline: true, previousStatement: null, nextStatement: null, tooltip: "Turn off LED at (x, y)" },
    pythonPattern: /led\.unplot\((\d+),\s*(\d+)\)/g,
    pythonGenerator: (block, generator) => {
      const x = generator.valueToCode(block, "X", (generator as any).ORDER_NONE) || "0";
      const y = generator.valueToCode(block, "Y", (generator as any).ORDER_NONE) || "0";
      return `led.unplot(${x}, ${y})\n`;
    },
    pythonExtractor: (match) => ({ X: parseInt(match[1]), Y: parseInt(match[2]) }),
    blockCreator: (workspace, values) => workspace.newBlock("unplot_led"),
  },
  {
    type: "plot_led_brightness",
    category: "Led",
    blockDefinition: { type: "plot_led_brightness", message0: "plot x %1 y %2 brightness %3", args0: [ { type: "input_value", name: "X", check: "Number" }, { type: "input_value", name: "Y", check: "Number" }, { type: "field_slider", name: "BRIGHTNESS", value: 255, min: 0, max: 255, precision: 1 } ], inputsInline: true, previousStatement: null, nextStatement: null, tooltip: "Plot an LED at (x,y) with brightness 0-255" },
    pythonPattern: /led\.plot_brightness\((\d+),\s*(\d+),\s*(\d+)\)/g,
    pythonGenerator: (block, generator) => {
      const x = generator.valueToCode(block, "X", (generator as any).ORDER_NONE) || "0";
      const y = generator.valueToCode(block, "Y", (generator as any).ORDER_NONE) || "0";
      const b = block.getFieldValue("BRIGHTNESS") || "255";
      return `led.plot_brightness(${x}, ${y}, ${b})\n`;
    },
    pythonExtractor: (match) => ({ X: parseInt(match[1], 10), Y: parseInt(match[2], 10), BRIGHTNESS: parseInt(match[3], 10) }),
    blockCreator: (workspace, values) => workspace.newBlock("plot_led_brightness"),
  },
  {
    type: "toggle_led",
    category: "Led",
    blockDefinition: { type: "toggle_led", message0: "toggle x: %1 y: %2", args0: [ { type: "input_value", name: "X", check: "Number" }, { type: "input_value", name: "Y", check: "Number" } ], inputsInline: true, previousStatement: null, nextStatement: null, tooltip: "Toggle LED at (x, y)" },
    pythonPattern: /led\.toggle\((\d+),\s*(\d+)\)/g,
    pythonGenerator: (block, generator) => {
      const x = generator.valueToCode(block, "X", (generator as any).ORDER_NONE) || "0";
      const y = generator.valueToCode(block, "Y", (generator as any).ORDER_NONE) || "0";
      return `led.toggle(${x}, ${y})\n`;
    },
    pythonExtractor: (match) => ({ X: parseInt(match[1]), Y: parseInt(match[2]) }),
    blockCreator: (workspace, values) => workspace.newBlock("toggle_led"),
  },
  {
    type: "point_led",
    category: "Led",
    blockDefinition: { type: "point_led", message0: "point x: %1 y: %2", args0: [ { type: "input_value", name: "X", check: "Number" }, { type: "input_value", name: "Y", check: "Number" } ], inputsInline: true, output: "Boolean", tooltip: "Check if LED at (x, y) is on" },
    pythonPattern: /led\.point\((\d+),\s*(\d+)\)/g,
    pythonGenerator: (block, generator) => {
      const x = generator.valueToCode(block, "X", (generator as any).ORDER_NONE) || "0";
      const y = generator.valueToCode(block, "Y", (generator as any).ORDER_NONE) || "0";
      return [`led.point(${x}, ${y})`, 0];
    },
    pythonExtractor: (match) => ({ X: parseInt(match[1]), Y: parseInt(match[2]) }),
    blockCreator: (workspace, values) => workspace.newBlock("point_led"),
  },
];
