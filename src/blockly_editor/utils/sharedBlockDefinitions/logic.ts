import * as Blockly from "blockly";
import { SharedBlockDefinition } from "../sharedBlockDefinitions";

export const LOGIC_BLOCKS: SharedBlockDefinition[] = [
  {
    type: "controls_if",
    category: "Logic",
    blockDefinition: {
      type: "controls_if",
      message0: "if %1 then %2",
      args0: [
        { type: "input_value", name: "IF0", check: "Boolean" },
        { type: "input_statement", name: "DO0" },
      ],
      previousStatement: null,
      nextStatement: null,
      tooltip: "If / else if / else",
      mutator: "controls_if_mutator",
    },
    pythonPattern: /\bif\b[\s\S]*?:/g,
    pythonGenerator: (block, generator) => {
      let n = 0;
      let code = "";
      const IND = ((generator as any)?.INDENT ?? "    ") as string;
      const ensureBody = (s: string) => {
        if (s && s.trim().length > 0) return s;
        return IND + "# your code here\n";
      };
      const condition0 = generator.valueToCode(block, "IF0", (generator as any).ORDER_NONE) || "True";
      const branch0 = generator.statementToCode(block, "DO0");
      code += `if ${condition0}:\n${ensureBody(branch0)}`;
      for (n = 1; block.getInput("IF" + n); n++) {
        const cond = generator.valueToCode(block, "IF" + n, (generator as any).ORDER_NONE) || "False";
        const branch = generator.statementToCode(block, "DO" + n);
        code += `elif ${cond}:\n${ensureBody(branch)}`;
      }
      if (block.getInput("ELSE")) {
        const elseBranch = generator.statementToCode(block, "ELSE");
        code += `else:\n${ensureBody(elseBranch)}`;
      }
      if (!code.endsWith("\n")) code += "\n";
      return code;
    },
    pythonExtractor: () => ({}),
    blockCreator: (workspace) => {
      return (workspace as any).newBlock("controls_if");
    },
  },
  {
    type: "logic_compare",
    category: "Logic",
    blockDefinition: {
      type: "logic_compare",
      message0: "%1 %2 %3",
      args0: [
        { type: "input_value", name: "A" },
        { type: "field_dropdown", name: "OP", options: [["=", "EQ"], ["≠", "NEQ"], ["<", "LT"], ["≤", "LTE"], [">", "GT"], ["≥", "GTE"]] },
        { type: "input_value", name: "B" },
      ],
      inputsInline: true,
      output: "Boolean",
      tooltip: "Comparison",
    },
    pythonPattern: /(.+)\s*(==|!=|<|<=|>|>=)\s*(.+)/g,
    pythonGenerator: (block, generator) => {
      const a = generator.valueToCode(block, "A", (generator as any).ORDER_RELATIONAL || 0) || "0";
      const b = generator.valueToCode(block, "B", (generator as any).ORDER_RELATIONAL || 0) || "0";
      const op = block.getFieldValue("OP");
      const ops = { EQ: "==", NEQ: "!=", LT: "<", LTE: "<=", GT: ">", GTE: ">=" };
      const code = `${a} ${(ops as Record<string, string>)[op] || "=="} ${b}`;
      return [code, (generator as any).ORDER_RELATIONAL || 0];
    },
    pythonExtractor: () => ({}),
    blockCreator: (workspace) => workspace.newBlock("logic_compare"),
  },
  {
    type: "logic_operation",
    category: "Logic",
    blockDefinition: {
      type: "logic_operation",
      message0: "%1 %2 %3",
      args0: [
        { type: "input_value", name: "A", check: "Boolean" },
        { type: "field_dropdown", name: "OP", options: [["and", "AND"], ["or", "OR"]] },
        { type: "input_value", name: "B", check: "Boolean" },
      ],
      inputsInline: true,
      output: "Boolean",
      tooltip: "Boolean operation",
    },
    pythonPattern: /(.+)\s*(and|or)\s*(.+)/g,
    pythonGenerator: (block, generator) => {
      const op = block.getFieldValue("OP");
      const order = op === "AND" ? (generator as any).ORDER_LOGICAL_AND : (generator as any).ORDER_LOGICAL_OR;
      const a = generator.valueToCode(block, "A", order) || "False";
      const b = generator.valueToCode(block, "B", order) || "False";
      const code = `${a} ${op.toLowerCase()} ${b}`;
      return [code, order];
    },
    pythonExtractor: () => ({}),
    blockCreator: (workspace) => workspace.newBlock("logic_operation"),
  },
  {
    type: "logic_negate",
    category: "Logic",
    blockDefinition: {
      type: "logic_negate",
      message0: "not %1",
      args0: [
        { type: "input_value", name: "BOOL", check: "Boolean" },
      ],
      inputsInline: true,
      output: "Boolean",
      tooltip: "Negate a boolean value",
    },
    pythonPattern: /not\s+(.+)/g,
    pythonGenerator: (block, generator) => {
      const bool = generator.valueToCode(block, "BOOL", (generator as any).ORDER_LOGICAL_NOT || 0) || "False";
      const code = `not ${bool}`;
      return [code, (generator as any).ORDER_LOGICAL_NOT || 0];
    },
    pythonExtractor: () => ({}),
    blockCreator: (workspace) => workspace.newBlock("logic_negate"),
  },
  {
    type: "logic_boolean",
    category: "Logic",
    blockDefinition: {
      type: "logic_boolean",
      message0: "%1",
      args0: [
        { type: "field_dropdown", name: "BOOL", options: [["true", "TRUE"], ["false", "FALSE"]] },
      ],
      inputsInline: true,
      output: "Boolean",
      tooltip: "Boolean value",
    },
    pythonPattern: /(True|False)/g,
    pythonGenerator: (block, generator) => {
      const bool = block.getFieldValue("BOOL");
      const code = bool === "TRUE" ? "True" : "False";
      return [code, (generator as any).ORDER_ATOMIC || 0];
    },
    pythonExtractor: () => ({}),
    blockCreator: (workspace) => workspace.newBlock("logic_boolean"),
  },
];
