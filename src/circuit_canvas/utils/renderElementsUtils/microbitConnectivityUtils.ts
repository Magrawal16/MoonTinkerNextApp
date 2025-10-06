// microbitConnectivityUtils.ts

import { CircuitElement, Wire } from "@/circuit_canvas/types/circuit";

export interface MicrobitConnectionStatus {
  vcc: boolean;
  gnd: boolean;
  trig: boolean;
  echo: boolean;
  allConnected: boolean;
  trigPin?: string; // Which pin TRIG is connected to (e.g., "P0", "P1", "P2")
  echoPin?: string; // Which pin ECHO is connected to (e.g., "P0", "P1", "P2")
}

export interface ConnectedMicrobitData {
  microbit: CircuitElement;
  connections: MicrobitConnectionStatus;
}

/**
 * Find connected microbit for ultrasonic sensor
 * @param element - The ultrasonic sensor element
 * @param elements - All circuit elements
 * @param wires - All wires in the circuit
 * @returns Connected microbit data or null if none found
 */
export function findConnectedMicrobit(
  element: CircuitElement,
  elements: CircuitElement[],
  wires: Wire[]
): ConnectedMicrobitData | null {
  // Only work with ultrasonic sensors
  if (element.type !== "ultrasonicsensor4p" || !elements || !wires) {
    return null;
  }
  // Get sensor nodes
  const sensorNodes = element.nodes;
  const vccNode = sensorNodes.find(n => n.placeholder === "VCC(+5V)");
  const gndNode = sensorNodes.find(n => n.placeholder === "GND");
  const trigNode = sensorNodes.find(n => n.placeholder === "TRIG");
  const echoNode = sensorNodes.find(n => n.placeholder === "ECHO");

  // Find all microbits in the circuit
  const microbits = elements.filter(el => el.type === "microbit" || el.type === "microbitWithBreakout");

  for (const microbit of microbits) {
    const connectionStatus = checkMicrobitConnection(
      { vccNode, gndNode, trigNode, echoNode },
      microbit,
      wires
    );

    // If any connection exists, return this microbit with its connection status
    if (connectionStatus.vcc || connectionStatus.gnd || connectionStatus.trig || connectionStatus.echo) {
      return {
        microbit,
        connections: connectionStatus
      };
    }
  }

  return null;
}

/**
 * Check connection status between sensor nodes and a specific microbit
 * @param sensorNodes - Object containing sensor node references
 * @param microbit - The microbit element to check
 * @param wires - All wires in the circuit
 * @returns Connection status object
 */
function checkMicrobitConnection(
  sensorNodes: {
    vccNode: any;
    gndNode: any;
    trigNode: any;
    echoNode: any;
  },
  microbit: CircuitElement,
  wires: Wire[]
): MicrobitConnectionStatus {
  const { vccNode, gndNode, trigNode, echoNode } = sensorNodes;

  // Find microbit pins
  const microbitNodes = microbit.nodes;
  const microbit3V3Node = microbitNodes.find(n => n.placeholder === "3.3V");
  const microbitGndNode = microbitNodes.find(n => n.placeholder === "GND");
  
  // Get all digital pins (P0, P1, P2, etc.)
  const digitalPins = microbitNodes.filter(n => 
    n.placeholder && n.placeholder.match(/^P\d+$/)
  );

  // Check VCC connection
  const isVccConnected = !!(vccNode && microbit3V3Node && 
    areNodesConnectedByWire(vccNode.id, microbit3V3Node.id, wires)
  );

  // Check GND connection
  const isGndConnected = !!(gndNode && microbitGndNode && 
    areNodesConnectedByWire(gndNode.id, microbitGndNode.id, wires)
  );

  // Check TRIG connection to any digital pin
  let trigPin: string | undefined;
  let isTrigConnected = false;
  if (trigNode) {
    for (const pin of digitalPins) {
      if (areNodesConnectedByWire(trigNode.id, pin.id, wires)) {
        isTrigConnected = true;
        trigPin = pin.placeholder;
        break;
      }
    }
  }

  // Check ECHO connection to any digital pin
  let echoPin: string | undefined;
  let isEchoConnected = false;
  if (echoNode) {
    for (const pin of digitalPins) {
      if (areNodesConnectedByWire(echoNode.id, pin.id, wires)) {
        isEchoConnected = true;
        echoPin = pin.placeholder;
        break;
      }
    }
  }

  return {
    vcc: isVccConnected,
    gnd: isGndConnected,
    trig: isTrigConnected,
    echo: isEchoConnected,
    allConnected: isVccConnected && isGndConnected && isTrigConnected && isEchoConnected,
    trigPin,
    echoPin
  };
}

/**
 * Check if two nodes are connected by a wire
 * @param nodeId1 - First node ID
 * @param nodeId2 - Second node ID
 * @param wires - Array of all wires
 * @returns True if nodes are connected, false otherwise
 */
function areNodesConnectedByWire(nodeId1: string, nodeId2: string, wires: Wire[]): boolean {
  return wires.some(wire => 
    (wire.fromNodeId === nodeId1 && wire.toNodeId === nodeId2) ||
    (wire.toNodeId === nodeId1 && wire.fromNodeId === nodeId2)
  );
}

/**
 * Get all microbits connected to an ultrasonic sensor
 * @param element - The ultrasonic sensor element
 * @param elements - All circuit elements
 * @param wires - All wires in the circuit
 * @returns Array of connected microbit data
 */
