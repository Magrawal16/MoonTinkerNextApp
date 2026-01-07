// microbitCoordinateMap.ts
// Centralized coordinate mapping for micro:bit color variants.
// Each SVG may have slightly different dimensions or element positions.

export type MicrobitColor = "red" | "yellow" | "green" | "blue";

export interface MicrobitCoordinates {
  // Overall SVG dimensions
  width: number;
  height: number;
  offsetX: number;
  offsetY: number;

  // Custom hit area for selection (covers main board body)
  hitArea: {
    x: number;
    y: number;
    width: number;
    height: number;
  };

  // Touch sensor (logo) overlay
  logo: {
    x: number;
    y: number;
    width: number;
    height: number;
    strokeWidth: number;
  };

  // USB on/off state overlays
  usbOn: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
  usbOff: {
    x: number;
    y: number;
    width: number;
    height: number;
  };

  // LED matrix grid (5x5) starting position and spacing
  ledMatrix: {
    startX: number;
    startY: number;
    spacingX: number;
    spacingY: number;
    ledRadius: number;
  };

  // Button positions (center coordinates)
  buttons: {
    A: { x: number; y: number };
    B: { x: number; y: number };
    AB: { x: number; y: number };
  };

  // Pin/Node positions (connection points)
  pins: {
    P0: { x: number; y: number };
    P1: { x: number; y: number };
    P2: { x: number; y: number };
    V3: { x: number; y: number }; // 3.3V pin
    GND: { x: number; y: number };
  };

  // Explosion overlay position (when shorted)
  explosion: {
    x: number;
    y: number;
    width: number;
    height: number;
  };

  versionText: {
    x: number;
    y: number;
    fontSize: number;
    color?: string;
  };
}

// Coordinate maps for each color variant
const MICROBIT_COORDINATES: Record<MicrobitColor, MicrobitCoordinates> = {
  red: {
    width: 220,
    height: 220,
    offsetX: 0,
    offsetY: 0,
    hitArea: {
      x: 10,
      y: 48,
      width: 200,
      height: 135,
    },
    logo: {
      x: 95.2,
      y: 91.2,
      width: 29.2,
      height: 16.2,
      strokeWidth: 4,
    },
    usbOn: {
      x: 0,
      y: 0,
      width: 220,
      height: 220,
    },
    usbOff: {
      x: 0,
      y: -25,
      width: 220,
      height: 220,
    },
    ledMatrix: {
      startX: 84,
      startY: 114,
      spacingX: 12.4,
      spacingY: 12.4,
      ledRadius: 4.2,
    },
    buttons: {
      AB: { x: 164, y: 96 },
      A: { x: 35, y: 130 },
      B: { x: 165, y: 130 },
    },
    pins: {
      P0: { x: 42.9, y: 227 },
      P1: { x: 74.8, y: 227 },
      P2: { x: 111.4, y: 227 },
      V3: { x: 148, y: 227 },
      GND: { x: 180, y: 227 },
    },
    explosion: {
      x: 65,
      y: 90,
      width: 90,
      height: 90,
    },
    versionText: {
      x: 183,
      y: 167,
      fontSize: 6,
      color: "#FFFFFF",
    },
  },
  yellow: {
    width: 171,
    height: 135,
    offsetX: 0,
    offsetY: 0,
    hitArea: {
      x: 10,
      y: 48,
      width: 200,
      height: 135,
    },
    logo: {
      x: 72.4,
      y: 19.5,
      width: 24.8,
      height: 14,
      strokeWidth: 4,
    },
    usbOn: {
      x: -25,
      y: -72,
      width: 220,
      height: 220,
    },
    usbOff: {
      x: -25,
      y: -97.5,
      width: 220,
      height: 220,
    },
    ledMatrix: {
      startX: 60,
      startY: 45,
      spacingX: 12.4,
      spacingY: 12.4,
      ledRadius: 4.2,
    },
    buttons: {
      AB: { x: 140.4, y: 24.5 },
      A: { x: 10.5, y: 59.4 },
      B: { x: 139.2, y: 59.4 },
    },
    pins: {
      P0: { x: 16, y: 155 },
      P1: { x: 49, y: 155 },
      P2: { x: 85.5, y: 155 },
      V3: { x: 122.5, y: 155 },
      GND: { x: 154.5, y: 155 },
    },
    explosion: {
      x: 65,
      y: 90,
      width: 90,
      height: 90,
    },
    versionText: {
      x: 158,
      y: 96,
      fontSize: 6,
      color: "#FFFFFF",
    },
  },
  green: {
    width: 171,
    height: 135,
    offsetX: 0,
    offsetY: 0,
    hitArea: {
      x: 10,
      y: 48,
      width: 200,
      height: 135,
    },
    logo: {
      x: 72,
      y: 19.8,
      width: 26,
      height: 14,
      strokeWidth: 4,
    },
    usbOn: {
      x: -25,
      y: -72,
      width: 220,
      height: 220,
    },
    usbOff: {
      x: -25,
      y: -97.5,
      width: 220,
      height: 220,
    },
    ledMatrix: {
      startX: 60,
      startY: 45,
      spacingX: 12.4,
      spacingY: 12.4,
      ledRadius: 4.2,
    },
    buttons: {
      AB: { x: 141, y: 24.5 },
      A: { x: 9, y: 59.4 },
      B: { x: 140.2, y: 59.4 },
    },
    pins: {
      P0: { x: 16, y: 155 },
      P1: { x: 49, y: 155 },
      P2: { x: 85.5, y: 155 },
      V3: { x: 122.5, y: 155 },
      GND: { x: 154.5, y: 155 },
    },
    explosion: {
      x: 65,
      y: 90,
      width: 90,
      height: 90,
    },
    versionText: {
      x: 158,
      y: 96,
      fontSize: 6,
      color: "#FFFFFF",
    },
  },
  blue: {
    width: 171,
    height: 135,
    offsetX: 0,
    offsetY: 0,
    hitArea: {
      x: 10,
      y: 48,
      width: 200,
      height: 135,
    },
    logo: {
      x: 72.8,
      y: 20,
      width: 26,
      height: 14,
      strokeWidth: 4,
    },
    usbOn: {
      x: -25,
      y: -72,
      width: 220,
      height: 220,
    },
    usbOff: {
      x: -25,
      y: -97.5,
      width: 220,
      height: 220,
    },
    ledMatrix: {
      startX: 60,
      startY: 45,
      spacingX: 12.4,
      spacingY: 12.4,
      ledRadius: 4.2,
    },
    buttons: {
      AB: { x: 143, y: 24.5 },
      A: { x: 8.5, y: 59 },
      B: { x: 141.8, y: 59 },
    },
    pins: {
      P0: { x: 15, y: 154 },
      P1: { x: 49, y: 154 },
      P2: { x: 85.5, y: 154 },
      V3: { x: 122.5, y: 154 },
      GND: { x: 154.5, y: 154 },
    },
    explosion: {
      x: 65,
      y: 90,
      width: 90,
      height: 90,
    },
    versionText: {
      x: 160,
      y: 95,
      fontSize: 6,
      color: "#FFFFFF",
    },
  },
};

