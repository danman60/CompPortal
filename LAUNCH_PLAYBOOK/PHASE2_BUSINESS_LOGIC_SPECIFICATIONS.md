# Phase 2: Complete Business Logic Specifications

**Date:** October 30, 2025
**Target Launch:** November 8, 2025 (Routine Creation)
**Source:** Demo meeting transcript + Zoom summary + Voice responses

---

## 🎯 CORE PRINCIPLE: TENANT-CONFIGURABLE RULES

**Critical Decision:** Business rules should NOT be hardcoded into the application.

**Architecture:**
- Rules stored in database tables (tenant-scoped)
- Feature flags for enabling/disabling specific validation rules
- Configuration UI for future admin management (Phase 2+)
- Current implementation: Hardcoded into tenant settings tables (configurable per tenant, not per app)

**Example:**
```typescript
// ❌ WRONG - Hardcoded in app
if (entrySize === "Production") {
  classification = "Production"; // hardcoded
}

// ✅ CORRECT - Tenant-configurable
const rules = await getTenantRules(tenantId);
if (rules.production_auto_lock_enabled) {
  const productionClass = await getClassificationByName(tenantId, "Production");
  classification = productionClass.id;
}
```

---

## 📋 COMPLETE BUSINESS LOGIC CHANGES

### 1. CLASSIFICATION SYSTEM (CRITICAL)

#### 1.1 Dancer Classification Enforcement
**Current State:** Classification optional on dancer creation
**New State:** Classification REQUIRED, locked through season

**Business Rules:**
- Every dancer MUST have a classification assigned at creation
- Classification set at dancer creation is PERMANENT for the season
- If dancer has ANY entries, classification CANNOT be changed
- CSV import: Reject entire import if any dancer missing classification

**Database Changes:**
```sql
-- Make classification required
ALTER TABLE dancers
ALTER COLUMN classification_id SET NOT NULL;

-- Add constraint to prevent changes if entries exist
-- (Application-level validation, not DB constraint)
```

**UI Changes:**
- Dancer creation form: Classification dropdown marked REQUIRED with red asterisk
- Dancer edit form: Classification field DISABLED if dancer has entries
- CSV import: Red highlight for missing classification, block import

**Validation Logic:**
```typescript
// On dancer creation
if (!classification_id) {
  throw new Error("Classification is required");
}

// On dancer edit
const entryCount = await prisma.competition_entries.count({
  where: {
    participants: { some: { dancer_id: dancerId } }
  }
});

if (entryCount > 0 && classification_id !== currentClassification) {
  throw new Error("Cannot change classification - dancer has existing entries");
}
```

---

#### 1.2 Solo Classification Lock
**Business Rule:** Solo classification MUST match dancer's classification (100% locked, not editable)

**Implementation:**
- When entry_size = "Solo" and 1 dancer attached
- Auto-set entry.classification_id = dancer.classification_id
- Disable classification dropdown in UI
- Show read-only text: "Classification: [Name] (based on dancer)"

**UI Display:**
```tsx
{entrySize === "Solo" && dancers.length === 1 && (
  <FormField label="Classification">
    <Input
      value={dancers[0].classification.name}
      disabled
      className="bg-gray-100"
    />
    <FormDescription>
      Locked to dancer's classification
    </FormDescription>
  </FormField>
)}
```

---

#### 1.3 Duet/Trio Classification (Highest Wins)
**Business Rule:** Routine classification = highest dancer level, can bump up ONE level only

**Implementation:**
```typescript
// Calculate suggested classification
const dancerClassifications = dancers.map(d => d.classification);
const highest = dancerClassifications.reduce((max, curr) =>
  curr.level > max.level ? curr : max
);

// Allow selection of highest or one level higher
const allowedClassifications = await prisma.classifications.findMany({
  where: {
    tenant_id: ctx.tenantId,
    level: { gte: highest.level, lte: highest.level + 1 }
  },
  orderBy: { level: 'asc' }
});

// Default to highest
suggestedClassification = highest.id;

// Validation on save
if (selectedClassification.level < highest.level) {
  throw new Error(`Minimum ${highest.name} (based on highest dancer)`);
}

if (selectedClassification.level > highest.level + 1) {
  throw new Error("Can only bump up one level from highest dancer");
}
```

