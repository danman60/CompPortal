# Golden Test Scenarios - RBAC Validation

## Test Credentials

**Studio Director**: demo.studio@gmail.com / StudioDemo123!
**Competition Director**: demo.director@gmail.com / DirectorDemo123!
**Super Admin**: demo.admin@gmail.com / AdminDemo123!

**Production URL**: https://comp-portal-one.vercel.app

---

## 🎭 Studio Director Tests (10 scenarios)

### SD-1: Login and Dashboard Access
**Purpose**: Verify studio director can log in and see studio-specific dashboard
**Steps**:
1. Navigate to /login
2. Enter demo.studio@gmail.com / 123456
3. Click "Sign In"
4. Verify redirect to /dashboard
5. Verify dashboard shows "Demo Dance Studio" studio name
6. Verify quick actions show studio-specific features (My Dancers, My Entries, etc.)
7. Verify NO admin features visible (All Studios, Reservations approval, etc.)

**Expected**: Studio director sees only their studio's dashboard with 6 quick actions

---

### SD-2: View Own Studio's Dancers Only
**Purpose**: Verify studio director can only see dancers from their own studio
**Steps**:
1. Log in as demo.studio@gmail.com
2. Navigate to /dashboard/dancers
3. Verify page loads without errors
4. Check dancer list - should show 0 dancers (Demo Dance Studio has none)
5. Verify no dancers from Starlight, Elite, or Rhythm studios are visible

**Expected**: 0 dancers visible, no multi-tenancy leak

---

### SD-3: Create Dancer for Own Studio
**Purpose**: Verify studio director can create dancers for their own studio
**Steps**:
1. Log in as demo.studio@gmail.com
2. Navigate to /dashboard/dancers
3. Click "Add Dancer" or equivalent button
4. Fill in dancer details:
   - First Name: "Test"
   - Last Name: "Dancer"
   - Date of Birth: "2010-01-01"
   - Gender: "Female"
5. Submit form
6. Verify dancer appears in list
7. Verify dancer count increments to 1

**Expected**: Dancer created successfully and visible in list

---

### SD-4: Attempt to Create Dancer for Another Studio (Security Test)
**Purpose**: Verify studio director CANNOT create dancers for other studios
**Steps**:
1. Log in as demo.studio@gmail.com
2. Use browser dev tools to attempt tRPC mutation:
   ```javascript
   // Should fail with authorization error
   await trpcClient.dancer.create.mutate({
     studio_id: '<STARLIGHT_STUDIO_ID>',  // Different studio
     first_name: 'Hack',
     last_name: 'Attempt'
   })
   ```
3. Verify error message: "Cannot create dancers for other studios"

**Expected**: Mutation rejected with authorization error

---

### SD-5: View Own Studio's Entries Only
**Purpose**: Verify studio director can only see entries from their own studio
**Steps**:
1. Log in as demo.studio@gmail.com
2. Navigate to /dashboard/entries
3. Verify page loads without errors
4. Check entry list - should show 0 entries (Demo Dance Studio has none)
5. Verify no entries from other studios are visible

**Expected**: 0 entries visible, no multi-tenancy leak

---

### SD-6: Create Entry for Own Studio
**Purpose**: Verify studio director can create competition entries
**Steps**:
1. Log in as demo.studio@gmail.com
2. Ensure at least 1 dancer exists (from SD-3)
3. Navigate to /dashboard/entries
4. Click "Create Entry" or equivalent
5. Fill in entry details:
   - Competition: "Canadian National Dance Competition 2025"
   - Title: "Test Solo"
   - Category: "Solo"
   - Add dancer from SD-3
6. Submit form
7. Verify entry appears in list
8. Verify entry count increments to 1

**Expected**: Entry created successfully and visible in list

---

### SD-7: View Own Studio's Reservations Only
**Purpose**: Verify studio director can only see their own studio's reservations
**Steps**:
1. Log in as demo.studio@gmail.com
2. Navigate to /dashboard/reservations
3. Verify page loads without errors
4. Check reservation list - should show 0 reservations (Demo Dance Studio has none)
5. Verify no reservations from other studios are visible

**Expected**: 0 reservations visible, no multi-tenancy leak

---

### SD-8: Create Reservation for Own Studio
**Purpose**: Verify studio director can create competition reservations
**Steps**:
1. Log in as demo.studio@gmail.com
2. Navigate to /dashboard/reservations
3. Click "Create Reservation" or equivalent
4. Fill in reservation details:
   - Competition: "Canadian National Dance Competition 2025"
   - Spaces Requested: 10
   - Agent Name: "Demo Agent"
   - Agent Email: "agent@demo.com"
