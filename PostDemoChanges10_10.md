🩰 Routine Workflow — Finalized Changes (v3) + Post-Demo Changelog
🔒 1. Data Model & Logic

Reservations are permanently bound to one competition event (specific dates).

Deleting a routine refunds a token back to that reservation’s remaining pool.

No hard caps: once studios hit their routine limit, they can create additional reservations to request more tokens.

Routine records link to:

studio_id

reservation_id (→ competition_id inferred)

Dancer assignments (many-to-many)

System-calculated metadata: age_group, classification, category

🧭 2. Routine Creation Flow
Step 1: Routine Info

Combine Basic + Details + Props into one unified screen:

Routine Name

Choreographer

Dance Category (dropdown with auto-suggest)

Classification (Solo, Duo/Trio, Small Group, etc.)

Props field

“Title Routine” checkbox (marks it as the studio’s signature routine)

Design goal: one smooth form → fewer clicks, fewer transitions.

Step 2: Add Dancers

Multiple flexible options:

Drag and drop from dancer list

Click to assign

“Copy dancers from existing routine” shortcut

As dancers are added:

System automatically infers Age Group (based on dancer ages and routine size).

Updates live horizontal “Review Bar” along the bottom.

🧩 3. Live Review Dashboard

Persistent horizontal element across both steps:

Displays Category, Classification, Age Group, and Dancers as they’re filled.

Final step shows a “Review & Confirm” summary dynamically updating.

Users can adjust any guessed field in this final view (correct category, size, etc.).

No prices shown anywhere during routine creation (including review).

👯 4. Dancer Logic

All assignment methods (click, drag/drop, copy) remain active.

Dancers can appear in multiple routines.

Age group inference logic determines the most restrictive division.

Manual override allowed on final review.

💸 Invoice & Summary System — Finalized
“My Routines” Page Additions

New Summary Element (horizontal bar):

Displays:

Total Routines

Estimated Total Cost (computed silently by backend)

Remaining Tokens (from reservation)

Live updates each time a routine is created or deleted.

Buttons:

“Send Summary (Request Invoice)” → Locks all routines in current reservation and sends summary to Competition Director (CD).

“Download Summary (PDF)” → Exports a print-friendly version of the summary as a one-page PDF for studio reference or confirmation.

CD View (Event Management)

At https://www.compsync.net/dashboard/competitions

Under each event’s Reservations tab, the CD now sees these Summary Elements.

Replaces “Approve / Reject” with a single “Generate Invoice” button.

Clicking generates invoice and opens:

https://www.compsync.net/dashboard/invoices/[invoice_id]

There, the CD can:

Apply discounts

Adjust amounts or line items

Click “Send to Studio” (final delivery)

✉️ Notifications

✅ When Reservation is Approved → Email to Studio Director

✅ When Summary is Sent → Email to Competition Director

✅ When Invoice is Sent → Email to Studio Director

🚫 No notifications for individual routine creation

🧱 Terminology / Navigation
Term	Old	New
Entries	Replaced	Routines
SD Dashboard Tabs	“Entries” replaced	DANCERS • RESERVATIONS • ROUTINES
Spaces Requested	
	Routines Requested
Spaces Confirmed	
	Routines Allocated
⚙️ Implementation Priorities

Update Routine creation UI → merge forms into “Routine Info”.

Add Age Group inference logic (based on dancer DOB + routine size).

Implement Review Bar persistent component.

Update My Routines Summary Element + invoice request logic.

Add email templates for Summary Sent, Reservation Approved, and Invoice Sent.

Integrate token refund logic on routine deletion.

Move tooltips above each element for visual flow guidance (instead of lower “Getting Started”).

Above Dancers: “Add or import your dancers”

Above Reservations: “Reserve routine slots”

Above Routines: “Create your routines”

Rename top-right Profile Settings → My Studio and position beside Sign Out.

Add Import CSV functionality to Routines, identical to Dancers Import workflow.

🔮 Post-Demo Clarifications (from Transcript)

Hidden Pricing Logic: Routine category and time limit determine backend pricing, but these values are invisible to Studio Directors and only appear in Competition Director invoices.

Summary Format: The Routine Summary should be print/export-ready, acting as a one-page confirmation for SDs before invoicing.

Future Enhancement: Add Stripe integration to allow online invoice payments and automatic payment status updates once CD connects their Stripe account.