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
      x: 73,
      y: 20,
      width: 26,
      height: 14,
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
  },
  green: {
    width: 170,
    height: 136,
    offsetX: 0,
    offsetY: 0,
    hitArea: {
      x: 0,
      y: 0,
      width: 170,
      height: 136,
    },
    logo: {
      x: 70,
      y: 25,
      width: 29.2,
      height: 16.2,
    },
    usbOn: {
      x: -26.6,
      y: -67,
      width: 220,
      height: 220,
    },
    usbOff: {
      x: -27,
      y: -92.5,
      width: 220,
      height: 220,
    },
    ledMatrix: {
      startX: 60,
      startY: 50,
      spacingX: 12.4,
      spacingY: 12.4,
      ledRadius: 4.2,
    },
    buttons: {
      AB: { x: 150, y: 96 },
      A: { x: 9.2, y: 65.6 },
      B: { x: 137.5, y: 65.6 },
    },
    pins: {
      P0: { x: 18, y: 163 },
      P1: { x: 49.8, y: 163 },
      P2: { x: 86.4, y: 163 },
      V3: { x: 123, y: 163 },
      GND: { x: 155, y: 163 },
    },
    explosion: {
      x: 65,
      y: 90,
      width: 90,
      height: 90,
    },
  },
  blue: {
    width: 220,
    height: 220,
    offsetX: 0,
    offsetY: -25,
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
  };

  // Explosion overlay
  explosion: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
}

const MICROBIT_WITH_BREAKOUT_COORDINATES: MicrobitWithBreakoutCoordinates = {
  width: 226,
  height: 240,
  offsetX: 0,
  offsetY: 0,
  hitArea: {
    x: 16,
    y: 40,
    width: 193,
    height: 145,
  },
  logo: {
    x: 101,
    y: 87.3,
    width: 23.2,
    height: 14,
  },
  usbOn: {
    x: 0,
    y: 0,
    width: 226,
    height: 240,
  },
  usbOff: {
    x: 0,
    y: 0,
    width: 226,
    height: 240,
  },
  ledMatrix: {
    startX: 90,
    startY: 106,
    spacingX: 9.9,
    spacingY: 9.9,
    ledRadius: 3.4,
  },
  buttons: {
    AB: { x: 170, y: 88 },
    A: { x: 41, y: 122 },
    B: { x: 171, y: 122 },
  },
  pins: {
    GND1: { x: 32.3, y: 229.2 },
    GND2: { x: 40.5, y: 229.2 },
    V3: { x: 47.5, y: 229.2 },
    P0: { x: 55.5, y: 229.2 },
    P1: { x: 62.5, y: 229.2 },
    P2: { x: 70, y: 229.2 },
  },
  explosion: {
    x: 71,
    y: 82,
    width: 90,
    height: 90,
  },
};

export function getMicrobitWithBreakoutCoordinates(): MicrobitWithBreakoutCoordinates {
  return MICROBIT_WITH_BREAKOUT_COORDINATES;
}
