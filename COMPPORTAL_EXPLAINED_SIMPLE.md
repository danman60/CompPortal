# CompPortal Explained (8th Grade Level)

**Date:** October 30, 2025
**For:** Understanding the entire system
**Written in:** Simple, clear English

---

## What Is CompPortal?

CompPortal is a website that helps dance competition organizers run their events. Think of it like a digital toolbox that handles:

1. **Registration** - Dance studios sign up and reserve spots
2. **Entries** - Studios submit their dance routines
3. **Judging** - Judges score the performances
4. **Results** - Winners are calculated and announced

**Key Feature:** It's **multi-tenant**, which means multiple competitions (EMPWR, Glow) can use the same system but never see each other's data. Like having separate apartments in the same building.

---

## The Big Picture (How It All Fits Together)

```
┌─────────────────────────────────────────────────────────────┐
│                         THE USERS                            │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  Competition Director (CD)     Studio Director (SD)         │
│  "I run the competition"       "I manage my dance studio"   │
│          ↓                              ↓                    │
│     Approves studios            Registers dancers           │
│     Sets up events              Creates entries             │
│     Views reports               Pays invoices               │
│                                                              │
└──────────────────────────┬──────────────────────────────────┘
                           ↓
┌─────────────────────────────────────────────────────────────┐
│                      THE WEBSITE                             │
│                    (Next.js Frontend)                        │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  React Components → Show buttons, forms, tables             │
│  Pages → Different screens (/dashboard, /entries)           │
│  Styling → Purple/blue gradient theme                       │
│                                                              │
└──────────────────────────┬──────────────────────────────────┘
                           ↓
┌─────────────────────────────────────────────────────────────┐
│                       THE BRIDGE                             │
│                      (tRPC Router)                           │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  "Hey database, get me all entries for this studio"         │
│  "Hey database, create a new dancer"                        │
│  Checks: Are you logged in? Do you own this data?          │
│                                                              │
└──────────────────────────┬──────────────────────────────────┘
                           ↓
┌─────────────────────────────────────────────────────────────┐
│                      THE DATABASE                            │
│                   (PostgreSQL via Supabase)                  │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  Stores everything:                                          │
│  - Tenants (EMPWR, Glow)                                    │
│  - Studios, Dancers, Entries                                │
│  - Invoices, Reservations, Scores                           │
│                                                              │
│  Each row has tenant_id = Which competition owns this?      │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

---

## The Stack (What Technology Powers This?)

### 1. **Frontend (What You See)**

**Next.js 15 + React**
- **What it is:** A framework for building websites
- **Why we use it:** Makes it easy to show different pages and handle user clicks
- **Example:** When you click "Create Entry", React shows you a form with dropdowns

**TypeScript**
- **What it is:** JavaScript but with type checking
- **Why we use it:** Catches typos before they become bugs
- **Example:** If you try to put text where a number should go, TypeScript says "Nope!"

**TailwindCSS**
- **What it is:** Pre-made styling classes
- **Why we use it:** Fast styling without writing custom CSS
- **Example:** `bg-purple-900` = purple background

**File Structure:**
```
src/
├── app/                    ← Pages (what URLs show)
│   ├── dashboard/          ← Main dashboard
│   ├── login/              ← Login page
│   └── signup/             ← Signup page
├── components/             ← Reusable UI pieces
│   ├── rebuild/            ← New, better components
│   │   └── entries/        ← Entry creation forms
│   └── [old components]    ← Legacy (being replaced)
└── lib/                    ← Helper functions
    ├── trpc.ts             ← Bridge to backend
    └── empwrDefaults.ts    ← Reference data
