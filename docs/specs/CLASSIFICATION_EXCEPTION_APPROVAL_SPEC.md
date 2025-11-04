# Classification Exception Request & Approval System - Implementation Spec

**Status:** Ready for Implementation
**Created:** November 4, 2025
**Feature:** Allow Studio Directors to request classification exceptions from Competition Directors

---

## Executive Summary

In the new beta entries system, **classification is always auto-determined** and **locked**. Studio Directors cannot manually override classification. When the auto-calculated classification doesn't match what the SD needs, they can request an exception from the Competition Director.

**Key Principle:** SD never manually chooses classification. System calculates it, and only CD can approve exceptions.

---

## Business Rules Summary

### Classification Auto-Determination (Phase 2)
- **Solo (1 dancer):** Classification = dancer's exact classification (100% locked)
- **Duet/Trio (2-3 dancers):** Classification = highest dancer classification OR +1 level
- **Group (4-19 dancers):** Classification = 60% majority (or highest) OR +1 level
- **Production (20+ dancers):** Auto-locked to "Production" (NO EXCEPTIONS ALLOWED)

### SD Cannot Override
- Classification field is **read-only** in entry form
- SD can only see what the system calculated
- If SD wants different classification → Must request exception from CD

### Exception Request Flow
1. **SD creates entry** → System calculates classification
2. **SD wants different classification** → Clicks "Request Exception"
3. **Entry created immediately** with `status = 'pending_classification_approval'`
4. **CD reviews** → Approves SD's request OR sets different classification
5. **Entry becomes regular** with CD-approved classification (locked)

---

## Database Schema

### New Table: `classification_exception_requests`

```sql
CREATE TABLE classification_exception_requests (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

  -- Core References
  entry_id UUID NOT NULL REFERENCES competition_entries(id) ON DELETE CASCADE,
  reservation_id UUID NOT NULL REFERENCES reservations(id),
  competition_id UUID NOT NULL REFERENCES competitions(id),
  studio_id UUID NOT NULL REFERENCES studios(id),
  tenant_id UUID NOT NULL REFERENCES tenants(id),

  -- Classification Details
  auto_calculated_classification_id UUID NOT NULL REFERENCES classifications(id),
  requested_classification_id UUID NOT NULL REFERENCES classifications(id),
  approved_classification_id UUID REFERENCES classifications(id), -- Set by CD on decision

  -- Request Details
  sd_justification TEXT NOT NULL, -- Required from SD
  cd_comments TEXT, -- Optional from CD

  -- Status & Decision
  status VARCHAR(50) NOT NULL DEFAULT 'pending', -- 'pending', 'approved', 'resolved'
  cd_decision_type VARCHAR(50), -- 'approved_as_requested', 'approved_different'

  -- Timestamps
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  responded_at TIMESTAMP, -- When CD made decision
  reminder_sent_at TIMESTAMP, -- For 5-day reminder

  -- Audit
  created_by UUID NOT NULL REFERENCES user_profiles(id),
  responded_by UUID REFERENCES user_profiles(id),

  CONSTRAINT unique_entry_request UNIQUE(entry_id) -- Only one request per entry
);

-- Indexes
CREATE INDEX idx_requests_status ON classification_exception_requests(status);
CREATE INDEX idx_requests_competition ON classification_exception_requests(competition_id);
CREATE INDEX idx_requests_studio ON classification_exception_requests(studio_id);
CREATE INDEX idx_requests_tenant ON classification_exception_requests(tenant_id);
CREATE INDEX idx_requests_created_at ON classification_exception_requests(created_at);
```

### Entry Status Extension

**New Status Values for `competition_entries.status`:**
- `'pending_classification_approval'` - Entry created but waiting for CD approval

**Note:** No "denied" status. When CD "denies", they set the classification and entry becomes regular status.

---

## User Flows

### Flow 1: SD Creates Entry - Single Entry Form

**Step 1: Entry Creation**
1. SD fills out entry form
2. SD selects dancers
3. System **auto-calculates** classification (shown as read-only)
4. SD cannot change classification manually

**Step 2: SD Sees Classification Doesn't Match Needs**
1. SD sees: "Detected: Intermediate (based on average age, rounded down)"
2. SD wants: Advanced instead
3. SD clicks: **"Request Classification Exception"** button (below auto-calculated section)

