# CompPortal - Master Business Logic Summary

**Document Purpose:** High-level overview of all four phases of CompPortal with implementation status and clarification tracking.

**Last Updated:** October 24, 2025  
**Project Status:** Phase 1 finalized, Phases 2-4 require detailed clarification

---

## Executive Overview

CompPortal is a comprehensive competition management platform for dance competitions, managing the complete lifecycle from registration through post-event media distribution. The platform serves three primary user roles:

- **Competition Directors (CD):** Event organizers who configure competitions and manage the operational workflow
- **Studio Directors (SD):** Dance studio owners/managers who register entries and manage their participants
- **Parents/Dancers:** End users who access performance media and results

---

## Four-Phase Lifecycle

### Phase 1: Registration (~3 months) ✅ FINALIZED

**Status:** Complete business logic specification ready for implementation  
**Documentation:** `CompPortal_Phase1_Business_Logic_FINAL.md`

**Purpose:** Manage event setup, studio registration, reservation of entry slots, and invoice generation

**Key Capabilities:**
- Competition Directors configure events with capacity limits, age divisions, levels, categories, and pricing
- Studio Directors request entry reservations, create detailed entries, and submit summaries
- Automated capacity management with real-time refunds of unused slots
- Invoice generation with flexible discounts, credits, and tax calculation
- Payment tracking with Phase 2 access gate

**Core Business Rules:**
- Capacity measured in number of entries (not dancers or routines)
- Studios may have multiple reservations per event (tracked separately)
- Summary submission triggers immediate capacity refund
- Invoice generated from Summary (not from initial reservation)
- All invoices must be paid before Phase 2 access (calendar-gated)
- Entries convert to routines in Phase 2

**Data Flow:**
```
Reservation Request → CD Approval → Entry Creation → Summary Submission → 
Invoice Generation → Payment → Phase 2 Access Unlocked
```

**Completion Criteria:**
- All expected studios have submitted summaries
- All invoices issued (payment can extend beyond 3-month timeline)
- Event capacity finalized for planning

---

### Phase 2: Planning (~3 months) ⚠️ NEEDS CLARIFICATION

**Purpose:** Convert approved entries into detailed routines with music, create schedules, and gather studio feedback

**Known Requirements:**

**Studio Director Actions:**
- Convert Entries → Routines (up to `entries_used` from Phase 1)
- Attach dancers to routines (reuse from Phase 1 entry data)
- Upload music files (MP3, 50MB max per routine)

**Competition Director Actions:**
- Assign judges to events
- Create draft schedules using drag-and-drop interface
- Add breaks and award ceremonies per session
- Submit draft schedule to studios for review
- Review and accept/reject studio feedback
- Finalize schedule and lock routine numbers

**System Functions:**
- Manage sessions (groupings of routines with awards)
- Auto-detect scheduling conflicts (same dancer, costume changes)
- Enforce scheduling rules (spacing, age-appropriate timing)
- Assign routine numbers sequentially
- Lock routine numbers post-finalization for media linkage

**Outstanding Questions for Phase 2:**

1. **Routine Creation:**
   - Does SD see pre-populated routine data from their Phase 1 entries (name, choreographer, dancers, category, etc.)?
   - Or do they start fresh and just have a "quota" of X routines to create?
   - Can SD edit routine details (name, dancers, etc.) during Planning phase?

2. **Music Upload:**
   - Required immediately when routine created, or can be uploaded later?
   - Deadline for music submission before schedule finalization?
   - What happens if music is missing when CD tries to finalize schedule?
   - Can SD replace music after upload (before schedule finalized)?
   - File validation: What audio formats beyond MP3? (AAC, WAV, FLAC?)
   - Duration validation: Min/max length requirements?

3. **Judge Assignments:**
   - Can judges be assigned to specific sessions, or only to full events?
   - How many judges per event (min/max)?
   - Can judge assignments change after draft schedule created?
   - Are judges notified when assigned?

4. **Schedule Creation:**
   - What scheduling rules need to be enforced? (You mentioned 3-5 routines between same dancer, younger solos early, large groups mid-day)
   - Any other constraints: category groupings, level progressions, style variety?
   - How does CD define sessions? Time-based? Count-based? Manual grouping?
   - Can routines be moved between sessions after initial placement?
   - What conflict warnings should system show? (Hard blocks vs. soft warnings)

5. **Draft Schedule Feedback:**
   - You mentioned 1-week feedback window with auto-enforcement (timer + soft lock)
   - What exactly can SDs comment on? (Timing? Routine order? Conflicts?)
   - Feedback format: Free text? Structured requests (swap with another routine, move earlier/later)?
   - Can SD mark specific routines as "no conflicts" vs. "needs adjustment"?
   - Does CD see aggregated feedback or per-studio views?

