"use client";

import React, { createContext, useCallback, useEffect, useState } from "react";

type AuthContextType = {
  isAuthenticated: boolean;
  userEmail?: string | null;
  role?: string | null;
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
const STORAGE_ROLE = "mt:role";

export const AuthProvider: React.FC<React.PropsWithChildren<{}>> = ({
  children,
}) => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [role, setRole] = useState<string | null>(null);
  const [initialized, setInitialized] = useState(false);

  useEffect(() => {
    try {
      const stored = sessionStorage.getItem(STORAGE_KEY);
      const user = sessionStorage.getItem(STORAGE_USER);
      const storedRole = sessionStorage.getItem(STORAGE_ROLE);
      if (stored === "1") {
        setIsAuthenticated(true);
        setUserEmail(user);
        setRole(storedRole);
      }
      // mark that we finished checking storage
      setInitialized(true);
    } catch (e) {
      // sessionStorage might not be available during SSR — ignore
      setInitialized(true);
    }
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    // Call the same-origin proxy which injects the required security-key
    // and forwards to the external login API. Payload matches Postman screenshot.
    const payload = {
      userName: (email || "").trim(),
      password: password || "",
      rememberMe: false,
      login_from: "moontinker",
      isParent: false,
    };

    try {
      const res = await fetch(`/api/account/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const text = await res.text().catch(() => "");
      let json: any = null;
      try {
        json = text ? JSON.parse(text) : null;
      } catch (e) {
        // upstream returned non-JSON
      }

      if (!res.ok) {
        console.error('[auth] login failed', res.status, json || text);
        return false;
      }

      // Accept a few possible upstream shapes:
      //  - { nErrorNumber: 0, Data: { ... } }
      //  - { errorNumber: 0, Data: { ... } }
      //  - { success: true, data: { ... } }
      const data = json?.Data || json?.data || null;
      const ok1 = json && (json.nErrorNumber === 0 || json.errorNumber === 0 || json.success === true);
      if (ok1 && data) {
        try {
          sessionStorage.setItem(STORAGE_KEY, "1");
          sessionStorage.setItem(STORAGE_USER, data.email || data.user_id || payload.userName || "user");
          if (data.role) sessionStorage.setItem(STORAGE_ROLE, data.role);
        } catch (e) {
          // ignore storage errors
        }
        setIsAuthenticated(true);
        setUserEmail(data.email || data.user_id || payload.userName || "user");
        setRole(data.role || null);
        return true;
      }

      console.error('[auth] login response did not indicate success', json || text);
    } catch (e) {
      console.error('[auth] login error', e);
    }
    return false;
  }, []);

  const logout = useCallback(() => {
    try {
      sessionStorage.removeItem(STORAGE_KEY);
      sessionStorage.removeItem(STORAGE_USER);
      sessionStorage.removeItem(STORAGE_ROLE);
    } catch (e) {
      // ignore
    }
    setIsAuthenticated(false);
    setUserEmail(null);
    setRole(null);
  }, []);

  const ctx: AuthContextType = {
    isAuthenticated,
    userEmail,
    role,
    initialized,
    login,
    logout,
  };

  return <AuthContext.Provider value={ctx}>{children}</AuthContext.Provider>;
};

export default AuthProvider;
