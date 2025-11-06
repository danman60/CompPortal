# Implementation Plan: November 1 Launch + Routine Creation

**Created:** October 30, 2025
**Launch Date:** November 1, 2025 (Accounts + Dancers only)
**Routine Creation:** Post-Nov 1 (after P0 implementation)

**Sources:**
- 2-hour demo meeting transcript with Emily (EMPWR) + Selena (GLOW)
- Daniel's handwritten notes
- Critical business logic discoveries

---

## 🎯 LAUNCH STRATEGY

### Phase 1A: November 1 (ACCOUNTS + DANCERS ONLY)
**Scope:**
- ✅ Account claiming via email invitation
- ✅ Onboarding workflow
- ✅ Dancer creation/import with CSV
- ⚠️ **Routine creation LOCKED** (not ready yet)

### Phase 1B: Post-Nov 1 (ROUTINE CREATION)
**Prerequisites:** All P0 features implemented and tested
**Scope:**
- Routine creation with business logic
- Summary submission
- Invoice generation workflow

---

## 🚨 P0 CRITICAL FEATURES (BLOCKERS FOR ROUTINE CREATION)

### 1. Classification Enforcement System ⭐ HIGHEST PRIORITY

**1.1 Dancer Classification Required**
```typescript
// Database migration
ALTER TABLE dancers
ALTER COLUMN classification_id SET NOT NULL;

// UI: Dancer creation form
- Make classification dropdown REQUIRED
- Show error if not selected
- CSV import: Validate classification exists for all rows
```

**1.2 Solo Classification Rules (Strict Lock)**
```typescript
// Rule: Solo classification MUST match dancer classification
if (entry_size === "Solo") {
  const dancer = dancers[0];
  entry.classification_id = dancer.classification_id; // LOCKED
  entry.classification_editable = false;
}

// UI: Classification dropdown disabled for solos
// Display: "Classification: Emerald (based on dancer)"
```

**1.3 Duet/Trio Classification Rules (Highest Wins)**
```typescript
// Rule: Routine classification = highest dancer level, can bump up only
if (["Duet", "Trio"].includes(entry_size)) {
  const highest = getHighestClassification(dancers);

  // Auto-select highest
  entry.suggested_classification_id = highest.id;

  // Validation
  if (entry.classification_id < highest.id) {
    throw new Error(`Minimum ${highest.name} (based on highest dancer)`);
  }

  // Allow bump up
  const classifications = getOrderedClassifications(tenant_id);
  const allowedLevels = classifications.filter(c => c.id >= highest.id);
}
```

**1.4 Group/Line Classification Rules (60% Majority)**
```typescript
// Rule: Majority classification, can bump up one level
if (["Small Group", "Large Group", "Line", "Superline"].includes(entry_size)) {
  const majority = calculateMajorityClassification(dancers); // 60%+ rule

  // Auto-select majority
  entry.suggested_classification_id = majority.id;

  // Validation
  if (entry.classification_id < majority.id) {
    throw new Error(`Minimum ${majority.name} (60% majority rule)`);
  }

  if (entry.classification_id > majority.id + 1) {
    throw new Error("Can only bump up one level from majority");
  }
}

// Helper function
function calculateMajorityClassification(dancers) {
  const counts = {};
  dancers.forEach(d => {
    counts[d.classification_id] = (counts[d.classification_id] || 0) + 1;
  });

  // Find majority (60%+)
  for (const [classId, count] of Object.entries(counts)) {
    if (count / dancers.length >= 0.6) {
      return getClassification(classId);
    }
  }

  // No clear majority: return highest
  return getHighestClassification(dancers);
}
```

**Files to Modify:**
- `src/components/EntryCreationForm.tsx` - Add classification logic
- `src/server/routers/entry.ts` - Add validation
- `src/lib/entryValidation.ts` - NEW - Classification rules

**Estimated Time:** 8 hours

---

### 2. Production Entry Auto-Lock Logic

