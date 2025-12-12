# Game Day Spec Completeness Audit

**Purpose:** Audit GAME_DAY_SPEC.md to ensure it has every function/instruction needed for autonomous implementation with full alignment and testability.

**Verdict:** ❌ **SPEC IS INCOMPLETE** - Cannot autonomously build. 47 gaps identified.

---

## AUDIT CATEGORIES

| Category | Status | Gaps |
|----------|--------|------|
| State Machines | ❌ MISSING | 5 |
| Data Models | ❌ INCOMPLETE | 8 |
| API Contracts | ❌ INCOMPLETE | 12 |
| WebSocket Protocol | ❌ MISSING | 6 |
| Test Acceptance Criteria | ❌ MISSING | 7 |
| Edge Case Handling | ⚠️ PARTIAL | 4 |
| Unanswered Questions | ❌ BLOCKING | 5 |
| **TOTAL** | | **47** |

---

## 1. STATE MACHINES - ❌ MISSING

The spec describes states but doesn't define valid transitions. Autonomous implementation BLOCKED.

### 1.1 Competition State Machine - NOT DEFINED

**NEEDED:**
```
┌─────────┐     start      ┌────────┐     pause     ┌────────┐
│ pending │ ────────────► │ active │ ────────────► │ paused │
└─────────┘                └────────┘                └────────┘
                               │                        │
                               │ end                    │ resume
                               ▼                        │
                          ┌───────────┐                 │
                          │ completed │ ◄───────────────┘
                          └───────────┘
```

**Questions requiring answers:**
- Can you go from `paused` directly to `completed`?
- Can you restart a `completed` competition?
- What happens to scores when paused?

### 1.2 Routine State Machine - NOT DEFINED

**NEEDED:**
```
┌────────┐    start     ┌─────────┐   complete   ┌───────────┐
│ queued │ ──────────► │ current │ ───────────► │ completed │
└────────┘              └─────────┘              └───────────┘
    │                       │
    │ scratch               │ skip
    ▼                       ▼
┌───────────┐          ┌─────────┐
│ scratched │          │ skipped │
└───────────┘          └─────────┘
```

**Questions requiring answers:**
- Can a `skipped` routine be un-skipped?
- Can a `scratched` routine be restored?
- Can `completed` routine be re-scored?

### 1.3 Score State Machine - NOT DEFINED

**NEEDED:**
```
┌───────┐    save     ┌───────┐    submit    ┌───────────┐
│ empty │ ─────────► │ draft │ ───────────► │ submitted │
└───────┘             └───────┘              └───────────┘
                          │                       │
                          │ discard               │ CD edit
                          ▼                       ▼
                     ┌───────┐              ┌────────┐
                     │ empty │              │ edited │
                     └───────┘              └────────┘
```

**Questions requiring answers:**
- Can judge edit after submit? (Spec says NO)
- Can CD edit multiple times?
- Is there a "final" state after all judges submit?

### 1.4 Break Request State Machine - NOT DEFINED

**NEEDED:**
```
┌─────────┐   approve   ┌──────────┐    end     ┌───────────┐
│ pending │ ─────────► │ approved │ ─────────► │ completed │
└─────────┘             └──────────┘            └───────────┘
    │                       │
    │ deny                  │ end early
    ▼                       ▼
┌────────┐             ┌───────────┐
│ denied │             │ completed │
└────────┘             └───────────┘
```

### 1.5 MP3 Playback State Machine - NOT DEFINED

**NEEDED:**
```
┌─────────┐    play    ┌─────────┐    pause   ┌────────┐
│ stopped │ ────────► │ playing │ ─────────► │ paused │
└─────────┘            └─────────┘            └────────┘
    ▲                      │                      │
    │ stop                 │ stop                 │ stop
    └──────────────────────┴──────────────────────┘
                           │
                           │ end (auto)
                           ▼
                      ┌────────┐
                      │ ended  │
                      └────────┘
```

---

## 2. DATA MODELS - ❌ INCOMPLETE

Spec mentions tables but doesn't define complete schemas with all fields, types, constraints, relationships.

### 2.1 `live_competition_state` - NOT DEFINED
**Spec says:** "State persists per competition"
**MISSING:**
- Full field list with types
- Default values
- Indexes
- Constraints

### 2.2 `break_requests` - NOT DEFINED
**Spec mentions:** Break request system
**MISSING:**
- Table schema
- Relationship to judges/competitions
- Status values enum

### 2.3 `schedule_breaks` - NOT DEFINED
**Spec mentions:** Emergency breaks
**MISSING:**
- Table schema
- Break types enum
- Position in schedule representation

