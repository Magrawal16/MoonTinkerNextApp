"use client";

import Editor from "@monaco-editor/react";
import { useRef } from "react";
import type { Simulator } from "@/lib/code/Simulator";

interface Props {
  simulator: Simulator;
  output: string;
  setOutput: (text: string) => void;
}

export default function SimulatorEditor({
  simulator,
  output,
  setOutput,
}: Props) {
  const editorRef = useRef<any>(null);

  const runCode = async () => {
    setOutput("");
    const code = editorRef.current?.getValue();
    if (!code) return;
    await simulator.run(code);
  };

  return (
    <div>
      <Editor
        height="600px"
        defaultLanguage="python"
        defaultValue={`print("Hello World!")`}
        theme="vs-dark"
        onMount={(editor) => (editorRef.current = editor)}
      />
      <button
        onClick={runCode}
        style={{
          marginTop: 12,
          padding: "8px 16px",
          fontSize: 16,
          borderRadius: 4,
          backgroundColor: "#0070f3",
          color: "white",
          border: "none",
          cursor: "pointer",
        }}
      >
        Run Code
      </button>
      <pre
        style={{
          marginTop: 12,
          backgroundColor: "#111",
          color: "lime",
          padding: 12,
          borderRadius: 6,
          height: 150,
          overflowY: "auto",
          whiteSpace: "pre-wrap",
          fontFamily: "monospace",
        }}
      >
        {output}
      </pre>
    </div>
  );
}
