// signalRUtils.ts - Utility functions for SignalR
import { CursorPosition, CircuitUpdate } from './signalRTypes';

/**
 * Throttle function to limit the rate of function calls
 */
export function throttle<T extends (...args: any[]) => any>(
  func: T,
  limit: number
): (...args: Parameters<T>) => void {
  let inThrottle: boolean;
  return function(this: any, ...args: Parameters<T>) {
    if (!inThrottle) {
      func.apply(this, args);
      inThrottle = true;
      setTimeout(() => (inThrottle = false), limit);
    }
  };
}

/**
 * Debounce function to delay function execution
 */
export function debounce<T extends (...args: any[]) => any>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: NodeJS.Timeout | null = null;
  return function(this: any, ...args: Parameters<T>) {
    if (timeout) clearTimeout(timeout);
    timeout = setTimeout(() => func.apply(this, args), wait);
  };
}

/**
 * Create a throttled cursor update function (recommended: 30-60fps)
 */
export const createThrottledCursorUpdate = (
  updateFn: (x: number, y: number) => void,
  fpsLimit: number = 30
) => {
  const interval = 1000 / fpsLimit;
  return throttle(updateFn, interval);
};

/**
 * Create a debounced circuit update function (recommended: 300-500ms)
 */
export const createDebouncedCircuitUpdate = (
  updateFn: (update: any) => void,
  delay: number = 300
) => {
  return debounce(updateFn, delay);
};

/**
 * Generate a unique user color based on user ID
 */
export const generateUserColor = (userId: string): string => {
  const colors = [
    '#FF6B6B', // Red
    '#4ECDC4', // Teal
    '#45B7D1', // Blue
    '#FFA07A', // Orange
    '#98D8C8', // Mint
    '#F7DC6F', // Yellow
    '#BB8FCE', // Purple
    '#85C1E2', // Sky Blue
    '#F8B739', // Gold
    '#5DADE2', // Ocean Blue
    '#58D68D', // Green
    '#EC7063', // Coral
  ];

  const hash = userId.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
  return colors[hash % colors.length];
};

/**
 * Generate initials from a user name
 */
export const getInitials = (name: string): string => {
  return name
    .split(' ')
    .map(word => word[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
};

/**
 * Format timestamp to relative time (e.g., "2 minutes ago")
 */
export const formatRelativeTime = (timestamp: number): string => {
  const now = Date.now();
  const diff = now - timestamp;
  
  const seconds = Math.floor(diff / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (days > 0) return `${days} day${days > 1 ? 's' : ''} ago`;
  if (hours > 0) return `${hours} hour${hours > 1 ? 's' : ''} ago`;
  if (minutes > 0) return `${minutes} minute${minutes > 1 ? 's' : ''} ago`;
  if (seconds > 5) return `${seconds} seconds ago`;
  return 'just now';
};

/**
 * Check if two cursor positions are significantly different
 * (to avoid unnecessary updates)
 */
export const isCursorPositionDifferent = (
  pos1: CursorPosition,
  pos2: CursorPosition,
  threshold: number = 5
): boolean => {
  const dx = Math.abs(pos1.x - pos2.x);
  const dy = Math.abs(pos1.y - pos2.y);
  return dx > threshold || dy > threshold;
};

/**
 * Validate circuit update structure
 */
export const isValidCircuitUpdate = (update: any): update is CircuitUpdate => {
  return (
    update &&
    typeof update.circuitId === 'string' &&
    typeof update.userId === 'string' &&
    typeof update.timestamp === 'number' &&
    update.changes !== undefined
  );
};

/**
 * Create a connection retry strategy
 */
export const createRetryStrategy = (
  maxRetries: number = 5,
  baseDelay: number = 1000
) => {
  let retries = 0;

  return {
    shouldRetry: () => retries < maxRetries,
    getDelay: () => {
      const delay = Math.min(baseDelay * Math.pow(2, retries), 30000);
      retries++;
      return delay;
    },
    reset: () => {
      retries = 0;
    },
  };
};

/**
 * Sanitize user input for broadcast
 */
export const sanitizeUserInput = (input: string, maxLength: number = 1000): string => {
  // Remove any HTML tags
  const sanitized = input.replace(/<[^>]*>/g, '');
  // Limit length
  return sanitized.slice(0, maxLength);
};

/**
 * Generate a unique room ID for a circuit
 */
export const generateCircuitRoomId = (circuitId: string): string => {
  return `circuit:${circuitId}`;
};

/**
 * Parse room ID to get circuit ID
 */
export const parseCircuitRoomId = (roomId: string): string | null => {
  const match = roomId.match(/^circuit:(.+)$/);
  return match ? match[1] : null;
};
