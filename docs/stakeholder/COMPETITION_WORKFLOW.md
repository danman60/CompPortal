# Dance Competition Industry Workflow - CompPortal Reference

**Document Purpose**: Complete end-to-end workflow for dance competition operations, from season setup through awards and media delivery. This serves as the source of truth for business logic, feature development, and system requirements.

**Last Updated**: October 3, 2025
**Status**: Industry Standard Reference + CompPortal Implementation Notes

---

## Table of Contents
1. [Pre-Season Setup](#1-pre-season-setup)
2. [Studio Registration & Entry Submission](#2-studio-registration--entry-submission)
3. [Scheduling & Music Intake](#3-scheduling--music-intake)
4. [Pre-Event Confirmations](#4-pre-event-confirmations)
5. [Competition Day Operations](#5-competition-day-operations)
6. [Scoring & Adjudication](#6-scoring--adjudication)
7. [Awards & Results](#7-awards--results)
8. [Post-Event Closeout](#8-post-event-closeout)
9. [System Implementation Notes](#9-system-implementation-notes)

---

## 1. Pre-Season Setup

### 1.1 Competition Director: Season Planning
**Timeline**: Months before competition (typically September-October for spring season)

**Tasks**:
- **Create competition season** (e.g., "GLOW Dance 2026")
- **Set competition dates and cities** (Orlando March 15-17, Toronto April 5-7, etc.)
- **Define house rules**:
  - Age determination method (typically "age as of January 1")
  - Age division bands (Petite 5-8, Junior 9-11, Teen 12-14, Senior 15-19)
  - Competitive levels (Recreational, Intermediate, Competitive)
  - Award level scoring ranges (Silver 80-85, Gold 85-90, Platinum 90-95, etc.)
  - Time limits per entry size
  - Prop safety rules and setup/strike time caps
  - Independent dancer policy (allow/prohibit non-studio entries)
- **Set venue capacity** for each location
- **Configure registration fees**:
  - Per-routine base fee
  - Per-dancer fees
  - Deposit requirements
  - Media fees (mandatory per-dancer or optional à-la-carte)
  - Late entry fees
- **Open studio registration portal**

**CompPortal Implementation**:
- CD creates competition via `/dashboard/competitions/new`
- CD sets all categories, levels, and award scoring ranges (stored in database)
- Portal enforces house rules during studio registration

---

## 2. Studio Registration & Entry Submission

### 2.1 Studio Director: Account Setup
**Timeline**: Weeks to months before competition

**Tasks**:
1. **Create studio account** (business email, password)
2. **Verify email** (confirmation link)
3. **Complete studio profile**:
   - Studio name, code, address, contact info
   - Primary contact person details
   - Submit for admin approval
4. **Wait for approval** (status: PENDING → APPROVED by admin)

**CompPortal Implementation**:
- Registration at `/login` → create account
- Studio profile form at `/dashboard/studios/edit`
- Admin approval workflow at `/dashboard/studios` (admin view)
- Email notifications on approval

### 2.2 Studio Director: Dancer Roster Management
**Timeline**: Ongoing throughout season

**Tasks**:
- **Add dancers** to studio roster:
  - First name, last name, date of birth
  - Gender (optional, for reporting)
  - Age override (if needed for competition eligibility)
  - Dancer photo upload (for credentials/programs)
- **Age calculation**:
  - Calculate age as of January 1 of competition year
  - For groups: Average all dancers' ages, drop decimal
  - Guardrails: Prevent competing more than 1 division younger than oldest dancer
- **Bulk import** (CSV upload for large rosters)

**CompPortal Implementation**:
- Dancer management at `/dashboard/dancers`
- Age calculation automatic based on DOB and competition year
- CSV import at `/dashboard/dancers/import`
- Age override field for special cases

### 2.3 Studio Director: Competition Reservation
**Timeline**: Registration opens 2-4 months before competition

**Tasks**:
1. **Browse available competitions** (filter by location, date, circuit)
2. **Create reservation**:
   - Select competition location
   - Request number of entry spaces (estimate)
   - Provide studio agent details (first name, last name, email, phone, title)
   - Sign digital waivers:
     - Age of consent
     - Liability waiver
     - Media consent
   - Submit deposit (if required) or full payment
3. **Wait for approval** (status: PENDING → APPROVED by CD)
4. **Receive confirmation** (email with reservation details)

**CompPortal Implementation**:
- Reservation wizard at `/dashboard/reservations/new` (**Missing - Roadmap Week 12**)
- Multi-step form: Competition selection → Space request → Agent info → Waivers → Payment
- Payment integration (Stripe) for deposits/full payment
- Email confirmation on approval

### 2.4 Studio Director: Entry Creation & Routine Details
**Timeline**: After reservation approved, typically 4-8 weeks before competition

**Tasks**:
1. **Create entry** for each routine:
   - **Basic Info**:
     - Routine title (e.g., "Shine Bright", "Electric Nights")
     - Competition (from approved reservations)
     - Studio (auto-filled)
   - **Category Details** (selected from CD-defined options):
     - Performance category: Jazz, Tap, Lyrical, Hip Hop, Ballet, Contemporary, Acro, Open, Production
     - Entry size: Solo, Duet/Trio, Small Group (4-9), Large Group (10+), Line, Production
     - Age division: Petite, Junior, Teen, Senior (based on dancer ages)
     - Competitive level: Recreational, Intermediate, Competitive (Level 1-5)
   - **Participants**:
     - Assign dancer(s) from studio roster
     - System validates age division eligibility
     - For groups: Automatically calculates average age, drops decimal
     - Enforces age guardrails (prevent sandbagging)
   - **Special Requests**:
     - Prop declarations (type, dimensions, setup time needed)
     - Quick-change conflicts (same dancer in back-to-back routines)
     - Scheduling preferences (avoid certain time slots)
2. **Save as DRAFT** (can edit freely until submission deadline)
3. **Submit entries** (status: DRAFT → REGISTERED)
4. **Pay entry fees** (per-routine + per-dancer + media fees if applicable)

**CompPortal Implementation**:
- Entry creation at `/dashboard/entries/create` (multi-step form exists)
- Categories/levels pulled from competition configuration
- Age validation automatic based on assigned dancers
- Entry status workflow: DRAFT → REGISTERED → CONFIRMED → SCHEDULED
- Fee calculation automatic based on competition pricing

---

## 3. Scheduling & Music Intake

### 3.1 Studio Director: Music Upload
**Timeline**: ~1 week before competition (strict deadline enforced)

**Tasks**:
- **Upload music file** for each entry (MP3, WAV, M4A formats)
- **File naming convention** (industry standard):
  - Format: `[EntryNumber]_[RoutineTitle]_[StudioCode].mp3`
  - Example: `156_ShineBright_SDA.mp3`
  - **Critical**: Entry number prefix allows stage crew instant reconciliation
- **Verify upload** (checkmark appears in entry dashboard)
- **Late uploads** may incur fees or scheduling penalties

**CompPortal Implementation**:
- Music upload at `/dashboard/entries/[id]/music`
- File validation: Format, size limits, duration
- Auto-naming suggestion using entry number + routine title
- Dashboard shows ✅/❌ for Music Uploaded status
- Email reminders as deadline approaches

### 3.2 Competition Director: Schedule Generation
**Timeline**: 7-14 days before competition (industry standard: at least 9 days notice)

**Tasks**:
1. **Review all REGISTERED entries** for competition
2. **Run "Generate Schedule"** algorithm:
   - **Entry Numbering**:
     - Assign sequential entry numbers starting at **100** per competition
     - Entry numbers locked once assigned (immutable after schedule published)
     - Entry number format: 3-digit (100, 101, 102, etc.)
   - **Time Slot Assignment**:
     - Assign each entry a scheduled time (e.g., Saturday 10:00 AM, 10:05 AM)
     - Balance divisions across competition days
     - Account for routine duration (typically 3 minutes + buffer)
     - Insert breaks, lunch periods, awards ceremonies
     - Respect venue hours and stage capacity
   - **Conflict Detection** (**To be specified later - mark in roadmap**):
     - Same dancer in multiple entries with insufficient quick-change time
     - Studio-requested conflicts (avoid certain time blocks)
     - Prop setup conflicts (back-to-back entries requiring heavy props)
   - **Optimization Goals** (**Schedule logic to be detailed later - mark in roadmap**):
     - Group similar age divisions for judging consistency
     - Minimize dead time between entries
     - Balance session lengths
     - Accommodate venue limitations (stage size, backstage space)
3. **Review draft schedule** (manually adjust if needed)
4. **Publish schedule** to studio portals
   - Entry numbers become **locked** (cannot be changed)
   - Scheduled times visible to all studios
5. **Release final schedule** PDF/CSV exports

**CompPortal Implementation**:
- Scheduling UI at `/dashboard/scheduling` (existing page needs full implementation)
- "Generate Schedule" button triggers algorithm
- Manual drag-and-drop to adjust times/order
- Conflict warnings displayed for CD review
- "Publish Schedule" action locks entry numbers and notifies studios
- Entry status: REGISTERED → CONFIRMED → SCHEDULED

### 3.3 Competition Director: Late Entry Management
**Timeline**: ~10 days before competition (after schedule published)

**Tasks**:
1. **Studio submits late entry** OR **CD marks existing entry as late addition**
2. **CD manually designates late entry** (checkbox/flag in system)
3. **CD inserts into schedule** with **suffix logic**:
   - **Example**: Schedule already has entry 156 at 2:30 PM
   - CD wants to add late entry after 156
   - System assigns **entry number 156a** (suffix "a")
   - Entry 156a scheduled at 2:31 PM (or next available slot)
   - Subsequent late entries at same position: 156b, 156c, etc.
4. **Entry number remains locked** (156a never changes)
5. **Studio notified** of updated schedule and entry number

**CompPortal Implementation**:
- "Mark as Late Entry" checkbox in scheduling UI (CD only)
- Suffix assignment modal: CD picks existing entry number, system adds next letter
- Updated schedule auto-published with late entries highlighted
- Email notifications to affected studios

**Key Business Rule**: Entry numbers (including suffixes) are **immutable** once assigned. This ensures consistency across programs, scorecards, audio critiques, and awards.

---

## 4. Pre-Event Confirmations

### 4.1 Studio Director: Schedule Review & Confirmations
**Timeline**: 7-14 days before competition

**Tasks**:
- **Review published schedule** at `/dashboard/schedule` (read-only view)
- **Verify**:
  - Entry numbers assigned correctly
  - Scheduled times acceptable
  - All dancers assigned to entries
  - Music uploaded for all entries (✅ checkmarks)
  - Categories/divisions correct
- **Submit confirmation** or **request changes** (before cutoff deadline)
- **Resolve conflicts** with competition director
- **Print/export schedule** for studio records

**Studio Dashboard View** (per entry):
| Entry # | Routine Title | Dancers Assigned | Category | Music Uploaded | Scheduled Time | Status |
|---------|---------------|------------------|----------|----------------|----------------|--------|
| 156 | Shine Bright | ✅ (3 dancers) | Jazz, Small Group, Junior, Competitive | ✅ | Sat 2:30 PM | SCHEDULED |
| 156a | Electric Nights | ✅ (1 dancer) | Hip Hop, Solo, Teen, Level 3 | ✅ | Sat 2:31 PM | SCHEDULED (Late) |
| 157 | Moonlight | ❌ (0 dancers) | Contemporary, Duet, Senior, Level 5 | ❌ | Sat 2:35 PM | INCOMPLETE |

**Sortable/Filterable** by: Entry #, Time, Category, Status

**CompPortal Implementation**:
- Schedule view at `/dashboard/schedule` (SD read-only)
- Entry dashboard table with sortable columns
- Change request form (before deadline)
- Export to PDF/CSV for studio distribution

### 4.2 Competition Director: Final Schedule Lock
**Timeline**: ~5 days before competition

**Tasks**:
- **Review studio confirmations** and change requests
- **Make final adjustments** (manual overrides)
- **Verify unpaid entries excluded** from schedule (business policy)
- **Lock schedule** (no further changes except emergencies)
- **Publish final version** to all studios
- **Send to stage crew** (music files + schedule with entry numbers)

**CompPortal Implementation**:
- "Lock Schedule" button (prevents further edits)
- Payment status validation (unpaid entries flagged/excluded)
- Backstage crew export (music files + run order with entry numbers)

---

## 5. Competition Day Operations

### 5.1 On-Site Check-In
**Timeline**: Competition morning

**Tasks**:
- **Studio rep checks in** at registration desk
- **Pick up credentials/wristbands** for dancers and staff
- **Verify music files** received and loaded by sound booth
- **Confirm schedule** (receive printed run sheet)
- **Backstage check-in** (each routine must check in before being called)

**CompPortal Integration**:
- Check-in status tracked in database (optional digital check-in via mobile)
- Music verification checklist for sound crew

### 5.2 Stage Management & Flow
**Timeline**: Throughout competition day

**Operations**:
- **Stage dimensions** published in advance (e.g., 40′×36′ with Marley flooring)
- **Backstage monitors** display current entry + on-deck entries
- **Prop setup/strike**:
  - Time limits enforced (e.g., 30 seconds setup, 30 seconds strike)
  - Extended prop time must be pre-purchased
  - Safety rules: No items thrown off front of stage, height restrictions
- **Quick changes**:
  - Backstage team coordinates same-dancer conflicts
  - Quick-change rooms available
- **Running early/late**:
  - If ahead of schedule, entries must be ready early
  - On-deck area ensures smooth flow

**CompPortal Support**:
- Stage specs published in competition details
- Prop declarations from entry forms visible to stage crew
- Real-time schedule tracking (entry currently performing, next 3 entries)

---

## 6. Scoring & Adjudication

### 6.1 Judge Scoring Interface
**Timeline**: Real-time during each performance

**Judging Panel**: Typically 3 judges per competition

**Scoring Mechanics**:
- **Judging Criteria**:
  - **Technique** (1-100 points): Execution, skill level, precision
  - **Artistic/Performance** (1-100 points): Showmanship, stage presence, emotional connection
  - **Musicality** (1-100 points): Choreography, use of music, creativity
  - **Execution** (1-100 points): Formations, spacing, synchronization (for groups)
  - **Choreography** (1-100 points): Originality, complexity, composition
- **Each judge scores 1-100** on a **slider interface** (not typed input)
- **Total possible**: 300 points (3 judges × 100 points each) for simplified scoring
  - OR: 500 points (multiple criteria × 100 per judge) for detailed scoring
- **Judges record live audio critiques** during performance (optional feature)

**Real-Time Requirements** (**CRITICAL - Roadmap Addition**):
- **Scores submitted immediately** after each routine
- **Database updates in real-time** (no batch processing)
- **Auto-categorization into award levels**:
  - **Example Award Levels** (CD defines exact ranges per competition):
    - **Platinum**: 90-100 points (average across judges)
    - **High Gold**: 85-89.9 points
    - **Gold**: 80-84.9 points
    - **High Silver**: 75-79.9 points
    - **Silver**: 70-74.9 points
  - **System calculates average score** across judges
  - **Assigns award level** based on CD-defined ranges
  - **Sorts routines within category** for overall placements (1st, 2nd, 3rd)
- **Live scoreboard updates** visible to CD (optional: visible to studios/audience)

**CompPortal Implementation**:
- Judge scoring interface at `/dashboard/scoring` (exists, needs real-time updates)
- Slider inputs for each criterion (1-100 range)
- Audio critique recording (optional feature - future)
- **Real-time score submission** triggers:
  1. Save score to database (judges_scores table)
  2. Calculate average across all judges for this entry
  3. Determine award level based on competition's scoring ranges
  4. Update entry's calculated_score and award_level fields
  5. Re-sort category placements (overall rankings)
  6. Broadcast update to live scoreboard (WebSocket/Server-Sent Events)
- **Tie-break rules** (CD configurable):
  - Highest technique score wins
  - If still tied, highest artistic score
  - If still tied, judges' discretion or shared placement

### 6.2 Tabulation System
**Timeline**: Continuous during competition

**Operations**:
- **Scores feed from judges' devices** to central tabulation system
- **Calculations**:
  - Average score per entry (across all judges)
  - Award level assignment (Platinum, Gold, Silver, etc.)
  - Category placements (1st, 2nd, 3rd within age/category/level)
  - Overall awards (top scores across all categories)
  - Special awards (judges' choice, highest technique, etc.)
- **Tie-break application** (automated based on configured rules)
- **Score verification** (flag anomalies, missing scores)

**CompPortal Implementation**:
- Tabulation engine runs on every score submission
- Automated calculations (no manual intervention)
- Real-time dashboard for CD: `/dashboard/scoreboard`
- Shows current standings by category, award level distribution, overall rankings

---

## 7. Awards & Results

### 7.1 Awards Ceremonies
**Timeline**: Throughout competition day (frequent awards blocks)

**Flow**:
1. **Awards announcements** after each session or category block
2. **Adjudication awards** (Platinum, Gold, Silver) presented first
3. **Overall placements** announced (1st, 2nd, 3rd within category/level)
4. **Special awards** (Judges' Choice, Choreography Award, etc.)
5. **Dancers receive trophies/medals** based on award level

**CompPortal Integration**:
- Awards ceremony script generated from tabulation data
- Entry numbers announced with routine titles for clarity

### 7.2 Results Access & Transparency
**Timeline**: Available by Monday after competition

**Deliverables**:
- **Score sheets** (individual judge scores + average + award level)
- **Category rankings** (placement within age/category/level)
- **Overall standings** (top scores across all entries)
- **Audio critiques** (MP3 files, if recorded during judging)

**Studio Portal Access**:
- Studios log in to `/dashboard/results`
- View/download score sheets per entry
- Listen to audio critiques (if available)
- Export results to PDF for studio records

**Transparency Note**: Many organizations emphasize results represent "that panel's opinion on that day" (not absolute rankings).

**CompPortal Implementation**:
- Results portal at `/dashboard/results` (studio view)
- PDF score sheets with entry number, judges' scores, average, award level, placement
- Audio critique playback (if feature implemented)
- Export/download functionality

---

## 8. Post-Event Closeout

### 8.1 Media Fulfillment
**Timeline**: 1-2 weeks after competition

**Media Options**:
1. **Mandatory Media Fee Model**:
   - Per-dancer fee charged during registration
   - Unlocks access to full photo/video gallery for that dancer
   - Delivered via studio portal
2. **À-la-carte Model**:
   - No mandatory fee
   - Families purchase individual photos/videos post-event
   - Delivered via third-party platform (e.g., DanceKar, event photography service)

**Delivery**:
- **Photos**: High-resolution competition photos (on-stage, backstage, candids)
- **Videos**: Performance videos (full routine, multi-camera optional)
- **Downloadable** from studio portal or media platform
- **Access window**: Typically 30-90 days before content expires

**CompPortal Integration**:
- Media fee configuration per competition (mandatory or optional)
- Upload media assets to Supabase Storage or third-party CDN
- Gallery view at `/dashboard/media` with filtering by entry/dancer
- Download links with expiration dates

### 8.2 Nationals Qualification
**Timeline**: Automatic upon regional participation

**Qualification Rules**:
- Participation in 1+ regional competitions qualifies routine for nationals
- Nationals typically held at season-end (June-July)
- Some circuits offer re-compete format or showcase rounds at nationals

**CompPortal Implementation**:
- Nationals qualification status auto-updated in entry records
- Notification to studios of qualified entries
- Nationals registration flow similar to regional reservations

### 8.3 Financial Reconciliation
**Timeline**: 1-2 weeks post-event

**Tasks**:
- **Reconcile payments**: All entry fees, deposits, media fees collected
- **Process refunds**: Cancellations, withdrawals (per refund policy)
- **Address disputes**: Payment inquiries, score challenges
- **Close competition** financials in admin portal

**CompPortal Implementation**:
- Financial reports at `/dashboard/analytics` (competition-specific)
- Payment status tracking (paid, partial, outstanding, refunded)
- Refund workflow for approved cancellations

### 8.4 System Archival & Feedback
**Timeline**: End of season

**Tasks**:
- **Archive competition data** (scores, schedules, media for historical reference)
- **Collect studio feedback** (surveys, testimonials)
- **Review rule inquiries** and publish any corrections/clarifications
- **Debrief with judges/staff** for continuous improvement

**CompPortal Integration**:
- Competition archive status (ACTIVE → COMPLETED → ARCHIVED)
- Feedback forms sent to studio emails
- Admin notes for competition improvements

---

## 9. System Implementation Notes

### 9.1 Age Calculation Rules (Industry Standard)
**Method**: Age as of January 1 of competition year
- **Example**: Dancer born May 15, 2012 competing in 2026 season → Age = 14 (as of Jan 1, 2026)
- **Groups**: Average all dancers' ages, drop the decimal
  - Example: Dancers aged 12, 13, 14 → Average = 13.0 → Junior division
- **Guardrails**: Prevent competing more than 1 division younger than oldest dancer
  - Example: Group with ages 12, 13, 18 → Oldest = 18 (Senior division)
  - Rule: Cannot compete in Teen (more than 1 division lower)
  - Must compete in Senior or Teen at minimum (1 division lower allowed)

**Database Implementation**:
- Store `date_of_birth` for each dancer
- Calculate age dynamically based on competition year
- `age_override` field for special circumstances (with admin approval)
- Age validation on entry submission (enforce division eligibility)

### 9.2 Entry Number + Music Naming Convention
**Standard Format**: `[EntryNumber]_[RoutineTitle]_[StudioCode].mp3`

**Why This Matters**:
- Stage crew can instantly reconcile music files with schedule
- Entry number prefix allows sorting in file system
- Prevents confusion with similar routine titles across studios

**System Enforcement**:
- Auto-suggest file name on music upload
- Validation: File name must start with assigned entry number
- Alert if missing or incorrect naming

### 9.3 Scheduling Timeline Best Practices
**Industry Standard**: Publish final schedule **7-14 days before** competition
- Many tours guarantee "at least 9 days notice"
- Earlier is better for studio planning (travel, hotel, quick changes)

**CompPortal Recommendation**:
- Set scheduling deadline in competition configuration
- Email reminders to CD as deadline approaches
- Lock schedule 5-7 days before event (emergency changes only)

### 9.4 Prop Safety & Time Windows
**Common Rules**:
- Setup time: 30 seconds (standard), 60 seconds (extended, pre-purchased)
- Strike time: 30 seconds (standard), 60 seconds (extended)
- Height restrictions: Props cannot exceed stage proscenium height
- Safety: No items thrown off front of stage, no pyrotechnics, no hazardous materials

**CompPortal Implementation**:
- Prop declaration form in entry creation
- Checkbox for "Extended Prop Time" (adds fee)
- Stage crew view shows prop requirements per entry
- Safety checklist for CD review

### 9.5 Real-Time Scoring & Tabulation Architecture (**CRITICAL**)
**Requirements**:
- **Sub-second latency**: Scores must appear in system immediately after judge submission
- **Concurrent scoring**: Multiple judges scoring simultaneously (3+ judges × 10+ entries/hour)
- **Auto-calculation**: Average scores, award levels, placements updated in real-time
- **Live updates**: Scoreboard reflects changes without manual refresh
- **Conflict resolution**: Handle tie-breaks automatically per configured rules

**Technical Stack** (Recommended):
- **WebSockets or Server-Sent Events** for live scoreboard updates
- **Database triggers**: Auto-calculate on score insert/update
- **Optimistic locking**: Prevent concurrent update conflicts
- **Caching layer**: Redis for real-time leaderboard queries
- **Queue system**: Background jobs for complex calculations (if needed)

**Database Schema Additions**:
```sql
-- Real-time scoring support
ALTER TABLE competitions ADD COLUMN scoring_ranges JSONB;
-- Example: {"platinum": [90, 100], "gold": [80, 89], "silver": [70, 79]}

ALTER TABLE competition_entries ADD COLUMN calculated_score DECIMAL(5,2);
ALTER TABLE competition_entries ADD COLUMN award_level VARCHAR(50);
ALTER TABLE competition_entries ADD COLUMN category_placement INT;

-- Judges scores table (already exists, ensure real-time indexing)
CREATE INDEX idx_scores_realtime ON judges_scores(entry_id, created_at DESC);
```

**Implementation Priority**: **Phase 4, Week 14** (after scheduling complete)

---

## 10. Feature Roadmap Mapping

Based on this workflow, here's how features map to development phases:

### Phase 1: Foundation (Weeks 1-4)
- User authentication (studios, judges, admins)
- Role-based access control (RBAC)
- Email notifications

### Phase 2: Studio & Dancer Management (Weeks 5-8)
- Studio profile creation and approval
- Dancer roster management with age calculations
- CSV bulk import

### Phase 3: Competition & Reservations (Weeks 9-12)
- Competition creation and configuration (CD)
- Reservation system with waivers and payments
- Entry creation (multi-step form) with categories/levels
- Music upload with naming validation
- **Missing**: Reservation Create UI (**Week 12**)

### Phase 4: Scheduling & Scoring (Weeks 13-15)
- **Week 13**: Schedule generation with entry numbering (100+)
- **Week 13**: Late entry suffix logic (156a, 156b)
- **Week 13**: Conflict detection (**Logic TBD**)
- **Week 14**: Real-time scoring system with judge sliders
- **Week 14**: Auto-categorization into award levels (Platinum, Gold, Silver)
- **Week 14**: Live scoreboard with WebSocket updates
- **Week 14**: PDF/CSV exports (schedules, score sheets, results)
- **Week 15**: Admin dashboard with financial reconciliation

### Phase 5: Production & Testing (Weeks 16-17)
- API testing infrastructure
- Security penetration tests
- Performance testing (real-time scoring load)
- Deployment and monitoring

---

## 11. Open Questions & Future Specifications

**To Be Defined Later** (marked in roadmap):

1. **Schedule Generation Algorithm Logic**:
   - Exact conflict detection rules (quick-change buffer time?)
   - Session length optimization
   - Break/lunch scheduling logic
   - Venue-specific constraints (multi-stage competitions?)

2. **Conflict Detection Rules**:
   - Minimum time between same-dancer entries (5 min? 10 min?)
   - Studio-requested blackout periods
   - Prop-heavy entries spacing

3. **Judge Assignment Logic**:
   - How are judges assigned to specific sessions/categories?
   - Rotation rules to ensure fairness?

4. **Audio Critique Recording**:
   - Real-time or post-performance?
   - Storage and delivery mechanism?
   - Integration with scoring interface?

5. **Advanced Scoring Features**:
   - Deductions for time violations, costume issues, prop failures?
   - Bonus points for difficulty, innovation?
   - Multi-panel scoring (preliminary vs. finals)?

6. **Nationals Qualification**:
   - Automatic vs. manual qualification?
   - Score thresholds for nationals eligibility?

---

## Document Change Log

| Date | Author | Changes |
|------|--------|---------|
| 2025-10-03 | Claude Code | Initial creation based on industry standards + user requirements |

---

**Next Steps**:
1. Use this document as reference for feature development
2. Update open questions as specifications are finalized
3. Validate with competition directors and studio owners for accuracy
4. Revise as new industry standards or requirements emerge
