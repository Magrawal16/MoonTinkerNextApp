// src/app/editor/components/BlocklyEditor.tsx
"use client";

import { useEffect, useRef } from "react";
import Blockly from "blockly";
import "blockly/python";
import microbitBlocks from "@/blockly_editor/blocks/microbit_blocks";
import toolbox from "../toolbox/toolbox.xml?raw";

export default function BlocklyEditor({ onCodeChange }: { onCodeChange: (code: string) => void }) {
    const blocklyDiv = useRef<HTMLDivElement>(null);
    const workspaceRef = useRef<Blockly.WorkspaceSvg | null>(null);

    useEffect(() => {
        const workspace = Blockly.inject(blocklyDiv.current!, {
            toolbox,
            scrollbars: true,
        });

        workspaceRef.current = workspace;

        const updateCode = () => {
            const code = Blockly.Python.workspaceToCode(workspace);
            onCodeChange(code);
        };

        workspace.addChangeListener(updateCode);

        // Load sample heartbeat program
        const xml = Blockly.Xml.textToDom(`
      <xml xmlns="https://developers.google.com/blockly/xml">
        <block type="controls_forever" x="20" y="20">
          <statement name="DO">
            <block type="basic_show_icon">
              <field name="ICON">heart</field>
              <next>
                <block type="basic_pause">
                  <value name="MILLIS">
                    <shadow type="math_number">
                      <field name="NUM">1000</field>
                    </shadow>
                  </value>
                  <next>
                    <block type="basic_clear_screen">
                      <next>
                        <block type="basic_pause">
                          <value name="MILLIS">
                            <shadow type="math_number">
                              <field name="NUM">500</field>
                            </shadow>
                          </value>
                        </block>
                      </next>
                    </block>
                  </next>
                </block>
              </next>
            </block>
          </statement>
        </block>
      </xml>
    `);
        Blockly.Xml.domToWorkspace(xml, workspace);

        return () => workspace.dispose();
    }, [onCodeChange]);

    return <div ref={blocklyDiv} className="w-full h-full" />;
}
