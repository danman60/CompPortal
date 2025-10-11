# EMPWR Competition Portal - QA Testing Report

**Date:** 2025-01-10
**Overall Grade:** C (workable MVP but many broken flows and polish gaps)
**UX Quality Score:** 61/100

## Executive Summary

The EMPWR competition portal makes a strong first impression. The dark gradient palette and playful iconography evoke a modern SaaS feel with personality. Primary actions are clearly surfaced on a dashboard that greets the user by name and summarizes key metrics (dancers, routines, reservations). An intuitive multi‑step form guides routine creation and the embedded judge scoring demo showcases an interactive slider interface with real‑time score calculations. These strengths show that the portal is beyond a prototype: many core workflows are implemented and styled with care.

Despite this solid foundation, the experience currently feels like an MVP. Several core features are incomplete or break during normal use, and visual polish and accessibility require improvement. Critical form submissions fail due to backend errors, drop‑downs contain duplicate or truncated options, and buttons or toggles often provide no success feedback. Accessibility issues such as low‑contrast text and narrow click targets detract from professionalism. With the major bugs resolved and consistent component styling applied across the site, the portal could reach polished SaaS maturity.

## Critical Errors (High Priority)

### 1. Add Dancer Backend Error
**Location:** Dashboard → My Dancers → Add Dancers
**Issue:** Submitting the bulk dancer table triggers a JavaScript alert: `prisma.dancers.create() invalid invocation` and 0 dancers are saved.
**Expected:** Saving should create the dancer records, close the dialog and provide a success message.
**Severity:** High
**Fix:** Fix backend call to prisma.dancers.create(); validate and persist all fields. Provide error handling and user‑friendly feedback when creation fails.

### 2. Edit Dancer - Gender Dropdown
**Location:** My Dancers → Edit Dancer
**Issue:** The gender dropdown contains only a placeholder "Select gender"; actual options (Male/Female/Non‑binary) never appear.
**Expected:** The dropdown should list all gender options and persist selection when updating.
**Severity:** High
**Fix:** Populate gender options and ensure the selected value is saved. Validate input on submission and confirm success.

### 3. Create Reservation - No Competitions
**Location:** My Reservations → Create Reservation
**Issue:** Step 1 asks to select a competition, but the dropdown lists only "Select a competition" (no competitions), so the Next button is disabled.
**Expected:** Users should be able to choose from available competitions and proceed to the next step.
**Severity:** High
**Fix:** Fetch competitions for the studio and populate the select list. Disable the flow only when truly no competitions exist.

### 4. Profile Settings - Email Notifications
**Location:** Dashboard → Settings → Profile
**Issue:** Toggling email notifications to off and saving does not persist; the switch resets to on and there's no success message.
**Expected:** Toggling should update the preference and display a confirmation.
**Severity:** High
**Fix:** Fix update logic for notification preferences; show toast or alert confirming changes.

### 5. Quick Actions Drag Hint
**Location:** Dashboard
**Issue:** Dashboard quick‑action cards have tooltip "Drag cards to reorder" but dragging does nothing.
**Expected:** Cards should reorder via drag or the hint should be removed.
**Severity:** Medium
**Fix:** Implement drag‑and‑drop sorting or remove misleading hint.

### 6. Duplicate Dropdown Entries
**Location:** Routine creation/editing forms
**Issue:** Routine size and age‑group selects contain duplicate entries (e.g., Solo, Duo/Trio repeated multiple times), confusing selection.
**Expected:** Each option should appear once.
**Severity:** Medium
**Fix:** Clean up duplicate entries in enum sources for age groups and routine sizes.

### 7. Truncated Labels in Forms
**Location:** Various forms
**Issue:** The gender select shows "Non‑b" instead of "Non‑binary", and skill level shows "Intern" instead of "Intermediate" due to narrow field widths.
**Expected:** Option text should not truncate essential words.
**Severity:** Medium
**Fix:** Increase select box width or allow wrapped text; abbreviate only when necessary with tooltip for full word.

### 8. Missing Success/Error Feedback
**Location:** All forms
**Issue:** Saving changes to dancer profiles, routines and settings often returns silently with no message, leaving the user uncertain whether the action succeeded.
**Expected:** Every create/update/delete should provide affirmative or error feedback.
**Severity:** Medium
**Fix:** Implement toast notifications or inline alerts for all form submissions.

## Moderate UX or Design Issues

### Add Dancers - Date Picker
**Issue:** Manual typing into the date‑picker field does not register; selecting a birthdate requires many clicks to navigate months/years.
**Impact:** Slows data entry and increases frustration.
**Fix:** Allow manual date entry with format hints or provide year/month selectors for faster navigation.

### Dashboard Metrics & Cards
**Issue:** Quick‑action cards lack hover states and use inconsistent padding/margins. "Drag cards to reorder" appears but does not work.
**Impact:** Reduces perceived interactivity and polish.
**Fix:** Add subtle hover and focus styles; standardize spacing tokens; either enable drag sorting or remove the hint.

### Music Tracking Page - Low Contrast
**Issue:** The heading and explanatory text appear in very light gray on a dark background; some tags like "#TBD" are low contrast.
**Impact:** Low visibility violates WCAG contrast guidelines, especially for visually impaired users.
**Fix:** Use higher‑contrast colors for headings and status tags; test with contrast checkers.

### Profile Settings - Input Validation
**Issue:** The phone number input accepts any characters but there is no format validation; the email field states it cannot be changed but looks like a normal input.
**Impact:** Inconsistent user expectations; risk of invalid data.
**Fix:** Add input masking/validation for phone numbers; render read‑only fields with a distinct visual treatment (e.g., gray background).

