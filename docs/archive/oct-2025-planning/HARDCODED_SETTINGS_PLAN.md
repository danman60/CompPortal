# Hardcoded Tenant Settings - Pre-Launch Approach

**Decision Date:** 2025-10-29
**Status:** ACTIVE - Pre-Launch Strategy
**Estimated Time:** 30-60 minutes

---

## Overview

Replace UI-editable tenant settings with hardcoded constants per tenant. Settings changes require code updates + deploy (acceptable for 2 tenants pre-launch).

---

## Rationale

**Why Hardcode?**
- ✅ **Time savings:** 30-60 min vs 4-6 hours for full UI
- ✅ **Type safety:** TypeScript constants = zero runtime errors
- ✅ **Performance:** No database queries for settings
- ✅ **Simplicity:** Easy to update, easy to verify
- ✅ **Pre-launch appropriate:** Only 2 tenants (EMPWR + Glow)

**When to Move to UI:**
- Post-launch when stable
- When adding 3rd+ tenant
- When CDs request self-service
- Resume `feature/tenant-settings-ui-phase2` branch

---

## Implementation Plan

### Step 1: Create Hardcoded Settings File (10 min)

**File:** `src/lib/tenantSettings.ts`

```typescript
// Hardcoded tenant settings for pre-launch
// To update: Edit this file → commit → deploy

export interface TenantSettings {
  ageDivisions: AgeDivision[];
  danceCategories: DanceCategory[];
  entrySizes: EntrySize[];
  scoringTiers: ScoringTier[];
  awardTypes: AwardType[];
}

export const TENANT_SETTINGS: Record<string, TenantSettings> = {
  // EMPWR Dance Experience
  '00000000-0000-0000-0000-000000000001': {
    ageDivisions: [
      { name: 'Micro', shortName: 'MI', minAge: 3, maxAge: 5 },
      { name: 'Mini', shortName: 'MN', minAge: 6, maxAge: 8 },
      { name: 'Junior', shortName: 'JR', minAge: 9, maxAge: 11 },
      { name: 'Intermediate', shortName: 'INT', minAge: 12, maxAge: 14 },
      { name: 'Senior', shortName: 'SR', minAge: 15, maxAge: 18 },
      { name: 'Adult', shortName: 'AD', minAge: 19, maxAge: 99 },
    ],
    danceCategories: [
      { name: 'Ballet', code: 'BAL' },
      { name: 'Jazz', code: 'JAZ' },
      { name: 'Tap', code: 'TAP' },
      { name: 'Contemporary', code: 'CON' },
      { name: 'Lyrical', code: 'LYR' },
      { name: 'Hip Hop', code: 'HIP' },
      { name: 'Musical Theatre', code: 'MT' },
      { name: 'Open', code: 'OPN' },
    ],
    entrySizes: [
      { name: 'Solo', minDancers: 1, maxDancers: 1 },
      { name: 'Duet/Trio', minDancers: 2, maxDancers: 3 },
      { name: 'Small Group', minDancers: 4, maxDancers: 9 },
      { name: 'Large Group', minDancers: 10, maxDancers: 19 },
      { name: 'Line', minDancers: 20, maxDancers: 39 },
      { name: 'Super Line', minDancers: 40, maxDancers: 999 },
    ],
    scoringTiers: [
      { name: 'Bronze', minScore: 0, maxScore: 74.99, color: '#CD7F32' },
      { name: 'Silver', minScore: 75, maxScore: 84.99, color: '#C0C0C0' },
      { name: 'Gold', minScore: 85, maxScore: 89.99, color: '#FFD700' },
      { name: 'Titanium', minScore: 90, maxScore: 93.99, color: '#878681' },
      { name: 'Platinum', minScore: 94, maxScore: 96.99, color: '#E5E4E2' },
      { name: 'Pandora', minScore: 97, maxScore: 100, color: '#9966CC' },
    ],
    awardTypes: [
      { category: 'Overall', name: 'High Score', topN: 1 },
      { category: 'Overall', name: 'Second Overall', topN: 1 },
      { category: 'Overall', name: 'Third Overall', topN: 1 },
      { category: 'Special', name: 'Judges Choice', topN: 1 },
      { category: 'Special', name: 'Best Costume', topN: 1 },
      { category: 'Special', name: 'Best Choreography', topN: 1 },
    ],
  },

  // Glow Dance Competition
  '4b9c1713-40ab-460b-8dda-5a8cf6cbc9b5': {
    // Copy EMPWR settings for now (they can request changes)
    ageDivisions: [
      { name: 'Micro', shortName: 'MI', minAge: 3, maxAge: 5 },
      { name: 'Mini', shortName: 'MN', minAge: 6, maxAge: 8 },
      { name: 'Junior', shortName: 'JR', minAge: 9, maxAge: 11 },
      { name: 'Intermediate', shortName: 'INT', minAge: 12, maxAge: 14 },
      { name: 'Senior', shortName: 'SR', minAge: 15, maxAge: 18 },
      { name: 'Adult', shortName: 'AD', minAge: 19, maxAge: 99 },
    ],
    danceCategories: [
      { name: 'Ballet', code: 'BAL' },
      { name: 'Jazz', code: 'JAZ' },
      { name: 'Tap', code: 'TAP' },
      { name: 'Contemporary', code: 'CON' },
      { name: 'Lyrical', code: 'LYR' },
      { name: 'Hip Hop', code: 'HIP' },
      { name: 'Musical Theatre', code: 'MT' },
      { name: 'Open', code: 'OPN' },
    ],
    entrySizes: [
      { name: 'Solo', minDancers: 1, maxDancers: 1 },
      { name: 'Duet/Trio', minDancers: 2, maxDancers: 3 },
      { name: 'Small Group', minDancers: 4, maxDancers: 9 },
      { name: 'Large Group', minDancers: 10, maxDancers: 19 },
      { name: 'Line', minDancers: 20, maxDancers: 39 },
      { name: 'Super Line', minDancers: 40, maxDancers: 999 },
    ],
    scoringTiers: [
      { name: 'Bronze', minScore: 0, maxScore: 74.99, color: '#CD7F32' },
      { name: 'Silver', minScore: 75, maxScore: 84.99, color: '#C0C0C0' },
      { name: 'Gold', minScore: 85, maxScore: 89.99, color: '#FFD700' },
      { name: 'Titanium', minScore: 90, maxScore: 93.99, color: '#878681' },
      { name: 'Platinum', minScore: 94, maxScore: 96.99, color: '#E5E4E2' },
      { name: 'Pandora', minScore: 97, maxScore: 100, color: '#9966CC' },
    ],
    awardTypes: [
      { category: 'Overall', name: 'High Score', topN: 1 },
      { category: 'Overall', name: 'Second Overall', topN: 1 },
      { category: 'Overall', name: 'Third Overall', topN: 1 },
      { category: 'Special', name: 'Judges Choice', topN: 1 },
      { category: 'Special', name: 'Best Costume', topN: 1 },
      { category: 'Special', name: 'Best Choreography', topN: 1 },
    ],
  },
};

// Helper function to get settings for a tenant
export function getTenantSettings(tenantId: string): TenantSettings {
  const settings = TENANT_SETTINGS[tenantId];

  if (!settings) {
    throw new Error(`No hardcoded settings found for tenant: ${tenantId}`);
  }

  return settings;
}

// Helper function to check if tenant has settings
export function hasTenantSettings(tenantId: string): boolean {
  return tenantId in TENANT_SETTINGS;
}
```

