# Classification Exception Approval System - Implementation Progress

**Started:** November 4, 2025
**Status:** ✅ IMPLEMENTATION COMPLETE - Ready for Testing
**Spec:** `docs/specs/CLASSIFICATION_EXCEPTION_APPROVAL_SPEC.md`
**Latest Commits:** 1d6f81d (classification logic), 786a966 (testing button)

---

## ✅ Completed (Latest: Commit 87e7c87)

### Backend (100% Complete):
- [x] Database migration applied (`classification_exception_requests` table)
- [x] RLS policies configured (SD/CD access control)
- [x] Prisma schema updated and generated
- [x] 6 tRPC routes implemented
- [x] Activity logging integrated
- [x] Build passes ✅

### Frontend - CD Components (100% Complete):
- [x] CD dashboard card added (with badge support)
- [x] `/dashboard/classification-requests` route created
- [x] `ClassificationRequestsPage` component (card + table views)
- [x] `ClassificationRequestDetailModal` component (full decision flow)
- [x] Type fixes (event_name → name, DashboardCard.badge)

### Frontend - SD Components (100% Complete):
- [x] `ClassificationRequestExceptionModal.tsx` created (src/components/)
- [x] Classification display moved to `AutoCalculatedSection.tsx` (lines 138-172)
- [x] Request button inline beside classification (correct UX)
- [x] Modal integration in `EntryCreateFormV2.tsx` (lines 19, 184, 226-239)
- [x] Duplicate title upgrade removed from `RoutineDetailsSection.tsx`
- [x] Duplicate classification section removed from entry form
- [x] Build passes ✅ (commit 87e7c87)

### UX Fixes (Commits eb5c214 → 87e7c87):
- [x] Classification moved from Routine Details to Auto-Calculated section
- [x] Exception button placed inline beside classification (not standalone section)
- [x] Title upgrade only appears once in form
- [x] Correct visual hierarchy and layout

---

## ✅ RESOLVED - Requirements Clarified (Nov 4, 2025)

**Status:** All conflicts resolved via user clarification. Implementation complete.

**Document:** `TRANSCRIPT_VS_SPEC_COMPARISON.md` (detailed analysis)

### Resolved Requirements:

1. **Classification Manual Override for Groups** ✅
   - **Decision:** Solos LOCKED, non-solos UNLOCKED
   - **Implementation:** Solo dropdown disabled + "+1 Bump" button, non-solo dropdown enabled
   - **Commit:** 1d6f81d (AutoCalculatedSection.tsx:270-289)

2. **Exception Request Trigger** ✅
   - **Decision:** Exception ONLY for going down OR up 2+ levels
   - **Implementation:** "Exception Required" button shows when levelDiff < 0 OR levelDiff >= 2
   - **Commit:** 1d6f81d (AutoCalculatedSection.tsx:98-114)

3. **Classification +1 Bump** ✅
   - **Decision:** +1 bump allowed WITHOUT exception
   - **Implementation:** Solos get "+1 Bump" button, no exception request needed
   - **Commit:** 1d6f81d (AutoCalculatedSection.tsx:117-126, 281-289)

---

## ⏳ Remaining Work (Post-Clarification)

### ✅ COMPLETED (Commit 1d6f81d + 786a966):
1. **Classification Logic** ✅
   - Solo: Locked dropdown + "+1 Bump" button (AutoCalculatedSection.tsx:270-289)
   - Non-Solo: Unlocked dropdown with exception logic (AutoCalculatedSection.tsx:267-278)
   - Auto-calculation from dancer classifications (AutoCalculatedSection.tsx:66-93)
   - Exception button visibility (AutoCalculatedSection.tsx:292-300)

2. **Extended Time Pricing Display** ✅
   - Solo: "$5 flat" displayed (ExtendedTimeSection.tsx:61-65)
   - Non-Solo: "$X = $2 × Y dancers" displayed (ExtendedTimeSection.tsx:61-65)
   - Pricing calculation (ExtendedTimeSection.tsx:39)

3. **Title Upgrade Visibility** ✅
   - Only shows for solos (EntryCreateFormV2.tsx:200)
   - Hidden for non-solos (EntryCreateFormV2.tsx:200)
   - Updated description text

4. **SA Testing Tools Button** ✅
   - Added test section to SA testing tools page (testing/page.tsx:217-258)
   - Quick access to test routine form
   - Prerequisites checklist
   - Feature testing list

### Pending (Lower Priority):
5. **Pre-Summary Warning Checklist** - NOT STARTED (NEW from transcript)
   - Show checklist before summary submission
   - Warn about dancer classifications being locked
   - (Transcript lines 445-514)

6. **Dancer Classification Locking Warning** - NOT STARTED (NEW from transcript)
   - Add warning to dancer creation form
   - "If you need to change classification, you must detach from routines first"
   - (Transcript lines 286-290, 406-442)

