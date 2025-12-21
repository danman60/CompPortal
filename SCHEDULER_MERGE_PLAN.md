# Scheduler V2 Merge Plan: Tester → Main

## Executive Summary

**Scope**: Replace main's basic scheduler (2,726 lines, 15 procedures) with tester's full Schedule V2 (12,500+ lines, 45 procedures)

**Risk Level**: Medium - Complete replacement, not incremental merge

**Database**: Schema already in production (confirmed via SQL query)

---

## Branch Comparison

| Metric | Main | Tester |
|--------|------|--------|
| Router procedures | 15 | 45 |
| Router lines | 1,103 | 4,376 |
| Components | 8 | 26 |
| Total lines | 2,726 | 12,500+ |
| Page route | `/dashboard/scheduling` | `/dashboard/director-panel/schedule` |
| Architecture | Session-based | Day/timeslot-based with drag-drop |

---

## Files to COPY from Tester (ADD)

### 1. Scheduling Components Directory (19 files)
```
src/components/scheduling/
├── ScheduleTable.tsx          (1,345 lines)
├── DragDropProvider.tsx       (1,115 lines)
├── RoutinePool.tsx            (834 lines)
├── DayTabs.tsx                (295 lines)
├── ScheduleGrid.tsx           (291 lines)
├── ScheduleRow.tsx            (282 lines)
├── RoutineCard.tsx            (278 lines)
├── ScheduleBlockModal.tsx     (491 lines)
├── ActionsDropdown.tsx        (217 lines)
├── ManageStudioVisibilityModal.tsx (196 lines)
├── TimelineGrid.tsx           (195 lines)
├── VersionIndicator.tsx       (188 lines)
├── StudioNoteModal.tsx        (212 lines)
├── StatusBadge.tsx            (154 lines)
├── SendToStudiosModal.tsx     (164 lines)
├── TimeSlotCell.tsx           (139 lines)
├── DropIndicator.tsx          (97 lines)
├── ScheduleStatusToggle.tsx   (76 lines)
└── TrophyTooltip.tsx          (64 lines)
```

### 2. Root-Level Components (6 files)
```
src/components/
├── AssignStudioCodesModal.tsx    (11.7 KB)
├── ResetAllConfirmationModal.tsx (2.8 KB)
├── ScheduleBlockCard.tsx         (from tester)
├── ScheduleBlockModal.tsx        (from tester)
├── ScheduleToolbar.tsx           (300 lines)
└── ScheduleSavingProgress.tsx    (112 lines)
```

### 3. Library Files (2 files)
```
src/lib/
├── conflictAutoFix.ts      (381 lines)
└── StudioCodeService.ts    (162 lines)
```

### 4. UI Component (1 file)
```
src/components/ui/
└── Dialog.tsx              (2.6 KB)
```

### 5. Hook (1 file)
```
src/hooks/
└── useOptimisticScheduling.ts  (40 lines)
```

### 6. Page (1 file)
```
src/app/dashboard/director-panel/schedule/
└── page.tsx                (2,359 lines)
```

---

## Files to REPLACE

### 1. Scheduling Router
```
src/server/routers/scheduling.ts
- Main: 1,103 lines, 15 procedures
- Tester: 4,376 lines, 45 procedures
- Action: REPLACE with tester version
- Note: Fix `priority: null` → `priority: undefined` after copy
```

---

## Files to DELETE from Main

### Old Scheduler Components (to be removed)
```
src/components/
├── SchedulingManager.tsx      (DELETE - uses deprecated procedures)
├── SessionCard.tsx            (DELETE - old session-based UI)
├── LateSuffixModal.tsx        (DELETE - replaced by new flow)
```

### Old Page Route (to be removed)
```
src/app/dashboard/scheduling/
└── page.tsx                   (DELETE - old route)
```

---

## Files to KEEP (No Change)

```
src/lib/scheduling.ts          (318 lines - IDENTICAL between branches)
src/components/schedule/       (Keep if exists - ConflictPanel etc)
src/components/UnscheduledEntries.tsx  (Keep - may be used elsewhere)
```

---

## Router Modifications Required

### Studio Router Addition
Add to `src/server/routers/studio.ts` (line ~950):