5. Submit form
6. Verify reservation appears in list with "pending" status
7. Verify reservation count increments to 1

**Expected**: Reservation created successfully with pending status

---

### SD-9: Attempt to Update Another Studio's Dancer (Security Test)
**Purpose**: Verify studio director CANNOT update dancers from other studios
**Steps**:
1. Log in as demo.studio@gmail.com
2. Get a dancer ID from Starlight studio (e.g., using DB query or logged from CD tests)
3. Use browser dev tools to attempt tRPC mutation:
   ```javascript
   // Should fail with authorization error
   await trpcClient.dancer.update.mutate({
     id: '<STARLIGHT_DANCER_ID>',
     data: { first_name: 'Hacked' }
   })
   ```
4. Verify error message: "Cannot update dancers from other studios"

**Expected**: Mutation rejected with authorization error

---

### SD-10: Attempt to Delete Another Studio's Entry (Security Test)
**Purpose**: Verify studio director CANNOT delete entries from other studios
**Steps**:
1. Log in as demo.studio@gmail.com
2. Get an entry ID from Starlight studio
3. Use browser dev tools to attempt tRPC mutation:
   ```javascript
   // Should fail with authorization error
   await trpcClient.entry.delete.mutate({
     id: '<STARLIGHT_ENTRY_ID>'
   })
   ```
4. Verify error message: "Cannot delete entries from other studios"

**Expected**: Mutation rejected with authorization error

---

## 🏆 Competition Director Tests (10 scenarios)

### CD-1: Login and Dashboard Access
**Purpose**: Verify competition director can log in and see admin dashboard
**Steps**:
1. Navigate to /login
2. Enter demo.competition@gmail.com / 123456
3. Click "Sign In"
4. Verify redirect to /dashboard
5. Verify dashboard shows admin features (11 admin tools)
6. Verify admin tools include: All Studios, Reservations, All Entries, Scheduling, All Dancers, Judges, Scoring, Scoreboard, Analytics, Invoices, Emails
7. Verify NO "Settings" card (super admin only)

**Expected**: Competition director sees admin dashboard with 11 tools

---

### CD-2: View All Dancers Across All Studios
**Purpose**: Verify competition director can see dancers from ALL studios
**Steps**:
1. Log in as demo.competition@gmail.com
2. Navigate to /dashboard/dancers
3. Verify page loads without errors
4. Check dancer list - should show 15 dancers total
5. Verify dancers from multiple studios visible:
   - Starlight Dance Studio dancers
   - Elite Dance Academy dancers
   - Rhythm Nation Dance Center dancers
   - Demo Dance Studio dancers (if any created)
6. Verify can filter by studio using dropdown

**Expected**: All 15+ dancers visible from all studios

---

### CD-3: View All Entries Across All Studios
**Purpose**: Verify competition director can see entries from ALL studios
**Steps**:
1. Log in as demo.competition@gmail.com
2. Navigate to /dashboard/entries
3. Verify page loads without errors
4. Check entry list - should show all entries from all studios
5. Verify entries from multiple studios visible
6. Verify can filter by studio, competition, status

**Expected**: All entries visible from all studios

---

### CD-4: View All Reservations
**Purpose**: Verify competition director can see all studio reservations
**Steps**:
1. Log in as demo.competition@gmail.com
2. Navigate to /dashboard/reservations
3. Verify page loads without errors
4. Check reservation list - should show all reservations from all studios
5. Verify reservations from multiple studios visible
6. Verify can see pending, approved, rejected reservations

**Expected**: All reservations visible from all studios

---

### CD-5: Approve Studio Reservation
**Purpose**: Verify competition director can approve studio reservations
**Steps**:
1. Log in as demo.competition@gmail.com
2. Navigate to /dashboard/reservations
3. Find a pending reservation (create one as SD if needed)
4. Click "Approve" button
5. Enter confirmed spaces (e.g., 10)
6. Submit approval
7. Verify reservation status changes to "approved"
8. Verify approved_at timestamp is set
9. Verify spaces_confirmed = 10

**Expected**: Reservation approved successfully

---

### CD-6: Reject Studio Reservation
**Purpose**: Verify competition director can reject studio reservations
**Steps**:
1. Log in as demo.competition@gmail.com
2. Navigate to /dashboard/reservations
3. Find a pending reservation (create one as SD if needed)
4. Click "Reject" button
5. Enter rejection reason (e.g., "Competition full")
6. Submit rejection
7. Verify reservation status changes to "rejected"
8. Verify internal_notes contains rejection reason

**Expected**: Reservation rejected successfully with reason

---

