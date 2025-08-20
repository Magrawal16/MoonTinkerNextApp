"use client";

export default function Loader() {
  return (
    <div className="absolute inset-0 z-50 flex flex-col items-center justify-center bg-white/80 backdrop-blur-sm">
      <div className="relative flex items-center justify-center">
        <div className="w-16 h-16 rounded-full border-4 border-t-blue-500 border-b-blue-500 animate-spin"></div>
        <div className="absolute text-gray-800 font-semibold text-sm mt-40 animate-pulse">
          Loading Circuit...
        </div>
      </div>
    </div>
  );
}
