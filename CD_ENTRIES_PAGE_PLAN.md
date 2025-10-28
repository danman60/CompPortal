# CD Entries Page Implementation Plan

## Session Goal
Build Competition Director view for `/dashboard/entries` showing all routines across all studios with comprehensive filtering.

## Design Principles to Match
- Use existing rebuild components patterns from `/dashboard/entries` (SD view)
- Glass-morphism cards with purple/blue gradients
- Smooth animations and transitions
- Consistent with `CompetitionDirectorDashboard` styling
- Responsive table design with hover effects

## Requirements

### User Story
**As a Competition Director**, I need to view all routines submitted by all studios for my tenant's competitions, with ability to filter by event, studio, status, and competition settings parameters.

### Scope
- **Who sees it:** Competition Directors and Super Admins only
- **What they see:** ALL entries across ALL studios for their tenant
- **What they can do:** View and filter (read-only in Phase 1)

### Data Requirements

**Entry Status Definition:**
- **Draft:** Entry created but reservation NOT yet summarized (`reservation.status != 'summarized'`)
- **Summarized:** Entry in summarized reservation (`reservation.status = 'summarized'`)

**Filter Architecture (Cumulative AND logic):**
```
├── Event/Competition (dropdown: All Events + tenant's competitions)
├── Studio (dropdown: All Studios + tenant's studios)
├── Status (toggle: All / Draft / Summarized)
└── Competition Settings (tenant-wide):
    ├── Category Type (Solo, Duo, Trio, Group, etc.)
    ├── Dance Category (Jazz, Ballet, Contemporary, etc.)
    └── Age Division (Petite, Junior, Teen, Senior, etc.)
```

**Key Insight:** Competition settings (age_divisions, dance_categories, etc.) are stored in `competition_settings` table and are **tenant-wide** - shared across ALL competitions within that tenant.

### Display Requirements

**Table Columns:**
1. Routine Title
2. Studio Name
3. Dancer Count (e.g., "3 dancers" - NOT individual names)
4. Category (e.g., "Solo")
5. Dance Category (e.g., "Jazz")
6. Age Division (e.g., "Teen")
7. Status Badge (Draft/Summarized with colored pill)
8. Total Fee (formatted currency)

**Interactions:**
- Click any row → Navigate to routine detail page
- Hover effects on rows
- Sort by columns (optional for Phase 1)

## Implementation Steps

### Step 1: Backend - tRPC Query
**File:** `src/server/routers/entry.ts`

Add new query: `getAllForCompetitionDirector`

```typescript
getAllForCompetitionDirector: protectedProcedure
  .query(async ({ ctx }) => {
    // Guard: Only CD/Super Admin
    if (!['competition_director', 'super_admin'].includes(ctx.userRole)) {
      throw new TRPCError({ code: 'FORBIDDEN' });
    }

    const entries = await prisma.competition_entries.findMany({
      where: {
        tenant_id: ctx.tenantId,
        status: { not: 'cancelled' }, // Exclude cancelled
      },
      include: {
        studios: { select: { name: true } },
        competitions: {
          select: {
            name: true,
            year: true,
            competition_settings_id: true
          }
        },
        reservations: {
          select: {
            status: true // To determine Draft vs Summarized
          }
        },
        dance_categories: { select: { name: true } },
        entry_size_categories: { select: { name: true } },
        age_divisions: { select: { name: true } },
        entry_dancers: {
          select: { id: true } // Just count, not names
        },
      },
      orderBy: { created_at: 'desc' },
    });

    return { entries };
  }),
```

**Key includes:**
- `studios` → studio name
- `competitions` → competition name/year
- `reservations` → status (to determine Draft vs Summarized)
- `dance_categories`, `entry_size_categories`, `age_divisions` → filter values
- `entry_dancers` → count only

### Step 2: Fetch Tenant-wide Competition Settings
**File:** `src/server/routers/competition.ts`

Add query: `getTenantSettings`

```typescript
getTenantSettings: protectedProcedure
  .query(async ({ ctx }) => {
    // Get first competition_settings for this tenant
    // (All competitions in tenant share same settings)
    const competition = await prisma.competitions.findFirst({
      where: { tenant_id: ctx.tenantId },
      include: {
        competition_settings: {
          select: {
            age_divisions: true,
            dance_categories: true,
            entry_size_categories: true,
          }
        }
      },
    });

    return {
      settings: competition?.competition_settings || null
    };
  }),
```

### Step 3: Frontend Components

#### 3.1 Main Container
**File:** `src/components/cd/CDEntriesPageContainer.tsx`

