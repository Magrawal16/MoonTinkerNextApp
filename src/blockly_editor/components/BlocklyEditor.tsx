'use client';

import React, { useEffect, useRef } from 'react';
import * as Blockly from 'blockly';
import { pythonGenerator } from 'blockly/python';

// --- Define Microbit blocks ---
Blockly.defineBlocksWithJsonArray([
    {
        type: 'on_start',
        message0: 'on start %1 %2',
        args0: [
            { type: 'input_dummy' },
            { type: 'input_statement', name: 'DO' },
        ],
        colour: 30,
        tooltip: 'Runs once at the start',
        nextStatement: null, // Can be followed by another block
    },
    {
        type: 'forever',
        message0: 'forever %1 %2',
        args0: [
            { type: 'input_dummy' },
            { type: 'input_statement', name: 'DO' },
        ],
        previousStatement: null,
        nextStatement: null,
        colour: 30,
        tooltip: 'Runs code forever',
    },
    {
        type: 'show_leds',
        message0: 'show leds %1',
        args0: [
            {
                type: 'field_multilinetext',
                name: 'PATTERN',
                text: '00000\n00000\n00000\n00000\n00000',
            },
        ],
        previousStatement: null,
        nextStatement: null,
        colour: 230,
        tooltip: 'Display pattern on LEDs',
    },
    {
        type: 'pause',
        message0: 'pause %1 ms',
        args0: [
            {
                type: 'field_number',
                name: 'TIME',
                value: 1000,
            },
        ],
        previousStatement: null,
        nextStatement: null,
        colour: 60,
        tooltip: 'Pause execution',
    },
    {
        type: 'show_string',
        message0: 'show string %1',
        args0: [
            {
                type: 'field_input',
                name: 'TEXT',
                text: 'Hello!',
            },
        ],
        previousStatement: null,
        nextStatement: null,
        colour: 230,
        tooltip: 'Show a string on the display',
    },
    {
        type: 'button_is_pressed',
        message0: 'button %1 is pressed',
        args0: [
            {
                type: 'field_dropdown',
                name: 'BUTTON',
                options: [
                    ['A', 'A'],
                    ['B', 'B'],
                ],
            },
        ],
        output: 'Boolean',
        colour: 120,
        tooltip: 'Check if button is pressed',
    },
    {
        type: 'set_led',
        message0: 'set led x: %1 y: %2 %3 %4',
        args0: [
            { type: 'field_number', name: 'X', value: 0, min: 0, max: 4 },
            { type: 'field_number', name: 'Y', value: 0, min: 0, max: 4 },
            { type: 'input_dummy' },
            {
                type: 'field_dropdown',
                name: 'STATE',
                options: [
                    ['on', 'on'],
                    ['off', 'off'],
                ],
            },
        ],
        previousStatement: null,
        nextStatement: null,
        colour: 230,
        tooltip: 'Set LED on or off at (x, y)',
    },
]);

// --- Define Python generators ---
pythonGenerator.forBlock['on_start'] = function (block, generator) {
    const statements = generator.statementToCode(block, 'DO');
    return `def on_start():\n${statements.replace(/^/gm, '    ')}\non_start()\n`;
};

pythonGenerator.forBlock['forever'] = function (block, generator) {
    const statements = generator.statementToCode(block, 'DO');
    return `while True:\n${statements.replace(/^/gm, '    ')}\n`;
};

pythonGenerator.forBlock['show_leds'] = function (block) {
    const pattern = block.getFieldValue('PATTERN').replace(/\n/g, '\\n');
    return `print("LED pattern:\\n${pattern}")\n`;
};

pythonGenerator.forBlock['show_string'] = function (block) {
    const text = block.getFieldValue('TEXT');
    return `print(${JSON.stringify(text)})\n`;
};

pythonGenerator.forBlock['pause'] = function (block) {
    const time = block.getFieldValue('TIME');
    return `import time\ntime.sleep(${time} / 1000)\n`;
};

pythonGenerator.forBlock['set_led'] = function (block) {
    const x = block.getFieldValue('X');
    const y = block.getFieldValue('Y');
    const state = block.getFieldValue('STATE');
    return `# Set LED at (${x}, ${y}) ${state}\n`;
};

(pythonGenerator as any)['button_is_pressed'] = function (block: any) {
    const button = block.getFieldValue('BUTTON');
    return [`input.button_is_pressed('${button}')`, 0];
};

// --- Toolbox ---
const toolboxXml = `
<xml xmlns="https://developers.google.com/blockly/xml">
  <category name="Microbit" colour="#4C97FF">
    <block type="on_start"></block>
    <block type="forever"></block>
    <block type="show_leds"></block>
    <block type="show_string"></block>
    <block type="pause"></block>
    <block type="set_led"></block>
    <block type="button_is_pressed"></block>
  </category>
  <category name="Logic" colour="#5C81A6">
    <block type="controls_if"></block>
    <block type="logic_compare"></block>
  </category>
  <category name="Loops" colour="#5CA65C">
    <block type="controls_repeat_ext"></block>
  </category>
</xml>
`;

// --- React Component ---
export default function BlocklyEditor() {
    const blocklyRef = useRef<HTMLDivElement>(null);
    const codeRef = useRef<HTMLTextAreaElement>(null);
    const initializedRef = useRef(false);

    useEffect(() => {
        if (!blocklyRef.current || initializedRef.current) return;

        const workspace = Blockly.inject(blocklyRef.current, {
            toolbox: Blockly.utils.xml.textToDom(toolboxXml),
            trashcan: true,
        });

        initializedRef.current = true;

        const updateCode = () => {
            try {
                const code = pythonGenerator.workspaceToCode(workspace);
                if (codeRef.current) codeRef.current.value = code;
            } catch (e) {
                console.error('Code generation failed:', e);
            }
        };

        workspace.addChangeListener(updateCode);
        updateCode();
    }, []);

    return (
        <div style={{ display: 'flex', width: '100%', height: '460px' }}>
            <div ref={blocklyRef} style={{ flex: 1, border: '1px solid #ccc' }}></div>
            <textarea
                ref={codeRef}
                style={{
                    width: '400px',
                    height: '100%',
                    fontFamily: 'monospace',
                    padding: '1rem',
                    background: '#f7f7f7',
                    border: 'none',
                    outline: 'none',
                    resize: 'none',
                }}
                readOnly
            />
        </div>
    );
}
