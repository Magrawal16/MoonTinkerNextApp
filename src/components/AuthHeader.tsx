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

  // For inline mode we prefer stable Tailwind utility classes (global stylesheet)
  // so HMR of CSS modules can’t momentarily “unstylize” the control.
  const wrapperClass = inline
    ? "inline-flex items-center gap-2"
    : styles.headerContainer;
  const innerClass = inline
    ? "inline-flex items-center gap-2"
    : styles.inlineWrapperInner;
  const profileIconClass = inline
    ? "w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center text-white flex-shrink-0"
    : styles.profileIcon;
  const chevronBtnClass = inline
    ? "w-8 h-8 inline-flex items-center justify-center bg-white border border-gray-200 rounded-lg cursor-pointer"
    : styles.chevronButton;
  const dropdownInlineClass =
    "absolute top-full right-0 mt-2 bg-white rounded-lg shadow-lg py-2 min-w-[180px] z-[10000]";
  const dropdownHeaderClass =
    "px-4 py-2 text-[13px] text-gray-500 border-b border-gray-100 whitespace-nowrap";
  const signOutBtnClass =
    "w-full px-4 py-2 flex items-center gap-2 bg-transparent text-red-600 text-[13px] text-left hover:bg-red-50";

  return (
    <div className={wrapperClass}>
      {auth.isAuthenticated ? (
        <div ref={dropdownRef} style={{ position: 'relative' }}>
          <div className={innerClass}>
            <div className={profileIconClass} aria-hidden>
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
              className={chevronBtnClass}
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
            <div
              className={inline ? dropdownInlineClass : styles.dropdown}
            >
              <div className={inline ? dropdownHeaderClass : styles.dropdownHeader}>
                <div>Signed in as: <strong>{auth.userEmail ? auth.userEmail.split('@')[0].charAt(0).toUpperCase() + auth.userEmail.split('@')[0].slice(1) : 'User'}</strong></div>
                {auth.role && (
                  <div style={{ marginTop: 4, fontSize: '12px', color: '#6b7280' }}>
                    Role: <strong>{auth.role.charAt(0).toUpperCase() + auth.role.slice(1)}</strong>
                  </div>
                )}
              </div>
              <button
                onClick={handleSignOut}
                className={inline ? signOutBtnClass : styles.signOutButton}
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
