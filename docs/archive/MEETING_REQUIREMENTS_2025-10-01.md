# CompPortal Meeting Requirements - October 1, 2025
## Detailed Feature Requirements from Stakeholder Discussion

**Meeting Attendees**: Daniel, Emily, Mike
**Date**: October 1, 2025
**Purpose**: Define complete MVP and future phase requirements

---

## Executive Summary

This document captures comprehensive product requirements from stakeholder meeting. Key insights:
- **Bootstrap MVP**: Manual workflows acceptable (e-transfer payments, manual approvals)
- **Year 1 Goal**: Replace current system with basic automation
- **Year 2+**: Add Stripe payments, advanced automation
- **Scale**: ~60 studios, 600-800 entries per competition weekend, ~8 events per year
- **Multi-Brand**: Support both GLOW and EMPWR competitions with shared codebase

---

## Phase 1: Core Registration System (Bootstrap MVP)

### 1.1 Account & Authentication

#### Studio Director Self-Registration
**Priority**: P0 (Critical)
**Status**: Not Started

**Requirements**:
- Open registration system (anyone can create account)
- Studio Director email as primary identifier
- Password setup and authentication
- Email verification flow
- Studio profile completion after registration

**Acceptance Criteria**:
- [ ] Director can create account without admin intervention
- [ ] Email verification required before full access
- [ ] Password requirements enforced (security standards)
- [ ] Profile wizard guides through initial setup

**Technical Notes**:
- NextAuth.js v5 for authentication
- Supabase auth integration
- Email verification via Resend
- Session management with JWT

---

### 1.2 Reservation/Entry Allocation System

#### Studio Capacity Reservations
**Priority**: P0 (Critical)
**Status**: Not Started

**Requirements**:
- Studios create "reservation" for X number of entries
- Reservation tied to specific competition location
- Manual approval workflow for competition directors
- Prevents studios from exceeding allocated slots
- System tracks: reserved slots vs. actual entries vs. total capacity
- Directors can modify allocations post-approval
- Alert system for allocation violations

**Acceptance Criteria**:
- [ ] Studio can request reservation (e.g., "50 entries for Toronto Regional")
- [ ] Request goes to director queue for approval/rejection
- [ ] System blocks entry submission exceeding reservation
- [ ] Directors see pending reservations dashboard
- [ ] Alerts when studio approaches allocation limit
- [ ] Directors can adjust allocations on-the-fly

**Business Rules**:
- Reservation ≠ commitment (studio may not fill all slots)
- Unfulfilled reservations release slots back to pool
- Last-minute allocation adjustments allowed
- Competition-wide capacity tracking (e.g., 600 entry max)

**Technical Notes**:
- Database triggers for capacity checks
- Real-time allocation tracking
- Email notifications for approvals/rejections
- Admin dashboard for reservation management

---

### 1.3 Dancer Database Management

#### Bulk Dancer Import
**Priority**: P0 (Critical)
**Status**: Partially Complete (UI exists, backend needed)

**Requirements**:
- CSV/Excel import capability
- Individual dancer entry forms (manual add)
- Dancer records include:
  - Full name
  - Birthdate
  - Auto-calculated age (based on birthdate)
- Dancers persist across routines/competitions
- Edit/update dancer information
- Search/filter dancer list

**Acceptance Criteria**:
- [ ] Upload CSV with dancer data
- [ ] System validates CSV format
- [ ] Age auto-calculates from birthdate
- [ ] Dancers available for routine assignment
- [ ] Can edit dancer info at any time
- [ ] Bulk operations (edit, delete)

**CSV Format Example**:
```csv
FirstName,LastName,Birthdate
Emma,Sullivan,2011-08-15
Maya,Singh,2009-12-03
```

**Technical Notes**:
- Papa Parse for CSV processing
- Age calculation utility function
- Dancer-Studio relational model
- Bulk import API endpoint

---

### 1.4 Routine Registration

#### Routine Creation & Management
**Priority**: P0 (Critical)
**Status**: Partially Complete (UI exists, backend needed)

**Requirements**:
- Routine metadata fields:
  - Title
  - Length/duration (minutes:seconds)
  - Props (yes/no or description)
  - Performers (link to dancer database)
  - Genre/category
  - Age division
- Register routines across multiple events
- Update routine info before finalization
- "Complete" or "Finalize" button to lock registration
- Link routine to reservation/allocation

