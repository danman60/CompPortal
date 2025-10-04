# Bugs & Features Tracker

**Last Updated**: 2025-10-04 (Session 2)
**Source**: RBAC Golden Test Results (TEST_RESULTS.md) + Phase 2-4 Implementation

---

## 🐛 Bugs

### ✅ Fixed Bugs

#### BUG-001: Sign Out HTTP 405 Error
- **Severity**: 🟡 High
- **Impact**: Users cannot sign out properly, session remains active
- **Location**: Dashboard Sign Out button → /api/auth/signout
- **Error**: HTTP ERROR 405
- **Root Cause**: Next.js App Router forms cannot POST to API routes and expect redirects
- **Solution**: Created server action `signOutAction` in `src/app/actions/auth.ts`
- **Fix Commit**: a29e1e9
- **Status**: ✅ FIXED (verified in production)
- **Fixed Date**: 2025-10-02

#### BUG-002: Reservation Approval UUID Validation Error
- **Severity**: 🟡 High
- **Impact**: Completely blocked reservation approval workflow
- **Location**: /dashboard/reservations → Approve Reservation button
- **Error**: `Invalid uuid` validation error for approvedBy field
- **Root Cause**: Frontend sending 'temp-user-id' instead of valid UUID
- **Solution**: Use server-side ctx.userId from authenticated context instead of client-provided value
- **Files Modified**:
  - src/server/routers/reservation.ts (approve & reject mutations)
  - src/components/ReservationsList.tsx (removed approvedBy/rejectedBy from mutation calls)
- **Fix Commit**: 0e87fc3
- **Status**: ✅ FIXED (verified in production with CD-5 test)
- **Fixed Date**: 2025-10-03

### 🔴 Active Critical Bugs
*None*

### 🟡 Active High Priority Bugs
*None*

### 🔵 Active Medium Priority Bugs
*None*

### ⚪ Active Low Priority Bugs
*None*

---

## ✅ Completed Features

### 1. Dancer Edit UI
- **Priority**: 🟡 High
- **Impact**: Enables dancer management workflow
- **Description**: Implemented dancer edit page with full update capability
- **Files Modified**:
  - `src/app/dashboard/dancers/[id]/page.tsx` (edit page)
  - `src/components/DancersList.tsx` (edit button/navigation)
- **Backend**: Uses existing `src/server/routers/dancer.ts` update mutation
- **Commit**: 2fcf7cb
- **Status**: ✅ COMPLETED
- **Completed Date**: 2025-10-02

### 2. Reservation Create UI
- **Priority**: 🟡 High
- **Impact**: Enables studio directors to request event reservations
- **Description**: Implemented reservation creation form for studio directors
- **Includes**:
  - SD-8: Create reservation for own studio
  - CD-6: Approve/reject reservation workflow
  - Studio director reservation management
- **Files Created**:
  - `src/app/dashboard/reservations/new/page.tsx` (create page)
  - `src/components/ReservationForm.tsx` (form component)
  - Updated `src/components/ReservationsList.tsx` (create button)
- **Backend**: Uses `src/server/routers/reservation.ts` create mutation
- **Commit**: 6634b17
- **Status**: ✅ COMPLETED
- **Completed Date**: 2025-10-02

### 3. Phase 2 Terminology Standardization
- **Priority**: 🟡 High
- **Impact**: Consistent user-facing terminology across entire application
- **Description**: Global terminology updates per user feedback
- **Changes**:
  - Competition → Event (all UI labels, navigation, page titles)
  - Entries/Entry → Routines/Routine (all user-facing text)
  - Spaces Requested → Routines Requested (reservation forms)
- **Scope**: 20 files modified across 9 commits (Phase 2.0-2.5)
- **Files Updated**:
  - Phase 2.0: Core files (CompetitionsList, ReservationsList, EntriesList, DancersList, EntryForm, Competition Director Dashboard)
  - Phase 2.1: Competition Director Dashboard refinements
  - Phase 2.2: Analytics page
  - Phase 2.3: Reports, Scoreboard, Scheduling pages
  - Phase 2.4: SchedulingManager component
  - Phase 2.5: Scheduling sub-components (UnscheduledEntries, SessionCard, ConflictPanel)
