# CompPortal Documentation Index

**Last Updated**: October 2025
**Purpose**: Central index for all project documentation

---

## 📂 Project Structure

```
CompPortal/
├── 📄 Active Documentation (Root Level)
│   ├── PROJECT_STATUS.md              # Current project state, recent commits, next priorities
│   ├── BUGS_AND_FEATURES.md           # Consolidated bug/feature tracker
│   ├── USER_TESTING_NOTES.md          # Latest user testing feedback
│   ├── FIXES_AND_ENHANCEMENTS.md      # Previous implementation plan
│   ├── README.md                      # Project overview
│   ├── QUICKSTART.md                  # Quick setup guide
│   └── TEST_CREDENTIALS.md            # Test user credentials
│
├── 📁 docs/journeys/                   # User journey documentation
│   ├── studio_director_journey.md     # Studio Director workflow
│   ├── competition_director_journey.md # Competition Director workflow
│   ├── glowdance_user_journey.md      # Original GlowDance journey
│   └── JUDGE_USER_JOURNEY.md          # Judge workflow
│
├── 📁 docs/testing/                    # Testing reports & test documentation
│   ├── E2E_PRODUCTION_TEST_REPORT.md
│   ├── E2E_REGISTRATION_SUITE_REPORT.md
│   ├── FINAL_TESTING_REPORT.md
│   ├── GOLDEN_TEST_SUITE_REPORT.md
│   ├── GOLDEN_TEST_DEBUG_LIST.md
│   ├── TESTING_CYCLE_2_REPORT.md
│   ├── PRODUCTION_TESTING_REPORT.md
│   ├── MVP_HARDENING_REPORT.md
│   ├── TEST_RESULTS.md
│   └── GOLDEN_TESTS.md
│
├── 📁 docs/sessions/                   # Session summaries & handoffs
│   ├── SESSION_SUMMARY_2025-10-03.md
│   ├── SESSION_SUMMARY_2025-10-05.md
│   ├── SESSION_SUMMARY_2025-10-05_StudioApproval.md
│   └── SESSION_HANDOFF.md
│
├── 📁 docs/planning/                   # Planning & implementation docs
│   ├── NEXT_SESSION.md
│   ├── NEXT_SESSION_PLAN.md
│   ├── NEXT_SESSION_INSTRUCTIONS.md
│   ├── PRODUCTION_ROADMAP.md
│   ├── MVP_READINESS_CHECKLIST.md
│   ├── ENTRY_NUMBERING_IMPLEMENTATION.md
│   └── SYSTEM_HARDENING.md
│
├── 📁 docs/reference/                  # Technical reference & setup
│   ├── VERCEL_SETUP.md
│   ├── START_HERE.md
│   ├── QUICK_REFERENCE.md
│   ├── LEAN_SESSION_GUIDE.md
│   ├── ICON_ASSETS.md
│   ├── REBUILD_BLUEPRINT.md
│   └── EXPORT_ANALYSIS.md
│
├── 📁 docs/stakeholder/                # Business & stakeholder docs
│   ├── DEMO_SCRIPT.md
│   ├── STAKEHOLDER_PRESENTATION.md
│   ├── DCG_COMPETITIVE_ANALYSIS.md
│   └── COMPETITION_WORKFLOW.md
│
└── 📁 docs/archive/                    # Archived/historical documentation
    ├── AUTONOMOUS_AGENT_INSTRUCTIONS.md
    ├── BLOCKERS.md
    ├── DEMO_TEST_REPORT.md
    ├── DOCKER_DEPLOYMENT.md
    ├── enhanced-integration-report.md
    ├── final-integration-report.md
    ├── INSTRUCTIONS_FOR_NEXT_CLAUDE.md
    ├── integration-test-report.md
    ├── INTEGRATION_ALIGNMENT_REPORT.md
    ├── MEETING_REQUIREMENTS_2025-10-01.md
    ├── MVP_CONVERSION_PLAN.md
    ├── MVP_REGISTRATION_SUITE_STATUS.md
    ├── MVP_REGISTRATION_TEST_RESULTS.md
    ├── NEW_FEATURES_COMPARISON.md
    ├── NEXT_SESSION_RESUME.md
    ├── PROGRESS_LOG.md
    ├── SCHEMA_DEPLOYMENT_INSTRUCTIONS.md
    ├── SESSION_LOG_2025-10-01.md
    ├── SESSION_LOG_2025-10-02.md
    └── SESSION_LOG_2025-10-04.md
```

---

## 🎯 Quick Navigation

### Starting a New Session
1. **PROJECT_STATUS.md** - Current state, next priorities
2. **BUGS_AND_FEATURES.md** - Active bug/feature tracker
3. **git log -3** - Last 3 commits

### User Testing Feedback
1. **USER_TESTING_NOTES.md** - Latest feedback (detailed breakdown)
2. **BUGS_AND_FEATURES.md** - Consolidated priority list
3. **FIXES_AND_ENHANCEMENTS.md** - Previous implementation plan

### Understanding User Workflows
- **docs/journeys/studio_director_journey.md**
- **docs/journeys/competition_director_journey.md**
- **docs/journeys/JUDGE_USER_JOURNEY.md**

### Testing & Quality Assurance
- **docs/testing/FINAL_TESTING_REPORT.md** - Comprehensive test results
- **docs/testing/GOLDEN_TEST_SUITE_REPORT.md** - Golden test suite
- **TEST_CREDENTIALS.md** - Test user accounts

