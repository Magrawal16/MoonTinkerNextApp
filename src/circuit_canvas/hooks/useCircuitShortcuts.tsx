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
    const matchShortcut = (e: KeyboardEvent, keys: string[]) => {
      const pressed = new Set<string>();
      if (e.ctrlKey || e.metaKey) pressed.add("ctrl");
      if (e.shiftKey) pressed.add("shift");
      if (e.altKey) pressed.add("alt");
      let key = e.key.toLowerCase();

      if (disabledSimulationOnnOff && (key === " " || key === "spacebar")) {
        showMessage("Computing...", "info", 2000);
        return false;
      }

      if (key === " ") key = "space";
      pressed.add(key);

      return keys.every((key) => pressed.has(key));
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (disableShortcut) return; // Ignore if default action is prevented
      const shortcuts = getShortcuts();
      for (const shortcut of shortcuts) {
        if (matchShortcut(e, shortcut.keys)) {
          e.preventDefault();
          shortcut.handler(e);
          break;
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [getShortcuts]);
}
