import * as Blockly from "blockly";
import { pythonGenerator } from "blockly/python";
import { createUpdatedBlocklyEditor } from "../src/blockly_editor/utils/sharedBlockDefinitions";

// Set up headless workspace and register blocks + generators
const ws = new Blockly.Workspace();
const { initializeSharedBlocks, setupPythonGenerators } = createUpdatedBlocklyEditor();
initializeSharedBlocks();
setupPythonGenerators(pythonGenerator);

// Build a small program:
// def on_forever():
//   if input.button_is_pressed(Button.A):
//     basic.show_string("A")
//   else:
//     basic.show_string("not A")
// basic.forever(on_forever)

// forever block
const forever = ws.newBlock("forever");

// controls_if block
const ifBlock = ws.newBlock("controls_if");

// condition: button A is pressed
const cond = ws.newBlock("button_is_pressed");
(cond as any).setFieldValue("A", "BUTTON");

// then branch: show_string("A")
const thenStmt = ws.newBlock("show_string");
(thenStmt as any).setFieldValue("A", "TEXT");

// else branch: show_string("not A")
const elseStmt = ws.newBlock("show_string");
(elseStmt as any).setFieldValue("not A", "TEXT");

// Wire up inputs
ifBlock.getInput("IF0")!.connection!.connect((cond as any).outputConnection);
ifBlock.getInput("DO0")!.connection!.connect((thenStmt as any).previousConnection);

// Add ELSE arm via mutation
const mut = (Blockly.utils.xml as any).createElement("mutation");
mut.setAttribute("else", "1");
(ifBlock as any).domToMutation(mut);
ifBlock.getInput("ELSE")!.connection!.connect((elseStmt as any).previousConnection);

// Put if inside forever body
forever.getInput("DO")!.connection!.connect((ifBlock as any).previousConnection);

// Generate Python
const code = pythonGenerator.workspaceToCode(ws);
console.log("==== Generated Python ====");
console.log(code);

// Basic sanity checks
const hasDef = code.includes("def on_forever():");
const hasIf = code.includes("if input.button_is_pressed(Button.A):");
const hasElseLine = /\r?\n\s*else:\r?\n/.test(code);
const bodyThenElseOrderOk = /\r?\n\s+basic\.show_string\("A"\)\r?\n\s*else:\r?\n/.test(code);

console.log(JSON.stringify({ hasDef, hasIf, hasElseLine, bodyThenElseOrderOk, codeLines: code.split("\n").length }, null, 2));

