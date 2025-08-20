// Fixed DebugBox.tsx with proper type handling
"use client";

import React from "react";
import { Window } from "../ui/Window";

interface DebugBoxProps {
  data: Record<string, unknown>;
  className?: string;
  onClose?: () => void;
}

// Type guard to safely check if an object has a property
const hasProperty = (obj: any, prop: string): boolean => {
  return obj != null && typeof obj === "object" && prop in obj;
};

// Safe property access
const safeAccess = (obj: any, prop: string, fallback: any = undefined) => {
  try {
    return hasProperty(obj, prop) ? obj[prop] : fallback;
  } catch {
    return fallback;
  }
};

export function DebugBox({ data, className, onClose }: DebugBoxProps) {
  // Helper function to safely format simulator data
  const formatSimulatorData = (simulators: any) => {
    try {
      if (!simulators || typeof simulators !== "object") {
        return "No simulators available";
      }

      const formatted: Record<string, any> = {};

      Object.entries(simulators).forEach(([id, sim]) => {
        try {
          formatted[id] = {
            exists: !!sim,
            type: typeof sim,
            hasInitialize: typeof safeAccess(sim, "initialize") === "function",
            hasPins: !!safeAccess(sim, "pins"),
            hasSetExternalPinValue:
              typeof safeAccess(sim, "setExternalPinValue") === "function",
            methods:
              sim && typeof sim === "object"
                ? Object.keys(sim).slice(0, 10)
                : [],
            pinMethods: (() => {
              const pins = safeAccess(sim, "pins");
              return pins && typeof pins === "object" ? Object.keys(pins) : [];
            })(),
          };
        } catch (error) {
          formatted[id] = {
            error: `Error processing simulator: ${
              error instanceof Error ? error.message : String(error)
            }`,
          };
        }
      });

      return formatted;
    } catch (error) {
      return `Error formatting simulator data: ${
        error instanceof Error ? error.message : String(error)
      }`;
    }
  };

  // Helper function to safely format connection data
  const formatConnectionData = (
    elements: any,
    wires: any,
    getNodeParent: any,
    getSensorMicrobitConnection: any
  ) => {
    try {
      if (!Array.isArray(elements) || !Array.isArray(wires)) {
        return "Invalid elements or wires data";
      }

      if (
        typeof getSensorMicrobitConnection !== "function" ||
        typeof getNodeParent !== "function"
      ) {
        return "Missing connection analysis functions";
      }

      const connections: Record<string, any> = {};

      // Find all ultrasonic sensors
      const ultrasonicSensors = elements.filter(
        (el: any) => safeAccess(el, "type") === "ultrasonicsensor4p"
      );

      ultrasonicSensors.forEach((sensor: any) => {
        try {
          const connection = getSensorMicrobitConnection(sensor);
          const sensorId = safeAccess(sensor, "id", "unknown");
          const sensorNodes = safeAccess(sensor, "nodes", []);

          connections[sensorId] = {
            sensorNodes: Array.isArray(sensorNodes)
              ? sensorNodes.map((n: any) => ({
                  id: safeAccess(n, "id", "unknown"),
                  placeholder: safeAccess(n, "placeholder", "no label"),
                }))
              : [],
            connectedWires: wires
              .filter(
                (w: any) =>
                  Array.isArray(sensorNodes) &&
                  sensorNodes.some(
                    (n: any) =>
                      safeAccess(n, "id") === safeAccess(w, "fromNodeId") ||
                      safeAccess(n, "id") === safeAccess(w, "toNodeId")
                  )
              )
              .map((w: any) => {
                const fromNodeId = safeAccess(w, "fromNodeId", "unknown");
                const toNodeId = safeAccess(w, "toNodeId", "unknown");

                return {
                  id: safeAccess(w, "id", "unknown"),
                  from: fromNodeId,
                  to: toNodeId,
                  fromParent: safeAccess(
                    getNodeParent(fromNodeId),
                    "type",
                    "unknown"
                  ),
                  toParent: safeAccess(
                    getNodeParent(toNodeId),
                    "type",
                    "unknown"
                  ),
                };
              }),
            microbitConnection: connection,
            hasValidConnection:
              !!connection &&
              !!(
                safeAccess(connection, "trigPin") ||
                safeAccess(connection, "echoPin")
              ),
          };
        } catch (error) {
          const sensorId = safeAccess(sensor, "id", "unknown");
          connections[sensorId] = {
            error: `Error analyzing sensor: ${
              error instanceof Error ? error.message : String(error)
            }`,
          };
        }
      });

      return connections;
    } catch (error) {
      return `Error formatting connection data: ${
        error instanceof Error ? error.message : String(error)
      }`;
    }
  };

  // Safely process data with error handling
  const processedData = React.useMemo(() => {
    try {
      const elements = data.elements;
      const wires = data.wires;

      return {
        // Basic data
        timestamp: new Date().toLocaleTimeString(),

        // Element summary
        elementSummary: {
          total: Array.isArray(elements) ? elements.length : 0,
          types: Array.isArray(elements)
            ? elements.reduce((acc: Record<string, number>, el: any) => {
                const type = safeAccess(el, "type", "unknown");
                acc[type] = (acc[type] || 0) + 1;
                return acc;
              }, {})
            : {},
          microbits: Array.isArray(elements)
            ? elements
                .filter((el: any) => safeAccess(el, "type") === "microbit")
                .map((mb: any) => safeAccess(mb, "id", "unknown"))
            : [],
          ultrasonicSensors: Array.isArray(elements)
            ? elements
                .filter(
                  (el: any) => safeAccess(el, "type") === "ultrasonicsensor4p"
                )
                .map((us: any) => safeAccess(us, "id", "unknown"))
            : [],
        },

        // Wire summary
        wireSummary: {
          total: Array.isArray(wires) ? wires.length : 0,
          connections:
            Array.isArray(wires) && Array.isArray(elements)
              ? wires.map((w: any) => {
                  try {
                    const fromNodeId = safeAccess(w, "fromNodeId");
                    const toNodeId = safeAccess(w, "toNodeId");

                    const fromParent = Array.isArray(elements)
                      ? elements.find((el: any) => {
                          const nodes = safeAccess(el, "nodes", []);
                          return (
                            Array.isArray(nodes) &&
                            nodes.some(
                              (n: any) => safeAccess(n, "id") === fromNodeId
                            )
                          );
                        })
                      : null;

                    const toParent = Array.isArray(elements)
                      ? elements.find((el: any) => {
                          const nodes = safeAccess(el, "nodes", []);
                          return (
                            Array.isArray(nodes) &&
                            nodes.some(
                              (n: any) => safeAccess(n, "id") === toNodeId
                            )
                          );
                        })
                      : null;

                    return {
                      id: safeAccess(w, "id", "unknown"),
                      from: safeAccess(fromParent, "type", "unknown"),
                      to: safeAccess(toParent, "type", "unknown"),
                    };
                  } catch (error) {
                    return {
                      id: safeAccess(w, "id", "unknown"),
                      error: `Error processing wire: ${
                        error instanceof Error ? error.message : String(error)
                      }`,
                    };
                  }
                })
              : [],
        },

        // Simulator data (if available)
        simulatorData: formatSimulatorData(data.controllerMap),

        // Connection analysis (if functions available)
        connectionAnalysis: formatConnectionData(
          data.elements,
          data.wires,
          data.getNodeParent,
          data.getSensorMicrobitConnection
        ),

        // Mouse and canvas state
        canvasState: {
          mousePos: safeAccess(data, "mousePos", { x: 0, y: 0 }),
          canvasOffset: safeAccess(data, "canvasOffset", { x: 0, y: 0 }),
          draggingElement: safeAccess(data, "draggingElement", null),
          selectedElement: data.selectedElement
            ? {
                id: safeAccess(data.selectedElement, "id", "unknown"),
                type: safeAccess(data.selectedElement, "type", "unknown"),
              }
            : null,
          editingWire: safeAccess(data, "editingWire", null),
        },

        // Simulation state
        simulationState: {
          running: !!data.simulationRunning,
          activeController: safeAccess(data, "activeControllerId", null),
        },

        // Raw data (collapsed by default)
        rawData: data,
      };
    } catch (error) {
      return {
        error: `Error processing debug data: ${
          error instanceof Error ? error.message : String(error)
        }`,
        rawData: data,
      };
    }
  }, [data]);

  // Safe JSON stringify with error handling
  const safeStringify = (obj: any, maxDepth = 3) => {
    try {
      return JSON.stringify(obj, null, 2);
    } catch (error) {
      return `Error stringifying object: ${
        error instanceof Error ? error.message : String(error)
      }`;
    }
  };

  return (
    <Window
      title="Debug Console"
      resizable
      draggable
      className={className}
      backgroundColor="black"
      onClose={onClose}
      initialSize={{ width: 600, height: 500 }}
    >
      <div className="text-emerald-400 font-mono text-xs p-4 overflow-auto h-full">
        <div className="space-y-4">
          {/* Error Display */}
          {processedData.error && (
            <div className="border border-red-600 p-2 rounded bg-red-900 bg-opacity-20">
              <div className="text-red-400 font-bold mb-2">❌ ERROR</div>
              <div className="text-red-300">{processedData.error}</div>
            </div>
          )}

          {/* Quick Status */}
          <div className="border border-emerald-600 p-2 rounded">
            <div className="text-yellow-400 font-bold mb-2">
              🔍 QUICK STATUS
            </div>
            <div>Elements: {processedData.elementSummary?.total || 0}</div>
            <div>Wires: {processedData.wireSummary?.total || 0}</div>
            <div>
              Microbits: {processedData.elementSummary?.microbits?.length || 0}
            </div>
            <div>
              Ultrasonic Sensors:{" "}
              {processedData.elementSummary?.ultrasonicSensors?.length || 0}
            </div>
            <div>
              Simulators:{" "}
              {typeof processedData.simulatorData === "object" &&
              processedData.simulatorData &&
              !Array.isArray(processedData.simulatorData)
                ? Object.keys(processedData.simulatorData).length
                : 0}
            </div>
            <div>
              Simulation:{" "}
              {processedData.simulationState?.running
                ? "🟢 RUNNING"
                : "🔴 STOPPED"}
            </div>
          </div>

          {/* Simulator Status */}
          <div className="border border-emerald-600 p-2 rounded">
            <div className="text-yellow-400 font-bold mb-2">
              🤖 SIMULATOR STATUS
            </div>
            <pre className="text-xs overflow-auto max-h-40">
              {safeStringify(processedData.simulatorData)}
            </pre>
          </div>

          {/* Connection Analysis */}
          <div className="border border-emerald-600 p-2 rounded">
            <div className="text-yellow-400 font-bold mb-2">
              🔌 CONNECTION ANALYSIS
            </div>
            <pre className="text-xs overflow-auto max-h-40">
              {safeStringify(processedData.connectionAnalysis)}
            </pre>
          </div>

          {/* Element Summary */}
          <div className="border border-emerald-600 p-2 rounded">
            <div className="text-yellow-400 font-bold mb-2">📦 ELEMENTS</div>
            <div>
              Types: {safeStringify(processedData.elementSummary?.types)}
            </div>
            <div>
              Microbits: [
              {processedData.elementSummary?.microbits?.join(", ") || "none"}]
            </div>
            <div>
              Sensors: [
              {processedData.elementSummary?.ultrasonicSensors?.join(", ") ||
                "none"}
              ]
            </div>
          </div>

          {/* Wire Summary */}
          <div className="border border-emerald-600 p-2 rounded">
            <div className="text-yellow-400 font-bold mb-2">🔗 WIRES</div>
            <pre className="text-xs overflow-auto max-h-32">
              {safeStringify(processedData.wireSummary?.connections)}
            </pre>
          </div>

          {/* Canvas State */}
          <div className="border border-emerald-600 p-2 rounded">
            <div className="text-yellow-400 font-bold mb-2">
              🖱️ CANVAS STATE
            </div>
            <pre className="text-xs overflow-auto max-h-32">
              {safeStringify(processedData.canvasState)}
            </pre>
          </div>

          {/* Raw Data (collapsed) */}
          <details className="border border-emerald-600 p-2 rounded">
            <summary className="text-yellow-400 font-bold cursor-pointer">
              📋 RAW DATA (click to expand)
            </summary>
            <pre className="text-xs overflow-auto max-h-64 mt-2">
              {safeStringify(processedData.rawData)}
            </pre>
          </details>
        </div>
      </div>
    </Window>
  );
}
