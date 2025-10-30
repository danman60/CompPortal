# Dancer Deletion UX Analysis & Implementation Plan

**Date:** October 30, 2025
**Session:** Investigation & Design
**Status:** Ready for Implementation
**Estimated Implementation Time:** 2.5-3 hours

---

## 🔍 Executive Summary

Users are reporting errors when trying to delete dancers. Investigation revealed that **the delete button is missing from the dancer detail page** (the most expected location). Users must navigate to the list page, switch to table view, select checkboxes, and click "Delete Selected" - a 5-step process instead of 1 click.

Additionally, the system blocks deletion if a dancer has competition entries, but provides no warning until the delete attempt fails.

**Recommendation:** Add delete/archive functionality directly to the dancer detail page with proactive entry count display and contextual action buttons.

---

## 📊 Current State Analysis

### What EXISTS:

1. **Bulk Delete (Table View Only)**
   - Checkbox selection for multiple dancers
   - "Delete Selected" button appears when dancers are checked
   - Shows count of selected dancers (e.g., "1 selected")
   - Keyboard shortcuts: Ctrl+A to select all, Esc to clear

2. **Backend Logic** (`src/server/routers/dancer.ts:374-431`)
   - Delete mutation works correctly
   - Blocks deletion if dancer has competition entries
   - Shows error: "Cannot delete dancer with X competition entries. Archive instead."
   - Archive functionality exists (`dancer.ts:433-483`)

3. **Database Schema**
   - `entry_participants` table has `onDelete: Cascade` (schema line 884)
   - Backend blocks this from happening (prevents cascade)
   - Soft delete via `status = 'archived'` available

### What's MISSING:

1. **❌ No Delete Button on Dancer Detail Page**
   - Location: `/dashboard/dancers/[id]`
   - Only has: Update Dancer & Cancel buttons
   - Component: `src/components/DancerForm.tsx` (lines 254-277)
   - File: `src/app/dashboard/dancers/[id]/page.tsx`

2. **❌ No Entry Count Visibility**
   - Users don't know if dancer can be deleted until they try
   - No warning that dancer is used in X entries
   - Query doesn't include `_count.entry_participants`

3. **❌ No Individual Delete in Card View**
   - Cards only have "Edit Dancer" button
   - No quick delete action
   - Mobile users can't delete at all (stuck in card view)

4. **❌ Table View Only**
   - Desktop users must know to switch views
   - Not discoverable for new users

---

## 🐛 User Pain Points

### Current User Journey (5 Steps):
1. User opens dancer detail page (`/dashboard/dancers/[id]`)
2. Looks for delete button → **doesn't exist**
3. Returns to dancers list page
4. Switches to table view (if they know to do this)
5. Selects checkbox
6. Clicks "Delete Selected"
7. **Gets error:** "Cannot delete dancer with 3 competition entries"
8. Frustrated - wasted time, unclear what to do next

### Expected User Journey (1 Step):
1. User opens dancer detail page
2. Sees "Archive Dancer" button (or "Delete Dancer" if no entries)
3. Clicks button → success

---

## 🎨 Proposed Design Solution

**Design Mockup:** `.playwright-mcp/mockup-enhanced-dancer-detail.png`
**HTML Mockup:** `.playwright-mcp/dancer-detail-mockup.html`

### Design Features:

#### **For Dancers WITH Entries** (Can't Delete)
```
┌─────────────────────────────────────────────────────┐
│ Dancer Information           🎭 In 3 Routines       │
├─────────────────────────────────────────────────────┤
│ [Form Fields: Name, DOB, Gender, Email, Phone]     │
├─────────────────────────────────────────────────────┤
│ ⚠️  Cannot Delete This Dancer                       │
│                                                      │
│ This dancer is registered in 3 competition          │
│ routines. To remove this dancer, you must:          │
│ • Remove them from all routines first, or           │
│ • Use "Archive" to keep their data while hiding     │
│   them from active lists                            │
├─────────────────────────────────────────────────────┤
│ [Cancel] [Update Dancer] [📦 Archive Dancer]       │
└─────────────────────────────────────────────────────┘
```

