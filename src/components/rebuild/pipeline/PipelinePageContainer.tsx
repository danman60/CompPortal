"use client";

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { trpc } from '@/lib/trpc';
import { usePipelineReservations } from '@/hooks/rebuild/useReservations';
import { usePipelineFilters } from '@/hooks/rebuild/usePipelineFilters';
import { useTenantTheme } from '@/contexts/TenantThemeProvider';
import { PipelineHeader } from './PipelineHeader';
import { EventMetricsGrid } from './EventMetricsGrid';
import { PipelineStatusTabs } from './PipelineStatusTabs';
import { EventFilterDropdown } from './EventFilterDropdown';
import { ReservationTable } from './ReservationTable';
import { ApprovalModal } from './ApprovalModal';
import { RejectModal } from './RejectModal';
import toast from 'react-hot-toast';

type PipelineStatus = 'all' | 'pending' | 'approved' | 'summary_in' | 'invoiced' | 'paid';

interface ApprovalModalState {
  isOpen: boolean;
  studioName: string;
  studioId: string;
  competitionId: string;
  reservationId: string;
  requestedAmount: number;
  competitionCapacity: number;
  currentUsed: number;
}

interface RejectModalState {
  isOpen: boolean;
  reservationId: string;
  studioName: string;
  reason: string;
}

/**
 * Pipeline Page Container
 * CD-only reservation management dashboard
 *
 * Data flow:
 * - usePipelineReservations: Fetch reservations + mutations
 * - usePipelineFilters: Filter by status + event
 * - Pass filtered data to presentation components
 */
