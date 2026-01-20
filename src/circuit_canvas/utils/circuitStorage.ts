"use client";
import { CircuitElement, Wire } from "../types/circuit";
import { CLIENT_API_BASE, EXTERNAL_API_BASE } from "@/common/config/api";
import { apiFetch, handle404Error } from "@/common/utils/apiErrorHandler";
import { showErrorToast, showSuccessToast } from "@/common/utils/toastNotification";
import { APP_MESSAGES } from "@/common/constants/messages";

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
  snapshot?: string,
  controllerCodeJson?: Record<string, string>,
  controllerXmlJson?: Record<string, string>
): Promise<string> {
  // Strip out computed fields
  const sanitizedElements = elements.map(
    ({ computed: _computed, ...rest }) => rest
  );

  const circuitData = {
    Name: name,
    Snapshot: snapshot || null,
    ElementsJson: JSON.stringify(sanitizedElements),
    WiresJson: JSON.stringify(wires),
    ControllerCodeJson: controllerCodeJson ? JSON.stringify(controllerCodeJson) : null,
    ControllerXmlJson: controllerXmlJson ? JSON.stringify(controllerXmlJson) : null,
  };

  try {
  debugger;

    const token = getAuthToken();
    const response = await apiFetch(`${EXTERNAL_API_BASE}/Circuit/createCircuit`, {
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
    showErrorToast(APP_MESSAGES.ERRORS.CIRCUIT_SAVE_FAILED);
    throw error;
  }
}

export async function getSavedCircuitsList(): Promise<{ id: string; name: string; createdAt?: string; updatedAt?: string }[]> {
  debugger;
  try {
    const token = getAuthToken();
    const response = await apiFetch(`${EXTERNAL_API_BASE}/Circuit/getCircuits`, {
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
      createdAt: circuit.createdAt || circuit.CreatedAt,
      updatedAt: circuit.updatedAt || circuit.UpdatedAt,
    }));
  } catch (error) {
    showErrorToast(APP_MESSAGES.ERRORS.CIRCUIT_LOAD_FAILED);
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
    createdAt?: string;
    updatedAt?: string;
    controllerCodeMap?: Record<string, string>;
    controllerXmlMap?: Record<string, string>;
  }
  | undefined
> {
  try {
  debugger;

    const token = getAuthToken();
    const response = await apiFetch(`${EXTERNAL_API_BASE}/Circuit/getCircuitById/${id}`, {
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
    const data = result.data || result;

    // Normalize backend DTO -> client shape
    const elementsJson = data.ElementsJson || data.elementsJson || data.elements;
    const wiresJson = data.WiresJson || data.wiresJson || data.wires;
    const controllerCodeJson = data.ControllerCodeJson || data.controllerCodeJson;
    const controllerXmlJson = data.ControllerXmlJson || data.controllerXmlJson;

    let parsedElements: CircuitElement[] = [];
    let parsedWires: Wire[] = [];
    let parsedControllerCodeMap: Record<string, string> = {};
    let parsedControllerXmlMap: Record<string, string> = {};
    try {
      if (typeof elementsJson === "string") parsedElements = JSON.parse(elementsJson);
      else if (Array.isArray(elementsJson)) parsedElements = elementsJson;
    } catch (e) {
      console.warn('[getCircuitById] Failed to parse ElementsJson');
    }

    try {
      if (typeof wiresJson === "string") parsedWires = JSON.parse(wiresJson);
      else if (Array.isArray(wiresJson)) parsedWires = wiresJson;
    } catch (e) {
      console.warn('[getCircuitById] Failed to parse WiresJson');
    }

    try {
      if (typeof controllerCodeJson === "string") parsedControllerCodeMap = JSON.parse(controllerCodeJson);
      else if (typeof controllerCodeJson === "object") parsedControllerCodeMap = controllerCodeJson;
    } catch (e) {
      console.warn('[getCircuitById] Failed to parse ControllerCodeJson');
    }

    try {
      if (typeof controllerXmlJson === "string") parsedControllerXmlMap = JSON.parse(controllerXmlJson);
      else if (typeof controllerXmlJson === "object") parsedControllerXmlMap = controllerXmlJson;
    } catch (e) {
      console.warn('[getCircuitById] Failed to parse ControllerXmlJson');
    }

    return {
      id: data.id || data.Id,
      name: data.name || data.Name,
      elements: parsedElements,
      wires: parsedWires,
      snapshot: data.snapshot || data.Snapshot || null,
      createdAt: data.createdAt || data.CreatedAt,
      updatedAt: data.updatedAt || data.UpdatedAt,
      controllerCodeMap: parsedControllerCodeMap,
      controllerXmlMap: parsedControllerXmlMap,
    };
  } catch (error) {
    showErrorToast(APP_MESSAGES.ERRORS.CIRCUIT_LOAD_FAILED);
    return undefined;
  }
}

export async function deleteCircuitById(id: string): Promise<boolean> {
  try {
  debugger;

    const token = getAuthToken();
    const response = await apiFetch(`${EXTERNAL_API_BASE}/Circuit/deleteCircuit/${id}`, {
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
    showErrorToast(APP_MESSAGES.ERRORS.CIRCUIT_DELETE_FAILED);
    return false;
  }
}

export async function updateCircuit(
  id: string,
  {
    name,
    elements,
    wires,
    snapshot,
    controllerCodeJson,
    controllerXmlJson,
  }: {
    name?: string;
    elements?: CircuitElement[];
    wires?: Wire[];
    snapshot?: string | null;
    controllerCodeJson?: Record<string, string>;
    controllerXmlJson?: Record<string, string>;
  }
): Promise<boolean> {
  try {
    debugger;

    // Ensure we have full circuit data. If any field is missing, fetch existing circuit.
    let targetName = name;
    let targetElements = elements;
    let targetWires = wires;
    let targetSnapshot = snapshot;
    let targetControllerCodeJson = controllerCodeJson;
    let targetControllerXmlJson = controllerXmlJson;

    // Always fetch existing circuit to ensure we have complete data (especially snapshot)
    // This prevents 400 errors from missing required fields
    const existingCircuit = await getCircuitById(id);
    if (!existingCircuit) {
      showErrorToast(APP_MESSAGES.ERRORS.CIRCUIT_NOT_FOUND);
      return false;
    }
    
    // Use provided values, fallback to existing
    targetName = targetName || existingCircuit.name;
    targetElements = targetElements || existingCircuit.elements;
    targetWires = targetWires || existingCircuit.wires;
    targetSnapshot = targetSnapshot !== undefined ? targetSnapshot : (existingCircuit.snapshot ?? null);
    targetControllerCodeJson = targetControllerCodeJson || existingCircuit.controllerCodeMap;
    targetControllerXmlJson = targetControllerXmlJson || existingCircuit.controllerXmlMap;

    // Strip out computed fields from elements before sending
    const sanitizedElements = (targetElements || []).map(
      ({ computed: _computed, ...rest }) => rest
    );

    const updateData = {
      Id: id,
      Name: targetName || "",
      ElementsJson: JSON.stringify(sanitizedElements),
      WiresJson: JSON.stringify(targetWires || []),
      Snapshot: targetSnapshot || null,
      ControllerCodeJson: targetControllerCodeJson ? JSON.stringify(targetControllerCodeJson) : null,
      ControllerXmlJson: targetControllerXmlJson ? JSON.stringify(targetControllerXmlJson) : null,
    };

    const token = getAuthToken();
    const response = await apiFetch(`${EXTERNAL_API_BASE}/Circuit/updateCircuit/${id}`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        "security-key": API_SECURITY_KEY,
        "Authorization": token ? `Bearer ${token}` : "",
      },
      body: JSON.stringify(updateData),
    });

    if (!response.ok) {
      // Try to get error details from response
      let errorDetail = response.statusText;
      try {
        const errorData = await response.json();
        errorDetail = errorData.message || errorData.error || JSON.stringify(errorData);
      } catch {
        // If can't parse JSON, use statusText
      }
      console.error('[updateCircuit] API error:', {
        status: response.status,
        statusText: response.statusText,
        detail: errorDetail,
        updateData: {
          id,
          nameLength: updateData.Name?.length,
          elementsCount: sanitizedElements.length,
          wiresCount: (targetWires || []).length,
        }
      });
      throw new Error(`Failed to update circuit (${response.status}): ${errorDetail}`);
    }

    return true;
  } catch (error) {
    console.error('[updateCircuit] Caught error:', error);
    showErrorToast(APP_MESSAGES.ERRORS.CIRCUIT_UPDATE_FAILED);
    return false;
  }
}

export async function duplicateCircuit(id: string): Promise<string | null> {
  debugger;
  const circuit = await getCircuitById(id);
  if (!circuit) return null;
  
  try {
    // Get all existing circuits to check for name conflicts
    const existingCircuits = await getSavedCircuitsList();
    const existingNames = new Set(existingCircuits.map(c => c.name));
    
    // Remove any existing (Copy) or (Copy_X) suffix to get the base name
    let baseName = circuit.name;
    const copyPattern = /\s*\(Copy(?:_\d+)?\)\s*$/;
    baseName = baseName.replace(copyPattern, '').trim();
    
    // Generate a unique name for the duplicated circuit
    let newName = `${baseName} (Copy)`;
    let copyNumber = 2;
    
    // If the base "(Copy)" name exists, try numbered copies
    while (existingNames.has(newName)) {
      newName = `${baseName} (Copy_${copyNumber})`;
      copyNumber++;
    }
    
    const newId = await SaveCircuit(
      newName,
      circuit.elements,
      circuit.wires,
      circuit.snapshot,
      circuit.controllerCodeMap,
      circuit.controllerXmlMap
    );
    return newId;
  } catch (error) {
    showErrorToast(APP_MESSAGES.ERRORS.CIRCUIT_DUPLICATE_FAILED);
    return null;
  }
}
