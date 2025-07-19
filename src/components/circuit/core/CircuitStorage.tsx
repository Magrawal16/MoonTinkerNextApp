"use client";
import { CircuitElement, Wire } from "@/common/types/circuit";
import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import {
  deleteCircuitById,
  getCircuitById,
  getSavedCircuitsList,
  SaveCircuit,
  editCircuitName,
  overrideCircuit,
} from "../../../utils/core/circuitStorage";
import React from "react";

type CircuitManagerProps = {
  onCircuitSelect: (circuitId: string) => void;
  currentElements?: CircuitElement[];
  currentWires?: Wire[];
  getSnapshot?: () => string;
};
export default function CircuitStorage(props: CircuitManagerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [selectedCircuitID, setSelectedCircuitID] = useState<string | null>(
    null
  );
  const [circuitName, setCircuitName] = useState("");
  const [selectedCircuitName, setSelectedCircuitName] = useState("");
  const modalRef = useRef<HTMLDivElement>(null);

  const handleClickOutside = (e: MouseEvent) => {
    if (modalRef.current && !modalRef.current.contains(e.target as Node)) {
      setIsOpen(false);
    }
  };

  const [savedCircuits, setSavedCircuits] = useState(getSavedCircuitsList());

  useEffect(() => {
    if (isOpen) {
      setSavedCircuits(getSavedCircuitsList());
      document.addEventListener("mousedown", handleClickOutside);
    } else {
      document.removeEventListener("mousedown", handleClickOutside);
      setSelectedCircuitID(null);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isOpen]);

  const handleCircuitSelect = (circuitId: string) => {
    props.onCircuitSelect(circuitId);
    const selected = getCircuitById(circuitId);
    setSelectedCircuitName(selected?.name ?? "");
    setIsOpen(false);
  };

  return (
    <>
      <button
        className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 cursor-pointer"
        onClick={() => setIsOpen(true)}
      >
        Circuit Storage
      </button>

      {isOpen &&
        createPortal(
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <div
              ref={modalRef}
              className="bg-white p-6 rounded-xl shadow-xl w-1/2 max-w-full"
            >
              <h2 className="text-lg font-semibold mb-4">Circuit Storage</h2>
              <div className="border-t border-gray-300 my-4"></div>

              <div className="flex flex-row gap-4 w-full justify-between">
                <ul className="space-y-2 w-full flex-1/2 max-h-[546px] overflow-y-auto">
                  {savedCircuits.map((circuit) => (
                    <li
                      key={circuit.id}
                      className={
                        "p-2 bg-blue-50 hover:bg-blue-100 rounded cursor-pointer mx-8" +
                        (selectedCircuitID === circuit.id ? " bg-blue-200" : "")
                      }
                      onClick={() => {
                        setSelectedCircuitID(circuit.id);
                        setSelectedCircuitName(circuit.name);
                      }}
                    >
                      <span>{circuit.name}</span>
                    </li>
                  ))}
                </ul>
                {/* separator */}
                <div className="border-l border-gray-300 mx-4"></div>
                {/* circuit info */}
                <div className="flex flex-col gap-2 flex-1/2">
                  {selectedCircuitID && (
                    <div>
                      <h3 className="font-semibold">Circuit Info</h3>
                      <p>ID: {selectedCircuitID}</p>
                      {getCircuitById(selectedCircuitID)?.snapshot ? (
                        <img
                          src={getCircuitById(selectedCircuitID)!.snapshot}
                          className="w-lg aspect-auto rounded-lg mb-2 max-h-[20rem]"
                          alt="Circuit Snapshot"
                        />
                      ) : (
                        <div className="text-gray-400 text-sm italic mb-2">
                          No snapshot available
                        </div>
                      )}
                      <label className="block text-sm font-medium mt-2 mb-1">
                        Name:
                      </label>
                      <input
                        type="text"
                        className="border p-2 rounded w-full"
                        value={selectedCircuitName}
                        onChange={(e) => setSelectedCircuitName(e.target.value)}
                      />
                      <button
                        className="mt-2 px-4 py-2 bg-green-500 text-white rounded"
                        onClick={() => {
                          if (selectedCircuitID && selectedCircuitName) {
                            editCircuitName(
                              selectedCircuitID,
                              selectedCircuitName
                            );
                            setSavedCircuits(getSavedCircuitsList());
                          }
                        }}
                      >
                        Rename
                      </button>
                      {/* load + delete buttons */}
                      <div className="flex flex-row gap-2 mt-4">
                        <button
                          className="px-4 py-2 bg-blue-500 text-white rounded cursor-pointer"
                          onClick={() => handleCircuitSelect(selectedCircuitID)}
                        >
                          Load Circuit
                        </button>
                        <button
                          className="px-4 py-2 bg-red-500 text-white rounded cursor-pointer"
                          onClick={() => {
                            if (selectedCircuitID) {
                              deleteCircuitById(selectedCircuitID);
                              setSelectedCircuitID(null);
                              setSavedCircuits(getSavedCircuitsList());
                            }
                          }}
                        >
                          Delete Circuit
                        </button>
                        <button
                          className="px-4 py-2 bg-yellow-500 text-white rounded cursor-pointer"
                          onClick={() => {
                            if (selectedCircuitID) {
                              overrideCircuit(
                                selectedCircuitID,
                                props.currentElements ?? [],
                                props.currentWires ?? [],
                                props.getSnapshot?.() ?? ""
                              );
                              setSavedCircuits(getSavedCircuitsList());
                            }
                          }}
                        >
                          Override Circuit
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
              {/* separator */}
              <div className="border-t border-gray-300 my-4"></div>
              {/* render elements and wires */}
              {/* save current circuit; takes in an input field for name and then calls SaveCircuit with that name, and the props for elements and wires */}
              <div className="flex flex-col gap-2 max-w-lg">
                <h3 className="font-semibold">Save Current Circuit</h3>
                <input
                  type="text"
                  placeholder="Enter circuit name"
                  className="border p-2 rounded"
                  value={circuitName}
                  onChange={(e) => setCircuitName(e.target.value)}
                />
                <button
                  className="mt-2 px-4 py-2 bg-blue-500 text-white rounded"
                  onClick={() => {
                    if (circuitName) {
                      SaveCircuit(
                        circuitName,
                        props.currentElements ?? [],
                        props.currentWires ?? [],
                        props.getSnapshot?.() ?? ""
                      );
                      setSavedCircuits(getSavedCircuitsList());
                    }
                  }}
                >
                  Save Circuit
                </button>
              </div>
            </div>
          </div>,
          document.body
        )}
    </>
  );
}
