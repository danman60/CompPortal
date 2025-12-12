# Game Day API Contracts

**Status:** COMPLETE - Ready for Implementation
**Last Updated:** December 11, 2025

---

## Overview

Complete tRPC API contracts with Zod schemas for Game Day endpoints.

---

## 1. Shared Schemas

### 1.1 Common Types

```typescript
import { z } from 'zod';

// Score range: 00.00-99.99 with XX.XX format (two decimals ALWAYS)
// Valid: 89.06, 42.67, 98.90, 75.00
// Invalid: 69, 72, 86.6, 89.3
export const ScoreSchema = z.number()
  .min(0, 'Score must be at least 0.00')
  .max(99.99, 'Score cannot exceed 99.99')
  .refine(
    (val) => Number.isFinite(val) && Math.round(val * 100) === val * 100,
    'Score must have exactly 2 decimal places'
  );

// String input validation (for form submissions)
export const ScoreInputSchema = z.string()
  .regex(/^\d{1,2}\.\d{2}$/, 'Score must be in XX.XX format (e.g., 89.06)')
  .transform((val) => parseFloat(val));

// Title Division breakdown score (whole numbers OK, max 20)
export const TitleBreakdownScoreSchema = z.number()
  .int('Title breakdown must be a whole number')
  .min(0)
  .max(20);

// Title Division categories
export const TitleBreakdownSchema = z.object({
  technique: TitleBreakdownScoreSchema,
  category2: TitleBreakdownScoreSchema, // TBD from client
  category3: TitleBreakdownScoreSchema,
  category4: TitleBreakdownScoreSchema,
  category5: TitleBreakdownScoreSchema,
});

// Break duration: 2, 5, or 10 minutes only
export const BreakDurationSchema = z.union([
  z.literal(2),
  z.literal(5),
  z.literal(10)
]);

// Competition state enum
export const CompetitionStateSchema = z.enum([
  'pending',
  'active',
  'paused',
  'completed'
]);

// Routine live status enum
export const RoutineLiveStatusSchema = z.enum([
  'queued',
  'current',
  'scoring',
  'completed',
  'skipped',
  'scratched'
]);

// Score status enum
export const ScoreStatusSchema = z.enum([
  'draft',
  'submitted',
  'edited',
  'final'
]);

// Break status enum
export const BreakStatusSchema = z.enum([
  'pending',
  'approved',
  'denied',
  'active',
  'completed',
  'cancelled'
]);

// Playback state enum
export const PlaybackStateSchema = z.enum([
  'idle',
  'loading',
  'ready',
  'playing',
  'paused',
  'ended',
  'error'
]);

// Adjudication level - TENANT-CONFIGURABLE
// Level names are stored in competition_settings.adjudication_levels per tenant
// Note: Use "Adjudication" not "Awards" per client terminology
export const AdjudicationLevelSchema = z.string().min(1);

// Adjudication level definition (from competition_settings)
export const AdjudicationLevelDefinitionSchema = z.object({
  name: z.string().min(1),
  min: z.number().min(0).max(99.99),
  max: z.number().min(0).max(99.99),
  color: z.string().regex(/^#[0-9A-Fa-f]{6}$/), // Hex color
});

// Full adjudication settings (stored in competition_settings.adjudication_levels)
export const AdjudicationSettingsSchema = z.object({
  levels: z.array(AdjudicationLevelDefinitionSchema),
  edgeCaseThreshold: z.number().default(0.1), // Alert when diff < this causes bump
});

// Edge case alert for score bumping
export const EdgeCaseAlertSchema = z.object({
  entryId: z.string().uuid(),
  entryNumber: z.number().int(),
  routineTitle: z.string(),
  judgeScores: z.array(z.object({
    judgeId: z.string(),
    judgeName: z.string(),
    score: ScoreSchema,
  })),
  average: ScoreSchema,
  expectedLevel: AdjudicationLevelSchema,
  actualLevel: AdjudicationLevelSchema,
  scoreDifference: z.number(), // e.g., 0.01
  alertType: z.literal('bumped_down'),
});

// UUID schema
export const UUIDSchema = z.string().uuid();

// Common response wrapper
export const SuccessResponseSchema = z.object({
  success: z.literal(true),
  message: z.string().optional()
});
```