**Acceptance Criteria**:
- [ ] Create routine with all metadata
- [ ] Assign dancers from studio's dancer list
- [ ] Multiple dancers per routine (solos, duets, groups)
- [ ] Save as draft (editable)
- [ ] Finalize routine (locks most fields)
- [ ] View all routines for studio
- [ ] Edit routine until deadline

**Business Rules**:
- Must have active reservation before creating routines
- Cannot exceed reserved allocation
- Finalized routines locked closer to competition date
- Directors can unlock routines if needed

**Technical Notes**:
- Routine-Dancer many-to-many relationship
- Validation against reservation capacity
- Draft vs. finalized status workflow
- Routine CRUD API

---

### 1.5 Invoice Generation (Manual Payment)

#### Auto-Generated Invoices
**Priority**: P0 (Critical - Year 1)
**Status**: Not Started

**Requirements**:
- Auto-generate invoice based on registered entries
- Invoice sent to competition director first (not studio)
- Directors can apply manual adjustments:
  - Early bird discounts
  - Special pricing
  - Custom line items
  - Percentage or fixed amount discounts
- Directors manually send invoice to studio (email)
- Studios pay via e-transfer (manual process Year 1)
- Directors manually mark invoices as paid
- Discount code system (future - nice to have)

**Acceptance Criteria**:
- [ ] Invoice auto-generates when routines finalized
- [ ] Base pricing calculated from entry count
- [ ] Director dashboard shows all invoices
- [ ] Director can adjust pricing before sending
- [ ] Invoice includes itemized breakdown
- [ ] Mark invoice as sent/paid
- [ ] Track payment status per studio

**Invoice Fields**:
- Studio name
- Contact information
- List of routines (title, category, performers)
- Entry fees (per routine or bundled)
- Subtotal
- Discounts applied
- Total due
- Payment instructions
- Due date

**Business Rules**:
- Year 1: Manual e-transfer payments only
- Year 2: Stripe integration for online payments
- Multiple payment options (full/partial)
- Late fees configurable by competition

**Technical Notes**:
- Invoice PDF generation (Puppeteer)
- Email integration (Resend)
- Manual payment tracking (not automated)
- Discount calculation engine

---

## Phase 2: Admin Dashboard (Competition Directors)

### 2.1 Studio Management View

#### Director Overview Dashboard
**Priority**: P0 (Critical)
**Status**: Partially Complete (UI mockup exists)

**Requirements**:
- See all registered studios
- View each studio's summary:
  - Number of routines reserved
  - Number of routines actually registered
  - Number of slots remaining
  - Payment status (paid/pending/overdue)
- Approve/reject reservations
- Modify studio allocations
- Contact studios (email integration)
- Export studio list

**Acceptance Criteria**:
- [ ] Dashboard shows all studios
- [ ] Filter/search studios
- [ ] View studio detail page
- [ ] See all studio's routines
- [ ] Approve reservation with one click
- [ ] Adjust allocation inline
- [ ] Send email to studio
- [ ] Export studio report (CSV)

**Dashboard Metrics**:
- Total studios registered
- Total reservations pending
- Total entries submitted
- Total capacity remaining
- Payment collection rate

**Technical Notes**:
- Real-time data updates
- Role-based access (admin only)
- Bulk operations support
- Audit log for changes

---

### 2.2 Capacity Management

#### Competition Capacity Tracking
**Priority**: P0 (Critical)
**Status**: Not Started

**Requirements**:
- Set total competition capacity (e.g., 600 entries max)
- Real-time tracking of:
  - Total slots reserved
  - Total slots confirmed/registered
  - Available slots remaining
- Alert when approaching capacity
- Track unfulfilled reservations (slots released back)
- Per-session capacity tracking (morning/afternoon/evening)
- Override capacity for special cases

**Acceptance Criteria**:
- [ ] Set competition max capacity
- [ ] Dashboard shows capacity utilization
- [ ] Alert at 90% capacity
- [ ] Show which studios haven't filled reservations
- [ ] Release unfulfilled slots before deadline
- [ ] Visual capacity meter (progress bar)

**Business Rules**:
- Capacity limits enforced at reservation approval
- Can overbook by small margin (director discretion)
- Unfulfilled reservations auto-release 2 weeks before event
- Per-session capacity separate from total

