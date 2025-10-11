# CompPortal Master Backlog - All Future Work

**Last Updated**: October 7, 2025
**Status**: Session shutdown consolidation
**Purpose**: Single source of truth for all pending features, polish, and improvements

---

## 📊 Summary

**Total Items**: 59 improvements across 3 categories
**Estimated Time**: 25-33 hours total

| Category | Items | Time | Priority |
|----------|-------|------|----------|
| **Thursday Features** | 18 | 8-10 hours | 🔥 URGENT for Thursday overnight |
| **UX Polish** | 40 | 17-23 hours | ⭐️ HIGH impact |
| **Quick Wins** | 1 | 15 min | ✅ Optional |

---

## 🔥 URGENT: Thursday Overnight Features (18 items)

**Source**: THURSDAY_FEATURES.md
**Timeline**: Thursday overnight implementation session
**Total Time**: 8-10 hours

### Priority: URGENT 🔥🔥🔥 (3 items - 2.25 hours)

#### 1. Support Ticket Chat Embed (60 min)
**Role**: Shared (both SD + CD)
**Description**: Live chat widget (Crisp/Intercom) in bottom-right corner
**Files**: Layout wrapper
**Implementation**:
```tsx
<script src="https://widget.crisp.chat/..." async />
```

#### 2. Studio Setup Wizard on First Login (45 min)
**Role**: Studio Director
**Description**: Modal wizard on first login collecting studio info (logo, address, phone)
**Files**: StudioDirectorDashboard.tsx
**Backend**: studio.updateProfile mutation

#### 3. Custom Signup Confirmation Email (30 min)
**Role**: Shared
**Description**: Professional welcome email with getting started guide
**Files**: New email template + auth trigger

### Priority: HIGH ⭐️⭐️ (9 items - 7.25 hours)

#### 4. Private Notes on Studios (45 min)
**Role**: Competition Director
**Description**: Internal notes field (not visible to studios)
**Backend**: Add `internal_notes` column to studios table
**Migration**:
```sql
ALTER TABLE studios ADD COLUMN internal_notes TEXT;
```

#### 5. Judge Assignment via Drag/Drop (90 min)
**Role**: Competition Director
**Description**: Drag judges onto competition cards to assign
**Files**: judges/page.tsx with drag/drop
**Backend**: judge.assignToCompetition mutation

#### 6. Dashboard Card Reordering (Already Implemented ✅)
**Status**: Complete (SortableDashboardCards.tsx)

#### 7. "Add Judges" Flow Improvements (60 min)
**Role**: Competition Director
**Description**: Bulk add judges with CSV import
**Files**: BulkJudgeImport.tsx modal

#### 8. Edit Routines Inline (60 min)
**Role**: Studio Director
**Description**: Click routine → edit modal (not full form)
**Files**: EntryEditModal.tsx with inline editing

#### 9. Studio Activity Feed (45 min)
**Role**: Studio Director
**Description**: Feed showing recent actions (routine created, invoice paid)
**Files**: ActivityFeed.tsx component
**Backend**: activity_logs table

#### 10. Random Dance Quote on Dashboard (15 min)
**Role**: Shared
**Description**: Inspirational quote rotates daily
**Implementation**: Array of 50+ quotes, pick based on date

#### 11. Welcome Back by Name (15 min)
**Role**: Shared
**Description**: "Welcome back, Sarah!" instead of generic greeting
**Files**: Dashboard components

#### 12. Consistent Routine Card Heights (15 min)
**Role**: Studio Director
**Description**: CSS fix to align routine cards
**Fix**: `min-h-[200px]` on all routine cards

### Priority: MEDIUM ⭐️ (3 items - 1.5 hours)

#### 13. Competition Filters on All Pages (30 min)
**Description**: Dropdown to filter views by competition
**Files**: All list pages

#### 14. Routine Status Timeline (45 min)
**Description**: Visual timeline showing routine status history
**Files**: EntryDetail.tsx

#### 15. Quick Stats Widget (15 min)
**Description**: Small widget showing key metrics
**Files**: Dashboard

