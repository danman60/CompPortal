# EMPWR CompPortal - Fixes & Enhancements Implementation Plan

**Date**: October 4, 2025
**Source**: User test experience report + clarification session
**Status**: Ready for implementation

---

## Executive Summary

User testing revealed critical terminology issues, role-based scoping problems, and UX friction points. This document outlines a comprehensive fix plan organized by priority and technical scope.

**Core Changes**:
- Terminology standardization: Competition → Event, Entries → Routines
- Role-based scoping fixes (Studio vs Competition Director views)
- New features: Drag-drop routine assignment, multi-row dancer input, view toggles
- Critical bug fixes: Dropdown styling, real-time sync, hard-locking studio context

---

## 1. CRITICAL BUGS (P0 - Block User Experience)

### 1.1 Dropdown Menus Render White on White
**Affected Pages**: Reservations, Judge Management, Analytics, Scheduling (both Studio + Competition Director)

**Technical Understanding**:
- All `<select>` elements have white text on white background until hover
- Likely Tailwind CSS class conflict or missing text color declaration
- Global fix needed across all dropdown components

**Implementation**:
- Audit all `<select>` elements for consistent styling
- Apply proper text color classes (e.g., `text-gray-900` or `text-white` depending on background)
- Test across all pages to ensure visibility

**Files to Check**:
- `src/app/dashboard/reservations/*.tsx`
- `src/app/dashboard/judges/page.tsx`
- `src/app/dashboard/analytics/page.tsx`
- `src/app/dashboard/scheduling/page.tsx`
- Any shared components with dropdowns

---

### 1.2 Studio Director: Invoices Page Prompts Studio Selection
**Current Behavior**: Shows dropdown to select studio (should not exist)

**Technical Understanding**:
- Studio directors should ONLY see their own studio's invoices
- Need to hard-lock based on `user.studio_id` from session
- Filter invoices query by authenticated user's studio

**Implementation**:
- Modify `/dashboard/invoices/page.tsx` to check user role
- If `studio_director`, auto-filter by `user.studio_id` without dropdown
- Remove studio selector UI for studio directors
- Keep selector only for competition directors (global view)

**Database Query Change**:
```typescript
// Before: shows all studios
const studios = await prisma.studios.findMany();

// After: role-based
if (userRole === 'studio_director') {
  const invoices = await prisma.invoices.findMany({
    where: { studio_id: user.studio_id }
  });
}
```

---

### 1.3 Studio Director: Reservations Shows Capacity & Approve/Reject
**Current Behavior**: Studio directors see competition director-only fields/actions

**Technical Understanding**:
- "Available tokens (capacity)" should be hidden from studio directors
- "Approve/Reject Reservation" buttons should not appear
- Studio directors should only see: request form + status (pending/approved/rejected)

**Implementation**:
- Add role-based conditional rendering in `/dashboard/reservations/*.tsx`
- Hide capacity/token fields for `studio_director` role
- Remove approve/reject actions for `studio_director` role
- Show read-only status badge instead

**UI Changes**:
```tsx
{userRole === 'competition_director' && (
  <div>Capacity: {availableTokens}</div>
  <button>Approve</button>
  <button>Reject</button>
)}

{userRole === 'studio_director' && (
  <div>Status: <Badge>{status}</Badge></div>
)}
```

---

### 1.4 Studio Settings Shows Multiple Studios
**Current Behavior**: Shows list of all studios (multi-tenant view)

**Technical Understanding**:
- Studio directors should only see/edit their own studio
- Should be single-tenant view with direct settings form
- No studio selector, no list view

**Implementation**:
- Modify `/dashboard/studios` or create `/dashboard/settings` for studio directors
- Query only `user.studio_id` studio
- Display as single settings form, not a list
- Keep list view only for competition directors

---

### 1.5 Competition Director: Reservations Don't Sync Immediately
**Current Behavior**: Newly created reservations don't appear in competition director's pending list

**Technical Understanding**:
- tRPC cache invalidation issue or query filter mismatch
- Need to trigger refetch after reservation creation
- Possible status filter excluding "pending" reservations

**Implementation**:
- Add `onSuccess` callback to reservation creation mutation
- Invalidate `reservation.getAll` query cache
- Verify query filter includes `status: 'pending'`
- Test real-time sync across both roles

**Code Fix**:
```typescript
const createReservation = trpc.reservation.create.useMutation({
  onSuccess: () => {
    trpcUtils.reservation.getAll.invalidate();
  }
});
```

---

