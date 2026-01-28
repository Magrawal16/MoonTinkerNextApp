// signalRTypes.ts - Shared TypeScript types for SignalR
export interface CircuitUpdate {
  circuitId: string;
  userId: string;
  sessionId?: string; // Unique session identifier
  timestamp: number;
  changes: CircuitChange;
}

export type CircuitChange =
  | { type: 'ELEMENT_ADDED'; element: any }
  | { type: 'ELEMENT_REMOVED'; elementId: string }
  | { type: 'ELEMENT_MOVED'; elementId: string; position: { x: number; y: number } }
  | { type: 'ELEMENT_ROTATED'; elementId: string; rotation: number }
  | { type: 'ELEMENT_UPDATED'; elementId: string; properties: any }
  | { type: 'WIRE_ADDED'; wire: any }
  | { type: 'WIRE_REMOVED'; wireId: string }
  | { type: 'CIRCUIT_CLEARED' }
  | { type: 'XML_UPDATED'; controllerId: string; xml: string }
  | { type: 'SIMULATION_STARTED' }
  | { type: 'SIMULATION_STOPPED' }
  | { type: 'UNDO' }
  | { type: 'REDO' };

export interface UserPresence {
  userId: string;
  sessionId: string;
  userName: string;
  circuitId: string;
  color?: string;
  joinedAt?: number;
}

export interface CursorPosition {
  userId: string;
  x: number;
  y: number;
  timestamp?: number;
}

export interface ElementSelection {
  userId: string;
  elementId: string | null;
  timestamp?: number;
}

export interface SimulationState {
  isRunning: boolean;
  startedBy?: string;
  timestamp?: number;
}

export interface ChatMessage {
  userId: string;
  userName: string;
  message: string;
  timestamp: number;
}

// Event names as constants to prevent typos
export const SignalREvents = {
  // Client to Server
  JOIN_CIRCUIT: 'JoinCircuit',
  LEAVE_CIRCUIT: 'LeaveCircuit',
  UPDATE_CIRCUIT: 'UpdateCircuit',
  UPDATE_CURSOR: 'UpdateCursor',
  SELECT_ELEMENT: 'SelectElement',
  UPDATE_SIMULATION: 'UpdateSimulation',
  SEND_CHAT_MESSAGE: 'SendChatMessage',

  // Server to Client
  USER_JOINED: 'UserJoined',
  USER_LEFT: 'UserLeft',
  USERS_IN_CIRCUIT: 'UsersInCircuit',
  CIRCUIT_UPDATED: 'CircuitUpdated',
  CURSOR_MOVED: 'CursorMoved',
  ELEMENT_SELECTED: 'ElementSelected',
  SIMULATION_STATE_CHANGED: 'SimulationStateChanged',
  CHAT_MESSAGE_RECEIVED: 'ChatMessageReceived',

  // Connection Events
  CONNECT: 'connect',
  DISCONNECT: 'disconnect',
  CONNECT_ERROR: 'connect_error',
  RECONNECT: 'reconnect',
} as const;

export type SignalREventName = typeof SignalREvents[keyof typeof SignalREvents];
