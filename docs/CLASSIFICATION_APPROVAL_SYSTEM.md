# Classification Exception Request & Approval System

**Status:** Design Phase - Awaiting Implementation Decisions
**Created:** 2025-11-02
**Feature:** Allow Studio Directors to request classification exceptions from Competition Directors

---

## Business Context

Dancer classification determines routine classification per business logic in `classificationValidation.ts`:
- **Solo:** Must match dancer's exact classification (100% locked)
- **Duet/Trio:** Highest dancer classification, can bump up ONE level
- **Group (4-19):** 60% majority or highest, can bump up ONE level
- **Production (20+):** Auto-locked to "Production" classification (NO EXCEPTIONS)

When SD wants a classification outside these rules (e.g., bump down a level, use different level than calculated), they need CD approval.

---

## Complete Flow Summary

### 1. Entry Creation Validation (After Save Click)
- **Follows rules** → Entry creates immediately with success toast
- **Breaks rules** → Modal popup blocks creation, shows two options:
  - "Go Back" (fix classification manually within allowed range)
  - "Request Exception" (opens comments box - REQUIRED field for plain text justification)

### 2. Exception Request Submission
- Entry saved with `status = 'pending_classification_approval'`
- Entry LOCKED to SD (cannot edit until CD responds)
- Real-time email sent to CD: "New routine classification request from [Studio Name]"

### 3. CD Review Interface
- **Navigation:** Badge count in CD dashboard nav (e.g., "Requests (3)")
- **List View:** Card-based view of all pending requests
- **Filter:** By Studio only
- **Detail View (Card Click):** Shows:
  - Competition name
  - Routine details (name, style, duration)
  - All dancers + their individual classifications
  - Auto-calculated classification vs. Requested classification
  - SD's justification comments

### 4. CD Decision Options
- ✅ **Approve as Requested** → Entry becomes regular approved entry
- ❌ **Deny - Keep Auto-Calculated** → Entry goes to `status = 'denied'`, SD can edit/delete
- 🔄 **Approve with Different Classification** (dropdown) → Entry approved with CD's chosen level
- 📞 **Further Clarification Required** → Triggers offline call/conversation indication
- All decisions include optional CD comments box

### 5. SD Notification & Entry Status
- **Approved:** Entry becomes regular entry (same schema as normal), email + in-app notification to SD
- **Denied:** Entry status = 'denied', SD can edit classification and resubmit OR delete entry
- **Clarification Needed:** Indicates offline discussion needed

