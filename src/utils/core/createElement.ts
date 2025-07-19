import { CircuitElement } from "@/common/types/circuit";
import { CircuitElementProps } from "@/common/types/circuit";

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
        x: 10,
        y: -2,
        parentId: id,
        polarity: "positive",
      },
      {
        id: id + "-node-2",
        x: 30,
        y: -2,
        parentId: id,
        polarity: "negative",
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
        x: 10,
        y: 40,
        parentId: id,
      },
      {
        id: id + "-node-2",
        x: 30,
        y: 40,
        parentId: id,
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
        x: 1,
        y: 42,
        parentId: id,
      },
      {
        id: id + "-node-2",
        x: 42,
        y: 42,
        parentId: id,
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
        x: 10,
        y: 20,
        parentId: id,
        polarity: "negative",
      },
      {
        id: id + "-node-2",
        x: 30,
        y: 20,
        parentId: id,
        polarity: "positive",
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
        x: 10,
        y: 23,
        parentId: id,
        name: "A", // optional for clarity
      },
      {
        id: id + "-node-W", // Wiper
        x: 26.5,
        y: 23, // position it visually on top if needed
        parentId: id,
        name: "W",
      },
      {
        id: id + "-node-B", // Terminal B
        x: 43,
        y: 23,
        parentId: id,
        name: "B",
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
        x: 13,
        y: 40,
        parentId: id,
        polarity: "positive",
      },
      {
        id: id + "-node-2",
        x: 27,
        y: 40,
        parentId: id,
        polarity: "negative",
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
      },
      {
        id: id + "-node-1",
        x: 74.8,
        y: 227,
        parentId: id,
      },
      {
        id: id + "-node-2",
        x: 111.4,
        y: 227,
        parentId: id,
      },
      {
        id: id + "-node-3V",
        x: 148,
        y: 227,
        parentId: id,
      },
      {
        id: id + "-node-GND",
        x: 180,
        y: 227,
        parentId: id,
      },
    ],
    properties: {
      ...{
        voltage: props.properties?.voltage ?? 3,
        resistance: props.properties?.resistance ?? 1,
      },
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
