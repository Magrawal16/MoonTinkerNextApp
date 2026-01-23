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
import { getBatteryNodePositions } from "@/circuit_canvas/utils/batteryNodeMap";
import { getRgbLedNodePositions, getRgbLedNodePolarities } from "@/circuit_canvas/utils/rgbLedNodeMap";
import { updateMicrobitNodes } from "@/circuit_canvas/utils/createElement";

export default function PropertiesPanel({
  selectedElement,
  wireColor,
  onElementEdit,
  onWireEdit,
  wires,
  getNodeById,
  onEditWireSelect,
  // ...existing code...
  setOpenCodeEditor,
}: PropertiesPanelProps) {
  const [resistance, setResistance] = useState<number | null>(null);
  // Store resistance internally in ohms; expose a unit-aware UI (Ω / kΩ)
  const [resistanceUnit, setResistanceUnit] = useState<"ohm" | "kohm">("ohm");
  // Decoupled text input so switching unit doesn't change the shown number
  const [resistanceInput, setResistanceInput] = useState<string>("");
  const [voltage, setVoltage] = useState<number | null>(null);
  const [ratio, setRatio] = useState<number | null>(null);
  const [mode, setMode] = useState<"voltage" | "current" | "resistance" | null>(null);
  const [color, setColor] = useState<string | null>(null);
  const [selectedWireColor, setSelectedWireColor] = useState<string>(
    wireColor || defaultColors[0].hex
  );
  // AA/AAA battery selector state
  const [batteryType, setBatteryType] = useState<"AA" | "AAA">("AA");
  const [batteryCount, setBatteryCount] = useState<number>(1);
  const [showUpdateMessage, setShowUpdateMessage] = useState(false);
  // Note text state
  const [noteText, setNoteText] = useState<string>("");
  // RGB LED type state
  const [rgbLedType, setRgbLedType] = useState<"common-cathode" | "common-anode">("common-cathode");


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
      | "color"
      | "text"
  ) =>
    !selectedElement?.displayProperties ||
    selectedElement.displayProperties.includes(name) ||
    (selectedElement?.type === "microbit" && name === "color") ||
    (selectedElement?.type === "microbitWithBreakout" && name === "color");

  useEffect(() => {
    if (!selectedElement) return;
    setResistance(selectedElement.properties?.resistance ?? null);

    // Only initialize the displayed unit and text input when the user selects
    // a different element. This prevents the panel from overriding the user's
    // chosen unit (Ω vs kΩ) when the same element is updated elsewhere.
    const isNewSelection = lastSelectedIdRef.current !== selectedElement.id;
    const r = selectedElement.properties?.resistance;
    const savedUnit = selectedElement.properties?.resistanceUnit;
    if (isNewSelection) {
      if (r != null) {
        // Use saved unit preference if available, otherwise infer from value
        const unit = savedUnit ?? (r >= 1000 ? "kohm" : "ohm");
        setResistanceUnit(unit);
        setResistanceInput((unit === "kohm" ? r / 1000 : r).toString());
      } else {
        setResistanceUnit(savedUnit ?? "ohm");
        setResistanceInput("");
      }
    }
    setVoltage(selectedElement.properties?.voltage ?? null);
    setRatio(selectedElement.properties?.ratio ?? null);
    setMode((selectedElement.properties?.mode as any) ?? null);
    const nextColor =
      selectedElement.type === "microbit" || selectedElement.type === "microbitWithBreakout"
        ? selectedElement.properties?.color ?? (selectedElement.type === "microbitWithBreakout" ? "green" : "red")
        : selectedElement.properties?.color ?? null;
    setColor(nextColor);
    // Normalize old "Select to edit" text to empty string
    const text = selectedElement.properties?.text ?? "";
    setNoteText(text === "Select to edit" ? "" : text);
    if (selectedElement.type === "AA_battery") {
      const bt = (selectedElement.properties as any)?.batteryType as
        | "AA"
        | "AAA"
        | undefined;
      setBatteryType(bt ?? "AA");
      const bc = (selectedElement.properties as any)?.batteryCount as number | undefined;
      setBatteryCount(bc ?? 1);
    }
    if (selectedElement.type === "rgbled") {
      const rlt = selectedElement.properties?.rgbLedType as
        | "common-cathode"
        | "common-anode"
        | undefined;
      setRgbLedType(rlt ?? "common-cathode");
    }
    lastSelectedIdRef.current = selectedElement.id;
  }, [selectedElement]);

  // Keep `mode` in sync if the selected element's properties.mode changes
  useEffect(() => {
    if (!selectedElement) return;
    const m = (selectedElement.properties?.mode as any) ?? null;
    setMode(m);
  }, [selectedElement?.properties?.mode, selectedElement?.id]);

  // Track last selected element id so we don't reinitialize unit/input on prop updates
  const lastSelectedIdRef = useRef<string | null>(null);

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
      // Build properties, but lock certain components (battery, lightbulb)
      const nextProps: NonNullable<CircuitElement["properties"]> = {
        ...selectedElement.properties,
        resistance: resistance ?? undefined,
        resistanceUnit: resistanceUnit, // Save the user's chosen unit preference
        voltage: voltage ?? undefined,
        ratio: ratio ?? undefined,
        mode: mode ?? undefined,
        color: color ?? undefined,
        text: noteText || undefined,
      };

      if (selectedElement.type === "battery") {
        // Enforce fixed battery values
        nextProps.voltage = 9;
        nextProps.resistance = 1.45;
      }
      if (selectedElement.type === "lightbulb") {
        // Enforce fixed bulb resistance
        nextProps.resistance = 48;
      }

      let updatedElement: CircuitElement = {
        ...selectedElement,
        properties: nextProps,
      };

      // AA/AAA battery form factor + count (series pack)
      if (selectedElement.type === "AA_battery") {
        const totalVoltage = 1.5 * batteryCount; // series addition
        const resistancePerCell = batteryType === "AAA" ? 0.4 : 0.3;
        const totalResistance = resistancePerCell * batteryCount; // series resistances add

        updatedElement = {
          ...updatedElement,
          properties: {
            ...updatedElement.properties,
            voltage: totalVoltage,
            resistance: totalResistance,
            batteryType,
            batteryCount,
          } as any,
        };

        // Use centralized node map utility
        const pos = getBatteryNodePositions(batteryType, batteryCount);
        updatedElement = {
          ...updatedElement,
          nodes: updatedElement.nodes.map((n) => {
            if (n.id.endsWith("-node-1")) return { ...n, x: pos.x1, y: pos.y1 };
            if (n.id.endsWith("-node-2")) return { ...n, x: pos.x2, y: pos.y2 };
            return n;
          }),
        };
      }

      // For resistor, update node positions inline  similar to LED mapping
      if (selectedElement.type === "resistor") {
        const r = resistance ?? selectedElement.properties?.resistance ?? 5;
        const eps = 1e-6;
        const key =
          Math.abs(r - 5) < eps ? "5ohm" :
          Math.abs(r - 10) < eps ? "10ohm" :
          Math.abs(r - 15) < eps ? "15ohm" :
          Math.abs(r - 20) < eps ? "20ohm" :
          Math.abs(r - 25) < eps ? "25ohm" :
          Math.abs(r - 5000) < eps ? "5kohm" :
          Math.abs(r - 10000) < eps ? "10kohm" :
          Math.abs(r - 15000) < eps ? "15kohm" :
          Math.abs(r - 20000) < eps ? "20kohm" :
          Math.abs(r - 25000) < eps ? "25kohm" :
          "5ohm";

        // Base map (same as createElement) then apply the visual offsets used there
        const baseMap: Record<string, { left: { x: number; y: number }; right: { x: number; y: number } }> = {
          "5ohm": { left: { x: 4, y: 35.5 }, right: { x: 96, y: 35.5 } },
          "10ohm": { left: { x: 4, y: 35.5 }, right: { x: 96, y: 35.5 } },
          "15ohm": { left: { x: 4, y: 35.5 }, right: { x: 96, y: 35.5 } },
          "20ohm": { left: { x: 4, y: 35.5 }, right: { x: 96, y: 35.5 } },
          "25ohm": { left: { x: 4, y: 35.5 }, right: { x: 96, y: 35.5 } },
          "5kohm": { left: { x: 5, y: 35.5 }, right: { x: 96, y: 35.5 } },
          "10kohm": { left: { x: 4, y: 35.5 }, right: { x: 96, y: 35.5 } },
          "15kohm": { left: { x: 4, y: 37.5 }, right: { x: 96, y: 37.5 } },
          "20kohm": { left: { x: 4, y: 35.5 }, right: { x: 96, y: 35.5 } },
          "25kohm": { left: { x: 4, y: 35.5 }, right: { x: 96, y: 35.5 } },
        };
        const base = baseMap[key];
        const leftFinal = { x: base.left.x + 3.5, y: base.left.y + 13 };
        const rightFinal = { x: base.right.x - 40, y: base.right.y + 13 };

        updatedElement = {
          ...updatedElement,
          properties: { ...updatedElement.properties, resistance: r },
          nodes: updatedElement.nodes.map((n) => {
            if (n.id.endsWith("-node-1")) return { ...n, x: leftFinal.x, y: leftFinal.y };
            if (n.id.endsWith("-node-2")) return { ...n, x: rightFinal.x, y: rightFinal.y };
            return n;
          }),
        };
      }

      // For LED, update node positions when color changes so cathode/anode pins align with the artwork per color
      if (selectedElement.type === "led") {
        const pos = getLedNodePositions(color ?? selectedElement.properties?.color ?? "red");
        const cathode = selectedElement.nodes.find((n) => n.id.endsWith("-node-1")) || selectedElement.nodes[0];
        const anode = selectedElement.nodes.find((n) => n.id.endsWith("-node-2")) || selectedElement.nodes[1];
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

      // For RGB LED, update node polarities when type changes
      if (selectedElement.type === "rgbled") {
        const pos = getRgbLedNodePositions();
        const polarities = getRgbLedNodePolarities(rgbLedType);
        const commonPlaceholder = rgbLedType === "common-cathode" ? "Cathode" : "Anode";
        updatedElement = {
          ...updatedElement,
          properties: {
            ...updatedElement.properties,
            rgbLedType,
          },
          nodes: updatedElement.nodes.map((n) => {
            if (n.id.endsWith("-node-red")) return { ...n, x: pos.red.x, y: pos.red.y, polarity: polarities.red };
            if (n.id.endsWith("-node-common")) return { ...n, x: pos.common.x, y: pos.common.y, polarity: polarities.common, fillColor: rgbLedType === "common-cathode" ? "black" : "green", placeholder: commonPlaceholder };
            if (n.id.endsWith("-node-green")) return { ...n, x: pos.green.x, y: pos.green.y, polarity: polarities.green };
            if (n.id.endsWith("-node-blue")) return { ...n, x: pos.blue.x, y: pos.blue.y, polarity: polarities.blue };
            return n;
          }),
        };
      }

      // For microbit/microbitWithBreakout, update node positions when color changes
      if ((selectedElement.type === "microbit" || selectedElement.type === "microbitWithBreakout") && color) {
        updatedElement = updateMicrobitNodes(updatedElement);
      }

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
      !w.deleted && (
        w.fromNodeId.startsWith(selectedElement.id) ||
        w.toNodeId.startsWith(selectedElement.id)
      )
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

      {/* Removed "Open Code Editor" button for microbit elements */}

      {/* Numeric fields — never show for wires */}
      {selectedElement.type !== "wire" && selectedElement.type !== "battery" && selectedElement.type !== "lightbulb" && selectedElement.type !== "led" && showProp("resistance") && (
        <div className="flex flex-col text-xs">
          <label>Resistance:</label>
          <div className="flex items-stretch gap-1">
            <input
              type="number"
              value={resistanceInput}
              onChange={(e) => {
                const raw = e.target.value;
                setResistanceInput(raw);
                if (raw === "") {
                  setResistance(null);
                  return;
                }
                const n = Number(raw);
                if (!Number.isFinite(n)) {
                  setResistance(null);
                  return;
                }
                // Update internal ohms for previews (eff. resistance), persistence still happens on Update
                setResistance(resistanceUnit === "kohm" ? n * 1000 : n);
              }}
              className="border px-1 py-1 rounded text-xs w-full"
            />
            <select
              className="border px-1 py-1 rounded text-xs bg-white"
              value={resistanceUnit}
              onChange={(e) => {
                const next = (e.target.value as "ohm" | "kohm");
                setResistanceUnit(next);
                // Do not change the displayed number when switching unit,
                // but keep internal ohms consistent for preview calculations
                if (resistanceInput !== "") {
                  const n = Number(resistanceInput);
                  if (Number.isFinite(n)) {
                    setResistance(next === "kohm" ? n * 1000 : n);
                  }
                }
              }}
            >
              <option value="ohm">Ω</option>
              <option value="kohm">kΩ</option>
            </select>
          </div>
        </div>
      )}

      {selectedElement.type !== "wire" && selectedElement.type !== "battery" && showProp("voltage") && (
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

      {/* Multimeter mode selector */}
      {selectedElement.type === "multimeter" && (
        <div className="flex flex-col text-xs">
          <label>Mode:</label>
          <select
            className="border px-1 py-1 rounded text-xs bg-white"
            value={mode ?? (selectedElement.properties?.mode ?? "voltage")}
            onChange={(e) => setMode(e.target.value as any)}
          >
            <option value="voltage">Voltage (V)</option>
            <option value="current">Current/Amperage (A)</option>
            <option value="resistance">Resistance(Ω)</option>
          </select>
        </div>
      )}

      {/* AA battery type (AA/AAA) and count selector like Tinkercad */}
      {selectedElement.type === "AA_battery" && (
        <>
          <div className="flex flex-col text-xs">
            <label>Count:</label>
            <select
              className="border px-1 py-1 rounded text-xs bg-white"
              value={batteryCount}
              onChange={(e) => setBatteryCount(Number(e.target.value))}
            >
              <option value={1}>1 battery</option>
              <option value={2}>2 batteries</option>
              <option value={3}>3 batteries</option>
              <option value={4}>4 batteries</option>
            </select>
          </div>
          <div className="flex flex-col text-xs mt-2">
            <label>Type:</label>
            <select
              className="border px-1 py-1 rounded text-xs bg-white"
              value={batteryType}
              onChange={(e) => setBatteryType(e.target.value as "AA" | "AAA")}
            >
              <option value="AA">AA</option>
              <option value="AAA">AAA</option>
            </select>
          </div>
          <div className="text-gray-500 mt-1 text-xs">
            Voltage: {(1.5 * batteryCount).toFixed(1)} V, Resistance: {((batteryType === "AAA" ? 0.4 : 0.3) * batteryCount).toFixed(2)} Ω
          </div>
        </>
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

      {/* micro:bit shell color */}
      {selectedElement.type === "microbit" && showProp("color") && (
        <div className="flex flex-col text-xs">
          <label>micro:bit Color:</label>
          <select
            value={color ?? "red"}
            onChange={(e) => setColor(e.target.value)}
            className="border px-1 py-1 rounded text-xs bg-white"
          >
            <option value="red">Red</option>
            <option value="yellow">Yellow</option>
            <option value="green">Green</option>
            <option value="blue">Blue</option>
          </select>
        </div>
      )}

      {/* micro:bit with breakout shell color */}
      {selectedElement.type === "microbitWithBreakout" && showProp("color") && (
        <div className="flex flex-col text-xs">
          <label>micro:bit Breakout Color:</label>
          <select
            value={color ?? "green"}
            onChange={(e) => setColor(e.target.value)}
            className="border px-1 py-1 rounded text-xs bg-white"
          >
            <option value="red">Red</option>
            <option value="yellow">Yellow</option>
            <option value="green">Green</option>
            <option value="blue">Blue</option>
          </select>
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

      {/* RGB LED type selector */}
      {selectedElement.type === "rgbled" && (
        <div className="flex flex-col text-xs">
          <label>RGB LED Type:</label>
          <select
            value={rgbLedType}
            onChange={(e) => setRgbLedType(e.target.value as "common-cathode" | "common-anode")}
            className="border px-1 py-1 rounded text-xs bg-white"
          >
            <option value="common-cathode">Common Cathode</option>
            <option value="common-anode">Common Anode</option>
          </select>
          <span className="text-gray-500 mt-1">
            {rgbLedType === "common-cathode" 
              ? "Ground shared (2nd pin = GND)" 
              : "Positive shared (2nd pin = VCC)"}
          </span>
        </div>
      )}

      {/* Note-specific text */}
      {selectedElement.type === "note" && (
        <div className="flex flex-col text-xs">
          <label>Note Text:</label>
          <textarea
            value={noteText}
            onChange={(e) => setNoteText(e.target.value)}
            className="border px-2 py-2 rounded text-xs min-h-[100px] resize-y"
            placeholder="Write your note here"
          />
        </div>
      )}

  
      {/* Wire-specific color */}
      {selectedElement.type === "wire" && (
        <>
          <div className="flex flex-col text-xs">
            <label>Wire Color:</label>
            <ColorPaletteDropdown
              colors={defaultColors}
              selectedColor={selectedWireColor}
              onColorSelect={(c) => {
                setSelectedWireColor(c);
                // Update wire color immediately
                const wireToUpdate = wires.find(
                  (w) => w.id === selectedElement.id
                );
                if (wireToUpdate) {
                  onWireEdit({ ...wireToUpdate, color: c }, false);
                  setShowUpdateMessage(true);
                  setTimeout(() => setShowUpdateMessage(false), 2000);
                }
              }}
            />
          </div>

          {/* ...existing code... */}

          <div className="text-xs space-y-1 bg-blue-50 border border-blue-200 rounded p-2">
            <p className="font-semibold text-blue-700">Wire Editing Tips:</p>
            <ul className="list-disc list-inside text-gray-700 space-y-0.5">
              <li>Drag white circles to adjust wire path</li>
              <li>Double-click circles to remove joints</li>
              <li>Click canvas while wiring to add joints</li>
              {/* ...existing code... */}
            </ul>
          </div>
        </>
      )}

      <div className="flex justify-between gap-2 text-xs">
        { 
          (selectedElement.type === "multimeter") || (
          selectedElement.type !== "wire" &&
          Array.isArray(selectedElement.displayProperties) &&
          selectedElement.displayProperties.length > 0)
          ? (
            <button
              className="bg-blue-500 text-white px-3 py-1 rounded w-full"
              onClick={handleUpdate}
            >
              Update
            </button>
          ) : null}
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
          <div className="flex items-center gap-2 backdrop-blur-sm bg-white/1 border-2 border-green-500 text-green px-1 py-1 rounded shadow-2xl animate-slide-in-up text-md">
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
