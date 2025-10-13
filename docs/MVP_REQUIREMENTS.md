# 🧩 CompPortal MVP Requirements (October 2025)

## 🎯 Objective

Deliver a production-stable MVP for the CompPortal system that enables **Studios** and **Competition Directors** to complete the full reservation → routine → invoice workflow without UI or logic failures.

---

## 🧭 1. Core User Roles

| Role                          | Permissions                                                        | Key Pages                                            |
| ----------------------------- | ------------------------------------------------------------------ | ---------------------------------------------------- |
| **Studio Director (SD)**      | Manage their own studio's dancers, reservations, and routines      | Dashboard, Reservations, Dancers, Routines, Invoices |
| **Competition Director (CD)** | Manage all studios, approve/reject reservations, generate invoices | Dashboard, Reservations, Studios, Invoices           |
| **Super Admin**               | Platform-level controls and user management                        | All + Admin Tools                                    |

All data views and mutations are hard-locked to `user.studio_id` through RLS and server validation.

---

## 🧾 2. Functional MVP Requirements

### 2.1 Reservation Workflow

#### Studio Director

* Can create a reservation request specifying number of routines.
* Reservation shows one of three statuses: **Pending**, **Approved**, or **Rejected**.
* Studio cannot see competition capacity or token counts.
* Studio cannot edit agent or event information.
* Auto-fills studio info from profile (non-editable).
* Helper text above form: "Routines available: X of Y approved."

#### Competition Director

* Views pending reservations in dashboard grid.
* Can approve or reject with optional reason.
* Approval triggers:

  * Reservation → status `approved`.
  * Auto-generation of invoice.
  * Automatic token allocation update.

#### System

* Approving reservation auto-generates invoice with correct pricing and UNPAID status.
* Tokens automatically deducted from event capacity.
* When a reservation is revoked, tokens return to pool.

---

### 2.2 Routine Workflow

#### Studio Director

* Can only create routines if an **approved reservation** exists.
* Routine counter always visible: `3 of 30 remaining`.
* Helper text above button: "Routines available: X of Y approved."

##### 🔒 Routine Creation — Event Locking Requirement (MVP-Critical)

* Routine creation must be **locked to the approved event**.
* Event field on form is **auto-populated** and **non-editable**.
* Validation enforces that `routine.competition_id` matches `reservation.competition_id`.
* If no approved reservation exists, display:

  > "You must have an approved reservation before creating routines."

##### Routine Form Fields

* Title, Category, Classification, Age Group, Size, Props (replaces Music)
* Drag-and-drop dancer assignment from right panel to routine

  * On drop, dancer disappears (no zoom-back)
  * No confirmation dialog when removing dancer
* Edit and delete routines with auto-updated counters
* When deleted, counter decrements and create button re-enables

#### Competition Director

* View all routines across all studios and filter by event or studio.
* View full details including dancers, category, and props.

---

### 2.3 Invoicing Workflow

* Auto-generated when a reservation is approved.
* Line item: "Routine reservation (X routines @ $Y each)"
* Total auto-calculated.
* Status defaults to **UNPAID**.
* Visible to both Studio Director and Competition Director.
* CD can manually mark invoices as paid.
* SD can download or send invoice summary.

---

## 🧮 3. Technical Requirements

| Table                  | Key Columns                                                          | Notes                                     |
| ---------------------- | -------------------------------------------------------------------- | ----------------------------------------- |
| **reservations**       | `routines_requested`, `routines_allocated`, `status`                 | Replaces old `spaces_requested/confirmed` |
| **routines**           | `reservation_id`, `studio_id`, `competition_id`, `title`, `category` | Linked directly to reservation            |
| **invoices**           | `reservation_id`, `studio_id`, `line_items`, `total`, `status`       | Auto-generated                            |
| **entry_participants** | `routine_id`, `dancer_id`                                            | Supports drag-and-drop assignment         |

Server validation enforces correct event linkage and studio scoping.

---

## 🧱 4. UI & UX Requirements

| Area                       | Requirement                                             |
| -------------------------- | ------------------------------------------------------- |
| **Terminology**            | Replace all instances of "entries" with "routines."     |
| **Reservations Page (SD)** | Hide capacity metrics; show only status and summary.    |
| **Routine Page**           | Always display helper text and remaining routine count. |
| **Dancer Management**      | Unified add form for single + batch creation.           |
| **PDF/Email Templates**    | Branded, centered, and polished.                        |
| **Dashboard Layout**       | Prioritize Reservations, Routines, and Invoices.        |
| **Tooltips**               | Position above each section to guide first-time users.  |

---

## 🧩 5. Validation & QA

* E2E Golden Path testing for 20 workflows:

  * 8 Reservation tests
  * 12 Routine tests
* Verify event locking and routine creation limits.
* Ensure invoices auto-generate on approval.
* Ensure no Studio Director can see capacity or agent info.

---

## 🚦 6. MVP Acceptance Criteria

| Category         | Criteria                                              | Status |
| ---------------- | ----------------------------------------------------- | ------ |
| Reservation Flow | SD create / CD approve / invoice auto-generates       | ✅      |
| Routine Flow     | SD create within approved limit, event auto-populated | ✅      |
| Invoicing        | Auto-generation, CD mark-as-paid, SD view             | ✅      |
| Role Locking     | Studio cannot edit or view restricted data            | ✅      |
| UI Consistency   | Terminology, helper text, counters                    | ✅      |
| Security         | RLS and event ID validation enforced                  | ✅      |

---

## 📝 Implementation Status (January 13, 2025)

### Phase 1: Critical MVP Gaps - ✅ COMPLETE

All critical gaps from MVP Section 2.2 and Section 4 have been addressed:

1. **Event Locking UI** ✅
   - URL params (`?competition=X&reservation=Y`) read and applied
   - Competition field auto-populated and locked (disabled)
   - Validation prevents mismatch between competition and reservation
   - Commit: f67864d

2. **Helper Text with Counter** ✅
   - Blue info banner displays above form
   - Shows "Routines available: X of Y approved"
   - Includes competition name and current usage
   - Commit: f67864d

3. **Terminology Audit** ✅
   - All user-facing text uses "routines"
   - EntriesList, Dashboard, Navigation verified
   - Backend API names deferred to Phase 3 (tech debt)
   - Commit: f67864d

### Performance Optimization - IN PROGRESS

4. **Query Optimization** 🚧
   - Changed `getAll` query from `include` to `select`
   - Removed nested dancer relation (was causing N+1)
   - Limited participants to first 4 for list view
   - Added missing fields (music_title, music_artist, studio_id)
   - Status: Building and testing

---

For detailed gap analysis and implementation plan, see: [MVP_GAP_ANALYSIS.md](../MVP_GAP_ANALYSIS.md)
