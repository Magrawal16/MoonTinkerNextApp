import { CircuitElement, Wire } from "../types/circuit";
import { getLedForwardVoltage, getLedSeriesResistance } from "./ledBehavior";
import { getRgbLedForwardVoltage, getRgbLedSeriesResistance } from "./rgbLedBehavior";
import { lightLevelToResistance } from "./ldrUtils";

const DEBUG = false;

// Multimeter modeling constants
// High input impedance for voltmeter (~10 MΩ)
const VOLTMETER_R = 10_000_000; // ohms
// Low shunt resistance for ammeter (~50 mΩ)
const AMMETER_R = 0.05; // ohms
// Ohmmeter injects a small constant current and measures resulting voltage
const OHMMETER_ITEST = 0.001; // amps (1 mA)
// Treat anything above this as open-loop (OL) like Tinkercad's DMM
const OHMMETER_OPEN_THRESHOLD = 1e9; // ohms

/**
 * Main function to solve the entire circuit by dividing it into connected subcircuits.
 * Kept same signature for compatibility. Improved safety checks, better pivoting
 * (scaled partial pivoting) and optional logging are added.
 */
export default function solveCircuit(
  elements: CircuitElement[],
  wires: Wire[]
): CircuitElement[] {
  // Break circuit into isolated connected subcircuits
  const subcircuits = getConnectedSubcircuits(elements, wires);

  const allResults: CircuitElement[] = [];

  // Solve each subcircuit and collect results
  for (let i = 0; i < subcircuits.length; i++) {
    const { elements: subEls, wires: subWires } = subcircuits[i];
    const results = solveSingleSubcircuit(subEls, subWires);
    allResults.push(...results);
  }
  return allResults;
}


function solveSingleSubcircuit(
  elements: CircuitElement[],
  wires: Wire[]
): CircuitElement[] {
  const nodeEquivalenceMap = findEquivalenceClasses(elements, wires);
  
  const subcircuits = getConnectedSubcircuitsAfterMerge(elements, wires, nodeEquivalenceMap);
  
  if (subcircuits.length > 1) {
    const allResults: CircuitElement[] = [];
    for (const sub of subcircuits) {
      const subResults = solveSingleSubcircuitAfterMerge(sub.elements, sub.wires, nodeEquivalenceMap);
      allResults.push(...subResults);
    }
    return allResults;
  }
  
  return solveSingleSubcircuitAfterMerge(elements, wires, nodeEquivalenceMap);
}

function solveSingleSubcircuitAfterMerge(
  elements: CircuitElement[],
  wires: Wire[],
  nodeEquivalenceMap: Map<string, string>
): CircuitElement[] {
  const microbitShortMap = detectMicrobitRailShorts(elements, nodeEquivalenceMap);
  const effectiveNodeIds = getEffectiveNodeIds(nodeEquivalenceMap);
  
  if (effectiveNodeIds.size === 0) {
    return applyMicrobitShortFlags(zeroOutComputed(elements), microbitShortMap);
  }

  const { groundId, nonGroundIds, nodeIndex } =
    getNodeMappings(effectiveNodeIds);

  const n = nonGroundIds.length;

  // Determine which elements act as independent sources for this subcircuit
  // Base set includes batteries, microbits, and supplies. Ohmmeters no longer
  // inject a voltage source; they are modeled via a fixed test current stamp.
  const elementsWithCurrent = getElementsWithCurrent(elements, nodeEquivalenceMap);

  const currentSourceIndexMap = mapCurrentSourceIndices(elementsWithCurrent);

  // LED polarity handling: iterate stamping with LED on/off states until stable
  const ledIds = new Set(
    elements.filter((e) => e.type === "led").map((e) => e.id)
  );
  let ledOnMap = new Map<string, boolean>(); // default: all off
  
  // RGB LED has 3 channels, so we track each channel's on/off state separately
  // Key format: "elementId-red", "elementId-green", "elementId-blue"
  let rgbLedOnMap = new Map<string, boolean>(); // default: all off
  
  let nodeVoltages: Record<string, number> = {};
  let x: number[] | null = null;

  const MAX_ITERS = 8;
  for (let iter = 0; iter < MAX_ITERS; iter++) {
    const { G, B, C, D, I, E } = buildMNAMatrices(
      elements,
      elementsWithCurrent,
      nodeEquivalenceMap,
      nodeIndex,
      currentSourceIndexMap,
      ledOnMap,
      undefined,
      false,
      rgbLedOnMap
    );


    const { A, z } = buildFullSystem(G, B, C, D, I, E);

    x = solveLinearSystem(A, z);
    if (!x) {
      return applyMicrobitShortFlags(zeroOutComputed(elements), microbitShortMap);
    }

    nodeVoltages = getNodeVoltages(x, nonGroundIds, groundId);
    

    // Re-evaluate LED forward bias and update on/off map
    let changed = false;
    const nextMap = new Map<string, boolean>(ledOnMap);
    for (const el of elements) {
      if (el.type !== "led") continue;
      const isExploded = (el.runtime as any)?.led?.exploded;
      if (isExploded) {
        if ((ledOnMap.get(el.id) ?? false) !== false) changed = true;
        nextMap.set(el.id, false);
        continue;
      }
      const cathodeId = el.nodes?.[0]?.id;
      const anodeId = el.nodes?.[1]?.id;
      const cNode = cathodeId ? nodeEquivalenceMap.get(cathodeId) : undefined;
      const aNode = anodeId ? nodeEquivalenceMap.get(anodeId) : undefined;
      const Vc = cNode ? nodeVoltages[cNode] ?? 0 : 0;
      const Va = aNode ? nodeVoltages[aNode] ?? 0 : 0;
      const Vf = getLedForwardVoltage(el.properties?.color);
      const forward = Va - Vc; // anode minus cathode
      const isOn = forward >= Vf; // forward-biased beyond threshold
      if ((ledOnMap.get(el.id) ?? false) !== isOn) {
        nextMap.set(el.id, isOn);
        changed = true;
      }
    }
    ledOnMap = nextMap;
    
    // Re-evaluate RGB LED channels
    const nextRgbMap = new Map<string, boolean>(rgbLedOnMap);
    for (const el of elements) {
      if (el.type !== "rgbled") continue;
      const rgbLedType = (el.properties as any)?.rgbLedType ?? "common-cathode";
      const runtime = el.runtime as any;
      
      // RGB LED nodes: [red, common, green, blue]
      const redNodeId = el.nodes?.[0]?.id;
      const commonNodeId = el.nodes?.[1]?.id;
      const greenNodeId = el.nodes?.[2]?.id;
      const blueNodeId = el.nodes?.[3]?.id;
      
      const redNode = redNodeId ? nodeEquivalenceMap.get(redNodeId) : undefined;
      const commonNode = commonNodeId ? nodeEquivalenceMap.get(commonNodeId) : undefined;
      const greenNode = greenNodeId ? nodeEquivalenceMap.get(greenNodeId) : undefined;
      const blueNode = blueNodeId ? nodeEquivalenceMap.get(blueNodeId) : undefined;
      
      const Vred = redNode ? nodeVoltages[redNode] ?? 0 : 0;
      const Vcommon = commonNode ? nodeVoltages[commonNode] ?? 0 : 0;
      const Vgreen = greenNode ? nodeVoltages[greenNode] ?? 0 : 0;
      const Vblue = blueNode ? nodeVoltages[blueNode] ?? 0 : 0;
      
      // For common-cathode: common is negative, colors are positive (anodes)
      // For common-anode: common is positive, colors are negative (cathodes)
      const channels: Array<{ channel: "red" | "green" | "blue"; colorNode: string | undefined; colorV: number }> = [
        { channel: "red", colorNode: redNode, colorV: Vred },
        { channel: "green", colorNode: greenNode, colorV: Vgreen },
        { channel: "blue", colorNode: blueNode, colorV: Vblue },
      ];
      
      for (const { channel, colorV } of channels) {
        const channelKey = `${el.id}-${channel}`;
        const isExploded = runtime?.[channel]?.exploded;
        
        if (isExploded) {
          if ((rgbLedOnMap.get(channelKey) ?? false) !== false) changed = true;
          nextRgbMap.set(channelKey, false);
          continue;
        }
        
        const Vf = getRgbLedForwardVoltage(channel);
        let forward: number;
        
        if (rgbLedType === "common-cathode") {
          // Color is anode, common is cathode
          forward = colorV - Vcommon;
        } else {
          // Color is cathode, common is anode
          forward = Vcommon - colorV;
        }
        
        const isOn = forward >= Vf;
        if ((rgbLedOnMap.get(channelKey) ?? false) !== isOn) {
          nextRgbMap.set(channelKey, isOn);
          changed = true;
        }
      }
    }
    rgbLedOnMap = nextRgbMap;
    
    if (!changed) break; // converged
  }

  // If there are exploded LEDs, also compute a "what-if" solution treating them
  // as electrically intact so the UI can match Tinkercad-like readouts.
  const hasExplodedLed = elements.some(
    (e) => e.type === "led" && !!(e.runtime as any)?.led?.exploded
  );
  let intactLedCurrentById: Map<string, number> | undefined;
  if (hasExplodedLed) {
    const intact = solveSubcircuitWithExplodedLedsIntact(
      elements,
      elementsWithCurrent,
      nodeEquivalenceMap,
      nodeIndex,
      currentSourceIndexMap,
      nonGroundIds,
      groundId
    );
    intactLedCurrentById = intact;
  }

  // --- Bench Power Supply VC/CC adaptation pass ---
  // After initial solve treating all ON supplies as voltage sources at vSet, detect any that exceed iLimit.
  const supplyDefs = elements.filter(
    (e) => e.type === "powersupply" && (e.properties as any)?.isOn !== false
  );
  const limitedIds = new Set<string>();
  for (const s of supplyDefs) {
    const idx = currentSourceIndexMap.get(s.id);
    if (idx === undefined) continue;
    const iLimit = (s.properties as any)?.iLimit ?? 1;
    const currentVal = Math.abs(x![n + idx] ?? 0);
    if (currentVal > iLimit + 1e-9) limitedIds.add(s.id);
  }

  let finalNodeVoltages = nodeVoltages;
  let finalX = x!;
  let finalCurrentSourceIndexMap = currentSourceIndexMap;

  if (limitedIds.size > 0) {
    // Rebuild matrices with limited supplies modeled as current sources instead of voltage sources.
    const { results: reSolved } = reSolveWithCurrentLimitedSupplies(
      elements,
      nodeEquivalenceMap,
      nodeIndex,
      limitedIds
    );
    finalNodeVoltages = reSolved.nodeVoltages;
    finalX = reSolved.x;
    finalCurrentSourceIndexMap = reSolved.currentMap;
  }

  const results = computeElementResults(
    elements,
    finalNodeVoltages,
    finalX,
    nodeEquivalenceMap,
    finalCurrentSourceIndexMap,
    n,
    limitedIds,
    false,
    intactLedCurrentById,
    microbitShortMap
  );

  return applyMicrobitShortFlags(results, microbitShortMap);
}