### 1.2 Error Response

```typescript
export const ErrorResponseSchema = z.object({
  code: z.enum([
    'UNAUTHORIZED',
    'FORBIDDEN',
    'NOT_FOUND',
    'BAD_REQUEST',
    'INVALID_STATE',
    'CONFLICT',
    'RATE_LIMITED',
    'INTERNAL_ERROR'
  ]),
  message: z.string(),
  details: z.record(z.unknown()).optional()
});
```

---

## 2. Competition Control APIs

### 2.1 Start Competition

```typescript
// liveCompetition.startCompetition

// Input
export const StartCompetitionInputSchema = z.object({
  competitionId: UUIDSchema,
  dayNumber: z.number().int().positive().default(1),
  sessionNumber: z.number().int().positive().default(1),
});

// Output
export const StartCompetitionOutputSchema = z.object({
  success: z.literal(true),
  competitionId: UUIDSchema,
  state: CompetitionStateSchema,
  startedAt: z.string().datetime(),
  firstEntryId: UUIDSchema.nullable(),
  totalRoutines: z.number().int(),
});

// Errors
// - UNAUTHORIZED: Not logged in
// - FORBIDDEN: Not a CD for this competition
// - NOT_FOUND: Competition doesn't exist
// - INVALID_STATE: Competition already active or completed
```

### 2.2 Pause Competition

```typescript
// liveCompetition.pauseCompetition

// Input
export const PauseCompetitionInputSchema = z.object({
  competitionId: UUIDSchema,
  reason: z.string().max(255).optional(),
});

// Output
export const PauseCompetitionOutputSchema = z.object({
  success: z.literal(true),
  competitionId: UUIDSchema,
  state: z.literal('paused'),
  pausedAt: z.string().datetime(),
  currentEntryId: UUIDSchema.nullable(),
  playbackPositionMs: z.number().int(),
});

// Errors
// - INVALID_STATE: Competition not active
```

### 2.3 Resume Competition

```typescript
// liveCompetition.resumeCompetition

// Input
export const ResumeCompetitionInputSchema = z.object({
  competitionId: UUIDSchema,
});

// Output
export const ResumeCompetitionOutputSchema = z.object({
  success: z.literal(true),
  competitionId: UUIDSchema,
  state: z.literal('active'),
  resumedAt: z.string().datetime(),
  pauseDurationMs: z.number().int(),
});

// Errors
// - INVALID_STATE: Competition not paused
```

### 2.4 End Competition

```typescript
// liveCompetition.endCompetition

// Input
export const EndCompetitionInputSchema = z.object({
  competitionId: UUIDSchema,
});

// Output
export const EndCompetitionOutputSchema = z.object({
  success: z.literal(true),
  competitionId: UUIDSchema,
  state: z.literal('completed'),
  endedAt: z.string().datetime(),
  totalCompleted: z.number().int(),
  totalSkipped: z.number().int(),
  totalScratched: z.number().int(),
});
```

### 2.5 Get Live State

```typescript
// liveCompetition.getLiveState

// Input
export const GetLiveStateInputSchema = z.object({
  competitionId: UUIDSchema,
});

// Output
export const GetLiveStateOutputSchema = z.object({
  competitionId: UUIDSchema,
  competitionState: CompetitionStateSchema,
  currentEntry: z.object({
    id: UUIDSchema,
    entryNumber: z.number().int(),
    title: z.string(),
    studioName: z.string(),
    category: z.string(),
    state: RoutineLiveStatusSchema,
    startedAt: z.string().datetime().nullable(),
  }).nullable(),
  playback: z.object({
    state: PlaybackStateSchema,
    positionMs: z.number().int(),
    durationMs: z.number().int(),
    isPlaying: z.boolean(),
  }),
  scheduleDelayMinutes: z.number().int(),
  judgesCanSeeScores: z.boolean(),
  dayNumber: z.number().int(),
  sessionNumber: z.number().int(),
  lastSyncAt: z.string().datetime(),
});
```

### 2.7 Get Adjudication Levels (TENANT-CONFIGURABLE)

