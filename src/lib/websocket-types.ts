/**
 * WebSocket Shared Types
 * Types and enums that can be safely imported by both server and client code
 *
 * Based on: GAME_DAY_WEBSOCKET_PROTOCOL.md
 */

/**
 * WebSocket Roles
 */
export type WSRole = 'cd' | 'judge' | 'backstage' | 'scoreboard';

/**
 * WebSocket Event Types
 */
export enum WSEvent {
  // Connection
  CONNECT = 'connect',
  DISCONNECT = 'disconnect',
  JOIN = 'join',
  PING = 'ping',
  PONG = 'pong',

  // Competition Control
  COMPETITION_START = 'competition:start',
  COMPETITION_STARTED = 'competition:started',
  COMPETITION_PAUSE = 'competition:pause',
  COMPETITION_PAUSED = 'competition:paused',
  COMPETITION_RESUME = 'competition:resume',
  COMPETITION_RESUMED = 'competition:resumed',
  COMPETITION_END = 'competition:end',
  COMPETITION_ENDED = 'competition:ended',

  // Routine State
  ROUTINE_QUEUED = 'routine:queued',
  ROUTINE_CURRENT = 'routine:current',
  ROUTINE_STARTED = 'routine:started',
  ROUTINE_SCORING = 'routine:scoring',
  ROUTINE_COMPLETED = 'routine:completed',
  ROUTINE_SKIPPED = 'routine:skipped',
  ROUTINE_SCRATCHED = 'routine:scratched',
  ROUTINE_REORDERED = 'routine:reordered',

  // Scoring
  SCORE_SUBMITTED = 'score:submitted',
  SCORE_UPDATED = 'score:updated',
  SCORE_EDITED = 'score:edited',
  SCORE_VISIBILITY_CHANGED = 'score:visibility_changed',
  SCORES_AGGREGATED = 'scores:aggregated',

  // Judge Actions
  JUDGE_JOINED = 'judge:joined',
  JUDGE_LEFT = 'judge:left',
  JUDGE_READY = 'judge:ready',
  JUDGE_NOT_READY = 'judge:not_ready',

  // Director Actions
  DIRECTOR_JOINED = 'director:joined',
  DIRECTOR_LEFT = 'director:left',
  DIRECTOR_COMMAND = 'director:command',

  // Live Notes
  NOTE_ADDED = 'note:added',
  NOTE_UPDATED = 'note:updated',

  // Break/Intermission
  BREAK_START = 'break:start',
  BREAK_STARTED = 'break:started',
  BREAK_END = 'break:end',
  BREAK_ENDED = 'break:ended',
  BREAK_REQUESTED = 'break:requested',
  BREAK_APPROVED = 'break:approved',
  BREAK_DENIED = 'break:denied',

  // Playback (Game Day)
  PLAYBACK_STARTED = 'playback:started',
  PLAYBACK_PAUSED = 'playback:paused',
  PLAYBACK_RESUMED = 'playback:resumed',
  PLAYBACK_POSITION = 'playback:position',
  PLAYBACK_ENDED = 'playback:ended',

  // Presence
  PRESENCE_JOINED = 'presence:joined',
  PRESENCE_LEFT = 'presence:left',
  PRESENCE_LIST = 'presence:list',

  // Sync (Reconnection)
  SYNC_REQUEST_STATE = 'sync:request_state',
  SYNC_STATE = 'sync:state',
  SYNC_MISSED_EVENTS = 'sync:missed_events',
  SYNC_ACK = 'sync:ack',

  // Schedule
  SCHEDULE_DELAY_UPDATED = 'schedule:delay_updated',

  // OBS Overlay (optional integration)
  OVERLAY_ROUTINE_INFO = 'overlay:routine_info',
  OVERLAY_SCORE_DISPLAY = 'overlay:score_display',
  OVERLAY_STUDIO_INFO = 'overlay:studio_info',
  OVERLAY_AWARD_ANNOUNCEMENT = 'overlay:award_announcement',

  // Errors
  ERROR = 'error',
}