### Database Migrations Required
```sql
-- Private notes for studios
ALTER TABLE studios ADD COLUMN internal_notes TEXT;

-- Activity logs tracking
CREATE TABLE activity_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES user_profiles(id),
  action TEXT NOT NULL,
  entity_type TEXT NOT NULL,
  entity_id UUID,
  details JSONB,
  created_at TIMESTAMP DEFAULT NOW()
);
```

**Complete Implementation Guide**: See THURSDAY_FEATURES.md for detailed code examples

---

## ⭐️ UX Polish & Professional Feel (40 items)

**Source**: FUTURE_POLISH.md
**Total Time**: 17-23 hours
**Status**: ✅ **ALL PHASES COMPLETE** (Sessions Oct 7-10, 2025)

### ✅ Completed Polish (10/45)
1. ✅ Copy-to-Clipboard - Studio codes with toast confirmation
2. ✅ Sticky Table Headers - Headers stay visible on scroll
3. ✅ Micro-Interactions - Icon hover effects (scale transform)
4. ✅ Smooth Transitions - Fade-in animations on cards
5. ✅ Animation Framework - Added to Tailwind config (fade-in, slide-up, shimmer)
6. ✅ #8: Success Animations - Toast notifications with animations
7. ✅ #7: Skeleton Loading - Content-aware shimmer patterns
8. ✅ #6: Count Badges - Count indicators on cards/buttons
9. ✅ #9: Hover Previews - Table row hover with 400ms delay
10. ✅ #10: Search Highlighting - Matched text highlighting

### Phase 1: Critical UX - ✅ COMPLETE
- [x] #21: Bulk Selection Shortcuts ✅ (useBulkSelection.ts)
- [x] #24: Data Refresh Indicator ✅ (formatDistanceToNow)
- [x] #26: Auto-Save for Forms ✅ (useAutoSave.ts)
- [x] #27: Undo/Redo ✅ (useUndoRedo.ts)
- [x] #32: Smart Defaults ✅ (Implemented across forms)
- [x] #31: Optimistic UI Updates ✅ (EntriesList, AllInvoicesList)

### Phase 2: Mobile First - ✅ COMPLETE
- [x] #14: Larger Touch Targets ✅ (min-h-[44px] globally)
- [x] #15: Mobile-Optimized Tables ✅ (Card views)
- [x] #11: Bottom Navigation ✅ (MobileBottomNav.tsx)
- [x] #13: Pull-to-Refresh ✅ (4 components)

### Phase 3: Data & Professional - ✅ COMPLETE
- [x] #19: Export to PDF ✅ (pdf-reports.ts)
- [x] #42: Studio-Branded Invoices ✅
- [x] #20: Print Stylesheets ✅ (globals.css)
- [x] #25: Bulk Edit Mode ✅ (BulkEditMode.tsx)
- [x] #33: Field-Level Validation ✅ (useFieldValidation.ts)
- [x] #34: Conflict Detection ✅ (useConflictDetection.ts)

### Phase 4: Delight & Polish - ✅ COMPLETE
- [x] #8: Success Animations ✅
- [x] #7: Skeleton Loading ✅
- [x] #6: Count Badges ✅
- [x] #9: Hover Previews ✅
- [x] #10: Search Highlighting ✅
- [x] #28: Smart Date Pickers ✅ (DatePicker.tsx)
- [x] #29: Contextual Help ✅ (ContextualHelp.tsx)

### Phase 5: Advanced Features - ✅ COMPLETE
- [x] #41: Dark/Light Mode ✅ (ThemeToggle.tsx)
- [x] #37: Notification Center ✅ (NotificationCenter.tsx)
- [x] #36: Desktop Notifications ✅ (useNotifications.ts)
- [x] #33: Field-Level Validation ✅ (FieldValidation.tsx)
- [x] #34: Conflict Detection ✅ (ConflictDisplay.tsx)
- [x] #16: FAB ✅ (FloatingActionButton.tsx)
- [x] #12: Swipe-to-Delete ✅ (SwipeToDelete.tsx)