### CD-7: View Competition Analytics
**Purpose**: Verify competition director can access analytics dashboard
**Steps**:
1. Log in as demo.competition@gmail.com
2. Navigate to /dashboard/analytics
3. Verify page loads without errors
4. Verify metrics visible:
   - Total entries, studios, dancers
   - Revenue analytics
   - Entries by category
   - Entries by studio
   - Top performers
5. Verify all numbers are accurate (not 0)

**Expected**: Analytics dashboard displays comprehensive metrics

---

### CD-8: Manage Judges
**Purpose**: Verify competition director can create and manage judges
**Steps**:
1. Log in as demo.competition@gmail.com
2. Navigate to /dashboard/judges
3. Click "Create Judge" or equivalent
4. Fill in judge details:
   - First Name: "Test"
   - Last Name: "Judge"
   - Email: "judge@test.com"
   - Specialization: "Technical"
5. Submit form
6. Verify judge appears in list
7. Assign judge to competition
8. Verify assignment successful

**Expected**: Judge created and assigned successfully

---

### CD-9: View Live Scoreboard
**Purpose**: Verify competition director can view live scoring results
**Steps**:
1. Log in as demo.competition@gmail.com
2. Navigate to /dashboard/scoreboard
3. Verify page loads without errors
4. Verify scoreboard shows:
   - Entry rankings (1st, 2nd, 3rd with medals)
   - Average scores for each entry
   - Judge progress (X / Y judges scored)
5. Click "Details" on an entry
6. Verify detailed scores modal opens with judge breakdowns

**Expected**: Scoreboard displays live rankings and scores

---

### CD-10: Attempt to Approve Own Reservation as Studio Owner (Security Test)
**Purpose**: Verify competition director role separation - cannot be both roles
**Steps**:
1. Log in as demo.competition@gmail.com
2. Verify user does NOT have an associated studio (ctx.studioId should be null)
3. Attempt to create a reservation (should fail or require studio selection)
4. Verify competition director cannot create studio-owned data without studio association

**Expected**: Role separation enforced - CD cannot act as studio owner

---

## 👑 Super Admin Tests (10 scenarios)

### SA-1: Login and Full Dashboard Access
**Purpose**: Verify super admin can log in and see all admin features
**Steps**:
1. Navigate to /login
2. Enter demo.admin@gmail.com / 123456
3. Click "Sign In"
4. Verify redirect to /dashboard
5. Verify dashboard shows all 11 admin tools PLUS Settings card (12 total)
6. Verify Settings card visible (super admin exclusive)

**Expected**: Super admin sees complete dashboard with Settings

---

### SA-2: Access All Studios Management
**Purpose**: Verify super admin can view and manage all studios
**Steps**:
1. Log in as demo.admin@gmail.com
2. Navigate to /dashboard/studios
3. Verify page loads without errors
4. Verify all studios visible:
   - Starlight Dance Studio
   - Elite Dance Academy
   - Rhythm Nation Dance Center
   - Demo Dance Studio
5. Verify can view details for each studio

**Expected**: All studios visible and accessible

---

### SA-3: View All Dancers (Unrestricted)
**Purpose**: Verify super admin has unrestricted access to all dancer data
**Steps**:
1. Log in as demo.admin@gmail.com
2. Navigate to /dashboard/dancers
3. Verify page loads without errors
4. Verify all 15+ dancers visible from all studios
5. Verify can filter by any studio
6. Verify can search across all studios

**Expected**: Complete access to all dancer data

---

### SA-4: View All Entries (Unrestricted)
**Purpose**: Verify super admin has unrestricted access to all entry data
**Steps**:
1. Log in as demo.admin@gmail.com
2. Navigate to /dashboard/entries
3. Verify page loads without errors
4. Verify all entries visible from all studios
5. Verify can filter by studio, competition, status
6. Verify can view/edit any entry

**Expected**: Complete access to all entry data

---

### SA-5: Approve/Reject Any Reservation
**Purpose**: Verify super admin can approve/reject any studio reservation
**Steps**:
1. Log in as demo.admin@gmail.com
2. Navigate to /dashboard/reservations
3. Find pending reservations from multiple studios
4. Approve one reservation
5. Reject another reservation
6. Verify both operations successful
7. Verify can manage reservations across all studios

**Expected**: Complete reservation management across all studios

---

### SA-6: Access Scheduling System
**Purpose**: Verify super admin can access scheduling dashboard
**Steps**:
1. Log in as demo.admin@gmail.com
2. Navigate to /dashboard/scheduling
3. Verify page loads without errors
4. Verify can see all entries scheduled/unscheduled
5. Verify can assign time slots
6. Verify can export schedules (PDF/CSV/iCal)