### Technical Setup
- **QUICKSTART.md** - Quick setup guide
- **README.md** - Project overview
- **docs/reference/VERCEL_SETUP.md** - Deployment setup
- **docs/reference/QUICK_REFERENCE.md** - Quick technical reference

### Planning & Roadmap
- **docs/planning/PRODUCTION_ROADMAP.md** - Production roadmap
- **docs/planning/MVP_READINESS_CHECKLIST.md** - MVP checklist
- **docs/stakeholder/DEMO_SCRIPT.md** - Demo script

### Session History
- **docs/sessions/** - Session summaries by date
- **docs/archive/SESSION_LOG_*.md** - Detailed session logs

---

## 📋 File Purposes

### Active Documentation

#### PROJECT_STATUS.md
- **Purpose**: Single source of truth for project state
- **Contains**: Current phase, recent commits, next priorities, test results
- **Update**: After every major commit or milestone

#### BUGS_AND_FEATURES.md
- **Purpose**: Consolidated bug and feature tracker
- **Contains**: Prioritized lists, cross-references to other docs
- **Update**: When new bugs/features identified

#### USER_TESTING_NOTES.md
- **Purpose**: User testing feedback from latest session
- **Contains**: Detailed feedback by user role, priority rankings
- **Update**: After user testing sessions

#### FIXES_AND_ENHANCEMENTS.md
- **Purpose**: Previous comprehensive implementation plan
- **Contains**: Detailed technical implementation notes
- **Status**: Reference for overlapping work with USER_TESTING_NOTES.md

#### README.md
- **Purpose**: Project overview for new developers
- **Contains**: Tech stack, setup instructions, key features
- **Update**: When major features added

#### QUICKSTART.md
- **Purpose**: Fast-track setup for developers
- **Contains**: Installation, database setup, deployment steps
- **Update**: When setup process changes

#### TEST_CREDENTIALS.md
- **Purpose**: Test user accounts for different roles
- **Contains**: Email/password for SD, CD, Judge accounts
- **Security**: Not committed to public repos

### Organized Documentation

#### docs/journeys/
- **Purpose**: Document user workflows by role
- **Use**: Understand business requirements, design UX
- **Update**: When user workflows change

#### docs/testing/
- **Purpose**: Testing reports and test documentation
- **Use**: Verify features work, track testing coverage
- **Update**: After testing cycles

#### docs/sessions/
- **Purpose**: Session summaries and handoffs
- **Use**: Understand recent work, resume context
- **Update**: End of each session

#### docs/planning/
- **Purpose**: Planning documents and roadmaps
- **Use**: Understand future direction, plan sprints
- **Update**: When priorities shift

#### docs/reference/
- **Purpose**: Technical reference and setup guides
- **Use**: Look up technical details, setup procedures
- **Update**: When technical implementation changes

#### docs/stakeholder/
- **Purpose**: Business-facing documentation
- **Use**: Demo scripts, presentations, competitive analysis
- **Update**: Before stakeholder meetings

#### docs/archive/
- **Purpose**: Historical documentation no longer actively used
- **Use**: Reference past decisions, understand evolution
- **Archive**: When docs become outdated but still valuable

---

## 🔄 Document Lifecycle

### Active → Archive Decision Tree

**Archive when:**
- Document is replaced by newer version
- Feature is fully implemented and stable
- Session log is >30 days old
- Testing report superseded by newer tests

**Keep Active when:**
- Contains current priorities or next steps
- Referenced frequently in current work
- Part of onboarding/setup process
- Tracks active bugs/features

### Update Frequency

| Document | Frequency |
|----------|-----------|
| PROJECT_STATUS.md | After every commit |
| BUGS_AND_FEATURES.md | When bugs/features identified |
| USER_TESTING_NOTES.md | After user testing |
| Session summaries | End of each session |
| Testing reports | After test cycles |
| User journeys | When workflows change |

---

## 🔍 Search Tips

### Find by Topic
```bash
# Search all docs for a topic
grep -r "reservation workflow" docs/

# Search active docs only
grep "capacity" *.md

# Search by file type
find docs/testing -name "*.md" -exec grep "space limit" {} +
```

### Find Recent Work
```bash
# Recent session summaries
ls -lt docs/sessions/

# Recent testing reports
ls -lt docs/testing/

# Recent commits
git log --oneline -10
```

### Find Implementation Details
```bash
# User workflows
cat docs/journeys/studio_director_journey.md

# Technical setup
cat docs/reference/QUICK_REFERENCE.md

# Current priorities
cat BUGS_AND_FEATURES.md
```

---

## 📌 Maintenance Notes

**Cleanup Schedule**:
- Monthly: Archive session summaries >30 days old
- Quarterly: Review and consolidate testing reports
- Per release: Update PROJECT_STATUS.md with new version

**Link Integrity**:
- All cross-references checked monthly
- Broken links fixed immediately
- Relative paths preferred over absolute

**Version Control**:
- All documentation tracked in git
- Commit docs with related code changes
- Use descriptive commit messages for doc updates

---

**Note**: This index is regenerated when major reorganization occurs. For day-to-day navigation, use PROJECT_STATUS.md and BUGS_AND_FEATURES.md.