6. **Feedback Review & Acceptance:**
   - When CD accepts a feedback request, does system auto-adjust schedule?
   - Or does CD manually make changes and mark request as "addressed"?
   - Can CD partially accept (e.g., move routine but not as much as requested)?
   - What happens at end of 1-week window? Auto-lock? Grace period?

7. **Routine Numbering:**
   - Sequential per event (100, 101, 102...)?
   - Or per session (Session 1: 100-125, Session 2: 200-225)?
   - When are numbers assigned? At draft creation? At finalization?
   - If routine moves between drafts, does number change or persist?
   - Final identifier format: You mentioned `{CityOrEventSlug}_{RoutineNumber}` - is this for display only or also stored?

8. **Award Ceremonies:**
   - How does CD specify which awards are presented at which ceremony?
   - Are ceremonies automatically placed after last routine in session?
   - Can CD override ceremony placement?
   - Duration for ceremonies (fixed or variable)?

9. **Breaks:**
   - How does CD add breaks? (Click between routines? Specify time/duration?)
   - Can breaks be categorized (lunch, transition, technical)?
   - Do breaks affect schedule conflict detection?

10. **Schedule Finalization:**
    - What triggers final lock? CD clicks "Finalize"?
    - Can schedule be un-finalized if needed?
    - Are SDs notified when schedule is finalized?
    - What data becomes immutable at finalization?

11. **Session Management:**
    - How are sessions created? CD manually defines? System suggests based on time/count?
    - Can routines be moved between sessions after feedback?
    - Do sessions have capacity limits?
    - How do award categories map to sessions?

**Completion Criteria (Tentative):**
- All routines created with music uploaded
- Schedule finalized with routine numbers locked
- All studio feedback reviewed
- Judges assigned and notified

---

### Phase 3: Game Day (Event Execution) ⚠️ NEEDS CLARIFICATION

**Purpose:** Run live event with audio playback, real-time scoring, and media capture

**Known Requirements:**

**Backstage Tech Interface:**
- View routine playlist in order
- Download MP3s linked to routines
- Trigger music playback for current routine
- System logs elapsed time

**Competition Director Interface:**
- Game Day dashboard showing active routine
- Real-time routine status and timing

**Judge Tablet Interface:**
- Single scoring slider per routine (0-100 or configured range)
- Ability to assign special awards from predefined list

**Media Operator:**
- Capture photos/videos tagged by routine number
- Upload to storage with routine ID + event + session metadata

**System Functions:**
- Real-time sync across CD, Backstage Tech, and Judge devices
- Tabulate marks and calculate placements per session
- Auto-generate awards ceremony reports

**Outstanding Questions for Phase 3:**

1. **Scoring System:**
   - Single slider confirmed, but what is the default range? (0-100? 0-10? Configurable per event?)
   - How are ties handled in placement calculations?
   - Does system use raw scores or normalized/scaled scores?
   - Can judges edit scores after submission? (Grace period? Only before ceremony?)

2. **Special Awards:**
   - How are special awards defined? (CD creates list in Phase 1 competition settings?)
   - Can judges nominate multiple routines per award? Or pick one winner?
   - Are special awards per session or per event?
   - Examples of special awards? (Best Costume, Showmanship, Technique, Choreography, etc.)

3. **Real-Time Sync:**
   - What happens if device goes offline during event?
   - Does system cache scores locally and sync when reconnected?
   - How is "current routine" determined? (Backstage Tech controls? Auto-advance after time?)

4. **Audio Playback:**
   - Does Backstage Tech interface integrate with actual audio equipment?
   - Or is this just a playlist management tool (download MP3s, play manually)?
   - Any fade in/out controls? Volume controls?

5. **Routine Status Tracking:**
   - What statuses exist? (Upcoming, In Progress, Completed, Skipped?)
   - Can routines be marked as scratched/withdrawn on game day?
   - How does system handle running ahead/behind schedule?

6. **Media Capture:**
   - Is Media Operator a separate role/login?
   - Or do CDs/Backstage Techs upload media opportunistically?
   - File size limits for photos/videos?
   - Supported formats? (JPEG, PNG, MP4, MOV?)
   - Is upload during event or post-event batch?

7. **Awards Ceremony Timing:**
   - Does system notify CD when ceremony should start?
   - Can ceremony be delayed/rescheduled if running behind?
   - What data is displayed during ceremony? (Top 10? Specific placements? Overalls?)

8. **Judge Workflow:**
   - Can judges score routines out of order (if they miss one)?
   - Does system show judges their scoring history/stats?
   - Any calibration checks (flag if judge is outlier)?

9. **Breaks During Event:**
   - How does system handle scheduled breaks?
   - Does timer pause? Or continue running?
   - Can breaks be extended if running behind?