- **Commits**: b78ef91, c55f49f, 90daadd, 6a2bba0, 11a68e7, 79dc4d6, 36b4da2, 80bdc87, 9c30523
- **Verification**: Tested in production via Playwright MCP (comp-portal-btiqed80c deployment)
- **Status**: ✅ COMPLETED
- **Completed Date**: 2025-10-04
- **Notes**: Database schema still uses original names (competitions, competition_entries) - UI-only updates for now

### 4. Phase 3.1: Global Invoices View
- **Priority**: 🟡 High
- **Impact**: Competition Directors can manage payments across all studios
- **Description**: Global invoices management system for payment tracking
- **Features**:
  - View all invoices across all studios and events
  - Filter by event and payment status
  - Update payment status (pending/partial/paid/refunded/cancelled)
  - Revenue summary statistics
  - Payment confirmation tracking (who confirmed, when)
- **Files Created**:
  - `src/components/AllInvoicesList.tsx` (268 lines)
  - `src/app/dashboard/invoices/all/page.tsx`
- **Backend**: Added `invoice.getAllInvoices` query, `reservation.markAsPaid` mutation
- **Database**: Added payment_confirmed_by, payment_confirmed_at to reservations table
- **Commit**: 0676225
- **Status**: ✅ COMPLETED
- **Completed Date**: 2025-10-04

### 5. Phase 3.2: Dashboard Metrics Enhancement
- **Priority**: 🟡 High
- **Impact**: Improved payment visibility on CD dashboard
- **Description**: Added unpaid invoices metric to Competition Director dashboard
- **Features**:
  - Unpaid invoices count card
  - Total amount owed display
  - Click-through to filtered invoices view
  - URL query parameter support for pre-filtering
- **Files Modified**: `src/components/DashboardStats.tsx`, `src/components/AllInvoicesList.tsx`
- **Commit**: 326082d
- **Status**: ✅ COMPLETED
- **Completed Date**: 2025-10-04

### 6. Phase 4.1: Multi-Row Dancer Batch Input
- **Priority**: 🟡 High
- **Impact**: Streamlined dancer creation workflow
- **Description**: Spreadsheet-style interface for adding multiple dancers at once
- **Features**:
  - Table interface with dynamic row management
  - Add 1, 5, or 10 rows at a time
  - React Hook Form with useFieldArray
  - Batch create mutation with error handling
  - Auto-skip empty rows
  - Success/fail reporting per dancer
- **Files Created**:
  - `src/components/DancerBatchForm.tsx` (385 lines)
  - `src/app/dashboard/dancers/batch-add/page.tsx`
- **Backend**: Added `dancer.batchCreate` mutation
- **Commit**: d478576
- **Status**: ✅ COMPLETED
- **Completed Date**: 2025-10-04

### 7. Phase 4.2: Dancer-to-Routine Assignment Interface
- **Priority**: 🟡 High
- **Impact**: Simplified routine participant management
- **Description**: Two-panel interface for assigning dancers to routines
- **Features**:
  - Two-panel layout (routines left, dancers right)
  - Click-to-select routine + click-to-assign dancer
  - Real-time participant tracking
  - Remove dancer functionality
  - Search dancers by name
  - Age auto-calculation from date_of_birth
  - Visual feedback for selected routines
- **Dependencies**: @dnd-kit/core, @dnd-kit/sortable, @dnd-kit/utilities
- **Files Created**:
  - `src/components/DancerAssignmentPanel.tsx` (384 lines)
  - `src/app/dashboard/entries/assign/page.tsx`
- **Backend**: Uses existing `entry.addParticipant` and `entry.removeParticipant` mutations
- **Commit**: 9b0b86b
- **Status**: ✅ COMPLETED
- **Completed Date**: 2025-10-04

---

## 🚧 Missing Features (Blocking Testing/Functionality)

### 1. API Testing Infrastructure
- **Priority**: 🔵 Medium
- **Impact**: Cannot complete security penetration tests
- **Description**: Need tools to intercept/modify API requests for security testing
- **Required For**:
  - SD-4: Attempt to create dancer for another studio
  - SD-9: Attempt to update another studio's dancer
  - SD-10: Attempt to delete another studio's entry
  - CD-10: Admin cross-studio modification test
- **Current Workaround**: Code review confirms RBAC protections exist
- **Possible Solutions**:
  - Playwright request interception
  - Postman/Insomnia API collection
  - Custom testing scripts with fetch/axios
- **Status**: ⏳ PENDING

---

