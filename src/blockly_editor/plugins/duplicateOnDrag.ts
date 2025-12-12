import * as Blockly from "blockly";

let isPluginInstalled = false;

/**
 * Initialize duplicate-on-drag behavior for loop blocks
 * Call this after blocks are registered with Blockly
 */
export function initializeDuplicateOnDrag() {
  if (isPluginInstalled) return;
  isPluginInstalled = true;
}

/**
 * Install workspace listener to handle duplicate-on-drag behavior
 * Call this after workspace is created
 */
export function installDuplicateOnDragListener(workspace: Blockly.WorkspaceSvg) {
  const trackedBlocks = new Map<string, { parentId: string; inputName: string; varId: string }>();

  const updateTracking = () => {
    const allBlocks = workspace.getAllBlocks(false);
    
    // Clear old tracking first
    trackedBlocks.clear();
    
    allBlocks.forEach(block => {
      if (block.type === "variables_get") {
        const parent = block.outputConnection?.targetBlock();
        const targetConn = block.outputConnection?.targetConnection;
        const inputName = targetConn?.getParentInput()?.name;
        const varId = block.getFieldValue("VAR");

        if (parent && inputName && varId &&
            ((parent.type === "loops_for_range" && inputName === "VAR") ||
             (parent.type === "loops_for_of" && inputName === "VAR"))) {
          trackedBlocks.set(block.id, {
            parentId: parent.id,
            inputName,
            varId,
          });
        }
      }
    });
  };

  updateTracking();

  workspace.addChangeListener((event: Blockly.Events.Abstract) => {
    // Update tracking when blocks are created, moved, or when fields change
    if (event.type === Blockly.Events.BLOCK_CREATE || 
        event.type === Blockly.Events.BLOCK_MOVE ||
        event.type === Blockly.Events.BLOCK_CHANGE) {
      setTimeout(updateTracking, 0);
    }

    if (event.type === Blockly.Events.BLOCK_MOVE) {
      const moveEvent = event as any;
      const blockId = moveEvent.blockId;
      const block = workspace.getBlockById(blockId);

      if (block && block.type === "variables_get" && trackedBlocks.has(blockId)) {
        // Get the CURRENT variable value at the moment of drag
        const currentVarId = block.getFieldValue("VAR");
        
        const currentParent = block.outputConnection?.targetBlock();
        const wasTracked = trackedBlocks.get(blockId)!;
        
        // Update the tracked varId with the current value
        wasTracked.varId = currentVarId;

        if (!currentParent) {
          const prevParent = workspace.getBlockById(wasTracked.parentId);
          
          if (prevParent && !prevParent.isDisposed()) {
            const input = prevParent.getInput(wasTracked.inputName);

            if (input?.connection && !input.connection.targetBlock()) {
              setTimeout(() => {
                try {
                  Blockly.Events.disable();

                  const replacementBlock = workspace.newBlock("variables_get");
                  replacementBlock.setFieldValue(wasTracked.varId, "VAR");
                  replacementBlock.initSvg();
                  replacementBlock.render();

                  if (replacementBlock.outputConnection && input.connection) {
                    input.connection.connect(replacementBlock.outputConnection);
                  }

                  Blockly.Events.enable();
                  setTimeout(updateTracking, 0);
                } catch (error) {
                  console.error("Error creating replacement:", error);
                  Blockly.Events.enable();
                }
              }, 0);
            }
          }

          trackedBlocks.delete(blockId);
        }
      }
    }
  });
}


