# CompPortal MVP - Demo Script

**Target Duration**: 5-10 minutes
**Date Prepared**: October 4, 2025
**Production URL**: https://comp-portal-mb2rwp2w2-danman60s-projects.vercel.app
**Audience**: Stakeholders, potential users, launch presentation

---

## Pre-Recording Checklist

- [ ] Clear browser cache and cookies
- [ ] Close unnecessary tabs
- [ ] Set browser zoom to 100%
- [ ] Hide browser bookmarks bar (clean UI)
- [ ] Enable full-screen mode for recording
- [ ] Test microphone audio levels
- [ ] Prepare test credentials

### Test Credentials
- **Studio Director**: demo.studio@gmail.com
- **Competition Director**: demo.director@gmail.com
- **Production Database**: Contains sample data (1 dancer, 10 entries, 3 reservations)

---

## Introduction (30 seconds)

**Script**:
> "Welcome to CompPortal - a comprehensive dance competition management platform. I'm going to show you the three core workflows: how studio directors register and create routines, how competition directors approve reservations, and how judges score performances. Let's dive in."

**Screen**:
- Start at CompPortal homepage
- Show clean, professional UI

---

## Workflow 1: Studio Director - Reservation & Routine Creation (3-4 minutes)

### Scene 1: Dashboard Overview (20 seconds)

**Actions**:
1. Click "Studio Director" quick login button
2. Wait for dashboard to load

**Narration**:
> "As a studio director, I land on my dashboard where I can see all my dancers, routines, and space reservations at a glance. Currently I have 1 dancer, 10 routines, and 3 approved reservations."

**Key Points to Highlight**:
- Clean, card-based dashboard
- Real-time statistics
- Clear navigation menu

### Scene 2: View Existing Reservation (30 seconds)

**Actions**:
1. Click "My Reservations" in sidebar
2. Point out the approved reservation for "GLOW Dance - Orlando 2026"
3. Highlight the capacity indicator: "10 / 10 - 0 spaces remaining"

**Narration**:
> "I can see my approved reservation for GLOW Dance Orlando. Notice the green 'APPROVED' badge and the capacity tracker showing I've used 10 out of 10 confirmed spaces. This is the space limit enforcement in action."

**Key Points to Highlight**:
- ✅ Approved status (green badge)
- 📊 Space tracking (10/10 used, 100%)
- 🚨 Red warning when at capacity

### Scene 3: Routine List (40 seconds)

**Actions**:
1. Click "My Routines" in sidebar
2. Scroll through the list of 10 routines
3. Point out key details: category types, age groups, entry sizes
4. Show status badges (all "DRAFT")

**Narration**:
> "Here are all my registered routines. Each shows the routine title, category type like Jazz or Contemporary, age division, and entry size. These are currently in draft status but ready for the competition."

**Key Points to Highlight**:
- 7 category types available (Jazz, Contemporary, Ballet, etc.)
- Multiple age groups (Mini, Junior, Teen, Senior)
- Entry sizes (Solo, Duet/Trio, Small Group, Large Group, Production)
- Clear status indicators

### Scene 4: Create New Routine Attempt (Demo Space Limit) (60 seconds)

**Actions**:
1. Click "Create New Entry" button
2. Fill out Step 1 (Basic Info):
   - Competition: GLOW Dance - Orlando 2026
   - Reservation: Select the existing approved reservation
   - Routine Title: "Test Routine 11"
3. Click "Next"
4. **ERROR**: See space limit error message

**Narration**:
> "Let me try to create an 11th routine. I'll fill in the basic information and select my approved reservation... and when I click Next, the system prevents me from exceeding my confirmed space allocation. This backend validation ensures studios can't accidentally over-register beyond what they've paid for."

**Key Points to Highlight**:
- ✅ 5-step wizard (Basic, Details, Participants, Music, Review)
- 🚨 **SPACE LIMIT ENFORCEMENT** (primary security feature)
- Clear error message explaining why creation was blocked
- Backend validation protecting revenue

### Scene 5: View Existing Routine Details (40 seconds)

**Actions**:
1. Go back to "My Routines"
2. Click on one of the existing routines (e.g., "Entry #100")
3. Show the detailed view with all information
4. Point out participants, music, category details

**Narration**:
> "Let's look at one of my existing routines. You can see all the details - the dancers participating, the music track, performance time, and all the category information. Everything a competition director or judge would need to know."

**Key Points to Highlight**:
- Complete routine details
- Participant tracking
- Music management
- Clean, organized layout

---

## Workflow 2: Competition Director - Approval & Management (2 minutes)

### Scene 1: Switch to Competition Director (15 seconds)

**Actions**:
1. Log out from Studio Director account
2. Click "Competition Director" quick login button
3. Wait for dashboard to load

**Narration**:
> "Now let's switch perspectives. As a competition director, I have a different view with the ability to see all studios and manage reservations."

### Scene 2: View All Reservations (45 seconds)

**Actions**:
1. Click "Reservations" in sidebar
2. Show the list of all reservations from all studios
3. Point out different statuses (Approved, Pending)
4. Highlight capacity tracking for each

