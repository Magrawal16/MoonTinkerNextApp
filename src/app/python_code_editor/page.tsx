"use client";

import { useEffect, useRef, useState } from "react";
import SimulatorEditor from "@/python_code_editor/components/SimulatorCodeEditor";
import { Simulator } from "@/python_code_editor/lib/Simulator";
import type { MicrobitEvent } from "@/python_code_editor/mock/microbitInstance";

export default function Page() {
  const [output, setOutput] = useState("");
  const [leds, setLeds] = useState<boolean[][]>(
    Array.from({ length: 5 }, () => Array(5).fill(false))
  );
  const [pins, setPins] = useState<Record<string, { digital?: number }>>({});

  const simulatorRef = useRef<Simulator | null>(null); // holds simulator
  const [, setSimState] = useState(false); // dummy state for rerender if needed

  useEffect(() => {
    const sim = new Simulator({
      language: "python",
      controller: "microbit",
      onOutput: (line) => setOutput((prev) => prev + line),
      onEvent: handleMicrobitEvent,
    });

    simulatorRef.current = sim;

    sim.initialize().then(() => {
      const state = sim.getStates();
      setPins(state.pins);
      setLeds(state.leds);
      setSimState(true); // force rerender if needed
    });
  }, []);

  const handleMicrobitEvent = (event: MicrobitEvent) => {
    if (event.type === "pin-change") {
      setPins((prev) => ({
        ...prev,
        [event.pin]: {
          ...prev[event.pin],
          digital: event.value,
        },
      }));
    }

    if (event.type === "led-change") {
      setLeds((prev) => {
        const newMatrix = prev.map((row) => [...row]);
        newMatrix[event.y][event.x] = Boolean(event.value);
        return newMatrix;
      });
    }

    if (event.type === "reset") {
      console.log("1");
      const sim = simulatorRef.current;
      if (sim) {
        console.log("2");
        const state = sim.getStates();
        setPins(state.pins);
        setLeds(state.leds);
      }
    }
  };

  return (
    <main style={{ padding: 24 }}>
      <h1>Microcontroller Python Editor</h1>

      {simulatorRef.current && (
        <SimulatorEditor
          simulator={simulatorRef.current}
          output={output}
          setOutput={setOutput}
        />
      )}

      <div style={{ marginTop: 20 }}>
        <button
          onClick={() =>
            simulatorRef.current
              ?.getMicrobitInstance()
              ?.input._press_button("A")
          }
          style={{
            borderRadius: "50%",
            width: 50,
            height: 50,
            backgroundColor: "blue",
            color: "white",
            border: "none",
            cursor: "pointer",
            marginRight: 8,
          }}
        >
          A
        </button>
        <button
          onClick={() =>
            simulatorRef.current
              ?.getMicrobitInstance()
              ?.input._press_button("B")
          }
          style={{
            borderRadius: "50%",
            width: 50,
            height: 50,
            backgroundColor: "blue",
            color: "white",
            border: "none",
            cursor: "pointer",
          }}
        >
          B
        </button>
      </div>

      <div style={{ marginTop: 24 }}>
        <h2>States</h2>
        <div>
          <h3>LED Matrix</h3>
          <div
            style={{ display: "grid", gridTemplateColumns: "repeat(5, 20px)" }}
          >
            {leds.map((row, rowIndex) =>
              row.map((value, colIndex) => (
                <div
                  key={`${rowIndex}-${colIndex}`}
                  style={{
                    width: 20,
                    height: 20,
                    backgroundColor: value ? "yellow" : "black",
                    border: "1px solid gray",
                  }}
                />
              ))
            )}
          </div>
        </div>

        <h3>Pin States</h3>
        <pre>{JSON.stringify(pins, null, 2)}</pre>
      </div>
    </main>
  );
}
