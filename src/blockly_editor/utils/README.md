# Python to Blockly Converter

This directory contains a comprehensive Python to Blockly converter that enables bidirectional conversion between Python code and Blockly blocks for micro:bit programming.

## Features

- **Bidirectional Conversion**: Convert Python code to Blockly blocks and vice versa
- **Shared Implementation**: Block definitions and Python generators use the same configuration to avoid duplication
- **Micro:bit Support**: Built specifically for micro:bit programming with support for LEDs, buttons, display, and basic control structures
- **Round-trip Compatible**: Code can be converted from Python to blocks and back to Python while preserving intent
- **Extensible**: Easy to add new block types and Python patterns

## Files Overview

### Core Files

- `pythonToBlockly.ts` - Main converter implementation with parsing logic
- `sharedBlockDefinitions.ts` - Shared block configurations used by both converters
- `blocklyPythonIntegration.ts` - Integration utilities for existing Blockly editors
- `converterDemo.ts` - Demo examples and test utilities

## Quick Start

### 1. Basic Setup

```typescript
import * as Blockly from "blockly";
import { pythonGenerator } from "blockly/python";
import { BlocklyPythonIntegration } from "./blocklyPythonIntegration";

// Initialize shared blocks
BlocklyPythonIntegration.initialize();

// Setup Python generators
BlocklyPythonIntegration.setupPythonGenerators(pythonGenerator);

// Create workspace
const workspace = Blockly.inject(workspaceDiv, {
  toolbox: toolboxXml,
  trashcan: true,
});

// Create integration instance
const integration = new BlocklyPythonIntegration(workspace);
```

### 2. Convert Python to Blocks

```typescript
const pythonCode = `
print("Hello World")
led.plot(2, 2)
time.sleep(1000)
`;

integration.importPythonCode(pythonCode);
```

### 3. Convert Blocks to Python

```typescript
const pythonCode = integration.exportToPython(pythonGenerator);
console.log(pythonCode);
```

### 4. Bidirectional Conversion

```typescript
import { BidirectionalConverter } from "./blocklyPythonIntegration";

const converter = new BidirectionalConverter(workspace, pythonGenerator);

// Python to blocks
converter.pythonToBlocks(pythonCode);

// Blocks to Python
const generatedPython = converter.blocksToPython();

// Test round-trip conversion
const result = converter.testRoundTrip(pythonCode);
console.log("Round-trip successful:", result.matches);
```

## Supported Python Patterns

The converter supports the following Python patterns and their corresponding Blockly blocks:

### Basic Output

```python
print("Hello World")              # → show_string block
```

### LED Control

```python
led.plot(2, 2)                   # → set_led block (on)
led.unplot(2, 2)                 # → set_led block (off)
```

### Display Patterns

```python
display.show(Image("11111\n10101\n11111\n10101\n11111"))  # → show_leds block
```

### Timing

```python
time.sleep(1)                    # → pause block (1000ms)
time.sleep(1000/1000)           # → pause block (1000ms)
```

### Button Input

```python
button_a.is_pressed()           # → button_is_pressed block
button_b.is_pressed()           # → button_is_pressed block
```

### Control Structures

```python
while True:                     # → forever block
    # statements

def on_start():                 # → on_start block
    # statements
on_start()
```

## Integration with Existing Editors

### For React Components

```typescript
import { useEffect, useRef, useState } from "react";
import { BlocklyPythonIntegration } from "./utils/blocklyPythonIntegration";

function BlocklyEditor() {
  const workspaceRef = useRef<HTMLDivElement>(null);
  const [workspace, setWorkspace] = useState<Blockly.Workspace | null>(null);
  const [integration, setIntegration] =
    useState<BlocklyPythonIntegration | null>(null);

  useEffect(() => {
    if (workspaceRef.current) {
      // Initialize Blockly
      BlocklyPythonIntegration.initialize();
      BlocklyPythonIntegration.setupPythonGenerators(pythonGenerator);

      const ws = Blockly.inject(workspaceRef.current, {
        toolbox: toolboxXml,
        trashcan: true,
      });

      const integ = new BlocklyPythonIntegration(ws);

      setWorkspace(ws);
      setIntegration(integ);
    }
  }, []);

  const handleImportPython = (pythonCode: string) => {
    if (integration) {
      integration.importPythonCode(pythonCode);
    }
  };

  const handleExportPython = () => {
    if (integration) {
      return integration.exportToPython(pythonGenerator);
    }
    return "";
  };

  return (
    <div>
      <div ref={workspaceRef} style={{ height: "400px", width: "100%" }} />
      <button onClick={() => handleImportPython('print("Hello")')}>
        Import Python
      </button>
      <button onClick={() => console.log(handleExportPython())}>
        Export Python
      </button>
    </div>
  );
}
```