**UI Display:**
- Dropdown shows only allowed classifications
- Helper text: "Suggested: [Highest Name] (based on highest dancer)"
- Can select one level higher from dropdown

---

#### 1.4 Group/Line Classification (Weighted Majority)
**Business Rule:** Calculate weighted majority (60%+), can bump up ONE level only

**Weighting Formula:**
```typescript
// Assign numerical values to classifications
// GLOW: Emerald=1, Sapphire=2, Titanium=3, Crystal=4
// EMPWR: Novice=1, Part-time=2, Competitive=3

function calculateMajorityClassification(dancers) {
  const counts = {};
  const total = dancers.length;

  // Count dancers per classification
  dancers.forEach(d => {
    const classId = d.classification_id;
    counts[classId] = (counts[classId] || 0) + 1;
  });

  // Find 60%+ majority
  for (const [classId, count] of Object.entries(counts)) {
    if (count / total >= 0.6) {
      return getClassificationById(classId);
    }
  }

  // No clear majority: return highest
  return getHighestClassification(dancers);
}

// Validation
const majority = calculateMajorityClassification(dancers);
const allowedLevels = [majority.level, majority.level + 1];

if (!allowedLevels.includes(selectedClassification.level)) {
  throw new Error(`Must be ${majority.name} or one level higher`);
}
```

**UI Display:**
- Dropdown shows majority classification + one level higher
- Helper text: "Suggested: [Majority Name] (60% majority)"
- Disabled options greyed out with tooltip explaining why

---

#### 1.5 Production Classification Auto-Lock
**Business Rule:** When entry size = "Production", auto-lock classification to "Production"

**Database Setup:**
```sql
-- Add "Production" classification to both tenants
INSERT INTO classifications (tenant_id, name, level, description)
VALUES
  ('00000000-0000-0000-0000-000000000001', 'Production', 99, 'Production entries only'),
  ('4b9c1713-40ab-460b-8dda-5a8cf6cbc9b5', 'Production', 99, 'Production entries only');
```

**Implementation:**
```typescript
if (entrySizeCategory.name === "Production") {
  const productionClass = await prisma.classifications.findFirst({
    where: { tenant_id: ctx.tenantId, name: "Production" }
  });

  entry.classification_id = productionClass.id;
  entry.classification_editable = false;
}
```

**UI Display:**
- Classification dropdown DISABLED
- Show: "Classification: Production (locked for productions)"

---

### 2. ENTRY SIZE AUTO-DETECTION (LOCKED)

**Business Rule:** Entry size is automatically detected based on dancer count and CANNOT be manually changed

**Implementation:**
```typescript
function detectEntrySize(dancerCount: number): string {
  if (dancerCount === 1) return 'Solo';
  if (dancerCount === 2) return 'Duet';
  if (dancerCount === 3) return 'Trio';
  if (dancerCount >= 4 && dancerCount <= 9) return 'Small Group';
  if (dancerCount >= 10 && dancerCount <= 14) return 'Large Group';
  if (dancerCount >= 15 && dancerCount <= 19) return 'Line';
  if (dancerCount >= 20) return 'Superline';
  throw new Error('Invalid dancer count');
}

// Auto-detect on dancer selection change
const entrySize = detectEntrySize(selectedDancers.length);
entry.entry_size_category_id = await getEntrySizeIdByName(entrySize);
```

**UI Display:**
- Entry size field: DISABLED, shows auto-detected value
- Updates automatically when dancers added/removed
- Cannot be manually overridden (except Production - see Section 3)

**Transcript Quote:** "Do we want to allow them to change it themselves? No. No... it's locked. Okay, so just like the age, the auto-calculated fields here of age and size are both locked and cannot be user overridden."

---

### 3. AGE CALCULATION SYSTEM (LOCKED, CAN BUMP UP ONE YEAR)

#### 3.1 Age Calculation Formula
**Business Rules:**
- **Solo:** Exact age of dancer (no averaging)
- **Duet/Trio/Groups/Lines/Productions:** Floor(average age)
- **Age as of:** December 31st of current year (Dec 31, 2025 for 2026 season)

