# CSV Import Redesign - Data Loader Architecture

**Date:** November 4, 2025
**Status:** Design Complete, Ready for Implementation
**Reason:** Avoid duplicating Phase 2 business logic, ensure consistency with manual entry form

---

## Problem Statement

The current CSV import duplicates all Phase 2 business logic:
- Age calculation (Dec 31 cutoff)
- Classification auto-detection (60% majority rule)
- Production auto-lock (category + classification)
- Production validation (min 10 dancers)
- Age bump validation (+1 only)
- Preview UI with dropdowns

**Issues:**
1. Logic exists in 2 places (CSV import + manual form)
2. Risk of drift between CSV and manual flows
3. Complex preview UI hard to maintain
4. No support for classification exceptions in CSV flow

---

## New Architecture: CSV as Data Loader

**Core Concept:** CSV import becomes a simple data loader that feeds parsed routines into the existing EntryCreateFormV2 component one-by-one.

### Benefits

1. **Single Source of Truth:** All business logic lives in EntryCreateFormV2
2. **Consistency Guaranteed:** CSV and manual entry use identical logic
3. **Simpler CSV Component:** ~200 lines removed (no preview UI, no validation)
4. **Better UX:** Users review each routine carefully before saving
5. **Exception Support:** Classification exceptions work naturally through existing modal
6. **Maintainability:** Future changes only need to happen once

---

## User Flow

### Step 1: Upload & Parse CSV
```
User uploads CSV → System parses file
↓
Fuzzy match dancers (merge first/last name columns)
↓
Show preview table with checkboxes:
- [x] Title
- Matched dancers count (e.g., "5 matched")
- Unmatched dancers warning (e.g., "2 unmatched: John Doe, Jane Smith")
```

**Preview Table Columns:**
- Checkbox (select routine to import)
- Row #
- Title
- Dancers (matched count + unmatched warning)
- Choreographer (if present)

**Example:**
```
☑ | # | Title          | Dancers              | Choreographer
----+---+----------------+----------------------+--------------
☑ | 1 | Perfect Motion | 5 matched            | Sarah Jones
☑ | 2 | Fireflies      | 3 matched, 2 unmatched | -
☐ | 3 | Dream Big      | 0 matched, 5 unmatched | Mike Smith
```

**Warnings:**
- "⚠️ Routine 3: All dancers unmatched (0 of 5)"
- Click "Confirm Routines" only shows checked rows

### Step 2: Confirm & Create Import Session
```
User clicks "Confirm Routines" (15 selected)
↓
System creates routine_import_sessions record in database:
- id: UUID
- studio_id: from current user
- reservation_id: from selected reservation
- routines: JSONB array of parsed routine data
- current_index: 0
- completed: false
↓
Redirect to: /dashboard/entries/create?importSession={id}
```

### Step 3: Step-Through Import Flow
```
EntryCreateFormV2 detects ?importSession=xyz
↓
Load session.routines[current_index]
↓
Pre-fill form:
- Title: from CSV
- Choreographer: from CSV (if present)
- Selected dancers: matched dancers from CSV
↓
Auto-calculation runs (Phase 2 logic):
- Age: calculated from dancer DOBs
- Classification: 60% majority rule
- Size category: from dancer count
- Production auto-lock: if size = Production
↓
User reviews form → Makes adjustments if needed
↓
Clicks action button:
- "Save & Next Import" → Save entry, increment current_index, load next
- "Skip This Routine" → Increment current_index, don't save
- "Delete This Routine" → Remove from session.routines array
↓
Repeat until current_index >= routines.length
↓
Mark session.completed = true
↓
Show completion screen: "Import complete! 12 of 15 routines saved."
↓
Redirect to /dashboard/entries
```

**Progress Indicator:**
- "Import Progress: Routine 3 of 15"
- Shows above form title

**Action Buttons:**
- **Save & Next Import** (green) - Saves entry, moves to next routine
- **Skip This Routine** (gray) - Skip without saving, can add manually later
- **Delete This Routine** (red) - Remove from import queue entirely

### Step 4: Resume Incomplete Import
```
If user closes browser mid-import:
↓
Dashboard shows: "Resume Import" button
↓
Click button → Redirect to /dashboard/entries/create?importSession={id}
↓
Continues from session.current_index
```

---

## Database Schema

### New Table: `routine_import_sessions`

```sql
CREATE TABLE routine_import_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  studio_id UUID NOT NULL REFERENCES studios(id),
  reservation_id UUID NOT NULL REFERENCES reservations(id),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  completed BOOLEAN DEFAULT false,
  current_index INT DEFAULT 0,
  total_routines INT NOT NULL,
  routines JSONB NOT NULL,
  CONSTRAINT fk_studio FOREIGN KEY (studio_id) REFERENCES studios(id) ON DELETE CASCADE,
  CONSTRAINT fk_reservation FOREIGN KEY (reservation_id) REFERENCES reservations(id) ON DELETE CASCADE
);

CREATE INDEX idx_import_sessions_studio ON routine_import_sessions(studio_id);
CREATE INDEX idx_import_sessions_completed ON routine_import_sessions(completed);
```