### Step 2: Update Existing Code to Use Hardcoded Settings (15 min)

**Search for:** References to database settings queries
**Replace with:** `getTenantSettings(tenantId)`

**Files to Update:**
1. Entry creation forms (age divisions, categories dropdown)
2. Scoring pages (scoring tiers)
3. Awards pages (award types)
4. Any validation logic using settings

**Example:**
```typescript
// Before (database query)
const ageDivisions = await prisma.age_groups.findMany({
  where: { tenant_id: ctx.tenantId }
});

// After (hardcoded)
import { getTenantSettings } from '@/lib/tenantSettings';
const settings = getTenantSettings(ctx.tenantId);
const ageDivisions = settings.ageDivisions;
```

### Step 3: Remove Settings UI from Navigation (5 min)

**Files to Update:**
- Dashboard navigation (remove "Settings" link)
- Or keep link but show read-only view with message:
  > "Settings are managed by administrators. Contact support to request changes."

### Step 4: Test on Both Tenants (10 min)

**EMPWR Tenant:**
- [ ] Age divisions appear correctly in entry form
- [ ] Dance categories appear in dropdowns
- [ ] Entry size validation works
- [ ] Scoring uses correct tiers
- [ ] Awards display correctly

**Glow Tenant:**
- [ ] Same checks as EMPWR
- [ ] Verify no cross-tenant data leakage

---

## Usage Examples

### In TRPC Router
```typescript
import { getTenantSettings } from '@/lib/tenantSettings';

export const entryRouter = router({
  create: protectedProcedure
    .input(entrySchema)
    .mutation(async ({ ctx, input }) => {
      const settings = getTenantSettings(ctx.tenantId);

      // Validate age division exists
      const validDivision = settings.ageDivisions.find(
        d => d.name === input.ageDivision
      );

      if (!validDivision) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: `Invalid age division: ${input.ageDivision}`
        });
      }

      // ... rest of mutation
    }),
});
```

### In React Component
```typescript
'use client';

import { getTenantSettings } from '@/lib/tenantSettings';
import { useUser } from '@/hooks/useUser';

export function EntryForm() {
  const { user } = useUser();
  const settings = getTenantSettings(user.tenantId);

  return (
    <select name="ageDiv">
      {settings.ageDivisions.map(div => (
        <option key={div.name} value={div.name}>
          {div.name} ({div.minAge}-{div.maxAge})
        </option>
      ))}
    </select>
  );
}
```

