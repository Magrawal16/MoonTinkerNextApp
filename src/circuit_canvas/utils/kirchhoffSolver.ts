import { CircuitElement, Wire } from "../types/circuit";

export default function solveCircuit(
  elements: CircuitElement[],
  wires: Wire[]
): CircuitElement[] {
  const subcircuits = getConnectedSubcircuits(elements, wires);
  const allResults: CircuitElement[] = [];

  for (const { elements: subEls, wires: subWires } of subcircuits) {
    const results = solveSingleSubcircuit(subEls, subWires); // your current solveCircuit logic
    allResults.push(...results);
  }

  return allResults;
}

function solveSingleSubcircuit(
  elements: CircuitElement[],
  wires: Wire[]
): CircuitElement[] {
  const nodeEquivalenceMap = findEquivalenceClasses(elements, wires);
  const effectiveNodeIds = getEffectiveNodeIds(nodeEquivalenceMap);
  if (effectiveNodeIds.size === 0) return zeroOutComputed(elements);

  const { groundId, nonGroundIds, nodeIndex } =
    getNodeMappings(effectiveNodeIds);
  const n = nonGroundIds.length;

  const elementsWithCurrent = getElementsWithCurrent(elements);
  const currentSourceIndexMap = mapCurrentSourceIndices(elementsWithCurrent);

  const { G, B, C, D, I, E } = buildMNAMatrices(
    elements,
    nodeEquivalenceMap,
    nodeIndex,
    currentSourceIndexMap
  );

  const { A, z } = buildFullSystem(G, B, C, D, I, E);
  const x = solveLinearSystem(A, z);
  if (!x) return zeroOutComputed(elements);

  const nodeVoltages = getNodeVoltages(x, nonGroundIds, groundId);
  return computeElementResults(
    elements,
    nodeVoltages,
    x,
    nodeEquivalenceMap,
    currentSourceIndexMap,
    n
  );
}