**Technical Notes**:
- Database constraints for capacity
- Real-time capacity calculation
- Alert system (email/dashboard)
- Reservation expiration logic

---

### 2.3 Multi-Competition Management

#### Manage Multiple Events
**Priority**: P1 (High)
**Status**: Not Started

**Requirements**:
- Separate instances for GLOW and EMPWR
- Dashboard shows: competition name, location, date
- Manage ~8 events per year
- Easy to "reskin" for different competitions:
  - Different branding/colors
  - Custom category names (Silver → Glow)
  - Different age divisions
  - Different pricing structures
- Switch between competitions in UI
- Copy settings from previous competition

**Acceptance Criteria**:
- [ ] Create new competition
- [ ] Set competition details (name, date, venue)
- [ ] Apply branding theme
- [ ] Configure categories and divisions
- [ ] Clone from previous competition
- [ ] Switch active competition in UI
- [ ] View archived competitions

**Architecture Requirements**:
- Multi-tenant data model
- Competition-scoped data (studios register per-competition)
- Shared backend/codebase
- Competition-specific URLs:
  - `competition.com/glow`
  - `competition.com/empwr`

**Technical Notes**:
- Competition context provider (React)
- Route-based competition selection
- Database schema: competition_id foreign key
- Theme system for branding

---

## Phase 3: Scheduling System

### 3.1 Conflict Detection Logic

#### Schedule Conflict Prevention
**Priority**: P1 (High)
**Status**: Not Started

**Requirements**:
- Detect if same dancer in multiple routines too close together
- Calculate costume change time requirements:
  - "This kid is in a routine four numbers before"
  - "Doesn't have enough time to change"
- Flag scheduling conflicts before schedule finalized
- Suggest resolution (move routine, adjust time)
- Consider backstage logistics (prop setup time)

**Acceptance Criteria**:
- [ ] System checks dancer conflicts during schedule generation
- [ ] Minimum time between routines configurable (e.g., 15 minutes)
- [ ] Flag conflicts in dashboard
- [ ] Show which dancers have conflicts
- [ ] Suggest alternate time slots
- [ ] Manual override for unavoidable conflicts

**Conflict Rules**:
- Minimum 10-15 minutes between routines for same dancer
- Longer time for significant costume changes
- Account for prop setup/removal time
- Consider stage vs. backstage transitions

**Technical Notes**:
- Graph-based conflict detection algorithm
- Constraint satisfaction problem (CSP)
- Dancer-routine mapping
- Time slot optimization

---

### 3.2 Schedule Generation

#### Auto-Generate Competition Schedule
**Priority**: P1 (High)
**Status**: Not Started

**Requirements**:
- Auto-generate competition schedule
- Assign specific times to each routine (e.g., "2:57 PM", "3:02 PM")
- Account for:
  - Routine duration
  - Transition time between routines
  - Breaks (meals, awards)
  - Session boundaries (morning/afternoon/evening)
- Output schedule by:
  - Studio (each studio gets their schedule)
  - Time slot (master schedule)
  - Dancer (show all routines per dancer)
- Manual adjustments after generation
- Re-generate if changes made

**Acceptance Criteria**:
- [ ] Generate schedule from all registered routines
- [ ] Assign realistic time slots
- [ ] Detect conflicts automatically
- [ ] Export schedules in multiple formats
- [ ] Allow manual time adjustments
- [ ] Lock schedule once finalized

**Scheduling Algorithm Considerations**:
- Optimize for minimal conflicts
- Balance session lengths
- Group routines by category (optional)
- Prioritize younger dancers earlier in day
- Respect studio preferences (if provided)

**Technical Notes**:
- Scheduling algorithm (genetic algorithm or constraint-based)
- Background job for generation (long-running)
- WebSocket updates for progress
- Schedule versioning (track changes)

---

### 3.3 Schedule Reports

#### Downloadable Schedule Formats
**Priority**: P1 (High)
**Status**: Not Started

**Requirements**:
- Downloadable studio schedules (PDF)
- Printable master schedules
- Individual routine times
- Available well before competition day
- Multiple format options:
  - PDF (print-friendly)
  - CSV (spreadsheet)
  - iCal (calendar import)
- Email schedules to studios automatically

**Acceptance Criteria**:
- [ ] Generate studio-specific PDF schedule
- [ ] Generate master schedule PDF
- [ ] Generate per-dancer schedules
- [ ] Email schedules to all studios
- [ ] Download individual schedule
- [ ] Schedules include venue details

