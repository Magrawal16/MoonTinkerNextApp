import { useMessage } from "@/common/components/ui/GenericMessagePopup";
import { useEffect } from "react";


export type ShortcutDefinition = {
  name: string;
  description: string;
  keys: string[];
  handler: (e: KeyboardEvent) => void;
};

type UseCircuitShortcutsProps = {
  getShortcuts: () => ShortcutDefinition[];
  disableShortcut?: boolean; // Optional flag to disable the shortcut
  disabledSimulationOnnOff?: boolean;
};

export default function useCircuitShortcuts({
  getShortcuts,
  disableShortcut,
  disabledSimulationOnnOff = false,
}: UseCircuitShortcutsProps) {

    const { showMessage } = useMessage();
  
  useEffect(() => {
    const lastHandledRef = { current: {} as Record<string, number> };
    const matchShortcut = (e: KeyboardEvent, keys: string[]) => {
      const requireCtrl = keys.includes("ctrl");
      const requireShift = keys.includes("shift");
      const requireAlt = keys.includes("alt");

      // Normalize primary key
      let key = e.key.toLowerCase();

      if (disabledSimulationOnnOff && (key === " " || key === "spacebar")) {
        showMessage("Computing...", "info", 2000);
        return false;
      }

      if (key === " ") key = "space";

      // Enforce exact modifier matching (no extra modifiers allowed)
      const ctrlPressed = e.ctrlKey || e.metaKey;
      if (ctrlPressed !== requireCtrl) return false;
      if (e.shiftKey !== requireShift) return false;
      if (e.altKey !== requireAlt) return false;

      // Build expected non-modifier keys
      const nonModifierKeys = keys.filter(k => k !== "ctrl" && k !== "shift" && k !== "alt");
      if (nonModifierKeys.length === 0) {
        // Pure modifier shortcuts not used, but handle defensively
        return false;
      }

      // For combos like ["shift","w"] the non-modifier is 'w'
      return nonModifierKeys.every(k => k === key);
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignore auto-repeat; act once per physical key press
      if (e.repeat) return;
      if (disableShortcut) return; // Ignore if default action is prevented
      const shortcuts = getShortcuts();
      for (const shortcut of shortcuts) {
        if (matchShortcut(e, shortcut.keys)) {
          e.preventDefault();
          shortcut.handler(e);
          // Record handling time keyed by primary non-modifier to avoid double-fire on keyup
          const primary = shortcut.keys.find(k => k !== "ctrl" && k !== "shift" && k !== "alt") || "";
          if (primary) {
            (lastHandledRef.current as any)[primary] = performance.now();
          }
          break;
        }
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      if (disableShortcut) return;
      const shortcuts = getShortcuts();
      for (const shortcut of shortcuts) {
        if (matchShortcut(e, shortcut.keys)) {
          const primary = shortcut.keys.find(k => k !== "ctrl" && k !== "shift" && k !== "alt") || "";
          const lastTs = primary ? (lastHandledRef.current as any)[primary] : undefined;
          // If keydown already handled very recently, skip keyup to prevent double action
          if (lastTs && performance.now() - lastTs < 200) {
            break;
          }
          shortcut.handler(e);
          break;
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("keyup", handleKeyUp);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("keyup", handleKeyUp);
    };
  }, [getShortcuts]);
}
