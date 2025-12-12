# CompPortal - Bugs & Features Tracker

**Last Updated**: January 13, 2025
**Status**: 🚨 FEATURE FREEZE - MVP Verification Phase

---

## ⚠️ CRITICAL: FEATURE FREEZE ACTIVE

**ALL feature work is PAUSED until user confirms MVP is 100% working.**

**This tracker is READ-ONLY for planning purposes.**

**Allowed Work**:
- Bug fixes explicitly reported by user
- Critical production issues
- Documentation updates

**Blocked Work**:
- All items in this document
- All backlog features
- All TODO comments
- CADENCE protocol
- Codex delegation

**Resume Condition**: User must explicitly say "MVP confirmed working, resume features"

---

**Related Docs**:
- [USER_TESTING_NOTES.md](./USER_TESTING_NOTES.md) - Latest user testing session feedback
- [FIXES_AND_ENHANCEMENTS.md](./FIXES_AND_ENHANCEMENTS.md) - Previous implementation plan (some overlap)

---

## 📊 Consolidated Priority Matrix

### ✅ MAJOR MILESTONE: Phases 1-5 Complete!

**Status Update**: All 21 issues from ROUTINES_RESERVATIONS_CONSOLIDATED.md have been implemented and tested!

**Achievement Summary**:
- ✅ **Phase 1**: Critical UX Fixes (5/5 complete)
- ✅ **Phase 2**: Helper Text & Guidance (2/2 complete)
- ✅ **Phase 3**: Routine Creation Improvements (3/3 complete)
- ✅ **Phase 4**: Dancer Management (2/2 complete)
- ✅ **Phase 5**: Competition Director Enhancements (8/8 complete)

**Implementation Time**: Oct 4-5, 2025 (completed in 2 days vs 8-10 day estimate)

**Comprehensive Analysis**: See [ROUTINES_RESERVATIONS_CONSOLIDATED.md](./ROUTINES_RESERVATIONS_CONSOLIDATED.md)

### Items in BOTH Testing Sessions (Highest Priority)
These appear in both USER_TESTING_NOTES.md and FIXES_AND_ENHANCEMENTS.md:

✅ **Critical** (P0 - ALL COMPLETE):
1. ✅ White-on-white dropdown fixes (all pages) - Completed Oct 5
2. ✅ Lock Studio selection to current studio (non-editable) - Verified already implemented
3. ✅ Hide capacity metrics from Studio view - Verified already implemented
4. ✅ Replace all "entries" → "routines" terminology - User-facing text complete Oct 5
5. ✅ Hide agent information from studio view - Completed Oct 5
6. ✅ Auto-generate invoices on reservation approval - Verified already implemented
7. ✅ Show routine counter ("X of Y available") - Verified already implemented

**Reference**: See commit history from adf6c6b through ed136a5 for full implementation

---

## 🎯 Priority 1: Routines & Reservations Refinement ✅ COMPLETE

**Primary Document**: [ROUTINES_RESERVATIONS_CONSOLIDATED.md](./ROUTINES_RESERVATIONS_CONSOLIDATED.md)

**This consolidates:**
- USER_TESTING_NOTES.md (latest feedback)
- FIXES_AND_ENHANCEMENTS.md (previous implementation plan)
- User journey expectations
- Historical workflow notes

### Studio Director Priority Fixes ✅ 15/15 Complete (100%)
- [x] **[CRITICAL]** Fix white-on-white dropdowns in Create Routine modal *(Completed Oct 5)*
- [x] **[CRITICAL]** Lock Studio selection to current studio *(Verified already implemented)*
- [x] **[CRITICAL]** Replace all "entries" → "routines" terminology *(User-facing text complete Oct 5)*
- [x] **[CRITICAL]** Hide capacity metrics from Studio view *(Verified already implemented)*
- [x] **[CRITICAL]** Remove agent information editing *(Completed Oct 5)*
- [x] **[NEW]** Merge "Add Dancer" and "Batch Add" into unified action *(Completed Oct 5 - Commit 8ee4fb9)*
- [x] **[NEW]** Show routine counter: "3 of 30 remaining" *(Verified already implemented)*
- [x] **[NEW]** Replace Music section with Props field *(Verified already implemented - music handled separately)*
- [x] **[NEW]** Fix reservation flow white-on-white dropdowns *(Completed Oct 5)*
- [x] **[NEW]** Add helper text: "Routines available: 12 of 20 approved" *(Verified already implemented)*
- [x] **[NEW]** Auto-generate invoice on reservation submission *(Verified already implemented)*
- [x] Remove drag reordering on participants inside Create Routine *(Completed Oct 5 - Commit b1d7769)*
- [x] Implement drag-and-drop linking (routines left, dancers right) *(Completed Oct 4 - Commit 9b0b86b)*
- [x] Dashboard label: "My Routines" (not "My Entries") *(Verified already implemented)*
- [x] Keep Quick Start flow for routine creation *(Verified - default flow maintained)*