**Schedule Format Requirements**:
- Professional layout
- Clear typography
- Competition branding
- Contact information
- Venue map/directions

**Technical Notes**:
- Puppeteer for PDF generation
- Email batch sending
- Schedule template design
- Background job for email distribution

---

## Phase 4: Music Management System

### 4.1 Music Upload Portal

#### Studio Music Submission
**Priority**: P1 (High)
**Status**: Not Started

**Requirements**:
- Studios upload MP3 files for each routine
- Link music file to specific routine
- Deadline tracking for music submission
- Alert system for missing music:
  - "Studio X still missing 10 numbers"
  - Directors can contact studios about missing files
- Music validation:
  - File format (MP3 only)
  - File size limits
  - Duration matches routine length (warning)
- Replace/update music before deadline

**Acceptance Criteria**:
- [ ] Upload music file per routine
- [ ] Display upload progress
- [ ] Validate file format and size
- [ ] Show uploaded music list
- [ ] Replace music file
- [ ] Deadline countdown display
- [ ] Email reminders for missing music

**Business Rules**:
- Music deadline typically 1-2 weeks before competition
- Late music subject to penalty/rejection
- Directors can grant exceptions
- Music auto-linked to schedule

**Technical Notes**:
- File upload to Supabase Storage or S3
- Max file size: 50MB per file
- Audio duration detection (metadata)
- Routine-music relationship (one-to-one)

---

### 4.2 Playlist Generation

#### Master Competition Playlist
**Priority**: P1 (High)
**Status**: Not Started

**Requirements**:
- Combine all music files into single playlist
- Ordered by schedule/performance order
- One master file/playlist sent to backstage music person
- Backstage person plays from consolidated playlist
- Option to download individual files
- Playlist includes metadata:
  - Routine title
  - Studio name
  - Scheduled time
  - Performers

**Acceptance Criteria**:
- [ ] Generate playlist in schedule order
- [ ] Export as M3U or similar playlist format
- [ ] Download all music files as ZIP
- [ ] Playlist accessible to music coordinator
- [ ] Include cue sheet (PDF) with playlist

**Playlist Format Options**:
- M3U playlist file
- ZIP archive with numbered files (01_StudioName_RoutineTitle.mp3)
- Streaming playlist (Spotify-like interface)

**Technical Notes**:
- File concatenation or playlist generation
- Metadata embedding in playlist
- Role-based access (music coordinator only)
- Backup playlist generation

---

### 4.3 Music Coordinator View

#### Track Music Submissions
**Priority**: P2 (Medium)
**Status**: Not Started

**Requirements**:
- See all uploaded music
- Track which routines missing music
- Easy identification of incomplete submissions
- Contact studios with missing music
- View music deadline status
- Export music status report

**Acceptance Criteria**:
- [ ] Dashboard shows music upload status
- [ ] Filter by: uploaded, missing, overdue
- [ ] View per-studio music status
- [ ] Send bulk reminder emails
- [ ] Download music status CSV

**Technical Notes**:
- Music status tracking
- Email notification system
- Dashboard with filters
- Export functionality

---

## Phase 5: Tabulation System

### 5.1 Judge Interface

#### Tablet-Based Scoring
**Priority**: P1 (High)
**Status**: Not Started

**Requirements**:
- Tablet-based scoring (web interface, not native app)
- Each judge has individual login/tablet
- Interface includes:
  - Sliders for scoring
  - Input fields for numeric scores
  - Comment fields (optional)
  - Current routine information display
- Submit/enter button to save scores
- Must work with standard tablets (no special hardware)
- Works on iOS and Android tablets
- Offline mode (save locally, sync when online)

**Acceptance Criteria**:
- [ ] Judge login on tablet
- [ ] See current routine to judge
- [ ] Enter scores via sliders or numeric input
- [ ] Add comments
- [ ] Submit scores to database
- [ ] Confirmation message on submit
- [ ] Navigate to next routine

**Judge Scoring Interface**:
- Large touch-friendly controls
- Clear routine information
- Score validation (prevent invalid entries)
- Visual feedback on submission
- Undo last submission (if needed)

**Technical Notes**:
- Progressive Web App (PWA)
- Touch-optimized UI
- Offline-first architecture (IndexedDB)
- Sync queue for scores
- Judge authentication

