# Studio Director Flexibility Enhancements

**Release Date:** November 8, 2025
**Version:** 1.2.0
**Status:** ✅ Live on Production

---

## What's New for Studio Directors

We've added several new features that give you more flexibility when managing your routines and dancers before submission. These changes make it easier to fix mistakes and adjust your registration as needed.

---

## 🗑️ Delete Draft Routines

**What it does:** You can now delete draft routines that haven't been submitted yet.

**How it works:**
- Navigate to "My Routines"
- Find a draft routine (not submitted)
- Click the "Delete" button
- Confirm the deletion

**When you can delete:**
- ✅ Routine status is "Draft"
- ✅ Your reservation is still open

**When you cannot delete:**
- ❌ Routine has been submitted (you'll see "🔒 Delete" button)
- ❌ Your reservation has been closed/summarized
- **Solution:** Contact the Competition Director for assistance

**What happens when you delete:**
- Routine is cancelled (soft delete - can be recovered if needed)
- 1 space is freed up in your reservation
- All participants are removed from the routine

---

## 👯 Reclassify Dancers (Draft Entries Only)

**What it does:** You can now change a dancer's classification level if they only have draft routines.

**How it works:**
- Go to "My Dancers"
- Click "Edit" on a dancer
- Change the classification field

**When you can reclassify:**
- ✅ Dancer has no entries at all
- ✅ Dancer has ONLY draft entries (you'll see a warning)

**When you cannot reclassify:**
- ❌ Dancer has submitted, confirmed, or scheduled entries
- **Solution:** Remove dancer from submitted routines first, or contact the Competition Director

**Warning message you might see:**
> ⚠️ This dancer has 3 draft routines. Changing classification may affect routine placement and fees.

This is just a heads-up - you can still proceed with the change since the routines are drafts.

**Error message you might see:**
> Cannot change classification - dancer has 2 submitted entries (Solo Jazz, Duet Contemporary). Remove dancer from submitted routines first, or contact the Competition Director.

---

## ➕ Request More Spaces

**What it does:** You can request additional routine spaces if the competition still has capacity.

**How it works:**
- Go to "My Reservations"
- Find your approved reservation
- Click "➕ Request More Spaces"
- Enter how many additional spaces you need
- Click "Request Increase"

**When you can request more:**
- ✅ Your reservation is approved
- ✅ Competition is under 90% capacity
- ✅ Competition has available spaces

**When you cannot request more:**
- ❌ Competition is at or above 90% capacity
  - **Message:** "This competition is nearly full (92.5% capacity). Contact the Competition Director to request more spaces."
- ❌ No available spaces left
  - **Message:** "No additional spaces available for this competition. Contact the Competition Director."
- ❌ Your reservation is closed/summarized

**What you'll see in the modal:**
- Your current confirmed spaces
- Competition utilization percentage
- Available spaces remaining
- How many spaces to add (you choose)
- Warning if competition is nearing capacity

**What happens when you request:**
- Your confirmed spaces are increased immediately
- Capacity is reserved atomically (thread-safe)
- You can now create more routines up to your new limit

---

## 🔧 Fixed: Participant Removal Bug

**What was fixed:** Previously, when you removed a dancer from a routine and saved, the dancer would reappear when you reopened the edit modal.

**What works now:**
- Remove a dancer from a routine → it saves correctly
- Reopen the edit modal → dancer stays removed ✅
- Add a dancer to a routine → it saves correctly
- All participant changes persist properly

---

## 🚨 Important Notes

### Reservation Status

Once your reservation is **closed** (after you submit your summary), you will no longer be able to:
- Delete routines (even drafts)
- Add/remove participants
- Request space increases

**Why?** The Competition Director is preparing schedules and invoices. Any changes after this point need CD approval.

**Solution:** Contact the Competition Director if you need to make changes after submission.

---

### Classification Changes

Changing a dancer's classification can affect:
- **Routine fees** (different classification levels may have different pricing)
- **Routine placement** (competitive vs. recreational categories)
- **Age group calculations** (some classifications have different age rules)

**Best practice:** Double-check classification levels before submitting routines to avoid surprises.

---

### Capacity Management

When you request space increases:
- **Under 90%:** Self-serve - your request is approved automatically
- **90%+ capacity:** Manual approval - contact Competition Director
- **No capacity:** Competition is full - contact Competition Director

The 90% threshold ensures the Competition Director has flexibility to manually allocate the last 10% of spaces as needed.

---

## How to Use These Features

### Example 1: Fix a Mistake in Draft Routines

**Scenario:** You created 5 draft routines but made a mistake on one.

**Steps:**
1. Go to "My Routines"
2. Find the draft routine with the mistake
3. Click "Delete"
4. Confirm deletion
5. Create a new corrected routine

**Result:** Old routine cancelled, space freed up, new routine created correctly.

---

### Example 2: Reclassify a Dancer Before Submission

**Scenario:** You added a dancer as "Recreational" but they should be "Competitive". They're in 3 draft routines.

**Steps:**
1. Go to "My Dancers"
2. Click "Edit" on the dancer
3. Change classification from "Recreational" to "Competitive"
4. See warning: "⚠️ This dancer has 3 draft routines..."
5. Click "Save" to proceed

**Result:** Dancer reclassified. Double-check your 3 draft routines to ensure pricing and categories are correct.

---

### Example 3: Need More Spaces Mid-Registration

**Scenario:** You reserved 50 spaces but now need 60.

**Steps:**
1. Go to "My Reservations"
2. Find your approved reservation
3. Click "➕ Request More Spaces"
4. Check competition capacity (e.g., 75% utilization, 100 spaces available)
5. Enter "10" for spaces to add
6. Click "Request Increase"

**Result:** Your reservation is now 60 spaces. You can create 10 more routines.

---

## Need Help?

If you have any questions about these new features:

1. **Check the tooltips** - Hover over disabled buttons to see why they're locked
2. **Read error messages** - They explain exactly what's blocking you and how to fix it
3. **Contact Support** - Email techsupport@compsync.net

For changes that require Competition Director approval (submitted routines, closed reservations, capacity issues), please contact them directly.

---

## Technical Details (for Reference)

### Backend Changes
- `entry.delete` - Studio Directors can now soft-delete own draft routines
- `dancer.update` - Classification validation now allows changes for draft-only entries
- `reservation.requestSpaceIncrease` - New mutation for SD-initiated space increases
- `capacity.ts` - Added audit reason: 'sd_space_increase'

### Security
- All mutations require authentication (Studio Director role)
- Studio ownership verified on all operations
- Reservation status checked (open vs. closed)
- Cross-studio and cross-tenant access blocked
- Capacity reservations are atomic (thread-safe)

### Data Integrity
- All deletions are soft deletes (status='cancelled')
- Activity logging tracks all SD-initiated changes
- No hard deletes - data can be recovered if needed

---

**Questions? Feedback?** We're here to help make your registration experience as smooth as possible!