### Competition Director Priority Fixes ✅ 10/10 Complete (100%)
- [x] **[CRITICAL]** Emphasize Reservations at top of dashboard *(Completed Oct 5 - Commit 63fd533)*
- [x] **[NEW]** Implement 4×4 card grid layout for competitions *(Completed Oct 5 - Commit f3f7405)*
- [x] **[NEW]** Show capacity/tokens/pending reservations per card *(Completed Oct 5 - Commit f3f7405)*
- [x] **[NEW]** Add approve/reject/cancel actions to cards *(Completed Oct 5 - Commit d284cc6)*
- [x] **[NEW]** Auto-adjust capacity when reservations confirmed/released *(Completed Oct 5 - Commit 03ddb69)*
- [x] **[NEW]** Add manual reservation creation (admin-only) *(Completed Oct 5 - Commit 8df253f)*
- [x] **[NEW]** Remove "Create Reservation" button (directors don't create) *(Completed Oct 5 - Commit f31858b)*
- [x] **[NEW]** Enable column sorting (alphabetical/numerical/group) *(Completed Oct 5 - Commit 2df1a72)*
- [x] Polish PDF generation (alignment, fonts) *(Completed Oct 5 - Commit c3b8a4c - Terminology fixes)*
- [x] Test with real seeded data (GlowDance Orlando) *(Completed Oct 5 - Commit 8c8c3dc)*

### From FIXES_AND_ENHANCEMENTS.md (Backlog - ALL COMPLETE)
- [x] Fix reservation sync issue (cache invalidation) *(Verified - ReservationForm.tsx:30-34 invalidates on create)*
- [x] Studio settings single-tenant view *(Verified - studios/page.tsx:16-20 + StudiosList.tsx:11-19 enforces single-tenant edit mode)*
- [x] Invoices page hard-lock to own studio *(Verified - page.tsx:16-20 fetches owner studio, InvoicesList.tsx:9-34 enforces lock)*
- [x] Multi-row dancer batch add form *(Completed Oct 5 - Commit 8ee4fb9)*
- [x] Table/card view toggle with persistence *(Completed Oct 4 - Commit c4012fb)*
- [x] Reservation reduction with routine impact warnings *(Completed Oct 5 - Commit 074deab)*
- [x] Global invoices view for Competition Directors *(Verified - /dashboard/invoices/all page)*
- [x] Manual "Mark as Paid" toggle *(Verified - AllInvoicesList.tsx:262-273, reservation.markAsPaid mutation)*

**Backlog Completion: 8 of 8 complete (100%)**

---

## 🎬 At Competition Mode (Future Major Feature)

> **CONSOLIDATED SPEC:** See [GAME_DAY_SPEC.md](../specs/GAME_DAY_SPEC.md) for complete spec.

### Overview
At Competition Mode is a dedicated live-operation screen used during events.
Synchronizes all active routines, judges' tablets, and RTMP broadcast overlay in real time.

### 🖥️ Screen Layout

#### Left Panel – Routine List
- Displays all routines in running order
- Active routine highlighted
- Upcoming routines and scheduled breaks clearly indicated

#### Bottom Panel – Judge Sync & Scores
- Shows each judge's live scores for current routine
- Real-time score display as judges submit
- Score aggregation and validation

#### Top Controls – Playback & Navigation
- Playlist-style buttons (▶ Next, ⏸ Pause, ⏮ Back)
- Competition director can advance or rewind routines
- "Next Routine" button updates all connected judges' tablets automatically

#### Right Panel – Routine Notes
- Live note entry for current routine
- Examples: prop issues, timing, judging anomalies
- Notes saved to specific routine record

### 🔄 Real-Time Synchronization

When competition director presses **Next**:
1. Marks new routine as "Current" across all devices
2. Sends routine context to each judge's tablet (no manual advance)
3. Locks all judges' scoring forms to current routine ID
4. Judges' tablets automatically refresh with:
   - Routine title
   - Studio name
   - Dancer list

### 🧠 Intelligent Behavior
- Automatically detects/displays upcoming breaks, awards blocks, intermissions
- Clear visual timers between routines (stage management pacing)
- Offline caching for brief network interruptions
- Conflict detection and warnings

### 📡 RTMP Overlay Integration

Real-time routine data feeds directly into RTMP overlay system, updating:
- Routine title and number
- Studio name
- Dancer(s) names
- Category or division

**Result**: Livestream overlays always display correct routine without manual intervention

### Technical Requirements
- [ ] WebSocket server for real-time sync
- [ ] Judge tablet responsive interface
- [ ] RTMP overlay API integration
- [ ] Offline mode with sync queue
- [ ] Competition director control panel
- [ ] Routine state machine (queued → current → completed)
- [ ] Multi-judge score aggregation
- [ ] Break/intermission scheduling system
- [ ] Live notes database schema
- [ ] Mobile-first judge tablet UI

### User Stories
- **As a Competition Director**, I want to advance routines from one control panel so all judges stay synchronized
- **As a Judge**, I want my tablet to automatically show the current routine so I don't have to manually navigate
- **As a Livestream Operator**, I want overlays to update automatically so I don't miss routine information
- **As a Stage Manager**, I want visual timers between routines so I can pace the event properly
- **As a Competition Director**, I want to add live notes during routines so I can reference them later

### Implementation Phases
1. **Phase 1**: Basic routine state management and navigation
2. **Phase 2**: Judge tablet sync via WebSockets
3. **Phase 3**: RTMP overlay integration
4. **Phase 4**: Offline mode and conflict resolution
5. **Phase 5**: Break scheduling and timer system
6. **Phase 6**: Live notes and anomaly tracking

---

## 🐛 Known Bugs

### Critical
- None currently

### High Priority
- See "Priority 1: User Testing Feedback" section above

### Medium Priority
- None currently

### Low Priority
- None currently

---

## ✨ Feature Requests (Backlog)

### Email Notifications (Complete)
- [x] Entry submitted confirmation email *(Completed Oct 5 - Commit 04b769b)*
- [x] Missing music reminder emails *(Completed Oct 5 - Commit 7344ab6)*
- [x] Payment confirmation emails *(Completed Oct 5 - Commit 13cd598)*
- [x] Email logging and audit trail *(Completed Oct 5 - Commit fd05099)*
- [x] Email history tracking UI *(Completed Oct 5 - Commit eb422db)*
- [x] Bulk missing music reminders *(Completed Oct 5 - Commit efdc94b - send to all studios at once)*

### Data Import/Export
- [x] Bulk dancer CSV import *(Implemented - DancerCSVImport.tsx + bulkImport mutation)*
- [x] Schedule export (PDF/CSV/iCal) *(Verified Oct 5 - scheduling.ts:567-1103, SchedulingManager.tsx:50-322)*
- [x] Results export (PDF/CSV) *(Completed Oct 5 - Commit 7bc395f)*
- [x] Missing music CSV export *(Completed Oct 5 - Commit c1132fb - exportable report by competition)*

### Dashboard Enhancements
- [x] Music tracking dashboard *(Completed Oct 5 - Commits b4789b3-4abfbeb - full system with bulk send, CSV export, auto-refresh, urgency filter)*
- [ ] Personalized dashboard layout (drag/drop widgets)
- [x] Visual capacity meters/progress bars per event *(Completed Oct 5 - Commit 9b7c100)*
- [ ] Draggable dashboard button reordering

### Studio Management
- [x] Studio logo upload *(Completed Oct 5 - Commit 14e337c)*
- [x] Studio branding customization *(Completed Oct 5 - Commit 47af75d)*
- [ ] Multi-user studio accounts

### Competition Management
- [x] Competition cloning (from past events) *(Completed Oct 5 - Commit 3aba884)*
- [x] Multi-competition switching (Glow/EMPWR) *(Completed Oct 5 - Commit fcd3b4c)*
- [x] Advanced scheduling with conflict detection *(Verified Oct 5 - ConflictPanel.tsx, scheduling lib with 5 conflict types)*
- [x] Judge assignment and management *(Verified Oct 5 - judges/page.tsx:1-502, full CRUD + check-in + panel assignment)*

---

## 📊 Metrics & Analytics (Future)

### Studio Metrics
- Registration conversion rates
- Payment collection rates
- Music upload compliance
- Average routines per studio

### Competition Metrics
- Capacity utilization
- Revenue per event
- Judge scoring patterns
- Scheduling efficiency

### System Metrics
- API response times
- Database query performance
- Email delivery rates
- User engagement analytics

---

## 🔒 Security & Compliance (Future)

### Security Enhancements
- [ ] Two-factor authentication
- [ ] IP whitelisting for admin actions
- [ ] Audit logging for sensitive operations
- [ ] GDPR compliance (data export/deletion)

### Performance
- [ ] Database query optimization
- [ ] CDN integration for static assets
- [ ] Redis caching layer
- [ ] Image optimization pipeline

---

**Note**: This tracker consolidates feedback from user testing sessions, feature requests, and development planning. Priority items should be addressed before new feature development.