## 💡 Feature Requests (From Testing)

### 1. Bulk Dancer Import Validation
- **Priority**: ⚪ Low
- **Description**: CSV import exists but validation/error handling needs testing
- **Source**: SD-3 test notes
- **Status**: ⏳ PENDING

### 2. Reservation Rejection with Reason
- **Priority**: ⚪ Low
- **Description**: Allow detailed rejection reasons visible to studio directors
- **Source**: CD-6 test planning
- **Backend**: Already supports `internal_notes` field
- **Status**: ⏳ PENDING (need to test CD-6)

---

## ✅ Completed Features (Continued)

### 8. Competition Settings (Global Parameters)
- **Priority**: 🟡 High (Configuration Management)
- **Feature ID**: FEAT-CompetitionSettings
- **Status**: ✅ COMPLETED
- **Completed Date**: 2025-10-04
- **Commit**: 0afdd42
- **CADENCE Execution**: ✅ Multi-agent parallel execution (database → backend+frontend)

#### Implementation Summary
**Competition-wide settings management for Competition Directors**

**Database**:
- Created `competition_settings` table with JSONB storage
- 7 categories: routine_types, age_divisions, classification_levels, dance_styles, time_limits, scoring_rubric, awards
- RLS policies: public read, admin-only write
- Seeded 21 default settings

**Backend**:
- Created settings router with 5 procedures (getSettings, getAllSettings, updateSettings, createSetting, deleteSetting)
- Full Zod validation and RBAC enforcement
- Batch update support for efficient category-wide changes

**Frontend**:
- Created /dashboard/settings/competition page
- 7 tabbed categories with full CRUD interface
- Glassmorphic design with emoji icons
- Real-time loading/success/error states

**Files Created**:
- `supabase/migrations/20250104_add_competition_settings.sql`
- `src/server/routers/settings.ts`
- `src/app/dashboard/settings/competition/page.tsx`
- `src/components/CompetitionSettingsForm.tsx`

**Original Feature Description (for reference)**:
**Competition-wide settings management for Competition Directors**

Global configuration parameters that affect all events. Competition Directors can manage standard parameters including routine types, age divisions, classification levels, dance styles, time limits, scoring rubrics, and awards.

**Settings Categories**:

**Routine Types**:
- Solo (1 dancer)
- Duet/Trio (2–3 dancers)
- Small Group (4–9 dancers)
- Large Group (10–15 dancers)
- Line (16–24 dancers)
- Super Line (25+ dancers)
- Production (40+ dancers)

**Age Divisions**:
- Micro (5 & Under)
- Mini (6–8)
- Junior (9–11)
- Intermediate (12–14)
- Senior (15–17)
- Adult (18+)
- Note: Age based on average as of Jan 1

**Classification Levels**:
- Novice (≤3 hrs/week training)
- Part-Time (4–6 hrs/week training)
- Competitive (7+ hrs/week training)

**Dance Styles**:
- Jazz, Tap, Lyrical, Contemporary, Ballet, Pointe, Hip Hop, Acro, Musical Theatre, Open, Song & Dance, Specialty

**Time Limits** (by routine type):
- Solo/Duet/Trio: 3:00 min
- Small Group: 3:30 min
- Large Group: 4:00 min
- Line: 5:00 min
- Super Line: 6:00 min
- Production: 8:00 min
- Note: Overtime penalties apply

**Scoring Rubric**:
- 100 points per judge
- Platinum: 95–100
- Elite Gold: 90–94.9
- Gold: 85–89.9
- Silver: 80–84.9
- Bronze: 75–79.9
- Overall awards calculated by average

**Awards Configuration**:
- Top 10 (Solo)
- Top 3 (Duet/Trio)
- Top 3 (Groups/Lines/Productions)
- Custom awards: Adjudicators Choice, Entertainment, Choreography, Costume, Heart of EMPWR

#### Technical Implementation

