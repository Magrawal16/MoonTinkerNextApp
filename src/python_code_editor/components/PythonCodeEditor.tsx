// components/editor/python/PythonCodeEditor.tsx
"use client";
import { useEffect, useMemo, useRef, useState, useCallback } from "react";
import { API } from "../api/PythonAPI";
import { registerCompletionProvider } from "../providers/completions";
import { registerHoverProvider } from "../providers/hovers";
import { registerSignatureHelp } from "../providers/signatures";
import { registerSymbolProvider } from "../providers/symbols";
import { addInlineDefLint } from "../lint/inlineDefLint";
import { addForeverLoopLint } from "../lint/foreverLoopLint";
import { MicrobitFlasher, FlashProgress } from "../utils/microbitFlasher";

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
  const [isFlashing, setIsFlashing] = useState(false);
  const [flashStatus, setFlashStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [flashProgress, setFlashProgress] = useState<FlashProgress | null>(null);
  const [showFlashModal, setShowFlashModal] = useState(false);
  const [useMonaco, setUseMonaco] = useState(true);
  const [isMonacoReady, setIsMonacoReady] = useState(false);
  const microbitFlasherRef = useRef(new MicrobitFlasher());
  const editorRef = useRef<any>(null);
  const monacoRef = useRef<any>(null);

  const disposablesRef = useRef<{ dispose: () => void }[]>([]);
  
  // Check for WebUSB and FileSystem API support
  const isWebUSBSupported = MicrobitFlasher.isWebUSBSupported();
  const isFileSystemAccessSupported = MicrobitFlasher.isFileSystemAccessSupported();

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

  // Progress callback for flashing
  const handleFlashProgress = useCallback((progress: FlashProgress) => {
    setFlashProgress(progress);
    if (progress.stage === 'complete') {
      setFlashStatus('success');
      setTimeout(() => {
        setShowFlashModal(false);
        setFlashStatus('idle');
        setFlashProgress(null);
      }, 2000);
    } else if (progress.stage === 'error') {
      // Check if user cancelled - close modal silently
      if (progress.message?.toLowerCase().includes('cancelled') || 
          progress.message?.toLowerCase().includes('canceled')) {
        setTimeout(() => {
          setShowFlashModal(false);
          setFlashStatus('idle');
          setFlashProgress(null);
        }, 500);
      } else {
        setFlashStatus('error');
      }
    }
  }, []);

  // Handle flash to microbit using WebUSB
  const handleFlashToMicrobit = async () => {
    if (isFlashing) return;
    
    setIsFlashing(true);
    setFlashStatus('idle');
    setShowFlashModal(true);
    setFlashProgress({ stage: 'connecting', progress: 0, message: 'Starting...' });
    
    try {
      const success = await microbitFlasherRef.current.flash(code, handleFlashProgress);
      if (!success) {
        // Error was already handled via progress callback
        // Just ensure we're in error state
        if (flashProgress?.stage !== 'error') {
          setFlashStatus('error');
        }
      }
    } catch (error) {
      // This should rarely happen since errors are handled via callback
      setFlashStatus('error');
      setFlashProgress({
        stage: 'error',
        progress: 0,
        message: error instanceof Error ? error.message : 'Unknown error occurred'
      });
    } finally {
      setIsFlashing(false);
    }
  };

  // Handle writing directly to MICROBIT drive (File System Access API)
  const handleWriteToMicrobitDrive = async () => {
    if (isFlashing) return;
    
    setIsFlashing(true);
    setFlashStatus('idle');
    setShowFlashModal(true);
    
    try {
      const success = await microbitFlasherRef.current.writeToMicrobitDrive(code, handleFlashProgress);
      if (!success) {
        // Error was already handled via progress callback
        if (flashProgress?.stage !== 'error') {
          setFlashStatus('error');
        }
      }
    } catch (error) {
      // This should rarely happen since errors are handled via callback
      setFlashStatus('error');
      setFlashProgress({
        stage: 'error',
        progress: 0,
        message: error instanceof Error ? error.message : 'Unknown error occurred'
      });
    } finally {
      setIsFlashing(false);
    }
  };

  // Handle download HEX file
  const handleDownloadHex = async () => {
    try {
      await microbitFlasherRef.current.downloadHex(code);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      alert(`Failed to download HEX file: ${errorMessage}`);
    }
  };

  // Close flash modal
  const handleCloseFlashModal = () => {
    if (!isFlashing) {
      setShowFlashModal(false);
      setFlashProgress(null);
      setFlashStatus('idle');
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

  // Status indicator
  const getStatusIndicator = () => {
    switch (flashStatus) {
      case 'success':
        return (
          <div className="flex items-center text-[#4EC9B0] text-xs">
            <div className="w-2 h-2 bg-[#4EC9B0] rounded-full mr-1"></div>
            Flashed!
          </div>
        );
      case 'error':
        return (
          <div className="flex items-center text-[#F48771] text-xs">
            <div className="w-2 h-2 bg-[#F48771] rounded-full mr-1"></div>
            Failed
          </div>
        );
      default:
        return null;
    }
  };

  // Flash Modal Component
  const FlashModal = () => {
    if (!showFlashModal) return null;
    
    return (
      <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
        <div className="bg-[#252526] border border-[#3c3c3c] rounded-lg shadow-2xl p-6 max-w-md w-full mx-4">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-white font-semibold text-lg flex items-center gap-2">
              <svg className="w-5 h-5 text-[#007acc]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
              </svg>
              Flashing micro:bit
            </h3>
            {!isFlashing && (
              <button 
                onClick={handleCloseFlashModal}
                className="text-[#858585] hover:text-white transition"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            )}
          </div>
          
          {flashProgress && (
            <div className="space-y-4">
              {/* Progress Bar */}
              <div className="relative">
                <div className="h-2 bg-[#3c3c3c] rounded-full overflow-hidden">
                  <div 
                    className={`h-full transition-all duration-300 ${
                      flashProgress.stage === 'error' 
                        ? 'bg-[#F48771]' 
                        : flashProgress.stage === 'complete' 
                          ? 'bg-[#4EC9B0]' 
                          : 'bg-[#007acc]'
                    }`}
                    style={{ width: `${flashProgress.progress}%` }}
                  />
                </div>
              </div>
              
              {/* Stage indicator */}
              <div className="flex items-center gap-3">
                {flashProgress.stage === 'error' ? (
                  <div className="w-8 h-8 rounded-full bg-[#F48771]/20 flex items-center justify-center">
                    <svg className="w-5 h-5 text-[#F48771]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </div>
                ) : flashProgress.stage === 'complete' ? (
                  <div className="w-8 h-8 rounded-full bg-[#4EC9B0]/20 flex items-center justify-center">
                    <svg className="w-5 h-5 text-[#4EC9B0]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                ) : (
                  <div className="w-8 h-8 rounded-full bg-[#007acc]/20 flex items-center justify-center">
                    <div className="w-4 h-4 border-2 border-[#007acc] border-t-transparent rounded-full animate-spin" />
                  </div>
                )}
                <div className="flex-1">
                  <p className="text-white text-sm font-medium capitalize">{flashProgress.stage}</p>
                  <p className="text-[#858585] text-xs">{flashProgress.message}</p>
                </div>
                <span className="text-[#858585] text-sm font-mono">{flashProgress.progress}%</span>
              </div>
              
              {/* Error retry button */}
              {flashProgress.stage === 'error' && (
                <div className="space-y-3 mt-4">
                  <p className="text-[#cccccc] text-xs">
                    WebUSB flashing failed. You can try again or download the HEX file to drag and drop onto your MICROBIT drive.
                  </p>
                  <div className="flex gap-2">
                    <button
                      onClick={handleFlashToMicrobit}
                      className="flex-1 px-4 py-2 bg-[#007acc] hover:bg-[#1177bb] text-white rounded text-sm font-medium transition"
                    >
                      Try Again
                    </button>
                    <button
                      onClick={() => {
                        handleDownloadHex();
                        handleCloseFlashModal();
                      }}
                      className="flex-1 px-4 py-2 bg-[#4d9f4d] hover:bg-[#5cb85c] text-white rounded text-sm font-medium transition"
                    >
                      Download HEX
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
          
          {/* Instructions */}
          {flashProgress?.stage === 'connecting' && (
            <div className="mt-4 p-3 bg-[#1e1e1e] rounded border border-[#3c3c3c]">
              <p className="text-[#cccccc] text-xs leading-relaxed">
                <strong>Tips:</strong> Make sure your micro:bit is connected via USB. 
                When prompted, select the &quot;BBC micro:bit CMSIS-DAP&quot; device from the list.
              </p>
            </div>
          )}
          
          {/* Preparing stage info */}
          {flashProgress?.stage === 'preparing' && (
            <div className="mt-4 p-3 bg-[#1e1e1e] rounded border border-[#3c3c3c]">
              <p className="text-[#cccccc] text-xs leading-relaxed">
                Fetching MicroPython runtime and embedding your Python code...
              </p>
            </div>
          )}
        </div>
      </div>
    );
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
          {/* Action Buttons */}
          <div className="flex items-center space-x-2">
            {/* Download HEX - Always available */}
            <button
              onClick={handleDownloadHex}
              className="flex items-center space-x-2 px-3 py-1.5 rounded text-[13px] transition-all bg-[#0e639c] hover:bg-[#1177bb] text-white font-medium border border-[#007acc]"
              title="Download HEX file - drag to MICROBIT drive to flash"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              <span>Download HEX</span>
            </button>

            {/* Save directly to MICROBIT drive - primary action when File System Access API is available */}
            {isFileSystemAccessSupported && (
              <button
                onClick={handleWriteToMicrobitDrive}
                disabled={isFlashing}
                className={`
                  flex items-center space-x-2 px-3 py-1.5 rounded text-[13px] transition-all border font-medium
                  ${
                    isFlashing
                      ? 'bg-[#383838] border-[#464647] text-[#858585] cursor-not-allowed'
                      : 'bg-[#4d9f4d] hover:bg-[#5cb85c] border-[#4d9f4d] text-white'
                  }
                `}
                title="Save directly to MICROBIT drive (select the MICROBIT folder)"
              >
                {isFlashing ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    <span>Saving...</span>
                  </>
                ) : (
                  <>
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                    </svg>
                    <span>Flash µbit</span>
                  </>
                )}
              </button>
            )}

            {/* Status indicator */}
            {getStatusIndicator()}
          </div>

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
      
      {/* Flash Progress Modal */}
      <FlashModal />
    </div>
  );
}