function getConnectedSubcircuits(
  elements: CircuitElement[],
  wires: Wire[]
): { elements: CircuitElement[]; wires: Wire[] }[] {
  // Build graph: each node is a circuit node ID, edges are wires and element connections
  const graph = new Map<string, Set<string>>();

  const addEdge = (a: string, b: string) => {
    if (!graph.has(a)) graph.set(a, new Set());
    graph.get(a)!.add(b);
    if (!graph.has(b)) graph.set(b, new Set());
    graph.get(b)!.add(a);
  };

  // Add wires as edges
  for (const wire of wires) {
    addEdge(wire.fromNodeId, wire.toNodeId);
  }

  // Add elements with 2+ nodes as edges
  for (const el of elements) {
    if (el.nodes.length >= 2) {
      for (let i = 0; i < el.nodes.length; i++) {
        for (let j = i + 1; j < el.nodes.length; j++) {
          addEdge(el.nodes[i].id, el.nodes[j].id);
        }
      }
    }
  }

  // Find connected node groups using BFS
  const visited = new Set<string>();
  const nodeGroups: string[][] = [];

  for (const nodeId of graph.keys()) {
    if (visited.has(nodeId)) continue;

    const queue = [nodeId];
    const group: string[] = [];
    visited.add(nodeId);

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

  // Map node groups to element/wire subcircuits
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

function findEquivalenceClasses(elements: CircuitElement[], wires: Wire[]) {
  const parent = new Map<string, string>();
  const allNodeIds = new Set<string>();
  elements.forEach((e) =>
    e.nodes.forEach((n) => {
      parent.set(n.id, n.id);
      allNodeIds.add(n.id);
    })
  );
  wires.forEach((w) => {
    parent.set(w.fromNodeId, w.fromNodeId);
    parent.set(w.toNodeId, w.toNodeId);
    allNodeIds.add(w.fromNodeId);
    allNodeIds.add(w.toNodeId);
  });

  function find(i: string): string {
    if (!parent.has(i)) return i;
    if (parent.get(i) === i) return i;
    const root = find(parent.get(i)!);
    parent.set(i, root);
    return root;
  }

  function union(i: string, j: string) {
    const rootI = find(i);
    const rootJ = find(j);
    if (rootI !== rootJ) parent.set(rootI, rootJ);
  }

  for (const wire of wires) union(wire.fromNodeId, wire.toNodeId);

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
  const groundId = list[0];
  const nonGroundIds = list.slice(1);
  const nodeIndex = new Map<string, number>();
  nonGroundIds.forEach((id, i) => nodeIndex.set(id, i));
  return { groundId, nonGroundIds, nodeIndex };
}

function getElementsWithCurrent(elements: CircuitElement[]) {
  return elements.filter(
    (e) =>
      (e.type === "battery" && e.nodes.length === 2) ||
      (e.type === "multimeter" && e.properties?.mode === "current")
  );
}

function mapCurrentSourceIndices(elements: CircuitElement[]) {
  const map = new Map<string, number>();
  elements.forEach((el, i) => map.set(el.id, i));
  return map;
}

function buildMNAMatrices(
  elements: CircuitElement[],
  nodeMap: Map<string, string>,
  nodeIndex: Map<string, number>,
  currentMap: Map<string, number>
) {
  const n = nodeIndex.size;
  const m = currentMap.size;
  const G = Array.from({ length: n }, () => Array(n).fill(0));
  const B = Array.from({ length: n }, () => Array(m).fill(0));
  const C = Array.from({ length: m }, () => Array(n).fill(0));
  const D = Array.from({ length: m }, () => Array(m).fill(0));
  const I = Array(n).fill(0);
  const E = Array(m).fill(0);

  for (const el of elements) {
    if (el.nodes.length < 2) continue;
    const a = nodeMap.get(el.nodes[0].id);
    const b = nodeMap.get(el.nodes[1].id);
    const ai = nodeIndex.get(a!);
    const bi = nodeIndex.get(b!);

    if (
      el.type === "resistor" ||
      el.type === "lightbulb" ||
      el.type === "led"
    ) {
      const R = el.properties?.resistance ?? 1;
      const g = 1 / R;
      if (ai !== undefined) G[ai][ai] += g;
      if (bi !== undefined) G[bi][bi] += g;
      if (ai !== undefined && bi !== undefined) {
        G[ai][bi] -= g;
        G[bi][ai] -= g;
      }
    } else if (el.type === "potentiometer") {
      const [nodeA, nodeW, nodeB] = el.nodes;
      const R = el.properties?.resistance ?? 1;
      const t = el.properties?.ratio ?? 0.5; // how far the wiper is between A and B

      const Ra = R * (1 - t); // A–W
      const Rb = R * t; // W–B

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
    } else if (el.type === "battery") {
      const pos =
        el.nodes.find((n) => n.polarity === "positive")?.id ?? el.nodes[1].id;
      const neg =
        el.nodes.find((n) => n.polarity === "negative")?.id ?? el.nodes[0].id;
      const pIdx = nodeIndex.get(nodeMap.get(pos)!);
      const nIdx = nodeIndex.get(nodeMap.get(neg)!);
      const idx = currentMap.get(el.id)!;
      if (pIdx !== undefined) B[pIdx][idx] -= 1;
      if (nIdx !== undefined) B[nIdx][idx] += 1;
      if (pIdx !== undefined) C[idx][pIdx] += 1;
      if (nIdx !== undefined) C[idx][nIdx] -= 1;
      D[idx][idx] += el.properties?.resistance ?? 0;
      E[idx] = el.properties?.voltage ?? 0;
    } else if (el.type === "multimeter" && el.properties?.mode === "current") {
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
    for (let j = 0; j < n; j++) A[i][j] = G[i][j];
    for (let j = 0; j < m; j++) A[i][n + j] = B[i][j];
    z[i] = I[i];
  }
  for (let i = 0; i < m; i++) {
    for (let j = 0; j < n; j++) A[n + i][j] = C[i][j];
    for (let j = 0; j < m; j++) A[n + i][n + j] = D[i][j];
    z[n + i] = E[i];
  }
  return { A, z };
}

function getNodeVoltages(x: number[], ids: string[], groundId: string) {
  const result: Record<string, number> = { [groundId]: 0 };
  ids.forEach((id, i) => (result[id] = x[i]));
  return result;
}

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
      //const Rb = R * t; // W–B

      const Ia = (Va - Vw) / Ra;
      //const Ib = (Vw - Vb) / Rb;

      // voltage across entire potentiometer
      const totalVoltage = Va - Vb;
      const totalCurrent = Ia; // = Ib if everything is correct
      const totalPower = totalVoltage * totalCurrent;

      current = totalCurrent;
      voltage = totalVoltage;
      power = totalPower;
    } else if (el.type === "battery") {
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

function solveLinearSystem(A: number[][], z: number[]): number[] | null {
  const n = A.length;
  const M = A.map((row, i) => [...row, z[i]]);
  for (let i = 0; i < n; i++) {
    let maxRow = i;
    for (let k = i + 1; k < n; k++) {
      if (Math.abs(M[k][i]) > Math.abs(M[maxRow][i])) maxRow = k;
    }
    [M[i], M[maxRow]] = [M[maxRow], M[i]];
    if (Math.abs(M[i][i]) < 1e-12) return null;
    for (let k = i + 1; k < n; k++) {
      const f = M[k][i] / M[i][i];
      for (let j = i; j <= n; j++) M[k][j] -= f * M[i][j];
    }
  }
  const x = Array(n).fill(0);
  for (let i = n - 1; i >= 0; i--) {
    x[i] = M[i][n] / M[i][i];
    for (let k = i - 1; k >= 0; k--) M[k][n] -= M[k][i] * x[i];
  }
  return x;
}