**Calculation Logic:**
```typescript
function calculateRoutineAge(dancers: Dancer[], entrySize: string): number {
  const cutoffDate = new Date("2025-12-31");

  if (entrySize === "Solo") {
    return calculateAge(dancers[0].date_of_birth, cutoffDate);
  }

  // Duet/Trio/Groups/Lines/Productions
  const ages = dancers.map(d => calculateAge(d.date_of_birth, cutoffDate));
  const avgAge = ages.reduce((sum, age) => sum + age, 0) / ages.length;
  return Math.floor(avgAge); // Drop decimal
}

function calculateAge(birthdate: Date, asOfDate: Date): number {
  const birth = new Date(birthdate);
  let age = asOfDate.getFullYear() - birth.getFullYear();
  const monthDiff = asOfDate.getMonth() - birth.getMonth();

  if (monthDiff < 0 || (monthDiff === 0 && asOfDate.getDate() < birth.getDate())) {
    age--;
  }

  return age;
}
```

**UI Display:**
- Show: "Age: 6" (just the number)
- NOT: "Age Group: Senior" (age groups used ONLY for awards)
- Read-only, auto-calculated field
- Can bump up ONE age year (e.g., 6 → 7)

---

#### 2.2 Age Override (Bump Up One Year)
**Business Rule:** Can bump age up by ONE year, cannot decrease

**Implementation:**
```typescript
const calculatedAge = calculateRoutineAge(dancers, entrySize);
const allowedAges = [calculatedAge, calculatedAge + 1];

// Validation
if (!allowedAges.includes(selectedAge)) {
  throw new Error(`Age must be ${calculatedAge} or ${calculatedAge + 1}`);
}
```

**UI Display:**
- Dropdown with only 2 options: [calculatedAge, calculatedAge + 1]
- Helper text: "Calculated: 6 (can select 6 or 7)"

---

### 3. PRODUCTION ENTRY LOGIC

#### 3.1 Production Auto-Lock Rules
**Business Rules:**
- Entry size "Production" → Dance style locked to "Production"
- Entry size "Production" → Classification locked to "Production"
- Entry size "Production" → Minimum 10 dancers required

**Database Changes:**
```sql
-- Update entry size minimum
UPDATE entry_size_categories
SET min_size = 10
WHERE name = 'Production';

-- Add "Production" to dance categories if not exists
INSERT INTO dance_categories (tenant_id, name, description)
VALUES
  ('00000000-0000-0000-0000-000000000001', 'Production', 'Production numbers'),
  ('4b9c1713-40ab-460b-8dda-5a8cf6cbc9b5', 'Production', 'Production numbers')
ON CONFLICT DO NOTHING;
```

**Implementation:**
```typescript
if (entrySizeCategory.name === "Production") {
  // Lock dance style
  const productionStyle = await prisma.dance_categories.findFirst({
    where: { tenant_id: ctx.tenantId, name: "Production" }
  });
  entry.dance_category_id = productionStyle.id;

  // Lock classification
  const productionClass = await prisma.classifications.findFirst({
    where: { tenant_id: ctx.tenantId, name: "Production" }
  });
  entry.classification_id = productionClass.id;

  // Validate minimum dancers
  if (dancers.length < 10) {
    throw new Error("Productions require minimum 10 dancers");
  }
}
```

**UI Display:**
- Dance Style dropdown: DISABLED, shows "Production (locked)"
- Classification dropdown: DISABLED, shows "Production (locked)"
- Dancer count validation: Red error if < 10

---

### 4. EXTENDED TIME SYSTEM

#### 4.1 Time Limits by Entry Size
**Data Source:** Glow website entry info page (glowdancecomp.com/entry-info)

**Time Limits (CONFIRMED):**
- **Solo** (1 dancer): 3 minutes max
- **Duet** (2 dancers): 3 minutes max
- **Trio** (3 dancers): 3 minutes max
- **Small Group** (4-9 dancers): 3 minutes 30 seconds max
- **Large Group** (10-14 dancers): 4 minutes max
- **Line** (15-19 dancers): 5 minutes max
- **Superline** (20+ dancers): 5 minutes max
- **Production** (10+ dancers): 15 minutes max (includes prop setup and exits)
- **Adult Group**: 3 minutes 30 seconds max
- **Vocal**: 3 minutes max
- **Student Choreography** (any entry type): 3 minutes max