### 2.4 `score_audit_log` - NOT DEFINED
**Spec mentions:** CD can edit scores
**MISSING:**
- Audit trail schema
- What fields to log
- Retention policy

### 2.5 Score validation rules - INCOMPLETE
**Spec says:** "Range: 60-100"
**MISSING:**
- Increment (0.1? 0.5? 1?)
- Rounding rules
- What if judge enters 59.9 or 100.1?

### 2.6 Entry number assignment - INCOMPLETE
**Spec says:** "Competition-wide, LOCKED"
**MISSING:**
- Starting number (100? 1?)
- Assignment algorithm
- What if entry is scratched - does number get reused?

### 2.7 MP3 file requirements - INCOMPLETE
**Spec says:** File naming convention
**MISSING:**
- Max file size
- Supported formats (MP3 only? WAV?)
- Duration limits
- Bitrate requirements

### 2.8 Chat message schema - NOT DEFINED
**Spec says:** "Local only, persists per competition"
**MISSING:**
- Message structure (sender, timestamp, content)
- Max message length
- Max message count

---

## 3. API CONTRACTS - ❌ INCOMPLETE

Spec lists endpoint names but not input/output schemas, error codes, or behavior.

### 3.1 Missing Input Schemas

| Endpoint | What's Missing |
|----------|----------------|
| `requestBreak` | `{ judgeId, duration }` - what validations? |
| `respondToBreak` | `{ requestId, approved, reason? }` - is reason optional? |
| `editScore` | `{ scoreId, newScore, reason }` - is reason required? |
| `reorderRoutine` | `{ routineId, newPosition }` - position format? index? after_id? |
| `scratchRoutine` | `{ routineId, reason? }` - max length of reason? |
| `setScoreVisibility` | `{ competitionId, visible }` - per-routine or global? |

### 3.2 Missing Output Schemas

| Endpoint | What's Missing |
|----------|----------------|
| `getLineup` | Does it include breaks? Scratched routines? |
| `getJudges` | Include pending break requests? |
| `getBreakRequests` | Include completed requests or only pending? |

### 3.3 Missing Error Definitions

**NO error codes defined for:**
- Score out of range
- Routine not found
- Judge not authorized
- Competition not active
- Break already responded
- Routine already scratched

### 3.4 Missing Validation Rules

| Field | Rule Needed |
|-------|-------------|
| `score` | 60-100, increment 0.5 or 1? |
| `reason` | Max 255 chars? Required or optional? |
| `duration` | Exactly 2, 5, or 10? Or any number? |
| `comments` | Max length? |

### 3.5 Missing Idempotency Rules

- What if judge submits same score twice?
- What if CD approves same break twice?
- What if reorder is called with same position?

### 3.6 Missing Rate Limits

- How many break requests per judge per hour?
- How many score edits per CD per routine?

---

## 4. WEBSOCKET PROTOCOL - ❌ MISSING

Spec says "sync" and "250ms latency" but no protocol defined.

### 4.1 Message Format - NOT DEFINED
**NEEDED:**
```typescript
interface WebSocketMessage {
  type: string;
  competitionId: string;
  payload: unknown;
  timestamp: number;
  sequenceNumber: number;
}
```

### 4.2 Event Types - NOT DEFINED
**NEEDED:**
- `competition:started`
- `competition:paused`
- `competition:ended`
- `routine:started`
- `routine:completed`
- `routine:skipped`
- `routine:scratched`
- `score:submitted`
- `score:edited`
- `break:requested`
- `break:approved`
- `break:denied`
- `break:started`
- `break:ended`
- `playback:started`
- `playback:paused`
- `playback:position`
- `playback:ended`
- `judge:connected`
- `judge:disconnected`

### 4.3 Connection Management - NOT DEFINED
- How to authenticate WebSocket?
- Room/channel structure?
- Reconnection strategy?
- Heartbeat interval?

### 4.4 Message Ordering - NOT DEFINED
- Sequence numbers?
- How to handle out-of-order messages?
- How to request missed messages?

### 4.5 Conflict Resolution - NOT DEFINED
- What if two CDs reorder at same time?
- What if score submitted while offline then synced?
- Last-write-wins? Or reject conflicts?

### 4.6 Latency Measurement - NOT DEFINED
- How to measure 250ms?
- What to do if exceeded?
- Is it round-trip or one-way?

---

## 5. TEST ACCEPTANCE CRITERIA - ❌ MISSING

Spec has no testable acceptance criteria. Implementation cannot verify correctness.

### 5.1 Missing Unit Test Criteria

