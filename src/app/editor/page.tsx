'use client';

import dynamic from "next/dynamic";

const CircuitCanvas = dynamic(() => import('@/components/circuit/core/CircuitCanvas'), {
  ssr: false,
});


export default function Page() {
  return <CircuitCanvas />;
}