### 6. Edge Cases
- **No response after 5 days:** Send reminder email to CD (don't auto-expire request)
- **SD wants to cancel:** SD can delete entry before CD responds
- **Production entries (20+):** Auto-locked to "Production", no exceptions allowed
- **Multiple requests:** Won't happen - SD can only have one pending request per routine

---

## Detailed Q&A from Design Session

### Question 1: Entry Creation Flow & Validation

**Q: When does validation happen?**
- Does validation occur on the entry creation form before clicking "Save"?
- Or after clicking "Save" but before actually creating the entry in the database?

**A:** After clicking "Save" but before actually creating the entry - so the user can go back and fix it.

**Q: What happens when classification FOLLOWS the rules?**
- Entry creates immediately without any popup?
- Silent success or success toast?

**A:** Entry gets created immediately with a success toast.

**Q: What happens when classification BREAKS the rules?**
- Popup blocks creation entirely until they fix it or request approval?
- Can they save as "draft" or is it blocked completely?

**A:** Popup blocks entry creation. It doesn't go through. Not saved as draft - it just doesn't go through the system.

---

### Question 2: The Warning Popup (Rule Violation)

**Q: Popup options - which of these is correct?**
- Option A: "Fix Classification" button (stay within rules) OR "Request Exception" button
- Option B: Dropdown to pick allowed classifications + "Request Exception" button below
- Option C: Show error message with current violation + "Request CD Approval" button only

**A:** Option A-ish. Should be "Go Back" OR "Request Exception" where you can enter the comments right there and send the exception.

**Q: Comments box:**
- Required or optional?
- Example: "We want Intermediate because..." - is this what SD writes?

**A:** Comments box is REQUIRED. Yes, SD writes free plain text justification.

---

### Question 3: Request Submission & Status

**Q: What happens after SD submits request?**
- Entry saved with status = "pending_approval" or similar?
- SD can see it in their entries list as "Pending CD Approval"?
- Can SD edit/delete pending requests or are they locked?

**A:** Entry should be saved with status = 'pending_approval'. Once it's been sent to the CD, it should be LOCKED to the SD until the CD responds.

**Q: What if SD creates multiple entries that need approval?**
- Each one sends a separate email to CD?
- Or batched into one notification?

**A:** Each one will create its own email and notification.

---

### Question 4: CD Notification & Review Page

**Q: Email notification:**
- Real-time email for each request?
- Or daily digest?
- Subject line example: "New routine classification request from [Studio Name]"?

**A:** Real-time email. Subject line "New routine classification request from [Studio Name]" is great.

**Q: Quick menu button location:**
- In CD's dashboard navigation?
- Badge count showing pending requests (e.g., "Requests (3)")?

**A:** Yes, should be on the CD's dashboard navigation with badge count.

**Q: Review page structure:**
- List view of all pending requests (table format)?
- Click a request to see detail modal/page?
- Can CD filter by studio, classification, competition?

**A:** Should be CARD VIEW so they can click onto each one and read the comments. CD can filter by Studio ONLY (not classification or competition). But the review detail page should show which competition it's for.

---

### Question 5: CD Decision & Response

**Q: CD detail view shows:**
- Routine name, style, duration
- All dancers in routine with their individual classifications
- Requested classification vs. auto-calculated classification
- SD's comment/justification
- What competition/event this is for?

**A:** Yes, that's a good CD detail view. All of those elements.

**Q: CD decision options:**
- "Approve as Requested" button
- "Deny - Keep Auto-Calculated" button
- "Approve with Different Classification" (dropdown to pick different level)?
- Comments box for CD to explain decision?

**A:**
- Approve as Requested - YES
- Deny - Keep Auto-Calculated - YES
- Approve with Different Classification (dropdown) - YES
- Comments box for CD - YES (optional)
- Additional option: "Further Clarification Required" - sets up offline call/conversation indicator

**Q: What happens after CD approves?**
- Entry status changes from "pending_approval" → "approved"?
- Entry now visible in normal entries list?
- Email sent to SD: "Your request was approved/denied"?

**A:** After pending_approval, it goes to approved. Approved should be whatever a regular routine entry is classified as - just needs to be the same as any other successful routine that was created. No schema violations. Yes, email to SD.

---

### Question 6: SD Receives Decision

**Q: Notification to SD:**
- Email notification?
- In-app notification badge?
- Toast message when they log in?

**A:** Yes, email notification. Yes, in-app notification. Toast message OR no toast message (flexible).

**Q: Entry creation completion:**
- If approved: Entry automatically changes to active status?
- If denied: Entry stays at auto-calculated classification or gets deleted?
- Does SD get another chance to fix it if denied?

**A:**
- If denied, it needs to have a 'denied' status and can't be submitted in the summary until it's edited by the SD.
- SD is free to delete it prior to submission.
- If it gets denied, it stays in its status and SD can edit/delete.

---

### Question 7: Edge Cases

**Q: What if CD never responds?**
- Request sits pending forever?
- Auto-expire after X days?

**A:** Give it a 5-day expiration. After 5 days, send another email (reminder). Don't expire the request - just send another email.

**Q: What if SD wants to withdraw request?**
- Can they cancel before CD reviews?

**A:** Yes, the SD can cancel it and just fix it (delete the entry and recreate).

**Q: What if multiple requests for same routine?**
- Can SD re-submit if first request denied?

**A:** There won't be multiple requests for the same routine.

**Q: What about Production entries (20+ dancers)?**
- Are these auto-locked to "Production" with no exceptions?

**A:** Yes, Productions are automatically locked (no exceptions allowed).

---

## Implementation Questions (Awaiting Answers)

### 1. Database Schema - New Table or Extend Existing?

**Option A: New `classification_exception_requests` table**
```sql
CREATE TABLE classification_exception_requests (
  id UUID PRIMARY KEY,
  entry_id UUID REFERENCES competition_entries(id),
  requested_classification_id UUID REFERENCES classifications(id),
  auto_calculated_classification_id UUID REFERENCES classifications(id),
  sd_comments TEXT NOT NULL,
  cd_decision VARCHAR(50), -- 'approved', 'denied', 'clarification_needed', 'approved_different'
  cd_classification_id UUID REFERENCES classifications(id), -- If CD picks different level
  cd_comments TEXT,
  created_at TIMESTAMP,
  responded_at TIMESTAMP,
  reminder_sent_at TIMESTAMP,
  tenant_id UUID
);
```

**Option B: Extend `competition_entries` table**
- Add fields: `classification_request_status`, `sd_request_comments`, `cd_decision_comments`, etc.

**Question:** Which approach? New table keeps audit trail clean but adds complexity. Extended table is simpler but mixes concerns.

---

### 2. Email Templates

**Question:** Should I create email templates now or use placeholder text?

**Suggested Templates:**

**To CD (New Request):**
```
Subject: New Classification Request from [Studio Name] - [Routine Name]

A studio has requested a classification exception for a routine entry.

Studio: [Studio Name]
Routine: [Routine Name]
Competition: [Competition Name]
Requested Classification: [Classification Name]
Auto-Calculated: [Auto-Calculated Classification]

Justification:
[SD Comments]

Review Request: [Link to Review Page]
```

**To SD (Approved):**
```
Subject: Classification Request Approved - [Routine Name]

Your classification exception request has been approved!

Routine: [Routine Name]
Approved Classification: [Classification Name]

CD Comments: [Optional CD Comments]

Your entry is now active and will appear in your entries list.
```

**To SD (Denied):**
```
Subject: Classification Request Denied - [Routine Name]

Your classification exception request has been denied.

Routine: [Routine Name]
Auto-Calculated Classification: [Classification Name]

CD Comments: [Optional CD Comments]

You can edit the entry to use the auto-calculated classification or delete it.
```

**To CD (5-Day Reminder):**
```
Subject: REMINDER: Pending Classification Request from [Studio Name]

This request has been pending for 5 days.

Studio: [Studio Name]
Routine: [Routine Name]
Requested Classification: [Classification Name]

Review Request: [Link to Review Page]
```

---

### 3. In-App Notifications System

**Question:** Do we have an existing notifications system or build new?

**Suggested Implementation:**
- Bell icon in CD header with badge count (unread requests)
- Bell icon in SD header with badge count (pending/responded requests)
- Notification dropdown showing recent activity

**Requires:**
- New `notifications` table?
- Real-time updates via WebSocket/polling?

---

### 4. CD Review Page Route

**Question:** What should the route be?

**Suggested Options:**
- `/dashboard/director-panel/classification-requests` (alongside other CD tools)
- `/dashboard/admin/classification-requests` (if admin-only)
- `/dashboard/requests` (simpler)

**Preference?**

---

### 5. Entry CSV Import

**Question:** Does this exception flow apply to CSV-imported routines too?

**Scenario:** SD imports 50 routines via CSV, 5 have classification violations. What happens?
- Block entire import?
- Import valid ones, create pending requests for violations?
- Show summary: "45 imported, 5 need classification approval"?

---

### 6. Implementation Strategy

**Question:** Should I proceed with implementation or create a spec document first?

**Suggested Approach:**
1. Create detailed spec document (PHASE_X_SPEC.md style)
2. Database schema + migrations
3. Backend tRPC routes (create request, get requests, CD decision)
4. Email integration (via existing email system?)
5. Frontend: Request modal, CD review page, notifications
6. Testing (E2E tests for full flow)

**Or start coding now with placeholder email/notifications?**

---

## Related Files

- `src/lib/classificationValidation.ts` - Existing validation logic
- `src/components/EntryForm.tsx` - Entry creation form (needs validation popup)
- `src/components/RoutineCSVImport.tsx` - CSV import (needs exception handling?)
- `docs/specs/PHASE2_BUSINESS_LOGIC_SPECIFICATIONS.md` - Phase 2 spec with classification rules

---

## Next Steps

1. Answer implementation questions above
2. Decide on database schema approach
3. Create detailed spec document OR start implementation
4. Build backend routes + validation
5. Build CD review interface
6. Integrate email notifications
7. Test complete flow end-to-end
