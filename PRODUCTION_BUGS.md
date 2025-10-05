# Production Bugs Found - E2E Testing Session

**Date**: October 5, 2025
**Testing Method**: Playwright MCP E2E Testing
**Status**: Active Bug Hunting

---

## 🔴 CRITICAL: Entries Page Crash (React Hook Error)

**Severity**: CRITICAL - Page completely broken
**URL**: https://comp-portal-one.vercel.app/dashboard/entries
**Error**: `Minified React error #310` - Hooks called in wrong order

### Symptoms
- Page shows blank white screen with error message
- Console error: React error #310 (useState violation)
- API calls succeed (200 OK) but component fails to render

### Root Cause
**File**: `src/components/EntriesList.tsx:56`

Hooks order violation:
```typescript
// ❌ WRONG - Hook order changes between renders
export default function EntriesList() {
  const { data, isLoading } = trpc.entry.getAll.useQuery();
  const [filter, setFilter] = useState(...);
  const [selectedCompetition, setSelectedCompetition] = useState(...);
  const [viewMode, setViewMode] = useState(...);

  const { data: reservationData } = trpc.reservation.getAll.useQuery(...);

  if (isLoading) {
    return <LoadingSkeleton />; // ❌ EARLY RETURN
  }

  // ❌ These hooks called AFTER conditional return
  const { sortedData, sortConfig, requestSort } = useTableSort(filteredEntries);
}
```

### Impact
- Studio Directors cannot view "My Routines" page
- Cannot create, edit, or manage routines
- Core workflow completely broken
- **Business Impact**: Studios cannot register for competitions

### Fix Required
Move all hooks BEFORE any conditional returns to maintain consistent hook order:

```typescript
// ✅ CORRECT - All hooks before conditional logic
export default function EntriesList() {
  const { data, isLoading } = trpc.entry.getAll.useQuery();
  const [filter, setFilter] = useState(...);
  const [selectedCompetition, setSelectedCompetition] = useState(...);
  const [viewMode, setViewMode] = useState(...);
  const { data: reservationData } = trpc.reservation.getAll.useQuery(...);

  const entries = data?.entries || [];
  const filteredEntries = entries.filter(...);
  const { sortedData, sortConfig, requestSort } = useTableSort(filteredEntries);

  if (isLoading) {
    return <LoadingSkeleton />;
  }

  // Rest of component...
}
```

### Priority
**P0 - IMMEDIATE FIX REQUIRED**

---

## Design & Accessibility Issues

### Issue 1: No Loading State Visible During Navigation
**Severity**: Low
**Pages**: All pages with quick login

**Description**: When clicking "Studio Director" button, page navigates instantly without visual feedback.

**Recommendation**: Consider adding transition or loading indicator for better UX.

---

## Testing Progress

- ✅ Homepage rendering
- ✅ Quick login buttons functional
- ✅ Studio dashboard loads
- ✅ Dancers page loads and displays data
- 🔴 **Entries page CRITICAL FAILURE**
- ⏳ Reservations page (pending)
- ⏳ Invoices page (pending)
- ⏳ Settings page (pending)
- ⏳ Competition Director flow (pending)
- ⏳ Judge scoring interface (pending)

---

## Next Steps

1. **IMMEDIATE**: Fix entries page hook ordering bug
2. Continue E2E testing on remaining pages
3. Test Competition Director workflow
4. Test Judge scoring interface
5. Accessibility audit (keyboard navigation, screen readers, contrast)
