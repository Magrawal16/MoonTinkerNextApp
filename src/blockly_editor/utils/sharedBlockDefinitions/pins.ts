import { SharedBlockDefinition } from "../sharedBlockDefinitions";
import { Order } from "blockly/python";

const BASE_PIN_OPTIONS: [string, string][] = [
  ["P0", "P0"],
  ["P1", "P1"],
  ["P2", "P2"],
];

const BREAKOUT_DIGITAL_ONLY_PINS: string[] = ["P5", "P8", "P11", "P13", "P14", "P15", "P16"];
const BREAKOUT_DIGITAL_PIN_OPTIONS: [string, string][] = [
  ...BASE_PIN_OPTIONS,
  ...BREAKOUT_DIGITAL_ONLY_PINS.map((p) => [p, p] as [string, string]),
];

const ACTIVE_CONTROLLER_KIND_STORAGE_KEY = "moontinker_activeControllerKind";

function isBreakoutController(): boolean {
  if (typeof window === "undefined") return false;
  try {
    const kind = localStorage.getItem(ACTIVE_CONTROLLER_KIND_STORAGE_KEY);
    return kind === "microbitWithBreakout";
  } catch {
    return false;
  }
}

function makeDropdownOptionsIncludingCurrent(
  options: [string, string][],
  currentValue: string | null | undefined
): [string, string][] {
  const value = (currentValue || "").trim();
  if (!value) return options;
  if (options.some((opt) => opt[1] === value)) return options;
  return [[value, value], ...options];
}

function digitalPinOptions(this: any): [string, string][] {
  const options = isBreakoutController() ? BREAKOUT_DIGITAL_PIN_OPTIONS : BASE_PIN_OPTIONS;
  const currentValue = typeof this?.getValue === "function" ? (this.getValue() as string) : undefined;
  return makeDropdownOptionsIncludingCurrent(options, currentValue);
}

export const PINS_BLOCKS: SharedBlockDefinition[] = [
  {
    type: "pins_digital_read_pin",
    category: "Pins",
    blockDefinition: {
      type: "pins_digital_read_pin",
      message0: "digital read pin %1",
      args0: [{ type: "field_dropdown", name: "PIN", options: digitalPinOptions as any }],
      output: "Number",
      tooltip: "Read a digital value (0 or 1) from a pin",
    },
    pythonPattern: /pins\.digital_read_pin\(\s*DigitalPin\.(P0|P1|P2|P5|P8|P11|P13|P14|P15|P16)\s*\)/g,
    pythonGenerator: (block) => {
      const pin = block.getFieldValue("PIN") || "P0";
      return [`pins.digital_read_pin(DigitalPin.${pin})`, (Order as any)?.NONE || 0];
    },
    pythonExtractor: (match) => ({ PIN: match[1] }),
    blockCreator: (workspace, values) => {
      const block = workspace.newBlock("pins_digital_read_pin");
      block.setFieldValue(values.PIN || "P0", "PIN");
      return block;
    },
  },
  {
    type: "pins_digital_write_pin",
    category: "Pins",
    blockDefinition: {
      type: "pins_digital_write_pin",
      message0: "digital write pin %1 to %2",
      args0: [
        { type: "field_dropdown", name: "PIN", options: digitalPinOptions as any },
        { type: "input_value", name: "VALUE", check: "Number" },
      ],
      previousStatement: null,
      nextStatement: null,
      tooltip: "Write a digital value (0 or 1) to a pin",
    },
    pythonPattern: /pins\.digital_write_pin\(\s*DigitalPin\.(P0|P1|P2|P5|P8|P11|P13|P14|P15|P16)\s*,\s*([^\)]+?)\s*\)/g,
    pythonGenerator: (block, generator) => {
      const pin = block.getFieldValue("PIN") || "P0";
      const valueCode =
        generator?.valueToCode?.(block, "VALUE", (generator as any).ORDER_NONE) || "0";
      return `pins.digital_write_pin(DigitalPin.${pin}, ${valueCode})\n`;
    },
    pythonExtractor: (match) => ({ PIN: match[1] }),
    blockCreator: (workspace, values) => {
      const block = workspace.newBlock("pins_digital_write_pin");
      block.setFieldValue(values.PIN || "P0", "PIN");
      return block;
    },
  },
  {
    type: "pins_read_analog_pin",
    category: "Pins",
    blockDefinition: {
      type: "pins_read_analog_pin",
      message0: "analog read pin %1",
      args0: [{ type: "field_dropdown", name: "PIN", options: BASE_PIN_OPTIONS }],
      output: "Number",
      tooltip: "Read an analog value (0–1023) from a pin",
    },
    pythonPattern: /pins\.read_analog_pin\(\s*AnalogPin\.(P0|P1|P2)\s*\)/g,
    pythonGenerator: (block) => {
      const pin = block.getFieldValue("PIN") || "P0";
      return [`pins.read_analog_pin(AnalogPin.${pin})`, (Order as any)?.NONE || 0];
    },
    pythonExtractor: (match) => ({ PIN: match[1] }),
    blockCreator: (workspace, values) => {
      const block = workspace.newBlock("pins_read_analog_pin");
      block.setFieldValue(values.PIN || "P0", "PIN");
      return block;
    },
  },
  {
    type: "pins_analog_write_pin",
    category: "Pins",
    blockDefinition: {
      type: "pins_analog_write_pin",
      message0: "analog write pin %1 to %2",
      args0: [
        { type: "field_dropdown", name: "PIN", options: digitalPinOptions as any },
        { type: "input_value", name: "VALUE", check: "Number" },
      ],
      previousStatement: null,
      nextStatement: null,
      tooltip: "Write an analog value (0–1023) to a pin",
    },
    pythonPattern:
      /pins\.analog_write_pin\(\s*AnalogPin\.(P0|P1|P2|P5|P8|P11|P13|P14|P15|P16)\s*,\s*([^\)]+?)\s*\)/g,
    pythonGenerator: (block, generator) => {
      const pin = block.getFieldValue("PIN") || "P0";
      const valueCode =
        generator?.valueToCode?.(block, "VALUE", (generator as any).ORDER_NONE) || "0";
      return `pins.analog_write_pin(AnalogPin.${pin}, ${valueCode})\n`;
    },
    pythonExtractor: (match) => ({ PIN: match[1] }),
    blockCreator: (workspace, values) => {
      const block = workspace.newBlock("pins_analog_write_pin");
      block.setFieldValue(values.PIN || "P0", "PIN");
      return block;
    },
  },
];
