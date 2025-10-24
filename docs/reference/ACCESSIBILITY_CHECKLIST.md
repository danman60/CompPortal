# Accessibility Checklist (WCAG 2.1 AA)

## Overview

This checklist helps ensure CompPortal meets WCAG 2.1 Level AA accessibility standards. Run through this list during development and before major releases.

## Quick Audit Tools

**Recommended Tools:**
- [Lighthouse](https://developer.chrome.com/docs/lighthouse/) (Chrome DevTools)
- [axe DevTools](https://www.deque.com/axe/devtools/) (Browser extension)
- [WAVE](https://wave.webaim.org/) (WebAIM evaluation tool)
- [NVDA](https://www.nvaccess.org/) (Free screen reader for Windows)
- [VoiceOver](https://www.apple.com/accessibility/mac/vision/) (Built-in macOS/iOS)

**Run Lighthouse:**
```bash
# Via Chrome DevTools
1. Open DevTools (F12)
2. Go to "Lighthouse" tab
3. Select "Accessibility" category
4. Click "Analyze page load"

# Via CLI (requires lighthouse package)
npx lighthouse https://comp-portal-one.vercel.app \
  --only-categories=accessibility \
  --view
```

## Core Accessibility Principles (POUR)

### 1. Perceivable
Information must be presentable to users in ways they can perceive.

**Color Contrast**
- [ ] Text contrast meets WCAG AA minimum (4.5:1 for normal text, 3:1 for large text)
- [ ] UI component contrast meets 3:1 (buttons, form inputs, focus indicators)
- [ ] Color is not the only means of conveying information
- [ ] Link text is distinguishable from surrounding text

**Images & Media**
- [ ] All images have meaningful alt text (or alt="" for decorative images)
- [ ] Complex images (charts, graphs) have extended descriptions
- [ ] Icons have accessible labels or aria-label attributes
- [ ] Video content has captions/transcripts (if applicable)

**Text Alternatives**
- [ ] Form inputs have associated labels
- [ ] Buttons have descriptive text (not just icons)
- [ ] Error messages are descriptive and clear

### 2. Operable
Interface components and navigation must be operable.

**Keyboard Navigation**
- [ ] All interactive elements accessible via keyboard (Tab, Enter, Space, Arrow keys)
- [ ] Logical tab order follows visual flow
- [ ] Focus indicators are visible (outline or custom styling)
- [ ] No keyboard traps (users can navigate in and out of all areas)
- [ ] Skip to main content link provided (for screen readers)

**Navigation**
- [ ] Navigation menus work with keyboard
- [ ] Dropdowns/modals can be closed with Escape key
- [ ] Focus returns to trigger element when closing modals
- [ ] Breadcrumbs or clear navigation structure present

**Forms**
- [ ] Form fields have visible labels
- [ ] Required fields are clearly marked
- [ ] Error messages appear near relevant fields
- [ ] Success/error states announced to screen readers

### 3. Understandable
Information and operation must be understandable.

**Readability**
- [ ] Language of page is set (html lang="en")
- [ ] Text is readable and understandable (avoid jargon)
- [ ] Instructions are clear and concise
- [ ] Consistent terminology throughout

**Predictability**
- [ ] Navigation is consistent across pages
- [ ] UI components behave predictably
- [ ] Changes in context only occur on user request (not automatic)
- [ ] Focus doesn't jump unexpectedly

**Input Assistance**
- [ ] Form validation provides clear error messages
- [ ] Error prevention for critical actions (confirmations for delete operations)
- [ ] Autocomplete attributes used where appropriate (name, email, etc.)

### 4. Robust
Content must work with current and future technologies.

**Compatibility**
- [ ] Valid HTML (no unclosed tags, proper nesting)
- [ ] ARIA attributes used correctly (only when native HTML insufficient)
- [ ] Roles, states, and properties properly defined
- [ ] Works across browsers (Chrome, Firefox, Safari, Edge)
- [ ] Works with assistive technologies (screen readers, magnifiers)

## CompPortal-Specific Checks

### Dashboard Pages

**EntriesList Component** (`src/app/dashboard/entries/page.tsx`)
- [x] Status badges have aria-label for screen readers (StatusBadge.tsx)
- [ ] Table view has proper table semantics (<table>, <th>, <td>)
- [ ] Card view has proper heading hierarchy
- [ ] Filter controls labeled correctly
- [ ] Bulk selection announces count to screen readers

**ReservationsList Component** (`src/app/dashboard/reservations/page.tsx`)
- [x] Status badges accessible (StatusBadge.tsx)
- [ ] Approval/reject buttons have clear labels
- [ ] Token allocation inputs have labels
- [ ] Success/error toasts announced

**Competition Forms**
- [ ] All form fields have labels
- [ ] Date pickers are keyboard accessible
- [ ] Category selection has clear labels
- [ ] Pricing inputs announce currency ($)

### Modals & Overlays

**Modal Component** (`src/components/ui/Modal.tsx`)
- [x] Escape key closes modal
- [x] Focus trapped within modal when open
- [ ] Focus returns to trigger on close (verify in implementations)
- [ ] Modal has aria-modal="true" and role="dialog"
- [ ] Modal title uses aria-labelledby

**Toast Notifications** (`src/components/ToastProvider.tsx`)
- [ ] Success/error states announced via aria-live
- [ ] Notifications don't auto-dismiss too quickly (min 5 seconds)
- [ ] Users can dismiss manually

### Forms

**Entry Creation** (`src/app/dashboard/entries/create/page.tsx`)
- [ ] Dancer selection accessible (checkboxes or select)
- [ ] Category selection labeled
- [ ] Music upload has clear instructions
- [ ] Validation errors announced

**Dancer Management** (`src/app/dashboard/dancers/`)
- [ ] Batch import provides feedback on progress
- [ ] Table columns sortable via keyboard
- [ ] Delete confirmation accessible

### Authentication

**Login/Signup** (`src/app/login/page.tsx`, `src/app/signup/page.tsx`)
- [ ] Email/password fields labeled
- [ ] Show/hide password toggle accessible
- [ ] Error messages clear and actionable
- [ ] Success redirects announced

## Testing Workflow

### Manual Testing

1. **Keyboard-Only Navigation**
   - Unplug mouse
   - Navigate entire app using only Tab, Enter, Space, Arrow keys
   - Verify all actions are possible

2. **Screen Reader Testing**
   - Windows: Use NVDA (free)
   - macOS: Use VoiceOver (Cmd+F5)
   - Test critical user flows (login, create entry, submit reservation)

3. **Zoom Testing**
   - Zoom to 200% browser zoom
   - Verify layout doesn't break
   - Text remains readable

4. **Color Contrast Testing**
   - Use browser DevTools "Inspect" to check contrast ratios
   - Test with color blindness simulators

### Automated Testing

**Vitest + Testing Library**

Example accessible component test:
```typescript
import { render, screen } from '@testing-library/react';
import { axe, toHaveNoViolations } from 'jest-axe';

expect.extend(toHaveNoViolations);

test('StatusBadge has no accessibility violations', async () => {
  const { container } = render(<StatusBadge status="approved" />);
  const results = await axe(container);
  expect(results).toHaveNoViolations();
});
```

**CI/CD Integration**

Add to GitHub Actions workflow:
```yaml
- name: Run Lighthouse CI
  uses: treosh/lighthouse-ci-action@v9
  with:
    urls: |
      https://comp-portal-one.vercel.app
      https://comp-portal-one.vercel.app/login
      https://comp-portal-one.vercel.app/dashboard
    uploadArtifacts: true
    temporaryPublicStorage: true
```

## Current Status

### Completed Improvements
- ✅ **StatusBadge Component** - Consistent status styling with semantic HTML
- ✅ **Modal Component** - Escape key support, focus management
- ✅ **Error Boundaries** - Graceful error handling for React errors
- ✅ **Vercel Analytics** - Performance monitoring (indirectly helps UX)

### High-Priority Fixes

1. **ARIA Labels for Complex Components** (1 hour)
   - Add aria-label to icon-only buttons
   - Add aria-describedby to form fields with help text
   - Add aria-live regions to status updates

2. **Focus Indicators** (30 minutes)
   - Enhance focus styles in globals.css
   - Ensure 3:1 contrast for focus indicators
   - Test with keyboard navigation

3. **Form Field Labels** (1 hour)
   - Audit all forms for missing labels
   - Add aria-required to required fields
   - Connect error messages with aria-describedby

4. **Skip to Main Content Link** (15 minutes)
   - Add skip link in layout.tsx
   - Style for keyboard-only visibility

### Medium-Priority Improvements

5. **Table Semantics** (2 hours)
   - Convert divs to proper table elements in EntriesList
   - Add sortable column headers with aria-sort

6. **Screen Reader Announcements** (1 hour)
   - Add aria-live to toast notifications
   - Announce page navigation changes
   - Add loading state announcements

7. **Color Contrast Audit** (1 hour)
   - Review all text/background combinations
   - Update tailwind colors if needed
   - Add contrast checker to CI

## Resources

- [WCAG 2.1 Guidelines](https://www.w3.org/WAI/WCAG21/quickref/)
- [MDN Accessibility](https://developer.mozilla.org/en-US/docs/Web/Accessibility)
- [A11y Project Checklist](https://www.a11yproject.com/checklist/)
- [WebAIM Articles](https://webaim.org/articles/)
- [Inclusive Components](https://inclusive-components.design/)

## Next Steps

1. Install axe DevTools browser extension
2. Run Lighthouse audit on production
3. Fix critical issues (keyboard navigation, focus indicators)
4. Implement automated a11y tests in CI/CD
5. Schedule quarterly accessibility audits
