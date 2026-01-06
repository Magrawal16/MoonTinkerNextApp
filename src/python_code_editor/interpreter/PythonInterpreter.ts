/// <reference lib="webworker" />
"use client";

import type { PyodideInterface } from "pyodide";

const urls = {
  indexURL: {
    local: "/pyodide/",
    remote: "https://cdn.jsdelivr.net/pyodide/v0.28.0/full/",
  },
  src: {
    local: "/pyodide/pyodide.js",
    remote: "https://cdn.jsdelivr.net/pyodide/v0.28.0/full/pyodide.js",
  },
};

declare global {
  interface ConsoleWriterGlobal {
    writeToConsole?: (msg: string) => void;
  }

  var globalThis: ConsoleWriterGlobal;
}

// Global script loading promise, shared across all instances
let pyodideScriptLoadingPromise: Promise<void> | null = null;

function loadScript(src: string): Promise<void> {
  if (pyodideScriptLoadingPromise) return pyodideScriptLoadingPromise;
  pyodideScriptLoadingPromise = new Promise((resolve, reject) => {
    const script = document.createElement("script");
    script.src = src;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error(`Failed to load script: ${src}`));
    document.body.appendChild(script);
  });
  return pyodideScriptLoadingPromise;
}

export class PythonInterpreter {
  private pyodide: PyodideInterface | null = null;
  private outputCallback: ((line: string) => void) | null = null;
  private hardwareModules: Record<string, any> = {};
  private isReady = false;
  private static scriptLoaded = false; // static flag to track if loaded

  constructor(private useRemote = true) {}

  async initialize(): Promise<void> {
    if (this.pyodide) return;

    const checkUrlAvailable = (url: string): Promise<boolean> =>
      fetch(url, { method: "HEAD" })
        .then((res) => res.ok)
        .catch(() => false);

    const tryUrls = [
      { indexURL: urls.indexURL.local, src: urls.src.local },
      { indexURL: urls.indexURL.remote, src: urls.src.remote },
    ];

    for (const { indexURL, src } of tryUrls) {
      try {
        const available = await checkUrlAvailable(src);
        if (!available) continue;

        importScripts(src);
        const loadPyodide = (globalThis as any).loadPyodide;
        if (typeof loadPyodide !== "function") {
          throw new Error("loadPyodide is not a function after importScripts");
        }

        this.pyodide = await loadPyodide({ indexURL });
        this.isReady = true;
        return;
      } catch (e) {
        console.warn("[Pyodide] Failed to load from:", src, e);
      }
    }

    throw new Error(
      "Failed to load Pyodide from both local and remote sources."
    );
  }

  setOutputCallback(callback: (line: string) => void) {
    this.outputCallback = callback;
    // Store the callback locally and create a simple forwarder
    // to avoid serialization issues with Comlink proxies
    (globalThis as any).writeToConsole = (msg: string) => {
      try {
        if (this.outputCallback) {
          this.outputCallback(msg);
        }
      } catch (e) {
        console.error("Error in writeToConsole:", e);
      }
    };
  }

  registerHardwareModule(name: string, module: Record<string, any>) {
    if (!this.pyodide) throw new Error("Interpreter not initialized at register hardware module.");
    this.hardwareModules[name] = module;
    this.pyodide.registerJsModule(name, module);
  }

  async run(code: string): Promise<string> {
    if (!this.pyodide) throw new Error("Interpreter not initialized at run pythoninterpreter.");
    const originalCode = code;
    code = this.transformCode(code);
    try {
      await this.injectPrintRedirect();
      await this.pyodide.runPythonAsync(code);
      return "";
    } catch (err: any) {
      return err.toString();
    }
  }