**Database Schema**:
```sql
-- Use existing system_settings table or create competition_settings
CREATE TABLE IF NOT EXISTS competition_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  setting_category VARCHAR(100) NOT NULL, -- 'routine_types', 'age_divisions', etc.
  setting_key VARCHAR(100) NOT NULL,
  setting_value JSONB NOT NULL,
  display_order INT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(setting_category, setting_key)
);

-- Example data structure
{
  "routine_types": [
    { "key": "solo", "label": "Solo", "min_dancers": 1, "max_dancers": 1, "time_limit": 180 },
    { "key": "duet_trio", "label": "Duet/Trio", "min_dancers": 2, "max_dancers": 3, "time_limit": 180 }
  ],
  "age_divisions": [
    { "key": "micro", "label": "Micro", "min_age": 0, "max_age": 5 },
    { "key": "mini", "label": "Mini", "min_age": 6, "max_age": 8 }
  ],
  "scoring_rubric": [
    { "key": "platinum", "label": "Platinum", "min_score": 95, "max_score": 100 },
    { "key": "elite_gold", "label": "Elite Gold", "min_score": 90, "max_score": 94.9 }
  ]
}
```

**API Endpoints**:
- `GET /api/settings/competition` - Fetch all competition settings
- `PUT /api/settings/competition/:category` - Update settings by category
- `POST /api/settings/competition/:category/item` - Add new item to category
- `DELETE /api/settings/competition/:category/:key` - Remove item

**UI Components**:
- Competition Settings page (`/dashboard/settings/competition`)
- Tabbed interface for each category
- Inline editing with validation
- Add/remove items per category
- Drag-to-reorder display order
- Active/inactive toggle per item

**Files to Create/Modify**:
- Backend: `src/server/routers/settings.ts` (new router)
- Frontend: `src/app/dashboard/settings/competition/page.tsx` (new page)
- Frontend: `src/components/CompetitionSettingsForm.tsx` (new component)
- Schema: Update `prisma/schema.prisma` or use existing system_settings
- Navigation: Add "Competition Settings" to CD dashboard

**User Stories**:
- As a **Competition Director**, I can configure routine types and time limits that apply to all events
- As a **Competition Director**, I can define age divisions and classification levels used for categorization
- As a **Competition Director**, I can set scoring rubrics and award tiers
- As a **Studio Director**, I see these configured options when creating routines

**Integration Points**:
- Entry creation forms use configured routine types, age divisions, styles
- Scoring system uses configured rubric and award tiers
- Time validation uses configured time limits per routine type
- Reports and exports reference these settings

---

### 9. Entry Numbering & Sub-Entry Logic
- **Priority**: 🟡 High (Core scheduling feature)
- **Feature ID**: FEAT-EntryNumbering
- **Scheduled For**: Phase 4, Week 13 (Schedule Generation)
- **Status**: ✅ COMPLETED
- **Completed Date**: 2025-10-04
- **Commit**: cd645a2

#### Implementation Summary
**Industry-standard entry numbering system with auto-assignment starting at 100**

**CADENCE Multi-Agent Execution**: Database → Backend + Frontend (parallel)

**Database**:
- Created migration: `20250104_add_schedule_lock_fields.sql`
- Added `schedule_published_at`, `schedule_locked` to competitions table
- Created unique constraint for entry_number + suffix per competition
- Applied migration to Supabase database

**Backend** (scheduling router):
- Modified `autoScheduleSession`: auto-assigns entry numbers starting at 100
- Added `publishSchedule` mutation: locks schedule and prevents changes
- Added `assignLateSuffix` mutation: assigns letter suffixes to late entries
- Updated CSV/iCal/PDF exports to display entry numbers with suffixes

**Frontend**:
- **EntriesList**: Entry number badge display with gradient styling
- **SchedulingManager**: "Publish Schedule" button with lock status
- **LateSuffixModal**: Modal for late entry suffix assignment
- **UnscheduledEntries**: "Late Entry" button for suffix assignment

**Files Created** (3):
- `supabase/migrations/20250104_add_schedule_lock_fields.sql`
- `src/components/LateSuffixModal.tsx`
- `ENTRY_NUMBERING_IMPLEMENTATION.md`

**Files Modified** (5):
- `prisma/schema.prisma`
- `src/server/routers/scheduling.ts`
- `src/components/EntriesList.tsx`
- `src/components/SchedulingManager.tsx`
- `src/components/UnscheduledEntries.tsx`

#### Original Feature Description
**Industry-standard entry numbering system for competition scheduling**

**Entry Numbers:**
- Public-facing three-digit numbers begin at **100** (industry standard)
- Scoped per competition weekend (CompID) - each competition resets to 100
- Assigned during schedule generation by Competition Director
- Once assigned, entry numbers never change (locked after schedule published)
- Backend uses UUIDs for internal operations (never shown to users)

