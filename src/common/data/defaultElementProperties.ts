// /src/common/data/elements-api.ts

import { PaletteElementType } from "../types/circuit";

export interface PaletteElement {
  type: PaletteElementType;
  label: string;
  iconPath: string; // Relative to public/assets
  defaultProps: {
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
    iconPath: "/circuit_elements/bulb-off.svg",
    defaultProps: { resistance: 1 },
  },
  {
    type: "battery",
    label: "Battery",
    iconPath: "/circuit_elements/battery.svg",
    defaultProps: { voltage: 55, resistance: 1 },
  },
  {
    type: "resistor",
    label: "Resistor",
    iconPath: "/circuit_elements/resistor.svg",
    defaultProps: { resistance: 5 },
  },
  {
    type: "multimeter",
    label: "Multimeter",
    iconPath: "/circuit_elements/Multimeter.svg",
    defaultProps: { resistance: 1, mode: "voltage" },
  },
  {
    type: "potentiometer",
    label: "Potentiometer",
    iconPath: "/circuit_elements/potentiometer.svg",
    defaultProps: { resistance: 100, ratio: 0.5 },
  },
  {
    type: "led",
    label: "Led",
    iconPath: "/circuit_elements/led.svg",
    defaultProps: { resistance: 1 },
  },
  {
    type: "microbit",
    label: "Microbit",
    iconPath: "/circuit_elements/microbit.svg",
    defaultProps: { resistance: 1 },
  },
];
