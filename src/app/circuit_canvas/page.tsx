
'use client';
import React from 'react';

import dynamic from "next/dynamic";

const CircuitCanvas = dynamic(() => import('@/circuit_canvas/components/core/CircuitCanvas'), {
  ssr: false,
});


export default function Page() {
  // Pass imported circuit data from localStorage if present
  const [importedCircuit, setImportedCircuit] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      if (params.get("imported") === "1") {
        const data = localStorage.getItem("mt:importedCircuit");
        if (data) setImportedCircuit(data);
      }
    }
  }, []);

  return <CircuitCanvas importedCircuit={importedCircuit} />;
}
