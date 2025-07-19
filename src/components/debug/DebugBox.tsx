// components/DebugBox.tsx
"use client";

import React from "react";

interface DebugBoxProps {
  data: Record<string, unknown>;
  className?: string;
}

export function DebugBox({ data, className }: DebugBoxProps) {
  return (
    <div className={`bg-black text-emerald-700 font-bold text-sm p-4 rounded-md overflow-auto shadow-lg ${className}`}>
      <pre>{JSON.stringify(data, null, 2)}</pre>
    </div>
  );
}
