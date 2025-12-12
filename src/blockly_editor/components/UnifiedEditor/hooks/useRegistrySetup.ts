import * as Blockly from "blockly";
import { pythonGenerator } from "blockly/python";
import { createUpdatedBlocklyEditor } from "@/blockly_editor/utils/sharedBlockDefinitions";
import { enhanceVariableField } from "@/blockly_editor/fields/VariableField";

export function setupRegistryAndGenerators(workspace: Blockly.WorkspaceSvg) {
  // Enhance variable field dropdown with "New variable..." option
  enhanceVariableField();
  
  const Editor = createUpdatedBlocklyEditor();
  Editor.initializeSharedBlocks();
  Editor.setupPythonGenerators(pythonGenerator);
  // Register custom Variables category callback (must match toolbox custom key)
  const variablesFlyoutCallback = (ws: Blockly.WorkspaceSvg) => {
    const xmlList: any[] = [];
    const button = document.createElement("button");
    button.setAttribute("text", "Create variable...");
    button.setAttribute("callbackKey", "CREATE_VARIABLE");
    xmlList.push(button);
    const variableModelList = ws.getAllVariables();
    if (variableModelList.length > 0) {
      const variableName = variableModelList[0].getName();
      const setBlock = Blockly.utils.xml.createElement("block");
      setBlock.setAttribute("type", "variables_set");
      setBlock.setAttribute("gap", "8");
      const field = Blockly.utils.xml.createElement("field");
      field.setAttribute("name", "VAR");
      field.textContent = variableName;
      setBlock.appendChild(field);
      const value = Blockly.utils.xml.createElement("value");
      value.setAttribute("name", "VALUE");
      const shadow = Blockly.utils.xml.createElement("shadow");
      shadow.setAttribute("type", "math_number");
      const numField = Blockly.utils.xml.createElement("field");
      numField.setAttribute("name", "NUM");
      numField.textContent = "0";
      shadow.appendChild(numField);
      value.appendChild(shadow);
      setBlock.appendChild(value);
      xmlList.push(setBlock);
      const changeBlock = Blockly.utils.xml.createElement("block");
      changeBlock.setAttribute("type", "math_change");
      changeBlock.setAttribute("gap", "8");
      const changeField = Blockly.utils.xml.createElement("field");
      changeField.setAttribute("name", "VAR");
      changeField.textContent = variableName;
      changeBlock.appendChild(changeField);
      const deltaValue = Blockly.utils.xml.createElement("value");
      deltaValue.setAttribute("name", "DELTA");
      const deltaShadow = Blockly.utils.xml.createElement("shadow");
      deltaShadow.setAttribute("type", "math_number");
      const deltaField = Blockly.utils.xml.createElement("field");
      deltaField.setAttribute("name", "NUM");
      deltaField.textContent = "1";
      deltaShadow.appendChild(deltaField);
      deltaValue.appendChild(deltaShadow);
      changeBlock.appendChild(deltaValue);
      xmlList.push(changeBlock);
      for (const variable of variableModelList) {
        const block = Blockly.utils.xml.createElement("block");
        block.setAttribute("type", "variables_get");
        block.setAttribute("gap", "8");
        const varField = Blockly.utils.xml.createElement("field");
        varField.setAttribute("name", "VAR");
        varField.textContent = variable.getName();
        block.appendChild(varField);
        xmlList.push(block);
      }
      const sep = Blockly.utils.xml.createElement("sep");
      sep.setAttribute("gap", "16");
      xmlList.push(sep);
    }
    const textBlock = Blockly.utils.xml.createElement("block");
    textBlock.setAttribute("type", "text");
    textBlock.setAttribute("gap", "8");
    const textField = Blockly.utils.xml.createElement("field");
    textField.setAttribute("name", "TEXT");
    textField.textContent = 'Hello World';
    textBlock.appendChild(textField);
    xmlList.push(textBlock);
    const numberBlock = Blockly.utils.xml.createElement("block");
    numberBlock.setAttribute("type", "math_number");
    const numberField = Blockly.utils.xml.createElement("field");
    numberField.setAttribute("name", "NUM");
    numberField.textContent = "0";
    numberBlock.appendChild(numberField);
    xmlList.push(numberBlock);
    return xmlList;
  };
  workspace.registerToolboxCategoryCallback("VARIABLE_CUSTOM", variablesFlyoutCallback);
  workspace.registerButtonCallback("CREATE_VARIABLE", () => {
    Blockly.Variables.createVariableButtonHandler(workspace);
  });
}
