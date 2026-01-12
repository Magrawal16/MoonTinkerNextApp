"use client";

import {
  BaseElementProps,
  MicrobitProps,
} from "@/circuit_canvas/types/circuit";
import { BaseElement } from "@/circuit_canvas/components/core/BaseElement";
import { useEffect, useState, useRef } from "react";
import { Group, Image, Rect, Text, Circle } from "react-konva";
import { ShortCircuitNotification } from "./ShortCircuitNotification";
import { getMicrobitCoordinates } from "@/circuit_canvas/utils/microbitCoordinateMap";

export default function Microbit({
  leds,
  onControllerInput,
  isSimulationOn,
  isShorted,
  color = "red",
  ...props
}: MicrobitProps & BaseElementProps) {
  const [imgMicrobit, setImgMicrobit] = useState<HTMLImageElement | null>(null);
  const [imgOnnState, setImgOnnState] = useState<HTMLImageElement | null>(null);
  const [imgOffState, setImgOffState] = useState<HTMLImageElement | null>(null);
  const [explosionImg, setExplosionImg] = useState<HTMLImageElement | null>(null);
  const [btnPressed, setBtnPressed] = useState<"A" | "B" | "AB" | null>(null);
  // Logo (touch sensor) interaction state
  const [logoState, setLogoState] = useState<"idle" | "hover" | "pressed">("idle");
  const isPressingRef = useRef(false);
  // Hover state for short-circuit notification
  const [isHovered, setIsHovered] = useState(false);

  const supportedColors = ["red", "yellow", "green", "blue"] as const;
  const rawColor = (color ?? "").toLowerCase();
  const microbitColor = (supportedColors as readonly string[]).includes(rawColor)
    ? rawColor
    : "red";

  // Get all coordinates for the selected color variant
  const coords = getMicrobitCoordinates(microbitColor);

  useEffect(() => {
    const image = new window.Image();
    image.src = `assets/circuit_canvas/elements/microbit_${microbitColor}.svg`;
    image.onload = () => setImgMicrobit(image);
    image.alt = "Microbit";
  }, [microbitColor]);

  useEffect(() => {
    const image = new window.Image();
    image.src = "assets/circuit_canvas/elements/microbit_usb_onn.svg";
    image.onload = () => setImgOnnState(image);
    image.alt = "Microbit";
  }, []);

  useEffect(() => {
    const image = new window.Image();
    image.src = "assets/circuit_canvas/elements/microbit_usb_off.svg";
    image.onload = () => setImgOffState(image);
    image.alt = "Microbit";
  }, []);

  useEffect(() => {
    const image = new window.Image();
    image.src = "assets/circuit_canvas/elements/Explosion.svg";
    image.onload = () => setExplosionImg(image);
    image.alt = "Microbit Explosion";
  }, []);

  // Button press/release handlers for hold logic
  const handleButtonDown = (btn: "A" | "B" | "AB") => {
    setBtnPressed(btn);
    onControllerInput?.({ type: "button", button: btn, state: "pressed" });
  };
  const handleButtonUp = (btn: "A" | "B" | "AB") => {
    setBtnPressed(null);
    onControllerInput?.({ type: "button", button: btn, state: "released" });
  };

  // Logo stroke color logic - match microbit shell color
  const getLogoColor = () => {
    const colorMap: Record<string, string> = {
      red: "rgb(200,36,52)",
      yellow: "rgb(255,193,7)",
      green: "rgb(76,175,80)",
      blue: "rgb(33,150,243)",
    };
    return colorMap[color] || "rgb(200,36,52)";
  };

  const darkenColor = (colorStr: string, factor: number = 0.7) => {
    // Extract RGB values and adjust by factor
    const match = colorStr.match(/\d+/g);
    if (!match) return colorStr;
    const [r, g, b] = match.map(Number);
    return `rgb(${Math.floor(r * factor)},${Math.floor(g * factor)},${Math.floor(b * factor)})`;
  };

  const baseLogoColor = getLogoColor();
  const logoStroke =
    !isSimulationOn
      ? darkenColor(baseLogoColor, 0.6)  // Darker by default (60%)
      : logoState === "pressed"
        ? baseLogoColor  // Full brightness when pressed (100%)
        : logoState === "hover"
          ? darkenColor(baseLogoColor, 0.8)  // Medium brightness on hover (80%)
          : darkenColor(baseLogoColor, 0.6);  // Darker by default (60%)

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

  // Global mouseup to handle releasing a button if pointer leaves the hit area
  useEffect(() => {
    const handleGlobalUp = () => {
      if (btnPressed) {
        // send a release for whichever button was pressed
        handleButtonUp(btnPressed);
      }
    };
    window.addEventListener("mouseup", handleGlobalUp);
    window.addEventListener("touchend", handleGlobalUp);
    return () => {
      window.removeEventListener("mouseup", handleGlobalUp);
      window.removeEventListener("touchend", handleGlobalUp);
    };
  }, [btnPressed]);

  const onLogoClick = () => {
    // Hook for future logo touch event dispatch if needed
  };

  const showExplosion = Boolean(isShorted && isSimulationOn && explosionImg);
  const showShortNotification = Boolean(isShorted && isSimulationOn && isHovered);
  const baseReady = Boolean(imgMicrobit);

  return (
    <BaseElement {...props} isSimulationOn={isSimulationOn}>
      <Group
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
      >
        {/* Custom hit area for selecting the microbit - covers only the main board */}
        <Rect
          x={coords.hitArea.x}
          y={coords.hitArea.y}
          width={coords.hitArea.width}
          height={coords.hitArea.height}
          fill="transparent"
          listening={true}
        />
        
        {baseReady && imgOffState && !isSimulationOn && (
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
            listening={false}
          />
        )}
        {baseReady && imgOnnState && isSimulationOn && (
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
            listening={false}
          />
        )}
        {imgMicrobit && (
          <Image
            image={imgMicrobit}
            width={coords.width}
            height={coords.height}
            x={coords.offsetX}
            y={coords.offsetY}
            shadowColor={props.selected ? "#000000" : undefined}
            shadowBlur={props.selected ? 10 : 0}
            shadowOffset={{ x: 15, y: -15 }}
            shadowOpacity={0}
            listening={false}
          />
        )}
        {baseReady && (
          <>
            {/* Version label */}
            <Text
              text="V2"
              x={coords.versionText.x}
              y={coords.versionText.y}
              fontSize={coords.versionText.fontSize}
              fill={coords.versionText.color ?? "#FFFFFF"}
              fontStyle="bold"
              listening={false}
            />

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
                  opacity={on ? Math.min(0.9, 0.3 + brightness * 0.6) : 0.5}
                  cornerRadius={1.5}
                  shadowColor={on ? "#FF6666" : "#000000"}
                  shadowBlur={on ? 2 : 1}
                  shadowOpacity={on ? 0.4 * brightness : 0.2}
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
                cornerRadius={20}
                stroke={logoStroke}
                strokeWidth={coords.logo.strokeWidth}
                fill="rgba(0,0,0,0.55)"
                opacity={10}
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
              x={coords.buttons.AB.x}
              y={coords.buttons.AB.y}
              onMouseDown={() => handleButtonDown("AB")}
              onMouseUp={() => handleButtonUp("AB")}
              onTouchStart={() => handleButtonDown("AB")}
              onTouchEnd={() => handleButtonUp("AB")}
            >
              {btnPressed === "AB" && (
                <Rect
                  width={12}
                  height={12}
                  fill=""
                  stroke="red"
                  strokeWidth={1.5}
                  cornerRadius={12}
                  x={2.8}
                  y={0.6}
                />
              )}
              <Rect width={20} height={20} fill="" cornerRadius={10} shadowBlur={3} />
              <Text text="" fill="white" x={6} y={3} fontSize={12} fontStyle="bold" />
            </Group>

            {/* Button A */}
            <Group
              x={coords.buttons.A.x}
              y={coords.buttons.A.y}
              onMouseDown={() => handleButtonDown("A")}
              onMouseUp={() => handleButtonUp("A")}
              onTouchStart={() => handleButtonDown("A")}
              onTouchEnd={() => handleButtonUp("A")}
            >
              {(btnPressed === "A" || btnPressed === "AB") && (
                <Rect
                  width={16}
                  height={16}
                  fill=""
                  stroke="#1B5FC5"
                  strokeWidth={1.2}
                  cornerRadius={12}
                  x={2.8}
                  y={0.6}
                />
              )}
              <Rect width={20} height={20} fill="" cornerRadius={10} shadowBlur={3} />
              <Text text="" fill="white" x={6} y={3} fontSize={12} fontStyle="bold" />
            </Group>

            {/* Button B */}
            <Group
              x={coords.buttons.B.x}
              y={coords.buttons.B.y}
              onMouseDown={() => handleButtonDown("B")}
              onMouseUp={() => handleButtonUp("B")}
              onTouchStart={() => handleButtonDown("B")}
              onTouchEnd={() => handleButtonUp("B")}
            >
              {(btnPressed === "B" || btnPressed === "AB") && (
                <Rect
                  width={16}
                  height={16}
                  fill=""
                  stroke="#1B5FC5"
                  strokeWidth={1.2}
                  cornerRadius={12}
                  x={1.6}
                  y={0.6}
                />
              )}
              <Rect width={20} height={20} fill="" cornerRadius={10} shadowBlur={3} />
              <Text text="" fill="white" x={6} y={3} fontSize={12} fontStyle="bold" />
            </Group>

            {/* Explosion overlay when 3.3V and GND are shorted */}
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
                offsetY={30}
              />
            )}
          </>
        )}
      </Group>
    </BaseElement>
  );
}