import { CircuitElement, CircuitElementProps } from "../types/circuit";
import { getLedNodePositions } from "../utils/ledNodeMap";
import { createInitialLedRuntime, LED_INTERNAL_RESISTANCE } from "./ledBehavior";
import { createInitialRgbLedRuntime, RGB_LED_INTERNAL_RESISTANCE } from "./rgbLedBehavior";
import { getRgbLedNodePositions, getRgbLedNodePolarities, getRgbLedNodeLabels } from "./rgbLedNodeMap";
import { getMicrobitCoordinates, getMicrobitWithBreakoutCoordinates } from "./microbitCoordinateMap";

export default function createElement(
  props: CircuitElementProps
): CircuitElement | null {
  const id = props.type + "-" + props.idNumber;

  const batteryElement: CircuitElement = {
    id,
    type: props.type,
    x: props.pos.x,
    y: props.pos.y,
    rotation: props.rotation ?? 0,
    nodes: [
      {
        id: id + "-node-1",
        x: 28,
        y: 30,
        parentId: id,
        polarity: "positive" as const,
        placeholder: "Positive",
        fillColor: "green",
      },
      {
        id: id + "-node-2",
        x: 42.3,
        y: 30,
        parentId: id,
        polarity: "negative" as const,
        placeholder: "Negative",
        fillColor: "red",
      },
    ],
    properties: {
      voltage: 9,
      resistance: 1.45,
    },
    // Hide editable fields in the Properties Panel for battery
    displayProperties: [],
  };

  const cell3vElement: CircuitElement = {
    id,
    type: props.type,
    x: props.pos.x,
    y: props.pos.y,
    rotation: props.rotation ?? 0,
    nodes: [
      {
        id: id + "-node-1",
        x: 55,
        y: 3.5,
        parentId: id,
        polarity: "positive" as const,
        placeholder: "Positive",
        fillColor: "green",
      },
      {
        id: id + "-node-2",
        x: 55,
        y: 150,
        parentId: id,
        polarity: "negative" as const,
        placeholder: "Negative",
        fillColor: "red",
      },
    ],
    properties: {
      voltage: 3,
      resistance: 0.8, 
    },
    displayProperties: [],
  };

  const AA_batteryElement: CircuitElement = {
    id,
    type: props.type,
    x: props.pos.x,
    y: props.pos.y,
    rotation: props.rotation ?? 0,
    nodes: [
      {
        id: id + "-node-1",
        x: 102.5,
        y: 2,
        parentId: id,
        polarity: "positive" as const,
        placeholder: "Positive",
        fillColor: "green",
      },
      {
        id: id + "-node-2",
        x: 94.5,
        y: 2,
        parentId: id,
        polarity: "negative" as const,
        placeholder: "Negative",
        fillColor: "red",
      },
    ],
    properties: {
      voltage: 1.5,
      resistance: 0.3, // AA cell internal resistance typical low value
      // allow switching form-factor in Properties Panel (AA ↔ AAA)
      // used only for rendering + default resistance; solver uses resistance value
      batteryType: 'AA' as any,
      // allow count selection (1-4 batteries in series)
      batteryCount: 1,
    },
    // include custom tokens to enable the Update button in PropertiesPanel
    displayProperties: ["batteryType", "batteryCount"],
  };

  const AAA_batteryElement: CircuitElement = {
    id,
    type: props.type,
    x: props.pos.x,
    y: props.pos.y,
    rotation: props.rotation ?? 0,
    nodes: [
      {
        id: id + "-node-1",
        x: 33.5,
        y: 1,
        parentId: id,
        polarity: "positive" as const,
        placeholder: "Positive",
        fillColor: "green",
      },
      {
        id: id + "-node-2",
        x: 25.5,
        y: 1,
        parentId: id,
        polarity: "negative" as const,
        placeholder: "Negative",
        fillColor: "red",
      },
    ],
    properties: {
      voltage: 1.5,
      resistance: 0.4, // AAA cell internal resistance slightly higher than AA
    },
    displayProperties: [],
  };

  const powerSupplyElement: CircuitElement = {
    id,
    type: props.type,
    x: props.pos.x,
    y: props.pos.y,
    rotation: props.rotation ?? 0,
    nodes: [
      {
        id: id + "-node-1",
        x: 73,
        y: 115,
        parentId: id,
        polarity: "positive" as const,
        placeholder: "Positive",
        fillColor: "green",
      },
      {
        id: id + "-node-2",
        x: 87,
        y: 115,
        parentId: id,
        polarity: "negative" as const,
        placeholder: "Negative",
        fillColor: "red",
      },
    ],
    properties: {
      // Store effective output voltage separately; settings tracked via custom keys on properties using casting
      voltage: props.properties?.voltage ?? 5,
      resistance: props.properties?.resistance ?? 0.2,
      // Bench supply control settings (non-schema; accessed via casting)
      vSet: (props as any).properties?.vSet ?? props.properties?.voltage ?? 5,
      iLimit: (props as any).properties?.iLimit ?? 1,
      isOn: (props as any).properties?.isOn ?? false,
    } as any,
    displayProperties: ["voltage"],
  };

  const lightbulbElement = {
    id,
    type: props.type,
    x: props.pos.x,
    y: props.pos.y,
    rotation: props.rotation ?? 0,
    nodes: [
      {
        id: id + "-node-1",
        x: 67,
        y: 140,
        parentId: id,
        placeholder: "Terminal 1",
        fillColor: "red",
      },
      {
        id: id + "-node-2",
        x: 80.5,
        y: 140,
        parentId: id,
        placeholder: "Terminal 2",
        fillColor: "red",
      },
    ],
    properties: {
      voltage: props.properties?.voltage,
      resistance: 48,
    },
    // Hide editable fields for the bulb's internal resistance
    displayProperties: [],
  };

  const resistorElement = {
    id,
    type: props.type,
    x: props.pos.x,
    y: props.pos.y,
    rotation: props.rotation ?? 0,
    ...(() => {
      // Inline variant map like LED's nodePositionMap
      // You can tweak each entry's coordinates later per your SVGs
      const nodeMap: Record<string, { left: { x: number; y: number }; right: { x: number; y: number } }> = {
        "5ohm":   { left: { x: 4,  y: 35.5 }, right: { x: 96,  y: 35.5 } },
        "10ohm":  { left: { x: 4,  y: 35.5 }, right: { x: 96,  y: 35.5 } },
        "15ohm":  { left: { x: 4,  y: 35.5 }, right: { x: 96,  y: 35.5 } },
        "20ohm":  { left: { x: 4,  y: 35.5 }, right: { x: 96,  y: 35.5 } },
        "25ohm":  { left: { x: 4,  y: 35.5 }, right: { x: 96,  y: 35.5 } },
        "5kohm":  { left: { x: 5,  y: 35.5 }, right: { x: 96,  y: 35.5 } },
        "10kohm": { left: { x: 4,  y: 35.5 }, right: { x: 96,  y: 35.5 } },
        "15kohm": { left: { x: 4,  y: 37.5 }, right: { x: 96,  y: 37.5 } },
        "20kohm": { left: { x: 4,  y: 35.5 }, right: { x: 96,  y: 35.5 } },
        "25kohm": { left: { x: 4,  y: 35.5 }, right: { x: 96,  y: 35.5 } },
      };
      const r = props.properties?.resistance ?? 5; // ohms
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
      const pos = nodeMap[key];
      return {
        nodes: [
          {
            id: id + "-node-1",
            x: pos.left.x + 3.5,
            y: pos.left.y + 13,
            parentId: id,
            placeholder: "Terminal 1",
            fillColor: "red",
          },
          {
            id: id + "-node-2",
            x: pos.right.x - 40,
            y: pos.right.y + 13,
            parentId: id,
            placeholder: "Terminal 2",
            fillColor: "red",
          },
        ],
      };
    })(),
    properties: {
      ...{
        voltage: props.properties?.voltage,
        resistance: props.properties?.resistance ?? 5,
      },
      ...props.properties,
    },
    displayProperties: ["resistance"],
  };

  const ldrElement = {
    id,
    type: props.type,
    x: props.pos.x,
    y: props.pos.y,
    rotation: props.rotation ?? 0,

    nodes: [
      {
        id: id + "-node-1",
        x: 24,
        y: 60,
        parentId: id,
        placeholder: "Terminal 1",
        fillColor: "red",
      },
      {
        id: id + "-node-2",
        x: 37,
        y: 60,
        parentId: id,
        placeholder: "Terminal 2",
        fillColor: "red",
      },
    ],

    properties: {
      // 🌞 ENVIRONMENT INPUT (what slider controls)
      lightLevel: props.properties?.lightLevel ?? 50, // 0–100

      // 🔧 INTERNAL PARAMETER (computed from lightLevel)
      minResistance: 506,       // bright light
      maxResistance: 180000,    // darkness
    },

    displayProperties: [],
  };

  const lm35Element = {
    id,
    type: props.type,
    x: props.pos.x,
    y: props.pos.y,
    rotation: props.rotation ?? 0,
    // LM35 pin order: VCC (left), ANALOG OUT (middle), GND (right)
    nodes: [
      {
        id: id + "-node-vcc",
        x: 16.5,
        y: 80,
        parentId: id,
        placeholder: "VCC",
        fillColor: "red",
      },
      {
        id: id + "-node-out",
        x: 31.5,
        y: 80,
        parentId: id,
        placeholder: "ANALOG OUT",
        fillColor: "orange",
      },
      {
        id: id + "-node-gnd",
        x: 47,
        y: 80,
        parentId: id,
        placeholder: "GND",
        fillColor: "black",
      },
    ],
    properties: {
      // Environment input controlled by slider
      temperature: props.properties?.temperature ?? 25,
      // keep voltage/resistance keys if needed elsewhere
      ...props.properties,
    },
    displayProperties: [],
  };

  const multimeterElement = {
    id,
    type: props.type,
    x: props.pos.x,
    y: props.pos.y,
    rotation: props.rotation ?? 0,
    nodes: [
      {
        id: id + "-node-2",
        x: 95,
        y: 90,
        parentId: id,
        polarity: "positive" as const,
        placeholder: "Positive",
        fillColor: "green",
      },
      {
        id: id + "-node-1",
        x: 83.5,
        y: 90,
        parentId: id,
        polarity: "negative" as const,
        placeholder: "Negative",
        fillColor: "red",
      },
    ],
    properties: {
      ...{
        voltage: props.properties?.voltage ?? 1,
        resistance: props.properties?.resistance ?? 11,
        mode: props.properties?.mode ?? "voltage", // Default mode
      },
      ...props.properties,
    },
    // Expose mode in the Properties Panel so the Update button appears
    displayProperties: ["mode"],
  };

  const potentiometerElement = {
    id,
    type: props.type,
    x: props.pos.x,
    y: props.pos.y,
    rotation: props.rotation ?? 0,
    nodes: [
      {
        id: id + "-node-A", // Terminal A
        x: 20.5,
        y: 90,
        parentId: id,
        placeholder: "Terminal 1",
        fillColor: "red",
      },
      {
        id: id + "-node-W", // Wiper
        x: 31.5,
        y: 92, // position it visually on top if needed
        parentId: id,
        placeholder: "Wiper",
        fillColor: "red",
      },
      {
        id: id + "-node-B", // Terminal B
        x: 43.5,
        y: 90,
        parentId: id,
        placeholder: "Terminal 2",
        fillColor: "red",
      },
    ],
    properties: {
      ...{
        voltage: props.properties?.voltage,
        resistance: props.properties?.resistance ?? 10000, // Default 10kΩ like Tinkercad
        resistanceUnit: props.properties?.resistanceUnit ?? "kohm", // Default to kΩ for potentiometer
        ratio: props.properties?.ratio ?? 0.5, // Internal only - not displayed to user
      },
      ...props.properties,
    },
    displayProperties: ["resistance"], // Only show total resistance like Tinkercad
  };
  const ledElement = {
    // Dynamic LED element: explicit per-color node map for easier manual tuning.
    // Edit nodePositionMap below to adjust Cathode/Anode positions for a color.
    id,
    type: props.type,
    x: props.pos.x,
    y: props.pos.y,
    rotation: props.rotation ?? 0,
    ...(() => {
      const pos = getLedNodePositions(props.properties?.color);
      return {
        nodes: [
          {
            id: id + '-node-1',
            x: pos.cathode.x,
            y: pos.cathode.y,
            parentId: id,
            polarity: 'negative' as const,
            placeholder: 'Cathode',
            fillColor: 'red',
          },
          {
            id: id + '-node-2',
            x: pos.anode.x,
            y: pos.anode.y,
            parentId: id,
            polarity: 'positive' as const,
            placeholder: 'Anode',
            fillColor: 'red',
          },
        ],
      };
    })(),
    properties: {
      ...{
        voltage: props.properties?.voltage,
        resistance: props.properties?.resistance ?? LED_INTERNAL_RESISTANCE,
        color: props.properties?.color ?? 'red',
      },
      ...props.properties,
    },
    runtime: {
      led: createInitialLedRuntime(),
    },
    displayProperties: ['resistance', 'color'],
  };

  // RGB LED element with 4 terminals: Red, Common (Cathode/Anode), Green, Blue
  const rgbLedType = ((props as any).properties?.rgbLedType as "common-cathode" | "common-anode") ?? "common-cathode";
  const rgbLedNodePositions = getRgbLedNodePositions();
  const rgbLedPolarities = getRgbLedNodePolarities(rgbLedType);
  const rgbLedLabels = getRgbLedNodeLabels(rgbLedType);
  
  const rgbLedElement = {
    id,
    type: props.type,
    x: props.pos.x,
    y: props.pos.y,
    rotation: props.rotation ?? 0,
    nodes: [
      {
        id: id + '-node-red',
        x: rgbLedNodePositions.red.x,
        y: rgbLedNodePositions.red.y,
        parentId: id,
        polarity: rgbLedPolarities.red,
        placeholder: rgbLedLabels.red,
        fillColor: 'red',
      },
      {
        id: id + '-node-common',
        x: rgbLedNodePositions.common.x,
        y: rgbLedNodePositions.common.y,
        parentId: id,
        polarity: rgbLedPolarities.common,
        placeholder: rgbLedLabels.common,
        fillColor: rgbLedType === 'common-cathode' ? 'black' : 'green',
      },
      {
        id: id + '-node-green',
        x: rgbLedNodePositions.green.x,
        y: rgbLedNodePositions.green.y,
        parentId: id,
        polarity: rgbLedPolarities.green,
        placeholder: rgbLedLabels.green,
        fillColor: 'green',
      },
      {
        id: id + '-node-blue',
        x: rgbLedNodePositions.blue.x,
        y: rgbLedNodePositions.blue.y,
        parentId: id,
        polarity: rgbLedPolarities.blue,
        placeholder: rgbLedLabels.blue,
        fillColor: 'blue',
      },
    ],
    properties: {
      voltage: props.properties?.voltage,
      resistance: props.properties?.resistance ?? RGB_LED_INTERNAL_RESISTANCE.red,
      rgbLedType: rgbLedType,
    },
    runtime: {
      rgbled: createInitialRgbLedRuntime(),
    },
    displayProperties: ['rgbLedType'],
  };

  // Get coordinates for the selected microbit color
  const microbitColor = props.properties?.color ?? "red";
  const microbitCoords = getMicrobitCoordinates(microbitColor);
  
  const microbitElement = {
    id,
    type: props.type,
    x: props.pos.x,
    y: props.pos.y,
    rotation: props.rotation ?? 0,
    nodes: [
      {
        id: id + "-node-0",
        x: microbitCoords.pins.P0.x,
        y: microbitCoords.pins.P0.y,
        parentId: id,
        placeholder: "P0",
        fillColor: "red",
      },
      {
        id: id + "-node-1",
        x: microbitCoords.pins.P1.x,
        y: microbitCoords.pins.P1.y,
        parentId: id,
        placeholder: "P1",
        fillColor: "red",
      },
      {
        id: id + "-node-2",
        x: microbitCoords.pins.P2.x,
        y: microbitCoords.pins.P2.y,
        parentId: id,
        placeholder: "P2",
        fillColor: "red",
      },
      {
        id: id + "-node-3V",
        x: microbitCoords.pins.V3.x,
        y: microbitCoords.pins.V3.y,
        parentId: id,
        placeholder: "3.3V",
        fillColor: "red",
      },
      {
        id: id + "-node-GND",
        x: microbitCoords.pins.GND.x,
        y: microbitCoords.pins.GND.y,
        parentId: id,
        placeholder: "GND",
        fillColor: "red",
      },
    ],
    properties: {
      voltage: props.properties?.voltage ?? 3.3,
      resistance: props.properties?.resistance ?? 0,
      temperature: props.properties?.temperature ?? 25, 
      brightness: props.properties?.brightness ?? 128, 
      color: props.properties?.color ?? "red",
      ...props.properties,
    },
    displayProperties: ["temperature", "brightness", "color"],
  };

  // Get coordinates for microbit with breakout
  const microbitWithBreakoutColor = props.properties?.color ?? "green";
  const breakoutCoords = getMicrobitWithBreakoutCoordinates(microbitWithBreakoutColor);
  
  const microbitElementWithBreakout = {
    id,
    type: props.type,
    x: props.pos.x,
    y: props.pos.y,
    rotation: props.rotation ?? 0,
    nodes: [
      {
        id: id + "-node-GND1",
        x: breakoutCoords.pins.GND1.x,
        y: breakoutCoords.pins.GND1.y,
        parentId: id,
        placeholder: "GND",
        fillColor: "red",
      },
      {
        id: id + "-node-GND2",
        x: breakoutCoords.pins.GND2.x,
        y: breakoutCoords.pins.GND2.y,
        parentId: id,
        placeholder: "GND",
        fillColor: "red",
      },
      {
        id: id + "-node-3V",
        x: breakoutCoords.pins.V3.x,
        y: breakoutCoords.pins.V3.y,
        parentId: id,
        placeholder: "3.3V",
        fillColor: "red",
      },
      {
        id: id + "-node-0",
        x: breakoutCoords.pins.P0.x,
        y: breakoutCoords.pins.P0.y,
        parentId: id,
        placeholder: "P0",
        fillColor: "red",
      },
      {
        id: id + "-node-1",
        x: breakoutCoords.pins.P1.x,
        y: breakoutCoords.pins.P1.y,
        parentId: id,
        placeholder: "P1",
        fillColor: "red",
      },
      {
        id: id + "-node-2",
        x: breakoutCoords.pins.P2.x,
        y: breakoutCoords.pins.P2.y,
        parentId: id,
        placeholder: "P2",
        fillColor: "red",
      },
      {
        id: id + "-node-3",
        x: breakoutCoords.pins.P3.x,
        y: breakoutCoords.pins.P3.y,
        parentId: id,
        placeholder: "P3",
        fillColor: "red",
      },
      {
        id: id + "-node-4",
        x: breakoutCoords.pins.P4.x,
        y: breakoutCoords.pins.P4.y,
        parentId: id,
        placeholder: "P4",
        fillColor: "red",
      },
      {
        id: id + "-node-5",
        x: breakoutCoords.pins.P5.x,
        y: breakoutCoords.pins.P5.y,
        parentId: id,
        placeholder: "P5",
        fillColor: "red",
      },
      {
        id: id + "-node-6",
        x: breakoutCoords.pins.P6.x,
        y: breakoutCoords.pins.P6.y,
        parentId: id,
        placeholder: "P6",
        fillColor: "red",
      },
      {
        id: id + "-node-7",
        x: breakoutCoords.pins.P7.x,
        y: breakoutCoords.pins.P7.y,
        parentId: id,
        placeholder: "P7",
        fillColor: "red",
      },
      {
        id: id + "-node-8",
        x: breakoutCoords.pins.P8.x,
        y: breakoutCoords.pins.P8.y,
        parentId: id,
        placeholder: "P8",
        fillColor: "red",
      },
      {
        id: id + "-node-9",
        x: breakoutCoords.pins.P9.x,
        y: breakoutCoords.pins.P9.y,
        parentId: id,
        placeholder: "P9",
        fillColor: "red",
      },
      {
        id: id + "-node-10",
        x: breakoutCoords.pins.P10.x,
        y: breakoutCoords.pins.P10.y,
        parentId: id,
        placeholder: "P10",
        fillColor: "red",
      },
      {
        id: id + "-node-11",
        x: breakoutCoords.pins.P11.x,
        y: breakoutCoords.pins.P11.y,
        parentId: id,
        placeholder: "P11",
        fillColor: "red",
      },
      {
        id: id + "-node-12",
        x: breakoutCoords.pins.P12.x,
        y: breakoutCoords.pins.P12.y,
        parentId: id,
        placeholder: "P12",
        fillColor: "red",
      },
      {
        id: id + "-node-13",
        x: breakoutCoords.pins.P13.x,
        y: breakoutCoords.pins.P13.y,
        parentId: id,
        placeholder: "P13",
        fillColor: "red",
      },
      {
        id: id + "-node-14",
        x: breakoutCoords.pins.P14.x,
        y: breakoutCoords.pins.P14.y,
        parentId: id,
        placeholder: "P14",
        fillColor: "red",
      },
      {
        id: id + "-node-15",
        x: breakoutCoords.pins.P15.x,
        y: breakoutCoords.pins.P15.y,
        parentId: id,
        placeholder: "P15",
        fillColor: "red",
      },
      {
        id: id + "-node-16",
        x: breakoutCoords.pins.P16.x,
        y: breakoutCoords.pins.P16.y,
        parentId: id,
        placeholder: "P16",
        fillColor: "red",
      },
      {
        id: id + "-node-19",
        x: breakoutCoords.pins.P19.x,
        y: breakoutCoords.pins.P19.y,
        parentId: id,
        placeholder: "P19",
        fillColor: "red",
      },
      {
        id: id + "-node-20",
        x: breakoutCoords.pins.P20.x,
        y: breakoutCoords.pins.P20.y,
        parentId: id,
        placeholder: "P20",
        fillColor: "red",
      },
    ],
    properties: {
      voltage: props.properties?.voltage ?? 3.3,
      resistance: props.properties?.resistance ?? 0,
      temperature: props.properties?.temperature ?? 25, 
      brightness: props.properties?.brightness ?? 128,
      color: props.properties?.color ?? "green",
      ...props.properties,
    },
    displayProperties: ["temperature", "brightness", "color"],
  };

  const ultraSonicSensor4P = {
    id,
    type: props.type,
    x: props.pos.x,
    y: props.pos.y,
    rotation: props.rotation ?? 0,
    nodes: [
      {
        id: id + "-node-vcc",
        x: 75,
        y: 105,
        parentId: id,
        placeholder: "VCC(+5V)",
        fillColor: "red",
      },
      {
        id: id + "-node-trig",
        x: 84,
        y: 105,
        parentId: id,
        placeholder: "TRIG",
        fillColor: "red",
      },
      {
        id: id + "-node-echo",
        x: 94,
        y: 105,
        parentId: id,
        placeholder: "ECHO",
        fillColor: "red",
      },
      {
        id: id + "-node-gnd",
        x: 103,
        y: 105,
        parentId: id,
        placeholder: "GND",
        fillColor: "red",
      }
    ],
    properties: {
      voltage: props.properties?.voltage ?? 3.3,
      resistance: props.properties?.resistance ?? 1,
      ...props.properties,
    },
    displayProperties: [],
  };

  const pushButtonElement: CircuitElement = {
    id,
    type: props.type,
    x: props.pos.x,
    y: props.pos.y,
    rotation: props.rotation ?? 0,
    nodes: [
      {
        id: id + "-node-1a",
        x: 5.5,
        y: 73,
        parentId: id,
        placeholder: "Terminal 1a",
        fillColor: "red",
      },
      {
        id: id + "-node-2a",
        x: 48.5,
        y: 73,
        parentId: id,
        placeholder: "Terminal 2a",
        fillColor: "red",
      },
      {
        id: id + "-node-1b",
        x: 5.5,
        y: 4,
        parentId: id,
        placeholder: "Terminal 1b",
        fillColor: "red",
      },
      {
        id: id + "-node-2b",
        x: 48.5,
        y: 4,
        parentId: id,
        placeholder: "Terminal 2b",
        fillColor: "red",
      },
    ],
    properties: {
      voltage: props.properties?.voltage,
      resistance: props.properties?.resistance ?? 1e9, 
      pressed: false, 
    },
    displayProperties: [],
  };

  const slideSwitchElement: CircuitElement = {
    id,
    type: props.type,
    x: props.pos.x,
    y: props.pos.y,
    rotation: props.rotation ?? 0,
    nodes: [
      {
        id: id + "-node-terminal1",
        x: 22,
        y: 86,
        parentId: id,
        placeholder: "Terminal 1 (Left)",
        fillColor: "red",
      },
      {
        id: id + "-node-common",
        x: 74,
        y: 86,
        parentId: id,
        placeholder: "Common (Middle)",
        fillColor: "red",
      },
      {
        id: id + "-node-terminal2",
        x: 126.5,
        y: 86,
        parentId: id,
        placeholder: "Terminal 2 (Right)",
        fillColor: "red",
      },
    ],
    properties: {
      voltage: props.properties?.voltage,
      // When position is "left": terminal1-common has low resistance, terminal2-common has high resistance
      // When position is "right": terminal2-common has low resistance, terminal1-common has high resistance
      switchPosition: "left", // default position
      resistance: props.properties?.resistance ?? 0.01, // resistance when connected
    },
    displayProperties: [],
  };

  const noteElement: CircuitElement = {
    id,
    type: props.type,
    x: props.pos.x,
    y: props.pos.y,
    rotation: props.rotation ?? 0,
    nodes: [], // Notes don't have nodes as they're not circuit elements
    properties: {
      text: props.properties?.text ?? "",
      width: props.properties?.width ?? 150,
      height: props.properties?.height ?? 100,
      backgroundColor: props.properties?.backgroundColor ?? "#E8E8E8",
      collapsed: props.properties?.collapsed ?? false,
    },
    displayProperties: ["text"],
  };

  const buzzerElement: CircuitElement = {
    id,
    type: props.type,
    x: props.pos.x,
    y: props.pos.y,
    rotation: props.rotation ?? 0,
    // Two-terminal buzzer: left = negative, right = positive
    nodes: [
      {
        id: id + "-node-1",
        x: 50,
        y: 92,
        parentId: id,
        polarity: "negative" as const,
        placeholder: "Negative",
        fillColor: "black",
      },
      {
        id: id + "-node-2",
        x: 61,
        y: 92,
        parentId: id,
        polarity: "positive" as const,
        placeholder: "Positive",
        fillColor: "red",
      },
    ],
    properties: {
      voltage: props.properties?.voltage ?? 5,
    },
    displayProperties: [],
  };

  // switch based on type
  let element;
  switch (props.type) {
    case "battery":
      element = batteryElement;
      break;
    case "cell3v":
      element = cell3vElement;
      break;
    case "AA_battery":
      element = AA_batteryElement;
      break;
    case "AAA_battery":
      element = AAA_batteryElement;
      break;
    case "powersupply":
      element = powerSupplyElement;
      break;
    case "lightbulb":
      element = lightbulbElement;
      break;
    case "resistor":
      element = resistorElement;
      break;
    case "ldr":
      element = ldrElement;
      break;
    case "lm35":
      element = lm35Element;
      break;
    case "multimeter":
      element = multimeterElement;
      break;
    case "potentiometer":
      element = potentiometerElement;
      break;
    case "led":
      element = ledElement;
      break;
    case "rgbled":
      element = rgbLedElement;
      break;
    case "microbit":
      element = microbitElement;
      break;
    case "ultrasonicsensor4p":
      element = ultraSonicSensor4P;
      break;
    case "microbitWithBreakout":
      element = microbitElementWithBreakout;
      break;
    case "pushbutton":
      element = pushButtonElement;
      break;
    case "slideswitch":
      element = slideSwitchElement;
      break;
    case "buzzer":
      element = buzzerElement;
      break;
    case "note":
      element = noteElement;
      break;
    default:
      element = null;
  }

  return element;
}

