"use client";

import React, { useEffect, useRef, useState } from "react";
import { motion, useMotionValue } from "framer-motion";
import type { CircuitElement } from "../../types/circuit";
import type { PanelPosition } from "../../hooks/useMicrobitSimulationPanelBridge";

interface MicrobitSimulationPanelProps {
  element: CircuitElement;
  elementId: string;
  getPosition: (elementId: string) => PanelPosition | null;
  setTemperature: (elementId: string, value: number) => void | Promise<void>;
  setLightLevel: (elementId: string, value: number) => void | Promise<void>;
  triggerGesture: (elementId: string, gesture: string) => void | Promise<void>;
}

export const MicrobitSimulationPanel: React.FC<
  MicrobitSimulationPanelProps
> = ({ element, elementId, getPosition, setTemperature, setLightLevel, triggerGesture }) => {
  // ----------------------------------
  // Hooks MUST always run (NO early returns)
  // ----------------------------------
  const [mounted, setMounted] = useState(false);
  const [positionReady, setPositionReady] = useState(false);
  const [behindPalette, setBehindPalette] = useState(false);
  const [topToolbarBottom, setTopToolbarBottom] = useState(0);
  const [temperature, setTemperatureValue] = useState(25);
  const [lightLevel, setLightLevelValue] = useState(128);

  const gestureOptions = [
    "shake",
    "logo_up",
    "logo_down",
    "tilt_left",
    "tilt_right",
    "screen_up",
    "screen_down",
    "free_fall",
    "3g",
    "6g",
    "8g",
  ] as const;

  const [gestureMenuOpen, setGestureMenuOpen] = useState(false);
  const [selectedGesture, setSelectedGesture] = useState<(typeof gestureOptions)[number]>(
    "shake"
  );
  const [activeGesture, setActiveGesture] = useState<string | null>(null);
  const [gestureAnimationKey, setGestureAnimationKey] = useState(0);
  const gestureClearTimeoutRef = useRef<number | null>(null);
  const lastPositionRef = useRef<PanelPosition | null>(null);
  const cardRef = useRef<HTMLDivElement | null>(null);
  const draggingRef = useRef(false);
  const dragStateRef = useRef<{
    pointerId: number;
    startClientX: number;
    startClientY: number;
    startOffsetX: number;
    startOffsetY: number;
    panelWidth: number;
    panelHeight: number;
  } | null>(null);

  // Use motion values so updates don't force a React rerender every frame.
  const x = useMotionValue(0);
  const y = useMotionValue(0);
  const scale = useMotionValue(1);
  const offsetX = useMotionValue(0);
  const offsetY = useMotionValue(0);
  const combinedX = useMotionValue(0);
  const combinedY = useMotionValue(0);

  // Keep derived motion values in sync without React re-renders.
  useEffect(() => {
    const update = () => combinedX.set(x.get() + offsetX.get());
    update();
    const unsubA = x.on("change", update);
    const unsubB = offsetX.on("change", update);
    return () => {
      unsubA();
      unsubB();
    };
  }, [combinedX, x, offsetX]);

  useEffect(() => {
    const update = () => combinedY.set(y.get() + offsetY.get());
    update();
    const unsubA = y.on("change", update);
    const unsubB = offsetY.on("change", update);
    return () => {
      unsubA();
      unsubB();
    };
  }, [combinedY, y, offsetY]);

  // ----------------------------------
  // Mount guard (client-only)
  // ----------------------------------
  useEffect(() => {
    setMounted(true);
  }, []);

  // Measure the top toolbar so the panel never overlaps it.
  useEffect(() => {
    if (!mounted) return;

    const measure = () => {
      const toolbarEl = document.getElementById("circuit-top-toolbar");
      if (!toolbarEl) {
        if (topToolbarBottom !== 0) setTopToolbarBottom(0);
        return;
      }
      const rect = toolbarEl.getBoundingClientRect();
      const next = Math.max(0, rect.bottom);
      if (next !== topToolbarBottom) setTopToolbarBottom(next);
    };

    measure();
    window.addEventListener("resize", measure);
    return () => window.removeEventListener("resize", measure);
  }, [mounted, topToolbarBottom]);

  // ----------------------------------
  // Track position continuously so it follows the board during drag/pan/zoom
  // ----------------------------------
  useEffect(() => {
    if (!mounted) return;

    let cancelled = false;
    let rafId = 0;

    const updateOnce = () => {
      if (cancelled) return;

      // While dragging, keep the panel stable in viewport space.
      // After drag ends, we resume anchoring and apply the user offset.
      if (draggingRef.current) return;

      let next: PanelPosition | null = null;
      try {
        next = getPosition(elementId);
      } catch {
        next = null;
      }

      const prev = lastPositionRef.current;
      if (
        (next?.left ?? null) !== (prev?.left ?? null) ||
        (next?.top ?? null) !== (prev?.top ?? null) ||
        (next?.scale ?? null) !== (prev?.scale ?? null)
      ) {
        lastPositionRef.current = next;
        if (next) {
          x.set(next.left);
          y.set(next.top);
          scale.set(next.scale);

          // Keep the panel out of the top toolbar area even when auto-positioning.
          // This applies the constraint by adjusting the user offset (so the panel is pushed down if needed).
          const panelRect = cardRef.current?.getBoundingClientRect();
          const panelHeight = panelRect?.height ?? 0;
          const panelWidth = panelRect?.width ?? 256;
          const padding = 8;
          const safeTop = topToolbarBottom + padding;

          const anchorX = next.left;
          const anchorY = next.top;

          const minOffsetY = safeTop - anchorY;
          const maxOffsetY = window.innerHeight - padding - (anchorY + panelHeight);
          const minOffsetX = padding - anchorX;
          const maxOffsetX = window.innerWidth - padding - (anchorX + panelWidth);

          offsetX.set(clamp(offsetX.get(), minOffsetX, maxOffsetX));
          offsetY.set(clamp(offsetY.get(), minOffsetY, maxOffsetY));
        }
      }

      // Only toggle React state when null/non-null changes (avoid per-frame rerenders)
      const nextReady = !!next;
      if (nextReady !== positionReady) {
        setPositionReady(nextReady);
      }

      // If the panel overlaps the component palette, drop behind it so it doesn't cover the palette.
      // Update state only when it changes to avoid rerenders.
      if (nextReady) {
        const paletteEl = document.getElementById("circuit-palette-panel");
        const panelEl = cardRef.current;
        if (paletteEl && panelEl) {
          const paletteRect = paletteEl.getBoundingClientRect();
          const panelRect = panelEl.getBoundingClientRect();
          const pad = 2;
          const overlaps = !(
            panelRect.right < paletteRect.left + pad ||
            panelRect.left > paletteRect.right - pad ||
            panelRect.bottom < paletteRect.top + pad ||
            panelRect.top > paletteRect.bottom - pad
          );
          if (overlaps !== behindPalette) {
            setBehindPalette(overlaps);
          }
        } else if (behindPalette) {
          setBehindPalette(false);
        }
      } else if (behindPalette) {
        setBehindPalette(false);
      }
    };

    const tick = () => {
      updateOnce();
      rafId = window.requestAnimationFrame(tick);
    };

    // Update immediately and then keep tracking
    tick();

    // Also refresh on scroll/resize (capturing scroll for nested containers)
    const onViewportChange = () => updateOnce();
    window.addEventListener("resize", onViewportChange);
    window.addEventListener("scroll", onViewportChange, true);

    return () => {
      cancelled = true;
      if (rafId) window.cancelAnimationFrame(rafId);
      window.removeEventListener("resize", onViewportChange);
      window.removeEventListener("scroll", onViewportChange, true);
    };
  }, [mounted, elementId, getPosition, positionReady, behindPalette, topToolbarBottom, x, y, scale, offsetX, offsetY]);

  const isInteractiveTarget = (target: EventTarget | null) => {
    if (!(target instanceof Element)) return false;
    return !!target.closest(
      "button, input, select, textarea, a, [role='button'], [contenteditable='true']"
    );
  };

  const clamp = (value: number, min: number, max: number) =>
    Math.min(Math.max(value, min), max);

  const onPointerDown: React.PointerEventHandler<HTMLDivElement> = (e) => {
    // Support left-click or right-click drag.
    if (e.button !== 0 && e.button !== 2) return;
    if (isInteractiveTarget(e.target)) return;

    e.stopPropagation();
    // Prevent context menu / default behaviors when using right-click drag.
    e.preventDefault();

    draggingRef.current = true;
    const panelRect = cardRef.current?.getBoundingClientRect();

    dragStateRef.current = {
      pointerId: e.pointerId,
      startClientX: e.clientX,
      startClientY: e.clientY,
      startOffsetX: offsetX.get(),
      startOffsetY: offsetY.get(),
      panelWidth: panelRect?.width ?? 256,
      panelHeight: panelRect?.height ?? 0,
    };

    try {
      (e.currentTarget as HTMLDivElement).setPointerCapture(e.pointerId);
    } catch {
      // ignore
    }
  };

  const onPointerMove: React.PointerEventHandler<HTMLDivElement> = (e) => {
    const state = dragStateRef.current;
    if (!state || !draggingRef.current) return;
    if (e.pointerId !== state.pointerId) return;
    e.stopPropagation();
    e.preventDefault();

    const dx = e.clientX - state.startClientX;
    const dy = e.clientY - state.startClientY;

    const nextOffsetX = state.startOffsetX + dx;
    const nextOffsetY = state.startOffsetY + dy;

    // Keep the panel within the viewport.
    // Clamp based on the anchored position plus offset.
    const padding = 8;
    const safeTop = topToolbarBottom + padding;
    const anchorX = x.get();
    const anchorY = y.get();
    const maxOffsetX = window.innerWidth - padding - (anchorX + state.panelWidth);
    const minOffsetX = padding - anchorX;
    const maxOffsetY = window.innerHeight - padding - (anchorY + state.panelHeight);
    const minOffsetY = safeTop - anchorY;

    offsetX.set(clamp(nextOffsetX, minOffsetX, maxOffsetX));
    offsetY.set(clamp(nextOffsetY, minOffsetY, maxOffsetY));
  };

  const endDrag = (e: React.PointerEvent<HTMLDivElement>) => {
    const state = dragStateRef.current;
    if (!state) return;
    if (e.pointerId !== state.pointerId) return;
    draggingRef.current = false;
    dragStateRef.current = null;
    try {
      (e.currentTarget as HTMLDivElement).releasePointerCapture(e.pointerId);
    } catch {
      // ignore
    }
  };

  // ----------------------------------
  // Sync values to simulator
  // ----------------------------------
  useEffect(() => {
    if (!mounted) return;
    void Promise.resolve(setTemperature(elementId, temperature)).catch(() => {});
  }, [mounted, elementId, temperature, setTemperature]);

  useEffect(() => {
    if (!mounted) return;
    void Promise.resolve(setLightLevel(elementId, lightLevel)).catch(() => {});
  }, [mounted, elementId, lightLevel, setLightLevel]);

  // Clear any pending gesture timeout on unmount.
  useEffect(() => {
    return () => {
      if (gestureClearTimeoutRef.current !== null) {
        window.clearTimeout(gestureClearTimeoutRef.current);
        gestureClearTimeoutRef.current = null;
      }
    };
  }, []);

  // ----------------------------------
  // ONLY conditionally render JSX (hooks already ran)
  // ----------------------------------
  if (!mounted || !positionReady) {
    return null;
  }

  // ----------------------------------
  // UI
  // ----------------------------------
  const title = element.type === "microbitWithBreakout" ? "microbitwithbreakout" : "micro:bit";

  const runGesture = (gesture: (typeof gestureOptions)[number]) => {
    if (gestureClearTimeoutRef.current !== null) {
      window.clearTimeout(gestureClearTimeoutRef.current);
      gestureClearTimeoutRef.current = null;
    }

    setActiveGesture(gesture);
    setGestureAnimationKey((k) => k + 1);
    void Promise.resolve(triggerGesture(elementId, gesture)).catch(() => {});

    const gestureHoldMs = gesture === "free_fall" ? 1100 : 650;
    gestureClearTimeoutRef.current = window.setTimeout(() => {
      setActiveGesture(null);
      gestureClearTimeoutRef.current = null;
    }, gestureHoldMs);
  };

  const gesturePreviewAnimation = (() => {
    const easeOut: [number, number, number, number] = [0.16, 1, 0.3, 1];
    switch (activeGesture) {
      case "shake":
        return {
          x: [0, -6, 6, -4, 4, 0],
          rotateZ: [0, -2, 2, -1, 1, 0],
          transition: { duration: 0.45, ease: easeOut },
        };
      case "free_fall":
        // 3D tumble off a table: tip, fall (show side), then settle back.
        return {
          x: [0, 1.4, -0.9, 0.6, 0, 0],
          y: [0, 3, 14, 32, 22, 0],
          rotateX: [0, 55, 128, 182, 110, 0],
          rotateY: [0, -14, -44, -74, -20, 0],
          rotateZ: [0, 12, 46, 98, 38, 0],
          scale: [1, 0.98, 0.94, 0.88, 0.93, 1],
          transition: {
            duration: 0.9,
            ease: easeOut,
            times: [0, 0.12, 0.45, 0.72, 0.86, 1],
          },
        };
      case "3g":
        return {
          x: [0, -0.6, 0.6, 0],
          y: [0, 0.3, -0.3, 0],
          rotateZ: [0, -0.25, 0.25, 0],
          scale: [1, 1.05, 0.998, 1],
          transition: { duration: 0.26, ease: easeOut },
        };
      case "6g":
        return {
          x: [0, -1, 1, 0],
          y: [0, 0.5, -0.5, 0],
          rotateZ: [0, -0.4, 0.4, 0],
          scale: [1, 1.09, 0.995, 1],
          transition: { duration: 0.3, ease: easeOut },
        };
      case "8g":
        return {
          x: [0, -2, 2, -1, 1, 0],
          y: [0, 1, -1, 0],
          rotateZ: [0, -0.8, 0.8, 0],
          scale: [1, 1.13, 0.99, 1],
          transition: { duration: 0.32, ease: easeOut },
        };
      case "tilt_left":
        // 3D tilt: right side closer (stretched), left side recedes
        return {
          rotateY: [0, -26, -26, 0],
          transition: { duration: 0.55, ease: easeOut },
        };
      case "tilt_right":
        // 3D tilt: left side closer (stretched), right side recedes
        return {
          rotateY: [0, 26, 26, 0],
          transition: { duration: 0.55, ease: easeOut },
        };
      case "screen_up":
        // 3D: looks like it's lying flat, screen facing up (foreshortened vertically)
        return {
          rotateX: [0, 70, 70, 0],
          // Add the same in-plane rotation as screen_down for visual comparison.
          // This keeps the screen/front face up; it only rotates the board orientation.
          rotateZ: [0, 180, 180, 0],
          scaleY: [1, 0.62, 0.62, 1],
          y: [0, 2, 2, 0],
          transition: { duration: 0.6, ease: easeOut },
        };
      case "screen_down":
        // Opposite of screen_up: looks like it's lying flat, screen facing down
        return {
          rotateX: [0, -70, -70, 0],
          // When flipped, the board reads upside-down; keep the pins side at the bottom
          // during the compressed portion.
          rotateZ: [0, 180, 180, 0],
          scaleY: [1, 0.62, 0.62, 1],
          y: [0, 2, 2, 0],
          transition: { duration: 0.6, ease: easeOut },
        };
      case "logo_up":
        // Tilt so the logo side appears lifted (bottom edge recedes / appears pushed up)
        return {
          rotateX: [0, -26, -26, 0],
          transition: { duration: 0.55, ease: easeOut },
        };
      case "logo_down":
        // Opposite tilt (bottom edge closer / stretched down)
        return {
          rotateX: [0, 26, 26, 0],
          transition: { duration: 0.55, ease: easeOut },
        };
      default:
        // Always snap back to a known neutral state so the preview can't get "stuck"
        // if the prior animation was interrupted.
        return {
          x: 0,
          y: 0,
          rotateZ: 0,
          rotateX: 0,
          rotateY: 0,
          scale: 1,
          transition: { duration: 0.08, ease: easeOut },
        };
    }
  })();

  const previewGridStyle: React.CSSProperties = {
    backgroundColor: "#ffffff",
    backgroundImage:
      "linear-gradient(to right, rgba(180, 180, 180, 0.25) 1px, transparent 1px), linear-gradient(to bottom, rgba(180, 180, 180, 0.25) 1px, transparent 1px), linear-gradient(to right, rgba(180, 180, 180, 0.45) 1px, transparent 1px), linear-gradient(to bottom, rgba(180, 180, 180, 0.45) 1px, transparent 1px)",
    backgroundSize: "5px 5px, 5px 5px, 25px 25px, 25px 25px",
    backgroundPosition: "0 0, 0 0, 0 0, 0 0",
  };

  return (
    <motion.div
      onMouseDown={(e) => e.stopPropagation()}
      onClick={(e) => e.stopPropagation()}
      onContextMenu={(e) => e.preventDefault()}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={endDrag}
      onPointerCancel={endDrag}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.15, ease: "easeOut" }}
      className={behindPalette ? "fixed z-20" : "fixed z-50"}
      style={{
        left: 0,
        top: 0,
        x: combinedX,
        y: combinedY,
      }}
    >
      <motion.div
        ref={cardRef}
        className="
          relative w-64
          rounded-2xl
          border border-slate-300
          bg-slate-200
          ring-2 ring-blue-400/70 ring-offset-2 ring-offset-slate-200
          shadow-lg
          transition
          hover:shadow-xl
          p-3
          cursor-grab active:cursor-grabbing
        "
        initial={{ y: 6, scale: 0.985 }}
        animate={{ y: 0, scale: 1 }}
        exit={{ y: 6, scale: 0.985 }}
        transition={{ duration: 0.16, ease: "easeOut" }}
        style={{
          scale,
          transformOrigin: "top left",
        }}
      >
        <h4 className="mb-2 text-sm font-semibold text-slate-800">{title}</h4>

        {/* Temperature */}
        <div className="mb-3 space-y-1">
          <label className="text-xs text-slate-600">
            Temperature <span className="font-medium">{temperature}°C</span>
          </label>
          <input
            type="range"
            min={-5}
            max={50}
            value={temperature}
            onChange={(e) => setTemperatureValue(Number(e.target.value))}
            className="w-full accent-red-500"
          />
        </div>

        {/* Light Level */}
        <div className="mb-3 space-y-1">
          <label className="text-xs text-slate-600">
            Light Level <span className="font-medium">{lightLevel}</span>
          </label>
          <input
            type="range"
            min={0}
            max={255}
            value={lightLevel}
            onChange={(e) => setLightLevelValue(Number(e.target.value))}
            className="w-full accent-yellow-400"
          />
        </div>

        {/* Mini micro:bit preview */}
        <div className="mb-3">
          <label className="mb-2 block text-xs text-slate-600">Preview</label>
          <div className="flex justify-center">
            <div
              className="grid h-24 w-24 place-items-center rounded-lg border border-slate-300 bg-transparent"
              style={previewGridStyle}
            >
              <div style={{ perspective: "600px" }}>
                <div
                  className={
                    element.type === "microbitWithBreakout"
                      ? "relative flex h-16 w-20 items-center justify-center"
                      : "relative flex h-16 w-16 items-center justify-center"
                  }
                  style={
                    activeGesture === "free_fall"
                      ? {
                          // Keep the larger tumble/drop inside the existing 24x24 preview.
                          transform: "translateY(-10px) scale(0.88)",
                        }
                      : undefined
                  }
                >
                  <motion.div
                    key={gestureAnimationKey}
                    animate={gesturePreviewAnimation}
                    className="relative flex h-full w-full items-center justify-center"
                    style={{ transformOrigin: "50% 50%", transformStyle: "preserve-3d" }}
                  >
                  <motion.img
                    src={
                      element.type === "microbitWithBreakout"
                        ? "/assets/circuit_canvas/elements/microbit_with_breakout.svg"
                        : "/assets/circuit_canvas/elements/microbit.svg"
                    }
                    alt="micro:bit preview"
                    className="block h-full w-full object-contain object-center"
                    animate={
                      activeGesture === "free_fall"
                        ? {
                            // Hide the top view while the side-view slab is visible.
                            opacity: [1, 0.25, 0, 0, 0.7, 1],
                          }
                        : undefined
                    }
                    transition={
                      activeGesture === "free_fall"
                        ? {
                            duration: 0.9,
                            ease: [0.16, 1, 0.3, 1],
                            times: [0, 0.12, 0.45, 0.72, 0.86, 1],
                          }
                        : undefined
                    }
                    style={
                      {
                        transform: "translateY(-5px)",
                        ...(activeGesture === "screen_down"
                          ? { filter: "brightness(0) saturate(0)" }
                          : null),
                      }
                    }
                    draggable={false}
                  />

                  {activeGesture === "free_fall" && (
                    <motion.div
                      className="pointer-events-none absolute left-1/2 top-1/2 h-2 w-14 -translate-x-1/2 -translate-y-1/2 rounded-sm bg-slate-900"
                      style={{ transform: "translateY(-5px)", transformStyle: "preserve-3d" }}
                      animate={{
                        // Side view appears mid-tumble (rear/dark cue), then disappears.
                        opacity: [0, 0.75, 1, 1, 0.35, 0],
                        rotateX: [90, 86, 82, 78, 84, 90],
                        rotateY: [0, -14, -44, -74, -20, 0],
                        rotateZ: [0, 12, 46, 98, 38, 0],
                      }}
                      transition={{
                        duration: 0.9,
                        ease: [0.16, 1, 0.3, 1],
                        times: [0, 0.12, 0.45, 0.72, 0.86, 1],
                      }}
                    />
                  )}

                  {activeGesture === "tilt_left" && (
                    <div className="pointer-events-none absolute top-0 right-3 text-slate-600">
                      <svg
                        width="16"
                        height="16"
                        viewBox="0 0 24 24"
                        fill="none"
                        xmlns="http://www.w3.org/2000/svg"
                        aria-label="tilt left"
                      >
                        <path
                          d="M20 12H6"
                          stroke="currentColor"
                          strokeWidth="2"
                          strokeLinecap="round"
                        />
                        <path
                          d="M10 8L6 12L10 16"
                          stroke="currentColor"
                          strokeWidth="2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                      </svg>
                    </div>
                  )}

                  {activeGesture === "tilt_right" && (
                    <div className="pointer-events-none absolute top-0 left-3 text-slate-600">
                      <svg
                        width="16"
                        height="16"
                        viewBox="0 0 24 24"
                        fill="none"
                        xmlns="http://www.w3.org/2000/svg"
                        aria-label="tilt right"
                      >
                        <path
                          d="M4 12H18"
                          stroke="currentColor"
                          strokeWidth="2"
                          strokeLinecap="round"
                        />
                        <path
                          d="M14 8L18 12L14 16"
                          stroke="currentColor"
                          strokeWidth="2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                      </svg>
                    </div>
                  )}

                {/* Tiny label for orientation gestures */}
                {activeGesture === "logo_up" && (
                  <div className="pointer-events-none absolute top-1 left-1/2 -translate-x-1/2 text-slate-600">
                    <svg
                      width="14"
                      height="14"
                      viewBox="0 0 24 24"
                      fill="none"
                      xmlns="http://www.w3.org/2000/svg"
                      aria-label="logo up"
                    >
                      <path
                        d="M12 18V6"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                      />
                      <path
                        d="M6 12L12 6L18 12"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                  </div>
                )}
                {activeGesture === "logo_down" && (
                  <div className="pointer-events-none absolute top-1 left-1/2 -translate-x-1/2 text-slate-600">
                    <svg
                      width="14"
                      height="14"
                      viewBox="0 0 24 24"
                      fill="none"
                      xmlns="http://www.w3.org/2000/svg"
                      aria-label="logo down"
                    >
                      <path
                        d="M12 6V18"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                      />
                      <path
                        d="M6 12L12 18L18 12"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                  </div>
                )}

                  </motion.div>

                  {activeGesture === "screen_up" && (
                    <div className="pointer-events-none absolute top-0 left-1/2 -translate-x-1/2 text-slate-600">
                      <div className="flex items-center gap-1 text-[10px] leading-none">
                        <svg
                          width="12"
                          height="12"
                          viewBox="0 0 24 24"
                          fill="none"
                          xmlns="http://www.w3.org/2000/svg"
                          aria-label="front side"
                        >
                          <path
                            d="M12 18V6"
                            stroke="currentColor"
                            strokeWidth="2"
                            strokeLinecap="round"
                          />
                          <path
                            d="M6 12L12 6L18 12"
                            stroke="currentColor"
                            strokeWidth="2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          />
                        </svg>
                        <span className="font-semibold">FRONT</span>
                      </div>
                    </div>
                  )}

                  {activeGesture === "screen_down" && (
                    <div className="pointer-events-none absolute top-0 left-1/2 -translate-x-1/2 text-slate-600">
                      <div className="flex items-center gap-1 text-[10px] leading-none">
                        <svg
                          width="12"
                          height="12"
                          viewBox="0 0 24 24"
                          fill="none"
                          xmlns="http://www.w3.org/2000/svg"
                          aria-label="rear side"
                        >
                          <path
                            d="M12 18V6"
                            stroke="currentColor"
                            strokeWidth="2"
                            strokeLinecap="round"
                          />
                          <path
                            d="M6 12L12 6L18 12"
                            stroke="currentColor"
                            strokeWidth="2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          />
                        </svg>
                        <span className="font-semibold">REAR</span>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Gestures */}
        <div>
          <label className="mb-2 block text-xs text-slate-600">Gestures</label>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setGestureMenuOpen((v) => !v)}
              className="rounded-md bg-blue-500 px-2 py-1 text-xs text-white hover:bg-blue-600 active:scale-95 transition"
            >
              Gestures
            </button>
            <div className="text-xs text-slate-700">
              Selected: <span className="font-medium">{selectedGesture.replace("_", " ")}</span>
            </div>
            <button
              type="button"
              onClick={() => {
                setGestureMenuOpen(false);
                runGesture(selectedGesture);
              }}
              className="ml-auto rounded-md bg-slate-700 px-2 py-1 text-xs text-white hover:bg-slate-800 active:scale-95 transition"
            >
              OK
            </button>
          </div>

          {gestureMenuOpen && (
            <div className="mt-2 grid grid-cols-2 gap-2">
              {gestureOptions.map((gesture) => {
                const isSelected = gesture === selectedGesture;
                return (
                  <button
                    key={gesture}
                    type="button"
                    onClick={() => setSelectedGesture(gesture)}
                    className={
                      isSelected
                        ? "rounded-md bg-slate-800 px-2 py-1 text-xs text-white transition"
                        : "rounded-md bg-slate-200 px-2 py-1 text-xs text-slate-800 hover:bg-slate-300 transition"
                    }
                  >
                    {gesture.replace("_", " ")}
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </motion.div>
    </motion.div>
  );
};