**Visual Elements:**
- **Purple badge:** "🎭 In 3 Routines" (top right corner)
- **Yellow/gold alert box:** Warning style with clear explanation
- **Archive button:** Yellow themed, with archive emoji
- **Glassmorphic card:** Maintains existing design system

#### **For Dancers WITHOUT Entries** (Can Delete)
```
┌─────────────────────────────────────────────────────┐
│ Dancer Information           ✅ No Routines         │
├─────────────────────────────────────────────────────┤
│ [Form Fields: Name, DOB, Gender, Email, Phone]     │
├─────────────────────────────────────────────────────┤
│ ℹ️  Safe to Delete                                  │
│                                                      │
│ This dancer is not registered in any competition    │
│ routines. You can safely delete this dancer if      │
│ needed.                                              │
├─────────────────────────────────────────────────────┤
│ [Cancel] [Update Dancer] [🗑️ Delete Dancer]        │
└─────────────────────────────────────────────────────┘
```

**Visual Elements:**
- **Green badge:** "✅ No Routines" (top right corner)
- **Blue alert box:** Info style with reassurance
- **Delete button:** Red themed, with trash emoji
- **Glassmorphic card:** Maintains existing design system

### Design Improvements:

1. **Proactive Information**
   - Entry count badge immediately visible (no guessing)
   - Color-coded: Purple = has routines, Green = clean
   - Alert box explains the situation upfront

2. **Clear Visual Hierarchy**
   - Glassmorphic cards with better contrast
   - Larger, easier-to-read text
   - Better spacing between form fields
   - Consistent with existing CompPortal design

3. **Contextual Actions**
   - Archive button only shows when needed (has entries)
   - Delete button only shows when safe (no entries)
   - Warning/info boxes match the available actions

4. **Better UX**
   - Users know immediately if they can delete
   - Clear explanation of what "Archive" means
   - Bullet points explain next steps
   - No surprises or errors

---

## 💻 Implementation Plan

### **Phase 1: Backend Changes** (15-30 min)

**File:** `src/server/routers/dancer.ts`

**Change:** Add entry count to `getById` query

```typescript
// Line ~114-155: Modify getById to include entry count
getById: publicProcedure
  .input(z.object({ id: z.string().uuid() }))
  .query(async ({ input }) => {
    const dancer = await prisma.dancers.findUnique({
      where: { id: input.id },
      include: {
        studios: {
          select: {
            id: true,
            name: true,
            code: true,
            city: true,
            province: true,
          },
        },
        entry_participants: {
          include: {
            competition_entries: {
              select: {
                id: true,
                title: true,
                competition_id: true,
                competitions: {
                  select: {
                    name: true,
                    competition_start_date: true,
                  },
                },
              },
            },
          },
        },
        _count: {
          select: {
            entry_participants: true,  // ← ADD THIS
          },
        },
      },
    });

    if (!dancer) {
      throw new Error('Dancer not found');
    }

    return dancer;
  }),
```

**Note:** Backend delete and archive mutations already exist and work correctly.

---

### **Phase 2: Frontend Component Updates** (1.5-2 hours)

**File:** `src/components/DancerForm.tsx`

**Changes Required:**

#### 2.1 Add Delete Mutation (20 min)
```typescript
const deleteMutation = trpc.dancer.delete.useMutation({
  onSuccess: () => {
    utils.dancer.getAll.invalidate();
    toast.success('Dancer deleted successfully');
    router.push('/dashboard/dancers');
  },
  onError: (err) => toast.error(err.message || 'Failed to delete dancer'),
});
```

