import { SharedBlockDefinition } from "../sharedBlockDefinitions";
import { Order } from "blockly/python";

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
];