**Step 3: Exception Request Modal (WITH WARNING)**
```
⚠️ Request Classification Exception

Current Classification: Intermediate (auto-calculated)
Requested Classification: [Dropdown: Advanced selected by SD]

⚠️ WARNING: This will:
• Create the entry immediately with your requested classification
• Mark it as "Pending Approval" (you cannot edit until CD responds)
• Send request to Competition Director
• Block summary submission until approved
• Entry will be created NOW (not after approval)

Justification (Required):
[Text box: "Three of our dancers recently tested to Advanced level..."]

[Go Back] [Request Exception]
```

**IMPORTANT WARNING:**
- Modal MUST clearly warn that entry is created immediately
- SD needs to understand this is not a preview/draft
- Entry goes into their entries list right away
- Cannot be edited until CD responds (locked)

**Step 4: Entry Created**
- Entry saved with `status = 'pending_classification_approval'`
- Entry appears in SD's entries list with badge: "⏳ Pending CD Approval"
- Exception request created in `classification_exception_requests` table
- Email sent to CD immediately

**Step 5: SD Cannot Edit or Delete**
- Entry is **locked** until CD responds
- SD can view but cannot edit
- SD can delete (cancels request)

---

### Flow 2: SD Creates Entry - CSV Import

**Step 1: CSV Upload & Preview**
1. SD uploads CSV with 50 routines
2. System validates each row
3. System auto-calculates classification for each

**Step 2: Preview Shows Violations**
```
CSV Preview (50 routines)

✅ 45 routines - Classification matches auto-calculated
⚠️ 5 routines - Classification doesn't match auto-calculated

Routine #12: "Summer Breeze"
- CSV Classification: Advanced
- Auto-Calculated: Intermediate
- [Request Exception]

Routine #23: "Fire Dance"
- CSV Classification: Elite
- Auto-Calculated: Advanced
- [Request Exception]
...
```

**Step 3: SD Clicks "Request Exception" for Routine #12**
Modal appears:
```
⚠️ Request Classification Exception

This will:
• Create the entry immediately with your requested classification
• Mark it as "Pending Approval"
• Remove it from CSV preview
• Send request to Competition Director
• Block summary submission until approved

Justification (Required):
[Text box]

[Go Back] [Request Exception]
```

**Step 4: Entry Created & Row Greyed Out**
- Entry #12 created **immediately** with `status = 'pending_classification_approval'`
- Routine #12 row **greyed out** in CSV preview with badge: "⏳ Exception Requested"
- Row stays in preview (not removed) but greyed
- Entry already created (not waiting for import)

**Step 5: SD Can Continue Without Blocking**
- SD can request exceptions for other violations (each creates entry immediately)
- SD can import remaining valid routines at any time
- Greyed-out rows with exceptions already imported (no action needed)

**Step 6: Import Button**
- "Import 45 Valid Routines" button always enabled (even with pending exceptions)
- Violations with requested exceptions already imported (greyed out = already done)
- Only non-greyed violations block import (must fix or request exception first)

---

### Flow 3: CD Reviews Exception Request

**Step 1: CD Notification**
- Email sent immediately: "New Classification Request from [Studio Name]"
- Badge count on CD dashboard: "Requests (3)"
- Quick action button: **"Classification Requests (3)"**

**Step 2: CD Clicks "Classification Requests" Button**
Route: `/dashboard/requests`

**List View - Card + Table Layout:**
```
Classification Exception Requests

View: [Card] [Table]    Filter: [All Studios ▼]    Sort: [Newest First ▼]

CARD VIEW:
┌─────────────────────────────────────────────────┐
│ Studio: Impact Dance Complex                    │
│ Routine: "Summer Breeze"                        │
│ Competition: EMPWR Dance Experience 2025        │
│ Requested: Advanced (Currently: Intermediate)   │
│ Submitted: 2 hours ago                          │
│                                                  │
│ [View Details →]                                │
└─────────────────────────────────────────────────┘

TABLE VIEW:
┌────────────────┬──────────────┬─────────────┬──────────────┬─────────────┐
│ Studio         │ Routine      │ Auto-Calc   │ Requested    │ Submitted   │
├────────────────┼──────────────┼─────────────┼──────────────┼─────────────┤
│ Impact Dance   │ Summer Br... │ Intermediate│ Advanced     │ 2 hours ago │
│ NJADS          │ Fire Dance   │ Advanced    │ Elite        │ 1 day ago   │
└────────────────┴──────────────┴─────────────┴──────────────┴─────────────┘
```

