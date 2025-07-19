import { useEffect } from "react";

export type ShortcutDefinition = {
  name: string;
  description: string;
  keys: string[];
  handler: (e: KeyboardEvent) => void;
};

type UseCircuitShortcutsProps = {
  getShortcuts: () => ShortcutDefinition[];
};

export default function useCircuitShortcuts({
  getShortcuts,
}: UseCircuitShortcutsProps) {
  useEffect(() => {
    const matchShortcut = (e: KeyboardEvent, keys: string[]) => {
      const pressed = new Set<string>();
      if (e.ctrlKey || e.metaKey) pressed.add("ctrl");
      if (e.shiftKey) pressed.add("shift");
      if (e.altKey) pressed.add("alt");
      pressed.add(e.key.toLowerCase());

      return keys.every((key) => pressed.has(key));
    };

    const handleKeyDown = (e: KeyboardEvent) => {
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
