// CollaborationToast.tsx - Toast notifications for user join/leave events
'use client';

import React, { useEffect, useState } from 'react';

export interface ToastMessage {
  id: string;
  type: 'join' | 'leave';
  userName: string;
  color?: string;
  timestamp: number;
}

interface CollaborationToastProps {
  messages: ToastMessage[];
  onDismiss: (id: string) => void;
  duration?: number; // Auto-dismiss duration in ms
}

export const CollaborationToast: React.FC<CollaborationToastProps> = ({
  messages,
  onDismiss,
  duration = 4000,
}) => {
  // Auto-dismiss after duration
  useEffect(() => {
    messages.forEach((msg) => {
      const timeout = setTimeout(() => {
        onDismiss(msg.id);
      }, duration);
      
      return () => clearTimeout(timeout);
    });
  }, [messages, duration, onDismiss]);

  if (messages.length === 0) return null;

  return (
    <div className="fixed top-4 right-4 z-[9999] flex flex-col gap-2 pointer-events-none">
      {messages.map((msg) => (
        <ToastItem key={msg.id} message={msg} onDismiss={onDismiss} />
      ))}
    </div>
  );
};

interface ToastItemProps {
  message: ToastMessage;
  onDismiss: (id: string) => void;
}

const ToastItem: React.FC<ToastItemProps> = ({ message, onDismiss }) => {
  const [isVisible, setIsVisible] = useState(false);
  const [isExiting, setIsExiting] = useState(false);

  useEffect(() => {
    // Trigger enter animation
    requestAnimationFrame(() => {
      setIsVisible(true);
    });

    // Trigger exit animation before dismiss
    const exitTimeout = setTimeout(() => {
      setIsExiting(true);
    }, 3500);

    return () => clearTimeout(exitTimeout);
  }, []);

  const isJoin = message.type === 'join';
  const icon = isJoin ? (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
    </svg>
  ) : (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
    </svg>
  );

  return (
    <div
      className={`
        pointer-events-auto flex items-center gap-3 px-4 py-3 rounded-lg shadow-lg
        transform transition-all duration-300 ease-out min-w-[280px] max-w-[400px]
        ${isJoin ? 'bg-green-50 border border-green-200' : 'bg-orange-50 border border-orange-200'}
        ${isVisible && !isExiting ? 'translate-x-0 opacity-100' : 'translate-x-full opacity-0'}
      `}
    >
      {/* User color indicator */}
      <div
        className="w-3 h-3 rounded-full flex-shrink-0"
        style={{ backgroundColor: message.color || (isJoin ? '#22c55e' : '#f97316') }}
      />
      
      {/* Icon */}
      <div className={`flex-shrink-0 ${isJoin ? 'text-green-600' : 'text-orange-600'}`}>
        {icon}
      </div>
      
      {/* Message */}
      <div className="flex-1 min-w-0">
        <p className={`text-sm font-medium ${isJoin ? 'text-green-800' : 'text-orange-800'}`}>
          {message.userName}
        </p>
        <p className={`text-xs ${isJoin ? 'text-green-600' : 'text-orange-600'}`}>
          {isJoin ? 'joined the circuit' : 'left the circuit'}
        </p>
      </div>
      
      {/* Close button */}
      <button
        onClick={() => onDismiss(message.id)}
        className={`
          flex-shrink-0 p-1 rounded-full transition-colors
          ${isJoin ? 'hover:bg-green-200 text-green-600' : 'hover:bg-orange-200 text-orange-600'}
        `}
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>
    </div>
  );
};

export default CollaborationToast;
