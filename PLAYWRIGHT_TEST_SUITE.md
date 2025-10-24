# Playwright MCP Testing Suite

**Created:** 2025-10-24 (Demo Prep)
**Purpose:** Automated end-to-end testing for Tuesday demo
**Using:** Playwright MCP tools for browser automation

---

## 🎯 Test Coverage

### Critical Workflows:
1. ✅ SA Dashboard - Populate Test Data
2. ✅ SD Login - Create Reservation
3. ✅ CD Login - Approve Reservation
4. ✅ SD Login - Create Routines
5. ✅ SD Login - Submit Summary (Auto-Close Test)
6. ✅ CD Login - Generate Invoice
7. ✅ CD Login - Send Invoice (Lock + Email)
8. ✅ CD Login - Mark Invoice PAID (Lock)
9. ✅ PDF Generation Test
10. ✅ CSV Export Test

---

## 📋 Test Scenarios

### Scenario 1: Complete Reservation → Invoice Flow
**Goal:** Test full workflow from reservation to payment

**Steps:**
1. SA Dashboard → CLEAN SLATE → POPULATE TEST DATA
2. Login as testsd1@test.com
3. Navigate to /dashboard/reservations/new
4. Create reservation (15 spaces for EMPWR Dance - London)
5. Submit reservation
6. Logout

7. Login as CD (one-click demo)
8. Navigate to /dashboard/reservation-pipeline
9. Find test studio reservation
10. Click "Approve" → Confirm 15 spaces
11. Verify token deduction
12. Logout

13. Login as testsd1@test.com
14. Navigate to /dashboard/entries/create
15. Create 12 routines (confirmed) + 3 routines (draft)
16. Navigate to /dashboard/routine-summaries
17. Submit summary
18. Verify auto-close triggered (3 tokens refunded)
19. Logout

20. Login as CD
21. Navigate to invoice page for test studio
22. Click "Generate Invoice"
23. Verify 12 routines listed (not 15)
24. Verify late fees if applicable
25. Click "Send Invoice"
26. Verify invoice locked (is_locked = true)
27. Verify email sent (Resend dashboard or email_logs)
28. Download PDF → Verify branding + late fees
29. Click "Mark as PAID"
30. Verify invoice locked permanently
31. Logout

**Expected Results:**
- ✅ Reservation created and approved
- ✅ Tokens deducted correctly (15 spaces)
- ✅ Auto-close refunded 3 tokens
- ✅ Invoice generated with 12 routines only
- ✅ Invoice locked after send
- ✅ Invoice locked after PAID
- ✅ Email delivered
- ✅ PDF has branding + late fees
- ✅ CSV export works

---

### Scenario 2: Invoice PDF Generation
**Goal:** Verify professional branded PDFs

**Steps:**
1. Login as CD
2. Navigate to existing invoice
3. Download PDF
4. Verify:
   - Competition name in header (22pt, brand color)
   - Tagline below name
   - Branded horizontal separator
   - Table headers use brand color
   - Late fees row in summary (if > 0)
   - All 12 routines listed
   - Subtotal, Late Fees, Tax, TOTAL sections

**Expected Results:**
- ✅ PDF uses tenant branding
- ✅ Professional layout
- ✅ Late fees displayed in summary
- ✅ Correct totals

---

### Scenario 3: CSV Export Test
**Goal:** Verify CSV exports match database

**Steps:**
1. Login as CD
2. Navigate to /dashboard/entries
3. Click "Export CSV"
4. Verify CSV contains:
   - All 12 confirmed routines
   - Correct studio name
   - Correct category/age group
   - Late fees column
   - Entry fees column
   - Total fees column

**Expected Results:**
- ✅ CSV downloads successfully
- ✅ All data accurate
- ✅ Late fees match PDF

---

### Scenario 4: Forgot Password Flow
**Goal:** Verify password reset works

**Steps:**
1. Navigate to /login
2. Click "Forgot Password?"
3. Enter email: testsd1@test.com
4. Verify email sent
5. Check email_logs table for success
6. Follow reset link (if available)
7. Set new password
8. Login with new password

**Expected Results:**
- ✅ Forgot password link visible
- ✅ Email sent successfully
- ✅ Password reset works

---

## 🤖 Playwright MCP Commands

### Setup & Login

```typescript
// Navigate to production
await playwright.navigate('https://empwr.compsync.net');

// One-click CD auth (from homepage demo button)
await playwright.click({
  element: 'Demo Login button',
  ref: 'button containing "Competition Director Demo"'
});

// Manual SD login
await playwright.navigate('https://empwr.compsync.net/login');
await playwright.fill({
  element: 'Email input',
  ref: 'input[type="email"]',
  text: 'testsd1@test.com'
});
await playwright.fill({
  element: 'Password input',
  ref: 'input[type="password"]',
  text: 'TestPassword123'
});
await playwright.click({
  element: 'Sign In button',
  ref: 'button[type="submit"]'
});
```

### SA Dashboard - Populate Data

```typescript
// Navigate to SA testing tools
await playwright.navigate('https://empwr.compsync.net/dashboard/admin/testing');

// Clean slate first
await playwright.click({
  element: 'CLEAN SLATE button',
  ref: 'button containing "CLEAN SLATE"'
});

// Confirm deletion
await playwright.type({
  element: 'Confirmation input',
  ref: 'input[placeholder="DELETE ALL DATA"]',
  text: 'DELETE ALL DATA'
});

await playwright.click({
  element: 'DELETE button',
  ref: 'button containing "DELETE"'
});

// Wait for cleanup
await playwright.waitFor({ time: 5 });

// Populate test data
await playwright.click({
  element: 'POPULATE TEST DATA button',
  ref: 'button containing "POPULATE TEST DATA"'
});

// Confirm population
await playwright.click({
  element: 'OK button in confirm dialog',
  ref: 'button containing "OK"'
});

// Wait for data creation
await playwright.waitFor({ time: 10 });
```

