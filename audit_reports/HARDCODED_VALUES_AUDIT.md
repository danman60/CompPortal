# Hardcoded Values Audit

**Audit Date:** October 24, 2025
**Production Launch:** October 27, 2025 (3 days)
**Auditor:** Opus Pre-Production Audit

---

## Executive Summary

- **Hardcoded prices:** 1 (tax rate)
- **Hardcoded categories:** 8+ instances
- **Sample data references:** 5
- **Production readiness:** PARTIAL PASS (tax rate acceptable, categories not)

### Critical Findings
1. **HARDCODED TAX RATE:** 13% HST hardcoded in invoice.ts:192
2. **EMPWR DEFAULTS FILE:** Entire file with competition-specific settings
3. **DEMO DATA IN PRODUCTION:** Demo pages with sample categories
4. **HARDCODED DANCE STYLES:** Multiple files contain hardcoded dance categories

---

## BLOCKER: Hardcoded Prices

### 1. Tax Rate - ACCEPTABLE WITH CONDITIONS
**File:** src/server/routers/invoice.ts:192
**Code:**
```typescript
const taxRate = 0.13; // Hardcoded 13% HST as per requirements
```
**Risk:** Different provinces have different tax rates (Ontario 13%, Alberta 5%, BC 12%)
**Current Status:** Comment says "as per requirements" - may be intentional
**Recommendation:** Move to competition settings or tenant settings
**Fix:**
```typescript
// Get from competition settings
const taxRate = competition.tax_rate || 0.13; // Default to 13% HST

// Or from tenant settings based on location
const taxRate = getTaxRateForProvince(competition.province) || 0.13;
```

### 2. Fee Validation Limits
**File:** src/lib/validators/businessRules.ts:327
**Code:**
```typescript
export function validateFeeRange(fee: number, min: number = 0, max: number = 10000): void {
```
**Risk:** $10,000 max might be too low for large competitions
**Fix:** Move to configuration or increase limit

---

## BLOCKER: Hardcoded Categories/Divisions

### 1. EMPWR Defaults File - ENTIRE FILE
**File:** src/lib/empwrDefaults.ts
**Issue:** Complete competition configuration hardcoded
**Content:**
- Age divisions (Micro, Mini, Junior, Teen, Senior, Adult)
- Dance categories (Tap, Jazz, Contemporary, Hip Hop, etc.)
- Entry fees (specific dollar amounts)
- Scoring ranges (Bronze 81-83.99, Silver 84-86.99, etc.)
- Entry size categories (Solo, Duet/Trio, Small Group, Large Group)

**Risk:** Every tenant gets EMPWR's settings by default
**Fix:** Delete file, load from database:
```typescript
// Replace with:
const settings = await prisma.competition_settings.findMany({
  where: { competition_id }
});
```

### 2. Demo Pages with Hardcoded Data
**File:** src/app/demo/judge-scoring/page.tsx
**Lines:** 23, 34, 62
```typescript
category: 'Contemporary',
category: 'Jazz',
category: 'Hip Hop',
```
**Risk:** Demo data could leak into production
**Fix:** Mark clearly as demo or remove from production build

### 3. Email Manager Sample Data
**File:** src/components/EmailManager.tsx
**Lines:** 85, 103, 108
```typescript
category: 'Contemporary',
category: 'Jazz',
```
**Risk:** Test data in production component
**Fix:** Use dynamic data from database

---

## Sample/Placeholder Data

### 1. Dance Style Settings Component
**File:** src/app/dashboard/settings/tenant/components/DanceStyleSettings.tsx:71
**Code:**
```typescript
{ name: 'Tap', description: 'Tap dance with percussion sounds' },
```
**Risk:** Hardcoded placeholder in settings management
**Fix:** Load initial values from database

### 2. IP Whitelist Examples
**File:** src/server/routers/ipWhitelist.ts:63
**Code:**
```typescript
message: 'Invalid IP address or CIDR notation. Examples: 192.168.1.1 or 192.168.1.0/24',
```
**Risk:** None - this is helpful example text
**Status:** ACCEPTABLE

### 3. Business Rules Test Data
**File:** src/lib/validators/businessRules.ts:144-145, 186-187
**Code:**
```typescript
* // Validate a $75 fee for a duo (base $50 + $12.50 per dancer × 2)
* await validateEntryFee('duo-category-id', 2, 75.00);
```
**Risk:** None - these are comments/examples
**Status:** ACCEPTABLE

---

## Invoice Calculation Audit

### Current Implementation
**File:** src/server/routers/invoice.ts:170-195
**Pricing Source:** Mixed (database for entry fees, hardcoded for tax)
**Issues:**
1. Tax rate hardcoded at 13%
2. No discount mechanism
3. No credits mechanism as per spec
4. Invoice number format uses timestamp (non-sequential)

### Required from Spec
**Phase 1 spec lines 658-722:**
- Discount percent (0, 5, 10, or 15%)
- Credits as JSONB array
- Tax calculation on (subtotal - discount - credits)
- Sequential invoice numbering

**Current vs Spec:**
```typescript
// Current (invoice.ts:205)
invoiceNumber: `INV-${competition.year}-${studio.code || 'UNKNOWN'}-${Date.now()}`

// Should be (sequential)
invoiceNumber: `INV-${competition.year}-${String(nextNumber).padStart(5, '0')}`
```