| Feature | Needed |
|---------|--------|
| Score slider | Given value 75, award level should be "GOLD" |
| Break timer | Given 5 min break, countdown should tick every second |
| Entry numbers | Given 3 routines, numbers should be 111, 112, 113 |

### 5.2 Missing Integration Test Criteria

| Flow | Needed |
|------|--------|
| Score submission | Judge submits 82 → CD sees 82 within 250ms |
| Break request | Judge requests 5 min → CD sees request within 250ms |
| Reorder | CD moves 115 after 120 → All views update within 500ms |

### 5.3 Missing E2E Test Scenarios

**NEEDED for each user journey:**
```
GIVEN: Competition with 10 routines, 3 judges
WHEN: CD starts competition
THEN: All views show routine #1 as current
AND: Backstage shows "NOW PLAYING" for #1
AND: Judges see scoring screen for #1
```

### 5.4 Missing Performance Test Criteria

- MP3 download: 100 files in under 5 minutes on 10Mbps
- Score sync: 250ms latency 95th percentile
- Offline cache: 500MB MP3s + 10MB state

### 5.5 Missing Offline Test Criteria

```
GIVEN: Judge is scoring routine #50
WHEN: Network disconnects
THEN: Judge can still submit score locally
AND: Score syncs within 5 seconds of reconnect
```

### 5.6 Missing Security Test Criteria

- Judge cannot edit another judge's score
- Judge cannot access CD-only endpoints
- Scoreboard cannot submit scores

### 5.7 Missing Load Test Criteria

- 50 concurrent devices per competition
- 1000 scores submitted per hour
- 6000 MP3s in storage bucket

---

## 6. EDGE CASE HANDLING - ⚠️ PARTIAL

Some edge cases mentioned in Outstanding Questions, but answers not provided.

### 6.1 Corrupted MP3 - ❌ UNCLEAR
**Spec says:** Listed in Outstanding Questions
**Answer needed:** Pause and alert (per user answer)
**STILL MISSING:**
- Alert format/message
- Who gets alerted?
- Can competition continue?
- What displays on countdown?

### 6.2 Judge Disconnect Mid-Score - ❌ UNCLEAR
**Spec says:** Listed in Outstanding Questions
**Answer needed:** Must save locally (per user answer)
**STILL MISSING:**
- Auto-save interval?
- Resume UI flow?
- Does CD get notified?

### 6.3 Multi-Day Transitions - ❌ UNCLEAR
**Spec says:** Listed in Outstanding Questions
**MISSING:**
- How to end Day 1 and start Day 2?
- Does state carry over?
- Are entry numbers preserved?
- Do judges re-authenticate?

### 6.4 Late Song Upload - ❌ NOT ADDRESSED
**Spec says:** "last minute song loader for day-of"
**MISSING:**
- UI for upload
- Does it auto-download to all devices?
- How to assign to routine?

---

## 7. UNANSWERED QUESTIONS - ❌ BLOCKING

Spec Section 10 lists "Outstanding Questions" - these BLOCK autonomous implementation.

### 7.1 Judge Login Method - ❌ UNANSWERED
**Question:** PIN code? Password? Biometric?
**Impact:** Cannot implement judge auth without this.
**RECOMMENDATION:** PIN code (4-6 digits, assigned by CD)

### 7.2 Kiosk Mode Exit - ❌ UNANSWERED
**Question:** Full screen lock? How to exit?
**Impact:** Cannot implement kiosk mode.
**RECOMMENDATION:** Press ESC 3 times + enter admin PIN

### 7.3 Confirmation Dialog Text - ❌ UNANSWERED
**Question:** Exact text for reorder confirmation?
**Impact:** Minor, can use default.
**RECOMMENDATION:** "Are you sure you want to move [ROUTINE] to [POSITION]? This will update the schedule."

### 7.4 Special Awards Timing - ❌ UNANSWERED
**Question:** Per session or per event?
**Impact:** Cannot implement special awards.
**RECOMMENDATION:** During scoring (checkbox), awarded at end of session.

### 7.5 Score Increment - ❌ UNANSWERED
**Question:** What increment for 60-100 slider?
**Impact:** Cannot implement slider.
**RECOMMENDATION:** 0.5 increments (60.0, 60.5, 61.0, ...)

---

## 8. AMBIGUOUS REQUIREMENTS

Items that have multiple interpretations.

### 8.1 "See other judges' scores"
**Ambiguous:** Live updating? After submit? Current routine only?
**CLARIFICATION NEEDED:**
- Live updating as each judge submits
- Only for current routine
- Shown as: "J1: 82 | J2: -- | J3: 85"

