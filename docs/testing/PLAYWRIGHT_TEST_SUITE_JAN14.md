# Playwright Test Suite - MVP Verification (Post-UX Improvements)

**Production URL**: https://www.compsync.net
**Test Focus**: MVP-critical user journeys + Recent UX improvements validation
**MVP Goal**: Verify core business flows work end-to-end in production
**Execution**: ChatGPT agent with Playwright MCP

---

## MVP Scope

This test suite validates:
1. **Studio Director Journey**: Account → Profile → Dancers → Routines → Reservation → Invoice
2. **Competition Director Journey**: Events → Approve Studios → Approve Reservations → Review Entries → Generate Invoices
3. **Judge Journey**: Login → Score Routines → Submit Scores (FUTURE - not yet in production)

Recent UX improvements (Jan 14, 2025) are tested ONLY where they impact MVP flows.

---

## Test Credentials

### Studio Director
- Email: demo.studio@gmail.com
- Password: StudioDemo123!

### Competition Director
- Email: demo.director@gmail.com
- Password: DirectorDemo123!

### Super Admin
- Email: demo.admin@gmail.com
- Password: AdminDemo123!

---

## MVP FLOW 1: Studio Director Complete Journey

**Goal**: Verify SD can complete full registration → reservation → invoice flow

### Flow 1.1: Account Creation & Profile Setup (MANUAL - Not in test scope)
```
Note: This flow requires new email addresses and is tested manually.
- Account creation with email verification
- Studio profile completion
- Awaiting CD approval
```

**Skip for automated testing** - Requires unique emails and manual approval

### Flow 1.2: Dashboard Access & Navigation
```
**Login As**: Studio Director
1. Navigate to https://www.compsync.net/login
2. Fill email: demo.studio@gmail.com
3. Fill password: StudioDemo123!
4. Click "Sign In"
5. Wait for redirect to /dashboard
6. Take screenshot: "sd-dashboard.png"
7. Verify: Dashboard loads with Studio Director view
8. Verify: Key cards visible: Dancers, Routines, Reservations, Music, Invoices
9. Verify: NO admin-only cards (Judges, Analytics, etc.)
```

**Expected**: SD sees studio-specific dashboard, not admin features

### Flow 1.3: Dancer Management Access
```
**Login As**: Studio Director
1. From /dashboard, click "Dancers" card
2. Verify: At /dashboard/dancers
3. Take screenshot: "sd-dancers-page.png"
4. Verify: Can see dancer list (if any exist)
5. Verify: "Add Dancer" or "Import CSV" buttons visible
```

**Expected**: SD can access dancer management

### Flow 1.4: Routine Creation Access
```
**Login As**: Studio Director
1. From /dashboard, click "Routines" card
2. Verify: At /dashboard/entries
3. Take screenshot: "sd-entries-page.png"
4. Verify: "Assign Dancers" button VISIBLE
5. Verify: "Import CSV" button VISIBLE
6. Verify: Live summary bar VISIBLE at bottom (if routines exist)
7. Verify: Can see existing routines (if any)
```

**Expected**: SD sees all SD-specific features (UX improvement validation)

### Flow 1.5: Reservation Request Flow
```
**Login As**: Studio Director
1. From /dashboard, click "Events" card
2. Verify: At /dashboard/competitions
3. Take screenshot: "sd-competitions-list.png"
4. Verify: Can see available competitions
5. Click on a competition card
6. Verify: Can view competition details
7. Look for "Request Reservation" or similar button
8. Take screenshot: "sd-reservation-request.png"
```

**Expected**: SD can view competitions and access reservation request

### Flow 1.6: Invoice Access
```
**Login As**: Studio Director
1. From /dashboard, click "Invoices" card
2. Verify: At /dashboard/invoices
3. Take screenshot: "sd-invoices-page.png"
4. Verify: Can see invoices (if any exist)
5. Verify: Can view invoice details
```

**Expected**: SD can access and view invoices

---

## MVP FLOW 2: Competition Director Complete Journey