### Phase 6: Nice-to-Have - ✅ COMPLETE
- [x] #35: Activity Feed ✅ (ActivityFeed.tsx)
- [x] #22: Saved Searches ✅ (SavedSearches.tsx)
- [x] #23: Recent Items ✅ (RecentItems.tsx)
- [x] #18: Mobile Search Autocomplete ✅ (MobileSearchAutocomplete.tsx)
- [x] #17: Haptic Feedback ✅ (haptics.ts)
- [x] #43: Custom Competition Themes ✅ (ThemeToggle.tsx)
- [x] #44: Accessibility Mode ✅ (ARIA labels throughout)
- [x] #45: Font Size Preferences ✅ (FontSizeControl.tsx)
- [x] #30: Keyboard Navigation Hints ✅ (KeyboardShortcutsModal.tsx)
- [x] #38: Smart Notification Grouping ✅ (useNotificationGrouping.ts)
- [x] #39: Notification Preferences ✅ (NotificationPreferences.tsx)
- [x] #40: Email Digest ✅ (EmailDigestSettings.tsx)

**Complete Implementation Guide**: See FUTURE_POLISH.md for code examples and detailed specs

---

## ✅ Quick Wins Remaining (1 item)

**Source**: QUICK_WINS_TODO.md
**Status**: 8/9 complete (89%)

### Form Validation Feedback (15 min)
**Files**: DancerForm.tsx, ReservationForm.tsx, EntryForm.tsx
**Description**: Add visual feedback for required fields
**Implementation**:
```tsx
<input
  required
  className={`... ${errors.name ? 'border-red-500' : 'border-white/20'}`}
  {...register('name', { required: 'Name is required' })}
/>
{errors.name && (
  <p className="text-red-400 text-sm mt-1">{errors.name.message}</p>
)}
```
**Note**: Optional - most forms already have basic HTML5 validation

---

## 🚀 Implementation Strategy

### For Thursday Overnight Session:
1. **Start with URGENT items** (3 items, 2.25 hours)
2. **Move to HIGH priority** (9 items, 7.25 hours)
3. **MEDIUM if time permits** (3 items, 1.5 hours)
4. Use code examples in THURSDAY_FEATURES.md
5. Test each feature before moving to next
6. Apply database migrations first

### For Future Polish Sessions:
1. **Pick a phase** from UX Polish section
2. **Read FUTURE_POLISH.md** for that specific item
3. **Implement** following code examples
4. **Test build** after each 2-3 items
5. **Commit** with descriptive message
6. **Update this tracker** - move to "Completed" section

### General Rules:
- All improvements designed to be **non-breaking**
- Can be implemented **incrementally** (no dependencies)
- Each has **code examples** for fast implementation
- **Build status** must pass before commit
- Focus on **high-impact, user-facing** improvements first

---

## 📁 Related Documentation

**Active Trackers** (being consolidated here):
- ~~THURSDAY_FEATURES.md~~ → Merged into this file (Section 1)
- ~~FUTURE_POLISH.md~~ → Merged into this file (Section 2)
- ~~QUICK_WINS_TODO.md~~ → Merged into this file (Section 3)
- ~~POLISH_IMPROVEMENTS.md~~ → Original source, archived

**Completed Work**:
- BUGS_AND_FEATURES.md → All Phase 1-5 complete (25 issues)
- PROJECT_STATUS.md → Main project status & history

**Next Session**:
1. Read MASTER_BACKLOG.md (this file)
2. Choose Thursday Features or UX Polish phase
3. Implement with code examples from source docs
4. Update completion status here

---

## ✨ Success Criteria

**Before marking any item complete:**
- ✅ Feature implemented fully
- ✅ Build passes (npm run build)
- ✅ Tested in production
- ✅ Committed with descriptive message
- ✅ This tracker updated

**Session Complete When:**
- All items in chosen phase marked complete
- Build passing
- Production verified
- Ready for next session
