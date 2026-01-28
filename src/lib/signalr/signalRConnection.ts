// signalRConnection.ts - Client-side SignalR connection manager using @microsoft/signalr
import * as signalR from '@microsoft/signalr';
import { SIGNALR_HUB_URL } from '@/common/config/api';

// Security key for API authentication (same as used in circuitStorage)
const API_SECURITY_KEY = "X2DPR-RO1WTR-98007-PRS70-VEQ12Y";

// Get auth token from session storage
function getAuthToken(): string {
  if (typeof window !== 'undefined') {
    const token = sessionStorage.getItem("mt:token");
    const expiryStr = sessionStorage.getItem("mt:token:expiry");
    
    if (!token) return "";
    
    // Check if token has expired
    if (expiryStr) {
      const expiryTime = parseInt(expiryStr, 10);
      if (Date.now() >= expiryTime) {
        console.warn('[SignalR] Token expired');
        return "";
      }
    }
    
    return token;
  }
  return "";
}

export interface CircuitUpdate {
  circuitId: string;
  userId: string;
  sessionId?: string; // Unique session identifier
  timestamp: number;
  changes: any;
}

export interface UserPresence {
  userId: string;
  sessionId: string;
  userName: string;
  circuitId: string;
  color?: string;
}

export interface CursorPosition {
  userId: string;
  x: number;
  y: number;
}

export interface ElementSelection {
  userId: string;
  elementId: string | null;
}

export interface SimulationState {
  isRunning: boolean;
}

export class SignalRConnection {
  private connection: signalR.HubConnection | null = null;
  private url: string;

  constructor(url: string = '') {
    // Use SIGNALR_HUB_URL from centralized config (api.ts)
    // Automatically switches based on ACTIVE_ENV (development/uat/production)
    // Append security-key as query param for WebSocket connections
    const baseUrl = url || SIGNALR_HUB_URL;
    this.url = `${baseUrl}?security-key=${encodeURIComponent(API_SECURITY_KEY)}`;
    console.log('[SignalR] Hub URL:', this.url);
  }

  // Connect to the SignalR server
  public connect(): Promise<void> {
    return new Promise((resolve, reject) => {
      try {
        this.connection = new signalR.HubConnectionBuilder()
          .withUrl(this.url, {
            skipNegotiation: false,
            // Use Long Polling only - WebSockets fail due to middleware not handling upgrade requests
            // This prevents browser console errors from failed WebSocket connection attempts
            transport: signalR.HttpTransportType.LongPolling,
            // Pass security key via headers for negotiate request
            headers: {
              "security-key": API_SECURITY_KEY
            },
            // Provide access token for JWT authentication
            accessTokenFactory: () => getAuthToken()
          })
          // Suppress transport fallback errors - only log critical errors
          .configureLogging(signalR.LogLevel.None)
          .withAutomaticReconnect({
            nextRetryDelayInMilliseconds: (retryContext) => {
              // Custom retry logic - retry indefinitely with increasing delays
              if (retryContext.elapsedMilliseconds < 60000) {
                // First minute: retry quickly
                return Math.min(1000 * retryContext.previousRetryCount, 5000);
              }
              // After first minute: retry every 10 seconds
              return 10000;
            }
          })
          .configureLogging(signalR.LogLevel.Warning) // Reduce logging noise
          .build();

        // Handle connection state changes
        this.connection.onclose((error) => {
          if (error) {
            console.warn('[SignalR] Disconnected with error:', error.message);
          } else {
            console.log('[SignalR] Disconnected');
          }
        });

        this.connection.onreconnecting((error) => {
          console.log('[SignalR] Reconnecting...', error?.message || '');
        });

        this.connection.onreconnected((connectionId) => {
          console.log(`[SignalR] Reconnected with ID: ${connectionId}`);
        });

        // Start the connection
        this.connection.start()
          .then(() => {
            console.log('✓ Connected to SignalR server', this.connection?.connectionId);
            resolve();
          })
          .catch((error) => {
            // Don't reject - allow app to work without SignalR
            console.warn('[SignalR] Failed to connect:', error.message);
            console.warn('[SignalR] Real-time collaboration will be unavailable');
            resolve(); // Resolve anyway so app continues
          });

      } catch (error) {
        // Don't reject - allow app to work without SignalR
        console.warn('[SignalR] Connection error:', error);
        resolve();
      }
    });
  }

  // Disconnect from the SignalR server
  public disconnect(): void {
    if (this.connection) {
      this.connection.stop();
      this.connection = null;
    }
  }