## 2. TERMINOLOGY & SCHEMA CHANGES (P1 - Foundational)

### 2.1 Global Terminology Standardization

**Changes Required**:
| Old Term | New Term | Scope |
|----------|----------|-------|
| Competition | Event | Everywhere (UI + schema) |
| Entry / Entries | Routine / Routines | Everywhere (UI + schema) |
| Spaces Requested | Routines Requested | Reservation form only |
| Competition Weekend | Event | UI only |

**Technical Understanding**:
- Database tables must be renamed for consistency
- All UI labels, navigation, page titles updated
- API endpoints and tRPC router names updated
- Migration required for schema changes

**Database Schema Changes**:
```sql
-- Rename tables
ALTER TABLE competitions RENAME TO events;
ALTER TABLE competition_entries RENAME TO routines;
ALTER TABLE competition_sessions RENAME TO event_sessions;
ALTER TABLE competition_locations RENAME TO event_locations;

-- Update foreign key column names
ALTER TABLE routines RENAME COLUMN competition_id TO event_id;
ALTER TABLE reservations RENAME COLUMN competition_id TO event_id;
-- ... (all competition_id references)
```

**Prisma Schema Updates**:
- Rename models: `competitions` → `events`, `competition_entries` → `routines`
- Update all relations and foreign keys
- Run `npx prisma db pull` to sync schema
- Generate new Prisma client

**UI Updates** (100+ file changes):
- Update all page titles, headers, labels
- Navigation: "Entries" → "Routines"
- Breadcrumbs, tooltips, help text
- Search for "competition" and "entry/entries" across codebase

**Impact**: HIGH - Touches entire application, requires careful migration

---

### 2.2 Reservation → Routine Workflow Clarification

**Conceptual Flow**:
1. Studio Director creates **Reservation** (request for X routines)
2. Competition Director approves **Reservation** (allocates X tokens)
3. Studio Director creates X **Routines** (names, categories, music)
4. Studio Director assigns **Dancers** to each **Routine**

**Technical Understanding**:
- Reservations do NOT become routines in the database
- Reservations track allocation (approved tokens = max routines allowed)
- Routines are created separately, validated against reservation allocation
- `routines.reservation_id` links routine to its reservation

**Current Schema** (correct, just needs terminology fix):
```typescript
reservations {
  id: string
  studio_id: string
  event_id: string  // formerly competition_id
  spaces_requested: number  // rename to routines_requested
  spaces_confirmed: number  // rename to routines_allocated
  status: 'pending' | 'approved' | 'rejected'
}

routines {  // formerly competition_entries
  id: string
  event_id: string
  studio_id: string
  reservation_id: string
  entry_number: number
  title: string
  // ... routine details
}
```

**Validation Logic** (already exists, verify):
- Studio cannot create more routines than `routines_allocated`
- When creating routine, check: `COUNT(routines WHERE reservation_id) < reservations.routines_allocated`

---

## 3. ROLE-BASED SCOPING FIXES (P1 - Security & UX)

### 3.1 Studio Director Portal Scoping Summary

**Pages Requiring Hard-Lock to `user.studio_id`**:
- `/dashboard/invoices` - Remove studio selector, show only own invoices
- `/dashboard/settings` or `/dashboard/studios` - Show only own studio settings
- `/dashboard/reservations` - Filter to own studio, hide capacity/approve fields
- `/dashboard/dancers` - Already scoped correctly (verify)
- `/dashboard/routines` - Filter to own studio routines (verify)

**Implementation Pattern**:
```typescript
// Get user's studio from session
const session = await getServerSession();
const userStudioId = session.user.studio_id;

// All queries must filter by studio
const data = await prisma.routines.findMany({
  where: { studio_id: userStudioId }
});
```

---

### 3.2 Competition Director Portal Enhancements

**Global Views Needed**:
- Invoices: All studios, all events, payment status
- Reservations: All studios, filterable by event/status
- Routines: All routines across all studios
- Analytics: Event-level aggregations

**New Features**:
- Manual payment confirmation toggle (per invoice)
- Reservation release/cancel with routine impact warnings
- Event capacity dashboard (reservations vs available tokens)

---

## 4. NEW FEATURES (P2 - UX Improvements)

### 4.1 Multi-Row Dancer Input Form

**Requirements**:
- Spreadsheet-style grid with 10+ rows visible
- Add/remove rows dynamically
- Save all rows at once (batch create)
- Fields: First Name, Last Name, DOB, Level (per current schema)
- Validation before batch save

