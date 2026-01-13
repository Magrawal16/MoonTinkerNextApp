"use client";
import { CircuitElement, Wire } from "../types/circuit";
import { CLIENT_API_BASE, EXTERNAL_API_BASE } from "@/common/config/api";

const API_SECURITY_KEY = "X2DPR-RO1WTR-98007-PRS70-VEQ12Y";

function getAuthToken(): string {
  if (typeof window !== 'undefined') {
    const token = sessionStorage.getItem("mt:token");
    const expiryStr = sessionStorage.getItem("mt:token:expiry");
    
    if (!token) return "";
    
    // Check if token has expired
    if (expiryStr) {
      const expiryTime = parseInt(expiryStr, 10);
      if (Date.now() >= expiryTime) {
        // Token expired - clear all auth data and redirect
        sessionStorage.removeItem("mt:token");
        sessionStorage.removeItem("mt:token:expiry");
        sessionStorage.removeItem("mt:auth");
        sessionStorage.removeItem("mt:user");
        sessionStorage.removeItem("mt:role");
        console.warn('[Auth] Token expired, please login again');
        if (window.location.pathname !== '/login') {
          window.location.href = '/login';
        }
        return "";
      }
    }
    
    return token;
  }
  return "";
}

export async function SaveCircuit(
  name: string,
  elements: CircuitElement[],
  wires: Wire[],
  snapshot?: string
): Promise<string> {
  // Strip out computed fields
  const sanitizedElements = elements.map(
    ({ computed: _computed, ...rest }) => rest
  );

  const circuitData = {
    Name: name,
    Snapshot: snapshot || null,
    ElementsJson: JSON.stringify(sanitizedElements),
  WiresJson: JSON.stringify(wires)
  };

  try {
  debugger;

    const token = getAuthToken();
    const response = await fetch(`${EXTERNAL_API_BASE}/Circuit/createCircuit`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
          "security-key": API_SECURITY_KEY,
        "Authorization": token ? `Bearer ${token}` : "",
      },
      body: JSON.stringify(circuitData),
    });

    if (!response.ok) {
      throw new Error(`Failed to save circuit: ${response.statusText}`);
    }

    const result = await response.json();
    // Handle different response shapes from backend
    return result.data?.id || result.id || crypto.randomUUID();
  } catch (error) {
    console.error('[SaveCircuit] API call failed:', error);
    throw error;
  }
}

export async function getSavedCircuitsList(): Promise<{ id: string; name: string }[]> {
  debugger;
  try {
    const token = getAuthToken();
    const response = await fetch(`${EXTERNAL_API_BASE}/Circuit/getCircuits`, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
          "security-key": API_SECURITY_KEY,
        "Authorization": token ? `Bearer ${token}` : "",
      },
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch circuits: ${response.statusText}`);
    }

    const result = await response.json();
    const circuits = result.data || result || [];
    const circuitList = Array.isArray(circuits) ? circuits : [];

    return circuitList.map((circuit: any) => ({
      id: circuit.id,
      name: circuit.name,
    }));
  } catch (error) {
    console.error('[getSavedCircuitsList] API call failed:', error);
    return [];
  }
}

export async function getCircuitById(id: string): Promise<
  | {
    id: string;
    name: string;
    elements: CircuitElement[];
    wires: Wire[];
    snapshot?: string;
  }
  | undefined
> {
  try {
  debugger;

    const token = getAuthToken();
    const response = await fetch(`${EXTERNAL_API_BASE}/Circuit/getCircuitById/${id}`, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        "Authorization": token ? `Bearer ${token}` : "",
          "security-key": API_SECURITY_KEY
      },
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch circuit: ${response.statusText}`);
    }

    const result = await response.json();
    return result.data || result;
  } catch (error) {
    console.error('[getCircuitById] API call failed:', error);
    return undefined;
  }
}

export async function deleteCircuitById(id: string): Promise<boolean> {
  try {
  debugger;

    const token = getAuthToken();
    const response = await fetch(`${EXTERNAL_API_BASE}/Circuit/deleteCircuit/${id}`, {
      method: "DELETE",
      headers: {
        "Content-Type": "application/json",
        "Authorization": token ? `Bearer ${token}` : "",
          "security-key": API_SECURITY_KEY
      },
    });

    if (!response.ok) {
      throw new Error(`Failed to delete circuit: ${response.statusText}`);
    }

    return true;
  } catch (error) {
    console.error('[deleteCircuitById] API call failed:', error);
    return false;
  }
}

export async function editCircuitName(id: string, newName: string): Promise<boolean> {
  try {
  debugger;

    const token = getAuthToken();
    const response = await fetch(`${EXTERNAL_API_BASE}/Circuit/updateCircuit/${id}`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
          "security-key": API_SECURITY_KEY,

        "Authorization": token ? `Bearer ${token}` : "",
      },
      body: JSON.stringify({ name: newName }),
    });

    if (!response.ok) {
      throw new Error(`Failed to update circuit name: ${response.statusText}`);
    }

    return true;
  } catch (error) {
    console.error('[editCircuitName] API call failed:', error);
    return false;
  }
}

export async function overrideCircuit(
  id: string,
  newElements: CircuitElement[],
  newWires: Wire[],
  newSnapshot?: string
): Promise<boolean> {
  try {
  debugger;
    const token = getAuthToken();
    const response = await fetch(`${EXTERNAL_API_BASE}/Circuit/updateCircuit/${id}`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
          "security-key": API_SECURITY_KEY,

        "Authorization": token ? `Bearer ${token}` : "",
      },
      body: JSON.stringify({
        elements: newElements,
        wires: newWires,
        snapshot: newSnapshot || null,
      }),
    });

    if (!response.ok) {
      throw new Error(`Failed to override circuit: ${response.statusText}`);
    }

    return true;
  } catch (error) {
    console.error('[overrideCircuit] API call failed:', error);
    return false;
  }
}

export async function duplicateCircuit(id: string): Promise<string | null> {
  debugger;
  const circuit = await getCircuitById(id);
  if (!circuit) return null;
  
  try {
    const newId = await SaveCircuit(
      `${circuit.name} (Copy)`,
      circuit.elements,
      circuit.wires,
      circuit.snapshot
    );
    return newId;
  } catch (error) {
    console.error('[duplicateCircuit] Failed to duplicate:', error);
    return null;
  }
}
