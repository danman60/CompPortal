# Tasks for Parallel Testing Agent
**Updated:** 2025-10-24 02:20 UTC
**Context:** Post-Bug Fix Deployment

---

## ✅ Recently Fixed - Ready for Re-Test

### Task 1: Verify Invoice Lock Fix (CRITICAL)
**Priority:** IMMEDIATE
**Tool:** Playwright MCP

**What to Test:**
1. Navigate to `/dashboard/invoices/all` as Competition Director
2. Check database to verify existing PAID invoices now have `is_locked = true`
3. Try to edit a PAID invoice (should be blocked)
4. Mark a DRAFT invoice as PAID
5. Verify it auto-locks (`is_locked = true`)

**SQL Verification:**
```sql
SELECT id, status, is_locked, paid_at
FROM invoices
WHERE status = 'PAID'
ORDER BY created_at DESC
LIMIT 5;

-- Expected: All PAID invoices have is_locked = true
```

**Evidence Needed:**
- Screenshot of database query showing `is_locked = true`
- Screenshot of UI blocking edits on PAID invoice
- Confirmation that new PAID invoices auto-lock

**Expected Result:** ✅ Bug #2 resolved - invoices lock properly

---

### Task 2: Email Notification Testing (HIGH)
**Priority:** HIGH
**Tool:** Playwright MCP + Email Verification

**What to Test:**
Now that Resend is configured, test email delivery:

1. **Submit Reservation as SD**
   - Expected: CD receives "Reservation Submitted" email
   - Check: Email logs table for success

2. **Approve Reservation as CD**
   - Expected: SD receives "Reservation Approved" email
   - Verify: Email contains correct details

3. **Submit Summary as SD**
   - Expected: CD receives "Summary Submitted" email
   - Check: Routine count matches

4. **Send Invoice as CD**
   - Expected: SD receives "Invoice Delivery" email
   - Verify: Invoice PDF attached/linked

**SQL Verification:**
```sql
SELECT
  template_type,
  recipient_email,
  subject,
  success,
  error_message,
  created_at
FROM email_logs
WHERE created_at > NOW() - INTERVAL '1 hour'
ORDER BY created_at DESC;
```

**Expected Result:** ✅ All 4 email types delivered successfully

---

## 🚧 Blocked - Needs Data Preparation

### Task 3: Create Test Data for Auto-Close Feature
**Priority:** HIGH
**Type:** Data Seeding

**Manual Steps Required:**
1. **As SD:** Create new reservation requesting 20 spaces
2. **As CD:** Approve for 15 spaces
3. **As SD:** Create exactly 12 routines
4. **As SD:** Submit summary (triggers auto-close)
5. **Verify:**
   - Reservation.is_closed = true
   - Reservation.spaces_confirmed = 12 (updated from 15)
   - Competition available_tokens increased by 3

**Automation Option:**
Create SQL seed script:
```sql
-- Insert test reservation
INSERT INTO reservations (...)
VALUES (...);

-- Insert 12 test routines
-- Submit summary (call tRPC mutation)
```

**Expected Result:** ✅ Auto-close feature validated with real data

---

### Task 4: Create Confirmed Routines for Invoice Testing
**Priority:** HIGH
**Type:** Data Seeding

**Manual Workflow:**
1. **As SD:** Create 10 routines (various statuses: draft, registered)
2. **As SD:** Submit summary for 7 routines → become 'confirmed'
3. **As CD:** Generate invoice
4. **Verify:** Invoice shows exactly 7 items (excludes draft/registered)

**SQL Helper:**
```sql
-- Check routine statuses
SELECT
  status,
  COUNT(*) as count
FROM competition_entries
WHERE studio_id = '[sd_studio_id]'
GROUP BY status;

-- Expected after summary:
-- confirmed: 7
-- draft: 3
```

**Expected Result:** ✅ Invoice filtering to confirmed routines validated

---

## 🔍 Investigation Tasks

### Task 5: Investigate Invoice Detail Page 400 Error (CRITICAL)
**Priority:** CRITICAL
**Type:** Bug Investigation

**Problem:**
URL `/dashboard/invoices/{invoice_id}/{competition_id}` returns 400 error
Test report shows: "Invoice Not Found" for existing invoices

**Investigation Steps:**

1. **Check Route File:**
```bash
# Find invoice detail page component
ls src/app/dashboard/invoices/
```

2. **Test URL Patterns:**
- Try: `/dashboard/invoices/[invoiceId]`
- Try: `/dashboard/invoices/[studioId]/[competitionId]`
- Current: `/dashboard/invoices/[invoiceId]/[competitionId]` (failing)

3. **Check tRPC Router:**
```typescript
// Search for invoice.getOne or invoice.getOrCreate
// Verify parameters match URL structure
```

