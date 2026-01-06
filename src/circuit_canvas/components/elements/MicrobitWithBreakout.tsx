"use client";

import {
  BaseElementProps,
  MicrobitProps,
} from "@/circuit_canvas/types/circuit";
import { BaseElement } from "@/circuit_canvas/components/core/BaseElement";
import { useEffect, useState, useRef } from "react";
import { Group, Image, Rect, Text, Circle } from "react-konva";
import { ShortCircuitNotification } from "./ShortCircuitNotification";
import { getMicrobitWithBreakoutCoordinates } from "@/circuit_canvas/utils/microbitCoordinateMap";

export default function Microbit({
  leds,
  onControllerInput,
  isSimulationOn,
  isShorted,
  ...props
}: MicrobitProps & BaseElementProps) {
  const [imgMicrobitWithBreakout, setImgMicrobitWithBreakout] = useState<HTMLImageElement | null>(null);
  const [imgOnnState, setImgOnnState] = useState<HTMLImageElement | null>(null);
  const [imgOffState, setImgOffState] = useState<HTMLImageElement | null>(null);
  const [explosionImg, setExplosionImg] = useState<HTMLImageElement | null>(null);
  // Track button press state
  const [buttonsPressed, setButtonsPressed] = useState<Set<"A" | "B" | "AB">>(new Set());
  const isPressing = useRef<{ [key in "A" | "B" | "AB"]: boolean }>({ A: false, B: false, AB: false });

  // Logo (touch sensor) interaction state
  const [logoState, setLogoState] = useState<"idle" | "hover" | "pressed">("idle");
  const isPressingRef = useRef(false);
  // Hover state for short-circuit notification
  const [isHovered, setIsHovered] = useState(false);

  // Get all coordinates for the microbit with breakout board
  const coords = getMicrobitWithBreakoutCoordinates();

  useEffect(() => {
    const image = new window.Image();
    image.src = "assets/circuit_canvas/elements/microbit_with_breakout.svg";
    image.onload = () => setImgMicrobitWithBreakout(image);
    image.alt = "MicrobitWithBreakout";
  }, []);

  useEffect(() => {
    const image = new window.Image();
    image.src = "assets/circuit_canvas/elements/microbit_usb_onn.svg";
    image.onload = () => setImgOnnState(image);
    image.alt = "MicrobitWithBreakout";
  }, []);

  useEffect(() => {
    const image = new window.Image();
    image.src = "assets/circuit_canvas/elements/microbit_usb_off.svg";
    image.onload = () => setImgOffState(image);
    image.alt = "MicrobitWithBreakout";
  }, []);

  useEffect(() => {
    const image = new window.Image();
    image.src = "assets/circuit_canvas/elements/Explosion.svg";
    image.onload = () => setExplosionImg(image);
    image.alt = "MicrobitWithBreakout Explosion";
  }, []);

  const handleButtonDown = (btn: "A" | "B" | "AB") => {
    isPressing.current[btn] = true;
    setButtonsPressed((prev: Set<"A" | "B" | "AB">) => new Set([...prev, btn]));
    onControllerInput?.({ type: "button", button: btn, state: "pressed" });
  };

  const handleButtonUp = (btn: "A" | "B" | "AB") => {
    isPressing.current[btn] = false;
    setButtonsPressed((prev: Set<"A" | "B" | "AB">) => {
      const next = new Set(prev);
      next.delete(btn);
      return next;
    });
    onControllerInput?.({ type: "button", button: btn, state: "released" });
  };

  // Handle global pointer up to catch releases outside buttons
  useEffect(() => {
    const handleGlobalUp = () => {
      Object.entries(isPressing.current).forEach(([btn, isPressed]) => {
        if (isPressed) {
          handleButtonUp(btn as "A" | "B" | "AB");
        }
      });
    };
    window.addEventListener("mouseup", handleGlobalUp);
    window.addEventListener("touchend", handleGlobalUp);
    return () => {
      window.removeEventListener("mouseup", handleGlobalUp);
      window.removeEventListener("touchend", handleGlobalUp);
    };
  }, []);

  // Logo stroke color logic
  const logoStroke =
    !isSimulationOn
      ? "rgb(46,197,150)"
      : logoState === "pressed"
        ? "green"
        : logoState === "hover"
          ? "yellow"
          : "rgb(46,197,150)";

  const enableLogoInteraction = isSimulationOn;

  const setCursor = (cursor: string, e: any) => {
    const stage = e?.target?.getStage?.();
    if (stage) stage.container().style.cursor = cursor;
  };

  const onLogoEnter = (e: any) => {
    if (!enableLogoInteraction) return;
    if (!isPressingRef.current) setLogoState("hover");
    setCursor("pointer", e);
  };

  const onLogoLeave = (e: any) => {
    if (!enableLogoInteraction) return;
    if (isPressingRef.current) {
      // user dragged outside while pressing
      setLogoState("pressed");
    } else {
      setLogoState("idle");
      setCursor("default", e);
    }
  };

  const onLogoDown = (e: any) => {
    if (!enableLogoInteraction) return;
    isPressingRef.current = true;
    setLogoState("pressed");
    setCursor("pointer", e);

    // --- NEW: notify controller (pressed)
    onControllerInput?.({ type: "logo", state: "pressed" });
  };

  const endPress = (inside: boolean) => {
    isPressingRef.current = false;
    setLogoState(inside ? "hover" : "idle");
  };

  const onLogoUp = () => {
    if (!enableLogoInteraction) return;
    endPress(true);

    // --- NEW: notify controller (released)
    onControllerInput?.({ type: "logo", state: "released" });
  };

  // Global mouseup to handle release outside
  useEffect(() => {
    const handleWindowUp = () => {
      if (isPressingRef.current) {
        endPress(false);

        // --- NEW: ensure release is sent even if pointer leaves hit area
        if (enableLogoInteraction) {
          onControllerInput?.({ type: "logo", state: "released" });
        }
      }
    };
    window.addEventListener("mouseup", handleWindowUp);
    window.addEventListener("touchend", handleWindowUp);
    return () => {
      window.removeEventListener("mouseup", handleWindowUp);
      window.removeEventListener("touchend", handleWindowUp);
    };
  }, [enableLogoInteraction, onControllerInput]);

  const onLogoClick = () => {
    // Hook for future logo touch event dispatch if needed
  };

  const showExplosion = Boolean(isShorted && isSimulationOn && explosionImg);
  const showShortNotification = Boolean(isShorted && isSimulationOn && isHovered);

  return (
    <BaseElement {...props} isSimulationOn={isSimulationOn}>
      <Group
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
      >
        {imgOffState && !isSimulationOn && (
          <Image
            image={imgOffState}
            width={coords.usbOff.width}
            height={coords.usbOff.height}
            x={coords.usbOff.x}
            y={coords.usbOff.y}
            shadowColor={props.selected ? "#000000" : undefined}
            shadowBlur={props.selected ? 6 : 0}
            shadowOffset={{ x: 15, y: -15 }}
            shadowOpacity={0}
          />
        )}
        {imgOnnState && isSimulationOn && (
          <Image
            image={imgOnnState}
            width={coords.usbOn.width}
            height={coords.usbOn.height}
            x={coords.usbOn.x}
            y={coords.usbOn.y}
            shadowColor={props.selected ? "#000000" : undefined}
            shadowBlur={props.selected ? 10 : 0}
            shadowOffset={{ x: 15, y: -15 }}
            shadowOpacity={0}
          />
        )}
        {imgMicrobitWithBreakout && (
          <Image
            image={imgMicrobitWithBreakout}
            width={coords.width}
            height={coords.height}
            x={coords.offsetX}
            y={coords.offsetY}
            shadowColor={props.selected ? "#000000" : undefined}
            shadowBlur={props.selected ? 10 : 0}
            shadowOffset={{ x: 15, y: -15 }}
            shadowOpacity={0}
          />
        )}

        

        {/* 5x5 LED Grid (matrix is rows-first: leds[y][x]) */}
        {leds.map((row, y) =>
          row.map((_, x) => {
            const b = Math.max(0, Math.min(255, Number(leds[y][x] || 0)));
            const on = b > 0;
            
            const normalizedBrightness = b / 255;
            const brightness = on ? Math.pow(normalizedBrightness, 2.8) : 0;
            
            const centerX = coords.ledMatrix.startX + x * coords.ledMatrix.spacingX;
            const centerY = coords.ledMatrix.startY + y * coords.ledMatrix.spacingY;

            return (
              <Group key={`${x}-${y}`}>
                {/* Outermost extra wide glow - most transparent */}
                {on && (
                  <Rect
                    x={centerX - 8}
                    y={centerY - 8}
                    width={16}
                    height={16}
                    fill="#8B0000"
                    opacity={0.08 * brightness}
                    cornerRadius={8}
                    blur={10}
                  />
                )}
                {/* Outermost soft glow - centered */}
                {on && (
                  <Rect
                    x={centerX - 6}
                    y={centerY - 6}
                    width={12}
                    height={12}
                    fill="#8B0000"
                    opacity={0.15 * brightness}
                    cornerRadius={6}
                    blur={8}
                  />
                )}
                {/* Middle glow ring - centered */}
                {on && (
                  <Rect
                    x={centerX - 4.5}
                    y={centerY - 4.5}
                    width={9}
                    height={9}
                    fill="#CC0000"
                    opacity={0.25 * brightness}
                    cornerRadius={4}
                    blur={5}
                  />
                )}
                {/* Inner bright glow - centered */}
                {on && (
                  <Rect
                    x={centerX - 3}
                    y={centerY - 3}
                    width={6}
                    height={6}
                    fill="#FF4444"
                    opacity={0.35 * brightness}
                    cornerRadius={2}
                    blur={3}
                  />
                )}
                {/* Main LED body - square shape */}
                <Rect
                  x={centerX - 2.5}
                  y={centerY - 2.5}
                  width={5}
                  height={5}
                  fill={on ? "#FF3333" : "#545050ff"}
                  opacity={on ? 0.9 : 0.5}
                  cornerRadius={1.5}
                  shadowColor={on ? "#FF6666" : "#000000"}
                  shadowBlur={on ? 2 : 1}
                  shadowOpacity={on ? 0.4 : 0.2}
                  shadowOffset={{ x: 0, y: 0 }}
                />
                {/* Bright center highlight - small square */}
                {on && (
                  <Rect
                    x={centerX - 1}
                    y={centerY - 1}
                    width={2}
                    height={2}
                    fill="#FFFFFF"
                    opacity={0.8 * brightness}
                    cornerRadius={0.5}
                  />
                )}
              </Group>
            );
          })
        )}

        {/* Touch (Logo) Sensor Overlay */}
        <Group
          x={coords.logo.x}
          y={coords.logo.y}
          listening={true}
          onMouseEnter={onLogoEnter}
          onMouseLeave={onLogoLeave}
          onMouseDown={onLogoDown}
          onMouseUp={onLogoUp}
          onClick={onLogoClick}
          onTouchStart={onLogoDown}
          onTouchEnd={onLogoUp}
        >
          {/* Outer oval */}
          <Rect
            width={coords.logo.width}
            height={coords.logo.height}
            cornerRadius={24}
            stroke={logoStroke}
            strokeWidth={3.7}
            fill="rgba(0,0,0,0.55)"
            opacity={0.95}
          />
          {/* Inner pads */}
          <Circle x={coords.logo.width * 0.30} y={coords.logo.height / 2} radius={2.5} fill={logoStroke} />
          <Circle x={coords.logo.width * 0.70} y={coords.logo.height / 2} radius={2.5} fill={logoStroke} />
          {/* Invisible enlarged hit area */}
          <Rect
            width={coords.logo.width + 6}
            height={coords.logo.height + 6}
            x={-3}
            y={-3}
            cornerRadius={24}
            fill="transparent"
          />
        </Group>

        {/* Button AB */}
        <Group
          onMouseDown={(e: any) => {
            e.cancelBubble = true;
            handleButtonDown("AB");
          }}
          onMouseUp={(e: any) => {
            e.cancelBubble = true;
            handleButtonUp("AB");
          }}
          onTouchStart={(e: any) => {
            e.cancelBubble = true;
            handleButtonDown("AB");
          }}
          onTouchEnd={(e: any) => {
            e.cancelBubble = true;
            handleButtonUp("AB");
          }}
          x={coords.buttons.AB.x}
          y={coords.buttons.AB.y}
        >
          {buttonsPressed.has("AB") && (
            <Rect
              width={12}
              height={12}
              fill=""
              stroke="red"
              strokeWidth={1.5}
              cornerRadius={12}
              x={5.3}
              y={10}
            />
          )}
          <Rect width={12} height={12} x={5.4} y={10} fill="" cornerRadius={10} shadowBlur={3} />
          <Text text="" fill="white" x={6} y={3} fontSize={12} fontStyle="bold" />
        </Group>

        {/* Button A */}
        <Group
          onMouseDown={(e: any) => {
            e.cancelBubble = true;
            handleButtonDown("A");
          }}
          onMouseUp={(e: any) => {
            e.cancelBubble = true;
            handleButtonUp("A");
          }}
          onTouchStart={(e: any) => {
            e.cancelBubble = true;
            handleButtonDown("A");
          }}
          onTouchEnd={(e: any) => {
            e.cancelBubble = true;
            handleButtonUp("A");
          }}
          x={coords.buttons.A.x}
          y={coords.buttons.A.y}
        >
          {buttonsPressed.has("A") && (
            <Rect
              width={16}
              height={16}
              fill=""
              stroke="#1B5FC5"
              strokeWidth={1.2}
              cornerRadius={12}
              x={5.3}
              y={7}
            />
          )}
          <Rect width={10} height={15} x={8} y={6} fill="" cornerRadius={10} shadowBlur={3} />
          <Text text="" fill="white" x={6} y={3} fontSize={12} fontStyle="bold" />
        </Group>

        {/* Button B */}
        <Group
          onMouseDown={(e: any) => {
            e.cancelBubble = true;
            handleButtonDown("B");
          }}
          onMouseUp={(e: any) => {
            e.cancelBubble = true;
            handleButtonUp("B");
          }}
          onTouchStart={(e: any) => {
            e.cancelBubble = true;
            handleButtonDown("B");
          }}
          onTouchEnd={(e: any) => {
            e.cancelBubble = true;
            handleButtonUp("B");
          }}
          x={coords.buttons.B.x}
          y={coords.buttons.B.y}
        >
          {buttonsPressed.has("B") && (
            <Rect
              width={16}
              height={16}
              fill=""
              stroke="#1B5FC5"
              strokeWidth={1.2}
              cornerRadius={12}
              x={1.6}
              y={7}
            />
          )}
          <Rect width={10} height={15} x={5} y={5} fill="" cornerRadius={10} shadowBlur={3} />
          <Text text="" fill="white" x={6} y={3} fontSize={12} fontStyle="bold" />
        </Group>
        {/* Explosion overlay when 3.3V and any GND are shorted */}
        {showExplosion && explosionImg && (
          <Image
            listening={false}
            image={explosionImg}
            x={coords.explosion.x}
            y={coords.explosion.y}
            width={coords.explosion.width}
            height={coords.explosion.height}
            shadowColor="#000000"
            shadowBlur={12}
            shadowOpacity={0.2}
          />
        )}
        {/* Short-circuit notification on hover */}
        {showShortNotification && (
          <ShortCircuitNotification
            show={true}
            message="micro:bit broke because of: Output current is 330 mA, while the maximum current is 90.0 mA."
            offsetX={50}
            offsetY={-40}
          />
        )}
      </Group>
    </BaseElement>
  );
}