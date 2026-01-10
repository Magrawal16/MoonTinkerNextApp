// components/editor/python/PythonCodeEditor.tsx
"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import { API } from "../api/PythonAPI";
import { registerCompletionProvider } from "../providers/completions";
import { registerHoverProvider } from "../providers/hovers";
import { registerSignatureHelp } from "../providers/signatures";
import { registerSymbolProvider } from "../providers/symbols";
import { addInlineDefLint } from "../lint/inlineDefLint";
import { addForeverLoopLint } from "../lint/foreverLoopLint";

interface StandaloneEditorProps {
  code: string;
  onChange: (value: string) => void;
  isSimulationOn?: boolean;
}

// Simple text editor fallback component
const SimpleTextEditor = ({ code, onChange, isSimulationOn = false }: StandaloneEditorProps) => {
  return (
    <textarea
      value={code}
      onChange={(e) => onChange(e.target.value)}
      disabled={isSimulationOn}
      className={`w-full h-full bg-[#1e1e1e] text-[#d4d4d4] font-mono p-4 resize-none border-0 outline-none text-sm leading-5 ${
        isSimulationOn ? "opacity-50 cursor-not-allowed" : ""
      }`}
      style={{ minHeight: '400px' }}
      spellCheck={false}
    />
  );
};

export default function PythonCodeEditor({ code, onChange, isSimulationOn = false }: StandaloneEditorProps) {
  const [fontSize, setFontSize] = useState(14);
  const [isDragOver, setIsDragOver] = useState(false);
  const [useMonaco, setUseMonaco] = useState(true);
  const [isMonacoReady, setIsMonacoReady] = useState(false);
  const editorRef = useRef<any>(null);
  const monacoRef = useRef<any>(null);

  const disposablesRef = useRef<{ dispose: () => void }[]>([]);

  // VS Code Dark+ theme configuration
  const vscodeTheme = {
    base: 'vs-dark',
    inherit: true,
    rules: [
      { token: 'comment', foreground: '6A9955', fontStyle: 'italic' },
      { token: 'keyword', foreground: 'C586C0' },
      { token: 'string', foreground: 'CE9178' },
      { token: 'number', foreground: 'B5CEA8' },
      { token: 'type', foreground: '4EC9B0' },
      { token: 'function', foreground: 'DCDCAA' },
      { token: 'variable', foreground: '9CDCFE' },
      { token: 'operator', foreground: 'D4D4D4' },
    ],
    colors: {
      'editor.background': '#1e1e1e',
      'editor.foreground': '#d4d4d4',
      'editor.lineHighlightBackground': '#2d2d2d',
      'editor.selectionBackground': '#264f78',
      'editor.inactiveSelectionBackground': '#3a3d41',
      'editorIndentGuide.background': '#404040',
      'editorIndentGuide.activeBackground': '#707070',
      'editor.lineNumbers': '#858585',
      'editor.lineNumbers.active': '#c6c6c6',
      'editorCursor.foreground': '#aeafad',
      'editorWhitespace.foreground': '#3b3b3b',
      'editor.findMatchBackground': '#515c6a',
      'editor.findMatchHighlightBackground': '#37353a',
      'editor.hoverHighlightBackground': '#264f7840',
      'editorBracketMatch.background': '#0064001a',
      'editorBracketMatch.border': '#888888',
    }
  };

  // Load Monaco editor dynamically
  useEffect(() => {
    const loadMonaco = async () => {
      try {
        await import('@monaco-editor/react');
        setUseMonaco(true);
        setIsMonacoReady(true);
      } catch (error) {
        console.warn('Monaco editor not available, using fallback editor', error);
        setUseMonaco(false);
        setIsMonacoReady(true);
      }
    };

    loadMonaco();
  }, []);

  // Monaco editor component
  const MonacoEditor = useMemo(() => {
    if (!useMonaco || !isMonacoReady) return null;
    
    try {
      const EditorComponent = require('@monaco-editor/react').default;
      return EditorComponent;
    } catch (error) {
      console.warn('Failed to load Monaco editor');
      return null;
    }
  }, [useMonaco, isMonacoReady]);

  const handleEditorDidMount = (editor: any, monaco: any) => {
    editorRef.current = editor;
    monacoRef.current = monaco;

    if (editor && monaco) {
      // Define VS Code Dark+ theme
      monaco.editor.defineTheme('vscode-dark-plus', vscodeTheme);
      monaco.editor.setTheme('vscode-dark-plus');

      // VS Code-like editor configuration
      editor.updateOptions({
        // VS Code appearance
        fontSize: fontSize,
        fontFamily: "'Cascadia Code', 'Fira Code', 'Consolas', 'Courier New', monospace",
        fontLigatures: true,
        lineHeight: 20,
        letterSpacing: 0.5,
        
        // VS Code layout
        lineNumbers: 'on',
        renderLineHighlight: 'all',
        renderWhitespace: 'boundary',
        renderControlCharacters: true,
        renderIndentGuides: true,
        highlightActiveIndentGuide: true,
        
        // VS Code editing experience
        autoIndent: 'full',
        formatOnType: true,
        formatOnPaste: true,
        formatOnSave: true,
        bracketPairColorization: {
          enabled: true
        },
        guides: {
          bracketPairs: true,
          indentation: true
        },
        
        // VS Code IntelliSense
        quickSuggestions: {
          other: true,
          comments: true,
          strings: true
        },
        suggestOnTriggerCharacters: true,
        tabCompletion: 'on',
        suggestSelection: 'first',
        wordBasedSuggestions: 'allDocuments',
        parameterHints: {
          enabled: true,
          cycle: true
        },
        
        // Minimap like VS Code
        minimap: {
          enabled: true,
          scale: 1,
          renderCharacters: true,
          showSlider: 'mouseover'
        },
        
        // Scrollbar like VS Code
        scrollbar: {
          vertical: 'visible',
          horizontal: 'visible',
          useShadows: false,
          verticalScrollbarSize: 14,
          horizontalScrollbarSize: 14,
          alwaysConsumeMouseWheel: false
        },
        
        // Other VS Code-like settings
        cursorBlinking: 'blink',
        cursorSmoothCaretAnimation: 'on',
        smoothScrolling: true,
        mouseWheelZoom: true,
        padding: { top: 16, bottom: 16 },
        scrollBeyondLastLine: false,
        wordWrap: 'on',
        wordWrapColumn: 80,
        wrappingIndent: 'same',
        readOnlyMessage: { value: 'Cannot edit while simulation is running' }
      });

      // Register language services
      const disposables: { dispose: () => void }[] = [];
      try {
        registerCompletionProvider(monaco, disposables);
        registerHoverProvider(monaco, disposables);
        registerSignatureHelp(monaco, disposables);
        registerSymbolProvider(monaco, disposables);
        addInlineDefLint(monaco, editor);
        addForeverLoopLint(monaco, editor); // Add forever loop validation
      } catch (error) {
        console.warn('Some language services failed to load:', error);
      }

      disposablesRef.current = disposables;
    }
  };

  useEffect(() => {
    return () => {
      disposablesRef.current.forEach((d) => d?.dispose?.());
      disposablesRef.current = [];
    };
  }, []);

  // Update font size when changed
  useEffect(() => {
    if (editorRef.current) {
      editorRef.current.updateOptions({ fontSize });
    }
  }, [fontSize]);

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
    if (!codeSnippet) return;

    const editor = editorRef.current;
    const model = editor?.getModel?.();
    if (editor && model) {
      const target = editor.getTargetAtClientPoint?.(e.clientX, e.clientY);
      const position = target?.position ?? editor.getPosition?.();
      if (!position) return;

      const getIndentUnit = () => {
        try {
          const opts = model.getOptions?.();
          const indentSize: number = (opts?.indentSize as number) || 4;
          return " ".repeat(Math.max(1, indentSize));
        } catch {
          return " ".repeat(4);
        }
      };

      const computeIndentForLine = (lineNumber: number, indentUnit: string) => {
        const getLine = (ln: number) => (model?.getLineContent?.(ln) ?? "") as string;
        const lineText = getLine(lineNumber);
        const currentIndent = (lineText.match(/^\s*/) || [""])[0];
        if (lineText.trim().length > 0) return currentIndent;
        if (currentIndent.length > 0) return currentIndent;
        let ln = lineNumber - 1;
        while (ln >= 1) {
          const prev = getLine(ln);
          if (prev.trim().length > 0) {
            const prevIndent = (prev.match(/^\s*/) || [""])[0];
            const prevEndsWithColon = /:\s*(#.*)?$/.test(prev.trimEnd());
            return prevIndent + (prevEndsWithColon ? indentUnit : "");
          }
          ln--;
        }
        return "";
      };

      let lineContent: string = model.getLineContent(position.lineNumber) ?? "";
      const normalized = codeSnippet.replace(/\r\n?/g, "\n").replace(/\n$/, "");
      const indentUnit = getIndentUnit();

      // If dropping on a Python block header (def/class/if/for/while/try/etc), do NOT insert on that line.
      // Instead, snap to the block body, replacing `pass` / blank line when present.
      const blockHeaderMatch = /^(\s*)(def|class|if|elif|else|for|while|try|except|finally|with)\b.*:\s*(#.*)?$/.exec(
        lineContent
      );
      if (blockHeaderMatch) {
        // Allow inserting code BEFORE the header by dropping in the gutter/left margin.
        // This is how you place a snippet on line 1 when line 1 is `def on_start():`.
        try {
          const dom: HTMLElement | null = editor.getDomNode?.();
          const rect = dom?.getBoundingClientRect?.();
          const layout = editor.getLayoutInfo?.();
          const contentLeft = (layout?.contentLeft as number) ?? 0;
          const isInGutter = rect ? e.clientX < rect.left + contentLeft : false;
          if (isInGutter) {
            editor.executeEdits("drag-drop-python-insert-before-header", [
              {
                range: {
                  startLineNumber: position.lineNumber,
                  endLineNumber: position.lineNumber,
                  startColumn: 1,
                  endColumn: 1,
                },
                text: normalized + "\n",
                forceMoveMarkers: true,
              },
            ]);

            onChange(editor.getValue());
            editor.focus();

            const insertedLines = normalized.split("\n");
            const newLineNumber = position.lineNumber + insertedLines.length - 1;
            const lastLineText = insertedLines[insertedLines.length - 1] || "";
            editor.setPosition({
              lineNumber: newLineNumber,
              column: Math.max(1, lastLineText.length + 1),
            });
            return;
          }
        } catch {
          // ignore and fall through
        }

        const headerIndent = blockHeaderMatch[1] ?? "";
        const bodyLineNumber = position.lineNumber + 1;
        const lineCount = model.getLineCount?.() ?? 0;
        const bodyLineContent = bodyLineNumber <= lineCount ? (model.getLineContent(bodyLineNumber) ?? "") : "";
        const bodyIndent = (() => {
          const bodyWs = (bodyLineContent.match(/^\s*/) || [""])[0];
          return bodyWs.length ? bodyWs : headerIndent + indentUnit;
        })();

        const indented = normalized
          .split("\n")
          .map((ln) => (ln.length ? bodyIndent + ln : ln))
          .join("\n");

        const replaceOrInsertIntoBody = () => {
          const isPass = /^\s*pass\s*$/.test(bodyLineContent);
          const isBlank = bodyLineContent.trim().length === 0;
          if (bodyLineNumber <= lineCount && (isPass || isBlank)) {
            editor.executeEdits("drag-drop-python-snap-into-block", [
              {
                range: {
                  startLineNumber: bodyLineNumber,
                  endLineNumber: bodyLineNumber,
                  startColumn: 1,
                  endColumn: bodyLineContent.length + 1,
                },
                text: indented,
                forceMoveMarkers: true,
              },
            ]);
          } else if (bodyLineNumber <= lineCount) {
            editor.executeEdits("drag-drop-python-snap-into-block", [
              {
                range: {
                  startLineNumber: bodyLineNumber,
                  endLineNumber: bodyLineNumber,
                  startColumn: 1,
                  endColumn: 1,
                },
                text: indented + "\n",
                forceMoveMarkers: true,
              },
            ]);
          } else {
            // Body line doesn't exist yet (end of file) — append a newline + indented snippet.
            editor.executeEdits("drag-drop-python-snap-into-block", [
              {
                range: {
                  startLineNumber: position.lineNumber,
                  endLineNumber: position.lineNumber,
                  startColumn: lineContent.length + 1,
                  endColumn: lineContent.length + 1,
                },
                text: "\n" + indented + "\n",
                forceMoveMarkers: true,
              },
            ]);
          }
        };

        replaceOrInsertIntoBody();
        onChange(editor.getValue());
        editor.focus();

        const insertedLines = indented.split("\n");
        const endLineNumber = Math.min(bodyLineNumber, model.getLineCount?.() ?? bodyLineNumber) + insertedLines.length - 1;
        const lastLineText = insertedLines[insertedLines.length - 1] || "";
        editor.setPosition({
          lineNumber: endLineNumber,
          column: Math.max(1, lastLineText.length + 1),
        });
        return;
      }

      // If dropping onto a placeholder `pass` line, replace it and keep indentation.
      const passMatch = /^(\s*)pass\s*$/.exec(lineContent);
      if (passMatch) {
        const indentation = passMatch[1] ?? "";
        const indented = normalized
          .split("\n")
          .map((ln) => (ln.length ? indentation + ln : ln))
          .join("\n");

        editor.executeEdits("drag-drop-python-replace-pass", [
          {
            range: {
              startLineNumber: position.lineNumber,
              endLineNumber: position.lineNumber,
              startColumn: 1,
              endColumn: lineContent.length + 1,
            },
            text: indented,
            forceMoveMarkers: true,
          },
        ]);

        onChange(editor.getValue());
        editor.focus();

        const insertedLines = indented.split("\n");
        const newLineNumber = position.lineNumber + insertedLines.length - 1;
        const lastLineText = insertedLines[insertedLines.length - 1] || "";
        editor.setPosition({
          lineNumber: newLineNumber,
          column: Math.max(1, lastLineText.length + 1),
        });
        return;
      }

      // Avoid breaking an existing line: if the drop target is mid-line, snap to end-of-line and insert on a new line.
      const indentPrefix = (lineContent.match(/^\s*/) || [""])[0];
      const firstNonWhitespaceColumn = indentPrefix.length + 1;
      const endColumn = lineContent.length + 1;
      const hasCodeOnLine = lineContent.trim().length > 0;

      // If dropping at the start/indentation of an indented line with code, insert ABOVE that line.
      const insertAboveLine = (() => {
        if (!hasCodeOnLine) return false;
        // Only do this for indented lines (i.e., inside a block)
        if (indentPrefix.length === 0) return false;

        try {
          const dom: HTMLElement | null = editor.getDomNode?.();
          const rect = dom?.getBoundingClientRect?.();
          const layout = editor.getLayoutInfo?.();
          const contentLeft = (layout?.contentLeft as number) ?? 0;
          const indentCoord = editor.getScrolledVisiblePosition?.({
            lineNumber: position.lineNumber,
            column: Math.max(1, firstNonWhitespaceColumn),
          });
          if (rect && indentCoord) {
            const dropX = e.clientX - rect.left - contentLeft;
            // If you dropped to the left of the first non-whitespace char, treat as indentation area
            return dropX <= indentCoord.left + 2;
          }
        } catch {
          // ignore and fall back
        }

        // Fallback: use column-based check
        return position.column <= firstNonWhitespaceColumn;
      })();

      const effectiveIndent = computeIndentForLine(position.lineNumber, indentUnit);
      const indentedToInsert = normalized
        .split("\n")
        .map((ln) => (ln.length ? effectiveIndent + ln : ln))
        .join("\n");

      const textToInsert = insertAboveLine
        ? `${indentedToInsert}\n`
        : hasCodeOnLine
          ? `\n${indentedToInsert}\n`
          : `${indentedToInsert}\n`;

      const range = insertAboveLine
        ? {
            startLineNumber: position.lineNumber,
            endLineNumber: position.lineNumber,
            startColumn: 1,
            endColumn: 1,
          }
        : {
            startLineNumber: position.lineNumber,
            endLineNumber: position.lineNumber,
            startColumn: position.column >= endColumn ? position.column : endColumn,
            endColumn: position.column >= endColumn ? position.column : endColumn,
          };

      editor.executeEdits("drag-drop-python-snippet", [
        { range, text: textToInsert, forceMoveMarkers: true },
      ]);

      onChange(editor.getValue());
      editor.focus();

      const snippetLines = indentedToInsert.split("\n");
      const newLineNumber = insertAboveLine
        ? position.lineNumber + snippetLines.length - 1
        : hasCodeOnLine
          ? position.lineNumber + snippetLines.length
          : position.lineNumber + snippetLines.length - 1;
      const lastLineText = snippetLines[snippetLines.length - 1] || "";
      editor.setPosition({
        lineNumber: newLineNumber,
        column: Math.max(1, lastLineText.length + 1),
      });
      return;
    }

    // Fallback (non-Monaco editor): append to end
    const newCode = code + "\n\n" + codeSnippet;
    onChange(newCode);
  };

  return (
    <div
      className={`w-full h-full flex flex-col rounded-lg border border-[#3c3c3c] bg-[#1e1e1e] shadow-2xl overflow-hidden ${
        isDragOver ? "ring-2 ring-[#007acc] ring-opacity-50" : ""
      }`}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      {/* VS Code-like Title Bar */}
      <div className="flex items-center justify-between px-4 py-2 bg-[#2d2d2d] border-b border-[#3c3c3c]">
        <div className="flex items-center space-x-2">
          <div className="flex space-x-1.5">
            <div className="w-3 h-3 rounded-l-xl bg-gray-500"></div>
            {/* <div className="w-3 h-3 rounded-full bg-[#ffbd2e]"></div>
            <div className="w-3 h-3 rounded-full bg-[#27ca3f]"></div> */}
          </div>
          <span className="text-[13px] font-medium text-[#cccccc] ml-2">
            Python Editor 
          </span>
        </div>
        
        <div className="flex items-center space-x-3">
          {/* VS Code-like Zoom Controls */}
          <div className="flex items-center space-x-1 bg-[#2d2d2d] rounded border border-[#3c3c3c] p-1">
            <button
              title="Zoom Out"
              onClick={() => setFontSize((s) => Math.max(10, s - 1))}
              className="w-6 h-6 flex items-center justify-center text-[#cccccc] hover:bg-[#3c3c3c] rounded text-xs transition"
            >
              −
            </button>
            <span className="text-[11px] text-[#858585] min-w-[35px] text-center font-mono">
              {fontSize}px
            </span>
            <button
              title="Zoom In"
              onClick={() => setFontSize((s) => Math.min(24, s + 1))}
              className="w-6 h-6 flex items-center justify-center text-[#cccccc] hover:bg-[#3c3c3c] rounded text-xs transition"
            >
              +
            </button>
          </div>
        </div>
      </div>

      {/* Editor Area */}
      <div className="flex-1 min-h-0 w-full relative">
        {!isMonacoReady ? (
          // VS Code-like loading
          <div className="w-full h-full flex items-center justify-center bg-[#1e1e1e]">
            <div className="text-[#858585] text-sm font-mono">Loading VS Code Editor...</div>
          </div>
        ) : MonacoEditor ? (
          <MonacoEditor
            language="python"
            value={code}
            onChange={(val: string) => !isSimulationOn && onChange(val ?? "")}
            onMount={handleEditorDidMount}
            theme="vscode-dark-plus"
            loading={
              <div className="w-full h-full flex items-center justify-center bg-[#1e1e1e]">
                <div className="text-[#858585] text-sm font-mono">Initializing VS Code Editor...</div>
              </div>
            }
            options={{
              // These will be overridden in handleEditorDidMount, but set here for initial render
              fontSize: fontSize,
              fontFamily: "'Cascadia Code', 'Fira Code', 'Consolas', 'Courier New', monospace",
              fontLigatures: true,
              lineHeight: 20,
              minimap: { enabled: true },
              scrollBeyondLastLine: false,
              wordWrap: 'on',
              automaticLayout: true,
              readOnly: isSimulationOn,
            }}
            height="100%"
            width="100%"
          />
        ) : (
          <SimpleTextEditor code={code} onChange={onChange} isSimulationOn={isSimulationOn} />
        )}
      </div>

      {/* VS Code-like Status Bar */}
      <div className="flex items-center justify-between px-4 py-1 bg-[#007acc] text-white text-[12px] font-mono">
        <div className="flex items-center space-x-4">
          <div className="flex items-center space-x-1">
            <span>Python</span>
            <span className="text-[#cccccc]">•</span>
            <span>UTF-8</span>
          </div>
          <div className="flex items-center space-x-1">
            <span>Ln 1, Col 1</span>
          </div>
        </div>
        <div className="flex items-center space-x-4">
          <div className="flex items-center space-x-1">
            <span>Spaces: 4</span>
          </div>
          <div className="flex items-center space-x-1">
            <span>UTF-8</span>
          </div>
          <div className="flex items-center space-x-1">
            <span>LF</span>
          </div>
        </div>
      </div>
    </div>
  );
}