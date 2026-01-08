"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/hooks/useAuth";
import Image from "next/image";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const emailRef = React.useRef<HTMLInputElement>(null);
  const passwordRef = React.useRef<HTMLInputElement>(null);
  const router = useRouter();
  const auth = useAuth();

  // Auto-focus email field on mount
  React.useEffect(() => {
    emailRef.current?.focus();
  }, []);

  // Auto-focus is retained without keyboard shortcuts

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      if (!email || !password) {
        setError("Please enter email and password.");
        setLoading(false);
        return;
      }

      const ok = await auth.login(email.trim(), password);
      if (ok) {
        if (rememberMe) {
          try {
            localStorage.setItem("mt:remember", "1");
            localStorage.setItem("mt:email", email);
          } catch (e) {
            // Ignore storage errors
          }
        }
        router.push("/");
      } else {
        setError("Invalid credentials.");
      }
    } catch (e) {
      setError("An unexpected error occurred.");
    } finally {
      setLoading(false);
    }
  };

  // Load remembered email
  React.useEffect(() => {
    try {
      const remembered = localStorage.getItem("mt:remember");
      const savedEmail = localStorage.getItem("mt:email");
      if (remembered === "1" && savedEmail) {
        setEmail(savedEmail);
        setRememberMe(true);
      }
    } catch (e) {
      // Ignore storage errors
    }
  }, []);

  return (
    <div className="login-page" style={{
      display: "flex",
      justifyContent: "center",
      alignItems: "center",
      padding: 24,
    }}>
      <div style={{
        background: "white",
        borderRadius: 16,
        boxShadow: "0 4px 24px rgba(0, 0, 0, 0.1)",
        padding: "32px 40px",
        width: "100%",
        maxWidth: 400,
      }}>
        <div style={{ 
          display: "flex", 
          flexDirection: "column", 
          alignItems: "center", 
          marginBottom: 32 
        }}>
          <Image
            src="/assets/common/moonpreneur_logo.svg"
            alt="Moonpreneur Logo"
            width={200}
            height={48}
            priority={true} // Prevents logo bounce during load
            style={{ marginBottom: 24 }}
          />
        </div>

        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: 24 }}>
            <label style={{ 
              display: "block", 
              fontSize: 14, 
              fontWeight: 500, 
              color: "#374151",
              marginBottom: 8 
            }}>
              Email address
            </label>
            <input
              ref={emailRef}
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  passwordRef.current?.focus();
                  e.preventDefault();
                }
              }}
              placeholder="Enter your email"
              style={{
                width: "100%",
                padding: "12px 16px",
                border: "1px solid #e5e7eb",
                borderRadius: 8,
                fontSize: 14,
                outline: "none",
                transition: "all 0.2s ease",
                backgroundColor: "#fff",
                boxShadow: "0 1px 2px rgba(0, 0, 0, 0.05)",
              }}
              required
            />
          </div>

          <div style={{ marginBottom: error ? 16 : 24 }}>
            <label style={{ 
              display: "block", 
              fontSize: 14, 
              fontWeight: 500, 
              color: "#374151",
              marginBottom: 8 
            }}>
              Password
            </label>
            <div style={{ position: "relative" }}>
              <input
                ref={passwordRef}
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !loading) {
                    e.currentTarget.form?.requestSubmit();
                  }
                }}
                placeholder="Enter your password"
                style={{
                  width: "100%",
                  padding: "12px 16px",
                  paddingRight: "44px",
                  border: "1px solid #e5e7eb",
                  borderRadius: 8,
                  fontSize: 14,
                  outline: "none",
                  transition: "all 0.2s ease",
                  backgroundColor: "#fff",
                  boxShadow: "0 1px 2px rgba(0, 0, 0, 0.05)",
                }}
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                style={{
                  position: "absolute",
                  right: 12,
                  top: "50%",
                  transform: "translateY(-50%)",
                  background: "none",
                  border: "none",
                  padding: 4,
                  cursor: "pointer",
                  color: "#6b7280"
                }}
                title={showPassword ? "Hide password" : "Show password"}
              >
                {showPassword ? (
                  <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                    <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
                    <line x1="1" y1="1" x2="23" y2="23" />
                  </svg>
                ) : (
                  <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                    <circle cx="12" cy="12" r="3" />
                  </svg>
                )}
              </button>
            </div>
          </div>
          {error && (
            <div style={{ 
              color: "#dc2626", 
              fontSize: 14,
              marginBottom: 24,
              padding: "8px 12px",
              backgroundColor: "#fef2f2",
              borderRadius: 6,
              border: "1px solid #fee2e2",
              display: "flex",
              alignItems: "center",
              gap: 8
            }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="10" />
                <line x1="12" y1="8" x2="12" y2="12" />
                <line x1="12" y1="16" x2="12.01" y2="16" />
              </svg>
              {error}
            </div>
          )}

          <div style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            marginBottom: 24
          }}>
            <label style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              cursor: "pointer",
              userSelect: "none"
            }}>
              <input
                type="checkbox"
                checked={rememberMe}
                onChange={(e) => setRememberMe(e.target.checked)}
                style={{ 
                  cursor: "pointer",
                  width: 16,
                  height: 16,
                  borderRadius: 4
                }}
              />
              <span style={{ fontSize: 14, color: "#374151" }}>
                Remember me
                <kbd style={{ 
                  marginLeft: 8,
                  padding: "1px 4px",
                  fontSize: 11,
                  color: "#6b7280",
                  background: "#f3f4f6",
                  borderRadius: 4,
                  border: "1px solid #e5e7eb"
                }}>Alt + R</kbd>
              </span>
            </label>
          </div>

          <button
            type="submit"
            disabled={loading}
            style={{
              width: "100%",
              padding: "12px 20px",
              backgroundColor: "#2563eb",
              color: "white",
              border: "none",
              borderRadius: 8,
              fontSize: 14,
              fontWeight: 500,
              cursor: loading ? "wait" : "pointer",
              transition: "background-color 0.2s",
              opacity: loading ? 0.7 : 1,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 8
            }}
          >
            {loading ? (
              <>
                <svg className="animate-spin" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="12" cy="12" r="10" strokeDasharray="42" strokeLinecap="round" />
                </svg>
                Signing in...
              </>
            ) : (
              "Sign in"
            )}
          </button>

          <div style={{ 
              fontSize: 13, 
              color: "#6b7280",
              textAlign: "center",
              marginTop: 24 
            }}>
            Please contact your administrator for login credentials.
          </div>
        </form>
      </div>
    </div>
  );
}
