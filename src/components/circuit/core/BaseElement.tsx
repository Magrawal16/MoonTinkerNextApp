// components/circuit/core/Element.tsx
import { Group } from "react-konva";

export interface BaseElementProps {
  id: string;
  x: number;
  y: number;
  selected?: boolean;
  onSelect?: (id: string) => void;
  onDragEnd?: (id: string, x: number, y: number) => void;
  children?: React.ReactNode;
  nodes?: Node[];
}

export function BaseElement({
  id,
  x,
  y,
  onSelect,
  onDragEnd,
  children,
}: BaseElementProps) {
  return (
    <Group
      x={x}
      y={y}
      onClick={() => onSelect?.(id)}
      onDragEnd={(e) => onDragEnd?.(id, e.target.x(), e.target.y())}
    >
      {children}
    </Group>
  );
}
