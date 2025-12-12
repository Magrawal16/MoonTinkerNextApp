import * as Blockly from "blockly";

/**
 * Enhance the variable field dropdown to include "New variable..." option
 * This patches the existing FieldVariable class instead of replacing it
 */
export function enhanceVariableField() {
  const originalGetOptions = Blockly.FieldVariable.prototype.getOptions;
  
  Blockly.FieldVariable.prototype.getOptions = function() {
    const options = originalGetOptions.call(this);
    
    // Find the position before "Rename variable..." or "Delete variable..."
    let insertIndex = options.length;
    for (let i = 0; i < options.length; i++) {
      const optionText = options[i][0];
      if (typeof optionText === 'string' && 
          (optionText.toLowerCase().includes('rename') || 
           optionText.toLowerCase().includes('delete'))) {
        insertIndex = i;
        break;
      }
    }
    
    // Insert "New variable..." option
    options.splice(insertIndex, 0, ["New variable...", "CREATE_VARIABLE_ID"]);
    
    return options;
  };
  
  // Access the protected method using type assertion
  const prototype = Blockly.FieldVariable.prototype as any;
  const originalOnItemSelected = prototype.onItemSelected_;
  
  prototype.onItemSelected_ = function(menu: Blockly.Menu, menuItem: Blockly.MenuItem) {
    const value = menuItem.getValue();
    
    if (value === "CREATE_VARIABLE_ID") {
      // Prompt for new variable name
      const workspace = this.getSourceBlock()?.workspace;
      if (workspace) {
        Blockly.Variables.createVariableButtonHandler(
          workspace,
          undefined,
          '' // Empty string for default variable type
        );
      }
      return;
    }
    
    // For all other cases, use the original implementation
    originalOnItemSelected.call(this, menu, menuItem);
  };
}

