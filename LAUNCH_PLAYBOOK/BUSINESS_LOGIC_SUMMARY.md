# Business Logic Summary - November 1-8 Launch

**Created:** October 30, 2025
**Status:** ✅ COMPLETE AND SOUND
**Target:** Routine creation opens November 8, 2025

---

## 🎯 CORE ARCHITECTURAL PRINCIPLE

**ALL business rules must be tenant-configurable, NOT hardcoded into the application.**

- Rules stored in database (tenant-scoped)
- Feature flags for enabling/disabling validation
- Configuration via tenant settings tables
- Future admin UI for rule management (Phase 2+)

---

## 📋 10 MAJOR BUSINESS LOGIC CHANGES

### 1. **Classification Enforcement System** ⭐ HIGHEST PRIORITY
- **Dancer level:** Classification REQUIRED at creation, locked for season
- **Solo rules:** Classification locked to dancer's classification
- **Duet/Trio rules:** Highest dancer level, can bump up 1 level
- **Group/Line rules:** 60% majority, can bump up 1 level
- **Production rules:** Auto-locked to "Production" classification

**Files:** `dancers` table, `EntryCreationForm.tsx`, classification validation logic

---

### 2. **Entry Size Auto-Detection** (LOCKED)
- Auto-detected from dancer count
- Cannot be manually changed
- Updates when dancers added/removed
- Exception: Production can be manually selected

**Formula:** 1=Solo, 2=Duet, 3=Trio, 4-9=Small Group, 10-14=Large Group, 15-19=Line, 20+=Superline

---

### 3. **Age Calculation System** (LOCKED, CAN BUMP UP 1 YEAR)
- **Solo:** Exact age of dancer
- **Groups:** Floor(average age)
- **Age as of:** December 31, 2025
- **Can bump up:** One year only
- **Display:** Show number (e.g., "6"), NOT age group name

**Formula:** `Math.floor(ages.reduce((sum, age) => sum + age) / ages.length)`

---

### 4. **Production Auto-Lock Logic**
- Entry size "Production" → Dance style locked to "Production"
- Entry size "Production" → Classification locked to "Production"
- Minimum 10 dancers required
- Time limit: 15 minutes max (includes prop setup)

**Database:** Add "Production" classification + dance category to both tenants

---

### 5. **Extended Time System**
**Time Limits by Entry Size:**
- Solo/Duet/Trio/Vocal/Student Choreography: 3 min max
- Small Group/Adult Group: 3 min 30 sec max
- Large Group: 4 min max
- Line/Superline: 5 min max
- Production: 15 min max

**Extended Time Fees (per dancer, flat fee):**
- Solo: $5/dancer
- All other entry sizes: $2/dancer

**UI:** Checkbox to request extended time → Slider to set routine length (max time to 10 min)

---

### 6. **Required Field Enforcement**
- **Dancer creation:** Classification + Birth date (both NOT NULL)
- **Entry creation:** Choreographer (NOT NULL)
- **CSV import:** Reject if any required fields missing

---

### 7. **Field Removals**
Remove from `dancers` table and all forms:
- Gender
- Email
- Phone

**Reason:** Not needed for competition management, studio is contact point

---

### 8. **Scheduling Conflicts**
- **Phase 1:** Free text field (500 char) per routine
- **Phase 2:** Structured data (day/time checkboxes) + LLM processing
- **Pre-submit warning:** Modal reminding to add scheduling notes

**Database:** `competition_entries.scheduling_notes TEXT`

---

### 9. **Deposit Display & Pricing**
- **Remove:** Running price total from routines page
- **Add:** Deposit paid display on `/dashboard/entries`
- **Location:** Show deposit where running total currently is

---

### 10. **Routine Creation Disabled State** (Nov 1-7)
- Button greyed out with tooltip "Routine creation opens November 8th"
- OR: Feature flag `routine_creation_enabled = false`

---

## 🗄️ DATABASE SCHEMA CHANGES SUMMARY

### Tables Modified:
1. **dancers** - Add NOT NULL to classification_id, date_of_birth; DROP gender, email, phone
2. **competition_entries** - Add NOT NULL to choreographer; ADD scheduling_notes, extended_time fields
3. **entry_size_categories** - ADD max_time_minutes, max_time_seconds; UPDATE Production min_size=10
4. **competition_settings** - ADD extended_time_fee_solo, extended_time_fee_group, routine_creation_enabled
5. **classifications** - INSERT "Production" for both tenants
6. **dance_categories** - INSERT "Production" for both tenants

