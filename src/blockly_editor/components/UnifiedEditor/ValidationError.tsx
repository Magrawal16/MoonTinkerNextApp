import React from "react";

interface ValidationErrorProps {
  validationError: string;
  showCodePalette: boolean;
  onDismiss: () => void;
}

export function ValidationError({
  validationError,
  showCodePalette,
  onDismiss,
}: ValidationErrorProps) {
  return (
    <div
      className="mt-3 mx-4 animate-slide-in-up"
      style={{
        marginLeft: showCodePalette ? "328px" : "20px",
        marginRight: "20px",
        transition: "margin-left 300ms",
      }}
    >
      <div className="p-4 bg-gradient-to-r from-red-50 to-orange-50 border-2 border-red-200 rounded-xl shadow-lg backdrop-blur-sm">
        <div className="flex items-start gap-3">
          <svg
            className="w-6 h-6 text-red-500 mt-0.5 flex-shrink-0 animate-pulse"
            fill="currentColor"
            viewBox="0 0 20 20"
          >
            <path
              fillRule="evenodd"
              d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
              clipRule="evenodd"
            />
          </svg>
          <div className="flex-1">
            <h4 className="text-base font-bold text-red-800 mb-1 flex items-center gap-2">
              <span>⚠️</span>
              Cannot switch to Block mode
            </h4>
            <p className="text-sm text-red-700 mb-2 leading-relaxed">
              {validationError}
            </p>
            <p className="text-xs text-red-600 bg-red-100/50 p-2 rounded-lg border border-red-200">
              💡 <strong>Tip:</strong> Only supported micro:bit Python commands
              can be converted to blocks. Please use only the available block
              commands or switch to text mode for advanced coding.
            </p>
          </div>
          <button
            onClick={onDismiss}
            className="text-red-400 hover:text-red-600 hover:bg-red-100 p-2 rounded-lg transition-all duration-200 transform hover:scale-110"
            aria-label="Dismiss error"
          >
            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
              <path
                fillRule="evenodd"
                d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
                clipRule="evenodd"
              />
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
}
