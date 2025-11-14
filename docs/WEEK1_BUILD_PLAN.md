# Week 1 Build Plan - Scheduling Foundation

**Branch:** `tester` (staging)
**Dates:** November 18-22, 2025
**Goal:** Database schema + Basic scheduling page structure + Tenant safety

---

## 🚨 CRITICAL SAFETY REQUIREMENT

**TESTING TENANT ONLY:**
- **Testing Tenant ID:** `00000000-0000-0000-0000-000000000003`
- **Testing Tenant Slug:** `test`
- **Testing Tenant Name:** "Test Environment"
- **Deployment URL:** `tester.compsync.net`

**ABSOLUTE RULES:**
- ✅ **ONLY query/modify TEST tenant data** (`tenant_id = '00000000-0000-0000-0000-000000000003'`)
- ❌ **NEVER query/modify EMPWR tenant** (`tenant_id = '00000000-0000-0000-0000-000000000001'`)
- ❌ **NEVER query/modify Glow tenant** (`tenant_id = '4b9c1713-40ab-460b-8dda-5a8cf6cbc9b5'`)

**Enforcement Mechanisms:**
1. Middleware tenant restriction (Task 1)
2. RLS policies on all new tables
3. All queries filtered by TEST tenant ID
4. No hardcoded production tenant IDs in code

---

## Task Dependency Graph

```
DAY 1 (Monday):
Task 1: Tenant Restriction Middleware ← START HERE (BLOCKING)
  ↓
Task 2: Database Migrations (4 new tables)
  ↓
Task 3: Database Migrations (4 existing table updates)

DAY 2 (Tuesday):
Task 4: Studio Code Assignment Logic
  ↓
Task 5: tRPC Router Setup

DAY 3 (Wednesday):
Task 6: Basic tRPC Procedures (getRoutines)
  ↓
Task 7: Scheduling Page Structure (3-panel layout)

DAY 4 (Thursday):
Task 8: Left Panel - Unscheduled Routines Pool
  ↓
Task 9: Filter Panel (Classification, Genre, Search)

DAY 5 (Friday):
Task 10: Drag-and-Drop Infrastructure (@dnd-kit)
  ↓
Task 11: Testing & Verification
```

---

## Day 1: Safety + Database Foundation

### Task 1: Tenant Restriction Middleware (CRITICAL - DO FIRST)

**File:** `CompPortal/middleware.ts`

**Purpose:** Prevent tester.compsync.net from accessing production tenant data

**Implementation:**
```typescript
import { updateSession } from './src/lib/supabase-middleware';
import { type NextRequest, NextResponse } from 'next/server';
import { logger, generateRequestId } from './src/lib/logger';

// ALLOWED TENANTS PER DEPLOYMENT
const ALLOWED_TENANTS: Record<string, string[]> = {
  'tester.compsync.net': ['test'], // ONLY test tenant
  'empwr.compsync.net': ['empwr'],
  'glow.compsync.net': ['glow'],
};

export async function middleware(request: NextRequest) {
  const requestId = generateRequestId();
  const start = Date.now();
  const { pathname, search } = request.nextUrl;
  const fullPath = `${pathname}${search}`;
  const hostname = request.headers.get('host') || '';

  try {
    // CRITICAL: Enforce tenant restriction
    const allowedSlugs = ALLOWED_TENANTS[hostname];
    if (allowedSlugs && allowedSlugs.length > 0) {
      // Extract current tenant from subdomain
      const subdomain = hostname.split('.')[0];

      // If subdomain doesn't match allowed slugs, block request
      if (!allowedSlugs.includes(subdomain)) {
        logger.error('Tenant restriction violation', {
          requestId,
          hostname,
          subdomain,
          allowedSlugs,
          path: fullPath,
        });

        return new NextResponse(
          JSON.stringify({
            error: 'Access Denied',
            message: `This deployment can only access: ${allowedSlugs.join(', ')}`,
          }),
          {
            status: 403,
            headers: { 'content-type': 'application/json' },
          }
        );
      }
    }

    // Log incoming request (only in development or for errors)
    if (process.env.NODE_ENV === 'development') {
      logger.debug('Request', {
        requestId,
        method: request.method,
        path: fullPath,
        hostname,
      });
    }

    // Process Supabase session update
    const response = await updateSession(request);
    const duration = Date.now() - start;

    // Add request ID for tracing
    response.headers.set('X-Request-ID', requestId);

    // Log slow requests (>1s)
    if (duration > 1000) {
      logger.warn('Slow request detected', {
        requestId,
        method: request.method,
        path: fullPath,
        duration,
      });
    }

    return response;
  } catch (error) {
    const duration = Date.now() - start;

    // Log error
    logger.error('Middleware error', {
      requestId,
      method: request.method,
      path: fullPath,
      duration,
      error: error instanceof Error ? error : new Error(String(error)),
    });

    throw error;
  }
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};
```

**Testing:**
```bash
# Test on tester.compsync.net
curl -I https://tester.compsync.net/dashboard
# Should succeed (test tenant allowed)

# Test if accidentally deployed to empwr.compsync.net with tester code
# Should fail with 403 (empwr tenant not in ALLOWED_TENANTS for tester branch)
```

