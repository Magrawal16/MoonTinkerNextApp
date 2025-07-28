// components/DebugBox.tsx
"use client";

import React from "react";
// If your Window component is at src/components/ui/Window.tsx, use a relative import:
import { Window } from "../ui/Window";

interface DebugBoxProps {
  data: Record<string, unknown>;
  className?: string;
  onClose?: () => void; // Optional close handler
}

export function DebugBox({ data, className, onClose }: DebugBoxProps) {
  return (
    <Window
      title="Debug"
      resizable
      draggable
      className={className}
      backgroundColor="black"
      onClose={onClose}
    >
      <div className="text-emerald-400 font-mono text-xs p-2">
        <pre>{JSON.stringify(data, null, 2)}</pre>
      </div>
    </Window>
  );
}