### Tables Created:
None - all changes to existing tables

---

## 📄 FILES & COMPONENTS AFFECTED

### Backend (tRPC Routers):
- `src/server/routers/entry.ts` - All validation logic
- `src/server/routers/dancer.ts` - Required field validation
- `src/lib/ageCalculation.ts` - NEW - Age calculation utilities
- `src/lib/classificationValidation.ts` - NEW - Classification rules
- `src/lib/entrySizeDetection.ts` - NEW - Entry size auto-detection

### Frontend (Components):
- `src/components/EntryCreationForm.tsx` - Main changes (classification, age, extended time)
- `src/components/DancerCreationForm.tsx` - Remove fields, add validation
- `src/components/DancerCSVImport.tsx` - Update validation
- `src/components/SummarySubmission.tsx` - Add pre-submit warning
- `src/components/ReservationCard.tsx` - Add deposit display
- `src/components/EntriesList.tsx` - Remove running total
- `src/components/ExtendedTimeSelector.tsx` - NEW - Extended time UI
- `src/components/ClassificationSelector.tsx` - NEW - Smart classification dropdown

### Pages:
- `src/app/dashboard/entries/page.tsx` - Remove running total, add deposit
- `src/app/dashboard/entries/create/page.tsx` - All validation logic
- `src/app/dashboard/dancers/new/page.tsx` - Remove fields
- `src/app/dashboard/page.tsx` - Disable routine creation button

---

## ✅ VALIDATION RULES CHECKLIST

### Entry Creation:
- [x] Choreographer required
- [x] Entry size auto-detected and locked
- [x] Age auto-calculated, can bump up 1 year only
- [x] Classification follows solo/duet/group/production rules
- [x] Production: min 10 dancers, locked style/classification
- [x] Extended time: if checked, routine length required
- [x] Scheduling notes: optional, 500 char max

### Dancer Creation:
- [x] Classification required (NOT NULL)
- [x] Birth date required (NOT NULL)
- [x] Gender removed
- [x] Email removed
- [x] Phone removed

### CSV Import:
- [x] Dancers: classification + birthdate required for ALL rows
- [x] Preview with red highlights for missing data
- [x] Block import until all required fields present

---

## 🚀 TIMELINE & MILESTONES

**October 30 (Tonight):**
- ⏳ Receive Selena's GLOW reservation data

**November 1 (Friday):**
- ✅ Seed both tenants with reservation data
- ✅ Send account claiming emails
- ✅ Studios onboard + create/import dancers
- ⚠️ Routine creation DISABLED

**November 1-7 (Implementation Week):**
- Implement all 10 business logic changes
- Database migrations
- Component updates
- Test on both EMPWR + GLOW tenants
- UAT with Emily/Selena

**November 8 (Friday - Routine Creation Opens):**
- ✅ Enable routine creation
- ✅ All P0 features live
- ✅ Monitor closely for issues
- ✅ Automated test suite running

**December 23 (Payment Deadline):**
- Studios must pay invoices
- All invoices generated within 24h of summary submission

---

## 🧪 TESTING REQUIREMENTS

### Classification Logic:
- Solo with Emerald dancer → Auto-locked to Emerald ✓
- Duet with Emerald + Sapphire → Minimum Sapphire, can select Titanium ✓
- Group with 7 Emerald + 3 Sapphire → Suggests Emerald (70%), can bump to Sapphire ✓

### Production Logic:
- Select Production → Dance style locked, classification locked ✓
- Production with 9 dancers → Validation error ✓
- Production with 10+ dancers → Allowed ✓

### Age Calculation:
- Solo with 7-year-old → Displays "7" ✓
- Duet with ages 6 + 7 → Displays "6" (floor(6.5)) ✓
- Can bump age up by 1 year → Allowed ✓
- Cannot bump age up by 2+ years → Blocked ✓

### Extended Time:
- Solo with extended time → $5 fee ✓
- Large Group (12 dancers) with extended time → $24 fee (12 × $2) ✓
- Extended time checkbox unchecked → No routine length field ✓
- Extended time checked but no length → Validation error ✓

