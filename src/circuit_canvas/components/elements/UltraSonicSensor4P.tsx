"use client";

import React, { useEffect, useState, useMemo, useCallback } from "react";
import { Image, Group, Arc, Circle, Line, Text } from "react-konva";
import {
  BaseElement,
  BaseElementProps,
} from "@/circuit_canvas/components/core/BaseElement";
import Konva from "konva";

const SENSOR_IMG_WIDTH = 230;
const SENSOR_IMG_HEIGHT = 130;
const SENSOR_X = SENSOR_IMG_WIDTH / 2.1;
const SENSOR_Y = -25;
const EYE_OFFSET_X = 37;
const EYE_RADIUS = 18;
const RANGE_RADIUS = 153.1;
const RANGE_ANGLE = 45;
const BALL_RADIUS = 8;

interface BallPosition {
  x: number;
  y: number;
}

interface UltraSonicSensor4PProps extends BaseElementProps {
  isSimulation?: boolean;
  pins?: { trig?: string; echo?: string };
  simulator?: any; // The connected MicrobitSimulator
}

export default function UltraSonicSensor4P(props: UltraSonicSensor4PProps) {
  const [img, setImg] = useState<HTMLImageElement | null>(null);
  const [ball, setBall] = useState<BallPosition>({
    x: SENSOR_X,
    y: SENSOR_Y - 30,
  });
  const [triggered, setTriggered] = useState(false);
  const [echoTime, setEchoTime] = useState<number | null>(null);
  const [lastTriggerTime, setLastTriggerTime] = useState<number | null>(null);
  const [debugInfo, setDebugInfo] = useState<string>("No simulator");

  useEffect(() => {
    const image = new window.Image();
    image.src = "assets/circuit_canvas/elements/UltraSonicSensor4P.svg";
    image.onload = () => setImg(image);
    image.alt = "UltraSonicSensor4P";
  }, []);

  const leftEye = { x: SENSOR_X - EYE_OFFSET_X - 10, y: SENSOR_Y + 40 };
  const rightEye = { x: SENSOR_X + EYE_OFFSET_X + 10, y: SENSOR_Y + 40 };

  const dx = ball.x - SENSOR_X;
  const dy = SENSOR_Y - ball.y;
  const distance = useMemo(() => Math.sqrt(dx * dx + dy * dy), [dx, dy]);

  const angleRad = useMemo(() => Math.atan2(dx, dy), [dx, dy]);
  const angleDeg = useMemo(() => (angleRad * 180) / Math.PI, [angleRad]);

  const ballInRange =
    distance >= EYE_RADIUS &&
    distance <= RANGE_RADIUS &&
    Math.abs(angleDeg) <= RANGE_ANGLE;

  // Convert pixel distance to actual cm (adjust this scaling factor as needed)
  const distanceCm = useMemo(() => distance * 0.2, [distance]); // 1 pixel = 0.2 cm

  // Get the actual MicrobitSimulator instance
  const getMicrobitSimulator = useCallback(() => {
    if (!props.simulator) return null;
    
    // Try to get the actual MicrobitSimulator instance
    // It might be wrapped in a SimulatorProxy
    if (props.simulator.getMicrobitInstance) {
      return props.simulator.getMicrobitInstance();
    }
    
    // Or it might be directly available
    if (props.simulator.microbit) {
      return props.simulator.microbit;
    }
    
    return null;
  }, [props.simulator]);

  // Simulate ultrasonic measurement
  const startMeasurement = useCallback(() => {
    console.log("[UltraSonicSensor] startMeasurement called", {
      triggered,
      simulator: !!props.simulator,
      ballInRange,
      distanceCm,
    });

    if (triggered) {
      console.log("[UltraSonicSensor] Already triggered, skipping");
      return;
    }

    const microbitSim = getMicrobitSimulator();
    if (!microbitSim) {
      console.log("[UltraSonicSensor] No microbit simulator, skipping");
      return;
    }

    setTriggered(true);
    const triggerTime = Date.now() * 1000; // Convert to microseconds
    setLastTriggerTime(triggerTime);

    if (!ballInRange) {
      // Out of range - no echo
      console.log("[UltraSonicSensor] Ball out of range, no echo");
      setEchoTime(null);
      setTriggered(false);
      return;
    }

    // Calculate echo time based on distance
    // Speed of sound = 343 m/s = 0.0343 cm/µs
    // Round trip time = (2 * distance) / speed
    const calculatedEchoTime = (2 * distanceCm) / 0.0343; // in microseconds
    setEchoTime(calculatedEchoTime);

    console.log(
      "[UltraSonicSensor] Calculated echo time:",
      calculatedEchoTime,
      "µs for distance:",
      distanceCm,
      "cm"
    );

    // Simulate echo pin behavior
    if (props.pins?.echo) {
      console.log("[UltraSonicSensor] Setting echo pin HIGH:", props.pins.echo);
      
      // Set echo pin HIGH
      microbitSim.setExternalPinValue(props.pins.echo, 1, 'digital');

      // Set echo pin LOW after the calculated time
      const timeoutMs = Math.max(1, calculatedEchoTime / 1000); // Convert µs to ms, minimum 1ms
      console.log(
        "[UltraSonicSensor] Will set echo pin LOW after",
        timeoutMs,
        "ms"
      );

      setTimeout(() => {
        if (props.pins?.echo) {
          console.log(
            "[UltraSonicSensor] Setting echo pin LOW:",
            props.pins.echo
          );
          microbitSim.setExternalPinValue(props.pins.echo, 0, 'digital');
        }
        setTriggered(false);
      }, timeoutMs);
    } else {
      console.log("[UltraSonicSensor] No echo pin configured");
      setTriggered(false);
    }
  }, [triggered, props.pins?.echo, ballInRange, distanceCm, getMicrobitSimulator]);

  // Monitor trigger pin for changes
  useEffect(() => {
    if (!props.pins?.trig || !props.simulator || !props.isSimulation) {
      console.log("[UltraSonicSensor] Monitoring disabled:", {
        trigPin: props.pins?.trig,
        simulator: !!props.simulator,
        isSimulation: props.isSimulation,
      });
      return;
    }

    const microbitSim = getMicrobitSimulator();
    if (!microbitSim) {
      console.log("[UltraSonicSensor] No microbit simulator found");
      return;
    }

    console.log(
      "[UltraSonicSensor] Setting up trigger pin monitoring for:",
      props.pins.trig
    );

    let lastValue = 0;
    
    // Try to register a callback for pin changes
    if (microbitSim.pins && microbitSim.pins.onDigitalWrite) {
      console.log("[UltraSonicSensor] Registering callback for trigger pin");
      
      const unsubscribe = microbitSim.pins.onDigitalWrite(
        props.pins.trig,
        (value: number) => {
          console.log(
            "[UltraSonicSensor] Trigger pin change:",
            lastValue,
            "->",
            value
          );
          // Detect rising edge
          if (lastValue === 0 && value === 1) {
            console.log("[UltraSonicSensor] Rising edge detected!");
            startMeasurement();
          }
          lastValue = value;
        }
      );

      return unsubscribe;
    } else {
      // Fallback to polling
      console.log("[UltraSonicSensor] Using polling for trigger pin");
      
      const intervalId = setInterval(() => {
        if (!props.pins?.trig) return;
        
        try {
          const currentValue = microbitSim.pins?.digital_read_pin?.(props.pins.trig) || 0;
          
          // Detect rising edge (0 → 1)
          if (lastValue === 0 && currentValue === 1) {
            console.log(
              "[UltraSonicSensor] Trigger rising edge detected via polling!",
              `${lastValue} -> ${currentValue}`
            );
            startMeasurement();
          }
          
          lastValue = currentValue;
        } catch (error) {
          console.error("[UltraSonicSensor] Error reading trigger pin:", error);
        }
      }, 10); // Check every 10ms
      
      return () => clearInterval(intervalId);
    }
  }, [props.pins?.trig, props.simulator, props.isSimulation, startMeasurement, getMicrobitSimulator]);

  // Debug info
  useEffect(() => {
    const microbitSim = getMicrobitSimulator();
    
    if (microbitSim) {
      let info = "Connected: ";
      
      if (microbitSim.pins) {
        info += "MicrobitSimulator with pins";
      } else {
        info += "MicrobitSimulator (no pins)";
      }
      
      info += ` | TRIG: ${props.pins?.trig || 'none'} ECHO: ${props.pins?.echo || 'none'}`;
      setDebugInfo(info);
    } else {
      setDebugInfo("No microbit simulator connected");
    }
  }, [props.simulator, props.pins?.trig, props.pins?.echo, getMicrobitSimulator]);

  const onDragMove = (e: Konva.KonvaEventObject<DragEvent>) => {
    let x = e.target.x();
    let y = e.target.y();
    const dx = x - SENSOR_X;
    const dy = y - SENSOR_Y;
    let dist = Math.sqrt(dx * dx + dy * dy);
    if (dist > RANGE_RADIUS) {
      const angle = Math.atan2(dy, dx);
      x = SENSOR_X + RANGE_RADIUS * Math.cos(angle);
      y = SENSOR_Y + RANGE_RADIUS * Math.sin(angle);
      e.target.position({ x, y });
      dist = RANGE_RADIUS;
    }
    setBall({ x, y });
  };

  const stopBubble = (e: any) => {
    e.cancelBubble = true;
  };

  return (
    <BaseElement {...props}>
      {img && (
        <Group>
          <Image
            image={img}
            width={SENSOR_IMG_WIDTH}
            height={SENSOR_IMG_HEIGHT}
          />

          {props.isSimulation && props.selected && (
            <>
              <Arc
                x={SENSOR_X}
                y={SENSOR_Y}
                innerRadius={EYE_RADIUS}
                outerRadius={RANGE_RADIUS}
                angle={RANGE_ANGLE * 2}
                rotation={225}
                fill={ballInRange ? "rgba(0,255,0,0.3)" : "rgba(255,0,0,0.3)"}
                stroke={ballInRange ? "green" : "red"}
                strokeWidth={2}
              />

              <Line
                points={[leftEye.x, leftEye.y, ball.x, ball.y]}
                stroke="#888"
                strokeWidth={2}
                dash={[8, 8]}
              />
              <Line
                points={[rightEye.x, rightEye.y, ball.x, ball.y]}
                stroke="#888"
                strokeWidth={2}
                dash={[8, 8]}
              />

              <Text
                x={ball.x - 55}
                y={ball.y - BALL_RADIUS - 28}
                text={`${distanceCm.toFixed(1)} cm`}
                fontSize={18}
                fill="#0684aa"
              />

              <Circle
                x={ball.x}
                y={ball.y}
                radius={BALL_RADIUS}
                fill="blue"
                draggable
                onMouseDown={stopBubble}
                onDragStart={stopBubble}
                onDragMove={onDragMove}
              />

              <Text
                x={10}
                y={SENSOR_IMG_HEIGHT + 10}
                fontSize={14}
                fill="#555"
                text={`Echo time: ${
                  echoTime ? echoTime.toFixed(0) + " µs" : "N/A"
                }`}
              />

              <Text
                x={10}
                y={SENSOR_IMG_HEIGHT + 30}
                fontSize={12}
                fill="#666"
                text={`Status: ${triggered ? "Measuring..." : "Ready"}`}
              />

              <Text
                x={10}
                y={SENSOR_IMG_HEIGHT + 50}
                fontSize={10}
                fill="#999"
                text={debugInfo}
              />

              {!ballInRange && (
                <Text
                  x={SENSOR_X - 50}
                  y={SENSOR_Y + SENSOR_IMG_HEIGHT - 320}
                  fontSize={16}
                  fill="red"
                  text="Out of range"
                />
              )}
            </>
          )}
        </Group>
      )}
    </BaseElement>
  );
}