### For the BlockPlusCodeEditor

To integrate with the existing `BlockPlusCodeEditor`, you can add conversion buttons:

```typescript
// In BlockPlusCodeEditor.tsx
import { BlocklyPythonIntegration } from "../utils/blocklyPythonIntegration";

// Add these functions inside the component
const handlePythonToBlocks = () => {
  if (activeControllerId && blocklyWorkspace) {
    const pythonCode = controllerCodeMap[activeControllerId] || "";
    const integration = new BlocklyPythonIntegration(blocklyWorkspace);
    integration.importPythonCode(pythonCode);
  }
};

const handleBlocksToPython = () => {
  if (activeControllerId && blocklyWorkspace) {
    const integration = new BlocklyPythonIntegration(blocklyWorkspace);
    const pythonCode = integration.exportToPython(pythonGenerator);
    setControllerCodeMap((prev) => ({
      ...prev,
      [activeControllerId]: pythonCode,
    }));
  }
};

// Add buttons in the JSX
<div className="flex gap-2 p-2">
  <button onClick={handlePythonToBlocks}>Python → Blocks</button>
  <button onClick={handleBlocksToPython}>Blocks → Python</button>
</div>;
```

## Testing and Debugging

### Running Tests

```typescript
import { ConversionDemo, ConverterUtils } from "./converterDemo";

// Create a test environment
const demo = ConverterUtils.createQuickTest("test-container");

// Run all tests
ConverterUtils.runAllTests(demo);

// Test specific examples
demo.testPythonToBlocks("basic");
demo.testRoundTrip("complex");
```

### Checking Compatibility

```typescript
// Check if Python code is supported
const isSupported = BlocklyPythonIntegration.isCompatiblePython(pythonCode);

// Preview what blocks would be created
const blockTypes = BlocklyPythonIntegration.previewConversion(pythonCode);
console.log("Would create blocks:", blockTypes);

// Get all supported patterns
const patterns = BlocklyPythonIntegration.getSupportedPatterns();
```

## Extending the Converter

### Adding New Block Types

1. Add a new definition to `SHARED_MICROBIT_BLOCKS` in `sharedBlockDefinitions.ts`:

```typescript
{
    type: 'my_new_block',
    blockDefinition: {
        type: 'my_new_block',
        message0: 'my block %1',
        args0: [
            {
                type: 'field_input',
                name: 'VALUE',
                text: 'default',
            },
        ],
        previousStatement: null,
        nextStatement: null,
        colour: 180,
        tooltip: 'My custom block',
    },
    pythonPattern: /my_function\((['"'])(.+?)\1\)/g,
    pythonGenerator: (block) => {
        const value = block.getFieldValue('VALUE');
        return `my_function(${JSON.stringify(value)})\n`;
    },
    pythonExtractor: (match) => ({
        VALUE: match[2]
    }),
    blockCreator: (workspace, values) => {
        const block = workspace.newBlock('my_new_block');
        block.setFieldValue(values.VALUE, 'VALUE');
        return block;
    }
}
```

2. The new block will automatically be available in both directions!

### Customizing Conversion Logic

You can extend the `EnhancedPythonToBlocklyConverter` class to add custom parsing logic for complex patterns:

```typescript
class CustomConverter extends EnhancedPythonToBlocklyConverter {
  convertPythonToBlocks(pythonCode: string): Blockly.Block[] {
    // Add custom preprocessing
    const processedCode = this.customPreprocess(pythonCode);

    // Call parent method
    return super.convertPythonToBlocks(processedCode);
  }

  private customPreprocess(code: string): string {
    // Add custom logic here
    return code;
  }
}
```

## Limitations

- **Complex Control Flow**: Advanced Python features like nested loops, complex conditionals, and function calls are not fully supported
- **Variable Handling**: Variable assignments and references are not converted to blocks
- **Import Statements**: Import statements are parsed but not converted to blocks
- **Comments**: Python comments are not preserved in the conversion
- **Indentation**: Complex indentation patterns may not be handled correctly

## Future Enhancements

- Support for variables and expressions
- Better handling of complex control flow
- Preservation of comments and formatting
- Support for custom micro:bit libraries
- Visual diff showing conversion changes
- Undo/redo for conversions
- Better error handling and user feedback

## Contributing

When adding new block types or improving the converter:

1. Add the block definition to `sharedBlockDefinitions.ts`
2. Add test cases to `converterDemo.ts`
3. Update this documentation
4. Test both directions of conversion
5. Ensure round-trip compatibility where possible

The shared implementation approach ensures that any new block automatically works in both directions without duplicating code.
