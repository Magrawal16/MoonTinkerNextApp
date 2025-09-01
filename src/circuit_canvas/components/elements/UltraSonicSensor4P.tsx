import React, { useEffect, useState, useMemo, useCallback } from "react";
import { Image, Group, Arc, Circle, Line, Text, Rect } from "react-konva";
import {
  BaseElement,
  BaseElementProps,
} from "@/circuit_canvas/components/core/BaseElement";
import Konva from "konva";
import { SimulatorProxy } from "@/python_code_editor/lib/SimulatorProxy";

// Sensor and UI constants
const SENSOR_IMG_WIDTH = 230;
const SENSOR_IMG_HEIGHT = 130;
// Real-world sensor limits
const SENSOR_MIN_CM = 2;
const SENSOR_MAX_CM = 400;

// Scale factor (cm → px mapping)
const CM_TO_PX = 0.38;

const SENSOR_X = SENSOR_IMG_WIDTH / 2.1;
const SENSOR_Y = -25;
const EYE_OFFSET_X = 37;
const RANGE_RADIUS = SENSOR_MAX_CM * CM_TO_PX;
const RANGE_ANGLE = 45;
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
      trigPin?: string;
      echoPin?: string;
    };
  };
  getSimulatorForMicrobit?: (microbitId: string) => SimulatorProxy | undefined;
}