function solveSubcircuitWithExplodedLedsIntact(
  elements: CircuitElement[],
  elementsWithCurrent: CircuitElement[],
  nodeEquivalenceMap: Map<string, string>,
  nodeIndex: Map<string, number>,
  currentSourceIndexMap: Map<string, number>,
  nonGroundIds: string[],
  groundId: string
): Map<string, number> {
  let ledOnMap = new Map<string, boolean>();
  let x: number[] | null = null;

  const MAX_ITERS = 8;
  for (let iter = 0; iter < MAX_ITERS; iter++) {
    const { G, B, C, D, I, E } = buildMNAMatrices(
      elements,
      elementsWithCurrent,
      nodeEquivalenceMap,
      nodeIndex,
      currentSourceIndexMap,
      ledOnMap,
      undefined,
      true
    );

    const { A, z } = buildFullSystem(G, B, C, D, I, E);
    x = solveLinearSystem(A, z);
    if (!x) return new Map();

    const nodeVoltages = getNodeVoltages(x, nonGroundIds, groundId);

    // Determine LED ON/OFF for this hypothetical solve (ignore exploded state)
    let changed = false;
    const nextMap = new Map<string, boolean>(ledOnMap);
    for (const el of elements) {
      if (el.type !== "led") continue;
      const cathodeId = el.nodes?.[0]?.id;
      const anodeId = el.nodes?.[1]?.id;
      const cNode = cathodeId ? nodeEquivalenceMap.get(cathodeId) : undefined;
      const aNode = anodeId ? nodeEquivalenceMap.get(anodeId) : undefined;
      const Vc = cNode ? nodeVoltages[cNode] ?? 0 : 0;
      const Va = aNode ? nodeVoltages[aNode] ?? 0 : 0;
      const Vf = getLedForwardVoltage(el.properties?.color);
      const forward = Va - Vc;
      const isOn = forward >= Vf;
      if ((ledOnMap.get(el.id) ?? false) !== isOn) {
        nextMap.set(el.id, isOn);
        changed = true;
      }
    }
    ledOnMap = nextMap;
    if (!changed) break;
  }

  if (!x) return new Map();
  const nodeVoltages = getNodeVoltages(x, nonGroundIds, groundId);
  const n = nonGroundIds.length;
  const hypoResults = computeElementResults(
    elements,
    nodeVoltages,
    x,
    nodeEquivalenceMap,
    currentSourceIndexMap,
    n,
    undefined,
    true
  );

  const map = new Map<string, number>();
  for (const el of hypoResults) {
    if (el.type === "led") map.set(el.id, el.computed?.current ?? 0);
  }
  return map;
}

/* ------------------------- Graph / equivalence helpers ------------------------- */

function getConnectedSubcircuits(
  elements: CircuitElement[],
  wires: Wire[]
): { elements: CircuitElement[]; wires: Wire[] }[] {
  const graph = new Map<string, Set<string>>();

  const addEdge = (a: string, b: string) => {
    if (!graph.has(a)) graph.set(a, new Set());
    graph.get(a)!.add(b);
    if (!graph.has(b)) graph.set(b, new Set());
    graph.get(b)!.add(a);
  };

  for (const wire of wires) {
    if (!wire.fromNodeId || !wire.toNodeId) continue;
    addEdge(wire.fromNodeId, wire.toNodeId);
  }

  for (const el of elements) {
    if (el.type === "microbit" || el.type === "microbitWithBreakout") {
      continue;
    } else if (el.nodes && el.nodes.length >= 2) {
      for (let i = 0; i < el.nodes.length; i++) {
        for (let j = i + 1; j < el.nodes.length; j++) {
          const ni = el.nodes[i]?.id;
          const nj = el.nodes[j]?.id;
          if (ni && nj) addEdge(ni, nj);
        }
      }
    }
  }

  const visited = new Set<string>();
  const nodeGroups: string[][] = [];

  for (const nodeId of graph.keys()) {
    if (visited.has(nodeId)) continue;

    const queue = [nodeId];
    visited.add(nodeId);
    const group: string[] = [];

    while (queue.length > 0) {
      const current = queue.shift()!;
      group.push(current);
      for (const neighbor of graph.get(current) ?? []) {
        if (!visited.has(neighbor)) {
          visited.add(neighbor);
          queue.push(neighbor);
        }
      }
    }

    nodeGroups.push(group);
  }

  return nodeGroups.map((group) => {
    const groupSet = new Set(group);
    const subElements = elements.filter(
      (el) =>
        Array.isArray(el.nodes) && el.nodes.some((n) => groupSet.has(n.id))
    );
    const subWires = wires.filter(
      (w) =>
        w.fromNodeId &&
        w.toNodeId &&
        groupSet.has(w.fromNodeId) &&
        groupSet.has(w.toNodeId)
    );
    return { elements: subElements, wires: subWires };
  });
}