---

## Entry Validation Audit

### Age Divisions
**Source:** Loaded from EMPWR defaults
**Should be:** From tenant/competition settings
**Risk:** Wrong age divisions for different competitions

### Dance Categories
**Source:** Hardcoded in multiple places
**Should be:** From database dance_categories table
**Risk:** Categories don't match competition offerings

### Entry Fees
**Source:** From database (entry_size_categories table)
**Status:** CORRECT - properly fetched from database

---

## Configuration That Should Be Dynamic

### 1. Scoring Ranges
**Currently:** empwrDefaults.ts:70-77
```typescript
{ name: 'Silver', minScore: 84, maxScore: 86.99 },
{ name: 'Gold', minScore: 87, maxScore: 89.99 },
```
**Should be:** competitions.scoring_ranges JSONB field
**Fix:** Already exists in DB, just not being used

### 2. Title Division Settings
**Currently:** empwrDefaults.ts:129-141
**Should be:** competitions.title_division_settings JSONB
**Fix:** Already exists in DB, just not being used

### 3. Special Programs
**Currently:** empwrDefaults.ts:143-156
**Should be:** competitions.special_programs_settings JSONB
**Fix:** Already exists in DB, just not being used

---

## Recommendations

### IMMEDIATE (Before Production)
1. **DELETE empwrDefaults.ts** or rename to `defaultSettingsTemplate.ts`
2. **FIX TAX RATE:** Move to competition settings (already has field)
3. **REMOVE HARDCODED CATEGORIES:** Load from database tables
4. **CLEAR DEMO DATA:** Remove or clearly mark demo pages

### HIGH PRIORITY (Day 1 Patch)
1. Load all settings from database JSONB fields
2. Create settings management UI for Competition Directors
3. Implement proper invoice numbering sequence
4. Add discount/credit mechanisms per spec

### MEDIUM PRIORITY (Week 1)
1. Create default settings templates (not hardcoded)
2. Add province-based tax calculation
3. Implement settings inheritance (tenant → competition)

---

## SQL Migration Script

```sql
-- 1. Ensure competition has tax rate
UPDATE competitions
SET tax_rate = 0.13
WHERE tax_rate IS NULL OR tax_rate = 0;

-- 2. Populate scoring ranges if empty
UPDATE competitions
SET scoring_ranges = '{
  "bronze": [81, 83.99],
  "silver": [84, 86.99],
  "gold": [87, 89.99],
  "titanium": [90, 92.99],
  "platinum": [93, 95.99],
  "crystal": [96, 100]
}'::jsonb
WHERE scoring_ranges IS NULL;

-- 3. Create sequence for invoice numbers
CREATE SEQUENCE IF NOT EXISTS invoice_number_seq
  START WITH 1
  INCREMENT BY 1
  NO MINVALUE
  NO MAXVALUE
  CACHE 1;

-- 4. Add invoice number sequence to invoices
ALTER TABLE invoices
ADD COLUMN IF NOT EXISTS invoice_number VARCHAR(50) UNIQUE;
```

---

## Code Cleanup Script

```typescript
// Replace empwrDefaults.ts with:
// src/lib/settings/defaultTemplate.ts

export const DEFAULT_SETTINGS_TEMPLATE = {
  // These are TEMPLATES, not hardcoded values
  // Always load actual values from database

  ageDivisions: [
    // Template only - load from tenant/competition settings
  ],

  danceCategories: [
    // Template only - load from dance_categories table
  ],

  scoringRanges: {
    // Template only - load from competition.scoring_ranges
  }
};

// New function to load settings
export async function loadCompetitionSettings(competitionId: string) {
  const competition = await prisma.competitions.findUnique({
    where: { id: competitionId },
    include: {
      tenant: true,
    }
  });

  // Use competition settings, fall back to tenant, then defaults
  return {
    taxRate: competition.tax_rate || competition.tenant.tax_rate || 0.13,
    scoringRanges: competition.scoring_ranges || competition.tenant.scoring_system_settings,
    ageDivisions: competition.age_division_settings || competition.tenant.age_division_settings,
    // etc.
  };
}
```

---

## Risk Assessment

**Production Readiness: 🟡 MEDIUM RISK**

The hardcoded tax rate is documented and might be intentional for Ontario-only launch. The bigger concern is the EMPWR defaults file which will make all competitions look like EMPWR competitions. This MUST be addressed before multi-tenant production.

**Minimum Required for Launch:**
1. Rename/remove empwrDefaults.ts
2. Confirm tax rate is intentionally 13% for launch
3. Load dance categories from database
4. Remove hardcoded categories from components

**Estimated Time:** 3-4 hours for critical cleanup

---

## Testing Checklist

```typescript
// Test different tenant settings
describe('Multi-tenant Settings', () => {
  it('should load tenant-specific tax rate', async () => {
    const invoice = await createInvoice({ tenantId: 'alberta-tenant' });
    expect(invoice.taxRate).toBe(0.05); // Alberta GST only
  });

  it('should load competition-specific categories', async () => {
    const categories = await loadCategories({ competitionId: 'ballet-comp' });
    expect(categories).not.toContain('Hip Hop'); // Ballet competition
  });
});
```

---

*End of Hardcoded Values Audit*