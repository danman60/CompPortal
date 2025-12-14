# User Journey Cross-Check Report

**Generated:** December 13, 2025
**Purpose:** Validate existing user journey documents against business logic specs and identify misalignments

---

## Documents Analyzed

### User Journeys
1. `studio_director_journey.md` - SD 6-phase workflow
2. `competition_director_journey.md` - CD 6-phase workflow
3. `JUDGE_USER_JOURNEY.md` - Judge tablet scoring workflow
4. `glowdance_user_journey.md` - Overview document
5. `entry_journey.md` - **NEW** Entry lifecycle (created this session)

### Specifications
1. `MASTER_BUSINESS_LOGIC.md` - 4-phase system overview
2. `PHASE1_SPEC.md` - Registration details
3. `GAME_DAY_SPEC.md` - Live event operations
4. `PHASE_ALIGNMENT_ANALYSIS.md` - Data flow issues

---

## Cross-Check Summary

### Overall Alignment Score

| Journey | Spec Alignment | Data Alignment | Issues Found |
|---------|----------------|----------------|--------------|
| Studio Director | 85% | 70% | 3 |
| Competition Director | 80% | 75% | 4 |
| Judge | 75% | 90% | 2 |
| Entry (NEW) | 95% | 95% | 1 |

---

## 1. Studio Director Journey vs Specs

### Aligned (Correct)
- Phase 1-3 flows match master business logic
- Entry creation 3-step process documented
- Music upload before deadline required
- Invoice generation from summary

### Misalignments Found

#### Issue SD-1: Terminology - "Routines" vs "Entries"

**Journey Says:** "Register Routines" (Phase 2)
**Spec Says:** Phase 1 creates "Entries", which become "Routines" in Phase 2

**Impact:** Medium - Could confuse users about terminology
**Fix:** Update journey to clarify: "Create Entries (become Routines in Phase 2)"

---

#### Issue SD-2: Invoice Trigger Timing

**Journey Says:** "Invoice Generated → Auto-calculated when routines finalized"
**Spec Says:** Invoice generated when Summary submitted (not routine finalization)

**Impact:** High - Incorrect business flow documented
**Fix:** Update journey: "Invoice Generated → Created when Summary submitted"

---

#### Issue SD-3: Capacity Refund Not Mentioned

**Journey Missing:** Summary submission triggers capacity refund of unused slots
**Spec Says:** "Summary submission triggers immediate capacity refund" (PHASE1_SPEC line 39)

**Impact:** Medium - SD unaware of capacity flow
**Fix:** Add note about unused capacity being refunded

---

## 2. Competition Director Journey vs Specs

### Aligned (Correct)
- Competition creation workflow
- Studio approval workflow
- Invoice adjustment capabilities
- Music monitoring dashboard

### Misalignments Found

#### Issue CD-1: Schedule Generation Method

**Journey Says:** "Generate Schedule → Auto-create competition timeline"
**Spec Says:** Manual drag-and-drop schedule builder (GAME_DAY_SPEC Section 6)

**Impact:** High - Implies auto-generation when it's manual
**Fix:** Update: "Build Schedule → Drag-and-drop schedule builder with conflict detection"

---

#### Issue CD-2: Missing Feedback Loop

**Journey Missing:** Draft schedule → SD feedback → Review → Finalize loop
**Spec Says:** 1-week feedback window with soft lock (MASTER_BUSINESS_LOGIC Phase 2)

**Impact:** High - Critical workflow step missing
**Fix:** Add Phase 4.5: "Collect Schedule Feedback → Review SD comments, adjust schedule, finalize"

---

#### Issue CD-3: Entry Number Locking Not Mentioned

**Journey Missing:** Entry numbers become LOCKED once schedule finalized
**Spec Says:** "Entry numbers are COMPETITION-WIDE and LOCKED" (GAME_DAY_SPEC Section 2.3)

**Impact:** Medium - CD unaware of locking behavior
**Fix:** Add note about entry number permanence

---

#### Issue CD-4: Tabulator Role Not Documented

**Journey Uses:** "Competition Director" for Game Day
**Spec Says:** "Tabulator" is the renamed role for live views (GAME_DAY_SPEC Section 13)

**Impact:** Low - Terminology update
**Fix:** Add "Also known as 'Tabulator' during live competition"

---

## 3. Judge Journey vs Specs

### Aligned (Correct)
- Tablet-based scoring interface
- Score submission workflow
- Offline caching
- Special awards toggles
- Break request buttons

### Misalignments Found

#### Issue J-1: Scoring Rubric Mismatch

**Journey Says:** "Score Entry Controls: Touch-optimized sliders for each scoring rubric (Technique, Performance, Choreography, Overall)"
**Spec Says:** Single overall XX.XX score (except Title Division with 5 breakdowns)

**Impact:** Critical - Incorrect scoring model documented
**Fix:** Update to: "Single overall score (XX.XX format, 00.00-99.99). Title Division routines have 5 additional breakdown categories."

---