**CD Must Review Individually:**
- No bulk approve/deny
- Must click into each request (card or table row)
- Detail view modal opens for decision

**Step 3: CD Clicks "View Details"**

**Detail View - Full Information:**
```
Classification Exception Request

Studio: Impact Dance Complex
Routine: "Summer Breeze"
Competition: EMPWR Dance Experience 2025
Style: Contemporary
Duration: 3:15

DANCERS (6 dancers):
1. Sarah Johnson - Advanced
2. Emma Davis - Intermediate
3. Lily Brown - Intermediate
4. Mia Wilson - Intermediate
5. Ava Martinez - Advanced
6. Sophia Anderson - Intermediate

AUTO-CALCULATED CLASSIFICATION: Intermediate
(Based on: 4/6 dancers = 67% Intermediate majority)

REQUESTED CLASSIFICATION: Advanced

SD JUSTIFICATION:
"Three of our dancers recently tested to Advanced level and this routine
was choreographed specifically for Advanced competition. We believe the
technical difficulty matches Advanced requirements."

───────────────────────────────────────────────

CD DECISION:

⚪ Approve as Requested (Advanced)
⚪ Set Different Classification: [Dropdown: Select Classification ▼]

CD Comments (Optional):
[Text box]

[Cancel] [Submit Decision]
```

**Step 4: CD Makes Decision**

**Option A: CD Approves as Requested**
- CD selects: "Approve as Requested (Advanced)"
- Entry's `classification_id` updated to Advanced
- Entry's `status` changes from `'pending_classification_approval'` → regular status
- Request's `status` = `'approved'`
- Request's `cd_decision_type` = `'approved_as_requested'`
- Request's `approved_classification_id` = Advanced classification ID
- Request record stays in table for audit history

**Option B: CD Sets Different Classification**
- CD selects: "Set Different Classification"
- CD picks from dropdown: "Intermediate" (the auto-calculated one)
- Entry's `classification_id` updated to Intermediate
- Entry's `status` changes from `'pending_classification_approval'` → regular status
- Request's `status` = `'resolved'`
- Request's `cd_decision_type` = `'approved_different'`
- Request's `approved_classification_id` = Intermediate classification ID
- Request record stays in table for audit history

**Note:** In both cases, classification is **locked**. SD cannot change it.

---

### Flow 4: SD Receives CD Decision

**Step 1: Notification**
- Email sent to SD
- In-app notification (if system exists)
- Entry badge updates

**Step 2: Approved Request**
- SD sees entry in list with: "✅ Classification Approved"
- Entry status is now regular (no longer pending)
- Entry can be included in summary submission

**Step 3: "Denied" Request (CD Set Different Classification)**
- SD sees entry in list with: "✅ Classification Set by CD"
- Entry status is now regular
- Entry can be included in summary submission
- SD can see which classification CD chose
- SD **cannot** change classification (locked)

---

## Summary Submission Blocking

**Rule:** Cannot submit summary for a reservation if ANY entry in that reservation has `status = 'pending_classification_approval'`

**Implementation:**
```typescript
// In summary submission validation
const pendingRequests = entries.filter(e => e.status === 'pending_classification_approval');

if (pendingRequests.length > 0) {
  throw new Error(
    `Cannot submit summary: ${pendingRequests.length} entries have pending classification requests. ` +
    `Please wait for Competition Director approval or cancel the requests.`
  );
}
```

**UI Display:**
```
Summary Submission Blocked

You have 2 entries with pending classification requests:
• "Summer Breeze" - Requested: Advanced
• "Fire Dance" - Requested: Elite

You cannot submit your summary until these requests are approved
or cancelled.

[View Pending Requests]
```

---

## Email Templates

### Template 1: To CD - New Request

**Template Name:** `classification-exception-new-request`

**Subject:** New Classification Request from {studioName} - {routineName}

**HTML Body:**
```html
<h2>New Classification Exception Request</h2>

<p>A studio has requested a classification exception for a routine entry.</p>

<table>
  <tr>
    <td><strong>Studio:</strong></td>
    <td>{studioName}</td>
  </tr>
  <tr>
    <td><strong>Routine:</strong></td>
    <td>{routineName}</td>
  </tr>
  <tr>
    <td><strong>Competition:</strong></td>
    <td>{competitionName}</td>
  </tr>
  <tr>
    <td><strong>Auto-Calculated:</strong></td>
    <td>{autoCalculatedClassification}</td>
  </tr>
  <tr>
    <td><strong>Requested:</strong></td>
    <td>{requestedClassification}</td>
  </tr>
</table>

<h3>Studio Director's Justification:</h3>
<blockquote>{sdJustification}</blockquote>

<p>
  <a href="{reviewUrl}" style="background: #8B5CF6; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">
    Review Request →
  </a>
</p>

<p style="color: #6B7280; font-size: 14px;">
  This request was submitted on {requestDate} at {requestTime}
</p>
```

