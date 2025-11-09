# User Feedback - November 9, 2025

**Source:** Production testing session
**Tenant:** GLOW Dance Competition
**Reporter:** Competition Director

---

## 1. Exception Requests - Cancel Feature

**Issue:** SD cannot cancel their own exception requests once submitted

**User Story:**
> "I make an exception request and then the routine duplication in the routine list magically with correct specs, so I want to cancel exception request"

**Current Behavior:**
- SD submits exception request
- SD notices routine duplicated or specs now correct
- No way to cancel pending request

**Desired Behavior:**
- SD can cancel their own pending exception requests
- Cancel button shows on SD's exception request list
- Once cancelled, request disappears from CD's approval queue

**Priority:** Medium
**Component:** Exception Request system
**Files:**
- Frontend: Exception request list component
- Backend: `exceptionRequest.ts` router (add `cancel` mutation)

**Implementation Notes:**
- Only allow cancel if status = 'pending'
- Cannot cancel if status = 'approved' or 'rejected'
- Add activity log entry when SD cancels

---

## 2. Auto-Detect Classification Bug

**Issue:** Classification auto-detection incorrectly selects lower tier despite higher-tier dancers

**User Story:**
> "All my dancers are emerald/sapphire but it auto detected to Crystal"

**Current Behavior:**
- Entry has all Emerald/Sapphire dancers
- System auto-detects classification as Crystal (lower tier)
- Should detect as Sapphire (highest tier among participants)

**Expected Behavior:**
- Use **highest** classification among all entry participants
- If dancers are: Crystal (1), Sapphire (2), Emerald (1)
  - Result should be: **Sapphire** (highest tier)

**Priority:** HIGH (causes incorrect pricing/categorization)
**Component:** Entry creation, classification detection
**Files:**
- `EntryCreateFormV2.tsx` - Auto-detection logic
- `entry.ts` router - Server-side validation

**Root Cause Analysis Needed:**
- Check classification auto-detect logic
- Verify it's using MAX tier, not MIN or FIRST
- Check if tier hierarchy is defined correctly

**Related Code:**
```typescript
// Should be something like:
const detectedClassification = participants
  .map(p => p.classification_tier) // Emerald=3, Sapphire=4, etc
  .reduce((max, current) => Math.max(max, current), 0);
```

---

## 3. "My Routines" Display Issues

### 3.1 Draft Table View - Missing Columns

**Issue:** Critical columns not displaying in draft table view

**Missing Columns:**
- # (routine number)
- Age (age group)
- Dancers (participant count)
- Fee (routine price)

**Priority:** HIGH (SD cannot verify routine details)
**Component:** Draft routines table
**Files:** Entries list component (draft table variant)

**Expected Columns:**
| # | Title | Category | Classification | Age | Dancers | Fee | Actions |
|---|-------|----------|----------------|-----|---------|-----|---------|
| 1 | Sparkle | Jazz | Sapphire | Teen | 5 | $75 | Edit/Delete |

---

### 3.2 Stale Counts After Delete

**Issue:** Entry counts don't refresh after deleting routine

**User Story:**
> "When I delete an entry, and refresh the page, the number of available, created and remaining slots at the bottom is not changing… I have to log out and back in for the number to change"

**Affected Locations:**
- Entries page bottom summary
- Reservations page (routine usage)
- Dashboard stats

**Current Behavior:**
- Delete entry → success
- Refresh page → counts still show old values
- Logout/login → counts correct

**Root Cause (likely):**
- Cache invalidation not working
- tRPC query cache not being cleared after mutation
- Server not recalculating `_count` relations

**Priority:** MEDIUM (workaround exists: logout/login)
**Component:** Entry deletion, cache invalidation
**Files:**
- Entry delete mutation
- tRPC query invalidation

**Fix (likely):**
```typescript
// After delete mutation succeeds
await utils.entry.getAll.invalidate();
await utils.reservation.getAll.invalidate();
```

---

### 3.3 Card View - Manual Dancer Count

**Issue:** Must manually count dancers in card view

**User Story:**
> "In card view I have to manually count dancers to make sure I have the correct number of kids in each number"

**Current Behavior:**
- Card shows dancer names (or list)
- SD has to count names manually

**Desired Behavior:**
- Show participant count badge: "5 dancers"
- Optionally: Show participant list in collapsed/expandable section

**Priority:** LOW (table view has this)
**Component:** Routine card component

**Example UI:**
```
┌─────────────────────────┐
│ "Sparkle"               │
│ Jazz · Sapphire · Teen  │
│ 👥 5 dancers            │  ← ADD THIS
│ $75                     │
└─────────────────────────┘
```

---

### 3.4 Classification Not Visible in Views

**Issue:** Classification hidden in both table and card views

**User Story:**
> "Can classification be visible? It's one of the most important elements SDs want to check"

**Current Behavior:**
- Classification only visible when editing entry
- Not shown in table or card list views
- SD must click into each entry to verify

**Desired Behavior:**
- Classification visible in BOTH table and card views
- Helps SD quickly verify correct tier before submission

**Priority:** HIGH (critical info for verification)
**Component:** Entries list (table + card views)

**Table View:**
| Title | Category | **Classification** | Age Group | Dancers | Fee |
|-------|----------|-------------------|-----------|---------|-----|
| Sparkle | Jazz | **Sapphire** | Teen | 5 | $75 |

**Card View:**
```
┌─────────────────────────┐
│ "Sparkle"               │
│ Jazz · Sapphire · Teen  │  ← Classification here
│ 👥 5 dancers · $75      │
└─────────────────────────┘
```

---

## Summary of Priorities

**HIGH Priority (Fix Next):**
1. ❗ Classification auto-detection bug (causes incorrect pricing)
2. ❗ Draft table missing columns (blocks SD workflow)
3. ❗ Classification not visible in views (critical verification step)

**MEDIUM Priority:**
1. Exception request cancel feature (workaround: delete routine instead)
2. Stale counts after delete (workaround: logout/login)

**LOW Priority:**
1. Card view manual dancer count (table view has this info)

---

## Notes for Implementation

**Classification Visibility:**
- This is the MOST REQUESTED feature
- Add to both views in same PR
- Coordinate with auto-detection bug fix (test together)

**Cache Invalidation Pattern:**
- Check ALL delete mutations for proper invalidation
- Likely affects: entries, dancers, reservations
- Use tRPC's `utils.invalidate()` pattern consistently

**Exception Requests:**
- Check if exception request system exists
- May need to build cancel mutation from scratch
- Coordinate with existing approval/rejection flow