function getConnectedSubcircuitsAfterMerge(
  elements: CircuitElement[],
  wires: Wire[],
  nodeEquivalenceMap: Map<string, string>
): { elements: CircuitElement[]; wires: Wire[] }[] {
  const graph = new Map<string, Set<string>>();
  const addEdge = (a: string, b: string) => {
    if (!graph.has(a)) graph.set(a, new Set());
    if (!graph.has(b)) graph.set(b, new Set());
    graph.get(a)!.add(b);
    graph.get(b)!.add(a);
  };

  for (const wire of wires) {
    if (wire.deleted || !wire.fromNodeId || !wire.toNodeId) continue;
    const from = nodeEquivalenceMap.get(wire.fromNodeId) ?? wire.fromNodeId;
    const to = nodeEquivalenceMap.get(wire.toNodeId) ?? wire.toNodeId;
    if (from && to) addEdge(from, to);
  }

  for (const el of elements) {
    if (!Array.isArray(el.nodes) || el.nodes.length < 2) continue;
    
    if (el.type === "slideswitch" || el.type === "pushbutton") continue;
    
    const mergedNodes = el.nodes
      .map(n => nodeEquivalenceMap.get(n.id) ?? n.id)
      .filter(Boolean);
    
    for (let i = 0; i < mergedNodes.length; i++) {
      for (let j = i + 1; j < mergedNodes.length; j++) {
        if (mergedNodes[i] && mergedNodes[j]) {
          addEdge(mergedNodes[i], mergedNodes[j]);
        }
      }
    }
  }

  const visited = new Set<string>();
  const nodeGroups: string[][] = [];

  for (const nodeId of graph.keys()) {
    if (visited.has(nodeId)) continue;

    const queue = [nodeId];
    visited.add(nodeId);
    const group: string[] = [];

    while (queue.length > 0) {
      const current = queue.shift()!;
      group.push(current);
      for (const neighbor of graph.get(current) ?? []) {
        if (!visited.has(neighbor)) {
          visited.add(neighbor);
          queue.push(neighbor);
        }
      }
    }

    nodeGroups.push(group);
  }

  return nodeGroups.map((group) => {
    const groupSet = new Set(group);
    const subElements = elements.filter((el) => {
      if (!Array.isArray(el.nodes)) return false;
      return el.nodes.some(n => {
        const merged = nodeEquivalenceMap.get(n.id) ?? n.id;
        return groupSet.has(merged);
      });
    });
    const subWires = wires.filter((w) => {
      if (!w.fromNodeId || !w.toNodeId) return false;
      const fromMerged = nodeEquivalenceMap.get(w.fromNodeId) ?? w.fromNodeId;
      const toMerged = nodeEquivalenceMap.get(w.toNodeId) ?? w.toNodeId;
      return groupSet.has(fromMerged) && groupSet.has(toMerged);
    });
    return { elements: subElements, wires: subWires };
  });
}

function findEquivalenceClasses(elements: CircuitElement[], wires: Wire[]) {
  const parent = new Map<string, string>();
  const allNodeIds = new Set<string>();

  // Filter out deleted wires, but keep hidden wires (node-to-node connections are hidden but electrically active)
  const activeWires = wires.filter((w) => !w.deleted);

  activeWires.forEach((w) => {
    if (!w.fromNodeId || !w.toNodeId) return;
    parent.set(w.fromNodeId, w.fromNodeId);
    parent.set(w.toNodeId, w.toNodeId);
    allNodeIds.add(w.fromNodeId);
    allNodeIds.add(w.toNodeId);
  });
  
  elements.forEach((e) => {
    if (!Array.isArray(e.nodes)) return;
    if (e.type === "microbit" || e.type === "microbitWithBreakout") {
      // Identify 3.3V and GND pins on micro:bit and treat same-rail pins as equivalent nets
      const posIds = e.nodes.filter((n) => n.placeholder === "3.3V").map((n) => n.id);
      const negIds = e.nodes
        .filter((n) => n.placeholder && n.placeholder.toUpperCase().startsWith("GND"))
        .map((n) => n.id);

      // Register pins that are actually present in the circuit graph (i.e., touched by any wire)
      const connectedPos = posIds.filter((id) => allNodeIds.has(id));
      const connectedNeg = negIds.filter((id) => allNodeIds.has(id));

      // Ensure parent entries exist for any connected pin
      [...connectedPos, ...connectedNeg].forEach((id) => {
        parent.set(id, id);
      });

      // Internally tie together rails: all 3.3V pins are one node; all GND pins are one node
      if (connectedPos.length > 1) {
        const root = connectedPos[0];
        for (let i = 1; i < connectedPos.length; i++) union(root, connectedPos[i]);
      }
      if (connectedNeg.length > 1) {
        const root = connectedNeg[0];
        for (let i = 1; i < connectedNeg.length; i++) union(root, connectedNeg[i]);
      }

      // Also register any other micro:bit pin that is actually wired so it can participate in unions
      e.nodes.forEach((n) => {
        if (allNodeIds.has(n.id)) parent.set(n.id, n.id);
      });
    } else {
      if (e.type === "pushbutton") {
        e.nodes.forEach((n) => {
          if (!n || !n.id) return;
          parent.set(n.id, n.id);
          allNodeIds.add(n.id);
        });
      }

      // For 4-pin pushbutton: 1a is always tied to 1b, and 2a is always tied to 2b.
      // This mirrors real hardware so wiring any top/bottom pin of a side shares the same net.
      if (e.type === "pushbutton") {
        const n1a = e.nodes.find((n) => n.placeholder === "Terminal 1a");
        const n1b = e.nodes.find((n) => n.placeholder === "Terminal 1b");
        const n2a = e.nodes.find((n) => n.placeholder === "Terminal 2a");
        const n2b = e.nodes.find((n) => n.placeholder === "Terminal 2b");

        if (n1a && n1b) union(n1a.id, n1b.id);
        if (n2a && n2b) union(n2a.id, n2b.id);
      }

      // For 3-pin slideswitch: connect terminals based on switch position
      if (e.type === "slideswitch") {
        const position = e.properties?.switchPosition ?? "left";
        const terminal1 = e.nodes.find((n) => 
          n.placeholder && (n.placeholder.includes("Terminal 1") || n.placeholder.includes("Left"))
        );
        const common = e.nodes.find((n) => 
          n.placeholder && (n.placeholder.includes("Common") || n.placeholder.includes("Middle"))
        );
        const terminal2 = e.nodes.find((n) => 
          n.placeholder && (n.placeholder.includes("Terminal 2") || n.placeholder.includes("Right"))
        );

        if (position === "left" && terminal1 && common) {
          union(terminal1.id, common.id);
        } else if (position === "right" && terminal2 && common) {
          union(terminal2.id, common.id);
        }
      }
    }
  });

  function find(i: string): string {
    if (!parent.has(i)) return i;
    const p = parent.get(i)!;
    if (p === i) return i;
    const root = find(p);
    parent.set(i, root);
    return root;
  }

  function union(i: string, j: string) {
    if (!parent.has(i) || !parent.has(j)) return;
    const rootI = find(i);
    const rootJ = find(j);
    if (rootI !== rootJ) parent.set(rootI, rootJ);
  }

  for (const wire of activeWires) {
    if (wire.fromNodeId && wire.toNodeId) union(wire.fromNodeId, wire.toNodeId);
  }

  const equivalenceMap = new Map<string, string>();
  for (const id of allNodeIds) equivalenceMap.set(id, find(id));
  return equivalenceMap;
}