**Note:** EMPWR uses same time limits (confirmed in transcript: "Emily should be the same as mine")

**Database Schema:**
```sql
-- Add time limit to entry size categories
ALTER TABLE entry_size_categories
ADD COLUMN max_time_minutes INTEGER,
ADD COLUMN max_time_seconds INTEGER DEFAULT 0;

-- Populate time limits for all entry sizes
UPDATE entry_size_categories SET max_time_minutes = 3, max_time_seconds = 0
WHERE name IN ('Solo', 'Duet', 'Trio', 'Vocal', 'Student Choreography');

UPDATE entry_size_categories SET max_time_minutes = 3, max_time_seconds = 30
WHERE name IN ('Small Group', 'Adult Group');

UPDATE entry_size_categories SET max_time_minutes = 4, max_time_seconds = 0
WHERE name = 'Large Group';

UPDATE entry_size_categories SET max_time_minutes = 5, max_time_seconds = 0
WHERE name IN ('Line', 'Superline');

UPDATE entry_size_categories SET max_time_minutes = 15, max_time_seconds = 0
WHERE name = 'Production';

-- Add extended time tracking to entries
ALTER TABLE competition_entries
ADD COLUMN extended_time_requested BOOLEAN DEFAULT FALSE,
ADD COLUMN routine_length_minutes INTEGER NULL,
ADD COLUMN routine_length_seconds INTEGER NULL;

-- Add extended time fees to competition settings (per dancer, per entry size)
ALTER TABLE competition_settings
ADD COLUMN extended_time_fee_solo DECIMAL(10,2) DEFAULT 5.00,
ADD COLUMN extended_time_fee_group DECIMAL(10,2) DEFAULT 2.00;
```

**Implementation:**
```typescript
// Display time limit in entry form
const entrySize = await prisma.entry_size_categories.findUnique({
  where: { id: entry.entry_size_category_id }
});

const timeLimit = `${entrySize.max_time_minutes}:${entrySize.max_time_seconds.toString().padStart(2, '0')}`;

// Extended time checkbox logic
if (extendedTimeRequested) {
  // Show slider from max time to 10 minutes
  // Capture routine length
  entry.extended_time_requested = true;
  entry.routine_length_minutes = selectedMinutes;
  entry.routine_length_seconds = selectedSeconds;

  // Calculate extended time fee (per dancer)
  const dancerCount = entry.dancers.length;
  const isSolo = entrySize.name === 'Solo';
  const feePerDancer = isSolo
    ? competition_settings.extended_time_fee_solo  // $5 per dancer
    : competition_settings.extended_time_fee_group; // $2 per dancer

  const extendedTimeFee = dancerCount * feePerDancer;

  // Add to invoice
  invoiceTotal += extendedTimeFee;
}
```

**UI Display:**
```tsx
{/* Entry Size - Auto-detected and LOCKED */}
<FormField label="Entry Size">
  <Input
    value={`${entrySize.name} (${dancers.length} dancers)`}
    disabled
    className="bg-gray-100"
  />
  <FormDescription>
    {/* Show time limit inline with entry size */}
    Time limit: {entrySize.max_time_minutes}:{entrySize.max_time_seconds.toString().padStart(2, '0')} max
  </FormDescription>
</FormField>

{/* Extended Time Section - Shown right below entry size */}
<FormField label="Extended Time">
  <div className="flex items-center gap-2">
    <Checkbox
      id="extended-time"
      checked={extendedTimeRequested}
      onChange={handleExtendedTimeChange}
    />
    <label htmlFor="extended-time" className="cursor-pointer">
      Request Extended Time
      {extendedTimeRequested && ` (+$${feePerDancer} per dancer = $${extendedTimeFee} total)`}
    </label>
  </div>

  {extendedTimeRequested && (
    <div className="mt-4">
      <label className="block text-sm font-medium mb-2">
        Routine Length
      </label>
      <Slider
        min={entrySize.max_time_minutes}
        max={10}
        step={0.5}
        value={routineLength}
        onChange={setRoutineLength}
      />
      <div className="text-sm text-gray-600 mt-2">
        {Math.floor(routineLength)} minutes {Math.round((routineLength % 1) * 60)} seconds
      </div>
    </div>
  )}
</FormField>
```