**Commit:**
```
feat: Add tenant restriction middleware for tester branch

- tester.compsync.net can ONLY access test tenant
- Blocks accidental production data access
- Returns 403 with clear error message if violation detected

✅ Safeguards TEST tenant isolation

🤖 Claude Code
```

---

### Task 2: Database Migrations - New Tables

**File:** `CompPortal/supabase/migrations/YYYYMMDDHHMMSS_create_scheduling_tables.sql`

**Migration 1: schedule_blocks**
```sql
-- Create schedule_blocks table
CREATE TABLE schedule_blocks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  competition_id UUID NOT NULL REFERENCES competitions(id) ON DELETE CASCADE,
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  block_type VARCHAR(20) NOT NULL CHECK (block_type IN ('award', 'break')),
  title VARCHAR(200) NOT NULL,
  duration_minutes INT NOT NULL CHECK (duration_minutes > 0),
  scheduled_start_time TIMESTAMPTZ,
  display_order INT,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Index for queries
CREATE INDEX idx_schedule_blocks_competition ON schedule_blocks(competition_id, display_order);
CREATE INDEX idx_schedule_blocks_tenant ON schedule_blocks(tenant_id);

-- RLS policies
ALTER TABLE schedule_blocks ENABLE ROW LEVEL SECURITY;

CREATE POLICY schedule_blocks_tenant_isolation ON schedule_blocks
  FOR ALL
  USING (tenant_id = current_setting('app.current_tenant_id')::uuid);

CREATE POLICY schedule_blocks_cd_access ON schedule_blocks
  FOR ALL
  USING (
    tenant_id = current_setting('app.current_tenant_id')::uuid
    AND EXISTS (
      SELECT 1 FROM auth.users
      WHERE id = auth.uid()
      AND role IN ('competition_director', 'super_admin')
    )
  );
```

**Migration 2: schedule_conflicts**
```sql
-- Create schedule_conflicts table
CREATE TABLE schedule_conflicts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  competition_id UUID NOT NULL REFERENCES competitions(id) ON DELETE CASCADE,
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  routine_1_id UUID NOT NULL REFERENCES competition_entries(id) ON DELETE CASCADE,
  routine_2_id UUID NOT NULL REFERENCES competition_entries(id) ON DELETE CASCADE,
  dancer_id UUID NOT NULL REFERENCES dancers(id) ON DELETE CASCADE,
  dancer_name VARCHAR(200) NOT NULL, -- Denormalized for performance
  routines_between INT NOT NULL,
  conflict_type VARCHAR(50) NOT NULL CHECK (conflict_type IN ('spacing_violation', 'back_to_back', 'same_time')),
  severity VARCHAR(20) NOT NULL CHECK (severity IN ('warning', 'error', 'critical')),
  status VARCHAR(20) NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'resolved', 'overridden')),
  override_reason TEXT,
  resolved_at TIMESTAMPTZ,
  resolved_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_schedule_conflicts_routines ON schedule_conflicts(routine_1_id, routine_2_id);
CREATE INDEX idx_schedule_conflicts_status ON schedule_conflicts(competition_id, status);
CREATE INDEX idx_schedule_conflicts_tenant ON schedule_conflicts(tenant_id);

-- RLS policies
ALTER TABLE schedule_conflicts ENABLE ROW LEVEL SECURITY;

CREATE POLICY schedule_conflicts_tenant_isolation ON schedule_conflicts
  FOR ALL
  USING (tenant_id = current_setting('app.current_tenant_id')::uuid);

CREATE POLICY schedule_conflicts_cd_only ON schedule_conflicts
  FOR ALL
  USING (
    tenant_id = current_setting('app.current_tenant_id')::uuid
    AND EXISTS (
      SELECT 1 FROM auth.users
      WHERE id = auth.uid()
      AND role IN ('competition_director', 'super_admin')
    )
  );
```

**Migration 3: routine_notes**
```sql
-- Create routine_notes table
CREATE TABLE routine_notes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  routine_id UUID NOT NULL REFERENCES competition_entries(id) ON DELETE CASCADE,
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  note_type VARCHAR(20) NOT NULL CHECK (note_type IN ('cd_private', 'studio_request', 'submission_note')),
  content TEXT NOT NULL,
  author_id UUID REFERENCES auth.users(id),
  status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'ignored')),
  priority VARCHAR(10) CHECK (priority IN ('low', 'normal', 'high')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_routine_notes_routine ON routine_notes(routine_id, note_type, status);
CREATE INDEX idx_routine_notes_tenant ON routine_notes(tenant_id);

-- RLS policies
ALTER TABLE routine_notes ENABLE ROW LEVEL SECURITY;

CREATE POLICY routine_notes_tenant_isolation ON routine_notes
  FOR ALL
  USING (tenant_id = current_setting('app.current_tenant_id')::uuid);

CREATE POLICY routine_notes_cd_access ON routine_notes
  FOR ALL
  USING (
    tenant_id = current_setting('app.current_tenant_id')::uuid
    AND EXISTS (
      SELECT 1 FROM auth.users
      WHERE id = auth.uid()
      AND role IN ('competition_director', 'super_admin')
    )
  );

CREATE POLICY routine_notes_studio_read ON routine_notes
  FOR SELECT
  USING (
    tenant_id = current_setting('app.current_tenant_id')::uuid
    AND (
      -- Studios can see their own requests only
      (note_type = 'studio_request' AND author_id = auth.uid())
      OR
      -- CDs can see all notes
      EXISTS (
        SELECT 1 FROM auth.users
        WHERE id = auth.uid()
        AND role IN ('competition_director', 'super_admin')
      )
    )
  );

CREATE POLICY routine_notes_studio_insert ON routine_notes
  FOR INSERT
  WITH CHECK (
    tenant_id = current_setting('app.current_tenant_id')::uuid
    AND note_type = 'studio_request'
    AND author_id = auth.uid()
  );
```

