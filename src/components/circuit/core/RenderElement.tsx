import { useState } from "react";
import { CircuitElement } from "@/common/types/circuit";
import { Rect, Group, Text, Label, Tag } from "react-konva"; // <-- Add Text
import { KonvaEventObject } from "konva/lib/Node";
import Lightbulb from "../elements/Lightbulb";
import Battery from "../elements/Battery";
import Led from "../elements/Led";
import Resistor from "../elements/Resistor";
import Multimeter from "../elements/Multimeter";
import Potentiometer from "../elements/Potentiometer";
import Microbit from "../elements/Microbit";

export default function RenderElement({
  element,
  ...props
}: {
  element: CircuitElement;
  onDragMove: (e: KonvaEventObject<DragEvent>) => void;
  handleNodeClick: (nodeId: string) => void;
  handleRatioChange?: (elementId: string, ratio: number) => void;
  handleModeChange: (elementId: string, mode: "voltage" | "current") => void;
  onSelect?: (elementId: string) => void;
  selectedElementId?: string | null;
  onDragStart: () => void;
  onDragEnd: (e: KonvaEventObject<DragEvent>) => void;
  onControllerInput: (elementId: string, input: string) => void;
}) {
  const [hoveredNodeId, setHoveredNodeId] = useState<string | null>(null);

  return (
    <Group
      x={element.x}
      y={element.y}
      onDragMove={props.onDragMove}
      onDragStart={props.onDragStart}
      onDragEnd={props.onDragEnd}
      onClick={() => props.onSelect?.(element.id)}
      id={element.id}
      draggable={true}
    >
      {/* Render circuit elements */}
      {element.type === "lightbulb" && (
        <Lightbulb
          id={element.id}
          x={0}
          y={0}
          power={element.computed?.power ?? 0}
          selected={props.selectedElementId === element.id}
        />
      )}
      {element.type === "led" && (
        <Led
          id={element.id}
          x={0}
          y={0}
          power={element.computed?.power ?? 0}
          selected={props.selectedElementId === element.id}
        />
      )}
      {element.type === "battery" && (
        <Battery
          id={element.id}
          x={0}
          y={0}
          selected={props.selectedElementId === element.id}
        />
      )}
      {element.type === "resistor" && (
        <Resistor
          id={element.id}
          x={1}
          y={22}
          selected={props.selectedElementId === element.id}
        />
      )}
      {element.type === "multimeter" && (
        <Multimeter
          id={element.id}
          x={1}
          y={22}
          measurement={element.computed?.measurement}
          initialMode={"voltage"}
          onModeChange={props.handleModeChange}
          selected={props.selectedElementId === element.id}
        />
      )}
      {element.type === "potentiometer" && (
        <Potentiometer
          id={element.id}
          x={1}
          y={22}
          onRatioChange={(ratio) => {
            props.handleRatioChange?.(element.id, ratio);
          }}
          resistance={element.properties?.resistance ?? 100}
          ratio={element.properties?.ratio ?? 0.5}
          selected={props.selectedElementId === element.id}
        />
      )}
      {element.type === "microbit" && (
        <Microbit
          id={element.id}
          x={1}
          y={22}
          onControllerInput={(input) => {
            props.onControllerInput(element.id, input);
          }}
          leds={
            (element.controller?.leds as boolean[][] | undefined) ??
            Array(5).fill(Array(5).fill(false))
          }
          selected={props.selectedElementId === element.id}
        />
      )}

      {/* Render nodes and tooltip */}
      {element.nodes.map((node) => {
        const isHovered = node.id === hoveredNodeId;

        return (
          <Group key={node.id}>
            <Rect
              x={node.x - 2}
              y={node.y - 2}
              width={5.6}
              height={5.6}
              cornerRadius={0.3}
              fill={isHovered && node.fillColor ? node.fillColor : "transparent"}
              stroke={isHovered ? "black" : "transparent"}
              strokeWidth={isHovered ? 1.4 : 0}
              onClick={() => props.handleNodeClick(node.id)}
              hitStrokeWidth={10}
              onMouseEnter={(e) => {
                setHoveredNodeId(node.id);
                const stage = e.target.getStage();
                if (stage) stage.container().style.cursor = "pointer";
              }}
              onMouseLeave={(e) => {
                setHoveredNodeId(null);
                const stage = e.target.getStage();
                if (stage) stage.container().style.cursor = "default";
              }}
            />

            {/* Tooltip (conditionally rendered) */}
            {isHovered && node.placeholder && (
              <Label x={node.x + 8} y={node.y - 18} opacity={0.95}>
                <Tag
                  fill="#1f4060"
                  stroke="black"
                  strokeWidth={0.6}
                  cornerRadius={4}
                  shadowColor="black"
                  shadowBlur={1}
                  shadowOffset={{ x: 2, y: 2 }}
                  shadowOpacity={0.2}
                  opacity={0.5}
                />
                <Text
                  text={node.placeholder}
                  fontSize={10}
                  padding={5}
                  fill="white"
                />
              </Label>
            )}
          </Group>
        );
      })}
    </Group>
  );
}