function getEffectiveNodeIds(map: Map<string, string>) {
  return new Set(map.values());
}

function zeroOutComputed(elements: CircuitElement[]) {
  return elements.map((el) => ({
    ...el,
    computed: { current: 0, voltage: 0, power: 0, measurement: 0, forwardVoltage: 0, reverseVoltage: 0 },
  }));
}

function detectMicrobitRailShorts(
  elements: CircuitElement[],
  nodeMap: Map<string, string>
): Map<string, boolean> {
  const result = new Map<string, boolean>();
  for (const el of elements) {
    if (el.type !== "microbit" && el.type !== "microbitWithBreakout") continue;

    const posRoots = el.nodes
      ?.filter((n) => n.placeholder === "3.3V")
      .map((n) => nodeMap.get(n.id))
      .filter((id): id is string => !!id);

    const negRoots = el.nodes
      ?.filter((n) => n.placeholder && n.placeholder.toUpperCase().startsWith("GND"))
      .map((n) => nodeMap.get(n.id))
      .filter((id): id is string => !!id);

    const shorted = (posRoots ?? []).some((root) => (negRoots ?? []).includes(root));
    result.set(el.id, shorted);
  }

  return result;
}

function applyMicrobitShortFlags(
  elements: CircuitElement[],
  shortMap: Map<string, boolean>
): CircuitElement[] {
  if (!shortMap || shortMap.size === 0) return elements;

  return elements.map((el) => {
    if (el.type === "microbit" || el.type === "microbitWithBreakout") {
      const shorted = shortMap.get(el.id) ?? false;
      return {
        ...el,
        computed: { ...(el.computed ?? {}), shorted },
      } as CircuitElement;
    }
    return el;
  });
}

function getNodeMappings(effectiveNodeIds: Set<string>) {
  const list = Array.from(effectiveNodeIds);
  let groundId = list.find((id) => id.includes("GND")) || list[0];
  const nonGroundIds = list.filter((id) => id !== groundId);

  const nodeIndex = new Map<string, number>();
  nonGroundIds.forEach((id, i) => nodeIndex.set(id, i));
  return { groundId, nonGroundIds, nodeIndex };
}

/* ------------------------- Source detection & mapping ------------------------- */

function getElementsWithCurrent(
  elements: CircuitElement[],
  nodeMap?: Map<string, string>
) {
  const result: CircuitElement[] = [];

  for (const e of elements) {
    if (!e || !e.type) continue;
    if (
      (((e.type === "battery" || e.type === "cell3v" || e.type === "AA_battery" || e.type === "AAA_battery" || e.type === "powersupply")) &&
        Array.isArray(e.nodes) &&
        e.nodes.length === 2)
    ) {
      // If it's a power supply explicitly switched OFF, do not treat as source.
      if (e.type === "powersupply" && (e.properties as any)?.isOn === false) {
        continue;
      }
      result.push(e);
    } else if ((e.type === "microbit" || e.type === "microbitWithBreakout") && nodeMap) {
      // Only add the main microbit source if both 3.3V and GND are connected
      const posIds = e.nodes?.filter((n) => n.placeholder === "3.3V").map((n) => n.id) ?? [];
      const negIds = e.nodes?.filter((n) => n.placeholder && n.placeholder.toUpperCase().startsWith("GND")).map((n) => n.id) ?? [];

      const hasConnectedPos = posIds.some((id) => nodeMap.has(id));
      const hasConnectedNeg = negIds.some((id) => nodeMap.has(id));

      if (hasConnectedPos && hasConnectedNeg) {
        result.push(e);
      }
    }
  }

  for (const e of elements) {
    if (e.type === "microbit" || e.type === "microbitWithBreakout") {
      const pins =
        (e.controller?.pins as Record<string, { digital?: number }>) ?? {};

      for (const node of e.nodes ?? []) {
        const pinName = node.placeholder;
        if (pinName && pinName.startsWith("P")) {
          const pinState = pins[pinName];
          if (pinState?.digital === 1 && nodeMap && nodeMap.has(node.id)) {
            // create a shallow copy with unique id per-pin
            result.push({ ...e, id: `${e.id}-${pinName}` });
          }
        }
      }
    }
  }

  return result;
}

function mapCurrentSourceIndices(elements: CircuitElement[]) {
  const map = new Map<string, number>();
  elements.forEach((el, i) => {
    if (el && el.id) map.set(el.id, i);
  });
  return map;
}

/* ------------------------- MNA assembly (stamping) ------------------------- */

