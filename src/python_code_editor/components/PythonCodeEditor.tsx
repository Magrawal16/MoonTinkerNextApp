// components/editor/python/PythonCodeEditor.tsx
"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import { API } from "../api/PythonAPI";
import { registerCompletionProvider } from "../providers/completions";
import { registerHoverProvider } from "../providers/hovers";
import { registerSignatureHelp } from "../providers/signatures";
import { registerSymbolProvider } from "../providers/symbols";
import { addInlineDefLint } from "../lint/inlineDefLint";

// Add WebUSB type declarations
interface USBDevice {
  open(): Promise<void>;
  close(): Promise<void>;
  selectConfiguration(configurationValue: number): Promise<void>;
  claimInterface(interfaceNumber: number): Promise<void>;
  transferOut(endpointNumber: number, data: BufferSource): Promise<USBOutTransferResult>;
}

interface USBOutTransferResult {
  status: USBTransferStatus;
  bytesWritten: number;
}

type USBTransferStatus = 'ok' | 'stall' | 'babble';

interface USB {
  requestDevice(options?: USBDeviceRequestOptions): Promise<USBDevice>;
}

interface USBDeviceRequestOptions {
  filters: USBDeviceFilter[];
}

interface USBDeviceFilter {
  vendorId: number;
  productId?: number;
}

// Extend Navigator interface to include USB
declare global {
  interface Navigator {
    usb?: USB;
  }
}

interface StandaloneEditorProps {
  code: string;
  onChange: (value: string) => void;
}

// NEW: Microbit flasher utility
class MicrobitFlasher {
  private async convertPythonToHex(pythonCode: string): Promise<ArrayBuffer> {
    try {
      // Mock HEX implementation
      const hexContent = `:020000040000FA
:1000000000400020D1000008D5000008D9000008A4
:1000100000000000000000000000000000000000E0
:10002000000000000000000000000000DD0000085C
:00000001FF`;
      
      const encoder = new TextEncoder();
      return encoder.encode(hexContent).buffer;
    } catch (error) {
      console.error('Error converting Python to HEX:', error);
      throw new Error('Failed to convert Python code to HEX format');
    }
  }

  async flashToMicrobit(code: string): Promise<boolean> {
    try {
      if (!navigator.usb) {
        throw new Error('WebUSB is not supported in this browser. Please use Chrome, Edge, or Opera.');
      }

      const hexBuffer = await this.convertPythonToHex(code);
      const device = await navigator.usb.requestDevice({
        filters: [{ vendorId: 0x0d28, productId: 0x0204 }]
      });

      if (!device) {
        throw new Error('No micro:bit device selected.');
      }

      await device.open();
      
      try {
        await device.selectConfiguration(1);
        await device.claimInterface(0);
        await device.transferOut(1, hexBuffer);
        return true;
      } finally {
        await device.close();
      }
    } catch (error) {
      console.error('Error flashing micro:bit:', error);
      
      if (error instanceof Error) {
        if (error.name === 'NotFoundError') {
          throw new Error('No micro:bit device found. Please make sure your micro:bit is connected and in flashing mode.');
        } else if (error.name === 'SecurityError') {
          throw new Error('WebUSB access denied. Please grant permission to access the micro:bit.');
        } else if (error.name === 'NetworkError') {
          throw new Error('Failed to communicate with micro:bit. Please try reconnecting the device.');
        }
      }
      
      throw error;
    }
  }

  async downloadHexFile(code: string, filename: string = 'microbit-program.hex'): Promise<void> {
    try {
      const hexBuffer = await this.convertPythonToHex(code);
      const hexContent = new TextDecoder().decode(hexBuffer);
      
      const blob = new Blob([hexContent], { type: 'application/octet-stream' });
      const url = URL.createObjectURL(blob);
      
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Error downloading HEX file:', error);
      throw new Error('Failed to create HEX file download');
    }
  }
}