export default function UltraSonicSensor4P(props: UltraSonicSensor4PProps) {
  const [img, setImg] = useState<HTMLImageElement | null>(null);
  const [ball, setBall] = useState<BallPosition>({
    x: SENSOR_X,
    y: SENSOR_Y - 30,
  });
  const [triggered, setTriggered] = useState(false);
  const [unit, setUnit] = useState<"cm" | "in">("cm");
  const [measurementInProgress, setMeasurementInProgress] = useState(false);
  const [lastMeasuredDistance, setLastMeasuredDistance] = useState<number | null>(null);
  const [lastEchoTime, setLastEchoTime] = useState<number | null>(null); // New state for echo time

  // Load sensor image
  useEffect(() => {
    const image = new window.Image();
    image.src = "assets/circuit_canvas/elements/UltraSonicSensor4P.svg";
    image.onload = () => setImg(image);
    image.alt = "UltraSonicSensor4P";
  }, []);

  // Calculate sensor eye positions
  const leftEye = { x: SENSOR_X - EYE_OFFSET_X - 10, y: SENSOR_Y + 40 };
  const rightEye = { x: SENSOR_X + EYE_OFFSET_X + 10, y: SENSOR_Y + 40 };

  // Calculate distance
  const dx = ball.x - SENSOR_X;
  const dy = SENSOR_Y - ball.y;
  const distance = useMemo(() => Math.sqrt(dx * dx + dy * dy), [dx, dy]);

  // Compute angle
  const angleRad = useMemo(() => Math.atan2(dx, dy), [dx, dy]);
  const angleDeg = useMemo(() => (angleRad * 180) / Math.PI, [angleRad]);

  // Check if ball is in valid range
  const ballInRange =
    distance >= SENSOR_MIN_CM * CM_TO_PX &&
    distance <= RANGE_RADIUS &&
    Math.abs(angleDeg) <= RANGE_ANGLE;

  // Check connection status
  const isProperlyConnected = props.connectedMicrobit?.connections?.allConnected ?? false;
  const trigPin = props.connectedMicrobit?.connections?.trigPin;
  const echoPin = props.connectedMicrobit?.connections?.echoPin;
  const microbitId = props.connectedMicrobit?.microbitId;

  // Get simulator instance
  const simulator = useMemo(() => {
    if (!microbitId || !props.getSimulatorForMicrobit) return null;
    return props.getSimulatorForMicrobit(microbitId);
  }, [microbitId, props.getSimulatorForMicrobit]);

  // Calculate echo time for display
  const calculateEchoTime = useCallback((distanceCm: number): number => {
    // Time = Distance / Speed of Sound * 2 (round trip)
    // Speed of sound ≈ 343 m/s = 34300 cm/s
    return (distanceCm / 34300) * 2 * 1000000; // Convert to microseconds
  }, []);

  // Simulate ultrasonic measurement when triggered
  const simulateMeasurement = useCallback(async () => {
    if (!isProperlyConnected || !echoPin || !simulator || measurementInProgress) {
      return;
    }

    console.log("Starting ultrasonic measurement simulation");
    setMeasurementInProgress(true);
    setTriggered(true);

    try {
      const distanceCm = distance / CM_TO_PX;
      
      if (!ballInRange) {
        console.log("Ball out of range, no echo response");
        setLastMeasuredDistance(null);
        setLastEchoTime(null);
        return;
      }

      // Calculate echo time
      const echoTimeUs = calculateEchoTime(distanceCm);

      // Set ECHO pin LOW initially
      await simulator.setExternalPinValue(echoPin, 0, 'digital');
      await new Promise(resolve => setTimeout(resolve, 2));
      
      // Set ECHO pin HIGH (start of return pulse)
      await simulator.setExternalPinValue(echoPin, 1, 'digital');
      
      console.log(`Distance: ${distanceCm.toFixed(2)}cm, Echo time: ${echoTimeUs.toFixed(0)}μs`);
      setLastMeasuredDistance(distanceCm);
      setLastEchoTime(echoTimeUs);
      
      // Wait for the calculated echo time, then set ECHO pin LOW
      await new Promise(resolve => setTimeout(resolve, echoTimeUs / 1000));
      
      // Set ECHO pin LOW (end of return pulse)
      await simulator.setExternalPinValue(echoPin, 0, 'digital');
      
      console.log("Echo pulse completed");
      
    } catch (error) {
      console.error("Error during ultrasonic measurement:", error);
    } finally {
      setTriggered(false);
      setMeasurementInProgress(false);
    }
  }, [isProperlyConnected, echoPin, simulator, distance, ballInRange, measurementInProgress, calculateEchoTime]);

  // Listen for ultrasonic trigger events
  useEffect(() => {
    if (!props.isSimulation || !isProperlyConnected) return;

    const handleTriggerEvent = (event: CustomEvent) => {
      const { sensorId, trigPin: eventTrigPin, echoPin: eventEchoPin } = event.detail;
      
      if (sensorId === props.id && eventTrigPin === trigPin && eventEchoPin === echoPin) {
        console.log(`Ultrasonic sensor ${props.id} received trigger event`);
        simulateMeasurement();
      }
    };

    window.addEventListener('ultrasonic-trigger', handleTriggerEvent as EventListener);

    return () => {
      window.removeEventListener('ultrasonic-trigger', handleTriggerEvent as EventListener);
    };
  }, [props.isSimulation, props.id, isProperlyConnected, trigPin, echoPin, simulateMeasurement]);

  // Calculate current simulated values for display
  const currentDistanceCm = distance / CM_TO_PX;
  const currentEchoTime = ballInRange ? calculateEchoTime(currentDistanceCm) : null;

  // Displayed distance in selected unit
  const displayedDistance = lastMeasuredDistance !== null
    ? unit === "cm"
      ? lastMeasuredDistance.toFixed(2)
      : (lastMeasuredDistance / 2.54).toFixed(2)
    : ballInRange 
      ? unit === "cm"
        ? currentDistanceCm.toFixed(2)
        : (currentDistanceCm / 2.54).toFixed(2)
      : "Out of range";

  const displayedUnit = lastMeasuredDistance !== null || ballInRange ? unit : "";

  // Ball movement handlers
  const onDragMove = (e: Konva.KonvaEventObject<DragEvent>) => {
    const x = e.target.x();
    const y = e.target.y();
    setBall({ x, y });
  };

  const onBallDragStart = () => {
    const stage = Konva.stages?.[0];
    if (stage) {
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

  // Keyboard controls for ball movement
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (!props.selected) return;

      let dx = 0, dy = 0;
      switch (e.key) {
        case "ArrowUp": dy = -5; break;
        case "ArrowDown": dy = 5; break;
        case "ArrowLeft": dx = -5; break;
        case "ArrowRight": dx = 5; break;
      }

      setBall((prev) => {
        let newX = prev.x + dx;
        let newY = prev.y + dy;

        const dist = Math.sqrt((newX - SENSOR_X) ** 2 + (newY - SENSOR_Y) ** 2);
        if (dist > RANGE_RADIUS) {
          return prev;
        }
        return { x: newX, y: newY };
      });
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [props.selected]);

  // Debug logging
  useEffect(() => {
    if (props.connectedMicrobit && props.isSimulation) {
      console.log("UltraSonic Sensor Debug:", {
        microbitId: props.connectedMicrobit.microbitId,
        allConnected: props.connectedMicrobit.connections.allConnected,
        trigPin: props.connectedMicrobit.connections.trigPin,
        echoPin: props.connectedMicrobit.connections.echoPin,
        simulatorAvailable: !!simulator,
        lastDistance: lastMeasuredDistance,
        lastEchoTime: lastEchoTime,
      });
    }
  }, [props.connectedMicrobit, simulator, lastMeasuredDistance, lastEchoTime, props.isSimulation]);

  // Animate echo pulse
  const [pulseRadius, setPulseRadius] = useState(0);
  useEffect(() => {
    let animationFrameId: number;
    let start: number | null = null;

    if (triggered && isProperlyConnected) {
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
  }, [triggered, isProperlyConnected]);

  // Status helpers
  const getConnectionStatusColor = () => {
    if (!props.connectedMicrobit) return "gray";
    if (measurementInProgress) return "blue";
    if (isProperlyConnected && simulator) return "green";
    if (!isProperlyConnected) return "red";
    if (!simulator) return "orange";
    return "gray";
  };

  const getStatusText = () => {
    if (!props.connectedMicrobit) return "No connection";
    if (measurementInProgress) return "Measuring...";
    if (isProperlyConnected && simulator) return "Ready";
    if (!simulator) return "Simulator N/A";
    if (!isProperlyConnected) return "Check wiring";
    return "Unknown";
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
              <Text
                x={SENSOR_IMG_WIDTH - 80}
                y={35}
                fontSize={10}
                fill="black"
                text={getStatusText()}
              />
            </Group>
          )}

          {props.isSimulation && props.selected && (
            <>
              {/* Range arc */}
              <Arc
                x={SENSOR_X}
                y={SENSOR_Y}
                innerRadius={0}
                outerRadius={RANGE_RADIUS}
                angle={RANGE_ANGLE * 2}
                rotation={225}
                fill={
                  ballInRange && isProperlyConnected && simulator
                    ? "rgba(0,255,0,0.3)"
                    : "rgba(255,0,0,0.3)"
                }
                stroke={ballInRange && isProperlyConnected && simulator ? "green" : "red"}
                strokeWidth={2}
                shadowBlur={props.selected ? 6 : 0}
                shadowOffset={{ x: 15, y: -15 }}
                shadowOpacity={props.selected ? 2 : 0}
              />

              {/* Dashed lines from sensor eyes to ball */}
              <Line
                points={[leftEye.x, leftEye.y, ball.x, ball.y]}
                stroke={isProperlyConnected && simulator ? "#888" : "#ccc"}
                strokeWidth={2}
                dash={[8, 8]}
                shadowBlur={props.selected ? 6 : 0}
                shadowOffset={{ x: 15, y: -15 }}
                shadowOpacity={props.selected ? 2 : 0}
              />
              <Line
                points={[rightEye.x, rightEye.y, ball.x, ball.y]}
                stroke={isProperlyConnected && simulator ? "#888" : "#ccc"}
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
                fill={lastMeasuredDistance !== null ? "#0684aa" : ballInRange ? "#0684aa" : "#999"}
                shadowBlur={props.selected ? 6 : 0}
                shadowOffset={{ x: 15, y: -15 }}
                shadowOpacity={props.selected ? 2 : 0}
              />

              {/* Draggable ball */}
              <Circle
                x={ball.x}
                y={ball.y}
                radius={BALL_RADIUS}
                fill={lastMeasuredDistance !== null ? "darkblue" : ballInRange ? "blue" : "gray"}
                draggable
                onDragStart={onBallDragStart}
                onDragMove={onDragMove}
                onDragEnd={onBallDragEnd}
              />

              {/* Echo pulse circle animation */}
              {triggered && isProperlyConnected && (
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

              {/* Distance output */}
              <Text
                x={-100}
                y={SENSOR_IMG_HEIGHT - 180}
                fontSize={14}
                fill={measurementInProgress ? "blue" : "green"}
                text={
                  measurementInProgress 
                    ? "Measuring..." 
                    : lastMeasuredDistance !== null
                    ? `Last: ${lastMeasuredDistance.toFixed(2)}cm`
                    : ballInRange && isProperlyConnected && simulator
                    ? `Simulated: ${currentDistanceCm.toFixed(2)}cm`
                    : "No measurement"
                }
              />

              {/* Echo Time Display - NEW */}
              <Text
                x={-100}
                y={SENSOR_IMG_HEIGHT - 160}
                fontSize={14}
                fill={measurementInProgress ? "blue" : lastEchoTime !== null ? "purple" : "green"}
                text={
                  measurementInProgress 
                    ? "Echo calculating..." 
                    : lastEchoTime !== null
                    ? `Echo time: ${lastEchoTime.toFixed(0)}μs`
                    : currentEchoTime !== null && ballInRange && isProperlyConnected && simulator
                    ? `Echo time: ${currentEchoTime.toFixed(0)}μs (sim)`
                    : "No echo"
                }
              />

              {/* Unit toggle button */}
              {(lastMeasuredDistance !== null || ballInRange) && isProperlyConnected && simulator && (
                <Group>
                  <Rect
                    x={-50}
                    y={SENSOR_IMG_HEIGHT - 70}
                    width={60}
                    height={30}
                    cornerRadius={15}
                    fill={unit === "cm" ? "#4CAF50" : "#2196F3"}
                    stroke="#333"
                    strokeWidth={2}
                    onClick={() => setUnit(unit === "cm" ? "in" : "cm")}
                    style={{ cursor: "pointer" }}
                  />
                  
                  <Circle
                    x={unit === "cm" ? -34.5 : -5.5}
                    y={SENSOR_IMG_HEIGHT - 55}
                    radius={15}
                    fill="white"
                    stroke="#333"
                    strokeWidth={1}
                    onClick={() => setUnit(unit === "cm" ? "in" : "cm")}
                    style={{ cursor: "pointer" }}
                  />
                  
                  <Text
                    x={-44}
                    y={SENSOR_IMG_HEIGHT - 60}
                    fontSize={13}
                    fill="white"
                    text="cm"
                    fontStyle={unit === "cm" ? "bold" : "normal"}
                    onClick={() => setUnit("cm")}
                    style={{ cursor: "pointer" }}
                  />
                  
                  <Text
                    x={-10}
                    y={SENSOR_IMG_HEIGHT - 60}
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
              {!ballInRange && isProperlyConnected && !measurementInProgress && (
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