function buildMNAMatrices(
  elements: CircuitElement[],
  elementsWithCurrent: CircuitElement[],
  nodeMap: Map<string, string>,
  nodeIndex: Map<string, number>,
  currentMap: Map<string, number>,
  ledOnMap?: Map<string, boolean>,
  currentLimitedIds?: Set<string>,
  ignoreExplodedLeds?: boolean,
  rgbLedOnMap?: Map<string, boolean>
) {
  const n = nodeIndex.size; // number of non-ground nodes
  const m = currentMap.size; // number of current sources / voltage sources
  const externallyPowered = elements.some(
    (el) =>
      el.type === "battery" ||
      el.type === "cell3v" ||
      el.type === "AA_battery" ||
      el.type === "AAA_battery" ||
      el.type === "powersupply" ||
      el.type === "microbit" ||
      el.type === "microbitWithBreakout"
  );
  const allowOhmmeterDrive = !externallyPowered;

  const zeroRow = (len: number) => Array.from({ length: len }, () => 0);
  const G = Array.from({ length: n }, () => zeroRow(n));
  const B = Array.from({ length: n }, () => zeroRow(m));
  const C = Array.from({ length: m }, () => zeroRow(n));
  const D = Array.from({ length: m }, () => zeroRow(m));
  const I = Array(n).fill(0);
  const E = Array(m).fill(0);

  const LEAKAGE_CONDUCTANCE = 1e-12;
  for (let i = 0; i < n; i++) {
    G[i][i] += LEAKAGE_CONDUCTANCE;
  }

  const safeNodeIndex = (nodeId?: string) => {
    if (!nodeId) return undefined;
    const mapped = nodeMap.get(nodeId);
    if (!mapped) return undefined;
    return nodeIndex.get(mapped);
  };

  const safeCurrentIndex = (id?: string) => {
    if (!id) return undefined;
    return currentMap.get(id);
  };

  for (const el of elements) {
    if (!Array.isArray(el.nodes) || el.nodes.length < 1) continue;

    // For two-terminal stamp usage, we try to read the first two nodes safely
    const node0 = el.nodes[0]?.id;
    const node1 = el.nodes[1]?.id;

    const ai = safeNodeIndex(node0);
    const bi = safeNodeIndex(node1);

    if (
      el.type === "resistor" ||
      el.type === "ldr" ||
      el.type === "lightbulb" ||
      el.type === "pushbutton"
    ) {
    let R: number;

    if (el.type === "ldr") {
      const lightLevel = el.properties?.lightLevel ?? 50;
      R = lightLevelToResistance(lightLevel);
    } else if (el.type === "lightbulb") {
      R = 48;
    } else {
      R = el.properties?.resistance ?? 1;
    }

    const g = 1 / R;

      if (ai !== undefined) G[ai][ai] += g;
      if (bi !== undefined) G[bi][bi] += g;
      if (ai !== undefined && bi !== undefined) {
        G[ai][bi] -= g;
        G[bi][ai] -= g;
      }
    } else if (el.type === "led") {
      // LED is directional: only conduct when forward-biased beyond threshold.
      // Model as a voltage source (forward voltage) in series with a resistor
      const exploded = (el.runtime as any)?.led?.exploded;
      if (exploded && !ignoreExplodedLeds) {
        continue; // blown LED becomes an open circuit
      }
      const isOn = ledOnMap?.get(el.id) ?? false;
      if (isOn) {
        const R = getLedSeriesResistance(el.properties?.color);
        const Vf = getLedForwardVoltage(el.properties?.color);
        const g = 1 / R;
        
        // Stamp resistive part
        if (ai !== undefined) G[ai][ai] += g;
        if (bi !== undefined) G[bi][bi] += g;
        if (ai !== undefined && bi !== undefined) {
          G[ai][bi] -= g;
          G[bi][ai] -= g;
        }
        
        // Stamp the forward drop using a Norton equivalent.
        // Branch equation: i = (Va - Vc - Vf) / R = g*(Va - Vc) - g*Vf
        // Equivalent to a resistor between (anode,cathode) plus a current source of Is = g*Vf from cathode -> anode.
        // In the nodal RHS (current injections into node): anode gets +Is, cathode gets -Is.
        const Is = Vf * g;
        if (bi !== undefined) I[bi] += Is; // anode
        if (ai !== undefined) I[ai] -= Is; // cathode
      } else {
        // Off: open circuit (no stamp)
      }
    } else if (el.type === "rgbled") {
      // RGB LED has 3 independent LED channels: Red, Green, Blue
      // Nodes: [red, common, green, blue]
      // For common-cathode: common is cathode (negative), colors are anodes (positive)
      // For common-anode: common is anode (positive), colors are cathodes (negative)
      const rgbLedType = (el.properties as any)?.rgbLedType ?? "common-cathode";
      const runtime = el.runtime as any;
      
      const redNodeId = el.nodes?.[0]?.id;
      const commonNodeId = el.nodes?.[1]?.id;
      const greenNodeId = el.nodes?.[2]?.id;
      const blueNodeId = el.nodes?.[3]?.id;
      
      const redIdx = safeNodeIndex(redNodeId);
      const commonIdx = safeNodeIndex(commonNodeId);
      const greenIdx = safeNodeIndex(greenNodeId);
      const blueIdx = safeNodeIndex(blueNodeId);
      
      const channels: Array<{ channel: "red" | "green" | "blue"; colorIdx: number | undefined }> = [
        { channel: "red", colorIdx: redIdx },
        { channel: "green", colorIdx: greenIdx },
        { channel: "blue", colorIdx: blueIdx },
      ];
      
      for (const { channel, colorIdx } of channels) {
        const channelKey = `${el.id}-${channel}`;
        const isExploded = runtime?.[channel]?.exploded;
        
        if (isExploded && !ignoreExplodedLeds) {
          continue; // blown channel becomes an open circuit
        }
        
        const isOn = rgbLedOnMap?.get(channelKey) ?? false;
        if (!isOn) continue; // Off: open circuit
        
        const R = getRgbLedSeriesResistance(channel);
        const Vf = getRgbLedForwardVoltage(channel);
        const g = 1 / R;
        
        // Determine which node is anode and which is cathode based on LED type
        let anodeIdx: number | undefined;
        let cathodeIdx: number | undefined;
        
        if (rgbLedType === "common-cathode") {
          // Color is anode, common is cathode
          anodeIdx = colorIdx;
          cathodeIdx = commonIdx;
        } else {
          // Color is cathode, common is anode
          anodeIdx = commonIdx;
          cathodeIdx = colorIdx;
        }
        
        // Stamp resistive part between anode and cathode
        if (anodeIdx !== undefined) G[anodeIdx][anodeIdx] += g;
        if (cathodeIdx !== undefined) G[cathodeIdx][cathodeIdx] += g;
        if (anodeIdx !== undefined && cathodeIdx !== undefined) {
          G[anodeIdx][cathodeIdx] -= g;
          G[cathodeIdx][anodeIdx] -= g;
        }
        
        // Stamp the forward drop using Norton equivalent
        const Is = Vf * g;
        if (anodeIdx !== undefined) I[anodeIdx] += Is;
        if (cathodeIdx !== undefined) I[cathodeIdx] -= Is;
      }
    } else if (el.type === "potentiometer") {
      // Potentiometer: 3 terminals - A (Terminal 1), W (Wiper), B (Terminal 2)
      // Tinkercad convention: ratio expresses the fraction of the total resistance
      // between Wiper and Terminal 2 (B).
      // - ratio = 0 (dial left): Wiper on Terminal 2 -> Ra = R, Rb = 0
      // - ratio = 1 (dial right): Wiper on Terminal 1 -> Ra = 0, Rb = R
      const [nodeA, nodeW, nodeB] = el.nodes;
      const aMapped = nodeMap.get(nodeA?.id ?? "");
      const wMapped = nodeMap.get(nodeW?.id ?? "");
      const bMapped = nodeMap.get(nodeB?.id ?? "");
      
      // Get matrix indices (undefined for ground node or unconnected terminals)
      const ai2 = aMapped ? nodeIndex.get(aMapped) : undefined;
      const wi = wMapped ? nodeIndex.get(wMapped) : undefined;
      const bi2 = bMapped ? nodeIndex.get(bMapped) : undefined;
      
      // Check which terminals are in the circuit (have a mapped equivalence class)
      const inCircuitA = !!aMapped;
      const inCircuitW = !!wMapped;
      const inCircuitB = !!bMapped;

      const R = el.properties?.resistance ?? 10000; // Default 10kΩ
      // Clamp ratio to [0, 1] and snap the endpoints so the user can hit true 0Ω/10kΩ
      const tRaw = Math.max(0, Math.min(1, el.properties?.ratio ?? 0.5));
      const t = tRaw <= 1e-4 ? 0 : tRaw >= 1 - 1e-4 ? 1 : tRaw;
      const R_SHORT = 1e-4; // 0.1 mΩ pseudo-short for numerical stability
      // Tinkercad: ratio is the portion from Wiper to Terminal 2 (B)
      const Ra = Math.max(R_SHORT, R * (1 - t));    // T1 to Wiper: decreases as ratio -> 1
      const Rb = Math.max(R_SHORT, R * t);          // Wiper to T2: increases as ratio -> 1
      const ga = 1 / Ra;
      const gb = 1 / Rb;

      // Helper to stamp conductance between two nodes (handles ground correctly)
      // When one node is ground (undefined index), only stamp diagonal for the non-ground node
      const stampConductance = (idx1: number | undefined, idx2: number | undefined, g: number) => {
        if (idx1 !== undefined) G[idx1][idx1] += g;
        if (idx2 !== undefined) G[idx2][idx2] += g;
        if (idx1 !== undefined && idx2 !== undefined) {
          G[idx1][idx2] -= g;
          G[idx2][idx1] -= g;
        }
      };

      // Always stamp all three resistor segments if the terminals are in the circuit
      // This ensures the full resistor network is present regardless of wiper position
      if (inCircuitA && inCircuitW) {
        stampConductance(ai2, wi, ga);  // Resistance from A to W
      }
      if (inCircuitW && inCircuitB) {
        stampConductance(wi, bi2, gb);  // Resistance from W to B
      }
      if (inCircuitA && inCircuitB && !inCircuitW) {
        // Special case: A and B connected but W floating - act as full resistance
        const g = R > 0 ? 1 / R : 1e12;
        stampConductance(ai2, bi2, g);
      }
    } else if (el.type === "microbit" || el.type === "microbitWithBreakout" || el.type === "battery" || el.type === "cell3v" || el.type === "AA_battery" || el.type === "AAA_battery" || el.type === "powersupply") {
      // Skip battery/supply/microbit stamping in the main elements loop
      // They will be stamped in the elementsWithCurrent loop below
      continue;
    } else if (el.type === "multimeter") {
      const mode = el.properties?.mode;
      if (mode === "voltage") {
        // Stamp a very large resistor across probes to model input impedance
        const R = VOLTMETER_R;
        const g = 1 / R;
        if (ai !== undefined) G[ai][ai] += g;
        if (bi !== undefined) G[bi][bi] += g;
        if (ai !== undefined && bi !== undefined) {
          G[ai][bi] -= g;
          G[bi][ai] -= g;
        }
      } else if (mode === "current") {
        // Stamp a very small shunt resistor; current is V/Rshunt
        const R = AMMETER_R;
        const g = 1 / R;
        if (ai !== undefined) G[ai][ai] += g;
        if (bi !== undefined) G[bi][bi] += g;
        if (ai !== undefined && bi !== undefined) {
          G[ai][bi] -= g;
          G[bi][ai] -= g;
        }
      } else if (mode === "resistance") {
        if (!allowOhmmeterDrive) {
          continue; // Do not drive a powered circuit in resistance mode
        }
        // Inject a small test current (DMM ohms mode) from probe 0 to probe 1
        if (ai !== undefined) I[ai] -= OHMMETER_ITEST;
        if (bi !== undefined) I[bi] += OHMMETER_ITEST;
      }
    }
  }

  // Stamp current sources (batteries, power supplies, microbits, and active pins)
  for (const el of elementsWithCurrent) {
    if (el.type === "battery" || el.type === "cell3v" || el.type === "AA_battery" || el.type === "AAA_battery" || el.type === "powersupply") {
      // Battery/power supply stamping (same as before, but now in separate loop)
      const pos =
        el.nodes.find((n) => n.polarity === "positive")?.id ?? el.nodes[1]?.id;
      const neg =
        el.nodes.find((n) => n.polarity === "negative")?.id ?? el.nodes[0]?.id;
      const pIdx = safeNodeIndex(pos);
      const nIdx = safeNodeIndex(neg);
      const idx = safeCurrentIndex(el.id);
      if (idx === undefined) continue;

      const psIsOn = (el.properties as any)?.isOn;
      if (el.type === "powersupply" && psIsOn === false) {
        continue;
      }

      if (pIdx !== undefined) B[pIdx][idx] -= 1;
      if (nIdx !== undefined) B[nIdx][idx] += 1;
      if (pIdx !== undefined) C[idx][pIdx] += 1;
      if (nIdx !== undefined) C[idx][nIdx] -= 1;
      
      if (el.type === "powersupply" && currentLimitedIds?.has(el.id)) {
        // Current-limited mode
        if (pIdx !== undefined) B[pIdx][idx] += 1;
        if (nIdx !== undefined) B[nIdx][idx] -= 1;
        if (pIdx !== undefined) C[idx][pIdx] -= 1;
        if (nIdx !== undefined) C[idx][nIdx] += 1;
        for (let k = 0; k < D.length; k++) {
          D[k][idx] = 0;
          D[idx][k] = 0;
        }
        D[idx][idx] = 0;
        E[idx] = 0;
        const iLimit = (el.properties as any)?.iLimit ?? 1;
        if (pIdx !== undefined) I[pIdx] += iLimit;
        if (nIdx !== undefined) I[nIdx] -= iLimit;
      } else {
        // Voltage source mode
        D[idx][idx] += el.properties?.resistance ?? 0;
        E[idx] = el.properties?.voltage ?? (el.type === "cell3v" ? 3 : el.type === "AA_battery" || el.type === "AAA_battery" ? 1.5 : 1.5);
      }
    } else if (el.type === "microbit" || el.type === "microbitWithBreakout") {
      // Check if this is a per-pin source entry (id format: "microbit-X-PY")
      const isPinSource = el.id.includes("-P");
      
      
      if (isPinSource) {
        // This is a pin source entry created by getElementsWithCurrent
        const pinName = el.id.split("-").pop(); // Extract pin name like "P2"
        if (!pinName || !pinName.startsWith("P")) continue;
        
        // Find the GND node from the original microbit element
        const negIds = el.nodes.filter((n) => 
          n.placeholder && n.placeholder.toUpperCase().startsWith("GND")
        ).map((n) => n.id);
        
        const neg = negIds.find((id) => nodeMap.has(id)) ?? negIds[0];
        const gndIdx = safeNodeIndex(neg);
        
        // Find the pin node
        const pinNode = el.nodes.find((n) => n.placeholder === pinName);
        if (!pinNode || !nodeMap.has(pinNode.id)) {
          // if (DEBUG) console.log(`Pin node ${pinName} not found or not connected`);
          continue;
        }
        
        const pinIdx = safeNodeIndex(pinNode.id);
        const pinCurrentIdx = safeCurrentIndex(el.id);
        
        if (pinIdx !== undefined && pinCurrentIdx !== undefined) {
          // Stamp a voltage source between pin and GND to provide 3.3V
          // GND is the reference (ground) node, so it may not have an index
          B[pinIdx][pinCurrentIdx] -= 1;
          if (gndIdx !== undefined) B[gndIdx][pinCurrentIdx] += 1;
          C[pinCurrentIdx][pinIdx] += 1;
          if (gndIdx !== undefined) C[pinCurrentIdx][gndIdx] -= 1;
          D[pinCurrentIdx][pinCurrentIdx] += el.properties?.resistance ?? 0;
          E[pinCurrentIdx] = el.properties?.voltage ?? 3.3;
        }
      } else {
        // This is the main microbit source entry
        const posIds = el.nodes.filter((n) => n.placeholder === "3.3V").map((n) => n.id);
        const negIds = el.nodes.filter((n) => 
          n.placeholder && n.placeholder.toUpperCase().startsWith("GND")
        ).map((n) => n.id);

        if (posIds.length === 0 || negIds.length === 0) continue;

        const firstConnected = (ids: string[]) => ids.find((id) => nodeMap.has(id)) ?? ids[0];
        const pos = firstConnected(posIds);
        const neg = firstConnected(negIds);

        const pIdx = safeNodeIndex(pos);
        const nIdx = safeNodeIndex(neg);
        const idx = safeCurrentIndex(el.id);
        if (idx === undefined) continue;

        if (pIdx !== undefined) B[pIdx][idx] -= 1;
        if (nIdx !== undefined) B[nIdx][idx] += 1;
        if (pIdx !== undefined) C[idx][pIdx] += 1;
        if (nIdx !== undefined) C[idx][nIdx] -= 1;
        D[idx][idx] += el.properties?.resistance ?? 0;
        E[idx] = el.properties?.voltage ?? 3.3;
      }
    }
  }

  return { G, B, C, D, I, E };
}

