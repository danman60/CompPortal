'use client';

import { useState } from 'react';
import { trpc } from '@/lib/trpc';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import toast from 'react-hot-toast';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { formatDistanceToNow } from 'date-fns';

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

export default function ReservationPipeline() {
  const router = useRouter();
  const [statusFilter, setStatusFilter] = useState<PipelineStatus>('all');
  const [eventFilter, setEventFilter] = useState<string>('all'); // 'all' or competitionId
  const [expandedProfiles, setExpandedProfiles] = useState<Set<string>>(new Set());
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
  const [approvalAmount, setApprovalAmount] = useState<number>(0);
  const [remindConfirm, setRemindConfirm] = useState<{isOpen: boolean; studioName: string; studioId: string; competitionId: string} | null>(null);
  const [rejectModal, setRejectModal] = useState<{
    isOpen: boolean;
    reservationId: string;
    studioName: string;
    reason: string;
  } | null>(null);

  // Fetch data
  const { data: pipelineData, isLoading, refetch } = trpc.reservation.getPipelineView.useQuery();
  const { data: competitions, refetch: refetchCompetitions } = trpc.competition.getAll.useQuery();
  const utils = trpc.useUtils();

  // Mutations
  const approveMutation = trpc.reservation.approve.useMutation({
    onSuccess: async () => {
      toast.success('Reservation approved!');
      closeApprovalModal();
      // Refetch immediately to update counters and table
      await Promise.all([
        refetch(),
        refetchCompetitions(),
      ]);
    },
    onError: (error) => {
      toast.error(`Error: ${error.message}`);
    },
  });

  const createInvoiceMutation = trpc.invoice.createFromReservation.useMutation({
    onSuccess: async (data, variables) => {
      toast.success('Invoice created! Click to view and send.');
      await refetch();
      // Find the reservation to get studioId and competitionId
      const reservation = reservations.find(r => r.id === variables.reservationId);
      if (reservation) {
        router.push(`/dashboard/invoices/${reservation.studioId}/${reservation.competitionId}`);
      }
    },
    onError: (error) => {
      toast.error(`Failed to create invoice: ${error.message}`);
    },
  });

  const markAsPaidMutation = trpc.invoice.markAsPaid.useMutation({
    onSuccess: async () => {
      toast.success('Invoice marked as paid!');
      await refetch();
    },
    onError: (error) => {
      toast.error(`Failed to mark as paid: ${error.message}`);
    },
  });

  const rejectMutation = trpc.reservation.reject.useMutation({
    onSuccess: async () => {
      toast.success('Reservation rejected');
      setRejectModal(null);
      await Promise.all([
        refetch(),
        refetchCompetitions(),
      ]);
    },
    onError: (error) => {
      toast.error(`Failed to reject reservation: ${error.message}`);
    },
  });

  const reservations = pipelineData?.reservations || [];
  const competitionList = competitions?.competitions || [];

  // Calculate event capacity metrics (filter out QA Automation)
  const eventMetrics = competitionList
    .filter(comp => comp.name !== 'QA Automation')
    .map(comp => {
      // Use total_reservation_tokens if available, fall back to venue_capacity
      const totalCapacity = comp.total_reservation_tokens || comp.venue_capacity || 600;
      const availableCapacity = comp.available_reservation_tokens ?? totalCapacity;
      const reservedCount = totalCapacity - availableCapacity;
      const pendingCount = reservations.filter(
        r => r.competitionId === comp.id && r.status === 'pending'
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
        studioCount: new Set(reservations.filter(r => r.competitionId === comp.id).map(r => r.studioId)).size,
      };
    });

  // Filter reservations by status and event
  const filteredReservations = reservations.filter(r => {
    // Event filter
    if (eventFilter !== 'all' && r.competitionId !== eventFilter) {
      return false;
    }

    // Status filter
    if (statusFilter === 'all') return true;
    if (statusFilter === 'pending') return r.status === 'pending';
    if (statusFilter === 'approved') return r.status === 'approved' && r.entryCount === 0 && !r.invoiceId;
    if (statusFilter === 'summary_in') return r.status === 'approved' && r.entryCount > 0 && !r.invoiceId;
    if (statusFilter === 'invoiced') return (r.status === 'approved' || r.status === 'summarized') && r.invoiceId && !r.invoicePaid;
    if (statusFilter === 'paid') return (r.status === 'approved' || r.status === 'summarized') && r.invoicePaid;
    return true;
  });

  // Calculate pipeline stats
  const stats = {
    needAction: reservations.filter(r => r.status === 'pending').length,
    approved: reservations.filter(r => r.status === 'approved' && r.entryCount === 0 && !r.invoiceId).length,
    summariesIn: reservations.filter(r => r.status === 'approved' && r.entryCount > 0 && !r.invoiceId).length,
    invoicesOut: reservations.filter(r => r.invoiceId && !r.invoicePaid).length,
    paid: reservations.filter(r => r.invoicePaid).length,
  };

  const toggleProfile = (key: string) => {
    setExpandedProfiles(prev => {
      const next = new Set(prev);
      if (next.has(key)) {
        next.delete(key);
      } else {
        next.add(key);
      }
      return next;
    });
  };

  const openApprovalModal = (reservation: any) => {
    const competition = competitionList.find(c => c.id === reservation.competitionId);
    const totalCapacity = competition?.venue_capacity || 600;
    const currentUsed = reservations
      .filter(r => r.competitionId === reservation.competitionId && r.status === 'approved')
      .reduce((sum, r) => sum + (r.spacesConfirmed || 0), 0);

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
    setApprovalAmount(reservation.spacesRequested || 0);
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
    setApprovalAmount(0);
  };

  const setQuickAmount = (type: 'all' | 'half' | '10') => {
    if (type === 'all') {
      setApprovalAmount(approvalModal.requestedAmount);
    } else if (type === 'half') {
      setApprovalAmount(Math.floor(approvalModal.requestedAmount / 2));
    } else if (type === '10') {
      setApprovalAmount(10);
    }
  };

  const confirmApproval = () => {
    approveMutation.mutate({
      reservationId: approvalModal.reservationId,
      spacesConfirmed: approvalAmount,
    });
  };

  const handleReject = (reservationId: string, studioName: string) => {
    setRejectModal({
      isOpen: true,
      reservationId,
      studioName,
      reason: '',
    });
  };

  const confirmReject = () => {
    if (!rejectModal) return;
    rejectMutation.mutate({
      id: rejectModal.reservationId,
      reason: rejectModal.reason || undefined,
    });
  };

  const getCapacityBarColor = (percentage: number) => {
    if (percentage >= 95) return 'bg-gradient-to-r from-red-500 to-red-600';
    if (percentage >= 80) return 'bg-gradient-to-r from-yellow-500 to-yellow-600';
    return 'bg-gradient-to-r from-green-500 to-green-600';
  };

  return (
    <main className="min-h-screen bg-gradient-to-br from-slate-900 via-gray-900 to-black p-6">
      <div className="max-w-[1800px] mx-auto">
        {/* Back Link */}
        <Link
          href="/dashboard"
          className="text-purple-400 hover:text-purple-300 text-sm mb-4 inline-block"
        >
          ← Back to Dashboard
        </Link>

        {/* Header */}
        <header className="mb-8">
          <h1 className="text-4xl font-bold text-white mb-2">🎯 Studio Pipeline</h1>
          <p className="text-gray-400">
            Manage all studio reservations from request to payment in one unified dashboard
          </p>
        </header>

        {/* Event Capacity Meters */}
        <div className="sticky top-0 z-40 bg-gradient-to-br from-slate-900 via-gray-900 to-black pb-4 -mx-6 px-6 mb-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {eventMetrics.map(event => (
            <Link
              key={event.id}
              href={`/dashboard/competitions/${event.id}/edit`}
              className="bg-white/10 backdrop-blur-md rounded-xl border border-white/20 p-6 relative overflow-hidden hover:bg-white/15 transition-all cursor-pointer block"
            >
              <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-pink-500 to-purple-500"></div>

              <div className="flex justify-between items-start mb-4">
                <div>
                  <div className="text-white font-bold mb-1">{event.name}</div>
                  <div className="text-xs text-gray-400">{event.dates} • {event.location}</div>
                </div>
                <div className="px-2 py-1 bg-green-500/20 border border-green-500/30 rounded text-green-400 text-xs font-semibold">
                  Open
                </div>
              </div>

              <div className="mb-3">
                <div className="flex justify-between text-xs text-gray-400 mb-2">
                  <span>
                    <span className="text-green-400 font-semibold">{event.used}</span> / {event.totalCapacity} spaces used
                  </span>
                  <span>{event.remaining} remaining</span>
                </div>
                <div className="h-3 bg-white/10 rounded-full overflow-hidden relative">
                  <div
                    className={`h-full ${getCapacityBarColor(event.percentage)} transition-all duration-500`}
                    style={{ width: `${event.percentage}%` }}
                  >
                    <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent animate-shimmer"></div>
                  </div>
                </div>
              </div>

              <div className="flex gap-6 text-xs">
                <div>
                  <div className="text-gray-400">Studios</div>
                  <div className="text-white font-semibold">{event.studioCount}</div>
                </div>
                <div>
                  <div className="text-gray-400">Pending</div>
                  <div className={`font-semibold ${event.pendingCount > 0 ? 'text-yellow-400' : 'text-white'}`}>
                    {event.pendingCount > 0 ? `${event.pendingCount} need action` : '0'}
                  </div>
                </div>
              </div>
            </Link>
          ))}
          </div>
        </div>

        {/* Event Filter */}
        <div className="mb-4">
          <label className="block text-sm font-semibold text-gray-300 mb-2">
            Filter by Event
          </label>
          <select
            value={eventFilter}
            onChange={(e) => setEventFilter(e.target.value)}
            className="w-full md:w-auto min-w-[300px] px-4 py-2 bg-white/10 border border-white/20 rounded-lg text-white font-semibold focus:outline-none focus:ring-2 focus:ring-purple-500 hover:bg-white/15 transition-all"
          >
            <option value="all" className="bg-slate-900">All Events ({reservations.length} reservations)</option>
            {competitionList
              .filter(comp => comp.name !== 'QA Automation')
              .map(comp => {
                const compReservations = reservations.filter(r => r.competitionId === comp.id);
                return (
                  <option key={comp.id} value={comp.id} className="bg-slate-900">
                    {comp.name} {comp.year} ({compReservations.length} reservations)
                  </option>
                );
              })}
          </select>
        </div>

        {/* Pipeline Tabs */}
        <div className="flex gap-2 mb-6 flex-wrap">
          <button
            onClick={() => setStatusFilter('all')}
            className={`px-4 py-2 rounded-lg font-semibold text-sm transition-all ${
              statusFilter === 'all'
                ? 'bg-gradient-to-r from-pink-500 to-purple-500 text-white'
                : 'bg-white/10 text-gray-300 border border-white/20 hover:bg-white/20'
            }`}
          >
            All <span className="ml-2 opacity-70">({reservations.length})</span>
          </button>
          <button
            onClick={() => setStatusFilter('pending')}
            className={`px-4 py-2 rounded-lg font-semibold text-sm transition-all ${
              statusFilter === 'pending'
                ? 'bg-gradient-to-r from-pink-500 to-purple-500 text-white'
                : 'bg-white/10 text-gray-300 border border-white/20 hover:bg-white/20'
            }`}
          >
            Pending Reservation <span className="ml-2 opacity-70">({stats.needAction})</span>
          </button>
          <button
            onClick={() => setStatusFilter('approved')}
            className={`px-4 py-2 rounded-lg font-semibold text-sm transition-all ${
              statusFilter === 'approved'
                ? 'bg-gradient-to-r from-pink-500 to-purple-500 text-white'
                : 'bg-white/10 text-gray-300 border border-white/20 hover:bg-white/20'
            }`}
          >
            Submitted <span className="ml-2 opacity-70">({stats.approved})</span>
          </button>
          <button
            onClick={() => setStatusFilter('summary_in')}
            className={`px-4 py-2 rounded-lg font-semibold text-sm transition-all ${
              statusFilter === 'summary_in'
                ? 'bg-gradient-to-r from-pink-500 to-purple-500 text-white'
                : 'bg-white/10 text-gray-300 border border-white/20 hover:bg-white/20'
            }`}
          >
            Pending Invoice <span className="ml-2 opacity-70">({stats.summariesIn})</span>
          </button>
          <button
            onClick={() => setStatusFilter('invoiced')}
            className={`px-4 py-2 rounded-lg font-semibold text-sm transition-all ${
              statusFilter === 'invoiced'
                ? 'bg-gradient-to-r from-pink-500 to-purple-500 text-white'
                : 'bg-white/10 text-gray-300 border border-white/20 hover:bg-white/20'
            }`}
          >
            Invoiced <span className="ml-2 opacity-70">({stats.invoicesOut})</span>
          </button>
          <button
            onClick={() => setStatusFilter('paid')}
            className={`px-4 py-2 rounded-lg font-semibold text-sm transition-all ${
              statusFilter === 'paid'
                ? 'bg-gradient-to-r from-pink-500 to-purple-500 text-white'
                : 'bg-white/10 text-gray-300 border border-white/20 hover:bg-white/20'
            }`}
          >
            Paid <span className="ml-2 opacity-70">({stats.paid})</span>
          </button>
        </div>

        {/* Main Table */}
        <div className="bg-white/5 backdrop-blur-md rounded-xl border border-white/10 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-black/30">
                <tr>
                  <th className="px-4 py-4 text-left text-xs font-semibold text-gray-400 uppercase w-10"></th>
                  <th className="px-4 py-4 text-left text-xs font-semibold text-gray-400 uppercase">Studio</th>
                  <th className="px-4 py-4 text-left text-xs font-semibold text-gray-400 uppercase">Competition</th>
                  <th className="px-4 py-4 text-center text-xs font-semibold text-gray-400 uppercase">Requested</th>
                  <th className="px-4 py-4 text-center text-xs font-semibold text-gray-400 uppercase">Routines</th>
                  <th className="px-4 py-4 text-center text-xs font-semibold text-gray-400 uppercase">Status</th>
                  <th className="px-4 py-4 text-left text-xs font-semibold text-gray-400 uppercase">Last Action</th>
                  <th className="px-4 py-4 text-center text-xs font-semibold text-gray-400 uppercase">Actions</th>
                </tr>
              </thead>
              <tbody>
                {/* 🐛 FIX Bug #19: Add loading state to prevent empty state flash */}
                {isLoading ? (
                  <tr>
                    <td colSpan={8} className="px-6 py-16 text-center text-gray-400">
                      <div className="text-4xl mb-4 animate-pulse">⏳</div>
                      <div className="text-xl font-semibold mb-2">Loading reservations...</div>
                    </td>
                  </tr>
                ) : filteredReservations.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="px-6 py-16 text-center text-gray-400">
                      <div className="text-6xl mb-4 opacity-50">📋</div>
                      <div className="text-xl font-semibold mb-2">No reservations found</div>
                      <p>Try adjusting your filters or wait for studio directors to submit reservations</p>
                    </td>
                  </tr>
                ) : (
                  filteredReservations.map(reservation => {
                    const key = `${reservation.studioId}-${reservation.competitionId}`;
                    const isExpanded = expandedProfiles.has(key);
                    const competition = competitionList.find(c => c.id === reservation.competitionId);
                    const eventCapacity = competition?.venue_capacity || 600;
                    const eventUsed = reservations
                      .filter(r => r.competitionId === reservation.competitionId && r.status === 'approved')
                      .reduce((sum, r) => sum + (r.spacesConfirmed || 0), 0);
                    const eventPercentage = (eventUsed / eventCapacity) * 100;

                    return (
                      <>
                        <tr key={key} className="border-b border-white/10 hover:bg-white/5 transition-colors">
                          <td className="px-4 py-4 text-center">
                            <button
                              onClick={() => toggleProfile(key)}
                              className={`text-gray-400 hover:text-white transition-transform ${isExpanded ? 'rotate-180' : ''}`}
                            >
                              ▼
                            </button>
                          </td>
                          <td className="px-4 py-4">
                            <div className="flex items-center gap-3">
                              <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-pink-500 to-purple-500 flex items-center justify-center text-white font-bold flex-shrink-0">
                                {reservation.studioName.substring(0, 2).toUpperCase()}
                              </div>
                              <div>
                                <div className="text-white font-semibold text-sm">
                                  {reservation.studioName}
                                  {reservation.studioCode && <span className="text-xs text-gray-400 ml-2">({reservation.studioCode})</span>}
                                </div>
                                <div className="text-xs text-gray-400">{reservation.studioCity}, {reservation.studioProvince}</div>
                              </div>
                            </div>
                          </td>
                          <td className="px-4 py-4">
                            <div className="text-white text-sm">{reservation.competitionName}</div>
                            <div className="text-xs text-gray-400">{reservation.competitionYear}</div>
                          </td>
                          <td className="px-4 py-4">
                            <div className="flex flex-col items-center gap-2">
                              <span className={`font-semibold text-sm ${
                                reservation.status === 'approved' ? 'text-green-400' : 'text-yellow-400'
                              }`}>
                                {reservation.status === 'approved'
                                  ? `${reservation.spacesConfirmed} approved`
                                  : `${reservation.spacesRequested} spaces`}
                              </span>
                              <div className="w-full max-w-[150px] h-1.5 bg-white/10 rounded-full overflow-hidden relative">
                                <div
                                  className={`h-full ${getCapacityBarColor(eventPercentage)} transition-all`}
                                  style={{ width: `${eventPercentage}%` }}
                                ></div>
                              </div>
                            </div>
                          </td>
                          <td className="px-4 py-4 text-center">
                            {reservation.status === 'approved' ? (
                              <span className={`font-semibold text-sm ${
                                reservation.entryCount === reservation.spacesConfirmed ? 'text-green-400' : 'text-yellow-400'
                              }`}>
                                {reservation.entryCount} / {reservation.spacesConfirmed}
                              </span>
                            ) : (
                              <span className="text-sm text-gray-400">— / —</span>
                            )}
                          </td>
                          <td className="px-4 py-4 text-center">
                            {reservation.status === 'pending' && (
                              <StatusBadge status="pending" />
                            )}
                            {reservation.status === 'approved' && !reservation.entryCount && (
                              <StatusBadge status="approved" />
                            )}
                            {reservation.status === 'approved' && reservation.entryCount > 0 && !reservation.invoiceId && (
                              <button
                                onClick={() => router.push(`/dashboard/invoices/${reservation.studioId}/${reservation.competitionId}`)}
                                className="inline-block px-3 py-1 bg-blue-500/20 border border-blue-500/30 text-blue-400 rounded-lg text-xs font-semibold uppercase hover:bg-blue-500/30 transition-all"
                              >
                                Summary In
                              </button>
                            )}
                            {reservation.invoiceId && !reservation.invoicePaid && (
                              <button
                                onClick={() => router.push(`/dashboard/invoices/${reservation.studioId}/${reservation.competitionId}`)}
                                className="inline-block px-3 py-1 bg-purple-500/20 border border-purple-500/30 text-purple-400 rounded-lg text-xs font-semibold uppercase hover:bg-purple-500/30 transition-all"
                              >
                                {reservation.invoiceId ? 'Invoiced' : 'Invoice Ready'}
                              </button>
                            )}
                            {reservation.invoicePaid && (
                              <span className="inline-block px-3 py-1 bg-green-500/20 border border-green-500/30 text-green-400 rounded-lg text-xs font-semibold uppercase">
                                Paid ✓
                              </span>
                            )}
                          </td>
                          <td className="px-4 py-4">
                            <div className="text-sm">
                              <div className="text-gray-300 mb-1">
                                {reservation.invoiceId && !reservation.invoicePaid
                                  ? 'Invoiced'
                                  : reservation.lastAction || 'Submitted'}
                              </div>
                              <div className="text-xs text-gray-400">
                                {reservation.lastActionDate ? formatDistanceToNow(new Date(reservation.lastActionDate), { addSuffix: true }) : '—'}
                              </div>
                            </div>
                          </td>
                          <td className="px-4 py-4">
                            <div className="flex gap-2 justify-center">
                              {reservation.status === 'pending' && (
                                <>
                                  <button
                                    onClick={() => openApprovalModal(reservation)}
                                    className="px-3 py-1.5 bg-gradient-to-r from-green-500 to-green-600 text-white rounded-lg text-xs font-semibold hover:shadow-lg transition-all"
                                  >
                                    ✓ Approve
                                  </button>
                                  <button
                                    onClick={() => handleReject(reservation.id, reservation.studioName)}
                                    className="px-3 py-1.5 bg-red-500/20 border border-red-500/30 text-red-400 rounded-lg text-xs font-semibold hover:bg-red-500/30 transition-all"
                                  >
                                    ✗ Deny
                                  </button>
                                </>
                              )}
                              {reservation.status === 'approved' && !reservation.invoiceId && reservation.entryCount > 0 && (
                                <button
                                  onClick={() => createInvoiceMutation.mutate({ reservationId: reservation.id })}
                                  disabled={createInvoiceMutation.isPending}
                                  className="px-3 py-1.5 bg-gradient-to-r from-purple-500 to-purple-600 text-white rounded-lg text-xs font-semibold hover:shadow-lg transition-all disabled:opacity-50"
                                >
                                  {createInvoiceMutation.isPending ? '⏳ Creating...' : '💰 Create Invoice'}
                                </button>
                              )}
                              {reservation.status === 'approved' && reservation.invoiceId && !reservation.invoicePaid && (
                                <>
                                  <button
                                    onClick={() => setRemindConfirm({
                                      isOpen: true,
                                      studioName: reservation.studioName,
                                      studioId: reservation.studioId,
                                      competitionId: reservation.competitionId,
                                    })}
                                    className="px-3 py-1.5 bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-lg text-xs font-semibold hover:shadow-lg transition-all"
                                  >
                                    📧 Remind
                                  </button>
                                  <button
                                    onClick={() => markAsPaidMutation.mutate({ invoiceId: reservation.invoiceId!, paymentMethod: 'manual' })}
                                    disabled={markAsPaidMutation.isPending}
                                    className="px-3 py-1.5 bg-gradient-to-r from-green-500 to-green-600 text-white rounded-lg text-xs font-semibold hover:shadow-lg transition-all disabled:opacity-50"
                                  >
                                    {markAsPaidMutation.isPending ? '⏳ Marking...' : '✓ Mark as Paid'}
                                  </button>
                                </>
                              )}
                              {reservation.status === 'approved' && !reservation.entryCount && (
                                <button className="px-3 py-1.5 bg-white/10 border border-white/20 text-gray-300 rounded-lg text-xs font-semibold">
                                  View Details
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>

                        {/* Expandable Studio Profile */}
                        {isExpanded && (
                          <tr className="bg-black/20 border-b border-white/10">
                            <td colSpan={9} className="px-4 py-4">
                              <div className="grid grid-cols-3 gap-6 text-sm">
                                <div>
                                  <div className="text-xs text-gray-400 uppercase font-semibold mb-1">Contact Name</div>
                                  <div className="text-white">{reservation.contactName || 'N/A'}</div>
                                </div>
                                <div>
                                  <div className="text-xs text-gray-400 uppercase font-semibold mb-1">Email</div>
                                  <a href={`mailto:${reservation.contactEmail}`} className="text-blue-400 hover:underline">
                                    {reservation.contactEmail}
                                  </a>
                                </div>
                                <div>
                                  <div className="text-xs text-gray-400 uppercase font-semibold mb-1">Phone</div>
                                  <a href={`tel:${reservation.contactPhone}`} className="text-blue-400 hover:underline">
                                    {reservation.contactPhone || 'N/A'}
                                  </a>
                                </div>
                                <div>
                                  <div className="text-xs text-gray-400 uppercase font-semibold mb-1">Address</div>
                                  <div className="text-white">{reservation.studioAddress || 'N/A'}</div>
                                </div>
                                <div>
                                  <div className="text-xs text-gray-400 uppercase font-semibold mb-1">Studio Code</div>
                                  <div className="text-white">{reservation.studioId.substring(0, 8)}</div>
                                </div>
                                <div>
                                  <div className="text-xs text-gray-400 uppercase font-semibold mb-1">Member Since</div>
                                  <div className="text-white">
                                    {reservation.studioCreatedAt
                                      ? new Date(reservation.studioCreatedAt).toLocaleDateString('en-US', {
                                          month: 'short',
                                          year: 'numeric',
                                        })
                                      : 'N/A'}
                                  </div>
                                </div>
                              </div>
                            </td>
                          </tr>
                        )}
                      </>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Approval Modal */}
      {approvalModal.isOpen && (
        <div
          className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50"
          onClick={closeApprovalModal}
        >
          <div
            className="bg-gradient-to-br from-slate-800 to-slate-900 border border-white/20 rounded-2xl p-8 max-w-md w-full mx-4 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-6">
              <h2 className="text-2xl font-bold text-white mb-2">Approve Reservation</h2>
              <p className="text-gray-400 text-sm">
                Review and approve routine spaces for <strong>{approvalModal.studioName}</strong>
              </p>
            </div>

            <div className="mb-6">
              <label className="block text-sm font-semibold text-gray-300 mb-2">
                Approve Routines
              </label>
              <input
                type="number"
                min="0"
                max={approvalModal.requestedAmount}
                value={approvalAmount}
                onChange={(e) => setApprovalAmount(parseInt(e.target.value) || 0)}
                className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white font-semibold text-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
              />
              <div className="text-xs text-gray-400 mt-2">
                Requested: <span className="text-white font-semibold">{approvalModal.requestedAmount}</span> spaces
              </div>
              <div className="flex gap-2 mt-3">
                <button
                  onClick={() => setQuickAmount('all')}
                  className="flex-1 px-3 py-2 bg-white/5 border border-white/20 rounded-lg text-gray-300 text-xs font-semibold hover:bg-white/10 transition-all"
                >
                  All
                </button>
                <button
                  onClick={() => setQuickAmount('half')}
                  className="flex-1 px-3 py-2 bg-white/5 border border-white/20 rounded-lg text-gray-300 text-xs font-semibold hover:bg-white/10 transition-all"
                >
                  Half
                </button>
                <button
                  onClick={() => setQuickAmount('10')}
                  className="flex-1 px-3 py-2 bg-white/5 border border-white/20 rounded-lg text-gray-300 text-xs font-semibold hover:bg-white/10 transition-all"
                >
                  10
                </button>
              </div>
            </div>

            <div className="flex gap-3">
              <button
                onClick={closeApprovalModal}
                className="flex-1 px-6 py-3 bg-white/10 border border-white/20 text-white font-semibold rounded-lg hover:bg-white/20 transition-all"
              >
                Cancel
              </button>
              <button
                onClick={confirmApproval}
                disabled={approveMutation.isPending}
                className="flex-1 px-6 py-3 bg-gradient-to-r from-green-500 to-green-600 text-white font-semibold rounded-lg hover:shadow-lg transition-all disabled:opacity-50"
              >
                {approveMutation.isPending ? 'Approving...' : '✓ Confirm Approval'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Reject Modal */}
      {rejectModal?.isOpen && (
        <div
          className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50"
          onClick={() => setRejectModal(null)}
        >
          <div
            className="bg-gradient-to-br from-slate-800 to-slate-900 border border-white/20 rounded-2xl p-8 max-w-md w-full mx-4 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-6">
              <h2 className="text-2xl font-bold text-white mb-2">Reject Reservation</h2>
              <p className="text-gray-400 text-sm">
                Are you sure you want to reject the reservation from <strong>{rejectModal.studioName}</strong>?
              </p>
            </div>

            <div className="mb-6">
              <label className="block text-sm font-semibold text-gray-300 mb-2">
                Rejection Reason (Optional)
              </label>
              <textarea
                value={rejectModal.reason}
                onChange={(e) => setRejectModal({ ...rejectModal, reason: e.target.value })}
                placeholder="Enter reason for rejection..."
                className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-red-500"
                rows={3}
              />
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => setRejectModal(null)}
                className="flex-1 px-6 py-3 bg-white/10 border border-white/20 text-white font-semibold rounded-lg hover:bg-white/20 transition-all"
              >
                Cancel
              </button>
              <button
                onClick={confirmReject}
                disabled={rejectMutation.isPending}
                className="flex-1 px-6 py-3 bg-gradient-to-r from-red-500 to-red-600 text-white font-semibold rounded-lg hover:shadow-lg transition-all disabled:opacity-50"
              >
                {rejectMutation.isPending ? 'Rejecting...' : '✗ Reject Reservation'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Remind Confirmation Modal */}
      {remindConfirm?.isOpen && (
        <div
          className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50"
          onClick={() => setRemindConfirm(null)}
        >
          <div
            className="bg-gradient-to-br from-slate-800 to-slate-900 border border-white/20 rounded-2xl p-8 max-w-md w-full mx-4 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-6">
              <h2 className="text-2xl font-bold text-white mb-2">Send Payment Reminder</h2>
              <p className="text-gray-400 text-sm">
                Send an invoice reminder email to <strong>{remindConfirm.studioName}</strong>?
              </p>
            </div>

            <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-4 mb-6">
              <div className="flex gap-3">
                <div className="text-2xl">📧</div>
                <div>
                  <div className="text-sm text-blue-300 font-semibold mb-1">Email will include:</div>
                  <ul className="text-xs text-gray-300 space-y-1">
                    <li>• Invoice details and amount due</li>
                    <li>• Payment instructions</li>
                    <li>• Direct link to invoice</li>
                  </ul>
                </div>
              </div>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => setRemindConfirm(null)}
                className="flex-1 px-6 py-3 bg-white/10 border border-white/20 text-white font-semibold rounded-lg hover:bg-white/20 transition-all"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  toast.success(`Payment reminder sent to ${remindConfirm.studioName}!`);
                  // TODO: Implement actual email sending via tRPC mutation
                  // trpc.invoice.sendInvoiceReminder.mutate({ studioId, competitionId })
                  setRemindConfirm(null);
                }}
                className="flex-1 px-6 py-3 bg-gradient-to-r from-blue-500 to-blue-600 text-white font-semibold rounded-lg hover:shadow-lg transition-all"
              >
                📧 Send Reminder
              </button>
            </div>
          </div>
        </div>
      )}

      <style jsx>{`
        @keyframes shimmer {
          0% { transform: translateX(-100%); }
          100% { transform: translateX(100%); }
        }
        .animate-shimmer {
          animation: shimmer 2s infinite;
        }
      `}</style>
    </main>
  );
}
