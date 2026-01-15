"use client";

import { useState, useEffect } from "react";
import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import { useContext } from "react";
import { AuthContext } from "@/providers/AuthProvider";

const CircuitCanvas = dynamic(
  () => import("@/circuit_canvas/components/core/CircuitCanvas"),
  {
    ssr: false,
  }
);

export default function Page() {
  const router = useRouter();
  const authContext = useContext(AuthContext);
  const [showLoading, setShowLoading] = useState(true);

  useEffect(() => {
    // Wait for auth to be initialized
    if (authContext?.initialized) {
      if (!authContext?.isAuthenticated) {
        // Redirect to login if not authenticated
        router.push("/login");
      } else {
        // Redirect to saved circuits page for authenticated users
        router.push("/saved_circuits");
      }
    }
  }, [authContext?.initialized, authContext?.isAuthenticated, router]);

  return (
    <div className="flex items-center justify-center h-screen">
      <img
        src="/assets/common/moonpreneur_logo.svg"
        alt="Loading..."
        className="w-100 h-60 animate-bounce"
      />
    </div>
  );
}
