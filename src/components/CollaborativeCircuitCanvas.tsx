// CollaborativeCircuitCanvas.tsx - Example component using SignalR
'use client';

import React, { useEffect, useRef } from 'react';
import { useSignalR } from '@/hooks/useSignalR';
import { CircuitUpdate } from '@/lib/signalr/signalRConnection';

interface CollaborativeCircuitCanvasProps {
  circuitId: string;
  userId: string;
  userName: string;
}

export const CollaborativeCircuitCanvas: React.FC<CollaborativeCircuitCanvasProps> = ({
  circuitId,
  userId,
  userName
}) => {
  const {
    isConnected,
    isConnecting,
    error,
    usersInCircuit,
    activeCursors,
    activeSelections,
    updateCircuit,
    updateCursor,
    selectElement
  } = useSignalR({
    autoConnect: true,
    circuitId,
    userId,
    userName
  });

  const canvasRef = useRef<HTMLDivElement>(null);

  // Handle mouse move for cursor tracking
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !isConnected) return;

    const handleMouseMove = (e: MouseEvent) => {
      const rect = canvas.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      
      updateCursor(circuitId, userId, x, y);
    };

    canvas.addEventListener('mousemove', handleMouseMove);
    return () => canvas.removeEventListener('mousemove', handleMouseMove);
  }, [isConnected, circuitId, userId, updateCursor]);

  // Handle circuit changes
  const handleCircuitChange = (changes: any) => {
    if (!isConnected) return;

    const update: CircuitUpdate = {
      circuitId,
      userId,
      timestamp: Date.now(),
      changes
    };

    updateCircuit(update);
  };

  return (
    <div className="relative w-full h-full">
      {/* Connection status */}
      <div className="absolute top-4 right-4 z-50 flex items-center gap-2 bg-white/90 backdrop-blur px-4 py-2 rounded-lg shadow-lg">
        <div className={`w-2 h-2 rounded-full ${
          isConnected ? 'bg-green-500' : isConnecting ? 'bg-yellow-500 animate-pulse' : 'bg-red-500'
        }`} />
        <span className="text-sm font-medium">
          {isConnected ? 'Connected' : isConnecting ? 'Connecting...' : 'Disconnected'}
        </span>
        {error && (
          <span className="text-xs text-red-600">Error: {error.message}</span>
        )}
      </div>

      {/* Active users */}
      <div className="absolute top-4 left-4 z-50 bg-white/90 backdrop-blur px-4 py-2 rounded-lg shadow-lg">
        <div className="text-sm font-medium mb-2">Active Users ({usersInCircuit.length})</div>
        <div className="space-y-1">
          {usersInCircuit.map((user) => (
            <div key={user.userId} className="flex items-center gap-2">
              <div 
                className="w-3 h-3 rounded-full" 
                style={{ backgroundColor: user.color }}
              />
              <span className="text-xs">{user.userName}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Canvas area */}
      <div 
        ref={canvasRef}
        className="w-full h-full bg-gray-50 relative"
      >
        {/* Your circuit canvas content here */}
        
        {/* Render other users' cursors */}
        {Array.from(activeCursors.entries()).map(([uid, cursor]) => {
          if (uid === userId) return null;
          
          const user = usersInCircuit.find((u) => u.userId === uid);
          
          return (
            <div
              key={uid}
              className="absolute pointer-events-none transition-all duration-100"
              style={{
                left: cursor.x,
                top: cursor.y,
                transform: 'translate(-50%, -50%)'
              }}
            >
              <svg 
                width="24" 
                height="24" 
                viewBox="0 0 24 24" 
                fill={user?.color || '#000'}
              >
                <path d="M3 3L10.07 19.97L12.58 12.58L19.97 10.07L3 3Z" />
              </svg>
              {user && (
                <div 
                  className="absolute left-6 top-0 text-xs whitespace-nowrap px-2 py-1 rounded shadow-lg"
                  style={{ 
                    backgroundColor: user.color,
                    color: '#fff'
                  }}
                >
                  {user.userName}
                </div>
              )}
            </div>
          );
        })}

        {/* Render selection indicators */}
        {Array.from(activeSelections.entries()).map(([uid, selection]) => {
          if (uid === userId || !selection.elementId) return null;
          
          const user = usersInCircuit.find((u) => u.userId === uid);
          
          return (
            <div
              key={uid}
              className="absolute border-2 pointer-events-none"
              style={{
                borderColor: user?.color || '#000',
                // Position based on selected element (you'll need to implement this)
              }}
            >
              <div 
                className="absolute -top-6 left-0 text-xs px-2 py-1 rounded"
                style={{ 
                  backgroundColor: user?.color,
                  color: '#fff'
                }}
              >
                {user?.userName} is editing
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
