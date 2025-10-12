# Task: Integrate 5 Codex Components into UI

**Priority**: HIGH (Post-Demo Round)
**Estimate**: 1.5 hours
**Status**: Ready for Codex

---

## Context

5 components were built by Codex and exist in `src/components/` but are NOT integrated into any pages. They need to be wired up to the UI following existing patterns.

**Components to Integrate**:
1. QuickStatsWidget.tsx (31 lines)
2. CompetitionFilter.tsx (84 lines)
3. RoutineStatusTimeline.tsx (167 lines)
4. EntryEditModal.tsx (155 lines)
5. JudgeBulkImportModal.tsx (169 lines)

---

## Sub-Task 1: QuickStatsWidget (15 min)

### Goal
Add QuickStatsWidget to both dashboard landing pages.

### Files to Modify
- `src/components/StudioDirectorDashboard.tsx`
- `src/components/CompetitionDirectorDashboard.tsx`

### Implementation

**StudioDirectorDashboard.tsx:**
```typescript
// Add import at top
import QuickStatsWidget from './QuickStatsWidget';

// Add after line 124 (after StudioDirectorStats component)
<QuickStatsWidget />
```

**CompetitionDirectorDashboard.tsx:**
```typescript
// Add import at top
import QuickStatsWidget from './QuickStatsWidget';

// Add after line 153 (after DashboardStats component)
<QuickStatsWidget />
```

### Verification
- ✅ Widget appears on Studio Director dashboard
- ✅ Widget appears on Competition Director dashboard
- ✅ No TypeScript errors
- ✅ Glassmorphic styling matches existing components

---

## Sub-Task 2: CompetitionFilter (15 min)

### Goal
Extract filter state from EntriesList and replace with CompetitionFilter component.

### Files to Modify
- `src/components/EntriesList.tsx`

### Current State (lines 17-19)
```typescript
const [filter, setFilter] = useState<'all' | 'draft' | 'registered' | 'confirmed' | 'cancelled'>('all');
const [selectedCompetition, setSelectedCompetition] = useState<string>('all');
```

### Implementation

**At top of EntriesList.tsx:**
```typescript
import CompetitionFilter from './CompetitionFilter';
```

**Replace inline filter UI** (find the filter dropdown section) with:
```typescript
<CompetitionFilter
  selectedCompetition={selectedCompetition}
  onCompetitionChange={setSelectedCompetition}
  filter={filter}
  onFilterChange={setFilter}
/>
```

**Remove**: Any existing filter dropdown JSX (keep the state hooks)

### Verification
- ✅ Filter dropdown still works
- ✅ Competition selection still works
- ✅ Filter persists to localStorage (CompetitionFilter handles this)
- ✅ No duplicate filter UI

---

## Sub-Task 3: RoutineStatusTimeline (20 min)

### Goal
Add timeline to entry details page showing routine status progression.

### Files to Modify
- `src/app/dashboard/entries/[id]/page.tsx`

### Current State (line 54)
```typescript
<EntryDetails entryId={id} />
```

### Implementation

**After EntryDetails component** (around line 55):
```typescript
import RoutineStatusTimeline from '@/components/RoutineStatusTimeline';

// Inside return, after EntryDetails
<div className="mt-6">
  <RoutineStatusTimeline entryId={id} />
</div>
```

### Verification
- ✅ Timeline appears below entry details
- ✅ Shows status progression (draft → registered → confirmed)
- ✅ Compact variant used if specified
- ✅ Responsive on mobile

---

## Sub-Task 4: EntryEditModal (20 min)

### Goal
Add quick-edit modal to entries list for inline editing.

### Files to Modify
- `src/components/EntriesList.tsx`

### Implementation

**At top:**
```typescript
import EntryEditModal from './EntryEditModal';
import { useState } from 'react'; // if not already imported
```

**Add state for modal** (after existing useState declarations):
```typescript
const [editingEntry, setEditingEntry] = useState<any>(null);
const [showEditModal, setShowEditModal] = useState(false);
```

**Add "Quick Edit" button** to each entry card (inside the card map):
```typescript
<button
  onClick={() => {
    setEditingEntry(entry);
    setShowEditModal(true);
  }}
  className="px-3 py-1.5 bg-blue-500/20 text-blue-400 border border-blue-400/30 rounded hover:bg-blue-500/30 transition-colors text-sm"
>
  ✏️ Quick Edit
</button>
```

