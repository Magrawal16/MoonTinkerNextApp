// hooks/useCircuitHistory.ts
import { useState, useCallback } from "react";
import { CircuitElement, Wire } from "@/circuit_canvas/types/circuit";

export const useCircuitHistory = () => {
  const [history, setHistory] = useState<
    { elements: CircuitElement[]; wires: Wire[] }[]
  >([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  const MAX_HISTORY_LENGTH = 50;

  const pushToHistory = useCallback((elements: CircuitElement[], wires: Wire[]) => {
    setHistory(prev => {
      // If we're not at the end of history, remove future states
      const newHistory = historyIndex < prev.length - 1 
        ? prev.slice(0, historyIndex + 1)
        : prev;
      
      const next = [
        ...newHistory,
        {
          elements: JSON.parse(JSON.stringify(elements)),
          wires: JSON.parse(JSON.stringify(wires)),
        },
      ];

      // Trim history if it exceeds max length
      const trimmedHistory = next.length > MAX_HISTORY_LENGTH 
        ? next.slice(next.length - MAX_HISTORY_LENGTH)
        : next;
      
      // Update index to point to the new state
      setHistoryIndex(trimmedHistory.length - 1);
      
      return trimmedHistory;
    });
  }, [historyIndex]);

  const undo = useCallback((
    setElements: (elements: CircuitElement[]) => void,
    setWires: (wires: Wire[]) => void,
    stopSimulation: () => void
  ) => {
    if (historyIndex <= 0) return; // Cannot undo beyond initial state

    const newIndex = historyIndex - 1;
    const state = history[newIndex];
    
    setElements(state.elements);
    setWires(state.wires);
    setHistoryIndex(newIndex);
    stopSimulation();
  }, [history, historyIndex]);

  const redo = useCallback((
    setElements: (elements: CircuitElement[]) => void,
    setWires: (wires: Wire[]) => void,
    stopSimulation: () => void
  ) => {
    if (historyIndex >= history.length - 1) return; // Cannot redo beyond latest state

    const newIndex = historyIndex + 1;
    const state = history[newIndex];
    
    setElements(state.elements);
    setWires(state.wires);
    setHistoryIndex(newIndex);
    stopSimulation();
  }, [history, historyIndex]);

  const clearHistory = useCallback(() => {
    setHistory([]);
    setHistoryIndex(-1);
  }, []);

  const canUndo = historyIndex > 0;
  const canRedo = historyIndex < history.length - 1;

  return {
    history,
    historyIndex,
    pushToHistory,
    undo,
    redo,
    clearHistory,
    canUndo,
    canRedo,
  };
};