```typescript
// liveCompetition.getAdjudicationLevels

// Input
export const GetAdjudicationLevelsInputSchema = z.object({
  competitionId: UUIDSchema,
});

// Output - Returns tenant-specific adjudication levels from competition_settings
export const GetAdjudicationLevelsOutputSchema = z.object({
  competitionId: UUIDSchema,
  levels: z.array(AdjudicationLevelDefinitionSchema),
  edgeCaseThreshold: z.number(), // Alert when score diff < this causes level bump
});

// Usage: Call on Tabulator/Judge load to get tenant's custom adjudication levels
// The system reads from competition_settings.adjudication_levels (JSONB)
// Each tenant defines their own level names, score ranges, and colors

// Example Response:
// {
//   competitionId: "abc123...",
//   levels: [
//     { name: "Dynamic Diamond", min: 95.00, max: 99.99, color: "#00D4FF" },
//     { name: "Titanium", min: 92.00, max: 94.99, color: "#C0C0C0" },
//     { name: "Platinum", min: 88.00, max: 91.99, color: "#E5E4E2" },
//     { name: "Afterglow", min: 85.00, max: 87.99, color: "#FFD700" }
//   ],
//   edgeCaseThreshold: 0.1
// }
```

---

## 3. Routine Control APIs

### 3.1 Set Current Routine

```typescript
// liveCompetition.setCurrentRoutine

// Input
export const SetCurrentRoutineInputSchema = z.object({
  competitionId: UUIDSchema,
  entryId: UUIDSchema,
});

// Output
export const SetCurrentRoutineOutputSchema = z.object({
  success: z.literal(true),
  entryId: UUIDSchema,
  entryNumber: z.number().int(),
  title: z.string(),
  studioName: z.string(),
  category: z.string(),
  durationMs: z.number().int(),
  state: z.literal('current'),
  startedAt: z.string().datetime(),
});

// Errors
// - NOT_FOUND: Entry doesn't exist
// - INVALID_STATE: Entry not in 'queued' state
```

### 3.2 Advance to Next Routine

```typescript
// liveCompetition.advanceToNext

// Input
export const AdvanceToNextInputSchema = z.object({
  competitionId: UUIDSchema,
  completeCurrentAs: z.enum(['completed', 'skipped']).default('completed'),
});

// Output
export const AdvanceToNextOutputSchema = z.object({
  success: z.literal(true),
  previousEntryId: UUIDSchema.nullable(),
  previousEntryState: RoutineLiveStatusSchema.nullable(),
  nextEntryId: UUIDSchema.nullable(),
  nextEntry: z.object({
    id: UUIDSchema,
    entryNumber: z.number().int(),
    title: z.string(),
    studioName: z.string(),
  }).nullable(),
  isLastRoutine: z.boolean(),
});
```

### 3.3 Go to Previous Routine

```typescript
// liveCompetition.goToPrevious

// Input
export const GoToPreviousInputSchema = z.object({
  competitionId: UUIDSchema,
});

// Output
export const GoToPreviousOutputSchema = z.object({
  success: z.literal(true),
  previousEntryId: UUIDSchema,
  previousEntry: z.object({
    id: UUIDSchema,
    entryNumber: z.number().int(),
    title: z.string(),
    state: RoutineLiveStatusSchema,
  }),
});

// Errors
// - INVALID_STATE: Already at first routine
```

### 3.4 Reorder Routine

```typescript
// liveCompetition.reorderRoutine

// Input
export const ReorderRoutineInputSchema = z.object({
  competitionId: UUIDSchema,
  entryId: UUIDSchema,
  newPosition: z.number().int().positive(),
  // Alternative: insertAfterId for relative positioning
  insertAfterId: UUIDSchema.optional(),
});

// Output
export const ReorderRoutineOutputSchema = z.object({
  success: z.literal(true),
  entryId: UUIDSchema,
  entryNumber: z.number().int(), // Stays the same!
  previousPosition: z.number().int(),
  newPosition: z.number().int(),
  affectedEntries: z.array(z.object({
    id: UUIDSchema,
    entryNumber: z.number().int(),
    newPosition: z.number().int(),
  })),
});
```

### 3.5 Scratch Routine

