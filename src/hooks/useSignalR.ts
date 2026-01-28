// useSignalR.ts - React hook for SignalR connection
'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { 
  SignalRConnection, 
  getSignalRConnection, 
  CircuitUpdate, 
  UserPresence,
  CursorPosition,
  ElementSelection,
  SimulationState
} from '@/lib/signalr/signalRConnection';

export interface UseSignalROptions {
  autoConnect?: boolean;
  circuitId?: string;
  userId?: string;
  userName?: string;
  /** Callback when a user joins the circuit */
  onUserJoined?: (user: UserPresence) => void;
  /** Callback when a user leaves the circuit */
  onUserLeft?: (user: { userId: string; userName: string; sessionId?: string; color?: string }) => void;
}

export interface UseSignalRReturn {
  isConnected: boolean;
  isConnecting: boolean;
  error: Error | null;
  connection: SignalRConnection | null;
  connect: () => Promise<void>;
  disconnect: () => void;
  joinCircuit: (circuitId: string, userId: string, userName: string) => void;
  leaveCircuit: (circuitId: string, userId: string) => void;
  updateCircuit: (update: CircuitUpdate) => void;
  updateCursor: (circuitId: string, userId: string, x: number, y: number) => void;
  selectElement: (circuitId: string, userId: string, elementId: string | null) => void;
  updateSimulation: (circuitId: string, isRunning: boolean) => void;
  usersInCircuit: UserPresence[];
  activeCursors: Map<string, CursorPosition>;
  activeSelections: Map<string, ElementSelection>;
  simulationState: SimulationState | null;
}

