# Task: Add "My Routines" Summary Element

**Priority**: MEDIUM (Workflow Redesign)
**Estimate**: 2-3 hours
**Status**: Ready for Codex

---

## Context

Add a summary element to the "My Routines" page showing:
- Total Routines
- Estimated Total Cost (calculated by backend)
- Remaining Tokens (from reservation)

**Actions**:
- "Send Summary (Request Invoice)" - Locks routines, notifies CD
- "Download Summary (PDF)" - Export print-friendly summary

---

## Component to Create

**File**: `src/components/RoutinesSummaryElement.tsx`

```tsx
'use client';

import { useState } from 'react';
import { trpc } from '@/lib/trpc';
import toast from 'react-hot-toast';

interface RoutinesSummaryElementProps {
  studioId: string;
  competitionId: string;
  onSummarySubmitted?: () => void;
}

export default function RoutinesSummaryElement({
  studioId,
  competitionId,
  onSummarySubmitted
}: RoutinesSummaryElementProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Fetch summary data
  const { data: summary, isLoading } = trpc.entry.getSummary.useQuery({
    studioId,
    competitionId
  });

  // Submit summary mutation (request invoice)
  const submitSummary = trpc.entry.submitSummary.useMutation({
    onSuccess: () => {
      toast.success('Summary sent to Competition Director', { position: 'top-right' });
      onSummarySubmitted?.();
    },
    onError: (error) => {
      toast.error(`Failed to send summary: ${error.message}`, { position: 'top-right' });
    }
  });

  // Download PDF mutation
  const downloadPDF = trpc.entry.downloadSummaryPDF.useMutation({
    onSuccess: (pdfUrl) => {
      window.open(pdfUrl, '_blank');
      toast.success('PDF downloaded', { position: 'top-right' });
    },
    onError: (error) => {
      toast.error(`Failed to generate PDF: ${error.message}`, { position: 'top-right' });
    }
  });

  const handleSubmitSummary = async () => {
    if (!summary || summary.totalRoutines === 0) {
      toast.error('No routines to submit', { position: 'top-right' });
      return;
    }

    const confirmed = window.confirm(
      `Submit summary of ${summary.totalRoutines} routines to Competition Director? This will lock these routines and request an invoice.`
    );

    if (confirmed) {
      setIsSubmitting(true);
      await submitSummary.mutateAsync({ studioId, competitionId });
      setIsSubmitting(false);
    }
  };

  const handleDownloadPDF = () => {
    downloadPDF.mutate({ studioId, competitionId });
  };

  if (isLoading) {
    return (
      <div className="bg-white/10 backdrop-blur-md rounded-xl border border-white/20 p-6 animate-pulse">
        <div className="h-24 bg-white/5 rounded"></div>
      </div>
    );
  }

  if (!summary) return null;

  return (
    <div className="bg-gradient-to-br from-purple-500/20 via-pink-500/20 to-blue-500/20 backdrop-blur-md rounded-xl border-2 border-white/30 p-6 shadow-2xl">
      {/* Header */}
      <div className="flex items-center gap-3 mb-4">
        <span className="text-4xl">📊</span>
        <h2 className="text-2xl font-bold text-white">Routine Summary</h2>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        {/* Total Routines */}
        <div className="bg-white/10 rounded-lg p-4 border border-white/20">
          <div className="text-gray-300 text-sm mb-1">Total Routines</div>
          <div className="text-3xl font-bold text-white">
            {summary.totalRoutines}
          </div>
        </div>

        {/* Estimated Cost */}
        <div className="bg-white/10 rounded-lg p-4 border border-white/20">
          <div className="text-gray-300 text-sm mb-1">Estimated Total</div>
          <div className="text-3xl font-bold text-green-400">
            ${summary.estimatedCost?.toFixed(2) || '—'}
          </div>
          <div className="text-xs text-gray-400 mt-1">
            Final cost determined by CD
          </div>
        </div>

        {/* Remaining Tokens */}
        <div className="bg-white/10 rounded-lg p-4 border border-white/20">
          <div className="text-gray-300 text-sm mb-1">Remaining Tokens</div>
          <div className="text-3xl font-bold text-purple-400">
            {summary.remainingTokens || 0}
          </div>
          <div className="text-xs text-gray-400 mt-1">
            From approved reservations
          </div>
        </div>
      </div>

      {/* Status Message */}
      {summary.status === 'locked' && (
        <div className="bg-yellow-500/10 border border-yellow-400/30 rounded-lg p-3 mb-4">
          <div className="text-yellow-300 text-sm">
            🔒 Summary submitted. Awaiting invoice from Competition Director.
          </div>
        </div>
      )}

      {summary.status === 'invoiced' && (
        <div className="bg-blue-500/10 border border-blue-400/30 rounded-lg p-3 mb-4">
          <div className="text-blue-300 text-sm">
            📄 Invoice generated. Check your invoices page.
          </div>
        </div>
      )}

      {/* Action Buttons */}
      {summary.status !== 'locked' && summary.status !== 'invoiced' && (
        <div className="flex flex-col sm:flex-row gap-3">
          <button
            onClick={handleSubmitSummary}
            disabled={isSubmitting || summary.totalRoutines === 0}
            className="flex-1 bg-gradient-to-r from-purple-500 to-pink-500 text-white font-semibold px-6 py-3 rounded-lg hover:shadow-lg transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isSubmitting ? '⏳ Submitting...' : '📨 Send Summary (Request Invoice)'}
          </button>

          <button
            onClick={handleDownloadPDF}
            disabled={downloadPDF.isPending || summary.totalRoutines === 0}
            className="bg-white/10 backdrop-blur-md text-white font-semibold px-6 py-3 rounded-lg border border-white/20 hover:bg-white/20 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {downloadPDF.isPending ? '⏳ Generating...' : '📄 Download Summary (PDF)'}
          </button>
        </div>
      )}

      {/* Help Text */}
      <div className="mt-4 text-xs text-gray-400">
        <p>
          • <strong>Send Summary</strong>: Locks your routines and notifies the Competition Director to generate an invoice
        </p>
        <p className="mt-1">
          • <strong>Download PDF</strong>: Export a print-friendly summary for your records
        </p>
      </div>
    </div>
  );
}
```

