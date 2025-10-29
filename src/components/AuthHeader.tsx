"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import React, { useState, useRef, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import styles from "./AuthHeader.module.css";

export const AuthHeader: React.FC<{ inline?: boolean }> = ({ inline = false }) => {
  const auth = useAuth();
  const router = useRouter();
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [isProfileHovered, setIsProfileHovered] = useState(false);
  const [isSignOutHovered, setIsSignOutHovered] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const handleSignOut = () => {
    auth.logout();
    router.push("/");
    setIsDropdownOpen(false);
  };

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const wrapperClass = inline ? styles.inlineWrapper : styles.headerContainer;

  return (
    <div className={wrapperClass}>
      {auth.isAuthenticated ? (
        <div ref={dropdownRef} style={{ position: 'relative' }}>
          <div className={styles.inlineWrapperInner}>
            <div className={styles.profileIcon} aria-hidden>
              <svg 
                width="16" 
                height="16" 
                viewBox="0 0 24 24" 
                fill="none" 
                stroke="currentColor" 
                strokeWidth="2"
              >
                <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                <circle cx="12" cy="7" r="4" />
              </svg>
            </div>

            <button
              onClick={() => setIsDropdownOpen(!isDropdownOpen)}
              aria-expanded={isDropdownOpen}
              aria-label="Open user menu"
              className={styles.chevronButton}
            >
              <svg
                width="12"
                height="12"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                style={{
                  transform: isDropdownOpen ? 'rotate(180deg)' : 'rotate(0)',
                  transition: 'transform 0.15s'
                }}
              >
                <polyline points="6 9 12 15 18 9" />
              </svg>
            </button>
          </div>

          {isDropdownOpen && (
            <div className={inline ? styles.dropdownInline : styles.dropdown}>
              <div className={styles.dropdownHeader}>
                Signed in as <strong>{auth.userEmail}</strong>
              </div>
              <button
                onClick={handleSignOut}
                className={styles.signOutButton}
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                  <polyline points="16 17 21 12 16 7" />
                  <line x1="21" y1="12" x2="9" y2="12" />
                </svg>
                Sign out
              </button>
            </div>
          )}
        </div>
      ) : (
        <Link 
          href="/login"
          className={styles.signInLink}
        >
          Sign in
        </Link>
      )}
    </div>
  );
};

export default AuthHeader;
