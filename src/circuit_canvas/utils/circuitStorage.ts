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
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  const savedCircuits = JSON.parse(
    localStorage.getItem("savedCircuits") || "[]"
  );
  savedCircuits.push(circuitData);
  localStorage.setItem("savedCircuits", JSON.stringify(savedCircuits));
  return circuitData.id;
}

export function getSavedCircuitsList(): { id: string; name: string; createdAt?: string; updatedAt?: string }[] {
  const savedCircuits = JSON.parse(
    localStorage.getItem("savedCircuits") || "[]"
  );
  return savedCircuits.map((circuit: { id: string; name: string; createdAt?: string; updatedAt?: string }) => ({
    id: circuit.id,
    name: circuit.name,
    createdAt: circuit.createdAt,
    updatedAt: circuit.updatedAt,
  })).sort((a: { id: string; name: string; createdAt?: string; updatedAt?: string }, b: { id: string; name: string; createdAt?: string; updatedAt?: string }) => {
    // Sort by updated date, most recent first
    const dateA = a.updatedAt || a.createdAt || '';
    const dateB = b.updatedAt || b.createdAt || '';
    return dateB.localeCompare(dateA);
  });
}

export function getCircuitById(id: string):
  | {
    id: string;
    name: string;
    elements: CircuitElement[];
    wires: Wire[];
    snapshot?: string;
    createdAt?: string;
    updatedAt?: string;
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
  savedCircuits[circuitIndex].updatedAt = new Date().toISOString();
  localStorage.setItem("savedCircuits", JSON.stringify(savedCircuits));
  return true; // Circuit was successfully overridden
}

export function duplicateCircuit(id: string): string | null {
  const circuit = getCircuitById(id);
  if (!circuit) return null;
  
  const newId = SaveCircuit(
    `${circuit.name} (Copy)`,
    circuit.elements,
    circuit.wires,
    circuit.snapshot
  );
  return newId;
}