#### 2.2 Add Archive Mutation (20 min)
```typescript
const archiveMutation = trpc.dancer.archive.useMutation({
  onSuccess: () => {
    utils.dancer.getAll.invalidate();
    utils.dancer.getById.invalidate({ id: dancerId! });
    toast.success('Dancer archived successfully');
    router.push('/dashboard/dancers');
  },
  onError: (err) => toast.error(err.message || 'Failed to archive dancer'),
});
```

#### 2.3 Add Handler Functions (15 min)
```typescript
const handleDelete = async () => {
  if (!confirm('Are you sure you want to delete this dancer? This action cannot be undone.')) {
    return;
  }

  try {
    await deleteMutation.mutateAsync({ id: dancerId! });
  } catch (error) {
    console.error('Delete error:', error);
  }
};

const handleArchive = async () => {
  if (!confirm('Archive this dancer? They will be hidden from active lists but their data will be preserved.')) {
    return;
  }

  try {
    await archiveMutation.mutateAsync({ id: dancerId! });
  } catch (error) {
    console.error('Archive error:', error);
  }
};
```

#### 2.4 Calculate Entry Count (5 min)
```typescript
// After existingDancer is loaded
const entriesCount = existingDancer?._count?.entry_participants || 0;
const canDelete = entriesCount === 0;
```

#### 2.5 Add Badge Component (15 min)
```tsx
{/* Entry Count Badge - Add after form header */}
{isEditMode && existingDancer && (
  <div className={`inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-semibold ${
    entriesCount > 0
      ? 'bg-purple-500/20 border border-purple-400/30 text-purple-300'
      : 'bg-green-500/20 border border-green-400/30 text-green-300'
  }`}>
    {entriesCount > 0 ? '🎭' : '✅'}
    {entriesCount > 0 ? `In ${entriesCount} Routine${entriesCount > 1 ? 's' : ''}` : 'No Routines'}
  </div>
)}
```

#### 2.6 Add Info/Warning Alert (20 min)
```tsx
{/* Info/Warning Alert - Add before action buttons */}
{isEditMode && existingDancer && (
  <div className={`flex items-start gap-4 p-4 rounded-xl border mb-6 ${
    entriesCount > 0
      ? 'bg-yellow-500/10 border-yellow-400/30'
      : 'bg-blue-500/10 border-blue-400/30'
  }`}>
    <div className="text-2xl flex-shrink-0">
      {entriesCount > 0 ? '⚠️' : 'ℹ️'}
    </div>
    <div>
      <h3 className={`font-semibold mb-2 ${
        entriesCount > 0 ? 'text-yellow-300' : 'text-blue-300'
      }`}>
        {entriesCount > 0 ? 'Cannot Delete This Dancer' : 'Safe to Delete'}
      </h3>
      <p className="text-gray-300 text-sm mb-2">
        {entriesCount > 0
          ? `This dancer is registered in ${entriesCount} competition routine${entriesCount > 1 ? 's' : ''}. To remove this dancer, you must:`
          : 'This dancer is not registered in any competition routines. You can safely delete this dancer if needed.'
        }
      </p>
      {entriesCount > 0 && (
        <ul className="text-gray-300 text-sm list-disc pl-5">
          <li>Remove them from all routines first, or</li>
          <li>Use "Archive" to keep their data while hiding them from active lists</li>
        </ul>
      )}
    </div>
  </div>
)}
```