**Sub-Entries (Letter Suffixes):**
- Late additions manually designated by Competition Director
- Assigned as sub-entries with letter suffixes: `156a`, `156b`, `156c`
- Preserves numbering continuity without renumbering existing entries
- Appears in all dashboards, reports, PDFs, and judges' sheets

**Schedule Workflow:**
1. Studio Directors create entries (DRAFT) and assign dancers/categories/music
2. Competition Director runs "Generate Schedule" (auto-assigns times + entry numbers starting at 100)
3. Schedule published → entry numbers locked
4. Late entries → CD manually inserts with suffix (e.g., picks entry 156, adds 156a)

**Role Permissions:**
- **Competition Director**: Generate schedule, assign entry numbers, designate late entries with suffixes
- **Studio Director**: View assigned entry numbers (read-only), see scheduled times

#### Technical Implementation

**Database Schema Changes:**
```sql
ALTER TABLE competition_entries ADD COLUMN entry_number INT NULL;
ALTER TABLE competition_entries ADD COLUMN entry_suffix VARCHAR(5) NULL;
ALTER TABLE competition_entries ADD COLUMN scheduled_time TIMESTAMP NULL;
ALTER TABLE competition_entries ADD COLUMN is_late_entry BOOLEAN DEFAULT false;

-- Unique constraint: entry_number + suffix must be unique per competition
CREATE UNIQUE INDEX idx_entry_number_per_comp
ON competition_entries(competition_id, entry_number, COALESCE(entry_suffix, ''));
```

**Display Logic:**
- Combined format: `entry_number` + `entry_suffix` (e.g., "156" or "156a")
- Shown in: Entry lists, schedule views, scorecards, exports, PDFs

**Studio Director Dashboard:**
For each entry, display:
- Entry Number (e.g., 156a) - once scheduled
- ✅/❌ Dancers Assigned
- Category
- ✅/❌ Music Uploaded
- Scheduled Time (e.g., "Saturday 2:30 PM")
- Sortable/filterable table

**Files to Create/Modify:**
- Migration: `prisma/migrations/add_entry_numbering.sql`
- Schema: Update `prisma/schema.prisma` (competition_entries model)
- Backend: Update `src/server/routers/entry.ts` (add numbering logic)
- Backend: Create `src/server/routers/schedule.ts` (new router for scheduling)
- Frontend: Update `src/components/EntriesList.tsx` (show entry numbers)
- Frontend: Create `src/app/dashboard/scheduling/page.tsx` (CD scheduling UI)
- Types: Update generated Prisma types

**Related Features:**
- Requires Schedule Generation system (Phase 4, Week 13)
- Integrates with PDF export (Phase 4, Week 14)
- Affects Entry Management (Phase 3, Week 11)

---

### 10. Real-Time Scoring & Tabulation System
- **Priority**: 🔴 Critical (Competition Day Operations)
- **Feature ID**: FEAT-RealtimeScoring
- **Scheduled For**: Phase 4, Week 14 (Real-Time Scoring & Export System)
- **Status**: ✅ COMPLETE (Both Phase 1 & 2)
- **Phase 1 Completed**: 2025-10-04 (Commit: 3ca9066)
- **Phase 2 Completed**: 2025-10-04 (Commit: 16ba88c)

#### Phase 1 Implementation Summary (COMPLETED)
**Scoring system with automatic calculation and manual scoreboard refresh**

**CADENCE Multi-Agent Execution**: Database → Backend + Frontend (parallel)

**Database**:
- Added `calculated_score`, `award_level`, `category_placement` to competition_entries
- Added `scoring_ranges` JSONB to competitions with default award tiers
- Created performance indexes for scoring queries
- Applied migration: `20250104_add_scoring_calculation_fields.sql`

**Backend** (scoring router - 8 procedures):
- `submitScore`, `updateScore`: Judge score submission with auto-calculation
- `getScoresByEntry`, `getMyScores`, `getScoresByCompetition`: Score retrieval
- `getScoreboard`: Competition scoreboard with awards/placements
- `calculatePlacements`: Category placement calculation (1st, 2nd, 3rd)
- `recalculateCompetition`: Bulk recalculation for entire competition

**Frontend**:
- Judge Scoring Interface: Slider-based input (0-100) for 3 criteria
- Scoreboard: Entry numbers, scores, award levels, placements
- Manual refresh button (Phase 2 will add WebSocket/real-time)

