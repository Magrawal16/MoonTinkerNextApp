"use client";
import Editor from "@monaco-editor/react";
import { useState } from "react";

interface StandaloneEditorProps {
  code: string;
  onChange: (value: string) => void;
}

export default function CodeEditor({ code, onChange }: StandaloneEditorProps) {
  const [fontSize, setFontSize] = useState(14); // Optional zoom support

  return (
    <div className="w-full h-full flex flex-col">
      {/* Optional Zoom Controls */}
      <div className="bg-gray-800 text-gray-300 px-4 py-2 flex justify-end items-center space-x-2">
        <button
          onClick={() => setFontSize((s) => Math.max(8, s - 1))}
          className="bg-blue-600 text-gray-300 px-2 py-1 rounded text-sm hover:bg-blue-700"
        >
          −
        </button>
        <button
          onClick={() => setFontSize((s) => Math.min(40, s + 1))}
          className="bg-blue-600 text-gray-300 px-2 py-1 rounded text-sm hover:bg-blue-700"
        >
          +
        </button>
      </div>

      <div className="flex-grow">
        <Editor
          defaultLanguage="python"
          value={code}
          onChange={(value) => onChange(value ?? "")}
          theme="vs-dark"
          options={{
            minimap: { enabled: false },
            fontSize,
          }}
          height="100%"
          width="100%"
        />
      </div>
    </div>
  );
}
