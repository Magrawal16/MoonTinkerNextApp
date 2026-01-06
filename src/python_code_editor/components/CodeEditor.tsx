"use client";
import Editor from "@monaco-editor/react";
import { useState, useRef, useMemo } from "react";

interface StandaloneEditorProps {
  code: string;
  onChange: (value: string) => void;
}

export default function CodeEditor({ code, onChange }: StandaloneEditorProps) {
  const [fontSize, setFontSize] = useState(14);
  const [isDragOver, setIsDragOver] = useState(false);
  const editorRef = useRef<any>(null);
  // Drag preview state (visual indicator like a green guideline)
  const [dragPreview, setDragPreview] = useState<{
    visible: boolean;
    top: number; // px relative to editor content area
    left: number; // px relative to editor content area
    width: number; // px
  }>({ visible: false, top: 0, left: 0, width: 0 });
  // Cache indent unit string based on typical 4 spaces (updated at drop time using the model options if available)
  const defaultIndentUnit = useMemo(() => " ".repeat(4), []);

  const handleEditorDidMount = (editor: any) => {
    editorRef.current = editor;
  };

  // Classify snippet type to decide placement rules (top-level vs block content)
  const classifySnippet = (raw: string): "top-level" | "block" => {
    if (!raw) return "block";
    const firstLine = raw.replace(/\r\n?/g, "\n").split("\n").find((l) => l.trim().length > 0) || "";
    const t = firstLine.trim();
    if (/^def\s+\w+\s*\(.*\)\s*:\s*$/.test(t)) return "top-level";
    if (/^class\s+\w+.*:\s*$/.test(t)) return "top-level";
    if (/^(from\s+[^\s]+\s+import\s+.+|import\s+.+)$/.test(t)) return "top-level";
    if (/^input\.on_button_pressed\s*\(/.test(t)) return "top-level";
    if (/^input\.button_is_pressed\s*\(/.test(t)) return "top-level";
    return "block";
  };

  // Compute effective indentation for insertion based on current position and context.
  // Rules:
  // - If dropping on a blank line and the previous non-empty line ends with ':', indent one level from that line.
  // - Else if the current line ends with ':', indent one level from current line's indent.
  // - Otherwise use the current line's indentation.
  const computeEffectiveIndent = (
    model: any,
    position: { lineNumber: number; column: number },
    indentUnit: string
  ) => {
    const getLine = (ln: number) => (model?.getLineContent?.(ln) ?? "") as string;
    const lineText = getLine(position.lineNumber);
    const currentIndent = (lineText.match(/^\s*/) || [""])[0];
    const isBlank = lineText.trim().length === 0;

    const endsWithColon = /:\s*$/.test(lineText.trimEnd());
    if (!isBlank) {
      return currentIndent + (endsWithColon ? indentUnit : "");
    }

    // If the blank line already has whitespace, respect it
    if (currentIndent.length > 0) {
      return currentIndent;
    }

    // Scan upward for previous non-empty line and mirror its indent (+1 level if it ends with ':')
    let ln = position.lineNumber - 1;
    while (ln >= 1) {
      const prev = getLine(ln);
      if (prev.trim().length > 0) {
        const prevIndent = (prev.match(/^\s*/) || [""])[0];
        const prevEndsWithColon = /:\s*$/.test(prev.trimEnd());
        return prevIndent + (prevEndsWithColon ? indentUnit : "");
      }
      ln--;
    }
    // Top of file: nothing above
    return "";
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "copy";
    setIsDragOver(true);

    // Show a green guideline where the snippet will be inserted
    try {
      const editor = editorRef.current;
      if (!editor) return;
      const dom: HTMLElement | null = editor.getDomNode?.();
      const model = editor.getModel?.();
      if (!dom || !model) return;

      // Get the position under the cursor
      const target = editor.getTargetAtClientPoint?.(e.clientX, e.clientY);
      const pos = target?.position || editor.getPosition?.();
      if (!pos) return;

      // Compute indentation for preview based on context
      const opts = model.getOptions?.();
      const indentSize: number = (opts?.indentSize as number) || 4;
      const indentUnit = " ".repeat(Math.max(1, indentSize));
      const dragged = e.dataTransfer.getData("text/plain");
      const kind = classifySnippet(dragged);
      const effectiveIndent = kind === "top-level" ? "" : computeEffectiveIndent(model, pos, indentUnit);

      // Compute pixel position for the guideline using visible position APIs
      const baseCoord = editor.getScrolledVisiblePosition({
        lineNumber: pos.lineNumber,
        column: 1,
      });
      if (!baseCoord) return;
      const indentCoord = editor.getScrolledVisiblePosition({
        lineNumber: pos.lineNumber,
        column: Math.max(1, effectiveIndent.length + 1),
      });
      // Place guideline on current line start, at computed indent
      const top = baseCoord.top;
      const left = indentCoord ? indentCoord.left : baseCoord.left;

      const hostRect = (dom.querySelector('.monaco-scrollable-element') as HTMLElement | null)?.getBoundingClientRect?.() ?? dom.getBoundingClientRect();
      const containerRect = (dom.parentElement as HTMLElement | null)?.getBoundingClientRect?.() ?? hostRect;
      const containerWidth = containerRect.width;

      setDragPreview({
        visible: true,
        top,
        left,
        width: Math.max(0, containerWidth - left - 8),
      });
    } catch {
      // ignore preview errors
    }
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    setDragPreview((p) => ({ ...p, visible: false }));
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    setDragPreview((p) => ({ ...p, visible: false }));

    const codeSnippet = e.dataTransfer.getData("text/plain");
    if (codeSnippet && editorRef.current) {
      const editor = editorRef.current;
      const model = editor.getModel?.();
      const target = editor.getTargetAtClientPoint?.(e.clientX, e.clientY);
      const position = target?.position ?? editor.getPosition?.();
      if (!model || !position) return;

      // If dropping on a Python block header (def/class/if/for/while/try/etc), snap to the block body.
      const dropLineContent: string = model.getLineContent(position.lineNumber) ?? "";
      const blockHeaderMatch = /^(\s*)(def|class|if|elif|else|for|while|try|except|finally|with)\b.*:\s*(#.*)?$/.exec(
        dropLineContent
      );
      if (blockHeaderMatch) {
        // If user drops in the gutter/left margin of the header line, insert BEFORE the header.
        try {
          const dom: HTMLElement | null = editor.getDomNode?.();
          const rect = dom?.getBoundingClientRect?.();
          const layout = editor.getLayoutInfo?.();
          const contentLeft = (layout?.contentLeft as number) ?? 0;
          const isInGutter = rect ? e.clientX < rect.left + contentLeft : false;
          if (isInGutter) {
            const normalizeNewlines = (s: string) => s.replace(/\r\n?/g, "\n");
            const raw = normalizeNewlines(codeSnippet).replace(/\n$/, "");
            editor.executeEdits("drag-drop-python-insert-before-header", [
              {
                range: {
                  startLineNumber: position.lineNumber,
                  endLineNumber: position.lineNumber,
                  startColumn: 1,
                  endColumn: 1,
                },
                text: raw + "\n",
                forceMoveMarkers: true,
              },
            ]);

            onChange(editor.getValue());
            editor.focus();

            const insertedLines = raw.split("\n");
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

        const opts = model.getOptions?.();
        const indentSize: number = (opts?.indentSize as number) || 4;
        const indentUnit = " ".repeat(Math.max(1, indentSize));
        const headerIndent = blockHeaderMatch[1] ?? "";
        const bodyLineNumber = position.lineNumber + 1;
        const lineCount = model.getLineCount?.() ?? 0;
        const bodyLineContent = bodyLineNumber <= lineCount ? (model.getLineContent(bodyLineNumber) ?? "") : "";
        const bodyIndent = (() => {
          const ws = (bodyLineContent.match(/^\s*/) || [""])[0];
          return ws.length ? ws : headerIndent + indentUnit;
        })();

        const normalizeNewlines = (s: string) => s.replace(/\r\n?/g, "\n");
        const raw = normalizeNewlines(codeSnippet).replace(/\n$/, "");
        const indented = raw
          .split("\n")
          .map((ln) => (ln.length ? bodyIndent + ln : ln))
          .join("\n");

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
          editor.executeEdits("drag-drop-python-snap-into-block", [
            {
              range: {
                startLineNumber: position.lineNumber,
                endLineNumber: position.lineNumber,
                startColumn: dropLineContent.length + 1,
                endColumn: dropLineContent.length + 1,
              },
              text: "\n" + indented + "\n",
              forceMoveMarkers: true,
            },
          ]);
        }

        onChange(editor.getValue());
        editor.focus();
        const insertedLines = indented.split("\n");
        const newLineNumber = Math.min(bodyLineNumber, model.getLineCount?.() ?? bodyLineNumber) + insertedLines.length - 1;
        const lastLineText = insertedLines[insertedLines.length - 1] || "";
        editor.setPosition({
          lineNumber: newLineNumber,
          column: Math.max(1, lastLineText.length + 1),
        });
        return;
      }

      // Determine indentation context for the insertion
      const lineContent: string = model.getLineContent(position.lineNumber) ?? "";
      const currentIndent = (lineContent.match(/^\s*/) || [""])[0];
      const firstNonWhitespaceColumn = currentIndent.length + 1;
      const hasCodeOnLine = lineContent.trim().length > 0;
      const insertAboveLine = (() => {
        if (!hasCodeOnLine) return false;
        if (currentIndent.length === 0) return false;

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
            return dropX <= indentCoord.left + 2;
          }
        } catch {
          // ignore and fall back
        }

        return position.column <= firstNonWhitespaceColumn;
      })();
      // When inserting above, we're effectively at the start of the line.
      const isCursorAtLineStart = insertAboveLine || position.column <= firstNonWhitespaceColumn;

      const opts = model.getOptions?.();
      const indentSize: number = (opts?.indentSize as number) || 4;
      const indentUnit = " ".repeat(Math.max(1, indentSize));
      const kind = classifySnippet(codeSnippet);
      const effectiveIndent = kind === "top-level" ? "" : computeEffectiveIndent(model, position, indentUnit);

      // If dropping onto a placeholder `pass` line inside a block, replace it.
      const passMatch = /^(\s*)pass\s*$/.exec(lineContent);
      if (passMatch && (kind === "block" || (passMatch[1]?.length ?? 0) > 0)) {
        const normalizeNewlines = (s: string) => s.replace(/\r\n?/g, "\n");
        const raw = normalizeNewlines(codeSnippet).replace(/\n$/, "");
        const lines = raw.split("\n");
        const indented = lines
          .map((ln) => (ln.length ? effectiveIndent + ln : ln))
          .join("\n");

        const replaceRange = {
          startLineNumber: position.lineNumber,
          endLineNumber: position.lineNumber,
          startColumn: 1,
          endColumn: lineContent.length + 1,
        };

        editor.executeEdits("drag-drop-python-replace-pass", [
          { range: replaceRange, text: indented, forceMoveMarkers: true },
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

      // Prepare snippet with indentation applied to each line
      const normalizeNewlines = (s: string) => s.replace(/\r\n?/g, "\n");
      const raw = normalizeNewlines(codeSnippet);
      const lines = raw.split("\n");
      const indented = lines
        .map((ln) => (ln.length ? effectiveIndent + ln : ln))
        .join("\n");

      const endColumn = lineContent.length + 1;
      // Insert rules:
      // - Drop at indentation/start of an indented line with code => insert ABOVE.
      // - Drop on a non-empty line elsewhere => insert AFTER line (avoid splitting code).
      // - Drop on blank line => insert in place.
      const textToInsert = insertAboveLine
        ? indented + "\n"
        : hasCodeOnLine
          ? "\n" + indented + "\n"
          : indented + "\n";

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

      editor.executeEdits("drag-drop-python-indent", [
        { range, text: textToInsert, forceMoveMarkers: true },
      ]);

      // Update external state and move cursor
      const newValue = editor.getValue();
      onChange(newValue);
      editor.focus();

      // Compute new cursor position at end of inserted snippet
      const snippetLines = indented.split("\n");
      const newLineNumber = insertAboveLine
        ? position.lineNumber + snippetLines.length - 1
        : hasCodeOnLine
          ? position.lineNumber + snippetLines.length
          : position.lineNumber + snippetLines.length - 1;
      const lastLineText = snippetLines[snippetLines.length - 1] || "";
      editor.setPosition({ lineNumber: newLineNumber, column: Math.max(1, lastLineText.length + 1) });
    }
  };

  return (
    <div
      className={`ms-3.5
  w-full min-w-[200px] h-full min-h-[260px] max-h-[84vh]
  flex flex-col rounded-xl shadow-2xl border border-white/20
        monaco-transparent
        bg-gradient-to-br from-slate-900/80 via-blue-950/70 to-slate-700/70
        backdrop-blur-2xl m-1 mt-0.5 ${isDragOver ? 'ring-2 ring-indigo-400 ring-opacity-60' : ''}
      `}
      style={{
        boxShadow: "0 8px 40px rgba(0, 41, 100, 0.28)",
        // Allow horizontal scrollbar from Monaco to be visible
        overflow: "hidden", // keep rounded corners for content, Monaco manages its own scrollbars
      }}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      {/* Removed blue overlay; rely on precise guideline */}

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
            scrollBeyondLastLine: true,
            automaticLayout: true,
            fontFamily: "Fira Mono, ui-monospace, monospace",
            smoothScrolling: true,
            lineNumbers: "on",
            fontLigatures: true,
            renderLineHighlight: "all",
            lineDecorationsWidth: 0,
            wordWrap: "off", // ensure long single lines do not wrap
            wordWrapColumn: 0,
            wrappingStrategy: "advanced",
            scrollbar: {
              vertical: "auto",
              horizontal: "visible", // always show horizontal bar so users discover scrolling
              useShadows: false,
              horizontalScrollbarSize: 14,
              verticalScrollbarSize: 12,
            },
            scrollBeyondLastColumn: 5,
          }}
          height="100%"
          width="100%"
        />
        {/* Drag preview guideline */}
        {dragPreview.visible && (
          <div
            style={{
              position: "absolute",
              top: dragPreview.top,
              left: dragPreview.left,
              width: dragPreview.width,
              height: 2,
              background: "#22c55e",
              boxShadow: "0 0 6px rgba(34,197,94,0.9)",
              pointerEvents: "none",
              zIndex: 20,
            }}
          />
        )}
      </div>
    </div>
  );
}
