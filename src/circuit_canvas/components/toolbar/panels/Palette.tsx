"use client";

import { useState, useMemo } from "react";
import { ELEMENT_PALETTE } from "@/circuit_canvas/data/defaultElementProperties";
import Panel from "@/circuit_canvas/components/toolbar/Panel";

export default function CircuitSelector() {
  const [search, setSearch] = useState("");

  const filteredElements = useMemo(() => {
    return ELEMENT_PALETTE.filter((el) =>
      el.label.toLowerCase().includes(search.toLowerCase())
    );
  }, [search]);

  return (
    <Panel className="w-full h-full overflow-x-clip p-2">
      <input
        type="text"
        placeholder="Search..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        className="mb-3 w-full rounded-md border border-gray-300  bg-white px-3 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
      />

      <div className="w-full h-full grid grid-cols-3 gap-2 auto-rows-[100px]">
        {filteredElements.map((el) => (
          <div
            key={el.type}
            className="aspect-[1/1.2] cursor-grab active:cursor-grabbing flex flex-col justify-center items-center gap-3 p-1 rounded-lg border border-b-blue-950 shadow-2xl hover:shadow-blue-950 hover:scale-110 transition-all duration-200 bg-[#F1F1F3]"
            draggable
            onDragStart={(e) => {
              e.dataTransfer.setData(
                "application/element-type",
                JSON.stringify(el)
              );
            }}
          >
            <img
              src={el.iconPath}
              alt={el.label}
              className="w-15 h-15 object-contain"
            />
            <span className="text-sm text-gray-800 truncate max-w-[95%] text-center">
              {el.label}
            </span>
          </div>
        ))}
      </div>
    </Panel>
  );
}