**Technical Approach**:
- Use React Hook Form with `useFieldArray`
- Table layout with inline editing
- Client-side validation, single mutation for batch create
- Keep CSV import as alternate option

**UI Mockup**:
```
┌────────────┬────────────┬────────────┬────────┬────────┐
│ First Name │ Last Name  │ Birth Date │ Level  │ Action │
├────────────┼────────────┼────────────┼────────┼────────┤
│ [input]    │ [input]    │ [date]     │ [sel]  │ [X]    │
│ [input]    │ [input]    │ [date]     │ [sel]  │ [X]    │
│ ...        │ ...        │ ...        │ ...    │ ...    │
└────────────┴────────────┴────────────┴────────┴────────┘
[+ Add Row]                              [Save All Dancers]
```

**Files to Create/Modify**:
- `/dashboard/dancers/batch-add/page.tsx` (new)
- Add tRPC mutation: `dancer.createBatch`
- Update navigation to include "Batch Add" option

---

### 4.2 Drag-and-Drop Routine Assignment UI

**Requirements**:
- Show all routines (left panel) + all dancers (right panel)
- Drag dancers into routines
- Visual feedback (drop zones, assigned count)
- Save assignments in real-time or batch

**Technical Approach**:
- Use `@dnd-kit` library (already may be installed, or use `react-beautiful-dnd`)
- Store in `entry_participants` table (links `dancer_id` to `routine_id`)
- Real-time updates via tRPC mutations

**UI Concept**:
```
┌─────────────────────┬─────────────────────┐
│   My Routines       │   My Dancers        │
├─────────────────────┼─────────────────────┤
│ 🎭 Ballet Solo      │ 👤 Sarah Johnson    │
│   [2 dancers]       │ 👤 Emily Chen       │
│                     │ 👤 Maya Patel       │
│ 🎭 Jazz Duet        │ 👤 ...              │
│   [0 dancers]       │                     │
│                     │                     │
│ 🎭 Tap Trio         │ [Search dancers]    │
│   [3 dancers]       │                     │
└─────────────────────┴─────────────────────┘
```

**Files to Create/Modify**:
- `/dashboard/routines/assign/page.tsx` (new)
- tRPC mutations: `routine.assignDancer`, `routine.unassignDancer`
- Add to navigation: "Assign Dancers" button in Routines page

---

### 4.3 Table/Card View Toggle (Persistent)

**Affected Pages**:
- Reservations
- Routines (formerly Entries)
- Invoices
- Analytics lists

**Technical Approach**:
- Add `user_preferences` table or use existing user settings
- Store per-page view preference: `{ page: 'routines', view: 'table' }`
- Toggle button in page header
- Load preference on page mount

**Database Addition** (if no preferences table exists):
```typescript
user_preferences {
  id: string
  user_id: string
  preferences: Json  // { routines_view: 'table', invoices_view: 'card', ... }
}
```

**UI Component**:
```tsx
<div className="flex gap-2">
  <button onClick={() => setView('card')}>
    Card View
  </button>
  <button onClick={() => setView('table')}>
    Table View
  </button>
</div>

{view === 'card' ? <CardGrid /> : <DataTable />}
```

---

### 4.4 Global Invoices View (Competition Director)

**Requirements**:
- Show all invoices across all studios
- Group/filter by Event
- Display payment status at a glance
- Manual "Mark as Paid" toggle

**Technical Approach**:
- Create `/dashboard/invoices/all/page.tsx` (competition director only)
- Query all invoices with studio and event relations
- Table view with columns: Studio, Event, Amount, Status, Actions
- Add `payment_status` field to invoices table if missing

**Schema Update**:
```typescript
invoices {
  // existing fields
  payment_status: 'unpaid' | 'invoiced' | 'paid'  // new field
  payment_confirmed_by: string?  // user_id who marked as paid
  payment_confirmed_at: DateTime?
}
```

**Table Columns**:
| Studio | Event | Amount | Status | Issued | Paid | Actions |
|--------|-------|--------|--------|--------|------|---------|
| Studio A | Spring Glow | $1,250 | Paid | 3/1 | 3/5 | [View] |
| Studio B | Spring Glow | $800 | Invoiced | 3/1 | - | [Mark Paid] |

---

### 4.5 Reservation Release/Cancel with Routine Impact Warnings

**Scenario**: Competition director needs to reduce or cancel an approved reservation

**Requirements**:
- If routines already exist linked to reservation:
  - WARN: "This reservation has X routines. Reducing allocation will require studio to cancel Y routines."
  - Send email to studio director + competition director
  - Force studio director to choose which routines to cancel on next login