7. **Production End-to-End Testing** - READY TO TEST
   - Test classification auto-calculation (solo + group)
   - Test "+1 Bump" button (solo only)
   - Test "Exception Required" button (+2 levels / going down)
   - Test extended time pricing display
   - Test title upgrade visibility (solos only)
   - Test exception request modal workflow
   - Verify on BOTH tenants (EMPWR + Glow)

8. **Integration with Entry Creation** - PARTIAL
   - Classification props passed to form ✅
   - Exception modal integrated ✅
   - TODO: Pass actual entryId when entry created
   - TODO: Update entry status to `pending_classification_approval` when exception requested

### Lower Priority (Post-Launch):
9. **Summary Submission Blocker**
   - Block if any entries have status `pending_classification_approval`
   - Show warning with list of pending entries

10. **CSV Import Integration**
    - Grey out rows with requested exceptions
    - Show "Exception Requested" badge
    - Entry already created (greyed row stays in preview)

11. **Email Templates** (5 templates)
    - new-request (to CD)
    - approved (to SD)
    - resolved (to SD when CD sets different)
    - reminder (5-day to CD)
    - daily-digest (9 AM to CD)

12. **Daily Digest Cron Job**
    - 9 AM email
    - Only if pending items exist
    - Includes: requests, reservations, invoices

---

## Implementation Notes

### ⚠️ Key Business Rules - CONFLICTS DETECTED:

**From Phase 2 Spec:**
- Entry created **immediately** with `status = 'pending_classification_approval'`
- Classification always locked (SD never manually chooses) ← **CONFLICTS with transcript**
- No "denied" status - CD setting different classification IS the denial
- CSV violations: Entry created immediately, row greyed out (stays in preview)
- Age group override doesn't need approval (only classification)
- Request record stays for audit trail

**From Zoom Transcript (Nov 4):**
- Solo classification: Locked to dancer's classification
- Group classification: **CAN be manually changed** (lines 129-133) ← **CONFLICTS with spec**
- Exception request: Only for going DOWN or up 2+ levels (lines 658-668) ← **CONFLICTS with spec**
- +1 Bump: Allowed WITHOUT exception (lines 658-668) ← **CONFLICTS with spec**

**See `TRANSCRIPT_VS_SPEC_COMPARISON.md` for detailed analysis.**

### Data Model:
```typescript
classification_exception_requests {
  id, entry_id, reservation_id, competition_id, studio_id, tenant_id
  auto_calculated_classification_id
  requested_classification_id
  approved_classification_id (set by CD)
  sd_justification (required)
  cd_comments (optional)
  status: 'pending' | 'approved' | 'resolved'
  cd_decision_type: 'approved_as_requested' | 'approved_different'
  created_at, responded_at, reminder_sent_at
  created_by, responded_by
}
```

### File Locations:
- **Spec:** `docs/specs/CLASSIFICATION_EXCEPTION_APPROVAL_SPEC.md`
- **Comparison:** `TRANSCRIPT_VS_SPEC_COMPARISON.md` (NEW - conflicts analysis)
- **Migration:** `supabase/migrations/20251104_classification_exception_requests.sql`
- **Backend:** `src/server/routers/classificationRequest.ts`
- **CD Dashboard:** `src/components/CompetitionDirectorDashboard.tsx`
- **CD Page:** `src/components/ClassificationRequestsPage.tsx`
- **CD Modal:** `src/components/ClassificationRequestDetailModal.tsx`
- **SD Modal:** `src/components/ClassificationRequestExceptionModal.tsx`
- **Entry Form:** `src/components/rebuild/entries/EntryCreateFormV2.tsx`
- **Auto-Calculated Section:** `src/components/rebuild/entries/AutoCalculatedSection.tsx` (classification display)
- **Routine Details Section:** `src/components/rebuild/entries/RoutineDetailsSection.tsx` (title/choreographer)

---

## Next Steps (When Requirements Clarified):

1. **User answers 3 critical questions** (see TRANSCRIPT_VS_SPEC_COMPARISON.md)
2. Implement classification logic based on answers
3. Implement extended time pricing display
4. Implement title upgrade visibility (hide for non-solos)
5. Add pre-summary warning checklist
6. Add dancer classification locking warning
7. Test end-to-end on production (BOTH tenants)
8. Push to production for SD launch

---

**Status:** ✅ READY FOR TESTING
**Deadline:** November 5, 2025 for SD launch
**Latest Build:** ✅ Passing (commit 786a966)
**Latest Deployment:** Live on production (empwr.compsync.net)
**Testing URL:** https://empwr.compsync.net/dashboard/admin/testing (SA login → "Test New Routine Form" button)