export function findAllConnectedMicrobits(
  element: CircuitElement,
  elements: CircuitElement[],
  wires: Wire[]
): ConnectedMicrobitData[] {
  if (element.type !== "ultrasonicsensor4p" || !elements || !wires) {
    return [];
  }

  const sensorNodes = element.nodes;
  const vccNode = sensorNodes.find(n => n.placeholder === "VCC(+5V)");
  const gndNode = sensorNodes.find(n => n.placeholder === "GND");
  const trigNode = sensorNodes.find(n => n.placeholder === "TRIG");
  const echoNode = sensorNodes.find(n => n.placeholder === "ECHO");

  const microbits = elements.filter(el => el.type === "microbit" || el.type === "microbitWithBreakout");
  const connectedMicrobits: ConnectedMicrobitData[] = [];

  for (const microbit of microbits) {
    const connectionStatus = checkMicrobitConnection(
      { vccNode, gndNode, trigNode, echoNode },
      microbit,
      wires
    );

    // If any connection exists, add to results
    if (connectionStatus.vcc || connectionStatus.gnd || connectionStatus.trig || connectionStatus.echo) {
      connectedMicrobits.push({
        microbit,
        connections: connectionStatus
      });
    }
  }

  return connectedMicrobits;
}

/**
 * Get connection summary for UI display
 * @param connections - Connection status object
 * @returns Summary information about connections
 */
export function getMicrobitConnectionSummary(connections: MicrobitConnectionStatus): {
  connectedCount: number;
  totalCount: number;
  isFullyConnected: boolean;
  missingConnections: string[];
  connectedPins: string[];
  pinMappings: { pin: string; connection: string }[];
} {
  const connectionEntries = [
    { name: 'VCC', connected: connections.vcc },
    { name: 'GND', connected: connections.gnd },
    { name: 'TRIG', connected: connections.trig },
    { name: 'ECHO', connected: connections.echo }
  ];

  const connectedCount = connectionEntries.filter(entry => entry.connected).length;
  const missingConnections = connectionEntries
    .filter(entry => !entry.connected)
    .map(entry => entry.name);
  const connectedPins = connectionEntries
    .filter(entry => entry.connected)
    .map(entry => entry.name);

  // Create pin mappings for connected pins
  const pinMappings: { pin: string; connection: string }[] = [];
  if (connections.vcc) {
    pinMappings.push({ pin: '3.3V', connection: 'VCC' });
  }
  if (connections.gnd) {
    pinMappings.push({ pin: 'GND', connection: 'GND' });
  }
  if (connections.trig && connections.trigPin) {
    pinMappings.push({ pin: connections.trigPin, connection: 'TRIG' });
  }
  if (connections.echo && connections.echoPin) {
    pinMappings.push({ pin: connections.echoPin, connection: 'ECHO' });
  }

  return {
    connectedCount,
    totalCount: connectionEntries.length,
    isFullyConnected: connections.allConnected,
    missingConnections,
    connectedPins,
    pinMappings
  };
}

/**
 * Validate microbit connections and provide feedback
 * @param element - The ultrasonic sensor element
 * @param elements - All circuit elements
 * @param wires - All wires in the circuit
 * @returns Validation result with warnings and recommendations
 */
export function validateMicrobitConnections(
  element: CircuitElement,
  elements: CircuitElement[],
  wires: Wire[]
): {
  isValid: boolean;
  warnings: string[];
  recommendations: string[];
  connectedMicrobit?: ConnectedMicrobitData;
} {
  const connectedMicrobit = findConnectedMicrobit(element, elements, wires);
  const warnings: string[] = [];
  const recommendations: string[] = [];

  if (!connectedMicrobit) {
    warnings.push("No microbit connected to ultrasonic sensor");
    recommendations.push("Connect VCC, GND, TRIG, and ECHO pins to a microbit");
    return { isValid: false, warnings, recommendations };
  }

  const summary = getMicrobitConnectionSummary(connectedMicrobit.connections);

  if (!summary.isFullyConnected) {
    warnings.push(`Incomplete microbit connection: ${summary.connectedCount}/${summary.totalCount} pins connected`);
    recommendations.push(`Connect missing pins: ${summary.missingConnections.join(", ")}`);
  }

  // Specific pin validation with flexible digital pin connections
  if (!connectedMicrobit.connections.vcc) {
    recommendations.push("Connect VCC(+5V) to microbit 3.3V pin");
  }
  if (!connectedMicrobit.connections.gnd) {
    recommendations.push("Connect GND to microbit GND pin");
  }
  if (!connectedMicrobit.connections.trig) {
    recommendations.push("Connect TRIG to any microbit digital pin (P0, P1, P2, etc.)");
  }
  if (!connectedMicrobit.connections.echo) {
    recommendations.push("Connect ECHO to any microbit digital pin (P0, P1, P2, etc.)");
  }


  return {
    isValid: warnings.length === 0,
    warnings,
    recommendations,
    connectedMicrobit
  };
}

/**
 * Get the specific pin connections for TRIG and ECHO
 * @param element - The ultrasonic sensor element
 * @param elements - All circuit elements
 * @param wires - All wires in the circuit
 * @returns Object containing the connected pin information
 */
export function getTrigEchoPinConnections(
  element: CircuitElement,
  elements: CircuitElement[],
  wires: Wire[]
): {
  trigPin: string | null;
  echoPin: string | null;
  microbitId: string | null;
} {
  const connectedMicrobit = findConnectedMicrobit(element, elements, wires);
  
  if (!connectedMicrobit) {
    return {
      trigPin: null,
      echoPin: null,
      microbitId: null
    };
  }

  return {
    trigPin: connectedMicrobit.connections.trigPin || null,
    echoPin: connectedMicrobit.connections.echoPin || null,
    microbitId: connectedMicrobit.microbit.id
  };
}