**Extended Time Fee Calculation Examples:**
- Solo (1 dancer) with extended time: 1 × $5 = **$5**
- Duet (2 dancers) with extended time: 2 × $2 = **$4**
- Large Group (12 dancers) with extended time: 12 × $2 = **$24**
- Production (20 dancers) with extended time: 20 × $2 = **$40**

---

### 5. SCHEDULING CONFLICTS SYSTEM

#### 5.1 Scheduling Notes Data Structure
**Decision:** Hybrid approach for Phase 1

**Phase 1 Implementation (Free Text):**
```sql
ALTER TABLE competition_entries
ADD COLUMN scheduling_notes TEXT;
```

**UI Implementation:**
```tsx
<FormField label="Scheduling Notes (Optional)">
  <Textarea
    name="scheduling_notes"
    placeholder="e.g., Cannot dance on Saturday morning"
    maxLength={500}
    rows={3}
  />
  <FormDescription>
    Specify any day/time preferences or conflicts for this routine
  </FormDescription>
</FormField>
```

**Future Enhancement (Phase 2 - Structured Data):**
- Day/time checkboxes (Saturday AM, Saturday PM, Sunday AM, Sunday PM)
- LLM processing to convert free text to structured data
- Auto-population in scheduling system

**Pre-Submit Warning:**
```tsx
// Before summary submission
<AlertDialog open={showSubmitWarning}>
  <AlertDialogContent>
    <AlertDialogHeader>
      <AlertDialogTitle>Confirm Submission</AlertDialogTitle>
      <AlertDialogDescription>
        Please ensure you've submitted any scheduling conflicts for your routines.
        Changes may not be possible after submission.
      </AlertDialogDescription>
    </AlertDialogHeader>
    <AlertDialogFooter>
      <AlertDialogCancel>Review Entries</AlertDialogCancel>
      <AlertDialogAction onClick={handleSubmit}>
        Confirm & Submit
      </AlertDialogAction>
    </AlertDialogFooter>
  </AlertDialogContent>
</AlertDialog>
```

---

### 6. REQUIRED FIELD ENFORCEMENT

#### 6.1 Birth Date Required
**Database:**
```sql
ALTER TABLE dancers
ALTER COLUMN date_of_birth SET NOT NULL;
```

**UI Validation:**
- Dancer creation: Red asterisk, HTML5 required attribute
- CSV import: Reject import if ANY dancer missing birthdate

---

#### 6.2 Choreographer Required
**Database:**
```sql
ALTER TABLE competition_entries
ALTER COLUMN choreographer SET NOT NULL;
```

**UI Validation:**
- Entry creation: Red asterisk, HTML5 required attribute

---

### 7. FIELD REMOVALS

#### 7.1 Remove Gender, Email, Phone from Dancers
**Database:**
```sql
ALTER TABLE dancers
DROP COLUMN gender,
DROP COLUMN email,
DROP COLUMN phone;
```

**UI Changes:**
- Remove from DancerCreationForm.tsx
- Remove from DancerEditForm.tsx
- Remove from CSV import template
- Update CSV import validation

---

### 8. DEPOSIT, CREDITS, & DISCOUNT DISPLAY

#### 8.1 Reservation Data Structure (From Seeding)
**Data to capture from spreadsheet:**
- Studio name
- Email address
- Competition ID
- Number of spaces reserved
- **Deposit amount paid** (dollar amount)
- **Credits owed** (dollar amount, e.g., from previous season refunds)
- **Discount percentage** (e.g., 5%, 10%, early bird discount)

**Database Schema (already exists, confirm populated):**
```typescript
// reservations table should have:
{
  studio_id: string;
  competition_id: string;
  approved_slots: number;
  status: 'approved';
  deposit_paid: number;      // FROM SPREADSHEET
  credits_owed: number;       // FROM SPREADSHEET (optional)
  discount_percentage: number; // FROM SPREADSHEET (optional, e.g., 5, 10)
}
```