---

### 5.2 Live Score Sync

#### Real-Time Score Aggregation
**Priority**: P1 (High)
**Status**: Not Started

**Requirements**:
- Real-time sync to central database
- Requires internet connectivity at venue
- All judges' scores sync simultaneously
- Database aggregates scores in real-time
- Calculate standings as scores come in
- Display live leaderboard (optional)

**Acceptance Criteria**:
- [ ] Scores sync within seconds of submission
- [ ] Handle temporary network interruptions
- [ ] Aggregate scores from all judges
- [ ] Calculate average/total scores
- [ ] Update standings automatically
- [ ] Conflict resolution (duplicate submissions)

**Sync Architecture**:
- WebSocket connection for real-time updates
- Fallback to polling if WebSocket fails
- Queue system for failed uploads
- Retry logic with exponential backoff

**Technical Notes**:
- Supabase real-time subscriptions
- Score aggregation triggers
- Standings calculation algorithm
- Optimistic UI updates

---

### 5.3 Scoring Data Management

#### Store & Review Scores
**Priority**: P1 (High)
**Status**: Not Started

**Requirements**:
- Store all judge scores
- Track which routines scored
- Allow score viewing/review
- Generate standings/rankings
- Detect scoring anomalies
- Audit trail for score changes
- Export scores for archival

**Acceptance Criteria**:
- [ ] All scores stored in database
- [ ] View scores by routine
- [ ] View scores by judge
- [ ] Detect outlier scores
- [ ] Generate final rankings
- [ ] Export scores (CSV)

**Business Rules**:
- Scores immutable after submission (or change-tracked)
- Directors can review scores
- Judges cannot see other judges' scores
- Final standings calculated after all scores in

**Technical Notes**:
- Score versioning (if edits allowed)
- Anomaly detection algorithm
- Ranking calculation rules
- Database indexes for performance

---

## Phase 6: Report Generation & Printouts

### 6.1 Competition Day Reports

#### Real-Time Reports & Printouts
**Priority**: P1 (High)
**Status**: Not Started

**Requirements**:
- Real-time standings
- Award placement reports
- Score sheets
- Rankings by category/age group
- Printable formats for physical distribution
- Updated as scores come in
- Export for digital distribution

**Acceptance Criteria**:
- [ ] Generate standings report (PDF)
- [ ] Generate award certificates (PDF)
- [ ] Generate score sheets (PDF)
- [ ] Filter by category, age, studio
- [ ] Print-friendly formatting
- [ ] Real-time updates

**Report Types**:
- Overall standings
- Category placements
- Studio summaries
- Award lists
- Judge scorecards

**Technical Notes**:
- PDF generation (Puppeteer)
- Real-time data updates
- Template-based reports
- Print CSS optimization

---

### 6.2 Studio Reports

#### Individual Studio Performance Summaries
**Priority**: P2 (Medium)
**Status**: Not Started

**Requirements**:
- Individual studio performance summaries
- Their routine placements
- Scores received
- Awards won
- Email to studio after competition
- Downloadable from portal

**Acceptance Criteria**:
- [ ] Generate per-studio report
- [ ] Include all routine results
- [ ] Show scores and placements
- [ ] Email report to studio
- [ ] Studio can download from portal

**Technical Notes**:
- Report template per studio
- Email distribution system
- PDF generation
- Portal download access

---

## Phase 7: Email Notification System

### 7.1 Automated Emails

#### Competition Communication
**Priority**: P1 (High)
**Status**: Not Started

**Requirements**:
- Registration confirmation
- Reservation approval/rejection
- Invoice notifications
- Schedule availability alerts
- Missing music reminders
- General competition updates
- Post-competition results

**Acceptance Criteria**:
- [ ] Automated email on key events
- [ ] Template-based emails
- [ ] Personalized content
- [ ] Bulk email capability
- [ ] Email delivery tracking
- [ ] Unsubscribe management

**Email Triggers**:
- Account created
- Reservation submitted
- Reservation approved/rejected
- Invoice generated
- Schedule published
- Music deadline approaching
- Music missing (reminders)
- Competition day reminders
- Results available

**Technical Notes**:
- Resend for email delivery
- Email templates (React Email)
- Background job queue
- Delivery status tracking
- Bounce/complaint handling

---

## Phase 8: Multi-Competition Architecture