```typescript
"use client";

import { trpc } from '@/lib/trpc';
import { useMemo, useState } from 'react';
import { CDEntriesFilters } from './CDEntriesFilters';
import { CDEntriesTable } from './CDEntriesTable';

export function CDEntriesPageContainer() {
  const { data: entriesData, isLoading: entriesLoading } = trpc.entry.getAllForCompetitionDirector.useQuery();
  const { data: settingsData, isLoading: settingsLoading } = trpc.competition.getTenantSettings.useQuery();

  // Filter state
  const [selectedCompetition, setSelectedCompetition] = useState<string>('all');
  const [selectedStudio, setSelectedStudio] = useState<string>('all');
  const [selectedStatus, setSelectedStatus] = useState<'all' | 'draft' | 'summarized'>('all');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedDanceCategory, setSelectedDanceCategory] = useState<string>('all');
  const [selectedAgeDivision, setSelectedAgeDivision] = useState<string>('all');

  const entries = entriesData?.entries || [];
  const settings = settingsData?.settings;

  // Filter logic (cumulative AND)
  const filteredEntries = useMemo(() => {
    return entries.filter(entry => {
      // Competition filter
      if (selectedCompetition !== 'all' && entry.competition_id !== selectedCompetition) {
        return false;
      }

      // Studio filter
      if (selectedStudio !== 'all' && entry.studio_id !== selectedStudio) {
        return false;
      }

      // Status filter (Draft vs Summarized)
      if (selectedStatus !== 'all') {
        const isSummarized = entry.reservations?.status === 'summarized';
        if (selectedStatus === 'draft' && isSummarized) return false;
        if (selectedStatus === 'summarized' && !isSummarized) return false;
      }

      // Category type filter
      if (selectedCategory !== 'all' && entry.entry_size_categories?.name !== selectedCategory) {
        return false;
      }

      // Dance category filter
      if (selectedDanceCategory !== 'all' && entry.dance_categories?.name !== selectedDanceCategory) {
        return false;
      }

      // Age division filter
      if (selectedAgeDivision !== 'all' && entry.age_divisions?.name !== selectedAgeDivision) {
        return false;
      }

      return true;
    });
  }, [entries, selectedCompetition, selectedStudio, selectedStatus, selectedCategory, selectedDanceCategory, selectedAgeDivision]);

  // Extract unique values for filter dropdowns
  const uniqueCompetitions = useMemo(() => {
    const unique = new Map();
    entries.forEach(e => {
      if (e.competitions) {
        unique.set(e.competition_id, e.competitions);
      }
    });
    return Array.from(unique.values());
  }, [entries]);

  const uniqueStudios = useMemo(() => {
    const unique = new Map();
    entries.forEach(e => {
      if (e.studios) {
        unique.set(e.studio_id, e.studios);
      }
    });
    return Array.from(unique.values());
  }, [entries]);

  if (entriesLoading || settingsLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-900 via-indigo-900 to-blue-900 p-8">
        <div className="text-white text-center py-20">
          <div className="text-2xl">Loading entries...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-900 via-indigo-900 to-blue-900 p-8">
      <div className="mb-6">
        <h1 className="text-4xl font-bold text-white mb-2">All Routines</h1>
        <p className="text-gray-300">View and filter all submitted routines across all studios</p>
      </div>

      <CDEntriesFilters
        competitions={uniqueCompetitions}
        studios={uniqueStudios}
        settings={settings}
        selectedCompetition={selectedCompetition}
        selectedStudio={selectedStudio}
        selectedStatus={selectedStatus}
        selectedCategory={selectedCategory}
        selectedDanceCategory={selectedDanceCategory}
        selectedAgeDivision={selectedAgeDivision}
        onCompetitionChange={setSelectedCompetition}
        onStudioChange={setSelectedStudio}
        onStatusChange={setSelectedStatus}
        onCategoryChange={setSelectedCategory}
        onDanceCategoryChange={setSelectedDanceCategory}
        onAgeDivisionChange={setSelectedAgeDivision}
      />

      <div className="mt-6">
        <div className="text-white mb-4">
          Showing {filteredEntries.length} of {entries.length} routines
        </div>

        <CDEntriesTable entries={filteredEntries} />
      </div>
    </div>
  );
}
```

#### 3.2 Filters Component
**File:** `src/components/cd/CDEntriesFilters.tsx`

Match design from `EntriesFilters.tsx` - glass-morphism with purple gradients

