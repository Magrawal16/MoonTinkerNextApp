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
  onTriggerSignal?: (pin: string, cb: (value: 0 | 1) => void) => () => void;
  onEchoSignal?: (pin: string, value: 0 | 1) => void;
  onDistanceChange?: (distanceCm: number) => void;
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

  useEffect(() => {
    props.onDistanceChange?.(distanceCm);
  }, [distanceCm, props]);

  // Helper function to get the actual simulator (unwrap proxy if needed)
  const getActualSimulator = useCallback(() => {
    if (!props.simulator) return null;

    // If it's a SimulatorProxy, use the remote instance
    if (
      props.simulator.simulatorRemoteInstance &&
      props.simulator.simulatorRemoteInstance.pins
    ) {
      console.log("[UltraSonicSensor] Using simulatorRemoteInstance");
      return props.simulator.simulatorRemoteInstance;
    }

    // Check for direct simulator structure (for older format)
    if (props.simulator.simulator && props.simulator.simulator.pins) {
      console.log("[UltraSonicSensor] Using direct simulator");
      return props.simulator.simulator;
    }

    // Otherwise use the simulator directly
    if (props.simulator.pins) {
      console.log("[UltraSonicSensor] Using direct pins");
      return props.simulator;
    }

    console.log("[UltraSonicSensor] No suitable simulator structure found");
    return null;
  }, [props.simulator]);

  // Helper function to read pin value safely
  const readDigitalPin = useCallback(
    (pin: string): number => {
      try {
        const actualSim = getActualSimulator();
        if (!actualSim) {
          console.log(`[UltraSonicSensor] No actualSim for reading pin ${pin}`);
          return 0;
        }

        // Try multiple access patterns
        const methods = [
          () => actualSim.pins?.digital_read_pin?.(pin),
          () => actualSim.readDigitalPin?.(pin),
          () => actualSim.pinStates?.[pin]?.digital,
          () => {
            // Check external pin values first (for sensor simulation)
            if (
              actualSim.externalPinValues &&
              actualSim.externalPinValues[pin]
            ) {
              return actualSim.externalPinValues[pin].digital;
            }
            return undefined;
          },
        ];

        for (let i = 0; i < methods.length; i++) {
          try {
            const result = methods[i]();
            if (typeof result === "number") {
              console.log(
                `[UltraSonicSensor] Successfully read pin ${pin} = ${result} (method ${i})`
              );
              return result;
            }
          } catch (error) {
            console.log(
              `[UltraSonicSensor] Method ${i} failed for pin ${pin}:`,
              error instanceof Error ? error.message : String(error)
            );
          }
        }

        console.warn(
          "[UltraSonicSensor] No working method found to read pin:",
          pin
        );
        return 0;
      } catch (error) {
        console.error(
          "[UltraSonicSensor] Error reading digital pin:",
          pin,
          error
        );
        return 0;
      }
    },
    [getActualSimulator]
  );

  // Helper function to set pin value safely
  const setExternalPinValue = useCallback(
    (pin: string, value: number, type: "digital" | "analog" = "digital") => {
      try {
        const actualSim = getActualSimulator();
        if (!actualSim) {
          console.log(`[UltraSonicSensor] No actualSim for setting pin ${pin}`);
          return false;
        }

        // Try multiple access patterns
        const methods = [
          () => actualSim.setExternalPinValue?.(pin, value, type),
          () => actualSim.pins?.setExternalPinValue?.(pin, value, type),
          () => {
            // Direct pin state manipulation as fallback
            if (actualSim.pinStates && actualSim.pinStates[pin]) {
              actualSim.pinStates[pin][type] = value;
              return true;
            }
            return false;
          },
          () => {
            // Create external pin values if they don't exist
            if (!actualSim.externalPinValues) {
              actualSim.externalPinValues = {};
            }
            if (!actualSim.externalPinValues[pin]) {
              actualSim.externalPinValues[pin] = { digital: 0, analog: 0 };
            }
            actualSim.externalPinValues[pin][type] = value;
            return true;
          },
        ];

        for (let i = 0; i < methods.length; i++) {
          try {
            const result = methods[i]();
            if (result !== false && result !== undefined) {
              console.log(
                `[UltraSonicSensor] Successfully set pin ${pin} = ${value} (${type}) (method ${i})`
              );
              return true;
            }
          } catch (error) {
            console.log(
              `[UltraSonicSensor] Method ${i} failed for setting pin ${pin}:`,
              error instanceof Error ? error.message : String(error)
            );
          }
        }

        console.warn(
          "[UltraSonicSensor] No working method found to set pin:",
          pin
        );
        return false;
      } catch (error) {
        console.error(
          "[UltraSonicSensor] Error setting pin value:",
          pin,
          value,
          error
        );
        return false;
      }
    },
    [getActualSimulator]
  );

  // Helper function to access simulator methods safely
  const getSimulatorMethod = useCallback(
    (methodPath: string) => {
      try {
        if (!props.simulator) return null;

        // Try direct access first
        if (methodPath.includes(".")) {
          const parts = methodPath.split(".");
          let obj = props.simulator;
          for (const part of parts) {
            obj = obj?.[part];
            if (!obj) break;
          }
          return obj;
        } else {
          return props.simulator[methodPath];
        }
      } catch (error) {
        console.error(
          "[UltraSonicSensor] Error accessing simulator method:",
          methodPath,
          error
        );
        return null;
      }
    },
    [props.simulator]
  );

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

    if (!props.simulator) {
      console.log("[UltraSonicSensor] No simulator, skipping");
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
      const success = setExternalPinValue(props.pins.echo, 1, "digital");

      if (success) {
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
            setExternalPinValue(props.pins.echo, 0, "digital");
          }
          setTriggered(false);
        }, timeoutMs);
      } else {
        setTriggered(false);
      }
    } else {
      console.log("[UltraSonicSensor] No echo pin configured");
      setTriggered(false);
    }
  }, [
    triggered,
    props.simulator,
    ballInRange,
    distanceCm,
    props.pins?.echo,
    setExternalPinValue,
  ]);

  // Enhanced debug logging with SimulatorProxy structure detection
  useEffect(() => {
    console.log("[UltraSonicSensor] Simulator debug:", {
      simulator: props.simulator,
      simulatorType: typeof props.simulator,
      simulatorKeys: props.simulator ? Object.keys(props.simulator) : [],

      // Check direct access
      hasPins: props.simulator?.pins ? "YES" : "NO",
      hasSetExternalPinValue: props.simulator?.setExternalPinValue
        ? "YES"
        : "NO",

      // Check SimulatorProxy structure
      hasSimulatorRemoteInstance: props.simulator?.simulatorRemoteInstance
        ? "YES"
        : "NO",
      remoteInstanceKeys: props.simulator?.simulatorRemoteInstance
        ? Object.keys(props.simulator.simulatorRemoteInstance)
        : [],
      remoteHasPins: props.simulator?.simulatorRemoteInstance?.pins
        ? "YES"
        : "NO",
      remoteHasSetExternalPinValue: props.simulator?.simulatorRemoteInstance
        ?.setExternalPinValue
        ? "YES"
        : "NO",

      // Check legacy simulator structure
      hasDirectSimulator: props.simulator?.simulator ? "YES" : "NO",
      directSimulatorHasPins: props.simulator?.simulator?.pins ? "YES" : "NO",

      trigPin: props.pins?.trig,
      echoPin: props.pins?.echo,
      isSimulation: props.isSimulation,
    });

    if (props.simulator) {
      let simulatorInfo = "Connected: ";

      // Check if it's a SimulatorProxy wrapper
      if (props.simulator.simulatorRemoteInstance) {
        simulatorInfo += "Proxy -> ";
        const internalSim = props.simulator.simulatorRemoteInstance;
        if (internalSim.pins) {
          simulatorInfo += `Remote has pins (${Object.keys(
            internalSim.pins
          ).join(", ")})`;
        } else {
          simulatorInfo += "Remote missing pins";
        }
      } else if (props.simulator.simulator) {
        simulatorInfo += "Legacy -> ";
        const internalSim = props.simulator.simulator;
        if (internalSim.pins) {
          simulatorInfo += `Legacy has pins (${Object.keys(
            internalSim.pins
          ).join(", ")})`;
        } else {
          simulatorInfo += "Legacy missing pins";
        }
      } else if (props.simulator.pins) {
        simulatorInfo += `Direct pins (${Object.keys(props.simulator.pins).join(
          ", "
        )})`;
      } else {
        simulatorInfo += "No pins found";
      }

      simulatorInfo += ` | TRIG: ${props.pins?.trig} ECHO: ${props.pins?.echo}`;
      setDebugInfo(simulatorInfo);
    } else {
      setDebugInfo("No simulator connected");
    }
  }, [props.simulator, props.pins?.trig, props.pins?.echo, props.isSimulation]);

  // Method 1: Polling for trigger pin changes
  useEffect(() => {
    if (!props.pins?.trig || !props.simulator || !props.isSimulation) {
      console.log("[UltraSonicSensor] Polling disabled:", {
        trigPin: props.pins?.trig,
        simulator: !!props.simulator,
        isSimulation: props.isSimulation,
      });
      return;
    }

    console.log(
      "[UltraSonicSensor] Starting trigger pin polling for:",
      props.pins.trig
    );

    let lastValue = 0;
    let intervalId: NodeJS.Timeout;

    // Monitor the trigger pin for rising edge (0 → 1)
    const checkTriggerPin = () => {
      if (!props.pins?.trig) return;

      try {
        const currentValue = readDigitalPin(props.pins.trig);

        // Detect rising edge (0 → 1)
        if (lastValue === 0 && currentValue === 1) {
          console.log(
            "[UltraSonicSensor] Trigger rising edge detected!",
            `${lastValue} -> ${currentValue}`
          );
          startMeasurement();
        }

        lastValue = currentValue;
      } catch (error) {
        console.error("[UltraSonicSensor] Error reading trigger pin:", error);
      }
    };

    // Check trigger pin periodically
    intervalId = setInterval(checkTriggerPin, 10); // Check every 10ms

    return () => {
      console.log("[UltraSonicSensor] Stopping trigger pin polling");
      clearInterval(intervalId);
    };
  }, [
    props.pins?.trig,
    props.simulator,
    props.isSimulation,
    startMeasurement,
    readDigitalPin,
  ]);

  // Method 2: Callback-based trigger detection (fallback)
  useEffect(() => {
    if (!props.pins?.trig || !props.isSimulation) {
      return;
    }

    console.log(
      "[UltraSonicSensor] Checking for callback-based trigger detection for:",
      props.pins.trig
    );

    let lastValue = 0;
    try {
      // Try to find the onDigitalWrite method
      const onDigitalWriteMethod =
        getSimulatorMethod("pins.onDigitalWrite") ||
        getSimulatorMethod("simulatorRemoteInstance.pins.onDigitalWrite") ||
        getSimulatorMethod("simulator.pins.onDigitalWrite");

      if (typeof onDigitalWriteMethod === "function") {
        console.log(
          "[UltraSonicSensor] Setting up callback-based trigger detection"
        );

        const unsubscribe = onDigitalWriteMethod(
          props.pins.trig,
          (value: number) => {
            console.log(
              "[UltraSonicSensor] Callback trigger pin change:",
              lastValue,
              "->",
              value
            );
            // Detect rising edge
            if (lastValue === 0 && value === 1) {
              console.log(
                "[UltraSonicSensor] Callback trigger rising edge detected!"
              );
              startMeasurement();
            }
            lastValue = value;
          }
        );

        return unsubscribe;
      } else {
        console.log(
          "[UltraSonicSensor] No callback method available, relying on polling"
        );
      }
    } catch (error) {
      console.error("[UltraSonicSensor] Error setting up callback:", error);
    }
  }, [
    props.pins?.trig,
    props.simulator,
    props.isSimulation,
    startMeasurement,
    getSimulatorMethod,
  ]);

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