```

**How it works:**
1. User visits `empwr.compsync.net`
2. Next.js reads the subdomain ("empwr")
3. Shows EMPWR's purple theme + logo
4. User logs in → Next.js saves their session
5. User clicks around → React updates the page instantly

---

### 2. **Backend (The Brain)**

**tRPC (The Bridge)**
- **What it is:** Connects frontend to database
- **Why we use it:** Type-safe API (no guessing what data looks like)
- **Example:** `trpc.entry.create.mutate(data)` → Creates entry in database

**File Structure:**
```
src/server/
├── routers/                ← API endpoints
│   ├── entry.ts            ← Entry creation, updates
│   ├── dancer.ts           ← Dancer management
│   ├── lookup.ts           ← Settings (age groups, styles)
│   ├── competition.ts      ← Competition setup
│   ├── reservation.ts      ← Studio reservations
│   └── invoice.ts          ← Billing
└── trpc.ts                 ← tRPC setup
```

**How it works:**
1. Frontend says: "Create an entry with this data"
2. tRPC checks: "Are you logged in? Do you have permission?"
3. tRPC validates: "Does this data make sense?"
4. tRPC tells database: "INSERT INTO competition_entries..."
5. Database saves it and returns ID
6. tRPC sends back: "Success! Entry ID: 12345"
7. Frontend updates: "Entry created!"

**Example Flow (Creating an Entry):**
```typescript
// Frontend (EntryCreateFormV2.tsx)
const createEntry = trpc.entry.create.useMutation();

const handleSubmit = () => {
  createEntry.mutate({
    title: "My Dance Routine",
    category_id: "ballet-id",
    classification_id: "competitive-id",
    participants: [dancer1, dancer2],
  });
};

// Backend (entry.ts)
create: protectedProcedure
  .input(entryInputSchema)  // ← Validate data
  .mutation(async ({ ctx, input }) => {
    // 1. Check permissions
    if (!ctx.tenantId) throw Error("Not logged in");

    // 2. Calculate fee
    const fee = calculateFee(input.participants.length);

    // 3. Save to database
    const entry = await prisma.competition_entries.create({
      data: {
        ...input,
        entry_fee: fee,
        tenant_id: ctx.tenantId,  // ← Tenant isolation!
      },
    });

    return entry;
  });
```

---

### 3. **Database (Where Everything Lives)**

**PostgreSQL via Supabase**
- **What it is:** A spreadsheet on steroids
- **Why we use it:** Fast, reliable, handles complex relationships
- **Example:** Each entry knows which competition, studio, and dancers it belongs to

**Prisma (The Translator)**
- **What it is:** Converts TypeScript → SQL
- **Why we use it:** Don't have to write raw SQL (safer, faster)
- **Example:** `prisma.dancers.findMany()` → `SELECT * FROM dancers`

**Key Tables:**
```
tenants
├── id (EMPWR, Glow)
├── name
└── subdomain

↓ belongs to

competitions
├── id
├── tenant_id (← Which tenant owns this?)
├── name ("Spring Showcase 2025")
└── date

↓ has many

competition_entries
├── id
├── tenant_id (← Always filtered!)
├── competition_id
├── studio_id
├── title ("My Ballet Solo")
├── category_id (Ballet)
├── classification_id (Competitive)
├── age_group_id (Junior)
└── entry_fee ($115)

↓ has many

entry_participants
├── entry_id
├── dancer_id
└── role ("Lead Dancer")

↓ links to

dancers
├── id
├── tenant_id
├── studio_id
├── first_name
├── last_name
└── date_of_birth
```

**The Golden Rule: tenant_id Everywhere**

Every table (except a few special ones) has a `tenant_id` column. This ensures:
- EMPWR data never shows up for Glow
- Glow data never shows up for EMPWR

**Example:**
```sql
-- ❌ WRONG - Could leak data
SELECT * FROM competition_entries;

