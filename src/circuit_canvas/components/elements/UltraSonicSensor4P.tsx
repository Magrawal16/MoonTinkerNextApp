import React, { useEffect, useState, useMemo } from "react";
import { Image, Group, Arc, Circle, Line, Text } from "react-konva";
import {
  BaseElement,
  BaseElementProps,
} from "@/circuit_canvas/components/core/BaseElement";
import Konva from "konva";

// Sensor and UI constants
const SENSOR_IMG_WIDTH = 230;
const SENSOR_IMG_HEIGHT = 130;
const SENSOR_X = SENSOR_IMG_WIDTH / 2.1; // Horizontal center
const SENSOR_Y = -25; // Sensor face Y (adjust for your image asset)
const EYE_OFFSET_X = 37; // Offset from center for sensor eyes
const EYE_RADIUS = 18;
const RANGE_RADIUS = 153.1; // Range radius in "cm"
const RANGE_ANGLE = 45; // 45° either side (90° spread)
const BALL_RADIUS = 8;

interface BallPosition {
  x: number;
  y: number;
}

interface UltraSonicSensor4PProps extends BaseElementProps {
  isSimulation?: boolean;
  onDistanceChange?: (distanceCm: number) => void;
  connectionPins: {
    trig: string | undefined;
    echo: string | undefined;
    vcc?: string | undefined;
    gnd?: string | undefined;
  };
  connectedMicrobit?: {
    pins: {
      [key: string]: { digital?: number };
    };
    connections: {
      vcc: boolean;
      gnd: boolean;
      trig: boolean;
      echo: boolean;
      allConnected: boolean;
    };
  };
}

