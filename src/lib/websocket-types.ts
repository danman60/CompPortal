/**
 * WebSocket Shared Types
 * Types and enums that can be safely imported by both server and client code
 */

/**
 * WebSocket Event Types
 */
export enum WSEvent {
  // Connection
  CONNECT = 'connect',
  DISCONNECT = 'disconnect',

  // Competition Control
  COMPETITION_START = 'competition:start',
  COMPETITION_PAUSE = 'competition:pause',
  COMPETITION_RESUME = 'competition:resume',
  COMPETITION_END = 'competition:end',

  // Routine State
  ROUTINE_QUEUED = 'routine:queued',
  ROUTINE_CURRENT = 'routine:current',
  ROUTINE_COMPLETED = 'routine:completed',
  ROUTINE_SKIPPED = 'routine:skipped',

  // Scoring
  SCORE_SUBMITTED = 'score:submitted',
  SCORE_UPDATED = 'score:updated',
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
  BREAK_END = 'break:end',

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