---

### Template 2: To SD - Request Approved

**Template Name:** `classification-exception-approved`

**Subject:** Classification Request Approved - {routineName}

**HTML Body:**
```html
<h2>✅ Classification Request Approved</h2>

<p>Great news! Your classification exception request has been approved.</p>

<table>
  <tr>
    <td><strong>Routine:</strong></td>
    <td>{routineName}</td>
  </tr>
  <tr>
    <td><strong>Competition:</strong></td>
    <td>{competitionName}</td>
  </tr>
  <tr>
    <td><strong>Approved Classification:</strong></td>
    <td>{approvedClassification}</td>
  </tr>
</table>

{#if cdComments}
<h3>Competition Director's Comments:</h3>
<blockquote>{cdComments}</blockquote>
{/if}

<p>Your entry is now active and can be included in your summary submission.</p>

<p>
  <a href="{entriesUrl}" style="background: #10B981; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">
    View Entries →
  </a>
</p>
```

---

### Template 3: To SD - Classification Set by CD

**Template Name:** `classification-exception-resolved`

**Subject:** Classification Set by Director - {routineName}

**HTML Body:**
```html
<h2>Classification Set by Competition Director</h2>

<p>The Competition Director has reviewed your classification request and set the final classification for your routine.</p>

<table>
  <tr>
    <td><strong>Routine:</strong></td>
    <td>{routineName}</td>
  </tr>
  <tr>
    <td><strong>Competition:</strong></td>
    <td>{competitionName}</td>
  </tr>
  <tr>
    <td><strong>You Requested:</strong></td>
    <td>{requestedClassification}</td>
  </tr>
  <tr>
    <td><strong>Final Classification:</strong></td>
    <td>{approvedClassification}</td>
  </tr>
</table>

{#if cdComments}
<h3>Competition Director's Comments:</h3>
<blockquote>{cdComments}</blockquote>
{/if}

<p>Your entry is now active and can be included in your summary submission. The classification is locked and cannot be changed.</p>

<p>
  <a href="{entriesUrl}" style="background: #8B5CF6; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">
    View Entries →
  </a>
</p>
```

---

### Template 4: To CD - 5-Day Reminder (Individual)

**Template Name:** `classification-exception-reminder`

**Subject:** REMINDER: Pending Classification Request from {studioName}

**HTML Body:**
```html
<h2>⏰ Pending Classification Request Reminder</h2>

<p>This classification exception request has been pending for 5 days.</p>

<table>
  <tr>
    <td><strong>Studio:</strong></td>
    <td>{studioName}</td>
  </tr>
  <tr>
    <td><strong>Routine:</strong></td>
    <td>{routineName}</td>
  </tr>
  <tr>
    <td><strong>Competition:</strong></td>
    <td>{competitionName}</td>
  </tr>
  <tr>
    <td><strong>Requested Classification:</strong></td>
    <td>{requestedClassification}</td>
  </tr>
  <tr>
    <td><strong>Submitted:</strong></td>
    <td>{requestDate} ({daysAgo} days ago)</td>
  </tr>
</table>

<p>
  <a href="{reviewUrl}" style="background: #F59E0B; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">
    Review Request →
  </a>
</p>

<p style="color: #6B7280; font-size: 14px;">
  The studio cannot submit their summary until this request is resolved.
</p>
```

---

### Template 5: To CD - Daily Digest (9 AM)

**Template Name:** `cd-daily-pending-actions-digest`

**Subject:** Daily Digest: {pendingCount} Pending Actions - {competitionName}