#### 2.7 Add Conditional Buttons (20 min)
```tsx
{/* Action Buttons - Replace existing buttons section */}
<div className="flex gap-4 justify-end flex-wrap">
  <button
    type="button"
    onClick={() => router.push('/dashboard/dancers')}
    className="px-6 py-3 bg-white/10 backdrop-blur-md text-white rounded-lg border border-white/20 hover:bg-white/20 transition-all duration-200"
  >
    Cancel
  </button>

  <button
    type="submit"
    disabled={isEditMode ? updateDancer.isPending : createDancer.isPending}
    className="px-6 py-3 bg-gradient-to-r from-pink-500 to-purple-500 text-white rounded-lg hover:shadow-lg transition-all duration-200 transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
  >
    {isEditMode
      ? updateDancer.isPending
        ? 'Updating...'
        : 'Update Dancer'
      : createDancer.isPending
      ? 'Creating...'
      : 'Create Dancer'}
  </button>

  {/* Delete/Archive Button - Only in edit mode */}
  {isEditMode && existingDancer && (
    canDelete ? (
      <button
        type="button"
        onClick={handleDelete}
        disabled={deleteMutation.isPending}
        className="px-6 py-3 bg-red-500/20 border border-red-400/40 text-red-300 rounded-lg hover:bg-red-500/30 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {deleteMutation.isPending ? 'Deleting...' : '🗑️ Delete Dancer'}
      </button>
    ) : (
      <button
        type="button"
        onClick={handleArchive}
        disabled={archiveMutation.isPending}
        className="px-6 py-3 bg-yellow-500/20 border border-yellow-400/40 text-yellow-300 rounded-lg hover:bg-yellow-500/30 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {archiveMutation.isPending ? 'Archiving...' : '📦 Archive Dancer'}
      </button>
    )
  )}
</div>
```

---

### **Phase 3: Testing** (30 min)

**Test Scenarios:**

1. **Dancer with 0 entries:**
   - [ ] Badge shows "✅ No Routines" (green)
   - [ ] Info alert shows "Safe to Delete" (blue)
   - [ ] Delete button appears (red)
   - [ ] Delete button shows confirmation dialog
   - [ ] Delete succeeds and redirects to list
   - [ ] Toast shows success message

2. **Dancer with 1+ entries:**
   - [ ] Badge shows "🎭 In X Routines" (purple)
   - [ ] Warning alert shows "Cannot Delete" (yellow)
   - [ ] Archive button appears (yellow)
   - [ ] Archive button shows confirmation dialog
   - [ ] Archive succeeds and redirects to list
   - [ ] Dancer status changes to 'archived'
   - [ ] Toast shows success message

3. **Error Handling:**
   - [ ] Network error shows error toast
   - [ ] Backend error shows error toast
   - [ ] Optimistic update reverts on error

4. **Multi-Tenant:**
   - [ ] Test on EMPWR tenant
   - [ ] Test on Glow tenant
   - [ ] Verify tenant_id filtering works

**Production Testing:**
- Test with real dancer: `Daniel Abrahamson` (fb17e692-6c11-4415-b876-dab1edad7762) - has entries
- Test with test dancer: `Test Dancer` (126f8deb-766a-4bb7-ad70-bffe507c2aa9) - check entry count

---

## 📈 Implementation Timeline

| Phase | Task | Time | Difficulty |
|-------|------|------|-----------|
| **Phase 1** | Backend: Add `_count` to query | 15 min | Easy |
| **Phase 2.1** | Frontend: Delete mutation | 20 min | Easy |
| **Phase 2.2** | Frontend: Archive mutation | 20 min | Easy |
| **Phase 2.3** | Frontend: Handler functions | 15 min | Easy |
| **Phase 2.4** | Frontend: Entry count calc | 5 min | Easy |
| **Phase 2.5** | Frontend: Badge component | 15 min | Medium |
| **Phase 2.6** | Frontend: Alert component | 20 min | Medium |
| **Phase 2.7** | Frontend: Conditional buttons | 20 min | Medium |
| **Phase 3** | Testing both scenarios | 30 min | Medium |
| **Total** | | **2.5-3 hours** | |

**Dependencies:**
- No new packages required
- Uses existing tRPC mutations
- Uses existing Tailwind classes
- Matches existing glassmorphic design

**Risk Level:** ✅ **Low**
- Backend mutations already exist and work
- No database changes required
- No breaking changes to existing functionality
- Can be implemented incrementally

---

## 🚀 Deployment Strategy

