# CompPortal - Bugs & Features Tracker

**Last Updated**: October 2025
**Status**: Active development tracker

**Related Docs**:
- [USER_TESTING_NOTES.md](./USER_TESTING_NOTES.md) - Latest user testing session feedback
- [FIXES_AND_ENHANCEMENTS.md](./FIXES_AND_ENHANCEMENTS.md) - Previous implementation plan (some overlap)

---

## 📊 Consolidated Priority Matrix

### ⚠️ CRITICAL ATTENTION NEEDED

**🚨 Multiple rounds of feedback about Routines & Reservations have been raised but not fully addressed.**

**Comprehensive Analysis**: See [ROUTINES_RESERVATIONS_CONSOLIDATED.md](./ROUTINES_RESERVATIONS_CONSOLIDATED.md)
- **21 issues identified** across multiple feedback sessions
- **6 P0-Critical issues** blocking core workflow understanding
- **8-10 days estimated** for complete implementation
- **Detailed technical specs** with code examples

### Items in BOTH Testing Sessions (Highest Priority)
These appear in both USER_TESTING_NOTES.md and FIXES_AND_ENHANCEMENTS.md:

✅ **Critical** (P0 - ALL COMPLETE):
1. ✅ White-on-white dropdown fixes (all pages) - Completed
2. ✅ Lock Studio selection to current studio (non-editable) - Verified already implemented
3. ✅ Hide capacity metrics from Studio view - Verified already implemented
4. ✅ Replace all "entries" → "routines" terminology - User-facing text complete
5. ✅ Hide agent information from studio view - Completed
6. ✅ Auto-generate invoices on reservation approval - Verified already implemented
7. ✅ Show routine counter ("X of Y available") - Verified already implemented

**Implementation Plan**: [ROUTINES_RESERVATIONS_CONSOLIDATED.md](./ROUTINES_RESERVATIONS_CONSOLIDATED.md) - Phases 1-5 with time estimates

---

## 🎯 Priority 1: Routines & Reservations Refinement (NEXT SESSION)

**Primary Document**: [ROUTINES_RESERVATIONS_CONSOLIDATED.md](./ROUTINES_RESERVATIONS_CONSOLIDATED.md)

**This consolidates:**
- USER_TESTING_NOTES.md (latest feedback)
- FIXES_AND_ENHANCEMENTS.md (previous implementation plan)
- User journey expectations
- Historical workflow notes

### Studio Director Priority Fixes (Latest Testing)
- [x] **[CRITICAL]** Fix white-on-white dropdowns in Create Routine modal *(Completed Oct 5)*
- [x] **[CRITICAL]** Lock Studio selection to current studio *(Verified already implemented)*
- [x] **[CRITICAL]** Replace all "entries" → "routines" terminology *(User-facing text complete Oct 5)*
- [x] **[CRITICAL]** Hide capacity metrics from Studio view *(Verified already implemented)*
- [x] **[CRITICAL]** Remove agent information editing *(Completed Oct 5)*
- [ ] **[NEW]** Merge "Add Dancer" and "Batch Add" into unified action
- [x] **[NEW]** Show routine counter: "3 of 30 remaining" *(Verified already implemented)*
- [x] **[NEW]** Replace Music section with Props field *(Verified already implemented - music handled separately)*
- [x] **[NEW]** Fix reservation flow white-on-white dropdowns *(Completed Oct 5)*
- [x] **[NEW]** Add helper text: "Routines available: 12 of 20 approved" *(Verified already implemented)*
- [x] **[NEW]** Auto-generate invoice on reservation submission *(Verified already implemented)*
- [ ] Remove drag reordering on participants inside Create Routine
- [ ] Implement drag-and-drop linking (routines left, dancers right) *(also in FIXES_AND_ENHANCEMENTS.md)*
- [x] Dashboard label: "My Routines" (not "My Entries") *(Verified already implemented)*
- [ ] Keep Quick Start flow for routine creation

### Competition Director Priority Fixes (Latest Testing)
- [ ] **[CRITICAL]** Emphasize Reservations at top of dashboard *(similar to FIXES_AND_ENHANCEMENTS.md)*
- [ ] **[NEW]** Implement 4×4 card grid layout for competitions
- [ ] **[NEW]** Show capacity/tokens/pending reservations per card
- [ ] **[NEW]** Add approve/reject/cancel actions to cards
- [ ] **[NEW]** Auto-adjust capacity when reservations confirmed/released *(overlaps with FIXES_AND_ENHANCEMENTS.md)*
- [ ] **[NEW]** Add manual reservation creation (admin-only)
- [ ] **[NEW]** Remove "Create Reservation" button (directors don't create)
- [ ] **[NEW]** Enable column sorting (alphabetical/numerical/group)
- [ ] Polish PDF generation (alignment, fonts)
- [ ] Test with real seeded data (GlowDance Orlando)

### From FIXES_AND_ENHANCEMENTS.md (Still Relevant)
- [ ] Fix reservation sync issue (cache invalidation)
- [ ] Studio settings single-tenant view
- [ ] Invoices page hard-lock to own studio
- [ ] Multi-row dancer batch add form *(overlaps with "unified action" above)*
- [ ] Table/card view toggle with persistence
- [ ] Reservation reduction with routine impact warnings
- [ ] Global invoices view for Competition Directors
- [ ] Manual "Mark as Paid" toggle

---

## 🎬 At Competition Mode (Future Major Feature)

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

### Email Notifications (Deferred Post-Launch)
- [ ] Entry submitted confirmation email
- [ ] Missing music reminder emails
- [ ] Payment confirmation emails

### Data Import/Export
- [ ] Bulk dancer CSV import
- [ ] Schedule export (PDF/CSV/iCal)
- [ ] Results export (PDF/CSV)

### Dashboard Enhancements
- [ ] Music tracking dashboard
- [ ] Personalized dashboard layout (drag/drop widgets)
- [ ] Visual capacity meters/progress bars per event
- [ ] Draggable dashboard button reordering

### Studio Management
- [ ] Studio logo upload
- [ ] Studio branding customization
- [ ] Multi-user studio accounts

### Competition Management
- [ ] Competition cloning (from past events)
- [ ] Multi-competition switching (Glow/EMPWR)
- [ ] Advanced scheduling with conflict detection
- [ ] Judge assignment and management

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
