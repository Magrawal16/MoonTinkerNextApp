/**
 * RGB LED Node Position Map
 * 
 * RGB LED has 4 terminals (from left to right):
 * 1. Red (cathode in common-cathode, anode in common-anode)
 * 2. Common (cathode in common-cathode, anode in common-anode)
 * 3. Green (cathode in common-cathode, anode in common-anode)
 * 4. Blue (cathode in common-cathode, anode in common-anode)
 * 
 * The RGB LED SVG is 240x258 pixels with viewBox 0 0 180 193.5
 * We scale to fit the element dimensions
 */

export type RgbLedNodePositions = {
  red: { x: number; y: number };
  common: { x: number; y: number };
  green: { x: number; y: number };
  blue: { x: number; y: number };
};

/**
 * Get node positions for RGB LED
 * The positions are relative to the element origin (top-left)
 * 
 * Terminal order from left: Red, Common, Green, Blue
 * - In common-cathode: Common is cathode (negative), R/G/B are anodes (positive)
 * - In common-anode: Common is anode (positive), R/G/B are cathodes (negative)
 */
export function getRgbLedNodePositions(): RgbLedNodePositions {
  // Node positions based on the RGB LED SVG structure
  // The legs bend outward at the bottom, tips at the ends of bent legs
  // Element dimensions: 105x110
  // Horizontal spacing adjusted for the bent leg positions
  return {
    red: { x: 25, y: 80 },      // First leg (leftmost) - Red
    common: { x: 44.5, y: 92 },   // Second leg - Common (Cathode/Anode)
    green: { x: 64.5, y: 80 },    // Third leg - Green
    blue: { x: 85, y: 80 },     // Fourth leg (rightmost) - Blue
  };
}

/**
 * Get the polarity for each node based on RGB LED type
 */
export function getRgbLedNodePolarities(rgbLedType: "common-cathode" | "common-anode"): {
  red: "positive" | "negative";
  common: "positive" | "negative";
  green: "positive" | "negative";
  blue: "positive" | "negative";
} {
  if (rgbLedType === "common-cathode") {
    // Common cathode: Common is negative, RGB are positive (anodes)
    return {
      red: "positive",
      common: "negative",
      green: "positive",
      blue: "positive",
    };
  } else {
    // Common anode: Common is positive, RGB are negative (cathodes)
    return {
      red: "negative",
      common: "positive",
      green: "negative",
      blue: "negative",
    };
  }
}

/**
 * Get placeholder labels for nodes based on RGB LED type
 */
export function getRgbLedNodeLabels(rgbLedType: "common-cathode" | "common-anode"): {
  red: string;
  common: string;
  green: string;
  blue: string;
} {
  return {
    red: "Red",
    common: rgbLedType === "common-cathode" ? "Cathode" : "Anode",
    green: "Green",
    blue: "Blue",
  };
}