---

## Backend Requirements

### New tRPC Queries/Mutations

**File**: `src/server/routers/entry.ts`

```typescript
// Get summary data
getSummary: protectedProcedure
  .input(z.object({
    studioId: z.string().uuid(),
    competitionId: z.string().uuid()
  }))
  .query(async ({ ctx, input }) => {
    const { studioId, competitionId } = input;

    // Get all routines for this studio/competition
    const routines = await prisma.entries.findMany({
      where: {
        studio_id: studioId,
        competition_id: competitionId,
        status: { not: 'cancelled' }
      }
    });

    // Calculate estimated cost (backend logic)
    const estimatedCost = routines.reduce((sum, r) => sum + (r.price || 0), 0);

    // Get remaining tokens from reservations
    const reservations = await prisma.reservations.findMany({
      where: {
        studio_id: studioId,
        competition_id: competitionId,
        status: 'approved'
      }
    });

    const totalConfirmed = reservations.reduce((sum, r) => sum + (r.routines_confirmed || 0), 0);
    const remainingTokens = totalConfirmed - routines.length;

    // Check if summary already submitted
    const existingSummary = await prisma.routine_summaries.findFirst({
      where: { studio_id: studioId, competition_id: competitionId }
    });

    return {
      totalRoutines: routines.length,
      estimatedCost,
      remainingTokens,
      status: existingSummary?.status || 'draft' // draft | locked | invoiced
    };
  }),

// Submit summary (request invoice)
submitSummary: protectedProcedure
  .input(z.object({
    studioId: z.string().uuid(),
    competitionId: z.string().uuid()
  }))
  .mutation(async ({ ctx, input }) => {
    const { studioId, competitionId } = input;

    // Create or update summary
    const summary = await prisma.routine_summaries.upsert({
      where: {
        studio_id_competition_id: {
          studio_id: studioId,
          competition_id: competitionId
        }
      },
      create: {
        studio_id: studioId,
        competition_id: competitionId,
        status: 'locked',
        submitted_at: new Date()
      },
      update: {
        status: 'locked',
        submitted_at: new Date()
      }
    });

    // Lock all routines
    await prisma.entries.updateMany({
      where: {
        studio_id: studioId,
        competition_id: competitionId
      },
      data: { locked: true }
    });

    // Send notification to Competition Director
    // TODO: Add email notification or in-app notification

    return summary;
  }),

// Download summary PDF
downloadSummaryPDF: protectedProcedure
  .input(z.object({
    studioId: z.string().uuid(),
    competitionId: z.string().uuid()
  }))
  .mutation(async ({ ctx, input }) => {
    // Generate PDF with summary data
    // Use existing PDF generation logic or library

    // Return download URL or base64
    return '/api/download-summary-pdf?studio=' + input.studioId + '&competition=' + input.competitionId;
  })
```

