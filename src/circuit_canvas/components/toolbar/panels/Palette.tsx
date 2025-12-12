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
    <Panel
      className={`w-full h-[510px] overflow-x-clip p-4
      bg-white-500 bg-opacity-20
      backdrop-blur-2xl
      border border-red border-opacity-30
      rounded-xl
      shadow-lg
      `}
    >
      <input
        type="text"
        placeholder="Search..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        className="mb-4 w-full rounded-md border border-gray-300 bg-white/30 px-3 py-2 text-sm placeholder-gray-400 text-black backdrop-blur-sm focus:outline-none shadow-lg focus:ring-2 focus:ring-blue-400 hover:shadow-blue-400 hover:scale-105"
      />

      <div className="w-full h-full grid grid-cols-3 gap-2 auto-rows-[100px]">
        {filteredElements.map((el) => (
          <div
            key={el.type}
            className="aspect-[1/1.2] cursor-grab active:cursor-grabbing flex flex-col justify-center items-center gap-3 p-2 rounded-lg border border-blue-200 border-opacity-20 shadow-lg bg-white bg-opacity-20 backdrop-blur-md hover:shadow-blue-400 hover:scale-110 transition-all duration-300 text-black"
            draggable
            onDragStart={(e) => {
              e.dataTransfer.setData("application/element-type", JSON.stringify(el));
              
              // Create a custom drag image showing only the element icon
              const img = document.createElement('img');
              img.src = el.iconPath;
              img.style.position = 'absolute';
              img.style.top = '-1000px';
              img.style.left = '-1000px';
              img.style.width = '60px';
              img.style.height = '60px';
              img.style.objectFit = 'contain';
              
              document.body.appendChild(img);
              
              // Set the custom drag image centered on cursor
              e.dataTransfer.setDragImage(img, 30, 30);
              
              // Clean up the temporary element after drag starts
              setTimeout(() => {
                document.body.removeChild(img);
              }, 0);
            }}
          >
            <img
              src={el.iconPath}
              alt={el.label}
              className="w-14 h-13 object-contain filter drop-shadow-md"
            />
            <span className="text-xs text-center truncate max-w-[100%] text-black">
              {el.label}
            </span>
          </div>
        ))}
      </div>
    </Panel>
  );
}
