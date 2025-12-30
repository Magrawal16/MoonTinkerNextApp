import solveCircuit from "../src/circuit_canvas/utils/kirchhoffSolver";
import type { CircuitElement, Wire } from "../src/circuit_canvas/types/circuit";

function mkNode(id: string) {
  return { id, x: 0, y: 0, parentId: "", polarity: undefined, placeholder: "" } as any;
}

function run(label: string, elements: CircuitElement[]) {
  const wires: Wire[] = [
    { id: "w1", fromNodeId: "battery-1-node-1", toNodeId: "led-1-node-2", joints: [] },
    { id: "w2", fromNodeId: "battery-1-node-2", toNodeId: "led-1-node-1", joints: [] },
  ] as any;

  const solved = solveCircuit(elements, wires);
  const led = solved.find((e) => e.id === "led-1");
  const bat = solved.find((e) => e.id === "battery-1");

  console.log("\n===", label, "===");
  console.log("Battery current (A):", bat?.computed?.current);
  console.log("Battery voltage (V):", bat?.computed?.voltage);
  console.log("LED current (A):", led?.computed?.current);
  console.log("LED voltage (V):", led?.computed?.voltage);
  console.log("LED explosionCurrentEstimate (A):", (led as any)?.computed?.explosionCurrentEstimate);
  console.log("LED exploded:", !!(led as any)?.runtime?.led?.exploded);
}

const battery: CircuitElement = {
  id: "battery-1",
  type: "battery",
  x: 0,
  y: 0,
  nodes: [
    { ...mkNode("battery-1-node-1"), polarity: "positive" },
    { ...mkNode("battery-1-node-2"), polarity: "negative" },
  ],
  properties: { voltage: 9, resistance: 1.45 },
  computed: {},
} as any;

const ledIntact: CircuitElement = {
  id: "led-1",
  type: "led",
  x: 0,
  y: 0,
  nodes: [
    { ...mkNode("led-1-node-1"), polarity: "negative", placeholder: "Cathode" },
    { ...mkNode("led-1-node-2"), polarity: "positive", placeholder: "Anode" },
  ],
  properties: { color: "red" },
  runtime: { led: { brightness: 0, thermalEnergy: 0, exploded: false, visualState: "off", flickerSeed: 1 } },
  computed: {},
} as any;

const ledExploded: CircuitElement = {
  ...ledIntact,
  runtime: { led: { ...(ledIntact.runtime!.led as any), exploded: true, visualState: "exploded" } },
} as any;

run("Intact LED", [battery, ledIntact]);
run("Exploded LED (should include estimate)", [battery, ledExploded]);

const aa1: CircuitElement = {
  id: "aa-1",
  type: "AA_battery",
  x: 0,
  y: 0,
  nodes: [
    { ...mkNode("aa-1-node-1"), polarity: "positive" },
    { ...mkNode("aa-1-node-2"), polarity: "negative" },
  ],
  properties: { voltage: 1.5, resistance: 0.3, batteryType: "AA", batteryCount: 1 } as any,
  computed: {},
} as any;

const aa2: CircuitElement = {
  ...aa1,
  id: "aa-2",
  nodes: [
    { ...mkNode("aa-2-node-1"), polarity: "positive" },
    { ...mkNode("aa-2-node-2"), polarity: "negative" },
  ],
  properties: { voltage: 3.0, resistance: 0.6, batteryType: "AA", batteryCount: 2 } as any,
} as any;

function runAA(label: string, source: CircuitElement, led: CircuitElement) {
  const wires: Wire[] = [
    { id: "w1", fromNodeId: `${source.id}-node-1`, toNodeId: "led-1-node-2", joints: [] },
    { id: "w2", fromNodeId: `${source.id}-node-2`, toNodeId: "led-1-node-1", joints: [] },
  ] as any;
  const solved = solveCircuit([source, led], wires);
  const s = solved.find((e) => e.id === source.id);
  const l = solved.find((e) => e.id === "led-1");
  console.log("\n===", label, "===");
  console.log("Source current (A):", s?.computed?.current);
  console.log("LED current (A):", l?.computed?.current);
  console.log("LED forward voltage (V):", (l as any)?.computed?.forwardVoltage ?? l?.computed?.voltage);
}

runAA("1xAA -> red LED (expect small current)", aa1, ledIntact);
runAA("2xAA -> red LED (expect larger current)", aa2, ledIntact);