**Expected**: Complete scheduling access and management

---

### SA-7: Manage Judges Across Competitions
**Purpose**: Verify super admin can manage all judges
**Steps**:
1. Log in as demo.admin@gmail.com
2. Navigate to /dashboard/judges
3. Verify all judges visible
4. Create new judge
5. Assign to multiple competitions
6. Check-in judges
7. Verify all operations successful

**Expected**: Complete judge management across all competitions

---

### SA-8: Access Scoring System
**Purpose**: Verify super admin can access judge scoring interface
**Steps**:
1. Log in as demo.admin@gmail.com
2. Navigate to /dashboard/scoring
3. Verify page loads without errors
4. Verify can see all entries available for scoring
5. Select an entry and submit test scores
6. Verify scores saved successfully

**Expected**: Complete scoring system access

---

### SA-9: View Analytics Dashboard (Full Access)
**Purpose**: Verify super admin can access all analytics
**Steps**:
1. Log in as demo.admin@gmail.com
2. Navigate to /dashboard/analytics
3. Verify page loads without errors
4. Verify all metrics visible:
   - System-wide statistics
   - Revenue analytics
   - Judge performance
   - Top performers
   - Entries by category/studio/age group
5. Verify can filter by competition

**Expected**: Complete analytics access with all metrics

---

### SA-10: Modify Dancer Across Studios (Full Admin Power)
**Purpose**: Verify super admin can modify data from any studio without restrictions
**Steps**:
1. Log in as demo.admin@gmail.com
2. Navigate to /dashboard/dancers
3. Select a dancer from Starlight studio
4. Update dancer details (e.g., change first name)
5. Submit update
6. Verify update successful
7. Select a dancer from Elite studio
8. Update dancer details
9. Verify update successful
10. Verify NO "Cannot update dancers from other studios" error

**Expected**: Super admin can modify data across all studios without RBAC restrictions

---

## 🧪 Testing Execution Plan

### Phase 1: Studio Director Tests (SD-1 through SD-10)
Execute all 10 studio director scenarios in sequence. Document:
- ✅ PASS: Test passed as expected
- ❌ FAIL: Test failed (capture error details)
- ⚠️ PARTIAL: Test partially passed (note issues)

### Phase 2: Competition Director Tests (CD-1 through CD-10)
Execute all 10 competition director scenarios in sequence.

### Phase 3: Super Admin Tests (SA-1 through SA-10)
Execute all 10 super admin scenarios in sequence.

### Phase 4: Bug List Compilation
After completing all 30 tests, compile comprehensive bug list:
- 🔴 **Critical**: Breaks core functionality, security issues, multi-tenancy bypass
- 🟡 **High**: Significant UX issues, RBAC leaks, data inconsistencies
- 🔵 **Medium**: Minor bugs, cosmetic issues, performance problems
- ⚪ **Low**: Nice-to-have improvements, edge cases

### Phase 5: Systematic Bug Fixing
Work through bugs in priority order:
1. Fix critical bugs first
2. Test fixes in production
3. Move to high priority bugs
4. Continue until all bugs resolved

---

## 📝 Test Execution Tracker

| Test ID | Status | Error Details | Fixed? |
|---------|--------|--------------|--------|
| SD-1    | ⏳     |              |        |
| SD-2    | ⏳     |              |        |
| SD-3    | ⏳     |              |        |
| SD-4    | ⏳     |              |        |
| SD-5    | ⏳     |              |        |
| SD-6    | ⏳     |              |        |
| SD-7    | ⏳     |              |        |
| SD-8    | ⏳     |              |        |
| SD-9    | ⏳     |              |        |
| SD-10   | ⏳     |              |        |
| CD-1    | ⏳     |              |        |
| CD-2    | ⏳     |              |        |
| CD-3    | ⏳     |              |        |
| CD-4    | ⏳     |              |        |
| CD-5    | ⏳     |              |        |
| CD-6    | ⏳     |              |        |
| CD-7    | ⏳     |              |        |
| CD-8    | ⏳     |              |        |
| CD-9    | ⏳     |              |        |
| CD-10   | ⏳     |              |        |
| SA-1    | ⏳     |              |        |
| SA-2    | ⏳     |              |        |
| SA-3    | ⏳     |              |        |
| SA-4    | ⏳     |              |        |
| SA-5    | ⏳     |              |        |
| SA-6    | ⏳     |              |        |
| SA-7    | ⏳     |              |        |
| SA-8    | ⏳     |              |        |
| SA-9    | ⏳     |              |        |
| SA-10   | ⏳     |              |        |

**Legend**: ⏳ Pending | ✅ Pass | ❌ Fail | ⚠️ Partial
