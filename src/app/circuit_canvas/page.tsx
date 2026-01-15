
'use client';
import React from 'react';
import { useContext, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import dynamic from "next/dynamic";
import { AuthContext } from '@/providers/AuthProvider';

const CircuitCanvas = dynamic(() => import('@/circuit_canvas/components/core/CircuitCanvas'), {
  ssr: false,
});


export default function Page() {
  const router = useRouter();
  const authContext = useContext(AuthContext);
  const [isAuthorized, setIsAuthorized] = React.useState(false);
  const [importedCircuit, setImportedCircuit] = React.useState<string | null>(null);

  // Check authentication and circuit validity
  useEffect(() => {
    if (typeof window !== "undefined") {
      // Wait for auth to initialize
      if (!authContext?.initialized) {
        return;
      }

      // Check if user is authenticated
      if (!authContext?.isAuthenticated) {
        router.push('/login');
        return;
      }

      // Check if user has a valid circuit loaded or is importing/creating one
      const params = new URLSearchParams(window.location.search);
      const isImporting = params.get("imported") === "1";
      const isCreatingNew = params.get("new") === "1";
      const circuitId = localStorage.getItem('mt_circuit_id');

      if (!isImporting && !isCreatingNew && !circuitId) {
        // No circuit loaded, not importing, and not creating new - redirect to circuit selection
        router.push('/saved_circuits');
        return;
      }

      // User is authorized
      setIsAuthorized(true);

      // Handle imported circuit
      if (isImporting) {
        const data = localStorage.getItem("mt:importedCircuit");
        if (data) setImportedCircuit(data);
      }
    }
  }, [authContext?.initialized, authContext?.isAuthenticated, router]);

  // Show nothing while checking authorization
  if (!isAuthorized) {
    return <div className="w-full h-screen bg-white" />;
  }

  return <CircuitCanvas importedCircuit={importedCircuit} />;
}
