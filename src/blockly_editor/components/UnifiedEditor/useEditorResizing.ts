import { useCallback, useEffect, useRef, useState } from "react";
import * as Blockly from "blockly";

// Local copy of EditorMode union to avoid circular dependency.
export type EditorMode = "block" | "text";

interface UseEditorResizingResult {
  editorSize: { width: string; height: string };
  resizeRef: React.RefObject<HTMLDivElement | null>;
  handleResizeStart: (e: React.MouseEvent, direction: string) => void;
}

/**
 * Encapsulates all editor resizing logic & persistence
 */
export function useEditorResizing(editorMode: EditorMode): UseEditorResizingResult {
  const [editorSize, setEditorSize] = useState(() => {
    try {
      const savedSize = localStorage.getItem("blockly-editor-size");
      if (savedSize) {
        const parsed = JSON.parse(savedSize);
        if (parsed.width && parsed.height) return parsed;
      }
    } catch (_) {}
    return { width: "900px", height: "600px" };
  });
  const [isResizing, setIsResizing] = useState(false);
  const [resizeDirection, setResizeDirection] = useState<string | null>(null);
  const resizeRef = useRef<HTMLDivElement>(null);
  const startPosRef = useRef({ x: 0, y: 0, width: 0, height: 0 });

  const handleResizeStart = useCallback((e: React.MouseEvent, direction: string) => {
    e.preventDefault();
    e.stopPropagation();
    setIsResizing(true);
    setResizeDirection(direction);
    const rect = resizeRef.current?.getBoundingClientRect();
    if (rect) {
      startPosRef.current = {
        x: e.clientX,
        y: e.clientY,
        width: rect.width,
        height: rect.height,
      };
    }
  }, []);

  const handleResizeMove = useCallback((e: MouseEvent) => {
    if (!isResizing || !resizeDirection) return;
    const deltaX = e.clientX - startPosRef.current.x;
    const deltaY = e.clientY - startPosRef.current.y;
    let newWidth = startPosRef.current.width;
    let newHeight = startPosRef.current.height;
    if (resizeDirection.includes("right")) newWidth = Math.max(300, startPosRef.current.width + deltaX);
    else if (resizeDirection.includes("left")) newWidth = Math.max(300, startPosRef.current.width - deltaX);
    if (resizeDirection.includes("bottom")) newHeight = Math.max(200, startPosRef.current.height + deltaY);
    else if (resizeDirection.includes("top")) newHeight = Math.max(200, startPosRef.current.height - deltaY);
    const newSize = { width: `${newWidth}px`, height: `${newHeight}px` };
    setEditorSize(newSize);
    if ((window as any).editorResizeTimeout) clearTimeout((window as any).editorResizeTimeout);
    (window as any).editorResizeTimeout = setTimeout(() => {
      try { localStorage.setItem("blockly-editor-size", JSON.stringify(newSize)); } catch (_) {}
    }, 500);
  }, [isResizing, resizeDirection]);

  const handleResizeEnd = useCallback(() => {
    setIsResizing(false);
    setResizeDirection(null);
    setTimeout(() => {
      // Trigger Blockly SVG resize if in block mode
      if (editorMode === "block") {
        try {
          const ws = (Blockly as any).getMainWorkspace?.();
          if (ws && typeof Blockly.svgResize === "function") Blockly.svgResize(ws);
        } catch (_) {}
      }
    }, 100);
  }, [editorMode]);

  useEffect(() => {
    if (isResizing) {
      document.addEventListener("mousemove", handleResizeMove);
      document.addEventListener("mouseup", handleResizeEnd);
      document.body.style.userSelect = "none";
      return () => {
        document.removeEventListener("mousemove", handleResizeMove);
        document.removeEventListener("mouseup", handleResizeEnd);
        document.body.style.userSelect = "";
      };
    }
  }, [isResizing, handleResizeMove, handleResizeEnd]);

  return { editorSize, resizeRef, handleResizeStart };
}