**2.1 Add "Production" Classification**
```sql
-- GLOW tenant
INSERT INTO classifications (tenant_id, name, level, description)
VALUES ('4b9c1713-40ab-460b-8dda-5a8cf6cbc9b5', 'Production', 99, 'Production entries only');

-- EMPWR tenant
INSERT INTO classifications (tenant_id, name, level, description)
VALUES ('00000000-0000-0000-0000-000000000001', 'Production', 99, 'Production entries only');
```

**2.2 Update Production Entry Size**
```sql
-- Change minimum from 1 to 10
UPDATE entry_size_categories
SET min_size = 10
WHERE name = 'Production';
```

**2.3 Production Auto-Lock Logic**
```typescript
// When entry_size_category.name === "Production"
if (entrySizeCategory.name === "Production") {
  // Lock dance category to "Production"
  const productionCategory = await prisma.dance_categories.findFirst({
    where: { tenant_id, name: "Production" }
  });
  entry.dance_category_id = productionCategory.id;
  entry.dance_category_editable = false;

  // Lock classification to "Production"
  const productionClass = await prisma.classifications.findFirst({
    where: { tenant_id, name: "Production" }
  });
  entry.classification_id = productionClass.id;
  entry.classification_editable = false;

  // Enforce minimum 10 dancers
  if (dancers.length < 10) {
    throw new Error("Productions require minimum 10 dancers");
  }
}

// UI: Show locked fields with explanation
// "Dance Style: Production (auto-set for productions)"
// "Classification: Production (auto-set for productions)"
```

**Files to Modify:**
- `src/components/EntryCreationForm.tsx` - Add production locks
- `src/server/routers/entry.ts` - Add validation
- Database migration for classifications

**Estimated Time:** 3 hours

---

### 3. Age Calculation Display Fix

**3.1 Calculate Scheduling Age (Not Award Age)**
```typescript
function calculateSchedulingAge(dancers: Dancer[], entry_size: string): number {
  const cutoffDate = new Date("2025-12-31");

  if (entry_size === "Solo") {
    // Exact age for solos
    return calculateAge(dancers[0].birthdate, cutoffDate);
  }

  // Average age for groups, drop decimal
  const ages = dancers.map(d => calculateAge(d.birthdate, cutoffDate));
  const avgAge = ages.reduce((sum, age) => sum + age, 0) / ages.length;
  return Math.floor(avgAge);
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

**3.2 Display Age Number (Not Group Name)**
```typescript
// WRONG (current)
<span>Age Group: Senior</span>

// CORRECT (new)
<span>Age: {calculatedAge}-year-old</span>
// Example: "Age: 7-year-old" or "Age: 12-year-old"

// Make read-only/auto-calculated, not editable
```

**Files to Modify:**
- `src/lib/ageCalculation.ts` - NEW - Age calculation utilities
- `src/components/EntryCreationForm.tsx` - Display age number
- Database: age_groups table used ONLY for awards, not routine creation

**Estimated Time:** 2 hours

---

### 4. Scheduling Notes Per Routine

**4.1 Database Migration**
```sql
ALTER TABLE competition_entries
ADD COLUMN scheduling_notes TEXT;

COMMENT ON COLUMN competition_entries.scheduling_notes IS
'Optional notes from studio about day preferences or conflicts for this routine';
```

**4.2 UI: Routine Creation Form**
```tsx
<FormField label="Scheduling Notes (Optional)">
  <Textarea
    name="scheduling_notes"
    placeholder="e.g., Cannot dance on Saturday morning, prefer Sunday"
    maxLength={500}
    rows={3}
  />
  <FormDescription>
    Specify any day/time preferences or conflicts for this routine
  </FormDescription>
</FormField>
```

**4.3 Pre-Submit Warning Modal**
```tsx
// Before summary submission
<AlertDialog>
  <AlertDialogContent>
    <AlertDialogHeader>
      <AlertDialogTitle>Confirm Submission</AlertDialogTitle>
      <AlertDialogDescription>
        Please ensure you've submitted any scheduling conflicts before proceeding.
        Once submitted, schedule changes may not be possible.
      </AlertDialogDescription>
    </AlertDialogHeader>
    <AlertDialogFooter>
      <AlertDialogCancel>Review Entries</AlertDialogCancel>
      <AlertDialogAction>Confirm & Submit</AlertDialogAction>
    </AlertDialogFooter>
  </AlertDialogContent>
