import { useEffect, useRef, useState } from "react";

export function formatHms(seconds: number) {
  const h = String(Math.floor(seconds / 3600)).padStart(2, "0");
  const m = String(Math.floor((seconds % 3600) / 60)).padStart(2, "0");
  const s = String(seconds % 60).padStart(2, "0");
  return `${h}:${m}:${s}`;
}

export function useSimulationTimer(simulationRunning: boolean) {
  const [simulationTime, setSimulationTime] = useState(0);
  const simulationTimerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    // When simulation starts, reset the timer and create one interval.
    if (simulationRunning) {
      setSimulationTime(0);
      simulationTimerRef.current = setInterval(() => {
        setSimulationTime((prev) => prev + 1);
      }, 1000);
    } else {
      if (simulationTimerRef.current) {
        clearInterval(simulationTimerRef.current);
        simulationTimerRef.current = null;
      }
    }

    return () => {
      if (simulationTimerRef.current) {
        clearInterval(simulationTimerRef.current);
        simulationTimerRef.current = null;
      }
    };
  }, [simulationRunning]);

  return { simulationTime, formatTime: formatHms };
}
