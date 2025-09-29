import React, { useEffect, useState, useMemo } from "react";
import { Image, Group, Arc, Circle, Line, Text, Rect } from "react-konva";
import {
  BaseElement,
  BaseElementProps,
} from "@/circuit_canvas/components/core/BaseElement";
import Konva from "konva";

// Sensor and UI constants - Updated dimensions to match real sensor proportions
const SENSOR_IMG_WIDTH = 225;  // Represents 45mm
const SENSOR_IMG_HEIGHT = 100; // Represents 20mm (45mm/20mm = 2.25:1 ratio)

// Real-world sensor limits
const SENSOR_MIN_CM = 2;
const SENSOR_MAX_CM = 400;

// Scale factor (cm → px mapping)
const CM_TO_PX = 0.38; // adjust so that 400 cm ≈ your RANGE_RADIUS in canvas

const SENSOR_X = SENSOR_IMG_WIDTH / 2; // Horizontal center
const SENSOR_Y = -25; // Sensor face Y (adjust for your image asset)
const EYE_OFFSET_X = 30; // Reduced offset for smaller sensor
const EYE_RADIUS = 15;   // Slightly smaller eyes
const RANGE_RADIUS = SENSOR_MAX_CM * CM_TO_PX;
const RANGE_ANGLE = 75; // HC-SR04 typical detection angle: 15° either side (30° total spread)
const BALL_RADIUS = 9;

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
    microbitId: string;
    pins: {
      [key: string]: { digital?: number };
    };
    connections: {
      vcc: boolean;
      gnd: boolean;
      trig: boolean;
      echo: boolean;
      allConnected: boolean;
      trigPin?: string; // Which microbit pin TRIG is connected to
      echoPin?: string; // Which microbit pin ECHO is connected to
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
  //const [echoTime, setEchoTime] = useState<number | null>(null); // microseconds
  const [unit, setUnit] = useState<"cm" | "in">("cm");

  // Load sensor image
  useEffect(() => {
    const image = new window.Image();
    image.src = "assets/circuit_canvas/elements/UltraSonicSensor4P.svg";
    image.onload = () => setImg(image);
    image.alt = "UltraSonicSensor4P";
  }, []);

  // Calculate sensor eye positions (adjusted for new dimensions)
  const leftEye = { x: SENSOR_X - EYE_OFFSET_X, y: SENSOR_Y + 35 };
  const rightEye = { x: SENSOR_X + EYE_OFFSET_X, y: SENSOR_Y + 35 };

  // Calculate dx, dy to ball, distance
  const dx = ball.x - SENSOR_X;
  const dy = SENSOR_Y - ball.y; // y reversed in Konva
  const distance = useMemo(() => Math.sqrt(dx * dx + dy * dy), [dx, dy]);

  // Compute angle between sensor direction (up) and ball
  const angleRad = useMemo(() => Math.atan2(dx, dy), [dx, dy]);
  const angleDeg = useMemo(() => (angleRad * 180) / Math.PI, [angleRad]);

  // Check if ball is in valid range region (exclude inner radius)
  const ballInRange =
    distance >= SENSOR_MIN_CM * CM_TO_PX &&
    distance <= RANGE_RADIUS &&
    Math.abs(angleDeg) <= RANGE_ANGLE; // Now uses 15° instead of 45° (30° total spread)

  // Check if properly connected to microbit
  const isProperlyConnected =
    props.connectedMicrobit?.connections?.allConnected ?? false;

  // Get microbit pins state
  const microbitPinsState = props.connectedMicrobit?.pins ?? {};

  // Check if the TRIG pin is HIGH - use the actual connected pin
  const trigPin = props.connectedMicrobit?.connections?.trigPin;
  const isTriggerHigh = useMemo(() => {
    if (!trigPin) return false;
    
    // Check both the pin name (e.g., "P0") and its numeric equivalent (e.g., "0")
    const pinVariants = [trigPin, trigPin.replace('P', '')];
    return pinVariants.some(pin => microbitPinsState[pin]?.digital === 1);
  }, [trigPin, microbitPinsState]);

  const canMeasure = isProperlyConnected && isTriggerHigh;

  // Notify parent component of distance changes if callback provided
  useEffect(() => {
    if (props.onDistanceChange && canMeasure) {
      props.onDistanceChange(distance);
    }
  }, [distance, props, canMeasure]);

  // Displayed distance in selected unit
  const distanceCm = distance / CM_TO_PX;

  const displayedDistance = canMeasure
    ? unit === "cm"
      ? distanceCm.toFixed(2)
      : (distanceCm / 2.54).toFixed(2)
    : "N/A";

  const displayedUnit = canMeasure ? unit : "";

  // Simulate ultrasonic sensor trigger and echo pulses
  const echoTime = useMemo(() => {
  // If we can't measure or the ball is out of range, echo time is null (N/A)
  if (!canMeasure || !ballInRange) {
    return null;
  }
  // Calculate the time for the echo round trip in microseconds
  return (distanceCm / 34300) * 2 * 1e6;
}, [canMeasure, ballInRange, distanceCm]);

  const startMeasurement = () => {
  // Don't measure if not properly connected or already in a measurement cycle
  if (!canMeasure || triggered) return;

  // Visual Feedback: Start the pulse animation
  setTriggered(true);

  // Simulate the measurement delay (e.g., sensor processing time)
  setTimeout(() => {
    // Visual Feedback: Stop the pulse animation
    setTriggered(false);
  }, 10); // This 10ms is just for the visual effect, not the calculation
};

  // Auto-start measurement ANIMATION on simulation + selected mode
useEffect(() => {
  if (props.isSimulation && props.selected && canMeasure) {
    const interval = setInterval(() => {
      startMeasurement(); // This now only triggers the visual pulse
    }, 1000); // This interval controls how often the sensor "pings" visually
    return () => clearInterval(interval);
  }
}, [props.isSimulation, props.selected, canMeasure, startMeasurement]); // Add startMeasurement to dependencies

  // Constrain ball movement within sensor range circle
  const onDragMove = (e: Konva.KonvaEventObject<DragEvent>) => {
    const x = e.target.x();
    const y = e.target.y();
    setBall({ x, y });
  };

  // While dragging the distance ball, temporarily disable stage dragging to avoid panning
  const onBallDragStart = () => {
    const stage = Konva.stages?.[0];
    if (stage) {
      // store original draggable flag
      (stage as any)._prevDraggable = stage.draggable();
      stage.draggable(false);
    }
  };
  const onBallDragEnd = () => {
    const stage = Konva.stages?.[0];
    if (stage) {
      const prev = (stage as any)._prevDraggable;
      if (typeof prev === 'boolean') stage.draggable(prev);
    }
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

  // Get connection status color with more detailed states
  const getConnectionStatusColor = () => {
    if (!props.connectedMicrobit) return "gray"; // No connection
    if (canMeasure) return "green"; // Fully operational
    if (isProperlyConnected && !isTriggerHigh) return "orange"; // Connected but not triggered
    if (!isProperlyConnected) return "red"; // Incomplete connection
    return "gray";
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
            shadowOpacity={props.selected ? 0.2 : 0}
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
            </Group>
          )}

          {props.isSimulation && props.selected && (
            <>
              {/* Range arc - Now realistic HC-SR04 angle (30° total instead of 90°) */}
              <Arc
                x={SENSOR_X}
                y={SENSOR_Y}
                innerRadius={0}
                outerRadius={RANGE_RADIUS}
                angle={RANGE_ANGLE * 2} // 30° total spread (typical HC-SR04)
                rotation={270 - RANGE_ANGLE} // Center the arc pointing upward
                fill={
                  ballInRange && canMeasure
                    ? "rgba(0,255,0,0.3)"
                    : "rgba(255,0,0,0.3)"
                }
                stroke={ballInRange && canMeasure ? "green" : "red"}
                strokeWidth={2}
                shadowBlur={props.selected ? 6 : 0}
                shadowOffset={{ x: 15, y: -15 }}
                shadowOpacity={props.selected ? 0.2 : 0}
              />

              {/* Dashed lines from sensor eyes to ball */}
              <Line
                points={[leftEye.x, leftEye.y, ball.x, ball.y]}
                stroke={canMeasure ? "#888" : "#ccc"}
                strokeWidth={2}
                dash={[8, 8]}
                shadowBlur={props.selected ? 6 : 0}
                shadowOffset={{ x: 15, y: -15 }}
                shadowOpacity={props.selected ? 0.2 : 0}
              />
              <Line
                points={[rightEye.x, rightEye.y, ball.x, ball.y]}
                stroke={canMeasure ? "#888" : "#ccc"}
                strokeWidth={2}
                dash={[8, 8]}
                shadowBlur={props.selected ? 6 : 0}
                shadowOffset={{ x: 15, y: -15 }}
                shadowOpacity={props.selected ? 0.2 : 0}
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
                shadowOpacity={props.selected ? 0.2 : 0}
              />

              {/* Draggable ball */}
              <Circle
                x={ball.x}
                y={ball.y}
                radius={BALL_RADIUS}
                fill={canMeasure ? "blue" : "gray"}
                draggable
                onDragStart={onBallDragStart}
                onDragMove={onDragMove}
                onDragEnd={onBallDragEnd}
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
                  shadowOpacity={props.selected ? 0.2 : 0}
                />
              )}

              {/* Sensor output data */}
              <Text
                x={-100}
                y={SENSOR_IMG_HEIGHT - 130} // Adjusted for new height
                fontSize={14}
                fill="green"
                text={`Echo time: ${
                  canMeasure && ballInRange && echoTime !== null
                    ? echoTime.toFixed(0) + " μs"
                    : "N/A"
                }`}
              />

              {/* Unit toggle button (only enabled when measuring) */}
              {canMeasure && (
                <Group>
                  {/* Toggle button background */}
                  <Rect
                    x={-50}
                    y={SENSOR_IMG_HEIGHT - 40} // Adjusted for new height
                    width={60}
                    height={30}
                    cornerRadius={15}
                    fill={unit === "cm" ? "#4CAF50" : "#2196F3"}
                    stroke="#333"
                    strokeWidth={2}
                    onClick={() => setUnit(unit === "cm" ? "in" : "cm")}
                    style={{ cursor: "pointer" }}
                  />
                  
                  {/* Toggle slider */}
                  <Circle
                    x={unit === "cm" ? -34.5 : -5.5}
                    y={SENSOR_IMG_HEIGHT - 25} // Adjusted for new height
                    radius={15}
                    fill="white"
                    stroke="#333"
                    strokeWidth={1}
                    onClick={() => setUnit(unit === "cm" ? "in" : "cm")}
                    style={{ cursor: "pointer" }}
                  />
                  
                  {/* Toggle labels */}
                  <Text
                    x={-44}
                    y={SENSOR_IMG_HEIGHT - 30} // Adjusted for new height
                    fontSize={13}
                    fill="white"
                    text="cm"
                    fontStyle={unit === "cm" ? "bold" : "normal"}
                    onClick={() => setUnit("cm")}
                    style={{ cursor: "pointer" }}
                  />
                  
                  <Text
                    x={-10}
                    y={SENSOR_IMG_HEIGHT - 30} // Adjusted for new height
                    fontSize={13}
                    fill="white"
                    text="in"
                    fontStyle={unit === "in" ? "bold" : "normal"}
                    onClick={() => setUnit("in")}
                    style={{ cursor: "pointer" }}
                  />
                </Group>
              )}

              {/* Out of range warning */}
              {!ballInRange && canMeasure && (
                <Text
                  x={SENSOR_X - 50}
                  y={SENSOR_Y + SENSOR_IMG_HEIGHT + -290} // Adjusted for new height
                  fontSize={16}
                  fill="red"
                  text="Out of range"
                />
              )}

              {/* Connection warnings */}
              {/* {!canMeasure && props.connectedMicrobit && (
                <Text
                  x={SENSOR_X - 80}
                  y={SENSOR_Y + SENSOR_IMG_HEIGHT + -270}  // Adjusted for new height
                  fontSize={14}
                  fill="orange"
                  text={
                    !isProperlyConnected 
                      ? "Check connections" 
                      : `Set ${trigPin} HIGH to measure`
                  }
                />
              )} */}
            </>
          )}
        </Group>
      )}
    </BaseElement>
  );
}