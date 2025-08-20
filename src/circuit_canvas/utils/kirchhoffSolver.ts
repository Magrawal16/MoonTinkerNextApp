import { CircuitElement, Wire } from "../types/circuit";

/**
 * Main function to solve the entire circuit by dividing it into connected subcircuits.
 * @param elements All circuit elements.
 * @param wires All connecting wires.
 * @returns Elements with computed electrical results.
 */
export default function solveCircuit(
  elements: CircuitElement[],
  wires: Wire[]
): CircuitElement[] {
  console.log("🔧 CIRCUIT SOLVER START");

  console.log(
    "Elements:",
    elements.map((e) => ({
      type: e.type,
      id: e.id,
      nodes: e.nodes.length,
      properties: e.properties,
    }))
  );
  console.log(
    "Wires:",
    wires.map((w) => ({ from: w.fromNodeId, to: w.toNodeId }))
  );

  // Break circuit into isolated connected subcircuits
  const subcircuits = getConnectedSubcircuits(elements, wires);
  console.log(`Found ${subcircuits.length} subcircuits`);

  const allResults: CircuitElement[] = [];

  // Solve each subcircuit and collect results
  for (let i = 0; i < subcircuits.length; i++) {
    const { elements: subEls, wires: subWires } = subcircuits[i];
    console.log(`\n--- Solving subcircuit ${i + 1} ---`);
    console.log(
      "Subcircuit elements:",
      subEls.map((e) => e.type)
    );
    console.log("Subcircuit wires:", subWires.length);

    const results = solveSingleSubcircuit(subEls, subWires);
    allResults.push(...results);
  }

  console.log("🔧 CIRCUIT SOLVER END\n");
  return allResults;
}

/**
 * Solve one electrically connected subcircuit using Modified Nodal Analysis.
 * @param elements Elements of this subcircuit.
 * @param wires Wires of this subcircuit.
 * @returns Elements with computed voltages, currents, and power.
 */
function solveSingleSubcircuit(
  elements: CircuitElement[],
  wires: Wire[]
): CircuitElement[] {
  console.log("  📊 Solving single subcircuit");

  // Create node equivalence classes to merge nodes connected by wires
  const nodeEquivalenceMap = findEquivalenceClasses(elements, wires);
  console.log(
    "  Node equivalence map:",
    Object.fromEntries(nodeEquivalenceMap)
  );

  const effectiveNodeIds = getEffectiveNodeIds(nodeEquivalenceMap);
  console.log("  Effective node IDs:", Array.from(effectiveNodeIds));

  if (effectiveNodeIds.size === 0) {
    console.log("  ⚠️ No effective nodes, zeroing out");
    return zeroOutComputed(elements);
  }

  // Map nodes to indices for matrix construction and find ground node (reference)
  const { groundId, nonGroundIds, nodeIndex } =
    getNodeMappings(effectiveNodeIds);
  console.log("  Ground node:", groundId);
  console.log("  Non-ground nodes:", nonGroundIds);
  console.log("  Node index mapping:", Object.fromEntries(nodeIndex));

  const n = nonGroundIds.length;

  // Identify elements that introduce current sources for MNA extension
  const elementsWithCurrent = getElementsWithCurrent(
    elements,
    nodeEquivalenceMap
  );
  console.log(
    "  Elements with current sources:",
    elementsWithCurrent.map((e) => ({ type: e.type, id: e.id }))
  );

  // Map these current source elements to indices
  const currentSourceIndexMap = mapCurrentSourceIndices(elementsWithCurrent);
  console.log(
    "  Current source index map:",
    Object.fromEntries(currentSourceIndexMap)
  );

  // Build the MNA matrices G, B, C, D and vectors I, E
  const { G, B, C, D, I, E } = buildMNAMatrices(
    elements,
    nodeEquivalenceMap,
    nodeIndex,
    currentSourceIndexMap
  );

  console.log("  📈 MNA Matrices:");
  console.log("  G (conductance):", G);
  console.log("  B (current-voltage):", B);
  console.log("  C (voltage-current):", C);
  console.log("  D (current-current):", D);
  console.log("  I (current sources):", I);
  console.log("  E (voltage sources):", E);

  // Assemble full system matrix and vector for Ax=z
  const { A, z } = buildFullSystem(G, B, C, D, I, E);
  console.log("  📐 Full system matrix A:", A);
  console.log("  📐 Full system vector z:", z);

  // Solve the system of linear equations
  const x = solveLinearSystem(A, z);
  if (!x) {
    console.log("  ❌ Linear system solution failed");
    return zeroOutComputed(elements);
  }

  console.log("  ✅ Solution vector x:", x);

  // Extract node voltages from solution vector
  const nodeVoltages = getNodeVoltages(x, nonGroundIds, groundId);
  console.log("  🔋 Node voltages:", nodeVoltages);

  // Compute per-element results from voltages and currents
  const results = computeElementResults(
    elements,
    nodeVoltages,
    x,
    nodeEquivalenceMap,
    currentSourceIndexMap,
    n
  );

  console.log("  📊 Final element results:");
  results.forEach((el) => {
    console.log(`    ${el.type} (${el.id}):`, el.computed);
  });

  return results;
}

