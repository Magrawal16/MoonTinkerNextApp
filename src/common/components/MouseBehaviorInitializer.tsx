"use client";

import { useEffect } from "react";
import { initializeUnifiedMouseBehavior } from "@/common/utils/unifiedMouseHandler";

/**
 * Initialize unified mouse behavior (right-click = left-click)
 * Must be a client component to access window API
 */
export function MouseBehaviorInitializer() {
  useEffect(() => {
    initializeUnifiedMouseBehavior();
  }, []);

  return null;
}
