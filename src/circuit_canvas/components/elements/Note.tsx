import React, { useRef, useEffect, useState } from "react";
import { Group, Rect, Text, Path } from "react-konva";
import Konva from "konva";
import type { KonvaEventObject } from "konva/lib/Node";

interface NoteProps {
  id: string;
  x: number;
  y: number;
  text?: string;
  width?: number;
  height?: number;
  backgroundColor?: string;
  collapsed?: boolean;
  selected?: boolean;
  draggable?: boolean;
  onDoubleClick?: () => void;
  onTextChange?: (text: string) => void;
  onResize?: (width: number, height: number) => void;
  onToggleCollapsed?: (collapsed: boolean) => void;
}

const Note: React.FC<NoteProps> = ({
  id,
  x,
  y,
  text = "",
  width = 150,
  height = 100,
  backgroundColor = "#E8E8E8",
  collapsed = false,
  selected = false,
  draggable = true,
  onDoubleClick,
  onTextChange,
  onResize,
  onToggleCollapsed,
}) => {
  const groupRef = useRef<Konva.Group>(null);
  const textRef = useRef<Konva.Text>(null);
  const [currentWidth, setCurrentWidth] = useState(width);
  const [currentHeight, setCurrentHeight] = useState(height);
  const [scrollOffset, setScrollOffset] = useState(0);
  const resizeStartPosRef = useRef<{ x: number; y: number } | null>(null);
  const resizeStartSizeRef = useRef<{ width: number; height: number } | null>(null);

  const RESIZE_HANDLE_SIZE = 14;
  const MIN_WIDTH = 100;
  const MIN_HEIGHT = 80;
  const COLLAPSED_HEIGHT = 30;
  const COLLAPSED_WIDTH = 160; // fixed width so collapsed notes look uniform
  const HEADER_HEIGHT = 24;

  const displayWidth = collapsed ? COLLAPSED_WIDTH : currentWidth;
  const displayHeight = collapsed ? COLLAPSED_HEIGHT : currentHeight;

  const handleResizeHandleMouseDown = (e: KonvaEventObject<MouseEvent>) => {
    e.cancelBubble = true;
    const pos = e.target.getStage()?.getPointerPosition();
    if (pos && groupRef.current) {
      resizeStartPosRef.current = { x: pos.x, y: pos.y };
      resizeStartSizeRef.current = { width: currentWidth, height: currentHeight };
    }
  };

  useEffect(() => {
    if (!selected || !resizeStartPosRef.current) return;

    const handleMouseMove = (e: MouseEvent) => {
      if (!resizeStartPosRef.current || !resizeStartSizeRef.current || !groupRef.current) return;

      const stage = groupRef.current.getStage();
      if (!stage) return;

      const pos = stage.getPointerPosition();
      if (!pos) return;

      const deltaX = pos.x - resizeStartPosRef.current.x;
      const deltaY = pos.y - resizeStartPosRef.current.y;

      const newWidth = Math.max(MIN_WIDTH, resizeStartSizeRef.current.width + deltaX);
      const newHeight = Math.max(MIN_HEIGHT, resizeStartSizeRef.current.height + deltaY);

      setCurrentWidth(newWidth);
      setCurrentHeight(newHeight);
    };

    const handleMouseUp = () => {
      if (resizeStartPosRef.current && resizeStartSizeRef.current && onResize) {
        onResize(currentWidth, currentHeight);
      }
      resizeStartPosRef.current = null;
      resizeStartSizeRef.current = null;
    };

    if (resizeStartPosRef.current) {
      window.addEventListener("mousemove", handleMouseMove);
      window.addEventListener("mouseup", handleMouseUp);

      return () => {
        window.removeEventListener("mousemove", handleMouseMove);
        window.removeEventListener("mouseup", handleMouseUp);
      };
    }
  }, [selected, currentWidth, currentHeight, onResize]);

  const handleScroll = (e: KonvaEventObject<WheelEvent>) => {
    e.evt.preventDefault();
    const delta = e.evt.deltaY > 0 ? 15 : -15;
    const textHeight = textRef.current?.height() || 0;
    const contentHeight = textRef.current?.getTextHeight?.() || 0;
    const maxOffset = Math.max(0, contentHeight - textHeight);
    
    setScrollOffset((prev) => Math.max(0, Math.min(prev + delta, maxOffset)));
  };

  // Get first line of text for preview when collapsed
  const previewText = text ? text.split('\n')[0].substring(0, 40) + (text.length > 40 ? '...' : '') : 'Empty note';

  return (
    <Group x={0} y={0} ref={groupRef} opacity={0.70}>
      {/* Background */}
      <Rect
        x={0}
        y={0}
        width={displayWidth}
        height={displayHeight}
        fill={backgroundColor}
        stroke={selected ? "#2196F3" : "#E0E0E0"}
        strokeWidth={selected ? 2 : 1}
        shadowColor="black"
        shadowBlur={5}
        shadowOffset={{ x: 2, y: 2 }}
        shadowOpacity={0.3}
        cornerRadius={4}
        onDblClick={collapsed ? undefined : onDoubleClick}
        onWheel={collapsed ? undefined : handleScroll}
      />

      {/* Header bar */}
      <Rect
        x={0}
        y={0}
        width={displayWidth}
        height={HEADER_HEIGHT}
        fill="#6395c5ff"
        cornerRadius={[4, 4, 0, 0]}
      />

      {/* Header text - "Note" label */}
      <Text
        x={8}
        y={6}
        text="Note"
        fontSize={11}
        fontFamily="Arial, sans-serif"
        fontStyle="bold"
        fill="#ffffff"
        listening={false}
      />

      {/* Minimize/Maximize button */}
      <Group 
        x={displayWidth - 22} 
        y={4}
        onClick={() => onToggleCollapsed?.(!collapsed)}
        onTap={() => onToggleCollapsed?.(!collapsed)}
        onMouseEnter={(e) => {
          const stage = e.target.getStage();
          if (stage) stage.container().style.cursor = "pointer";
        }}
        onMouseLeave={(e) => {
          const stage = e.target.getStage();
          if (stage) stage.container().style.cursor = "default";
        }}
      >
        {/* Button background */}
        <Rect
          x={0}
          y={0}
          width={16}
          height={16}
          fill="#ffffff"
          opacity={0.2}
          cornerRadius={2}
        />
        {/* Icon: horizontal line for minimize, plus for maximize */}
        {collapsed ? (
          // Plus icon (maximize)
          <>
            <Rect x={3} y={7} width={10} height={2} fill="#ffffff" />
            <Rect x={7} y={3} width={2} height={10} fill="#ffffff" />
          </>
        ) : (
          // Minus icon (minimize)
          <Rect x={3} y={7} width={10} height={2} fill="#ffffff" />
        )}
      </Group>

      {/* Preview text when collapsed */}
      {collapsed && (
        <Text
          x={8}
          y={HEADER_HEIGHT - 11}
          width={displayWidth - 16}
          text={"..."}
          fontSize={20}
          fontFamily="Arial, sans-serif"
          fill="#666"
          listening={false}
          ellipsis={true}
        />
      )}

      {/* Text content with clipping for overflow */}
      {!collapsed && (
        <Group
          x={8}
          y={HEADER_HEIGHT + 4}
          clipFunc={(ctx) => {
            ctx.rect(0, 0, displayWidth - 16, displayHeight - HEADER_HEIGHT - 8);
          }}
        >
          <Text
            ref={textRef}
            x={0}
            y={-scrollOffset}
            width={displayWidth - 16}
            text={text && text !== "Select to edit" ? text : "Select to edit"}
            fontSize={12}
            fontFamily="Arial, sans-serif"
            fill={text && text !== "Select to edit" ? "#333" : "#999"}
            wrap="word"
            align="left"
            verticalAlign="top"
            onDblClick={onDoubleClick}
          />
        </Group>
      )}

      {/* Resize handle (bottom-right corner) */}
      {selected && !collapsed && (
        <Rect
          x={currentWidth - RESIZE_HANDLE_SIZE}
          y={currentHeight - RESIZE_HANDLE_SIZE}
          width={RESIZE_HANDLE_SIZE}
          height={RESIZE_HANDLE_SIZE}
          fill="#2196F3"
          cornerRadius={2}
          opacity={0.8}
          onMouseDown={handleResizeHandleMouseDown}
          onMouseEnter={(e) => {
            const stage = e.target.getStage();
            if (stage) stage.container().style.cursor = "nwse-resize";
          }}
          onMouseLeave={(e) => {
            const stage = e.target.getStage();
            if (stage) stage.container().style.cursor = "default";
          }}
          hitStrokeWidth={6}
        />
      )}
    </Group>
  );
};

export default Note;