10. **Technical Issues:**
    - What happens if music file won't play (corrupted)?
    - Can Backstage Tech request SD to re-upload?
    - Any emergency contact system between roles?

**Completion Criteria (Tentative):**
- All routines performed and scored
- All awards distributed
- Media captured and tagged
- Results finalized

---

### Phase 4: Post-Event (~3 months) ⚠️ NEEDS CLARIFICATION

**Purpose:** Provide access to results, reports, media, and enable next-season deposits

**Known Requirements:**

**Studio Director Access:**
- View/download reports with marks and awards
- View invoice history across years

**Parent Access:**
- Access media portal via dancer name + DOB
- View/download only routines featuring their dancer (no session-wide downloads)

**Competition Director Actions:**
- Accept deposits for next season
- Block entry space for returning studios

**System Functions:**
- Generate reports from finalized results
- Provide analytics and data retention
- Create provisional reservations for next season (type = 'deposit')
- Persist SD accounts year-to-year

**Outstanding Questions for Phase 4:**

1. **Reports:**
   - What formats? (PDF? Excel? CSV?)
   - What data is included? (All scores per judge? Just final placement? Score breakdowns?)
   - Do reports show special awards?
   - Are reports per routine, per studio, or per event?
   - Can SD filter/customize report content?

2. **Media Portal Access:**
   - How do parents authenticate? Just name + DOB? Or email verification?
   - Security concerns with DOB-only access?
   - Can parents share media download links? Or are they tokenized/expiring?
   - File download format: Original quality? Or compressed for streaming?
   - Any download limits (bandwidth, count)?

3. **Media Visibility Rules:**
   - If dancer is in a group routine, do parents see full routine or just their dancer?
   - Can parents see other dancers' names in group routines?
   - What if multiple dancers from same family? Single login or separate?

4. **Invoice History:**
   - What years are visible? (Current year? Last 3 years? All time?)
   - Can SD re-download old invoices as PDFs?
   - Are credits/discounts from previous years visible?

5. **Next-Season Deposits:**
   - How much is deposit? (Fixed amount? Percentage of expected entries?)
   - Does deposit apply to next season's invoice as credit?
   - Can deposits be refunded if studio doesn't return?
   - How far in advance can deposits be accepted? (1 month? 6 months? 1 year?)
   - Does accepting deposit immediately block capacity for next season's event?

6. **Provisional Reservations:**
   - What data is captured with deposit? (Estimated entry count? Specific events?)
   - Can SD modify deposit reservation later?
   - How does provisional reservation convert to actual reservation in next season's Phase 1?

7. **Data Retention:**
   - What data persists across seasons? (Dancers? Routines? Scores? Media?)
   - Are old events archived differently than active events?
   - Can SDs delete their data? (GDPR compliance?)

8. **Analytics:**
   - What analytics are provided? (Studio performance trends? Judge scoring patterns? Category popularity?)
   - Are analytics per event or aggregated across seasons?
   - Who can access analytics? (CD only? SD for their own studio?)

9. **Returning Studio Workflow:**
   - Does system recognize returning SDs automatically?
   - Are dancers from previous season auto-populated?
   - Can SD import/update dancer roster from last season?

10. **Media Retention:**
    - How long is media stored? (1 year? Indefinitely?)
    - Are there storage costs passed to studios/parents?
    - Can media be deleted after download?

**Completion Criteria (Tentative):**
- All reports generated and accessible
- Media portal live with all assets tagged
- Deposits processed for next season
- Data archived and retained per policy

---

## Global System Requirements (Cross-Phase)

### User Management & Authentication
- **Roles:** Competition Director, Studio Director, Judge, Backstage Tech, Media Operator, Parent, System Admin
- **Authentication:** Email/password? SSO? 2FA for admin roles?
- **Multi-tenancy:** Studios isolated, CDs see only their events, judges see only assigned events

### Data Model Relationships
```
Events ←→ Competition Settings
Events → Reservations → Entries → Routines
Routines → Marks (from Judges)
Routines → Media Assets
Dancers ← Entry Dancers → Entries
Sessions ← Routines (ordered)
Sessions → Award Ceremonies
```

### Email Notifications
- Phase 1: 7 notification types finalized
- Phase 2: Draft schedule sent, feedback reminders, finalization notice
- Phase 3: Judge assignments, schedule changes, ceremony start alerts
- Phase 4: Reports ready, media available, deposit confirmations

### Audit & Compliance
- All state transitions logged with user ID and timestamp
- PII handling (dancer DOB never in public APIs)
- GDPR compliance (data deletion requests)
- 7-year retention for tax/legal compliance

### Performance & Scalability
- Target concurrent users: 100-500 SDs, 10-20 CDs, 5-10 judges per event
- Max event size: 600 entries, 50 sessions, 8-hour duration
- Media storage: Up to 10GB per event (photos/videos)

---

