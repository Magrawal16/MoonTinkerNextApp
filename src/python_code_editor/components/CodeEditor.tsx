"use client";
import Editor from "@monaco-editor/react";
import { useState, useRef } from "react";

interface StandaloneEditorProps {
  code: string;
  onChange: (value: string) => void;
}

export default function CodeEditor({ code, onChange }: StandaloneEditorProps) {
  const [fontSize, setFontSize] = useState(14);
  const [isDragOver, setIsDragOver] = useState(false);
  const editorRef = useRef<any>(null);

  const handleEditorDidMount = (editor: any) => {
    editorRef.current = editor;
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "copy";
    setIsDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);

    const codeSnippet = e.dataTransfer.getData("text/plain");
    if (codeSnippet && editorRef.current) {
      const editor = editorRef.current;
      const position = editor.getPosition();
      
      if (position) {
        // Insert the code at the current cursor position
        const range = {
          startLineNumber: position.lineNumber,
          endLineNumber: position.lineNumber,
          startColumn: position.column,
          endColumn: position.column,
        };

        const operation = {
          range: range,
          text: codeSnippet + "\n",
          forceMoveMarkers: true,
        };

        editor.executeEdits("drag-drop", [operation]);
        
        // Update the external state
        const newValue = editor.getValue();
        onChange(newValue);

        // Focus the editor and position cursor after inserted text
        editor.focus();
        const lines = codeSnippet.split('\n');
        const newPosition = {
          lineNumber: position.lineNumber + lines.length - 1,
          column: lines[lines.length - 1].length + 1,
        };
        editor.setPosition(newPosition);
      }
    }
  };

  return (
    <div
      className={`ms-3.5
        w-[940px] max-w-2xl min-w-[200px] h-full  min-h-[260px] max-h-[84vh]
        flex flex-col rounded-xl overflow-hidden shadow-2xl border border-white/20
        monaco-transparent
        bg-gradient-to-br from-slate-900/80 via-blue-950/70 to-slate-700/70
        backdrop-blur-2xl m-1 mt-0.5 ${isDragOver ? 'ring-2 ring-indigo-400 ring-opacity-60' : ''}
      `}
      style={{
        boxShadow: "0 8px 40px rgba(0, 41, 100, 0.28)",
      }}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      {isDragOver && (
        <div className="absolute inset-0 bg-indigo-500 bg-opacity-10 backdrop-blur-sm z-10 flex items-center justify-center">
          <div className="bg-indigo-600 text-white px-4 py-2 rounded-lg shadow-lg flex items-center gap-2">
            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
              <path d="M3 4a1 1 0 011-1h12a1 1 0 011 1v2a1 1 0 01-1 1H4a1 1 0 01-1-1V4zM3 10a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H4a1 1 0 01-1-1v-6zM14 9a1 1 0 00-1 1v6a1 1 0 001 1h2a1 1 0 001-1v-6a1 1 0 00-1-1h-2z" />
            </svg>
            Drop code snippet here
          </div>
        </div>
      )}
      
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
          onMount={handleEditorDidMount}
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
