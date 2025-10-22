"use client";
import { useEffect, useState } from "react";
import { BaseElement, BaseElementProps } from "@/circuit_canvas/components/core/BaseElement";
import { Group, Image, Rect, Text } from "react-konva";

interface PowerSupplyProps extends BaseElementProps {
  voltage?: number;  // initial V
  current?: number;  // initial A
  onChange?: (id: string, next: { voltage: number; current: number }) => void;
  isSimulationOn?: boolean;
}

export default function PowerSupply(props: PowerSupplyProps) {
  const [img, setImg] = useState<HTMLImageElement | null>(null);

  const [voltage, setVoltage] = useState(props.voltage ?? 5);
  const [current, setCurrent] = useState(props.current ?? 1);

  useEffect(() => {
    const im = new window.Image();
    im.src = "assets/circuit_canvas/elements/power_supply.svg";
    im.onload = () => setImg(im);
    im.alt = "Power Supply";
  }, []);

  const emit = (v: number, c: number) => props.onChange?.(props.id, { voltage: v, current: c });

  // ----- layout in native SVG coords -----
  const W = 160, H = 130;

  const TRACK_TOP = 28;
  const TRACK_H = 80;
  const TRACK_W = 10;

  const RIGHT_INSET = 12;          // distance from right edge
  const GAP = 12;                  // space between bars
  const BAR2_X = W - RIGHT_INSET - TRACK_W;          // right bar (Current)
  const BAR1_X = BAR2_X - GAP - TRACK_W;             // left bar (Voltage)

  const HANDLE_W = TRACK_W + 6;
  const HANDLE_H = 8;

  // helpers: value <-> y (top=max)
  const valueToY = (val: number, min: number, max: number) => {
    const t = Math.max(0, Math.min(1, (val - min) / (max - min)));
    return TRACK_TOP + TRACK_H - t * TRACK_H - HANDLE_H / 2; // handle's y (top-left)
  };
  const yToValue = (y: number, min: number, max: number) => {
    const clamped = Math.max(TRACK_TOP, Math.min(TRACK_TOP + TRACK_H, y + HANDLE_H / 2));
    const t = 1 - (clamped - TRACK_TOP) / TRACK_H;
    return min + t * (max - min);
  };

  const vHandleY = valueToY(voltage, 0, 30);
  const cHandleY = valueToY(current, 0, 5);

  // click-to-jump helper that uses LOCAL coords (important if BaseElement moves/scales)
  const clickTrackTo = (evt: any, barX: number, setFn: (n: number) => void, min: number, max: number, otherVal: number, isVoltage: boolean) => {
    evt.cancelBubble = true; // prevent BaseElement drag
    const stage = evt.target.getStage();
    if (!stage) return;
    const abs = stage.getPointerPosition(); // stage coordinates
    if (!abs) return;
    // convert to local coords of this Group
    const group = evt.target.getParent(); // the <Group> holding image + bars
    const transform = group.getAbsoluteTransform().copy();
    transform.invert();
    const local = transform.point(abs);
    // local.y is in same space as TRACK_TOP/TRACK_H
    const next = yToValue(local.y - HANDLE_H / 2, min, max);
    if (isVoltage) {
      setFn(next); emit(next, otherVal);
    } else {
      setFn(next); emit(otherVal, next);
    }
  };

  return (
    <BaseElement {...props}>
      <Group>
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
          {/* track */}
          <Rect
            x={BAR1_X}
            y={TRACK_TOP}
            width={TRACK_W}
            height={TRACK_H}
            fill="#e5e7eb"
            stroke="#111"
            strokeWidth={1}
            cornerRadius={TRACK_W / 2}
            onMouseDown={(e) => clickTrackTo(e, BAR1_X, (v) => setVoltage(v), 0, 30, current, true)}
            onTouchStart={(e) => clickTrackTo(e, BAR1_X, (v) => setVoltage(v), 0, 30, current, true)}
          />
          {/* handle */}
          <Rect
            x={BAR1_X - (HANDLE_W - TRACK_W) / 2}
            y={vHandleY}
            width={HANDLE_W}
            height={HANDLE_H}
            fill="#fff"
            stroke="#111"
            strokeWidth={1.5}
            cornerRadius={3}
            draggable
            dragBoundFunc={(pos) => ({
              x: BAR1_X - (HANDLE_W - TRACK_W) / 2,
              y: Math.max(TRACK_TOP - HANDLE_H / 2, Math.min(TRACK_TOP + TRACK_H - HANDLE_H / 2, pos.y)),
            })}
            onMouseDown={(e) => { e.cancelBubble = true; }}   // <— stop parent drag
            onDragStart={(e) => { e.cancelBubble = true; }}   // <— stop parent drag
            onDragMove={(e) => {
              e.cancelBubble = true;
              const nextV = yToValue(e.target.y(), 0, 30);
              setVoltage(nextV);
              emit(nextV, current);
            }}
            onDragEnd={(e) => { e.cancelBubble = true; }}
          />
          <Text
            x={BAR1_X - 20}
            y={TRACK_TOP + TRACK_H + 8}
            width={TRACK_W + 40}
            align="center"
            fontSize={12}
            text={`${voltage.toFixed(1)} V`}
          />
        </Group>

        {/* ======= CURRENT (right bar) ======= */}
        <Group>
          {/* track */}
          <Rect
            x={BAR2_X}
            y={TRACK_TOP}
            width={TRACK_W}
            height={TRACK_H}
            fill="#e5e7eb"
            stroke="#111"
            strokeWidth={1}
            cornerRadius={TRACK_W / 2}
            onMouseDown={(e) => clickTrackTo(e, BAR2_X, (a) => setCurrent(a), 0, 5, voltage, false)}
            onTouchStart={(e) => clickTrackTo(e, BAR2_X, (a) => setCurrent(a), 0, 5, voltage, false)}
          />
          {/* handle */}
          <Rect
            x={BAR2_X - (HANDLE_W - TRACK_W) / 2}
            y={cHandleY}
            width={HANDLE_W}
            height={HANDLE_H}
            fill="#fff"
            stroke="#111"
            strokeWidth={1.5}
            cornerRadius={3}
            draggable
            dragBoundFunc={(pos) => ({
              x: BAR2_X - (HANDLE_W - TRACK_W) / 2,
              y: Math.max(TRACK_TOP - HANDLE_H / 2, Math.min(TRACK_TOP + TRACK_H - HANDLE_H / 2, pos.y)),
            })}
            onMouseDown={(e) => { e.cancelBubble = true; }}
            onDragStart={(e) => { e.cancelBubble = true; }}
            onDragMove={(e) => {
              e.cancelBubble = true;
              const nextA = yToValue(e.target.y(), 0, 5);
              setCurrent(nextA);
              emit(voltage, nextA);
            }}
            onDragEnd={(e) => { e.cancelBubble = true; }}
          />
          <Text
            x={BAR2_X - 20}
            y={TRACK_TOP + TRACK_H + 8}
            width={TRACK_W + 40}
            align="center"
            fontSize={12}
            text={`${current.toFixed(2)} A`}
          />
        </Group>

        {/* optional LCD overlays */}
        {props.isSimulationOn && (
          <>
            <Text x={20} y={40} width={90} align="center" fontSize={14} text={`${voltage.toFixed(2)} V`} />
            <Text x={20} y={86} width={90} align="center" fontSize={14} text={`${current.toFixed(3)} A`} />
          </>
        )}
      </Group>
    </BaseElement>
  );
}
