import { Node, CircuitElement } from "../types/circuit";

/**
 * Rotates a point around the origin (0, 0) by the given angle in degrees
 */
export function rotatePoint(
  x: number,
  y: number,
  angleDegrees: number
): { x: number; y: number } {
  const angleRadians = (angleDegrees * Math.PI) / 180;
  const cos = Math.cos(angleRadians);
  const sin = Math.sin(angleRadians);

  return {
    x: x * cos - y * sin,
    y: x * sin + y * cos,
  };
}

/**
 * Gets the absolute position of a node, taking into account the element's position and rotation
 */
export function getAbsoluteNodePosition(
  node: Node,
  element: CircuitElement
): { x: number; y: number } {
  const rotation = element.rotation || 0;
  const center = getElementCenter(element);

  // If there's no rotation, return the calculation with center offset
  if (rotation === 0) {
    return {
      x: element.x + node.x - center.x,
      y: element.y + node.y - center.y,
    };
  }

  // Translate node position relative to center, rotate, then translate back
  const relativeX = node.x - center.x;
  const relativeY = node.y - center.y;

  // Rotate the node's position relative to the element's center
  const rotatedNode = rotatePoint(relativeX, relativeY, rotation);

  return {
    x: element.x + rotatedNode.x,
    y: element.y + rotatedNode.y,
  };
}

/**
 * Gets the center point of an element based on its type and dimensions
 * This is used as the rotation origin for elements

 */
export function getElementCenter(element: CircuitElement): {
  x: number;
  y: number;
} {
  // Define center points for each element type based on their visual dimensions
  switch (element.type) {
    case "battery":
      return { x: 60, y: 90 };
    case "cell3v":
      return { x: 60, y: 90 };
    case "AA_battery":
      return { x: 60, y: 90 };
    case "AAA_battery":
      return { x: 60, y: 90 };
    case "powersupply":
      return { x: 80, y: 65 };
    case "lightbulb":
      return { x: 75, y: 75 };
    case "resistor":
      return { x: 1 + 25, y: 22 + 30 };
    case "ldr":
      return { x: 1 + 30, y: 22 + 30 };
    case "multimeter":
      return { x: 1 + 90, y: 22 + 37.5 }; 
    case "potentiometer":
      return { x: 1 + 25, y: 22 + 25 };
    case "led":
      return { x: 25, y: 35 };
    case "rgbled":
      return { x: 52.5, y: 55 };
    case "microbit":
      return { x: 1 + 85.5, y: 22 + 67.5 };
    case "microbitWithBreakout":
      return { x: 1 + 85.5, y: 22 + 67.5 };
    case "ultrasonicsensor4p":
      return { x: 60, y: 30 };
    case "pushbutton":
      return { x: 30.5, y: 40.5 };
    case "slideswitch":
      return { x: 75, y: 45 };
    case "note":
      const noteWidth = element.properties?.width ?? 200;
      const noteHeight = element.properties?.height ?? 150;
      return { x: noteWidth / 2, y: noteHeight / 2 };
    default:
      return { x: 0, y: 0 };
  }
}

/**
 * Gets the dimensions of an element based on its type
 */
export function getElementDimensions(element: CircuitElement): {
  width: number;
  height: number;
} {
  switch (element.type) {
    case "battery":
      return { width: 120, height: 180 };
    case "cell3v":
      return { width: 120, height: 180 };
    case "AA_battery":
      return { width: 120, height: 180 };
    case "AAA_battery":
      return { width: 120, height: 180 };
    case "powersupply":
      return { width: 160, height: 130 };
    case "lightbulb":
      return { width: 150, height: 150 };
    case "resistor":
      return { width: 50, height: 60 };
    case "ldr":
      return { width: 60, height: 60 };
    case "multimeter":
      return { width: 180, height: 75 }; 
    case "potentiometer":
      return { width: 50, height: 50 };
    case "led":
      return { width: 50, height: 70 };
    case "rgbled":
      return { width: 105, height: 110 };
    case "microbit":
      return { width: 171, height: 135 };
    case "microbitWithBreakout":
      return { width: 171, height: 135 };
    case "ultrasonicsensor4p":
      return { width: 120, height: 60 };
    case "pushbutton":
      return { width: 61, height: 81 };
    case "slideswitch":
      return { width: 150, height: 90 };
    case "note":
      return { 
        width: element.properties?.width ?? 200, 
        height: element.properties?.height ?? 150 
      };
    default:
      return { width: 50, height: 50 };
  }
}
