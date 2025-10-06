import {
  CircuitElement,
  Wire,
  PropertiesPanelProps,
} from "@/circuit_canvas/types/circuit";
import { useEffect, useMemo, useState } from "react";
import {
  ColorPaletteDropdown,
  defaultColors,
} from "@/circuit_canvas/components/toolbar/customization/ColorPallete";

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
  const [voltage, setVoltage] = useState<number | null>(null);
  const [ratio, setRatio] = useState<number | null>(null);
  const [temperature, setTemperature] = useState<number | null>(null);
  const [brightness, setBrightness] = useState<number | null>(null);
  const [color, setColor] = useState<string | null>(null);
  const [selectedWireColor, setSelectedWireColor] = useState<string>(
    wireColor || defaultColors[0].hex
  );
  const [showUpdateMessage, setShowUpdateMessage] = useState(false);

  // Parse numeric input safely: empty string => null, invalid => null
  const parseNumber = (v: string): number | null => {
    if (v === "") return null;
    const n = Number(v);
    return Number.isNaN(n) ? null : n;
  };

  // Whether this element wants to show a given property
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
    setVoltage(selectedElement.properties?.voltage ?? null);
    setRatio(selectedElement.properties?.ratio ?? null);
    setTemperature(selectedElement.properties?.temperature ?? null);
    setBrightness(selectedElement.properties?.brightness ?? null);
    setColor(selectedElement.properties?.color ?? null);
  }, [selectedElement]);

  // Keep wire color in sync with prop updates from parent
  useEffect(() => {
    setSelectedWireColor(wireColor || defaultColors[0].hex);
  }, [wireColor]);

  if (!selectedElement) return null;

  const handleUpdate = () => {
    if (selectedElement.type === "wire") {
      const wireToUpdate = wires.find((w) => w.id === selectedElement.id);
      if (wireToUpdate) {
        onWireEdit({ ...wireToUpdate, color: selectedWireColor }, false);
      }
    } else {
      const updatedElement: CircuitElement = {
        ...selectedElement,
        properties: {
          ...selectedElement.properties,
          resistance: resistance ?? undefined,
          voltage: voltage ?? undefined,
          ratio: ratio ?? undefined,
          temperature: temperature ?? undefined,
          brightness: brightness ?? undefined,
          color: color ?? undefined,
        },
      };
      onElementEdit(updatedElement, false);
    }

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

      {(selectedElement.type === "microbit" || selectedElement.type === "microbitWithBreakout") && (
        <button
          className="bg-blue-500 text-white text-xs px-1 py-1 rounded w-full"
          onClick={() => setOpenCodeEditor(true)}
        >
          Open Code Editor
        </button>
      )}

      {/* Numeric fields — never show for wires */}
      {selectedElement.type !== "wire" && showProp("resistance") && (
        <div className="flex flex-col text-xs">
          <label>Resistance (Ω):</label>
          <input
            type="number"
            value={resistance ?? ""} // empty allowed
            onChange={(e) => setResistance(parseNumber(e.target.value))}
            className="border px-1 py-1 rounded text-xs"
          />
        </div>
      )}

      {selectedElement.type !== "wire" && showProp("voltage") && (
        <div className="flex flex-col text-xs">
          <label>Voltage (V):</label>
          <input
            type="number"
            value={voltage ?? ""}
            onChange={(e) => setVoltage(parseNumber(e.target.value))}
            className="border px-1 py-1 rounded text-xs"
          />
        </div>
      )}

      {selectedElement.type !== "wire" && showProp("ratio") && (
        <div className="flex flex-col text-xs">
          <label>Ratio:</label>
          <input
            type="number"
            step="0.01"
            value={ratio ?? ""}
            onChange={(e) => setRatio(parseNumber(e.target.value))}
            className="border px-1 py-1 rounded text-xs"
          />
          <span className="text-gray-500 mt-1">
            Eff. Resistance: {effResistanceText} Ω
          </span>
        </div>
      )}

      {/* LED-specific color */}
      {selectedElement.type === "led" && showProp("color") && (
        <div className="flex flex-col text-xs">
          <label>LED Color:</label>
          <select
            value={color ?? "red"}
            onChange={(e) => setColor(e.target.value)}
            className="border px-1 py-1 rounded text-xs bg-white"
          >
            <option value="red">Red</option>
            <option value="green">Green</option>
            <option value="blue">Blue</option>
            <option value="yellow">Yellow</option>
            <option value="white">White</option>
            <option value="orange">Orange</option>
          </select>
        </div>
      )}

      {/* Micro:bit-specific controls */}
      {(selectedElement.type === "microbit" || selectedElement.type === "microbitWithBreakout") && showProp("temperature") && (
        <div className="flex flex-col text-xs">
          <label>Temperature (°C):</label>
          <input
            type="range"
            min="0"
            max="50"
            value={temperature ?? 0}
            onChange={(e) => setTemperature(parseNumber(e.target.value) ?? 0)}
            className="w-full"
          />
          <div className="text-xs text-gray-500 mt-1">
            {temperature ?? 0}°C
          </div>
        </div>
      )}

      {(selectedElement.type === "microbit" || selectedElement.type === "microbitWithBreakout") && showProp("brightness") && (
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
          <div className="text-xs text-gray-500 mt-1">
            {brightness ?? 0}
          </div>
        </div>
      )}

      {/* Wire-specific color */}
      {selectedElement.type === "wire" && (
        <div className="flex flex-col text-xs">
          <label>Wire Color:</label>
          <ColorPaletteDropdown
            colors={defaultColors}
            selectedColor={selectedWireColor}
            onColorSelect={(c) => setSelectedWireColor(c)}
          />
        </div>
      )}

      <div className="flex justify-between gap-2 text-xs">
        <button
          className="bg-blue-500 text-white px-3 py-1 rounded w-full"
          onClick={handleUpdate}
        >
          Update
        </button>
        <button
          className="bg-red-500 text-white px-3 py-1 rounded w-full"
          onClick={handleDelete}
        >
          Delete
        </button>
      </div>

      {connectedWires.length > 0 && (
        <div className="mt-2">
          <h3 className="text-xs font-semibold text-gray-600 mb-1">
            Connected Wires
          </h3>
          <ul className="space-y-1 text-xs">
            {connectedWires.map((wire) => (
              <li
                key={wire.id}
                className="flex justify-between items-center px-2 py-1 rounded bg-white border hover:bg-blue-100"
              >
                <span className="truncate font-mono text-gray-800">
                  {wire.id}
                  <span className="text-gray-400 ml-1">
                    (
                    {defaultColors.find((c) => c.hex === wire.color)?.name ||
                      "Custom"}
                    )
                  </span>
                </span>
                <button
                  className="text-blue-500 hover:underline"
                  onClick={() => onEditWireSelect?.(wire)}
                >
                  Edit
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}

      {showUpdateMessage && (
        <div className="fixed bottom-7 right-3 z-10">
          <div className="flex items-center gap-2 backdrop-blur-sm bg-white/1 border-2 border-green-500 text-green-800 px-1 py-1 rounded shadow-2xl animate-slide-in-up text-md">
            <svg
              className="w-4 h-4 text-green-500"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
            </svg>
            <span>
              {selectedElement.type.charAt(0).toUpperCase() +
                selectedElement.type.slice(1)}{" "}
              updated!
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
