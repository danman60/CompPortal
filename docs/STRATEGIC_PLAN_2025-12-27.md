# Strategic Plan - December 27, 2025

## Critical Risks (Fix Immediately)

### 1. Scoring Has No Authentication
- **File:** scoring.ts lines 18-19
- **Risk:** Anyone can submit/edit scores without auth
- **Impact:** Competition integrity, legal liability
- **Fix:** 30 min - add protectedProcedure

### 2. Branch Divergence (~300 commits)
- **Risk:** Merge conflicts compound over time
- **Action:** Merge immediately after Phase 3-4 testing passes

### 3. No Offline/Recovery Strategy for Game Day
- Questions to answer:
  - What if wifi drops during judging?
  - What if tabulator crashes mid-competition?
  - Can judges work offline?

---

## Technical Debt

### Dead Code / Duplicates
| System | V1 | V2 | Action |
|--------|----|----|--------|
| Pipeline | reservation-pipeline | pipeline-v2 | Delete V1 after merge |
| Schedule | schedule | schedule-v2 | Delete V1 after merge |
| Rankings | rankings table | entries.category_placement | Pick one, delete other |

### Schema Issues
- scores table missing competition_id (requires join through entries)
- rankings table has 0 rows (unused)

### No Automated Tests
- Priority tests to add: invoice calc, capacity mgmt, scoring, multi-tenant isolation

---

## Prioritized Actions

### Immediate (P0)
- [ ] Fix scoring auth (publicProcedure → protectedProcedure) - 30 min
- [ ] Remove hardcoded test competition ID - 15 min

### This Week (P1)
- [ ] Test Game Day score submission flow - 2 hrs
- [ ] Test Media upload with 5 real photos - 1 hr
- [ ] Test MP3 upload with 3 real files - 1 hr
- [ ] Merge main → tester (tax fix) - 15 min

### Before First Competition (P1-P2)
- [ ] Full dry run with CD - 4 hrs
- [ ] Merge tester → main - 1 hr
- [ ] Delete V1 pipeline/schedule - 30 min
- [ ] Add invoice calculation tests - 2 hrs
- [ ] Document offline/recovery plan - 1 hr

---

## Key Questions to Answer

1. When is next competition needing Game Day?
2. Who can help test (need 2+ people)?
3. Venue wifi situation?
4. How many judges per competition?
5. Rollback plan if Game Day breaks mid-competition?

---

## Strategic Recommendations

### Stop Building, Start Testing
Current state:
- Phase 3: 85% code, 5% tested
- Phase 4: 90% code, 2% tested
- MP3: 90% code, 0% tested

Recommendation: Next 3-5 sessions = testing only. Get to 50% tested before new features.

### Pre-Competition Dry Run
- Day -7: Create test competition
- Day -5: Act as judges with tablets
- Day -3: Fix bugs found
- Day -1: Final prep

### Judge Auth Simplification
Consider PIN-based auth instead of full login for competition-day simplicity.

---

*Created: Dec 27, 2025*
