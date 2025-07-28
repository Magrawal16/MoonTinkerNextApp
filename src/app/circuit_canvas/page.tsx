'use client';

import dynamic from "next/dynamic";

const CircuitCanvas = dynamic(() => import('@/circuit_canvas/components/core/CircuitCanvas'), {
  ssr: false,
});


export default function Page() {
  return <CircuitCanvas />;
}