### 8.2 "Schedule delay"
**Ambiguous:** How is delay calculated?
**CLARIFICATION NEEDED:**
- `delay = actual_start_time - scheduled_start_time`
- Updated after each routine completes
- Shown as: "+5 min" or "-3 min"

### 8.3 "Offline-first"
**Ambiguous:** What exactly is cached?
**CLARIFICATION NEEDED:**
- MUST cache: MP3s, lineup, competition state, pending scores
- MAY cache: Judge list, award levels, chat messages
- NEVER cache: Other competitions, sensitive auth tokens

### 8.4 "Breaks update schedule times"
**Ambiguous:** How are times recalculated?
**CLARIFICATION NEEDED:**
- Add break duration to all subsequent routine start times
- Show "(delayed)" indicator on affected routines
- Recalculate when break ends (if early)

---

## 9. MISSING FROM SPEC

Items not mentioned at all that are required.

### 9.1 Database Indexes
**MISSING:** No index definitions for new tables
**IMPACT:** Performance issues at scale

### 9.2 RLS Policies
**MISSING:** Row-level security for multi-tenant
**IMPACT:** Data leakage risk

### 9.3 Error Messages
**MISSING:** User-facing error message text
**IMPACT:** Poor UX on errors

### 9.4 Loading States
**MISSING:** What to show during loading
**IMPACT:** UX gaps

### 9.5 Empty States
**MISSING:** What to show when no data
**IMPACT:** UX gaps

### 9.6 Keyboard Shortcuts
**MISSING:** Any keyboard navigation for CD/Judge
**IMPACT:** Accessibility and efficiency

### 9.7 Responsive Breakpoints
**MISSING:** Mobile/tablet layouts not specified
**IMPACT:** Unknown if tablet judges need different UI

### 9.8 Accessibility (a11y)
**MISSING:** Screen reader, color contrast requirements
**IMPACT:** Legal/compliance risk

### 9.9 Browser Support
**MISSING:** Which browsers must work
**IMPACT:** Testing scope unknown

### 9.10 Rollback Procedures
**MISSING:** How to undo bad state
**IMPACT:** No recovery from errors

---

## 10. SPEC ADDITIONS REQUIRED

To make spec complete for autonomous implementation:

### 10.1 Add State Machine Definitions
```markdown
## STATE_MACHINES.md
- Competition states + transitions
- Routine states + transitions
- Score states + transitions
- Break states + transitions
- Playback states + transitions
```

### 10.2 Add Database Schema
```markdown
## DATABASE_SCHEMA.md
- All new tables with full DDL
- Indexes
- Constraints
- RLS policies
```

### 10.3 Add API Contracts
```markdown
## API_CONTRACTS.md
- Input schemas (Zod)
- Output schemas (TypeScript)
- Error codes + messages
- Validation rules
```

### 10.4 Add WebSocket Protocol
```markdown
## WEBSOCKET_PROTOCOL.md
- Message format
- Event types
- Connection management
- Conflict resolution
```

### 10.5 Add Test Specifications
```markdown
## TEST_SPECIFICATIONS.md
- Unit test cases
- Integration test cases
- E2E test scenarios
- Performance criteria
- Security test cases
```

### 10.6 Answer Remaining Questions
```markdown
## Update GAME_DAY_SPEC.md Section 10
- Move from "Outstanding" to "Decisions"
- Add to Decision Log
```

---

## 11. VERDICT

**SPEC STATUS:** ❌ INCOMPLETE - Cannot autonomously implement

**BLOCKING ISSUES (Must fix before implementation):**
1. No state machines defined
2. No database schemas for new tables
3. No WebSocket protocol
4. No API input/output schemas
5. 5 unanswered questions blocking core features

**HIGH PRIORITY (Should fix before implementation):**
1. No test acceptance criteria
2. Ambiguous requirements need clarification
3. Missing error handling specifications
4. Missing edge case resolutions

**MEDIUM PRIORITY (Can fix during implementation):**
1. Loading/empty states
2. Keyboard shortcuts
3. Responsive design details

---

## 12. RECOMMENDED NEXT STEPS

1. **Answer the 5 blocking questions** (30 min)
2. **Define all 5 state machines** (1 hour)
3. **Write database schemas for 4 new tables** (1 hour)
4. **Define WebSocket protocol** (1 hour)
5. **Write API contracts with Zod schemas** (2 hours)
6. **Write test acceptance criteria** (2 hours)

**Total to make spec complete:** ~8 hours of spec work

---

*This audit shows the spec is ~60% complete. The 40% missing will cause implementation to stall or produce incorrect behavior. Recommend completing spec before starting any code.*
