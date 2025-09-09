// hooks/useCircuitHistory.ts
import { useState, useCallback } from "react";
import { CircuitElement, Wire } from "@/circuit_canvas/types/circuit";

type Snapshot = { elements: CircuitElement[]; wires: Wire[] };

export const useCircuitHistory = () => {
  const MAX_HISTORY_LENGTH = 50;

  const [state, setState] = useState<{ entries: Snapshot[]; index: number }>(
    { entries: [], index: -1 }
  );

  const deepClone = (v: any) => JSON.parse(JSON.stringify(v));

  // Optional explicit initializer for when your canvas starts non-empty
  const initializeHistory = useCallback((elements: CircuitElement[], wires: Wire[]) => {
    setState({ entries: [{ elements: deepClone(elements), wires: deepClone(wires) }], index: 0 });
  }, []);

  const pushToHistory = useCallback((elements: CircuitElement[], wires: Wire[]) => {
    setState(prev => {
      let entries = prev.entries;
      let index = prev.index;

      // If first push and nothing initialized, seed an initial empty canvas
      if (entries.length === 0 && index === -1) {
        entries = [{ elements: [], wires: [] }];
        index = 0;
      }

      // If we're not at the end of history, remove future states
      if (index < entries.length - 1) {
        entries = entries.slice(0, index + 1);
      }

      const last = entries[entries.length - 1];
      const nextSnap: Snapshot = { elements: deepClone(elements), wires: deepClone(wires) };

      // Skip push if identical to last (prevents accidental double-push)
      const same = JSON.stringify(last) === JSON.stringify(nextSnap);
      if (same) {
        return { entries, index };
      }

      let nextEntries = [...entries, nextSnap];
      // Trim history if it exceeds max length
      if (nextEntries.length > MAX_HISTORY_LENGTH) {
        nextEntries = nextEntries.slice(nextEntries.length - MAX_HISTORY_LENGTH);
      }
      const nextIndex = nextEntries.length - 1;

      return { entries: nextEntries, index: nextIndex };
    });
  }, []);

  const undo = useCallback((
    setElements: (elements: CircuitElement[]) => void,
    setWires: (wires: Wire[]) => void,
    stopSimulation: () => void
  ) => {
    if (state.index <= 0) return; // Cannot undo beyond initial state
    const newIndex = state.index - 1;
    const snap = state.entries[newIndex];
    const els = deepClone(snap.elements);
    const ws = deepClone(snap.wires);
    setElements(els);
    setWires(ws);
    setState(prev => ({ ...prev, index: newIndex }));
    stopSimulation();
  }, [state]);

  const redo = useCallback((
    setElements: (elements: CircuitElement[]) => void,
    setWires: (wires: Wire[]) => void,
    stopSimulation: () => void
  ) => {
    if (state.index >= state.entries.length - 1) return; // Cannot redo beyond latest state
    const newIndex = state.index + 1;
    const snap = state.entries[newIndex];
    const els = deepClone(snap.elements);
    const ws = deepClone(snap.wires);
    setElements(els);
    setWires(ws);
    setState(prev => ({ ...prev, index: newIndex }));
    stopSimulation();
  }, [state]);

  const clearHistory = useCallback(() => {
    setState({ entries: [], index: -1 });
  }, []);

  const canUndo = state.index > 0;
  const canRedo = state.index < state.entries.length - 1;

  return {
    history: state.entries,
    historyIndex: state.index,
    initializeHistory,
    pushToHistory,
    undo,
    redo,
    clearHistory,
    canUndo,
    canRedo,
  };
};