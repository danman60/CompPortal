# Game Day Spec - Gap Analysis V2

**Date:** December 11, 2025
**Status:** Post-Client Feedback Review

---

## Critical Gaps Found

### 1. INCONSISTENCY: Score Range References Still Wrong

**Location:** GAME_DAY_SPEC.md lines 419, 433, 474, 497

| Line | Current Text | Should Be |
|------|--------------|-----------|
| 419 | "Update range to 60-100" | "Update to 00.00-99.99 XX.XX format" |
| 433 | "60-100 slider" | "00.00-99.99 XX.XX format (slider + typing)" |
| 474 | "0.5 increments" | "Two decimal places (XX.XX)" |
| 497 | "60-100 slider" | "00.00-99.99 XX.XX (both input methods)" |

**Priority:** P0 - Fix immediately

---

### 2. MISSING: Post-Competition Studio Printouts

**Client Quote:** "Studios receive printouts of all their scores from Judge A, B, C and the average at end of weekend"

**Required:**
- [ ] Define studio printout format
- [ ] List all data included (routine name, Judge A/B/C scores, average, adjudication level)
- [ ] PDF generation endpoint
- [ ] Batch print functionality

**Not Specified:**
- Is this one printout per routine or one per studio?
- Physical label vs full page report?
- Distribution method (email? physical hand-off?)

---

### 3. MISSING: Post-Competition Reports

**Client Quote:** "Scores flow into system for post-competition reports"

**Required:**
- [ ] Define what reports exist
- [ ] Report endpoints in API contracts
- [ ] Report templates

**Likely Reports:**
- Full competition results by category
- Studio summary report
- Judge consistency report
- Adjudication level distribution

---

### 4. MISSING: Title Division Categories (4 of 5)

**Client Quote:** "(4 other categories — screenshot sent separately)"

**Current Spec:** Only "Technique (20 points)" defined

**Blocking:** Cannot implement Title scoring without all 5 categories

**Action Required:** Get screenshot from client with category names

---

### 5. ✅ RESOLVED: Adjudication Level Thresholds

**Client mentions:** Afterglow, Titanium, Platinum, Dynamic Diamond

**Resolution:** Adjudication levels are **tenant-configurable** via competition settings.

**Implementation:**
- Store in `competition_settings` table per tenant
- Each tenant defines their own level names and score ranges
- System reads from settings, not hardcoded values

**Schema:**
```typescript
// competition_settings.adjudication_levels (JSONB)
{
  "levels": [
    { "name": "Dynamic Diamond", "min": 95.00, "max": 99.99, "color": "#00D4FF" },
    { "name": "Titanium", "min": 92.00, "max": 94.99, "color": "#C0C0C0" },
    { "name": "Platinum", "min": 88.00, "max": 91.99, "color": "#E5E4E2" },
    { "name": "Afterglow", "min": 85.00, "max": 87.99, "color": "#FFD700" }
  ]
}
```

**Status:** NOT BLOCKING - Configurable per tenant

---

### 6. MISSING: Edge Case Detection Algorithm

**Scenario:** 0.01 difference bumps down adjudication level

**Not Specified:**
- What threshold triggers alert? (0.01? 0.05? 0.1?)
- Algorithm to detect "would have been X level without this score"
- How to calculate "minimum score needed to stay at higher level"

**Proposed Algorithm:**
```typescript
function detectEdgeCase(scores: number[], thresholds: AdjudicationThreshold[]) {
  const average = scores.reduce((a, b) => a + b) / scores.length;
  const currentLevel = getLevel(average, thresholds);

  // Check if any single score is causing the bump
  for (let i = 0; i < scores.length; i++) {
    const withoutThisScore = [...scores];
    withoutThisScore[i] = Math.max(...scores); // Replace with highest
    const hypotheticalAvg = withoutThisScore.reduce((a, b) => a + b) / withoutThisScore.length;
    const hypotheticalLevel = getLevel(hypotheticalAvg, thresholds);

    if (hypotheticalLevel !== currentLevel) {
      return {
        alert: true,
        causingJudge: i,
        scoreDiff: Math.max(...scores) - scores[i],
        currentLevel,
        hypotheticalLevel
      };
    }
  }
  return { alert: false };
}
```

---

### 7. MISSING: Judge Position Assignment (A, B, C)

**Question:** How do we know which judge is Judge A vs B vs C?

**Options:**
1. Fixed assignment at competition setup (judge_position field)
2. Order of login determines position
3. Manual assignment by Tabulator

**Database Impact:** Need `judge_position` enum ('A' | 'B' | 'C') in judges table

---

### 8. MISSING: Score Submission Confirmation UI

**Client Flow:** "Judge enters score → Hits Submit → Score flows to tabulator"

**Not Specified:**
- What does judge see after submit?
- Can judge see their submitted score?
- Confirmation animation/message?

**Proposed:**
```
[SUBMIT SCORE]
      ↓
[Score Submitted ✓] (green confirmation)
      ↓
(locked - shows submitted value)
```

