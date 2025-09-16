import { useState, useRef, useCallback, useEffect } from "react";
import Konva from "konva";
import { Wire, CircuitElement, EditingWire, Node } from "@/circuit_canvas/types/circuit";
import { getAbsoluteNodePosition } from "@/circuit_canvas/utils/rotationUtils";

interface UseWireManagementProps {
  elements: CircuitElement[];
  stageRef: React.RefObject<Konva.Stage | null>;
  wireLayerRef: React.RefObject<Konva.Layer | null>;
  getNodeById: (nodeId: string) => Node | undefined;
  getNodeParent: (nodeId: string) => CircuitElement | null;
  pushToHistorySnapshot: (elements: CircuitElement[], wires: Wire[]) => void;
  stopSimulation: () => void;
}

export const useWireManagement = ({
  elements,
  stageRef,
  wireLayerRef,
  getNodeById,
  getNodeParent,
  pushToHistorySnapshot,
  stopSimulation,
}: UseWireManagementProps) => {
  // Wire-related state
  const [wires, _setWiresState] = useState<Wire[]>([]);
  const [wireCounter, setWireCounter] = useState(0);
  const [selectedWireColor, setSelectedWireColor] = useState<string>("#000000");
  const [creatingWireStartNode, setCreatingWireStartNode] = useState<string | null>(null);
  const [creatingWireJoints, setCreatingWireJoints] = useState<{ x: number; y: number }[]>([]);
  const [editingWire, setEditingWire] = useState<EditingWire | null>(null);

  // Refs for wire optimization
  const wireRefs = useRef<Record<string, Konva.Line>>({});
  const wiresRef = useRef<Wire[]>(wires);
  const inProgressWireRef = useRef<Konva.Line | null>(null);
  const animatedCircleRef = useRef<Konva.Circle | null>(null);

  // Centralized setter to keep ref and state in sync immediately
  const setWires = useCallback(
    (
      next:
        | Wire[]
        | ((prev: Wire[]) => Wire[])
    ) => {
      const resolved = typeof next === "function" ? (next as (p: Wire[]) => Wire[])(wiresRef.current) : next;
      // Update ref first so any immediate reads see the latest snapshot
      wiresRef.current = resolved;
      _setWiresState(resolved);
      // Optionally batch draw to reflect any external immediate consumers
      if (wireLayerRef.current) {
        wireLayerRef.current.batchDraw();
      }
      return resolved;
    },
    [wireLayerRef]
  );

  // Clear wire creation state when not creating wire
  useEffect(() => {
    if (!creatingWireStartNode) {
      setCreatingWireJoints([]);
      if (inProgressWireRef.current) {
        inProgressWireRef.current.visible(false);
      }
      if (animatedCircleRef.current) {
        animatedCircleRef.current.visible(false);
      }
    }
  }, [creatingWireStartNode]);

  // Utility: derive the highest numeric suffix used in existing wire IDs
  const getMaxWireIndex = useCallback((currentWires: Wire[]): number => {
    let max = -1;
    for (const w of currentWires) {
      const match = /^wire-(\d+)$/.exec(w.id);
      if (match) {
        const n = parseInt(match[1], 10);
        if (!Number.isNaN(n) && n > max) max = n;
      }
    }
    return max;
  }, []);

  // Ensure all wire IDs are unique and return the sanitized list plus the highest numeric suffix encountered
  const sanitizeWireIds = useCallback((currentWires: Wire[]): {
    sanitized: Wire[];
    maxIndex: number;
  } => {
    const maxBefore = getMaxWireIndex(currentWires);
    const seen = new Set<string>();
    let nextIndex = maxBefore + 1; // start allocating new IDs after current max
    const sanitized: Wire[] = currentWires.map((w) => {
      if (!seen.has(w.id)) {
        seen.add(w.id);
        return w; // keep as-is
      }
      // duplicate id detected – allocate a fresh one
      while (seen.has(`wire-${nextIndex}`)) nextIndex++;
      const newWire = { ...w, id: `wire-${nextIndex}` };
      seen.add(newWire.id);
      nextIndex++;
      return newWire;
    });
    // Compute final max index used (nextIndex was incremented after assignment)
    const finalMax = Math.max(maxBefore, nextIndex - 1);
    return { sanitized, maxIndex: finalMax };
  }, [getMaxWireIndex]);

  // Optimized function to calculate wire points
  const getWirePoints = useCallback(
    (wire: Wire): number[] => {
      const fromNode = getNodeById(wire.fromNodeId);
      const toNode = getNodeById(wire.toNodeId);
      if (!fromNode || !toNode) return [];

      const fromParent = getNodeParent(fromNode.id);
      const toParent = getNodeParent(toNode.id);
      if (!fromParent || !toParent) return [];

      // Use rotation-aware absolute position calculation
      const start = getAbsoluteNodePosition(fromNode, fromParent);
      const end = getAbsoluteNodePosition(toNode, toParent);

      // Include joints between start and end
      const jointPoints = wire.joints.flatMap((pt) => [pt.x, pt.y]);

      return [start.x, start.y, ...jointPoints, end.x, end.y];
    },
    [getNodeById, getNodeParent]
  );

  // Optimized function to update wires directly in Konva
  const updateWiresDirect = useCallback(() => {
    const current = wiresRef.current;
    current.forEach((wire) => {
      const wireLineRef = wireRefs.current[wire.id];
      if (wireLineRef) {
        const newPoints = getWirePoints(wire);
        // Apply the same midpoint logic as in JSX rendering
        if (newPoints.length === 4) {
          const [x1, y1, x2, y2] = newPoints;
          const midX = (x1 + x2) / 2;
          const midY = (y1 + y2) / 2;
          newPoints.splice(2, 0, midX, midY);
        }
        wireLineRef.points(newPoints);
      }
    });

    // Batch the layer redraw for performance
    if (wireLayerRef.current) {
      wireLayerRef.current.batchDraw();
    }
  }, [getWirePoints, wireLayerRef]);

  // Optimized function to update in-progress wire during creation
  const updateInProgressWire = useCallback(
    (mousePos: { x: number; y: number }) => {
      if (!creatingWireStartNode || !stageRef.current) return;

      const startNode = getNodeById(creatingWireStartNode);
      if (!startNode) return;

      const startParent = getNodeParent(startNode.id);
      if (!startParent) return;

      // Use rotation-aware absolute position calculation
      const startPos = getAbsoluteNodePosition(startNode, startParent);

      const stage = stageRef.current;
      const transform = stage.getAbsoluteTransform().copy();
      transform.invert();
      const adjustedMouse = transform.point(mousePos);

      const inProgressPoints = [
        startPos.x,
        startPos.y,
        ...creatingWireJoints.flatMap((p) => [p.x, p.y]),
        adjustedMouse.x,
        adjustedMouse.y,
      ];

      // Update in-progress wire directly
      if (inProgressWireRef.current) {
        inProgressWireRef.current.points(inProgressPoints);
      }

      // Update animated circle position
      if (animatedCircleRef.current) {
        animatedCircleRef.current.x(adjustedMouse.x);
        animatedCircleRef.current.y(adjustedMouse.y);
      }

      // Batch redraw
      if (wireLayerRef.current) {
        wireLayerRef.current.batchDraw();
      }
    },
    [creatingWireStartNode, creatingWireJoints, getNodeById, getNodeParent, stageRef, wireLayerRef]
  );

  // Handle node click for wire creation
  const handleNodeClick = useCallback(
    (nodeId: string) => {
      if (editingWire) {
        // complete wire editing logic
        setWires((prev) => {
          const next = prev.map((wire) =>
            wire.id === editingWire.wireId
              ? { ...wire, [editingWire.end]: nodeId }
              : wire
          );
          // push AFTER change
          pushToHistorySnapshot(elements, next);
          return next;
        });
        setEditingWire(null);
        return;
      }

      // First click: set start node
      if (!creatingWireStartNode) {
        setCreatingWireStartNode(nodeId);
        setCreatingWireJoints([]);

        // Show and initialize in-progress wire components
        if (
          inProgressWireRef.current &&
          animatedCircleRef.current &&
          stageRef.current
        ) {
          const stage = stageRef.current;
          const scaleFactor = 1 / stage.scaleX();

          // Show components
          inProgressWireRef.current.visible(true);
          animatedCircleRef.current.visible(true);

          // Initialize scaling
          animatedCircleRef.current.scaleX(scaleFactor);
          animatedCircleRef.current.scaleY(scaleFactor);
          inProgressWireRef.current.strokeWidth(2 / stage.scaleX());

          // Immediately reset animatedCircle position to the start node
          const startNode = getNodeById(nodeId);
          const startParent = startNode ? getNodeParent(startNode.id) : null;
          if (startNode && startParent) {
            const startPos = getAbsoluteNodePosition(startNode, startParent);
            animatedCircleRef.current.x(startPos.x);
            animatedCircleRef.current.y(startPos.y);
          }
        }
        return;
      }

      // Clicked same node again: cancel
      if (creatingWireStartNode === nodeId) {
        setCreatingWireStartNode(null);
        setCreatingWireJoints([]);

        // Hide in-progress wire components
        if (inProgressWireRef.current) {
          inProgressWireRef.current.visible(false);
        }
        if (animatedCircleRef.current) {
          animatedCircleRef.current.visible(false);
        }
        return;
      }

  // Second click: create wire
      // Before creating, check for an existing wire connecting these two nodes (either direction)
      const duplicateExists = wiresRef.current.some(
        (w) =>
          (w.fromNodeId === creatingWireStartNode && w.toNodeId === nodeId) ||
          (w.fromNodeId === nodeId && w.toNodeId === creatingWireStartNode)
      );

      if (duplicateExists) {
        // Discard creation attempt (Tinkercad-like behavior: silently ignore)
        setCreatingWireStartNode(null);
        setCreatingWireJoints([]);
        if (inProgressWireRef.current) {
          inProgressWireRef.current.visible(false);
        }
        if (animatedCircleRef.current) {
          animatedCircleRef.current.visible(false);
        }
        return; // Do not push history or stop simulation since nothing changed
      }

      const newWire: Wire = {
        // Ensure unique incremental ID even if wires were loaded from storage
        // or counter was reset. We probe for the next free numeric suffix.
        id: (function generateWireId() {
          // Use current ref (more up-to-date than state in fast successive creations)
          const existing = new Set(wiresRef.current.map((w) => w.id));
          let candidate = wireCounter;
          while (existing.has(`wire-${candidate}`)) candidate++;
          // Update counter so subsequent wires continue after this one
          if (candidate !== wireCounter) {
            setWireCounter(candidate + 1);
          } else {
            setWireCounter((c) => c + 1);
          }
          return `wire-${candidate}`;
        })(),
        fromNodeId: creatingWireStartNode,
        toNodeId: nodeId,
        joints: creatingWireJoints,
        color: selectedWireColor,
      };

  const next = [...wiresRef.current, newWire];
  setWires(next);
  // Push AFTER creation so each wire is a single undo step
  pushToHistorySnapshot(elements, next);
      stopSimulation();

      setCreatingWireStartNode(null);
      setCreatingWireJoints([]);

      // Hide in-progress wire components
      if (inProgressWireRef.current) {
        inProgressWireRef.current.visible(false);
      }
      if (animatedCircleRef.current) {
        animatedCircleRef.current.visible(false);
      }
    },
    [
      editingWire,
      creatingWireStartNode,
      creatingWireJoints,
      wireCounter,
      wires,
      selectedWireColor,
      pushToHistorySnapshot,
      stopSimulation,
      getNodeById,
      getNodeParent,
      stageRef,
    ]
  );

  // Handle wire joint creation on stage click
  const handleStageClickForWire = useCallback(
    (pos: { x: number; y: number }) => {
      if (!creatingWireStartNode || !stageRef.current) return false;

      const stage = stageRef.current;
      const transform = stage.getAbsoluteTransform().copy();
      transform.invert();
      const adjusted = transform.point(pos);

      setCreatingWireJoints((prev) => [
        ...prev,
        { x: adjusted.x, y: adjusted.y },
      ]);

      // Update in-progress wire to include the new joint
      updateInProgressWire(pos);
      return true;
    },
    [creatingWireStartNode, stageRef, updateInProgressWire]
  );

  // Handle wire editing
  const handleWireEdit = useCallback(
    (wireId: string) => {
      const updated = wiresRef.current.filter((w) => w.id !== wireId);
      setWires(updated);
      // Push AFTER delete
      pushToHistorySnapshot(elements, updated);
      stopSimulation();
      setEditingWire(null);
    },
    [elements, stopSimulation, pushToHistorySnapshot]
  );

  // Get wire color
  const getWireColor = useCallback((wire: Wire): string => {
    return wire.color || "#000000";
  }, []);

  // Reset wire state
  const resetWireState = useCallback(() => {
    setWires([]);
    setWireCounter(0);
    setCreatingWireStartNode(null);
    setEditingWire(null);
    setCreatingWireJoints([]);
    // Clear wire refs
    wireRefs.current = {};
    // Hide in-progress wire components
    if (inProgressWireRef.current) {
      inProgressWireRef.current.visible(false);
    }
    if (animatedCircleRef.current) {
      animatedCircleRef.current.visible(false);
    }
  }, []);

  // Load wires (for circuit loading)
  const loadWires = useCallback((newWires: Wire[]) => {
    const { sanitized, maxIndex } = sanitizeWireIds(newWires);
    setWires(sanitized);
    setWireCounter(maxIndex + 1);
  }, [sanitizeWireIds]);

  return {
    // State
    wires,
    wireCounter,
    selectedWireColor,
    creatingWireStartNode,
    creatingWireJoints,
    editingWire,
    wiresRef,

    // Refs
    wireRefs,
    inProgressWireRef,
    animatedCircleRef,

    // Functions
    setWires,
    setWireCounter,
    setSelectedWireColor,
    setCreatingWireStartNode,
    setCreatingWireJoints,
    setEditingWire,
    getWirePoints,
    updateWiresDirect,
    updateInProgressWire,
    handleNodeClick,
    handleStageClickForWire,
    handleWireEdit,
    getWireColor,
    resetWireState,
    loadWires,
    sanitizeWireIds,
  };
};