# Routines & Reservations - Consolidated Feedback & Refinement

**Date**: October 2025
**Purpose**: Consolidate ALL feedback from multiple testing rounds regarding Routines, Reservations, UX, and workflow
**Status**: **PRIORITY - Multiple rounds of feedback need addressing**

---

## 🚨 Critical Context: What's Been Ignored

User feedback indicates **multiple rounds of notes** about Routines and Reservations have not been fully addressed. This document consolidates:
- Latest user testing session (USER_TESTING_NOTES.md)
- Previous implementation plan (FIXES_AND_ENHANCEMENTS.md)
- Historical workflow documentation (COMPPORTAL.txt)
- User journey expectations (studio_director_journey.md, competition_director_journey.md)

---

## 📊 The Core Confusion: Reservations vs Routines

### Current Implementation (From Schema + Code)

```typescript
// RESERVATION = Request for allocation
reservations {
  id: string
  studio_id: string
  competition_id: string
  spaces_requested: number  // Should be: routines_requested
  spaces_confirmed: number  // Should be: routines_allocated
  status: 'pending' | 'approved' | 'rejected'
}

// ROUTINE = Actual performance entry
competition_entries {  // Should be renamed: routines
  id: string
  competition_id: string
  studio_id: string
  reservation_id: string  // Links routine to its reservation
  entry_number: number
  title: string
  category: string
  dancers: [] // via entry_participants table
  music: string
  // ... performance details
}
```

### The Workflow (Expected vs Actual)

**EXPECTED WORKFLOW** (From user journeys):
1. Studio Director creates **Reservation** → Requests X routines
2. Competition Director approves **Reservation** → Allocates X slots
3. Studio Director creates X **Routines** → Names, categories, music
4. Studio Director assigns **Dancers** to each **Routine**