export default function UltraSonicSensor4P(props: UltraSonicSensor4PProps) {
  const [img, setImg] = useState<HTMLImageElement | null>(null);
  const [ball, setBall] = useState<BallPosition>({
    x: SENSOR_X,
    y: SENSOR_Y - 30, // Start ball above sensor
  });
  const [triggered, setTriggered] = useState(false);
  const [echoTime, setEchoTime] = useState<number | null>(null); // microseconds
  const [unit, setUnit] = useState<"cm" | "in">("cm");

  // Load sensor image
  useEffect(() => {
    const image = new window.Image();
    image.src = "assets/circuit_canvas/elements/UltraSonicSensor4P.svg";
    image.onload = () => setImg(image);
    image.alt = "UltraSonicSensor4P";
  }, []);

  // Calculate sensor eye positions (bottom of eyes)
  const leftEye = { x: SENSOR_X - EYE_OFFSET_X - 10, y: SENSOR_Y + 40 };
  const rightEye = { x: SENSOR_X + EYE_OFFSET_X + 10, y: SENSOR_Y + 40 };

  // Calculate dx, dy to ball, distance
  const dx = ball.x - SENSOR_X;
  const dy = SENSOR_Y - ball.y; // y reversed in Konva
  const distance = useMemo(() => Math.sqrt(dx * dx + dy * dy), [dx, dy]);

  // Compute angle between sensor direction (up) and ball
  const angleRad = useMemo(() => Math.atan2(dx, dy), [dx, dy]);
  const angleDeg = useMemo(() => (angleRad * 180) / Math.PI, [angleRad]);

  // Check if ball is in valid range region (exclude inner radius)
  const ballInRange =
    distance >= EYE_RADIUS &&
    distance <= RANGE_RADIUS &&
    Math.abs(angleDeg) <= RANGE_ANGLE;

  // Check if properly connected to microbit and pin 0 is high
  const isProperlyConnected = props.connectedMicrobit?.connections?.allConnected ?? false;
  // Determine trigger HIGH: previously hard-coded to pin 0, now allow P0/P1/P2 (and numeric keys) so user code using P1 works.
  const microbitPinsState = props.connectedMicrobit?.pins ?? {} as any;
  const isTriggerHigh = ["P0", "0"].some(
    (k) => microbitPinsState[k]?.digital === 1
  );
  const canMeasure = isProperlyConnected && isTriggerHigh;

  // Notify parent component of distance changes if callback provided
  useEffect(() => {
    if (props.onDistanceChange && canMeasure) {
      props.onDistanceChange(distance);
    }
  }, [distance, props, canMeasure]);

  // Displayed distance in selected unit
  const displayedDistance = canMeasure
    ? (unit === "cm" ? distance.toFixed(1) : (distance / 2.54).toFixed(1))
    : "N/A";
  const displayedUnit = canMeasure ? unit : "";

  // Simulate ultrasonic sensor trigger and echo pulses
  const startMeasurement = () => {
    if (!canMeasure || triggered) return; // Don't measure if not properly connected
    setTriggered(true);
    setEchoTime(null);

    const timeForEcho = (distance / 34300) * 2 * 1e6; // microseconds (speed of sound in cm/s)
    // Echo time update with delay simulation (10ms)
    setTimeout(() => {
      setEchoTime(timeForEcho);
      setTriggered(false);
    }, 10);
  };

  // Auto-start measurement on simulation + selected mode
  useEffect(() => {
    if (props.isSimulation && props.selected && canMeasure) {
      const interval = setInterval(() => {
        startMeasurement();
      }, 1000); // Simulate measurement every second
      return () => clearInterval(interval);
    }
  }, [props.isSimulation, props.selected, distance, canMeasure]);

  // Constrain ball movement within sensor range circle
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

  // Keyboard controls for ball movement when selected
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (!props.selected) return;

      let dx = 0,
        dy = 0;
      switch (e.key) {
        case "ArrowUp":
          dy = -5;
          break;
        case "ArrowDown":
          dy = 5;
          break;
        case "ArrowLeft":
          dx = -5;
          break;
        case "ArrowRight":
          dx = 5;
          break;
      }

      setBall((prev) => {
        let newX = prev.x + dx;
        let newY = prev.y + dy;

        const dist = Math.sqrt((newX - SENSOR_X) ** 2 + (newY - SENSOR_Y) ** 2);
        if (dist > RANGE_RADIUS) {
          return prev; // prevent out of range
        }
        return { x: newX, y: newY };
      });
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [props.selected]);

  // Debug logging
  useEffect(() => {
    if (props.connectedMicrobit) {
      console.log('Microbit connected!');
      console.log('Connections:', props.connectedMicrobit.connections);
      console.log('Pin 0 state:', props.connectedMicrobit.pins?.["0"]?.digital);
      console.log('Can measure:', canMeasure);
    }
  }, [props.connectedMicrobit, canMeasure]);
  
  // Animate echo pulse radius visualization
  const [pulseRadius, setPulseRadius] = useState(0);
  useEffect(() => {
    let animationFrameId: number;
    let start: number | null = null;

    if (triggered && canMeasure) {
      const animate = (time: number) => {
        if (!start) start = time;
        const elapsed = time - start;
        const newRadius = (elapsed / 10) % RANGE_RADIUS;
        setPulseRadius(newRadius);
        animationFrameId = requestAnimationFrame(animate);
      };
      animationFrameId = requestAnimationFrame(animate);
    } else {
      setPulseRadius(0);
    }

    return () => cancelAnimationFrame(animationFrameId);
  }, [triggered, canMeasure]);

  // Get connection status color
  const getConnectionStatusColor = () => {
    if (!props.connectedMicrobit) return "gray";
    if (canMeasure) return "green";
    if (isProperlyConnected && !isTriggerHigh) return "orange";
    return "red";
  };

  return (
    <BaseElement {...props}>
      {img && (
        <Group>
          {/* Sensor image */}
          <Image
            image={img}
            width={SENSOR_IMG_WIDTH}
            height={SENSOR_IMG_HEIGHT}
            shadowColor={props.selected ? "#000000" : undefined}
            shadowBlur={props.selected ? 6 : 0}
            shadowOffset={{ x: 15, y: -15 }}
            shadowOpacity={props.selected ? 2 : 0}
          />

          {/* Connection Status Indicator */}
          {props.isSimulation && (
            <Group>
              <Circle
                x={SENSOR_IMG_WIDTH - 20}
                y={20}
                radius={8}
                fill={getConnectionStatusColor()}
                stroke="black"
                strokeWidth={1}
              />
              {/* <Text
                x={-90}
                y={100}
                fontSize={12}
                fill="red"
                text={
                  !props.connectedMicrobit
                    ? "No Microbit Connected"
                    : !isProperlyConnected
                    ? `Missing: ${[
                        !props.connectedMicrobit.connections.vcc && "VCC",
                        !props.connectedMicrobit.connections.gnd && "GND",
                        !props.connectedMicrobit.connections.trig && "TRIG",
                        !props.connectedMicrobit.connections.echo && "ECHO",
                      ]
                        .filter(Boolean)
                        .join(", ")}`
                    : !isTriggerHigh
                    ? "Trigger Pin 0 = LOW"
                    : ""
                }
              /> */}
            </Group>
          )}
          {/* // 2cm to 400cm */}
          {/* also operates on 5V, for distance 2 decimal places */}

          {/* Show interactive elements when simulation is running; selection just adds shadows */}
          {props.isSimulation && (
            <>
              {/* Range arc */}
              <Arc
                x={SENSOR_X}
                y={SENSOR_Y}
                innerRadius={EYE_RADIUS}
                outerRadius={RANGE_RADIUS}
                angle={RANGE_ANGLE * 2}
                rotation={225}
                fill={
                  ballInRange && canMeasure
                    ? "rgba(0,255,0,0.3)"
                    : "rgba(255,0,0,0.3)"
                }
                stroke={ballInRange && canMeasure ? "green" : "red"}
                strokeWidth={2}
                shadowBlur={props.selected ? 6 : 0}
                shadowOffset={{ x: 15, y: -15 }}
                shadowOpacity={props.selected ? 2 : 0}
              />

              {/* Dashed lines from sensor eyes to ball */}
              <Line
                points={[leftEye.x, leftEye.y, ball.x, ball.y]}
                stroke={canMeasure ? "#888" : "#ccc"}
                strokeWidth={2}
                dash={[8, 8]}
                shadowBlur={props.selected ? 6 : 0}
                shadowOffset={{ x: 15, y: -15 }}
                shadowOpacity={props.selected ? 2 : 0}
              />
              <Line
                points={[rightEye.x, rightEye.y, ball.x, ball.y]}
                stroke={canMeasure ? "#888" : "#ccc"}
                strokeWidth={2}
                dash={[8, 8]}
                shadowBlur={props.selected ? 6 : 0}
                shadowOffset={{ x: 15, y: -15 }}
                shadowOpacity={props.selected ? 2 : 0}
              />

              {/* Distance annotation */}
              <Text
                x={ball.x - 55}
                y={ball.y - BALL_RADIUS - 28}
                text={`${displayedDistance} ${displayedUnit}`}
                fontSize={18}
                fill={canMeasure ? "#0684aa" : "#999"}
                shadowBlur={props.selected ? 6 : 0}
                shadowOffset={{ x: 15, y: -15 }}
                shadowOpacity={props.selected ? 2 : 0}
              />

              {/* Draggable ball (always draggable in simulation) */}
              <Circle
                x={ball.x}
                y={ball.y}
                radius={BALL_RADIUS}
                fill={canMeasure ? "blue" : "gray"}
                draggable
                onDragStart={(e) => {
                  // Prevent parent element drag logic from interfering
                  e.cancelBubble = true;
                }}
                onDragMove={(e) => {
                  e.cancelBubble = true;
                  onDragMove(e);
                }}
              />

              {/* Echo pulse circle animation */}
              {triggered && canMeasure && (
                <Circle
                  x={SENSOR_X}
                  y={SENSOR_Y}
                  radius={pulseRadius}
                  stroke="rgba(0,0,255,0.5)"
                  strokeWidth={3}
                  shadowBlur={props.selected ? 6 : 0}
                  shadowOffset={{ x: 15, y: -15 }}
                  shadowOpacity={props.selected ? 2 : 0}
                />
              )}

              {/* Sensor output data */}
              <Text
                x={-100}
                y={SENSOR_IMG_HEIGHT - 200}
                fontSize={14}
                fill="green"
                text={`Echo time: ${
                  canMeasure && ballInRange && echoTime
                    ? echoTime.toFixed(0) + " μs"
                    : "N/A"
                }`}
              />

              <Text
                x={-100}
                y={SENSOR_IMG_HEIGHT - 170}
                fontSize={14}
                fill="green"
                text={`Distance: ${
                  canMeasure && ballInRange && distance !== null
                    ? unit === "cm"
                      ? distance.toFixed(1) + " cm"
                      : (distance / 2.54).toFixed(1) + " in"
                    : "N/A"
                }`}
              />

              {/* Unit toggle button (only enabled when measuring) */}
              {canMeasure && (
                <Text
                  x={-100}
                  y={SENSOR_IMG_HEIGHT + 60}
                  fontSize={14}
                  fill="blue"
                  text={`Switch to ${unit === "cm" ? "inches" : "cm"}`}
                  onClick={() => setUnit(unit === "cm" ? "in" : "cm")}
                  style={{ cursor: "pointer" }}
                />
              )}

              {/* Connection requirements info */}
              {/* {!canMeasure && (
                <Text
                  x={-170}
                  y={SENSOR_IMG_HEIGHT - 30}
                  fontSize={12}
                  fill="red"
                  text={
                    "\nConnect: VCC→3.3V, GND→GND\n\n,TRIG→Pin0, ECHO→Pin1\n\n\n" +
                    "Set Pin 0 = HIGH to enable measurement"
                  }
                />
              )} */}

              {/* Out of range warning */}
              {!ballInRange && canMeasure && (
                <Text
                  x={SENSOR_X - 50}
                  y={SENSOR_Y + SENSOR_IMG_HEIGHT + -320}
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