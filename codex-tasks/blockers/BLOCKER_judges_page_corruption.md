# BLOCKER: Judges Page File Corruption

**Date**: October 11, 2025
**Priority**: HIGH
**Blocking**: Build, all development work

## Issue

`src/app/dashboard/judges/page.tsx` has file corruption:

1. **Lines 1-14**: Duplicate/broken JSX fragments at start of file
2. **Missing import**: `JudgeBulkImportModal` is used but not imported
3. **Missing state**: `showBulkImportModal` is referenced but not declared
4. **Line 165**: Corrupted text `?z Add Judge` (should be `+ Add Judge`)
5. **Line 172**: Corrupted text `dY", Bulk Import CSV` (should be `📊 Bulk Import CSV`)

## Root Cause

Likely from incomplete Codex task or merge conflict. File has duplicate content from different edits.

## Fix Required

### Step 1: Remove lines 1-14 (broken content)
Delete everything before the second `'use client';` on line 15.

### Step 2: Add missing import (after line 17)
```typescript
import JudgeBulkImportModal from '@/components/JudgeBulkImportModal';
```

### Step 3: Add missing state (after line 22)
```typescript
const [showBulkImportModal, setShowBulkImportModal] = useState(false);
```

### Step 4: Fix line 165 (currently 179 after removing first 14 lines)
```typescript
// Before:
?z Add Judge

// After:
+ Add Judge
```

### Step 5: Fix line 172 (currently 186 after removing first 14 lines)
```typescript
// Before:
dY", Bulk Import CSV

// After:
📊 Bulk Import CSV
```

## Alternative

If JudgeBulkImportModal component doesn't exist yet:
1. Comment out lines 6-11 (bulk import button + modal)
2. Remove `showBulkImportModal` references
3. Create task for Codex to implement JudgeBulkImportModal later

## Impact

**Build fails** - Cannot commit terminology changes until this is fixed.

## Status

Needs immediate manual intervention or Codex task with explicit fix instructions.
