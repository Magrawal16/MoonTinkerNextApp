 
import { useCallback, useState } from "react";
import { CircuitElement, Wire } from "@/circuit_canvas/types/circuit";
import { Rect, Group, Text, Label, Tag, Path } from "react-konva";
import { KonvaEventObject } from "konva/lib/Node";
import { getElementCenter } from "@/circuit_canvas/utils/rotationUtils";
import { findConnectedMicrobit } from "@/circuit_canvas/utils/renderElementsUtils/microbitConnectivityUtils";
import { shouldHideNode, getElementRegions } from "@/circuit_canvas/utils/elementOverlap";
import Lightbulb from "@/circuit_canvas/components/elements/Lightbulb";
import Battery from "@/circuit_canvas/components/elements/Battery";
import Cell3v from "@/circuit_canvas/components/elements/Cell3v";
import AA_battery from "@/circuit_canvas/components/elements/AA_battery";
import AAA_battery from "@/circuit_canvas/components/elements/AAA_battery";
import Led from "@/circuit_canvas/components/elements/Led";
import Resistor from "@/circuit_canvas/components/elements/Resistor";
import Multimeter from "@/circuit_canvas/components/elements/Multimeter";
import Potentiometer from "@/circuit_canvas/components/elements/Potentiometer";
import Microbit from "@/circuit_canvas/components/elements/Microbit";
import UltraSonicSensor4P from "../elements/UltraSonicSensor4P";
import MicrobitWithBreakout from "../elements/MicrobitWithBreakout";
import PowerSupply from "@/circuit_canvas/components/elements/PowerSupply";
import Note from "@/circuit_canvas/components/elements/Note";

interface RenderElementProps {
  element: CircuitElement;
  simulator?: any;
  onDragMove: (e: KonvaEventObject<DragEvent>) => void;
  handleNodeClick: (nodeId: string) => void;
  handleNodePointerDown?: (nodeId: string) => void;
  handleNodePointerUp?: (nodeId: string) => void;
  snapTargetNodeId?: string | null;
  handleRatioChange?: (elementId: string, ratio: number) => void;
  handleModeChange: (elementId: string, mode: "voltage" | "current" | "resistance") => void;
  onSelect?: (elementId: string) => void;
  selectedElementId?: string | null;
  onDragStart: () => void;
  onDragEnd: (e: KonvaEventObject<DragEvent>) => void;
  onControllerInput: (elementId: string, input: string) => void;
  isSimulationOn?: boolean;
  elements?: CircuitElement[];
  wires?: Wire[];
  onPowerSupplySettingsChange?: (id: string, settings: { vSet: number; iLimit: number; isOn: boolean }) => void;
  // Toggle node hit targets/tooltips (for external node overlay layer)
  showNodes?: boolean;
  // Toggle rendering of the element's visual body; when false, only nodes/labels render
  showBody?: boolean;
  // Hovered node ID when dragging wire endpoint
  hoveredNodeForEndpoint?: string | null;
  // Generic hook to update element properties
  onUpdateElementProperties?: (elementId: string, properties: Record<string, any>) => void;
  onMicrobitNode?: (id: string, node: any | null) => void;

  
}

