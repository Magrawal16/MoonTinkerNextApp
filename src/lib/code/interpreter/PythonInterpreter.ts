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
  interface Window {
    writeToConsole?: (msg: string) => void;
  }
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

    try {
      if (!this.useRemote) {
        await loadScript(urls.src.local);
        if (!PythonInterpreter.scriptLoaded) {
          console.log("Loaded local pyodide.js");
          PythonInterpreter.scriptLoaded = true;
        }
      } else {
        await loadScript(urls.src.remote);
        if (!PythonInterpreter.scriptLoaded) {
          console.log("Loaded remote pyodide.js");
          PythonInterpreter.scriptLoaded = true;
        }
      }
    } catch {
      if (!this.useRemote) {
        console.warn("Falling back to CDN for pyodide.js");
        await loadScript(urls.src.remote);
      }
    }

    const loadPyodide = (globalThis as any)
      .loadPyodide as typeof import("pyodide").loadPyodide;
    this.pyodide = await loadPyodide({
      indexURL: this.useRemote ? urls.indexURL.remote : urls.indexURL.local,
    });

    this.isReady = true;
  }

  setOutputCallback(callback: (line: string) => void) {
    this.outputCallback = callback;
    window.writeToConsole = (msg: string) => {
      this.outputCallback?.(msg);
    };
  }

  registerHardwareModule(name: string, module: Record<string, any>) {
    if (!this.pyodide) throw new Error("Interpreter not initialized");
    this.hardwareModules[name] = module;
    this.pyodide.registerJsModule(name, module);
  }

  async run(code: string): Promise<string> {
    if (!this.pyodide) throw new Error("Interpreter not initialized");

    try {
      await this.injectPrintRedirect();
      await this.pyodide.runPythonAsync(code);
      return "";
    } catch (err: any) {
      return err.toString();
    }
  }

  private async injectPrintRedirect() {
    await this.pyodide!.runPythonAsync(`
      import builtins, sys
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