**ACTUAL PROBLEMS** (From testing feedback):
1. ❌ Terminology inconsistency: "Entries" vs "Routines" confuses users
2. ❌ "Spaces" terminology → Users expect "Routines"
3. ❌ Relationship unclear: Why create reservation first?
4. ❌ Capacity metrics visible to Studios (shouldn't be)
5. ❌ Studio can see/edit agent information (shouldn't be)
6. ❌ No helper text showing "X of Y routines available"
7. ❌ Approval workflow doesn't auto-generate invoices

---

## 🔴 CRITICAL ISSUES (P0 - Blocking UX)

### Issue 1: Terminology Confusion

**Problem**: Mixed terminology creates cognitive load
- Database: `competition_entries`
- UI: Sometimes "Entries", sometimes "Routines"
- Reservations: "Spaces" vs "Routines"

**Feedback Sources**:
- USER_TESTING_NOTES.md: "Replace all 'entries' → 'routines' throughout app"
- FIXES_AND_ENHANCEMENTS.md: "Entries / Entries | Routine / Routines | Everywhere (UI + schema)"
- USER_TESTING_NOTES.md: "Terminology Consistency" - Replace all entries → routines

**Solution Required**:
```typescript
// UI Changes (NO database changes yet - defer schema rename)
- Navigation: "Entries" → "Routines"
- Dashboard: "My Entries" → "My Routines"
- Forms: "Create Entry" → "Create Routine"
- Lists: "Entries List" → "Routines List"
- Reservations: "Spaces Requested" → "Routines Requested"
- Reservations: "Spaces Confirmed" → "Routines Allocated"

// Files to Update (100+ changes estimated):
- All page titles
- All navigation items
- All form labels
- All button text
- All help text
- Dashboard cards
- Email templates
```

---

### Issue 2: Reservation Flow - Studio View Problems

**Problem**: Studio Directors see Competition Director-only information

**Feedback Sources**:
- USER_TESTING_NOTES.md: "Hide all capacity metrics from Studio view"
- USER_TESTING_NOTES.md: "Remove Agent Information - Studio should never edit"
- USER_TESTING_NOTES.md: "Status Summary Only - After submitting, show status + summary only (no capacity data)"
- FIXES_AND_ENHANCEMENTS.md Section 1.3: "Studio Director: Reservations Shows Capacity & Approve/Reject"

**Current Behavior** (WRONG):
```tsx
// Studio Directors currently see:
- ❌ "Available tokens (capacity)" - shouldn't see this
- ❌ "Approve/Reject Reservation" buttons - CD only
- ❌ Agent information fields - editable by studio
- ❌ Capacity metrics after submission
```

**Required Behavior**:
```tsx
// Studio Directors should see:
✅ Reservation request form (competition, # routines)
✅ Status badge only: PENDING | APPROVED | REJECTED
✅ Summary after submission: "Requested 10 routines for Spring Glow - Status: Pending"
❌ NO capacity metrics (tokens remaining, utilization %)
❌ NO agent information fields (pulled from studio profile automatically)
❌ NO approve/reject buttons
```

**Implementation**:
```typescript
// src/app/dashboard/reservations/*.tsx

// Role-based rendering
{userRole === 'competition_director' && (
  <>
    <div>Capacity: {availableTokens} / {totalTokens}</div>
    <button>Approve</button>
    <button>Reject</button>
  </>
)}

{userRole === 'studio_director' && (
  <div className="status-only">
    <Badge status={reservation.status}>{reservation.status}</Badge>
    <p>Requested: {reservation.routines_requested} routines</p>
    <p>For: {reservation.competition_name}</p>
  </div>
)}
```

---

### Issue 3: No Helper Text for Available Routines

**Problem**: Studios don't know how many routines they can create

**Feedback Sources**:
- USER_TESTING_NOTES.md: "Helper Text - Display helper text above 'Create Routine': 'Routines available: 12 of 20 approved'"
- USER_TESTING_NOTES.md: "Routine Counter - 'Create Routine' should show number of available routines (e.g., '3 of 30 remaining')"

**Current Behavior** (WRONG):
- No indication of routine allocation limits
- Studios create routines blindly until hitting backend validation error
- Error message is cryptic: "Reservation capacity exceeded"

**Required Behavior**:
```tsx
// Above "Create Routine" button
<div className="helper-text">
  📊 Routines available: 12 of 20 approved
</div>

// On Create Routine button
<button>
  Create Routine (3 of 30 remaining)
</button>

// In reservation summary card
<div className="usage-summary">
  <div>Routines Created: 12 / 20</div>
  <ProgressBar value={12} max={20} />
  <div className="remaining">8 routines remaining</div>
</div>
```

**Implementation**:
```typescript
// Calculate from reservation
const reservation = trpc.reservation.getApproved.useQuery({
  competition_id: selectedCompetition
});

const routinesCreated = trpc.entry.countByReservation.useQuery({
  reservation_id: reservation.id
});

const remaining = reservation.routines_allocated - routinesCreated;

// Display everywhere routines can be created
```

---

### Issue 4: Auto-Generate Invoice on Reservation Approval

**Problem**: Invoices not auto-generated when reservations approved

**Feedback Sources**:
- USER_TESTING_NOTES.md: "Auto-generate Invoice - Submitting reservation auto-generates invoice; payment handled manually later"
- studio_director_journey.md Phase 4: "Invoice Generated → Auto-calculated when routines finalized"

**Current Behavior** (INCOMPLETE):
- Reservations approved → No invoice
- Invoice generation logic exists but not triggered
- Studios don't receive invoices until... when?

**Required Behavior**:
```typescript
// When CD approves reservation:
1. Approve reservation (status: pending → approved)
2. AUTO-GENERATE invoice:
   - Line item: "Routine reservations (X routines @ $Y each)"
   - Total: X * $Y
   - Status: UNPAID
   - Email invoice to studio
3. Update dashboard with invoice reference
```

**Implementation**:
```typescript
// src/server/routers/reservation.ts

const approve = adminProcedure
  .input(z.object({ reservation_id: z.string().uuid() }))
  .mutation(async ({ ctx, input }) => {
    // 1. Approve reservation
    const reservation = await ctx.prisma.reservations.update({
      where: { id: input.reservation_id },
      data: {
        status: 'approved',
        spaces_confirmed: spaces_requested,
        approved_by: ctx.userId
      }
    });

    // 2. AUTO-GENERATE INVOICE (NEW)
    await ctx.prisma.invoices.create({
      data: {
        studio_id: reservation.studio_id,
        competition_id: reservation.competition_id,
        reservation_id: reservation.id,
        line_items: [
          {
            description: `Routine reservations (${reservation.spaces_requested} routines)`,
            quantity: reservation.spaces_requested,
            unit_price: competition.per_routine_fee,
            total: reservation.spaces_requested * competition.per_routine_fee
          }
        ],
        subtotal: reservation.spaces_requested * competition.per_routine_fee,
        total: reservation.spaces_requested * competition.per_routine_fee,
        status: 'UNPAID'
      }
    });

    // 3. SEND EMAIL (already exists)
    await sendReservationApprovedEmail({ reservation });

    return reservation;
  });
```

---

### Issue 5: White-on-White Dropdowns (Global Issue) ✅ FIXED

**Status**: ✅ COMPLETE (Commit 4525136 - Jan 5, 2025)

**Problem**: All `<select>` dropdowns render white text on white background

**Feedback Sources**:
- USER_TESTING_NOTES.md: "Fix white-on-white dropdowns in Create Routine modal"
- USER_TESTING_NOTES.md: "Fix Dropdown Contrast - Resolve remaining white-on-white dropdowns"
- FIXES_AND_ENHANCEMENTS.md Section 1.1: "Dropdown Menus Render White on White"

**Solution Implemented**:
- Audited all 5 files containing `<select>` elements
- Added `className="text-gray-900"` to all `<option>` elements
- Consistent pattern applied:
  - `<select>`: `text-white` (visible on dark glassmorphic background)
  - `<option>`: `text-gray-900` (visible on light background when dropdown opens)

**Files Fixed**:
1. ✅ src/components/EntriesList.tsx (line 119-123)
2. ✅ src/components/SchedulingManager.tsx (line 193-197)
3. ✅ src/components/AllInvoicesList.tsx (lines 134-158, two dropdowns)
4. ✅ src/components/ReservationsList.tsx (already correct)
5. ✅ src/components/InvoicesList.tsx (already correct)

**Deployment**:
- Build: ✅ All 31 routes compile
- Deployed: https://comp-portal-one.vercel.app
- Status: READY (dpl_96Bwv686a3aVXwX6Cv7MVn7rufai)

---

### Issue 6: Lock Studio Selection (Non-Editable)
**Status**: COMPLETE (commit 9ff4a23, deployment dpl_2noWaWft6dBh638fn674KBFyqLt8)

**Problem**: Studio fields are editable when they shouldn't be

**Feedback Sources**:
- USER_TESTING_NOTES.md: "Lock Studio Selection - Studio field should be hard-coded to current studio (non-editable)"
- USER_TESTING_NOTES.md: "Hard-coded Studio - Once studio settings locked, all studio references should be non-editable"
- FIXES_AND_ENHANCEMENTS.md Section 1.2: "Studio Director: Invoices Page Prompts Studio Selection"
- FIXES_AND_ENHANCEMENTS.md Section 1.4: "Studio Settings Shows Multiple Studios"

**Current Behavior** (WRONG):
```tsx
// Studio Directors see dropdowns to select studio
<select name="studio_id">
  {/* Shows ALL studios - security risk */}
  {studios.map(studio => <option value={studio.id}>{studio.name}</option>)}
</select>
```

**Required Behavior**:
```tsx
// Studio Directors: NO studio selector, auto-scoped
{userRole === 'studio_director' && (
  <div className="studio-locked">
    <label>Studio (locked)</label>
    <div className="locked-value">{currentStudio.name}</div>
    {/* Hidden input for form submission */}
    <input type="hidden" name="studio_id" value={currentStudio.id} />
  </div>
)}

// Competition Directors: CAN see studio selector (admin view)
{userRole === 'competition_director' && (
  <select name="studio_id">
    <option value="">All Studios</option>
    {studios.map(studio => <option value={studio.id}>{studio.name}</option>)}
  </select>
)}
```

**Pages Requiring Fix**:
- `/dashboard/invoices` - Remove studio selector for SD
- `/dashboard/settings` or `/dashboard/studios` - Single-tenant view for SD
- `/dashboard/reservations` - Hard-lock to own studio
- `/dashboard/dancers` - Verify already scoped
- `/dashboard/routines` - Verify already scoped
- **Create Routine modal** - Remove studio field entirely

---

## 🟡 HIGH PRIORITY ISSUES (P1 - UX Improvements)

### Issue 7: Replace Music Section with Props Field

**Problem**: Music section in Create Routine modal should be Props field

**Feedback Sources**:
- USER_TESTING_NOTES.md: "Replace Music Section - Replace with 'Props' field (simple yes/no or description)"

**Current Behavior**:
- Create Routine wizard has Music section (Step 4?)
- Confusing: Music uploaded separately after routine creation

**Required Behavior**:
```tsx
// Step in Create Routine wizard
<div className="props-section">
  <label>Props Used</label>
  <select name="props_used">
    <option value="no">No props</option>
    <option value="yes">Yes - props used</option>
  </select>

  {propsUsed === 'yes' && (
    <textarea
      name="props_description"
      placeholder="Describe props (e.g., chairs, ribbons, hats)"
      rows={3}
    />
  )}
</div>
```

**Database Schema** (if needed):
```sql
ALTER TABLE competition_entries
ADD COLUMN props_used BOOLEAN DEFAULT false,
ADD COLUMN props_description TEXT;
```

---

### Issue 8: Remove Drag Reordering Inside Create Routine Modal

**Problem**: Participant reordering confusing in modal

**Feedback Sources**:
- USER_TESTING_NOTES.md: "Remove Drag Reordering - Remove participant reordering inside Create Routine modal"

**Current Behavior** (if exists):
- Drag-and-drop to reorder dancers within Create Routine modal
- Confusing: Order not relevant at creation time

**Required Behavior**:
```tsx
// Simple list of selected dancers (no reordering)
<div className="selected-dancers">
  <h4>Dancers in this Routine ({selectedDancers.length})</h4>
  {selectedDancers.map(dancer => (
    <div key={dancer.id} className="dancer-chip">
      {dancer.first_name} {dancer.last_name}
      <button onClick={() => removeDancer(dancer.id)}>×</button>
    </div>
  ))}
</div>

// Add dancers with simple click selection
<div className="available-dancers">
  <h4>Available Dancers</h4>
  {availableDancers.map(dancer => (
    <div
      key={dancer.id}
      className="dancer-option"
      onClick={() => addDancer(dancer)}
    >
      {dancer.first_name} {dancer.last_name}
    </div>
  ))}
</div>
```

**Implementation**:
- Remove drag-and-drop library usage in Create Routine modal
- Reserve drag-and-drop for separate Dancer Assignment interface
- Keep Create Routine simple: select dancers, no ordering

---

### Issue 9: Merge "Add Dancer" and "Batch Add" into Unified Action

**Problem**: Two separate dancer creation flows is confusing

**Feedback Sources**:
- USER_TESTING_NOTES.md: "Unified Add Flow - Merge 'Add Dancer' and 'Batch Add' into one action; allow single-row adds in same table view"
- FIXES_AND_ENHANCEMENTS.md Section 4.1: "Multi-Row Dancer Batch Input Form"

**Current Behavior**:
- Two separate buttons: "Add Dancer" (single form) + "Batch Add" (spreadsheet)
- Context switching between interfaces

**Required Behavior**:
```tsx
// Single "Add Dancers" page with table interface
<div className="dancer-input-table">
  <h2>Add Dancers</h2>

  {/* Spreadsheet-style table */}
  <table>
    <thead>
      <tr>
        <th>First Name</th>
        <th>Last Name</th>
        <th>Birth Date</th>
        <th>Level</th>
        <th>Actions</th>
      </tr>
    </thead>
    <tbody>
      {rows.map((row, index) => (
        <tr key={index}>
          <td><input name="first_name" /></td>
          <td><input name="last_name" /></td>
          <td><input type="date" name="birth_date" /></td>
          <td><select name="level">...</select></td>
          <td><button onClick={() => removeRow(index)}>×</button></td>
        </tr>
      ))}
    </tbody>
  </table>

  {/* Action buttons */}
  <div className="actions">
    <button onClick={() => addRows(1)}>+ Add 1 Row</button>
    <button onClick={() => addRows(5)}>+ Add 5 Rows</button>
    <button onClick={() => addRows(10)}>+ Add 10 Rows</button>
    <button onClick={saveAll} className="primary">Save All Dancers</button>
  </div>
</div>
```

**Implementation**:
- Replace `/dashboard/dancers/new` (single form) + `/dashboard/dancers/batch-add` (table)
- With unified `/dashboard/dancers/add` (table interface, supports 1 or many)
- Update navigation to single "Add Dancers" button

---

### Issue 10: Drag-and-Drop Dancer→Routine Assignment

**Problem**: No visual interface for assigning dancers to routines

**Feedback Sources**:
- USER_TESTING_NOTES.md: "Drag-and-Drop Linking - Implement drag-and-drop: routines listed on left, dancers on right; drag dancer → routine"
- FIXES_AND_ENHANCEMENTS.md Section 4.2: "Drag-and-Drop Routine Assignment UI"

**Current Behavior**:
- Click-to-assign interface exists (`/dashboard/entries/assign`)
- Works, but not as intuitive as drag-drop

**Required Behavior** (Enhancement):
```tsx
// Two-panel layout
<div className="assignment-interface">
  {/* Left: Routines */}
  <div className="routines-panel">
    <h3>My Routines</h3>
    {routines.map(routine => (
      <div
        key={routine.id}
        className="routine-dropzone"
        onDrop={(e) => handleDrop(e, routine.id)}
      >
        <h4>{routine.title}</h4>
        <div className="dancers-count">
          {routine.dancers.length} dancers assigned
        </div>

        {/* Show assigned dancers */}
        <div className="assigned-dancers">
          {routine.dancers.map(dancer => (
            <div key={dancer.id} className="dancer-chip" draggable>
              {dancer.first_name}
            </div>
          ))}
        </div>
      </div>
    ))}
  </div>

  {/* Right: Dancers */}
  <div className="dancers-panel">
    <h3>Available Dancers</h3>
    <input placeholder="Search dancers..." />

    {dancers.map(dancer => (
      <div
        key={dancer.id}
        className="dancer-draggable"
        draggable
        onDragStart={(e) => handleDragStart(e, dancer)}
      >
        👤 {dancer.first_name} {dancer.last_name}
      </div>
    ))}
  </div>
</div>
```

**Implementation**:
- Use `@dnd-kit` library (already installed)
- Enhance existing `/dashboard/entries/assign` page
- Support both click AND drag-and-drop
- Visual feedback for drop zones

---

## 🟢 MEDIUM PRIORITY (P2 - Nice to Have)

### Issue 11: Dashboard Label "My Routines"

**Feedback**: USER_TESTING_NOTES.md - "Dashboard Label - Change to 'My Routines' (not 'My Entries')"

**Fix**:
```tsx
// src/components/StudioDirectorDashboard.tsx
- <h3>My Entries</h3>
+ <h3>My Routines</h3>
```

---

### Issue 12: Keep Quick Start Flow

**Feedback**: USER_TESTING_NOTES.md - "Quick Start Flow - Keep existing quick start flow for routine creation"

**Validation**: Ensure multi-step wizard still exists, don't remove it for table-based creation

---

### Issue 13: Table Views Acceptable

**Feedback**: USER_TESTING_NOTES.md - "Table Views Acceptable - Current table views for dancers are good"

**Action**: No change needed, validate current table views are working

---

## 🏆 COMPETITION DIRECTOR ISSUES

### Issue 14: Emphasize Reservations on Dashboard

**Problem**: Dashboard prioritizes dancers over reservations

**Feedback Sources**:
- USER_TESTING_NOTES.md: "Reservations Emphasis - Primary dashboard should emphasize Reservations at top (not dancers)"

**Current Behavior**:
- Dashboard shows: Studios, Dancers, Entries stats first
- Reservations buried lower in navigation

**Required Behavior**:
```tsx
// Top row stats: Reservations first
<div className="stats-grid">
  <StatCard
    title="Pending Reservations"
    value={pendingReservations}
    priority="high"
  />
  <StatCard title="Total Studios" value={totalStudios} />
  <StatCard title="Total Routines" value={totalRoutines} />
  <StatCard title="Events" value={upcomingEvents} />
</div>
```

---

### Issue 15: 4×4 Card Grid Layout for Competitions

**Problem**: Competitions list needs better visual layout

**Feedback Sources**:
- USER_TESTING_NOTES.md: "Card Grid Layout - Show all competitions side by side in 4×4 card format"

**Required Behavior**:
```tsx
<div className="competitions-grid grid grid-cols-4 gap-4">
  {competitions.map(comp => (
    <div key={comp.id} className="competition-card">
      <h3>{comp.name}</h3>
      <div className="capacity-summary">
        <div>Total Capacity: {comp.total_tokens}</div>
        <div>Reserved: {comp.reserved_count}</div>
        <div>Remaining: {comp.remaining_slots}</div>
      </div>

      <div className="pending-reservations">
        <h4>Pending ({comp.pending_count})</h4>
        {/* List of pending studios */}
      </div>

      <div className="confirmed-studios">
        <h4>Confirmed ({comp.confirmed_count})</h4>
        {/* List of confirmed studios */}
      </div>

      <div className="actions">
        <button>View Details</button>
      </div>
    </div>
  ))}
</div>
```

---

### Issue 16: Approve/Reject/Cancel from Cards

**Feedback**: USER_TESTING_NOTES.md - "Approval Actions - Ability to approve/reject/cancel reservations from cards"

**Implementation**: Add quick action buttons to reservation cards in CD dashboard

---

### Issue 17: Auto-Adjust Capacity on Confirmation/Release

**Problem**: Capacity not automatically updated when reservations confirmed/cancelled

**Feedback Sources**:
- USER_TESTING_NOTES.md: "Auto-adjust Capacity - Capacity auto-adjusts when reservation confirmed or released"

**Current Behavior**: Manual capacity tracking

**Required Behavior**:
```typescript
// When reservation approved:
competition.available_tokens -= reservation.spaces_confirmed

// When reservation rejected/cancelled:
competition.available_tokens += reservation.spaces_confirmed

// Implement with database triggers or mutation logic
```

---

### Issue 18: Manual Reservation Creation (Admin Only)

**Feedback**: USER_TESTING_NOTES.md - "Manual Reservation Creation - Add admin-only manual reservation creation to fill slots"

**Use Case**: CD fills unused slots manually without studio request

**Implementation**:
```tsx
// Admin-only button
{userRole === 'competition_director' && (
  <button onClick={openManualReservationModal}>
    + Manual Reservation
  </button>
)}

// Modal with studio selection + allocation
<ManualReservationModal>
  <select name="studio_id">{/* All studios */}</select>
  <input type="number" name="routines_allocated" />
  <button>Allocate Slots</button>
</ManualReservationModal>
```

---

### Issue 19: Remove "Create Reservation" Button (CD View)

**Feedback**: USER_TESTING_NOTES.md - "Remove Create Button - Remove 'Create Reservation' button from top-right (directors don't create, only approve)"

**Fix**: Only show "+ Create Reservation" for Studio Directors, hide for CD

---

### Issue 20: Enable Column Sorting

**Feedback**: USER_TESTING_NOTES.md - "Column Sorting - Enable column sorting (click header to sort alphabetically/numerically/by group)"

**Implementation**: Add sortable columns to all table views (studios, routines, reservations)

---

### Issue 21: Real Seeded Data for Testing

**Feedback**: USER_TESTING_NOTES.md - "Real Seeded Data - Test with real seeded data (GlowDance Orlando, etc.) to validate reservation logic"

**Action**: Create comprehensive seed data matching real GlowDance events

---

## 📋 Implementation Priority Order

### Phase 1: CRITICAL UX Fixes (1-2 days)
**Priority**: These break core workflow understanding

1. ✅ **Terminology: UI-only changes** (defer schema rename)
   - Replace all "Entries" → "Routines" in UI
   - Replace "Spaces" → "Routines" in Reservations
   - Update navigation, dashboard, forms, lists

2. ✅ **White-on-white dropdowns** (global fix)
   - Add text color classes to all `<select>` elements
   - Test across all pages

3. ✅ **Lock Studio Selection**
   - Remove studio dropdowns for Studio Directors
   - Hard-code to `currentStudio` from session
   - Applies to: invoices, settings, reservations, routines

4. ✅ **Hide Capacity from Studios**
   - Role-based rendering in reservations
   - Show only status badge for SD
   - Hide tokens, approve/reject buttons

5. ✅ **Remove Agent Information Editing**
   - Pull from studio profile automatically
   - No editable fields in reservation form

### Phase 2: Helper Text & Guidance (1 day)

6. ✅ **Routine Counter Helper Text**
   - Display "X of Y routines available" above Create button
   - Add progress bar to reservation summary card
   - Real-time calculation from reservation

7. ✅ **Auto-Generate Invoice**
   - Trigger invoice creation on reservation approval
   - Email invoice to studio
   - Link from dashboard

### Phase 3: Routine Creation Improvements (2 days)

8. ✅ **Replace Music → Props Field**
   - Add props section to Create Routine wizard
   - Database schema update (if needed)

9. ✅ **Remove Drag Reordering in Modal**
   - Simplify dancer selection to click-based
   - Reserve drag-drop for separate assignment page

10. ✅ **Dashboard Label**
    - "My Entries" → "My Routines"

### Phase 4: Dancer Management (2 days)

11. ✅ **Unified Dancer Add Flow**
    - Merge single + batch into table interface
    - Support 1 or many rows

12. ✅ **Drag-and-Drop Assignment Enhancement**
    - Add drag-drop to existing assignment page
    - Visual feedback for drop zones

### Phase 5: Competition Director Enhancements (2-3 days)

13. ✅ **Dashboard Reservations Emphasis**
    - Move reservations to top of stats
    - Add pending reservations alert

14. ✅ **4×4 Card Grid for Competitions**
    - Redesign competitions list
    - Show capacity, pending, confirmed per card

15. ✅ **Approve/Reject from Cards**
    - Quick action buttons on cards

16. ✅ **Auto-Adjust Capacity**
    - Implement automatic token tracking

17. ✅ **Manual Reservation Creation**
    - Admin-only modal

18. ✅ **Remove CD "Create Reservation" Button**
    - Hide button for CD role

19. ✅ **Column Sorting**
    - Add to all table views

20. ✅ **Real Seeded Data**
    - GlowDance Orlando seed script

---

## 🚨 SCHEMA CHANGES (Deferred - HIGH RISK)

**DO NOT implement yet** - Plan separately

### Database Renaming (Future Session)

```sql
-- DEFER THESE CHANGES
-- High risk: affects entire application

ALTER TABLE competitions RENAME TO events;
ALTER TABLE competition_entries RENAME TO routines;
ALTER TABLE reservations
  RENAME COLUMN spaces_requested TO routines_requested,
  RENAME COLUMN spaces_confirmed TO routines_allocated;
```

**Why Defer**:
- 100+ file changes required
- High risk of breaking production
- Needs comprehensive testing
- UI terminology fix can happen first

**Migration Strategy** (when ready):
1. Backup production database
2. Create staging environment
3. Run migration on staging
4. Test all features
5. Update Prisma schema
6. Regenerate types
7. Update all application code
8. Deploy with monitoring
9. Rollback plan ready

---

## 📊 Summary

**Total Issues Identified**: 21
- **P0 - Critical**: 6 (terminology, dropdowns, studio lock, capacity hide, agent info, invoice)
- **P1 - High**: 8 (helper text, props field, unified add, drag-drop, reordering)
- **P2 - Medium**: 3 (labels, validation)
- **CD Issues**: 8 (dashboard, grid layout, actions, sorting, seeding)

**Estimated Implementation**:
- Phase 1 (Critical): 1-2 days
- Phase 2 (Helper Text): 1 day
- Phase 3 (Routine UX): 2 days
- Phase 4 (Dancer Management): 2 days
- Phase 5 (CD Enhancements): 2-3 days

**Total**: 8-10 development days

**Schema Rename**: Separate 2-3 day effort with careful planning

---

## ✅ Ready for Implementation

This consolidated document captures:
- ✅ All feedback from USER_TESTING_NOTES.md
- ✅ All feedback from FIXES_AND_ENHANCEMENTS.md
- ✅ Workflow expectations from user journey docs
- ✅ Historical notes from COMPPORTAL.txt
- ✅ Technical implementation details
- ✅ Priority ordering with time estimates
- ✅ Risk assessment for schema changes

**Next Step**: User approval → Begin Phase 1 implementation

---

**Document Status**: ✅ COMPREHENSIVE - Ready for execution