**HTML Body:**
```html
<h2>📋 Daily Pending Actions Digest</h2>

<p>Good morning! You have {pendingCount} pending action(s) requiring your attention.</p>

{#if classificationRequests.length > 0}
<div style="background: #FEF3C7; border-left: 4px solid #F59E0B; padding: 16px; margin: 16px 0;">
  <h3 style="margin: 0 0 12px 0; color: #92400E;">Classification Exception Requests ({classificationRequests.length})</h3>
  <ul style="margin: 0; padding-left: 20px; color: #78350F;">
    {#each classificationRequests as request}
    <li style="margin-bottom: 8px;">
      <strong>{request.studioName}</strong> - "{request.routineName}" (Requested: {request.requestedClassification})
      <br/>
      <span style="font-size: 13px; color: #A16207;">Submitted {request.daysAgo} day(s) ago</span>
    </li>
    {/each}
  </ul>
  <a href="{classificationRequestsUrl}" style="display: inline-block; margin-top: 12px; background: #F59E0B; color: white; padding: 8px 16px; text-decoration: none; border-radius: 6px; font-size: 14px;">
    Review Requests →
  </a>
</div>
{/if}

{#if pendingReservations.length > 0}
<div style="background: #DBEAFE; border-left: 4px solid #3B82F6; padding: 16px; margin: 16px 0;">
  <h3 style="margin: 0 0 12px 0; color: #1E3A8A;">Pending Reservations ({pendingReservations.length})</h3>
  <ul style="margin: 0; padding-left: 20px; color: #1E40AF;">
    {#each pendingReservations as reservation}
    <li style="margin-bottom: 8px;">
      <strong>{reservation.studioName}</strong> - {reservation.spacesRequested} spaces
      <br/>
      <span style="font-size: 13px; color: #2563EB;">Submitted {reservation.daysAgo} day(s) ago</span>
    </li>
    {/each}
  </ul>
  <a href="{reservationsUrl}" style="display: inline-block; margin-top: 12px; background: #3B82F6; color: white; padding: 8px 16px; text-decoration: none; border-radius: 6px; font-size: 14px;">
    Review Reservations →
  </a>
</div>
{/if}

{#if pendingInvoices.length > 0}
<div style="background: #D1FAE5; border-left: 4px solid #10B981; padding: 16px; margin: 16px 0;">
  <h3 style="margin: 0 0 12px 0; color: #064E3B;">Invoices to Create/Send ({pendingInvoices.length})</h3>
  <ul style="margin: 0; padding-left: 20px; color: #065F46;">
    {#each pendingInvoices as invoice}
    <li style="margin-bottom: 8px;">
      <strong>{invoice.studioName}</strong> - ${invoice.amount} ({invoice.type})
      <br/>
      <span style="font-size: 13px; color: #059669;">Due {invoice.daysUntilDue} day(s)</span>
    </li>
    {/each}
  </ul>
  <a href="{invoicesUrl}" style="display: inline-block; margin-top: 12px; background: #10B981; color: white; padding: 8px 16px; text-decoration: none; border-radius: 6px; font-size: 14px;">
    View Invoices →
  </a>
</div>
{/if}

<hr style="border: 0; border-top: 1px solid #E5E7EB; margin: 24px 0;"/>

<p style="color: #6B7280; font-size: 13px;">
  This digest is sent daily at 9:00 AM (your local time) when you have pending actions.
  <br/>
  You will not receive this email on days with no pending items.
</p>
```

**Cron Schedule:** Daily at 9:00 AM (tenant timezone)
**Condition:** Only send if at least one pending item exists
**Target:** All Competition Directors for tenant

---

## UI Components

### Component 1: CD Dashboard Quick Action Button

**Location:** CD Dashboard (`/dashboard` when role = 'competition_director')

**Button Design:**
```jsx
<Link
  href="/dashboard/requests"
  className="relative bg-gradient-to-br from-orange-500/20 to-yellow-500/20 backdrop-blur-md rounded-xl p-6 hover:from-orange-500/30 hover:to-yellow-500/30 transition-all duration-200 cursor-pointer border border-orange-400/30"
>
  <div className="flex items-center justify-between mb-4">
    <h3 className="text-lg font-semibold text-white">Classification Requests</h3>
    <div className="text-3xl">📋</div>
  </div>

  {/* Badge Count */}
  {pendingCount > 0 && (
    <div className="absolute -top-2 -right-2 bg-red-500 text-white text-xs font-bold rounded-full w-8 h-8 flex items-center justify-center animate-pulse">
      {pendingCount}
    </div>
  )}

  <div className="text-4xl font-bold text-white mb-2">{totalRequests}</div>
  <div className="space-y-1 text-sm">
    <div className="flex justify-between text-gray-300">
      <span>Pending:</span>
      <span className="font-semibold text-orange-400">{pendingCount}</span>
    </div>
    <div className="flex justify-between text-gray-300">
      <span>Resolved:</span>
      <span className="font-semibold text-green-400">{resolvedCount}</span>
    </div>
  </div>
</Link>
```