- If no routines exist: allow silent reduction/cancellation

**Technical Approach**:
- Add `allocation_reduced` flag to reservation
- Check `COUNT(routines WHERE reservation_id = X)` before allowing reduction
- Create notification system (email + in-app banner)
- Add "Choose Routines to Cancel" modal for studio director

**Files to Create/Modify**:
- `/dashboard/reservations/[id]/reduce` (competition director action)
- Email template: `reservation_reduced_warning.html`
- In-app notification component with dismissal logic
- tRPC mutation: `reservation.reduceAllocation`

---

## 5. UI/UX IMPROVEMENTS (P2 - Polish)

### 5.1 Navigation Restructure (Studio Director)

**Current**: Default Next.js app structure
**New Structure**:

**Top Priority Actions**:
- 🧑‍🎤 Dancers
- 🎭 My Routines
- 📋 Reservations

**Secondary Actions** (bottom or collapsed):
- ⚙️ Settings
- 📄 Invoices
- 🏆 Results

**Implementation**:
- Update sidebar navigation component
- Reorder menu items
- Update icons to match new structure

---

### 5.2 Reservation Form Improvements

**Changes**:
1. Remove "Agent Information" step entirely (studio is pre-locked)
2. Change "Spaces Requested" → "Routines Requested"
3. Update form validation messages

**Files to Modify**:
- `/dashboard/reservations/new/page.tsx`
- `/server/routers/reservation.ts` (remove agent validation if exists)

---

### 5.3 Getting Started Section Rewrite

**Current Text**: Generic onboarding
**New Text**:

```markdown
## Getting Started with CompPortal

1. **Reserve your routines** – Go to Reservations and request the number of routines you plan to enter.
2. **Turn approved reservations into routines** – Once approved, go to My Routines and create your dance entries.
3. **Upload music for each routine** – Add your performance tracks to each routine.
4. **Add your dancers** – Register all dancers who will perform (CSV or batch add).
5. **Assign dancers to routines** – Use the assignment tool to link dancers to their performances.
```

**Files to Modify**:
- `/dashboard/page.tsx` (or wherever Getting Started appears)
- Consider making this dynamic based on user progress

---

### 5.4 Competition Director Dashboard Updates

**Current Focus**: Dancer stats
**New Focus**: Event capacity and reservation management

**New Metrics**:
- Upcoming events (next 30 days)
- Reservations pending approval (count + alert)
- Capacity utilization per event (X / Y tokens used)
- Payment status summary (X invoices unpaid)

**Implementation**:
- Update analytics queries in `/dashboard/page.tsx` (competition director view)
- Replace dancer-centric cards with event-centric cards
- Add quick-action buttons: "Review Reservations", "View Invoices"

---

### 5.5 Visual/Text Spacing Fixes

**Issues Reported**:
- Reservation request count text too small / oddly spaced
- Approval dialogs require extra click (should be one-click)

**Fixes**:
- Increase font size for reservation counts: `text-sm` → `text-base`
- Remove confirmation dialogs for approve/reject (use optimistic updates with undo option)
- Audit spacing/padding across reservation cards

---

## 6. EMAIL SYSTEM (P3 - Backend Missing)

**Current State**: Email templates exist in UI, but backend system not connected

**Requirements**:
- Send emails for: Reservation approved/rejected, allocation reduced, invoice issued
- Use existing email templates in database
- Integration with email service (SendGrid, Resend, etc.)

**Implementation Plan** (Out of scope for this fix session):
- Configure email service provider
- Create email sending utility in `/lib/email.ts`
- Hook into tRPC mutations (reservation approval, invoice creation)
- Add email queue for reliability

---

## 7. IMPLEMENTATION PRIORITY ORDER

### Phase 1: Critical Bugs (1-2 hours)
1. Fix dropdown white-on-white styling (global)
2. Hard-lock studio director invoices to own studio
3. Hide capacity/approve fields from studio director reservations
4. Fix studio settings to single-tenant view
5. Fix reservation sync issue (cache invalidation)

### Phase 2: Terminology Changes (2-3 hours)
1. Update all UI labels (Competition → Event, Entries → Routines)
2. Update navigation structure
3. Update Getting Started text
4. Update reservation form wording
5. **DEFER database schema rename** (high risk, plan separately)

### Phase 3: Role Scoping (1-2 hours)
1. Audit all pages for role-based rendering
2. Add global invoices view for competition directors
3. Update dashboard metrics for competition directors