export default function RenderElement(props: RenderElementProps) {
  const [hoveredNodeId, setHoveredNodeId] = useState<string | null>(null);
  const elements = props.elements;
  const wires = props.wires;
  const { element } = props;
  const center = getElementCenter(element);

  const microbitGroupRef = useCallback(
    (node: any | null) => {
      if (element.type === "microbit" || element.type === "microbitWithBreakout") {
        props.onMicrobitNode?.(element.id, node);
      }
    },
    [element.id, element.type, props.onMicrobitNode]
  );
  // Get connected microbit data for ultrasonic sensor using utility function
  const connectedMicrobitData = element.type === "ultrasonicsensor4p" && elements && wires
    ? findConnectedMicrobit(element, elements, wires)
    : null;
  // Get all collision regions for this element
  const collisionRegions = getElementRegions(element);
  
  return (
    <Group
      ref={microbitGroupRef}
      
      x={element.x}
      y={element.y}
      offsetX={center.x}
      offsetY={center.y}
      rotation={element.rotation || 0}
      onDragMove={props.onDragMove}
      onDragStart={props.onDragStart}
      onDragEnd={props.onDragEnd}
      onClick={() => props.onSelect?.(element.id)}
      id={
          element.type === "microbit" || element.type === "microbitWithBreakout"
            ? `microbit-${element.id}`
            : element.id
        }
      name={element.type}

      // Only the body layer should be draggable, and not while simulation is running
      draggable={props.showBody !== false && !props.isSimulationOn}
    >
      
      {/* Render circuit elements (conditionally hidden in nodes-only overlay) */}
      {props.showBody !== false && element.type === "lightbulb" && (
        <Lightbulb
          id={element.id}
          x={0}
          y={0}
          power={element.computed?.power ?? 0}
          selected={props.selectedElementId === element.id}
          draggable={false}
          isSimulationOn={props.isSimulationOn}
        />
      )}
      {props.showBody !== false && element.type === "led" && (
        <Led
          id={element.id}
          x={0}
          y={0}
          electrical={{
            current: element.computed?.current,
            forwardVoltage: element.computed?.forwardVoltage ?? element.computed?.voltage,
            power: element.computed?.power,
            explosionCurrentEstimate: (element.computed as any)?.explosionCurrentEstimate,
          }}
          runtime={element.runtime?.led}
          selected={props.selectedElementId === element.id}
          color={element.properties?.color as string | undefined}
          draggable={false}
          isSimulationOn={props.isSimulationOn}
        />
      )}
      {props.showBody !== false && element.type === "battery" && (
        <Battery
          id={element.id}
          x={0}
          y={0}
          draggable={false}
          selected={props.selectedElementId === element.id}
          isSimulationOn={props.isSimulationOn}
        />
      )}
      {props.showBody !== false && element.type === "cell3v" && (
        <Cell3v
          id={element.id}
          x={0}
          y={0}
          draggable={false}
          selected={props.selectedElementId === element.id}
          isSimulationOn={props.isSimulationOn}
        />
      )}
      {props.showBody !== false && element.type === "AA_battery" && (() => {
        const batteryType = (element.properties as any)?.batteryType ?? 'AA';
        const batteryCount = (element.properties as any)?.batteryCount ?? 1;
        
        // Handle AAA type with dynamic count
        if (batteryType === 'AAA') {
          return (
            <AAA_battery
              id={element.id}
              x={0}
              y={0}
              count={batteryCount}
              draggable={false}
              selected={props.selectedElementId === element.id}
              isSimulationOn={props.isSimulationOn}
            />
          );
        }
        
        // Handle AA type with dynamic count
        return (
          <AA_battery
            id={element.id}
            x={0}
            y={0}
            count={batteryCount}
            draggable={false}
            selected={props.selectedElementId === element.id}
            isSimulationOn={props.isSimulationOn}
          />
        );
      })()}
      {props.showBody !== false && element.type === "AAA_battery" && (
        <AAA_battery
          id={element.id}
          x={0}
          y={0}
          draggable={false}
          selected={props.selectedElementId === element.id}
          isSimulationOn={props.isSimulationOn}
        />
      )}
      {props.showBody !== false && element.type === "powersupply" && (
        <PowerSupply
          id={element.id}
          x={0}
          y={0}
          selected={props.selectedElementId === element.id}
          isSimulationOn={props.isSimulationOn}
          draggable={false}
          vSet={(element.properties as any).vSet ?? element.properties?.voltage ?? 5}
          iLimit={(element.properties as any).iLimit ?? 1}
          isOn={(element.properties as any).isOn ?? false}
          vMeasured={element.computed?.voltage ?? 0}
          iMeasured={element.computed?.current ?? 0}
          supplyMode={(element.computed as any)?.supplyMode}
          onSettingsChange={props.onPowerSupplySettingsChange}
        />
      )}
      {props.showBody !== false && element.type === "resistor" && (
        <Resistor
          id={element.id}
          x={1}
          y={22}
          resistance={element.properties?.resistance}
          selected={props.selectedElementId === element.id}
          draggable={false}
          bandWidths={[2.6, 2.6, 2.6, 1.2]} // widths for each band
          bandHeights={[12.4, 10, 10, 12.2]} // heights for each band
          bandGaps={[3, 4, 6]} // gaps between bands
          isSimulationOn={props.isSimulationOn}
        />
      )}
      {props.showBody !== false && element.type === "multimeter" && (
        <Multimeter
          id={element.id}
          x={1}
          y={22}
          measurement={element.computed?.measurement}
          initialMode={(element.properties?.mode as any) ?? "voltage"}
          onModeChange={props.handleModeChange}
          draggable={false}
          isSimulationOn={props.isSimulationOn}
          selected={props.selectedElementId === element.id}
        />
      )}
      {props.showBody !== false && element.type === "potentiometer" && (
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
          draggable={false}
          isSimulationOn={props.isSimulationOn}
        />
      )}
      {props.showBody !== false && element.type === "microbit" && (
        <Microbit
          id={element.id}
          x={1}
          y={22}
          onControllerInput={(input: any) => {
            props.onControllerInput(element.id, input);
          }}
          leds={
            (element.controller?.leds as number[][] | undefined) ??
            Array.from({ length: 5 }, () => Array(5).fill(0))
          }
          color={(element.properties?.color as string | undefined) ?? "red"}
          selected={props.selectedElementId === element.id}
          draggable={false}
          isSimulationOn={props.isSimulationOn}
          isShorted={!!element.computed?.shorted}
          pins={
            (element.controller?.pins as Record<
              string,
              { digital?: number }
            >) ?? {}
          }
        />
      )}
      {props.showBody !== false && element.type === "microbitWithBreakout" && (
        <MicrobitWithBreakout
          id={element.id}
          x={1}
          y={22}
          onControllerInput={(input: any) => {
            props.onControllerInput(element.id, input);
          }}
          leds={
            (element.controller?.leds as number[][] | undefined) ??
            Array.from({ length: 5 }, () => Array(5).fill(0))
          }
          color={(element.properties?.color as string | undefined) ?? "green"}
          selected={props.selectedElementId === element.id}
          draggable={false}
          isSimulationOn={props.isSimulationOn}
          isShorted={!!element.computed?.shorted}
          pins={
            (element.controller?.pins as Record<
              string,
              { digital?: number }
            >) ?? {}
          }
        />
      )}
      {props.showBody !== false && element.type === "note" && (
        <Note
          id={element.id}
          x={0}
          y={0}
          text={element.properties?.text}
          width={element.properties?.width}
          height={element.properties?.height}
          backgroundColor={element.properties?.backgroundColor}
          collapsed={element.properties?.collapsed}
          selected={props.selectedElementId === element.id}
          draggable={false}
          onDoubleClick={() => {
            // Select the note and ensure properties panel is open
            props.onSelect?.(element.id);
          }}
          onResize={(newWidth, newHeight) => {
            props.onUpdateElementProperties?.(element.id, { width: newWidth, height: newHeight });
            props.onSelect?.(element.id);
          }}
          onToggleCollapsed={(next) => {
            props.onUpdateElementProperties?.(element.id, { collapsed: next });
          }}
        />
      )}
      {props.showBody !== false && element.type === "ultrasonicsensor4p" && (
        <UltraSonicSensor4P
          id={element.id}
          x={0}
          y={0}
          draggable={false}
          selected={props.selectedElementId === element.id}
          connectionPins={{
            trig: element.nodes.find((n) => n.placeholder === "TRIG")?.id,
            echo: element.nodes.find((n) => n.placeholder === "ECHO")?.id,
            vcc: element.nodes.find((n) => n.placeholder === "VCC(+5V)")?.id,
            gnd: element.nodes.find((n) => n.placeholder === "GND")?.id,
          }}
          // Pass the complete connected microbit data with pin information
          connectedMicrobit={
            connectedMicrobitData
              ? {
                  microbitId: connectedMicrobitData.microbit.id,
                  pins:
                    (connectedMicrobitData.microbit.controller?.pins as Record<
                      string,
                      { digital?: number }
                    >) ?? {},
                  connections: {
                    vcc: connectedMicrobitData.connections.vcc,
                    gnd: connectedMicrobitData.connections.gnd,
                    trig: connectedMicrobitData.connections.trig,
                    echo: connectedMicrobitData.connections.echo,
                    allConnected:
                      connectedMicrobitData.connections.allConnected,
                    trigPin: connectedMicrobitData.connections.trigPin,
                    echoPin: connectedMicrobitData.connections.echoPin,
                  },
                }
              : undefined
          }
          isSimulation={props.isSimulationOn}
        />
      )}

      {/* Render nodes and tooltip (can be disabled) */}
      {props.showNodes !== false &&
        element.nodes.map((node) => {
          const isHovered = node.id === hoveredNodeId;
          const isTargetForEndpoint = node.id === props.hoveredNodeForEndpoint;
          const isSnapTarget = node.id === props.snapTargetNodeId;
          
          // Check if this node has a valid wire connection
          const hasValidConnection = props.wires?.some(w => 
            !w.deleted && (w.fromNodeId === node.id || w.toNodeId === node.id)
          );
          
          // Hide node if element is covered by another element (z-order)
          const isHidden = elements && shouldHideNode(element.id, node.id, elements);
          if (isHidden) return null;

          return (
            <Group key={node.id}>
              <Rect
                x={node.x - 2}
                y={node.y - 2}
                width={5.6}
                height={5.6}
                cornerRadius={0.3}
                fill={
                  isSnapTarget
                    ? "#00FF00"
                    : isTargetForEndpoint
                    ? "#FFD700"
                    : hasValidConnection
                    ? "#2559acff"
                    : isHovered && node.fillColor
                    ? node.fillColor
                    : "transparent"
                }
                stroke={
                  isSnapTarget
                    ? "#00CC00"
                    : isTargetForEndpoint
                    ? "#FF6B00"
                    : isHovered
                    ? "black"
                    : "transparent"
                }
                strokeWidth={isSnapTarget ? 3 : isTargetForEndpoint ? 2.5 : isHovered ? 1.4 : 0}
                onClick={(e) => {
                  e.cancelBubble = true;
                  // Prevent starting wire creation while simulation is running
                  if (props.isSimulationOn) return;
                  props.handleNodeClick(node.id);
                }}
                onMouseDown={(e) => {
                  e.cancelBubble = true;
                  if (props.isSimulationOn) return;
                  props.handleNodePointerDown?.(node.id);
                }}
                onMouseUp={(e) => {
                  e.cancelBubble = true;
                  if (props.isSimulationOn) return;
                  props.handleNodePointerUp?.(node.id);
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
                shadowBlur={isSnapTarget ? 12 : isTargetForEndpoint ? 8 : 0}
                shadowColor={isSnapTarget ? "#00FF00" : "#FFD700"}
                shadowEnabled={isSnapTarget || isTargetForEndpoint}
              />

              {/* Tooltip (shows on hover or when targeted during endpoint drag) */}
              {node.placeholder && (isHovered || isTargetForEndpoint) && (
                <Label
                  x={node.x + 8}
                  y={node.y - 22}
                  opacity={1}
                  rotation={-(element.rotation || 0)}
                  listening={false}
                >
                  <Tag
                    fill="rgba(30, 41, 59, 0.95)"
                    stroke="#3b82f6"
                    strokeWidth={1.5}
                    cornerRadius={6}
                    shadowColor="rgba(0, 0, 0, 0.4)"
                    shadowBlur={8}
                    shadowOffset={{ x: 0, y: 2 }}
                    shadowOpacity={0.5}
                    pointerDirection="down"
                    pointerWidth={6}
                    pointerHeight={4}
                  />
                  <Text
                    text={
                      (element.type === "microbitWithBreakout" && 
                       ["P3", "P4", "P6", "P7", "P9", "P10", "P12", "P19", "P20"].includes(node.placeholder))
                        ? "Not Supported"
                        : node.placeholder
                    }
                    fontSize={11}
                    fontFamily="Arial, sans-serif"
                    fontStyle="500"
                    padding={8}
                    fill="#ffffff"
                    letterSpacing={0.3}
                  />
                </Label>
              )}
            </Group>
          );
        })}
    </Group>
  );
}