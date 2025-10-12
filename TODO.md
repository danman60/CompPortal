# CompPortal - Unified TODO List

**Last Updated**: January 11, 2025
**Status**: Demo Ready - Post-Demo Implementation Phase

---

## 🔴 HIGH PRIORITY - Post-Demo Round (5 items, ~5-7 hours)

### 1. Apply Activity Logging Migrations
- **Task**: Apply database migrations for activity logging system
- **Migrations**:
  - `20251010_add_private_notes_to_studios.sql`
  - `20251010_create_activity_logs.sql`
- **Files Ready**: `src/lib/activity.ts`, `src/server/routers/activity.ts`
- **Estimate**: 30 minutes
- **Source**: POST_DEMO_CHANGELOG.md #2

### 2. Integrate Safe Codex Components (5 components)
- **Components Built & Ready**:
  - ✅ QuickStatsWidget.tsx (31 lines) - Add to dashboards
  - ✅ CompetitionFilter.tsx (84 lines) - Extract filter logic in EntriesList
  - ✅ RoutineStatusTimeline.tsx (167 lines) - Add to entry details page
  - ✅ EntryEditModal.tsx (155 lines) - Add quick-edit to entries list
  - ✅ JudgeBulkImportModal.tsx (169 lines) - Add CSV import to judges page
- **Discarded** (duplicates/replacements):
  - ❌ DanceQuote (duplicate of MotivationalQuote)
  - ❌ WelcomeGreeting (duplicate of inline getGreeting)
  - ❌ StudioSetupWizard (existing onboarding is better)
- **Estimate**: 1.5 hours total
  - QuickStatsWidget: 15 min
  - CompetitionFilter: 15 min
  - RoutineStatusTimeline: 20 min
  - EntryEditModal: 20 min
  - JudgeBulkImportModal: 20 min
- **Source**: POST_DEMO_CHANGELOG.md #3, Analysis Jan 11

### 3. Add Activity Logging to Mutations
- **Depends On**: Task #1 (migrations applied)
- **Target Mutations**:
  - `entry.create` - Log routine creation
  - `dancer.create` / `dancer.batchCreate` - Log dancer additions
  - `reservation.approve` / `reservation.reject` - Log approval actions
  - `studio.approve` / `studio.reject` - Log studio approval
  - `invoice.markAsPaid` - Log payment confirmations
- **Implementation**: Add `logActivity()` calls after successful mutations
- **Estimate**: 1-2 hours
- **Source**: POST_DEMO_CHANGELOG.md #4

### 4. Integrate Welcome Email Template
- **Task**: Send welcome email after studio approval
- **File Ready**: `src/emails/WelcomeEmail.tsx` (206 lines)
- **Integration Point**: `studio.approve` mutation
- **Estimate**: 30 minutes
- **Source**: POST_DEMO_CHANGELOG.md #5

