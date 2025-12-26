# CompPortal Codebase Map

**Last Updated:** 2025-12-25
**Main Branch Build:** e46a13b (Pipeline V2 + email branding)
**Tester Branch Build:** 79c0fe2 (Extended time duration + Media module)
**Purpose:** Quick reference for file locations, patterns, and workflows

---

## Branch Differences Summary

| Feature | Main (Production) | Tester (Phase 2-3 Dev) |
|---------|-------------------|------------------------|
| Pipeline | V1 + V2 (14 files) | V1 only |
| Email branding | ✅ All templates | ✅ All templates |
| Schedule | V2 (merged from tester) | ✅ V2 + Extended Time Duration |
| Game Day (live/) | - | ✅ 52KB unified page |
| liveCompetition router | 620 lines | ✅ 3199 lines (5x more) |
| Operating date | - | ✅ Game Day date selector |
| AdjustSpacesModal | ✅ Capacity adjustments | - |
| Media module | ✅ Merged from tester | ✅ SD Dashboard Media Section |
| RoutineEditModal | - | ✅ CD admin routine editing |
| SD Schedule View | - | ✅ View-only schedule for studios |
| Mobile UX | - | ✅ Responsive SD pages |

### Main Branch Production Features (CompPortal)

**Pipeline V2** (`src/app/dashboard/pipeline-v2/`):
- `page.tsx` - Pipeline V2 entry point (3267 lines)
- `PipelineV2.tsx` - Main container component
- `PipelineTable.tsx` - Desktop table view
- `PipelineRow.tsx` - Table row component
- `PipelineExpandedRow.tsx` - Expanded details (15418 lines)
- `PipelineMobileCard.tsx` - Mobile card view (18023 lines)
- `usePipelineV2.ts` - Data hook (14861 lines)
- `AdjustSpacesModal.tsx` - Capacity adjustment modal
- `KPICards.tsx`, `StatusBadge.tsx`, `BeadProgress.tsx`, `Filters.tsx`

**Recent Production Fixes (Dec 2025):**
- `e46a13b` - PullToRefresh mobile scroll fix
- `80b2226` - Chatwoot SDK Sentry errors suppressed
- `05bc451` - Tenant branding for all emails
- `12d57e6` - Color fallback hydration fix
- `c4205c2` - Dashboard hydration error fix

### Tester Branch Phase 2-3 Features (CompPortal-tester)

**Schedule V2** (`src/app/dashboard/director-panel/schedule-v2/`):
- `page.tsx` - Complete Schedule V2 with drag-drop
- Conflict detection, day isolation, batch operations
- **Extended Time Duration** (79c0fe2) - Uses `extended_time_requested` + custom duration when available
- Competition selector dropdown (41b52ea)
- Assign Studio Codes button in Actions dropdown (d5ab64a)

**SD Schedule View** (`src/app/dashboard/studio-schedule/`):
- `page.tsx` - View-only schedule for Studio Directors (d6b4125)
- Links from SD dashboard buttons
- Read-only view of scheduled routines for their studio

**RoutineEditModal** (`src/components/scheduling/RoutineEditModal.tsx`):
- CD admin routine editing modal (462de4b)
- Edit routine details from schedule page
- Age tracking for intentional +1 bumps (e013ff6)

**Media Module** (`src/app/dashboard/media/`):
- SD Dashboard Media Section (6f87b34)
- Media file upload and management
- Merged to main via 4d121b4

**Mobile UX Improvements** (Dec 2025):
- Responsive SD pages (852f4b0, 626f950, 82807ad)
- Submit button visibility fixes
- Duplicate header fixes

**Game Day Unified Page** (`src/app/dashboard/director-panel/live/`):
- `page.tsx` - 52KB unified Tabulator/Backstage/Judge (3-panel layout)
- Operating date selector for multi-day competitions
- Music playback controls (play/pause/stop)
- Backstage kiosk mode with fullscreen toggle
- Real-time judge score visibility toggle

**liveCompetition Router** (`src/server/routers/liveCompetition.ts`):
- 3199 lines (vs 620 in main)
- Fixed `schedule_sequence ASC` ordering (was `running_order`)
- Fixed `status: { not: 'cancelled' }` filter (was `status: 'registered'`)
- `setOperatingDate`, `getBackstageData`, `submitScore` procedures
- Judge time remaining + other judges' scores features

**Recent Tester Fixes (Dec 2025):**
- `79c0fe2` - Extended time duration in scheduling
- `4d121b4` - Merge Media module from main
- `82807ad` - Mobile UX submit button visibility
- `462de4b` - RoutineEditModal for CD admin
- `e013ff6` - Age tracking for intentional +1 bumps
- `50b4ace` - 5-routine tolerance for summary submission
- `fb061ae` - Day start time immediate display update
- `41b52ea` - Competition selector dropdown
- `d5ab64a` - Assign Studio Codes in Actions dropdown
- `d6b4125` - SD schedule view and dashboard links

