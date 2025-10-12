/**
 * WebSocket Server for Real-Time Competition Updates
 * Enables live sync between Competition Director control panel and judge tablets
 */

import { Server as SocketIOServer } from 'socket.io';
import { Server as HTTPServer } from 'http';

// Import shared types
import {
  WSEvent,
  type WSPayload,
  type RoutineStatePayload,
  type ScorePayload,
  type DirectorCommandPayload,
  type JudgeStatusPayload,
  type NotePayload,
} from './websocket-types';

// Re-export for consumers
export {
  WSEvent,
  type WSPayload,
  type RoutineStatePayload,
  type ScorePayload,
  type DirectorCommandPayload,
  type JudgeStatusPayload,
  type NotePayload,
};

/**
 * WebSocket Room Types
 */
export class WSRoom {
  static competition(competitionId: string): string {
    return `competition:${competitionId}`;
  }

  static judges(competitionId: string): string {
    return `judges:${competitionId}`;
  }

  static director(competitionId: string): string {
    return `director:${competitionId}`;
  }

  static routine(routineId: string): string {
    return `routine:${routineId}`;
  }
}

/**
 * WebSocket Server Manager
 */
export class WebSocketManager {
  private io: SocketIOServer | null = null;
  private activeCompetitions: Set<string> = new Set();
  private connectedUsers: Map<string, { userId: string; role: string; competitionId: string }> = new Map();

  /**
   * Initialize WebSocket server
   */
  initialize(httpServer: HTTPServer): void {
    if (this.io) {
      console.warn('WebSocket server already initialized');
      return;
    }

    this.io = new SocketIOServer(httpServer, {
      cors: {
        origin: process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000',
        credentials: true,
      },
      path: '/api/socket',
      transports: ['websocket', 'polling'],
    });

    this.setupEventHandlers();

    console.log('✅ WebSocket server initialized');
  }

