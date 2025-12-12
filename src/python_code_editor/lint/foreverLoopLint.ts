// lint/foreverLoopLint.ts
/**
 * Lints code to detect multiple forever loops and on_start blocks.
 * Only the first of each type will execute, others are disabled.
 */
export const addForeverLoopLint = (monaco: any, editor: any) => {
  const model = editor.getModel?.();
  if (!model) return;

  const run = () => {
    const code = model.getValue();
    const lines = code.split('\n');
    
    // Track forever loop groups (def + basic.forever or standalone while True)
    const foreverGroups: Array<{ 
      startLine: number; 
      endLine: number; 
      type: string;
      locations: Array<{ lineNumber: number; startColumn: number; endColumn: number; text: string }>;
    }> = [];

    let i = 0;
    while (i < lines.length) {
      const line = lines[i];
      const lineNumber = i + 1;

      // Check for "def on_forever():" or "async def on_forever():"
      const defMatch = line.match(/^\s*(async\s+)?def\s+on_forever\s*\(\s*\)\s*:/);
      if (defMatch) {
        const defStartCol = defMatch.index! + 1;
        const defEndCol = defStartCol + defMatch[0].length;
        
        // Look ahead for corresponding basic.forever(on_forever) call
        let foundCall = false;
        let callLineNumber = lineNumber;
        let callStartCol = 0;
        let callEndCol = 0;
        
        // Search next ~20 lines for basic.forever(on_forever)
        for (let j = i; j < Math.min(i + 20, lines.length); j++) {
          const callMatch = lines[j].match(/basic\.forever\s*\(\s*on_forever\s*\)/);
          if (callMatch) {
            foundCall = true;
            callLineNumber = j + 1;
            callStartCol = callMatch.index! + 1;
            callEndCol = callStartCol + callMatch[0].length;
            i = j; // Skip to the call line
            break;
          }
        }

        // Add this as a forever group
        const locations = [
          { lineNumber, startColumn: defStartCol, endColumn: defEndCol, text: defMatch[0] }
        ];
        
        if (foundCall) {
          locations.push({ 
            lineNumber: callLineNumber, 
            startColumn: callStartCol, 
            endColumn: callEndCol, 
            text: 'basic.forever(on_forever)' 
          });
        }

        foreverGroups.push({
          startLine: lineNumber,
          endLine: foundCall ? callLineNumber : lineNumber,
          type: 'def on_forever() + basic.forever()',
          locations
        });
        
        i++;
        continue;
      }

      // Check for standalone "basic.forever()" without a matching def above
      const foreverCallMatch = line.match(/basic\.forever\s*\(/);
      if (foreverCallMatch) {
        const callStartCol = foreverCallMatch.index! + 1;
        const callEndCol = callStartCol + foreverCallMatch[0].length;
        
        // Only add if this isn't part of a group we already found
        const isPartOfGroup = foreverGroups.some(group => 
          lineNumber >= group.startLine && lineNumber <= group.endLine
        );
        
        if (!isPartOfGroup) {
          foreverGroups.push({
            startLine: lineNumber,
            endLine: lineNumber,
            type: 'basic.forever()',
            locations: [{ lineNumber, startColumn: callStartCol, endColumn: callEndCol, text: line.trim() }]
          });
        }
      }

      // Check for "while True:"
      const whileTrueMatch = line.match(/^\s*while\s+True\s*:/);
      if (whileTrueMatch) {
        const startCol = whileTrueMatch.index! + 1;
        const endCol = startCol + whileTrueMatch[0].length;
        
        foreverGroups.push({
          startLine: lineNumber,
          endLine: lineNumber,
          type: 'while True:',
          locations: [{ lineNumber, startColumn: startCol, endColumn: endCol, text: whileTrueMatch[0] }]
        });
      }

      i++;
    }

    // Track on_start groups (def + call or standalone)
    const onStartGroups: Array<{ 
      startLine: number; 
      endLine: number; 
      type: string;
      locations: Array<{ lineNumber: number; startColumn: number; endColumn: number; text: string }>;
    }> = [];

    i = 0;
    while (i < lines.length) {
      const line = lines[i];
      const lineNumber = i + 1;

      // Check for "def on_start():" or "async def on_start():"
      const defMatch = line.match(/^\s*(async\s+)?def\s+on_start\s*\(\s*\)\s*:/);
      if (defMatch) {
        const defStartCol = defMatch.index! + 1;
        const defEndCol = defStartCol + defMatch[0].length;
        
        // Look ahead for corresponding on_start() call
        let foundCall = false;
        let callLineNumber = lineNumber;
        let callStartCol = 0;
        let callEndCol = 0;
        
        // Search next ~20 lines for on_start()
        for (let j = i; j < Math.min(i + 20, lines.length); j++) {
          const callMatch = lines[j].match(/^\s*on_start\s*\(\s*\)/);
          if (callMatch) {
            foundCall = true;
            callLineNumber = j + 1;
            callStartCol = callMatch.index! + 1;
            callEndCol = callStartCol + callMatch[0].length;
            i = j; // Skip to the call line
            break;
          }
        }

        // Add this as an on_start group
        const locations = [
          { lineNumber, startColumn: defStartCol, endColumn: defEndCol, text: defMatch[0] }
        ];
        
        if (foundCall) {
          locations.push({ 
            lineNumber: callLineNumber, 
            startColumn: callStartCol, 
            endColumn: callEndCol, 
            text: 'on_start()' 
          });
        }

        onStartGroups.push({
          startLine: lineNumber,
          endLine: foundCall ? callLineNumber : lineNumber,
          type: 'def on_start() + on_start()',
          locations
        });
        
        i++;
        continue;
      }

      i++;
    }

    // Create markers for all forever loops after the first one
    const markers: any[] = [];
    const decorations: any[] = [];
    
    if (foreverGroups.length > 1) {
      // Skip the first group (index 0), mark the rest as errors
      foreverGroups.slice(1).forEach((group) => {
        group.locations.forEach((location) => {
          markers.push({
            severity: monaco.MarkerSeverity.Error,
            message: `⚠️ Only one forever loop can run. This ${group.type} is disabled because another forever loop already exists above. Remove this or the previous forever loop.`,
            startLineNumber: location.lineNumber,
            startColumn: location.startColumn,
            endLineNumber: location.lineNumber,
            endColumn: location.endColumn,
            tags: [monaco.MarkerTag.Unnecessary], // This adds a faded/strikethrough effect
          });

          decorations.push({
            range: new monaco.Range(
              location.lineNumber,
              location.startColumn,
              location.lineNumber,
              location.endColumn
            ),
            options: {
              inlineClassName: 'duplicate-forever-loop-underline',
              hoverMessage: { 
                value: `**⚠️ Duplicate Forever Loop**\n\nOnly one forever loop can run at a time. This loop is disabled because another forever loop already exists above.\n\n**Action needed:** Remove this forever loop or the previous one.`
              },
            }
          });
        });
      });
    }

    // Create markers for all on_start blocks after the first one
    if (onStartGroups.length > 1) {
      // Skip the first group (index 0), mark the rest as errors
      onStartGroups.slice(1).forEach((group) => {
        group.locations.forEach((location) => {
          markers.push({
            severity: monaco.MarkerSeverity.Error,
            message: `⚠️ Only one on start block can run. This ${group.type} is disabled because another on start block already exists above. Remove this or the previous on start block.`,
            startLineNumber: location.lineNumber,
            startColumn: location.startColumn,
            endLineNumber: location.lineNumber,
            endColumn: location.endColumn,
            tags: [monaco.MarkerTag.Unnecessary], // This adds a faded/strikethrough effect
          });

          decorations.push({
            range: new monaco.Range(
              location.lineNumber,
              location.startColumn,
              location.lineNumber,
              location.endColumn
            ),
            options: {
              inlineClassName: 'duplicate-forever-loop-underline',
              hoverMessage: { 
                value: `**⚠️ Duplicate On Start Block**\n\nOnly one on start block can run at a time. This block is disabled because another on start block already exists above.\n\n**Action needed:** Remove this on start block or the previous one.`
              },
            }
          });
        });
      });
    }

    monaco.editor.setModelMarkers(model, "forever-loop-lint", markers);

    // Apply decorations
    const decorationIds = editor.deltaDecorations([], decorations);
    
    // Store decoration IDs for cleanup
    (editor as any)._foreverLoopDecorations = decorationIds;
  };

  run();
  
  // Re-run lint when content changes
  const disposable = model.onDidChangeContent(run);
  
  return disposable;
};