/**
 * Build graph of nodes and find connected subcircuits using BFS.
 * Handles special microbit connection rules.
 */
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

  // Add wire-based edges between nodes
  for (const wire of wires) {
    addEdge(wire.fromNodeId, wire.toNodeId);
  }

  // Add edges for element internal nodes, except for microbit where internal connections are ignored
  for (const el of elements) {
    if (el.type === "microbit") {
      // Skip internal node connections for microbit to allow proper voltage source behavior
      continue;
    } else if (el.nodes.length >= 2) {
      for (let i = 0; i < el.nodes.length; i++) {
        for (let j = i + 1; j < el.nodes.length; j++) {
          addEdge(el.nodes[i].id, el.nodes[j].id);
        }
      }
    }
  }

  // Find connected groups of nodes using BFS
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

  // Map node groups back to subcircuit elements and wires
  return nodeGroups.map((group) => {
    const groupSet = new Set(group);
    const subElements = elements.filter((el) =>
      el.nodes.some((n) => groupSet.has(n.id))
    );
    const subWires = wires.filter(
      (w) => groupSet.has(w.fromNodeId) && groupSet.has(w.toNodeId)
    );
    return { elements: subElements, wires: subWires };
  });
}

/**
 * Find equivalence classes of node IDs using union-find,
 * merging nodes connected by wires. Keeps microbit 3.3V and GND separate.
 */
function findEquivalenceClasses(elements: CircuitElement[], wires: Wire[]) {
  const parent = new Map<string, string>();
  const allNodeIds = new Set<string>();

  // Initialize union-find parent for nodes connected by wires
  wires.forEach((w) => {
    parent.set(w.fromNodeId, w.fromNodeId);
    parent.set(w.toNodeId, w.toNodeId);
    allNodeIds.add(w.fromNodeId);
    allNodeIds.add(w.toNodeId);
  });

  // Add nodes from elements; special handling for microbit keeps 3.3V and GND separated
  elements.forEach((e) => {
    if (e.type === "microbit") {
      const pos = e.nodes.find((n) => n.placeholder === "3.3V")?.id;
      const neg = e.nodes.find((n) => n.placeholder === "GND")?.id;

      const anyPinConnected = e.nodes.some((n) => allNodeIds.has(n.id));

      e.nodes.forEach((n) => {
        const isConnected = allNodeIds.has(n.id);
        const is33V = n.id === pos;
        const isGND = n.id === neg;
        // Add nodes that are connected, or 3.3V/GND if any pin is connected
        if (isConnected || ((is33V || isGND) && anyPinConnected)) {
          parent.set(n.id, n.id);
          allNodeIds.add(n.id);
        }
      });
    } else {
      // Add all nodes for other elements
      e.nodes.forEach((n) => {
        parent.set(n.id, n.id);
        allNodeIds.add(n.id);
      });
    }
  });

  // Find root parent function for union-find
  function find(i: string): string {
    if (!parent.has(i)) return i;
    if (parent.get(i) === i) return i;
    const root = find(parent.get(i)!);
    parent.set(i, root);
    return root;
  }

  // Union function merges sets
  function union(i: string, j: string) {
    const rootI = find(i);
    const rootJ = find(j);
    if (rootI !== rootJ) parent.set(rootI, rootJ);
  }

  // Union all wire-connected pairs
  for (const wire of wires) union(wire.fromNodeId, wire.toNodeId);

  // Return map of each node ID to its equivalence class root
  const equivalenceMap = new Map<string, string>();
  for (const id of allNodeIds) equivalenceMap.set(id, find(id));
  return equivalenceMap;
}

