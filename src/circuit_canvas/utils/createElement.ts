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
    nodes: [
      {
        id: id + "-node-1",
        x: 13,
        y: 38,
        parentId: id,
        polarity: "positive",
        placeholder: "Positive",
        fillColor: "green",
      },
      {
        id: id + "-node-2",
        x: 13,
        y: 47,
        parentId: id,
        polarity: "negative",
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
  };

  const lightbulbElement = {
    id,
    type: props.type,
    x: props.pos.x,
    y: props.pos.y,
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
  };

  const resistorElement = {
    id,
    type: props.type,
    x: props.pos.x,
    y: props.pos.y,
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
  };

  const multimeterElement = {
    id,
    type: props.type,
    x: props.pos.x,
    y: props.pos.y,
    nodes: [
      {
        id: id + "-node-1",
        x: 10.3,
        y: 14,
        parentId: id,
        polarity: "negative",
        placeholder: "Negative",
        fillColor: "red",
      },
      {
        id: id + "-node-2",
        x: 30.6,
        y: 14,
        parentId: id,
        polarity: "positive",
        placeholder: "Positive",
        fillColor: "green",
      },
    ],
    properties: {
      ...{
        voltage: props.properties?.voltage,
        resistance: props.properties?.resistance ?? 11,
      },
      ...props.properties,
    },
  };

  const potentiometerElement = {
    id,
    type: props.type,
    x: props.pos.x,
    y: props.pos.y,
    nodes: [
      {
        id: id + "-node-A", // Terminal A
        x: 11.3,
        y: 20,
        parentId: id,
        name: "A", // optional for clarity
        placeholder: "Terminal 1",
        fillColor: "red",
      },
      {
        id: id + "-node-W", // Wiper
        x: 26,
        y: 16, // position it visually on top if needed
        parentId: id,
        name: "W",
        placeholder: "Wiper",
        fillColor: "red",
      },
      {
        id: id + "-node-B", // Terminal B
        x: 41.3,
        y: 20,
        parentId: id,
        name: "B",
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
  };
  const ledElement = {
    id,
    type: props.type,
    x: props.pos.x,
    y: props.pos.y,
    nodes: [
      {
        id: id + "-node-1",
        x: 27,
        y: 60,
        parentId: id,
        polarity: "positive",
        placeholder: "Cathode",
        fillColor: "red",
      },
      {
        id: id + "-node-2",
        x: 41,
        y: 60,
        parentId: id,
        polarity: "negative",
        placeholder: "Anode",
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
  };

  const microbitElement = {
    id,
    type: props.type,
    x: props.pos.x,
    y: props.pos.y,
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
    connecters: [
      {
        id: id + "-usb-connector-1",
        parentId: id,
        x: 150,
        y: 227,
        state: "off",
      },
    ],
    properties: {
      ...props.properties,
    },
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
    default:
      element = null;
  }

  return element;
}