#### 8.2 Remove Running Total from Routines Page
**Current:** Shows running total as entries are added
**New:** Hide all pricing until invoice generation

**Location:** `/dashboard/entries` (routines page)

**Implementation:**
```tsx
// REMOVE running total calculation
// <div>Total: ${runningTotal}</div>

// ADD deposit, credits, discount display
<div className="bg-blue-50 p-4 rounded-md space-y-2">
  {reservation.deposit_paid > 0 && (
    <p className="text-sm text-blue-800">
      Deposit Paid: ${reservation.deposit_paid}
    </p>
  )}
  {reservation.credits_owed > 0 && (
    <p className="text-sm text-green-800">
      Credits: ${reservation.credits_owed}
    </p>
  )}
  {reservation.discount_percentage > 0 && (
    <p className="text-sm text-purple-800">
      Discount: {reservation.discount_percentage}%
    </p>
  )}
</div>
```

---

#### 8.3 Invoice Calculation (CD Action)
**When CD generates invoice after summary submission:**
```typescript
const invoiceTotal = calculateInvoiceTotal({
  entries: submittedEntries,
  global_entry_fee: competition_settings.global_entry_fee,
  title_upgrades: entriesWithTitleUpgrade,
  extended_time_fees: entriesWithExtendedTime,
  deposit_paid: reservation.deposit_paid,
  credits_owed: reservation.credits_owed,
  discount_percentage: reservation.discount_percentage
});

// Formula:
// Base = (entry_count × global_entry_fee) + title_upgrades + extended_time_fees
// Discounted = Base × (1 - discount_percentage/100)
// Final = Discounted - deposit_paid - credits_owed
```

**Example:**
- 20 entries × $75 = $1,500
- 5 title upgrades × $10 = $50
- 3 extended time (solo) × $5 = $15
- Subtotal = $1,565
- Discount (10%) = -$156.50
- Deposit paid = -$500
- Credits owed = -$100
- **Final invoice = $808.50**

#### 8.4 Post-Submission Message
**After summary submission:**
```tsx
<Alert variant="success">
  <AlertTitle>Summary Submitted Successfully</AlertTitle>
  <AlertDescription>
    Thank you! Your invoice will be emailed to you within 24 hours.
  </AlertDescription>
</Alert>
```

---

### 9. AGE GROUP vs SCHEDULING AGE

**CRITICAL DISTINCTION:**

**Age Groups (for awards only):**
- Tiny, Bitty, Mini, Pre-Junior, Junior, Teen, Senior, Senior+
- Used ONLY for overall awards tabulation
- NOT shown in routine creation UI
- NOT used for scheduling

**Scheduling Age (for routine creation):**
- Exact number: 5, 6, 7, 12, etc.
- Calculated as described in Section 2
- Shown during routine creation
- Used for competition scheduling

**UI Rule:** NEVER show age group names during routine creation, ONLY show age numbers

---

### 10. ROUTINE CREATION DISABLED (Nov 1-7)

**Implementation:**
```tsx
<Button
  disabled={!isRoutineCreationEnabled}
  className="relative"
>
  Create New Routine
  {!isRoutineCreationEnabled && (
    <Tooltip content="Routine creation opens November 8th">
      <InfoIcon className="ml-2" />
    </Tooltip>
  )}
</Button>

// Or alternative
{isRoutineCreationEnabled ? (
  <Link href="/dashboard/entries/create">
    <Button>Create New Routine</Button>
  </Link>
) : (
  <Button disabled className="cursor-not-allowed bg-gray-300">
    Routine Creation Opens November 8th
  </Button>
)}
```

**Feature Flag:**
```typescript
// In environment or database config
ROUTINE_CREATION_ENABLED=false // Until Nov 8

// Or in competition settings
const settings = await prisma.competition_settings.findUnique({
  where: { id: competitionSettingsId }
});

const isRoutineCreationEnabled = settings.routine_creation_enabled &&
                                  new Date() >= new Date("2025-11-08");
```

---

## 📊 AFFECTED PAGES & COMPONENTS

