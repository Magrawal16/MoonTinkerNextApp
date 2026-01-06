"use client";
import { useEffect, useState, useCallback } from "react";
import { BaseElement, BaseElementProps } from "@/circuit_canvas/components/core/BaseElement";
import { Group, Image, Rect, Text, Circle } from "react-konva";

interface PowerSupplyProps extends BaseElementProps {
  vSet?: number;        // voltage setpoint (0-30V)
  iLimit?: number;      // current limit (0-5A)
  isOn?: boolean;       // bench supply ON/OFF state
  isSimulationOn?: boolean; // disable interaction when simulation off
  vMeasured?: number;   // solver-measured output voltage
  iMeasured?: number;   // solver-measured output current
  supplyMode?: "VC" | "CC"; // solver-determined operating mode
  onSettingsChange?: (id: string, settings: {
    vSet: number;
    iLimit: number;
    isOn: boolean;
  }) => void;
}

export default function PowerSupply(props: PowerSupplyProps) {
  const [img, setImg] = useState<HTMLImageElement | null>(null);

  // User-adjustable settings
  const [vSet, setVSet] = useState(props.vSet ?? 5);        // Voltage knob setting
  const [iLimit, setILimit] = useState(props.iLimit ?? 1);  // Current knob setting
  const [isOn, setIsOn] = useState(props.isOn ?? false);    // ON/OFF switch

  // Display uses solver values; no internal electrical simulation

  useEffect(() => {
    const im = new window.Image();
    im.src = "assets/circuit_canvas/elements/power_supply.svg";
    im.onload = () => setImg(im);
    im.alt = "Power Supply";
  }, []);

  // Notify parent when user adjusts settings
  const handleSettingsChange = useCallback(
    (newVSet: number, newILimit: number, newIsOn: boolean) => {
      props.onSettingsChange?.(props.id, {
        vSet: newVSet,
        iLimit: newILimit,
        isOn: newIsOn,
      });
    },
    [props]
  );

  // Ensure power supply turns OFF when simulation stops
  useEffect(() => {
    if (!props.isSimulationOn && isOn) {
      setIsOn(false);
      handleSettingsChange(vSet, iLimit, false);
    }
  }, [props.isSimulationOn, isOn, vSet, iLimit, handleSettingsChange]);

  // Handle voltage knob change
  const handleVoltageChange = (newVSet: number) => {
    if (!props.isSimulationOn || !isOn) return;
    setVSet(newVSet);
    handleSettingsChange(newVSet, iLimit, isOn);
  };

  // Handle current knob change
  const handleCurrentChange = (newILimit: number) => {
    if (!props.isSimulationOn || !isOn) return;
    setILimit(newILimit);
    handleSettingsChange(vSet, newILimit, isOn);
  };

  // Handle ON/OFF switch
  const handlePowerToggle = () => {
    if (!props.isSimulationOn) return;
    const newIsOn = !isOn;
    setIsOn(newIsOn);
    handleSettingsChange(vSet, iLimit, newIsOn);
  };

  const emit = (v: number, c: number) => {
    handleVoltageChange(v);
    handleCurrentChange(c);
  };

  // ----- layout in native SVG coords -----
  const W = 160, H = 130;

  const TRACK_TOP = 30;      // top of the visual bar
  const TRACK_H = 68;        // height of the visual bar
  const TRACK_W = 8;

  const RIGHT_INSET = 14;          // distance from right edge
  const GAP = 14;                  // space between bars
  const BAR2_X = W - RIGHT_INSET - TRACK_W;          // right bar (Current)
  const BAR1_X = BAR2_X - GAP - TRACK_W;             // left bar (Voltage)

  const HANDLE_W = TRACK_W + 8;
  const HANDLE_H = 10;

  // helpers: value <-> y (top=max) and keep handle fully on the track
  const valueToY = (val: number, min: number, max: number) => {
    const t = Math.max(0, Math.min(1, (val - min) / (max - min)));
    // when t = 0 -> bottom of track, when t = 1 -> top of track
    const topY = TRACK_TOP;
    const bottomY = TRACK_TOP + TRACK_H - HANDLE_H;
    return bottomY - t * (bottomY - topY); // handle's y (top-left)
  };
  const yToValue = (y: number, min: number, max: number) => {
    const topY = TRACK_TOP;
    const bottomY = TRACK_TOP + TRACK_H - HANDLE_H;
    const clamped = Math.max(topY, Math.min(bottomY, y));
    const t = (bottomY - clamped) / (bottomY - topY);
    return min + t * (max - min);
  };

  const vHandleY = valueToY(vSet, 0, 30);
  const cHandleY = valueToY(iLimit, 0, 5);

  // click-to-jump helper that uses LOCAL coords (important if BaseElement moves/scales)
  const clickTrackTo = (evt: any, min: number, max: number, otherVal: number, isVoltage: boolean) => {
    evt.cancelBubble = true; // prevent BaseElement drag
    const stage = evt.target.getStage();
    if (!stage) return;
    const pos = stage.getPointerPosition();
    if (!pos) return;
    
    // Get the parent group's transform to convert stage coords to local coords
    const group = evt.target.getParent();
    const transform = group.getAbsoluteTransform().copy();
    transform.invert();
    const localPos = transform.point(pos);
    
    // Calculate value based on local Y position
    const next = yToValue(localPos.y, min, max);
    if (isVoltage) {
      handleVoltageChange(next);
    } else {
      handleCurrentChange(next);
    }
  };

  return (
    <BaseElement {...props}>
      <Group draggable={false} name="powerSupplyContent">
        {img && (
          <Image
            image={img}
            width={W}
            height={H}
            shadowColor={props.selected ? "#000000" : undefined}
            shadowBlur={props.selected ? 10 : 0}
            shadowOffset={{ x: 15, y: -15 }}
            shadowOpacity={0}
          />
        )}

        {/* ======= VOLTAGE (left bar) ======= */}
        <Group>
          {/* track - only interactive when simulation + power are ON */}
          <Rect
            x={BAR1_X}
            y={TRACK_TOP}
            width={TRACK_W}
            height={TRACK_H}
            fill="#d1d5db"
            stroke="#374151"
            strokeWidth={0.5}
            cornerRadius={TRACK_W / 2}
            listening={true}
            onMouseDown={(e) => {
              if (!props.isSimulationOn || !isOn) return;
              clickTrackTo(e, 0, 30, iLimit, true);
            }}
            onTouchStart={(e) => {
              if (!props.isSimulationOn || !isOn) return;
              clickTrackTo(e, 0, 30, iLimit, true);
            }}
          />
          {/* handle */}
          <Rect
            x={BAR1_X - (HANDLE_W - TRACK_W) / 2}
            y={vHandleY}
            width={HANDLE_W}
            height={HANDLE_H}
            fill="#ffffff"
            stroke="#1f2937"
            strokeWidth={1}
            cornerRadius={2}
            draggable={!!props.isSimulationOn && isOn}
            dragBoundFunc={function(pos) {
              if (!props.isSimulationOn || !isOn) return { x: this.x(), y: this.y() };

              const node = this;
              const stage = node.getStage();
              if (!stage) return pos;

              const contentGroup = node.getParent()?.getParent();
              if (!contentGroup) return pos;

              const transform = contentGroup.getAbsoluteTransform().copy();
              transform.invert();

              const localPos = transform.point(pos);

              const constrainedLocal = {
                x: BAR1_X - (HANDLE_W - TRACK_W) / 2,
                y: Math.max(TRACK_TOP, Math.min(TRACK_TOP + TRACK_H - HANDLE_H, localPos.y)),
              };

              const absTransform = contentGroup.getAbsoluteTransform();
              return absTransform.point(constrainedLocal);
            }}
            onMouseDown={(e) => { 
              if (!props.isSimulationOn || !isOn) return;
              e.cancelBubble = true;
            }}
            onDragStart={(e) => { 
              if (!props.isSimulationOn || !isOn) return;
              e.cancelBubble = true;
            }}
            onDragMove={(e) => {
              if (!props.isSimulationOn || !isOn) return;
              e.cancelBubble = true;
              const nextV = yToValue(e.target.y(), 0, 30);
              handleVoltageChange(nextV);
            }}
            onDragEnd={(e) => { 
              if (!props.isSimulationOn || !isOn) return;
              e.cancelBubble = true;
            }}
          />
        </Group>

        {/* ======= CURRENT (right bar) ======= */}
        <Group>
          {/* track - only interactive when simulation + power are ON */}
          <Rect
            x={BAR2_X}
            y={TRACK_TOP}
            width={TRACK_W}
            height={TRACK_H}
            fill="#d1d5db"
            stroke="#374151"
            strokeWidth={0.5}
            cornerRadius={TRACK_W / 2}
            listening={true}
            onMouseDown={(e) => {
              if (!props.isSimulationOn || !isOn) return;
              clickTrackTo(e, 0, 5, vSet, false);
            }}
            onTouchStart={(e) => {
              if (!props.isSimulationOn || !isOn) return;
              clickTrackTo(e, 0, 5, vSet, false);
            }}
          />
          {/* handle */}
          <Rect
            x={BAR2_X - (HANDLE_W - TRACK_W) / 2}
            y={cHandleY}
            width={HANDLE_W}
            height={HANDLE_H}
            fill="#ffffff"
            stroke="#1f2937"
            strokeWidth={1}
            cornerRadius={2}
            draggable={!!props.isSimulationOn && isOn}
            dragBoundFunc={function(pos) {
              if (!props.isSimulationOn || !isOn) return { x: this.x(), y: this.y() };

              const node = this;
              const stage = node.getStage();
              if (!stage) return pos;

              const contentGroup = node.getParent()?.getParent();
              if (!contentGroup) return pos;

              const transform = contentGroup.getAbsoluteTransform().copy();
              transform.invert();

              const localPos = transform.point(pos);

              const constrainedLocal = {
                x: BAR2_X - (HANDLE_W - TRACK_W) / 2,
                y: Math.max(TRACK_TOP, Math.min(TRACK_TOP + TRACK_H - HANDLE_H, localPos.y)),
              };

              const absTransform = contentGroup.getAbsoluteTransform();
              return absTransform.point(constrainedLocal);
            }}
            onMouseDown={(e) => { 
              if (!props.isSimulationOn || !isOn) return;
              e.cancelBubble = true;
            }}
            onDragStart={(e) => { 
              if (!props.isSimulationOn || !isOn) return;
              e.cancelBubble = true;
            }}
            onDragMove={(e) => {
              if (!props.isSimulationOn || !isOn) return;
              e.cancelBubble = true;
              const nextA = yToValue(e.target.y(), 0, 5);
              handleCurrentChange(nextA);
            }}
            onDragEnd={(e) => { 
              if (!props.isSimulationOn || !isOn) return;
              e.cancelBubble = true;
            }}
          />
        </Group>

        {/* Digital Display - Show settings only when simulation + power ON */}
        {props.isSimulationOn && isOn && (
          <>
            {/* Upper LCD - Voltage Setting */}
            <Text 
              x={18} 
              y={34} 
              width={100} 
              align="center" 
              fontSize={14} 
              fontFamily="Arial, monospace"
              fontStyle="bold"
              fill="#000000"
              text={`${(props.vMeasured ?? 0).toFixed(1)} V`} 
            />
            {/* Lower LCD - Current Setting */}
            <Text 
              x={18} 
              y={82} 
              width={100} 
              align="center" 
              fontSize={14} 
              fontFamily="Arial, monospace"
              fontStyle="bold"
              fill="#000000"
              text={`${(props.iMeasured ?? 0).toFixed(2)} A`} 
            />
            {/* Mode indicator (VC/CC) */}
            <Text
              x={80}
              y={10}
              width={100}
              align="center"
              fontSize={12}
              fontFamily="Arial, monospace"
              fill="#374151"
              text={`${props.supplyMode ?? "VC"}`}
            />
          </>
        )}

        {/* Output Display - Bottom right shows actual V_out and I_out only when simulation + power ON */}
        {/* {props.isSimulationOn && isOn && (
          <Text
            x={W - 7}
            y={H - 20}
            fontSize={11}
            fontFamily="Arial, monospace"
            fill="#1f2937"
            text={`${vOut.toFixed(1)}V ${iOut.toFixed(2)}A`}
          />
        )} */}

        {/* Mode Indicator removed from UI per latest design */}

        {/* ON/OFF toggle switch near positive terminal */}
        <Group
          x={12}
          y={110}
          onClick={handlePowerToggle}
          onTap={handlePowerToggle}
        >
          {/* Track */}
          <Rect
            x={0}
            y={0}
            width={29}
            height={12}
            fill={isOn ? "#10b981" : "#9ca3af"}
            cornerRadius={6}
          />
          {/* Knob */}
          <Circle
            x={isOn ? 23 : 6}
            y={6}
            radius={5}
            fill="#f9fafb"
            stroke="#111827"
            strokeWidth={0.5}
          />
        </Group>
      </Group>
    </BaseElement>
  );
}
