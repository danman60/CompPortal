# Task: Update Navigation Terminology

**Priority**: MEDIUM (Workflow Redesign)
**Estimate**: 1 hour
**Status**: Ready for Codex

---

## Context

Replace old terminology with new user-friendly terms across the entire application.

**Changes Required**:
- "Entries" → "Routines" (everywhere)
- "Spaces Requested" → "Routines Requested"
- "Spaces Confirmed" → "Routines Allocated"
- "Profile Settings" → "My Studio" (beside Sign Out)
- Dashboard tabs: "DANCERS • RESERVATIONS • ROUTINES"

---

## Implementation Strategy

### 1. Global Find & Replace

**Search patterns**:
```bash
# Find all occurrences
grep -r "entries\|Entries\|ENTRIES" src/
grep -r "spaces requested\|Spaces Requested" src/
grep -r "spaces confirmed\|Spaces Confirmed" src/
grep -r "Profile Settings" src/
```

**Replace rules**:
```
Entries → Routines
entries → routines
ENTRIES → ROUTINES

Spaces Requested → Routines Requested
spaces requested → routines requested

Spaces Confirmed → Routines Allocated
spaces confirmed → routines allocated

Profile Settings → My Studio
```

---

## Files to Modify

### Priority 1: Navigation & Headers

**Dashboard Navigation** (`src/components/*Dashboard.tsx`):
```typescript
// BEFORE
{ id: 'entries', href: '/dashboard/entries', icon: '🎭', title: 'My Entries' }

// AFTER
{ id: 'routines', href: '/dashboard/entries', icon: '🎭', title: 'My Routines' }
```

**Page Headers** (all dashboard pages):
```tsx
// BEFORE
<h1>My Entries</h1>

// AFTER
<h1>My Routines</h1>
```

### Priority 2: Component Names (Keep as-is or rename)

**Decision**: Keep component file names as-is (`EntriesList.tsx`, `EntryForm.tsx`) to avoid breaking imports. Only update display text.

**But update display text inside components**:
```tsx
// EntriesList.tsx
<h2>My Routines</h2> // Not "My Entries"

// EntryForm.tsx
<h3>Create Routine</h3> // Not "Create Entry"
```

### Priority 3: Reservation Fields

**ReservationsList.tsx**:
```tsx
// BEFORE
<div>Spaces Requested: {reservation.routines_requested}</div>
<div>Spaces Confirmed: {reservation.routines_confirmed}</div>

// AFTER
<div>Routines Requested: {reservation.routines_requested}</div>
<div>Routines Allocated: {reservation.routines_confirmed}</div>
```

**ReservationForm.tsx**:
```tsx
// BEFORE
<label>Spaces Requested</label>
<label>Spaces Confirmed</label>

// AFTER
<label>Routines Requested</label>
<label>Routines Allocated</label>
```

### Priority 4: Dashboard Cards

**SortableDashboardCards.tsx** or Dashboard components:
```tsx
const STUDIO_DIRECTOR_CARDS = [
  {
    id: 'routines', // Keep id as-is for localStorage
    href: '/dashboard/entries', // Keep href as-is (URL doesn't change)
    icon: '🎭',
    title: 'My Routines', // UPDATE THIS
    description: 'Create and edit routines', // UPDATE THIS
  }
];
```

### Priority 5: Profile Settings Link

**Dashboard Layout** (`src/app/dashboard/page.tsx` or Layout):
```tsx
// BEFORE
<Link href="/dashboard/settings/profile">
  <span className="text-xl">⚙️</span>
  <span>Profile Settings</span>
</Link>

// AFTER
<Link href="/dashboard/settings/profile">
  <span className="text-xl">🏢</span>
  <span>My Studio</span>
</Link>
```

---

## Comprehensive File List

### Components
- `src/components/StudioDirectorDashboard.tsx`
- `src/components/CompetitionDirectorDashboard.tsx`
- `src/components/EntriesList.tsx` (display text only)
- `src/components/EntryForm.tsx` (display text only)
- `src/components/EntryDetails.tsx` (display text only)
- `src/components/ReservationsList.tsx`
- `src/components/ReservationForm.tsx`
- `src/components/SortableDashboardCards.tsx`

### Pages
- `src/app/dashboard/entries/page.tsx`
- `src/app/dashboard/entries/create/page.tsx`
- `src/app/dashboard/entries/[id]/page.tsx`
- `src/app/dashboard/entries/[id]/edit/page.tsx`
- `src/app/dashboard/reservations/page.tsx`
- `src/app/dashboard/page.tsx` (Profile Settings link)

### API/Backend (Database field names stay the same)
- **DO NOT CHANGE**: Database table names (`entries`, `reservations` tables)
- **DO NOT CHANGE**: Field names in Prisma schema
- **ONLY UPDATE**: User-facing labels and descriptions

---

## Find & Replace Script

**Create helper script** (optional): `scripts/update-terminology.sh`

```bash
#!/bin/bash
# Update terminology across codebase

# Function to replace in all tsx/ts files
replace_term() {
  local old="$1"
  local new="$2"
  find src/ -type f \( -name "*.tsx" -o -name "*.ts" \) -exec sed -i "s/$old/$new/g" {} \;
}

# User-facing text only (not variable names)
replace_term "My Entries" "My Routines"
replace_term "Create Entry" "Create Routine"
replace_term "Edit Entry" "Edit Routine"
replace_term "Spaces Requested" "Routines Requested"
replace_term "Spaces Confirmed" "Routines Allocated"
replace_term "Profile Settings" "My Studio"

echo "✅ Terminology updated"
```

**Note**: Manual review recommended after script run.

---

## What NOT to Change

### Database Layer
- ❌ Table names: `entries` stays as-is
- ❌ Field names: `entry_id`, `entries.routine_title`
- ❌ TypeScript types: `Entry` interface name can stay
- ❌ Component filenames: `EntriesList.tsx` stays as-is

### API Routes
- ❌ tRPC router names: `entry.create`, `entry.getAll`
- ❌ URL paths: `/dashboard/entries/[id]`

### Only Change
- ✅ User-visible text: Headers, labels, buttons
- ✅ Descriptions and help text
- ✅ Dashboard card titles

---

## Quality Gates

1. ✅ **All visible "Entries" → "Routines"**: Check all pages
2. ✅ **"Spaces" → "Routines"**: In reservation views
3. ✅ **"Profile Settings" → "My Studio"**: Dashboard header
4. ✅ **No broken references**: Component names unchanged
5. ✅ **TypeScript compiles**: No import errors
6. ✅ **Database queries work**: Field names unchanged
7. ✅ **URLs still work**: Paths unchanged

---

## Testing Checklist

1. Navigate to `/dashboard` → Check card says "My Routines"
2. Click "My Routines" → Page header says "My Routines"
3. Create new routine → Form says "Create Routine"
4. View reservations → Says "Routines Requested" and "Routines Allocated"
5. Check profile link → Says "My Studio" not "Profile Settings"

---

## Deliverables

Output file: `codex-tasks/outputs/update_navigation_terminology_result.md`

Include:
1. Files modified (count + list)
2. Replacements made (old → new count)
3. Components verified
4. Any issues encountered
5. Build output

---

**Start Time**: [Record]
**Expected Duration**: 1 hour