---

### Component 2: Request Exception Button (Entry Form)

**Location:** Below Auto-Calculated section in entry form

```jsx
{/* Only show if classification is auto-calculated and SD wants different */}
<button
  onClick={handleRequestException}
  className="w-full mt-4 px-4 py-2 bg-orange-500 hover:bg-orange-600 text-white rounded-lg font-semibold transition-colors"
>
  Request Classification Exception
</button>
```

---

### Component 3: Exception Request Modal

```jsx
<Modal open={showRequestModal} onClose={handleCloseModal}>
  <div className="bg-gradient-to-br from-purple-900 via-indigo-900 to-blue-900 p-8 rounded-xl border border-orange-400/50 max-w-2xl">
    <div className="flex items-center gap-3 mb-6">
      <div className="text-4xl">⚠️</div>
      <h2 className="text-2xl font-bold text-white">Request Classification Exception</h2>
    </div>

    <div className="bg-white/10 rounded-lg p-4 mb-6">
      <div className="grid grid-cols-2 gap-4 text-sm">
        <div>
          <span className="text-gray-400">Auto-Calculated:</span>
          <span className="text-white font-semibold ml-2">{autoCalculatedClassification}</span>
        </div>
        <div>
          <span className="text-gray-400">Requested:</span>
          <span className="text-orange-400 font-semibold ml-2">{requestedClassification}</span>
        </div>
      </div>
    </div>

    <div className="bg-orange-500/20 border border-orange-500/50 rounded-lg p-4 mb-6">
      <h3 className="text-white font-semibold mb-2">This will:</h3>
      <ul className="text-gray-300 text-sm space-y-1">
        <li>• Create the entry immediately with your requested classification</li>
        <li>• Mark it as "Pending Approval"</li>
        {isCSVImport && <li>• Remove it from CSV preview</li>}
        <li>• Send request to Competition Director</li>
        <li>• Block summary submission until approved</li>
      </ul>
    </div>

    <div className="mb-6">
      <label className="block text-white font-semibold mb-2">
        Justification (Required) *
      </label>
      <textarea
        value={justification}
        onChange={(e) => setJustification(e.target.value)}
        placeholder="Explain why you need this classification..."
        className="w-full px-4 py-3 bg-white/5 border border-white/20 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-orange-500"
        rows={4}
        required
      />
    </div>

    <div className="flex gap-3">
      <button
        onClick={handleCloseModal}
        className="flex-1 px-6 py-3 bg-white/10 hover:bg-white/20 text-white rounded-lg font-semibold transition-colors"
      >
        Go Back
      </button>
      <button
        onClick={handleSubmitRequest}
        disabled={!justification.trim()}
        className="flex-1 px-6 py-3 bg-orange-500 hover:bg-orange-600 disabled:bg-gray-500 disabled:cursor-not-allowed text-white rounded-lg font-semibold transition-colors"
      >
        Request Exception
      </button>
    </div>
  </div>
</Modal>
```

---

### Component 4: Pending Entry Badge

**Location:** In SD's entries list

```jsx
{entry.status === 'pending_classification_approval' && (
  <div className="inline-flex items-center gap-2 px-3 py-1 bg-orange-500/20 border border-orange-500/50 rounded-full">
    <div className="w-2 h-2 bg-orange-500 rounded-full animate-pulse"></div>
    <span className="text-xs font-semibold text-orange-300">Pending CD Approval</span>
  </div>
)}
```

---

## Backend Routes (tRPC)

### Route 1: Create Exception Request