/** Return unique effective node IDs from equivalence classes */
function getEffectiveNodeIds(map: Map<string, string>) {
  return new Set(map.values());
}

/** Zero out computed results for all elements (used on solver failure) */
function zeroOutComputed(elements: CircuitElement[]) {
  return elements.map((el) => ({
    ...el,
    computed: { current: 0, voltage: 0, power: 0, measurement: 0 },
  }));
}

/**
 * Pick ground node from effective nodes and create node index mapping.
 * Ground is chosen preferentially if node ID includes "GND".
 */
function getNodeMappings(effectiveNodeIds: Set<string>) {
  const list = Array.from(effectiveNodeIds);

  // Prefer node including "GND" as ground, else pick first
  let groundId = list.find((id) => id.includes("GND")) || list[0];
  const nonGroundIds = list.filter((id) => id !== groundId);

  // Map non-ground nodes to matrix indices
  const nodeIndex = new Map<string, number>();
  nonGroundIds.forEach((id, i) => nodeIndex.set(id, i));
  return { groundId, nonGroundIds, nodeIndex };
}

/**
 * Obtain elements that function as current sources:
 * batteries, microbits with active pins, multimeters in current mode.
 */
function getElementsWithCurrent(
  elements: CircuitElement[],
  nodeMap?: Map<string, string>
) {
  const result = elements.filter(
    (e) =>
      (e.type === "battery" && e.nodes.length === 2) ||
      e.type === "microbit" ||
      (e.type === "multimeter" && e.properties?.mode === "current")
  );

  // Add active microbit pins appearing as current sources
  for (const e of elements) {
    if (e.type === "microbit") {
      const pins =
        (e.controller?.pins as Record<string, { digital?: number }>) ?? {};
      for (const node of e.nodes) {
        const pinName = node.placeholder;
        if (pinName && pinName.startsWith("P")) {
          const pinState = pins[pinName];
          if (pinState?.digital === 1 && nodeMap && nodeMap.has(node.id)) {
            // Append pin-specific ID for current source element
            result.push({ ...e, id: e.id + `-${pinName}` });
          }
        }
      }
    }
  }

  return result;
}

/** Assign sequential indices to current source elements */
function mapCurrentSourceIndices(elements: CircuitElement[]) {
  const map = new Map<string, number>();
  elements.forEach((el, i) => map.set(el.id, i));
  return map;
}

/**
 * Construct MNA matrices G, B, C, D and RHS vectors I, E from elements and mappings.
 */
