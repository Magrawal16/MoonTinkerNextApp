import { CircuitElement } from "@/circuit_canvas/types/circuit";
import { useMessage } from "@/common/components/ui/GenericMessagePopup";
import React from "react";
import { FaRotateLeft, FaRotateRight } from "react-icons/fa6";

interface Props {
  selectedElement: CircuitElement | null;
  setElements: React.Dispatch<React.SetStateAction<CircuitElement[]>>;
  pushToHistory: () => void;
  stopSimulation: () => void;
  containsWire: boolean; // legacy overall wire presence flag (kept for backwards compatibility)
  isSimulationRunning: boolean;
  wires?: { fromNodeId: string; toNodeId: string }[]; // full wire list to evaluate connectivity
  onAfterRotateImmediateUpdate?: () => void; // allow parent to force wire redraw immediately
}

/**
 * ElementRotationButtons component renders two buttons:
 * - Rotate left (counterclockwise by 30 degrees)
 * - Rotate right (clockwise by 30 degrees)
 *
 * It disables the buttons if no element or if the selected element is a wire.
 */
const ElementRotationButtons: React.FC<Props> = ({
  selectedElement,
  setElements,
  pushToHistory,
  stopSimulation,
  containsWire,
  isSimulationRunning,
  wires = [],
  onAfterRotateImmediateUpdate,
}) => {
  const { showMessage } = useMessage();
  const rotateElement = (direction: "left" | "right") => {
    // 1) No element selected
    if (!selectedElement) {
      showMessage("No element selected for rotation.", "info");
      return;
    }

    // 2) Selected element specifically is a wire
    if (selectedElement.type === "wire") {
      showMessage("Cannot rotate a wire element.", "warning");
      return;
    }

    // 3) Determine if selected element is connected to any wire
    const elementNodeIds = new Set(selectedElement.nodes.map((n) => n.id));
    const isElementConnected = wires.some(
      (w) => elementNodeIds.has(w.fromNodeId) || elementNodeIds.has(w.toNodeId)
    );

    // 4) If simulation running AND element is unconnected, we allow rotation but first stop simulation
    if (isSimulationRunning) {
      if (isElementConnected) {
        showMessage(
          "Cannot rotate connected elements while simulation is running.",
          "warning"
        );
        return;
      } else {
        // stop simulation then proceed
        stopSimulation();
      }
    }

    // 5) If simulation is OFF but element is connected to at least one wire => block with message
    if (!isSimulationRunning && isElementConnected) {
      showMessage(
        "Cannot rotate an element that has wires attached.",
        "error"
      );
      return;
    }

  // record state before rotation
  pushToHistory();

    setElements((prev) => {
      const next = prev.map((el) =>
        el.id === selectedElement.id
          ? {
              ...el,
              rotation:
                direction === "right"
                  ? ((el.rotation || 0) + 30) % 360
                  : ((el.rotation || 0) - 30 + 360) % 360,
            }
          : el
      );
      // force immediate visuals update for wires
      onAfterRotateImmediateUpdate?.();
      return next;
    });

  // do not auto stop simulation here; if we reached here while simulation was running it was already stopped above
  };

  return (
    <div className="flex flex-row items-center gap-2">
      <button
        className="p-2 bg-[#F4F5F6] rounded border border-gray-300 shadow-sm text-black text-sm cursor-pointer flex items-center justify-center hover:shadow-blue-400 hover:scale-105 w-9 h-9"
        onClick={() => rotateElement("left")}
        title="Rotate Left"
        aria-label="Rotate Left"
      >
        <FaRotateLeft size={18} />
      </button>
      <button
        className="p-2 bg-[#F4F5F6] rounded border border-gray-300 shadow-sm text-black text-sm cursor-pointer flex items-center justify-center hover:shadow-blue-400 hover:scale-105 w-9 h-9"
        onClick={() => rotateElement("right")}
        title="Rotate Right"
        aria-label="Rotate Right"
      >
        <FaRotateRight size={18} />
      </button>
    </div>
  );
};

export default ElementRotationButtons;