export function updateMicrobitNodes(element: CircuitElement): CircuitElement {
  if (element.type === "microbit") {
    const microbitColor = element.properties?.color ?? "red";
    const coords = getMicrobitCoordinates(microbitColor);
    
    return {
      ...element,
      nodes: element.nodes.map(node => {
        if (node.placeholder === "P0") {
          return { ...node, x: coords.pins.P0.x, y: coords.pins.P0.y };
        } else if (node.placeholder === "P1") {
          return { ...node, x: coords.pins.P1.x, y: coords.pins.P1.y };
        } else if (node.placeholder === "P2") {
          return { ...node, x: coords.pins.P2.x, y: coords.pins.P2.y };
        } else if (node.placeholder === "3.3V") {
          return { ...node, x: coords.pins.V3.x, y: coords.pins.V3.y };
        } else if (node.placeholder === "GND") {
          return { ...node, x: coords.pins.GND.x, y: coords.pins.GND.y };
        }
        return node;
      })
    };
  } else if (element.type === "microbitWithBreakout") {
    const microbitWithBreakoutColor = element.properties?.color ?? "green";
    const coords = getMicrobitWithBreakoutCoordinates(microbitWithBreakoutColor);
    
    return {
      ...element,
      nodes: element.nodes.map(node => {
        if (node.placeholder === "GND" && node.id.includes("GND1")) {
          return { ...node, x: coords.pins.GND1.x, y: coords.pins.GND1.y };
        } else if (node.placeholder === "GND" && node.id.includes("GND2")) {
          return { ...node, x: coords.pins.GND2.x, y: coords.pins.GND2.y };
        } else if (node.placeholder === "3.3V") {
          return { ...node, x: coords.pins.V3.x, y: coords.pins.V3.y };
        } else if (node.placeholder === "P0") {
          return { ...node, x: coords.pins.P0.x, y: coords.pins.P0.y };
        } else if (node.placeholder === "P1") {
          return { ...node, x: coords.pins.P1.x, y: coords.pins.P1.y };
        } else if (node.placeholder === "P2") {
          return { ...node, x: coords.pins.P2.x, y: coords.pins.P2.y };
        } else if (node.placeholder === "P3") {
          return { ...node, x: coords.pins.P3.x, y: coords.pins.P3.y };
        } else if (node.placeholder === "P4") {
          return { ...node, x: coords.pins.P4.x, y: coords.pins.P4.y };
        } else if (node.placeholder === "P5") {
          return { ...node, x: coords.pins.P5.x, y: coords.pins.P5.y };
        } else if (node.placeholder === "P6") {
          return { ...node, x: coords.pins.P6.x, y: coords.pins.P6.y };
        } else if (node.placeholder === "P7") {
          return { ...node, x: coords.pins.P7.x, y: coords.pins.P7.y };
        } else if (node.placeholder === "P8") {
          return { ...node, x: coords.pins.P8.x, y: coords.pins.P8.y };
        } else if (node.placeholder === "P9") {
          return { ...node, x: coords.pins.P9.x, y: coords.pins.P9.y };
        } else if (node.placeholder === "P10") {
          return { ...node, x: coords.pins.P10.x, y: coords.pins.P10.y };
        } else if (node.placeholder === "P11") {
          return { ...node, x: coords.pins.P11.x, y: coords.pins.P11.y };
        } else if (node.placeholder === "P12") {
          return { ...node, x: coords.pins.P12.x, y: coords.pins.P12.y };
        } else if (node.placeholder === "P13") {
          return { ...node, x: coords.pins.P13.x, y: coords.pins.P13.y };
        } else if (node.placeholder === "P14") {
          return { ...node, x: coords.pins.P14.x, y: coords.pins.P14.y };
        } else if (node.placeholder === "P15") {
          return { ...node, x: coords.pins.P15.x, y: coords.pins.P15.y };
        } else if (node.placeholder === "P16") {
          return { ...node, x: coords.pins.P16.x, y: coords.pins.P16.y };
        } else if (node.placeholder === "P19") {
          return { ...node, x: coords.pins.P19.x, y: coords.pins.P19.y };
        } else if (node.placeholder === "P20") {
          return { ...node, x: coords.pins.P20.x, y: coords.pins.P20.y };
        }
        return node;
      })
    };
  }
  
  return element;
}
