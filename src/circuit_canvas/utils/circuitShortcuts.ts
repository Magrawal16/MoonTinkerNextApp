import { setSelected } from "node_modules/blockly/core/common";
import type { ShortcutDefinition } from "../hooks/useCircuitShortcuts";
import type { CircuitElement, Wire } from "../types/circuit";

type ShortcutMetadata = Omit<ShortcutDefinition, "handler">;

type ShortcutArgs = {
  elements: CircuitElement[];
  wires: Wire[];
  selectedElement: CircuitElement | null;
  setElements: React.Dispatch<React.SetStateAction<CircuitElement[]>>;
  setWires: React.Dispatch<React.SetStateAction<Wire[]>>;
  setSelectedElement: React.Dispatch<
    React.SetStateAction<CircuitElement | null>
  >;
  setCreatingWireStartNode: React.Dispatch<React.SetStateAction<string | null>>;
  pushToHistory: () => void;
  // Optional: push specific snapshot to history (avoids ref timing issues)
  pushToHistorySnapshot?: (elements: CircuitElement[], wires: Wire[]) => void;
  stopSimulation: () => void;
  resetState: () => void;
  openNewSessionModal: () => void;
  getNodeParent: (nodeId: string) => CircuitElement | null | undefined;
  undo: () => void;
  redo: () => void;
  toggleSimulation: () => void;
  updateWiresDirect?: () => void; // Add wire update function
  setActiveControllerId: React.Dispatch<React.SetStateAction<string | null>>;
  isSimulationOn: boolean;
  onRequestControllerDelete?: (element: CircuitElement) => void;
};

/**
 * Returns metadata about available shortcuts for display purposes (without handlers).
 */
export function getShortcutMetadata(): ShortcutMetadata[] {
  return [
    {
      name: "Cancel wire creation",
      description: "Cancel wire creation and editing",
      keys: ["escape"],
    },
    {
      name: "New Session",
      description: "Start a new session",
      keys: ["ctrl", "l"],
    },
    {
      name: "Undo",
      description: "Undo last action",
      keys: ["ctrl", "z"],
    },
    {
      name: "Redo",
      description: "Redo last action",
      keys: ["ctrl", "y"],
    },
    {
      name: "Delete selected",
      description: "Delete selected element and connected wires",
      keys: ["delete"],
    },
    {
      name: "Rotate Right",
      description: "Rotate selected element clockwise",
      keys: ["r"],
    },
    {
      name: "Rotate Left",
      description: "Rotate selected element counter-clockwise",
      keys: ["a"],
    },
    {
      name: "Clear wires",
      description: "Delete all wires",
      keys: ["shift", "w"],
    },
    {
      name: "Start/stop simulation",
      description: "Start or stop the circuit simulation",
      keys: ["ctrl", "space"],
    },
  ];
}

/**
 * Returns full shortcut definitions with handler functions attached.
 */
export function getCircuitShortcuts(args: ShortcutArgs): ShortcutDefinition[] {
  const {
    elements,
    wires,
    selectedElement,
    setElements,
    setWires,
    setSelectedElement,
    setCreatingWireStartNode,
    pushToHistory,
    pushToHistorySnapshot,
    stopSimulation,
    resetState,
    openNewSessionModal,
    getNodeParent,
    undo,
    redo,
    toggleSimulation,
    setActiveControllerId,
    isSimulationOn,
    onRequestControllerDelete,
  } = args;

  return getShortcutMetadata().map((meta) => {
    switch (meta.keys.join("+")) {
      case "escape":
        return {
          ...meta,
          handler: () => {
            setCreatingWireStartNode(null);
            setSelectedElement(null);
            // Keep last active micro:bit so Code button reopens it
          },
        };
      case "ctrl+l":
        return {
          ...meta,
          handler: () => {
            openNewSessionModal();
          },
        };
      case "ctrl+z":
        return {
          ...meta,
          handler: () => {
            if(isSimulationOn) return;
            undo();
          },
        };
      case "ctrl+y":
        return {
          ...meta,
          handler: () => {
            if(isSimulationOn) return;
            redo();
          },
        };
      case "delete":
        return {
          ...meta,
          handler: () => {
            if (!selectedElement) return;
            // If a programmable controller is selected, delegate to confirmation modal
            if (
              (selectedElement.type === "microbit" || selectedElement.type === "microbitWithBreakout") &&
              onRequestControllerDelete
            ) {
              onRequestControllerDelete(selectedElement);
              return;
            }
            if (selectedElement.type === "wire") {
              const nextWires = wires.filter((w) => w.id !== selectedElement.id);
              setWires(nextWires);
              // Record history AFTER deletion so undo restores the wire
              if (pushToHistorySnapshot) {
                pushToHistorySnapshot(elements, nextWires);
              } else {
                pushToHistory();
              }
            } else {
              const nextElements = elements.filter((el) => el.id !== selectedElement.id);
              const nextWires = wires.filter(
                (w) =>
                  getNodeParent(w.fromNodeId)?.id !== selectedElement.id &&
                  getNodeParent(w.toNodeId)?.id !== selectedElement.id
              );
              setElements(nextElements);
              setWires(nextWires);
              // Record history AFTER deletion so undo restores element+wires
              if (pushToHistorySnapshot) {
                pushToHistorySnapshot(nextElements, nextWires);
              } else {
                pushToHistory();
              }
            }
            stopSimulation();
            setSelectedElement(null);
            setCreatingWireStartNode(null);
            // ...existing code...
          },
        };
      case "r":
        return {
          ...meta,
          handler: () => {
            if (!selectedElement) return;
            setElements((prev) => {
              const next = prev.map((el) =>
                el.id === selectedElement.id
                  ? { ...el, rotation: ((el.rotation || 0) + 30) % 360 }
                  : el
              );
              if (pushToHistorySnapshot) {
                pushToHistorySnapshot(next, wires);
              } else {
                pushToHistory();
              }
              return next;
            });
            if (args.updateWiresDirect) {
              args.updateWiresDirect();
            }
            stopSimulation();
          },
        };
      case "e":
        return {
          ...meta,
          handler: () => {
            if (!selectedElement) return;
            setElements((prev) => {
              const next = prev.map((el) =>
                el.id === selectedElement.id
                  ? { ...el, rotation: ((el.rotation || 0) - 30 + 360) % 360 }
                  : el
              );
              if (pushToHistorySnapshot) {
                pushToHistorySnapshot(next, wires);
              } else {
                pushToHistory();
              }
              return next;
            });
            if (args.updateWiresDirect) {
              args.updateWiresDirect();
            }
            stopSimulation();
          },
        };
      case "shift+w":
        return {
          ...meta,
          handler: () => {
            const nextWires: Wire[] = [];
            setWires(nextWires);
            // Record history AFTER clearing for proper undo
            if (pushToHistorySnapshot) {
              pushToHistorySnapshot(elements, nextWires);
            } else {
              pushToHistory();
            }
            stopSimulation();
          },
        };
      case "ctrl+space":
        return {
          ...meta,
          handler: () => {
            toggleSimulation();
          },
        };
      default:
        return {
          ...meta,
          handler: () => { },
        };
    }
  });
}
