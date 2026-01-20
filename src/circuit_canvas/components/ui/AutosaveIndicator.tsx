import React from 'react';
import { FaCheck, FaSpinner, FaClock, FaExclamationTriangle } from 'react-icons/fa';

interface AutosaveIndicatorProps {
  status: 'idle' | 'pending' | 'saving' | 'saved' | 'error';
  lastSaved: Date | null;
  error?: string;
  className?: string;
}

export const AutosaveIndicator: React.FC<AutosaveIndicatorProps> = ({
  status,
  lastSaved,
  error,
  className = '',
}) => {
  // Don't show anything when idle
  if (status === 'idle') {
    return null;
  }

  const formatLastSaved = (date: Date) => {
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffSec = Math.floor(diffMs / 1000);
    const diffMin = Math.floor(diffSec / 60);

    if (diffSec < 10) return 'just now';
    if (diffSec < 60) return `${diffSec}s ago`;
    if (diffMin < 60) return `${diffMin}m ago`;
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const getStatusConfig = () => {
    switch (status) {
      case 'pending':
        return {
          icon: <FaClock className="text-gray-400" size={12} />,
          text: 'Pending...',
          bgColor: 'bg-gray-100',
          textColor: 'text-gray-600',
        };
      case 'saving':
        return {
          icon: <FaSpinner className="text-blue-500 animate-spin" size={12} />,
          text: 'Saving...',
          bgColor: 'bg-blue-50',
          textColor: 'text-blue-700',
        };
      case 'saved':
        return {
          icon: <FaCheck className="text-green-500" size={12} />,
          text: lastSaved ? `Saved ${formatLastSaved(lastSaved)}` : 'Saved',
          bgColor: 'bg-green-50',
          textColor: 'text-green-700',
        };
      case 'error':
        return {
          icon: <FaExclamationTriangle className="text-red-500" size={12} />,
          text: error || 'Save failed',
          bgColor: 'bg-red-50',
          textColor: 'text-red-700',
        };
      default:
        return null;
    }
  };

  const config = getStatusConfig();
  if (!config) return null;

  return (
    <div
      className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-xs font-medium transition-all duration-200 ${config.bgColor} ${config.textColor} ${className}`}
      title={error || undefined}
    >
      {config.icon}
      <span>{config.text}</span>
    </div>
  );
};
