import React from "react";
import { FaNoteSticky } from "react-icons/fa6";

interface NotesToolProps {
  isActive: boolean;
  onClick: () => void;
}

export const NotesTool: React.FC<NotesToolProps> = ({ isActive, onClick }) => {
  return (
    <button
      onClick={onClick}
      className={`p-2 rounded transition-colors w-9 h-9 flex items-center justify-center ${
        isActive
          ? "bg-blue-500 text-white"
          : "bg-gray-200 hover:bg-gray-300"
      }`}
      title="Notes Tool"
    >
      <FaNoteSticky size={18} />
    </button>
  );
};