// Simple text editor fallback component
const SimpleTextEditor = ({ code, onChange }: StandaloneEditorProps) => {
  return (
    <textarea
      value={code}
      onChange={(e) => onChange(e.target.value)}
      className="w-full h-full bg-[#1e1e1e] text-[#d4d4d4] font-mono p-4 resize-none border-0 outline-none text-sm leading-5"
      style={{ minHeight: '400px' }}
      spellCheck={false}
    />
  );
};

export default function PythonCodeEditor({ code, onChange }: StandaloneEditorProps) {
  const [fontSize, setFontSize] = useState(14);
  const [isDragOver, setIsDragOver] = useState(false);
  const [isFlashing, setIsFlashing] = useState(false);
  const [flashStatus, setFlashStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [useMonaco, setUseMonaco] = useState(true);
  const [isMonacoReady, setIsMonacoReady] = useState(false);
  const microbitFlasherRef = useRef(new MicrobitFlasher());
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

  // Handle flash to microbit
  const handleFlashToMicrobit = async () => {
    if (isFlashing) return;
    
    setIsFlashing(true);
    setFlashStatus('idle');
    
    try {
      await microbitFlasherRef.current.flashToMicrobit(code);
      setFlashStatus('success');
      setTimeout(() => setFlashStatus('idle'), 3000);
    } catch (error) {
      console.error('Failed to flash micro:bit:', error);
      setFlashStatus('error');
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      alert(`Failed to flash micro:bit: ${errorMessage}`);
    } finally {
      setIsFlashing(false);
    }
  };

  // Handle download HEX file
  const handleDownloadHex = async () => {
    try {
      await microbitFlasherRef.current.downloadHexFile(code);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      alert(`Failed to download HEX file: ${errorMessage}`);
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
        wrappingIndent: 'same'
      });

      // Register language services
      const disposables: { dispose: () => void }[] = [];
      try {
        registerCompletionProvider(monaco, disposables);
        registerHoverProvider(monaco, disposables);
        registerSignatureHelp(monaco, disposables);
        registerSymbolProvider(monaco, disposables);
        addInlineDefLint(monaco, editor);
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
    if (codeSnippet) {
      const newCode = code + '\n\n' + codeSnippet;
      onChange(newCode);
    }
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

  // Check if WebUSB is supported
  const isWebUSBSupported = typeof navigator !== 'undefined' && !!navigator.usb;

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
            {/* Download HEX */}
            <button
              onClick={handleDownloadHex}
              className="flex items-center space-x-2 px-3 py-1.5 rounded text-[13px] transition-all bg-[#0e639c] hover:bg-[#1177bb] text-white font-medium border border-[#007acc]"
              title="Download HEX file for manual flashing"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              <span>HEX</span>
            </button>

            {/* Send to micro:bit */}
            {isWebUSBSupported ? (
              <button
                onClick={handleFlashToMicrobit}
                disabled={isFlashing}
                className={`
                  flex items-center space-x-2 px-3 py-1.5 rounded text-[13px] transition-all border font-medium
                  ${
                    isFlashing
                      ? 'bg-[#383838] border-[#464647] text-[#858585] cursor-not-allowed'
                      : 'bg-[#0e639c] hover:bg-[#1177bb] border-[#007acc] text-white'
                  }
                `}
                title="Send code to physical micro:bit via USB"
              >
                {isFlashing ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    <span>Flashing...</span>
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
            ) : (
              <button
                disabled
                className="flex items-center space-x-2 px-3 py-1.5 rounded text-[13px] bg-[#383838] text-[#858585] cursor-not-allowed border border-[#464647]"
                title="WebUSB not supported in this browser"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
                </svg>
                <span>No WebUSB</span>
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
            onChange={(val: string) => onChange(val ?? "")}
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
            }}
            height="100%"
            width="100%"
          />
        ) : (
          <SimpleTextEditor code={code} onChange={onChange} />
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