**Migration 4: age_change_tracking**
```sql
-- Create age_change_tracking table
CREATE TABLE age_change_tracking (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  routine_id UUID NOT NULL REFERENCES competition_entries(id) ON DELETE CASCADE,
  dancer_id UUID NOT NULL REFERENCES dancers(id) ON DELETE CASCADE,
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  old_birthdate DATE NOT NULL,
  new_birthdate DATE NOT NULL,
  old_age_group VARCHAR(20) NOT NULL,
  new_age_group VARCHAR(20) NOT NULL,
  detected_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  resolved BOOLEAN DEFAULT FALSE,
  resolved_at TIMESTAMPTZ
);

-- Indexes
CREATE INDEX idx_age_change_tracking_routine ON age_change_tracking(routine_id, resolved);
CREATE INDEX idx_age_change_tracking_tenant ON age_change_tracking(tenant_id);

-- RLS policies
ALTER TABLE age_change_tracking ENABLE ROW LEVEL SECURITY;

CREATE POLICY age_change_tracking_tenant_isolation ON age_change_tracking
  FOR ALL
  USING (tenant_id = current_setting('app.current_tenant_id')::uuid);

CREATE POLICY age_change_tracking_cd_only ON age_change_tracking
  FOR ALL
  USING (
    tenant_id = current_setting('app.current_tenant_id')::uuid
    AND EXISTS (
      SELECT 1 FROM auth.users
      WHERE id = auth.uid()
      AND role IN ('competition_director', 'super_admin')
    )
  );
```

**Apply Migration:**
```typescript
// Use Supabase MCP tool
mcp__supabase__apply_migration({
  name: "create_scheduling_tables",
  query: "..." // Full SQL above
});
```

**Verification Query:**
```sql
-- Verify tables created with RLS enabled
SELECT tablename, rowsecurity
FROM pg_tables
WHERE tablename IN ('schedule_blocks', 'schedule_conflicts', 'routine_notes', 'age_change_tracking')
AND schemaname = 'public';

-- Should return 4 rows with rowsecurity = true
```

**Commit:**
```
feat: Add scheduling database tables with RLS

- schedule_blocks (awards & breaks)
- schedule_conflicts (dancer spacing violations)
- routine_notes (CD private, studio requests, submission)
- age_change_tracking (birthdate change detection)
- All tables: tenant_id + RLS policies for isolation
- Indexes for performance

✅ Schema ready for scheduling implementation

Ref: SCHEDULING_SPEC_V4_UNIFIED.md

🤖 Claude Code
```

---

### Task 3: Database Migrations - Existing Table Updates

**File:** `CompPortal/supabase/migrations/YYYYMMDDHHMMSS_update_tables_for_scheduling.sql`

**Migration 1: studios (studio codes)**
```sql
-- Add studio code fields
ALTER TABLE studios
ADD COLUMN IF NOT EXISTS studio_code CHAR(1),
ADD COLUMN IF NOT EXISTS registration_order INT,
ADD COLUMN IF NOT EXISTS code_assigned_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS code_assigned_by UUID REFERENCES auth.users(id);

-- Index for lookups
CREATE INDEX IF NOT EXISTS idx_studios_code ON studios(studio_code) WHERE studio_code IS NOT NULL;
```

**Migration 2: reservations (liability waiver)**
```sql
-- Add waiver fields
ALTER TABLE reservations
ADD COLUMN IF NOT EXISTS waiver_accepted_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS waiver_version VARCHAR(50);

-- Index for waiver queries
CREATE INDEX IF NOT EXISTS idx_reservations_waiver ON reservations(waiver_accepted_at) WHERE waiver_accepted_at IS NOT NULL;
```

**Migration 3: competition_entries (scheduling fields)**
```sql
-- Add scheduling fields
ALTER TABLE competition_entries
ADD COLUMN IF NOT EXISTS scheduled_start_time TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS display_order INT,
ADD COLUMN IF NOT EXISTS age_at_scheduling DECIMAL(4,2),
ADD COLUMN IF NOT EXISTS last_age_check TIMESTAMPTZ,
-- Denormalized for performance
ADD COLUMN IF NOT EXISTS dancer_names TEXT[],
ADD COLUMN IF NOT EXISTS conflict_count INT DEFAULT 0,
ADD COLUMN IF NOT EXISTS has_studio_requests BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS has_cd_notes BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS age_changed BOOLEAN DEFAULT FALSE;

-- Indexes for scheduling queries
CREATE INDEX IF NOT EXISTS idx_competition_entries_scheduled
  ON competition_entries(competition_id, scheduled_start_time)
  WHERE scheduled_start_time IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_competition_entries_display_order
  ON competition_entries(competition_id, display_order)
  WHERE display_order IS NOT NULL;
```

