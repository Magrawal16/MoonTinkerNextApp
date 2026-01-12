"use client";
import React, { useState, useRef, useEffect } from "react";
import { FaChevronRight, FaChevronDown } from "react-icons/fa6";

interface CollapsibleToolbarProps {
  label: string;
  icon?: React.ReactNode;
  children: React.ReactNode;
  direction?: "horizontal" | "dropdown";
  className?: string;
}

/**
 * A collapsible toolbar button that expands to show tools either
 * horizontally (sliding out) or as a dropdown menu.
 */
export function CollapsibleToolbar({
  label,
  icon,
  children,
  direction = "horizontal",
  className = "",
}: CollapsibleToolbarProps) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Close when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    
    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isOpen]);

  // Close on Escape key
  useEffect(() => {
    function handleEscape(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setIsOpen(false);
      }
    }
    
    if (isOpen) {
      document.addEventListener("keydown", handleEscape);
    }
    
    return () => {
      document.removeEventListener("keydown", handleEscape);
    };
  }, [isOpen]);

  if (direction === "dropdown") {
    return (
      <div ref={containerRef} className={`relative ${className}`}>
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="flex items-center gap-1.5 px-2 py-1 bg-gray-200 rounded border border-gray-300 text-gray-800 text-xs font-medium shadow hover:bg-gray-300 hover:shadow-blue-400 hover:scale-105 transition-all duration-200"
          title={label}
        >
          {icon}
          <span>{label}</span>
          <FaChevronDown 
            size={10} 
            className={`transition-transform duration-200 ${isOpen ? "rotate-180" : ""}`}
          />
        </button>
        
        {/* Dropdown Panel */}
        <div
          className={`
            absolute top-full left-0 mt-1 z-50
            bg-white rounded-lg border border-gray-200 shadow-lg
            overflow-hidden
            transform transition-all duration-200 ease-out origin-top
            ${isOpen 
              ? "opacity-100 scale-y-100 translate-y-0" 
              : "opacity-0 scale-y-95 -translate-y-1 pointer-events-none"
            }
          `}
        >
          <div className="p-1">
            {children}
          </div>
        </div>
      </div>
    );
  }

  // Horizontal expanding toolbar
  return (
    <div ref={containerRef} className={`relative flex items-center ${className}`}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`
          flex items-center gap-1.5 px-2 py-1 
          rounded border text-xs font-medium shadow 
          transition-all duration-200 hover:shadow-blue-400 hover:scale-105
          ${isOpen 
            ? "bg-blue-100 border-blue-300 text-blue-800" 
            : "bg-gray-200 border-gray-300 text-gray-800 hover:bg-gray-300"
          }
        `}
        title={label}
      >
        {icon}
        <span>{label}</span>
        <FaChevronRight 
          size={10} 
          className={`transition-transform duration-200 ${isOpen ? "rotate-90" : ""}`}
        />
      </button>
      
      {/* Horizontal Sliding Panel */}
      <div
        className={`
          flex items-center gap-1 ml-1 overflow-hidden
          transition-all duration-300 ease-out
          ${isOpen 
            ? "max-w-[500px] opacity-100" 
            : "max-w-0 opacity-0"
          }
        `}
      >
        <div className="flex items-center gap-1 px-2 py-1 bg-gray-50 rounded-lg border border-gray-200">
          {children}
        </div>
      </div>
    </div>
  );
}

/**
 * A dropdown menu item for use inside CollapsibleToolbar with direction="dropdown"
 */
interface DropdownItemProps {
  icon?: React.ReactNode;
  label: string;
  onClick: () => void;
  className?: string;
  disabled?: boolean;
}

export function DropdownItem({ 
  icon, 
  label, 
  onClick, 
  className = "",
  disabled = false 
}: DropdownItemProps) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`
        w-full flex items-center gap-1.5 px-2 py-1 
        text-left text-xs text-gray-700
        rounded-md transition-colors duration-150
        ${disabled 
          ? "opacity-50 cursor-not-allowed" 
          : "hover:bg-gray-100 active:bg-gray-200"
        }
        ${className}
      `}
    >
      {icon && <span className="text-gray-500">{icon}</span>}
      <span>{label}</span>
    </button>
  );
}

/**
 * A toolbar button for use inside horizontal CollapsibleToolbar
 */
interface ToolButtonProps {
  icon: React.ReactNode;
  title: string;
  onClick: () => void;
  disabled?: boolean;
  className?: string;
}

export function ToolButton({ 
  icon, 
  title, 
  onClick, 
  disabled = false,
  className = "" 
}: ToolButtonProps) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`
        p-1.5 rounded transition-all duration-150
        ${disabled 
          ? "opacity-50 cursor-not-allowed bg-gray-100" 
          : "bg-white hover:bg-gray-200 active:scale-95 shadow-sm border border-gray-200"
        }
        ${className}
      `}
      title={title}
    >
      {icon}
    </button>
  );
}
