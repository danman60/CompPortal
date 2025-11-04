# Classification Exception Approval System - Implementation Progress

**Started:** November 4, 2025
**Status:** BLOCKED - Waiting for requirements clarification
**Spec:** `docs/specs/CLASSIFICATION_EXCEPTION_APPROVAL_SPEC.md`
**Latest Commits:** e65fb9d, e70611f, ea2ccba, eb5c214, 828dca2, af753ae, 87e7c87

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

## 🚨 BLOCKED - Requirements Clarification Needed

**Status:** Cannot proceed with classification implementation until requirements conflicts are resolved.

**Document:** `TRANSCRIPT_VS_SPEC_COMPARISON.md` (detailed analysis created)

### Critical Conflicts Preventing Implementation:

1. **Classification Manual Override for Groups**
   - **Phase 2 Spec says:** Classification ALWAYS locked, cannot manually change (spec line 11)
   - **Zoom Transcript says:** Groups CAN be manually changed by SD (transcript lines 129-133)
   - **Question:** Which is correct?
   - **Impact:** Fundamental UX difference - dropdown vs read-only display

2. **Exception Request Trigger**
   - **Phase 2 Spec says:** Exception needed for ANY classification change (implied by "locked")
   - **Zoom Transcript says:** Exception ONLY for going down OR up 2+ levels (NOT for +1 bump)
   - **Question:** When should "Request Exception" button appear?
   - **Impact:** Button visibility logic

3. **Classification +1 Bump**
   - **Phase 2 Spec says:** Classification locked, implies +1 needs exception
   - **Zoom Transcript says:** +1 bump allowed WITHOUT exception (transcript lines 658-668)
   - **Question:** Is +1 bump allowed without exception?
   - **Impact:** Dropdown options vs exception workflow

**Until Resolved:** Cannot implement classification auto-calculation or manual selection logic.

---

## ⏳ Remaining Work (Post-Clarification)

### High Priority (For Tomorrow's SD Launch):
1. **Classification Logic** - BLOCKED (waiting on Q1-Q3 above)
   - Implement based on user clarification
   - Solo: Exact dancer classification (confirmed in transcript)
   - Group: Manual selection OR locked with +1 bump? (CONFLICT)
   - Production: Auto-locked to "Production" (confirmed in spec)

2. **Extended Time Pricing Display** - NOT STARTED (NEW from transcript)
   - Solo: Show "$5 flat"
   - Groups: Show "$2 per dancer"
   - Location: ExtendedTimeSection.tsx
   - (Transcript lines 808-817)

3. **Title Upgrade Visibility** - NOT STARTED (NEW from transcript)
   - Hide title upgrade checkbox for non-solos
   - Only show for solos
   - (Transcript lines 820-844)

4. **Pre-Summary Warning Checklist** - NOT STARTED (NEW from transcript)
   - Show checklist before summary submission
   - Warn about dancer classifications being locked
   - (Transcript lines 445-514)

5. **Dancer Classification Locking Warning** - NOT STARTED (NEW from transcript)
   - Add warning to dancer creation form
   - "If you need to change classification, you must detach from routines first"
   - (Transcript lines 286-290, 406-442)

6. **Production Testing** - NOT STARTED
   - Test CD dashboard card and badge
   - Test CD requests page (card/table views)
   - Test CD decision flow (approve/set different)
   - Test SD request button visibility
   - Test SD modal UX
   - Verify on BOTH tenants (EMPWR + Glow)

7. **Integration with Entry Creation** - NOT STARTED
   - Pass actual entryId to modal (currently placeholder)
   - Show button based on clarified trigger rules
   - Update entry status to `pending_classification_approval`

### Lower Priority (Post-Launch):
8. **Summary Submission Blocker**
   - Block if any entries have status `pending_classification_approval`
   - Show warning with list of pending entries

9. **CSV Import Integration**
   - Grey out rows with requested exceptions
   - Show "Exception Requested" badge
   - Entry already created (greyed row stays in preview)

10. **Email Templates** (5 templates)
    - new-request (to CD)
    - approved (to SD)
    - resolved (to SD when CD sets different)
    - reminder (5-day to CD)
    - daily-digest (9 AM to CD)

11. **Daily Digest Cron Job**
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

**Status:** BLOCKED - Waiting for user to resolve spec conflicts
**Deadline:** Tomorrow (Nov 5) for SD launch
**Latest Build:** ✅ Passing (commit 87e7c87)
**Latest Deployment:** Waiting for Vercel (~2-3 min from push)
