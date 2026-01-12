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
      AB: { x: 142, y: 24.7 },
      A: { x: 9.5, y: 60 },
      B: { x: 141, y: 60 },
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
    width: 245,
    height: 235,
    offsetX: 0,
    offsetY: 0,
    hitArea: {
      x: 16,
      y: 40,
      width: 226,
      height: 240,
    },
    logo: {
      x: 109.5,
      y: 23.5,
      width: 24.5,
      height: 14.7,
      strokeWidth: 4.4,
    },
    usbOn: {
      x: 11.6,
      y: -72.5,
      width: 220,
      height: 220,
    },
    usbOff: {
      x: 11.6,
      y: -96,
      width: 220,
      height: 220,
    },
    ledMatrix: {
      startX: 96,
      startY: 55,
      spacingX: 13,
      spacingY: 12,
      ledRadius: 3.4,
    },
    buttons: {
      AB: { x: 175.4, y: 20 },
      A: { x: 43.6, y: 64.5 },
      B: { x: 177, y: 64.5 },
    },
    pins: {
      GND1: { x: 34.8, y: 246 },
      GND2: { x: 42.8, y: 246 },
      V3: { x: 51.5, y: 246 },
      P0: { x: 60, y: 246 },
      P1: { x: 68, y: 246 },
      P2: { x: 76.5, y: 246 },
      P3: { x: 84.2, y: 246 },
      P4: { x: 92.8, y: 246 },
      P5: { x: 100.8, y: 246 },
      P6: { x: 109.5, y: 246 },
      P7: { x: 117.5, y: 246 },
      P8: { x: 126, y: 246 },
      P9: { x: 134.4, y: 246 },
      P10: { x: 142.8, y: 246 },
      P11: { x: 151, y: 246 },
      P12: { x: 159.4, y: 246 },
      P13: { x: 167.5, y: 246 },
      P14: { x: 175.8, y: 246 },
      P15: { x: 184, y: 246 },
      P16: { x: 192.5, y: 246 },
      P19: { x: 200.6, y: 246 },
      P20: { x: 209, y: 246 },
    },
    explosion: {
      x: 75,
      y: 30,
      width: 90,
      height: 90,
    },
    versionText: {
      x: 195,
      y: 112,
      fontSize: 6,
      color: "#FFFFFF",
    },
  },
  yellow: {
    width: 243,
    height: 236,
    offsetX: 0,
    offsetY: 0,
    hitArea: {
      x: 16,
      y: 40,
      width: 226,
      height: 240,
    },
    logo: {
      x: 110,
      y: 23.5,
      width: 24.5,
      height: 14.7,
      strokeWidth: 4.4,
    },
    usbOn: {
      x: 12.2,
      y: -72.5,
      width: 220,
      height: 220,
    },
    usbOff: {
      x: 11.6,
      y: -96,
      width: 220,
      height: 220,
    },
    ledMatrix: {
      startX: 96,
      startY: 55,
      spacingX: 13,
      spacingY: 12,
      ledRadius: 3.4,
    },
    buttons: {
      AB: { x: 176, y: 20 },
      A: { x: 44.2, y: 64.2 },
      B: { x: 177.4, y: 64.2 },
    },
    pins: {
      GND1: { x: 35.5, y: 245.5 },
      GND2: { x: 43.5, y: 245.5 },
      V3: { x: 52.3, y: 245.5 },
      P0: { x: 60.5, y: 245.5 },
      P1: { x: 68.8, y: 245.5 },
      P2: { x: 77, y: 245.5 },
      P3: { x: 85, y: 245.5 },
      P4: { x: 93.3, y: 245.5 },
      P5: { x: 101.6, y: 245.5 },
      P6: { x: 110.3, y: 245.5 },
      P7: { x: 118.3, y: 245.5 },
      P8: { x: 126.8, y: 245.5 },
      P9: { x: 135.2, y: 245.5 },
      P10: { x: 143, y: 245.5 },
      P11: { x: 151.5, y: 245.5 },
      P12: { x: 159.8, y: 245.5 },
      P13: { x: 168, y: 245.5 },
      P14: { x: 176.2, y: 245.5 },
      P15: { x: 184.2, y: 245.5 },
      P16: { x: 193, y: 245.5 },
      P19: { x: 201, y: 245.5 },
      P20: { x: 209.8, y: 245.5 },
    },
    explosion: {
      x: 75,
      y: 30,
      width: 90,
      height: 90,
    },
    versionText: {
      x: 195,
      y: 112,
      fontSize: 6,
      color: "#FFFFFF",
    },
  },
  green: {
    width: 244,
    height: 239,
    offsetX: 0,
    offsetY: 0,
    hitArea: {
      x: 16,
      y: 40,
      width: 226,
      height: 240,
    },
    logo: {
      x: 110.5,
      y: 26,
      width: 24.5,
      height: 14.7,
      strokeWidth: 4.4,
    },
    usbOn: {
      x: 12.5,
      y: -72.5,
      width: 220,
      height: 220,
    },
    usbOff: {
      x: 11.6,
      y: -96,
      width: 220,
      height: 220,
    },
    ledMatrix: {
      startX: 96,
      startY: 55,
      spacingX: 13,
      spacingY: 12,
      ledRadius: 3.4,
    },
    buttons: {
      AB: { x: 175.6, y: 22.5 },
      A: { x: 45.2, y: 66.5 },
      B: { x: 177, y: 66.5 },
    },
    pins: {
      GND1: { x: 36.5, y: 246.5 },
      GND2: { x: 44.5, y: 246.5 },
      V3: { x: 53, y: 246.5 },
      P0: { x: 61, y: 246.5 },
      P1: { x: 69.6, y: 246.5 },
      P2: { x: 77.4, y: 246.5 },
      P3: { x: 85.6, y: 246.5 },
      P4: { x: 94, y: 246.5 },
      P5: { x: 102, y: 246.5 },
      P6: { x: 110.7, y: 246.5 },
      P7: { x: 118.8, y: 246.5 },
      P8: { x: 126.8, y: 246.5 },
      P9: { x: 135.2, y: 246.5 },
      P10: { x: 143, y: 246.5 },
      P11: { x: 151.5, y: 246.5 },
      P12: { x: 159.8, y: 246.5 },
      P13: { x: 168, y: 246.5 },
      P14: { x: 176.2, y: 246.5 },
      P15: { x: 184.2, y: 246.5 },
      P16: { x: 192.7, y: 246.5 },
      P19: { x: 200.8, y: 246.5 },
      P20: { x: 209.2, y: 246.5 },
    },
    explosion: {
      x: 75,
      y: 30,
      width: 90,
      height: 90,
    },
    versionText: {
      x: 195,
      y: 112,
      fontSize: 6,
      color: "#FFFFFF",
    },
  },
  blue: {
    width: 244,
    height: 239,
    offsetX: 0,
    offsetY: 0,
    hitArea: {
      x: 16,
      y: 40,
      width: 226,
      height: 240,
    },
    logo: {
      x: 110.5,
      y: 25,
      width: 24.5,
      height: 14.7,
      strokeWidth: 4.4,
    },
    usbOn: {
      x: 12.7,
      y: -72.5,
      width: 220,
      height: 220,
    },
    usbOff: {
      x: 11.6,
      y: -96,
      width: 220,
      height: 220,
    },
    ledMatrix: {
      startX: 96,
      startY: 55,
      spacingX: 13,
      spacingY: 12,
      ledRadius: 3.4,
    },
    buttons: {
      AB: { x: 177.4, y: 21.8 },
      A: { x: 44, y: 66 },
      B: { x: 178.5, y: 66 },
    },
    pins: {
      GND1: { x: 35, y: 247.5 },
      GND2: { x: 43, y: 247.5 },
      V3: { x: 51.5, y: 247.5 },
      P0: { x: 59.8, y: 247.5 },
      P1: { x: 68.5, y: 247.5 },
      P2: { x: 76.8, y: 247.5 },
      P3: { x: 84.8, y: 247.5 },
      P4: { x: 93.2, y: 247.5 },
      P5: { x: 101.8, y: 247.5 },
      P6: { x: 110.5, y: 247.5 },
      P7: { x: 118.5, y: 247.5 },
      P8: { x: 126.5, y: 247.5 },
      P9: { x: 135.5, y: 247.5 },
      P10: { x: 143.5, y: 247.5 },
      P11: { x: 152, y: 247.5 },
      P12: { x: 161, y: 247.5 },
      P13: { x: 169, y: 247.5 },
      P14: { x: 177.5, y: 247.5 },
      P15: { x: 186, y: 247.5 },
      P16: { x: 194, y: 247.5 },
      P19: { x: 203, y: 247.5 },
      P20: { x: 211, y: 247.5 },
    },
    explosion: {
      x: 75,
      y: 30,
      width: 90,
      height: 90,
    },
    versionText: {
      x: 195,
      y: 112,
      fontSize: 6,
      color: "#FFFFFF",
    },
  },
};

export function getMicrobitWithBreakoutCoordinates(color?: string): MicrobitWithBreakoutCoordinates {
  const normalizedColor = (color ?? "green").toLowerCase() as MicrobitColor;
  return MICROBIT_WITH_BREAKOUT_COORDINATES[normalizedColor] || MICROBIT_WITH_BREAKOUT_COORDINATES.green;
}