### 8.1 Instance Management

#### Separate Competition Portals
**Priority**: P1 (High)
**Status**: Not Started

**Requirements**:
- Separate portal URLs:
  - `competition.com/glow`
  - `competition.com/empwr`
- Each competition has independent:
  - Branding/colors
  - Event list
  - Studio registrations
  - Schedules
- Shared backend/codebase
- Easy to spin up new competition instance
- Data isolation between competitions

**Acceptance Criteria**:
- [ ] Route-based competition selection
- [ ] Competition-specific branding
- [ ] Isolated data per competition
- [ ] Shared admin panel (view all)
- [ ] Clone competition settings
- [ ] Archive old competitions

**Architecture Notes**:
- Multi-tenant database design
- Competition context throughout app
- Competition ID in all queries
- Route middleware for competition detection

**Technical Notes**:
- Next.js dynamic routes
- Competition-scoped queries
- Theme provider for branding
- Database: competition_id foreign key

---

### 8.2 Customization Capability

#### Per-Competition Configuration
**Priority**: P1 (High)
**Status**: Not Started

**Requirements**:
- Change category names (Silver → Glow, Double Silver → Double Glow)
- Update scoring parameters
- Modify age divisions
- Adjust pricing structures
- Different rules per competition type
- Custom branding (logo, colors, fonts)

**Acceptance Criteria**:
- [ ] Competition settings page
- [ ] Customize category names
- [ ] Configure age divisions
- [ ] Set pricing rules
- [ ] Upload custom logo
- [ ] Choose color palette
- [ ] Preview branding changes

**Configuration Options**:
- Categories (list with labels)
- Age divisions (ranges and labels)
- Pricing (per-entry, per-category, bulk discounts)
- Scoring rules (weighted categories, tiebreakers)
- Branding (logo, primary/secondary colors, fonts)

**Technical Notes**:
- Configuration JSON in database
- Dynamic category rendering
- Pricing calculation engine
- Theme system (CSS variables)
- Logo upload to storage

---

## Payment Integration (Year 2 / Phase 9)

### 9.1 Stripe Integration

#### Online Payment Processing
**Priority**: P3 (Low - Year 2)
**Status**: Not Started

**Requirements**:
- Online credit card processing
- Immediate payment capture
- Automatic payment confirmation
- Integration with invoice system
- Not required for Year 1 - manual e-transfer processing sufficient
- Stripe Checkout or custom integration
- Handle refunds and partial payments

**Acceptance Criteria** (Year 2):
- [ ] Stripe account setup
- [ ] Payment flow integration
- [ ] Automatic invoice marking as paid
- [ ] Email confirmation on payment
- [ ] Handle payment failures
- [ ] Refund processing
- [ ] Payment history tracking

**Payment Workflow**:
1. Invoice generated
2. Studio receives invoice with Stripe payment link
3. Studio pays via Stripe
4. System auto-confirms payment
5. Email confirmation sent

**Technical Notes** (Future):
- Stripe API integration
- Webhook handling for payment events
- PCI compliance (Stripe handles)
- Payment reconciliation
- Tax calculation (if needed)

---

## Future Considerations (Not in MVP)

### Media Delivery Portal
**Priority**: P4 (Future)
**Status**: Not in scope for bootstrap

**Requirements**:
- Birthdate verification for video access
- Download interface for photos/videos
- Automatic distribution links
- Not in scope for bootstrap - separate development
- Would integrate with external media vendor

**Notes**:
- Explicitly called out as separate project
- Not included in initial quoting
- Requires separate requirements gathering

---

### Convention Registration
**Priority**: P4 (Future)
**Status**: Not in scope for bootstrap

**Requirements**:
- Additional registration type beyond competitions
- Different workflow from routine registration
- Explicitly called out as future feature requiring separate quoting
- Workshop/class registration
- Attendee management

**Notes**:
- Different business model than competitions
- Separate requirements document needed
- Not included in MVP scope

---

## Technical Requirements Summary

### Browser/Device Compatibility
- Works on tablets (for judges) - iOS and Android
- Works on standard computers (studio directors) - Windows/Mac
- Mobile-friendly for on-the-go director access
- Modern web browsers (Chrome, Firefox, Safari, Edge)

### Data Scale
- ~60 studios total across all competitions
- Each studio: 10-100+ routines
- Multiple dancers per routine (1-20+ for groups)
- Need to handle 600-800 entries per competition weekend
- ~8 competitions per year