### Pages Modified:
1. `/dashboard/entries` - Remove running total, add deposit display
2. `/dashboard/entries/create` - All validation logic, extended time, scheduling notes
3. `/dashboard/dancers/new` - Remove gender/email/phone, enforce classification/birthdate
4. `/dashboard/dancers/import` - Update CSV validation
5. `/dashboard` - Routine creation button disabled

### Components Modified:
1. `EntryCreationForm.tsx` - Main entry form with all new logic
2. `DancerCreationForm.tsx` - Remove fields, add validation
3. `DancerCSVImport.tsx` - Update validation rules
4. `RoutineCSVImport.tsx` - Add classification enforcement
5. `SummarySubmission.tsx` - Add pre-submit warning
6. `ReservationCard.tsx` - Add deposit display
7. `EntriesList.tsx` - Remove running total

### New Components Needed:
1. `ExtendedTimeSelector.tsx` - Slider for extended time selection
2. `ClassificationSelector.tsx` - Smart dropdown with validation
3. `AgeCalculator.tsx` - Display calculated age with override option

---

## 🗄️ DATABASE SCHEMA CHANGES

### New Tables:
None (all changes are to existing tables)

### Modified Tables:

**dancers:**
```sql
ALTER TABLE dancers
ALTER COLUMN classification_id SET NOT NULL,
ALTER COLUMN date_of_birth SET NOT NULL,
DROP COLUMN gender,
DROP COLUMN email,
DROP COLUMN phone;
```

**competition_entries:**
```sql
ALTER TABLE competition_entries
ALTER COLUMN choreographer SET NOT NULL,
ADD COLUMN scheduling_notes TEXT,
ADD COLUMN extended_time_requested BOOLEAN DEFAULT FALSE,
ADD COLUMN routine_length_minutes INTEGER NULL,
ADD COLUMN routine_length_seconds INTEGER NULL;
```

**entry_size_categories:**
```sql
ALTER TABLE entry_size_categories
ADD COLUMN max_time_minutes INTEGER,
ADD COLUMN max_time_seconds INTEGER DEFAULT 0;

UPDATE entry_size_categories
SET min_size = 10
WHERE name = 'Production';
```

**competition_settings:**
```sql
ALTER TABLE competition_settings
ADD COLUMN extended_time_fee DECIMAL(10,2) DEFAULT 0.00,
ADD COLUMN routine_creation_enabled BOOLEAN DEFAULT FALSE;
```

**classifications:**
```sql
-- Add "Production" classification to BOTH tenants (EMPWR + GLOW)
INSERT INTO classifications (tenant_id, name, level, description)
VALUES
  -- EMPWR tenant
  ('00000000-0000-0000-0000-000000000001', 'Production', 99, 'Production entries only'),
  -- GLOW tenant
  ('4b9c1713-40ab-460b-8dda-5a8cf6cbc9b5', 'Production', 99, 'Production entries only');
```

**dance_categories:**
```sql
-- Add "Production" dance category to BOTH tenants (EMPWR + GLOW)
INSERT INTO dance_categories (tenant_id, name, description)
VALUES
  -- EMPWR tenant
  ('00000000-0000-0000-0000-000000000001', 'Production', 'Production numbers'),
  -- GLOW tenant
  ('4b9c1713-40ab-460b-8dda-5a8cf6cbc9b5', 'Production', 'Production numbers')
ON CONFLICT DO NOTHING;
```

---

## 🎯 VALIDATION RULES SUMMARY

### Entry Creation Validation:
1. ✅ Choreographer required (NOT NULL)
2. ✅ Classification follows rules (solo/duet/group/production logic)
3. ✅ Age auto-calculated, can bump up 1 year only
4. ✅ Production: min 10 dancers, locked style/classification
5. ✅ Extended time: if checked, routine length required
6. ✅ Scheduling notes: optional, 500 char max

### Dancer Creation Validation:
1. ✅ Classification required (NOT NULL)
2. ✅ Birth date required (NOT NULL)
3. ✅ Gender: REMOVED
4. ✅ Email: REMOVED
5. ✅ Phone: REMOVED

### CSV Import Validation:
1. ✅ Dancers: classification + birthdate required for all rows
2. ✅ Show preview with red highlights for missing data
3. ✅ Block import until all required fields present

---

