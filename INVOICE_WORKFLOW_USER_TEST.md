# Invoice Workflow - User-Facing Test Protocol

**Date:** 2025-11-06
**Test Type:** End-to-End User Workflow
**Environment:** Production (empwr.compsync.net)
**Test Credentials:** See CLAUDE.md for SA/CD/SD logins

## Test Protocol Rules

**CRITICAL: Act as a user. Never bypass the UI with SQL or direct database operations.**

- ✅ Use Playwright MCP to interact with production UI
- ✅ Log in with appropriate role credentials
- ✅ Click buttons, fill forms, navigate pages
- ❌ NEVER execute SQL to create/modify data
- ❌ NEVER use database tools to bypass workflows
- ❌ NEVER assume something works without testing in browser

**If UI is broken or missing → STOP and document the blocker. That's the point of testing.**

---

## Phase 1: Studio Submits Routine Summary (SD Role)

**Login:** `djamusic@gmail.com` / `123456` (Studio Director)
**URL:** https://empwr.compsync.net

### Steps:

1. Navigate to "Entries" page
2. Verify approved reservation exists with entries
3. Click "Submit Routine Summary" button
4. Review summary modal showing:
   - Total entries created
   - Entries unused (refunded)
   - Total amount
5. Click "Submit Summary" button
6. Verify success message
7. Verify reservation status changes to "Summarized"
8. Log out

**Expected Result:**
- Reservation status = "summarized"
- Summary record created in database
- SD can no longer edit entries

**Blockers to Document:**
- Submit button missing/disabled
- Modal shows wrong counts
- Submission fails with error

---

## Phase 2: CD Reviews Routine Summaries

**Login:** `empwrdance@gmail.com` / `1CompSyncLogin!` (Competition Director)
**URL:** https://empwr.compsync.net

### Steps:

1. Navigate to "Routine Summaries" page
2. Verify summarized reservation appears in table with:
   - Studio name
   - Competition name
   - Submitted date
   - Routine count
   - Total amount
   - Status badge: "Awaiting Invoice"
3. Verify "Create Invoice" button shows in Actions column
4. Do NOT click yet - verify data is correct first

**Expected Result:**
- Summary visible in table
- All data accurate (compare to Phase 1 submission)
- Action button = "Create Invoice"

**Blockers to Document:**
- Summary not showing ("No routine submissions found")
- Wrong data displayed
- Action button missing or says wrong thing
- 404 error when clicking "View Details"

---

## Phase 3: CD Creates Invoice

**Continue as CD**

### Steps:

1. From Routine Summaries page, click "Create Invoice" button
2. Wait for invoice creation
3. Verify success message
4. Verify navigation to invoice detail page OR summary table updates
5. Navigate to "Reservation Pipeline" page
6. Find the summarized reservation
7. Verify Action column now shows "Send Invoice" button (not "Create Invoice")
8. Click "View Details" to verify it doesn't 404
9. Return to pipeline
10. Click "Send Invoice" button
11. Verify invoice status changes from DRAFT to SENT
12. Verify success message
13. Log out

**Expected Result:**
- Invoice created successfully
- Pipeline shows "Send Invoice" for DRAFT invoices
- Send Invoice changes status to SENT
- No 404 errors

**Blockers to Document:**
- Create Invoice fails
- Button doesn't change to "Send Invoice"
- Send Invoice button missing for DRAFT
- 404 on View Details link
- Invoice not created in database

---

## Phase 4: SD Views Invoice

**Login:** `djamusic@gmail.com` / `123456` (Studio Director)
**URL:** https://empwr.compsync.net

### Steps:

1. Navigate to "Invoices" page
2. Verify invoice appears with status "SENT"
3. Click to view invoice details
4. Verify line items match submitted entries
5. Verify total amount matches summary
6. Verify invoice is locked (cannot edit)
7. Log out

**Expected Result:**
- Invoice visible to SD
- All line items correct
- Total matches submission
- Invoice locked (read-only)

**Blockers to Document:**
- Invoice not visible
- Wrong line items or amounts
- Invoice editable (should be locked)

---

## Phase 5: CD Marks Invoice as Paid

**Login:** `empwrdance@gmail.com` / `1CompSyncLogin!` (Competition Director)
**URL:** https://empwr.compsync.net

### Steps:

1. Navigate to "Reservation Pipeline"
2. Find reservation with SENT invoice
3. Verify Action column shows "Mark as Paid" button
4. Click "Mark as Paid"
5. Verify success message
6. Verify reservation status updates to "closed" or "paid"
7. Verify Action column shows "✓ Complete!"

**Expected Result:**
- Mark as Paid button shows for SENT invoices
- Status updates correctly
- Action column shows completion

**Blockers to Document:**
- Mark as Paid button missing
- Status doesn't update
- Error on marking paid

---

## Test Summary Template

```
## Test Run: [Date]

**Phase 1 (SD Submit):** ✅ / ❌ / ⏭️
**Phase 2 (CD Review):** ✅ / ❌ / ⏭️
**Phase 3 (CD Invoice):** ✅ / ❌ / ⏭️
**Phase 4 (SD View):** ✅ / ❌ / ⏭️
**Phase 5 (CD Paid):** ✅ / ❌ / ⏭️

**Blockers Found:**
1. [Description]
2. [Description]

**Notes:**
- [Observations]
```

---

## Success Criteria

- All 5 phases complete without SQL workarounds
- No 404 errors
- All buttons appear at correct workflow stages
- Data flows correctly from SD → CD → SD
- No manual database operations required

## Failure Criteria

- Any phase requires SQL to proceed
- Missing UI elements force test to stop
- 404 errors prevent navigation
- Data doesn't appear in UI despite existing in database

---

**Remember: The goal is to find UI bugs, not to work around them. If you hit a blocker, STOP and document it.**