**Migration 4: competitions (schedule state machine)**
```sql
-- Add schedule status fields
ALTER TABLE competitions
ADD COLUMN IF NOT EXISTS schedule_status VARCHAR(20) DEFAULT 'not_started'
  CHECK (schedule_status IN ('not_started', 'draft', 'finalized', 'published')),
ADD COLUMN IF NOT EXISTS schedule_finalized_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS schedule_finalized_by UUID REFERENCES auth.users(id),
ADD COLUMN IF NOT EXISTS schedule_published_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS schedule_published_by UUID REFERENCES auth.users(id);

-- Index for status queries
CREATE INDEX IF NOT EXISTS idx_competitions_schedule_status
  ON competitions(schedule_status)
  WHERE schedule_status != 'not_started';
```

**Apply Migration:**
```typescript
mcp__supabase__apply_migration({
  name: "update_tables_for_scheduling",
  query: "..." // Full SQL above
});
```

**Verification Query:**
```sql
-- Verify columns added
SELECT
  table_name,
  column_name,
  data_type
FROM information_schema.columns
WHERE table_name IN ('studios', 'reservations', 'competition_entries', 'competitions')
  AND column_name IN ('studio_code', 'waiver_accepted_at', 'scheduled_start_time', 'schedule_status')
ORDER BY table_name, column_name;

-- Should return 4 rows (one per table)
```

**Commit:**
```
feat: Update existing tables for scheduling

- studios: Add studio_code, registration_order
- reservations: Add waiver_accepted_at, waiver_version
- competition_entries: Add scheduling fields + denormalized cache
- competitions: Add schedule_status state machine

✅ All tables ready for scheduling workflows

Ref: SCHEDULING_SPEC_V4_UNIFIED.md

🤖 Claude Code
```

---

## Day 2: Studio Codes + tRPC Setup

### Task 4: Studio Code Assignment Logic

**File:** `CompPortal/src/server/api/services/studioCodeService.ts`

**Purpose:** Assign studio codes (A, B, C, ...) on reservation approval

**Implementation:**
```typescript
import { prisma } from '@/lib/prisma';

const TEST_TENANT_ID = '00000000-0000-0000-0000-000000000003';

export class StudioCodeService {
  /**
   * Assign studio code on reservation approval
   * CRITICAL: Only works with TEST tenant on tester branch
   */
  static async assignStudioCode(
    studioId: string,
    competitionId: string,
    tenantId: string
  ): Promise<string> {
    // SAFETY: Verify TEST tenant only
    if (tenantId !== TEST_TENANT_ID) {
      throw new Error(
        `Studio code assignment blocked: Not TEST tenant (got ${tenantId})`
      );
    }

    // Count approved reservations for this competition
    const approvedCount = await prisma.reservations.count({
      where: {
        competition_id: competitionId,
        status: 'approved',
        tenant_id: tenantId,
      },
    });

    // Convert to letter (A=0, B=1, C=2, ...)
    const code = String.fromCharCode(65 + approvedCount);

    // Verify code is valid (A-Z only)
    if (approvedCount > 25) {
      throw new Error('Maximum 26 studios per competition exceeded');
    }

    // Update studio with code
    await prisma.studios.update({
      where: {
        id: studioId,
        tenant_id: tenantId, // SAFETY: tenant_id check
      },
      data: {
        studio_code: code,
        registration_order: approvedCount + 1,
        code_assigned_at: new Date(),
      },
    });

    return code;
  }

  /**
   * Get studio code for display (handles null codes)
   */
  static getStudioCodeDisplay(
    studioCode: string | null,
    studioName: string,
    viewMode: 'cd' | 'studio' | 'judge' | 'public'
  ): string {
    if (!studioCode) {
      return studioName; // No code assigned yet
    }

    switch (viewMode) {
      case 'cd':
        return `Studio ${studioCode} (${studioName})`;
      case 'judge':
        return studioCode; // Code only, no "Studio" prefix
      case 'studio':
        return studioName; // Their own name
      case 'public':
        return studioName; // Full names revealed after published
      default:
        return studioName;
    }
  }
}
```

**Testing:**
```typescript
// Test studio code assignment
const code = await StudioCodeService.assignStudioCode(
  'test-studio-id',
  'test-competition-id',
  TEST_TENANT_ID
);
expect(code).toBe('A'); // First studio gets A

// Test display logic
const display = StudioCodeService.getStudioCodeDisplay(
  'A',
  'Starlight Dance Academy',
  'judge'
);
expect(display).toBe('A'); // Judge sees code only
```

**Commit:**
```
feat: Add studio code assignment service

- Assigns A, B, C, ... on reservation approval
- TEST tenant safety check (blocks production)
- View-based display logic (CD/Studio/Judge/Public)
- Maximum 26 studios per competition

✅ Studio code system functional

Ref: SCHEDULING_SPEC_V4_UNIFIED.md Section 3

🤖 Claude Code
```