**Goal**: Verify CD can manage competitions, approve studios, handle reservations, and generate invoices

### Flow 2.1: CD Dashboard Access
```
**Login As**: Competition Director
1. Navigate to https://www.compsync.net/login
2. Fill email: demo.director@gmail.com
3. Fill password: DirectorDemo123!
4. Click "Sign In"
5. Wait for redirect to /dashboard
6. Take screenshot: "cd-dashboard.png"
7. Verify: Dashboard shows "Competition Director Dashboard"
8. Verify: Reservation Pipeline button visible
9. Verify: Dashboard cards include: Invoices, Routine Summaries, Events, Studios, Routines, Scheduling, Judges, Scoring, Analytics, Reports, Emails, Music Tracking
10. Verify: NO "Scoreboard" card (🏆) - UX improvement validation
11. Verify: NO QuickStats bar above Admin Responsibilities - UX improvement validation
```

**Expected**: CD dashboard with all admin features, UX improvements applied

### Flow 2.2: Competition Management
```
**Login As**: Competition Director
1. From /dashboard, click "Events" card
2. Verify: At /dashboard/competitions
3. Take screenshot: "cd-competitions-page.png"
4. Verify: Can see all competitions
5. Verify: NO reservation dropdown UI visible - UX improvement validation
6. Click on first competition card (NOT Clone/Delete buttons)
7. Wait for navigation
8. Verify: URL changes to /dashboard/competitions/{id}/edit - UX improvement validation
9. Take screenshot: "cd-competition-edit.png"
10. Verify: Can view/edit competition details
11. Navigate back
```

**Expected**: CD can manage competitions with clickable cards (UX improvement)

### Flow 2.3: Studio Approval & Management
```
**Login As**: Competition Director
1. From /dashboard, click "Studios" card
2. Verify: At /dashboard/studios
3. Take screenshot: "cd-studios-page.png"
4. Verify: Can see all studios
5. Verify: NO status badges visible (PENDING/APPROVED removed) - UX improvement validation
6. Click on first studio card to expand details
7. Wait 500ms
8. Take screenshot: "cd-studio-expanded.png"
9. Verify: Expanded details appear (Address, Postal Code, Website, Registration Date) - UX improvement validation
10. Click same card to collapse
11. Verify: Details collapse
```

**Expected**: CD can view studios with expandable details (UX improvement)

### Flow 2.4: Reservation Pipeline (MVP CRITICAL)
```
**Login As**: Competition Director
1. From /dashboard, click "Reservation Pipeline" button
2. Verify: At /dashboard/reservation-pipeline
3. Take screenshot: "cd-reservation-pipeline.png"
4. Verify: Can see reservations across all stages
5. Verify: Can see: Pending → Approved → Confirmed → Invoiced → Paid
6. Verify: Can filter/search reservations
```

**Expected**: CD can access reservation pipeline (core MVP feature)

### Flow 2.5: Entries Monitoring (All Studios)
```
**Login As**: Competition Director
1. From /dashboard, click "Routines" card
2. Verify: At /dashboard/entries
3. Take screenshot: "cd-entries-page.png"
4. Verify: "Assign Dancers" button NOT VISIBLE - UX improvement validation
5. Verify: "Import CSV" button NOT VISIBLE - UX improvement validation
6. Verify: Live summary bar NOT VISIBLE - UX improvement validation
7. Verify: Can see routines from all studios
8. Click on a routine to view details
9. Take screenshot: "cd-view-routine.png"
```

**Expected**: CD sees clean entries list without SD-specific features (UX improvement)