function buildFullSystem(
  G: number[][],
  B: number[][],
  C: number[][],
  D: number[][],
  I: number[],
  E: number[]
) {
  const n = G.length;
  const m = D.length;

  const A = Array.from({ length: n + m }, () => Array(n + m).fill(0));
  const z = Array(n + m).fill(0);

  for (let i = 0; i < n; i++) {
    for (let j = 0; j < n; j++) A[i][j] = G[i][j] ?? 0;
    for (let j = 0; j < m; j++) A[i][n + j] = B[i][j] ?? 0;
    z[i] = I[i] ?? 0;
  }

  for (let i = 0; i < m; i++) {
    for (let j = 0; j < n; j++) A[n + i][j] = C[i][j] ?? 0;
    for (let j = 0; j < m; j++) A[n + i][n + j] = D[i][j] ?? 0;
    z[n + i] = E[i] ?? 0;
  }

  return { A, z };
}

function getNodeVoltages(x: number[], ids: string[], groundId: string) {
  const result: Record<string, number> = { [groundId]: 0 };
  ids.forEach((id, i) => (result[id] = x[i] ?? 0));
  return result;
}

function computeElementResults(
  elements: CircuitElement[],
  nodeVoltages: Record<string, number>,
  x: number[],
  nodeMap: Map<string, string>,
  currentMap: Map<string, number>,
  n: number,
  currentLimitedIds?: Set<string>,
  ignoreExplodedLedsForResults?: boolean,
  intactLedCurrentById?: Map<string, number>,
  microbitShortMap?: Map<string, boolean>
): CircuitElement[] {
  // Detect if subcircuit is externally powered (battery or microbit present)
  const externallyPowered = elements.some(
    (e) => e.type === "battery" || e.type === "cell3v" || e.type === "AA_battery" || e.type === "AAA_battery" || e.type === "powersupply" || e.type === "microbit" || e.type === "microbitWithBreakout"
  );

  return elements.map((el) => {
    const isMicrobit = el.type === "microbit" || el.type === "microbitWithBreakout";
    const shorted = isMicrobit ? microbitShortMap?.get(el.id) ?? false : false;
    const a = nodeMap.get(el.nodes?.[0]?.id ?? "");
    const b = nodeMap.get(el.nodes?.[1]?.id ?? "");
    const Va = a ? nodeVoltages[a] ?? 0 : 0;
    const Vb = b ? nodeVoltages[b] ?? 0 : 0;
    let voltage = Va - Vb;
    let current = 0,
      power = 0,
      measurement = 0;
    let forwardVoltage: number | undefined;
    let rgbLedChannels: { red: any; green: any; blue: any } | undefined;
    let reverseVoltage: number | undefined;

    if (["resistor", "lightbulb", "pushbutton", "ldr"].includes(el.type)) {
      let R: number;
      if (el.type === "ldr") {
        const lightLevel = el.properties?.lightLevel ?? 50;
        R = lightLevelToResistance(lightLevel);
      } else {
        R = el.properties?.resistance ?? 1;
      }
      current = voltage / R;
      power = voltage * current;
    } else if (el.type === "slideswitch") {
      current = 0;
      voltage = 0;
      power = 0;
    } else if (el.type === "led") {
      // Respect polarity: forward conduction only (anode is node[1], cathode is node[0] per createElement)
      const anodeId = nodeMap.get(el.nodes?.[1]?.id ?? "");
      const cathodeId = nodeMap.get(el.nodes?.[0]?.id ?? "");
      const VaNode = anodeId ? nodeVoltages[anodeId] ?? 0 : 0;
      const VcNode = cathodeId ? nodeVoltages[cathodeId] ?? 0 : 0;
      const forward = VaNode - VcNode;
      forwardVoltage = forward;
      reverseVoltage = forward < 0 ? -forward : 0;
      voltage = forward; // expose forward drop for UI and runtime models

      const exploded = (el.runtime as any)?.led?.exploded;
      const Vf = getLedForwardVoltage(el.properties?.color);
      if ((!exploded || ignoreExplodedLedsForResults) && forward >= Vf) {
        // Use the same model as stamping: i = (Vfwd - Vf) / R
        // Do NOT use properties.resistance here; that is a UI knob today and defaults to 1Ω.
        const R = getLedSeriesResistance(el.properties?.color);
        current = Math.max(0, (forward - Vf) / (R || 1e-12));
        power = voltage * current;
      } else {
        current = 0;
        power = 0;
      }
    } else if (el.type === "rgbled") {
      // RGB LED has 3 channels, compute results for each channel
      // Nodes: [red, common, green, blue]
      const rgbLedType = (el.properties as any)?.rgbLedType ?? "common-cathode";
      const runtime = el.runtime as any;
      
      const redNodeId = nodeMap.get(el.nodes?.[0]?.id ?? "");
      const commonNodeId = nodeMap.get(el.nodes?.[1]?.id ?? "");
      const greenNodeId = nodeMap.get(el.nodes?.[2]?.id ?? "");
      const blueNodeId = nodeMap.get(el.nodes?.[3]?.id ?? "");
      
      const Vred = redNodeId ? nodeVoltages[redNodeId] ?? 0 : 0;
      const Vcommon = commonNodeId ? nodeVoltages[commonNodeId] ?? 0 : 0;
      const Vgreen = greenNodeId ? nodeVoltages[greenNodeId] ?? 0 : 0;
      const Vblue = blueNodeId ? nodeVoltages[blueNodeId] ?? 0 : 0;
      
      const computeChannel = (channel: "red" | "green" | "blue", colorVoltage: number) => {
        const isExploded = runtime?.[channel]?.exploded;
        const Vf = getRgbLedForwardVoltage(channel);
        const R = getRgbLedSeriesResistance(channel);
        
        let forward: number;
        if (rgbLedType === "common-cathode") {
          forward = colorVoltage - Vcommon;
        } else {
          forward = Vcommon - colorVoltage;
        }
        
        const channelForwardVoltage = forward;
        const channelReverseVoltage = forward < 0 ? -forward : 0;
        
        let channelCurrent = 0;
        let channelPower = 0;
        
        if ((!isExploded || ignoreExplodedLedsForResults) && forward >= Vf) {
          channelCurrent = Math.max(0, (forward - Vf) / (R || 1e-12));
          channelPower = forward * channelCurrent;
        }
        
        return {
          forwardVoltage: channelForwardVoltage,
          reverseVoltage: channelReverseVoltage,
          current: channelCurrent,
          power: channelPower,
        };
      };
      
      const redResult = computeChannel("red", Vred);
      const greenResult = computeChannel("green", Vgreen);
      const blueResult = computeChannel("blue", Vblue);
      
      // Store RGB LED channel results for inclusion in final computed result
      rgbLedChannels = {
        red: redResult,
        green: greenResult,
        blue: blueResult,
      };
      
      // Use overall values for compatibility
      voltage = Math.max(redResult.forwardVoltage, greenResult.forwardVoltage, blueResult.forwardVoltage);
      current = redResult.current + greenResult.current + blueResult.current;
      power = redResult.power + greenResult.power + blueResult.power;
    } else if (el.type === "potentiometer") {
      // Potentiometer result computation
      // Tinkercad convention: ratio is fraction from Wiper to Terminal 2 (B)
      const [nodeA, nodeW, nodeB] = el.nodes;
      const aMapped = nodeMap.get(nodeA?.id ?? "");
      const wMapped = nodeMap.get(nodeW?.id ?? "");
      const bMapped = nodeMap.get(nodeB?.id ?? "");

      // Get voltages from solved node voltages (0 for unconnected/ground nodes)
      const Va2 = aMapped ? nodeVoltages[aMapped] ?? 0 : 0;
      const Vw = wMapped ? nodeVoltages[wMapped] ?? 0 : 0;
      const Vb2 = bMapped ? nodeVoltages[bMapped] ?? 0 : 0;

      const R = el.properties?.resistance ?? 10000;
      const tRaw = Math.max(0, Math.min(1, el.properties?.ratio ?? 0.5));
      const t = tRaw <= 1e-4 ? 0 : tRaw >= 1 - 1e-4 ? 1 : tRaw;
      const R_SHORT = 1e-4;
      const Ra = Math.max(R_SHORT, R * (1 - t));    // T1 to Wiper
      const Rb = Math.max(R_SHORT, R * t);          // Wiper to T2

      // Compute current through each segment based on voltage drops
      // Avoid division by zero when resistance is 0 (short circuit)
      const Ia = (Va2 - Vw) / Ra;  // Current from A to W
      const Ib = (Vw - Vb2) / Rb;  // Current from W to B
      
      // Report the dominant current and overall voltage
      const totalVoltage = Va2 - Vb2;
      const totalCurrent = Math.max(Math.abs(Ia), Math.abs(Ib));
      current = totalCurrent;
      voltage = totalVoltage;
      power = Math.abs(totalVoltage * totalCurrent);
    } else if (el.type === "battery" || el.type === "cell3v" || el.type === "AA_battery" || el.type === "AAA_battery" || el.type === "powersupply" || el.type === "microbit" || el.type === "microbitWithBreakout") {
      const isPsOff = el.type === "powersupply" && (el.properties as any)?.isOn === false;
      if (isPsOff) {
        // Hard zero when supply is OFF regardless of passive node potentials
        voltage = 0;
        current = 0;
        power = 0;
      } else {
        const limited = el.type === "powersupply" && currentLimitedIds?.has(el.id);
        if (limited) {
          current = (el.properties as any)?.iLimit ?? 1;
          power = voltage * current;
        } else {
          const idx = currentMap.get(el.id);
            if (idx !== undefined) current = x[n + idx] ?? 0;
          power = voltage * current;
        }
      }
    } else if (el.type === "multimeter") {
      const mode = el.properties?.mode;
      if (mode === "voltage") {
        // Read differential voltage; high input impedance is stamped in G
        measurement = voltage;
        power = 0; // assume negligible draw
      } else if (mode === "current") {
        // Current is the shunt current V/Rshunt
        measurement = voltage / AMMETER_R;
        current = measurement;
        power = (measurement * measurement) * AMMETER_R; // power dissipated in shunt
      } else if (mode === "resistance") {
        if (externallyPowered) {
          // Powered circuit: real meters refuse measurement
          measurement = Number.NaN; // UI will render as "Error"
        } else {
          // Equivalent resistance: R = |V| / Itest
          const vdrop = Math.abs(voltage);
          const testCurrent = OHMMETER_ITEST;
          if (testCurrent > 0) {
            measurement = vdrop / testCurrent;
            if (!isFinite(measurement) || measurement > OHMMETER_OPEN_THRESHOLD) {
              measurement = Number.POSITIVE_INFINITY; // open circuit / floating
            }
          } else {
            measurement = Number.POSITIVE_INFINITY;
          }
        }
        power = 0;
      }
    }

    const supplyMode = el.type === "powersupply"
      ? ((el.type === "powersupply" && (el.properties as any)?.isOn === false)
          ? "OFF"
          : currentLimitedIds?.has(el.id) ? "CC" : "VC")
      : undefined;

    const computedResult: any = {
      voltage,
      current,
      power,
      measurement,
      supplyMode,
      ...(el.type === "led" && (el.runtime as any)?.led?.exploded && intactLedCurrentById
        ? { explosionCurrentEstimate: intactLedCurrentById.get(el.id) ?? 0 }
        : {}),
      ...(rgbLedChannels ? rgbLedChannels : {}),
    };

    if (isMicrobit) {
      computedResult.shorted = shorted;
    }

    return {
      ...el,
      computed: computedResult,
    } as any;
  });
}

