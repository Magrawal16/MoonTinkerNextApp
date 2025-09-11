// hooks/useCircuitHistory.ts
import { useState, useCallback, useRef } from "react";
import { CircuitElement, Wire } from "@/circuit_canvas/types/circuit";

type Snapshot = { elements: CircuitElement[]; wires: Wire[] };

export const useCircuitHistory = () => {
  const MAX_HISTORY_LENGTH = 50;

  const [state, setState] = useState<{ entries: Snapshot[]; index: number }>(
    { entries: [], index: -1 }
  );

  const deepClone = (v: any) => JSON.parse(JSON.stringify(v));

  // Cache of last-known properties per element id (persists across history navigation)
  const propertyCacheRef = useRef<Record<string, CircuitElement["properties"]>>({});

  const syncProperties = useCallback((elements: CircuitElement[]) => {
    elements.forEach((e) => {
      propertyCacheRef.current[e.id] = deepClone(e.properties);
    });
  }, []);

  // Remove transient solver outputs before saving into history
  const stripComputed = (elements: CircuitElement[]): CircuitElement[] =>
    elements.map((e) => {
      const clone = deepClone(e) as CircuitElement;
      if (clone.computed) {
        // Drop computed entirely so UI falls back to 0 when simulation is off
        delete (clone as any).computed;
      }
      return clone;
    });

  const makeSnapshot = (elements: CircuitElement[], wires: Wire[]): Snapshot => ({
    elements: stripComputed(elements),
    wires: deepClone(wires),
  });

  // Merge: keep topology/positions from snapshot but preserve current properties for existing elements
  const mergePreserveProperties = (
    current: CircuitElement[],
    snapshot: CircuitElement[]
  ): CircuitElement[] => {
    const currentMap = new Map(current.map((e) => [e.id, e] as const));
    return snapshot.map((snap) => {
      const cur = currentMap.get(snap.id);
      // Prefer last-known properties from cache; fall back to current element, then snapshot
      const cachedProps = propertyCacheRef.current[snap.id];
      return {
        ...snap,
        properties: cachedProps ?? cur?.properties ?? snap.properties,
      };
    });
  };

  // Optional explicit initializer for when your canvas starts non-empty
  const initializeHistory = useCallback((elements: CircuitElement[], wires: Wire[]) => {
    syncProperties(elements);
    setState({ entries: [makeSnapshot(elements, wires)], index: 0 });
  }, [syncProperties]);

  const pushToHistory = useCallback((elements: CircuitElement[], wires: Wire[]) => {
    setState(prev => {
  // Always keep property cache up-to-date with latest elements
  syncProperties(elements);
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
  const nextSnap: Snapshot = makeSnapshot(elements, wires);

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
  }, [syncProperties]);

  const undo = useCallback((
    setElements: (elements: CircuitElement[]) => void,
    setWires: (wires: Wire[]) => void,
    stopSimulation: () => void,
    getCurrentElements?: () => CircuitElement[]
  ) => {
    if (state.index <= 0) return; // Cannot undo beyond initial state
    const newIndex = state.index - 1;
    const snap = state.entries[newIndex];
    // Snapshots already stripped; deep clone and preserve current properties for existing elements
  const currentEls = getCurrentElements ? getCurrentElements() : state.entries[state.index].elements;
  const els = mergePreserveProperties(currentEls, deepClone(snap.elements));
  // Ensure computed is absent when restoring
  els.forEach((e: any) => delete e.computed);
  const ws = deepClone(snap.wires);
    setElements(els);
    setWires(ws);
    setState(prev => ({ ...prev, index: newIndex }));
    stopSimulation();
  }, [state]);

  const redo = useCallback((
    setElements: (elements: CircuitElement[]) => void,
    setWires: (wires: Wire[]) => void,
    stopSimulation: () => void,
    getCurrentElements?: () => CircuitElement[]
  ) => {
    if (state.index >= state.entries.length - 1) return; // Cannot redo beyond latest state
    const newIndex = state.index + 1;
    const snap = state.entries[newIndex];
  const currentEls = getCurrentElements ? getCurrentElements() : state.entries[state.index].elements;
  const els = mergePreserveProperties(currentEls, deepClone(snap.elements));
  els.forEach((e: any) => delete e.computed);
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
  syncProperties,
  };
};