---

## 📋 Table of Contents

1. [Database Schema Quick Reference](#database-schema-quick-reference)
2. [tRPC Router Index](#trpc-router-index)
3. [Feature-to-Code Map](#feature-to-code-map)
4. [Component Patterns](#component-patterns)
5. [Common Operations](#common-operations)
6. [Quick Lookup Table](#quick-lookup-table)
7. [Critical Patterns](#critical-patterns)

---

## 1. Database Schema Quick Reference

### Core Tables (Phase 1 - LIVE)

**Multi-Tenant Root:**
- `tenants` - Tenant configuration (id, slug, subdomain, name, branding, email settings)

**Authentication:**
- `users` - User accounts (id, email, role, tenant_id)
  - Roles: `super_admin`, `competition_director`, `studio_director`
  - Auth handled by Supabase Auth

**Studio Management:**
- `studios` - Studio information
  - Key fields: id, owner_id, name, email, code, public_code, tenant_id
  - Status: pending → active
  - 1:many with dancers, entries, reservations

**Dancer Registry:**
- `dancers` - Dancer profiles
  - Key fields: id, studio_id, first_name, last_name, date_of_birth, tenant_id
  - Many:many with entries via `entry_participants`

**Competitions:**
- `competitions` - Competition events
  - Key fields: id, name, year, tenant_id, available_reservation_tokens
  - Capacity management via `total_reservation_tokens` / `available_reservation_tokens`

**Reservation System:**
- `reservations` - Studio bookings
  - Key fields: id, studio_id, competition_id, spaces_requested, spaces_confirmed, status, tenant_id
  - Status flow: pending → approved/adjusted/rejected → summarized → invoiced → paid/closed
  - 1:many with entries, 1:1 with summary, 1:1 with invoice

**Entry Creation (Routines):**
- `competition_entries` - Dance routines
  - Key fields: id, reservation_id, studio_id, title, category_id, classification_id, age_group_id, entry_size_category_id, status, tenant_id
  - Many:many with dancers via `entry_participants`
  - Belongs to: reservation, studio, competition

**Entry Participants (Junction):**
- `entry_participants` - Links dancers to entries
  - Key fields: id, entry_id, dancer_id, dancer_name, dancer_age, tenant_id
  - Unique constraint: [entry_id, dancer_id]

**Financial:**
- `invoices` - Studio invoices
  - Key fields: id, studio_id, competition_id, reservation_id, subtotal, total, tax_rate, status, tenant_id
  - Status: DRAFT → SENT → PAID
  - 1:1 with reservation
  - 1:many with sub_invoices (dancer-level invoices)

**CSV Import:**
- `routine_import_sessions` - Tracks routine CSV import progress
  - Key fields: id, studio_id, reservation_id, csv_data, current_index, total_routines, tenant_id
  - Used for step-through CSV import workflow

**Summaries:**
- `summaries` - Reservation summary submissions
  - Key fields: id, reservation_id, total_entries, total_amount, tenant_id
  - 1:1 with reservation
  - 1:many with summary_entries

**Reference Tables:**
- `age_groups` - Age divisions (e.g., Mini, Junior, Teen)
- `classifications` - Skill levels (e.g., Recreational, Competitive, Elite)
- `dance_categories` - Dance styles (e.g., Ballet, Jazz, Contemporary)
- `entry_size_categories` - Group sizes (e.g., Solo, Duet/Trio, Small Group)

### Phase 2 Tables (Scheduling - LIVE on Tester)

**Schedule Management:**
- `schedule_blocks` - Breaks, awards, lunch, adjudication blocks
  - Key fields: id, competition_id, performance_date, schedule_sequence, block_type, duration_minutes, tenant_id
  - Block types: 'break', 'award', 'lunch', 'adjudication'
  - 1:1 position in day's schedule sequence

- `schedule_versions` - Version history for undo/redo
  - Key fields: id, competition_id, version_number, snapshot_data, created_by, tenant_id
  - Stores complete schedule state as JSON snapshot

- `day_start_times` - Per-day start configuration
  - Key fields: id, competition_id, performance_date, start_time, tenant_id
  - Allows different start times per competition day

**competition_entries (Phase 2 fields added):**
- `performance_date` (DATE) - Which day entry performs
- `schedule_sequence` (INT) - Order within the day (1, 2, 3...)
- `entry_number` (INT) - Display number (#100, #101...)
- `is_scheduled` (BOOLEAN) - Whether entry is on schedule
- `dancer_names[]` (TEXT[]) - Denormalized for conflict detection
- `conflict_count` (INT) - Number of conflicts with other entries
- `conflicts_with_entry_ids[]` (UUID[]) - IDs of conflicting entries
- `scheduled_start_time` (TIME) - Calculated start time

**Judging & Scoring (Phase 3):**
- `judges` - Judge profiles and assignments
- `scores` - Individual judge score submissions
- `rankings` - Placement results (calculated)
- `awards` - Award assignments (special, overall)

### Phase 3 Tables (Game Day - Backend Complete)

**Live Competition State:**
- `live_competition_state` - Real-time competition control
  - Key fields: id, competition_id, tenant_id, competition_state, current_entry_id, current_entry_state, operating_date, day_number, session_number, playback_state, judges_can_see_scores
  - States: 'active', 'paused', 'ended'
  - Entry states: 'queued', 'performing', 'completed'
  - Controls which day's routines to display via operating_date

**competition_entries (Phase 3 fields):**
- `live_status` (TEXT) - Runtime status ('queued', 'current', 'completed', 'scratched')
- `music_file_url` (TEXT) - S3 URL for MP3 playback
- `mp3_duration_ms` (INT) - Audio duration for countdown timer

### Key Relationships

```
tenants (root)
├── users (authentication)
├── studios
│   ├── dancers
│   ├── reservations
│   │   ├── competition_entries
│   │   │   └── entry_participants (← dancers)
│   │   ├── summary (1:1)
│   │   └── invoice (1:1)
│   └── routine_import_sessions
└── competitions
    ├── reservations
    ├── competition_sessions (Phase 2)
    └── invoices
```

**Critical Foreign Keys:**
- ALL tables have `tenant_id` → tenants.id (multi-tenant isolation)
- studios.owner_id → users.id
- dancers.studio_id → studios.id
- reservations.studio_id → studios.id
- reservations.competition_id → competitions.id
- competition_entries.reservation_id → reservations.id
- competition_entries.studio_id → studios.id
- entry_participants.entry_id → competition_entries.id
- entry_participants.dancer_id → dancers.id
- invoices.reservation_id → reservations.id

---

## 2. tRPC Router Index

**Location:** `src/server/routers/`
**Export:** `src/server/api/root.ts`

### Core Routers (Phase 1)

| Router | File | Key Procedures | Access | Notes |
|--------|------|----------------|--------|-------|
| **user** | `user.ts` | getCurrentUser, updateProfile | All roles | Returns user + studio context |
| **studio** | `studio.ts` | create, getAll, update | SA/CD view all, SD filtered | Studio management |
| **dancer** | `dancer.ts` | create, batchCreate, getAll, update, delete | SD+, SA testing | CSV import via batchCreate |
| **competition** | `competition.ts` | getAll, getById, create, update | CD+, SD read-only | Competition setup |
| **reservation** | `reservation.ts` | create, approve, reject, adjust, getAll | SD creates, CD approves | Capacity locking |
| **entry** | `entry.ts` | create, getAll, getByReservation, update, delete | SD creates | Routine creation |
| **importSession** | `importSession.ts` | create, getById, updateIndex, markComplete, deleteRoutine | SD only | CSV step-through |
| **summary** | `summary.ts` | submit, getAll, getById | SD submits, CD views | Capacity refund logic |
| **invoice** | `invoice.ts` | create, send, getByReservation | CD creates/sends | PDF generation |
| **feedback** | `feedback.ts` | create, getAll | All submit, SA views | User feedback system |

### Admin Routers

| Router | File | Key Procedures | Access | Notes |
|--------|------|----------------|--------|-------|
| **admin** | `admin.ts` | getStudios, updateStudio, approveReservation | CD+ | Director panel |
| **superAdmin** | `superAdmin.ts` | wipeData, populateTestData, getTenantStats | SA only | Testing tools |
| **testing** | `testing.ts` | Various test utilities | SA only | Development helpers |
| **siteControl** | `site-control.ts` | pauseSite, unpauseSite | SA only | Maintenance mode |

### Phase 2 Routers (Scheduling - LIVE)

| Router | File | Key Procedures | Status | Notes |
|--------|------|----------------|--------|-------|
| **scheduling** | `scheduling.ts` | saveSchedule, getSchedule, getUnscheduledEntries, exportPdf | LIVE | Drag-drop scheduler |
| **scheduleBlock** | `scheduling.ts` | createBlock, updateBlock, deleteBlock | LIVE | Break/Award blocks |
| **scheduleVersion** | `scheduling.ts` | saveVersion, getVersions, restoreVersion | LIVE | Undo/redo system |
| **dayStartTime** | `scheduling.ts` | getDayStartTimes, setDayStartTime | LIVE | Per-day start times |

**Extended Time Duration** (79c0fe2):
- Location: `src/server/routers/scheduling.ts:785-787` (select fields)
- Location: `src/server/routers/scheduling.ts:901-913` (duration IIFE)
- Logic: When `extended_time_requested=true` AND custom duration set, uses `routine_length_minutes/seconds`
- Fallback: Default durations by entry size (Solo=3min, Groups=4min, Lines=5min)

### Phase 3 Routers (Game Day - Backend Complete)

| Router | File | Key Procedures | Status | Notes |
|--------|------|----------------|--------|-------|
| **liveCompetition** | `liveCompetition.ts` | getLiveState, getLineup, setCurrentEntry, advanceEntry | Backend | Tabulator control |
| **judges** | `judges.ts` | create, assign, getAll, updateStatus | Backend | Judge management |
| **scoring** | `scoring.ts` | submitScore, getScores, calculateRankings | Backend | Score submission |

### Phase 3 APIs (Public Routes)

| Route | File | Purpose | Auth | Notes |
|-------|------|---------|------|-------|
| `/api/backstage` | `api/backstage/route.ts` | Public backstage display | None (public) | Shows upcoming routines |
| `/api/audio/manifest` | `api/audio/manifest/route.ts` | MP3 download list | Token-based | Pre-downloads audio |

### Utility Routers

| Router | File | Purpose |
|--------|------|---------|
| **lookup** | `lookup.ts` | Get age groups, classifications, categories, size categories |
| **activity** | `activity.ts` | Activity log tracking |
| **email** | `email.ts` | Email sending (manual only) |
| **analytics** | `analytics.ts` | Usage statistics |
| **accountRecovery** | `accountRecovery.ts` | Password reset flow |

---

## 3. Feature-to-Code Map

### Authentication & Authorization

**Login/Logout:**
- Login page: `src/app/login/page.tsx`
- Auth config: `src/server/auth.ts:25-67`
- Middleware: `src/middleware.ts:15-42` (tenant detection + session refresh)
- Context provider: `src/server/api/trpc.ts:68-89` (ctx.user, ctx.tenantId)

**Role Checks:**
```typescript
// Super Admin only
if (ctx.user.role !== 'super_admin') throw new TRPCError({ code: 'FORBIDDEN' });

// Competition Director or higher
if (!['competition_director', 'super_admin'].includes(ctx.user.role)) throw forbidden;

// Studio Director (all roles with studio filter)
const studio = await getStudioForUser(ctx.user.id);
```

**Account Recovery:**
- Page: `src/app/account-recovery/page.tsx` (dark mode, email tracking)
- Router: `src/server/routers/accountRecovery.ts`

### Dancer Management

**Add Dancer (Manual):**
- Page: `src/app/dashboard/dancers/page.tsx`
- Component: `src/components/DancersPage.tsx:45-123` (main container)
- Form: `src/components/DancerForm.tsx:89-234`
- Router: `src/server/routers/dancer.ts:45-78` (create mutation)
- Validation: Age 3-25, required fields (first_name, last_name, date_of_birth, gender)

**CSV Import:**
- Component: `src/components/DancerCSVImport.tsx:67-189`
- Router: `src/server/routers/dancer.ts:145-203` (batchCreate mutation)
- Validation: Birthdate format YYYY-MM-DD, duplicate detection, max 200 per batch

**Batch Form:**
- Component: `src/components/DancerBatchForm.tsx`
- Use case: Quick multiple dancer entry

### Entry Creation (Routines)

**Manual Entry:**
- Page: `src/app/dashboard/entries/page.tsx`
- Main component: `src/components/EntriesPage.tsx` (active)
- Form: `src/components/EntryCreateFormV2.tsx:234-567`
- Router: `src/server/routers/entry.ts:89-145` (create mutation)

**Key Form Logic:**
- Participant selection: `EntryCreateFormV2.tsx:87-108` (calculateAge helper)
- Capacity check: `entry.ts:125-134` (ensure reservation has space)
- Validation: Required fields, age calculation, classification rules

**CSV Import (Step-Through):**
- Upload component: `src/components/RoutineCSVImport.tsx:145-267`
- Session router: `src/server/routers/importSession.ts:34-89`
- Step-through UI: `src/components/ImportActions.tsx:67-123`
- Resume button: `src/components/EntriesHeader.tsx` (5-second polling)

**CSV Import Flow:**
1. Upload CSV → Parse → Create import_session
2. Display first routine in EntryCreateFormV2 (pre-filled)
3. Save entry → Increment current_index
4. Load next routine (or mark complete if done)
5. Resume Import button appears if session.current_index < total_routines

**Sortable Table:**
- Component: `src/components/EntriesTable.tsx` (sortable columns feature)
- Commit: b53f109

### Reservation System

**Studio Creates Reservation:**
- Page: `src/app/dashboard/reservations/page.tsx`
- Form: `src/components/ReservationForm.tsx`
- Router: `src/server/routers/reservation.ts:45-89` (create mutation)
- Capacity lock: Reserves tokens immediately (optimistic)

**CD Approval Pipeline:**
- Page: `src/app/dashboard/reservation-pipeline/page.tsx`
- Component: `src/components/PipelinePageContainer.tsx:145-234`
- Table: `src/components/ReservationTable.tsx:179-198` (action buttons)
- Mutations: `reservation.ts:89-156` (approve/reject/adjust)

**Approve Logic:**
- Locks capacity tokens (via capacity_ledger transaction)
- Updates status: pending → approved
- Sends email notification (if enabled)

**Summary Submission:**
- Page: `src/app/dashboard/reservations/[id]/summary/page.tsx`
- Component: `src/components/RoutineSummaries.tsx:234-345`
- Router: `src/server/routers/summary.ts:67-123`
- Capacity refund: `summary.ts:89-95` (refunds unused tokens)

### Invoice Workflow

**UI Buttons (ReservationTable.tsx:179-198):**
- **Create Invoice** button: Shows when status='summarized' && no invoice exists
- **Send Invoice** button: Shows when invoice exists && status='DRAFT'

**Backend:**
- Router: `src/server/routers/invoice.ts:45-123`
- Create: `invoice.ts:67-89` (generates line items, calculates totals, creates PDF)
- Send: `invoice.ts:91-112` (updates status to SENT, sends email)
- PDF generator: `src/lib/invoicePdfGenerator.ts:234-456`

**Email Template:**
- Location: `src/lib/emailTemplates.ts:123-167`
- Policy: Manual send only (SA/CD button click, NEVER automatic)

### User Feedback System

**Feedback Widget:**
- Component: `src/components/FeedbackWidget.tsx` (fixed position bottom-right)
- Styling fix: d7d556e (text visibility, positioning)
- Modal: `src/components/FeedbackPanel.tsx`

**SA Admin Panel:**
- Router: `src/server/routers/feedback.ts`
- View all: SA dashboard (commit 5b861d6)
- Access: Super Admin only

### SA Testing Tools

**Dashboard:**
- Page: `src/app/dashboard/admin/testing/page.tsx`
- Tools available:
  - Wipe all data (DANGEROUS - production check required)
  - Populate test data (creates sample dancers, entries)
  - Get tenant statistics
  - View system health
- Router: `src/server/routers/superAdmin.ts`

**Access Control:**
- Role check: SA only (`ctx.user.role === 'super_admin'`)
- NEVER allow in production (environment check)

---

## 4. Component Patterns

### Page Structure (Next.js App Router)

**Pattern:**
```
src/app/dashboard/[feature]/page.tsx
├── Imports main component
├── Auth check (via middleware)
└── Renders feature component
```

**Example:** `src/app/dashboard/entries/page.tsx`
```typescript
import { EntriesPage } from "@/components/EntriesPage";

export default function Page() {
  return <EntriesPage />;
}
```

### Main Feature Components

**Pattern:** `src/components/[Feature]Page.tsx`
- Handles data fetching (tRPC hooks)
- Manages local state
- Delegates UI to child components
- Contains mutations

**Example:** `src/components/EntriesPage.tsx`
- Fetches entries via `api.entry.getAll.useQuery()`
- Manages modal state (create, edit, CSV import)
- Renders EntriesHeader, EntriesTable, modals

### Form Components

**Pattern:** `src/components/[Feature]Form.tsx`
- Uses react-hook-form + Zod validation
- Controlled inputs with error handling
- Submit mutation
- Loading states

**Example:** `src/components/DancerForm.tsx`
- Form fields: first_name, last_name, date_of_birth, gender (required)
- Validation: Age 3-25, date format, required fields
- Mutation: `api.dancer.create.useMutation()` or `update`

### Table Components

**Pattern:** `src/components/[Feature]Table.tsx`
- Displays data in rows
- Action buttons (edit, delete, view)
- Sortable columns (optional)
- Responsive design

**Example:** `src/components/EntriesTable.tsx`
- Sortable: title, category, classification, age group (commit b53f109)
- Actions: Edit, Delete, View Details
- Filters: By reservation, status

---

## 5. Common Operations

### How to Add a New Field to Entry

1. **Update Prisma schema:**
   ```prisma
   // prisma/schema.prisma
   model competition_entries {
     // ... existing fields
     new_field  String?  @db.VarChar(100)
   }
   ```

2. **Push migration:**
   ```bash
   npm run db:push
   # or for production:
   npx prisma migrate dev --name add_new_field
   ```

3. **Update types (if needed):**
   ```typescript
   // src/types/entry.ts (if custom types exist)
   export interface Entry {
     // ... existing
     new_field?: string;
   }
   ```

4. **Update form:**
   ```typescript
   // src/components/EntryCreateFormV2.tsx
   <Input name="new_field" label="New Field" />
   ```

5. **Update router validation:**
   ```typescript
   // src/server/routers/entry.ts
   create: protectedProcedure
     .input(z.object({
       // ... existing
       new_field: z.string().optional(),
     }))
     .mutation(async ({ ctx, input }) => {
       return await ctx.db.competition_entries.create({
         data: {
           ...input,
           tenant_id: ctx.tenantId, // CRITICAL
         },
       });
     }),
   ```

### How to Add New tRPC Procedure

1. **Create/open router:**
   ```typescript
   // src/server/routers/[feature].ts
   export const featureRouter = createTRPCRouter({
     myProcedure: protectedProcedure
       .input(z.object({ id: z.string() }))
       .mutation(async ({ ctx, input }) => {
         // Access control check
         if (ctx.user.role !== 'super_admin') {
           throw new TRPCError({ code: 'FORBIDDEN' });
         }

         // Query with tenant filter (ALWAYS)
         const result = await ctx.db.table.findMany({
           where: {
             tenant_id: ctx.tenantId, // CRITICAL
             id: input.id,
           },
         });

         return result;
       }),
   });
   ```

2. **Export in root:**
   ```typescript
   // src/server/api/root.ts
   export const appRouter = createTRPCRouter({
     // ... existing
     feature: featureRouter,
   });
   ```

3. **Use in component:**
   ```typescript
   const { mutate } = api.feature.myProcedure.useMutation();

   const handleSubmit = () => {
     mutate({ id: "123" }, {
       onSuccess: () => toast.success("Done!"),
     });
   };
   ```

### How to Debug Multi-Tenant Issues

**See:** `DEBUGGING.md` (lines 15-95)

**Quick checklist:**
1. ✅ Check tenant_id on ALL queries
2. ✅ Verify auth context: `ctx.tenantId` vs `input.tenant_id`
3. ✅ Run cross-tenant leak query:
   ```sql
   SELECT COUNT(*) as leaks
   FROM table_a a
   JOIN table_b b ON a.b_id = b.id
   WHERE a.tenant_id != b.tenant_id;
   -- Should ALWAYS return 0
   ```
4. ✅ Check database triggers (hidden logic)
5. ✅ Verify middleware is setting tenantId correctly

### How to Add Navigation Link

**Dashboard sidebar:**
```typescript
// src/components/DashboardSidebar.tsx
const links = [
  { href: "/dashboard/new-page", label: "New Page", icon: IconName },
];
```

**Mobile bottom nav:**
```typescript
// src/components/BottomNav.tsx
const navItems = [
  { href: "/dashboard/new-page", label: "New", icon: IconName },
];
```

---

## 6. Quick Lookup Table

| I need to... | Check this file | Lines/Section |
|--------------|-----------------|---------------|
| **Add validation rule** | `src/server/routers/[feature].ts` | Input schema (z.object) |
| **Change form field** | `src/components/[Feature]Form.tsx` | Form fields section |
| **Fix button behavior** | `src/components/[Feature]Table.tsx` | Action buttons |
| **Add database field** | `prisma/schema.prisma` | Model definition |
| **Debug tenant issue** | `DEBUGGING.md` | Lines 15-95 |
| **Fix common gotcha** | `GOTCHAS.md` | All sections |
| **Understand workflow** | `docs/specs/PHASE1_SPEC.md` | Relevant section |
| **Check access control** | `src/server/api/trpc.ts` | protectedProcedure |
| **Find router** | `src/server/routers/[feature].ts` | See Router Index |
| **Find page** | `src/app/dashboard/[feature]/page.tsx` | Dashboard pages |
| **CSV import logic** | `src/components/RoutineCSVImport.tsx` | Lines 145-267 |
| **Invoice creation** | `src/server/routers/invoice.ts` | Lines 67-89 |
| **Capacity management** | `src/server/routers/reservation.ts` | approve/adjust mutations |
| **Email templates** | `src/lib/emailTemplates.ts` | Lines 123-167 |
| **PDF generation** | `src/lib/invoicePdfGenerator.ts` | Lines 234-456 |
| **Scheduler** | `src/server/routers/scheduling.ts` | Phase 2 (1,104 lines) |
| **Extended time duration** | `src/server/routers/scheduling.ts` | Lines 785-787, 901-913 |
| **RoutineEditModal** | `src/components/scheduling/RoutineEditModal.tsx` | CD routine editing |
| **ActionsDropdown** | `src/components/scheduling/ActionsDropdown.tsx` | Assign Studio Codes, Reset, etc. |
| **SD Schedule view** | `src/app/dashboard/studio-schedule/page.tsx` | View-only schedule for SD |
| **Media upload** | `src/app/dashboard/media/page.tsx` | SD Dashboard Media Section |
| **Testing tools** | `src/server/routers/superAdmin.ts` | SA only |
| **Feedback system** | `src/server/routers/feedback.ts` | All users submit |

---

## 7. Critical Patterns

### ✅ ALWAYS Include tenant_id

**All queries MUST filter by tenant:**
```typescript
const data = await ctx.db.table.findMany({
  where: {
    tenant_id: ctx.tenantId,  // MANDATORY
    // ... other filters
  },
});
```

**All creates MUST include tenant_id:**
```typescript
await ctx.db.table.create({
  data: {
    tenant_id: ctx.tenantId,  // MANDATORY
    // ... other fields
  },
});
```

### ✅ Use Transactions for Capacity Changes

**Pattern:**
```typescript
await ctx.db.$transaction(async (tx) => {
  // 1. Lock row
  const competition = await tx.competitions.findUnique({
    where: { id: competitionId },
    select: { available_reservation_tokens: true },
  });

  // 2. Validate
  if (competition.available < requested) {
    throw new TRPCError({ code: 'BAD_REQUEST', message: 'Insufficient capacity' });
  }

  // 3. Update
  await tx.competitions.update({
    where: { id: competitionId },
    data: { available_reservation_tokens: { decrement: requested } },
  });

  // 4. Log audit trail
  await tx.capacity_ledger.create({
    data: {
      competition_id: competitionId,
      change_amount: -requested,
      reason: 'approval',
      tenant_id: ctx.tenantId,
    },
  });
});
```

### ✅ Soft Delete (Never Hard Delete)

**Use status field:**
```typescript
// CORRECT - Soft delete
await ctx.db.competition_entries.update({
  where: { id },
  data: { status: 'cancelled' },
});

// WRONG - Hard delete (data loss)
await ctx.db.competition_entries.delete({
  where: { id },
});
```

**Status values:**
- Entries: registered, cancelled, scheduled, completed
- Reservations: pending, approved, rejected, summarized, invoiced, paid, closed
- Invoices: DRAFT, SENT, PAID

### ✅ Access Control Patterns

**Super Admin Only:**
```typescript
if (ctx.user.role !== 'super_admin') {
  throw new TRPCError({ code: 'FORBIDDEN', message: 'Super Admin only' });
}
```

**Competition Director or higher:**
```typescript
if (!['competition_director', 'super_admin'].includes(ctx.user.role)) {
  throw new TRPCError({ code: 'FORBIDDEN' });
}
```

**Studio Director (with studio filter):**
```typescript
const studio = await ctx.db.studios.findFirst({
  where: {
    owner_id: ctx.user.id,
    tenant_id: ctx.tenantId,
  },
});

if (!studio) {
  throw new TRPCError({ code: 'NOT_FOUND', message: 'No studio found' });
}

// Use studio.id for filtering queries
const dancers = await ctx.db.dancers.findMany({
  where: {
    studio_id: studio.id,
    tenant_id: ctx.tenantId,
  },
});
```

### ❌ NEVER Query Without tenant_id

**WRONG - Cross-tenant leak:**
```typescript
const data = await ctx.db.table.findMany();
```

**CORRECT - Tenant filtered:**
```typescript
const data = await ctx.db.table.findMany({
  where: { tenant_id: ctx.tenantId },
});
```

### ❌ NEVER Send Emails Automatically

**WRONG - Automatic send:**
```typescript
// On git push, deploy, cron, etc.
await sendEmail({ to: studio.email, subject: "Invoice Ready" });
```

**CORRECT - Manual send only:**
```typescript
// Only via SA/CD button click
sendInvoice: protectedProcedure
  .input(z.object({ invoiceId: z.string() }))
  .mutation(async ({ ctx, input }) => {
    if (!['competition_director', 'super_admin'].includes(ctx.user.role)) {
      throw forbidden;
    }

    // Send email ONLY when button clicked
    await sendEmailViaAPI({ ... });
  }),
```

---

## 8. File Organization

### Source Structure

```
CompPortal/
├── src/
│   ├── app/
│   │   ├── dashboard/           # Dashboard pages (Next.js App Router)
│   │   │   ├── entries/         # Entry management
│   │   │   ├── dancers/         # Dancer management
│   │   │   ├── reservations/    # Reservations
│   │   │   ├── reservation-pipeline/  # CD approval
│   │   │   ├── scheduling/      # Phase 2 scheduler
│   │   │   └── [other features]/
│   │   ├── login/               # Authentication
│   │   ├── account-recovery/    # Password reset
│   │   └── layout.tsx           # Root layout
│   ├── components/              # React components
│   │   ├── *Page.tsx            # Main feature components
│   │   ├── *Form.tsx            # Form components
│   │   ├── *Table.tsx           # Table components
│   │   ├── DashboardSidebar.tsx # Navigation
│   │   ├── BottomNav.tsx        # Mobile nav
│   │   └── [UI components]/
│   ├── server/
│   │   ├── routers/             # tRPC routers
│   │   ├── api/
│   │   │   ├── root.ts          # Router exports
│   │   │   └── trpc.ts          # tRPC setup
│   │   └── auth.ts              # Auth config
│   ├── lib/                     # Utility libraries
│   │   ├── emailTemplates.ts    # Email templates
│   │   ├── invoicePdfGenerator.ts  # PDF generation
│   │   └── [utilities]/
│   ├── middleware.ts            # Tenant detection + auth
│   └── types/                   # TypeScript types
├── prisma/
│   └── schema.prisma            # Database schema (1854 lines)
├── docs/
│   ├── specs/
│   │   ├── MASTER_BUSINESS_LOGIC.md  # 4-phase overview
│   │   └── PHASE1_SPEC.md       # Phase 1 spec (1040 lines)
│   └── archive/                 # Historical docs
├── CLAUDE.md                    # Development instructions
├── DEBUGGING.md                 # Debug protocols
├── GOTCHAS.md                   # Common issues
├── PROJECT_STATUS.md            # Current status
└── CODEBASE_MAP.md              # This file
```

---

## 9. Useful Queries

### Find All Entries for a Studio
```sql
SELECT e.id, e.title, e.status, s.name as studio_name
FROM competition_entries e
JOIN studios s ON e.studio_id = s.id
WHERE e.tenant_id = '[tenant-id]'
  AND s.id = '[studio-id]'
ORDER BY e.created_at DESC;
```

### Check Cross-Tenant Leaks (Entry Participants)
```sql
SELECT COUNT(*) as leaks
FROM entry_participants ep
JOIN competition_entries e ON ep.entry_id = e.id
JOIN dancers d ON ep.dancer_id = d.id
WHERE ep.tenant_id != e.tenant_id
   OR ep.tenant_id != d.tenant_id;
-- Should return 0
```

### Get Reservation with All Related Data
```sql
SELECT
  r.id,
  r.status,
  s.name as studio_name,
  c.name as competition_name,
  COUNT(DISTINCT e.id) as entry_count,
  SUM(e.participant_count) as total_dancers
FROM reservations r
JOIN studios s ON r.studio_id = s.id
JOIN competitions c ON r.competition_id = c.id
LEFT JOIN competition_entries e ON r.id = e.reservation_id
WHERE r.tenant_id = '[tenant-id]'
  AND r.id = '[reservation-id]'
GROUP BY r.id, r.status, s.name, c.name;
```

### Find Import Sessions in Progress
```sql
SELECT
  ris.id,
  ris.current_index,
  ris.total_routines,
  s.name as studio_name,
  r.id as reservation_id
FROM routine_import_sessions ris
JOIN studios s ON ris.studio_id = s.id
LEFT JOIN reservations r ON ris.reservation_id = r.id
WHERE ris.tenant_id = '[tenant-id]'
  AND ris.current_index < ris.total_routines
ORDER BY ris.created_at DESC;
```

---

## 10. Usage Notes

**When to load this map:**
- At session start (instead of reading 5-10 files)
- User reports a bug in known feature
- Implementing similar functionality to existing code
- Need to understand data flow or relationships
- Adding new field/procedure to existing system

**When to skip (use grep/search instead):**
- Looking for unknown/undocumented code
- Debugging new features not yet in map
- Map is >2 weeks old (might be stale)
- Investigating complex architectural issues

**Token savings:**
- This map: ~5k tokens (one-time load)
- vs. Reading 5-10 files: 15-30k tokens per lookup
- **ROI: Pays for itself in 2-3 lookups**

**Maintenance:**
- Update after major refactors
- Update when adding new features
- Mark sections as outdated if they drift
- Target: Keep under 1000 lines total

---

**Last Updated:** 2025-12-13
**Build:** Latest (Phase 2-3 updates)
**Maintained by:** Claude Code (with user review)