### 5. Production Verification of Phase 6 Features
- **Status**: Features implemented, need production smoke test
- **Features to Verify**:
  - Smart Notification Grouping (#38) - Commit 0ffe43b
  - Notification Preferences (#39) - Commit 149d09f
  - Mobile Search Autocomplete (#18) - Commit 56e20b0
  - Activity Feed (#35) - Commit b7d0dec
  - Email Digest Settings (#40) - Commit 08fbbb1
- **Estimate**: 1 hour testing
- **Source**: POST_DEMO_CHANGELOG.md #6

---

## 🟡 MEDIUM PRIORITY - Workflow Redesign & Enhancements (12 items, ~18-24 hours)

### 6. Merge Routine Creation Forms
- **Current**: Separate Basic + Details + Props screens
- **New**: Single unified "Routine Info" screen
- **Fields**: Routine Name, Choreographer, Dance Category, Classification, Props, Title Routine checkbox
- **Design Goal**: Fewer clicks, smoother UX
- **Estimate**: 2-3 hours
- **Source**: PostDemoChanges10_10.md Section 2

### 7. Implement Live Review Bar
- **Feature**: Persistent horizontal bar during routine creation
- **Shows**: Category, Classification, Age Group, Dancers (live updates)
- **Location**: Bottom of screen across Step 1 & 2
- **Estimate**: 2 hours
- **Source**: PostDemoChanges10_10.md Section 3

### 8. Add Age Group Auto-Inference
- **Logic**: Calculate age group from dancer DOBs + routine classification
- **Rules**: Use most restrictive division, allow manual override
- **Integration**: Real-time updates in Review Bar
- **Estimate**: 1-2 hours
- **Source**: PostDemoChanges10_10.md Section 4

### 9. Hide Pricing from Studio Directors
- **Current**: Pricing visible in some views
- **New**: Pricing only visible to Competition Directors
- **Backend**: Calculate pricing silently, show only in CD invoice view
- **Estimate**: 1 hour
- **Source**: PostDemoChanges10_10.md Section 7

### 10. Add "My Routines" Summary Element
- **Display**: Total Routines, Estimated Cost, Remaining Tokens
- **Actions**:
  - "Send Summary (Request Invoice)" - Locks routines, notifies CD
  - "Download Summary (PDF)" - Export print-friendly summary
- **Estimate**: 2-3 hours
- **Source**: PostDemoChanges10_10.md Section 5

### 11. Replace "Approve/Reject" with "Generate Invoice"
- **Location**: Competition Director event management view
- **Flow**: Generate Invoice → Open invoice editor → Apply discounts → Send to Studio
- **URL**: `/dashboard/invoices/[invoice_id]`
- **Estimate**: 2 hours
- **Source**: PostDemoChanges10_10.md Section 5

### 12. Update Navigation Terminology
- **Changes**:
  - "Entries" → "Routines" (everywhere)
  - Dashboard tabs: "DANCERS • RESERVATIONS • ROUTINES"
  - "Spaces Requested" → "Routines Requested"
  - "Spaces Confirmed" → "Routines Allocated"
  - "Profile Settings" → "My Studio" (beside Sign Out)
- **Estimate**: 1 hour
- **Source**: PostDemoChanges10_10.md Section 6

### 13. Add Tooltips Above Dashboard Cards
- **Replace**: "Getting Started" section
- **New Tooltips**:
  - Above Dancers: "Add or import your dancers"
  - Above Reservations: "Reserve routine slots"
  - Above Routines: "Create your routines"
- **Estimate**: 30 minutes
- **Source**: PostDemoChanges10_10.md Section 6

### 14. Add Routine CSV Import
- **Feature**: Bulk import routines via CSV
- **Pattern**: Match existing Dancers Import workflow
- **Estimate**: 2-3 hours
- **Source**: PostDemoChanges10_10.md Section 6

### 15. Personalized Dashboard Layout
- **Feature**: Drag/drop widgets to customize dashboard
- **Implementation**: Save layout preferences per user
- **Estimate**: 3-4 hours
- **Source**: BUGS_AND_FEATURES.md Dashboard Enhancements

### 16. Draggable Dashboard Button Reordering
- **Feature**: Allow users to reorder dashboard action cards
- **Storage**: LocalStorage or user preferences table
- **Estimate**: 1-2 hours
- **Source**: BUGS_AND_FEATURES.md Dashboard Enhancements

### 17. Multi-User Studio Accounts
- **Feature**: Allow multiple logins per studio (owner + staff)
- **Requirements**: Role management, permissions system
- **Estimate**: 4-6 hours
- **Source**: BUGS_AND_FEATURES.md Studio Management

---

## 🟢 LOW PRIORITY - Future Enhancements (22 items, ~70-90 hours)

### 18. Multi-Tenant Domain Detection
- **Issue**: Hardcoded tenant detection (empwr.compsync.net)
- **Required**: Dynamic subdomain detection from request headers
- **Implementation**: Query `tenants` table by slug
- **Estimate**: 1 hour
- **Source**: POST_DEMO_CHANGELOG.md #8

### 19. Documentation Consolidation
- **Task**: Update cross-references in active docs after archive
- **Status**: FILE_INDEX.md updated, oct-2025-* archived
- **Estimate**: 30 minutes
- **Source**: POST_DEMO_CHANGELOG.md #9

### 20. Stripe Invoice Payment Integration
- **Feature**: Allow online invoice payments
- **Requirements**: CD connects Stripe account, auto-update payment status
- **Estimate**: 4-6 hours (external API integration)
- **Source**: PostDemoChanges10_10.md Section 8

### 21. Form Validation Feedback
- **Feature**: React-hook-form integration with visual error states
- **Files**: DancerForm.tsx, ReservationForm.tsx, EntryForm.tsx
- **Implementation**: Red borders + error messages for invalid fields
- **Status**: 8/9 quick wins complete, this remaining
- **Estimate**: 1-2 hours
- **Source**: QUICK_WINS_TODO.md

### 22-31. At Competition Mode (MAJOR FEATURE)
Real-time live competition management system (10 technical requirements):

#### 22. WebSocket Server for Real-Time Sync
- **Feature**: Real-time communication between CD control panel and judge tablets
- **Tech**: Socket.io or native WebSockets
- **Estimate**: 4-6 hours

#### 23. Judge Tablet Responsive Interface
- **Feature**: Mobile-optimized scoring interface for judges
- **Requirements**: Auto-refresh with current routine, touch-friendly scoring
- **Estimate**: 6-8 hours

#### 24. RTMP Overlay API Integration
- **Feature**: Feed routine data to livestream overlay system
- **Data**: Routine title, studio name, dancers, category
- **Estimate**: 3-4 hours

#### 25. Offline Mode with Sync Queue
- **Feature**: Handle brief network interruptions gracefully
- **Implementation**: IndexedDB queue, sync on reconnect
- **Estimate**: 4-6 hours

#### 26. Competition Director Control Panel
- **Feature**: Playlist-style controls (▶ Next, ⏸ Pause, ⏮ Back)
- **Layout**: Routine list (left), judge scores (bottom), notes (right)
- **Estimate**: 6-8 hours

#### 27. Routine State Machine
- **States**: queued → current → completed
- **Triggers**: CD control panel actions
- **Estimate**: 2-3 hours

#### 28. Multi-Judge Score Aggregation
- **Feature**: Real-time score collection and calculation
- **Display**: Live scores as judges submit
- **Estimate**: 3-4 hours

#### 29. Break/Intermission Scheduling System
- **Feature**: Auto-detect breaks, awards blocks, intermissions
- **Display**: Visual timers between routines
- **Estimate**: 3-4 hours

#### 30. Live Notes Database Schema
- **Feature**: Add notes to routines during competition
- **Use Cases**: Prop issues, timing, judging anomalies
- **Estimate**: 1-2 hours

#### 31. Mobile-First Judge Tablet UI
- **Feature**: Touch-optimized interface for tablets
- **Requirements**: Large tap targets, swipe gestures
- **Estimate**: 4-6 hours

**Total At Competition Mode Estimate**: 36-51 hours (6 phases)
**Source**: BUGS_AND_FEATURES.md At Competition Mode

---

### 32. Two-Factor Authentication
- **Feature**: 2FA for admin accounts
- **Methods**: TOTP (Google Authenticator), SMS backup
- **Estimate**: 4-6 hours
- **Source**: BUGS_AND_FEATURES.md Security

### 33. IP Whitelisting for Admin Actions
- **Feature**: Restrict sensitive actions to approved IP ranges
- **Use Case**: Prevent unauthorized access from compromised accounts
- **Estimate**: 2-3 hours
- **Source**: BUGS_AND_FEATURES.md Security

### 34. Audit Logging for Sensitive Operations
- **Feature**: Log all admin actions with timestamps and IP addresses
- **Already Partial**: Activity logging in place (Task #3)
- **Enhancement**: Extend to security-critical operations
- **Estimate**: 2-3 hours
- **Source**: BUGS_AND_FEATURES.md Security

### 35. GDPR Compliance (Data Export/Deletion)
- **Feature**: User data export and right-to-be-forgotten
- **Requirements**: Export all user data as JSON/PDF, permanent deletion
- **Estimate**: 6-8 hours
- **Source**: BUGS_AND_FEATURES.md Security

### 36. Database Query Optimization
- **Feature**: Identify and optimize slow queries
- **Tools**: Prisma query analysis, database indexes
- **Estimate**: 4-6 hours
- **Source**: BUGS_AND_FEATURES.md Performance

### 37. CDN Integration for Static Assets
- **Feature**: Serve images, CSS, JS from CDN
- **Providers**: Cloudflare, AWS CloudFront
- **Estimate**: 2-3 hours
- **Source**: BUGS_AND_FEATURES.md Performance

### 38. Redis Caching Layer
- **Feature**: Cache frequent queries (competitions, studios, routines)
- **Implementation**: Redis + cache invalidation strategy
- **Estimate**: 4-6 hours
- **Source**: BUGS_AND_FEATURES.md Performance

### 39. Image Optimization Pipeline
- **Feature**: Auto-resize/compress uploaded images
- **Tools**: Sharp, next/image optimization
- **Estimate**: 3-4 hours
- **Source**: BUGS_AND_FEATURES.md Performance

---

## 📊 Summary Statistics

**Total Items**: 39 todos
- **High Priority (Post-Demo)**: 5 items (~5-7 hours)
- **Medium Priority (Workflow + Enhancements)**: 12 items (~18-24 hours)
- **Low Priority (Future)**: 22 items (~70-90 hours)

**Grand Total Estimate**: ~93-121 hours

---

## 🎯 Immediate Focus - Post-Demo Round (Week 1)

**Priority**: Complete HIGH priority items first (5-7 hours)
1. Apply migrations (30 min)
2. Integrate 5 Codex components (1.5 hours)
3. Add activity logging to mutations (1-2 hours)
4. Integrate welcome email (30 min)
5. Production verification testing (1 hour)

**After Week 1**: Move to MEDIUM priority workflow redesign

---

## 🔗 Related Documentation

- **POST_DEMO_CHANGELOG.md** - Post-demo tasks with estimates
- **PostDemoChanges10_10.md** - Workflow redesign requirements
- **BUGS_AND_FEATURES.md** - Complete feature backlog
- **QUICK_WINS_TODO.md** - Quick wins (8/9 complete)
- **PROJECT_STATUS.md** - Current state tracker

---

**Next Session**: Start with Task #1 (Apply Migrations) or Task #2 (Integrate Components)