```typescript
"use client";

interface CDEntriesFiltersProps {
  competitions: Array<{ id: string; name: string; year: number }>;
  studios: Array<{ id: string; name: string }>;
  settings: any; // competition_settings
  selectedCompetition: string;
  selectedStudio: string;
  selectedStatus: 'all' | 'draft' | 'summarized';
  selectedCategory: string;
  selectedDanceCategory: string;
  selectedAgeDivision: string;
  onCompetitionChange: (value: string) => void;
  onStudioChange: (value: string) => void;
  onStatusChange: (value: 'all' | 'draft' | 'summarized') => void;
  onCategoryChange: (value: string) => void;
  onDanceCategoryChange: (value: string) => void;
  onAgeDivisionChange: (value: string) => void;
}

export function CDEntriesFilters({ ... }: CDEntriesFiltersProps) {
  return (
    <div className="bg-white/10 backdrop-blur-md rounded-xl border border-white/20 p-6">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {/* Competition Dropdown */}
        <div>
          <label className="block text-sm font-medium text-white mb-2">Event</label>
          <select
            value={selectedCompetition}
            onChange={(e) => onCompetitionChange(e.target.value)}
            className="w-full bg-white/10 border border-white/20 rounded-lg px-4 py-2 text-white"
          >
            <option value="all">All Events</option>
            {competitions.map(comp => (
              <option key={comp.id} value={comp.id}>
                {comp.name} {comp.year}
              </option>
            ))}
          </select>
        </div>

        {/* Studio Dropdown */}
        <div>
          <label className="block text-sm font-medium text-white mb-2">Studio</label>
          <select
            value={selectedStudio}
            onChange={(e) => onStudioChange(e.target.value)}
            className="w-full bg-white/10 border border-white/20 rounded-lg px-4 py-2 text-white"
          >
            <option value="all">All Studios</option>
            {studios.map(studio => (
              <option key={studio.id} value={studio.id}>
                {studio.name}
              </option>
            ))}
          </select>
        </div>

        {/* Status Toggle */}
        <div>
          <label className="block text-sm font-medium text-white mb-2">Status</label>
          <div className="flex gap-2">
            <button
              onClick={() => onStatusChange('all')}
              className={`flex-1 px-4 py-2 rounded-lg transition-all ${
                selectedStatus === 'all'
                  ? 'bg-white text-gray-900'
                  : 'bg-white/10 text-gray-300 hover:bg-white/20'
              }`}
            >
              All
            </button>
            <button
              onClick={() => onStatusChange('draft')}
              className={`flex-1 px-4 py-2 rounded-lg transition-all ${
                selectedStatus === 'draft'
                  ? 'bg-yellow-500 text-gray-900'
                  : 'bg-white/10 text-gray-300 hover:bg-white/20'
              }`}
            >
              Draft
            </button>
            <button
              onClick={() => onStatusChange('summarized')}
              className={`flex-1 px-4 py-2 rounded-lg transition-all ${
                selectedStatus === 'summarized'
                  ? 'bg-green-500 text-gray-900'
                  : 'bg-white/10 text-gray-300 hover:bg-white/20'
              }`}
            >
              Summarized
            </button>
          </div>
        </div>

        {/* Category Type */}
        {settings?.entry_size_categories && (
          <div>
            <label className="block text-sm font-medium text-white mb-2">Category Type</label>
            <select
              value={selectedCategory}
              onChange={(e) => onCategoryChange(e.target.value)}
              className="w-full bg-white/10 border border-white/20 rounded-lg px-4 py-2 text-white"
            >
              <option value="all">All Categories</option>
              {settings.entry_size_categories.map((cat: any) => (
                <option key={cat.id} value={cat.name}>{cat.name}</option>
              ))}
            </select>
          </div>
        )}

        {/* Dance Category */}
        {settings?.dance_categories && (
          <div>
            <label className="block text-sm font-medium text-white mb-2">Dance Category</label>
            <select
              value={selectedDanceCategory}
              onChange={(e) => onDanceCategoryChange(e.target.value)}
              className="w-full bg-white/10 border border-white/20 rounded-lg px-4 py-2 text-white"
            >
              <option value="all">All Dance Categories</option>
              {settings.dance_categories.map((cat: any) => (
                <option key={cat.id} value={cat.name}>{cat.name}</option>
              ))}
            </select>
          </div>
        )}

        {/* Age Division */}
        {settings?.age_divisions && (
          <div>
            <label className="block text-sm font-medium text-white mb-2">Age Division</label>
            <select
              value={selectedAgeDivision}
              onChange={(e) => onAgeDivisionChange(e.target.value)}
              className="w-full bg-white/10 border border-white/20 rounded-lg px-4 py-2 text-white"
            >
              <option value="all">All Age Divisions</option>
              {settings.age_divisions.map((div: any) => (
                <option key={div.id} value={div.name}>{div.name}</option>
              ))}
            </select>
          </div>
        )}
      </div>
    </div>
  );
}
```