### Create Reservation

```typescript
// Navigate to create reservation
await playwright.navigate('https://empwr.compsync.net/dashboard/reservations/new');

// Select competition
await playwright.selectOption({
  element: 'Competition dropdown',
  ref: 'select[name="competitionId"]',
  values: ['EMPWR Dance - London']
});

// Enter spaces
await playwright.fill({
  element: 'Spaces input',
  ref: 'input[name="spacesRequested"]',
  text: '15'
});

// Submit
await playwright.click({
  element: 'Submit Reservation button',
  ref: 'button[type="submit"]'
});

// Wait for success
await playwright.waitFor({ text: 'Reservation submitted' });
```

### Approve Reservation

```typescript
// Navigate to pipeline
await playwright.navigate('https://empwr.compsync.net/dashboard/reservation-pipeline');

// Find test studio
await playwright.click({
  element: 'Test Studio QA card',
  ref: 'div containing "Test Studio QA"'
});

// Click approve
await playwright.click({
  element: 'Approve button',
  ref: 'button containing "Approve"'
});

// Confirm spaces
await playwright.fill({
  element: 'Confirmed spaces input',
  ref: 'input[name="spacesConfirmed"]',
  text: '15'
});

await playwright.click({
  element: 'Confirm Approval button',
  ref: 'button containing "Confirm"'
});
```

### Create Routines

```typescript
// Loop 12 times for confirmed routines
for (let i = 1; i <= 12; i++) {
  await playwright.navigate('https://empwr.compsync.net/dashboard/entries/create');

  await playwright.fill({
    element: 'Routine title',
    ref: 'input[name="title"]',
    text: `Test Routine ${i}`
  });

  await playwright.selectOption({
    element: 'Category',
    ref: 'select[name="categoryId"]',
    values: ['Jazz']
  });

  await playwright.selectOption({
    element: 'Age Group',
    ref: 'select[name="ageGroupId"]',
    values: ['Junior']
  });

  await playwright.selectOption({
    element: 'Size',
    ref: 'select[name="entrySizeCategoryId"]',
    values: ['Solo']
  });

  await playwright.click({
    element: 'Save & Confirm button',
    ref: 'button containing "Save & Confirm"'
  });

  await playwright.waitFor({ time: 1 });
}

// Create 3 draft routines
for (let i = 13; i <= 15; i++) {
  // Same as above but click "Save as Draft"
}
```

### Submit Summary

```typescript
await playwright.navigate('https://empwr.compsync.net/dashboard/routine-summaries');

// Find reservation
await playwright.click({
  element: 'EMPWR Dance reservation',
  ref: 'button containing "Submit Summary"'
});

// Confirm submission
await playwright.click({
  element: 'Confirm button',
  ref: 'button containing "Confirm"'
});

// Verify auto-close message
await playwright.waitFor({ text: '3 tokens refunded' });
```

### Generate & Send Invoice

```typescript
// Navigate to invoice page
await playwright.navigate('https://empwr.compsync.net/dashboard/invoices/[studioId]/[competitionId]');

// Generate invoice
await playwright.click({
  element: 'Generate Invoice button',
  ref: 'button containing "Generate Invoice"'
});

// Wait for generation
await playwright.waitFor({ time: 2 });

// Send invoice
await playwright.click({
  element: 'Send Invoice button',
  ref: 'button containing "Send Invoice"'
});

// Verify lock icon appears
await playwright.waitFor({ text: '🔒' });
```

### Download PDF

```typescript
await playwright.click({
  element: 'Download PDF button',
  ref: 'button containing "Download PDF"'
});

// Screenshot the PDF preview
await playwright.takeScreenshot({
  filename: 'invoice-pdf-branded.png'
});
```

### Mark PAID

```typescript
await playwright.click({
  element: 'Mark as PAID button',
  ref: 'button containing "Mark as PAID"'
});

// Confirm
await playwright.click({
  element: 'Confirm button',
  ref: 'button containing "Confirm"'
});

// Verify locked permanently
await playwright.waitFor({ text: 'PAID' });
```

---

## 📊 Success Criteria

### Must Pass:
1. ✅ Clean Slate + Populate completes without errors
2. ✅ Reservation created and approved (15 spaces)
3. ✅ 12 confirmed + 3 draft routines created
4. ✅ Auto-close refunds 3 tokens
5. ✅ Invoice generates with 12 routines (not 15)
6. ✅ Invoice locks after send
7. ✅ Email delivered (check email_logs)
8. ✅ PDF has branding + late fees summary
9. ✅ Invoice locks after PAID
10. ✅ CSV export works

### Nice to Have:
- ⏭️ Forgot password flow
- ⏭️ Scheduling suite drag-drop
- ⏭️ Conflict detection

---

## 🚀 Running the Tests

**Agent Prompt:**

```markdown
Please run the complete Playwright MCP testing suite for CompPortal demo prep.

Test URL: https://empwr.compsync.net
Test Credentials: testsd1@test.com (or use one-click CD demo)

Execute these scenarios in order:
1. Clean Slate + Populate Test Data
2. Complete Reservation → Invoice Flow
3. Invoice PDF Generation Verification
4. CSV Export Verification

For each test:
- Take screenshots at key steps
- Verify expected results
- Document any failures
- Check email_logs table for email delivery

Create a summary report at the end with:
- Tests passed/failed
- Screenshots of critical features
- Any bugs or issues found
- Recommendations for demo

Be thorough - this is for Tuesday demo readiness.
```

---

**Last Updated:** 2025-10-24 11pm EST
**Status:** Ready to execute
