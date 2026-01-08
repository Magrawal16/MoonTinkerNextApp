"use client";

import React, { createContext, useCallback, useEffect, useState } from "react";

type AuthContextType = {
  isAuthenticated: boolean;
  userEmail?: string | null;
  initialized: boolean;
  login: (email: string, password: string) => Promise<boolean>;
  logout: () => void;
};

// Store only SHA-256 hashes (hex) of credentials in the bundle.
// These were computed offline and embedded here so the plaintext is not present
// in the client code. Note: this is still client-side only and can be inspected
// by an attacker, but it's better than keeping plaintext credentials.
const AUTH_EMAIL_HASH =
  "8d67a51449ff17be99a7a557abb06baeee86b491272ce1eff71ed1aa0d431ba9";
const AUTH_PASSWORD_HASH =
  "df5c9730e148062ac3d5f069609832d406ec0e326b5c4ed12445b548b0f247a0";

export const AuthContext = createContext<AuthContextType>({
  isAuthenticated: false,
  userEmail: null,
  initialized: false,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  login: async () => false,
  logout: () => {},
});

const STORAGE_KEY = "mt:auth";
const STORAGE_USER = "mt:user";

export const AuthProvider: React.FC<React.PropsWithChildren<{}>> = ({
  children,
}) => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [initialized, setInitialized] = useState(false);

  useEffect(() => {
    try {
      const stored = sessionStorage.getItem(STORAGE_KEY);
      const user = sessionStorage.getItem(STORAGE_USER);
      if (stored === "1") {
        setIsAuthenticated(true);
        setUserEmail(user);
      }
      // mark that we finished checking storage
      setInitialized(true);
    } catch (e) {
      // sessionStorage might not be available during SSR — ignore
      setInitialized(true);
    }
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    // Frontend-only: hash the provided credentials (using SubtleCrypto) and
    // compare to the stored hashes. We normalize the email to lower-case.
    try {
      const encoder = new TextEncoder();
      const bufE = encoder.encode((email || "").trim().toLowerCase());
      const bufP = encoder.encode(password || "");
      const digestE = await crypto.subtle.digest("SHA-256", bufE);
      const digestP = await crypto.subtle.digest("SHA-256", bufP);
      const hex = (buf: ArrayBuffer) =>
        Array.from(new Uint8Array(buf))
          .map((b) => b.toString(16).padStart(2, "0"))
          .join("");

      const emailHash = hex(digestE);
      const passHash = hex(digestP);

      if (emailHash === AUTH_EMAIL_HASH && passHash === AUTH_PASSWORD_HASH) {
        try {
          sessionStorage.setItem(STORAGE_KEY, "1");
          // store a display label only; do not persist the real email
          sessionStorage.setItem(STORAGE_USER, "admin");
        } catch (e) {
          // ignore storage errors
        }
        setIsAuthenticated(true);
        setUserEmail("admin");
        return true;
      }
    } catch (e) {
      // If Web Crypto fails for some reason, fall through to return false
    }
    return false;
  }, []);

  const logout = useCallback(() => {
    try {
      sessionStorage.removeItem(STORAGE_KEY);
      sessionStorage.removeItem(STORAGE_USER);
    } catch (e) {
      // ignore
    }
    setIsAuthenticated(false);
    setUserEmail(null);
  }, []);

  const ctx: AuthContextType = {
    isAuthenticated,
    userEmail,
    initialized,
    login,
    logout,
  };

  return <AuthContext.Provider value={ctx}>{children}</AuthContext.Provider>;
};

export default AuthProvider;