/**
 * WebSocket Payload Types
 */
export interface WSPayload {
  timestamp: number;
  competitionId: string;
  userId?: string;
  data: any;
}

export interface RoutineStatePayload {
  routineId: string;
  title: string;
  studioName: string;
  dancers: string[];
  category: string;
  duration: number;
  state: 'queued' | 'current' | 'completed' | 'skipped';
  order: number;
}

export interface ScorePayload {
  routineId: string;
  judgeId: string;
  judgeName: string;
  score: number;
  notes?: string;
}

export interface DirectorCommandPayload {
  command: 'next' | 'previous' | 'pause' | 'resume' | 'skip';
  routineId?: string;
}

export interface JudgeStatusPayload {
  judgeId: string;
  judgeName: string;
  ready: boolean;
  connected: boolean;
}

export interface NotePayload {
  routineId: string;
  note: string;
  category: 'prop' | 'timing' | 'judging' | 'other';
  createdBy: string;
}

/**
 * Base WebSocket Message (with sequence numbers for ordering)
 */
export interface WSMessage {
  id: string; // UUID for deduplication
  type: string;
  timestamp: number; // Unix timestamp in ms
  sequenceNumber: number; // Monotonic sequence for ordering
  competitionId: string;
  tenantId: string;
  senderId: string;
  senderRole: WSRole;
  payload: Record<string, unknown>;
}

/**
 * Playback Payloads (Game Day MP3 sync)
 */
export interface PlaybackStartedPayload {
  entryId: string;
  durationMs: number;
  startedAt: string;
}

export interface PlaybackPausedPayload {
  entryId: string;
  positionMs: number;
  pausedAt: string;
}

export interface PlaybackResumedPayload {
  entryId: string;
  positionMs: number;
  resumedAt: string;
}

export interface PlaybackPositionPayload {
  entryId: string;
  positionMs: number;
  durationMs: number;
  isPlaying: boolean;
}

export interface PlaybackEndedPayload {
  entryId: string;
  endedAt: string;
}

/**
 * Break Request Payloads
 */
export interface BreakRequestedPayload {
  requestId: string;
  judgeId: string;
  judgeName: string;
  durationMinutes: number;
  requestedAt: string;
}

export interface BreakApprovedPayload {
  requestId: string;
  judgeId: string;
  durationMinutes: number;
  scheduledStartTime: string;
  approvedBy: string;
  approvedAt: string;
}

export interface BreakDeniedPayload {
  requestId: string;
  judgeId: string;
  reason?: string;
  deniedBy: string;
  deniedAt: string;
}

export interface BreakStartedPayload {
  breakId: string;
  breakType: 'emergency' | 'scheduled' | 'judge_requested';
  durationMinutes: number;
  title: string;
  startedAt: string;
}

export interface BreakEndedPayload {
  breakId: string;
  actualDurationMinutes: number;
  endedEarly: boolean;
  endedAt: string;
}

/**
 * Presence Payloads
 */
export interface PresenceUser {
  userId: string;
  role: WSRole;
  deviceId: string;
  connectedAt: string;
}

export interface PresenceJoinedPayload {
  userId: string;
  role: WSRole;
  deviceId: string;
  joinedAt: string;
}

export interface PresenceLeftPayload {
  userId: string;
  role: WSRole;
  deviceId: string;
  leftAt: string;
}

export interface PresenceListPayload {
  users: PresenceUser[];
}

/**
 * Sync Payloads (Reconnection handling)
 */
export interface SyncRequestStatePayload {
  lastSequenceNumber: number;
}

export interface SyncStatePayload {
  competitionState: string;
  currentEntry: {
    entryId: string;
    entryNumber: number;
    title: string;
    studioName: string;
  } | null;
  playbackState: {
    isPlaying: boolean;
    positionMs: number;
    durationMs: number;
  } | null;
  scheduleDelay: number;
  judgesStatus: JudgeStatusPayload[];
  pendingBreakRequests: BreakRequestedPayload[];
  sequenceNumber: number;
}