---

### 9. MISSING: "All Scores In" Indicator

**Client Quote:** "Once all 3 judges submit, tabulator sees complete picture"

**Not Specified:**
- Visual indicator when all 3 scores are in
- Sound/notification?
- Auto-advance to next routine?

**Proposed:**
- Row highlights green when 3/3 scores in
- Average becomes bold
- Adjudication level appears only when complete

---

### 10. DATABASE: Title Breakdown Scores Table Missing

**Current Schema:** Only single score field

**Required:** Either:
1. Add 5 columns to scores table:
   - `title_technique_score INT`
   - `title_category2_score INT`
   - `title_category3_score INT`
   - `title_category4_score INT`
   - `title_category5_score INT`

2. OR separate table:
```sql
CREATE TABLE title_score_breakdown (
  id UUID PRIMARY KEY,
  score_id UUID REFERENCES scores(id),
  technique INT,
  category2 INT,
  category3 INT,
  category4 INT,
  category5 INT
);
```

---

### 11. WEBSOCKET: Title Division Events Missing

**Current Protocol:** No events for title breakdown scores

**Required Events:**
```typescript
// title_score:submitted
{
  type: 'title_score:submitted',
  payload: {
    entryId: string,
    judgeId: string,
    mainScore: number,
    breakdown: {
      technique: number,
      category2: number,
      category3: number,
      category4: number,
      category5: number
    }
  }
}
```

---

### 12. MISSING: Label Printing Specification

**Client:** "Ability to print out labels with scores"

**Not Specified:**
- Label size (2x4 inch? 4x6 inch?)
- Label layout template
- Printer requirements
- Browser print vs thermal printer

---

### 13. MISSING: Missing Music Email Template

**Client:** "Programmer sends email a week before saying these ones were missing music"

**Not Specified:**
- Email subject line
- Email body template
- Is it automated or manual send?
- One email per studio or batch?

---

### 14. TERMINOLOGY: "CD" Still Used in Overview

**Line 14:** "Competition Director (CD) - Master control panel"

**Should Be:** "Tabulator" per client terminology

**Note:** Internal code can still use "CD" but user-facing should say "Tabulator"

---

### 15. MISSING: MP3 Missing at Competition Handling

**Scenario:** Routine is scheduled but MP3 was never uploaded

**Not Specified:**
- Error message shown?
- Can Tabulator manually start without music?
- Skip to next automatically?

---

### 16. CONFLICT: Judge Auth Method

**Section 10.2:** "6-digit PIN code"
**Section 8.1:** "login accounts"

**Clarification Needed:**
- Is PIN the only auth? Or PIN + account?
- Does PIN map to a judge account?

**Proposed:** PIN is a shortcut for existing judge account
- Judge has full account (email/password for setup)
- Competition day: Just enter 6-digit PIN linked to their account

---

### 17. MISSING: Unskip Functionality in UI

**State Machine:** Has `unskip()` transition from skipped → queued

**UI Spec:** No mention of how to unskip

**Proposed:** Tabulator can right-click skipped routine → "Return to Queue"

---

### 18. MISSING: Day Boundary Handling

**Client:** Multiple days of competition

**Not Specified:**
- What happens at midnight?
- Can Day 2 start before Day 1 ends?
- How to switch days in UI?

---

## Summary: Blocking vs Non-Blocking

### BLOCKING (Cannot Implement Without)

1. Title Division 5 category names (need client screenshot)
2. ~~Adjudication level thresholds~~ → **RESOLVED** (tenant-configurable via competition_settings)

### CAN PROCEED WITH DEFAULTS

3. Edge case detection threshold → **Default: 0.1 point difference** (configurable)

### HIGH PRIORITY (Should Define Before Implementation)

4. Judge position assignment (A/B/C)
5. Score range references still wrong in spec
6. Studio printout format
7. Title breakdown database schema

### MEDIUM PRIORITY (Can Defer)

8. Post-competition reports specification
9. Label printing template
10. Missing music email template
11. Unskip UI

### LOW PRIORITY (Nice to Have)

12. All scores in indicator style
13. Day boundary handling
14. MP3 missing error handling

---

## Action Items

1. ✅ **DONE:** Update score range references (lines 419, 433, 474, 497)
2. **ASK CLIENT:** Title Division category names (screenshot) - **ONLY BLOCKING ITEM**
3. ✅ **RESOLVED:** Adjudication level thresholds → Tenant-configurable via competition_settings
4. ✅ **DECIDED:** Edge case alert threshold = 0.1 point difference (configurable per tenant)
5. **DECIDE:** Judge position assignment method (recommend: fixed assignment at setup)
6. **ADD:** Title breakdown to database schema (can proceed with generic column names)
7. **ADD:** Title events to WebSocket protocol
8. **ADD:** adjudication_levels JSONB column to competition_settings

---

*Gap analysis complete. 17 gaps identified, **1 blocking** (Title Division category names).*

*Adjudication levels are tenant-configurable - each competition defines their own level names and thresholds.*
