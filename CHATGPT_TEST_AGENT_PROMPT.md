# CompPortal MVP Testing Agent Prompt

**Production URL**: https://comp-portal-one.vercel.app/

## Your Mission

You are a QA testing agent for GlowDance Competition Portal (CompPortal), a dance competition management platform. Your goal is to execute 25 golden path tests across two user journeys (Studio Director and Competition Director) and verify that all MVP features work correctly.

**CRITICAL: This is REAL production testing**:
- Real user accounts (actual authentication)
- Real database (Supabase PostgreSQL)
- Real data mutations (creating, updating, deleting records)
- Real invoice generation (PDFs and database records)
- Real file uploads (Supabase Storage)
- Real API calls (tRPC mutations)

You will be making ACTUAL changes to the production database. All actions you take (approving reservations, marking invoices paid, assigning dancers) will persist in the database and be visible to other users.

## Test Credentials

**Studio Director (Studio Owner)**:
- Email: `demo.studio@gmail.com`
- Password: `Demo1234!`
- Studio: Demo Dance Studio

**Competition Director (Event Admin)**:
- Email: `demo.director@gmail.com`
- Password: `Demo1234!`
- Access: All competitions and studios

## Context: What This Platform Does

CompPortal manages the complete lifecycle of dance competitions:
1. **Studio Directors** register their studio, request routine spaces (reservations), create routines, assign dancers, upload music, and view invoices
2. **Competition Directors** approve/reject reservations, monitor capacity across all studios, generate invoices, schedule events, and manage judges

## Recent Changes to Verify

**Latest deployment (Oct 6, 2025)** includes:
- Competition Director dashboard reordered: Events → Invoices → Studios first
- Dancers card HIDDEN for Competition Directors (should only show for Studio Directors)
- Drag-drop cards should NOT navigate to page when released after drag
- Studios card should be CLICKABLE in dashboard stats
- "All Routines" renamed to just "Routines"
- Subtle animated pink/purple gradient background at 15% opacity

---

## 25 Golden Path Tests

### **STUDIO DIRECTOR JOURNEY (Tests 1-13)**

#### Authentication & Dashboard (Tests 1-3)

**Test 1: Studio Director Login**
- Action: Navigate to production URL, click "Sign In", enter demo.studio@gmail.com / Demo1234!
- Expected: Successful login → redirected to Studio Director dashboard
- Verify: Header shows "Studio Director Dashboard", email visible, Sign Out button present

**Test 2: Dashboard Layout - Studio Director**
- Action: Observe dashboard top stats section (4 cards)
- Expected: See these cards in order: Reservations, Studios, **Dancers** (SD only!), Events Capacity
- Verify: Dancers card IS visible (with count, active, male/female stats)
- Verify: Animated pink/purple gradient visible as subtle background overlay

**Test 3: Dashboard Navigation Cards**
- Action: Scroll to "Quick Actions" section, observe sortable cards
- Expected: See cards including "My Dancers", "My Routines", "Invoices", "Reservations"
- Verify: Drag handle (hamburger icon) visible on right side of each card
- Test: Try clicking a card → should navigate immediately
- Test: Try dragging a card then releasing → should NOT navigate to the page

#### Dancer Management (Tests 4-5)

**Test 4: View Existing Dancers**
- Action: Click "My Dancers" card from dashboard
- Expected: Navigate to /dashboard/dancers page
- Verify: See list of dancers with names, ages, gender, skill level
- Check: At least 1 dancer exists (if not, data issue)
- Note: Record total dancer count for later verification

**Test 5: Dancer Detail View**
- Action: Click on any dancer name/row
- Expected: Navigate to dancer detail page showing full profile
- Verify: See dancer's full name, DOB, gender, age calculation, contact info
- Verify: Back/navigation option available

#### Reservation Workflow (Tests 6-7)

**Test 6: View Reservations**
- Action: Click "Reservations" from dashboard or navigation
- Expected: Navigate to /dashboard/reservations page
- Verify: See list of reservations with status badges (Pending/Approved/Rejected)
- Check: At least 1 reservation exists with status
- Verify: Space counter visible (e.g., "10/10 spaces used")
- Verify: NO agent information visible (agent section hidden for Studio Directors)

**Test 7: Reservation Capacity Display**
- Action: Find an APPROVED reservation in the list
- Expected: See capacity indicator showing "X / Y spaces used"
- Verify: If at capacity (10/10), "Create Routine" button should be disabled/grayed
- Verify: If under capacity (e.g., 5/10), "Create Routine" button should be enabled
- Note: This enforces the space limit revenue protection

