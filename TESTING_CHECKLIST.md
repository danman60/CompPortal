# Production Testing Checklist - Today's Fixes
**Environment:** https://empwr.compsync.net
**Date:** October 24, 2025
**Testing Agent:** Playwright MCP (Parallel CC Agent)

---

## 🎯 Testing Prerequisites

### Test Accounts (EMPWR Dance London):
- **Competition Director:** demo.director@gmail.com / DirectorDemo123!
- **Studio Director:** demo.studio@gmail.com / StudioDemo123!

### Browser Setup:
```javascript
// Playwright MCP configuration
{
  baseURL: "https://empwr.compsync.net",
  viewport: { width: 1920, height: 1080 },
  screenshots: true,
  video: "on-failure"
}
```

---

## Test Suite 1: Auto-Close Reservations with Token Refund 🔥

**Priority:** CRITICAL
**Feature:** Automatic reservation closure and token refund when fewer routines submitted than approved

### Test 1.1: Normal Flow (Full Utilization)
**As:** Studio Director
**Steps:**
1. Navigate to `/dashboard/reservations`
2. Find approved reservation with `spaces_confirmed = 10`
3. Navigate to `/dashboard/entries`
4. Create 10 routines (matching approved spaces)
5. Navigate to `/dashboard/entries` → Click "Submit Summary"
6. **VERIFY:**
   - Summary submission succeeds
   - `reservation.is_closed` should be `false` (full utilization)
   - No tokens refunded

**Expected Result:** ✅ Reservation stays open, no refund (100% utilization)

---

### Test 1.2: Underutilization Flow (Partial Usage)
**As:** Studio Director
**Steps:**
1. Navigate to `/dashboard/reservations`
2. Find approved reservation with `spaces_confirmed = 15`
3. Navigate to `/dashboard/entries`
4. Create only 12 routines (3 less than approved)
5. Submit Summary
6. **VERIFY AS CD:**
   - Switch to Competition Director account
   - Navigate to `/dashboard/director-panel`
   - Check event capacity card
   - **Expected:** `available_reservation_tokens` increased by 3

**Expected Result:** ✅ Reservation closed, 3 tokens refunded to competition

**Database Verification:**
```sql
SELECT
  spaces_confirmed,
  is_closed,
  status
FROM reservations
WHERE id = '[reservation_id]';

-- Should show:
-- spaces_confirmed: 12 (updated from 15)
-- is_closed: true
-- status: 'submitted'
```

---

### Test 1.3: Token Refund Visible to CD
**As:** Competition Director
**Steps:**
1. Note current `available_reservation_tokens` count
2. Wait for SD to submit underutilized summary (Test 1.2)
3. Refresh `/dashboard/director-panel`
4. **VERIFY:** Available tokens increased by unused amount

**Expected Result:** ✅ CD sees refunded tokens immediately

---

### Test 1.4: Studio Cannot Reuse Closed Reservation
**As:** Studio Director
**Steps:**
1. After closing reservation (Test 1.2)
2. Navigate to `/dashboard/entries`
3. Try to create additional routines for same competition
4. **VERIFY:**
   - Should require new reservation
   - Cannot add routines to closed reservation

**Expected Result:** ✅ Closed reservation cannot be expanded

---

## Test Suite 2: Invoice Lock After Send 🔒

**Priority:** CRITICAL
**Feature:** Invoices locked from editing after being sent

### Test 2.1: Invoice Lock on Send
**As:** Competition Director
**Steps:**
1. Navigate to `/dashboard/invoices/all`
2. Find invoice with status `DRAFT`
3. Click "Send Invoice" button
4. **VERIFY:**
   - Invoice status changes to `SENT`
   - Invoice is now locked (`is_locked = true`)

**Database Verification:**
```sql
SELECT status, is_locked
FROM invoices
WHERE id = '[invoice_id]';

-- Should show:
-- status: 'SENT'
-- is_locked: true
```

---

### Test 2.2: Prevent Editing Locked Invoice (CD)
**As:** Competition Director
**Steps:**
1. Find invoice with status `SENT` (from Test 2.1)
2. Navigate to invoice detail page
3. Try to click "Edit Prices" button
4. **VERIFY:**
   - Edit button should be disabled/hidden
   - OR clicking shows error: "Cannot edit locked invoice"

**Expected Result:** ✅ Competition Director blocked from editing sent invoice

---

### Test 2.3: Prevent Editing Locked Invoice (SD)
**As:** Studio Director
**Steps:**
1. Navigate to `/dashboard/invoices`
2. Find sent invoice
3. Try to modify line items
4. **VERIFY:** No edit controls visible

**Expected Result:** ✅ Studio Director cannot edit locked invoice

---

