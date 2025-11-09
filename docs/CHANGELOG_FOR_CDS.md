# CompSync Platform - Changelog for Competition Directors

**Last Updated:** November 8, 2025

This document tracks all feature releases and changes that impact Competition Directors and their Studio Directors. We'll notify you when significant updates are released.

---

## November 2025 Release: Studio Director Flexibility Enhancements

**Release Date:** November 9, 2025 (Target)
**Status:** In Development
**Impact:** Medium - Reduces CD workload by enabling SDs to self-correct common mistakes

### What's New for Your Studio Directors

Your studio directors can now handle common mistakes without contacting you:

#### 1. Delete Draft Routines 🗑️

**What Changed:**
Studio Directors can now delete their own draft routines before submitting their summary.

**How It Works:**
- SD clicks "Delete" on a draft routine card
- Routine is cancelled (not permanently deleted - you can restore if needed)
- 1 space is freed up in their reservation
- Only works BEFORE they submit their summary (after summary = locked)

**Example Scenario:**
"I accidentally created a solo routine instead of a duet - now I can just delete it and recreate it correctly without emailing you!"

**What You'll See:**
- Activity log will show "SD deleted draft routine"
- Cancelled routines still visible in your admin view with status="cancelled"

---

#### 2. Reclassify Dancers with Draft Routines 🎓

**What Changed:**
Studio Directors can now change a dancer's classification even if they're already in draft routines.

