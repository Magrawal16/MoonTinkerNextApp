import { CircuitElement, CircuitElementProps } from "../types/circuit";
import { getLedNodePositions } from "../utils/ledNodeMap";

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
        x: 1,
        y: 43.5,
        parentId: id,
        polarity: "positive" as const,
        placeholder: "Positive",
        fillColor: "green",
      },
      {
        id: id + "-node-2",
        x: 1,
        y: 35.5,
        parentId: id,
        polarity: "negative" as const,
        placeholder: "Negative",
        fillColor: "red",
      },
    ],
    properties: {
      ...{
        voltage: props.properties?.voltage ?? 20,
        resistance: props.properties?.resistance ?? 1,
      },
      ...props.properties,
    },
    displayProperties: ["voltage", "resistance"],
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
        x: 79,
        y: 140,
        parentId: id,
        placeholder: "Terminal 2",
        fillColor: "red",
      },
    ],
    properties: {
      ...{
        voltage: props.properties?.voltage,
        resistance: props.properties?.resistance ?? 1,
      },
      ...props.properties,
    },
    displayProperties: ["resistance"],
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
            x: pos.left.x,
            y: pos.left.y,
            parentId: id,
            placeholder: "Terminal 1",
            fillColor: "red",
          },
          {
            id: id + "-node-2",
            x: pos.right.x,
            y: pos.right.y,
            parentId: id,
            placeholder: "Terminal 1",
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

  const multimeterElement = {
    id,
    type: props.type,
    x: props.pos.x,
    y: props.pos.y,
    rotation: props.rotation ?? 0,
    nodes: [
      {
        id: id + "-node-2",
        x: 30.6,
        y: 14,
        parentId: id,
        polarity: "positive" as const,
        placeholder: "Positive",
        fillColor: "green",
      },
      {
        id: id + "-node-1",
        x: 10.3,
        y: 14,
        parentId: id,
        polarity: "negative" as const,
        placeholder: "Negative",
        fillColor: "red",
      },
    ],
    properties: {
      ...{
        voltage: props.properties?.voltage,
        resistance: props.properties?.resistance ?? 11,
      },
      ...props.properties,
    },
    displayProperties: ["voltage", "resistance"],
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
        x: 11.3,
        y: 20,
        parentId: id,
        placeholder: "Terminal 1",
        fillColor: "red",
      },
      {
        id: id + "-node-W", // Wiper
        x: 26,
        y: 16, // position it visually on top if needed
        parentId: id,
        placeholder: "Wiper",
        fillColor: "red",
      },
      {
        id: id + "-node-B", // Terminal B
        x: 41.3,
        y: 20,
        parentId: id,
        placeholder: "Terminal 2",
        fillColor: "red",
      },
    ],
    properties: {
      ...{
        voltage: props.properties?.voltage,
        resistance: props.properties?.resistance ?? 2,
        ratio: props.properties?.ratio ?? 0.5, // Default ratio for potentiometer
      },
      ...props.properties,
    },
    displayProperties: ["resistance", "ratio"],
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
        resistance: props.properties?.resistance ?? 1,
        color: props.properties?.color ?? 'red',
      },
      ...props.properties,
    },
    displayProperties: ['resistance', 'color'],
  };

  const microbitElement = {
    id,
    type: props.type,
    x: props.pos.x,
    y: props.pos.y,
    rotation: props.rotation ?? 0,
    nodes: [
      {
        id: id + "-node-0",
        x: 42.9,
        y: 227,
        parentId: id,
        placeholder: "P0",
        fillColor: "red",
      },
      {
        id: id + "-node-1",
        x: 74.8,
        y: 227,
        parentId: id,
        placeholder: "P1",
        fillColor: "red",
      },
      {
        id: id + "-node-2",
        x: 111.4,
        y: 227,
        parentId: id,
        placeholder: "P2",
        fillColor: "red",
      },
      {
        id: id + "-node-3V",
        x: 148,
        y: 227,
        parentId: id,
        placeholder: "3.3V",
        fillColor: "red",
      },
      {
        id: id + "-node-GND",
        x: 180,
        y: 227,
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
      ...props.properties,
    },
    displayProperties: ["temperature", "brightness"],
  };

  const microbitElementWithBreakout = {
    id,
    type: props.type,
    x: props.pos.x,
    y: props.pos.y,
    rotation: props.rotation ?? 0,
    nodes: [
      {
        id: id + "-node-GND1",
        x: 32.3,
        y: 229.2,
        parentId: id,
        placeholder: "GND",
        fillColor: "red",
      },
      {
        id: id + "-node-GND2",
        x: 40.5,
        y: 229.2,
        parentId: id,
        placeholder: "GND",
        fillColor: "red",
      },
      {
        id: id + "-node-3V",
        x: 47.5,
        y: 229.2,
        parentId: id,
        placeholder: "3.3V",
        fillColor: "red",
      },
      {
        id: id + "-node-0",
        x: 55.5,
        y: 229.2,
        parentId: id,
        placeholder: "P0",
        fillColor: "red",
      },
      {
        id: id + "-node-1",
        x: 62.5,
        y: 229.2,
        parentId: id,
        placeholder: "P1",
        fillColor: "red",
      },
      {
        id: id + "-node-2",
        x: 70,
        y: 229.2,
        parentId: id,
        placeholder: "P2",
        fillColor: "red",
      },
      {
        id: id + "-node-3",
        x: 77.3,
        y: 229.2,
        parentId: id,
        placeholder: "Not Supported",
        fillColor: "red",
      },
      {
        id: id + "-node-4",
        x: 85,
        y: 229.2,
        parentId: id,
        placeholder: "Not Supported",
        fillColor: "red",
      },
      {
        id: id + "-node-5",
        x: 92,
        y: 229.2,
        parentId: id,
        placeholder: "P5",
        fillColor: "red",
      },
      {
        id: id + "-node-6",
        x: 100,
        y: 229.2,
        parentId: id,
        placeholder: "Not Supported",
        fillColor: "red",
      },
      {
        id: id + "-node-7",
        x: 107,
        y: 229.2,
        parentId: id,
        placeholder: "Not Supported",
        fillColor: "red",
      },
      {
        id: id + "-node-8",
        x: 114.3,
        y: 229.2,
        parentId: id,
        placeholder: "P8",
        fillColor: "red",
      },
      {
        id: id + "-node-9",
        x: 122,
        y: 229.2,
        parentId: id,
        placeholder: "Not Supported",
        fillColor: "red",
      },
      {
        id: id + "-node-10",
        x: 129,
        y: 229.2,
        parentId: id,
        placeholder: "Not Supported",
        fillColor: "red",
      },
      {
        id: id + "-node-11",
        x: 137,
        y: 229.2,
        parentId: id,
        placeholder: "P11",
        fillColor: "red",
      },
      {
        id: id + "-node-12",
        x: 144.8,
        y: 229.2,
        parentId: id,
        placeholder: "Not Supported",
        fillColor: "red",
      },
      {
        id: id + "-node-13",
        x: 152,
        y: 229.2,
        parentId: id,
        placeholder: "P13",
        fillColor: "red",
      },
      {
        id: id + "-node-14",
        x: 159.5,
        y: 229.2,
        parentId: id,
        placeholder: "P14",
        fillColor: "red",
      },
      {
        id: id + "-node-15",
        x: 166.8,
        y: 229.2,
        parentId: id,
        placeholder: "P15",
        fillColor: "red",
      },
      {
        id: id + "-node-16",
        x: 174,
        y: 229.2,
        parentId: id,
        placeholder: "P16",
        fillColor: "red",
      },
      {
        id: id + "-node-19",
        x: 181,
        y: 229.2,
        parentId: id,
        placeholder: "Not Supported",
        fillColor: "red",
      },
      {
        id: id + "-node-20",
        x: 188,
        y: 229.2,
        parentId: id,
        placeholder: "Not Supported",
        fillColor: "red",
      },
    ],
    properties: {
      voltage: props.properties?.voltage ?? 3.3,
      resistance: props.properties?.resistance ?? 0,
      temperature: props.properties?.temperature ?? 25, 
      brightness: props.properties?.brightness ?? 128, 
      ...props.properties,
    },
    displayProperties: ["temperature", "brightness"],
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
        y: 90,
        parentId: id,
        placeholder: "VCC(+5V)",
        fillColor: "red",
      },
      {
        id: id + "-node-trig",
        x: 98,
        y: 90,
        parentId: id,
        placeholder: "TRIG",
        fillColor: "red",
      },
      {
        id: id + "-node-echo",
        x: 121.7,
        y: 90,
        parentId: id,
        placeholder: "ECHO",
        fillColor: "red",
      },
      {
        id: id + "-node-gnd",
        x: 145.3,
        y: 90,
        parentId: id,
        placeholder: "GND",
        fillColor: "red",
      }
    ],
    properties: {
      voltage: props.properties?.voltage ?? 3.3,
      resistance: props.properties?.resistance ?? 0,
      ...props.properties,
    },
    displayProperties: ["voltage", "resistance"],
  };

  // switch based on type
  let element;
  switch (props.type) {
    case "battery":
      element = batteryElement;
      break;
    case "lightbulb":
      element = lightbulbElement;
      break;
    case "resistor":
      element = resistorElement;
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
    case "microbit":
      element = microbitElement;
      break;
    case "ultrasonicsensor4p":
      element = ultraSonicSensor4P;
      break;
    case "microbitWithBreakout":
      element = microbitElementWithBreakout;
      break;
    default:
      element = null;
  }

  return element;
}
