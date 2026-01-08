"use client";
import { CircuitElement, Wire } from "../types/circuit";

export function SaveCircuit(
  name: string,
  elements: CircuitElement[],
  wires: Wire[],
  snapshot?: string
) {
  // Strip out computed fields
  const sanitizedElements = elements.map(
    ({ computed: _computed, ...rest }) => rest
  );

  const circuitData = {
    name,
    snapshot: snapshot || null,
    id: crypto.randomUUID(),
    elements: sanitizedElements,
    wires,
  };

  const savedCircuits = JSON.parse(
    localStorage.getItem("savedCircuits") || "[]"
  );
  savedCircuits.push(circuitData);
  localStorage.setItem("savedCircuits", JSON.stringify(savedCircuits));
}

export function getSavedCircuitsList(): { id: string; name: string }[] {
  const savedCircuits = JSON.parse(
    localStorage.getItem("savedCircuits") || "[]"
  );
  return savedCircuits.map((circuit: { id: string; name: string }) => ({
    id: circuit.id,
    name: circuit.name,
  }));
}

export function getCircuitById(id: string):
  | {
    id: string;
    name: string;
    elements: CircuitElement[];
    wires: Wire[];
    snapshot?: string;
  }
  | undefined {
  const savedCircuits = JSON.parse(
    localStorage.getItem("savedCircuits") || "[]"
  );
  return savedCircuits.find((circuit: { id: string }) => circuit.id === id);
}

export function deleteCircuitById(id: string): boolean {
  const savedCircuits = JSON.parse(
    localStorage.getItem("savedCircuits") || "[]"
  );
  const newSavedCircuits = savedCircuits.filter(
    (circuit: { id: string }) => circuit.id !== id
  );
  if (newSavedCircuits.length === savedCircuits.length) {
    return false; // No circuit was deleted
  }
  localStorage.setItem("savedCircuits", JSON.stringify(newSavedCircuits));
  return true; // Circuit was successfully deleted
}

export function editCircuitName(id: string, newName: string): boolean {
  const savedCircuits = JSON.parse(
    localStorage.getItem("savedCircuits") || "[]"
  );
  const circuitIndex = savedCircuits.findIndex(
    (circuit: { id: string }) => circuit.id === id
  );
  if (circuitIndex === -1) {
    return false; // Circuit not found
  }
  savedCircuits[circuitIndex].name = newName;
  localStorage.setItem("savedCircuits", JSON.stringify(savedCircuits));
  return true; // Circuit name was successfully updated
}

export function overrideCircuit(
  id: string,
  newElements: CircuitElement[],
  newWires: Wire[],
  newSnapshot?: string
): boolean {
  const savedCircuits = JSON.parse(
    localStorage.getItem("savedCircuits") || "[]"
  );
  const circuitIndex = savedCircuits.findIndex(
    (circuit: { id: string }) => circuit.id === id
  );
  if (circuitIndex === -1) {
    return false; // Circuit not found
  }
  savedCircuits[circuitIndex].elements = newElements;
  savedCircuits[circuitIndex].wires = newWires;
  savedCircuits[circuitIndex].snapshot = newSnapshot || null;
  localStorage.setItem("savedCircuits", JSON.stringify(savedCircuits));
  return true; // Circuit was successfully overridden
}