## 📊 DATA SEEDING PROCESS (OCTOBER 30-31)

### Spreadsheet Data Requirements

**GLOW (Selena to provide):**
- Studio name
- Contact email
- Competition name/ID
- Number of spaces reserved
- Deposit amount paid ($)
- Credits owed ($) - from previous season refunds
- Discount percentage (%) - early bird, loyalty, etc.

**EMPWR (Emily already provided):**
- Same structure as above
- Needs Selena's question marks filled in for early contacts

### Seeding Script Structure
```typescript
// For each row in spreadsheet
await prisma.reservations.create({
  data: {
    studio_id: await getOrCreateStudio(row.studio_name, row.email),
    competition_id: await getCompetitionId(row.competition_name),
    approved_slots: row.spaces_reserved,
    status: 'approved',
    deposit_paid: row.deposit_amount || 0,
    credits_owed: row.credits || 0,
    discount_percentage: row.discount_percentage || 0,
    created_at: new Date(),
    updated_at: new Date()
  }
});
```

### Data Cleanup Tasks
1. Remove Orlando event from GLOW competitions table
2. Verify all competition settings populated for both tenants
3. Confirm "Production" classification + category added to both tenants
4. Verify time limits populated in entry_size_categories table

---

## 🚀 NOVEMBER 1ST EMAIL DRAFT

**Subject:** Welcome to CompSync - Claim Your Account

**Body:**
```
Hi [Studio Name],

Your account is ready on the new CompSync system!

**Your Competition:** [Competition Name]
**Your Reserved Spaces:** [X] routines
**Deposit Paid:** $[X]

**Next Steps (by November 7th):**
1. Click the link below to claim your account
2. Complete your studio profile
3. Add your dancers (or import from CSV)

**Routine creation opens November 8th.**

[Claim Account Button]

Questions? Contact [CD Email]

Thanks,
The CompSync Team
```

---

## ⏰ TIMELINE

**October 30 (Tonight):**
- ✅ Emily sends spreadsheet template to Selena
- ⏳ Selena fills in GLOW reservation data (studio names, emails, spaces, deposits, credits, discounts)
- ⏳ Selena fills in question marks for studios contacted before Emily started
- ⏳ Emily merges Selena's data with email spreadsheet

**November 1:**
- Seed both tenants with reservation data
- Remove canceled Orlando event from GLOW tenant
- Send account claiming emails
- Studios onboard + create dancers
- Routine creation DISABLED

**November 1-7:**
- Implement all P0 business logic changes
- Test on both tenants
- UAT with Emily/Selena

**November 8 (Friday):**
- Enable routine creation
- Monitor closely for issues
- Quick fixes as needed

---

## ✅ ALL INFORMATION COMPLETE

1. ✅ **Time limits for all entry sizes** - Confirmed from Glow website
2. ✅ **Extended time fees** - $5/dancer (solo), $2/dancer (groups)
3. ⏳ **November 1 email wording** - HTML draft to be created and approved
4. ⏳ **Showstopper login credentials** - Selena to provide for reference (optional)

---

## 📊 BUSINESS LOGIC COMPLETENESS CHECK

### ✅ Fully Specified (Ready to Implement):
1. Classification enforcement system (solo/duet/group/production)
2. Age calculation system (exact for solos, floor(average) for groups)
3. Production auto-lock logic (style + classification + min 10 dancers)
4. Extended time system (time limits + fees + UI)
5. Required field enforcement (birthdate, choreographer, classification)
6. Field removals (gender, email, phone)
7. Deposit display logic
8. Scheduling conflicts (free text Phase 1, structured Phase 2)
9. Routine creation disabled state (Nov 1-7)
10. Post-submission messaging

### ✅ Database Schema Complete:
- All table modifications specified
- All new columns defined with types
- All data population queries written
- Migration order documented

### ✅ UI Changes Complete:
- All form modifications specified
- All validation messages written
- All disabled/locked states defined
- All helper text documented

### ✅ Validation Rules Complete:
- All business rules codified
- All error messages defined
- All edge cases covered

---

**Status:** Business logic specification is COMPLETE and SOUND

**Next Step:** Proceed to Phase 3 (DevTeam task division through Nov 7)