  /**
   * Setup event handlers
   */
  private setupEventHandlers(): void {
    if (!this.io) return;

    this.io.on('connection', (socket) => {
      console.log(`🔌 Client connected: ${socket.id}`);

      // Authenticate connection
      socket.on('authenticate', async (data: { userId: string; competitionId: string; role: string; token: string }) => {
        try {
          // TODO: Verify JWT token
          // For now, trust the client (add authentication in production)

          this.connectedUsers.set(socket.id, {
            userId: data.userId,
            role: data.role,
            competitionId: data.competitionId,
          });

          // Join competition room
          await socket.join(WSRoom.competition(data.competitionId));

          // Join role-specific room
          if (data.role === 'judge') {
            await socket.join(WSRoom.judges(data.competitionId));

            // Notify director of judge connection
            this.broadcast(WSEvent.JUDGE_JOINED, data.competitionId, {
              judgeId: data.userId,
              judgeName: 'Judge', // TODO: Get from database
              timestamp: Date.now(),
            }, WSRoom.director(data.competitionId));
          } else if (data.role === 'director') {
            await socket.join(WSRoom.director(data.competitionId));

            this.broadcast(WSEvent.DIRECTOR_JOINED, data.competitionId, {
              directorId: data.userId,
              timestamp: Date.now(),
            }, WSRoom.competition(data.competitionId));
          }

          this.activeCompetitions.add(data.competitionId);

          socket.emit('authenticated', {
            success: true,
            competitionId: data.competitionId,
            role: data.role,
          });

          console.log(`✅ User ${data.userId} authenticated as ${data.role} for competition ${data.competitionId}`);
        } catch (error) {
          console.error('Authentication error:', error);
          socket.emit('error', { message: 'Authentication failed' });
          socket.disconnect();
        }
      });

      // Handle disconnection
      socket.on('disconnect', () => {
        const user = this.connectedUsers.get(socket.id);

        if (user) {
          console.log(`🔌 User disconnected: ${user.userId} (${user.role})`);

          if (user.role === 'judge') {
            this.broadcast(WSEvent.JUDGE_LEFT, user.competitionId, {
              judgeId: user.userId,
              timestamp: Date.now(),
            }, WSRoom.director(user.competitionId));
          } else if (user.role === 'director') {
            this.broadcast(WSEvent.DIRECTOR_LEFT, user.competitionId, {
              directorId: user.userId,
              timestamp: Date.now(),
            }, WSRoom.competition(user.competitionId));
          }

          this.connectedUsers.delete(socket.id);
        }
      });

      // Director commands
      socket.on(WSEvent.DIRECTOR_COMMAND, (payload: DirectorCommandPayload) => {
        const user = this.connectedUsers.get(socket.id);

        if (!user || user.role !== 'director') {
          socket.emit('error', { message: 'Unauthorized: Director only' });
          return;
        }

        console.log(`📢 Director command: ${payload.command}`);

        this.broadcast(WSEvent.DIRECTOR_COMMAND, user.competitionId, {
          ...payload,
          timestamp: Date.now(),
        });
      });

      // Routine state changes
      socket.on(WSEvent.ROUTINE_CURRENT, (payload: RoutineStatePayload) => {
        const user = this.connectedUsers.get(socket.id);

        if (!user) {
          socket.emit('error', { message: 'Not authenticated' });
          return;
        }

        console.log(`▶️  Routine now current: ${payload.title}`);

        this.broadcast(WSEvent.ROUTINE_CURRENT, user.competitionId, {
          ...payload,
          timestamp: Date.now(),
        });
      });

      socket.on(WSEvent.ROUTINE_COMPLETED, (payload: RoutineStatePayload) => {
        const user = this.connectedUsers.get(socket.id);

        if (!user) return;

        console.log(`✅ Routine completed: ${payload.title}`);

        this.broadcast(WSEvent.ROUTINE_COMPLETED, user.competitionId, {
          ...payload,
          timestamp: Date.now(),
        });
      });

      // Score submission
      socket.on(WSEvent.SCORE_SUBMITTED, (payload: ScorePayload) => {
        const user = this.connectedUsers.get(socket.id);

        if (!user || user.role !== 'judge') {
          socket.emit('error', { message: 'Unauthorized: Judge only' });
          return;
        }

        console.log(`📊 Score submitted by judge ${user.userId} for routine ${payload.routineId}: ${payload.score}`);

        // Broadcast to director
        this.broadcast(WSEvent.SCORE_SUBMITTED, user.competitionId, {
          ...payload,
          timestamp: Date.now(),
        }, WSRoom.director(user.competitionId));
      });

      // Judge ready status
      socket.on(WSEvent.JUDGE_READY, (payload: JudgeStatusPayload) => {
        const user = this.connectedUsers.get(socket.id);

        if (!user || user.role !== 'judge') return;

        console.log(`✅ Judge ready: ${user.userId}`);

        this.broadcast(WSEvent.JUDGE_READY, user.competitionId, {
          ...payload,
          judgeId: user.userId,
          timestamp: Date.now(),
        }, WSRoom.director(user.competitionId));
      });

      socket.on(WSEvent.JUDGE_NOT_READY, (payload: JudgeStatusPayload) => {
        const user = this.connectedUsers.get(socket.id);

        if (!user || user.role !== 'judge') return;

        console.log(`❌ Judge not ready: ${user.userId}`);

        this.broadcast(WSEvent.JUDGE_NOT_READY, user.competitionId, {
          ...payload,
          judgeId: user.userId,
          timestamp: Date.now(),
        }, WSRoom.director(user.competitionId));
      });

      // Live notes
      socket.on(WSEvent.NOTE_ADDED, (payload: NotePayload) => {
        const user = this.connectedUsers.get(socket.id);

        if (!user) return;

        console.log(`📝 Note added for routine ${payload.routineId}: ${payload.note}`);

        this.broadcast(WSEvent.NOTE_ADDED, user.competitionId, {
          ...payload,
          timestamp: Date.now(),
        });
      });

      // Break/Intermission
      socket.on(WSEvent.BREAK_START, (payload: { duration: number; reason: string }) => {
        const user = this.connectedUsers.get(socket.id);

        if (!user || user.role !== 'director') {
          socket.emit('error', { message: 'Unauthorized: Director only' });
          return;
        }

        console.log(`⏸️  Break started: ${payload.reason} (${payload.duration}s)`);

        this.broadcast(WSEvent.BREAK_START, user.competitionId, {
          ...payload,
          timestamp: Date.now(),
        });
      });

      socket.on(WSEvent.BREAK_END, () => {
        const user = this.connectedUsers.get(socket.id);

        if (!user || user.role !== 'director') return;

        console.log(`▶️  Break ended`);

        this.broadcast(WSEvent.BREAK_END, user.competitionId, {
          timestamp: Date.now(),
        });
      });
    });
  }

  /**
   * Broadcast event to specific room or entire competition
   */
  broadcast(event: WSEvent, competitionId: string, payload: any, room?: string): void {
    if (!this.io) return;

    const targetRoom = room || WSRoom.competition(competitionId);

    this.io.to(targetRoom).emit(event, {
      ...payload,
      competitionId,
      timestamp: payload.timestamp || Date.now(),
    });
  }

  /**
   * Get connected users for a competition
   */
  getConnectedUsers(competitionId: string): Array<{ userId: string; role: string }> {
    const users: Array<{ userId: string; role: string }> = [];

    for (const [, user] of this.connectedUsers) {
      if (user.competitionId === competitionId) {
        users.push({ userId: user.userId, role: user.role });
      }
    }

    return users;
  }

  /**
   * Get active competitions
   */
  getActiveCompetitions(): string[] {
    return Array.from(this.activeCompetitions);
  }

  /**
   * Close WebSocket server
   */
  close(): void {
    if (this.io) {
      this.io.close();
      this.io = null;
      this.activeCompetitions.clear();
      this.connectedUsers.clear();
      console.log('WebSocket server closed');
    }
  }
}

/**
 * Singleton instance
 */
export const wsManager = new WebSocketManager();
