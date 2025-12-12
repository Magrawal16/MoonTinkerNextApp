import * as Blockly from "blockly";

export function useToolboxSearch(
  workspaceRef: React.MutableRefObject<Blockly.Workspace | null>
) {
  const onToolboxSearch = (value: string) => {
    if (!workspaceRef.current) return;

    const term = value.trim().toLowerCase();
    const workspace = workspaceRef.current as any;
    const toolbox = workspace.getToolbox?.();
    if (!toolbox) return;

    if (!term) {
      if (workspace.getFlyout) {
        const flyout = workspace.getFlyout();
        if (flyout && flyout.setVisible) {
          flyout.setVisible(false);
        }
      }
      return;
    }

    import("@/blockly_editor/utils/sharedBlockDefinitions").then(({ SHARED_MICROBIT_BLOCKS }) => {
      const searchBlocks = (searchTerm: string): any[] => {
        const searchTerms = searchTerm.split(/\s+/).filter(Boolean);

        const associations: Record<string, string[]> = {
          'light': ['light', 'brightness', 'led'],
          'bright': ['brightness', 'light', 'led'],
          'dark': ['brightness', 'light'],
          'display': ['show', 'display', 'led', 'plot', 'icon', 'leds'],
          'show': ['show', 'display', 'icon', 'leds'],
          'sound': ['sound', 'music', 'tone', 'melody', 'note', 'ring', 'rest'],
          'music': ['music', 'sound', 'tone', 'melody', 'note'],
          'button': ['button', 'pressed'],
          'touch': ['pin', 'pressed', 'input', 'touch'],
          'move': ['accelerometer', 'gesture', 'shake'],
          'number': ['number', 'random', 'math'],
          'text': ['string', 'text'],
          'picture': ['icon', 'image', 'leds'],
          'led': ['led', 'plot', 'unplot', 'toggle', 'point'],
        };

        const expandedTerms = new Set<string>(searchTerms);
        searchTerms.forEach(t => {
          if (associations[t]) {
            associations[t].forEach(related => expandedTerms.add(related));
          }
        });

        const matches: any[] = [];

        SHARED_MICROBIT_BLOCKS.forEach(block => {
          let matched = false;

          const blockTypeName = block.type.replace(/_/g, ' ').toLowerCase();
          const typeWords = blockTypeName.split(/\s+/);

          for (const searchTerm of expandedTerms) {
            if (typeWords.some((word: string) => word.includes(searchTerm) || searchTerm.includes(word))) {
              matched = true;
              break;
            }
          }

          if (!matched && block.blockDefinition) {
            const message = (block.blockDefinition.message0 || '').toLowerCase();
            const messageWords = message.split(/\s+/);

            for (const searchTerm of expandedTerms) {
              if (messageWords.some((word: string) => word.includes(searchTerm) || searchTerm.includes(word))) {
                matched = true;
                break;
              }
            }
          }

          if (!matched && block.blockDefinition) {
            const tooltip = (block.blockDefinition.tooltip || '').toLowerCase();
            const tooltipWords = tooltip.split(/\s+/);

            for (const searchTerm of expandedTerms) {
              if (tooltipWords.some((word: string) => word === searchTerm || word.startsWith(searchTerm))) {
                matched = true;
                break;
              }
            }
          }

          if (matched) {
            matches.push(block);
          }
        });

        return matches;
      };

      let matchingBlocks = searchBlocks(term);

      if (matchingBlocks.length === 0 && term.length > 1) {
        for (let len = term.length - 1; len >= 2; len--) {
          const shorterTerm = term.substring(0, len);
          matchingBlocks = searchBlocks(shorterTerm);
          if (matchingBlocks.length > 0) {
            break;
          }
        }
      }

      if (matchingBlocks.length === 0) {
        const defaultBlockTypes = ['on_start', 'on_button_pressed', 'show_string', 'show_number', 'show_icon', 'basic_show_leds'];
        matchingBlocks = SHARED_MICROBIT_BLOCKS.filter(block => 
          defaultBlockTypes.includes(block.type)
        );
      }

      if (matchingBlocks.length > 0) {
        try {
          const flyout = workspace.getFlyout();

          if (flyout && flyout.show) {
            const blockElements = matchingBlocks.map(block => {
              const blockNode = document.createElement('block');
              blockNode.setAttribute('type', block.type);
              blockNode.setAttribute('gap', '8');

              const blockDef = block.blockDefinition;
              if (blockDef && blockDef.args0) {
                blockDef.args0.forEach((arg: any) => {
                  if (arg.type === 'input_value') {
                    const valueNode = document.createElement('value');
                    valueNode.setAttribute('name', arg.name);
                    const shadowBlock = document.createElement('block');
                    shadowBlock.setAttribute('type', arg.check === 'Number' ? 'math_number' : 'text');
                    shadowBlock.setAttribute('shadow', 'true');

                    const fieldNode = document.createElement('field');
                    if (arg.check === 'Number') {
                      fieldNode.setAttribute('name', 'NUM');
                      fieldNode.textContent = '0';
                    } else {
                      fieldNode.setAttribute('name', 'TEXT');
                      fieldNode.textContent = '';
                    }
                    shadowBlock.appendChild(fieldNode);
                    valueNode.appendChild(shadowBlock);
                    blockNode.appendChild(valueNode);
                  } else if (arg.type === 'field_dropdown') {
                    const fieldNode = document.createElement('field');
                    fieldNode.setAttribute('name', arg.name);
                    if (arg.options && arg.options.length > 0) {
                      fieldNode.textContent = arg.options[0][1];
                    }
                    blockNode.appendChild(fieldNode);
                  } else if (arg.type === 'field_input') {
                    const fieldNode = document.createElement('field');
                    fieldNode.setAttribute('name', arg.name);
                    fieldNode.textContent = '';
                    blockNode.appendChild(fieldNode);
                  }
                });
              }

              return blockNode;
            });

            flyout.show(blockElements);

            if (flyout.position) {
              setTimeout(() => flyout.position(), 50);
            }
          }
        } catch (e) {
          console.warn("Failed to show search results flyout:", e);
        }
      } else {
        try {
          const flyout = workspace.getFlyout();
          if (flyout && flyout.show) {
            flyout.show([]);
          }
        } catch (e) {
          console.warn("Failed to clear flyout:", e);
        }
      }
    });
  };

  return { onToolboxSearch };
}
