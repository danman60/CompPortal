## Task: Consistent Routine Card Heights CSS Fix

**Context:**
- Files: src/components/EntriesList.tsx (primary), src/components/EntryCard.tsx (if exists)
- Issue: Routine cards have inconsistent heights causing misaligned grid
- Pattern: Simple CSS fix with min-height

**Requirements:**
1. Find all routine card divs in EntriesList.tsx
2. Add `min-h-[200px]` to card className
3. Ensure grid layout uses `grid-auto-rows-[200px]` or `items-stretch`
4. Verify card content uses flex layout for proper spacing

**Deliverables:**
- Updated EntriesList.tsx with consistent card heights
- CSS changes only (no logic changes)

**Changes Needed:**
```tsx
// BEFORE
<div className="bg-white/10 backdrop-blur-md rounded-xl p-6 border border-white/20">
  {/* Card content */}
</div>

// AFTER
<div className="bg-white/10 backdrop-blur-md rounded-xl p-6 border border-white/20 min-h-[200px] flex flex-col">
  {/* Card content */}
</div>

// Grid container (if needed)
<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 auto-rows-[200px]">
```

**Validation:**
- All cards same height (200px minimum)
- Content properly spaced with flex
- Grid aligned properly
- No layout breaks on mobile

**Codex will**: Apply CSS fixes to card components
**Claude will**: Verify layout, test responsive behavior
