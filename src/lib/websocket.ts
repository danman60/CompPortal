/**
 * WebSocket Server for Real-Time Competition Updates
 * Enables live sync between Competition Director control panel and judge tablets
 *
 * Based on: GAME_DAY_WEBSOCKET_PROTOCOL.md
 * Features:
 * - Real-time score submission
 * - Playback position sync (500ms intervals)
 * - Break request/approval flow
 * - Presence tracking
 * - Reconnection with state catchup
 * - Sequence number ordering
 * - OBS overlay support (optional)
 */

import { Server as SocketIOServer, Socket } from 'socket.io';
import { Server as HTTPServer } from 'http';
import { logger } from './logger';
import { verifyWebSocketToken, isTokenExpired } from './websocket-auth';
import { v4 as uuidv4 } from 'uuid';

// Import shared types
import {
  WSEvent,
  type WSRole,
  type WSPayload,
  type WSMessage,
  type RoutineStatePayload,
  type ScorePayload,
  type DirectorCommandPayload,
  type JudgeStatusPayload,
  type NotePayload,
  type PlaybackStartedPayload,
  type PlaybackPausedPayload,
  type PlaybackResumedPayload,
  type PlaybackPositionPayload,
  type PlaybackEndedPayload,
  type BreakRequestedPayload,
  type BreakApprovedPayload,
  type BreakDeniedPayload,
  type BreakStartedPayload,
  type BreakEndedPayload,
  type PresenceJoinedPayload,
  type PresenceLeftPayload,
  type PresenceListPayload,
  type PresenceUser,
  type SyncRequestStatePayload,
  type SyncStatePayload,
  type SyncMissedEventsPayload,
  type ScheduleDelayUpdatedPayload,
  type OverlayRoutineInfoPayload,
  type OverlayScoreDisplayPayload,
  type OverlayAwardAnnouncementPayload,
  type PingPayload,
  type PongPayload,
  type ErrorPayload,
} from './websocket-types';

// Re-export for consumers
export {
  WSEvent,
  type WSRole,
  type WSPayload,
  type WSMessage,
  type RoutineStatePayload,
  type ScorePayload,
  type DirectorCommandPayload,
  type JudgeStatusPayload,
  type NotePayload,
  type PlaybackPositionPayload,
  type PresenceUser,
  type SyncStatePayload,
  type OverlayRoutineInfoPayload,
  type OverlayScoreDisplayPayload,
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

  static backstage(competitionId: string): string {
    return `backstage:${competitionId}`;
  }

  static scoreboard(competitionId: string): string {
    return `scoreboard:${competitionId}`;
  }

  static overlay(competitionId: string): string {
    return `overlay:${competitionId}`;
  }

  static routine(routineId: string): string {
    return `routine:${routineId}`;
  }
}

/**
 * Connected user info with Game Day extensions
 */
interface ConnectedUser {
  userId: string;
  role: WSRole;
  competitionId: string;
  tenantId?: string;
  deviceId: string;
  connectedAt: string;
  judgeName?: string;
}

/**
 * Competition state for sync
 */
interface CompetitionState {
  competitionId: string;
  tenantId: string;
  state: 'idle' | 'running' | 'paused' | 'ended';
  currentEntryId: string | null;
  currentEntryNumber: number | null;
  playbackState: {
    isPlaying: boolean;
    positionMs: number;
    durationMs: number;
  } | null;
  scheduleDelay: number;
  pendingBreakRequests: BreakRequestedPayload[];
}

/**
 * Event buffer for reconnection
 */
interface EventBuffer {
  maxSize: number;
  events: WSMessage[];
}

/**
 * WebSocket Server Manager
 */
export class WebSocketManager {
  private io: SocketIOServer | null = null;
  private activeCompetitions: Set<string> = new Set();
  private connectedUsers: Map<string, ConnectedUser> = new Map();

  // Game Day extensions
  private sequenceNumbers: Map<string, number> = new Map(); // competitionId -> sequence
  private eventBuffers: Map<string, EventBuffer> = new Map(); // competitionId -> buffer
  private competitionStates: Map<string, CompetitionState> = new Map(); // competitionId -> state
  private playbackIntervals: Map<string, NodeJS.Timeout> = new Map(); // entryId -> interval

