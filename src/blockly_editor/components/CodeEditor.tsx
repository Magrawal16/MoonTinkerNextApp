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
            const position = monacoEditorRef.current?.getPosition();
            if (position && snippet.code) {
              const model = monacoEditorRef.current?.getModel();
              if (model) {
                // Get current line's indentation
                const currentLine = model.getLineContent(position.lineNumber);
                const indentation = currentLine.match(/^\s*/)?.[0] || '';
                
                // Apply indentation to each line of the snippet
                const indentedCode = snippet.code
                  .split('\n')
                  .map((line: string, i: number) => 
                    i === 0 ? line : indentation + line
                  )
                  .join('\n');
                
                // Insert the indented code
                monacoEditorRef.current?.executeEdits('insert-snippet', [
                  {
                    range: new monaco.Range(
                      position.lineNumber,
                      position.column,
                      position.lineNumber,
                      position.column
                    ),
                    text: indentedCode,
                    forceMoveMarkers: true
                  }
                ]);
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