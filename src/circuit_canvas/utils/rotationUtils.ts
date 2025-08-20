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
      return { x: 80, y: 40 }; // Battery is 160x80, so center is 80x40
    case "lightbulb":
      return { x: 73, y: 70 }; // Approximate center of lightbulb
    case "resistor":
      return { x: 20, y: 21 }; // Approximate center of resistor
    case "multimeter":
      return { x: 20, y: 15 }; // Approximate center of multimeter
    case "potentiometer":
      return { x: 26, y: 20 }; // Approximate center of potentiometer
    case "led":
      return { x: 34, y: 30 }; // Approximate center of LED
    case "microbit":
      return { x: 111, y: 113 }; // Approximate center of microbit
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
      return { width: 160, height: 80 };
    case "lightbulb":
      return { width: 146, height: 140 };
    case "resistor":
      return { width: 40, height: 42 };
    case "multimeter":
      return { width: 40, height: 30 };
    case "potentiometer":
      return { width: 52, height: 40 };
    case "led":
      return { width: 68, height: 60 };
    case "microbit":
      return { width: 222, height: 226 };
    default:
      return { width: 50, height: 50 };
  }
}