-- ✅ CORRECT - Filtered by tenant
SELECT * FROM competition_entries
WHERE tenant_id = '00000000-0000-0000-0000-000000000001';
```

---

### 4. **Authentication (Who Are You?)**

**Supabase Auth**
- **What it is:** Handles login, signup, passwords
- **Why we use it:** Secure, handles email verification
- **Example:** User signs up → Gets email → Clicks link → Account activated

**Session Flow:**
```
1. User enters email + password
2. Supabase Auth checks database
3. If correct: Creates session token (like a ticket)
4. Token stored in browser cookie
5. Every request includes token
6. Backend checks: "Is this token valid? Which user?"
7. Backend looks up user's tenant_id
8. All queries filtered by that tenant_id
```

**Roles:**
```
super_admin       → Developer (you)
competition_director → Client (EMPWR, Glow)
studio_director   → Customer (dance studios)
```

---

## How Data Flows (Real Example)

**Scenario:** Studio director creates a new dance entry

### Step 1: Frontend (User's Browser)
```typescript
// EntryCreateFormV2.tsx
const form = {
  title: "My Jazz Solo",
  category_id: "jazz-uuid",
  classification_id: "competitive-uuid",
  participants: [
    { dancer_id: "dancer1-uuid", role: "Solo Performer" }
  ]
};

