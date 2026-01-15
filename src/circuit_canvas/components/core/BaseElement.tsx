// components/circuit/core/Element.tsx
import { Group } from "react-konva";

export interface BaseElementProps {
  id: string;
  x: number;
  y: number;
  rotation?: number;
  selected?: boolean;
  onSelect?: (id: string) => void;
  onDragEnd?: (id: string, x: number, y: number) => void;
  children?: React.ReactNode;
  nodes?: Node[];
  draggable?: boolean;
  isSimulationOn?: boolean;  // Disable dragging during simulation
}

export function BaseElement({
  id,
  x,
  y,
  rotation = 0,
  onSelect,
  onDragEnd,
  children,
  draggable = true,
  isSimulationOn = false,
}: BaseElementProps) {
  // Elements should not be draggable during simulation
  const isDraggable = draggable && !isSimulationOn;
  
  return (
    <Group
      x={x}
      y={y}
      rotation={rotation}
      draggable={isDraggable}
      onClick={() => onSelect?.(id)}
      onDragEnd={(e) => onDragEnd?.(id, e.target.x(), e.target.y())}
    >
      {children}
    </Group>
  );
}