function buildMNAMatrices(
  elements: CircuitElement[],
  nodeMap: Map<string, string>,
  nodeIndex: Map<string, number>,
  currentMap: Map<string, number>
) {
  const n = nodeIndex.size; // number of non-ground nodes
  const m = currentMap.size; // number of current sources / voltage sources

  // Initialize matrices with zeros
  const G = Array.from({ length: n }, () => Array(n).fill(0));
  const B = Array.from({ length: n }, () => Array(m).fill(0));
  const C = Array.from({ length: m }, () => Array(n).fill(0));
  const D = Array.from({ length: m }, () => Array(m).fill(0));
  const I = Array(n).fill(0);
  const E = Array(m).fill(0);

  for (const el of elements) {
    console.log(`    Processing element: ${el.type} (${el.id})`);
    if (el.nodes.length < 2) {
      console.log(`      ⚠️ Skipping element with less than 2 nodes`);
      continue;
    }
    // Map element nodes through node equivalence and indexing
    const a = nodeMap.get(el.nodes[0].id);
    const b = nodeMap.get(el.nodes[1].id);
    const ai = nodeIndex.get(a!);
    const bi = nodeIndex.get(b!);

    console.log(
      `      Node mapping: ${el.nodes[0].id} -> ${a} (index ${ai}), ${el.nodes[1].id} -> ${b} (index ${bi})`
    );

    // Handle passive resistive elements: resistor, led, lightbulb
    if (
      el.type === "resistor" ||
      el.type === "lightbulb" ||
      el.type === "led"
    ) {
      console.log(`    ⚡ Processing resistive element ${el.type}`);
      const R = el.properties?.resistance ?? 1;
      const g = 1 / R; // Conductance
      console.log(`      Resistance: ${R}Ω, Conductance: ${g}S`);

      if (ai !== undefined) G[ai][ai] += g;
      if (bi !== undefined) G[bi][bi] += g;
      if (ai !== undefined && bi !== undefined) {
        G[ai][bi] -= g;
        G[bi][ai] -= g;
      }
    }
    // Potentiometer (3-terminal element) handled separately
    else if (el.type === "potentiometer") {
      const [nodeA, nodeW, nodeB] = el.nodes;
      const R = el.properties?.resistance ?? 1;
      const t = el.properties?.ratio ?? 0.5; // wiper position ratio

      const Ra = R * (1 - t); // Resistance A-W
      const Rb = R * t;       // Resistance W-B

      const a = nodeMap.get(nodeA.id);
      const w = nodeMap.get(nodeW.id);
      const b = nodeMap.get(nodeB.id);

      const ai = nodeIndex.get(a!);
      const wi = nodeIndex.get(w!);
      const bi = nodeIndex.get(b!);

      const ga = 1 / Ra;
      const gb = 1 / Rb;

      if (ai !== undefined) G[ai][ai] += ga;
      if (wi !== undefined) G[wi][wi] += ga;
      if (ai !== undefined && wi !== undefined) {
        G[ai][wi] -= ga;
        G[wi][ai] -= ga;
      }

      if (bi !== undefined) G[bi][bi] += gb;
      if (wi !== undefined) G[wi][wi] += gb;
      if (bi !== undefined && wi !== undefined) {
        G[bi][wi] -= gb;
        G[wi][bi] -= gb;
      }
    }
    // Battery modeled as voltage source with small internal resistance
    else if (el.type === "battery") {
      console.log(`    🔋 Processing battery ${el.id}`);
      const pos =
        el.nodes.find((n) => n.polarity === "positive")?.id ?? el.nodes[1].id;
      const neg =
        el.nodes.find((n) => n.polarity === "negative")?.id ?? el.nodes[0].id;

      console.log(`      Positive node: ${pos}, Negative node: ${neg}`);
      console.log(`      Battery voltage: ${el.properties?.voltage ?? 0}V`);
      console.log(`      Battery resistance: ${el.properties?.resistance ?? 0}Ω`);

      const pIdx = nodeIndex.get(nodeMap.get(pos)!);
      const nIdx = nodeIndex.get(nodeMap.get(neg)!);
      const idx = currentMap.get(el.id)!;

      console.log(
        `      Positive index: ${pIdx}, Negative index: ${nIdx}, Current source index: ${idx}`
      );

      if (pIdx !== undefined) B[pIdx][idx] -= 1;
      if (nIdx !== undefined) B[nIdx][idx] += 1;
      if (pIdx !== undefined) C[idx][pIdx] += 1;
      if (nIdx !== undefined) C[idx][nIdx] -= 1;
      D[idx][idx] += el.properties?.resistance ?? 0;
      E[idx] = el.properties?.voltage ?? 0;
    }
    // Microbit handled similarly to voltage source with added pin-level sources
    else if (el.type === "microbit") {
      console.log(`    📱 Processing microbit ${el.id}`);

      const pos = el.nodes.find((n) => n.placeholder === "3.3V")?.id;
      const neg = el.nodes.find((n) => n.placeholder === "GND")?.id;
      console.log(`      3.3V node: ${pos}, GND node: ${neg}`);
      console.log(`      Microbit voltage: ${el.properties?.voltage ?? 0}V`);
      console.log(`      Microbit resistance: ${el.properties?.resistance ?? 0}Ω`);

      if (!pos || !neg) {
        console.log(`      ❌ ERROR: Missing 3.3V or GND node on microbit!`);
        continue; // Skip this element
      }

      const pIdx = nodeIndex.get(nodeMap.get(pos)!);
      const nIdx = nodeIndex.get(nodeMap.get(neg)!);
      const idx = currentMap.get(el.id)!;

      console.log(`      Positive index: ${pIdx}, Negative index: ${nIdx}, Current source index: ${idx}`);

      if (pIdx !== undefined) B[pIdx][idx] -= 1;
      if (nIdx !== undefined) B[nIdx][idx] += 1;
      if (pIdx !== undefined) C[idx][pIdx] += 1;
      if (nIdx !== undefined) C[idx][nIdx] -= 1;
      D[idx][idx] += el.properties?.resistance ?? 0;
      E[idx] = el.properties?.voltage ?? 3.3;

      // Handle active pins connected to 3.3V as 0V voltage sources (short circuits for simulation)
      const pins =
        (el.controller?.pins as Record<string, { digital?: number }>) ?? {};
      for (const node of el.nodes) {
        const pinName = node.placeholder;
        if (pinName && pinName.startsWith("P") && nodeMap.has(node.id)) {
          const pinState = pins[pinName];
          if (pinState?.digital === 1) {
            const pinIdx = nodeIndex.get(nodeMap.get(node.id)!);
            const pin33VIdx = nodeIndex.get(nodeMap.get(pos)!);
            const pinCurrentIdx = currentMap.get(el.id + `-${pinName}`);

            if (
              pinIdx !== undefined &&
              pin33VIdx !== undefined &&
              pinCurrentIdx !== undefined
            ) {
              // Voltage source enforcing 0V difference between pin and 3.3V
              B[pinIdx][pinCurrentIdx] -= 1;
              B[pin33VIdx][pinCurrentIdx] += 1;
              C[pinCurrentIdx][pinIdx] += 1;
              C[pinCurrentIdx][pin33VIdx] -= 1;
              D[pinCurrentIdx][pinCurrentIdx] += el.properties?.resistance ?? 0;
              E[pinCurrentIdx] = 0;
            }
          }
        }
      }
    }
    // Multimeter in current mode is modeled as current source connection
    else if (el.type === "multimeter" && el.properties?.mode === "current") {
      const idx = currentMap.get(el.id)!;
      if (ai !== undefined) B[ai][idx] -= 1;
      if (bi !== undefined) B[bi][idx] += 1;
      if (ai !== undefined) C[idx][ai] += 1;
      if (bi !== undefined) C[idx][bi] -= 1;
      D[idx][idx] -= 0;
      E[idx] = 0;
    }
  }

  return { G, B, C, D, I, E };
}