### Phase 4: New Features (4-6 hours)
1. Multi-row dancer batch add form
2. Table/card view toggle with persistence
3. Manual payment confirmation toggle
4. Reservation reduction with warnings
5. Drag-and-drop routine assignment UI

---

## 8. DATABASE SCHEMA MIGRATION PLAN (Separate Task)

**High-Risk Changes** (require careful planning):
- Renaming `competitions` → `events`
- Renaming `competition_entries` → `routines`
- Updating all foreign key columns (`competition_id` → `event_id`)

**Migration Strategy**:
1. Create comprehensive backup of production database
2. Write migration script with rollback capability
3. Test migration on staging environment
4. Schedule maintenance window (minimal downtime)
5. Run migration with monitoring
6. Update Prisma schema and regenerate client
7. Deploy updated application code

**Timeline**: Plan for separate session after UI fixes are tested

---

## 9. TESTING PLAN

### Manual Testing Checklist
- [ ] Login as Studio Director
  - [ ] Invoices shows only own studio (no selector)
  - [ ] Reservations shows status only (no capacity/approve buttons)
  - [ ] Settings shows only own studio
  - [ ] All dropdowns are visible (not white on white)
  - [ ] Navigation shows: Dancers, Routines, Reservations (top)
  - [ ] Reservation form says "Routines Requested"
  - [ ] Getting Started text updated

- [ ] Login as Competition Director
  - [ ] Reservations shows newly created requests immediately
  - [ ] Can approve/reject with single click
  - [ ] All dropdowns visible
  - [ ] Dashboard shows event capacity metrics
  - [ ] Global invoices view shows all studios
  - [ ] Can manually mark invoices as paid

- [ ] Test new features
  - [ ] Batch dancer add form works (10+ rows)
  - [ ] Table/card view toggle persists across sessions
  - [ ] Drag-drop routine assignment saves correctly
  - [ ] Reducing reservation triggers warning if routines exist

### Automated Testing (if time permits)
- Unit tests for role-based query filters
- E2E tests for reservation approval workflow
- Integration tests for batch dancer creation

---

## 10. FILES REQUIRING CHANGES (Estimated)

### Critical Bug Fixes
- `/dashboard/invoices/page.tsx`
- `/dashboard/reservations/*`
- `/dashboard/studios/page.tsx` or create `/dashboard/settings/page.tsx`
- `/dashboard/judges/page.tsx`
- `/dashboard/analytics/page.tsx`
- `/dashboard/scheduling/page.tsx`
- `/components/**/*.tsx` (any shared dropdown components)

### Terminology Updates
- All page titles, headers, breadcrumbs (50+ files)
- Navigation components (sidebar, top nav)
- `/dashboard/page.tsx` (Getting Started text)
- `/server/routers/*.ts` (keep API naming for now, update UI only)

### New Features
- `/dashboard/dancers/batch-add/page.tsx` (new)
- `/dashboard/routines/assign/page.tsx` (new)
- `/dashboard/invoices/all/page.tsx` (new)
- `/dashboard/reservations/[id]/reduce/page.tsx` (new)
- `/lib/view-preferences.ts` (new utility)
- `/server/routers/reservation.ts` (add reduction mutation)
- `/server/routers/invoice.ts` (add payment confirmation)
- `/server/routers/dancer.ts` (add batch create)

### Schema Changes (Deferred)
- `prisma/schema.prisma` (rename models)
- `prisma/migrations/` (new migration file)

---

## 11. RISK ASSESSMENT

### High Risk
- Database schema rename (competitions → events, entries → routines)
  - **Mitigation**: Defer to separate session, test extensively on staging

### Medium Risk
- Role-based scoping changes (security implications)
  - **Mitigation**: Add tests for query filters, verify no data leakage

### Low Risk
- UI label changes, navigation updates
- Dropdown styling fixes
- New feature additions (isolated components)

---

## 12. READY FOR IMPLEMENTATION

This document is complete and ready for your go-ahead. Once approved, I will:

1. **Start with Phase 1** (Critical Bugs) to immediately improve UX
2. **Proceed to Phase 2** (Terminology UI updates, deferring schema changes)
3. **Complete Phase 3** (Role scoping fixes)
4. **Implement Phase 4** (New features) as time permits

**Estimated Total Time**: 8-14 hours (across phases)

**Recommendation**: Tackle Phase 1-2 in this session, defer Phase 3-4 to subsequent sessions for testing/iteration.

---

**Document Status**: ✅ Ready for Approval
**Awaiting**: User go-ahead to begin implementation