/* ------------------------- Improved linear solver ------------------------- */
/**
 * Solve linear system using Gaussian elimination with scaled partial pivoting.
 * Returns solution vector x or null if no unique solution.
 */
function solveLinearSystem(A: number[][], z: number[]): number[] | null {
  const n = A.length;
  if (n === 0) return [];

  // Build augmented matrix M = [A | z]
  const M = A.map((row, i) => [
    ...row.map((v) => (isFinite(v) ? v : 0)),
    z[i] ?? 0,
  ]);

  // scaling factors (max abs value per row) to do scaled partial pivoting
  const scale = Array(n).fill(0);
  for (let i = 0; i < n; i++) {
    let max = 0;
    for (let j = 0; j < n; j++) max = Math.max(max, Math.abs(M[i][j]));
    scale[i] = max === 0 ? 1 : max;
  }

  for (let k = 0; k < n; k++) {
    // find pivot row using scaled partial pivoting
    let pivotRow = k;
    let maxRatio = 0;
    for (let i = k; i < n; i++) {
      const ratio = Math.abs(M[i][k]) / scale[i];
      if (ratio > maxRatio) {
        maxRatio = ratio;
        pivotRow = i;
      }
    }

    if (pivotRow !== k) {
      [M[k], M[pivotRow]] = [M[pivotRow], M[k]];
      [scale[k], scale[pivotRow]] = [scale[pivotRow], scale[k]];
    }

    const pivot = M[k][k];
    if (Math.abs(pivot) < 1e-14) {
      // singular or nearly singular
      if (DEBUG)
        console.warn("Matrix singular or ill-conditioned at pivot", k, pivot);
      return null;
    }

    // elimination
    for (let i = k + 1; i < n; i++) {
      const f = M[i][k] / pivot;
      for (let j = k; j <= n; j++) M[i][j] -= f * M[k][j];
    }
  }

  // back substitution
  const x = Array(n).fill(0);
  for (let i = n - 1; i >= 0; i--) {
    let s = M[i][n];
    for (let j = i + 1; j < n; j++) s -= M[i][j] * x[j];
    const diag = M[i][i];
    if (Math.abs(diag) < 1e-14) {
      if (DEBUG) console.warn("Zero diagonal during back substitution", i);
      return null;
    }
    x[i] = s / diag;
  }

  return x;
}