</AlertDialog>
```

**Files to Modify:**
- Database migration for scheduling_notes
- `src/components/EntryCreationForm.tsx` - Add notes field
- `src/components/SummarySubmission.tsx` - Add warning modal

**Estimated Time:** 2 hours

---

### 5. Required Field Enforcement (Handwritten Notes)

**5.1 Choreographer Required**
```typescript
// Database migration
ALTER TABLE competition_entries
ALTER COLUMN choreographer SET NOT NULL;

// UI validation
<FormField label="Choreographer" required>
  <Input
    name="choreographer"
    required
    placeholder="Enter choreographer name"
  />
</FormField>
```

**5.2 Birth Date Required**
```typescript
// Database migration
ALTER TABLE dancers
ALTER COLUMN date_of_birth SET NOT NULL;

// UI validation
<FormField label="Date of Birth" required>
  <DatePicker
    name="date_of_birth"
    required
    placeholder="MM/DD/YYYY"
  />
</FormField>

// CSV import: Reject rows with missing birthdates
```

**Files to Modify:**
- Database migrations
- `src/components/EntryCreationForm.tsx` - Choreographer validation
- `src/components/DancerCreationForm.tsx` - Birthdate validation
- `src/components/DancerCSVImport.tsx` - Birthdate required check

**Estimated Time:** 2 hours

---

### 6. Deposit Display on Account Claiming

**6.1 Show Deposit in Dashboard**
```typescript
// After account claiming, show in reservation details
<ReservationCard>
  <h3>{competition.name}</h3>
  <p>Reserved Spaces: {reservation.approved_slots}</p>
  <p className="text-green-600 font-semibold">
    Deposit Paid: ${reservation.deposit_paid || 0}
  </p>
  {reservation.credits_owed > 0 && (
    <p className="text-blue-600">
      Credits: ${reservation.credits_owed}
    </p>
  )}
</ReservationCard>
```

**6.2 Seeding Workflow**
```typescript
// When seeding from Emily/Selena's spreadsheet
await prisma.reservations.create({
  data: {
    studio_id,
    competition_id,
    approved_slots,
    status: 'approved',
    deposit_paid: row.deposit_amount, // FROM SPREADSHEET
    credits_owed: row.credits, // FROM SPREADSHEET
    discount_percentage: row.discount, // FROM SPREADSHEET
  }
});
```

**Files to Modify:**
- `src/app/dashboard/page.tsx` - Show deposit on dashboard
- `src/app/dashboard/reservations/page.tsx` - Show in reservation list
- Seeding script for Emily/Selena data

**Estimated Time:** 2 hours

---

## 🟡 P1 HIGH PRIORITY (Launch Week)

### 7. Remove Gender Field Entirely

**7.1 Database Migration**
```sql
-- Remove from dancers table
ALTER TABLE dancers
DROP COLUMN gender;

-- Remove from any forms/components
```

**7.2 Code Cleanup**
- Remove from DancerCreationForm
- Remove from DancerEditForm
- Remove from CSV import template
- Remove from all dancer-related queries

**Files to Modify:**
- Database migration
- `src/components/DancerCreationForm.tsx`
- `src/components/DancerCSVImport.tsx`
- All dancer queries

**Estimated Time:** 1 hour

---

### 8. Remove Email/Phone from Dancer Creation

**8.1 Database Migration**
```sql
-- Remove from dancers table
ALTER TABLE dancers
DROP COLUMN email,
DROP COLUMN phone;
```

**8.2 Code Cleanup**
- Remove from DancerCreationForm
- Remove from CSV import template
- Keep email/phone on studios table (studio contact info)

**Files to Modify:**
- Database migration
- `src/components/DancerCreationForm.tsx`
- `src/components/DancerCSVImport.tsx`

**Estimated Time:** 1 hour

---

### 9. Remove Running Price Total Before Summary

**9.1 Hide Pricing During Routine Creation**
```typescript
// REMOVE from routine creation form
// <div>Running Total: ${runningTotal}</div>

