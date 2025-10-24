import {
  CircuitElement,
  Wire,
  PropertiesPanelProps,
} from "@/circuit_canvas/types/circuit";
import { useEffect, useMemo, useState, useRef } from "react";
import {
  ColorPaletteDropdown,
  defaultColors,
} from "@/circuit_canvas/components/toolbar/customization/ColorPallete";
import { getLedNodePositions } from "@/circuit_canvas/utils/ledNodeMap";

export default function PropertiesPanel({
  selectedElement,
  wireColor,
  onElementEdit,
  onWireEdit,
  wires,
  getNodeById,
  onEditWireSelect,
  setOpenCodeEditor,
}: PropertiesPanelProps) {
  const [resistance, setResistance] = useState<number | null>(null);
  const [resistanceUnit, setResistanceUnit] = useState<"ohm" | "kohm">("ohm");
  const [resistanceInput, setResistanceInput] = useState<string>("");
  const [voltage, setVoltage] = useState<number | null>(null);
  const [ratio, setRatio] = useState<number | null>(null);
  const [temperature, setTemperature] = useState<number | null>(null);
  const [brightness, setBrightness] = useState<number | null>(null);
  const [color, setColor] = useState<string | null>(null);
  const [selectedWireColor, setSelectedWireColor] = useState<string>(
    wireColor || defaultColors[0].hex
  );
  const [showUpdateMessage, setShowUpdateMessage] = useState(false);

  // Gesture control
  const [showGesturePanel, setShowGesturePanel] = useState(false);
  const [selectedGesture, setSelectedGesture] = useState("");

  const lastSelectedIdRef = useRef<string | null>(null);

  const parseNumber = (v: string): number | null => {
    if (v === "") return null;
    const n = Number(v);
    return Number.isNaN(n) ? null : n;
  };

  const showProp = (
    name:
      | "resistance"
      | "voltage"
      | "ratio"
      | "temperature"
      | "brightness"
      | "color"
  ) =>
    !selectedElement?.displayProperties ||
    selectedElement.displayProperties.includes(name);

  useEffect(() => {
    if (!selectedElement) return;

    setResistance(selectedElement.properties?.resistance ?? null);

    const isNewSelection = lastSelectedIdRef.current !== selectedElement.id;
    const r = selectedElement.properties?.resistance;

    if (isNewSelection) {
      if (r != null) {
        setResistanceUnit(r >= 1000 ? "kohm" : "ohm");
        setResistanceInput((r >= 1000 ? r / 1000 : r).toString());
      } else {
        setResistanceUnit("ohm");
        setResistanceInput("");
      }
    }

    setVoltage(selectedElement.properties?.voltage ?? null);
    setRatio(selectedElement.properties?.ratio ?? null);
    setTemperature(selectedElement.properties?.temperature ?? null);
    setBrightness(selectedElement.properties?.brightness ?? null);
    setColor(selectedElement.properties?.color ?? null);

    lastSelectedIdRef.current = selectedElement.id;
  }, [selectedElement]);

  useEffect(() => {
    setSelectedWireColor(wireColor || defaultColors[0].hex);
  }, [wireColor]);

  const handleGestureSelect = (gesture: string) => {
    setSelectedGesture(gesture);
    setShowGesturePanel(false);

    if (onElementEdit && selectedElement) {
      const updatedElement = {
        ...selectedElement,
        properties: {
          ...selectedElement.properties,
          gesture,
        },
      };
      onElementEdit(updatedElement, false);
    }
  };

  if (!selectedElement) return null;

  const handleUpdate = () => {
    if (selectedElement.type === "wire") {
      const wireToUpdate = wires.find((w) => w.id === selectedElement.id);
      if (wireToUpdate) {
        onWireEdit({ ...wireToUpdate, color: selectedWireColor }, false);
      }
      return;
    }

    const nextProps: NonNullable<CircuitElement["properties"]> = {
      ...selectedElement.properties,
      resistance: resistance ?? undefined,
      voltage: voltage ?? undefined,
      ratio: ratio ?? undefined,
      temperature: temperature ?? undefined,
      brightness: brightness ?? undefined,
      color: color ?? undefined,
      gesture: selectedGesture || selectedElement.properties?.gesture,
    };

    if (selectedElement.type === "battery") {
      nextProps.voltage = 9;
      nextProps.resistance = 1.45;
    }

    if (selectedElement.type === "lightbulb") {
      nextProps.resistance = 48;
    }

    let updatedElement: CircuitElement = {
      ...selectedElement,
      properties: nextProps,
    };

    // Resistor node mapping
    if (selectedElement.type === "resistor") {
      const r = resistance ?? selectedElement.properties?.resistance ?? 5;
      const eps = 1e-6;

      const key =
        Math.abs(r - 5) < eps
          ? "5ohm"
          : Math.abs(r - 10) < eps
          ? "10ohm"
          : Math.abs(r - 15) < eps
          ? "15ohm"
          : Math.abs(r - 20) < eps
          ? "20ohm"
          : Math.abs(r - 25) < eps
          ? "25ohm"
          : Math.abs(r - 5000) < eps
          ? "5kohm"
          : Math.abs(r - 10000) < eps
          ? "10kohm"
          : Math.abs(r - 15000) < eps
          ? "15kohm"
          : Math.abs(r - 20000) < eps
          ? "20kohm"
          : Math.abs(r - 25000) < eps
          ? "25kohm"
          : "5ohm";

      const nodeMap: Record<
        string,
        { left: { x: number; y: number }; right: { x: number; y: number } }
      > = {
        "5ohm": { left: { x: 4, y: 35.5 }, right: { x: 96, y: 35.5 } },
        "10ohm": { left: { x: 4, y: 36.5 }, right: { x: 96, y: 36.5 } },
        "15ohm": { left: { x: 4, y: 37.5 }, right: { x: 96, y: 37.2 } },
        "20ohm": { left: { x: 5, y: 36 }, right: { x: 96, y: 36.2 } },
        "25ohm": { left: { x: 4, y: 34.5 }, right: { x: 96, y: 34.5 } },
        "5kohm": { left: { x: 4, y: 35.5 }, right: { x: 96, y: 35.5 } },
        "10kohm": { left: { x: 4, y: 35.5 }, right: { x: 96, y: 35.5 } },
        "15kohm": { left: { x: 4, y: 34.5 }, right: { x: 96, y: 34.5 } },
        "20kohm": { left: { x: 4, y: 35 }, right: { x: 96, y: 35 } },
        "25kohm": { left: { x: 4, y: 35.5 }, right: { x: 96, y: 35.5 } },
      };

      const pos = nodeMap[key];
      const node1 =
        selectedElement.nodes.find((n) => n.id.endsWith("-node-1")) ||
        selectedElement.nodes[0];
      const node2 =
        selectedElement.nodes.find((n) => n.id.endsWith("-node-2")) ||
        selectedElement.nodes[1];

      if (node1 && node2) {
        updatedElement = {
          ...updatedElement,
          nodes: [
            { ...node1, x: pos.left.x, y: pos.left.y },
            { ...node2, x: pos.right.x, y: pos.right.y },
          ],
        };
      }
    }

    // LED node mapping
    if (selectedElement.type === "led") {
      const pos = getLedNodePositions(
        color ?? selectedElement.properties?.color ?? "red"
      );
      const cathode =
        selectedElement.nodes.find((n) => n.id.endsWith("-node-1")) ||
        selectedElement.nodes[0];
      const anode =
        selectedElement.nodes.find((n) => n.id.endsWith("-node-2")) ||
        selectedElement.nodes[1];

      if (cathode && anode) {
        updatedElement = {
          ...updatedElement,
          nodes: [
            { ...cathode, x: pos.cathode.x, y: pos.cathode.y },
            { ...anode, x: pos.anode.x, y: pos.anode.y },
          ],
        };
      }
    }

    onElementEdit(updatedElement, false);
    setShowUpdateMessage(true);
    setTimeout(() => setShowUpdateMessage(false), 2000);
  };

  const handleDelete = () => {
    if (selectedElement.type === "wire") {
      const wireToDelete = wires.find((w) => w.id === selectedElement.id);
      if (wireToDelete) onWireEdit(wireToDelete, true);
    } else {
      onElementEdit(selectedElement, true);
    }
  };

  const connectedWires = wires.filter(
    (w) =>
      w.fromNodeId.startsWith(selectedElement.id) ||
      w.toNodeId.startsWith(selectedElement.id)
  );

  const effResistanceText = useMemo(() => {
    if (ratio == null || resistance == null) return "--";
    const val = ratio * resistance;
    return Number.isFinite(val) ? val.toFixed(2) : "--";
  }, [ratio, resistance]);

  return (
    <div className="backdrop-blur-sm bg-white/10 bg-clip-padding border border-gray-300 shadow-2xl rounded-xl text-sm p-2 space-y-1.5 max-w-xs">
      {/* Element Type & ID */}
      <div className="text-sm text-shadow-md text-gray-950 space-y-1">
        <div className="flex justify-between">
          <span className="font-semibold">Type:</span>
          <span>{selectedElement.type}</span>
        </div>
        <div className="flex justify-between">
          <span className="font-semibold">ID:</span>
          <span className="text-blue-500 font-semibold truncate">
            {selectedElement.id}
          </span>
        </div>
      </div>

      {/* Open Code Editor Button */}
      {(selectedElement.type === "microbit" ||
        selectedElement.type === "microbitWithBreakout") && (
        <button
          className="bg-blue-500 text-white text-xs px-1 py-1 rounded w-full"
          onClick={() => setOpenCodeEditor(true)}
        >
          Open Code Editor
        </button>
      )}

      {/* Temperature Control */}
      {(selectedElement.type === "microbit" ||
        selectedElement.type === "microbitWithBreakout") &&
        showProp("temperature") && (
          <div className="flex flex-col text-xs">
            <label>Temperature (°C):</label>
            <input
              type="range"
              min="-5"
              max="50"
              value={temperature ?? 0}
              onChange={(e) =>
                setTemperature(parseNumber(e.target.value) ?? 0)
              }
              className="w-full"
            />
            <div className="text-xs text-gray-500 mt-1">
              {temperature ?? 0}°C
            </div>
          </div>
        )}

      {/* Brightness & Gesture Control */}
      {(selectedElement.type === "microbit" ||
        selectedElement.type === "microbitWithBreakout") &&
        showProp("brightness") && (
          <div className="flex flex-col text-xs">
            <label>Brightness (0–255):</label>
            <input
              type="range"
              min="0"
              max="255"
              value={brightness ?? 0}
              onChange={(e) => setBrightness(parseNumber(e.target.value) ?? 0)}
              className="w-full"
            />
            <div className="text-xs text-gray-500 mt-1">{brightness ?? 0}</div>

            {/* Gesture Section */}
            <div className="mt-2">
              <label>Gesture:</label>
              <button
                className="bg-purple-200 hover:bg-purple-300 text-xs px-2 py-1 rounded mt-1 ms-1"
                onClick={() => setShowGesturePanel(!showGesturePanel)}
              >
                {selectedGesture
                  ? `Selected: ${selectedGesture}`
                  : "Choose Gesture"}
              </button>

              {showGesturePanel && (
                <div className="grid grid-cols-2 gap-2 mt-2 bg-purple-50 p-2 rounded">
                  {[
                    "shake",
                    "logo up",
                    "logo down",
                    "screen up",
                    "screen down",
                    "tilt left",
                    "tilt right",
                    "free fall",
                    "3g",
                    "6g",
                    "8g",
                  ].map((gesture) => (
                    <button
                      key={gesture}
                      className={`px-2 py-1 rounded text-xs border ${
                        selectedGesture === gesture
                          ? "bg-purple-400 text-white"
                          : "bg-white"
                      }`}
                      onClick={() => handleGestureSelect(gesture)}
                    >
                      {gesture}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
    </div>
  );
}
