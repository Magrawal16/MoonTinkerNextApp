"use client";

import React, { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useAuth } from "@/hooks/useAuth";

const AuthGuard: React.FC<React.PropsWithChildren<{}>> = ({ children }) => {
  const { isAuthenticated, initialized } = useAuth();
  const pathname = usePathname();
  const router = useRouter();

  useEffect(() => {
    if (!initialized) return;

    // If not authenticated and not on /login, redirect to login
    if (!isAuthenticated && pathname !== "/login") {
      router.push("/login");
      return;
    }

    // If authenticated and on /login, redirect to home
    if (isAuthenticated && pathname === "/login") {
      router.push("/");
      return;
    }
  }, [initialized, isAuthenticated, pathname, router]);

  // While we are checking sessionStorage, don't render children to avoid a flash.
  if (!initialized) return null;

  // Allow access to /login even if unauthenticated (the page itself will handle login)
  if (!isAuthenticated && pathname === "/login") {
    return <>{children}</>;
  }

  // If authenticated, render children normally
  if (isAuthenticated) return <>{children}</>;

  // For any other case (unauthenticated + not yet redirected), render nothing
  return null;
};

export default AuthGuard;
