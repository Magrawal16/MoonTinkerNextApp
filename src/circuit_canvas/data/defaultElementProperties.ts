// /src/common/data/elements-api.ts
"use client";

import React from "react";
import { PaletteElementType } from "../types/circuit";
import { ReactNode } from "react";
import { SlideSwitchPreview } from "../components/palette/SlideSwitchPreview";
import { ResistorPreview } from "../components/palette/ResistorPreview";

export interface PaletteElement {
  type: PaletteElementType;
  label: string;
  iconPath?: string; // Relative to public/assets
  customIcon?: () => ReactNode; 
  hidden?: boolean; // Hide from palette without removing support
  defaultProps?: {
    resistance?: number;
    voltage?: number;
    ratio?: number;
    temperature?: number;
    tempScale?: "celsius" | "fahrenheit";
    color?: string;
    mode?: "voltage" | "current" | "resistance"; // For multimeters
  };
}

export const ELEMENT_PALETTE: PaletteElement[] = [
  {
    type: "lightbulb",
    label: "Lightbulb",
    iconPath: "assets/circuit_canvas/elements/bulb.svg",
    defaultProps: { resistance: 48 },
  },
  {
    type: "battery",
    label: "Battery",
    iconPath: "assets/circuit_canvas/elements/battery.svg",
    defaultProps: { voltage: 9, resistance: 1.45 },
  },
  {
    type: "cell3v",
    label: "3V Cell",
    iconPath: "assets/circuit_canvas/elements/cell3v.svg",
    defaultProps: { voltage: 3, resistance: 0.8 },
  },
  {
    type: "AA_battery",
    label: "AA Battery",
    iconPath: "assets/circuit_canvas/elements/AA_battery.svg",
    defaultProps: { voltage: 1.5, resistance: 0.3 },
  },
  {
    type: "powersupply",
    label: "Power Supply",
    iconPath: "assets/circuit_canvas/elements/power_supply.svg",
    hidden: true,
    defaultProps: { voltage: 5, resistance: 0.2 },
  },
  {
    type: "resistor",
    label: "Resistor",
    customIcon: () => React.createElement(ResistorPreview),
    iconPath: "assets/circuit_canvas/elements/resistor.svg",
    defaultProps: { resistance: 1000 },
  },
  {
    type: "ldr",
    label: "LDR (Light-dependent resistor)",
    iconPath: "assets/circuit_canvas/elements/LDR.svg",
    defaultProps: { resistance: 10000 },
  },
  {
    type: "lm35",
    label: "LM35 Temperature Sensor",
    iconPath: "assets/circuit_canvas/elements/LM35.svg",
    defaultProps: { temperature: 25, tempScale: "celsius" },
  },
  {
    type: "multimeter",
    label: "Multimeter",
    iconPath: "assets/circuit_canvas/elements/multimeter.svg",
    defaultProps: { mode: "voltage" },
  },
  {
    type: "potentiometer",
    label: "Potentiometer",
    iconPath: "assets/circuit_canvas/elements/potentiometer.svg",
    defaultProps: { resistance: 10000 }, // 10kΩ total resistance (Tinkercad style)
  },
  {
    type: "led",
    label: "Led",
    iconPath: "assets/circuit_canvas/elements/red_led.svg",
    defaultProps: { resistance: 1 },
    //max current 20ma, max voltage 2,
  },
  {
    type: "rgbled",
    label: "RGB LED",
    iconPath: "assets/circuit_canvas/elements/rgb_led.svg",
    defaultProps: { resistance: 1 },
    // RGB LED with common cathode/anode option
    // max current 20mA per channel, forward voltages: Red ~2V, Green ~3V, Blue ~3.2V
  },
  {
    type: "microbit",
    label: "Microbit",
    iconPath: "assets/circuit_canvas/elements/microbit_red.svg",
    defaultProps: { voltage: 3.3, resistance: 0, color: "red" },
  },
  {
    type: "microbitWithBreakout",
    label: "Microbit with Breakout",
    iconPath: "assets/circuit_canvas/elements/microbit_with_breakout_green.svg",
    defaultProps: { voltage: 3.3, resistance: 0 },
  },
  {
    type: "ultrasonicsensor4p",
    label: "Ultra Sonic Sensor 4P",
    iconPath: "assets/circuit_canvas/elements/UltraSonicSensor4P.svg",
    defaultProps: { voltage: 9, resistance: 1 },
  },
  {
    type: "pushbutton",
    label: "Push Button",
    iconPath: "assets/circuit_canvas/elements/PushButton.svg",
    defaultProps: { resistance: 1e9 }, // Very high resistance (open) by default
  },
  {
    type: "slideswitch",
    label: "Slide Switch",
    customIcon: () => React.createElement(SlideSwitchPreview),
    iconPath: "assets/circuit_canvas/elements/SlideSwitch.svg",
    defaultProps: { resistance: 0.01 }, // Low resistance when connected
  },
  {
    type: "buzzer",
    label: "Buzzer",
    iconPath: "assets/circuit_canvas/elements/buzzer.svg",
    defaultProps: { voltage: 5 },
  },
];
