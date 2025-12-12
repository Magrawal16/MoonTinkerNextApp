import { CircuitElement, Wire } from "../types/circuit";
const DEBUG = false;

// Multimeter modeling constants
// High input impedance for voltmeter (~10 MΩ)
const VOLTMETER_R = 10_000_000; // ohms
// Low shunt resistance for ammeter (~50 mΩ)
const AMMETER_R = 0.05; // ohms
// Ohmmeter applies a small known test voltage and measures current
const OHMMETER_VTEST = 1; // volt

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

/* ------------------------- Helper & improved solver code ------------------------- */

function solveSingleSubcircuit(
  elements: CircuitElement[],
  wires: Wire[]
): CircuitElement[] {
  const nodeEquivalenceMap = findEquivalenceClasses(elements, wires);
  const effectiveNodeIds = getEffectiveNodeIds(nodeEquivalenceMap);
  if (effectiveNodeIds.size === 0) {
    return zeroOutComputed(elements);
  }

  const { groundId, nonGroundIds, nodeIndex } =
    getNodeMappings(effectiveNodeIds);

  const n = nonGroundIds.length;

  // Determine which elements act as independent sources for this subcircuit
  // Base set includes batteries, microbits, and multimeters in resistance mode
  const baseSources = getElementsWithCurrent(elements, nodeEquivalenceMap);
  const hasExternalSources = baseSources.some(
    (e) => e.type !== "multimeter" || e.properties?.mode !== "resistance"
  );

  // If any external source exists, exclude ohmmeters from acting as sources
  const elementsWithCurrent = hasExternalSources
    ? baseSources.filter(
        (e) => !(e.type === "multimeter" && e.properties?.mode === "resistance")
      )
    : baseSources;

  const currentSourceIndexMap = mapCurrentSourceIndices(elementsWithCurrent);

  // LED polarity handling: iterate stamping with LED on/off states until stable
  const ledIds = new Set(
    elements.filter((e) => e.type === "led").map((e) => e.id)
  );
  let ledOnMap = new Map<string, boolean>(); // default: all off
  let nodeVoltages: Record<string, number> = {};
  let x: number[] | null = null;

  const MAX_ITERS = 8;
  for (let iter = 0; iter < MAX_ITERS; iter++) {
    const { G, B, C, D, I, E } = buildMNAMatrices(
      elements,
      nodeEquivalenceMap,
      nodeIndex,
      currentSourceIndexMap,
      ledOnMap
    );


    const { A, z } = buildFullSystem(G, B, C, D, I, E);

    x = solveLinearSystem(A, z);
    if (!x) {
      return zeroOutComputed(elements);
    }

    nodeVoltages = getNodeVoltages(x, nonGroundIds, groundId);

    // Re-evaluate LED forward bias and update on/off map
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
      const forward = Va - Vc; // anode minus cathode
      const isOn = forward >= Vf; // forward-biased beyond threshold
      if ((ledOnMap.get(el.id) ?? false) !== isOn) {
        nextMap.set(el.id, isOn);
        changed = true;
      }
    }
    ledOnMap = nextMap;
    if (!changed) break; // converged
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
    limitedIds
  );

  return results;
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