### Flow 2.6: Routine Summaries & Invoice Generation (MVP CRITICAL)
```
**Login As**: Competition Director
1. From /dashboard, click "Routine Summaries" card
2. Verify: At /dashboard/routine-summaries
3. Take screenshot: "cd-routine-summaries.png"
4. Verify: Table shows: Studio, Competition, Routines, Subtotal, Discount, Total, Actions
5. Find a row with "Create Invoice" button
6. Take screenshot: "invoice-button-active.png"
7. Verify: Button has gradient styling (purple to pink)
8. Find a row with "Invoice Created" button
9. Take screenshot: "invoice-button-created.png"
10. Verify: Button is greyed out (bg-gray-600) - UX improvement validation
11. Click on a summary row (NOT the button)
12. Verify: Navigates to /dashboard/invoices/{studioId}/{competitionId} - UX improvement validation
13. Take screenshot: "cd-invoice-detail.png"
14. Navigate back
```

**Expected**: CD can generate invoices and navigate via clickable rows (MVP + UX improvements)

---

## MVP FLOW 3: Critical Integration Points

**Goal**: Test where SD and CD workflows intersect

### Flow 3.1: Reservation Approval Flow
```
**Part A - SD Perspective**:
1. Login as demo.studio@gmail.com
2. Navigate to /dashboard/competitions
3. Verify: Can view competitions
4. Take screenshot: "sd-view-competitions.png"

**Part B - CD Perspective**:
1. Login as demo.director@gmail.com
2. Navigate to /dashboard/reservation-pipeline
3. Verify: Can see SD's reservation requests
4. Take screenshot: "cd-view-reservations.png"
```

**Expected**: Reservations flow between SD request and CD approval

### Flow 3.2: Invoice Generation to Studio Delivery
```
**Part A - CD Generates**:
1. Login as demo.director@gmail.com
2. Navigate to /dashboard/routine-summaries
3. Find studio with routines but no invoice
4. Click "Create Invoice" button
5. Wait for confirmation
6. Take screenshot: "cd-invoice-generated.png"

**Part B - SD Views**:
1. Login as demo.studio@gmail.com
2. Navigate to /dashboard/invoices
3. Verify: New invoice appears in SD's invoice list
4. Take screenshot: "sd-sees-invoice.png"
```

**Expected**: Invoices generated by CD appear for SD

### Flow 3.3: Routine Visibility Across Roles
```
**Part A - SD Creates**:
1. Login as demo.studio@gmail.com
2. Navigate to /dashboard/entries
3. Verify: Can see own studio's routines
4. Count routines
5. Take screenshot: "sd-own-routines.png"

**Part B - CD Views All**:
1. Login as demo.director@gmail.com
2. Navigate to /dashboard/entries
3. Verify: Can see routines from multiple studios
4. Verify: Count > SD's count (includes other studios)
5. Take screenshot: "cd-all-routines.png"
```

**Expected**: CD sees all routines across studios, SD sees only own

---

## MVP VALIDATION: Business Requirements Checklist

After completing all flows, verify these MVP business requirements:

### ✅ Studio Director Can:
- [ ] Login and access dashboard
- [ ] View available competitions
- [ ] Access dancer management
- [ ] Create and manage routines
- [ ] Request reservations
- [ ] View generated invoices
- [ ] See only own studio's data

### ✅ Competition Director Can:
- [ ] Login and access admin dashboard
- [ ] Create and manage competitions
- [ ] View and approve studios
- [ ] Access reservation pipeline
- [ ] See all studios' routines
- [ ] Generate invoices from routine summaries
- [ ] Navigate between related pages efficiently

### ✅ UX Improvements Work:
- [ ] Competitions: Cards are clickable, no reservation dropdowns
- [ ] Studios: Expandable details, no status badges
- [ ] Entries (CD): No SD-specific buttons or summary bar
- [ ] Dashboard (CD): No Scoreboard card, no QuickStats bar
- [ ] Routine Summaries: Clickable rows, correct invoice button states

### ✅ Role-Based Access Control:
- [ ] SDs cannot access admin features
- [ ] CDs can see all studios' data
- [ ] UI adapts correctly based on user role

---

## Console Error Monitoring

**For EVERY flow**, monitor browser console:
```
1. Open browser DevTools Console before starting flow
2. Execute the flow steps
3. Take screenshot of console: "console-{flow-name}.png"
4. Check for:
   - React errors (red text)
   - tRPC errors (failed mutations/queries)
   - Network errors (404/500)
   - Authentication errors (401/403)
```