export const useSignalR = (options: UseSignalROptions = {}): UseSignalRReturn => {
  const { autoConnect = false, circuitId, userId, userName, onUserJoined, onUserLeft } = options;

  const [isConnected, setIsConnected] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [usersInCircuit, setUsersInCircuit] = useState<UserPresence[]>([]);
  const [activeCursors, setActiveCursors] = useState<Map<string, CursorPosition>>(new Map());
  const [activeSelections, setActiveSelections] = useState<Map<string, ElementSelection>>(new Map());
  const [simulationState, setSimulationState] = useState<SimulationState | null>(null);

  const connectionRef = useRef<SignalRConnection | null>(null);
  const hasJoinedCircuit = useRef(false);

  // Initialize connection
  useEffect(() => {
    connectionRef.current = getSignalRConnection();
  }, []);

  // Connect function
  const connect = useCallback(async () => {
    if (!connectionRef.current || isConnected || isConnecting) return;

    setIsConnecting(true);
    setError(null);

    try {
      await connectionRef.current.connect();
      setIsConnected(true);
      setIsConnecting(false);
    } catch (err) {
      setError(err as Error);
      setIsConnecting(false);
      setIsConnected(false);
    }
  }, [isConnected, isConnecting]);

  // Disconnect function
  const disconnect = useCallback(() => {
    if (!connectionRef.current) return;

    if (hasJoinedCircuit.current && circuitId && userId) {
      connectionRef.current.leaveCircuit(circuitId, userId);
      hasJoinedCircuit.current = false;
    }

    connectionRef.current.disconnect();
    setIsConnected(false);
    setUsersInCircuit([]);
    setActiveCursors(new Map());
    setActiveSelections(new Map());
    setSimulationState(null);
  }, [circuitId, userId]);

  // Join circuit function
  const joinCircuit = useCallback((cId: string, uId: string, uName: string) => {
    if (!connectionRef.current || !isConnected) return;

    connectionRef.current.joinCircuit(cId, uId, uName);
    hasJoinedCircuit.current = true;
  }, [isConnected]);

  // Leave circuit function
  const leaveCircuit = useCallback((cId: string, uId: string) => {
    if (!connectionRef.current || !isConnected) return;

    connectionRef.current.leaveCircuit(cId, uId);
    hasJoinedCircuit.current = false;
  }, [isConnected]);

  // Update circuit function
  const updateCircuit = useCallback((update: CircuitUpdate) => {
    if (!connectionRef.current || !isConnected) return;
    connectionRef.current.updateCircuit(update);
  }, [isConnected]);

  // Update cursor function
  const updateCursor = useCallback((cId: string, uId: string, x: number, y: number) => {
    if (!connectionRef.current || !isConnected) return;
    connectionRef.current.updateCursor(cId, uId, x, y);
  }, [isConnected]);

  // Select element function
  const selectElement = useCallback((cId: string, uId: string, elementId: string | null) => {
    if (!connectionRef.current || !isConnected) return;
    connectionRef.current.selectElement(cId, uId, elementId);
  }, [isConnected]);

  // Update simulation function
  const updateSimulation = useCallback((cId: string, isRunning: boolean) => {
    if (!connectionRef.current || !isConnected) return;
    connectionRef.current.updateSimulation(cId, isRunning);
  }, [isConnected]);

  // Store callbacks in refs to avoid stale closures
  const onUserJoinedRef = useRef(onUserJoined);
  const onUserLeftRef = useRef(onUserLeft);
  
  useEffect(() => {
    onUserJoinedRef.current = onUserJoined;
    onUserLeftRef.current = onUserLeft;
  }, [onUserJoined, onUserLeft]);

  // Setup event listeners
  useEffect(() => {
    const connection = connectionRef.current;
    if (!connection || !isConnected) return;

    // User joined handler
    const handleUserJoined = (user: UserPresence) => {
      setUsersInCircuit((prev) => [...prev, user]);
    };

    // User left handler
    const handleUserLeft = (data: { userId: string; userName: string; sessionId?: string; color?: string }) => {
      setUsersInCircuit((prev) => {
        let filtered;
        if (data.sessionId) {
          filtered = prev.filter((u) => u.sessionId !== data.sessionId);
        } else {
          filtered = prev.filter((u) => u.userId !== data.userId);
        }
        return filtered;
      });
      setActiveCursors((prev) => {
        const newMap = new Map(prev);
        newMap.delete(data.sessionId || data.userId);
        return newMap;
      });
      setActiveSelections((prev) => {
        const newMap = new Map(prev);
        newMap.delete(data.sessionId || data.userId);
        return newMap;
      });
    };

    // Users in circuit handler
    const handleUsersInCircuit = (users: UserPresence[]) => {
      setUsersInCircuit(users);
    };

    // Circuit updated handler
    const handleCircuitUpdated = (update: CircuitUpdate) => {
      // This will be handled by the consuming component
      // You can add a callback prop if needed
    };

    // Cursor moved handler
    const handleCursorMoved = (cursor: CursorPosition) => {
      setActiveCursors((prev) => new Map(prev).set(cursor.userId, cursor));
    };

    // Element selected handler
    const handleElementSelected = (selection: ElementSelection) => {
      setActiveSelections((prev) => new Map(prev).set(selection.userId, selection));
    };

    // Simulation state changed handler
    const handleSimulationStateChanged = (state: SimulationState) => {
      setSimulationState(state);
    };

    // Register event listeners
    connection.onUserJoined(handleUserJoined);
    connection.onUserLeft(handleUserLeft);
    connection.onUsersInCircuit(handleUsersInCircuit);
    connection.onCircuitUpdated(handleCircuitUpdated);
    connection.onCursorMoved(handleCursorMoved);
    connection.onElementSelected(handleElementSelected);
    connection.onSimulationStateChanged(handleSimulationStateChanged);

    // Cleanup
    return () => {
      connection.offUserJoined(handleUserJoined);
      connection.offUserLeft(handleUserLeft);
      connection.offUsersInCircuit(handleUsersInCircuit);
      connection.offCircuitUpdated(handleCircuitUpdated);
      connection.offCursorMoved(handleCursorMoved);
      connection.offElementSelected(handleElementSelected);
      connection.offSimulationStateChanged(handleSimulationStateChanged);
    };
  }, [isConnected]);

  // Auto-connect
  useEffect(() => {
    if (autoConnect && !isConnected && !isConnecting) {
      connect();
    }
  }, [autoConnect, isConnected, isConnecting, connect]);

  // Auto-join circuit
  useEffect(() => {
    if (isConnected && circuitId && userId && userName && !hasJoinedCircuit.current) {
      joinCircuit(circuitId, userId, userName);
    }
  }, [isConnected, circuitId, userId, userName, joinCircuit]);

  // Cleanup on unmount and page unload/reload
  useEffect(() => {
    const handleBeforeUnload = () => {
      // Synchronously leave circuit before page unloads
      if (hasJoinedCircuit.current && circuitId && userId && connectionRef.current) {
        connectionRef.current.leaveCircuit(circuitId, userId);
        hasJoinedCircuit.current = false;
      }
    };

    // Listen for page unload (reload, close, navigate away)
    window.addEventListener('beforeunload', handleBeforeUnload);

    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
      // Also leave on component unmount
      if (hasJoinedCircuit.current && circuitId && userId && connectionRef.current) {
        connectionRef.current.leaveCircuit(circuitId, userId);
        hasJoinedCircuit.current = false;
      }
    };
  }, [circuitId, userId]);

  return {
    isConnected,
    isConnecting,
    error,
    connection: connectionRef.current,
    connect,
    disconnect,
    joinCircuit,
    leaveCircuit,
    updateCircuit,
    updateCursor,
    selectElement,
    updateSimulation,
    usersInCircuit,
    activeCursors,
    activeSelections,
    simulationState
  };
};