```typescript
// P1-9: Get studios with entries for a specific competition
getStudiosForCompetition: publicProcedure
  .input(z.object({
    competitionId: z.string().uuid(),
    tenantId: z.string().uuid(),
  }))
  .query(async ({ input }) => {
    const { competitionId, tenantId } = input;
    const studios = await prisma.studios.findMany({
      where: {
        tenant_id: tenantId,
        competition_entries: {
          some: { competition_id: competitionId },
        },
      },
      select: {
        id: true,
        name: true,
        _count: {
          select: {
            competition_entries: {
              where: { competition_id: competitionId },
            },
          },
        },
      },
      orderBy: { name: 'asc' },
    });
    return studios.map((studio) => ({
      id: studio.id,
      name: studio.name,
      entryCount: studio._count.competition_entries,
    }));
  }),
```

---

## Database Status

**Already Migrated (Confirmed via Supabase)**:
- `schedule_blocks` ✓
- `schedule_breaks` ✓
- `schedule_conflicts` ✓
- `schedule_versions` ✓
- `schedule_version_snapshots` ✓
- `schedule_conflict_overrides` ✓ (created in previous session)
- `competition_entries` columns ✓ (is_scheduled, schedule_zone, display_order, etc.)

**No migration needed** - schema is complete.

---

## Prisma Schema

**Action**: Run `prisma db pull` AFTER all files copied
- This syncs schema.prisma with production DB
- Includes both media tables AND scheduler tables
- Then run `prisma generate`

---

## Execution Order

### Phase 1: Preparation
1. Create backup branch: `git checkout -b main-pre-scheduler-merge-v2`
2. Return to main: `git checkout main`

### Phase 2: Remove Old Code
3. Delete `src/app/dashboard/scheduling/` directory
4. Delete `src/components/SchedulingManager.tsx`
5. Delete `src/components/SessionCard.tsx`
6. Delete `src/components/LateSuffixModal.tsx`

### Phase 3: Add New Code
7. Create `src/components/scheduling/` directory
8. Copy all 19 files from tester's `src/components/scheduling/`
9. Copy 6 root-level components from tester
10. Copy `src/lib/conflictAutoFix.ts`
11. Copy `src/lib/StudioCodeService.ts`
12. Copy `src/components/ui/Dialog.tsx`
13. Copy `src/hooks/useOptimisticScheduling.ts`
14. Create `src/app/dashboard/director-panel/schedule/` directory
15. Copy `page.tsx` to new directory

### Phase 4: Replace Router
16. Copy `src/server/routers/scheduling.ts` from tester
17. Fix `priority: null` → `priority: undefined` in scheduling.ts

### Phase 5: Add Missing Procedure
18. Add `getStudiosForCompetition` to studio.ts

### Phase 6: Sync Schema
19. Run `npx prisma db pull`
20. Run `npx prisma generate`

### Phase 7: Build & Verify
21. Run `npm run build`
22. Fix any remaining type errors
23. Test on local dev server

### Phase 8: Commit
24. `git add .`
25. `git commit -m "feat: Merge Schedule V2 from tester branch"`
26. `git push origin main`

---

## Rollback Plan

If build fails catastrophically:
```bash
git checkout main-pre-scheduler-merge-v2
git branch -D main
git checkout -b main
git push origin main --force
```

---

## Post-Merge Verification

1. Build passes: `npm run build`
2. Page loads: `https://empwr.compsync.net/dashboard/director-panel/schedule`
3. Routines display in pool
4. Drag-drop works
5. Day tabs switch correctly
6. Studio visibility works
7. Export PDF/CSV works

---

## Known Issues to Fix After Copy

1. **priority: null** in scheduling.ts line ~1761 → change to `undefined`
2. **Hardcoded test IDs** in page.tsx - may need to make dynamic
3. **Missing procedure** - getStudiosForCompetition not in main's studio.ts

---

## File Count Summary

| Operation | Count | Lines |
|-----------|-------|-------|
| ADD (components) | 25 | ~8,000 |
| ADD (lib) | 2 | 543 |
| ADD (hooks) | 1 | 40 |
| ADD (pages) | 1 | 2,359 |
| REPLACE (router) | 1 | 4,376 |
| DELETE (old) | 4 | ~1,200 |
| MODIFY (studio) | 1 | +45 |
| **TOTAL** | 35 files | ~14,000 lines |
