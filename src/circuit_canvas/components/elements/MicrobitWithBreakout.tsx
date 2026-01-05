"use client";

import {
  BaseElementProps,
  MicrobitProps,
} from "@/circuit_canvas/types/circuit";
import { BaseElement } from "@/circuit_canvas/components/core/BaseElement";
import { useEffect, useState, useRef } from "react";
import { Group, Image, Rect, Text, Circle } from "react-konva";

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

  // Tunable constants for logo overlay alignment
  // Adjust LOGO_X / LOGO_Y to perfectly cover the SVG logo.
  const LOGO_X = 101;     // horizontal position
  const LOGO_Y = 87.3;     // vertical position (was 55; moved down to align)
  const LOGO_W = 23.2;
  const LOGO_H = 14;

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

  return (
    <BaseElement {...props} isSimulationOn={isSimulationOn}>
      <Group>
        {imgOffState && !isSimulationOn && (
          <Image
            image={imgOffState}
            width={220}
            height={220}
            x={0}
            y={-89}
            shadowColor={props.selected ? "#000000" : undefined}
            shadowBlur={props.selected ? 6 : 0}
            shadowOffset={{ x: 15, y: -15 }}
            shadowOpacity={0}
          />
        )}
        {imgOnnState && isSimulationOn && (
          <Image
            image={imgOnnState}
            width={220}
            height={220}
            x={0.7}
            y={-71}
            shadowColor={props.selected ? "#000000" : undefined}
            shadowBlur={props.selected ? 10 : 0}
            shadowOffset={{ x: 15, y: -15 }}
            shadowOpacity={0}
          />
        )}
        {imgMicrobitWithBreakout && (
          <Image
            image={imgMicrobitWithBreakout}
            width={220}
            height={220}
            shadowColor={props.selected ? "#000000" : undefined}
            shadowBlur={props.selected ? 10 : 0}
            shadowOffset={{ x: 15, y: -15 }}
            shadowOpacity={0}
          />
        )}

        

        {/* 5x5 LED Grid (matrix is rows-first: leds[y][x])
            Render using the same layered glow + center LED used by the plain Microbit
            but keep the breakout image's grid offsets so LEDs align correctly. */}
        {leds.map((row, y) =>
          row.map((_, x) => {
            const b = Math.max(0, Math.min(255, Number(leds[y][x] || 0)));
            const on = b > 0;
            const brightness = on ? b / 255 : 0;

            // Use the breakout's original grid origin and cell spacing, then
            // compute a center to draw the same glow layers as the Microbit
            const centerX = 85 + x * 11.8 + 2; // original left + half of small rect -> center
            const centerY = 44.4 + y * 13 + 5.05;

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
          x={LOGO_X - 2}
          y={LOGO_Y - 63.2}
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
            width={LOGO_W}
            height={LOGO_H}
            cornerRadius={24}
            stroke={logoStroke}
            strokeWidth={3.7}
            fill="rgba(0,0,0,0.55)"
            opacity={0.95}
          />
          {/* Inner pads */}
          <Circle x={LOGO_W * 0.30} y={LOGO_H / 2} radius={2.5} fill={logoStroke} />
          <Circle x={LOGO_W * 0.70} y={LOGO_H / 2} radius={2.5} fill={logoStroke} />
          {/* Invisible enlarged hit area */}
          <Rect
            width={LOGO_W + 6}
            height={LOGO_H + 6}
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
          x={157.1}
          y={20}
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
          x={39.4}
          y={60}
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
          x={158.9}
          y={60}
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
            x={65}
            y={30}
            width={90}
            height={90}
            shadowColor="#000000"
            shadowBlur={12}
            shadowOpacity={0.2}
          />
        )}
      </Group>
    </BaseElement>
  );
}