```typescript
// liveCompetition.scratchRoutine

// Input
export const ScratchRoutineInputSchema = z.object({
  competitionId: UUIDSchema,
  entryId: UUIDSchema,
  reason: z.string().max(255).optional(),
});

// Output
export const ScratchRoutineOutputSchema = z.object({
  success: z.literal(true),
  entryId: UUIDSchema,
  entryNumber: z.number().int(),
  previousState: RoutineLiveStatusSchema,
  newState: z.literal('scratched'),
  reason: z.string().nullable(),
  scratchedAt: z.string().datetime(),
});

// Errors
// - INVALID_STATE: Routine already completed or scratched
```

### 3.6 Unskip Routine

```typescript
// liveCompetition.unskipRoutine

// Input
export const UnskipRoutineInputSchema = z.object({
  competitionId: UUIDSchema,
  entryId: UUIDSchema,
});

// Output
export const UnskipRoutineOutputSchema = z.object({
  success: z.literal(true),
  entryId: UUIDSchema,
  entryNumber: z.number().int(),
  newState: z.literal('queued'),
  newPosition: z.number().int(),
});

// Errors
// - INVALID_STATE: Routine not in 'skipped' state
```

---

## 4. Scoring APIs

### 4.1 Submit Score

```typescript
// liveCompetition.submitScore

// Input
export const SubmitScoreInputSchema = z.object({
  competitionId: UUIDSchema,
  entryId: UUIDSchema,
  judgeId: UUIDSchema,
  score: ScoreSchema, // 00.00-99.99 XX.XX format (two decimals required)
  comments: z.string().max(1000).optional(),
  specialAwardNomination: z.string().max(100).optional(),
  idempotencyKey: z.string().optional(), // Prevent duplicate submissions
});

// Output
export const SubmitScoreOutputSchema = z.object({
  success: z.literal(true),
  scoreId: UUIDSchema,
  entryId: UUIDSchema,
  judgeId: UUIDSchema,
  score: z.number(),
  adjudicationLevel: AdjudicationLevelSchema,
  submittedAt: z.string().datetime(),
  allScoresIn: z.boolean(),
  averageScore: z.number().nullable(),
});

// Errors
// - FORBIDDEN: Judge not authorized for this competition
// - NOT_FOUND: Entry not found
// - INVALID_STATE: Routine not in 'current' or 'scoring' state
// - CONFLICT: Score already submitted (without idempotency key)
// - BAD_REQUEST: Score out of range
```

### 4.2 Edit Score (CD Only)

```typescript
// liveCompetition.editScore

// Input
export const EditScoreInputSchema = z.object({
  competitionId: UUIDSchema,
  scoreId: UUIDSchema,
  newScore: ScoreSchema,
  reason: z.string().min(1).max(255),
});

// Output
export const EditScoreOutputSchema = z.object({
  success: z.literal(true),
  scoreId: UUIDSchema,
  previousScore: z.number(),
  newScore: z.number(),
  adjudicationLevel: AdjudicationLevelSchema,
  editedAt: z.string().datetime(),
  editedBy: UUIDSchema,
  auditLogId: UUIDSchema,
});

// Errors
// - FORBIDDEN: Not a CD
// - NOT_FOUND: Score not found
// - INVALID_STATE: Score already finalized
```

### 4.3 Get Routine Scores

```typescript
// liveCompetition.getRoutineScores

// Input
export const GetRoutineScoresInputSchema = z.object({
  entryId: UUIDSchema,
});

// Output
export const GetRoutineScoresOutputSchema = z.object({
  entryId: UUIDSchema,
  entryNumber: z.number().int(),
  title: z.string(),
  scores: z.array(z.object({
    scoreId: UUIDSchema,
    judgeId: UUIDSchema,
    judgeName: z.string(),
    judgeNumber: z.number().int(),
    score: z.number(),
    adjudicationLevel: AdjudicationLevelSchema,
    status: ScoreStatusSchema,
    comments: z.string().nullable(),
    submittedAt: z.string().datetime().nullable(),
    editedAt: z.string().datetime().nullable(),
  })),
  averageScore: z.number().nullable(),
  overallAdjudicationLevel: AdjudicationLevelSchema.nullable(),
  scoresCount: z.number().int(),
  expectedJudgesCount: z.number().int(),
  allScoresIn: z.boolean(),
});
```

### 4.4 Set Score Visibility

