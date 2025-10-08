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
**Status**: 5 items complete, 40 remaining

### ✅ Completed Polish (5/45)
1. ✅ Copy-to-Clipboard - Studio codes with toast confirmation
2. ✅ Sticky Table Headers - Headers stay visible on scroll
3. ✅ Micro-Interactions - Icon hover effects (scale transform)
4. ✅ Smooth Transitions - Fade-in animations on cards
5. ✅ Animation Framework - Added to Tailwind config (fade-in, slide-up, shimmer)

### Phase 1: Critical UX (2-3 hours) - DO NEXT
- [ ] #21: Bulk Selection Shortcuts (20 min)
- [ ] #24: Data Refresh Indicator (15 min)
- [ ] #26: Auto-Save for Forms (45 min)
- [ ] #27: Undo/Redo (30 min)
- [ ] #32: Smart Defaults (30 min)
- [ ] #31: Optimistic UI Updates (60 min)

### Phase 2: Mobile First (2-3 hours)
- [ ] #14: Larger Touch Targets (15 min)
- [ ] #15: Mobile-Optimized Tables (45 min)
- [ ] #11: Bottom Navigation (30 min)
- [ ] #13: Pull-to-Refresh (20 min)

### Phase 3: Data & Professional (3-4 hours)
- [ ] #19: Export to PDF (60 min)
- [ ] #42: Studio-Branded Invoices (60 min)
- [ ] #20: Print Stylesheets (30 min)
- [ ] #25: Bulk Edit Mode (60 min)

### Phase 4: Delight & Polish (3-4 hours)
- [ ] #8: Success Animations (15 min)
- [ ] #7: Skeleton Loading (20 min)
- [ ] #6: Count Badges (15 min) ⏳ STARTED in ReservationsList
- [ ] #9: Hover Previews (20 min)
- [ ] #10: Search Highlighting (15 min)
- [ ] #28: Smart Date Pickers (30 min)
- [ ] #29: Contextual Help (45 min)

### Phase 5: Advanced Features (4-5 hours)
- [ ] #41: Dark/Light Mode (45 min)
- [ ] #37: Notification Center (45 min)
- [ ] #36: Desktop Notifications (30 min)
- [ ] #33: Field-Level Validation (45 min)
- [ ] #34: Conflict Detection (60 min)
- [ ] #16: FAB (20 min)
- [ ] #12: Swipe-to-Delete (45 min)

### Phase 6: Nice-to-Have (3-4 hours)
- [ ] #35: Activity Feed (90 min)
- [ ] #22: Saved Searches (45 min)
- [ ] #23: Recent Items (30 min)
- [ ] #18: Mobile Search Autocomplete (30 min)
- [ ] #17: Haptic Feedback (10 min)
- [ ] #43: Custom Competition Themes (45 min)
- [ ] #44: Accessibility Mode (30 min)
- [ ] #45: Font Size Preferences (20 min)
- [ ] #30: Keyboard Navigation Hints (20 min)
- [ ] #38: Smart Notification Grouping (20 min)
- [ ] #39: Notification Preferences (30 min)
- [ ] #40: Email Digest (backend work required)

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
