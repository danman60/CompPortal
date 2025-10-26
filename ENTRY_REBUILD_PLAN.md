# Entry Creation Rebuild Plan

## User Requirements (Confirmed)

1. ✅ **No individual routine fees shown** - Hide fee breakdown at entry creation stage
2. ✅ **Three save actions:**
   - **Cancel** → Discard and return to entries list
   - **Save** → Create entry and return to entries list
   - **Save & Create Another** → Create entry and reset ALL fields (fresh start)
   - **Create Another Like This** → Create entry and retain dancers + auto-calculated fields, clear title/choreographer/details

## UI Design (Updated)

```
┌─────────────────────────────────────────────────────────────┐
│ 🎭 Create Routine                                           │
│ For: Nationals 2025 | Reservation: 5/10 used | 5 remaining  │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│ ┌─ Routine Details ───────────────────────────────────────┐│
│ │ Title: [_____________________________________]           ││
│ │ Choreographer: [____________________________]           ││
│ │ Category: [Ballet ▼]                                    ││
│ │ Classification: [Competitive ▼]                         ││
│ │ Notes: [________________________________________]        ││
│ └─────────────────────────────────────────────────────────┘│
│                                                             │
│ ┌─ Dancers ────────────────────────────────────────────────┐│
│ │ 🔍 [Search dancers...]                    Sort: [Name ▼]││
│ │                                                          ││
│ │ ✓ Sarah Johnson (12) - Mini                             ││
│ │ ✓ Emma Davis (11) - Mini                                ││
│ │ ○ Olivia Brown (13) - Teen                              ││
│ │ ○ Ava Wilson (14) - Teen                                ││
│ │                                                          ││
│ │ 2 dancers selected                                       ││
│ └─────────────────────────────────────────────────────────┘│
│                                                             │
│ ┌─ Auto-Calculated ────────────────────────────────────────┐│
│ │ Age Group: Mini (avg 11.5 yrs)        [Override ▼]      ││
│ │ Size Category: Duet/Trio                                ││
│ │                                                          ││
│ │ ⓘ Fees will be calculated at summary submission         ││
│ └─────────────────────────────────────────────────────────┘│
│                                                             │
│ ┌─────────────────────────────────────────────────────────┐│
│ │ [Cancel]                                                ││
│ │         [🔄 Create Another Like This]                   ││
│ │         [➕ Save & Create Another]                       ││
│ │         [✓ Save]                                        ││
│ └─────────────────────────────────────────────────────────┘│
└─────────────────────────────────────────────────────────────┘

┌─ Fixed Bottom Bar ──────────────────────────────────────────┐
│ 📊 Reservation: 5/10 used | 5 remaining                     │
│ 🎪 Nationals 2025 - March 15-17, 2025                       │
└─────────────────────────────────────────────────────────────┘
```

## Component Architecture

### File Structure
```
src/
├── components/rebuild/entries/
│   ├── EntryCreateForm.tsx           (Main form component)
│   ├── RoutineDetailsSection.tsx     (Title, choreographer, category, etc.)
│   ├── DancerSelectionSection.tsx    (Search, select, display dancers)
│   ├── AutoCalculatedSection.tsx     (Age group, size, with overrides)
│   ├── ReservationContextBar.tsx     (Fixed bottom bar)
│   └── EntryFormActions.tsx          (4 action buttons)
├── hooks/rebuild/
│   └── useEntryForm.ts               (Form state + business logic)
└── app/dashboard/entries-rebuild/
    └── create/
        └── page.tsx                  (Route wrapper)
```

### State Management (useEntryForm hook)

```typescript
interface EntryFormState {
  // Basic fields
  title: string;
  choreographer: string;
  category_id: string;
  classification_id: string;
  special_requirements: string;

  // Dancer selection
  selectedDancers: SelectedDancer[];
  dancerSearchQuery: string;
  dancerSortBy: 'name' | 'age';

  // Overrides
  age_group_override: string | null;
  size_category_override: string | null;

  // Computed (read-only)
  inferredAgeGroup: AgeGroup | null;
  inferredSizeCategory: SizeCategory | null;
  canSave: boolean;
}

interface SelectedDancer {
  dancer_id: string;
  dancer_name: string;
  dancer_age: number | null;
}

type SaveAction = 'cancel' | 'save' | 'save-another' | 'save-like-this';

const useEntryForm = (reservationId: string) => {
  const [form, setForm] = useState<EntryFormState>(...);

  // Auto-calculations
  const inferredAgeGroup = useMemo(...); // From dancer ages
  const inferredSizeCategory = useMemo(...); // From dancer count
  const canSave = useMemo(...); // Validation

  // Actions
  const handleSave = async (action: SaveAction) => {
    if (action === 'cancel') {
      router.push('/dashboard/entries-rebuild');
      return;
    }

    const result = await createEntry({ ...form, reservation_id: reservationId });

    if (action === 'save') {
      router.push('/dashboard/entries-rebuild');
    } else if (action === 'save-another') {
      resetForm(); // Clear ALL fields
    } else if (action === 'save-like-this') {
      resetDetailsOnly(); // Keep dancers, clear title/choreographer/notes
    }
  };

  const resetForm = () => {
    setForm({ ...initialState });
  };

  const resetDetailsOnly = () => {
    setForm(prev => ({
      ...prev,
      title: '',
      choreographer: '',
      special_requirements: '',
      // Keep: category, classification, dancers, overrides
    }));
  };

  return { form, setForm, handleSave, inferredAgeGroup, inferredSizeCategory, canSave };
};
```

## Implementation Plan (8 hours)

### **Session 1: Foundation (2 hours)**