## Technology Stack (To Be Determined)

### Backend
- Framework: TBD (Django, Rails, Node.js + Express?)
- Database: PostgreSQL (confirmed for JSONB support and RLS)
- File Storage: AWS S3 or similar for music/media
- Real-time: WebSockets for Game Day sync

### Frontend
- Web App: TBD (React, Vue, Next.js?)
- Mobile: Progressive Web App (PWA) for judge tablets?
- Backstage Tech: Dedicated interface or web-based?

### Infrastructure
- Hosting: TBD (AWS, Vercel, Railway?)
- CDN: For media delivery
- Email: SendGrid, AWS SES, or similar

---

## Implementation Phases

### Phase 1: Foundation (Weeks 1-8)
- Database schema implementation
- User authentication and role management
- Phase 1 (Registration) complete workflow
- Admin dashboard for CDs
- Studio dashboard for SDs

### Phase 2: Scheduling (Weeks 9-16)
- Routine creation and music upload
- Schedule builder with drag-and-drop
- Feedback system
- Email notifications for Phase 2

### Phase 3: Live Event (Weeks 17-22)
- Judge scoring interface
- Backstage Tech playlist
- Real-time sync infrastructure
- Media tagging system

### Phase 4: Post-Event (Weeks 23-26)
- Report generation
- Media portal for parents
- Deposit system for next season
- Analytics dashboard

---

## Risk Assessment

### High Priority Risks

1. **Real-Time Sync Complexity (Phase 3)**
   - Risk: WebSocket connections dropping during live event
   - Mitigation: Local caching, offline fallback, conflict resolution

2. **Media Storage Costs**
   - Risk: Large video files exceeding budget
   - Mitigation: Compression, tiered storage (hot/cold), download limits

3. **Schedule Conflict Detection**
   - Risk: Complex rules causing false positives or missing conflicts
   - Mitigation: Configurable rule engine, manual override capability

4. **Race Conditions in Capacity Management**
   - Risk: Overbooking when multiple studios request simultaneously
   - Mitigation: Database row-level locking (implemented in Phase 1 spec)

### Medium Priority Risks

5. **Bulk Import Data Quality**
   - Risk: Corrupt CSV files causing system errors
   - Mitigation: Robust validation, preview before commit, error reporting

6. **Invoice Calculation Edge Cases**
   - Risk: Discounts + credits causing negative totals
   - Mitigation: Validation rules (implemented in Phase 1 spec)

7. **Music File Compatibility**
   - Risk: Unsupported audio formats or corrupt files
   - Mitigation: Format validation, transcode to standard format, testing library

### Low Priority Risks

8. **Email Deliverability**
   - Risk: Notifications ending up in spam
   - Mitigation: SPF/DKIM/DMARC setup, reputable email service

9. **Browser Compatibility**
   - Risk: Judge tablets using outdated browsers
   - Mitigation: Progressive enhancement, explicit browser requirements

---

## Next Steps

### Immediate Actions (This Week)
1. ✅ Finalize Phase 1 business logic (COMPLETE)
2. ⚠️ Conduct detailed requirements gathering for Phase 2
3. ⚠️ Answer outstanding questions for Phases 3-4
4. Schedule technical architecture review

### Short-Term (Next 2 Weeks)
1. Create Phase 2 detailed specification (similar to Phase 1)
2. Create Phase 3 detailed specification
3. Create Phase 4 detailed specification
4. Review and validate all cross-phase integrations

### Medium-Term (Next Month)
1. Technology stack selection and approval
2. Database schema design finalized across all phases
3. API contract definitions
4. UI/UX wireframes for all major interfaces

---

## Document Status Summary

| Phase | Status | Documentation | Completeness | Blockers |
|-------|--------|---------------|--------------|----------|
| Phase 1: Registration | ✅ Finalized | `CompPortal_Phase1_Business_Logic_FINAL.md` | 100% | None |
| Phase 2: Planning | ⚠️ In Progress | Pending detailed specification | 40% | 11 open questions |
| Phase 3: Game Day | ⚠️ In Progress | Pending detailed specification | 30% | 10 open questions |
| Phase 4: Post-Event | ⚠️ In Progress | Pending detailed specification | 25% | 10 open questions |
| Global Requirements | ⚠️ In Progress | Partial specification | 50% | Tech stack selection |

---

## Contact & Ownership

**Project Lead:** [Your Name]  
**Technical Lead:** TBD  
**Document Maintainer:** [Your Name]  

**Last Review Date:** October 24, 2025  
**Next Review Date:** [Schedule after Phase 2 clarification]

---

**END OF MASTER SUMMARY**

*For detailed Phase 1 implementation specifications, see: `CompPortal_Phase1_Business_Logic_FINAL.md`*

*For Phases 2-4 detailed specifications: To be created after requirements clarification sessions*