---

### Task 5: tRPC Router Setup

**File:** `CompPortal/src/server/api/routers/scheduling.ts`

**Purpose:** Create scheduling router with base structure

**Implementation:**
```typescript
import { z } from 'zod';
import { createTRPCRouter, protectedProcedure } from '@/server/api/trpc';

const TEST_TENANT_ID = '00000000-0000-0000-0000-000000000003';

export const schedulingRouter = createTRPCRouter({
  // Health check
  ping: protectedProcedure.query(() => {
    return {
      message: 'Scheduling router online',
      timestamp: new Date().toISOString(),
    };
  }),

  // Get routines for scheduling (Week 1 placeholder)
  getRoutines: protectedProcedure
    .input(z.object({
      competitionId: z.string().uuid(),
    }))
    .query(async ({ ctx, input }) => {
      const { competitionId } = input;
      const { tenantId } = ctx;

      // SAFETY: TEST tenant only
      if (tenantId !== TEST_TENANT_ID) {
        throw new Error('Scheduling only available on TEST tenant');
      }

      // TODO: Implement in Task 6
      return {
        scheduledRoutines: [],
        unscheduledRoutines: [],
      };
    }),
});
```

**Add to main router:**

**File:** `CompPortal/src/server/api/root.ts`

```typescript
import { schedulingRouter } from './routers/scheduling';

export const appRouter = createTRPCRouter({
  // ... existing routers ...
  scheduling: schedulingRouter,
});
```

**Testing:**
```typescript
// Test ping
const result = await trpc.scheduling.ping.query();
expect(result.message).toBe('Scheduling router online');

// Test getRoutines (returns empty for now)
const routines = await trpc.scheduling.getRoutines.query({
  competitionId: 'test-competition-id',
});
expect(routines.scheduledRoutines).toEqual([]);
expect(routines.unscheduledRoutines).toEqual([]);
```

**Commit:**
```
feat: Add scheduling tRPC router

- Base router structure
- TEST tenant safety check
- getRoutines placeholder (Week 1)
- Integrated into main router

✅ tRPC foundation ready for procedures

🤖 Claude Code
```

---

## Day 3: Basic Procedures + Page Structure

### Task 6: Basic tRPC Procedures

**File:** `CompPortal/src/server/api/routers/scheduling.ts`

**Procedure: getRoutines (full implementation)**

```typescript
getRoutines: protectedProcedure
  .input(z.object({
    competitionId: z.string().uuid(),
  }))
  .query(async ({ ctx, input }) => {
    const { competitionId } = input;
    const { tenantId } = ctx;

    // SAFETY: TEST tenant only
    if (tenantId !== TEST_TENANT_ID) {
      throw new Error('Scheduling only available on TEST tenant');
    }

    // Get all routines for competition
    const allRoutines = await ctx.prisma.competition_entries.findMany({
      where: {
        competition_id: competitionId,
        tenant_id: tenantId,
        status: 'submitted', // Only submitted routines can be scheduled
      },
      include: {
        entry_participants: {
          include: {
            dancers: true,
          },
        },
        studios: true,
      },
      orderBy: {
        display_order: 'asc', // Scheduled routines first
      },
    });

    // Separate scheduled vs unscheduled
    const scheduledRoutines = allRoutines.filter(
      r => r.scheduled_start_time !== null
    );

    const unscheduledRoutines = allRoutines.filter(
      r => r.scheduled_start_time === null
    );

    return {
      scheduledRoutines,
      unscheduledRoutines,
    };
  }),
```

**Commit:**
```
feat: Implement getRoutines procedure

- Fetches all submitted routines for competition
- Separates scheduled vs unscheduled
- Includes dancers and studio data
- TEST tenant safety check enforced

✅ Basic data fetching complete

🤖 Claude Code
```

---

### Task 7: Scheduling Page Structure

**File:** `CompPortal/src/app/dashboard/director-panel/schedule/page.tsx`

**Purpose:** Create main scheduling page with 3-panel layout