```typescript
// liveCompetition.setScoreVisibility

// Input
export const SetScoreVisibilityInputSchema = z.object({
  competitionId: UUIDSchema,
  judgesCanSeeScores: z.boolean(),
});

// Output
export const SetScoreVisibilityOutputSchema = z.object({
  success: z.literal(true),
  judgesCanSeeScores: z.boolean(),
  changedAt: z.string().datetime(),
});
```

### 4.5 Get Score History

```typescript
// liveCompetition.getScoreHistory

// Input
export const GetScoreHistoryInputSchema = z.object({
  scoreId: UUIDSchema,
});

// Output
export const GetScoreHistoryOutputSchema = z.object({
  scoreId: UUIDSchema,
  currentScore: z.number(),
  history: z.array(z.object({
    auditId: UUIDSchema,
    previousScore: z.number().nullable(),
    newScore: z.number(),
    editType: z.enum(['initial', 'judge_edit', 'cd_edit', 'finalized']),
    editReason: z.string().nullable(),
    editedBy: z.object({
      id: UUIDSchema,
      name: z.string(),
      role: z.string(),
    }),
    editedAt: z.string().datetime(),
  })),
});
```

---

## 5. Break Request APIs

### 5.1 Request Break (Judge)

```typescript
// liveCompetition.requestBreak

// Input
export const RequestBreakInputSchema = z.object({
  competitionId: UUIDSchema,
  judgeId: UUIDSchema,
  durationMinutes: BreakDurationSchema, // 2, 5, or 10
});

// Output
export const RequestBreakOutputSchema = z.object({
  success: z.literal(true),
  requestId: UUIDSchema,
  judgeId: UUIDSchema,
  durationMinutes: z.number().int(),
  status: z.literal('pending'),
  requestedAt: z.string().datetime(),
});

// Errors
// - RATE_LIMITED: Already have pending request
// - FORBIDDEN: Not a judge for this competition
```

### 5.2 Respond to Break Request (CD)

```typescript
// liveCompetition.respondToBreakRequest

// Input
export const RespondToBreakRequestInputSchema = z.object({
  requestId: UUIDSchema,
  approved: z.boolean(),
  denyReason: z.string().max(255).optional(), // Required if approved=false
});

// Output
export const RespondToBreakRequestOutputSchema = z.object({
  success: z.literal(true),
  requestId: UUIDSchema,
  status: z.enum(['approved', 'denied']),
  respondedAt: z.string().datetime(),
  scheduledBreakId: UUIDSchema.optional(), // If approved
});

// Errors
// - NOT_FOUND: Request not found
// - INVALID_STATE: Request already responded to
```

### 5.3 Cancel Break Request (Judge)

```typescript
// liveCompetition.cancelBreakRequest

// Input
export const CancelBreakRequestInputSchema = z.object({
  requestId: UUIDSchema,
});

// Output
export const CancelBreakRequestOutputSchema = z.object({
  success: z.literal(true),
  requestId: UUIDSchema,
  status: z.literal('cancelled'),
  cancelledAt: z.string().datetime(),
});

// Errors
// - INVALID_STATE: Request already responded to
```

### 5.4 Get Break Requests

```typescript
// liveCompetition.getBreakRequests

// Input
export const GetBreakRequestsInputSchema = z.object({
  competitionId: UUIDSchema,
  status: BreakStatusSchema.optional(), // Filter by status
});

// Output
export const GetBreakRequestsOutputSchema = z.object({
  requests: z.array(z.object({
    id: UUIDSchema,
    judgeId: UUIDSchema,
    judgeName: z.string(),
    judgeNumber: z.number().int(),
    durationMinutes: z.number().int(),
    status: BreakStatusSchema,
    requestedAt: z.string().datetime(),
    respondedAt: z.string().datetime().nullable(),
    respondedBy: z.string().nullable(),
  })),
  pendingCount: z.number().int(),
});
```

---

## 6. Schedule Break APIs

### 6.1 Add Emergency Break (CD)

```typescript
// liveCompetition.addEmergencyBreak

// Input
export const AddEmergencyBreakInputSchema = z.object({
  competitionId: UUIDSchema,
  durationMinutes: z.number().int().min(1).max(60),
  title: z.string().max(100).optional(),
  reason: z.string().max(255).optional(),
  insertAfterEntryId: UUIDSchema.optional(), // Default: after current
});

// Output
export const AddEmergencyBreakOutputSchema = z.object({
  success: z.literal(true),
  breakId: UUIDSchema,
  durationMinutes: z.number().int(),
  position: z.number().int(),
  scheduledStartTime: z.string().datetime().nullable(),
  newScheduleDelay: z.number().int(),
});
```

