"use client";

import { useState, useEffect } from "react";
import dynamic from "next/dynamic";

const CircuitCanvas = dynamic(() => import('@/components/circuit/core/CircuitCanvas'), {
  ssr: false,
});

export default function Page() {
  const [showCanvas, setShowCanvas] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => {
      setShowCanvas(true);
    }, 1500); 

    return () => clearTimeout(timer); 
  }, []);

  return (
    <>
      {showCanvas ? (
        <CircuitCanvas />
      ) : (
        <div className="flex items-center justify-center h-screen">
          <img src="/common/moonpreneur_logo.svg" alt="Loading..." className="w-100 h-60 animate-bounce" />
        </div>
      )}
    </>
  );
}