**Expected**: Zero errors across all MVP flows

---

## Test Execution Summary Template

After running all tests, provide summary in this format:

```markdown
# MVP Test Execution Results - CompPortal

**Date**: [Execution Date]
**Production URL**: https://www.compsync.net
**MVP Phase**: 100% Complete + UX Polish
**Test Focus**: End-to-end business flows + UX improvement validation

## Summary
- **Total Flows**: 9 (3 SD flows + 6 CD flows + 3 integration flows)
- **Passed**: X/9
- **Failed**: X/9
- **Blocked**: X/9

## MVP Business Requirements Status
- Studio Director Journey: ✅ PASS / ❌ FAIL
- Competition Director Journey: ✅ PASS / ❌ FAIL
- Integration Points: ✅ PASS / ❌ FAIL
- UX Improvements: ✅ PASS / ❌ FAIL

## Failed Flows

### Flow X.X: [Flow Name]
- **Issue**: [Description]
- **Business Impact**: [Critical/High/Medium/Low]
- **Screenshots**: [List filenames]
- **Expected**: [What should happen]
- **Actual**: [What happened]
- **Console Errors**: [Any errors]
- **Blocker**: [Yes/No - Can MVP proceed?]

## UX Improvement Validation

| Page | Improvement | Status | Notes |
|------|-------------|--------|-------|
| Competitions | Clickable cards | ✅/❌ | |
| Competitions | No reservation dropdown | ✅/❌ | |
| Studios | Expandable details | ✅/❌ | |
| Studios | No status badges | ✅/❌ | |
| Entries (CD) | No SD buttons/bar | ✅/❌ | |
| Dashboard | No Scoreboard card | ✅/❌ | |
| Dashboard | No QuickStats bar | ✅/❌ | |
| Routine Summaries | Clickable rows | ✅/❌ | |
| Routine Summaries | Invoice button states | ✅/❌ | |

## Console Errors Summary
- Total errors found: X
- Critical errors: X
- Warnings: X
- By page: [Breakdown]

## Screenshots Archive
All screenshots saved to: `test-results/mvp-verification-jan14/`

## MVP Readiness Assessment

**Can CompPortal MVP proceed to customer demo?**
- [ ] YES - All critical flows pass
- [ ] NO - Blockers exist (list below)

**Blockers** (if any):
1. [Blocker description + business impact]
2. [Blocker description + business impact]

## Recommendations

### Critical (Fix Before Demo):
1. [Issue + fix needed]

### High Priority (Fix Soon):
1. [Issue + fix needed]

### Nice to Have:
1. [Issue + enhancement opportunity]
```

---

## Notes for ChatGPT Agent

### Testing Approach:
- Focus on **end-to-end business flows**, not granular UI testing
- Verify **MVP critical features work in production**
- Validate **UX improvements don't break core functionality**
- Test **role-based access control** thoroughly
- Capture **evidence via screenshots** for every major step

### Execution Guidelines:
- Use Playwright MCP tools for all interactions
- Take screenshots after EVERY major step
- Save screenshots with descriptive names: `{role}-{page}-{action}.png`
- Report ANY console errors immediately with screenshot
- If authentication fails, report as BLOCKER
- Test systematically - don't skip flows
- Test each user role separately, then integration points

### What Makes a Flow "PASS":
- User can complete the business task
- No console errors
- UI displays correctly
- Data persists correctly
- Navigation works as expected
- Role-based permissions enforced

### What Makes a Flow "FAIL":
- User cannot complete the task
- Critical console errors
- Data loss or corruption
- Broken navigation
- Permission bypass possible

### What Makes a Flow "BLOCKED":
- Authentication fails
- Required data missing (no competitions, no studios)
- Server errors (500, timeout)
- Missing required features

---

**End of MVP Test Suite - CompPortal January 14, 2025**