// ONLY show pricing after summary submission, when CD creates invoice
```

**9.2 Show Pricing at Invoice Generation**
```typescript
// CD creates invoice -> calculates total
const invoiceTotal = calculateInvoiceTotal({
  entries,
  deposit_paid,
  credits_owed,
  discount_percentage,
  global_entry_fee
});

// Show final total with discounts applied
```

**Files to Modify:**
- `src/components/EntryCreationForm.tsx` - Remove price display
- `src/components/EntriesList.tsx` - Remove running totals
- `src/components/InvoiceGeneration.tsx` - Show final total

**Estimated Time:** 1 hour

---

### 10. Add 24-Hour Wait Warning on Summary Submission

**10.1 Confirmation Message**
```tsx
// After successful summary submission
<Alert variant="success">
  <AlertTitle>Summary Submitted Successfully</AlertTitle>
  <AlertDescription>
    Your routine summary has been submitted. Please allow up to 24 hours
    for invoice generation. You will receive an email when your invoice is ready.
  </AlertDescription>
</Alert>
```

**Files to Modify:**
- `src/components/SummarySubmission.tsx` - Add confirmation message

**Estimated Time:** 30 minutes

---

### 11. Fix Title Duplication Bug

**11.1 Investigate and Fix**
- Check EntryCreationForm for duplicate title rendering
- Check database schema for duplicate title columns
- Verify CSV import doesn't duplicate titles

**Files to Check:**
- `src/components/EntryCreationForm.tsx`
- `src/components/EntryCard.tsx`
- Database: competition_entries.title field

**Estimated Time:** 1 hour (investigation + fix)

---

### 12. Add Nav Back Button to New Routine v2

**12.1 Add Navigation**
```tsx
// Entry creation page
<div className="mb-4">
  <Button variant="ghost" onClick={() => router.back()}>
    <ChevronLeft className="mr-2 h-4 w-4" />
    Back to Entries
  </Button>
</div>

// Or use breadcrumbs
<Breadcrumbs>
  <BreadcrumbItem href="/dashboard">Dashboard</BreadcrumbItem>
  <BreadcrumbItem href="/dashboard/entries">Entries</BreadcrumbItem>
  <BreadcrumbItem current>New Routine</BreadcrumbItem>