### Pre-Deployment Checklist:
- [ ] Run `npm run build` - verify no TypeScript errors
- [ ] Test locally on both scenarios
- [ ] Git commit with descriptive message
- [ ] Push to GitHub
- [ ] Wait for Vercel deployment
- [ ] Test on production URL (empwr.compsync.net)
- [ ] Test on both tenants (EMPWR + Glow)

### Rollback Plan:
- If issues occur, simply revert the commit
- No database migrations needed
- Backend endpoints unchanged (only query modified)

---

## 📝 Additional Recommendations (Future Enhancements)

### Priority 2 Enhancements (Post-Launch):

1. **Add Entry Count Column to Table View** (1 hour)
   - Show entry count in table
   - Visual indicator for deletable dancers
   - Quick delete icon for dancers with 0 entries

2. **Mobile-Friendly Delete in Card View** (30 min)
   - Add delete/archive button to cards
   - Maintain consistency with detail page

3. **Bulk Archive** (45 min)
   - Allow archiving multiple dancers at once
   - Useful for end-of-season cleanup

4. **Show Which Routines** (1 hour)
   - List routine titles in the warning alert
   - Link to each routine for quick access
   - Helps users understand what needs to be changed

### Example: "Which Routines" Enhancement
```
⚠️ Cannot Delete This Dancer

This dancer is registered in 3 competition routines:
• "Swan Lake Solo" (Solo, Contemporary)
• "Hip Hop Crew" (Large Group, Hip Hop)
• "Jazz Duet" (Duet/Trio, Jazz)

To delete this dancer, remove them from these routines first,
or use "Archive" to preserve their data.
```

---

## 📸 Design Assets

**Files Created:**
- `D:\ClaudeCode\.playwright-mcp\dancer-detail-mockup.html` - Full HTML mockup
- `D:\ClaudeCode\.playwright-mcp\mockup-enhanced-dancer-detail.png` - Screenshot
- `D:\ClaudeCode\.playwright-mcp\dancer-detail-page.png` - Current production state
- `D:\ClaudeCode\.playwright-mcp\dancers-table-view.png` - Table view with bulk delete
- `D:\ClaudeCode\.playwright-mcp\dancers-table-delete-button.png` - Delete button in action

**View Mockup:**
Open `D:\ClaudeCode\.playwright-mcp\dancer-detail-mockup.html` in browser to see interactive design.

---

## 🎯 Success Criteria

**Definition of Done:**
- [ ] Users can delete dancers with 0 entries from detail page
- [ ] Users can archive dancers with entries from detail page
- [ ] Entry count is visible before attempting delete
- [ ] Clear visual feedback for both scenarios
- [ ] Error messages are helpful and actionable
- [ ] Works on both EMPWR and Glow tenants
- [ ] No console errors or warnings
- [ ] Build passes successfully
- [ ] Matches existing glassmorphic design

**User Experience Goals:**
- ✅ Delete action takes 1 click instead of 5 steps
- ✅ Users know immediately if they can delete
- ✅ No surprising error messages
- ✅ Clear path forward when deletion is blocked
- ✅ Archive option is discoverable

---

## 📚 Reference Documentation

**Backend Files:**
- `src/server/routers/dancer.ts:374-431` - Delete mutation
- `src/server/routers/dancer.ts:433-483` - Archive mutation
- `src/server/routers/dancer.ts:114-155` - getById query

**Frontend Files:**
- `src/components/DancerForm.tsx` - Main component to modify
- `src/app/dashboard/dancers/[id]/page.tsx` - Page wrapper (uses DancerForm)

**Database Schema:**
- `prisma/schema.prisma:884` - entry_participants relation (onDelete: Cascade)
- `prisma/schema.prisma:747-767` - dancers table

**Related Components:**
- `src/components/DancersList.tsx:21-48` - Bulk delete implementation (reference)
- `src/components/DancersList.tsx:157-187` - Delete handler (reference)

---

**Next Session:** Ready to implement immediately. Start with Phase 1 (15 min backend change) then Phase 2 (frontend updates).