```typescript
createClassificationException: protectedProcedure
  .input(z.object({
    entryId: z.string().uuid(),
    requestedClassificationId: z.string().uuid(),
    sdJustification: z.string().min(10),
  }))
  .mutation(async ({ ctx, input }) => {
    // 1. Verify entry exists and belongs to user's studio
    const entry = await prisma.competition_entries.findUnique({
      where: { id: input.entryId },
      include: {
        reservations: {
          include: {
            competitions: true,
            studios: true
          }
        }
      }
    });

    if (!entry || entry.reservations.studio_id !== ctx.studioId) {
      throw new TRPCError({ code: 'FORBIDDEN' });
    }

    // 2. Create exception request
    const request = await prisma.classification_exception_requests.create({
      data: {
        entry_id: input.entryId,
        reservation_id: entry.reservation_id,
        competition_id: entry.reservations.competition_id,
        studio_id: entry.reservations.studio_id,
        tenant_id: ctx.tenantId,
        auto_calculated_classification_id: entry.classification_id, // Current/auto-calculated
        requested_classification_id: input.requestedClassificationId,
        sd_justification: input.sdJustification,
        created_by: ctx.userId,
        status: 'pending',
      }
    });

    // 3. Update entry status
    await prisma.competition_entries.update({
      where: { id: input.entryId },
      data: {
        status: 'pending_classification_approval',
        classification_id: input.requestedClassificationId // Set to requested
      }
    });

    // 4. Send email to CD
    await sendEmail({
      templateType: 'classification-exception-new-request',
      // ... template data
    });

    // 5. Activity logging
    await logActivity({
      userId: ctx.userId,
      studioId: ctx.studioId,
      action: 'classification.request_exception',
      entityType: 'classification_request',
      entityId: request.id,
      details: {
        entry_id: input.entryId,
        requested_classification: input.requestedClassificationId,
      }
    });

    return request;
  });
```

---

### Route 2: Get Requests for CD

```typescript
getClassificationRequests: protectedProcedure
  .input(z.object({
    status: z.enum(['pending', 'approved', 'resolved', 'all']).default('pending'),
    studioId: z.string().uuid().optional(), // Filter by studio
  }))
  .query(async ({ ctx, input }) => {
    // Verify user is CD or SA
    if (!['competition_director', 'super_admin'].includes(ctx.userRole)) {
      throw new TRPCError({ code: 'FORBIDDEN' });
    }

    const where = {
      tenant_id: ctx.tenantId,
      ...(input.status !== 'all' && { status: input.status }),
      ...(input.studioId && { studio_id: input.studioId }),
    };

    const requests = await prisma.classification_exception_requests.findMany({
      where,
      include: {
        competition_entries: {
          include: {
            reservations: {
              include: {
                competitions: true,
                studios: true
              }
            }
          }
        },
        user_profiles_classification_exception_requests_created_byTouser_profiles: true,
        classifications_classification_exception_requests_auto_calculated_classification_idToclassifications: true,
        classifications_classification_exception_requests_requested_classification_idToclassifications: true,
        classifications_classification_exception_requests_approved_classification_idToclassifications: true,
      },
      orderBy: { created_at: 'desc' }
    });

    return requests;
  });
```

---

### Route 3: CD Makes Decision

```typescript
respondToClassificationRequest: protectedProcedure
  .input(z.object({
    requestId: z.string().uuid(),
    decisionType: z.enum(['approved_as_requested', 'approved_different']),
    approvedClassificationId: z.string().uuid(), // Always required
    cdComments: z.string().optional(),
  }))
  .mutation(async ({ ctx, input }) => {
    // Verify user is CD or SA
    if (!['competition_director', 'super_admin'].includes(ctx.userRole)) {
      throw new TRPCError({ code: 'FORBIDDEN' });
    }

    // Get request
    const request = await prisma.classification_exception_requests.findUnique({
      where: { id: input.requestId },
      include: { competition_entries: true }
    });

    if (!request) {
      throw new TRPCError({ code: 'NOT_FOUND' });
    }

    // Update request
    await prisma.classification_exception_requests.update({
      where: { id: input.requestId },
      data: {
        status: input.decisionType === 'approved_as_requested' ? 'approved' : 'resolved',
        cd_decision_type: input.decisionType,
        approved_classification_id: input.approvedClassificationId,
        cd_comments: input.cdComments,
        responded_at: new Date(),
        responded_by: ctx.userId,
      }
    });

    // Update entry - set classification and restore regular status
    await prisma.competition_entries.update({
      where: { id: request.entry_id },
      data: {
        classification_id: input.approvedClassificationId,
        status: 'draft', // Or whatever the regular status should be
      }
    });

    // Send email to SD
    const templateType = input.decisionType === 'approved_as_requested'
      ? 'classification-exception-approved'
      : 'classification-exception-resolved';

    await sendEmail({
      templateType,
      // ... template data
    });

    // Activity logging
    await logActivity({
      userId: ctx.userId,
      action: `classification.${input.decisionType}`,
      entityType: 'classification_request',
      entityId: request.id,
    });

    return { success: true };
  });
```

---

### Route 4: Get Request Count for Badge