/** Combine matrices into full MNA system matrix for Ax = z */
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

  // Fill top-left block with G matrix
  for (let i = 0; i < n; i++) {
    for (let j = 0; j < n; j++) A[i][j] = G[i][j];
    for (let j = 0; j < m; j++) A[i][n + j] = B[i][j];
    z[i] = I[i];
  }

  // Fill bottom rows with C, D matrices and voltage sources E
  for (let i = 0; i < m; i++) {
    for (let j = 0; j < n; j++) A[n + i][j] = C[i][j];
    for (let j = 0; j < m; j++) A[n + i][n + j] = D[i][j];
    z[n + i] = E[i];
  }

  return { A, z };
}

/** Map solution vector x back onto node voltages, grounding one node at 0V */
function getNodeVoltages(x: number[], ids: string[], groundId: string) {
  const result: Record<string, number> = { [groundId]: 0 };
  ids.forEach((id, i) => (result[id] = x[i]));
  return result;
}

/** Compute voltage, current, power and measurement for each element from solutions */
function computeElementResults(
  elements: CircuitElement[],
  nodeVoltages: Record<string, number>,
  x: number[],
  nodeMap: Map<string, string>,
  currentMap: Map<string, number>,
  n: number
): CircuitElement[] {
  return elements.map((el) => {
    const a = nodeMap.get(el.nodes[0].id);
    const b = nodeMap.get(el.nodes[1].id);
    const Va = nodeVoltages[a!] ?? 0;
    const Vb = nodeVoltages[b!] ?? 0;
    let voltage = Va - Vb;
    let current = 0,
      power = 0,
      measurement = 0;

    if (["resistor", "lightbulb", "led"].includes(el.type)) {
      const R = el.properties?.resistance ?? 1;
      current = voltage / R;
      power = voltage * current;
    } else if (el.type === "potentiometer") {
      const [nodeA, nodeW, nodeB] = el.nodes;
      const Va = nodeVoltages[nodeMap.get(nodeA.id)!] ?? 0;
      const Vw = nodeVoltages[nodeMap.get(nodeW.id)!] ?? 0;
      const Vb = nodeVoltages[nodeMap.get(nodeB.id)!] ?? 0;

      const R = el.properties?.resistance ?? 1;
      const t = el.properties?.ratio ?? 0.5;
      const Ra = R * (1 - t); // A–W

      const Ia = (Va - Vw) / Ra;

      const totalVoltage = Va - Vb;
      const totalCurrent = Ia; // Approximation
      const totalPower = totalVoltage * totalCurrent;

      current = totalCurrent;
      voltage = totalVoltage;
      power = totalPower;
    } else if (el.type === "battery" || el.type === "microbit") {
      const idx = currentMap.get(el.id);
      if (idx !== undefined) current = x[n + idx];
      power = voltage * current;
    } else if (el.type === "multimeter") {
      if (el.properties?.mode === "voltage") {
        measurement = voltage;
      } else if (el.properties?.mode === "current") {
        const idx = currentMap.get(el.id);
        if (idx !== undefined) measurement = x[n + idx];
        current = measurement;
        power = 0;
      }
    }

    return {
      ...el,
      computed: { voltage, current, power, measurement },
    };
  });
}

/**
 * Solve linear system using Gaussian elimination.
 * Returns solution vector x or null if no unique solution.
 */
function solveLinearSystem(A: number[][], z: number[]): number[] | null {
  const n = A.length;

  // Augmented matrix [A|z]
  const M = A.map((row, i) => [...row, z[i]]);

  // Forward elimination with partial pivoting
  for (let i = 0; i < n; i++) {
    let maxRow = i;
    for (let k = i + 1; k < n; k++) {
      if (Math.abs(M[k][i]) > Math.abs(M[maxRow][i])) maxRow = k;
    }
    [M[i], M[maxRow]] = [M[maxRow], M[i]];

    if (Math.abs(M[i][i]) < 1e-12) return null; // Singular matrix

    for (let k = i + 1; k < n; k++) {
      const f = M[k][i] / M[i][i];
      for (let j = i; j <= n; j++) M[k][j] -= f * M[i][j];
    }
  }

  // Back substitution
  const x = Array(n).fill(0);
  for (let i = n - 1; i >= 0; i--) {
    x[i] = M[i][n] / M[i][i];
    for (let k = i - 1; k >= 0; k--) {
      M[k][n] -= M[k][i] * x[i];
    }
  }

  return x;
}