### Required Fields:
- Dancer creation without classification → Blocked ✓
- Dancer creation without birthdate → Blocked ✓
- Entry creation without choreographer → Blocked ✓
- CSV import with missing data → Preview with red highlights, block import ✓

---

## 📊 PROGRESS TRACKING

### Phase 1: Business Logic Specification ✅ COMPLETE
- [x] All 10 major changes documented
- [x] Database schema changes specified
- [x] UI changes specified
- [x] Validation rules codified
- [x] Time limits confirmed
- [x] Extended time fees confirmed

### Phase 2: Implementation (Nov 1-7)
- [ ] Database migrations
- [ ] Backend validation logic
- [ ] Frontend component updates
- [ ] Extended time UI
- [ ] Classification validation
- [ ] Age calculation
- [ ] CSV import updates

### Phase 3: Testing (Nov 6-7)
- [ ] Unit tests for validation rules
- [ ] Integration tests for entry creation
- [ ] E2E tests with Playwright
- [ ] Both tenants tested (EMPWR + GLOW)

### Phase 4: Launch (Nov 8)
- [ ] Routine creation enabled
- [ ] Monitoring active
- [ ] Quick fix capability ready

---

## 🎓 KEY LEARNINGS & PATTERNS

### Classification Weighting Formula:
```typescript
// Assign levels: Emerald=1, Sapphire=2, Titanium=3, Crystal=4
// Count dancers per level
// Find 60%+ majority
// If no majority, use highest level
```

### Age Calculation Pattern:
```typescript
const cutoff = new Date("2025-12-31");
const ages = dancers.map(d => calculateAge(d.date_of_birth, cutoff));
const avgAge = Math.floor(ages.reduce((sum, age) => sum + age) / ages.length);
```

### Entry Size Detection Pattern:
```typescript
const ranges = {
  1: 'Solo', 2: 'Duet', 3: 'Trio',
  '4-9': 'Small Group', '10-14': 'Large Group',
  '15-19': 'Line', '20+': 'Superline'
};
```

### Extended Time Fee Pattern:
```typescript
const feePerDancer = isSolo ? 5.00 : 2.00;
const totalFee = dancerCount * feePerDancer;
```

---

## 📞 STAKEHOLDER COMMUNICATION

**Emily (EMPWR):**
- Uses same time limits as GLOW
- Classifications: Novice, Part-time, Competitive
- Receiving email notifications successfully
- **Action:** Send spreadsheet template to Selena for consistent formatting
- **Action:** Merge Selena's data with email spreadsheet once complete

**Selena (GLOW):**
- Classifications: Emerald, Sapphire, Titanium, Crystal
- **Action:** Fill in GLOW reservation spreadsheet (studios, emails, spaces, deposits, credits, discounts)
- **Action:** Fill in question marks for studios contacted before Emily started
- **Action:** Provide Showstopper login credentials for reference (optional)
- **Action:** Confirm Orlando event canceled and can be deleted

**Both CDs:**
- November 1: Send account claiming emails to studios
- November 8: Open routine creation
- Available for UAT testing Nov 6-7

---

## ⚠️ CRITICAL SUCCESS FACTORS

1. **Classification enforcement** - Prevents hours of manual CD work
2. **Age calculation accuracy** - Avoids scheduling conflicts
3. **Production auto-lock** - Eliminates miscategorization
4. **Extended time tracking** - Required for scheduling Phase 2
5. **Deposit visibility** - Trust-building for seeded data workflow
6. **Tenant isolation** - Zero cross-tenant data leaks

---

## 🔗 REFERENCE DOCUMENTS

- **PHASE1_EXHAUSTIVE_VERIFICATION.md** - All 23 items captured from meeting
- **PHASE2_BUSINESS_LOGIC_SPECIFICATIONS.md** - Complete technical spec (THIS IS SOURCE OF TRUTH)
- **DEMO_MEETING_OCTOBER_30_TRANSCRIPT_SUMMARY.md** - Meeting summary with quotes
- **HANDWRITTEN_NOTES_OCTOBER_30.md** - Additional items from user notes
- **Zoom Summary** - AI-generated action items from meeting

---

**Document Status:** ✅ COMPLETE AND SOUND - Ready for DevTeam task division

**Last Updated:** October 30, 2025
**Next Step:** Phase 3 - DevTeam Protocol Task Division (through November 7)