#### Routine Management (Tests 8-10)

**Test 8: View Routines List**
- Action: Click "My Routines" from dashboard
- Expected: Navigate to /dashboard/entries page
- Verify: See list of routines with entry numbers (100+), titles, categories, age groups
- Verify: Music status badges (Uploaded/Missing)
- Check: At least 1 routine exists
- Note: Record total routine count

**Test 9: Routine Detail View**
- Action: Click on any routine title/row
- Expected: Navigate to routine detail page (/dashboard/entries/[id])
- Verify: See complete routine information:
  - Entry number, title, category, age group, size category
  - List of assigned dancers with names and ages
  - Music upload status
  - Fee breakdown (routine fee, late fee if applicable, total)
- Verify: Edit button and Music Upload button visible

**Test 10: Routine-Dancer Assignment (REAL DATABASE MUTATION)**
- Action: From dashboard, click "My Routines" → "Assign Dancers" button
- Expected: Navigate to /dashboard/entries/assign page
- Verify: Two-panel layout: "My Routines" (left) and "My Dancers" (right)
- Test: Click a routine to select it → should highlight with purple border
- Test: Click a dancer (unassigned) → should assign to selected routine
- Verify: Dancer shows "✅ Assigned" status after assignment
- Verify: Routine shows assigned dancers in panel with names and ages
- **CRITICAL VERIFICATION**: Database actually updated
  - Action: Navigate back to dashboard, then return to /dashboard/entries/assign
  - Expected: Assignment PERSISTS (dancer still shows as assigned)
  - Action: Click routine to view detail → assigned dancers should be listed
- Test: Click "Remove" on assigned dancer → should remove immediately (no confirmation)
- **VERIFY REMOVAL**: Dancer should show as unassigned again, can be re-assigned

#### Invoice Management (Tests 11-12)

**Test 11: View Studio Invoices**
- Action: Click "Invoices" from dashboard
- Expected: Navigate to /dashboard/invoices page
- Verify: See competition selector dropdown
- Action: Select a competition from dropdown
- Expected: See invoice card for selected competition/studio
- Verify: Invoice shows studio name, competition name, total amount, payment status
- Action: Click "View Invoice" button
- Expected: Navigate to detailed invoice page

**Test 12: Invoice Detail & Export**
- Action: From invoice detail page, verify layout
- Expected: See professional invoice with:
  - Invoice number and date
  - Bill To section (studio info)
  - Competition section (event info)
  - Reservation details (spaces requested/confirmed, deposit, payment status)
  - Line items table (routines with fees)
  - Totals section (subtotal, tax, total)
- Test: Click "📥 Download PDF" button → PDF should download
- Test: Click "📊 Export CSV" button → CSV should download
- Verify: CSV contains all routine line items + summary rows

#### Music Upload (Test 13)

**Test 13: Music Upload for Routine**
- Action: From routine detail page, click "Upload Music" or navigate to /dashboard/entries/[id]/music
- Expected: See music upload interface
- Verify: If music already uploaded, see audio player with file name and duration
- Verify: If no music, see upload dropzone with file requirements (MP3, WAV, M4A, AAC, 50MB max)
- Note: Actual file upload testing optional (may not have files), but interface should be functional

---

### **COMPETITION DIRECTOR JOURNEY (Tests 14-25)**

#### Authentication & Dashboard (Tests 14-16)

**Test 14: Competition Director Login**
- Action: Sign out from Studio Director account, sign in with demo.director@gmail.com / Demo1234!
- Expected: Successful login → redirected to Competition Director dashboard
- Verify: Header shows "Competition Director Dashboard", email visible, "DIRECTOR" badge

**Test 15: Dashboard Layout - Competition Director**
- Action: Observe dashboard top stats section
- Expected: See 4 cards in order: Reservations, Studios, **NO Dancers Card**, Events Capacity
- **CRITICAL**: Dancers card should be HIDDEN (not visible at all for Competition Directors)
- Verify: Reservations card shows Approved/Pending/Rejected counts
- Verify: Studios card shows Approved/Pending/With Dancers counts
- Verify: Events Capacity card shows upcoming events with capacity bars (colored green/yellow/red)
- Verify: Animated pink/purple gradient visible as subtle background overlay

**Test 16: Dashboard Card Reordering & Navigation**
- Action: Scroll to "Quick Actions" sortable cards section
- Expected: See cards in priority order: Events, Invoices, Studios at top
- Verify: Card labeled "Routines" (NOT "All Routines")
- Test: Click Studios card → should navigate to /dashboard/studios immediately
- Test: Drag a card by the hamburger handle, move it, release
- **CRITICAL**: Should NOT navigate to the page after drag release
- Verify: Card position saved (refresh page, order persists)