```typescript
getClassificationRequestCount: protectedProcedure
  .query(async ({ ctx }) => {
    // Verify user is CD or SA
    if (!['competition_director', 'super_admin'].includes(ctx.userRole)) {
      return { pending: 0, total: 0 };
    }

    const [pending, total] = await Promise.all([
      prisma.classification_exception_requests.count({
        where: {
          tenant_id: ctx.tenantId,
          status: 'pending'
        }
      }),
      prisma.classification_exception_requests.count({
        where: { tenant_id: ctx.tenantId }
      })
    ]);

    return { pending, total };
  });
```

---

## Implementation Checklist

### Phase 1: Database & Backend
- [ ] Create migration for `classification_exception_requests` table
- [ ] Add new status value to `competition_entries.status` enum
- [ ] Create tRPC routes (createClassificationException, getClassificationRequests, respondToClassificationRequest, getClassificationRequestCount)
- [ ] Add validation logic to prevent summary submission with pending requests
- [ ] Create email templates (4 templates)
- [ ] Add activity logging

### Phase 2: CD Interface
- [ ] Create `/dashboard/requests` page
- [ ] Build list view (card layout with studio filter)
- [ ] Build detail view modal
- [ ] Add quick action button to CD dashboard
- [ ] Add badge count to button
- [ ] Implement 5-day reminder cron job

### Phase 3: SD Interface
- [ ] Add "Request Exception" button to entry form
- [ ] Build exception request modal
- [ ] Add pending badge to entries list
- [ ] Lock pending entries (view only, can delete)
- [ ] Add CSV import warning modal
- [ ] Update CSV preview to show violations
- [ ] Implement "remove from preview on request" logic

### Phase 4: Testing
- [ ] Test single entry flow end-to-end
- [ ] Test CSV import flow with violations
- [ ] Test summary submission blocking
- [ ] Test CD approval flow
- [ ] Test CD "set different classification" flow
- [ ] Test email notifications
- [ ] Test 5-day reminder
- [ ] Test on both tenants (EMPWR + Glow)

---

## Edge Cases & Error Handling

### Edge Case 1: SD Deletes Pending Entry
- SD can delete entry with `status = 'pending_classification_approval'`
- On delete: CASCADE deletes associated request from `classification_exception_requests` (FK constraint)
- No email to CD (silent cancellation)
- Entry removed from SD dashboard immediately

### Edge Case 2: Production Entries (20+ dancers)
- Production classification is **always locked to "Production"**
- No exception requests allowed
- "Request Exception" button should not appear for Production entries

### Edge Case 3: Multiple Violations in CSV
- SD can request exceptions for multiple entries
- Each creates separate email to CD
- SD can mix: fix some, request exceptions for others

### Edge Case 4: 5-Day Reminder
- Cron job runs daily
- Finds requests where `created_at` > 5 days and `status = 'pending'` and `reminder_sent_at IS NULL`
- Sends reminder email to CD
- Updates `reminder_sent_at` timestamp
- Only sends ONE reminder (not recurring)

### Edge Case 5: Tenant Isolation
- All queries filtered by `tenant_id`
- CD can only see requests for their tenant
- SD can only create requests for their studio's entries

### Edge Case 6: Age Group Override (No Approval Needed)
- SD can bump age group +1 year (optional)
- Age group override does NOT require CD approval
- Only classification exceptions need approval
- Example: 12-14 age group → SD can override to 15-17 (no approval needed)
- Classification is still auto-calculated based on final age group

### Edge Case 7: Daily Digest Conditions
- Cron runs daily at 9:00 AM (tenant timezone)
- Query for ALL pending actions:
  - `classification_exception_requests` where `status = 'pending'`
  - `reservations` where `status = 'pending'`
  - `invoices` where `status IN ('draft', 'ready_to_send')`
- Only send email if at least ONE item exists
- If zero pending items → No email sent
- Template conditionally renders sections based on what exists

---

## Success Metrics

### For Studio Directors
- Time to create entry with exception: < 3 minutes
- Clarity of approval status: Clear badges and notifications
- Ability to track pending requests: Visible in entries list

### For Competition Directors
- Time to review request: < 2 minutes
- Ease of decision-making: All relevant info on one screen
- Notification efficiency: Real-time email + badge count

### System Performance
- Request creation: < 500ms
- Email delivery: < 5 seconds
- Summary submission validation: < 200ms

---

**End of Specification**