#### 3.3 Table Component
**File:** `src/components/cd/CDEntriesTable.tsx`

```typescript
"use client";

import { useRouter } from 'next/navigation';

interface CDEntriesTableProps {
  entries: any[];
}

export function CDEntriesTable({ entries }: CDEntriesTableProps) {
  const router = useRouter();

  if (entries.length === 0) {
    return (
      <div className="text-center text-white/60 py-20">
        <div className="text-6xl mb-4">🎭</div>
        <div className="text-xl">No routines match your filters</div>
      </div>
    );
  }

  return (
    <div className="bg-white/10 backdrop-blur-md rounded-xl border border-white/20 overflow-hidden">
      <table className="w-full">
        <thead className="bg-white/5 border-b border-white/10">
          <tr>
            <th className="px-6 py-3 text-left text-xs font-medium text-white uppercase tracking-wider">
              Title
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-white uppercase tracking-wider">
              Studio
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-white uppercase tracking-wider">
              Dancers
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-white uppercase tracking-wider">
              Category
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-white uppercase tracking-wider">
              Dance
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-white uppercase tracking-wider">
              Age
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-white uppercase tracking-wider">
              Status
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-white uppercase tracking-wider">
              Total
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-white/10">
          {entries.map((entry) => {
            const isSummarized = entry.reservations?.status === 'summarized';
            const dancerCount = entry.entry_dancers?.length || 0;

            return (
              <tr
                key={entry.id}
                onClick={() => router.push(`/dashboard/entries/${entry.id}`)}
                className="hover:bg-white/5 cursor-pointer transition-colors"
              >
                <td className="px-6 py-4 text-sm text-white">
                  {entry.title}
                </td>
                <td className="px-6 py-4 text-sm text-gray-300">
                  {entry.studios?.name}
                </td>
                <td className="px-6 py-4 text-sm text-gray-300">
                  {dancerCount} {dancerCount === 1 ? 'dancer' : 'dancers'}
                </td>
                <td className="px-6 py-4 text-sm text-gray-300">
                  {entry.entry_size_categories?.name}
                </td>
                <td className="px-6 py-4 text-sm text-gray-300">
                  {entry.dance_categories?.name}
                </td>
                <td className="px-6 py-4 text-sm text-gray-300">
                  {entry.age_divisions?.name}
                </td>
                <td className="px-6 py-4 text-sm">
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                    isSummarized
                      ? 'bg-green-500/20 text-green-200 border border-green-500/50'
                      : 'bg-yellow-500/20 text-yellow-200 border border-yellow-500/50'
                  }`}>
                    {isSummarized ? 'Summarized' : 'Draft'}
                  </span>
                </td>
                <td className="px-6 py-4 text-sm text-white font-semibold">
                  ${Number(entry.total_fee || 0).toFixed(2)}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
```

### Step 4: Route Update
**File:** `src/app/dashboard/entries/page.tsx`

Add role-based conditional rendering:

```typescript
import { createClient } from '@/lib/supabase-server-client';
import { redirect } from 'next/navigation';
import { EntriesPageContainer } from '@/components/rebuild/entries/EntriesPageContainer';
import { CDEntriesPageContainer } from '@/components/cd/CDEntriesPageContainer';

export default async function EntriesPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  // Get user role
  const { data: userProfile } = await supabase
    .from('user_profiles')
    .select('role')
    .eq('id', user.id)
    .single();

  const isCD = ['competition_director', 'super_admin'].includes(userProfile?.role);

  // Conditional rendering based on role
  if (isCD) {
    return <CDEntriesPageContainer />;
  }

  return <EntriesPageContainer />;
}
```

## Testing Checklist

- [ ] Build passes
- [ ] CD sees all entries across all studios
- [ ] SD still sees only their entries
- [ ] Filters work cumulatively (AND logic)
- [ ] Competition settings load from tenant
- [ ] Draft vs Summarized status accurate
- [ ] Dancer count shows correctly (not names)
- [ ] Click row navigates to detail
- [ ] Responsive on mobile
- [ ] No cross-tenant data leaks

## Reference Files to Match Design
- `src/components/rebuild/entries/EntriesPageContainer.tsx`
- `src/components/rebuild/entries/EntriesFilters.tsx`
- `src/components/CompetitionDirectorDashboard.tsx`
- `src/components/DashboardStats.tsx`

## Phase 1 Spec References
- Entry model: Phase1 spec lines 30-100
- Competition settings: Phase1 spec lines 73-85
- Reservation status: Phase1 spec lines 190-198
