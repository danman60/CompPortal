# Filter Dropdown Position Bug - Claude Code Handoff

**Date:** December 5, 2025
**File:** `D:\ClaudeCode\CompPortal-tester\src\components\scheduling\RoutinePool.tsx`
**Branch:** tester

---

## Problem Summary

Filter dropdown menus (Class, Age, Category, Size, Studio) appear way below the button instead of directly underneath it. See screenshot - the Category dropdown appears far down the page.

---

## Root Cause (VERIFIED from current code ~line 490-500)

The dropdown position calculation incorrectly adds `window.scrollY` to a `fixed` positioned element:

```typescript
React.useEffect(() => {
  if (isOpen && buttonRef.current) {
    const rect = buttonRef.current.getBoundingClientRect();
    setDropdownPosition({
      top: rect.bottom + window.scrollY + 4,  // ← WRONG: scrollY not needed for fixed
      left: rect.left + window.scrollX,        // ← WRONG: scrollX not needed for fixed
    });
  }
}, [isOpen]);
```

**Why it's wrong:** `getBoundingClientRect()` returns viewport-relative coordinates. For `position: fixed` elements, you use these directly. Adding scroll offset pushes the dropdown down by the scroll distance.

---

## COMPLETE FIX

### Find the FilterDropdown component (~line 470)

Search for: `function FilterDropdown(`

### Find the useEffect that calculates position (~line 490)

Replace this block:

```typescript
// Calculate dropdown position when it opens
React.useEffect(() => {
  if (isOpen && buttonRef.current) {
    const rect = buttonRef.current.getBoundingClientRect();
    setDropdownPosition({
      top: rect.bottom + window.scrollY + 4,
      left: rect.left + window.scrollX,
    });
  }
}, [isOpen]);
```

**WITH:**

```typescript
// Calculate dropdown position when it opens
React.useEffect(() => {
  if (isOpen && buttonRef.current) {
    const rect = buttonRef.current.getBoundingClientRect();
    // For position:fixed, use viewport coordinates directly (no scroll offset)
    setDropdownPosition({
      top: rect.bottom + 4,   // 4px gap below button
      left: rect.left,
    });
  }
}, [isOpen]);
```

---

## Why This Fix Works

| Positioning | Coordinates needed |
|-------------|-------------------|
| `position: absolute` | Relative to positioned ancestor |
| `position: fixed` | Relative to viewport (what getBoundingClientRect returns) |

`getBoundingClientRect()` returns viewport-relative coordinates, which is exactly what `position: fixed` needs. No scroll adjustment required.

---

## Verification Steps

1. Open Schedule V2 on tester
2. Scroll down slightly in the routine pool
3. Click "Category" filter button
4. **Should see:** Dropdown appears directly below the button
5. Click "Class" filter button  
6. **Should see:** Dropdown appears directly below that button
7. Try with page scrolled to different positions - dropdown should always appear right below button

---

## Files

- `src/components/scheduling/RoutinePool.tsx` - line ~490-500

---

## Priority

**P1 - High** - Filters are unusable when dropdown appears in wrong location