export interface SyncMissedEventsPayload {
  events: WSMessage[];
  fromSequence: number;
  toSequence: number;
}

export interface SyncAckPayload {
  messageId: string;
  receivedAt: number;
}

/**
 * Competition Control Payloads
 */
export interface CompetitionStartedPayload {
  startedAt: string;
  dayNumber: number;
  sessionNumber: number;
  totalRoutines: number;
  firstEntryId: string;
}

export interface CompetitionPausedPayload {
  pausedAt: string;
  reason?: string;
  currentEntryId: string;
  playbackPositionMs: number;
}

export interface CompetitionResumedPayload {
  resumedAt: string;
  pauseDurationMs: number;
  currentEntryId: string;
}

export interface CompetitionEndedPayload {
  endedAt: string;
  totalCompleted: number;
  totalSkipped: number;
  totalScratched: number;
}

/**
 * Routine State Payloads
 */
export interface RoutineStartedPayload {
  entryId: string;
  entryNumber: number;
  title: string;
  studioName: string;
  category: string;
  durationMs: number;
  startedAt: string;
}

export interface RoutineScoringPayload {
  entryId: string;
  entryNumber: number;
  startedScoringAt: string;
}

export interface RoutineCompletedPayload {
  entryId: string;
  entryNumber: number;
  averageScore: number;
  awardLevel: string;
  scoresCount: number;
  completedAt: string;
}

export interface RoutineSkippedPayload {
  entryId: string;
  entryNumber: number;
  skippedBy: string;
  skippedAt: string;
}

export interface RoutineScratchedPayload {
  entryId: string;
  entryNumber: number;
  reason?: string;
  scratchedBy: string;
  scratchedAt: string;
}

export interface RoutineReorderedPayload {
  entryId: string;
  entryNumber: number;
  previousPosition: number;
  newPosition: number;
  reorderedBy: string;
}

/**
 * Score Payloads
 */
export interface ScoreSubmittedPayload {
  entryId: string;
  judgeId: string;
  judgeName: string;
  judgeNumber: number;
  score: number;
  awardLevel: string;
  submittedAt: string;
}

export interface ScoreEditedPayload {
  entryId: string;
  judgeId: string;
  previousScore: number;
  newScore: number;
  reason: string;
  editedBy: string;
  editedAt: string;
}

export interface ScoreVisibilityChangedPayload {
  judgesCanSeeScores: boolean;
  changedBy: string;
  changedAt: string;
}

/**
 * Schedule Payloads
 */
export interface ScheduleDelayUpdatedPayload {
  delayMinutes: number;
  previousDelayMinutes: number;
  updatedAt: string;
}

/**
 * OBS Overlay Payloads (optional integration)
 */
export interface OverlayRoutineInfoPayload {
  entryNumber: number;
  title: string;
  studioName: string;
  studioLogo?: string;
  category: string;
  ageGroup: string;
  size: string;
  dancers: string[];
  durationMs: number;
}

export interface OverlayScoreDisplayPayload {
  entryId: string;
  scores: Array<{
    judgePosition: 'A' | 'B' | 'C';
    score: number;
  }>;
  averageScore: number;
  awardLevel: string;
  awardColor?: string;
}

export interface OverlayStudioInfoPayload {
  studioName: string;
  studioLogo?: string;
  studioLocation?: string;
  routineCount: number;
}

export interface OverlayAwardAnnouncementPayload {
  entryNumber: number;
  title: string;
  studioName: string;
  awardLevel: string;
  awardColor: string;
  averageScore: number;
  specialAwards?: string[];
}

/**
 * Error Payloads
 */
export interface ErrorPayload {
  code: 'UNAUTHORIZED' | 'FORBIDDEN' | 'NOT_FOUND' | 'INVALID_STATE' | 'RATE_LIMITED' | 'INTERNAL_ERROR';
  message: string;
  details?: Record<string, unknown>;
}

/**
 * Ping/Pong Payloads
 */
export interface PingPayload {
  clientTime: number;
}

export interface PongPayload {
  clientTime: number;
  serverTime: number;
  latencyMs: number;
}
