# Mobile Usability Audit - November 3, 2025

**Viewport:** 375x667 (iPhone SE size)
**Environment:** Production (empwr.compsync.net)
**Screenshots:** `.playwright-mcp/mobile-audit-*.png`

---

## Critical Issues (Must Fix)

### 1. **Table Horizontal Overflow on Add Dancers Page**
- **Page:** `/dashboard/dancers/add`
- **Issue:** Data table with 6 columns (# / First Name / Last Name / Birth Date / Classification / Action) has no horizontal scroll
- **Impact:** Users cannot see all columns, cannot input data into hidden fields
- **Screenshot:** `mobile-audit-add-dancers.png`
- **Files:** `src/app/dashboard/dancers/add/page.tsx`, `src/components/DancerBatchForm.tsx`
- **Fix Required:**
  - Add horizontal scroll container with touch scrolling
  - Or stack form fields vertically on mobile (card-based layout)
  - Add visual indicator showing "scroll right for more fields"

### 2. **Bottom Navigation Blocks Content**
- **Pages:** All dashboard pages
- **Issue:** Fixed bottom navigation bar covers page content (no padding-bottom on main content)
- **Impact:** Users cannot access buttons/links at bottom of page content
- **Screenshot:** All dashboard screenshots show footer text overlapping bottom nav
- **Fix Required:**
  - Add `pb-20` or `pb-24` to main content container on mobile
  - Ensure bottom navigation has proper z-index

### 3. **Buttons Too Small for Touch Targets**
- **Pages:** `/dashboard/dancers/add` (Add 1 Row, Add 5 Rows, Add 10 Rows buttons)
- **Issue:** Buttons appear cramped, below recommended 44x44px touch target minimum
- **Impact:** Users will mis-tap, frustrating mobile experience
- **Screenshot:** `mobile-audit-add-dancers.png`
- **Fix Required:**
  - Increase button padding on mobile (`py-3 px-4` minimum)
  - Add gap between buttons (`gap-3` or `gap-4`)

---

## High Priority Issues

### 4. **Long Text Truncation Without Affordance**
- **Pages:** Dashboard cards, Reservation cards
- **Issue:** Studio names, competition names get truncated without ellipsis or way to see full text
- **Impact:** Users cannot identify which competition/studio without clicking
- **Screenshot:** `mobile-audit-dashboard.png` - "Test Studio - Daniel" cuts off
- **Fix Required:**
  - Add `truncate` class with ellipsis
  - Or allow text to wrap on mobile (`whitespace-normal` on mobile, `truncate` on desktop)

### 5. **Step Indicator Circles Too Small**
- **Page:** `/dashboard/reservations/new`
- **Issue:** Progress indicator circles (1, 2, 3, 4) are small and hard to read on mobile
- **Impact:** Users cannot track multi-step form progress clearly
- **Screenshot:** `mobile-audit-new-reservation.png`
- **Fix Required:**
  - Increase circle size on mobile (`w-10 h-10` -> `w-12 h-12` on mobile)
  - Increase font size inside circles

### 6. **Filter Buttons Overflow Horizontally**
- **Page:** `/dashboard/reservations`
- **Issue:** Filter buttons "All / Pending / Approved / Rejected" overflow container on small screens
- **Impact:** Users cannot access all filter options without horizontal scroll
- **Screenshot:** `mobile-audit-reservations.png`
- **Fix Required:**
  - Make filter buttons wrap to 2 rows on mobile
  - Reduce padding/font size on mobile
  - Or use dropdown select on mobile instead of buttons

---

## Medium Priority Issues

### 7. **Dropdown Select Too Wide**
- **Page:** `/dashboard/reservations`
- **Issue:** "All Competitions" dropdown extends beyond viewport slightly
- **Impact:** Minor visual issue, still functional
- **Fix Required:**
  - Add `max-w-full` to dropdown container
  - Reduce horizontal padding on mobile

### 8. **Card Spacing Too Tight**
- **Pages:** All dashboard pages with cards
- **Issue:** Cards have minimal spacing between them on mobile (appears cramped)
- **Impact:** Reduces readability, feels cluttered
- **Fix Required:**
  - Increase gap between cards on mobile (`gap-4` -> `gap-6`)
  - Add more vertical padding inside cards (`p-4` -> `p-5` or `p-6`)

### 9. **Instructions Box Too Prominent**
- **Page:** `/dashboard/dancers/add`
- **Issue:** Large instructions box takes up significant vertical space before users see the form
- **Impact:** Users must scroll to reach actual form inputs
- **Screenshot:** `mobile-audit-add-dancers.png`
- **Fix Required:**
  - Make instructions collapsible on mobile (expand/collapse toggle)
  - Or move instructions to tooltip/help icon
  - Or show condensed version on mobile

### 10. **Classification Warning Box Too Long**
- **Page:** `/dashboard/dancers/add`
- **Issue:** Orange classification warning box with bullets takes up massive vertical space on mobile
- **Impact:** Pushes table far down page, increases scrolling
- **Screenshot:** `mobile-audit-add-dancers.png` - warning box dominates screen
- **Fix Required:**
  - Make collapsible on mobile
  - Reduce font size and padding on mobile
  - Show short version with "Learn more" link

---

## Low Priority (Nice to Have)

### 11. **Support Button Position**
- **Pages:** All dashboard pages
- **Issue:** Floating support button (bottom-right) can interfere with page content
- **Impact:** Minor - mostly cosmetic
- **Fix Required:**
  - Adjust position to avoid overlapping important content
  - Make slightly smaller on mobile

### 12. **Footer Text Wrapping**
- **Pages:** All pages
- **Issue:** Footer copyright text wraps awkwardly on narrow screens
- **Impact:** Minor visual issue
- **Fix Required:**
  - Reduce font size on mobile
  - Stack footer elements vertically on very small screens

### 13. **Stat Cards Could Stack Better**
- **Page:** Dashboard home - "My Dancers", "My Reservations", "My Routines" cards
- **Issue:** Cards stack vertically but could use better spacing/sizing
- **Impact:** Works but not optimal
- **Screenshot:** `mobile-audit-dashboard.png`
- **Fix Required:**
  - Slightly larger cards on mobile
  - Better visual hierarchy (larger numbers, clearer labels)

---

## No Issues Found (Working Well)

✅ **Login/Signup Pages** - Clean, simple, good mobile layout
✅ **Button Text Readability** - Font sizes are appropriate
✅ **Color Contrast** - Passes accessibility standards
✅ **Navigation Icons** - Bottom nav icons clear and tappable
✅ **Empty States** - Good messaging when no data exists
✅ **Touch Scrolling** - Pages scroll smoothly

---

## Summary Statistics

**Total Issues Found:** 13
**Critical:** 3
**High Priority:** 4
**Medium Priority:** 4
**Low Priority:** 2

**Primary Focus Areas:**
1. Table layouts (horizontal scroll or responsive cards)
2. Touch target sizes (minimum 44x44px)
3. Content spacing and bottom nav overlap
4. Filter/button overflow handling

---

## Implementation Priority Order

1. Fix bottom nav content overlap (affects all pages)
2. Fix table horizontal scroll on Add Dancers
3. Increase touch target sizes for buttons
4. Fix filter button overflow on Reservations
5. Collapsible instructions/warning boxes
6. Text truncation improvements
7. Step indicator sizing
8. Card spacing adjustments
9. Dropdown width fixes
10. Minor cosmetic improvements

**Estimated Implementation Time:** 3-4 hours for critical + high priority issues
