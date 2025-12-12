import React from "react";
import { FaCubes, FaCode } from "react-icons/fa6";

interface LoadingOverlayProps {
  conversionType: "toBlocks" | "toText" | null;
}

export function LoadingOverlay({ conversionType }: LoadingOverlayProps) {
  return (
    <div className="absolute inset-0 bg-gradient-to-br from-white/95 via-indigo-50/90 to-purple-50/95 backdrop-blur-md z-50 flex items-center justify-center">
      <div className="flex flex-col items-center gap-6 p-10 bg-white/90 rounded-2xl shadow-2xl border border-indigo-100 backdrop-blur-sm max-w-md">
        {/* Enhanced Spinner with Gradient */}
        <div className="relative">
          <div className="w-16 h-16 border-4 border-indigo-100 rounded-full"></div>
          <div className="absolute top-0 left-0 w-16 h-16 border-4 border-transparent border-t-indigo-500 border-r-purple-500 rounded-full animate-spin"></div>
          <div
            className="absolute top-2 left-2 w-12 h-12 border-4 border-transparent border-t-purple-400 border-r-indigo-400 rounded-full animate-spin"
            style={{ animationDirection: "reverse", animationDuration: "1.5s" }}
          ></div>
        </div>

        {/* Loading Text with Icon */}
        <div className="text-center space-y-3">
          <div className="flex items-center justify-center gap-2">
            {conversionType === "toBlocks" ? (
              <FaCubes className="text-2xl text-indigo-600 animate-pulse" />
            ) : (
              <FaCode className="text-2xl text-purple-600 animate-pulse" />
            )}
            <h3 className="text-xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">
              {conversionType === "toBlocks"
                ? "Converting to Blocks"
                : "Converting to Text"}
            </h3>
          </div>
          <p className="text-sm text-gray-600 leading-relaxed">
            {conversionType === "toBlocks"
              ? "Transforming your Python code into visual blocks..."
              : "Generating Python code from your blocks..."}
          </p>

          {/* Progress Bar */}
          <div className="w-64 h-1.5 bg-gray-200 rounded-full overflow-hidden mt-4">
            <div className="h-full bg-gradient-to-r from-indigo-500 to-purple-500 rounded-full animate-progress"></div>
          </div>
        </div>
      </div>
    </div>
  );
}