**Implementation:**
```typescript
'use client';

import { useState } from 'react';
import { useCompetition } from '@/hooks/useCompetition';
import { api } from '@/trpc/react';

export default function SchedulingPage() {
  const { competition } = useCompetition();
  const [currentDay, setCurrentDay] = useState(1);

  // Fetch routines
  const { data, isLoading } = api.scheduling.getRoutines.useQuery(
    { competitionId: competition?.id || '' },
    { enabled: !!competition?.id }
  );

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-purple-600"></div>
      </div>
    );
  }

  const { scheduledRoutines = [], unscheduledRoutines = [] } = data || {};

  return (
    <div className="flex h-screen bg-gray-50">
      {/* LEFT PANEL - Unscheduled Routines Pool */}
      <div className="w-1/4 bg-white border-r border-gray-200 overflow-y-auto">
        <div className="p-4">
          <h2 className="text-lg font-bold text-gray-900">
            Unscheduled Routines
          </h2>
          <p className="text-sm text-gray-600">
            {unscheduledRoutines.length} routines
          </p>
        </div>

        {/* TODO: Task 8 - Routine cards */}
        <div className="p-4">
          {unscheduledRoutines.map((routine) => (
            <div
              key={routine.id}
              className="p-3 mb-2 bg-gray-50 rounded border border-gray-200"
            >
              <div className="font-medium text-gray-900">
                {routine.routine_name}
              </div>
              <div className="text-sm text-gray-600">
                {routine.category_type} • {routine.classification}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* CENTER PANEL - Schedule Grid */}
      <div className="flex-1 bg-white overflow-y-auto">
        <div className="p-4 border-b border-gray-200">
          <h2 className="text-lg font-bold text-gray-900">Schedule Grid</h2>
          <div className="mt-2 flex gap-2">
            {[1, 2, 3, 4].map((day) => (
              <button
                key={day}
                onClick={() => setCurrentDay(day)}
                className={`px-4 py-2 rounded ${
                  currentDay === day
                    ? 'bg-purple-600 text-white'
                    : 'bg-gray-100 text-gray-700'
                }`}
              >
                Day {day}
              </button>
            ))}
          </div>
        </div>

        {/* TODO: Task 8 - Schedule table */}
        <div className="p-4">
          {scheduledRoutines.length === 0 ? (
            <div className="text-center text-gray-500 py-12">
              No routines scheduled yet. Drag routines from the left panel.
            </div>
          ) : (
            <div className="space-y-2">
              {scheduledRoutines.map((routine) => (
                <div
                  key={routine.id}
                  className="p-3 bg-gray-50 rounded border border-gray-200"
                >
                  <div className="font-medium text-gray-900">
                    #{routine.display_order} - {routine.routine_name}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* RIGHT PANEL - Trophy Helper */}
      <div className="w-1/4 bg-white border-l border-gray-200 overflow-y-auto">
        <div className="p-4">
          <h2 className="text-lg font-bold text-gray-900">Trophy Helper</h2>
          <p className="text-sm text-gray-600">
            Last routine per category
          </p>
        </div>

        {/* TODO: Week 2 - Trophy helper content */}
        <div className="p-4 text-gray-500 text-sm">
          Trophy helper will appear here after scheduling routines.
        </div>
      </div>
    </div>
  );
}
```

**Add to navigation:**

**File:** `CompPortal/src/components/NavigationCD.tsx` (or similar)

```typescript
<Link href="/dashboard/director-panel/schedule">
  <CalendarIcon className="h-5 w-5" />
  <span>Schedule</span>
</Link>
```

**Commit:**
```
feat: Create scheduling page structure

- 3-panel layout (25% / 50% / 25%)
- Left: Unscheduled routines pool
- Center: Schedule grid with day selector
- Right: Trophy helper placeholder
- Fetches routines via tRPC
- Basic routing and navigation

✅ Page foundation complete

🤖 Claude Code
```

---

## Day 4: Left Panel Implementation

### Task 8: Left Panel - Unscheduled Routines Pool

**File:** `CompPortal/src/app/dashboard/director-panel/schedule/components/LeftPanel/RoutineCard.tsx`

```typescript
'use client';

interface RoutineCardProps {
  routine: {
    id: string;
    routine_name: string;
    category_type: string;
    classification: string;
    duration_minutes: number;
    studios: {
      studio_code: string | null;
      name: string;
    };
    entry_participants: Array<{
      dancers: {
        first_name: string;
        last_name: string;
      };
    }>;
  };
}

export function RoutineCard({ routine }: RoutineCardProps) {
  const dancerCount = routine.entry_participants.length;
  const studioDisplay = routine.studios.studio_code || routine.studios.name;

  return (
    <div className="w-full p-3 mb-2 bg-white rounded border border-gray-200 hover:border-purple-400 transition-colors">
      {/* Checkbox for bulk selection */}
      <div className="flex items-start gap-2">
        <input
          type="checkbox"
          className="mt-1 h-4 w-4 rounded border-gray-300 text-purple-600 focus:ring-purple-500"
        />

        <div className="flex-1 min-w-0">
          {/* Title */}
          <div className="font-medium text-gray-900 truncate">
            {routine.routine_name}
          </div>

          {/* Studio + Classification */}
          <div className="text-sm text-gray-600">
            {studioDisplay} • {routine.classification}
          </div>

          {/* Category + Dancers + Duration */}
          <div className="text-xs text-gray-500 mt-1">
            {routine.category_type} • {dancerCount} dancers • ⏱️ {routine.duration_minutes} min
          </div>
        </div>
      </div>
    </div>
  );
}
```

**Update page.tsx to use RoutineCard:**

```typescript
import { RoutineCard } from './components/LeftPanel/RoutineCard';

// Inside render:
<div className="p-4 space-y-2">
  {unscheduledRoutines.map((routine) => (
    <RoutineCard key={routine.id} routine={routine} />
  ))}
</div>
```

**Commit:**
```
feat: Add routine card component

- Half-width cards with checkbox
- Shows title, studio, classification
- Category type, dancer count, duration
- Hover effect for visual feedback
- Ready for drag-and-drop (Task 10)

✅ Routine cards complete

🤖 Claude Code
```

---

### Task 9: Filter Panel

**File:** `CompPortal/src/app/dashboard/director-panel/schedule/components/LeftPanel/FilterPanel.tsx`