#### Cross-Studio Visibility (Tests 17-18)

**Test 17: View All Studios (Admin)**
- Action: Click Studios card or navigate to /dashboard/studios
- Expected: See list of ALL studios (not just one studio)
- Verify: Multiple studios visible (Demo Dance Studio, Rhythm & Motion, Elite Performance, Starlight Academy)
- Verify: Each studio shows: name, owner name, status badge, dancer count, routine count
- Check: At least 4 studios exist in production data

**Test 18: View All Routines (Cross-Studio)**
- Action: Click "Routines" card (renamed from "All Routines")
- Expected: Navigate to /dashboard/entries page
- Verify: See routines from MULTIPLE studios (not filtered to single studio)
- Verify: Studio name column visible showing which studio owns each routine
- Check: Routines from at least 2 different studios visible
- Note: This confirms Competition Directors see cross-studio data

#### Reservation Management (Tests 19-21)

**Test 19: View All Reservations (Admin)**
- Action: Navigate to /dashboard/competitions page
- Expected: See 4×4 grid of competition cards
- Verify: Each card shows competition name, year, capacity progress bar, counts (pending/confirmed)
- Action: Click a competition card to expand
- Expected: See reservation panel with list of studio reservations for that event
- Verify: Reservations from multiple studios visible
- Verify: Each reservation shows studio name, spaces requested/confirmed, status

**Test 20: Approve/Reject Reservation (REAL DATABASE MUTATION)**
- Action: Find a PENDING reservation in competition panel
- Expected: See "Approve" (green) and "Reject" (red) buttons
- Test: Click "Approve" button
- Expected: Confirmation dialog appears
- Action: Confirm approval
- Expected: Reservation status changes to "APPROVED", badge turns green
- Verify: Capacity counter updates (spaces added to competition total)
- **CRITICAL VERIFICATION**: Invoice generated automatically in REAL database
  - Action: Navigate to /dashboard/invoices/all
  - Expected: NEW invoice record exists for this studio/competition
  - Verify: Invoice has unique invoice number (e.g., INV-001234)
  - Verify: Line items match reservation spaces
  - Action: Refresh browser page
  - Expected: Approved status PERSISTS (database was actually updated)

**Test 21: Capacity Tracking**
- Action: Observe competition capacity progress bars
- Expected: See color-coded bars:
  - Green: <70% full
  - Yellow: 70-90% full
  - Red: >90% full
- Verify: Percentage displayed (e.g., "45.2% full")
- Verify: Counts shown (e.g., "271/600 routines")
- Check: Competition Directors can see capacity across all studios

#### Invoice Management (Tests 22-23)

**Test 22: View All Invoices (Cross-Studio)**
- Action: Click "Invoices" card or navigate to /dashboard/invoices/all
- Expected: See table of ALL invoices across ALL studios
- Verify: Columns include: Studio Name, Competition, Invoice #, Total, Payment Status, Actions
- Verify: Multiple studios' invoices visible
- Check: At least 2 invoices from different studios

**Test 23: Mark Invoice as Paid (REAL DATABASE MUTATION)**
- Action: Find an invoice with "Unpaid" or "Pending" status
- Expected: See "Mark Paid" button (green)
- Note: Record invoice number and current status before clicking
- Test: Click "Mark Paid" button
- Expected: Confirmation dialog appears
- Action: Confirm
- Expected: Payment status changes to "PAID", badge turns green
- **CRITICAL VERIFICATION**: Database actually updated
  - Action: Refresh browser page
  - Expected: Invoice STILL shows "PAID" status (not reverted)
  - Action: Navigate to dashboard stats
  - Expected: "Paid" count increased, "Unpaid" count decreased
  - Action: Sign out, sign back in as demo.director@gmail.com
  - Expected: Invoice STILL shows "PAID" status (persistent across sessions)
  - Action: Sign in as demo.studio@gmail.com, check studio's invoice view
  - Expected: Payment status visible to studio (cross-user data consistency)

#### Scheduling & Judge Management (Tests 24-25)

**Test 24: Scheduling Interface**
- Action: Navigate to /dashboard/scheduling
- Expected: See scheduling manager interface
- Verify: Competition selector dropdown visible
- Action: Select a competition
- Expected: See list of routines to schedule OR scheduled routines in sessions
- Verify: Session management UI visible (can create/edit sessions)
- Verify: Auto-schedule button available
- Check: At least basic scheduling interface loads without errors