// User clicks "Create Entry"
trpc.entry.create.mutate(form);
```

### Step 2: tRPC Bridge
```typescript
// entry.ts (backend)
create: protectedProcedure  // ← Must be logged in
  .input(entryInputSchema)   // ← Validate data shape
  .mutation(async ({ ctx, input }) => {
    // ctx.tenantId = "empwr-uuid" (from user's session)
    // ctx.user.role = "studio_director"

    // Security checks...
```

### Step 3: Validation & Business Logic
```typescript
// 1. Verify studio belongs to this tenant
const studio = await prisma.studios.findUnique({
  where: {
    id: input.studio_id,
    tenant_id: ctx.tenantId,  // ← Tenant isolation
  },
});
if (!studio) throw Error("Studio not found");

// 2. Calculate fee
const sizeCategory = await prisma.entry_size_categories.findUnique({
  where: { id: input.entry_size_category_id },
});
const fee = sizeCategory.base_fee +
            (sizeCategory.per_participant_fee * participants.length);

// 3. Add title upgrade if checked
if (input.is_title_upgrade) {
  fee += 30;
}
```

### Step 4: Database Transaction
```typescript
// Save to database (all-or-nothing)
const entry = await prisma.$transaction(async (tx) => {
  // Create entry
  const newEntry = await tx.competition_entries.create({
    data: {
      tenant_id: ctx.tenantId,  // ← Always include!
      competition_id: input.competition_id,
      studio_id: input.studio_id,
      title: input.title,
      category_id: input.category_id,
      classification_id: input.classification_id,
      entry_fee: fee.toString(),
      total_fee: fee.toString(),
      status: 'pending',
    },
  });

  // Create participants
  for (const participant of input.participants) {
    await tx.entry_participants.create({
      data: {
        entry_id: newEntry.id,
        dancer_id: participant.dancer_id,
        role: participant.role,
      },
    });
  }

  return newEntry;
});
```

### Step 5: Response to Frontend
```typescript
// Backend sends back:
return {
  id: entry.id,
  title: entry.title,
  entry_fee: entry.entry_fee,
  status: entry.status,
};

// Frontend receives:
createEntry.mutate(form, {
  onSuccess: (data) => {
    console.log("Entry created!", data.id);
    router.push(`/dashboard/entries/${data.id}`);
  },
  onError: (error) => {
    alert("Error: " + error.message);
  },
});
```

### Step 6: User Sees Result
- Success message appears
- Redirected to entry details page
- Entry shows up in "My Entries" list

**Total time:** ~200-500ms (super fast!)

---

## The Settings System (How Configuration Works)

### The Decision: Hardcoded Tenant Settings

**Original idea:** Let Competition Directors edit settings on the fly
**Reality:** Too complex for launch, could break existing entries

**Current approach:** Each tenant has fixed settings in lookup tables

### Lookup Tables (Source of Truth)

```
age_groups
├── id
├── tenant_id (EMPWR or Glow)
├── name ("Junior")
├── min_age (9)
├── max_age (11)
└── sort_order (3)

dance_categories
├── id
├── tenant_id
├── name ("Ballet")
├── sort_order (1)
└── is_active (true)

classifications
├── id
├── tenant_id
├── name ("Competitive")
├── description ("6+ hours/week")
└── skill_level (3)

entry_size_categories
├── id
├── tenant_id
├── name ("Solo")
├── min_participants (1)
├── max_participants (1)
├── base_fee ($115)
└── per_participant_fee (null)

scoring_tiers
├── id
├── tenant_id
├── name ("Platinum")
├── min_score (93.00)
├── max_score (95.99)
└── sort_order (5)
```

### How Settings Are Used

**1. Entry Creation Form:**
```typescript
// Frontend fetches all settings
const { data } = trpc.lookup.getAllForEntry.useQuery();

// Populates dropdowns
<select name="age_group_id">
  {data.ageGroups.map(ag => (
    <option value={ag.id}>{ag.name}</option>
  ))}
</select>
```

**2. Fee Calculation:**
```typescript
// Backend queries entry_size_categories
const sizeCategory = await prisma.entry_size_categories.findUnique({
  where: { id: entrySizeCategoryId },
});

// Calculates fee
const fee = sizeCategory.base_fee +
            (sizeCategory.per_participant_fee * participantCount);
```

**3. Scoring (Future Phase 3):**
```typescript
// Judge enters score: 94.5
// System queries scoring_tiers
const tier = await prisma.scoring_tiers.findFirst({
  where: {
    tenant_id: ctx.tenantId,
    min_score: { lte: 94.5 },
    max_score: { gte: 94.5 },
  },
});
// Result: "Platinum" tier
```

### Competition Settings Page

**What it shows:** All tenant settings (read-only)
**Why read-only:** Changing settings mid-season would break existing entries
**How to change:** Contact developer to run SQL migrations

---

## Multi-Tenant Architecture (The Apartment Building Analogy)

Think of CompPortal like an apartment building:

```
┌─────────────────────────────────────────┐
│        CompPortal Building              │
├─────────────────────────────────────────┤
│                                          │
│  Apartment 1: EMPWR                     │
│  ├── Purple theme                       │
│  ├── EMPWR logo                         │
│  ├── 50 studios                         │
│  ├── 200 dancers                        │
│  └── 150 entries                        │
│                                          │
│  Apartment 2: Glow                      │
│  ├── Pink theme                         │
│  ├── Glow logo                          │
│  ├── 30 studios                         │
│  ├── 120 dancers                        │
│  └── 80 entries                         │
│                                          │
└─────────────────────────────────────────┘
```

**How isolation works:**

1. **Subdomain routing**
   - User visits `empwr.compsync.net`
   - Middleware reads subdomain: "empwr"
   - Looks up tenant: `SELECT * FROM tenants WHERE subdomain = 'empwr'`
   - Saves tenant_id in session: `00000000-0000-0000-0000-000000000001`

2. **Every query filtered**
   ```typescript
   // User's session has ctx.tenantId
   const entries = await prisma.competition_entries.findMany({
     where: {
       tenant_id: ctx.tenantId,  // ← EMPWR can't see Glow data
     },
   });
   ```

3. **Every create includes tenant_id**
   ```typescript
   await prisma.competition_entries.create({
     data: {
       tenant_id: ctx.tenantId,  // ← New entry belongs to EMPWR
       ...otherData,
     },
   });
   ```

4. **UI customization**
   ```typescript
   // tenants table has:
   // - primary_color: "#7C3AED" (purple)
   // - logo_url: "https://..."
   // - name: "EMPWR Dance Experience"

   // App reads tenant settings and applies theme
   ```

**Security checks:**
```typescript
// ❌ BAD - No tenant filtering
const entry = await prisma.competition_entries.findUnique({
  where: { id: entryId },
});

// ✅ GOOD - Verify belongs to user's tenant
const entry = await prisma.competition_entries.findUnique({
  where: {
    id: entryId,
    tenant_id: ctx.tenantId,
  },
});
if (!entry) throw Error("Entry not found");
```

---

## The 4 Phases (How a Competition Works)

### Phase 1: Registration (Current - Live)

**What happens:**
1. Studio director creates account
2. Browses upcoming competitions
3. Submits reservation request (wants 50 spots)
4. Competition director reviews
5. Approves/adjusts (gives them 45 spots)
6. Studio director creates entries (dance routines)
7. When done, submits summary
8. Competition director generates invoice
9. Studio pays invoice

**Key Features:**
- Capacity management (only 500 spots available)
- Reservation system (reserve first, enter later)
- Fee calculation (auto-calculates from settings)
- Invoice generation (PDF)

### Phase 2: Scheduling (Not Built Yet)

**What will happen:**
1. Competition director sets up sessions (Morning, Afternoon)
2. System auto-assigns entries to time slots
3. Conflict detection (dancer can't be in 2 places)
4. Music upload (studios upload MP3s)
5. Print run sheets (schedule for backstage)

**Complexity:** High - need to optimize schedule

### Phase 3: Judging & Scoring (Not Built Yet)

**What will happen:**
1. Judges log in on tablets
2. Watch routine, enter scores (0-100)
3. System calculates average score
4. Maps to tier (Bronze, Silver, Gold, etc.)
5. Calculates placements (1st, 2nd, 3rd)
6. Groups by: session, age group, classification, size

**Complexity:** Medium - need real-time updates

### Phase 4: Results & Awards (Not Built Yet)

**What will happen:**
1. Tabulation runs (calculates winners)
2. Awards ceremony screen (project on big screen)
3. Print award certificates
4. Email results to studios
5. Archive for history

**Complexity:** Low - mostly display logic

---

## How Could This Be Simplified?

### Current Complexity Issues

**1. Dual Component System (Rebuild vs Legacy)**
```
src/components/
├── rebuild/              ← New, better components
│   └── entries/
│       └── EntryCreateFormV2.tsx  ← 800 lines
└── EntriesList.tsx       ← Old component (still used!)
```

**Problem:** Hard to know which component is actually used
**Solution:** Delete all legacy components, only keep rebuild/

---

**2. Too Many Router Files**
```
src/server/routers/
├── entry.ts              ← 1400 lines!
├── dancer.ts
├── competition.ts
├── reservation.ts
├── invoice.ts
├── lookup.ts
├── analytics.ts
├── reports.ts
├── tenantSettings.ts
└── ... 10 more files
```

**Problem:** entry.ts is massive (create, update, delete, list, stats, etc.)
**Solution:** Split into smaller files:
```
src/server/routers/entry/
├── create.ts
├── update.ts
├── delete.ts
├── list.ts
└── stats.ts
```

---

**3. Business Logic Scattered**
```
entry.ts:1085          ← Fee calculation here
invoice.ts:246         ← Fee calculation here too
CompetitionSettings... ← Fee calculation here three!
```

**Problem:** Same logic in 3 places (hard to maintain)
**Solution:** Create service layer:
```typescript
// src/services/FeeService.ts
export class FeeService {
  calculateEntryFee(participants, sizeCategory, titleUpgrade) {
    const baseFee = sizeCategory.base_fee || 0;
    const perParticipant = sizeCategory.per_participant_fee || 0;
    let fee = baseFee + (perParticipant * participants.length);

    if (titleUpgrade) fee += 30;

    return fee;
  }
}

// Use everywhere
const feeService = new FeeService();
const fee = feeService.calculateEntryFee(...);
```

---

**4. No Atomic Transactions**
```typescript
// Current code (race condition possible!)
await prisma.competitions.update({
  where: { id },
  data: { available_tokens: { decrement: 10 } },
});

// Meanwhile, another user does same thing...
// Result: Double-decrement!
```

**Problem:** Two users can reserve at same time, break capacity
**Solution:** Use database transactions with row locking:
```typescript
await prisma.$transaction(async (tx) => {
  // Lock the row
  const comp = await tx.competitions.findUnique({
    where: { id },
    select: { available_tokens: true },
  });

  // Check capacity
  if (comp.available_tokens < 10) {
    throw Error("Not enough capacity");
  }

  // Update atomically
  await tx.competitions.update({
    where: { id },
    data: { available_tokens: { decrement: 10 } },
  });
});
```

---

**5. No Audit Trail**
```typescript
// Current: Just update the value
await prisma.competitions.update({
  where: { id },
  data: { available_tokens: 50 },
});

// Problem: Can't see history of changes
// - Who changed it?
// - When?
// - Why? (approval, refund, adjustment?)
```

**Solution:** Create audit ledger:
```typescript
// New table: capacity_ledger
capacity_ledger {
  id
  competition_id
  change_amount (+10, -10)
  reason ("approval", "refund")
  changed_by_user_id
  changed_at
}

// Service layer handles both
class CapacityService {
  async allocate(competitionId, amount, reason) {
    await prisma.$transaction(async (tx) => {
      // Update capacity
      await tx.competitions.update({
        where: { id: competitionId },
        data: { available_tokens: { decrement: amount } },
      });

      // Log in audit trail
      await tx.capacity_ledger.create({
        data: {
          competition_id: competitionId,
          change_amount: -amount,
          reason: reason,
          changed_by_user_id: ctx.user.id,
        },
      });
    });
  }
}
```

---

**6. Tenant Settings Confusion**
```typescript
// Two sources of truth:
1. Lookup tables (age_groups, dance_categories)  ← Actually used
2. JSONB columns (tenants.age_division_settings) ← Not used

// Also this file:
empwrDefaults.ts  ← Constants that match PDF
```

**Problem:** Confusing which one is real source of truth
**Solution:** Pick ONE system:
```
Option A: Use lookup tables only (current approach)
- Delete JSONB columns
- Delete empwrDefaults.ts (or mark as REFERENCE ONLY)

Option B: Use JSONB only
- Delete lookup tables
- Store everything in tenants.settings JSONB
- Parse JSON in every query (slower)
```

**Recommendation:** Keep lookup tables (faster queries, proper relationships)

---

**7. Frontend State Management**
```typescript
// Current: Each component manages own state
const [entries, setEntries] = useState([]);
const [loading, setLoading] = useState(false);

// Problem: When entry changes, need to update everywhere
// - Entries list
// - Entry details
// - Analytics
// - Reports
```

**Solution:** Use global state (Zustand or Redux):
```typescript
// src/stores/entryStore.ts
const useEntryStore = create((set) => ({
  entries: [],
  addEntry: (entry) => set((state) => ({
    entries: [...state.entries, entry]
  })),
  updateEntry: (id, data) => set((state) => ({
    entries: state.entries.map(e =>
      e.id === id ? { ...e, ...data } : e
    )
  })),
}));

// Any component can access/update
const { entries, addEntry } = useEntryStore();
```

---

## Simplification Recommendations (Priority Order)

### Priority 1: Delete Legacy Components (1 week)
- Remove all components NOT in `/rebuild` folder
- Consolidate to single source of truth
- Update all imports

**Impact:** Codebase 30% smaller, easier to navigate

---

### Priority 2: Create Service Layer (2 weeks)
```
src/services/
├── FeeService.ts         ← All fee calculations
├── CapacityService.ts    ← Capacity management + audit trail
├── ReservationService.ts ← Reservation state machine
└── InvoiceService.ts     ← Invoice generation
```

**Impact:** Business logic in one place, easier to test

---

### Priority 3: Add Audit Tables (1 week)
```
capacity_ledger
state_change_log
fee_calculation_log
```

**Impact:** Can debug "where did capacity go?" issues

---

### Priority 4: Split Large Routers (1 week)
- entry.ts (1400 lines) → 5 files
- competition.ts (800 lines) → 4 files

**Impact:** Easier to find code, less merge conflicts

---

### Priority 5: Use Database Transactions Everywhere (2 weeks)
- Wrap all state changes in `$transaction`
- Add row locking for capacity changes
- Add idempotency keys (prevent double-clicks)

**Impact:** No more race conditions, data consistency guaranteed

---

### Priority 6: Cleanup Settings System (1 week)
- Delete unused JSONB columns in tenants table
- Document that lookup tables are source of truth
- Add migration script to sync empwrDefaults → database

**Impact:** Clear which system is real, no confusion

---

### Priority 7: Add Global State Management (1 week)
- Install Zustand
- Create stores for entries, dancers, competitions
- Remove redundant useState() calls

**Impact:** Components simpler, UI updates faster

---

## Why The Current System Works (Despite Complexity)

### Good Things We're Doing Right

**1. Multi-Tenant Isolation**
✅ Every query filters by tenant_id
✅ No cross-tenant data leaks
✅ Each tenant feels like separate app

**2. Type Safety**
✅ TypeScript + Prisma = Can't pass wrong data types
✅ tRPC = Frontend knows exact shape of API responses
✅ Catches bugs at compile time, not runtime

**3. Modern Stack**
✅ Next.js = Fast page loads, good SEO
✅ React = Interactive UI without page refreshes
✅ PostgreSQL = Handles complex queries easily
✅ Supabase = Don't have to manage servers

**4. Real Business Logic**
✅ Fee calculation works correctly
✅ Capacity tracking prevents overbooking
✅ Invoice generation produces real PDFs
✅ Role-based permissions enforce security

**5. Documentation**
✅ Specs written before coding (Phase 1 complete)
✅ Comments explain "why" not just "what"
✅ Architecture decisions documented

---

## The Hard Parts (Why This Isn't Simple)

**1. Multi-Tenant is Complex**
- Every query needs tenant_id filter
- Easy to forget and leak data
- Can't use simple tutorials (most assume single-tenant)

**2. Real Business Logic**
- Not a CRUD app (Create/Read/Update/Delete)
- Has state machines (pending → approved → invoiced)
- Has capacity limits (can run out of spots)
- Has fee calculations (depends on multiple factors)

**3. Multiple User Types**
- Super Admin sees everything
- Competition Director manages events
- Studio Director manages entries
- Judge scores routines
- Each needs different permissions

**4. Real-Time Requirements (Future)**
- Judges enter scores → Leaderboard updates immediately
- Studio creates entry → Capacity decreases
- Multiple users editing at once = need conflict resolution

**5. Scale**
- 50 studios × 200 dancers × 10 entries = 100,000 entries
- Need fast queries (proper indexes)
- Need pagination (can't load 100k rows at once)

---

## How The Code Quality Could Be Better

### Current Issues

**Issue 1: Inconsistent Patterns**
```typescript
// entry.ts - Uses this pattern
const { performance_date, ...data } = input;

// dancer.ts - Uses different pattern
const input = req.input;
```

**Fix:** Pick ONE pattern, use everywhere

---

**Issue 2: No Error Handling Standards**
```typescript
// Some places:
throw new Error("Not found");

// Other places:
throw new TRPCError({ code: 'NOT_FOUND', message: '...' });

// Other places:
return { error: "Not found" };
```

**Fix:** Always use TRPCError with proper codes

---

**Issue 3: Magic Numbers**
```typescript
if (participants.length > 20) { ... }  // Why 20?
fee += 30;  // Why $30?
```

**Fix:** Use constants with names:
```typescript
const MAX_PARTICIPANTS_PER_ENTRY = 20;
const TITLE_UPGRADE_FEE = 30;
```

---

**Issue 4: No Tests**
```typescript
// Current: No automated tests
// Have to manually test everything
// Easy to break existing features
```

**Fix:** Add tests:
```typescript
describe('FeeService', () => {
  it('calculates solo fee', () => {
    const fee = calculateFee(1, sizeCategory, false);
    expect(fee).toBe(115);
  });

  it('adds title upgrade fee', () => {
    const fee = calculateFee(1, sizeCategory, true);
    expect(fee).toBe(145);
  });
});
```

---

**Issue 5: Long Functions**
```typescript
// entry.ts create() function: 400 lines!
// Hard to understand what it does
// Hard to test individual pieces
```

**Fix:** Break into smaller functions:
```typescript
async function createEntry(input) {
  validateInput(input);
  const studio = await verifyStudioAccess(input.studio_id);
  const capacity = await checkCapacity(input.reservation_id);
  const fee = calculateFee(input);
  const entry = await saveEntry(input, fee);
  await createParticipants(entry.id, input.participants);
  return entry;
}
```

---

## Learning Path (If You Want To Understand The Code)

### Week 1: Frontend Basics
1. Read Next.js docs (routing, pages)
2. Read React docs (components, hooks)
3. Explore: `src/app/dashboard/entries/create-v2/page.tsx`
4. Explore: `src/components/rebuild/entries/EntryCreateFormV2.tsx`

**Goal:** Understand how form shows up on screen

---

### Week 2: Backend Basics
1. Read tRPC docs (queries, mutations)
2. Read Prisma docs (schema, queries)
3. Explore: `src/server/routers/entry.ts` (just read the input schema)
4. Explore: `prisma/schema.prisma` (see all tables)

**Goal:** Understand how data gets from form to database

---

### Week 3: Multi-Tenant
1. Read: `TENANT_SETTINGS_ARCHITECTURE.md`
2. Explore: How subdomain determines tenant
3. Explore: How ctx.tenantId is set
4. Grep: Search codebase for "tenant_id"

**Goal:** Understand tenant isolation

---

### Week 4: Business Logic
1. Read: `docs/specs/PHASE1_SPEC.md`
2. Trace: Follow one entry creation from click to database
3. Debug: Put console.logs everywhere, watch data flow
4. Test: Create entry on production, see what happens

**Goal:** Understand the actual business logic

---

### Week 5: Advanced Topics
1. Transactions: How database locks work
2. State machines: Reservation status transitions
3. Capacity: How tokens are allocated/refunded
4. Invoicing: How PDFs are generated

**Goal:** Understand complex flows

---

## Summary (The TL;DR)

**What CompPortal Is:**
A dance competition management system with multi-tenant architecture. Studios register, create entries, get invoiced. Competition directors manage events. Judges score performances. Winners calculated automatically.

**The Stack:**
- **Frontend:** Next.js + React + TypeScript + TailwindCSS
- **Backend:** tRPC routers + Prisma ORM
- **Database:** PostgreSQL via Supabase
- **Auth:** Supabase Auth (email/password)
- **Hosting:** Vercel (auto-deploys from GitHub)

**Key Concepts:**
1. **Multi-tenant:** One codebase, multiple competitions (tenant_id everywhere)
2. **Type-safe:** TypeScript catches errors before runtime
3. **Real-time:** tRPC makes API calls feel instant
4. **Lookup tables:** Settings stored in database (age groups, styles, fees)
5. **Business logic:** Not just CRUD - has state machines, capacity limits, fee calculations

**How It Works:**
1. User visits subdomain (empwr.compsync.net)
2. Logs in (Supabase Auth)
3. Clicks around (React updates UI)
4. Makes changes (tRPC calls backend)
5. Backend validates (checks permissions, tenant_id)
6. Database saves (PostgreSQL)
7. UI updates (React re-renders)

**Current Status:**
- Phase 1 (Registration) complete
- 2 tenants live (EMPWR, Glow)
- ~100 entries in production
- Ready for first competition

**How To Simplify:**
1. Delete legacy components
2. Create service layer
3. Add audit tables
4. Split large files
5. Use transactions everywhere
6. Add tests
7. Global state management

**Why It's Complex:**
- Multi-tenant is hard
- Real business logic (not just CRUD)
- Multiple user types
- Scale requirements
- Real-time needs (future)

**Why It Works:**
- Strong type safety
- Good tenant isolation
- Modern stack
- Real features that work
- Good documentation

---

**Bottom Line:** This is a production system handling real business operations. It's more complex than a tutorial app, but it's working and handling real users. The complexity is justified by the requirements. However, it could be simplified with refactoring (service layer, split routers, tests).

---

*This document explains the entire CompPortal codebase in simple terms. Read it whenever you're confused about how something works!*
