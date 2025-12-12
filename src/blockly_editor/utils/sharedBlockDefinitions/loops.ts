import { SharedBlockDefinition } from "../sharedBlockDefinitions";
import * as Blockly from "blockly";

Blockly.Extensions.register("validate_for_of_list", function(this: Blockly.Block) {
  this.setOnChange(function(this: Blockly.Block, event: Blockly.Events.Abstract) {
    const workspace = this.workspace as any;
    if (!workspace || workspace.isDragging?.()) {
      return;
    }

    const listInput = this.getInput("LIST");
    const listBlock = listInput?.connection?.targetBlock();
    const varInput = this.getInput("VAR");
    const varBlock = varInput?.connection?.targetBlock();

    let errorMessage = null;
    let hasError = false;

    // Check if list input is missing
    if (!listBlock) {
      errorMessage = "The 'for of' block must have a list input";
      hasError = true;
    } 
    // Check if both VAR and LIST use the same variable name
    else if (varBlock && varBlock.type === "variables_get" && 
             listBlock && listBlock.type === "variables_get") {
      const varId = varBlock.getFieldValue("VAR");
      const listVarId = listBlock.getFieldValue("VAR");
      
      // Get variable names from IDs
      const getVarName = (id: string) => {
        try {
          const variable = workspace.getVariableById?.(id);
          return variable?.name || id;
        } catch {
          return id;
        }
      };
      
      const varName = getVarName(varId);
      const listVarName = getVarName(listVarId);
      
      if (varName === listVarName) {
        errorMessage = `Block-scoped variable '${varName}' used before its declaration.`;
        hasError = true;
      }
    }

    // Apply or remove error styling
    if (hasError) {
      this.setWarningText(errorMessage);
      
      const blockSvg = this as any;
      if (blockSvg.getSvgRoot) {
        const svgRoot = blockSvg.getSvgRoot();
        const pathElement = svgRoot.querySelector('.blocklyPath');
        if (pathElement) {
          pathElement.setAttribute('stroke', '#ff0000');
          pathElement.setAttribute('stroke-width', '3');
        }
      }
    } else {
      this.setWarningText(null);
      
      const blockSvg = this as any;
      if (blockSvg.getSvgRoot) {
        const svgRoot = blockSvg.getSvgRoot();
        const pathElement = svgRoot.querySelector('.blocklyPath');
        if (pathElement) {
          pathElement.removeAttribute('stroke');
          pathElement.removeAttribute('stroke-width');
        }
      }
    }
  });
});

function indentBodyIfNeeded(code: string, IND: string): string {
  if (!code || code.trim().length === 0) return `${IND}pass\n`;
  const normalized = code.replace(/\r/g, "");
  const lines = normalized.split("\n");
  const firstContent = lines.find((l) => l.trim().length > 0) ?? "";
  const startsIndented = /^\s+/.test(firstContent);
  const processed = startsIndented ? lines : lines.map((l) => (l.trim().length === 0 ? l : IND + l));
  let out = processed.join("\n");
  if (!out.endsWith("\n")) out += "\n";
  return out;
}

function attachNumberShadow(
  workspace: Blockly.Workspace,
  hostBlock: Blockly.Block,
  inputName: string,
  defaultValue: number
): void {
  try {
    const num = workspace.newBlock("math_number");
    (num as any).setShadow(true);
    (num as any).setFieldValue(String(Number.isFinite(defaultValue) ? defaultValue : 0), "NUM");
    if ((num as any).initSvg) (num as any).initSvg();
    if ((num as any).render) (num as any).render();
    const input = hostBlock.getInput(inputName);
    input?.connection?.connect((num as any).outputConnection);
  } catch (_) {}
}

function attachVariableShadow(
  workspace: Blockly.Workspace,
  hostBlock: Blockly.Block,
  inputName: string,
  varName: string
): void {
  try {
    const varBlock = workspace.newBlock("variables_get");
    (varBlock as any).setShadow(true);
    
    let variable = workspace.getVariable(varName);
    if (!variable) {
      variable = workspace.createVariable(varName);
    }
    
    varBlock.setFieldValue(variable.getId(), "VAR");
    
    if ((varBlock as any).initSvg) (varBlock as any).initSvg();
    if ((varBlock as any).render) (varBlock as any).render();
    
    const input = hostBlock.getInput(inputName);
    input?.connection?.connect((varBlock as any).outputConnection);
  } catch (e) {
    console.error("Error attaching variable shadow:", e);
  }
}