### 6.2 End Break Early (CD)

```typescript
// liveCompetition.endBreakEarly

// Input
export const EndBreakEarlyInputSchema = z.object({
  breakId: UUIDSchema,
});

// Output
export const EndBreakEarlyOutputSchema = z.object({
  success: z.literal(true),
  breakId: UUIDSchema,
  actualDurationMinutes: z.number(),
  timeSavedMinutes: z.number(),
  newScheduleDelay: z.number().int(),
  endedAt: z.string().datetime(),
});

// Errors
// - INVALID_STATE: Break not active
```

### 6.3 Get Schedule Breaks

```typescript
// liveCompetition.getScheduleBreaks

// Input
export const GetScheduleBreaksInputSchema = z.object({
  competitionId: UUIDSchema,
  dayNumber: z.number().int().optional(),
});

// Output
export const GetScheduleBreaksOutputSchema = z.object({
  breaks: z.array(z.object({
    id: UUIDSchema,
    breakType: z.enum(['emergency', 'scheduled', 'lunch', 'awards', 'judge_requested']),
    title: z.string().nullable(),
    durationMinutes: z.number().int(),
    status: z.enum(['scheduled', 'active', 'completed', 'skipped']),
    position: z.number().int(),
    dayNumber: z.number().int(),
    scheduledStartTime: z.string().datetime().nullable(),
    actualStartTime: z.string().datetime().nullable(),
    actualEndTime: z.string().datetime().nullable(),
  })),
});
```

---

## 7. Judge APIs

### 7.1 Judge Login

```typescript
// liveCompetition.judgeLogin

// Input
export const JudgeLoginInputSchema = z.object({
  competitionId: UUIDSchema,
  judgeNumber: z.number().int().positive(),
  pin: z.string().length(6).regex(/^\d+$/), // 6-digit PIN
  deviceId: z.string().optional(),
});

// Output
export const JudgeLoginOutputSchema = z.object({
  success: z.literal(true),
  judgeId: UUIDSchema,
  judgeName: z.string(),
  judgeNumber: z.number().int(),
  sessionToken: z.string(),
  expiresAt: z.string().datetime(),
});

// Errors
// - UNAUTHORIZED: Invalid PIN
// - NOT_FOUND: Judge number not found
```

### 7.2 Get Judge Status

```typescript
// liveCompetition.getJudgeStatus

// Input
export const GetJudgeStatusInputSchema = z.object({
  competitionId: UUIDSchema,
});

// Output
export const GetJudgeStatusOutputSchema = z.object({
  judges: z.array(z.object({
    id: UUIDSchema,
    name: z.string(),
    judgeNumber: z.number().int(),
    currentStatus: z.enum(['offline', 'connected', 'scoring', 'submitted', 'break_requested']),
    lastSeenAt: z.string().datetime().nullable(),
    scoresSubmittedToday: z.number().int(),
    pendingBreakRequest: z.boolean(),
  })),
  totalJudges: z.number().int(),
  connectedCount: z.number().int(),
});
```

---

## 8. Lineup APIs

### 8.1 Get Lineup

```typescript
// liveCompetition.getLineup

// Input
export const GetLineupInputSchema = z.object({
  competitionId: UUIDSchema,
  dayNumber: z.number().int().optional(),
  includeScratched: z.boolean().default(false),
});

// Output
export const GetLineupOutputSchema = z.object({
  competitionId: UUIDSchema,
  competitionName: z.string(),
  dayNumber: z.number().int(),
  lineup: z.array(z.union([
    // Routine entry
    z.object({
      type: z.literal('routine'),
      id: UUIDSchema,
      entryNumber: z.number().int(),
      position: z.number().int(),
      title: z.string(),
      studioName: z.string(),
      studioCode: z.string(),
      category: z.string(),
      classification: z.string(),
      ageGroup: z.string(),
      performerCount: z.number().int(),
      durationMs: z.number().int(),
      mp3Url: z.string().nullable(),
      liveStatus: RoutineLiveStatusSchema,
      scheduledTime: z.string().nullable(),
    }),
    // Break entry
    z.object({
      type: z.literal('break'),
      id: UUIDSchema,
      position: z.number().int(),
      breakType: z.string(),
      title: z.string(),
      durationMinutes: z.number().int(),
      status: z.string(),
    }),
  ])),
  totalRoutines: z.number().int(),
  completedCount: z.number().int(),
  scratchedCount: z.number().int(),
  scheduleDelayMinutes: z.number().int(),
});
```