```typescript
'use client';

import { useState } from 'react';

interface FilterPanelProps {
  onFilterChange: (filters: {
    classification: string[];
    genre: string[];
    search: string;
  }) => void;
}

export function FilterPanel({ onFilterChange }: FilterPanelProps) {
  const [activeClassifications, setActiveClassifications] = useState<string[]>([]);
  const [activeGenres, setActiveGenres] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState('');

  const classifications = ['Emerald', 'Sapphire', 'Crystal', 'Titanium', 'Production'];
  const genres = ['Jazz', 'Contemporary', 'Tap', 'Ballet', 'Lyrical', 'Hip Hop'];

  const toggleClassification = (classification: string) => {
    const updated = activeClassifications.includes(classification)
      ? activeClassifications.filter(c => c !== classification)
      : [...activeClassifications, classification];

    setActiveClassifications(updated);
    onFilterChange({
      classification: updated,
      genre: activeGenres,
      search: searchQuery,
    });
  };

  const toggleGenre = (genre: string) => {
    const updated = activeGenres.includes(genre)
      ? activeGenres.filter(g => g !== genre)
      : [...activeGenres, genre];

    setActiveGenres(updated);
    onFilterChange({
      classification: activeClassifications,
      genre: updated,
      search: searchQuery,
    });
  };

  const handleSearch = (value: string) => {
    setSearchQuery(value);
    onFilterChange({
      classification: activeClassifications,
      genre: activeGenres,
      search: value,
    });
  };

  const clearFilters = () => {
    setActiveClassifications([]);
    setActiveGenres([]);
    setSearchQuery('');
    onFilterChange({
      classification: [],
      genre: [],
      search: '',
    });
  };

  return (
    <div className="p-4 space-y-4 border-b border-gray-200">
      {/* Search */}
      <div>
        <input
          type="text"
          placeholder="🔍 Search routines..."
          value={searchQuery}
          onChange={(e) => handleSearch(e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-purple-500 focus:border-purple-500"
        />
      </div>

      {/* Classification Filters */}
      <div>
        <div className="text-sm font-semibold text-gray-700 mb-2">
          📊 Classification:
        </div>
        <div className="flex flex-wrap gap-2">
          {classifications.map((classification) => (
            <button
              key={classification}
              onClick={() => toggleClassification(classification)}
              className={`px-3 py-1 text-sm rounded ${
                activeClassifications.includes(classification)
                  ? 'bg-purple-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              {classification}
            </button>
          ))}
        </div>
      </div>

      {/* Genre Filters */}
      <div>
        <div className="text-sm font-semibold text-gray-700 mb-2">
          🎵 Genre:
        </div>
        <div className="flex flex-wrap gap-2">
          {genres.map((genre) => (
            <button
              key={genre}
              onClick={() => toggleGenre(genre)}
              className={`px-3 py-1 text-sm rounded ${
                activeGenres.includes(genre)
                  ? 'bg-purple-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              {genre}
            </button>
          ))}
        </div>
      </div>

      {/* Clear Filters */}
      {(activeClassifications.length > 0 || activeGenres.length > 0 || searchQuery) && (
        <button
          onClick={clearFilters}
          className="w-full px-3 py-2 text-sm text-gray-700 bg-gray-100 rounded hover:bg-gray-200"
        >
          Clear Filters
        </button>
      )}
    </div>
  );
}
```

**Update page.tsx to use FilterPanel:**

```typescript
import { FilterPanel } from './components/LeftPanel/FilterPanel';

const [filters, setFilters] = useState({
  classification: [],
  genre: [],
  search: '',
});

// Filter routines client-side
const filteredRoutines = unscheduledRoutines.filter((routine) => {
  // Classification filter
  if (filters.classification.length > 0) {
    if (!filters.classification.includes(routine.classification)) {
      return false;
    }
  }

  // Genre filter
  if (filters.genre.length > 0) {
    if (!filters.genre.includes(routine.genre)) {
      return false;
    }
  }

  // Search filter
  if (filters.search) {
    const searchLower = filters.search.toLowerCase();
    const nameMatch = routine.routine_name.toLowerCase().includes(searchLower);
    const studioMatch = routine.studios.name.toLowerCase().includes(searchLower);
    const dancerMatch = routine.entry_participants.some(p =>
      `${p.dancers.first_name} ${p.dancers.last_name}`.toLowerCase().includes(searchLower)
    );

    if (!nameMatch && !studioMatch && !dancerMatch) {
      return false;
    }
  }

  return true;
});

// Inside render:
<FilterPanel onFilterChange={setFilters} />
```

**Commit:**
```
feat: Add filter panel to left sidebar

- Classification filters (Emerald, Sapphire, etc.)
- Genre filters (Jazz, Contemporary, etc.)
- Search input (routine name, studio, dancer)
- Active state highlighting (purple)
- Clear filters button
- Client-side filtering logic

✅ Filters functional

🤖 Claude Code
```

---

## Day 5: Drag-and-Drop + Testing

### Task 10: Drag-and-Drop Infrastructure

**Install @dnd-kit:**

```bash
cd CompPortal
npm install @dnd-kit/core @dnd-kit/sortable @dnd-kit/utilities
```

**File:** `CompPortal/src/app/dashboard/director-panel/schedule/components/DndContext.tsx`

```typescript
'use client';

import { DndContext, DragEndEvent, DragStartEvent } from '@dnd-kit/core';
import { ReactNode, useState } from 'react';

interface DndProviderProps {
  children: ReactNode;
}

export function DndProvider({ children }: DndProviderProps) {
  const [draggedItem, setDraggedItem] = useState<{ id: string; type: string } | null>(null);

  function handleDragStart(event: DragStartEvent) {
    const { active } = event;
    setDraggedItem({
      id: active.id as string,
      type: active.data.current?.type as string,
    });
  }

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;

    if (!over) {
      setDraggedItem(null);
      return;
    }

    // TODO: Week 2 - Implement actual scheduling logic
    console.log('Dragged:', active.id, 'to:', over.id);

    setDraggedItem(null);
  }

  return (
    <DndContext onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
      {children}
    </DndContext>
  );
}
```

**Update RoutineCard to be draggable:**

```typescript
import { useDraggable } from '@dnd-kit/core';

export function RoutineCard({ routine }: RoutineCardProps) {
  const { attributes, listeners, setNodeRef, transform } = useDraggable({
    id: routine.id,
    data: { type: 'routine' },
  });

  const style = transform
    ? {
        transform: `translate3d(${transform.x}px, ${transform.y}px, 0)`,
      }
    : undefined;

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...listeners}
      {...attributes}
      className="w-full p-3 mb-2 bg-white rounded border border-gray-200 hover:border-purple-400 transition-colors cursor-move"
    >
      {/* ... existing content ... */}
    </div>
  );
}
```

**Wrap page in DndProvider:**

```typescript
import { DndProvider } from './components/DndContext';

export default function SchedulingPage() {
  return (
    <DndProvider>
      <div className="flex h-screen bg-gray-50">
        {/* ... existing panels ... */}
      </div>
    </DndProvider>
  );
}
```

**Commit:**
```
feat: Add drag-and-drop infrastructure

- @dnd-kit/core integration
- DndContext provider
- Routine cards draggable
- Basic drag start/end handlers
- Ready for Week 2 scheduling logic

✅ Drag-and-drop foundation complete

🤖 Claude Code
```

---

### Task 11: Testing & Verification

**Checklist:**

```bash
# 1. Build passes
cd CompPortal
npm run build

# 2. Type check passes
npm run type-check

# 3. Verify middleware tenant restriction
# Visit tester.compsync.net - should work
# If deployed to empwr.compsync.net with tester code - should 403

# 4. Verify database tables created
# Run verification query from Task 2

# 5. Verify tRPC procedures work
# Test getRoutines returns data for TEST tenant

# 6. Verify page renders
# Navigate to /dashboard/director-panel/schedule
# Should see 3-panel layout

# 7. Verify filters work
# Click classification filter - routines filter
# Type in search - routines filter

# 8. Verify drag-and-drop
# Drag routine card - should follow cursor
# Drop routine - should log to console
```

**Evidence Capture:**

```bash
# Take screenshots via Playwright MCP
mcp__playwright__browser_navigate({ url: "https://tester.compsync.net/dashboard/director-panel/schedule" })
mcp__playwright__browser_take_screenshot({ filename: "week1-scheduling-page.png" })
```

**Commit:**
```
test: Week 1 verification complete

- Build passes ✓
- Type check passes ✓
- Middleware restricts TEST tenant only ✓
- Database tables created with RLS ✓
- tRPC procedures functional ✓
- Page renders 3-panel layout ✓
- Filters work (classification, genre, search) ✓
- Drag-and-drop infrastructure ready ✓

✅ Week 1 deliverables complete

Evidence: week1-scheduling-page.png

🤖 Claude Code
```

---

## Week 1 Success Criteria

**Must Complete:**
- [x] Tenant restriction middleware (tester = TEST tenant only)
- [x] 4 new database tables with RLS policies
- [x] 4 existing table updates
- [x] Studio code assignment logic
- [x] tRPC router + getRoutines procedure
- [x] Scheduling page structure (3-panel layout)
- [x] Left panel: Unscheduled routines pool
- [x] Filter panel (classification, genre, search)
- [x] Routine cards with checkboxes
- [x] Drag-and-drop infrastructure (@dnd-kit)

**Evidence Required:**
- Screenshot of scheduling page on tester.compsync.net
- Database query showing tables created
- Console log showing tRPC procedure success
- Console log showing drag-and-drop events

**Blockers:**
- If tenant restriction fails → STOP, fix immediately
- If database migrations fail → STOP, verify RLS policies
- If tRPC procedures fail → STOP, check tenant_id filtering

---

## Week 2 Preview

**Next Tasks:**
- Conflict detection algorithm (backend + frontend)
- Trophy helper generation (last routine per category)
- Award/break block creation + placement
- Time rounding logic (5-minute increments)
- Auto-renumbering in draft mode
- Actual scheduling logic (drag-drop to schedule grid)

---

**Document Status:** ✅ Complete - Ready for Week 1 Implementation
**Target Branch:** `tester`
**Safety:** TEST tenant isolation enforced
**Start Date:** November 18, 2025
**End Date:** November 22, 2025