  private transformCode(code: string): string {
    // Auto-await async micro:bit functions and auto-add async to defs using them
    const awaitFunctions = [
      "basic.pause",
      "basic.show_string",
      "basic.show_number",
      "basic.show_leds",
      "music.play_tone",
      "music.rest",
      "display.show",
    ];

    const lines = code.split("\n");

    // Track triple-quoted string regions to avoid rewriting inside them
    let inTripleString = false;
    let tripleDelimiter: '"""' | "'''" | null = null;

    const isInTriple = (line: string): boolean => {
      // Toggle on encountering an odd count of the same delimiter on the line (naive but effective)
      const scan = (text: string, delim: '"""' | "'''") => {
        let count = 0;
        let idx = 0;
        while (true) {
          const pos = text.indexOf(delim, idx);
          if (pos === -1) break;
          count++;
          idx = pos + delim.length;
        }
        return count;
      };

      const hasTriple = (line.indexOf("\"\"\"") !== -1) || (line.indexOf("'''") !== -1);
      if (!inTripleString && hasTriple) {
        const d = line.indexOf("\"\"\"") !== -1 ? '"""' : "'''";
        const c = scan(line, d);
        if (c % 2 === 1) {
          inTripleString = true;
          tripleDelimiter = d;
        }
      } else if (inTripleString && tripleDelimiter) {
        const c = scan(line, tripleDelimiter);
        if (c % 2 === 1) {
          inTripleString = false;
          tripleDelimiter = null;
        }
      }
      return inTripleString;
    };

    // First pass: determine which defs should become async
    const needsAsyncDef: Record<number, boolean> = {};
    let i = 0;
    inTripleString = false; tripleDelimiter = null;
    while (i < lines.length) {
      const line = lines[i];
      const trimmed = line.trim();
      const inTripleNow = isInTriple(line);
      if (!inTripleNow && /^\s*def\s+/.test(line) && !/^\s*async\s+def\s+/.test(line)) {
        const indentMatch = line.match(/^(\s*)def\s+/);
        const baseIndent = indentMatch ? indentMatch[1] : "";
        let j = i + 1;
        let makeAsync = false;
        
        // Reset triple-quote state for this function scan
        const savedTripleState: boolean = inTripleString;
        const savedDelimiter: '"""' | "'''" | null = tripleDelimiter;
        inTripleString = false;
        tripleDelimiter = null;
        
        // scan until a line with indent less than baseIndent (new block) or EOF
        while (j < lines.length) {
          const l = lines[j];
          const ltrim = l.trim();
          
          // Check for await functions BEFORE updating triple-quote state
          // This ensures we catch lines like: basic.show_leds("""
          if (!makeAsync) {
            for (const fn of awaitFunctions) {
              if (l.includes(fn + "(")) { 
                makeAsync = true; 
                break; 
              }
            }
          }
          
          // Maintain triple-quote tracking inside body
          const _ = isInTriple(l);
          
          // Check for function end (dedent)
          if (!inTripleString) {
            if (ltrim === "") { 
              j++; 
              continue; 
            }
            if (!l.startsWith(baseIndent + " ") && !l.startsWith(baseIndent + "\t")) {
              break;
              break;
            }
          }
          
          if (makeAsync) {
            break;
          }
          j++;
        }
        
        
        // Restore triple-quote state
        inTripleString = savedTripleState;
        tripleDelimiter = savedDelimiter;
        
        if (makeAsync) {
          needsAsyncDef[i] = true;
        }
        i = j; // continue from end of block
        continue;
      }
      i++;
    }

    // Helper to insert "await " before a given index in a line
    const insertAwaitAt = (line: string, index: number): string => {
      return line.slice(0, index) + "await " + line.slice(index);
    };

    // Helper to find all indices of substring in a string
    const findAll = (text: string, sub: string): number[] => {
      const idxs: number[] = [];
      let from = 0;
      while (true) {
        const k = text.indexOf(sub, from);
        if (k === -1) break;
        idxs.push(k);
        from = k + sub.length;
      }
      return idxs;
    };

    // Second pass: transform lines with granular triple-quote awareness
    inTripleString = false; tripleDelimiter = null;
    const out: string[] = [];
    for (let lineIdx = 0; lineIdx < lines.length; lineIdx++) {
      let line = lines[lineIdx];

      // Determine editable regions in this line based on triple-quote state
      const editableRanges: Array<{ start: number; end: number }> = [];
      if (!inTripleString) {
        const i3 = line.indexOf('"""');
        const i1 = line.indexOf("'''");
        const firstTriple = [i3, i1].filter((x) => x !== -1).sort((a, b) => a - b)[0] ?? -1;
        if (firstTriple === -1) {
          editableRanges.push({ start: 0, end: line.length });
        } else {
          editableRanges.push({ start: 0, end: firstTriple });
        }
        // Update triple state using the summarizer (so next lines know state)
        void isInTriple(line);
      } else {
        // Currently inside triple; allow edits only after the closing delimiter on this line (if any)
        const delim = tripleDelimiter ?? '"""';
        const closePos = line.indexOf(delim);
        if (closePos !== -1) {
          // everything after closing delimiter is editable
          editableRanges.push({ start: closePos + delim.length, end: line.length });
        }
        void isInTriple(line);
      }

      // Make def async if needed (only if the 'def' starts in an editable region)
      if (needsAsyncDef[lineIdx]) {
        const defPos = line.search(/\bdef\s+/);
        if (defPos !== -1 && editableRanges.some(r => defPos >= r.start && defPos < r.end)) {
          line = line.replace(/^(\s*)def\s+/, "$1async def ");
        }
      }

      // Add await to async function calls within editable ranges
      for (const fn of awaitFunctions) {
        const token = fn + "(";
        let searchPos = 0;
        while (true) {
          const idxCall = line.indexOf(token, searchPos);
          if (idxCall === -1) break;

          // Check if the function call START is in an editable range (not the whole call)
          // This allows basic.show_leds(""" to be awaited even though the """ starts a string
          const callStartInEditable = editableRanges.some(r => idxCall >= r.start && idxCall < r.end);
          
          if (!callStartInEditable) {
            searchPos = idxCall + token.length;
            continue;
          }

          const before = line.slice(0, idxCall);
          if (/\bawait\s*$/.test(before)) {
            searchPos = idxCall + token.length;
            continue;
          }
          const prevChar = before.slice(-1);
          if (prevChar && /[\w.]/.test(prevChar)) {
            searchPos = idxCall + token.length;
            continue;
          }

          line = insertAwaitAt(line, idxCall);
          searchPos = idxCall + ("await ").length + token.length;
        }
      }

      out.push(line);
    }

    // Third pass: Track and prevent multiple on_start() definitions and calls
    const finalOut: string[] = [];
    let onStartDefCount = 0;
    let onStartCallCount = 0;
    let hasAsyncOnStart = false;
    
    for (let i = 0; i < out.length; i++) {
      let line = out[i];
      
      // Check if this line defines on_start function
      const onStartDefMatch = line.match(/^(\s*)(async\s+)?def\s+on_start\s*\(\s*\)\s*:/);
      
      if (onStartDefMatch) {
        onStartDefCount++;
        // Track if first on_start is async
        if (onStartDefCount === 1 && onStartDefMatch[2]) {
          hasAsyncOnStart = true;
        }
        if (onStartDefCount > 1) {
          // Subsequent on_start() definitions - rename to prevent overwriting
          const indent = onStartDefMatch[1] || '';
          const asyncPrefix = onStartDefMatch[2] || '';
          line = `${indent}${asyncPrefix}def _disabled_on_start_${onStartDefCount}():`;
        }
        // Always push the line (either original or renamed)
        finalOut.push(line);
        continue;
      }
      
      // Check if this line contains on_start() call (can have leading/trailing whitespace)
      const onStartCallMatch = line.match(/^(\s*)on_start\s*\(\s*\)\s*$/);
      
      if (onStartCallMatch) {
        onStartCallCount++;
        if (onStartCallCount === 1) {
          const indent = onStartCallMatch[1] || '';
          if (hasAsyncOnStart && !line.includes('await')) {
            line = `${indent}await on_start()`;
          }
        } else {
          // Subsequent on_start() calls - comment them out
          const indent = onStartCallMatch[1] || '';
          line = `${indent}# on_start()  # Disabled: Only one on_start() can run`;
        }
        // Always push the line (either original or commented)
        finalOut.push(line);
        continue;
      }
      
      // For all other lines, just push them as-is
      finalOut.push(line);
    }

    return finalOut.join("\n");
  }

  private async injectPrintRedirect() {
    await this.pyodide!.runPythonAsync(`
      import builtins, sys, random
      class DualOutput:
          def __init__(self):
              self._buffer = []
          def write(self, text):
              if text.strip():
                  import js
                  js.writeToConsole(text)
              self._buffer.append(text)
          def flush(self): pass

      sys.stdout = DualOutput()
      sys.stderr = sys.stdout
      builtins.print = lambda *args, **kwargs: sys.stdout.write(" ".join(map(str, args)) + "\\n")
      from microbit import *
      `);
  }

  getPyodide(): PyodideInterface | null {
    return this.pyodide;
  }

  isInitialized(): boolean {
    return this.isReady;
  }
}