**Task 1.1: Create route and page structure (30 min)**
- Create `src/app/dashboard/entries-rebuild/create/page.tsx`
- Add route protection (auth required)
- Parse `reservation` query param
- Fetch reservation data for context

**Task 1.2: Build useEntryForm hook (1 hour)**
- Define TypeScript interfaces
- Implement form state management
- Add inference logic (age group, size category)
- Create validation rules
- Implement save actions (4 types)

**Task 1.3: Create base container (30 min)**
- Create `EntryCreateForm.tsx` container
- Wire up useEntryForm hook
- Add loading/error states

### **Session 2: Form Sections (3 hours)**

**Task 2.1: Routine Details Section (45 min)**
- `RoutineDetailsSection.tsx`
- Title input (required)
- Choreographer input
- Category dropdown (from competition_settings)
- Classification dropdown
- Special requirements textarea
- Real-time validation feedback

**Task 2.2: Dancer Selection Section (1.5 hours)**
- `DancerSelectionSection.tsx`
- Fetch dancers for studio
- Search input (filter client-side)
- Sort toggle (name/age)
- Checkbox selection (virtualized list if >50 dancers)
- Selected dancers display (removable chips)
- Empty state ("No dancers found")

**Task 2.3: Auto-Calculated Section (45 min)**
- `AutoCalculatedSection.tsx`
- Display inferred age group (with calculation explanation)
- Display inferred size category
- Override dropdowns (optional)
- Info message: "Fees calculated at summary submission"

### **Session 3: Integration (2 hours)**

**Task 3.1: Reservation Context Bar (30 min)**
- `ReservationContextBar.tsx` (fixed bottom)
- Show reservation name + capacity (X/Y used, Z remaining)
- Show competition name + dates
- Warning state if at/over capacity

**Task 3.2: Form Actions (30 min)**
- `EntryFormActions.tsx`
- 4 buttons (Cancel, Create Like This, Save & Another, Save)
- Disable logic based on validation
- Loading states during mutation
- Toast notifications for success/error

**Task 3.3: Wire up mutations (1 hour)**
- Connect to `trpc.entry.create`
- Add capacity validation (client + server)
- Implement optimistic updates
- Handle reservation refetch after creation
- Error handling with user-friendly messages

### **Session 4: Polish (1 hour)**

**Task 4.1: UX Improvements (30 min)**
- Keyboard shortcuts (Ctrl+S to save)
- Auto-focus title on load
- Tab order optimization
- Accessible labels and ARIA attributes

**Task 4.2: Edge Cases (30 min)**
- Handle no reservation context (error state)
- Handle at-capacity scenario (show warning)
- Handle no dancers for studio (prompt to add)
- Handle missing competition settings (fallback)

## Validation Rules

### Client-side
- ✅ Title required (min 1 char)
- ✅ Category required
- ✅ Classification required
- ✅ At least 1 dancer selected
- ✅ Age group determined (inferred or override)
- ✅ Size category determined (inferred or override)
- ⚠️ Warning if creating would exceed reservation capacity

### Server-side (entry.create mutation)
- ✅ Reservation exists and is in 'approved' status
- ✅ Entry count ≤ spaces_confirmed
- ✅ Reservation not closed (is_closed = false)
- ✅ Studio owns the reservation
- ✅ Competition is active and accepting entries

## Migration Strategy

### Phase 1: Build (This Session)
1. Create new form at `/dashboard/entries-rebuild/create`
2. Update entries rebuild page "Create Routine" button
3. Test with real data (reservations, dancers, settings)

### Phase 2: Validate (Next Session)
1. Manual testing of all 4 save actions
2. Test capacity enforcement
3. Test auto-calculations with various dancer combinations
4. Test with edge cases (0 dancers, no reservation, etc.)

### Phase 3: Cutover (When Ready)
1. Update rebuild entries page to use new form exclusively
2. Add deprecation notice to old form
3. Monitor for issues
4. Remove old wizard after 1 week of stability

## Success Metrics

1. ✅ Entry creation time reduced from ~90s to ~30s (3-step wizard → single page)
2. ✅ Zero entries created beyond reservation capacity
3. ✅ "Create Another Like This" saves 20s per similar routine
4. ✅ No fee calculation confusion (hidden until summary)
5. ✅ Zero complaints about "lost data" from wizard navigation

## Files to Create/Modify

### New Files
- `src/app/dashboard/entries-rebuild/create/page.tsx`
- `src/components/rebuild/entries/EntryCreateForm.tsx`
- `src/components/rebuild/entries/RoutineDetailsSection.tsx`
- `src/components/rebuild/entries/DancerSelectionSection.tsx`
- `src/components/rebuild/entries/AutoCalculatedSection.tsx`
- `src/components/rebuild/entries/ReservationContextBar.tsx`
- `src/components/rebuild/entries/EntryFormActions.tsx`
- `src/hooks/rebuild/useEntryForm.ts`

### Modified Files
- `src/components/rebuild/entries/EntriesHeader.tsx` (update create button link)
- `src/server/routers/entry.ts` (add capacity validation to create mutation)

## Technical Notes

1. **No Fee Display**: Entry fees exist in DB but NOT shown to user at creation
2. **Reservation Context Required**: Form unusable without valid reservation_id param
3. **Draft Status**: All entries start with `status: 'draft'`
4. **Optimistic Updates**: Show new entry in list immediately, rollback on error
5. **Auto-Calculation**: Age group from avg dancer age, size from dancer count
6. **Override Flexibility**: Allow manual override if auto-calculation is wrong

## Ready for Implementation

This plan is ready to execute in the next session with auto-compact. All requirements captured, architecture defined, and tasks broken down into manageable chunks.

**Estimated completion: 8 hours** (4 sessions of 2 hours each)