**Award Levels**: Platinum (95-100), High Gold (90-94.9), Gold (85-89.9), Silver (80-84.9), Bronze (70-79.9)

**Files Created/Modified**:
- `supabase/migrations/20250104_add_scoring_calculation_fields.sql`
- `prisma/schema.prisma`, `src/server/routers/scoring.ts`
- `src/app/dashboard/scoring/page.tsx`, `src/app/dashboard/scoreboard/page.tsx`

**Phase 1 Status**: ✅ Manual scoring workflow functional

#### Phase 2 Implementation Summary (COMPLETED)
**Real-time scoreboard updates using Supabase Realtime subscriptions**

**CADENCE Execution**: Frontend-only implementation (no backend changes)

**Implementation**:
- Created `useRealtimeScores` custom hook with Supabase Realtime WebSocket subscriptions
- Subscribes to `competition_entries` UPDATE events filtered by `competition_id`
- Listens for changes to `calculated_score`, `award_level`, `category_placement` fields
- Auto-refetches scoreboard data when scoring fields change
- Connection status indicator (green = connected, red = disconnected)
- Error handling with automatic retry logic

**Frontend Updates**:
- Removed manual "Refresh" button from scoreboard
- Added real-time connection status indicator with visual feedback
- Error message display for connection issues
- Seamless integration with existing tRPC queries

**Technical Architecture**:
- Supabase Realtime EventSource-based WebSocket (Vercel serverless-friendly)
- Sub-second latency for score propagation
- Automatic cleanup on component unmount/competition change
- No backend changes (existing `calculateEntryScore` triggers DB updates automatically)
- Postgres change events propagated via Supabase Realtime infrastructure

**Files Created/Modified**:
- `src/hooks/useRealtimeScores.ts` (NEW - 78 lines)
- `src/app/dashboard/scoreboard/page.tsx` (MODIFIED - real-time integration)

**Phase 2 Status**: ✅ Real-time scoreboard updates functional

#### Original Feature Description
**Industry-standard real-time scoring system for competition day adjudication and live results**

**Judge Scoring Interface:**
- **Slider-based input** for each criterion (1-100 points):
  - Technique
  - Artistic/Performance
  - Musicality
  - Additional criteria (execution, choreography) as configured by CD
- **Entry number displayed** prominently for judge reference
- **Submit score** button triggers real-time processing

**Real-Time Calculation Engine:**
- **Immediate calculation** upon judge score submission (sub-second latency)
- **Average score** across all judges (typically 3 judges per panel)
- **Auto-categorization into award levels**:
  - Example: Platinum (90-100), High Gold (85-89.9), Gold (80-84.9), Silver (70-79.9)
  - CD defines exact ranges per competition (stored in database)
- **Category placements** calculated automatically (1st, 2nd, 3rd within age/category/level)
- **Tie-break rules** applied automatically:
  - Highest technique score wins
  - If tied, highest artistic score
  - If still tied, judges' discretion or shared placement

**Live Scoreboard:**
- **Real-time updates** via WebSocket or Server-Sent Events
- **Displays**:
  - Entry number (e.g., 156, 156a)
  - Routine title
  - Studio name
  - Current average score
  - Award level (Platinum, Gold, Silver)
  - Category placement (1st, 2nd, 3rd)
- **Auto-refresh** without manual page reload
- **Accessible to**:
  - Competition Director (always)
  - Optional: Public scoreboard (CD configurable)
  - Optional: Studio directors (view their own entries only)

**Performance Requirements:**
- **Sub-second latency**: Score submission → scoreboard update
- **Concurrent scoring**: Handle 3+ judges scoring simultaneously
- **High throughput**: 10+ entries per hour during peak competition
- **Database optimization**: Indexed queries, triggers for auto-calculation
- **Caching**: Redis or similar for leaderboard queries (if needed)

#### Technical Implementation

**Database Schema Changes:**
```sql
-- Competition-level award configuration
ALTER TABLE competitions ADD COLUMN scoring_ranges JSONB;
-- Example: {"platinum": [90, 100], "high_gold": [85, 89.9], "gold": [80, 84.9], "silver": [70, 79.9]}

-- Entry-level calculated fields
ALTER TABLE competition_entries ADD COLUMN calculated_score DECIMAL(5,2);
ALTER TABLE competition_entries ADD COLUMN award_level VARCHAR(50);
ALTER TABLE competition_entries ADD COLUMN category_placement INT;

-- Real-time indexing for judges_scores
CREATE INDEX idx_scores_realtime ON judges_scores(entry_id, created_at DESC);
CREATE INDEX idx_scores_by_judge ON judges_scores(judge_id, entry_id);
```