  // Check if connected
  public isConnected(): boolean {
    return this.connection?.state === signalR.HubConnectionState.Connected;
  }

  // Get connection ID
  public getSocketId(): string | undefined {
    return this.connection?.connectionId ?? undefined;
  }

  // Join a circuit room
  public joinCircuit(circuitId: string, userId: string, userName: string): void {
    this.connection?.invoke('JoinCircuit', circuitId, userId, userName)
      .catch(err => console.error('Error joining circuit:', err));
  }

  // Leave a circuit room
  public leaveCircuit(circuitId: string, userId: string): void {
    this.connection?.invoke('LeaveCircuit', circuitId, userId)
      .catch(err => console.error('Error leaving circuit:', err));
  }

  // Send circuit update
  public updateCircuit(update: CircuitUpdate): void {
    this.connection?.invoke('UpdateCircuit', update)
      .catch(err => console.error('Error updating circuit:', err));
  }

  // Send cursor position
  public updateCursor(circuitId: string, userId: string, x: number, y: number): void {
    this.connection?.invoke('UpdateCursor', circuitId, userId, x, y)
      .catch(err => console.error('Error updating cursor:', err));
  }

  // Send element selection
  public selectElement(circuitId: string, userId: string, elementId: string | null): void {
    this.connection?.invoke('SelectElement', circuitId, userId, elementId)
      .catch(err => console.error('Error selecting element:', err));
  }

  // Send simulation state
  public updateSimulation(circuitId: string, isRunning: boolean): void {
    this.connection?.invoke('UpdateSimulation', circuitId, isRunning)
      .catch(err => console.error('Error updating simulation:', err));
  }

  // Event listeners
  public onUserJoined(callback: (user: UserPresence) => void): void {
    this.connection?.on('UserJoined', callback);
  }

  public onUserLeft(callback: (data: { userId: string; userName: string; sessionId?: string; color?: string }) => void): void {
    this.connection?.on('UserLeft', callback);
  }

  public onUsersInCircuit(callback: (users: UserPresence[]) => void): void {
    this.connection?.on('UsersInCircuit', callback);
  }

  public onCircuitUpdated(callback: (update: CircuitUpdate) => void): void {
    this.connection?.on('CircuitUpdated', callback);
  }

  public onCursorMoved(callback: (cursor: CursorPosition) => void): void {
    this.connection?.on('CursorMoved', callback);
  }

  public onElementSelected(callback: (selection: ElementSelection) => void): void {
    this.connection?.on('ElementSelected', callback);
  }

  public onSimulationStateChanged(callback: (state: SimulationState) => void): void {
    this.connection?.on('SimulationStateChanged', callback);
  }

  // Remove event listeners
  public offUserJoined(callback?: (user: UserPresence) => void): void {
    if (callback) {
      this.connection?.off('UserJoined', callback);
    } else {
      this.connection?.off('UserJoined');
    }
  }

  public offUserLeft(callback?: (data: { userId: string; userName: string; sessionId?: string; color?: string }) => void): void {
    if (callback) {
      this.connection?.off('UserLeft', callback);
    } else {
      this.connection?.off('UserLeft');
    }
  }

  public offUsersInCircuit(callback?: (users: UserPresence[]) => void): void {
    if (callback) {
      this.connection?.off('UsersInCircuit', callback);
    } else {
      this.connection?.off('UsersInCircuit');
    }
  }

  public offCircuitUpdated(callback?: (update: CircuitUpdate) => void): void {
    if (callback) {
      this.connection?.off('CircuitUpdated', callback);
    } else {
      this.connection?.off('CircuitUpdated');
    }
  }

  public offCursorMoved(callback?: (cursor: CursorPosition) => void): void {
    if (callback) {
      this.connection?.off('CursorMoved', callback);
    } else {
      this.connection?.off('CursorMoved');
    }
  }

  public offElementSelected(callback?: (selection: ElementSelection) => void): void {
    if (callback) {
      this.connection?.off('ElementSelected', callback);
    } else {
      this.connection?.off('ElementSelected');
    }
  }

  public offSimulationStateChanged(callback?: (state: SimulationState) => void): void {
    if (callback) {
      this.connection?.off('SimulationStateChanged', callback);
    } else {
      this.connection?.off('SimulationStateChanged');
    }
  }
}

// Singleton instance
let signalRConnection: SignalRConnection | null = null;

export const getSignalRConnection = (): SignalRConnection => {
  if (!signalRConnection) {
    signalRConnection = new SignalRConnection();
  }
  return signalRConnection;
};
