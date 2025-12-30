import React from "react";
import { FaArrowRight, FaCubes, FaCode } from "react-icons/fa6";

type EditorMode = "block" | "text";

interface EditorHeaderProps {
  editorMode: EditorMode;
  showCodePalette: boolean;
  isConverting: boolean;
  setShowCodePalette: (value: boolean | ((prev: boolean) => boolean)) => void;
  handleModeChange: (mode: EditorMode) => void;
  toolboxSearch: string;
  setToolboxSearch: (val: string) => void;
  onToolboxSearch: (val: string) => void;
  onClose?: () => void;
  controllers?: Array<{ id: string; label: string }>;
  activeControllerId?: string | null;
  blockModeLockout?: boolean;
  blockToTextLockout?: boolean;
  onSelectController?: (id: string) => void;
}

export function EditorHeader({
  editorMode,
  showCodePalette,
  isConverting,
  setShowCodePalette,
  handleModeChange,
  toolboxSearch,
  setToolboxSearch,
  onToolboxSearch,
  onClose,
  controllers = [],
  activeControllerId = null,
  blockModeLockout = false,
  blockToTextLockout = false,
  onSelectController,
}: EditorHeaderProps) {
  const textModeDisabled =
    isConverting || blockModeLockout || (editorMode === "block" && blockToTextLockout);

  return (
    <div
      className="flex items-center justify-between px-6 py-4 border-b border-gray-200/80 bg-gradient-to-r from-slate-50 via-white to-slate-50 shadow-sm backdrop-blur-sm"
      style={{
        marginLeft: showCodePalette ? "320px" : "0px",
        transition: "margin-left 300ms cubic-bezier(0.4, 0, 0.2, 1)",
      }}
    >
      <div className="flex items-center gap-4">
        {/* Toolbox Search Field (block mode only) */}
        {editorMode === "block" && (
          <div className="flex items-center">
            <input
              type="text"
              value={toolboxSearch}
              onChange={e => {
                setToolboxSearch(e.target.value);
                onToolboxSearch(e.target.value);
              }}
              placeholder="Search blocks..."
              className="px-2 py-1 border border-gray-300 rounded-md text-sm bg-white outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              style={{ minWidth: 160 }}
            />
            {toolboxSearch && (
              <button
                className="ml-1 text-gray-400 hover:text-red-500 text-lg"
                onClick={() => {
                  setToolboxSearch("");
                  onToolboxSearch("");
                }}
                title="Clear"
              >
                ✕
              </button>
            )}
          </div>
        )}
        {/* Code Palette Toggle Button - Only show in text mode */}
        {editorMode === "text" && (
          <button
            onClick={() => setShowCodePalette((prev) => !prev)}
            className="group flex items-center justify-center w-fit px-3 py-2 bg-gradient-to-br from-blue-50 to-indigo-50 hover:from-yellow-50 hover:to-orange-50 text-blue-700 hover:text-orange-700 text-sm rounded-xl transition-all duration-300 border border-blue-200 hover:border-orange-300 shadow-sm hover:shadow-md transform hover:scale-105 active:scale-95"
            title={showCodePalette ? "Hide Code Palette" : "Show Code Palette"}
          >
            <span
              style={{
                display: "inline-block",
                transition:
                  "transform 0.5s cubic-bezier(0.68, -0.55, 0.265, 1.55)",
                transform: showCodePalette ? "rotate(180deg)" : "rotate(0deg)",
              }}
              className="flex items-center justify-center"
            >
              <FaArrowRight className="w-4 h-4" />
            </span>
            <span className="ml-2 font-medium text-xs tracking-wide">
              {showCodePalette ? "Hide" : "Show"} Snippets
            </span>
          </button>
        )}

        {/* Mode Toggle Buttons + Toolbox Search */}
        <div className="flex items-center gap-2 p-1.5 bg-gray-100/80 rounded-xl backdrop-blur-sm border border-gray-200 shadow-inner">
          <button
            className={`flex items-center gap-2.5 px-5 py-2.5 rounded-lg border-2 transition-all duration-300 font-semibold text-base relative overflow-hidden group ${
              editorMode === "block"
                ? "bg-gradient-to-br from-indigo-500 to-purple-600 border-transparent text-white shadow-lg shadow-indigo-500/50 scale-105"
                : "bg-white border-gray-200 text-gray-600 hover:bg-gray-50 hover:border-gray-300 hover:shadow-md"
            }`}
            onClick={() => handleModeChange("block")}
            aria-pressed={editorMode === "block"}
            disabled={isConverting}
          >
            {editorMode === "block" && (
              <span className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent animate-shimmer"></span>
            )}
            <FaCubes
              className={`text-xl transition-transform duration-300 ${
                editorMode === "block" ? "scale-110" : "group-hover:scale-105"
              }`}
            />
              <span className="relative z-10 whitespace-nowrap leading-none">Block Mode</span>
          </button>
          <button
            className={`flex items-center gap-2.5 px-5 py-2.5 rounded-lg border-2 transition-all duration-300 font-semibold text-base relative overflow-hidden group ${
              editorMode === "text"
                ? "bg-gradient-to-br from-indigo-500 to-purple-600 border-transparent text-white shadow-lg shadow-indigo-500/50 scale-105"
                : "bg-white border-gray-200 text-gray-600 hover:bg-gray-50 hover:border-gray-300 hover:shadow-md"
            } ${textModeDisabled ? "opacity-50 cursor-not-allowed" : ""}`}
            onClick={() => handleModeChange("text")}
            aria-pressed={editorMode === "text"}
            disabled={textModeDisabled}
          >
            {editorMode === "text" && (
              <span className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent animate-shimmer"></span>
            )}
            <FaCode
              className={`text-xl transition-transform duration-300 ${
                editorMode === "text" ? "scale-110" : "group-hover:scale-105"
              }`}
            />
              <span className="relative z-10 whitespace-nowrap leading-none">Text Mode</span>
          </button>
        </div>
        {/* Controller selector */}
        {controllers.length > 0 ? (
          <div className="flex items-center gap-2">
            <label className="text-xs text-gray-600">SELECT DEVICE</label>
            <select
              className="px-2 py-1 border border-gray-300 rounded-md text-sm bg-white outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 min-w-[180px]"
              value={activeControllerId ?? ""}
              onChange={(e) => onSelectController && onSelectController(e.target.value)}
            >
              {controllers.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.label}
                </option>
              ))}
            </select>
          </div>
        ) : (
          <div className="flex items-center gap-2 px-3 py-2 bg-gray-100 border border-gray-300 rounded-lg">
            <span className="text-xs text-gray-600 font-medium">None</span>
          </div>
        )}
      </div>
      {onClose && (
        <button
          className="group flex m-2 mb-3 items-center justify-center w-10 h-10 rounded-xl text-gray-400 hover:text-white hover:bg-red-500 transition-all duration-300 shadow-sm hover:shadow-lg transform hover:scale-110 active:scale-95"
          onClick={onClose}
          title="Close Editor"
        >
          <svg
            className="w-5 h-5 transition-transform duration-300 group-hover:rotate-90"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2.5}
              d="M6 18L18 6M6 6l12 12"
            />
          </svg>
        </button>
      )}
    </div>
  );
}
