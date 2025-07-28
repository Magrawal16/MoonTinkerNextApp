import {
  CircuitElement,
  Wire,
  PropertiesPanelProps,
} from "@/circuit_canvas/types/circuit";
import { useEffect, useState } from "react";
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
  const [selectedWireColor, setSelectedWireColor] = useState<string>(
    wireColor || defaultColors[0].hex
  );
  const [showUpdateMessage, setShowUpdateMessage] = useState(false);

  useEffect(() => {
    setResistance(selectedElement?.properties?.resistance ?? null);
    setVoltage(selectedElement?.properties?.voltage ?? null);
    setRatio(selectedElement?.properties?.ratio ?? null);
    setSelectedWireColor(wireColor || defaultColors[0].hex);
  }, [selectedElement]);

  if (!selectedElement) return null;

  const handleUpdate = () => {
    if (selectedElement.type === "wire") {
      const wireToUpdate = wires.find((w) => w.id === selectedElement.id);
      if (wireToUpdate) {
        wireToUpdate.color = selectedWireColor;
        onWireEdit(wireToUpdate, false);
      }
    } else {
      const updatedElement: CircuitElement = {
        ...selectedElement,
        properties: {
          ...selectedElement.properties,
          resistance: resistance ?? undefined,
          voltage: voltage ?? undefined,
          ratio: ratio ?? undefined,
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
      if (wireToDelete) {
        onWireEdit(wireToDelete, true);
      }
    } else {
      onElementEdit(selectedElement, true);
    }
  };

  const connectedWires = wires.filter(
    (w) =>
      w.fromNodeId.startsWith(selectedElement.id) ||
      w.toNodeId.startsWith(selectedElement.id)
  );

  return (
    <div className="backdrop-blur-sm bg-white/10 bg-clip-padding border border-gray-300 shadow-2xl rounded-xl text-sm p-2 space-y-1.5 max-w-xs">
      <div className="text-sm text-shadow-md text-gray-950 space-y-1">
        <div className="flex justify-between">
          <span className="font-semibold">Type:</span>
          <span>{selectedElement.type}</span>
        </div>
        <div className="flex justify-between">
          <span className="font-semibold">ID:</span>
          <span className="text-blue-500 font-semibold truncate">{selectedElement.id}</span>
        </div>
      </div>

      {selectedElement.type === "microbit" && (
        <button
          className="bg-blue-500 text-white text-xs px-1 py-1 rounded w-full"
          onClick={() => setOpenCodeEditor(true)}
        >
          Open Code Editor
        </button>
      )}

      {resistance != null && (
        <div className="flex flex-col text-xs">
          <label>Resistance (Ω):</label>
          <input
            type="number"
            value={resistance}
            onChange={(e) => setResistance(Number(e.target.value))}
            className="border px-1 py-1 rounded text-xs"
          />
        </div>
      )}

      {voltage != null && (
        <div className="flex flex-col text-xs">
          <label>Voltage (V):</label>
          <input
            type="number"
            value={voltage}
            onChange={(e) => setVoltage(Number(e.target.value))}
            className="border px-1 py-1 rounded text-xs"
          />
        </div>
      )}

      {ratio != null && (
        <div className="flex flex-col text-xs">
          <label>Ratio:</label>
          <input
            type="number"
            step="0.01"
            value={ratio}
            onChange={(e) => setRatio(Number(e.target.value))}
            className="border px-1 py-1 rounded text-xs"
          />
          <span className="text-gray-500 mt-1">
            Eff. Resistance: {(ratio * (resistance ?? 0)).toFixed(2)} Ω
          </span>
        </div>
      )}

      {selectedElement.type === "wire" && (
        <div className="flex flex-col text-xs">
          <label>Wire Color:</label>
          <ColorPaletteDropdown
            colors={defaultColors}
            selectedColor={selectedWireColor}
            onColorSelect={(color) => setSelectedWireColor(color)}
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
          <h3 className="text-xs font-semibold text-gray-600 mb-1">Connected Wires</h3>
          <ul className="space-y-1 text-xs">
            {connectedWires.map((wire) => (
              <li
                key={wire.id}
                className="flex justify-between items-center px-2 py-1 rounded bg-white border hover:bg-blue-100"
              >
                <span className="truncate font-mono text-gray-800">
                  {wire.id}
                  <span className="text-gray-400 ml-1">
                    ({defaultColors.find((c) => c.hex === wire.color)?.name || "Custom"})
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
        <div className="fixed bottom-6 right-6 z-50">
          <div className="flex items-center gap-2 bg-white border border-green-400 text-green-700 px-3 py-2 rounded shadow animate-slide-in-up text-xs">
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
              {selectedElement?.type.charAt(0).toUpperCase() + selectedElement?.type.slice(1)} updated!
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