### Test 2.4: Draft Invoice Still Editable
**As:** Competition Director
**Steps:**
1. Find invoice with status `DRAFT`
2. Navigate to invoice detail
3. Click "Edit Prices" or "Apply Discount"
4. **VERIFY:** Edits work normally

**Expected Result:** ✅ Draft invoices remain editable

---

## Test Suite 3: Invoice Confirmed Routines Only ✅

**Priority:** HIGH
**Feature:** Invoices only include entries with `status: 'confirmed'`

### Test 3.1: Invoice Excludes Draft Routines
**As:** Studio Director
**Steps:**
1. Create 5 routines in `draft` status
2. Create 3 routines and submit summary (status becomes `confirmed`)
3. **As CD:** Generate invoice for this studio
4. **VERIFY:**
   - Invoice shows only 3 line items
   - Draft routines NOT included
   - Total matches 3 confirmed routines

**Expected Result:** ✅ Only confirmed routines appear on invoice

---

### Test 3.2: Invoice Excludes Registered (Non-Confirmed)
**As:** Studio Director
**Steps:**
1. Create 10 routines (status: `registered` or `draft`)
2. Submit summary for only 7 routines (these become `confirmed`)
3. **As CD:** Generate invoice
4. **VERIFY:** Invoice shows exactly 7 items

**Expected Result:** ✅ Invoice matches submitted summary count

---

### Test 3.3: Invoice Total Calculation Correct
**As:** Competition Director
**Steps:**
1. After generating invoice (Test 3.1 or 3.2)
2. Check invoice subtotal
3. **VERIFY:**
   - Subtotal = sum of confirmed routine fees only
   - Tax = subtotal × 0.13 (13% HST)
   - Total = subtotal + tax

**Expected Result:** ✅ Invoice total matches confirmed routines only

---

### Test 3.4: Previously Cancelled Routines Excluded
**As:** Studio Director
**Steps:**
1. Create 10 routines
2. Cancel 2 routines (status: `cancelled`)
3. Submit summary for remaining 8 (status: `confirmed`)
4. **As CD:** Generate invoice
5. **VERIFY:** Invoice shows 8 items (cancelled excluded)

**Expected Result:** ✅ Cancelled routines not on invoice

---

## Test Suite 4: Forgot Password Link 🔑

**Priority:** MEDIUM
**Feature:** Password reset functionality

### Test 4.1: Forgot Password Link Visible
**Steps:**
1. Navigate to `/login`
2. **VERIFY:** "Forgot password?" link visible next to password field

**Expected Result:** ✅ Link visible and styled correctly

---

### Test 4.2: Forgot Password Flow
**Steps:**
1. Click "Forgot password?" link
2. Should navigate to `/reset-password`
3. Enter email: `demo.studio@gmail.com`
4. Click "Send Reset Link"
5. **VERIFY:**
   - Success message: "Password reset email sent. Check your inbox."
   - Email field clears
   - Form remains usable for additional resets

**Expected Result:** ✅ Reset link request completes without errors

---

