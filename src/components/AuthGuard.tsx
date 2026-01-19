"use client";

import React, { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useAuth } from "@/hooks/useAuth";
import { useMessage } from "@/common/components/ui/GenericMessagePopup";

const AuthGuard: React.FC<React.PropsWithChildren<{}>> = ({ children }) => {
  const { isAuthenticated, initialized } = useAuth();
  const pathname = usePathname();
  const router = useRouter();
  const { showMessage } = useMessage();
  const redirectTimerRef = React.useRef<number | null>(null);

  useEffect(() => {
    if (!initialized) return;

    // If not authenticated and not on /login, show notice then redirect to login
    if (!isAuthenticated && pathname !== "/login") {
      if (!redirectTimerRef.current) {
        showMessage("Session expired. Redirecting to login...", "info", 2000);
        redirectTimerRef.current = window.setTimeout(() => {
          redirectTimerRef.current = null;
          router.push("/login");
        }, 2000);
      }
      return;
    }

    // If authenticated and on /login, redirect to home
    if (isAuthenticated && pathname === "/login") {
      router.push("/");
      return;
    }

    // Clear any pending redirect timer if auth state changes
    if (redirectTimerRef.current) {
      window.clearTimeout(redirectTimerRef.current);
      redirectTimerRef.current = null;
    }
  }, [initialized, isAuthenticated, pathname, router]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (redirectTimerRef.current) {
        window.clearTimeout(redirectTimerRef.current);
        redirectTimerRef.current = null;
      }
    };
  }, []);

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
