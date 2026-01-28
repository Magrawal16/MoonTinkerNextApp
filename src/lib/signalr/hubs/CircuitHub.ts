// CircuitHub.ts - SignalR hub for real-time circuit collaboration
import { Server as SocketIOServer, Socket } from 'socket.io';

export interface CircuitUpdate {
  circuitId: string;
  userId: string;
  timestamp: number;
  changes: any;
}

export interface UserPresence {
  userId: string;
  sessionId: string; // Socket.IO session ID - unique per connection
  userName: string;
  circuitId: string;
  color?: string;
}

export class CircuitHub {
  private io: SocketIOServer;
  private userPresence: Map<string, UserPresence> = new Map();

  constructor(io: SocketIOServer) {
    this.io = io;
    this.setupHandlers();
  }

  private setupHandlers() {
    this.io.on('connection', (socket: Socket) => {
      console.log(`Client connected: ${socket.id}`);

      // Handle joining a circuit room
      socket.on('JoinCircuit', (data: { circuitId: string; userId: string; userName: string }) => {
        this.handleJoinCircuit(socket, data);
      });

      // Handle leaving a circuit room
      socket.on('LeaveCircuit', (data: { circuitId: string; userId: string }) => {
        this.handleLeaveCircuit(socket, data);
      });

      // Handle circuit updates
      socket.on('UpdateCircuit', (update: CircuitUpdate) => {
        this.handleCircuitUpdate(socket, update);
      });

      // Handle cursor position updates
      socket.on('UpdateCursor', (data: { circuitId: string; userId: string; x: number; y: number }) => {
        this.handleCursorUpdate(socket, data);
      });

      // Handle element selection
      socket.on('SelectElement', (data: { circuitId: string; userId: string; elementId: string | null }) => {
        this.handleElementSelection(socket, data);
      });

      // Handle simulation state updates
      socket.on('UpdateSimulation', (data: { circuitId: string; isRunning: boolean }) => {
        this.handleSimulationUpdate(socket, data);
      });

      // Handle disconnection
      socket.on('disconnect', () => {
        this.handleDisconnect(socket);
      });
    });
  }

  private handleJoinCircuit(socket: Socket, data: { circuitId: string; userId: string; userName: string }) {
    const { circuitId, userId, userName } = data;
    
    // Join the circuit room
    socket.join(`circuit:${circuitId}`);
    
    // Store user presence with unique sessionId
    const presence: UserPresence = {
      userId,
      sessionId: socket.id, // Socket.IO session ID is unique per connection
      userName,
      circuitId,
      color: this.generateUserColor(userId)
    };
    this.userPresence.set(socket.id, presence);

    // Get all users in the circuit
    const usersInCircuit = this.getUsersInCircuit(circuitId);

    // Notify others that a user joined
    socket.to(`circuit:${circuitId}`).emit('UserJoined', presence);

    // Send current users to the new user
    socket.emit('UsersInCircuit', usersInCircuit);

    console.log(`User ${userName} (${userId}) joined circuit ${circuitId} from session ${socket.id}`);
  }

  private handleLeaveCircuit(socket: Socket, data: { circuitId: string; userId: string }) {
    const { circuitId, userId } = data;
    
    socket.leave(`circuit:${circuitId}`);
    
    const presence = this.userPresence.get(socket.id);
    if (presence) {
      socket.to(`circuit:${circuitId}`).emit('UserLeft', { userId, userName: presence.userName });
      this.userPresence.delete(socket.id);
    }

    console.log(`User ${userId} left circuit ${circuitId}`);
  }

  private handleCircuitUpdate(socket: Socket, update: CircuitUpdate) {
    const { circuitId } = update;
    
    // Add session ID to the update if not already present
    const updateWithSession = {
      ...update,
      sessionId: socket.id
    };
    
    console.log('[CircuitHub] Broadcasting update to circuit:', circuitId, 'from session:', socket.id, 'type:', update.changes?.type);
    
    // Broadcast the update to all other users in the circuit
    socket.to(`circuit:${circuitId}`).emit('CircuitUpdated', updateWithSession);
  }

  private handleCursorUpdate(socket: Socket, data: { circuitId: string; userId: string; x: number; y: number }) {
    const { circuitId, userId, x, y } = data;
    
    // Broadcast cursor position to others in the circuit
    socket.to(`circuit:${circuitId}`).emit('CursorMoved', { userId, x, y });
  }

  private handleElementSelection(socket: Socket, data: { circuitId: string; userId: string; elementId: string | null }) {
    const { circuitId, userId, elementId } = data;
    
    // Broadcast element selection to others
    socket.to(`circuit:${circuitId}`).emit('ElementSelected', { userId, elementId });
  }

  private handleSimulationUpdate(socket: Socket, data: { circuitId: string; isRunning: boolean }) {
    const { circuitId, isRunning } = data;
    
    // Broadcast simulation state to all users in the circuit
    socket.to(`circuit:${circuitId}`).emit('SimulationStateChanged', { isRunning });
  }

  private handleDisconnect(socket: Socket) {
    const presence = this.userPresence.get(socket.id);
    
    if (presence) {
      const { circuitId, userId, userName } = presence;
      socket.to(`circuit:${circuitId}`).emit('UserLeft', { userId, userName });
      this.userPresence.delete(socket.id);
      console.log(`User ${userName} (${userId}) disconnected`);
    }
  }

  private getUsersInCircuit(circuitId: string): UserPresence[] {
    const users: UserPresence[] = [];
    
    this.userPresence.forEach((presence) => {
      if (presence.circuitId === circuitId) {
        users.push(presence);
      }
    });
    
    return users;
  }

  private generateUserColor(userId: string): string {
    // Generate a consistent color based on userId
    const colors = [
      '#FF6B6B', '#4ECDC4', '#45B7D1', '#FFA07A',
      '#98D8C8', '#F7DC6F', '#BB8FCE', '#85C1E2'
    ];
    
    const hash = userId.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
    return colors[hash % colors.length];
  }

  // Public methods for sending messages to specific circuits
  public broadcastToCircuit(circuitId: string, event: string, data: any) {
    this.io.to(`circuit:${circuitId}`).emit(event, data);
  }

  public sendToUser(socketId: string, event: string, data: any) {
    this.io.to(socketId).emit(event, data);
  }
}
