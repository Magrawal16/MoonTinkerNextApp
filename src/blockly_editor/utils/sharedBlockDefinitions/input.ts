import { SharedBlockDefinition } from "../sharedBlockDefinitions";
import { Order } from "blockly/python";

const GESTURE_OPTIONS: [string, string][] = [
  ["shake", "SHAKE"],
  ["logo up", "LOGO_UP"],
  ["logo down", "LOGO_DOWN"],
  ["screen up", "SCREEN_UP"],
  ["screen down", "SCREEN_DOWN"],
  ["tilt left", "TILT_LEFT"],
  ["tilt right", "TILT_RIGHT"],
  ["free fall", "FREE_FALL"],
  ["3g", "THREE_G"],
  ["6g", "SIX_G"],
  ["8g", "EIGHT_G"],
];

export const INPUT_BLOCKS: SharedBlockDefinition[] = [
  {
    type: "on_button_pressed",
    category: "Input",
    blockDefinition: {
      type: "on_button_pressed",
      message0: "on button %1 pressed %2",
      args0: [
        { type: "field_dropdown", name: "BUTTON", options: [["A","A"],["B","B"],["A+B","AB"]] },
        { type: "input_statement", name: "DO" },
      ],
      tooltip: "Run when a button is pressed",
      nextStatement: null,
    },
    pythonPattern: /(?:async\s+)?def\s+on_button_pressed_(a|b|ab)\s*\(\s*\)\s*:([\s\S]*?)\n\s*input\.on_button_pressed\(\s*Button\.(A|B|AB)\s*,\s*([A-Za-z_]\w*)\s*\)/gi,
    pythonGenerator: (block, generator) => {
      const btn = block.getFieldValue("BUTTON");
      const IND = ((generator as any)?.INDENT ?? "    ") as string;
      const statements = generator.statementToCode(block, "DO");
      const funcName = `on_button_pressed_${btn.toLowerCase()}`;
      let needsAsync = false;
      try {
        const doInput = block.getInputTargetBlock("DO");
        if (doInput) {
          const desc = doInput.getDescendants(false);
          for (const d of desc) { if (d && d.type === "music_record_and_play") { needsAsync = true; break; } }
        }
      } catch {}
      const body = statements && statements.trim().length ? statements : `${IND}pass\n`;
      const asyncKeyword = needsAsync ? "async " : "";
      return `${asyncKeyword}def ${funcName}():\n${body}input.on_button_pressed(Button.${btn}, ${funcName})\n`;
    },
    pythonExtractor: (match) => ({ BUTTON: (match[3] || match[1]).toUpperCase(), STATEMENTS: (match[2] || "").trim() }),
    blockCreator: (workspace, values) => {
      const block = workspace.newBlock("on_button_pressed");
      block.setFieldValue(values.BUTTON || "A", "BUTTON");
      return block;
    },
  },
  {
    type: "button_is_pressed",
    category: "Input",
    blockDefinition: {
      type: "button_is_pressed",
      message0: "button %1 is pressed",
      args0: [ { type: "field_dropdown", name: "BUTTON", options: [["A","A"],["B","B"],["A+B","AB"]] } ],
      output: "Boolean",
      tooltip: "Check whether a button is currently pressed",
    },
    pythonPattern: /input\.button_is_pressed\(\s*Button\.(A|B|AB)\s*\)/g,
    pythonGenerator: (block) => {
      const btn = block.getFieldValue("BUTTON") || "A";
      return [`input.button_is_pressed(Button.${btn})`, (Order as any)?.NONE || 0];
    },
    pythonExtractor: (match) => ({ BUTTON: match[1].toUpperCase() }),
    blockCreator: (workspace, values) => {
      const block = workspace.newBlock("button_is_pressed");
      block.setFieldValue(values.BUTTON || "A", "BUTTON");
      return block;
    },
  },
  {
    type: "on_gesture",
    category: "Input",
    blockDefinition: {
      type: "on_gesture",
      message0: "on gesture %1 %2",
      args0: [
        { type: "field_dropdown", name: "GESTURE", options: GESTURE_OPTIONS },
        { type: "input_statement", name: "DO" },
      ],
      tooltip: "Run when a gesture is detected",
      nextStatement: null,
    },
    pythonPattern:
      /(?:async\s+)?def\s+on_gesture_([a-z0-9_]+)\s*\(\s*\)\s*:([\s\S]*?)\n\s*input\.on_gesture\(\s*Gesture\.(SHAKE|LOGO_UP|LOGO_DOWN|SCREEN_UP|SCREEN_DOWN|TILT_LEFT|TILT_RIGHT|FREE_FALL|THREE_G|SIX_G|EIGHT_G)\s*,\s*([A-Za-z_]\w*)\s*\)/gi,
    pythonGenerator: (block, generator) => {
      const gestureKey = (block.getFieldValue("GESTURE") || "SHAKE") as string;
      const IND = ((generator as any)?.INDENT ?? "    ") as string;
      const statements = generator.statementToCode(block, "DO");
      const funcName = `on_gesture_${gestureKey.toLowerCase()}`;
      let needsAsync = false;
      try {
        const doInput = block.getInputTargetBlock("DO");
        if (doInput) {
          const desc = doInput.getDescendants(false);
          for (const d of desc) {
            if (d && d.type === "music_record_and_play") {
              needsAsync = true;
              break;
            }
          }
        }
      } catch {}
      const body = statements && statements.trim().length ? statements : `${IND}pass\n`;
      const asyncKeyword = needsAsync ? "async " : "";
      return `${asyncKeyword}def ${funcName}():\n${body}input.on_gesture(Gesture.${gestureKey}, ${funcName})\n`;
    },
    pythonExtractor: (match) => ({
      GESTURE: (match[3] || match[1] || "SHAKE").toUpperCase(),
      STATEMENTS: (match[2] || "").trim(),
    }),
    blockCreator: (workspace, values) => {
      const block = workspace.newBlock("on_gesture");
      block.setFieldValue(values.GESTURE || "SHAKE", "GESTURE");
      return block;
    },
  },
  {
    type: "is_gesture",
    category: "Input",
    blockDefinition: {
      type: "is_gesture",
      message0: "gesture %1",
      args0: [{ type: "field_dropdown", name: "GESTURE", options: GESTURE_OPTIONS }],
      output: "Boolean",
      tooltip: "Check whether a gesture is currently active",
    },
    pythonPattern:
      /input\.is_gesture\(\s*Gesture\.(SHAKE|LOGO_UP|LOGO_DOWN|SCREEN_UP|SCREEN_DOWN|TILT_LEFT|TILT_RIGHT|FREE_FALL|THREE_G|SIX_G|EIGHT_G)\s*\)/g,
    pythonGenerator: (block) => {
      const gestureKey = (block.getFieldValue("GESTURE") || "SHAKE") as string;
      return [`input.is_gesture(Gesture.${gestureKey})`, (Order as any)?.NONE || 0];
    },
    pythonExtractor: (match) => ({ GESTURE: (match[1] || "SHAKE").toUpperCase() }),
    blockCreator: (workspace, values) => {
      const block = workspace.newBlock("is_gesture");
      block.setFieldValue(values.GESTURE || "SHAKE", "GESTURE");
      return block;
    },
  },
  {
    type: "on_logo_pressed",
    category: "Input",
    blockDefinition: {
      type: "on_logo_pressed",
      message0: "on logo pressed %1",
      args0: [
        { type: "input_statement", name: "DO" },
      ],
      tooltip: "Run when the logo touch sensor is pressed",
    },
    pythonPattern: /(?:async\s+)?def\s+on_logo_pressed\s*\(\s*\)\s*:([\s\S]*?)\n\s*input\.on_logo_pressed\(\s*([A-Za-z_]\w*)\s*\)/gi,
    pythonGenerator: (block, generator) => {
      const IND = ((generator as any)?.INDENT ?? "    ") as string;
      const statements = generator.statementToCode(block, "DO");
      const funcName = "on_logo_pressed";
      let needsAsync = false;
      try {
        const doInput = block.getInputTargetBlock("DO");
        if (doInput) {
          const desc = doInput.getDescendants(false);
          for (const d of desc) { if (d && d.type === "music_record_and_play") { needsAsync = true; break; } }
        }
      } catch {}
      const body = statements && statements.trim().length ? statements : `${IND}pass\n`;
      const asyncKeyword = needsAsync ? "async " : "";
      return `${asyncKeyword}def ${funcName}():\n${body}input.on_logo_pressed(${funcName})\n`;
    },
    pythonExtractor: (match) => ({ STATEMENTS: (match[1] || "").trim() }),
    blockCreator: (workspace, values) => {
      const block = workspace.newBlock("on_logo_pressed");
      return block;
    },
  },
  {
    type: "on_logo_released",
    category: "Input",
    blockDefinition: {
      type: "on_logo_released",
      message0: "on logo released %1",
      args0: [
        { type: "input_statement", name: "DO" },
      ],
      tooltip: "Run when the logo touch sensor is released",
    },
    pythonPattern: /(?:async\s+)?def\s+on_logo_released\s*\(\s*\)\s*:([\s\S]*?)\n\s*input\.on_logo_released\(\s*([A-Za-z_]\w*)\s*\)/gi,
    pythonGenerator: (block, generator) => {
      const IND = ((generator as any)?.INDENT ?? "    ") as string;
      const statements = generator.statementToCode(block, "DO");
      const funcName = "on_logo_released";
      let needsAsync = false;
      try {
        const doInput = block.getInputTargetBlock("DO");
        if (doInput) {
          const desc = doInput.getDescendants(false);
          for (const d of desc) { if (d && d.type === "music_record_and_play") { needsAsync = true; break; } }
        }
      } catch {}
      const body = statements && statements.trim().length ? statements : `${IND}pass\n`;
      const asyncKeyword = needsAsync ? "async " : "";
      return `${asyncKeyword}def ${funcName}():\n${body}input.on_logo_released(${funcName})\n`;
    },
    pythonExtractor: (match) => ({ STATEMENTS: (match[1] || "").trim() }),
    blockCreator: (workspace, values) => {
      const block = workspace.newBlock("on_logo_released");
      return block;
    },
  },
  {
    type: "logo_is_pressed",
    category: "Input",
    blockDefinition: {
      type: "logo_is_pressed",
      message0: "logo is pressed",
      args0: [],
      output: "Boolean",
      tooltip: "Check whether the logo touch sensor is currently pressed",
    },
    pythonPattern: /input\.logo_is_pressed\(\s*\)/g,
    pythonGenerator: (block) => {
      return [`input.logo_is_pressed()`, (Order as any)?.NONE || 0];
    },
    pythonExtractor: (match) => ({}),
    blockCreator: (workspace, values) => {
      const block = workspace.newBlock("logo_is_pressed");
      return block;
    },
  },
  {
    type: "light_level",
    category: "Input",
    blockDefinition: {
      type: "light_level",
      message0: "light level",
      output: "Number",
      tooltip: "Get the current ambient light level (0–255)",
    },
    pythonPattern: /input\.light_level\(\s*\)/g,
    pythonGenerator: (_block) => {
      return [`input.light_level()`, (Order as any)?.NONE || 0];
    },
    pythonExtractor: () => ({}),
    blockCreator: (workspace) => workspace.newBlock("light_level"),
  },
  {
    type: "temperature",
    category: "Input",
    blockDefinition: {
      type: "temperature",
      message0: "temperature (°C)",
      output: "Number",
      tooltip: "Get the temperature in degrees Celsius",
    },
    // Prefer MakeCode-style input.temperature(); also accept basic.temperature() for compatibility
    pythonPattern: /(?:input|basic)\.temperature\(\s*\)/g,
    pythonGenerator: (_block) => {
      return [`input.temperature()`, (Order as any)?.NONE || 0];
    },
    pythonExtractor: () => ({}),
    blockCreator: (workspace) => workspace.newBlock("temperature"),
  },
];