4. **Test with Playwright:**
```javascript
// Navigate to invoice list
await playwright.navigate("/dashboard/invoices/all");

// Click "View" button on first invoice
await playwright.click({ element: "View button", ref: "button:has-text('View')" });

// Capture error message
await playwright.screenshot({ filename: "invoice_detail_error.png" });
```

5. **Check Browser Console:**
- Look for tRPC errors
- Check network tab for failed API calls

**Possible Causes:**
- Route parameter mismatch
- RLS policy blocking access
- Missing invoice data
- Query expecting different parameters

**Expected Outcome:** Root cause identified with fix recommendation

---

### Task 6: Event Capacity Mismatch Investigation (MEDIUM)
**Priority:** MEDIUM
**Type:** Bug Investigation

**Problem:**
- UI shows: "Total: 600 spaces"
- Database shows: `total_reservation_tokens = 583`

**Investigation:**

1. **Database Query:**
```sql
SELECT
  id,
  name,
  total_reservation_tokens,
  available_reservation_tokens,
  venue_capacity
FROM competitions
WHERE name LIKE '%EMPWR%London%';
```

2. **UI Code Review:**
```typescript
// Find ReservationPipeline.tsx or DirectorPanel
// Check where capacity is displayed
// Verify source: total_reservation_tokens vs venue_capacity
```

3. **Expected Fix:**
```typescript
// Should use:
const totalCapacity = competition.total_reservation_tokens;

// NOT:
const totalCapacity = competition.venue_capacity || 600;
```

**Expected Outcome:** Identify source of hardcoded 600 value

---

## 📝 Documentation Tasks

### Task 7: Update Test Report with Latest Results
**Priority:** MEDIUM
**Type:** Documentation

**After completing Tasks 1-2:**
1. Create new section in test report: "Re-Test Results"
2. Document:
   - Invoice lock fix verification ✅
   - Email notification results ✅/❌
   - Remaining blockers
3. Update success criteria
4. Provide final recommendation

**File:** `TEST_EXECUTION_REPORT_2025-10-24.md`

---

### Task 8: Create Test Data Seed Script
**Priority:** LOW
**Type:** Automation

**Goal:** Enable one-command test data creation

**Script Requirements:**
```bash
npm run seed:test-data -- --scenario=auto-close
```

Should create:
- 1 studio with real data
- 1 approved reservation (15 spaces)
- 12 confirmed routines
- 1 draft invoice

**Benefits:**
- Repeatable testing
- Fast environment reset
- Consistent test scenarios

---

## 🎯 Priority Order for Parallel Agent

**Immediate (Next 30 minutes):**
1. Task 1: Verify invoice lock fix ✅
2. Task 2: Test email notifications (if Resend key configured)
3. Task 5: Investigate invoice detail 400 error

**Short-term (Next 2 hours):**
4. Task 3: Manual data creation for auto-close test
5. Task 4: Create confirmed routines for invoice test
6. Task 7: Update test report

**Background (Low priority):**
7. Task 6: Capacity mismatch investigation
8. Task 8: Seed script creation

---

## 🔧 Tools Available to Agent

**Playwright MCP:**
- Browser automation
- Screenshot capture
- Form interactions
- Network monitoring

**Database Access (via Supabase MCP):**
- Execute SQL queries
- Verify data states
- Check migrations

**Email Verification:**
- Check `email_logs` table
- Verify Resend delivery (if API access)

---

## 📊 Success Metrics

**By End of Session:**
- [ ] Invoice lock fix verified in production
- [ ] At least 2 email types tested successfully
- [ ] Invoice detail bug root cause identified
- [ ] Test report updated with latest results
- [ ] Recommendations for remaining work documented

---

## 🚨 If Agent Gets Blocked

**Blockers to Escalate:**
1. Cannot access production database
2. Resend API key not working
3. Invoice routes still broken after reload
4. No way to create test data (requires dev intervention)

**Workarounds:**
- If email testing blocked: Focus on invoice/reservation tests
- If invoice routes blocked: Document thoroughly, move to data creation
- If no SD account: Use CD account for available tests

---

## 📞 Communication Format

**After Each Task:**
```markdown
## Task X: [Name] - [STATUS]

**Completed:** [timestamp]
**Result:** PASS/FAIL/BLOCKED
**Evidence:** [screenshot filenames]
**Findings:** [bullet points]
**Next Steps:** [if applicable]
```

**Example:**
```markdown
## Task 1: Verify Invoice Lock Fix - ✅ PASS

**Completed:** 2025-10-24 02:30 UTC
**Result:** PASS
**Evidence:**
- invoice_lock_database_verified.png
- invoice_edit_blocked_ui.png

**Findings:**
- All 3 PAID invoices now have is_locked = true ✅
- UI correctly blocks edits with message: "Cannot edit locked invoice" ✅
- New PAID invoice auto-locked immediately ✅

**Next Steps:** None - Bug #2 fully resolved
```

---

**Ready to Deploy!** 🚀

Agent can start with Task 1 immediately after latest deployment completes.