### 8.2 Get MP3 List

```typescript
// liveCompetition.getMP3List

// Input
export const GetMP3ListInputSchema = z.object({
  competitionId: UUIDSchema,
  dayNumber: z.number().int().optional(),
});

// Output
export const GetMP3ListOutputSchema = z.object({
  mp3s: z.array(z.object({
    entryId: UUIDSchema,
    entryNumber: z.number().int(),
    title: z.string(),
    studioCode: z.string(),
    filename: z.string(),
    url: z.string(),
    durationMs: z.number().int().nullable(),
    sizeBytes: z.number().int().nullable(),
    validated: z.boolean(),
    validationError: z.string().nullable(),
  })),
  totalCount: z.number().int(),
  totalSizeBytes: z.number().int(),
});
```

---

## 9. Standings APIs

### 9.1 Get Standings

```typescript
// liveCompetition.getStandings

// Input
export const GetStandingsInputSchema = z.object({
  competitionId: UUIDSchema,
  category: z.string().optional(),
  ageGroup: z.string().optional(),
  classification: z.string().optional(),
  limit: z.number().int().min(1).max(100).default(50),
});

// Output
export const GetStandingsOutputSchema = z.object({
  competitionId: UUIDSchema,
  filters: z.object({
    category: z.string().nullable(),
    ageGroup: z.string().nullable(),
    classification: z.string().nullable(),
  }),
  standings: z.array(z.object({
    rank: z.number().int(),
    entryId: UUIDSchema,
    entryNumber: z.number().int(),
    title: z.string(),
    studioName: z.string(),
    category: z.string(),
    ageGroup: z.string(),
    averageScore: z.number(),
    adjudicationLevel: AdjudicationLevelSchema,
    scoresCount: z.number().int(),
  })),
  totalEntries: z.number().int(),
});
```

---

## 10. Statistics APIs

### 10.1 Get Live Stats

```typescript
// liveCompetition.getLiveStats

// Input
export const GetLiveStatsInputSchema = z.object({
  competitionId: UUIDSchema,
});

// Output
export const GetLiveStatsOutputSchema = z.object({
  competitionId: UUIDSchema,
  state: CompetitionStateSchema,
  progress: z.object({
    totalRoutines: z.number().int(),
    completed: z.number().int(),
    current: z.number().int(),
    queued: z.number().int(),
    skipped: z.number().int(),
    scratched: z.number().int(),
    percentComplete: z.number(),
  }),
  timing: z.object({
    startedAt: z.string().datetime().nullable(),
    projectedEndTime: z.string().datetime().nullable(),
    scheduleDelayMinutes: z.number().int(),
    averageRoutineDurationMs: z.number().int(),
  }),
  scoring: z.object({
    totalScoresSubmitted: z.number().int(),
    averageScore: z.number().nullable(),
    awardDistribution: z.record(z.string(), z.number().int()),
  }),
  judges: z.object({
    total: z.number().int(),
    connected: z.number().int(),
    scoring: z.number().int(),
  }),
});
```

---

## 11. Implementation Example

```typescript
// src/server/routers/liveCompetition.ts

import { router, protectedProcedure, publicProcedure } from '../trpc';
import {
  SubmitScoreInputSchema,
  SubmitScoreOutputSchema,
  // ... other schemas
} from './schemas/liveCompetitionSchemas';

export const liveCompetitionRouter = router({
  submitScore: protectedProcedure
    .input(SubmitScoreInputSchema)
    .output(SubmitScoreOutputSchema)
    .mutation(async ({ input, ctx }) => {
      // Validate judge authorization
      // Validate routine state
      // Save score with audit log
      // Broadcast via WebSocket
      // Return result
    }),

  // ... other endpoints
});
```

---

*API contracts are complete with all input/output Zod schemas, validation rules, and error codes. Ready for implementation.*