// Helper: rebuild & solve with identified current-limited supplies
function reSolveWithCurrentLimitedSupplies(
  elements: CircuitElement[],
  nodeMap: Map<string, string>,
  nodeIndex: Map<string, number>,
  limitedIds: Set<string>
) {
  // Re-identify sources excluding limited supplies (they won't be voltage sources now)
  const baseSources = getElementsWithCurrent(elements, nodeMap);
  const filteredSources = baseSources.filter(
    (e) => !(e.type === "powersupply" && limitedIds.has(e.id))
  );
  const currentMap = mapCurrentSourceIndices(filteredSources);
  const { G, B, C, D, I, E } = buildMNAMatrices(
    elements,
    filteredSources,
    nodeMap,
    nodeIndex,
    currentMap,
    undefined,
    limitedIds
  );
  const { A, z } = buildFullSystem(G, B, C, D, I, E);
  const x = solveLinearSystem(A, z) || [];
  // Node voltages reconstruction
  const nonGroundIds: string[] = [];
  nodeIndex.forEach((_v, k) => nonGroundIds.push(k));
  const groundId = Array.from(new Set(nodeMap.values())).find((id) => id.includes("GND")) || nonGroundIds[0];
  const nodeVoltages = getNodeVoltages(x, nonGroundIds, groundId);
  return { results: { nodeVoltages, x, currentMap } };
}

/* ------------------------- Utilities for debug / small tests ------------------------- */

function matrixToString(M: number[][]) {
  return M.map((r) => r.map((v) => Number(v.toFixed(6))).join("\t")).join("\n");
}

/* ------------------------- Simple example test (console) ------------------------- */

/**
 * Example quick test you can run in a Node environment or browser console.
 * Creates: Battery (3V) connected to Node1 and GND, Resistor (3Ω) between Node1 and GND
 */
export function _quickTestRun() {
  const nodeG = { id: "GND" } as any;
  const node1 = { id: "N1" } as any;

  const battery: CircuitElement = {
    id: "bat1",
    type: "battery",
    nodes: [{ id: node1.id }, { id: nodeG.id }],
    properties: { voltage: 3, resistance: 0.01 },
  } as any;

  const resistor: CircuitElement = {
    id: "r1",
    type: "resistor",
    nodes: [{ id: node1.id }, { id: nodeG.id }],
    properties: { resistance: 3 },
  } as any;

  const elements = [battery, resistor];
  const wires: Wire[] = []; // no separate wires

  
  const res = solveCircuit(elements, wires);
  
}