export function getMicrobitCoordinates(color?: string): MicrobitCoordinates {
  const normalizedColor = (color ?? "red").toLowerCase() as MicrobitColor;
  return MICROBIT_COORDINATES[normalizedColor] || MICROBIT_COORDINATES.red;
}

// Coordinate mapping for micro:bit with breakout board (different dimensions and positions)
export interface MicrobitWithBreakoutCoordinates {
  // Overall SVG dimensions
  width: number;
  height: number;
  offsetX: number;
  offsetY: number;

  // Custom hit area for selection
  hitArea: {
    x: number;
    y: number;
    width: number;
    height: number;
  };

  // Touch sensor (logo) overlay
  logo: {
    x: number;
    y: number;
    width: number;
    height: number;
    strokeWidth: number;
  };

  // USB on/off state overlays
  usbOn: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
  usbOff: {
    x: number;
    y: number;
    width: number;
    height: number;
  };

  // LED matrix grid (5x5)
  ledMatrix: {
    startX: number;
    startY: number;
    spacingX: number;
    spacingY: number;
    ledRadius: number;
  };

  // Button positions
  buttons: {
    A: { x: number; y: number };
    B: { x: number; y: number };
    AB: { x: number; y: number };
  };

  // Pin/Node positions (connection points) - breakout has more pins
  pins: {
    GND1: { x: number; y: number };
    GND2: { x: number; y: number };
    V3: { x: number; y: number }; // 3.3V
    P0: { x: number; y: number };
    P1: { x: number; y: number };
    P2: { x: number; y: number };
    P3: { x: number; y: number };
    P4: { x: number; y: number };
    P5: { x: number; y: number };
    P6: { x: number; y: number };
    P7: { x: number; y: number };
    P8: { x: number; y: number };
    P9: { x: number; y: number };
    P10: { x: number; y: number };
    P11: { x: number; y: number };
    P12: { x: number; y: number };
    P13: { x: number; y: number };
    P14: { x: number; y: number };
    P15: { x: number; y: number };
    P16: { x: number; y: number };
    P19: { x: number; y: number };
    P20: { x: number; y: number };
  };

  // Explosion overlay
  explosion: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
  versionText: {
    x: number;
    y: number;
    fontSize: number;
    color?: string;
  };
}