**API Endpoints:**
- `POST /api/scoring/submit` - Judge submits score (triggers real-time processing)
- `GET /api/scoring/leaderboard/:competitionId` - Current standings
- WebSocket: `/ws/scoring/:competitionId` - Real-time updates subscription

**Real-Time Update Flow:**
1. Judge submits score via slider interface
2. Score saved to `judges_scores` table
3. Database trigger calculates:
   - Average score for this entry (across all judges who have scored)
   - Award level (based on competition's scoring_ranges)
   - Category placement (re-sort all entries in same category)
4. Updated values saved to `competition_entries` table
5. WebSocket broadcast to all connected clients (scoreboard, CD dashboard)
6. Scoreboard UI updates instantly

**Competition Director Controls:**
- Define award level ranges at competition creation/edit
- Configure tie-break rules (technique priority, artistic fallback)
- Enable/disable public scoreboard visibility
- Manually adjust scores (override for errors/disputes)

**Files to Create/Modify:**
- Backend: `src/server/routers/scoring.ts` (enhanced for real-time)
- Backend: `src/lib/websocket.ts` (WebSocket server setup)
- Backend: Database triggers for auto-calculation
- Frontend: `src/app/dashboard/scoring/page.tsx` (judge interface with sliders)
- Frontend: `src/app/dashboard/scoreboard/page.tsx` (enhanced for real-time)
- Frontend: `src/components/LiveScoreboard.tsx` (WebSocket client)
- Frontend: `src/hooks/useRealtimeScores.ts` (WebSocket hook)

**Related Features:**
- Requires Entry Numbering system (Phase 4, Week 13)
- Integrates with Judge Management (Phase 3, Week 11)
- Outputs to PDF/CSV exports (Phase 4, Week 14)
- Feeds Analytics Dashboard (Phase 4, Week 15)

**User Stories:**
- As a **Judge**, I can score routines using sliders and see my scores submit instantly
- As a **Competition Director**, I can view real-time standings during competition and adjust award level ranges
- As a **Studio Director**, I can see my entries' scores and award levels update live (optional feature)
- As a **Stage Manager**, I can reference entry numbers on the scoreboard to call routines

---

## 📊 Summary

**Total Bugs**: 2 (2 fixed, 0 active)
**Completed Features**: 9 (Dancer Edit, Reservation Create, Terminology, Global Invoices, Dashboard Metrics, Batch Dancer Input, Dancer Assignment, Competition Settings, Entry Numbering)
**Missing Features**: 1 (API Testing Infrastructure - medium priority)
**Feature Requests**: 2 (low priority)
**Planned Features**: 1 (Real-Time Scoring)

**Recent Completions** (October 2025):
- ✅ Entry Numbering System (Oct 4) - Industry-standard numbering starting at 100, schedule locking, late entry suffixes
- ✅ Competition Settings (Oct 4) - CADENCE multi-agent execution, 7 categories with CRUD
- ✅ Phase 4.2: Dancer-to-Routine Assignment UI (Oct 4) - Two-panel click-to-assign interface
- ✅ Phase 4.1: Multi-Row Dancer Batch Input (Oct 4) - Spreadsheet-style batch creation
- ✅ Phase 3.2: Dashboard Metrics Enhancement (Oct 4) - Unpaid invoices tracking
- ✅ Phase 3.1: Global Invoices View for CDs (Oct 4) - Revenue and payment management
- ✅ Phase 2 Terminology Standardization (Oct 4) - Competition→Event, Entries→Routines across 20 files
- ✅ Reservation Create UI (Oct 2) - Enables studio director workflow
- ✅ Dancer Edit UI (Oct 2) - Enables dancer management

**Critical Path**:
1. **Real-Time Scoring & Tabulation** - Critical for competition day operations (Next Priority)
3. **Schedule Export** - PDF/CSV/iCal formats for print/distribution

**Full Workflow Documentation**: See `COMPETITION_WORKFLOW.md` for complete industry-standard end-to-end process.
