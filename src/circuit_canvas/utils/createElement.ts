import { CircuitElement, CircuitElementProps } from "../types/circuit";

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
        x: 13,
        y: 39.5,
        parentId: id,
        polarity: "positive" as const,
        placeholder: "Positive",
        fillColor: "green",
      },
      {
        id: id + "-node-2",
        x: 13,
        y: 47,
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
    nodes: [
      {
        id: id + "-node-1",
        x: -7,
        y: 42,
        parentId: id,
        placeholder: "Terminal 1",
        fillColor: "red",
      },
      {
        id: id + "-node-2",
        x: 48,
        y: 42,
        parentId: id,
        placeholder: "Terminal 1",
        fillColor: "red",
      },
    ],
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
      const color = (props.properties?.color || 'red').toLowerCase();
      // Direct mapping: adjust numbers here (no need to compute deltas)
      const nodePositionMap: Record<string, { cathode: {x:number;y:number}; anode:{x:number;y:number} }> = {
        red:    { cathode: { x:14,  y:62 }, anode: { x:33,  y:62 } },
        green:  { cathode: { x:14,  y:700 }, anode: { x:33,  y:61 } },
        blue:   { cathode: { x:14,  y:62 }, anode: { x:33,  y:62 } },
        yellow: { cathode: { x:20,  y:63 }, anode: { x:33,  y:63 } },
        white:  { cathode: { x:14,  y:62 }, anode: { x:33,  y:62 } },
        orange: { cathode: { x:14,  y:62 }, anode: { x:33,  y:62 } },
      };
      const pos = nodePositionMap[color] || nodePositionMap.red;
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