**Narration**:
> "Competition directors can see all reservation requests from all studios. Each shows the requested space count, current usage, and approval status. I can quickly see which studios are at capacity and which still have room."

**Key Points to Highlight**:
- Cross-studio visibility
- Approval workflow (green = approved, yellow = pending)
- Capacity tracking per reservation
- Bulk management capability

### Scene 3: View All Entries (60 seconds)

**Actions**:
1. Click "All Entries" in sidebar
2. Show the comprehensive list
3. Point out filtering/sorting capabilities
4. Show entry details for one routine

**Narration**:
> "I can see all registered routines across all studios. This gives me the complete picture of the competition - which categories are most popular, age group distributions, and overall registration numbers. This data helps with scheduling and planning."

**Key Points to Highlight**:
- Cross-studio entry visibility
- Comprehensive competition overview
- Detailed entry information
- Ready for scheduling integration (future feature)

---

## Workflow 3: Judge - Scoring Interface (2 minutes)

### Scene 1: Access Judge Interface (20 seconds)

**Actions**:
1. Navigate to /judge/scoring
2. Select competition: "GLOW Dance - Orlando 2026"
3. Select judge profile
4. Wait for scoring interface to load

**Narration**:
> "Now let's see the judge scoring interface. Judges select the competition they're assigned to, choose their judge profile, and they're ready to score."

### Scene 2: Score a Routine (60 seconds)

**Actions**:
1. Show the current routine (#100) with all details
2. Point out the three scoring sliders:
   - Technical (0-100)
   - Artistic (0-100)
   - Performance (0-100)
3. Adjust each slider to demonstrate
4. Scroll down to show special awards section
5. Select one special award (e.g., "Judge's Choice")
6. Add optional comments
7. Click "Submit Score" (or show the button without clicking)

**Narration**:
> "The scoring interface is designed for tablets and quick input. Judges use three sliders to rate technical execution, artistic expression, and performance quality. They can also award special recognitions like Judge's Choice or Best Costume. The interface shows entry number, current position in the queue, and quick navigation."

**Key Points to Highlight**:
- ✅ Tablet-optimized design
- Three score categories with 0-100 range
- Six special award types
- Optional judge comments
- Entry navigation (#100 of 19)
- Quick jump controls

### Scene 3: Score Review (40 seconds)

**Actions**:
1. Click "Score Review" tab
2. Show list of previously scored routines
3. Point out the ability to review and edit scores
4. Show score details for one entry

**Narration**:
> "Judges can review all their submitted scores, make corrections if needed, and see their scoring history. This ensures accuracy and allows for adjustments before scores are finalized."

**Key Points to Highlight**:
- Score review capability
- Edit functionality
- Scoring history
- Quality control

---

## Conclusion & Next Steps (30 seconds)

**Actions**:
1. Return to homepage or dashboard
2. Show the clean, modern UI one final time

**Narration**:
> "That's CompPortal - a complete solution for dance competition management. We've shown studio registration with space limit enforcement, competition director oversight, and judge scoring. The platform is production-ready with comprehensive security hardening, performance optimization, and 100% of core MVP features functional. Ready for launch on October 7th, 2025."

**Key Points to Highlight**:
- ✅ All core workflows functional
- ✅ Production-tested and verified
- ✅ Security hardened (2 critical bugs fixed)
- ✅ Performance optimized (0.110ms query times)
- 🚀 Launch-ready

---

## Post-Recording Notes

### Editing Checklist
- [ ] Add title card with "CompPortal MVP Demo"
- [ ] Add timestamps/chapters for each workflow
- [ ] Highlight cursor for visibility
- [ ] Add zoom-in effects for key UI elements
- [ ] Add text overlays for critical features:
  - "Space Limit Enforcement" during error scene
  - "Real-time Capacity Tracking"
  - "Tablet-Optimized Scoring"
- [ ] Add background music (subtle, professional)
- [ ] Include call-to-action at end

### Key Messages to Emphasize
1. **Space Limit Enforcement** - Primary security feature preventing over-registration
2. **Role-Based Access** - Three distinct user perspectives
3. **Production Ready** - All features tested and functional
4. **Modern UI/UX** - Clean, professional, responsive design

### Screenshots Needed (for presentation deck)
1. Dashboard (Studio Director view)
2. Reservation list with capacity tracking
3. Space limit error message (CRITICAL)
4. Routine creation wizard
5. Judge scoring interface
6. Competition Director overview

---

## Troubleshooting During Recording

**If dashboard shows 0 data**:
- Refresh page
- Check browser console for API errors
- Verify using correct production URL

**If login fails**:
- Use quick login buttons (not manual email entry)
- Clear browser cache if needed
- Verify credentials match test accounts

**If entries don't load**:
- Wait 2-3 seconds for API calls
- Check network tab for failed requests
- Ensure stable internet connection

---

**Recording Ready**: ✅ Production deployment verified functional
**Estimated Total Time**: 8-9 minutes
**Recommended Recording**: 2-3 takes to ensure smooth delivery
**Video Format**: 1920x1080 (Full HD), 30fps
**Export Format**: MP4 (H.264 codec)

---

*This script ensures a comprehensive, professional demo showcasing all core MVP features and the critical space limit enforcement that was hardened during production testing.*
