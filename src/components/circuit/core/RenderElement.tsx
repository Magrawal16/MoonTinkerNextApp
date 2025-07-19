import { CircuitElement } from "@/common/types/circuit";
import { Circle, Group } from "react-konva";
import Lightbulb from "../elements/Lightbulb";
import { KonvaEventObject } from "konva/lib/Node";
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
  return (
    <Group
      x={element.x}
      y={element.y}
      onDragMove={props.onDragMove}
      onDragStart={props.onDragStart}
      onDragEnd={props.onDragEnd}
      onClick={() => {
        props.onSelect?.(element.id);
      }}
      id={element.id}
      draggable={true}
    >
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

      {/* render the nodes for the element */}
      {element.nodes.map((node) => (
        <Circle
          key={node.id}
          x={node.x}
          y={node.y}
          radius={5}
          fill={
            node.polarity === "positive"
              ? "green"
              : node.polarity === "negative"
                ? "red"
                : "black"
          }
          onClick={() => props.handleNodeClick(node.id)}
          hitStrokeWidth={10}
          onMouseEnter={(e) => {
            const stage = e.target.getStage();
            if (stage) {
              stage.container().style.cursor = "pointer";
            }
          }}
          onMouseLeave={(e) => {
            const stage = e.target.getStage();
            if (stage) {
              stage.container().style.cursor = "default";
            }
          }}

        // TODO: Add interaction handlers here
        />
      ))}
    </Group>
  );
}