export const LOOPS_BLOCKS: SharedBlockDefinition[] = [
  {
    type: "loops_repeat",
    category: "Loops",
    blockDefinition: {
      type: "loops_repeat",
      message0: "repeat %1 times %2 %3",
      args0: [
        { type: "input_value", name: "TIMES", check: "Number" },
        { type: "input_dummy" },
        { type: "input_statement", name: "DO" },
      ],
      previousStatement: null,
      nextStatement: null,
      tooltip: "Repeat a set of statements a fixed number of times",
    },
    pythonPattern: /for\s+[A-Za-z_]\w*\s+in\s+range\(\s*(\d+)\s*\)\s*:/g,
    pythonGenerator: (block, generator) => {
      const times = generator.valueToCode(block, "TIMES", (generator as any).ORDER_NONE) || "0";
      const IND = ((generator as any)?.INDENT ?? "    ") as string;
      const statements = generator.statementToCode(block, "DO");
      const body = indentBodyIfNeeded(statements, IND);
      return `for _ in range(${times}):\n${body}`;
    },
    pythonExtractor: (match) => ({
      TIMES: parseInt(match[1]),
    }),
    blockCreator: (workspace, values) => {
      const block = workspace.newBlock("loops_repeat");
      if (workspace.rendered && (block as any).initSvg) (block as any).initSvg();
      const timesVal = Number(values.TIMES);
      attachNumberShadow(
        workspace,
        block,
        "TIMES",
        Number.isFinite(timesVal) ? timesVal : 4
      );
      if ((block as any).render) (block as any).render();
      return block;
    },
  },
  {
    type: "loops_while",
    category: "Loops",
    blockDefinition: {
      type: "loops_while",
      message0: "while %1 %2 %3",
      args0: [
        {
          type: "field_dropdown",
          name: "COND",
          options: [
            ["true", "true"],
            ["false", "false"],
          ],
        },
        { type: "input_dummy" },
        { type: "input_statement", name: "DO" },
      ],
      previousStatement: null,
      nextStatement: null,
      tooltip: "Repeat while the condition is true",
    },
    pythonPattern: /while\s+(true|false|True|False)\s*:/g,
    pythonGenerator: (block, generator) => {
      const cond = block.getFieldValue("COND") || "true";
      const IND = ((generator as any)?.INDENT ?? "    ") as string;
      const statements = generator.statementToCode(block, "DO");
      const body = indentBodyIfNeeded(statements, IND);
      return `while ${cond}:\n${body}`;
    },
    pythonExtractor: (match) => ({
      COND: (match[1] || "true").toLowerCase(),
    }),
    blockCreator: (workspace) => {
      const block = workspace.newBlock("loops_while");
      block.setFieldValue("true", "COND");
      if (workspace.rendered && (block as any).initSvg) (block as any).initSvg();
      if ((block as any).render) (block as any).render();
      return block;
    },
  },
  {
    type: "loops_for_range",
    category: "Loops",
    blockDefinition: {
      type: "loops_for_range",
      message0: "for %1 from 0 to %2 %3 %4",
      args0: [
        { type: "input_value", name: "VAR", check: "Variable" },
        { type: "input_value", name: "TO", check: "Number" },
        { type: "input_dummy" },
        { type: "input_statement", name: "DO" },
      ],
      previousStatement: null,
      nextStatement: null,
      inputsInline: true,
      colour: "#00aa00",
      tooltip: "Count from 0 to end and run the loop body",
    },
    pythonPattern: /for\s+([A-Za-z_]\w*)\s+in\s+range\(\s*0\s*,\s*([^\)]+)\)\s*:/g,
    pythonGenerator: (block, generator) => {
      const IND = ((generator as any)?.INDENT ?? "    ") as string;
      const varCode = generator.valueToCode(block, "VAR", (generator as any).ORDER_NONE);
      const toCode = generator.valueToCode(block, "TO", (generator as any).ORDER_NONE) || "0";
      const statements = generator.statementToCode(block, "DO");
      const body = indentBodyIfNeeded(statements, IND);
      
      // Extract variable name from the code
      const varName = varCode || "index";
      
      return `for ${varName} in range(0, (${toCode}) + 1):\n${body}`;
    },
    pythonExtractor: (match) => {
      const toRaw = (match[2] || "").trim();
      const normalizedTo = toRaw.replace(/\s*\+\s*1\s*$/, "");
      return {
        VAR: match[1] || "index",
        TO: normalizedTo,
      };
    },
    blockCreator: (workspace, values) => {
      const block = workspace.newBlock("loops_for_range");
      if (workspace.rendered && (block as any).initSvg) (block as any).initSvg();
      
      // Attach variable shadow for VAR
      attachVariableShadow(workspace, block, "VAR", values.VAR || "index");
      
      // Attach number shadow for TO
      const toVal = Number(values.TO);
      attachNumberShadow(workspace, block, "TO", Number.isFinite(toVal) ? toVal : 4);
      
      if ((block as any).render) (block as any).render();
      return block;
    },
  },
  {
    type: "loops_for_of",
    category: "Loops",
    blockDefinition: {
      type: "loops_for_of",
      message0: "for element %1 of list %2 %3 %4",
      args0: [
        { type: "input_value", name: "VAR", check: "Variable" },
        { type: "input_value", name: "LIST", check: ["Array", "Variable"] },
        { type: "input_dummy" },
        { type: "input_statement", name: "DO" },
      ],
      previousStatement: null,
      nextStatement: null,
      inputsInline: true,
      colour: "#00aa00",
      tooltip: "Loop over each item in a list",
      extensions: ["validate_for_of_list"],
    },
    pythonPattern: /for\s+([A-Za-z_]\w*)\s+in\s+(.+)\s*:/g,
    pythonGenerator: (block, generator) => {
      const IND = ((generator as any)?.INDENT ?? "    ") as string;
      const varCode = generator.valueToCode(block, "VAR", (generator as any).ORDER_NONE);
      const listCode = generator.valueToCode(block, "LIST", (generator as any).ORDER_NONE) || "list";
      const statements = generator.statementToCode(block, "DO");
      const body = indentBodyIfNeeded(statements, IND);
      
      // Extract variable name
      const varName = varCode || "value";
      
      return `for ${varName} in ${listCode}:\n${body}`;
    },
    pythonExtractor: (match) => ({
      VAR: match[1] || "value",
      LIST: match[2]?.trim(),
    }),
    blockCreator: (workspace, values) => {
      const block = workspace.newBlock("loops_for_of");
      if (workspace.rendered && (block as any).initSvg) (block as any).initSvg();
      
      // Attach variable shadow for VAR
      attachVariableShadow(workspace, block, "VAR", values.VAR || "value");
      
      // Attach variable shadow for LIST
      attachVariableShadow(workspace, block, "LIST", values.LIST || "list");
      
      if ((block as any).render) (block as any).render();
      return block;
    },
  },
  {
    type: "loops_every_interval",
    category: "Loops",
    blockDefinition: {
      type: "loops_every_interval",
      message0: "every %1 ms %2 %3",
      args0: [
        { type: "input_value", name: "MS", check: "Number" },
        { type: "input_dummy" },
        { type: "input_statement", name: "DO" },
      ],
      previousStatement: null,
      nextStatement: null,
      tooltip: "Run the loop body on a repeating interval",
    },
    pythonPattern: /(?:async\s+)?def\s+on_every_interval\(\s*\)\s*:|basic\.forever\(\s*on_every_interval\s*\)/g,
    pythonGenerator: (block, generator) => {
      const isDisabled = typeof (block as any).getInheritedDisabled === "function"
        ? (block as any).getInheritedDisabled()
        : (typeof (block as any).isEnabled === "function" ? !(block as any).isEnabled() : false);
      if (isDisabled) return "";

      const IND = ((generator as any)?.INDENT ?? "    ") as string;
      const interval = generator.valueToCode(block, "MS", (generator as any).ORDER_NONE) || "500";
      const statements = generator.statementToCode(block, "DO");

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
      } catch (_) {}

      const used = new Set<string>();
      try {
        const getName = (ws: any, id: string) => {
          try {
            const m = typeof ws?.getVariableById === "function" ? ws.getVariableById(id) : null;
            return (m && m.name) || (id && !/^[a-f0-9-]{8,}$/i.test(id) ? id : "x");
          } catch { return "x"; }
        };
        const doInput = block.getInputTargetBlock("DO");
        if (doInput) {
          const desc = doInput.getDescendants(false);
          for (const d of desc) {
            if (!d || !d.type) continue;
            if (d.type === "variables_get") {
              const id = d.getFieldValue("VAR");
              used.add(getName(block.workspace, id));
            } else if (d.type === "variables_set") {
              const id = d.getFieldValue("VAR");
              const name = getName(block.workspace, id);
              used.add(name);
            } else if (d.type === "math_change") {
              const id = d.getFieldValue("VAR");
              const name = getName(block.workspace, id);
              used.add(name);
            }
          }
        }
      } catch (_) {}

      const globals = Array.from(used);
      const globalLine = globals.length ? `${IND}global ${globals.join(", ")}\n` : "";
      const body = indentBodyIfNeeded(statements, IND);
      const pauseLine = `${IND}basic.pause(${interval})\n`;
      const asyncKeyword = needsAsync ? "async " : "";
      return `${asyncKeyword}def on_every_interval():\n${globalLine}${body}${pauseLine}\nbasic.forever(on_every_interval)\n`;
    },
    pythonExtractor: () => ({}),
    blockCreator: (workspace, values) => {
      const block = workspace.newBlock("loops_every_interval");
      if (workspace.rendered && (block as any).initSvg) (block as any).initSvg();
      const interval = Number(values.MS);
      attachNumberShadow(workspace, block, "MS", Number.isFinite(interval) ? interval : 500);
      if ((block as any).render) (block as any).render();
      return block;
    },
  },
  {
    type: "loops_break",
    category: "Loops",
    blockDefinition: {
      type: "loops_break",
      message0: "break",
      previousStatement: null,
      nextStatement: null,
      tooltip: "Exit the nearest loop",
    },
    pythonPattern: /\bbreak\b/g,
    pythonGenerator: () => "break\n",
    pythonExtractor: () => ({}),
    blockCreator: (workspace) => workspace.newBlock("loops_break"),
  },
  {
    type: "loops_continue",
    category: "Loops",
    blockDefinition: {
      type: "loops_continue",
      message0: "continue",
      previousStatement: null,
      nextStatement: null,
      tooltip: "Skip to the next loop iteration",
    },
    pythonPattern: /\bcontinue\b/g,
    pythonGenerator: () => "continue\n",
    pythonExtractor: () => ({}),
    blockCreator: (workspace) => workspace.newBlock("loops_continue"),
  },

];