**JSONB Structure for `routines` field:**
```json
[
  {
    "title": "Perfect Motion",
    "choreographer": "Sarah Jones",
    "props": "Chairs",
    "matched_dancers": [
      {
        "dancer_id": "uuid-1",
        "dancer_name": "Emma Smith",
        "dancer_age": 9,
        "date_of_birth": "2016-05-15",
        "classification_id": "uuid-adult"
      }
    ],
    "unmatched_dancers": ["John Doe", "Jane Smith"]
  }
]
```

---

## Implementation Tasks

### Phase 1: Database & Backend (1-2 hours)

1. **Create Migration:**
   - `routine_import_sessions` table
   - Indexes for performance

2. **Add tRPC Endpoints:**
   ```typescript
   // src/server/routers/importSession.ts
   createImportSession(input: { reservation_id, routines[] })
   getImportSession(input: { id })
   updateSessionIndex(input: { id, current_index })
   deleteRoutineFromSession(input: { id, routine_index })
   markSessionComplete(input: { id })
   getActiveSessionForStudio(input: { studio_id })
   ```

### Phase 2: CSV Import Component Simplification (2-3 hours)

**RoutineCSVImport.tsx Changes:**

**Keep:**
- File upload logic
- CSV/Excel parsing
- Fuzzy dancer matching (improve: merge first/last name columns)

**Remove:**
- All dropdown UI (age, classification, category, size)
- Auto-detection logic (moves to manual form)
- Validation logic (moves to manual form)
- Direct entry creation

**Add:**
- Simple preview table with checkboxes
- "Select All" / "Deselect All" buttons
- Matched/unmatched dancer counts
- Warning messages for unmatched dancers
- "Confirm Routines" button → creates session, redirects

**New Preview UI:**
```tsx
<table>
  <thead>
    <tr>
      <th>
        <input type="checkbox" onChange={selectAll} />
      </th>
      <th>#</th>
      <th>Title</th>
      <th>Dancers</th>
      <th>Choreographer</th>
    </tr>
  </thead>
  <tbody>
    {routines.map((routine, i) => (
      <tr key={i} className={routine.unmatchedDancers.length > 0 ? 'bg-yellow-500/10' : ''}>
        <td><input type="checkbox" checked={selected.has(i)} /></td>
        <td>{i + 1}</td>
        <td>{routine.title}</td>
        <td>
          <span className="text-green-400">{routine.matchedDancers.length} matched</span>
          {routine.unmatchedDancers.length > 0 && (
            <span className="text-yellow-400">
              , {routine.unmatchedDancers.length} unmatched
            </span>
          )}
        </td>
        <td>{routine.choreographer || '-'}</td>
      </tr>
    ))}
  </tbody>
</table>
```

### Phase 3: Entry Form Updates (2-3 hours)

**EntryCreateFormV2.tsx Changes:**

**Add:**
1. **Detect Import Session:**
   ```typescript
   const importSessionId = searchParams.get('importSession');
   const { data: importSession } = trpc.importSession.getById.useQuery(
     { id: importSessionId! },
     { enabled: !!importSessionId }
   );
   ```

2. **Pre-fill Form:**
   ```typescript
   useEffect(() => {
     if (importSession && importSession.routines[importSession.current_index]) {
       const routine = importSession.routines[importSession.current_index];
       formHook.updateField('title', routine.title);
       formHook.updateField('choreographer', routine.choreographer || '');

       // Pre-select matched dancers
       routine.matched_dancers.forEach(dancer => {
         formHook.toggleDancer(dancer);
       });
     }
   }, [importSession]);
   ```

3. **Replace Action Buttons:**
   ```tsx
   {importSession ? (
     <ImportActions
       onSave={handleSaveAndNext}
       onSkip={handleSkipRoutine}
       onDelete={handleDeleteRoutine}
       progress={`${importSession.current_index + 1} of ${importSession.total_routines}`}
     />
   ) : (
     <EntryFormActions {...normalProps} />
   )}
   ```

4. **Import Action Handlers:**
   ```typescript
   const handleSaveAndNext = async () => {
     // Save entry as normal
     await createMutation.mutateAsync({...});

     // Increment session index
     await updateSessionIndex.mutateAsync({
       id: importSession.id,
       current_index: importSession.current_index + 1
     });

     // Check if done
     if (importSession.current_index + 1 >= importSession.total_routines) {
       await markComplete.mutateAsync({ id: importSession.id });
       router.push('/dashboard/entries?importComplete=true');
     } else {
       // Reload page with same import session (next routine)
       router.refresh();
     }
   };
   ```

### Phase 4: Dashboard Updates (30 minutes)

