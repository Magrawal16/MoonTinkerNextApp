"use client";
import Editor from "@monaco-editor/react";
import { useState, useRef, useEffect } from "react";

interface PopupEditorProps {
  visible: boolean;
  code: string;
  onChange: (value: string) => void;
  onClose: () => void;
}

export default function PopupEditor({
  visible,
  code,
  onChange,
  onClose,
}: PopupEditorProps) {
  const editorRef = useRef<HTMLDivElement | null>(null);
  const [position, setPosition] = useState({ x: 100, y: 100 });
  const [isDragging, setIsDragging] = useState(false);
  const offset = useRef({ x: 0, y: 0 });

  const [size, setSize] = useState({ width: 600, height: 600 });
  const [isResizing, setIsResizing] = useState(false);
  const resizeStart = useRef({ x: 0, y: 0, width: 0, height: 0 });

  const [fontSize, setFontSize] = useState(14); // 🌟 Font size for zoom

  // Mouse move for dragging or resizing
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (isDragging) {
        setPosition({
          x: e.clientX - offset.current.x,
          y: e.clientY - offset.current.y,
        });
      } else if (isResizing) {
        const dx = e.clientX - resizeStart.current.x;
        const dy = e.clientY - resizeStart.current.y;
        setSize({
          width: Math.max(300, resizeStart.current.width + dx),
          height: Math.max(300, resizeStart.current.height + dy),
        });
      }
    };

    const handleMouseUp = () => {
      setIsDragging(false);
      setIsResizing(false);
    };

    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseup", handleMouseUp);
    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
    };
  }, [isDragging, isResizing]);

  const handleMouseDown = (e: React.MouseEvent) => {
    const rect = editorRef.current?.getBoundingClientRect();
    if (rect) {
      offset.current = {
        x: e.clientX - rect.left,
        y: e.clientY - rect.top,
      };
    }
    setIsDragging(true);
  };

  const handleResizeMouseDown = (e: React.MouseEvent) => {
    e.stopPropagation();
    resizeStart.current = {
      x: e.clientX,
      y: e.clientY,
      width: size.width,
      height: size.height,
    };
    setIsResizing(true);
  };

  if (!visible) return null;

  return (
    <div
      ref={editorRef}
      className="fixed z-50 border shadow-lg text-gray-200 flex flex-col"
      style={{
        top: position.y,
        left: position.x,
        width: size.width,
        height: size.height,
      }}
    >
      {/* Header bar */}
      <div
        className="bg-gray-800 text-gray-300 px-4 py-2 cursor-move flex justify-between items-center"
        onMouseDown={handleMouseDown}
      >
        <span>Python Editor</span>
        <div className="space-x-2">
          {/* Zoom controls */}
          <button
            onClick={() => setFontSize((s) => Math.max(8, s - 1))}
            className="bg-blue-600 text-gray-300 px-2 py-1 rounded text-sm hover:bg-blue-700"
          >
            −
          </button>
          <button
            onClick={() => setFontSize((s) => Math.min(40, s + 1))}
            className="bg-blue-600 text-gray-300 px-2 py-1 rounded text-sm hover:bg-blue-700"
          >
            +
          </button>
          <button
            onClick={onClose}
            className="text-gray-300 bg-red-500 px-2 py-1 rounded hover:bg-red-600"
          >
            Close
          </button>
        </div>
      </div>

      {/* Editor */}
      <div className="flex-grow relative">
        <Editor
          height="100%"
          width="100%"
          defaultLanguage="python"
          value={code}
          theme="vs-dark"
          onChange={(value) => onChange(value ?? "")}
          options={{
            minimap: { enabled: false },
            fontSize,
          }}
        />

        {/* Resize handle */}
        <div
          onMouseDown={handleResizeMouseDown}
          className="absolute bottom-0 right-0 w-4 h-4 bg-blue-600 cursor-se-resize"
        />
      </div>
    </div>
  );
}
