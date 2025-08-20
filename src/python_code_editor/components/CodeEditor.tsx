"use client";
import Editor from "@monaco-editor/react";
import { useState } from "react";

interface StandaloneEditorProps {
  code: string;
  onChange: (value: string) => void;
}

export default function CodeEditor({ code, onChange }: StandaloneEditorProps) {
  const [fontSize, setFontSize] = useState(14);

  return (
    <div
      className={`ms-3.5
        w-[940px] max-w-2xl min-w-[200px] h-full  min-h-[260px] max-h-[84vh]
        flex flex-col rounded-xl overflow-hidden shadow-2xl border border-white/20
        monaco-transparent
        bg-gradient-to-br from-slate-900/80 via-blue-950/70 to-slate-700/70
        backdrop-blur-2xl m-1 mt-0.5
      `}
      style={{
        boxShadow: "0 8px 40px rgba(0, 41, 100, 0.28)",
      }}
    >
      {/* Toolbar */}
      <div
        className="
          flex items-center justify-between px-3 py-2
          border-b border-white/10
          bg-gradient-to-r from-slate-700/70 via-blue-900/50 to-transparent
          backdrop-blur-lg select-none
        "
        style={{ minHeight: 42 }}
      >
        <span className="text-sm tracking-wide font-bold font-mono text-white/90 drop-shadow-md">
          Python Editor
        </span>
        <div className="flex space-x-2 items-center">
          <button
            title="Zoom Out"
            onClick={() => setFontSize((s) => Math.max(8, s - 1))}
            className="bg-blue-800/40 hover:bg-blue-800/60 text-white px-2 py-1 rounded text-xs transition shadow"
          >
            −
          </button>
          <span className="text-xs font-mono text-white/80">{fontSize}px</span>
          <button
            title="Zoom In"
            onClick={() => setFontSize((s) => Math.min(40, s + 1))}
            className="bg-blue-800/40 hover:bg-blue-800/60 text-white px-2 py-1 rounded text-xs transition shadow"
          >
            +
          </button>
        </div>
      </div>
      {/* Monaco Editor */}
      <div className="flex-1 min-h-0 w-full relative">
        <Editor
          language="python"
          value={code}
          onChange={(val) => onChange(val ?? "")}
          theme="vs-dark"
          options={{
            minimap: { enabled: false },
            fontSize,
            scrollBeyondLastLine: false,
            automaticLayout: true,
            fontFamily: "Fira Mono, ui-monospace, monospace",
            smoothScrolling: true,
            lineNumbers: "on",
            fontLigatures: true,
            renderLineHighlight: "all",
            lineDecorationsWidth: 0,
            scrollbar: {
              vertical: "auto",
              horizontal: "auto",
              useShadows: false,
            },
          }}
          height="100%"
          width="100%"
        />
      </div>
    </div>
  );
}