</Breadcrumbs>
```

**Files to Modify:**
- `src/app/dashboard/entries-rebuild/create/page.tsx` - Add back button

**Estimated Time:** 30 minutes

---

## 📋 IMPLEMENTATION ORDER

### Pre-Nov 1 (TONIGHT/TOMORROW)
1. ✅ Receive Selena's data spreadsheet (waiting on her)
2. ✅ Seed EMPWR + GLOW tenants with reservation data
3. ✅ Test account claiming workflow
4. ✅ Draft email template for studios

### Nov 1 Launch
- ✅ Send account claiming emails
- ✅ Studios onboard + create dancers
- ⚠️ Routine creation **LOCKED**

### Post-Nov 1 (Before Routine Creation Opens)

**Week 1: P0 Critical Features (19 hours)**
1. Classification enforcement system (8h)
2. Production auto-lock logic (3h)
3. Age calculation display fix (2h)
4. Scheduling notes per routine (2h)
5. Required field enforcement (2h)
6. Deposit display on claiming (2h)

**Week 2: P1 High Priority (5.5 hours)**
7. Remove gender field (1h)
8. Remove email/phone from dancers (1h)
9. Remove running price total (1h)
10. Add 24-hour wait warning (0.5h)
11. Fix title duplication bug (1h)
12. Add nav back button (0.5h)

**Week 3: Testing + Polish**
- E2E testing on both tenants
- Classification logic verification
- Age calculation verification
- Production entry testing
- User acceptance testing with Emily/Selena

**Week 4: Routine Creation Launch**
- Open routine creation to studios
- Monitor for issues
- Quick fixes as needed

---

## 🧪 TESTING CHECKLIST

### Classification Logic Testing
- [ ] Solo with Emerald dancer → Auto-locked to Emerald
- [ ] Solo with Sapphire dancer → Auto-locked to Sapphire
- [ ] Attempt to change solo classification → Blocked
- [ ] Duet with Emerald + Sapphire → Minimum Sapphire
- [ ] Duet allows bump up to Titanium → Allowed
- [ ] Duet attempt to select Emerald → Blocked
- [ ] Group with 7 Emerald + 3 Sapphire → Suggests Emerald
- [ ] Group allows bump up one level → Allowed
- [ ] Group attempt to bump up two levels → Blocked

### Production Logic Testing
- [ ] Select Production entry size → Dance style locked to Production
- [ ] Select Production entry size → Classification locked to Production
- [ ] Production with 9 dancers → Validation error
- [ ] Production with 10 dancers → Allowed
- [ ] Attempt to change dance style for production → Blocked

### Age Calculation Testing
- [ ] Solo with 7-year-old → Displays "7-year-old"
- [ ] Duet with 6 + 7 year olds → Displays "6-year-old" (6.5 → 6)
- [ ] Group with mixed ages → Displays floor(average)
- [ ] Age as of Dec 31, 2025 → Correct calculation

### Deposit Display Testing
- [ ] Claimed account shows deposit paid
- [ ] Claimed account shows credits owed
- [ ] Claimed account shows discount percentage
- [ ] Zero deposit shows correctly

### Required Field Testing
- [ ] Dancer creation without classification → Blocked
- [ ] Dancer creation without birthdate → Blocked
- [ ] Routine creation without choreographer → Blocked
- [ ] CSV import with missing classification → Rejected
- [ ] CSV import with missing birthdate → Rejected

---

## 📊 ESTIMATED TOTAL TIME

**P0 Features:** 19 hours
**P1 Features:** 5.5 hours
**Testing:** 8 hours
**Buffer (20%):** 6.5 hours

**Total:** ~39 hours (~1 week full-time or 2 weeks part-time)

---

## 🚀 SUCCESS CRITERIA

### Nov 1 Launch Success:
- [ ] All studios receive account claiming emails
- [ ] Studios can onboard successfully
- [ ] Studios can create/import dancers with required fields
- [ ] Deposits/credits visible on dashboard
- [ ] Routine creation clearly marked as "Coming Soon"

### Routine Creation Launch Success:
- [ ] All P0 features implemented and tested
- [ ] Classification logic prevents misclassified entries
- [ ] Production entries auto-lock correctly
- [ ] Age displays as numbers, not group names
- [ ] Scheduling notes captured per routine
- [ ] No manual CD intervention needed for classification
- [ ] Both EMPWR + GLOW tenants tested

---

## 📞 COMMUNICATION PLAN

### Pre-Nov 1:
- Email draft for account claiming
- Confirm data seeded correctly with Emily/Selena

### Nov 1:
- Send claiming emails
- Monitor support channel for issues
- Quick fixes for onboarding bugs

### Post-Nov 1:
- Weekly updates to Emily/Selena on progress
- Demo classification logic when ready
- UAT session before opening routine creation

### Routine Creation Launch:
- Email announcement: "Routine creation now open"
- Include guide on new classification logic
- Available for support during first week

---

**Next Actions:**
1. Wait for Selena's spreadsheet (tonight)
2. Seed both tenants (tonight/tomorrow)
3. Launch Nov 1 (accounts + dancers)
4. Start P0 implementation immediately after launch
5. Target routine creation launch: ~2-3 weeks post-Nov 1

**Questions for User:**
- Confirm Nov 1 launch for accounts only is acceptable?
- Confirm ~2-3 week timeline for routine creation launch?
- Any additional business logic not captured in transcript?
