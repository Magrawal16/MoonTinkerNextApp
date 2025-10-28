// MicrobitCodeEditor.tsx (updated handleEditorDidMount)
"use client";
import { useState, useRef } from "react";
import Editor from "@monaco-editor/react";
import { microbitAutocompleteProvider } from "@/circuit_canvas/api/microbitAutocomplete";

interface MicrobitCodeEditorProps {
  code: string;
  onChange: (value: string) => void;
}

const MICROBIT_DEFAULT_CODE = `from microbit import *

# Your code here
`;

export default function MicrobitCodeEditor({ code, onChange }: MicrobitCodeEditorProps) {
  const [fontSize, setFontSize] = useState(14);
  const editorRef = useRef<any>(null);

  const handleEditorDidMount = (editor: any, monaco: any) => {
    editorRef.current = editor;

    // Register micro:bit autocomplete provider only once.
    // Use a window-global flag to avoid multiple registrations across mounts/hmr.
    try {
      if (!(window as any).__microbitProviderRegistered) {
        const disposable = monaco.languages.registerCompletionItemProvider(
          "python",
          microbitAutocompleteProvider
        );
        // Save flags so we don't register again
        (window as any).__microbitProviderRegistered = true;
        (window as any).__microbitProviderDisposable = disposable;
      }
    } catch (err) {
      // In case `window` is undefined or monaco API changes — fail gracefully.
      // eslint-disable-next-line no-console
      console.warn("Could not register microbit provider:", err);
    }

    editor.updateOptions({
      wordBasedSuggestions: true,
      suggestOnTriggerCharacters: true,
      acceptSuggestionOnEnter: "on",
      tabCompletion: "on",
    });
  };

  return (
    <div className="w-full h-full flex flex-col rounded-xl shadow-2xl border border-white/20 bg-gradient-to-br from-slate-900/80 via-blue-950/70 to-slate-700/70 backdrop-blur-2xl m-1 mt-0.5">
      <div className="flex items-center justify-between px-3 py-2 border-b border-white/10 bg-gradient-to-r from-slate-700/70 via-blue-900/50 to-transparent backdrop-blur-lg select-none">
        <span className="text-sm tracking-wide font-bold font-mono text-white/90 drop-shadow-md">
          Micro:bit Python Editor
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

      <div className="flex-1 min-h-0 w-full">
        <Editor
          language="python"
          value={code || MICROBIT_DEFAULT_CODE}
          onChange={(val) => onChange(val || MICROBIT_DEFAULT_CODE)}
          onMount={handleEditorDidMount}
          theme="vs-dark"
          options={{
            minimap: { enabled: true },
            fontSize,
            scrollBeyondLastLine: true,
            automaticLayout: true,
            fontFamily: "Fira Mono, ui-monospace, monospace",
            smoothScrolling: true,
            lineNumbers: "on",
            fontLigatures: true,
            renderLineHighlight: "all",
            lineDecorationsWidth: 0,
            wordWrap: "off",
            wordWrapColumn: 0,
            wrappingStrategy: "advanced",
            scrollbar: {
              vertical: "auto",
              horizontal: "visible",
              useShadows: false,
              horizontalScrollbarSize: 14,
              verticalScrollbarSize: 12,
            },
            scrollBeyondLastColumn: 5,
          }}
          height="100%"
          width="100%"
        />
      </div>
    </div>
  );
}
