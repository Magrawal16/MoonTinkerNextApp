// /src/common/data/elements-api.ts

import { PaletteElementType } from "../types/circuit";

export interface PaletteElement {
  type: PaletteElementType;
  label: string;
  iconPath: string; // Relative to public/assets
  defaultProps?: {
    resistance?: number;
    voltage?: number;
    ratio?: number;
    mode?: "voltage" | "current"; // For multimeters
  };
}

export const ELEMENT_PALETTE: PaletteElement[] = [
  {
    type: "lightbulb",
    label: "Lightbulb",
    iconPath: "assets/circuit_canvas/elements/bulb.svg",
    defaultProps: { resistance: 81 },
  },
  {
    type: "battery",
    label: "Battery",
    iconPath: "assets/circuit_canvas/elements/battery.svg",
    defaultProps: { voltage: 9, resistance: 1 },
  },
  {
    type: "resistor",
    label: "Resistor",
    iconPath: "assets/circuit_canvas/elements/resistor_5ohm.svg",
    defaultProps: { resistance: 5 },
  },
  {
    type: "multimeter",
    label: "Multimeter",
    iconPath: "assets/circuit_canvas/elements/Multimeter.svg",
    defaultProps: { mode: "voltage" },
  },
  {
    type: "potentiometer",
    label: "Potentiometer",
    iconPath: "assets/circuit_canvas/elements/potentiometer.svg",
    defaultProps: { resistance: 100, ratio: 0.5 },
  },
  {
    type: "led",
    label: "Led",
    iconPath: "assets/circuit_canvas/elements/red_led.svg",
    defaultProps: { resistance: 1 },
    //max current 20ma, max voltage 2,
  },
  {
    type: "microbit",
    label: "Microbit",
    iconPath: "assets/circuit_canvas/elements/microbit.svg",
    defaultProps: { voltage: 3.3, resistance: 0 },
  },
  {
    type: "microbitWithBreakout",
    label: "Microbit with Breakout",
    iconPath: "assets/circuit_canvas/elements/microbit_with_breakout.svg",
    defaultProps: { voltage: 3.3, resistance: 0 },
  },
  {
    type: "ultrasonicsensor4p",
    label: "Ultra Sonic Sensor 4P",
    iconPath: "assets/circuit_canvas/elements/UltraSonicSensor4P.svg",
    defaultProps: { voltage: 9, resistance: 1 },
  },
];
