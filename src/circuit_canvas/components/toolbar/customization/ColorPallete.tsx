"use client";
import { useState, useRef, useEffect } from "react";
import { LuChevronDown } from "react-icons/lu";

interface ColorPaletteDropdownProps {
  colors: { name: string; hex: string }[];
  selectedColor?: string;
  onColorSelect: (color: string) => void;
}

export const defaultColors = [
  { name: "Black", hex: "#000000" },
  { name: "Red", hex: "#FF0000" },
  { name: "Green", hex: "#00FF00" },
  { name: "Blue", hex: "#0000FF" },
  { name: "Orange", hex: "#FFA500" },
];

export function ColorPaletteDropdown({
  colors,
  selectedColor,
  onColorSelect,
}: ColorPaletteDropdownProps) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(e.target as Node)
      ) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div ref={dropdownRef} className="relative inline-block text-left">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="px-3 py-2 bg-[#F4F5F6] rounded border border-gray-300 shadow text-black text-sm font-medium cursor-pointer flex flex-row gap-2 items-center justify-center hover:shadow-blue-400 hover:scale-105 transition-all duration-200"
        title={`Wire color: ${selectedColor || ""}`}
      >
        <div
          className="w-5 h-5 rounded-full border border-gray-400"
          style={{ backgroundColor: selectedColor || "#ccc" }}
        />
        <LuChevronDown className="w-3 h-3" />
      </button>

      {isOpen && (
        <div className="absolute mt-2 left-0 bg-white border border-gray-300 rounded-sm shadow-sm z-10 p-1 w-40 flex flex-col">
          <div className="px-3 pb-2 text-sm font-semibold tracking-wide text-gray-600 uppercase">
              Wire color
            </div>
            {colors.map(({ name, hex }) => (
              <div
                key={hex}
                className="flex items-center space-x-3 px-3 py-2 rounded-md cursor-pointer hover:bg-gray-100"
                onClick={() => {
                  onColorSelect(hex);
                  setIsOpen(false);
                }}
              >
                <div
                  className={`w-5 h-5 rounded-full border ${selectedColor === hex ? "border-black" : "border-gray-300"
                    }`}
                  style={{ backgroundColor: hex }}
                />
                <span className="text-sm text-black">{name}</span>
              </div>
            ))}
        </div>
      )}
    </div>
  );
}
