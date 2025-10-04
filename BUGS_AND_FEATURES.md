# Bugs & Features Tracker

**Last Updated**: 2025-10-04
**Source**: RBAC Golden Test Results (TEST_RESULTS.md) + Phase 2 Implementation

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

## 🎯 Planned Features (Roadmap)

### 1. Entry Numbering & Sub-Entry Logic
- **Priority**: 🟡 High (Core scheduling feature)
- **Feature ID**: FEAT-EntryNumbering
- **Scheduled For**: Phase 4, Week 13 (Schedule Generation)
- **Status**: ⏳ PLANNED

#### Feature Description
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

### 2. Real-Time Scoring & Tabulation System
- **Priority**: 🔴 Critical (Competition Day Operations)
- **Feature ID**: FEAT-RealtimeScoring
- **Scheduled For**: Phase 4, Week 14 (Real-Time Scoring & Export System)
- **Status**: ⏳ PLANNED

#### Feature Description
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
**Completed Features**: 3 (Dancer Edit UI, Reservation Create UI, Phase 2 Terminology)
**Missing Features**: 1 (API Testing Infrastructure - medium priority)
**Feature Requests**: 2 (low priority)
**Planned Features**: 2 (1 high priority, 1 critical)

**Recent Completions** (October 2025):
- ✅ Dancer Edit UI (Oct 2) - Enables dancer management
- ✅ Reservation Create UI (Oct 2) - Enables studio director workflow
- ✅ Phase 2 Terminology Standardization (Oct 4) - Competition→Event, Entries→Routines across 20 files

**Critical Path**:
1. **Entry Numbering & Sub-Entry Logic** - High priority, core scheduling feature (Week 13)
2. **Real-Time Scoring & Tabulation** - Critical for competition day operations (Week 14)
3. **API Testing Infrastructure** - Medium priority for security penetration testing

**Full Workflow Documentation**: See `COMPETITION_WORKFLOW.md` for complete industry-standard end-to-end process.
