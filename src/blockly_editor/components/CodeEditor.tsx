// CodeEditor.tsx
import React, { useRef, useEffect } from 'react';
import * as monaco from 'monaco-editor';

interface CodeEditorProps {
  code: string;
  onChange: (code: string) => void;
}

export default function CodeEditor({ code, onChange }: CodeEditorProps) {
  const editorRef = useRef<HTMLDivElement>(null);
  const monacoEditorRef = useRef<monaco.editor.IStandaloneCodeEditor | null>(null);

  useEffect(() => {
    if (editorRef.current) {
      monacoEditorRef.current = monaco.editor.create(editorRef.current, {
        value: code,
        language: 'python',
        theme: 'vs-light',
        minimap: { enabled: false },
        automaticLayout: true,
        scrollBeyondLastLine: false,
        fontSize: 14,
        lineNumbers: 'on',
        roundedSelection: true,
        scrollbar: {
          vertical: 'auto',
          horizontal: 'auto',
        },
      });

      monacoEditorRef.current.onDidChangeModelContent(() => {
        onChange(monacoEditorRef.current?.getValue() || '');
      });

      // Add drop event listener to handle code snippets with proper indentation
      const handleDrop = (e: DragEvent) => {
        const snippetData = e.dataTransfer?.getData('application/code-snippet');
        if (snippetData) {
          e.preventDefault();
          e.stopPropagation();
          
          try {
            const snippet = JSON.parse(snippetData);
            const target = monacoEditorRef.current?.getTargetAtClientPoint?.(e.clientX, e.clientY);
            const position = target?.position ?? monacoEditorRef.current?.getPosition();
            if (position && snippet.code) {
              const model = monacoEditorRef.current?.getModel();
              if (model) {
                const currentLine = model.getLineContent(position.lineNumber);
                const normalized = String(snippet.code).replace(/\r\n?/g, '\n').replace(/\n$/, '');

                // If dropping on a Python block header, snap to the block body.
                const blockHeaderMatch = /^(\s*)(def|class|if|elif|else|for|while|try|except|finally|with)\b.*:\s*(#.*)?$/.exec(
                  currentLine
                );
                if (blockHeaderMatch) {
                  // If user drops in the gutter/left margin of the header line, insert BEFORE the header.
                  try {
                    const dom = monacoEditorRef.current?.getDomNode?.() ?? null;
                    const rect = dom?.getBoundingClientRect?.();
                    const layout = monacoEditorRef.current?.getLayoutInfo?.();
                    const contentLeft = (layout?.contentLeft as number) ?? 0;
                    const isInGutter = rect ? e.clientX < rect.left + contentLeft : false;
                    if (isInGutter) {
                      monacoEditorRef.current?.executeEdits('insert-snippet', [
                        {
                          range: new monaco.Range(position.lineNumber, 1, position.lineNumber, 1),
                          text: normalized + '\n',
                          forceMoveMarkers: true,
                        },
                      ]);
                      const insertedLines = normalized.split('\n');
                      const newLineNumber = position.lineNumber + insertedLines.length - 1;
                      const lastLineText = insertedLines[insertedLines.length - 1] || '';
                      monacoEditorRef.current?.setPosition({
                        lineNumber: newLineNumber,
                        column: Math.max(1, lastLineText.length + 1),
                      });
                      return;
                    }
                  } catch {
                    // ignore and fall through
                  }

                  const indentUnit = ' '.repeat(4);
                  const headerIndent = blockHeaderMatch[1] ?? '';
                  const bodyLineNumber = position.lineNumber + 1;
                  const lineCount = model.getLineCount();
                  const bodyLineContent = bodyLineNumber <= lineCount ? model.getLineContent(bodyLineNumber) : '';
                  const bodyIndent = (() => {
                    const ws = (bodyLineContent.match(/^\s*/) || [''])[0];
                    return ws.length ? ws : headerIndent + indentUnit;
                  })();

                  const bodyIndentedCode = normalized
                    .split('\n')
                    .map((line: string) => (line.length ? bodyIndent + line : line))
                    .join('\n');

                  const isPass = /^\s*pass\s*$/.test(bodyLineContent);
                  const isBlank = bodyLineContent.trim().length === 0;

                  monacoEditorRef.current?.executeEdits('insert-snippet', [
                    {
                      range:
                        bodyLineNumber <= lineCount && (isPass || isBlank)
                          ? new monaco.Range(bodyLineNumber, 1, bodyLineNumber, bodyLineContent.length + 1)
                          : bodyLineNumber <= lineCount
                            ? new monaco.Range(bodyLineNumber, 1, bodyLineNumber, 1)
                            : new monaco.Range(position.lineNumber, currentLine.length + 1, position.lineNumber, currentLine.length + 1),
                      text:
                        bodyLineNumber <= lineCount && (isPass || isBlank)
                          ? bodyIndentedCode
                          : bodyLineNumber <= lineCount
                            ? bodyIndentedCode + '\n'
                            : '\n' + bodyIndentedCode + '\n',
                      forceMoveMarkers: true,
                    },
                  ]);

                  const insertedLines = bodyIndentedCode.split('\n');
                  const newLineNumber = Math.min(bodyLineNumber, model.getLineCount()) + insertedLines.length - 1;
                  const lastLineText = insertedLines[insertedLines.length - 1] || '';
                  monacoEditorRef.current?.setPosition({
                    lineNumber: newLineNumber,
                    column: Math.max(1, lastLineText.length + 1),
                  });
                  return;
                }

                // Get current line's indentation (and replace placeholder `pass` when applicable)
                const passMatch = /^(\s*)pass\s*$/.exec(currentLine);
                const indentation = (passMatch?.[1] ?? currentLine.match(/^\s*/)?.[0] ?? '');
                
                // Apply indentation to each line of the snippet
                const indentedCode = normalized
                  .split('\n')
                  .map((line: string) => (line.length ? indentation + line : line))
                  .join('\n');

                const indentPrefix = (currentLine.match(/^\s*/) || [''])[0];
                const firstNonWhitespaceColumn = indentPrefix.length + 1;
                const endCol = currentLine.length + 1;
                const hasCodeOnLine = currentLine.trim().length > 0;
                const insertAboveLine = (() => {
                  if (!hasCodeOnLine) return false;
                  if (indentPrefix.length === 0) return false;

                  try {
                    const dom = monacoEditorRef.current?.getDomNode?.() ?? null;
                    const rect = dom?.getBoundingClientRect?.();
                    const layout = monacoEditorRef.current?.getLayoutInfo?.();
                    const contentLeft = (layout?.contentLeft as number) ?? 0;
                    const indentCoord = monacoEditorRef.current?.getScrolledVisiblePosition?.({
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

                const safeRange = (() => {
                  if (passMatch) {
                    return new monaco.Range(position.lineNumber, 1, position.lineNumber, currentLine.length + 1);
                  }
                  if (insertAboveLine) {
                    return new monaco.Range(position.lineNumber, 1, position.lineNumber, 1);
                  }
                  if (!hasCodeOnLine) {
                    const safeCol = position.column >= endCol ? position.column : endCol;
                    return new monaco.Range(position.lineNumber, safeCol, position.lineNumber, safeCol);
                  }
                  return new monaco.Range(position.lineNumber, endCol, position.lineNumber, endCol);
                })();

                const safeText = (() => {
                  if (passMatch) return indentedCode;
                  if (insertAboveLine) return indentedCode + '\n';
                  if (!hasCodeOnLine) return indentedCode;
                  return '\n' + indentedCode;
                })();
                
                // Insert the indented code
                monacoEditorRef.current?.executeEdits('insert-snippet', [
                  {
                    range: safeRange,
                    text: safeText,
                    forceMoveMarkers: true
                  }
                ]);

                // Place caret at end of inserted snippet
                const insertedLines = indentedCode.split('\n');
                const newLineNumber = insertAboveLine
                  ? position.lineNumber + insertedLines.length - 1
                  : hasCodeOnLine
                    ? position.lineNumber + insertedLines.length
                    : position.lineNumber + insertedLines.length - 1;
                const lastLineText = insertedLines[insertedLines.length - 1] || '';
                monacoEditorRef.current?.setPosition({
                  lineNumber: newLineNumber,
                  column: Math.max(1, lastLineText.length + 1),
                });
              }
            }
          } catch (error) {
            console.error('Error processing dropped snippet:', error);
          }
        }
      };

      const editorElement = editorRef.current;
      editorElement.addEventListener('drop', handleDrop);

      return () => {
        editorElement.removeEventListener('drop', handleDrop);
        monacoEditorRef.current?.dispose();
      };
    }
  }, []);

  useEffect(() => {
    if (monacoEditorRef.current && monacoEditorRef.current.getValue() !== code) {
      monacoEditorRef.current.setValue(code);
    }
  }, [code]);

  return <div ref={editorRef} style={{ height: '100%', width: '100%' }} />;
}