function findEquivalenceClasses(elements: CircuitElement[], wires: Wire[]) {
  const parent = new Map<string, string>();
  const allNodeIds = new Set<string>();

  wires.forEach((w) => {
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
      e.nodes.forEach((n) => {
        if (!n || !n.id) return;
        parent.set(n.id, n.id);
        allNodeIds.add(n.id);
      });
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

  for (const wire of wires) {
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
    computed: { current: 0, voltage: 0, power: 0, measurement: 0 },
  }));
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
          e.nodes.length === 2) ||
        e.type === "microbit" ||
        e.type === "microbitWithBreakout" ||
        (e.type === "multimeter" && e.properties?.mode === "resistance")
      ) {
      // If it's a power supply explicitly switched OFF, do not treat as source.
      if (e.type === "powersupply" && (e.properties as any)?.isOn === false) {
        continue;
      }
      result.push(e);
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
  nodeMap: Map<string, string>,
  nodeIndex: Map<string, number>,
  currentMap: Map<string, number>,
  ledOnMap?: Map<string, boolean>,
  currentLimitedIds?: Set<string>
) {
  const n = nodeIndex.size; // number of non-ground nodes
  const m = currentMap.size; // number of current sources / voltage sources

  const zeroRow = (len: number) => Array.from({ length: len }, () => 0);
  const G = Array.from({ length: n }, () => zeroRow(n));
  const B = Array.from({ length: n }, () => zeroRow(m));
  const C = Array.from({ length: m }, () => zeroRow(n));
  const D = Array.from({ length: m }, () => zeroRow(m));
  const I = Array(n).fill(0);
  const E = Array(m).fill(0);

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
      el.type === "lightbulb"
    ) {
      const R = el.type === "lightbulb" ? 48 : (el.properties?.resistance ?? 1);
      const g = 1 / R;
      if (ai !== undefined) G[ai][ai] += g;
      if (bi !== undefined) G[bi][bi] += g;
      if (ai !== undefined && bi !== undefined) {
        G[ai][bi] -= g;
        G[bi][ai] -= g;
      }
    } else if (el.type === "led") {
      // LED is directional: only conduct when forward-biased beyond threshold.
      const isOn = ledOnMap?.get(el.id) ?? false;
      if (isOn) {
        const R = el.properties?.resistance ?? 100; // on-state series resistance approximation
        const g = 1 / R;
        if (ai !== undefined) G[ai][ai] += g;
        if (bi !== undefined) G[bi][bi] += g;
        if (ai !== undefined && bi !== undefined) {
          G[ai][bi] -= g;
          G[bi][ai] -= g;
        }
      } else {
        // Off: open circuit (no stamp)
      }
    } else if (el.type === "potentiometer") {
      const [nodeA, nodeW, nodeB] = el.nodes;
      const aMapped = nodeMap.get(nodeA?.id ?? "");
      const wMapped = nodeMap.get(nodeW?.id ?? "");
      const bMapped = nodeMap.get(nodeB?.id ?? "");
      const ai2 = aMapped ? nodeIndex.get(aMapped) : undefined;
      const wi = wMapped ? nodeIndex.get(wMapped) : undefined;
      const bi2 = bMapped ? nodeIndex.get(bMapped) : undefined;

      const R = el.properties?.resistance ?? 1;
      const t = el.properties?.ratio ?? 0.5;
      const Ra = R * (1 - t);
      const Rb = R * t;
      const ga = 1 / Ra;
      const gb = 1 / Rb;

      if (ai2 !== undefined) G[ai2][ai2] += ga;
      if (wi !== undefined) G[wi][wi] += ga;
      if (ai2 !== undefined && wi !== undefined) {
        G[ai2][wi] -= ga;
        G[wi][ai2] -= ga;
      }

      if (bi2 !== undefined) G[bi2][bi2] += gb;
      if (wi !== undefined) G[wi][wi] += gb;
      if (bi2 !== undefined && wi !== undefined) {
        G[bi2][wi] -= gb;
        G[wi][bi2] -= gb;
      }
    } else if (el.type === "battery" || el.type === "cell3v" || el.type === "AA_battery" || el.type === "AAA_battery" || el.type === "powersupply") {
      // find pos/neg mapped nodes
      const pos =
        el.nodes.find((n) => n.polarity === "positive")?.id ?? el.nodes[1]?.id;
      const neg =
        el.nodes.find((n) => n.polarity === "negative")?.id ?? el.nodes[0]?.id;
      const pIdx = safeNodeIndex(pos);
      const nIdx = safeNodeIndex(neg);
      const idx = safeCurrentIndex(el.id);
      if (idx === undefined) continue; // don't stamp if no mapping for source

      // Treat an explicitly switched-off power supply as inactive (no source stamped)
      const psIsOn = (el.properties as any)?.isOn;
      if (el.type === "powersupply" && psIsOn === false) {
        continue;
      }

      if (pIdx !== undefined) B[pIdx][idx] -= 1;
      if (nIdx !== undefined) B[nIdx][idx] += 1;
      if (pIdx !== undefined) C[idx][pIdx] += 1;
      if (nIdx !== undefined) C[idx][nIdx] -= 1;
      // Battery has fixed params; powersupply is configurable
      // If this supply is current limited (CC mode), model as current source instead of voltage source.
      if (el.type === "powersupply" && currentLimitedIds?.has(el.id)) {
        // Undo voltage source stamping we just made (remove B/C contributions and D/E entry) then inject current.
        if (pIdx !== undefined) B[pIdx][idx] += 1; // reverse earlier subtraction
        if (nIdx !== undefined) B[nIdx][idx] -= 1;
        if (pIdx !== undefined) C[idx][pIdx] -= 1;
        if (nIdx !== undefined) C[idx][nIdx] += 1;
        // zero row/col for this source index so it becomes inert
        for (let k = 0; k < D.length; k++) {
          D[k][idx] = 0;
          D[idx][k] = 0;
        }
        D[idx][idx] = 0;
        E[idx] = 0;
        // Inject current source: +I at positive node, -I at negative node.
        const iLimit = (el.properties as any)?.iLimit ?? 1;
        if (pIdx !== undefined) I[pIdx] += iLimit;
        if (nIdx !== undefined) I[nIdx] -= iLimit;
      } else {
        // Normal voltage source stamping
        if (el.type === "battery" || el.type === "cell3v" || el.type === "AA_battery" || el.type === "AAA_battery") {
          const defaultV = el.type === "battery" ? 9 : (el.type === "cell3v" ? 3 : (el.type === "AA_battery" ? 1.5 : 1.5));
          const defaultR = el.type === "battery" ? 1.45 : (el.type === "cell3v" ? 0.8 : (el.type === "AA_battery" ? 0.3 : 0.4));
          D[idx][idx] += el.properties?.resistance ?? defaultR; // internal resistance
          E[idx] = el.properties?.voltage ?? defaultV; // source voltage
        } else {
          D[idx][idx] += el.properties?.resistance ?? 0.2;
          // Use setpoint if present for bench supply
          const vSet = (el.properties as any)?.vSet;
          E[idx] = vSet !== undefined ? vSet : el.properties?.voltage ?? 5;
        }
      }
    } else if (el.type === "microbit" || el.type === "microbitWithBreakout") {
      // Collect all 3.3V and GND node ids in this element
      const posIds = el.nodes.filter((n) => n.placeholder === "3.3V").map((n) => n.id);
      const negIds = el.nodes.filter((n) => n.placeholder && n.placeholder.toUpperCase().startsWith("GND")).map((n) => n.id);

      // Need at least one pos and one neg to model the internal source
      if (posIds.length === 0 || negIds.length === 0) continue;

      // Prefer a pin that is actually present in the node map (i.e., connected), else fall back
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

      // Per-pin stamping: if a pin is driven HIGH, stamp a source between the pin and the microbit 3.3V.
      // We use pin placeholder names like "P0", "P1", etc., which you already set in createElement.
      const pins =
        (el.controller?.pins as Record<string, { digital?: number }>) ?? {};
      for (const node of el.nodes) {
        const pinName = node.placeholder;
        if (pinName && pinName.startsWith("P")) {
          const pinState = pins[pinName];
          if (pinState?.digital === 1 && nodeMap.has(node.id)) {
            const pinIdx = safeNodeIndex(node.id);
            const pin33VIdx = safeNodeIndex(pos);
            const pinCurrentIdx = safeCurrentIndex(`${el.id}-${pinName}`);

            if (
              pinIdx !== undefined &&
              pin33VIdx !== undefined &&
              pinCurrentIdx !== undefined
            ) {
              // stamp a voltage-source-like constraint between pin and representative 3.3V node
              B[pinIdx][pinCurrentIdx] -= 1;
              B[pin33VIdx][pinCurrentIdx] += 1;
              C[pinCurrentIdx][pinIdx] += 1;
              C[pinCurrentIdx][pin33VIdx] -= 1;
              D[pinCurrentIdx][pinCurrentIdx] += el.properties?.resistance ?? 0;
              // Historically E was set to 0 (0-difference to 3.3V). If you prefer pin driven to 3.3V,
              // set E[pinCurrentIdx] = el.properties?.voltage ?? 3.3 . Keep as 0 for backward compat.
              E[pinCurrentIdx] = 0;
            }
          }
        }
      }
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
        // Stamp a known test voltage source across the probes
        const idx = safeCurrentIndex(el.id);
        if (idx === undefined) continue;
        if (ai !== undefined) B[ai][idx] -= 1;
        if (bi !== undefined) B[bi][idx] += 1;
        if (ai !== undefined) C[idx][ai] += 1;
        if (bi !== undefined) C[idx][bi] -= 1;
        D[idx][idx] += 0; // ideal source
        E[idx] = OHMMETER_VTEST;
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

// Estimated forward voltage per LED color (V). Used as a simple threshold.
function getLedForwardVoltage(color?: string) {
  const c = (color || 'red').toLowerCase();
  switch (c) {
    case 'red':
    case 'orange':
      return 1.8;
    case 'yellow':
      return 2.0;
    case 'green':
      return 2.1;
    case 'blue':
    case 'white':
      return 2.8;
    default:
      return 2.0;
  }
}

function computeElementResults(
  elements: CircuitElement[],
  nodeVoltages: Record<string, number>,
  x: number[],
  nodeMap: Map<string, string>,
  currentMap: Map<string, number>,
  n: number,
  currentLimitedIds?: Set<string>
): CircuitElement[] {
  // Detect if subcircuit is externally powered (battery or microbit present)
  const externallyPowered = elements.some(
    (e) => e.type === "battery" || e.type === "cell3v" || e.type === "AA_battery" || e.type === "AAA_battery" || e.type === "powersupply" || e.type === "microbit" || e.type === "microbitWithBreakout"
  );

  return elements.map((el) => {
    const a = nodeMap.get(el.nodes?.[0]?.id ?? "");
    const b = nodeMap.get(el.nodes?.[1]?.id ?? "");
    const Va = a ? nodeVoltages[a] ?? 0 : 0;
    const Vb = b ? nodeVoltages[b] ?? 0 : 0;
    let voltage = Va - Vb;
    let current = 0,
      power = 0,
      measurement = 0;

    if (["resistor", "lightbulb"].includes(el.type)) {
      const R = el.properties?.resistance ?? 1;
      current = voltage / R;
      power = voltage * current;
    } else if (el.type === "led") {
      // Respect polarity: forward conduction only (anode is node[1], cathode is node[0] per createElement)
      const a = nodeMap.get(el.nodes?.[1]?.id ?? "");
      const c = nodeMap.get(el.nodes?.[0]?.id ?? "");
      const Va = a ? nodeVoltages[a] ?? 0 : 0;
      const Vc = c ? nodeVoltages[c] ?? 0 : 0;
      const forward = Va - Vc;
      const Vf = getLedForwardVoltage(el.properties?.color);
      if (forward >= Vf) {
        const R = el.properties?.resistance ?? 100;
        current = forward / R;
        voltage = forward; // drop across LED path we model
        power = voltage * current;
      } else {
        current = 0;
        power = 0;
        // keep voltage as Va-Vb for probes, but LED behaves open
      }
    } else if (el.type === "potentiometer") {
      const [nodeA, nodeW, nodeB] = el.nodes;
      const Va2 = nodeVoltages[nodeMap.get(nodeA.id) ?? ""] ?? 0;
      const Vw = nodeVoltages[nodeMap.get(nodeW.id) ?? ""] ?? 0;
      const Vb2 = nodeVoltages[nodeMap.get(nodeB.id) ?? ""] ?? 0;

      const R = el.properties?.resistance ?? 1;
      const t = el.properties?.ratio ?? 0.5;
      const Ra = R * (1 - t);

      const Ia = (Va2 - Vw) / (Ra || 1e-12);

      const totalVoltage = Va2 - Vb2;
      const totalCurrent = Ia; // still an approximation
      const totalPower = totalVoltage * totalCurrent;

      current = totalCurrent;
      voltage = totalVoltage;
      power = totalPower;
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
          // R = Vtest / |Isrc|
          const idx = currentMap.get(el.id);
          const isrc = idx !== undefined ? Math.abs(x[n + idx] ?? 0) : 0;
          if (isrc > 1e-12) {
            measurement = Math.abs(OHMMETER_VTEST) / isrc;
          } else {
            measurement = Number.POSITIVE_INFINITY; // open circuit
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

    return {
      ...el,
      computed: { voltage, current, power, measurement, supplyMode },
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