**Add modal at bottom** (before closing component):
```typescript
{showEditModal && editingEntry && (
  <EntryEditModal
    entry={editingEntry}
    onClose={() => {
      setShowEditModal(false);
      setEditingEntry(null);
    }}
    onSuccess={() => {
      refetch(); // Refresh entries list
      setShowEditModal(false);
      setEditingEntry(null);
    }}
  />
)}
```

### Verification
- ✅ "Quick Edit" button appears on entry cards
- ✅ Modal opens with entry data pre-filled
- ✅ Saving updates entry and closes modal
- ✅ Cancel button closes modal without changes
- ✅ List refreshes after successful edit

---

## Sub-Task 5: JudgeBulkImportModal (20 min)

### Goal
Add CSV bulk import to judges page.

### Files to Modify
- `src/app/dashboard/judges/page.tsx`

### Current State (line 143-150)
```typescript
<button
  onClick={() => setShowAddModal(true)}
  disabled={!selectedCompetition}
  className="px-6 py-2 bg-gradient-to-r from-pink-500 to-purple-500 text-white rounded-lg hover:shadow-lg transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
>
  ➕ Add Judge
</button>
```

### Implementation

**At top:**
```typescript
import JudgeBulkImportModal from '@/components/JudgeBulkImportModal';
```

**Add state** (after showEditModal state):
```typescript
const [showBulkImportModal, setShowBulkImportModal] = useState(false);
```

**Add "Bulk Import" button** (next to "Add Judge" button at line 143):
```typescript
<div className="flex items-end gap-3">
  <button
    onClick={() => setShowAddModal(true)}
    disabled={!selectedCompetition}
    className="px-6 py-2 bg-gradient-to-r from-pink-500 to-purple-500 text-white rounded-lg hover:shadow-lg transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
  >
    ➕ Add Judge
  </button>
  <button
    onClick={() => setShowBulkImportModal(true)}
    disabled={!selectedCompetition}
    className="px-6 py-2 bg-white/10 backdrop-blur-md text-white rounded-lg border border-white/20 hover:bg-white/20 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
  >
    📄 Bulk Import CSV
  </button>
</div>
```

**Add modal at bottom** (before closing div at line 528):
```typescript
{showBulkImportModal && (
  <JudgeBulkImportModal
    competitionId={selectedCompetition}
    onClose={() => setShowBulkImportModal(false)}
    onSuccess={() => {
      refetchJudges();
      setShowBulkImportModal(false);
    }}
  />
)}
```

### Verification
- ✅ "Bulk Import CSV" button appears next to "Add Judge"
- ✅ Modal opens with CSV upload interface
- ✅ CSV parsing works with validation
- ✅ Judges imported and list refreshes
- ✅ Error handling for invalid CSV format

---

## Quality Gates (MANDATORY)

Before marking complete, verify ALL:

1. ✅ **TypeScript compiles**: `npm run build` succeeds
2. ✅ **All imports correct**: No missing/circular dependencies
3. ✅ **Glassmorphic design**: All components match existing style
4. ✅ **Responsive**: Works on mobile (320px width)
5. ✅ **No console errors**: Check browser console
6. ✅ **State management**: Modals close properly, lists refresh

---

## Deliverables

Output file: `codex-tasks/outputs/integrate_codex_components_result.md`

Include:
1. All file changes made
2. Line numbers modified
3. Any issues encountered
4. Build output (success/fail)
5. Screenshots of each integrated component (describe what you see)

---

## Reference Files

**Read these for patterns:**
- `src/components/StudioDirectorDashboard.tsx` - Dashboard structure
- `src/components/EntriesList.tsx` - List component with modals
- `src/components/DancerCSVImport.tsx` - CSV import pattern
- `src/app/dashboard/judges/page.tsx` - Existing judge management

**Components being integrated:**
- `src/components/QuickStatsWidget.tsx`
- `src/components/CompetitionFilter.tsx`
- `src/components/RoutineStatusTimeline.tsx`
- `src/components/EntryEditModal.tsx`
- `src/components/JudgeBulkImportModal.tsx`

---

**Start Time**: [Record when you start]
**Expected Duration**: 1.5 hours
