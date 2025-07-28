// components/Window.tsx
"use client";

import React, { useRef, useState, useEffect, ReactNode } from "react";

interface WindowProps {
  title?: string;
  children: ReactNode;
  initialPosition?: { x: number; y: number };
  initialSize?: { width: number; height: number };
  draggable?: boolean;
  resizable?: boolean;
  className?: string;
  onClose?: () => void; // Optional close handler
  backgroundColor?: string; // Optional background color
}

export function Window({
  title = "Window",
  children,
  initialPosition = { x: 100, y: 100 },
  initialSize = { width: 300, height: 200 },
  draggable = true,
  resizable = true,
  className = "",
  onClose,
  backgroundColor = "#EFF6FF", // Default background color
}: WindowProps) {
  const windowRef = useRef<HTMLDivElement>(null);
  const [position, setPosition] = useState(initialPosition);
  const [size, setSize] = useState(initialSize);
  const [dragging, setDragging] = useState(false);
  const [resizing, setResizing] = useState(false);
  const dragOffset = useRef({ x: 0, y: 0 });
  const resizeStart = useRef({ x: 0, y: 0, width: 0, height: 0 });

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (dragging && draggable) {
        setPosition({
          x: e.clientX - dragOffset.current.x,
          y: e.clientY - dragOffset.current.y,
        });
      } else if (resizing && resizable) {
        const dx = e.clientX - resizeStart.current.x;
        const dy = e.clientY - resizeStart.current.y;
        setSize({
          width: Math.max(150, resizeStart.current.width + dx),
          height: Math.max(100, resizeStart.current.height + dy),
        });
      }
    };

    const stopAll = () => {
      setDragging(false);
      setResizing(false);
    };

    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseup", stopAll);
    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", stopAll);
    };
  }, [dragging, resizing, draggable, resizable]);

  const startDrag = (e: React.MouseEvent) => {
    const rect = windowRef.current?.getBoundingClientRect();
    if (rect) {
      dragOffset.current = {
        x: e.clientX - rect.left,
        y: e.clientY - rect.top,
      };
      setDragging(true);
    }
  };

  const startResize = (e: React.MouseEvent) => {
    e.stopPropagation();
    resizeStart.current = {
      x: e.clientX,
      y: e.clientY,
      width: size.width,
      height: size.height,
    };
    setResizing(true);
  };

  return (
    <div
      ref={windowRef}
      style={{
        position: "fixed",
        left: position.x,
        top: position.y,
        width: size.width,
        height: size.height,
        zIndex: 1000,
      }}
    >
      {/* Toolbar */}
      <div
        onMouseDown={startDrag}
        style={{
          height: 32,
          backgroundColor: "#EFF6FF",
          color: "#fff",
          padding: "0 0.5rem",
          fontWeight: "bold",
          display: "flex",
          alignItems: "center",
          userSelect: "none",
          borderTopLeftRadius: 8,
          borderTopRightRadius: 8,
          boxShadow: "0 2px 5px rgba(0, 0, 0, 0.2)",
        }}
      >
        {/* Mac-style window controls */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 6,
            marginRight: 8,
          }}
        >
          <div
            onClick={(e) => {
              e.stopPropagation(); // prevent triggering drag
              onClose?.();
            }}
            style={{
              width: 12,
              height: 12,
              borderRadius: "50%",
              backgroundColor: "#ff5f57", // macOS red
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 10,
              color: "#fff",
              cursor: "pointer",
              transition: "opacity 0.2s",
            }}
            className="flex items-center justify-center"
            onMouseEnter={(e) => {
              (e.currentTarget as HTMLDivElement).textContent = "×";
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLDivElement).textContent = "";
            }}
          />
        </div>

        {/* Title text */}
        <div
          style={{
            flex: 1,
            cursor: draggable ? "grab" : "default",
            color: "black",
          }}
        >
          {title}
        </div>
      </div>

      {/* Content */}
      <div
        style={{
          backgroundColor: backgroundColor,
          width: "100%",
          height: `calc(100% - 32px)`,
          borderBottomLeftRadius: 8,
          borderBottomRightRadius: 8,
          overflow: "auto",
          position: "relative",
          display: "flex",
          flexDirection: "column",
          boxShadow: "0 4px 20px rgba(0,0,0,0.3)",
        }}
        className={className}
      >
        {children}

        {/* Resize handle */}
        {resizable && (
          <div
            onMouseDown={startResize}
            style={{
              position: "absolute",
              right: 4,
              bottom: 4,
              width: 12,
              height: 12,
              cursor: "nwse-resize",
              backgroundColor: "rgba(0, 0, 0, 0.2)",
              borderRadius: 2,
            }}
          />
        )}
      </div>
    </div>
  );
}