### Integration Points
- Consult with previous vendor (Michael Wolf) to understand edge cases
- Learn from existing system's pain points
- Avoid common "gotchas" from previous system
- Document lessons learned

### User Roles & Permissions

**Studio Director**:
- Register dancers
- Create routines
- View their schedules
- View invoices
- Upload music
- View results

**Competition Director (Admin)**:
- Approve reservations
- Manage capacity
- Generate schedules
- Access all data
- Adjust invoices
- Contact studios
- View reports

**Judge**:
- Score routines only
- No access to other data
- Cannot see other judges' scores

**Backstage/Music Person**:
- Access music playlist
- View schedule
- No other permissions

**General Public**:
- No access (closed system)
- Future: public results viewing (optional)

---

## Success Metrics

### Bootstrap MVP Success Criteria
- All 60 studios can register without issues
- Zero double-bookings or capacity overruns
- Schedule generation without conflicts
- All music files collected on time
- Judges can score without technical issues
- Final results generated accurately
- Directors save 20+ hours per competition vs. old system

### Year 1 Goals
- Replace legacy system completely
- 100% studio adoption
- 95%+ uptime during competition season
- Zero payment processing issues
- Positive feedback from directors and studios

### Year 2+ Goals
- Add online payment processing (Stripe)
- Advanced automation (auto-reminders, auto-scheduling)
- Mobile apps for judges (optional)
- Public results portal (optional)
- Convention registration module (separate project)

---

## Risk Assessment

### High-Risk Items
1. **Scheduling Algorithm Complexity**: 600-800 entries with conflict detection is non-trivial
2. **Music File Management**: Large file uploads and playlist generation at scale
3. **Judge Tablet Reliability**: Internet connectivity at venues, tablet compatibility
4. **Data Migration**: Moving from legacy system to new platform
5. **Competition Day Zero-Downtime**: System must work flawlessly on competition day

### Mitigation Strategies
1. **Scheduling**: Start with simple algorithm, iterate based on feedback
2. **Music**: Test with large file uploads early, have backup manual process
3. **Judges**: Build offline-first, extensive device testing, backup paper scorecards
4. **Migration**: Phased rollout, run parallel systems for one competition
5. **Competition Day**: Pre-competition system checks, on-call support, rollback plan

---

## Development Timeline Estimate

### Phase 1: Core Registration (8-10 weeks)
- Account creation
- Reservation system
- Dancer database
- Routine registration
- Invoice generation (manual)

### Phase 2: Admin Dashboard (4-6 weeks)
- Studio management view
- Capacity management
- Multi-competition support

### Phase 3: Scheduling (6-8 weeks)
- Conflict detection
- Schedule generation
- Schedule reports

### Phase 4: Music Management (4-6 weeks)
- Upload portal
- Playlist generation
- Music coordinator view

### Phase 5: Tabulation (6-8 weeks)
- Judge interface
- Live score sync
- Scoring data management

### Phase 6: Reports (3-4 weeks)
- Competition day reports
- Studio reports

### Phase 7: Email System (2-3 weeks)
- Automated emails
- Email templates

### Phase 8: Multi-Competition (2-3 weeks)
- Instance management
- Customization capability

**Total Estimated Timeline: 35-50 weeks (7-10 months) for full feature set**
**Bootstrap MVP (Phases 1-2): 12-16 weeks (3-4 months)**

---

## Next Steps

### Immediate Actions (This Week)
1. Review and approve this requirements document
2. Prioritize features for Bootstrap MVP
3. Confirm technical architecture decisions
4. Set up development environment
5. Create detailed user stories for Phase 1

### Short-Term (Next 2-4 Weeks)
1. Begin Phase 1 development
2. Set up Supabase production environment
3. Implement authentication system
4. Build reservation system
5. Weekly stakeholder demos

### Medium-Term (Next 3-6 Months)
1. Complete Bootstrap MVP (Phases 1-2)
2. User acceptance testing with pilot studios
3. Data migration from legacy system
4. Parallel system operation (new + old)
5. Full launch for next competition season

---

**Document Version**: 1.0
**Last Updated**: October 1, 2025
**Next Review**: After Phase 1 Sprint 1 (2 weeks)
**Maintained By**: Claude Code + Development Team