### Navigation Elements
**Issue:** Small clickable targets for back links (e.g., only the arrow icon is clickable) hinder navigation; there is no skip to content link for keyboard users.
**Impact:** Reduces accessibility and increases risk of mis‑clicks.
**Fix:** Enlarge back links and make the entire text clickable; include keyboard shortcuts and skip links.

### Live Scoreboard
**Issue:** Requires a competition UUID with no explanation; shows red "Disconnected" state by default and an empty page.
**Impact:** Confusing for users expecting to see results; unclear how to obtain the ID.
**Fix:** Provide search or select options for available competitions; include instructions for judges and spectators.

### Judge Scoring Demo
**Issue:** Score segmentation labels (Poor 65, Fair 75, etc.) are repeated below each slider, taking space and adding noise.
**Impact:** Visual clutter; labels might be misread as clickable buttons.
**Fix:** Consolidate the legend into a single section or display as tooltips on hover.

### Page Load Times
**Issue:** Several pages display long skeleton loaders (especially dashboard and profile) even when data is small.
**Impact:** May cause impatience; skeleton persists long after content is ready.
**Fix:** Optimize API requests and reduce artificial delay; use real placeholders only until content is loaded.

## Minor Aesthetic or Accessibility Notes

### Buttons & Links
Add subtle elevation and color shifts on hover/focus; include keyboard focus outlines.
**Why:** Improves tactile feedback and helps keyboard/screen‑reader users identify interactive elements.

### Color Palette
Unify the token system for text, backgrounds and states; some greens/blues differ slightly between sections.
**Why:** A consistent palette enhances brand identity and reduces cognitive load.

### Spacing & Alignment
Standardize padding and margin values across cards, forms and lists. Some components (e.g., Routine cards vs. Invoice cards) use different radii and spacing.
**Why:** Consistent spacing contributes to a cohesive, polished appearance.

### Form Validation
Implement inline validation messages and red outlines for invalid fields rather than silent failures.
**Why:** Helps users correct errors immediately and reduces confusion.

### Alt Text & Icons
Ensure all icons and images include descriptive alternative text; add aria labels to dropdowns and buttons.
**Why:** Improves accessibility for screen‑reader users and meets WCAG guidelines.

### Responsive Breakpoints
Check layouts on tablet (768 px) and mobile (375 px); some cards might overflow or stack unpredictably.
**Why:** Ensures good usability across devices.

## Workflow Review

### Login & Session Flow
The landing page offers quick testing logins for multiple roles and standard Sign In/Create Account buttons. Quick login is convenient but may encourage bypassing real authentication in production. Sign‑out works correctly and returns the user to the homepage. However, there is no feedback after session timeout or sign‑out other than the navigation.

### Dashboard Navigation
The dashboard greets the user and displays summary cards for dancers, routines and reservations. Quick actions provide shortcuts to key modules, but the drag‑and‑reorder hint is non‑functional. The metric cards have inconsistent heights and sometimes require precise clicking on small icons to navigate back.

### Dancer Management
Listing dancers in cards works well with clear stats. Adding dancers uses a bulk table which could be efficient for data entry, but a backend error currently prevents saving any new dancers. Editing a dancer lacks available gender options and does not provide a confirmation when updating. There is also no ability to delete dancers.

### Routine Creation & Editing
The multi‑step flow is intuitive: Basic Info → Details → Participants → Props → Review. It allows selecting competitions, categories and dancers. The UI summarises totals and fees. However, drop‑downs contain duplicate options and truncated text. When editing a routine, the review step again summarises the data and updates successfully, though there is no explicit success message.

### Music Upload & Tracking
Each routine card shows a Music button; clicking leads to an upload page. Without uploading a file, clicking Done simply returns to the routine list and the status remains "Music Pending". The Music Tracking page summarises missing music and completion rates but suffers from low contrast colors.

### Reservations
The reservation workflow is currently unusable: the first step lacks any competition options, so the Next button stays disabled. Users cannot book competitions or view pending/approved reservations.

### Invoices
The invoices module displays competitions, routine counts and totals. It is clear and easy to read. The Download button is present but not tested due to environment constraints. A success message when downloading would improve feedback.

### Results/Scoreboard
The Live Scoreboard requires a manual entry of a competition UUID and remains disconnected by default, providing no guidance. This could confuse users expecting to view results. A search or list of competitions would improve this flow.

### Judge Scoring Demo
The scoring interface demonstrates interactive sliders with color‑coded ranges and real‑time score calculation. Judges can add comments and select special awards. Because it is in demo mode, clicking Submit Score & Next triggers an alert stating that the score is not saved. While the interface is polished, repeated segmentation labels and some low‑contrast text could be refined.

## Top 5 Fix Priorities

### 1. Resolve Backend and Form-Handling Errors
Fix the prisma.dancers.create() invocation so that dancers can be added and saved; populate gender options; load competitions for reservations. These blockers prevent core workflows from functioning.

### 2. Provide Clear Success/Error Feedback
Implement toast notifications or inline alerts after every create, update or delete operation (dancers, routines, settings, music uploads). This reduces uncertainty and builds trust.

### 3. Clean Up Data Sources and Dropdowns
Remove duplicate and truncated options in age groups and routine sizes; widen select boxes to show full labels; add missing gender and skill level values. Consistent, readable options improve data quality and user confidence.

### 4. Improve Accessibility & Contrast
Increase text contrast on dark backgrounds, enlarge click targets for back links and buttons, add focus styles and ARIA labels. Complying with WCAG guidelines broadens usability and enhances perception of quality.

### 5. Polish UI Consistency and Interactivity
Standardize spacing, padding and hover states across cards and buttons. Either enable drag‑and‑drop reordering of quick actions or remove the instruction. Validate phone numbers and differentiate read‑only inputs. These refinements raise the portal to a polished SaaS level.