**StudioDirectorDashboard.tsx Changes:**

**Add:**
```typescript
const { data: activeImport } = trpc.importSession.getActiveForStudio.useQuery(
  { studio_id: currentUser.studio_id }
);

{activeImport && (
  <div className="bg-purple-500/20 border border-purple-500/50 rounded-xl p-4 mb-6">
    <h3 className="text-lg font-bold text-purple-300 mb-2">
      Resume Import
    </h3>
    <p className="text-white/90 text-sm mb-3">
      You have an incomplete import ({activeImport.total_routines - activeImport.current_index} routines remaining)
    </p>
    <button
      onClick={() => router.push(`/dashboard/entries/create?importSession=${activeImport.id}`)}
      className="px-4 py-2 bg-purple-500 hover:bg-purple-600 text-white rounded-lg"
    >
      Resume Import ({activeImport.current_index + 1} of {activeImport.total_routines})
    </button>
  </div>
)}
```

---

## Testing Checklist

### CSV Upload & Preview
- [ ] Upload CSV with 15 routines
- [ ] Verify fuzzy dancer matching works (first + last name merge)
- [ ] Verify matched dancer count accurate
- [ ] Verify unmatched dancer warnings show
- [ ] Select/deselect routines with checkboxes
- [ ] Click "Confirm Routines" creates session

### Step-Through Import
- [ ] Redirect to form with ?importSession=xyz
- [ ] Verify form pre-fills: title, choreographer, dancers
- [ ] Verify auto-calculation runs (age, classification, size)
- [ ] Click "Save & Next Import" → saves entry, loads next routine
- [ ] Click "Skip This Routine" → moves to next without saving
- [ ] Click "Delete This Routine" → removes from queue
- [ ] Verify progress indicator updates (Routine X of Y)
- [ ] Complete all routines → redirect to entries list

### Resume Import
- [ ] Close browser mid-import
- [ ] Reopen dashboard → "Resume Import" button shows
- [ ] Click "Resume Import" → continues from last index
- [ ] Complete import → button disappears

### Edge Cases
- [ ] CSV with all unmatched dancers (show warning, allow import)
- [ ] CSV with no choreographer (form allows empty)
- [ ] Import session for reservation that gets cancelled (handle gracefully)
- [ ] Multiple import sessions (only show most recent incomplete)

---

## Compliance with Phase 2 Spec

### Manual Entry (EntryCreateFormV2) ✅
- [x] Age calculation: Dec 31 cutoff (useEntryFormV2.ts:131-141)
- [x] Age display: Numerical (AutoCalculatedSection.tsx:166-213)
- [x] Age bump: +1 only (useEntryFormV2.ts:151-154)
- [x] Classification: 60% majority rule (AutoCalculatedSection.tsx:91-117)
- [x] Classification default: "Use detected" (AutoCalculatedSection.tsx:296-298)
- [x] Production auto-lock: Category + classification (EntryCreateFormV2.tsx:56-74)
- [x] Production validation: Min 10 dancers (useEntryFormV2.ts:214-227)
- [x] Solo classification: Locked + +1 bump button (AutoCalculatedSection.tsx:306-315)
- [x] Group classification: Unlocked dropdown (AutoCalculatedSection.tsx:288-304)

### CSV Import (After Redesign) ✅
- [x] Uses EntryCreateFormV2 → All Phase 2 logic inherited
- [x] No duplicated business logic
- [x] Dancers pre-selected → auto-calculation runs
- [x] User reviews each routine individually
- [x] Classification exceptions handled via existing modal
- [x] Production validation works naturally
- [x] Consistent with manual entry (guaranteed)

---

## Files to Create/Modify

### Create New Files
1. `prisma/migrations/YYYYMMDD_create_import_sessions.sql`
2. `src/server/routers/importSession.ts`
3. `src/components/rebuild/entries/ImportActions.tsx`

### Modify Existing Files
1. `src/components/RoutineCSVImport.tsx` - Simplify to preview + create session
2. `src/components/rebuild/entries/EntryCreateFormV2.tsx` - Add import session support
3. `src/components/StudioDirectorDashboard.tsx` - Add "Resume Import" button
4. `src/server/routers/_app.ts` - Add importSession router

---

## Estimated Timeline

- **Database + Backend:** 1-2 hours
- **CSV Simplification:** 2-3 hours
- **Entry Form Updates:** 2-3 hours
- **Dashboard + Testing:** 1-2 hours

**Total:** 6-10 hours

---

## Success Criteria

1. CSV import creates no entries directly
2. All entries created through EntryCreateFormV2
3. Phase 2 business logic consistent between manual and CSV
4. Users can review/adjust each routine before saving
5. Classification exceptions work for CSV imports
6. Users can resume incomplete imports
7. No duplicated validation or auto-calculation code

---

**Status:** Ready for implementation
**Next Step:** Create database migration and tRPC endpoints