**How It Works:**
- SD realizes they classified a dancer as "Novice" but should be "Intermediate"
- They change the classification in the dancer form
- System automatically recalculates classification for ALL draft routines that dancer is in
- Fees and placement are recalculated based on new classification
- Only works if dancer has ONLY draft routines (can't change if dancer has submitted routines)

**Example Scenario:**
"I put Sarah in as Novice, created 3 draft solos, then realized she should be Intermediate. Now the system automatically updates all 3 routines!"

**What You'll See:**
- Activity log shows classification change + which routines were recalculated
- No action needed from you

---

#### 3. Request More Spaces (Self-Service) ➕

**What Changed:**
Studio Directors can now increase their own reservation spaces if the competition has availability.

**How It Works:**
- SD clicks "Request More Spaces" on their reservation
- System checks: Is competition <90% full?
  - **YES (<90%):** Spaces added instantly, no CD approval needed
  - **NO (>=90%):** Denied with message to contact you
- Capacity is reserved automatically using the same atomic system we use for approvals

**Business Rules:**
- **Allowed:** If competition utilization is below 90%
- **Denied:** If competition is 90%+ full OR no capacity available
- **No Limit:** SDs can request increases unlimited times (as long as space exists)
- **Max Per Request:** 50 spaces per individual increase

**Example Scenarios:**

**Scenario A (Auto-Approved):**
- Competition: 500 total spaces, 250 used (50% utilization)
- SD requests +10 spaces
- ✅ **Result:** Instantly approved, reservation increased to 110 spaces
- 💬 **Message:** "Your reservation was increased to 110 spaces!"

**Scenario B (Denied - Nearly Full):**
- Competition: 500 total spaces, 460 used (92% utilization)
- SD requests +10 spaces
- ❌ **Result:** Denied
- 💬 **Message:** "This competition is nearly full (92.0% capacity). Contact the Competition Director to request more spaces."

**Scenario C (Denied - No Capacity):**
- Competition: 500 total spaces, 500 used (100% utilization)
- SD requests +10 spaces
- ❌ **Result:** Denied
- 💬 **Message:** "No additional spaces available for this competition. Contact the Competition Director."

**What You'll See:**
- Activity log: "SD requested space increase: +10 spaces (92.3% utilization)"
- Capacity ledger: Automatic entry with reason "sd_space_increase"
- No email notification (to avoid spam)
- You can still manually adjust spaces via "Edit Spaces" button (existing feature)

**Why 90%?**
We chose 90% as the threshold because:
- Competitions near capacity need tighter control
- You may be planning specific event structure/scheduling
- Prevents last-minute chaos when competition is almost full
- SDs can still email you to request if denied

---

#### 4. Participant Removal Bug Fix 🐛

**What Changed:**
Fixed a bug where removing a dancer from a routine didn't actually save the removal.

**The Problem:**
- SD unchecks a dancer from a routine in the edit modal
- Saves the routine
- Reopens the edit modal → dancer is still checked
- Entry count still says "registered in 1 routine"

**The Fix:**
- Now properly calls backend mutation to remove participant
- Dancer stays removed when modal reopened
- Entry count updates correctly
- Toast notification: "Sarah removed from routine" for confirmation

**What You'll See:**
- No change to your workflow
- Fewer frustrated SDs contacting you about "stuck" dancers

---

#### 5. Summary Submission Warning ⚠️

**What Changed:**
SDs now see a clear warning before submitting their summary explaining what they can and cannot change afterward.

**Warning Message:**
```
⚠️ Important: Once you submit your summary

After submitting, you will NOT be able to:
• Delete draft routines
• Add new routines
• Change dancer classifications for dancers in submitted routines
• Increase your reservation spaces (without CD approval)

You WILL still be able to:
• Edit routine details (title, music, choreographer, etc.)
• View your routines and dancers
• Upload music files
• Make changes if the Competition Director reopens your reservation
```

**Why This Helps:**
- Reduces support questions: "Why can't I delete this routine?"
- Sets clear expectations before they commit
- Reminds them to double-check before submitting

---

### What Hasn't Changed (Still CD-Only)

These actions still require your approval/intervention:

- ❌ Deleting SUBMITTED routines (only draft deletion allowed)
- ❌ Increasing spaces when competition is 90%+ full
- ❌ Reopening closed reservations (only you can unlock)
- ❌ Changing dancer classification for dancers with submitted routines
- ❌ Approving/rejecting initial reservation requests
- ❌ Creating invoices and sending emails

---

### Benefits for You

**Less Email:** Fewer "Can you delete this routine?" or "Can I add 5 more spaces?" emails

**Faster Workflow:** SDs fix their own mistakes in real-time instead of waiting for you

**Better Data Quality:** SDs can correct classification errors immediately

**Activity Logging:** Everything is still logged for your audit trail

**You Stay in Control:** You can override anything, reopen reservations, and manage capacity manually

---

### Technical Details (For Reference)

**Capacity Management:**
- Uses existing atomic capacity service (same as approval flow)
- 90% threshold calculated as: `(total_tokens - available_tokens) / total_tokens`
- Capacity ledger tracks all SD-initiated increases with reason "sd_space_increase"

**Data Integrity:**
- Soft delete only (cancelled routines preserved in database)
- Entry classification recalculation runs automatically
- All changes logged in activity ledger

**Testing:**
- Tested on both EMPWR and Glow competitions
- Verified multi-tenant isolation
- Verified capacity cannot go negative

---

### Frequently Asked Questions

**Q: Can SDs delete routines after they've submitted their summary?**
A: No. Once the summary is submitted (reservation.is_closed = true), only you can make changes by reopening the reservation.

**Q: What if an SD deletes a routine by accident?**
A: Routines are soft-deleted (status = 'cancelled'), not permanently removed. You can restore them via the database if needed, or the SD can recreate the routine.

**Q: Will I get notified every time an SD increases their spaces?**
A: No email notifications to avoid spam. You can see all increases in the activity log and capacity ledger.

**Q: Can SDs increase spaces unlimited times?**
A: Yes, as long as each increase passes the <90% capacity check. Max 50 spaces per individual request.

**Q: What if I want to change the 90% threshold for my competition?**
A: Contact us - we can make the threshold configurable per competition in a future update.

**Q: Can I still manually edit spaces for any studio?**
A: Yes! Your "Edit Spaces" button still works exactly as before. This just gives SDs a self-service option when capacity allows.

**Q: How do I reopen a closed reservation if an SD needs to make changes?**
A: [TO BE DOCUMENTED - Either via existing button or we'll add "Reopen Reservation" button in admin panel]

---

### Need Help?

**For Technical Issues:**
- Email: support@compsync.net (we don't have this yet - placeholder)

**For Feature Requests:**
- Email: danieljohnabrahamson@gmail.com

**For Urgent Issues:**
- Text: [Your phone number]

---

## Previous Releases

### November 1-7, 2025: CD Management Features

**Released:** November 8, 2025

**Features:**
- ✅ Edit Spaces for approved reservations (CD)
- ✅ Record Deposit payments (CD)
- ✅ Add Studio with pre-approved reservation (CD)
- ✅ Invoice deposit deduction

[See SESSION_38_CD_FEATURES_COMPLETE.md for full details]

---

### October 2025: Phase 1 Launch

**Released:** October 15, 2025

**Features:**
- Reservation system with capacity management
- Entry creation with fee calculation
- Summary submission workflow
- Invoice generation
- Multi-tenant support (EMPWR + Glow)

[See docs/archive/ for historical details]

---

**Changelog Maintained By:** Development Team
**Last Review:** November 8, 2025
