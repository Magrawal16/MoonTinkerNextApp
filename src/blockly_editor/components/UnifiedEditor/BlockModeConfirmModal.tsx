import React from "react";

interface BlockModeConfirmModalProps {
  onConfirm: () => void;
  onCancel: () => void;
  title?: string;
  description?: string;
  warningTitle?: string;
  warningDetail?: string;
  confirmLabel?: string;
}

export function BlockModeConfirmModal({
  onConfirm,
  onCancel,
  title = "Clear and Switch to Block Mode?",
  description = "Enabling the blocks editor will <strong>clear any code</strong> you have in the text editor and start fresh. This action cannot be undone.",
  warningTitle = "Warning",
  warningDetail = "All your current Python code will be permanently deleted. Make sure to capture important code before continuing.",
  confirmLabel = "Continue & Clear",
}: BlockModeConfirmModalProps) {
  return (
    <div className="absolute inset-0 bg-gradient-to-br from-black/40 to-black/60 backdrop-blur-sm z-50 flex items-center justify-center animate-fade-in">
      <div className="bg-white rounded-2xl shadow-2xl border-2 border-indigo-100 w-[560px] max-w-[90%] p-7 transform animate-scale-in">
        <div className="flex items-start gap-4 mb-5">
          <div className="w-12 h-12 rounded-full bg-gradient-to-br from-yellow-400 to-orange-500 flex items-center justify-center flex-shrink-0 shadow-lg">
            <svg
              className="w-7 h-7 text-white"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2.5}
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-1.964-1.333-2.732 0L3.34 16c-.77 1.333.192 3 1.732 3z"
              />
            </svg>
          </div>
          <div className="flex-1">
            <h3 className="text-xl font-bold text-gray-900 mb-2">
              {title}
            </h3>
            <p className="text-sm text-gray-600 leading-relaxed" dangerouslySetInnerHTML={{ __html: description }} />
          </div>
        </div>

        <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4 mb-5">
          <div className="flex items-start gap-3">
            <span className="text-2xl">⚠️</span>
            <div>
              <p className="text-sm font-semibold text-yellow-800 mb-1">
                {warningTitle}
              </p>
              <p className="text-xs text-yellow-700">
                {warningDetail}
              </p>
            </div>
          </div>
        </div>

        <div className="flex justify-end gap-3">
          <button
            onClick={onCancel}
            className="px-5 py-2.5 rounded-xl border-2 border-gray-300 text-gray-700 hover:bg-gray-50 hover:border-gray-400 font-medium transition-all duration-200 transform hover:scale-105"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 text-white hover:from-blue-700 hover:to-indigo-700 font-semibold shadow-lg hover:shadow-xl transition-all duration-200 transform hover:scale-105"
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