export function PipelinePageContainer() {
  const router = useRouter();
  const { tenant } = useTenantTheme();

  // Fetch competitions
  const { data: competitionsData, isLoading: competitionsLoading, refetch: refetchCompetitions } = trpc.competition.getAll.useQuery();
  const competitions = competitionsData?.competitions || [];

  const {
    reservations,
    isLoading: reservationsLoading,
    refetch,
    approve: approveReservation,
    reject: rejectReservation,
    createInvoice,
  } = usePipelineReservations(refetchCompetitions);

  // Mark as paid mutation
  const markAsPaidMutation = trpc.invoice.markAsPaid.useMutation({
    onSuccess: async () => {
      await refetch();
      await refetchCompetitions();
    },
  });

  const markAsPaid = async (payload: { invoiceId: string; studioId: string; competitionId: string }) => {
    await markAsPaidMutation.mutateAsync(payload);
  };

  const isLoading = reservationsLoading || competitionsLoading;

  const [approvalModal, setApprovalModal] = useState<ApprovalModalState>({
    isOpen: false,
    studioName: '',
    studioId: '',
    competitionId: '',
    reservationId: '',
    requestedAmount: 0,
    competitionCapacity: 600,
    currentUsed: 0,
  });
  const [rejectModal, setRejectModal] = useState<RejectModalState | null>(null);

  const {
    filteredReservations,
    statusCounts,
    statusFilter,
    setStatusFilter,
    eventFilter,
    setEventFilter,
  } = usePipelineFilters(reservations);

  // Calculate draft invoices count
  const draftInvoicesCount = reservations.filter(
    (r: any) => r.invoiceId && r.invoiceStatus === 'DRAFT'
  ).length;

  // Calculate event metrics
  const eventMetrics = competitions
    .filter((comp: any) => comp.name !== 'QA Automation' && comp.status !== 'cancelled')
    .map((comp: any) => {
      const totalCapacity = comp.total_reservation_tokens || comp.venue_capacity || 600;
      const availableCapacity = comp.available_reservation_tokens ?? totalCapacity;
      const reservedCount = totalCapacity - availableCapacity;
      const pendingCount = reservations.filter(
        (r: any) => r.competitionId === comp.id && r.status === 'pending'
      ).length;

      return {
        id: comp.id,
        name: comp.name,
        dates: `${comp.competition_start_date ? new Date(comp.competition_start_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : ''}-${comp.competition_end_date ? new Date(comp.competition_end_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : ''}, ${comp.year}`,
        location: comp.primary_location || 'TBD',
        totalCapacity,
        used: reservedCount,
        remaining: totalCapacity - reservedCount,
        percentage: (reservedCount / totalCapacity) * 100,
        pendingCount,
        studioCount: new Set(reservations.filter((r: any) => r.competitionId === comp.id).map((r: any) => r.studioId)).size,
      };
    });

  const openApprovalModal = (reservation: any) => {
    const competition = competitions.find((c: any) => c.id === reservation.competitionId);
    const totalCapacity = competition?.total_reservation_tokens || competition?.venue_capacity || 600;
    const currentUsed = reservations
      .filter((r: any) => r.competitionId === reservation.competitionId && r.status === 'approved')
      .reduce((sum: number, r: any) => sum + (r.spacesConfirmed || 0), 0);

    setApprovalModal({
      isOpen: true,
      studioName: reservation.studioName,
      studioId: reservation.studioId,
      competitionId: reservation.competitionId,
      reservationId: reservation.id,
      requestedAmount: reservation.spacesRequested || 0,
      competitionCapacity: totalCapacity,
      currentUsed,
    });
  };

  const closeApprovalModal = () => {
    setApprovalModal({
      isOpen: false,
      studioName: '',
      studioId: '',
      competitionId: '',
      reservationId: '',
      requestedAmount: 0,
      competitionCapacity: 600,
      currentUsed: 0,
    });
  };

  const handleApprove = async (approvalAmount: number) => {
    await approveReservation({
      reservationId: approvalModal.reservationId,
      spacesConfirmed: approvalAmount,
    });
    await refetchCompetitions(); // Await refetch to update capacity numbers
    closeApprovalModal();
  };

  const handleReject = (reservationId: string, studioName: string) => {
    setRejectModal({
      isOpen: true,
      reservationId,
      studioName,
      reason: '',
    });
  };

  const confirmReject = async () => {
    if (!rejectModal) return;
    await rejectReservation({
      id: rejectModal.reservationId,
      reason: rejectModal.reason,
    });
    setRejectModal(null);
  };

  const handleCreateInvoice = async (reservationId: string) => {
    const result = await createInvoice({ reservationId });

    // Find the reservation to get studioId and competitionId for redirect
    const reservation = reservations.find((r: any) => r.id === reservationId);
    if (reservation && result) {
      // Redirect to invoice detail page
      router.push(`/dashboard/invoices/${reservation.studioId}/${reservation.competitionId}`);
    }
  };

  const handleMarkAsPaid = async (invoiceId: string, studioId: string, competitionId: string) => {
    await markAsPaid({ invoiceId, studioId, competitionId });
  };

  // Send invoice mutation
  const sendInvoiceMutation = trpc.invoice.sendInvoice.useMutation({
    onSuccess: async () => {
      await refetch();
      await refetchCompetitions();
    },
  });

  const handleSendInvoice = async (invoiceId: string) => {
    await sendInvoiceMutation.mutateAsync({ invoiceId });
  };

  // Reopen summary mutation
  const reopenSummaryMutation = trpc.reservation.reopenSummary.useMutation({
    onSuccess: async () => {
      await refetch();
      await refetchCompetitions();
    },
  });

  const handleReopenSummary = async (reservationId: string, studioName: string) => {
    if (!confirm(`Reopen summary for ${studioName}?\n\nThis will:\n• Void any existing invoices\n• Allow studio to edit entries again\n• Require re-submitting summary`)) {
      return;
    }

    try {
      const result = await reopenSummaryMutation.mutateAsync({ reservationId });
      toast.success(result.message);
    } catch (error) {
      console.error('Failed to reopen summary:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to reopen summary');
    }
  };

  if (isLoading) {
    return (
      <main className="min-h-screen bg-gradient-to-br from-slate-900 via-gray-900 to-black p-6 flex items-center justify-center">
        <div className="text-center text-white">
          <div className="text-4xl mb-4 animate-pulse">⏳</div>
          <div className="text-xl font-semibold mb-2">Loading pipeline...</div>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-gradient-to-br from-slate-900 via-gray-900 to-black p-6">
      <div className="max-w-[1800px] mx-auto">
        <PipelineHeader />

        <EventMetricsGrid metrics={eventMetrics} />

        <EventFilterDropdown
          competitions={competitions}
          reservations={reservations}
          eventFilter={eventFilter}
          onEventFilterChange={setEventFilter}
        />

        <PipelineStatusTabs
          statusFilter={statusFilter}
          onStatusFilterChange={setStatusFilter}
          stats={{
            needAction: statusCounts.pending,
            approved: statusCounts.approved,
            summariesIn: statusCounts.summary_in,
            invoicesOut: statusCounts.invoiced,
            paid: statusCounts.paid,
          }}
          totalReservations={reservations.length}
        />

        <ReservationTable
          reservations={filteredReservations}
          onApprove={openApprovalModal}
          onReject={handleReject}
          onCreateInvoice={handleCreateInvoice}
          onSendInvoice={handleSendInvoice}
          onMarkAsPaid={handleMarkAsPaid}
          onReopenSummary={handleReopenSummary}
        />

        {approvalModal.isOpen && (
          <ApprovalModal
            {...approvalModal}
            onApprove={handleApprove}
            onCancel={closeApprovalModal}
          />
        )}

        {rejectModal && (
          <RejectModal
            studioName={rejectModal.studioName}
            reason={rejectModal.reason}
            onReasonChange={(reason) => setRejectModal({ ...rejectModal, reason })}
            onConfirm={confirmReject}
            onCancel={() => setRejectModal(null)}
          />
        )}
      </div>
    </main>
  );
}