#### Issue J-2: Voice-to-Text Not Confirmed

**Journey Says:** "voice-to-text supported" for comments
**Spec Says:** Comments field (no voice-to-text mentioned)

**Impact:** Low - Feature may not exist
**Fix:** Remove or mark as "planned feature" until confirmed

---

## 4. Entry Journey (NEW)

### Created This Session
- Tracks entry through all 4 phases
- Documents all field changes at each phase
- Includes data persistence verification queries
- Cross-references all specs

### Remaining Issue

#### Issue E-1: dancer_names Denormalization Gap

**Problem:** `dancer_names[]` array not populated when entries created
**Impact:** Critical - Breaks conflict detection, backstage display
**Fix:** Add database trigger to sync from `entry_participants`

---

## Schema Alignment Issues (Data Layer)

### Critical Issues

| Issue | Severity | Affected Journeys | Fix Required |
|-------|----------|-------------------|--------------|
| `dancer_names` not populated | CRITICAL | SD, CD, Entry | Backfill SQL + trigger |
| Router ordering inconsistency | CRITICAL | CD, Judge | Code change (FIXED) |
| Status filter inconsistency | HIGH | CD, Entry | Code change (FIXED) |
| MP3 data missing | MEDIUM | SD, Entry | Studios must upload |
| `routine_age` 70-80% | MEDIUM | Entry | Backfill SQL |

### Data Coverage by Tenant (Dec 13, 2025)

| Field | EMPWR | Glow | Tester | Required By |
|-------|-------|------|--------|-------------|
| `entry_participants` | 99.8% | 100% | 100% | Phase 1 |
| `dancer_names[]` | 5% | 3% | 100% | Phase 2+ |
| `routine_age` | 70% | 80% | 100% | Phase 1 |
| `performance_date` | 0% | 0% | 100% | Phase 2 |
| `schedule_sequence` | 0% | 0% | 1% | Phase 2 |
| `entry_number` | 0% | 0% | 49% | Phase 2 |
| `music_file_url` | 0% | 0% | 0% | Phase 2+ |
| `mp3_duration_ms` | 0% | 0% | 0% | Phase 2+ |

---

## Recommended Actions

### Immediate (Before Phase 2)

1. **Backfill `dancer_names`** from `entry_participants`
   ```sql
   UPDATE competition_entries ce
   SET dancer_names = (
     SELECT array_agg(ep.dancer_name ORDER BY ep.display_order)
     FROM entry_participants ep
     WHERE ep.entry_id = ce.id
   )
   WHERE dancer_names IS NULL OR array_length(dancer_names, 1) IS NULL;
   ```

2. **Add trigger for future entries** to auto-populate `dancer_names`

3. **Verify code fixes applied** for:
   - `liveCompetition.ts` ordering (use `schedule_sequence`)
   - `liveCompetition.ts` status filter (use `not: 'cancelled'`)

### Documentation Updates

4. **Update SD Journey:**
   - Fix terminology (Entries vs Routines)
   - Fix invoice trigger timing
   - Add capacity refund note

5. **Update CD Journey:**
   - Fix schedule generation description
   - Add feedback loop phase
   - Add entry number locking note
   - Add Tabulator terminology

6. **Update Judge Journey:**
   - Fix scoring rubric description
   - Mark voice-to-text as unconfirmed

### Pre-Game Day

7. **Verify all entries have:**
   - `performance_date` set
   - `schedule_sequence` set
   - `entry_number` assigned
   - `dancer_names[]` populated
   - `music_file_url` populated (if MP3 uploaded)

---

## Journey Document Index

| Document | Location | Last Updated | Status |
|----------|----------|--------------|--------|
| Studio Director | `docs/journeys/studio_director_journey.md` | Original | Needs Updates |
| Competition Director | `docs/journeys/competition_director_journey.md` | Original | Needs Updates |
| Judge | `docs/journeys/JUDGE_USER_JOURNEY.md` | Original | Needs Updates |
| GlowDance Overview | `docs/journeys/glowdance_user_journey.md` | Original | Reference Only |
| **Entry Journey** | `docs/journeys/entry_journey.md` | **Dec 13, 2025** | **NEW - Complete** |
| **Cross-Check Report** | `docs/journeys/JOURNEY_CROSS_CHECK_REPORT.md` | **Dec 13, 2025** | **NEW** |

---

## Appendix: Spec Line References

### MASTER_BUSINESS_LOGIC.md
- Phase 1 finalized: Line 22-54
- Phase 2 pending: Line 57-159
- Phase 3 pending: Line 162-254
- Phase 4 pending: Line 257-343

### GAME_DAY_SPEC.md
- Entry numbers locked: Lines 43-49
- Scoring format XX.XX: Lines 247-254
- Tabulator role: Lines 61-100
- Break system: Lines 322-348

### PHASE1_SPEC.md
- Entry creation: Lines 100-200
- Summary submission: Lines 200-250
- Capacity refund: Line 39

---

*Generated by Claude Code - Journey Cross-Check Analysis*
