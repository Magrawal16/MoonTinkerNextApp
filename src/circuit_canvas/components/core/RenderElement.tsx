// RenderElement.tsx

import { useState } from "react";
import { CircuitElement, Wire } from "@/circuit_canvas/types/circuit";
import { Rect, Group, Text, Label, Tag } from "react-konva";
import { KonvaEventObject } from "konva/lib/Node";
import { getElementCenter } from "@/circuit_canvas/utils/rotationUtils";
import { findConnectedMicrobit, debugMicrobitConnection } from "@/circuit_canvas/utils/renderElementsUtils/microbitConnectivityUtils";
import Lightbulb from "@/circuit_canvas/components/elements/Lightbulb";
import Battery from "@/circuit_canvas/components/elements/Battery";
import Led from "@/circuit_canvas/components/elements/Led";
import Resistor from "@/circuit_canvas/components/elements/Resistor";
import Multimeter from "@/circuit_canvas/components/elements/Multimeter";
import Potentiometer from "@/circuit_canvas/components/elements/Potentiometer";
import Microbit from "@/circuit_canvas/components/elements/Microbit";
import UltraSonicSensor4P from "../elements/UltraSonicSensor4P";

// ✅ add simulator to props type
export default function RenderElement({
  element,
  simulator, // ← Make sure this is here
  elements,
  wires,
  ...props
}: {
  element: CircuitElement;
  simulator?: any; // ← Make sure this is in the interface
  onDragMove: (e: KonvaEventObject<DragEvent>) => void;
  handleNodeClick: (nodeId: string) => void;
  handleRatioChange?: (elementId: string, ratio: number) => void;
  handleModeChange: (elementId: string, mode: "voltage" | "current") => void;
  onSelect?: (elementId: string) => void;
  selectedElementId?: string | null;
  onDragStart: () => void;
  onDragEnd: (e: KonvaEventObject<DragEvent>) => void;
  onControllerInput: (elementId: string, input: string) => void;
  isSimulationOn?: boolean;
  elements?: CircuitElement[]; // Add this type
  wires?: Wire[];
}) {
  const [hoveredNodeId, setHoveredNodeId] = useState<string | null>(null);
  const center = getElementCenter(element);

  // Get connected microbit data for ultrasonic sensor using utility function
  const connectedMicrobitData = element.type === "ultrasonicsensor4p" && elements && wires
    ? findConnectedMicrobit(element, elements, wires)
    : null;

  // Debug logging for ultrasonic sensor connections
  if (element.type === "ultrasonicsensor4p" && elements && wires && props.isSimulationOn) {
    debugMicrobitConnection(element, elements, wires);
  }

  console.log("ELEMENT STATE : ", element);
  console.log("CONNECTED MICROBIT DATA : ", connectedMicrobitData);

  return (
    <Group
      x={element.x}
      y={element.y}
      offsetX={center.x}
      offsetY={center.y}
      rotation={element.rotation || 0}
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
          isSimulationOn={props.isSimulationOn}
          pins={
            (element.controller?.pins as Record<
              string,
              { digital?: number }
            >) ?? {}
          }
        />
      )}
      {element.type === "ultrasonicsensor4p" && (
        <UltraSonicSensor4P
          id={element.id}
          x={0}
          y={0}
          selected={props.selectedElementId === element.id}
          connectionPins={{
            trig: element.nodes.find((n) => n.placeholder === "TRIG")?.id,
            echo: element.nodes.find((n) => n.placeholder === "ECHO")?.id,
            vcc: element.nodes.find((n) => n.placeholder === "VCC(+5V)")?.id,
            gnd: element.nodes.find((n) => n.placeholder === "GND")?.id,
          }}
          // Pass the complete connected microbit data with pin information
          connectedMicrobit={connectedMicrobitData ? {
            microbitId: connectedMicrobitData.microbit.id,
            pins: (connectedMicrobitData.microbit.controller?.pins as Record<
              string,
              { digital?: number }
            >) ?? {},
            connections: {
              vcc: connectedMicrobitData.connections.vcc,
              gnd: connectedMicrobitData.connections.gnd,
              trig: connectedMicrobitData.connections.trig,
              echo: connectedMicrobitData.connections.echo,
              allConnected: connectedMicrobitData.connections.allConnected,
              trigPin: connectedMicrobitData.connections.trigPin,
              echoPin: connectedMicrobitData.connections.echoPin,
            }
          } : undefined}
          isSimulation={props.isSimulationOn}
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
              fill={
                isHovered && node.fillColor ? node.fillColor : "transparent"
              }
              stroke={isHovered ? "black" : "transparent"}
              strokeWidth={isHovered ? 1.4 : 0}
              onClick={(e) => {
                e.cancelBubble = true;
                props.handleNodeClick(node.id);
              }}
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