---

## Updating Settings Process

**When client requests a change:**

1. **Receive request:**
   - Email: "Can you change Mini age range to 5-8?"

2. **Update code:**
   ```bash
   # Edit src/lib/tenantSettings.ts
   vim src/lib/tenantSettings.ts
   # Change: { name: 'Mini', minAge: 6, maxAge: 8 }
   # To: { name: 'Mini', minAge: 5, maxAge: 8 }
   ```

3. **Commit & deploy:**
   ```bash
   git add src/lib/tenantSettings.ts
   git commit -m "feat: Update EMPWR Mini division age range to 5-8

   - Change Mini minAge from 6 to 5 (client request)
   - Requested by: empwrdance@gmail.com

   ✅ Build pass.

   🤖 Claude Code"
   git push
   ```

4. **Verify on production:**
   - Wait for deploy (~2 minutes)
   - Test entry form shows new ages
   - Notify client: "Updated! Mini is now 5-8 years old."

**Turnaround time:** ~5 minutes

---

## Migration Path (Post-Launch)

**When ready to move to UI-editable settings:**

1. **Checkout feature branch:**
   ```bash
   git checkout feature/tenant-settings-ui-phase2
   ```

2. **Complete type mapping work** (4-6 hours)

3. **Seed database from hardcoded values:**
   ```typescript
   // Migration script
   for (const [tenantId, settings] of Object.entries(TENANT_SETTINGS)) {
     await prisma.$transaction([
       prisma.age_groups.createMany({
         data: settings.ageDivisions.map(div => ({
           tenant_id: tenantId,
           ...div,
         })),
       }),
       // ... other tables
     ]);
   }
   ```

4. **Test UI editing**

5. **Merge to main**

6. **Remove hardcoded file** (keep as reference in `docs/archive/`)

---

## Advantages of This Approach

### Development
- ✅ No type mismatches (TypeScript constants)
- ✅ IDE autocomplete works perfectly
- ✅ Changes visible in git diff
- ✅ Easy to review in PRs

### Performance
- ✅ No database queries for settings
- ✅ Zero latency (in-memory)
- ✅ No N+1 query issues

### Reliability
- ✅ Can't corrupt settings (code validated)
- ✅ Settings version controlled with code
- ✅ Rollback = git revert
- ✅ No database migrations needed

### Pre-Launch
- ✅ Fast to implement (30-60 min)
- ✅ Zero risk of UI bugs
- ✅ Perfect for 2 tenants
- ✅ Easy to update on request

---

## Disadvantages (Why It's Temporary)

### Scalability
- ⚠️ Not sustainable for 10+ tenants
- ⚠️ Code changes for every setting tweak
- ⚠️ Requires developer for all updates

### User Experience
- ⚠️ CDs can't self-service
- ⚠️ Turnaround time depends on dev availability
- ⚠️ No preview of changes before deploy

**Solution:** Move to UI-editable post-launch (Phase 2 branch ready)

---

## Files to Create/Modify

### New Files
- `src/lib/tenantSettings.ts` - Hardcoded settings constants

### Modified Files
- All entry creation forms (age division dropdowns)
- Scoring pages (tier lookups)
- Awards pages (award type lists)
- Validation logic (settings checks)

### Files to Remove/Hide
- Settings UI pages (or make read-only)
- Settings navigation links (or show "Contact support")

---

## Testing Checklist

Pre-deployment:
- [ ] Build passes: `npm run build`
- [ ] Type check passes: `npm run type-check`
- [ ] Both tenant IDs have settings defined
- [ ] getTenantSettings() throws error for unknown tenant
- [ ] No database queries for settings in hot paths

Post-deployment:
- [ ] EMPWR: Age divisions appear correctly
- [ ] EMPWR: Dance categories appear
- [ ] EMPWR: Entry validation works
- [ ] EMPWR: Scoring tiers display
- [ ] EMPWR: Awards display
- [ ] Glow: All of the above
- [ ] No errors in Vercel logs

---

## Timeline

**Total estimated time:** 30-60 minutes

- [10 min] Create `tenantSettings.ts` with both tenants
- [15 min] Update code to use hardcoded settings
- [5 min] Remove/hide settings UI
- [10 min] Test on both tenants
- [5 min] Deploy & verify production

**Savings vs UI approach:** 3-5 hours

---

## Communication with Clients

**Email template:**

> Hi [Client Name],
>
> For launch, competition settings (age divisions, categories, scoring tiers) are configured in code. If you need any changes:
>
> 1. Email me with the requested change
> 2. I'll update and deploy (typically within 1 hour)
> 3. You'll receive confirmation when live
>
> Post-launch, we'll add a settings UI for self-service editing.
>
> Current settings for your competition:
> - Age Divisions: [list]
> - Dance Categories: [list]
> - Entry Sizes: [list]
> - Scoring Tiers: [list]
>
> Let me know if any changes needed before launch!

---

**End of Plan**