**Test 25: Judge Scoring Interface**
- Action: Navigate to /dashboard/scoring
- Expected: See judge tablet scoring interface
- Verify: Competition selector dropdown visible
- Verify: Judge profile selector visible
- Action: Select competition and judge
- Expected: See scoring UI with:
  - Current routine display (entry number, title, category)
  - Three scoring sliders (Technical, Artistic, Performance)
  - Special awards checkboxes (6 options)
  - Navigation controls (previous/next routine)
  - "Submit Score" button
  - Score Review tab
- Test: Adjust sliders → values should update
- Verify: Can navigate between routines with arrows or quick jump

---

## Data Verification Checklist

**Real Production Data Requirements**:
- [ ] At least 1 Studio Director account (demo.studio@gmail.com)
- [ ] At least 1 Competition Director account (demo.director@gmail.com)
- [ ] At least 4 studios in database (Demo Dance Studio + 3 others)
- [ ] At least 1 dancer per studio
- [ ] At least 1 competition event (GlowDance Orlando or similar)
- [ ] At least 3 reservations (1 pending, 1 approved, 1 rejected)
- [ ] At least 10 routines total across studios
- [ ] At least 2 invoices (1 paid, 1 unpaid)
- [ ] Reservation-routine linkage working (space limits enforced)

---

## Test Report Format

For each test, provide:

```
Test #X: [Test Name]
Status: ✅ PASS / ❌ FAIL / ⚠️ PARTIAL
Details: [What you observed]
Expected: [What should happen]
Data: [Actual values seen, e.g., "Saw 30 dancers total"]
Issues: [Any bugs, missing features, or concerns]
Screenshot: [Describe what you see]
```

**Summary Stats**:
- Total Tests: 25
- Passed: X
- Failed: X
- Partial: X
- Pass Rate: X%

**Critical Issues Found** (if any):
1. [Issue description with test number]
2. [Issue description with test number]

**Data Integrity**:
- Dancers count: X
- Routines count: X
- Studios count: X
- Reservations count: X
- Invoices count: X

**Recent Features Verification**:
- [ ] Dancers card hidden for Competition Directors
- [ ] Studios card clickable
- [ ] "Routines" label (not "All Routines")
- [ ] Drag-drop does NOT navigate on release
- [ ] Animated gradient background visible
- [ ] Dashboard card order correct (Events → Invoices → Studios)

---

## Execution Instructions

1. **Start fresh**: Open incognito/private browser window
2. **Open DevTools**: Press F12, go to Network tab and Console tab
3. **Test sequentially**: Complete Studio Director tests (1-13) first, then Competition Director tests (14-25)
4. **Document everything**: Record counts, values, statuses you see
5. **Take screenshots**: When encountering issues or interesting data
6. **Monitor API calls**: In Network tab, filter for "trpc" to see all backend API calls
   - Look for mutation calls (e.g., `entry.addParticipant`, `reservation.approve`, `invoice.markPaid`)
   - Verify these return status 200 (success)
   - Check response payload contains actual data
7. **Check console errors**: Any red errors in console indicate real issues
8. **Verify persistence**: After mutations, ALWAYS refresh page to confirm database was updated
9. **Cross-session testing**: For critical mutations (invoice paid, reservation approved), sign out and back in to verify data persists
10. **Be thorough**: If something looks wrong, investigate deeper

### What "Real Data" Means

When you:
- **Approve a reservation** → Supabase database `reservations` table updated, `status` = 'approved'
- **Assign a dancer** → `entry_participants` table gets new row with dancer_id and entry_id
- **Mark invoice paid** → `reservations` table `paymentStatus` field updated to 'paid'
- **Upload music** → File stored in Supabase Storage bucket, `competition_entries` table updated with file URL
- **Create routine** → New row inserted in `competition_entries` table with all form data

All these operations hit real tRPC mutations that execute Prisma queries against the production PostgreSQL database.

## Success Criteria

**Minimum for MVP Pass**:
- 23+ tests passing (92% pass rate)
- 0 critical blocking bugs
- All authentication working
- Cross-studio visibility confirmed for CDs
- Space limit enforcement working
- Recent UI changes verified (Dancers hidden, Studios clickable, etc.)

**Known Limitations** (not bugs):
- Some pages may be placeholders (Analytics, Reports, Emails)
- Music upload may not accept actual files in testing
- Scheduling auto-algorithm may not be perfect
- PDF generation may take a few seconds

---

## Start Testing Now

Begin with Test 1: Studio Director Login at https://comp-portal-one.vercel.app/

Report back with detailed results in the format specified above. Focus on finding real bugs and data issues that would block the MVP launch.