const MICROBIT_WITH_BREAKOUT_COORDINATES: Record<MicrobitColor, MicrobitWithBreakoutCoordinates> = {
  red: {
    width: 226,
    height: 240,
    offsetX: 0,
    offsetY: 0,
    hitArea: {
      x: 16,
      y: 40,
      width: 226,
      height: 240,
    },
    logo: {
      x: 100.8,
      y: 24.4,
      width: 23.4,
      height: 14.7,
      strokeWidth: 4.4,
    },
    usbOn: {
      x: 3.5,
      y: -72,
      width: 220,
      height: 220,
    },
    usbOff: {
      x: 3.5,
      y: -94.5,
      width: 220,
      height: 220,
    },
    ledMatrix: {
      startX: 91.5,
      startY: 55,
      spacingX: 12,
      spacingY: 12,
      ledRadius: 3.4,
    },
    buttons: {
      AB: { x: 161, y: 21.5 },
      A: { x: 39.5, y: 66.2 },
      B: { x: 162.5, y: 66.2 },
    },
    pins: {
      GND1: { x: 32.5, y: 250.5 },
      GND2: { x: 40.5, y: 250.5 },
      V3: { x: 48, y: 250.5 },
      P0: { x: 55.5, y: 250.5 },
      P1: { x: 63, y: 250.5 },
      P2: { x: 71, y: 250.5 },
      P3: { x: 78.5, y: 250.5 },
      P4: { x: 86, y: 250.5 },
      P5: { x: 94, y: 250.5 },
      P6: { x: 101.7, y: 250.5 },
      P7: { x: 109.3, y: 250.5 },
      P8: { x: 117, y: 250.5 },
      P9: { x: 124.5, y: 250.5 },
      P10: { x: 132, y: 250.5 },
      P11: { x: 139.5, y: 250.5 },
      P12: { x: 147.5, y: 250.5 },
      P13: { x: 155, y: 250.5 },
      P14: { x: 162.5, y: 250.5 },
      P15: { x: 170, y: 250.5 },
      P16: { x: 177.5, y: 250.5 },
      P19: { x: 185, y: 250.5 },
      P20: { x: 192.5, y: 250.5 },
    },
    explosion: {
      x: 71,
      y: 82,
      width: 90,
      height: 90,
    },
    versionText: {
      x: 178,
      y: 115,
      fontSize: 6,
      color: "#FFFFFF",
    },
  },
  yellow:  {
    width: 226,
    height: 240,
    offsetX: 0,
    offsetY: 0,
    hitArea: {
      x: 16,
      y: 40,
      width: 226,
      height: 240,
    },
    logo: {
      x: 102,
      y: 24,
      width: 23.2,
      height: 14.6,
      strokeWidth: 4.4,
    },
    usbOn: {
      x: 3.5,
      y: -72,
      width: 220,
      height: 220,
    },
    usbOff: {
      x: 3.5,
      y: -94.5,
      width: 220,
      height: 220,
    },
    ledMatrix: {
      startX: 91.5,
      startY: 55,
      spacingX: 12,
      spacingY: 12,
      ledRadius: 3.4,
    },
    buttons: {
      AB: { x: 161, y: 21.5 },
      A: { x: 39.5, y: 66.2 },
      B: { x: 162.5, y: 66.2 },
    },
    pins: {
      GND1: { x: 32.5, y: 249 },
      GND2: { x: 40.5, y: 249 },
      V3: { x: 48, y: 249 },
      P0: { x: 56, y: 249 },
      P1: { x: 63.5, y: 249 },
      P2: { x: 71.5, y: 249 },
      P3: { x: 79, y: 249 },
      P4: { x: 86.5, y: 249 },
      P5: { x: 94.5, y: 249 },
      P6: { x: 102, y: 249 },
      P7: { x: 109.8, y: 249 },
      P8: { x: 117.4, y: 249 },
      P9: { x: 125.5, y: 249 },
      P10: { x: 132.8, y: 249 },
      P11: { x: 140.4, y: 249 },
      P12: { x: 148.4, y: 249 },
      P13: { x: 155.8, y: 249 },
      P14: { x: 163.6, y: 249 },
      P15: { x: 171.4, y: 249 },
      P16: { x: 178.8, y: 249 },
      P19: { x: 186.8, y: 249 },
      P20: { x: 194.8, y: 249 },
    },
    explosion: {
      x: 71,
      y: 82,
      width: 90,
      height: 90,
    },
    versionText: {
      x: 180,
      y: 115,
      fontSize: 6,
      color: "#FFFFFF",
    },
  },
  green: {
    width: 226,
    height: 240,
    offsetX: 0,
    offsetY: 0,
    hitArea: {
      x: 16,
      y: 40,
      width: 226,
      height: 240,
    },
    logo: {
      x: 102,
      y: 26.3,
      width: 23.4,
      height: 14.7,
      strokeWidth: 4.2,
    },
    usbOn: {
      x: 3.5,
      y: -72,
      width: 220,
      height: 220,
    },
    usbOff: {
      x: 3.5,
      y: -94.5,
      width: 220,
      height: 220,
    },
    ledMatrix: {
      startX: 91.5,
      startY: 55,
      spacingX: 12,
      spacingY: 12,
      ledRadius: 3.4,
    },
    buttons: {
      AB: { x: 161.8, y: 22.4 },
      A: { x: 41, y: 67 },
      B: { x: 163.4, y: 67 },
    },
    pins: {
      GND1: { x: 33.5, y: 247.5 },
      GND2: { x: 41.5, y: 247.5 },
      V3: { x: 49, y: 247.5 },
      P0: { x: 56.5, y: 247.5 },
      P1: { x: 64.5, y: 247.5 },
      P2: { x: 72.5, y: 247.5 },
      P3: { x: 80, y: 247.5 },
      P4: { x: 87.5, y: 247.5 },
      P5: { x: 95, y: 247.5 },
      P6: { x: 102.7, y: 247.5 },
      P7: { x: 110.3, y: 247.5 },
      P8: { x: 118, y: 247.5 },
      P9: { x: 125.5, y: 247.5 },
      P10: { x: 133, y: 247.5 },
      P11: { x: 140.5, y: 247.5 },
      P12: { x: 148.5, y: 247.5 },
      P13: { x: 156, y: 247.5 },
      P14: { x: 163.5, y: 247.5 },
      P15: { x: 171, y: 247.5 },
      P16: { x: 178.5, y: 247.5 },
      P19: { x: 186, y: 247.5 },
      P20: { x: 193.5, y: 247.5 },
    },
    explosion: {
      x: 71,
      y: 82,
      width: 90,
      height: 90,
    },
    versionText: {
      x: 180,
      y: 115,
      fontSize: 6,
      color: "#FFFFFF",
    },
  },
  blue:  {
    width: 226,
    height: 240,
    offsetX: 0,
    offsetY: 0,
    hitArea: {
      x: 16,
      y: 40,
      width: 226,
      height: 240,
    },
    logo: {
      x: 101.8,
      y: 25,
      width: 23.6,
      height: 15,
      strokeWidth: 4.5,
    },
    usbOn: {
      x: 3.5,
      y: -72,
      width: 220,
      height: 220,
    },
    usbOff: {
      x: 3.5,
      y: -94.5,
      width: 220,
      height: 220,
    },
    ledMatrix: {
      startX: 91.5,
      startY: 55,
      spacingX: 12,
      spacingY: 12,
      ledRadius: 3.4,
    },
    buttons: {
      AB: { x: 163.5, y: 21.5 },
      A: { x: 39.5, y: 66.2 },
      B: { x: 165, y: 66.2 },
    },
    pins: {
      GND1: { x: 32.5, y: 249 },
      GND2: { x: 40.5, y: 249 },
      V3: { x: 48, y: 249 },
      P0: { x: 56, y: 249 },
      P1: { x: 63.5, y: 249 },
      P2: { x: 71.5, y: 249 },
      P3: { x: 79, y: 249 },
      P4: { x: 86.5, y: 249 },
      P5: { x: 94.5, y: 249 },
      P6: { x: 102, y: 249 },
      P7: { x: 109.8, y: 249 },
      P8: { x: 117.6, y: 249 },
      P9: { x: 125.5, y: 249 },
      P10: { x: 133, y: 249 },
      P11: { x: 140.6, y: 249 },
      P12: { x: 148.6, y: 249 },
      P13: { x: 156.4, y: 249 },
      P14: { x: 164, y: 249 },
      P15: { x: 172, y: 249 },
      P16: { x: 179.4, y: 249 },
      P19: { x: 187.4, y: 249 },
      P20: { x: 195.4, y: 249 },
    },
    explosion: {
      x: 71,
      y: 82,
      width: 90,
      height: 90,
    },
    versionText: {
      x: 180,
      y: 115,
      fontSize: 6,
      color: "#FFFFFF",
    },
  },
};

export function getMicrobitWithBreakoutCoordinates(color?: string): MicrobitWithBreakoutCoordinates {
  const normalizedColor = (color ?? "green").toLowerCase() as MicrobitColor;
  return MICROBIT_WITH_BREAKOUT_COORDINATES[normalizedColor] || MICROBIT_WITH_BREAKOUT_COORDINATES.green;
}
