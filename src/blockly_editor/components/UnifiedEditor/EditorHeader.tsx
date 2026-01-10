import React from "react";
import { FaArrowRight, FaCubes, FaCode } from "react-icons/fa6";

type EditorMode = "block" | "text";
type MicrobitConnectionStatus = "connected" | "disconnected" | "not-supported";

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
  onSelectController?: (id: string) => void;
  // Flash/Upload functionality
  onDownloadHex?: () => void;
  onFlashToMicrobit?: () => void;
  isFlashing?: boolean;
  isWebUSBSupported?: boolean;
  microbitConnectionStatus?: MicrobitConnectionStatus;
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
  onSelectController,
  onDownloadHex,
  onFlashToMicrobit,
  isFlashing = false,
  isWebUSBSupported = false,
  microbitConnectionStatus = "disconnected",
}: EditorHeaderProps) {
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
            } ${blockModeLockout ? "opacity-50 cursor-not-allowed" : ""}`}
            onClick={() => handleModeChange("text")}
            aria-pressed={editorMode === "text"}
            disabled={isConverting || blockModeLockout}
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

        {/* Upload to micro:bit buttons - visible in both block and text mode */}
        {activeControllerId && (
          <div className="flex items-center gap-1.5 ml-2 pl-2 border-l border-gray-300">
            {/* micro:bit Connection Status Indicator */}
            {isWebUSBSupported && (
              <div 
                className={`flex items-center gap-1.5 px-2 py-1 rounded text-xs font-medium border transition-all duration-300 ${
                  microbitConnectionStatus === 'connected'
                    ? 'bg-emerald-50 border-emerald-300 text-emerald-700'
                    : microbitConnectionStatus === 'not-supported'
                    ? 'bg-gray-50 border-gray-300 text-gray-500'
                    : 'bg-orange-50 border-orange-300 text-orange-600'
                }`}
                title={
                  microbitConnectionStatus === 'connected'
                    ? 'micro:bit is connected via USB'
                    : microbitConnectionStatus === 'not-supported'
                    ? 'WebUSB is not supported in this browser'
                    : 'No micro:bit connected - click Flash to connect'
                }
              >
                {/* Status dot with animation */}
                <span className={`relative flex h-2 w-2 ${microbitConnectionStatus === 'connected' ? '' : ''}`}>
                  {microbitConnectionStatus === 'connected' && (
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                  )}
                  <span className={`relative inline-flex rounded-full h-2 w-2 ${
                    microbitConnectionStatus === 'connected'
                      ? 'bg-emerald-500'
                      : microbitConnectionStatus === 'not-supported'
                      ? 'bg-gray-400'
                      : 'bg-orange-400'
                  }`}></span>
                </span>
                <span className="hidden sm:inline">
                  {microbitConnectionStatus === 'connected' 
                    ? 'USB Connected' 
                    : microbitConnectionStatus === 'not-supported'
                    ? 'N/A'
                    : 'Disconnected'}
                </span>
              </div>
            )}
            
            {/* Download HEX button */}
            <button
              onClick={onDownloadHex}
              disabled={isFlashing}
              className={`flex items-center gap-1 px-2 py-1 rounded text-xs font-medium transition-all duration-200 border ${
                isFlashing
                  ? 'bg-gray-100 border-gray-200 text-gray-400 cursor-not-allowed'
                  : 'bg-blue-500 border-blue-500 text-white hover:bg-blue-600 shadow-sm'
              }`}
              title="Download HEX file - drag to MICROBIT drive to flash"
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              <span>HEX</span>
            </button>

            {/* Flash to micro:bit button (WebUSB) */}
            {isWebUSBSupported && (
              <button
                onClick={onFlashToMicrobit}
                disabled={isFlashing}
                className={`flex items-center gap-1 px-2 py-1 rounded text-xs font-medium transition-all duration-200 border ${
                  isFlashing
                    ? 'bg-gray-100 border-gray-200 text-gray-400 cursor-not-allowed'
                    : 'bg-green-500 border-green-500 text-white hover:bg-green-600 shadow-sm'
                }`}
                title="Flash directly to micro:bit via USB"
              >
                {isFlashing ? (
                  <>
                    <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    <span>...</span>
                  </>
                ) : (
                  <>
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                    </svg>
                    <span>Flash</span>
                  </>
                )}
              </button>
            )}
          </div>
        )}
      </div>
      {onClose && (
        <button
          className="group flex-shrink-0 flex ml-2 items-center justify-center w-8 h-8 rounded-lg text-gray-400 hover:text-white hover:bg-red-500 transition-all duration-200 shadow-sm hover:shadow-md"
          onClick={onClose}
          title="Close Editor"
        >
          <svg
            className="w-4 h-4 transition-transform duration-200 group-hover:rotate-90"
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