  // Configuration
  private readonly EVENT_BUFFER_SIZE = 1000; // Keep last 1000 events for reconnection
  private readonly PLAYBACK_SYNC_INTERVAL = 500; // 500ms position sync

  /**
   * Initialize WebSocket server
   */
  initialize(httpServer: HTTPServer): void {
    if (this.io) {
      logger.warn('WebSocket server already initialized');
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

    logger.info('WebSocket server initialized');
  }

  /**
   * Setup event handlers
   */
  private setupEventHandlers(): void {
    if (!this.io) return;

    this.io.on('connection', (socket) => {
      logger.info('Client connected', { socketId: socket.id });

      // Authenticate connection
      socket.on('authenticate', async (data: {
        userId: string;
        competitionId: string;
        role: WSRole;
        token: string;
        tenantId?: string;
        deviceId?: string;
      }) => {
        try {
          // Verify JWT token
          const payload = await verifyWebSocketToken(data.token);

          if (!payload) {
            logger.warn('WebSocket authentication failed: Invalid token', { userId: data.userId });
            socket.emit(WSEvent.ERROR, { code: 'UNAUTHORIZED', message: 'Invalid authentication token' } as ErrorPayload);
            socket.disconnect();
            return;
          }

          // Check if token is expired
          if (isTokenExpired(payload)) {
            logger.warn('WebSocket authentication failed: Token expired', { userId: data.userId });
            socket.emit(WSEvent.ERROR, { code: 'UNAUTHORIZED', message: 'Authentication token expired' } as ErrorPayload);
            socket.disconnect();
            return;
          }

          // Verify user ID matches token
          if (payload.sub !== data.userId) {
            logger.warn('WebSocket authentication failed: User ID mismatch', {
              tokenUserId: payload.sub,
              claimedUserId: data.userId,
            });
            socket.emit(WSEvent.ERROR, { code: 'UNAUTHORIZED', message: 'User ID mismatch' } as ErrorPayload);
            socket.disconnect();
            return;
          }

          const connectedAt = new Date().toISOString();
          const deviceId = data.deviceId || socket.id;
          let judgeName: string | undefined;

          // Get judge name from database if judge role
          if (data.role === 'judge') {
            try {
              const { prisma } = await import('@/lib/prisma');
              const judge = await prisma.judges.findFirst({
                where: { id: data.userId },
                select: { name: true },
              });
              if (judge?.name) {
                judgeName = judge.name;
              }
            } catch (err) {
              logger.warn('Failed to fetch judge name', { error: err instanceof Error ? err : new Error(String(err)) });
            }
          }

          // Store connected user with extended info
          this.connectedUsers.set(socket.id, {
            userId: payload.sub,
            role: data.role,
            competitionId: data.competitionId,
            tenantId: data.tenantId,
            deviceId,
            connectedAt,
            judgeName,
          });

          // Join competition room
          await socket.join(WSRoom.competition(data.competitionId));

          // Join role-specific room
          if (data.role === 'judge') {
            await socket.join(WSRoom.judges(data.competitionId));

            // Notify director of judge connection
            this.broadcastWithSequence(WSEvent.JUDGE_JOINED, data.competitionId, data.userId, 'judge', {
              judgeId: data.userId,
              judgeName: judgeName || 'Judge',
              timestamp: Date.now(),
            }, WSRoom.director(data.competitionId), data.tenantId);
          } else if (data.role === 'cd') {
            await socket.join(WSRoom.director(data.competitionId));

            this.broadcastWithSequence(WSEvent.DIRECTOR_JOINED, data.competitionId, data.userId, 'cd', {
              directorId: data.userId,
              timestamp: Date.now(),
            }, undefined, data.tenantId);
          } else if (data.role === 'backstage') {
            await socket.join(WSRoom.backstage(data.competitionId));
          } else if (data.role === 'scoreboard') {
            await socket.join(WSRoom.scoreboard(data.competitionId));
            await socket.join(WSRoom.overlay(data.competitionId));
          }

          // Broadcast presence joined
          this.broadcastWithSequence(WSEvent.PRESENCE_JOINED, data.competitionId, data.userId, data.role, {
            userId: data.userId,
            role: data.role,
            deviceId,
            joinedAt: connectedAt,
          } as PresenceJoinedPayload, undefined, data.tenantId);

          this.activeCompetitions.add(data.competitionId);

          // Send authenticated response with current state
          const competitionState = this.getCompetitionState(data.competitionId);
          const presenceList = this.getPresenceList(data.competitionId);

          socket.emit('authenticated', {
            success: true,
            competitionId: data.competitionId,
            role: data.role,
            currentState: competitionState,
            presenceList,
            sequenceNumber: this.sequenceNumbers.get(data.competitionId) || 0,
          });

          // Send presence list to new user
          socket.emit(WSEvent.PRESENCE_LIST, {
            users: presenceList,
          } as PresenceListPayload);

          logger.info('User authenticated', { userId: data.userId, role: data.role, competitionId: data.competitionId, deviceId });
        } catch (error) {
          logger.error('WebSocket authentication error', { error: error instanceof Error ? error : new Error(String(error)) });
          socket.emit(WSEvent.ERROR, { code: 'INTERNAL_ERROR', message: 'Authentication failed' } as ErrorPayload);
          socket.disconnect();
        }
      });

      // Handle disconnection
      socket.on('disconnect', () => {
        const user = this.connectedUsers.get(socket.id);

        if (user) {
          logger.info('User disconnected', { userId: user.userId, role: user.role, deviceId: user.deviceId });

          // Broadcast presence left
          this.broadcastWithSequence(WSEvent.PRESENCE_LEFT, user.competitionId, user.userId, user.role, {
            userId: user.userId,
            role: user.role,
            deviceId: user.deviceId,
            leftAt: new Date().toISOString(),
          } as PresenceLeftPayload, undefined, user.tenantId);

          if (user.role === 'judge') {
            this.broadcastWithSequence(WSEvent.JUDGE_LEFT, user.competitionId, user.userId, 'judge', {
              judgeId: user.userId,
              judgeName: user.judgeName || 'Judge',
              timestamp: Date.now(),
            }, WSRoom.director(user.competitionId), user.tenantId);
          } else if (user.role === 'cd') {
            this.broadcastWithSequence(WSEvent.DIRECTOR_LEFT, user.competitionId, user.userId, 'cd', {
              directorId: user.userId,
              timestamp: Date.now(),
            }, undefined, user.tenantId);
          }

          this.connectedUsers.delete(socket.id);
        }
      });

      // Ping/Pong for latency tracking
      socket.on(WSEvent.PING, (payload: PingPayload) => {
        const serverTime = Date.now();
        socket.emit(WSEvent.PONG, {
          clientTime: payload.clientTime,
          serverTime,
          latencyMs: serverTime - payload.clientTime,
        } as PongPayload);
      });

      // Sync request for reconnection
      socket.on(WSEvent.SYNC_REQUEST_STATE, (payload: SyncRequestStatePayload) => {
        const user = this.connectedUsers.get(socket.id);
        if (!user) {
          socket.emit(WSEvent.ERROR, { code: 'UNAUTHORIZED', message: 'Not authenticated' } as ErrorPayload);
          return;
        }

        // Get current state
        const competitionState = this.getCompetitionState(user.competitionId);
        const judgesStatus = this.getPresenceList(user.competitionId)
          .filter((u) => u.role === 'judge')
          .map((u) => ({
            judgeId: u.userId,
            judgeName: 'Judge',
            ready: true,
            connected: true,
          }));

        // Send current state
        socket.emit(WSEvent.SYNC_STATE, {
          competitionState: competitionState?.state || 'idle',
          currentEntry: competitionState?.currentEntryId
            ? {
                entryId: competitionState.currentEntryId,
                entryNumber: competitionState.currentEntryNumber || 0,
                title: '',
                studioName: '',
              }
            : null,
          playbackState: competitionState?.playbackState || null,
          scheduleDelay: competitionState?.scheduleDelay || 0,
          judgesStatus,
          pendingBreakRequests: competitionState?.pendingBreakRequests || [],
          sequenceNumber: this.sequenceNumbers.get(user.competitionId) || 0,
        } as SyncStatePayload);

        // Send missed events if requested
        if (payload.lastSequenceNumber > 0) {
          const missedEvents = this.getMissedEvents(user.competitionId, payload.lastSequenceNumber);
          if (missedEvents.length > 0) {
            socket.emit(WSEvent.SYNC_MISSED_EVENTS, {
              events: missedEvents,
              fromSequence: payload.lastSequenceNumber,
              toSequence: this.sequenceNumbers.get(user.competitionId) || 0,
            } as SyncMissedEventsPayload);
          }
        }

        logger.info('Sync state sent', { userId: user.userId, lastSequence: payload.lastSequenceNumber });
      });

      // Director commands
      socket.on(WSEvent.DIRECTOR_COMMAND, (payload: DirectorCommandPayload) => {
        const user = this.connectedUsers.get(socket.id);

        if (!user || user.role !== 'cd') {
          socket.emit(WSEvent.ERROR, { code: 'FORBIDDEN', message: 'Unauthorized: Director only' } as ErrorPayload);
          return;
        }

        logger.info('Director command', { command: payload.command, userId: user.userId });

        this.broadcastWithSequence(WSEvent.DIRECTOR_COMMAND, user.competitionId, user.userId, 'cd', {
          ...payload,
          timestamp: Date.now(),
        }, undefined, user.tenantId);
      });

      // Routine state changes
      socket.on(WSEvent.ROUTINE_CURRENT, (payload: RoutineStatePayload) => {
        const user = this.connectedUsers.get(socket.id);

        if (!user) {
          socket.emit('error', { message: 'Not authenticated' });
          return;
        }

        logger.info('Routine now current', { routineId: payload.routineId, title: payload.title });

        this.broadcast(WSEvent.ROUTINE_CURRENT, user.competitionId, {
          ...payload,
          timestamp: Date.now(),
        });
      });

      socket.on(WSEvent.ROUTINE_COMPLETED, (payload: RoutineStatePayload) => {
        const user = this.connectedUsers.get(socket.id);

        if (!user) return;

        logger.info('Routine completed', { routineId: payload.routineId, title: payload.title });

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

        logger.info('Score submitted', { judgeId: user.userId, routineId: payload.routineId, score: payload.score });

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

        logger.info('Judge ready', { judgeId: user.userId });

        this.broadcast(WSEvent.JUDGE_READY, user.competitionId, {
          ...payload,
          judgeId: user.userId,
          timestamp: Date.now(),
        }, WSRoom.director(user.competitionId));
      });

      socket.on(WSEvent.JUDGE_NOT_READY, (payload: JudgeStatusPayload) => {
        const user = this.connectedUsers.get(socket.id);

        if (!user || user.role !== 'judge') return;

        logger.info('Judge not ready', { judgeId: user.userId });

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

        logger.info('Note added', { routineId: payload.routineId, note: payload.note });

        this.broadcast(WSEvent.NOTE_ADDED, user.competitionId, {
          ...payload,
          timestamp: Date.now(),
        });
      });

      // Break/Intermission - Judge requests
      socket.on(WSEvent.BREAK_REQUESTED, (payload: { durationMinutes: number }) => {
        const user = this.connectedUsers.get(socket.id);

        if (!user || user.role !== 'judge') {
          socket.emit(WSEvent.ERROR, { code: 'FORBIDDEN', message: 'Unauthorized: Judge only' } as ErrorPayload);
          return;
        }

        const requestId = uuidv4();
        const request: BreakRequestedPayload = {
          requestId,
          judgeId: user.userId,
          judgeName: user.judgeName || 'Judge',
          durationMinutes: payload.durationMinutes,
          requestedAt: new Date().toISOString(),
        };

        // Add to pending requests
        this.addBreakRequest(user.competitionId, request);

        logger.info('Break requested', { judgeId: user.userId, durationMinutes: payload.durationMinutes });

        // Notify director
        this.broadcastWithSequence(WSEvent.BREAK_REQUESTED, user.competitionId, user.userId, 'judge', request, WSRoom.director(user.competitionId), user.tenantId);
      });

      // Break approval by director
      socket.on(WSEvent.BREAK_APPROVED, (payload: { requestId: string; durationMinutes: number; scheduledStartTime: string }) => {
        const user = this.connectedUsers.get(socket.id);

        if (!user || user.role !== 'cd') {
          socket.emit(WSEvent.ERROR, { code: 'FORBIDDEN', message: 'Unauthorized: Director only' } as ErrorPayload);
          return;
        }

        // Remove from pending
        this.removeBreakRequest(user.competitionId, payload.requestId);

        const approvedPayload: BreakApprovedPayload = {
          ...payload,
          judgeId: '',
          approvedBy: user.userId,
          approvedAt: new Date().toISOString(),
        };

        logger.info('Break approved', { requestId: payload.requestId, approvedBy: user.userId });

        this.broadcastWithSequence(WSEvent.BREAK_APPROVED, user.competitionId, user.userId, 'cd', approvedPayload, undefined, user.tenantId);
      });

      // Break denial by director
      socket.on(WSEvent.BREAK_DENIED, (payload: { requestId: string; reason?: string }) => {
        const user = this.connectedUsers.get(socket.id);

        if (!user || user.role !== 'cd') {
          socket.emit(WSEvent.ERROR, { code: 'FORBIDDEN', message: 'Unauthorized: Director only' } as ErrorPayload);
          return;
        }

        // Remove from pending
        this.removeBreakRequest(user.competitionId, payload.requestId);

        const deniedPayload: BreakDeniedPayload = {
          requestId: payload.requestId,
          judgeId: '',
          reason: payload.reason,
          deniedBy: user.userId,
          deniedAt: new Date().toISOString(),
        };

        logger.info('Break denied', { requestId: payload.requestId, deniedBy: user.userId });

        this.broadcastWithSequence(WSEvent.BREAK_DENIED, user.competitionId, user.userId, 'cd', deniedPayload, undefined, user.tenantId);
      });

      // Break start by director
      socket.on(WSEvent.BREAK_STARTED, (payload: { breakType: 'emergency' | 'scheduled' | 'judge_requested'; durationMinutes: number; title: string }) => {
        const user = this.connectedUsers.get(socket.id);

        if (!user || user.role !== 'cd') {
          socket.emit(WSEvent.ERROR, { code: 'FORBIDDEN', message: 'Unauthorized: Director only' } as ErrorPayload);
          return;
        }

        const breakId = uuidv4();
        const breakPayload: BreakStartedPayload = {
          breakId,
          breakType: payload.breakType,
          durationMinutes: payload.durationMinutes,
          title: payload.title,
          startedAt: new Date().toISOString(),
        };

        // Update competition state
        this.updateCompetitionState(user.competitionId, { state: 'paused' });

        logger.info('Break started', { breakId, breakType: payload.breakType, durationMinutes: payload.durationMinutes });

        this.broadcastWithSequence(WSEvent.BREAK_STARTED, user.competitionId, user.userId, 'cd', breakPayload, undefined, user.tenantId);
      });

      // Break end by director
      socket.on(WSEvent.BREAK_ENDED, (payload: { breakId: string; actualDurationMinutes: number; endedEarly: boolean }) => {
        const user = this.connectedUsers.get(socket.id);

        if (!user || user.role !== 'cd') {
          socket.emit(WSEvent.ERROR, { code: 'FORBIDDEN', message: 'Unauthorized: Director only' } as ErrorPayload);
          return;
        }

        const endedPayload: BreakEndedPayload = {
          breakId: payload.breakId,
          actualDurationMinutes: payload.actualDurationMinutes,
          endedEarly: payload.endedEarly,
          endedAt: new Date().toISOString(),
        };

        // Update competition state
        this.updateCompetitionState(user.competitionId, { state: 'running' });

        logger.info('Break ended', { breakId: payload.breakId, endedEarly: payload.endedEarly });

        this.broadcastWithSequence(WSEvent.BREAK_ENDED, user.competitionId, user.userId, 'cd', endedPayload, undefined, user.tenantId);
      });

      // =========================================
      // PLAYBACK EVENTS (Game Day)
      // =========================================

      // Playback started (from backstage or CD)
      socket.on(WSEvent.PLAYBACK_STARTED, (payload: { entryId: string; durationMs: number }) => {
        const user = this.connectedUsers.get(socket.id);

        if (!user || (user.role !== 'cd' && user.role !== 'backstage')) {
          socket.emit(WSEvent.ERROR, { code: 'FORBIDDEN', message: 'Unauthorized: CD or Backstage only' } as ErrorPayload);
          return;
        }

        const startedPayload: PlaybackStartedPayload = {
          entryId: payload.entryId,
          durationMs: payload.durationMs,
          startedAt: new Date().toISOString(),
        };

        // Start playback position sync
        this.startPlaybackSync(user.competitionId, payload.entryId, payload.durationMs);

        // Update competition state
        this.updateCompetitionState(user.competitionId, {
          currentEntryId: payload.entryId,
          playbackState: {
            isPlaying: true,
            positionMs: 0,
            durationMs: payload.durationMs,
          },
        });

        logger.info('Playback started', { entryId: payload.entryId, durationMs: payload.durationMs });

        this.broadcastWithSequence(WSEvent.PLAYBACK_STARTED, user.competitionId, user.userId, user.role, startedPayload, undefined, user.tenantId);
      });

      // Playback paused
      socket.on(WSEvent.PLAYBACK_PAUSED, (payload: { entryId: string; positionMs: number }) => {
        const user = this.connectedUsers.get(socket.id);

        if (!user || (user.role !== 'cd' && user.role !== 'backstage')) {
          socket.emit(WSEvent.ERROR, { code: 'FORBIDDEN', message: 'Unauthorized: CD or Backstage only' } as ErrorPayload);
          return;
        }

        // Stop playback sync
        this.stopPlaybackSync(payload.entryId);

        const pausedPayload: PlaybackPausedPayload = {
          entryId: payload.entryId,
          positionMs: payload.positionMs,
          pausedAt: new Date().toISOString(),
        };

        // Update competition state
        const state = this.getCompetitionState(user.competitionId);
        if (state?.playbackState) {
          this.updateCompetitionState(user.competitionId, {
            playbackState: {
              ...state.playbackState,
              isPlaying: false,
              positionMs: payload.positionMs,
            },
          });
        }

        logger.info('Playback paused', { entryId: payload.entryId, positionMs: payload.positionMs });

        this.broadcastWithSequence(WSEvent.PLAYBACK_PAUSED, user.competitionId, user.userId, user.role, pausedPayload, undefined, user.tenantId);
      });

      // Playback resumed
      socket.on(WSEvent.PLAYBACK_RESUMED, (payload: { entryId: string; positionMs: number }) => {
        const user = this.connectedUsers.get(socket.id);

        if (!user || (user.role !== 'cd' && user.role !== 'backstage')) {
          socket.emit(WSEvent.ERROR, { code: 'FORBIDDEN', message: 'Unauthorized: CD or Backstage only' } as ErrorPayload);
          return;
        }

        const state = this.getCompetitionState(user.competitionId);
        const durationMs = state?.playbackState?.durationMs || 0;

        // Resume playback sync from current position
        this.startPlaybackSync(user.competitionId, payload.entryId, durationMs, payload.positionMs);

        const resumedPayload: PlaybackResumedPayload = {
          entryId: payload.entryId,
          positionMs: payload.positionMs,
          resumedAt: new Date().toISOString(),
        };

        // Update competition state
        if (state?.playbackState) {
          this.updateCompetitionState(user.competitionId, {
            playbackState: {
              ...state.playbackState,
              isPlaying: true,
              positionMs: payload.positionMs,
            },
          });
        }

        logger.info('Playback resumed', { entryId: payload.entryId, positionMs: payload.positionMs });

        this.broadcastWithSequence(WSEvent.PLAYBACK_RESUMED, user.competitionId, user.userId, user.role, resumedPayload, undefined, user.tenantId);
      });

      // Schedule delay updated
      socket.on(WSEvent.SCHEDULE_DELAY_UPDATED, (payload: { delayMinutes: number }) => {
        const user = this.connectedUsers.get(socket.id);

        if (!user || user.role !== 'cd') {
          socket.emit(WSEvent.ERROR, { code: 'FORBIDDEN', message: 'Unauthorized: Director only' } as ErrorPayload);
          return;
        }

        const state = this.getCompetitionState(user.competitionId);
        const previousDelay = state?.scheduleDelay || 0;

        // Update state
        this.updateCompetitionState(user.competitionId, { scheduleDelay: payload.delayMinutes });

        const delayPayload: ScheduleDelayUpdatedPayload = {
          delayMinutes: payload.delayMinutes,
          previousDelayMinutes: previousDelay,
          updatedAt: new Date().toISOString(),
        };

        logger.info('Schedule delay updated', { delayMinutes: payload.delayMinutes, previousDelay });

        this.broadcastWithSequence(WSEvent.SCHEDULE_DELAY_UPDATED, user.competitionId, user.userId, 'cd', delayPayload, undefined, user.tenantId);
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

  // =========================================
  // GAME DAY EXTENSIONS
  // =========================================

  /**
   * Get next sequence number for a competition
   */
  private getNextSequence(competitionId: string): number {
    const current = this.sequenceNumbers.get(competitionId) || 0;
    const next = current + 1;
    this.sequenceNumbers.set(competitionId, next);
    return next;
  }

  /**
   * Buffer an event for reconnection support
   */
  private bufferEvent(competitionId: string, event: WSMessage): void {
    if (!this.eventBuffers.has(competitionId)) {
      this.eventBuffers.set(competitionId, {
        maxSize: this.EVENT_BUFFER_SIZE,
        events: [],
      });
    }

    const buffer = this.eventBuffers.get(competitionId)!;
    buffer.events.push(event);

    // Trim if over max size
    if (buffer.events.length > buffer.maxSize) {
      buffer.events = buffer.events.slice(-buffer.maxSize);
    }
  }

  /**
   * Get missed events since a sequence number
   */
  getMissedEvents(competitionId: string, lastSequence: number): WSMessage[] {
    const buffer = this.eventBuffers.get(competitionId);
    if (!buffer) return [];

    return buffer.events.filter((e) => e.sequenceNumber > lastSequence);
  }

  /**
   * Initialize or get competition state
   */
  getCompetitionState(competitionId: string): CompetitionState | null {
    return this.competitionStates.get(competitionId) || null;
  }

  /**
   * Update competition state
   */
  updateCompetitionState(competitionId: string, updates: Partial<CompetitionState>): void {
    const current = this.competitionStates.get(competitionId) || {
      competitionId,
      tenantId: '',
      state: 'idle' as const,
      currentEntryId: null,
      currentEntryNumber: null,
      playbackState: null,
      scheduleDelay: 0,
      pendingBreakRequests: [],
    };

    this.competitionStates.set(competitionId, {
      ...current,
      ...updates,
    });
  }

  /**
   * Start playback position sync
   */
  startPlaybackSync(
    competitionId: string,
    entryId: string,
    durationMs: number,
    startPositionMs: number = 0
  ): void {
    // Stop any existing sync for this entry
    this.stopPlaybackSync(entryId);

    let positionMs = startPositionMs;
    const startTime = Date.now();

    const interval = setInterval(() => {
      const elapsedMs = Date.now() - startTime;
      positionMs = startPositionMs + elapsedMs;

      // Check if playback ended
      if (positionMs >= durationMs) {
        this.stopPlaybackSync(entryId);
        this.broadcastWithSequence(WSEvent.PLAYBACK_ENDED, competitionId, '', 'cd', {
          entryId,
          endedAt: new Date().toISOString(),
        } as PlaybackEndedPayload);
        return;
      }

      // Broadcast position
      this.broadcastWithSequence(WSEvent.PLAYBACK_POSITION, competitionId, '', 'cd', {
        entryId,
        positionMs,
        durationMs,
        isPlaying: true,
      } as PlaybackPositionPayload);

      // Update competition state
      this.updateCompetitionState(competitionId, {
        playbackState: {
          isPlaying: true,
          positionMs,
          durationMs,
        },
      });
    }, this.PLAYBACK_SYNC_INTERVAL);

    this.playbackIntervals.set(entryId, interval);

    logger.info('Playback sync started', { entryId, durationMs });
  }

  /**
   * Stop playback position sync
   */
  stopPlaybackSync(entryId: string): void {
    const interval = this.playbackIntervals.get(entryId);
    if (interval) {
      clearInterval(interval);
      this.playbackIntervals.delete(entryId);
      logger.info('Playback sync stopped', { entryId });
    }
  }

  /**
   * Pause playback sync
   */
  pausePlaybackSync(entryId: string): number {
    const interval = this.playbackIntervals.get(entryId);
    if (interval) {
      clearInterval(interval);
      this.playbackIntervals.delete(entryId);
    }
    // Return current position from state
    return 0; // Caller should track actual position
  }

  /**
   * Broadcast with sequence number and buffering
   */
  broadcastWithSequence<T extends object>(
    event: WSEvent,
    competitionId: string,
    senderId: string,
    senderRole: WSRole,
    payload: T,
    room?: string,
    tenantId?: string
  ): void {
    if (!this.io) return;

    const sequenceNumber = this.getNextSequence(competitionId);
    const message: WSMessage = {
      id: uuidv4(),
      type: event,
      timestamp: Date.now(),
      sequenceNumber,
      competitionId,
      tenantId: tenantId || '',
      senderId,
      senderRole,
      payload: payload as Record<string, unknown>,
    };

    // Buffer for reconnection
    this.bufferEvent(competitionId, message);

    // Broadcast
    const targetRoom = room || WSRoom.competition(competitionId);
    this.io.to(targetRoom).emit(event, message);
  }

  /**
   * Get presence list for a competition
   */
  getPresenceList(competitionId: string): PresenceUser[] {
    const users: PresenceUser[] = [];

    for (const [, user] of this.connectedUsers) {
      if (user.competitionId === competitionId) {
        users.push({
          userId: user.userId,
          role: user.role,
          deviceId: user.deviceId,
          connectedAt: user.connectedAt,
        });
      }
    }

    return users;
  }

  /**
   * Add a break request
   */
  addBreakRequest(competitionId: string, request: BreakRequestedPayload): void {
    const state = this.getCompetitionState(competitionId);
    if (state) {
      state.pendingBreakRequests.push(request);
      this.competitionStates.set(competitionId, state);
    }
  }

  /**
   * Remove a break request
   */
  removeBreakRequest(competitionId: string, requestId: string): void {
    const state = this.getCompetitionState(competitionId);
    if (state) {
      state.pendingBreakRequests = state.pendingBreakRequests.filter(
        (r) => r.requestId !== requestId
      );
      this.competitionStates.set(competitionId, state);
    }
  }

  /**
   * Broadcast overlay event to OBS clients
   */
  broadcastOverlay(
    event: WSEvent,
    competitionId: string,
    payload: OverlayRoutineInfoPayload | OverlayScoreDisplayPayload | OverlayAwardAnnouncementPayload
  ): void {
    if (!this.io) return;

    this.io.to(WSRoom.overlay(competitionId)).emit(event, {
      ...payload,
      timestamp: Date.now(),
    });
  }

  /**
   * Close WebSocket server
   */
  close(): void {
    if (this.io) {
      // Stop all playback syncs
      for (const [entryId] of this.playbackIntervals) {
        this.stopPlaybackSync(entryId);
      }

      this.io.close();
      this.io = null;
      this.activeCompetitions.clear();
      this.connectedUsers.clear();
      this.sequenceNumbers.clear();
      this.eventBuffers.clear();
      this.competitionStates.clear();
      logger.info('WebSocket server closed');
    }
  }
}

/**
 * Singleton instance
 */
export const wsManager = new WebSocketManager();