### Test 4.3: Invalid Email Handling
**Steps:**
1. Navigate to `/reset-password`
2. Enter invalid email: `notexist@example.com`
3. Click "Send Reset Link"
4. **VERIFY:** Error message or success message (Supabase doesn't reveal if email exists)

**Expected Result:** ✅ No crash, appropriate message shown

---

## Test Suite 5: Integration Tests (Cross-Feature)

**Priority:** HIGH
**Feature:** Combined workflow testing

### Test 5.1: Complete Reservation → Invoice Flow
**As:** Studio Director & Competition Director
**Steps:**
1. **SD:** Create reservation requesting 20 spaces
2. **CD:** Approve for 15 spaces
3. **SD:** Create 12 routines (draft)
4. **SD:** Submit summary (12 routines become confirmed)
5. **Auto-Close Trigger:** Reservation closes, 3 tokens refunded
6. **CD:** Generate invoice
7. **Verify Invoice:**
   - Shows exactly 12 line items (confirmed only)
   - Status: `DRAFT`
   - is_locked: `false`
8. **CD:** Send invoice
9. **Verify Lock:**
   - Status: `SENT`
   - is_locked: `true`
   - Edit buttons disabled
10. **SD:** View sent invoice
11. **Verify SD View:**
    - Cannot edit
    - See "Manual Payment Only" banner
    - Shows 12 confirmed routines

**Expected Result:** ✅ Complete end-to-end flow works correctly

---

### Test 5.2: Multiple Studios Token Pool
**As:** Competition Director
**Steps:**
1. Note total event capacity (e.g., 600 tokens)
2. Approve Studio A for 100 tokens
3. Approve Studio B for 150 tokens
4. **Available:** 600 - 250 = 350
5. **Studio A:** Submits 80 routines (20 unused)
6. **Verify:** Available now 350 + 20 = 370
7. **Studio B:** Submits 150 routines (0 unused)
8. **Verify:** Available stays 370
9. Approve Studio C for 370 tokens
10. **Verify:** Available now 0

**Expected Result:** ✅ Token pool correctly shared across studios

---

## Test Suite 6: Regression Tests (Ensure Nothing Broke)

**Priority:** MEDIUM

### Test 6.1: CSV Import Still Works
**Steps:**
1. Navigate to `/dashboard/entries/import`
2. Upload valid routine CSV
3. **VERIFY:** Import succeeds
4. Body size limit now 10MB (should handle larger files)

**Expected Result:** ✅ CSV import unchanged

---

### Test 6.2: Event Capacity Card Accuracy
**Steps:**
1. Navigate to `/dashboard/director-panel`
2. Check event capacity card
3. **VERIFY:** Uses `total_reservation_tokens` and `available_reservation_tokens`
4. Shows live data, not static values

**Expected Result:** ✅ Capacity card shows real-time data

---

### Test 6.3: Deny Reservation Button Works
**Steps:**
1. Navigate to `/dashboard/reservation-pipeline`
2. Find pending reservation
3. Click "Deny" button
4. **VERIFY:**
   - Modal appears
   - Confirmation works
   - Tokens refunded if applicable

**Expected Result:** ✅ Deny button functional (previous fix)

---

### Test 6.4: Manual Payment Banner Visible
**Steps:**
1. **As SD:** Navigate to any invoice
2. **VERIFY:** Blue banner at top: "Manual Payment Only"

**Expected Result:** ✅ Banner displays correctly

---

## 📸 Screenshot Requirements

### For Each Test:
1. **Before State** - Initial condition
2. **Action** - Button click / form submission
3. **After State** - Result verification
4. **Error State** - If applicable, capture error messages

### Example Screenshots:
- `test_1.2_before_summary_submit.png`
- `test_1.2_after_token_refund.png`
- `test_2.1_invoice_locked.png`
- `test_5.1_complete_flow_invoice.png`

---

## 🎯 Success Criteria

### Overall:
- [ ] All 25+ test cases pass
- [ ] No console errors during testing
- [ ] No 500 errors from backend
- [ ] All screenshots captured
- [ ] Database state verified for critical tests

### Critical Must-Pass:
- [ ] Test 1.2: Token refund works
- [ ] Test 2.1: Invoice locks on send
- [ ] Test 2.2: Locked invoices uneditable
- [ ] Test 3.1: Only confirmed routines on invoice
- [ ] Test 5.1: Complete workflow successful

---

## 📝 Playwright MCP Commands

### Example Test Script:

```javascript
// Test 1.2: Underutilization Flow
await playwright.navigate("https://empwr.compsync.net/login");
await playwright.fill({ element: "email input", ref: "input[type=email]", text: "demo.studio@gmail.com" });
await playwright.fill({ element: "password input", ref: "input[type=password]", text: "StudioDemo123!" });
await playwright.click({ element: "sign in button", ref: "button[type=submit]" });

// Wait for dashboard
await playwright.waitFor({ text: "Dashboard" });

// Navigate to entries
await playwright.click({ element: "Entries nav link", ref: "a[href='/dashboard/entries']" });

// Take screenshot
await playwright.screenshot({ filename: "test_1.2_entries_before_submit.png" });

// Submit summary
await playwright.click({ element: "Submit Summary button", ref: "button:has-text('Submit Summary')" });

// Verify success
await playwright.waitFor({ text: "Summary submitted successfully" });
await playwright.screenshot({ filename: "test_1.2_summary_submitted.png" });

// Switch to CD account
await playwright.navigate("https://empwr.compsync.net/api/auth/signout");
await playwright.navigate("https://empwr.compsync.net/login");
// ... login as CD and verify token refund
```

---

## 🐛 Known Issues to Watch For

1. **Email notifications may fail** - Expected (SMTP not configured), don't fail test
2. **First load may be slow** - Vercel cold start
3. **Session persistence** - May need to re-login between tests

---

## 📊 Test Report Format

```markdown
# Test Execution Report
**Date:** [timestamp]
**Agent:** Playwright MCP
**Environment:** https://empwr.compsync.net

## Summary
- Total Tests: 25
- Passed: X
- Failed: Y
- Skipped: Z

## Critical Failures
[List any Test Suite 1-3 failures]

## Screenshots
[Links to all screenshots]

## Database Verification
[SQL query results for critical tests]

## Recommendations
[Next steps based on results]
```

---

**PRIORITY ORDER:**
1. Test Suite 1 (Auto-Close) - CRITICAL
2. Test Suite 2 (Invoice Lock) - CRITICAL
3. Test Suite 3 (Confirmed Only) - HIGH
4. Test Suite 5 (Integration) - HIGH
5. Test Suite 4 (Forgot Password) - MEDIUM
6. Test Suite 6 (Regression) - MEDIUM
