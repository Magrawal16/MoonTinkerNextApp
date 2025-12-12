import { SHARED_MICROBIT_BLOCKS, BLOCK_CATEGORIES, CATEGORY_ICONS } from "@/blockly_editor/utils/sharedBlockDefinitions";

export function createFilteredToolboxXml(searchTerm: string): string {
  const DEFAULT_CATEGORY = "Basic";
  const DEFAULT_COLOR = "#999999ff";
  const term = searchTerm.trim().toLowerCase();

  // Helper: map category name -> color
  const categoryColorMap: Record<string, string> = {};
  BLOCK_CATEGORIES.forEach(({ name, color }) => {
    categoryColorMap[name] = color.toString();
  });

  // Group blocks by category name, but only include those matching the search
  const blocksByCategory: Record<string, typeof SHARED_MICROBIT_BLOCKS> = {};
  for (const block of SHARED_MICROBIT_BLOCKS) {
    if (
      !term ||
      block.type.toLowerCase().includes(term) ||
      (block.blockDefinition?.message0?.toLowerCase?.().includes(term) ?? false) ||
      (block.category?.toLowerCase().includes(term) ?? false)
    ) {
      const category = block.category ?? DEFAULT_CATEGORY;
      if (!blocksByCategory[category]) {
        blocksByCategory[category] = [];
      }
      blocksByCategory[category].push(block);
    }
  }

  function generateBlockXml(block: any): string {
    const args = block.blockDefinition.args0 || [];
    let fieldsXml = "";
    let valuesXml = "";
    for (const arg of args) {
      if ("name" in arg) {
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
            defaultValue = arg.options[0][1];
          }
          fieldsXml += `\n      <field name="${arg.name}">${defaultValue}</field>`;
        } else if (arg.type === "input_value") {
          const wantsNumberShadow =
            (block.type === "show_number" && arg.name === "NUM") ||
            (arg.check && (Array.isArray(arg.check) ? arg.check.includes("Number") : arg.check === "Number"));
          const wantsTextShadow =
            (block.type === "show_string" && arg.name === "TEXT") ||
            (arg.check && (Array.isArray(arg.check) ? arg.check.includes("String") : arg.check === "String"));
          const wantsVariableShadow =
            arg.check && (Array.isArray(arg.check) ? arg.check.includes("Variable") : arg.check === "Variable");
          
          if (wantsNumberShadow) {
            valuesXml += `\n      <value name="${arg.name}">\n        <shadow type="math_number">\n          <field name="NUM">0</field>\n        </shadow>\n      </value>`;
          } else if (wantsTextShadow) {
            valuesXml += `\n      <value name="${arg.name}">\n        <shadow type="text">\n          <field name="TEXT">Hello!</field>\n        </shadow>\n      </value>`;
          } else if (wantsVariableShadow) {
            // Determine default variable name based on block type and input name
            let varName = "item";
            if (block.type === "loops_for_range" && arg.name === "VAR") {
              varName = "index";
            } else if (block.type === "loops_for_of" && arg.name === "VAR") {
              varName = "value";
            } else if (block.type === "loops_for_of" && arg.name === "LIST") {
              varName = "list";
            }
            // Use regular block instead of shadow for draggability
            valuesXml += `\n      <value name="${arg.name}">\n        <block type="variables_get">\n          <field name="VAR">${varName}</field>\n        </block>\n      </value>`;
          }
        }
      }
    }
    return `<block type="${block.type}">${fieldsXml}${valuesXml}\n    </block>`;
  }

  function getCategoryIcon(categoryName: string): string {
    return CATEGORY_ICONS[categoryName] || "📋";
  }

  let xml = `<xml xmlns="https://developers.google.com/blockly/xml" id="toolbox-categories" style="display: none">\n`;
  const emitted: Set<string> = new Set();
  const categoriesToEmit = BLOCK_CATEGORIES.filter(({ name }) => name !== "Text");

  categoriesToEmit.forEach(({ name: categoryName }, idx) => {
    const color = categoryColorMap[categoryName] ?? DEFAULT_COLOR;
    const icon = getCategoryIcon(categoryName);
    const blocks = blocksByCategory[categoryName];
    if (
      categoryName === "Variables" &&
      (!term || "variable".includes(term))
    ) {
      xml += `  <category name="${icon} ${categoryName}" colour="${color}" custom="VARIABLE_CUSTOM">\n  </category>\n`;
      emitted.add(categoryName);
      emitted.add("Text");
    } else if (blocks && blocks.length > 0) {
      xml += `  <category name="${icon} ${categoryName}" colour="${color}">\n`;
      for (const block of blocks) {
        xml += `    ${generateBlockXml(block)}\n`;
      }
      if (categoryName === "Logic") {
        xml += `    <block type="logic_compare">\n`;
        xml += `      <field name="OP">EQ</field>\n`;
        xml += `      <value name="A">\n`;
        xml += `        <shadow type="math_number">\n`;
        xml += `          <field name="NUM">0</field>\n`;
        xml += `        </shadow>\n`;
        xml += `      </value>\n`;
        xml += `      <value name="B">\n`;
        xml += `        <shadow type="math_number">\n`;
        xml += `          <field name="NUM">0</field>\n`;
        xml += `        </shadow>\n`;
        xml += `      </value>\n`;
        xml += `    </block>\n`;
      }
      xml += `  </category>\n`;
      emitted.add(categoryName);
    }
    if (idx < categoriesToEmit.length - 1) {
      xml += `  <sep gap="8"/>\n`;
    }
  });

  xml += `</xml>`;
  return xml;
}