---

## Database Schema (If Needed)

**Migration**: `20250111_add_routine_summaries.sql`

```sql
CREATE TABLE IF NOT EXISTS routine_summaries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  studio_id UUID NOT NULL REFERENCES studios(id) ON DELETE CASCADE,
  competition_id UUID NOT NULL REFERENCES competitions(id) ON DELETE CASCADE,
  status TEXT NOT NULL CHECK (status IN ('draft', 'locked', 'invoiced')),
  submitted_at TIMESTAMPTZ,
  invoiced_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  UNIQUE(studio_id, competition_id)
);

CREATE INDEX idx_routine_summaries_studio ON routine_summaries(studio_id);
CREATE INDEX idx_routine_summaries_competition ON routine_summaries(competition_id);
CREATE INDEX idx_routine_summaries_status ON routine_summaries(status);

-- RLS policies
ALTER TABLE routine_summaries ENABLE ROW LEVEL SECURITY;

CREATE POLICY routine_summaries_select_own ON routine_summaries
  FOR SELECT USING (
    studio_id IN (
      SELECT id FROM studios WHERE owner_id = (SELECT auth.uid())
    )
  );

CREATE POLICY routine_summaries_select_cd ON routine_summaries
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = (SELECT auth.uid())
      AND role IN ('competition_director', 'super_admin')
    )
  );
```

---

## Integration Point

**File**: `src/app/dashboard/entries/page.tsx`

**Add above entries list**:
```tsx
import RoutinesSummaryElement from '@/components/RoutinesSummaryElement';

// Get studioId and competitionId from context
<div className="mb-8">
  <RoutinesSummaryElement
    studioId={studioId}
    competitionId={selectedCompetition}
    onSummarySubmitted={() => {
      // Refresh entries list
      refetch();
    }}
  />
</div>
```

---

## Quality Gates

1. ✅ **Summary displays correct counts**: Total routines accurate
2. ✅ **Estimated cost shown**: Calculated from backend
3. ✅ **Remaining tokens accurate**: From reservations
4. ✅ **Submit locks routines**: Can't edit after submit
5. ✅ **CD notified**: Email or in-app notification sent
6. ✅ **PDF downloads**: Summary exports correctly
7. ✅ **TypeScript compiles**: No errors

---

## Deliverables

Output file: `codex-tasks/outputs/routines_summary_element_result.md`

Include:
1. Component created
2. Backend mutations added
3. Database migration (if created)
4. Integration points
5. Test results
6. Build output

---

**Start Time**: [Record]
**Expected Duration**: 2-3 hours
