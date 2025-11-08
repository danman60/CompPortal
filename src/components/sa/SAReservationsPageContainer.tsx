'use client';

import { useState, useMemo } from 'react';
import Link from 'next/link';
import { trpc } from '@/lib/trpc';
import { toast } from 'react-hot-toast';

/**
 * Super Admin Reservations View
 * Multi-tenant view of all reservations across all studios and tenants with comprehensive filtering
 * Shows capacity details and reservation status
 */
export function SAReservationsPageContainer() {
  // Filter state
  const [selectedTenantId, setSelectedTenantId] = useState<string>('');
  const [selectedCompetitionId, setSelectedCompetitionId] = useState<string>('');
  const [selectedStudioId, setSelectedStudioId] = useState<string>('');
  const [selectedStatus, setSelectedStatus] = useState<string>('all');
  const [selectedPaymentStatus, setSelectedPaymentStatus] = useState<string>('all');

  // Record Deposit modal state
  const [depositModal, setDepositModal] = useState<{
    isOpen: boolean;
    reservationId: string;
    studioName: string;
    competitionName: string;
    depositAmount: string;
    paymentMethod: string;
    paymentDate: string;
    notes: string;
  } | null>(null);

  // Add Studio with Reservation modal state
  const [addStudioModal, setAddStudioModal] = useState<{
    isOpen: boolean;
    studioName: string;
    contactName: string;
    email: string;
    phone: string;
    competitionId: string;
    preApprovedSpaces: string;
    depositAmount: string;
    comments: string;
  } | null>(null);

  // Edit Spaces modal state
  const [editSpacesModal, setEditSpacesModal] = useState<{
    isOpen: boolean;
    reservationId: string;
    studioName: string;
    competitionName: string;
    currentSpaces: number;
    entryCount: number;
    newSpaces: number;
    reason: string;
  } | null>(null);

  // Fetch data
  const { data: tenantsData, isLoading: tenantsLoading } = trpc.superAdmin.tenants.getAllTenants.useQuery();
  const { data: competitionsData, isLoading: competitionsLoading } = trpc.competition.getAll.useQuery({});
  const { data: studiosData, isLoading: studiosLoading } = trpc.studio.getAll.useQuery({});

  // Fetch reservations with cumulative filters
  const { data: reservationsData, isLoading: reservationsLoading } = trpc.reservation.getAll.useQuery(
    {
      ...(selectedCompetitionId && { competitionId: selectedCompetitionId }),
      ...(selectedStudioId && { studioId: selectedStudioId }),
      ...(selectedStatus !== 'all' && { status: selectedStatus }),
      ...(selectedPaymentStatus !== 'all' && { paymentStatus: selectedPaymentStatus }),
      limit: 100, // Max allowed by backend
    }
  );

  const tenants = tenantsData?.tenants || [];
  const competitions = competitionsData?.competitions || [];
  const studios = studiosData?.studios || [];
  const reservations = reservationsData?.reservations || [];

  const isLoading = tenantsLoading || competitionsLoading || studiosLoading || reservationsLoading;

  // Record Deposit mutation
  const recordDepositMutation = trpc.reservation.recordDeposit.useMutation({
    onSuccess: (data) => {
      toast.success(data.message);
      setDepositModal(null);
      // Refetch reservations to update deposit info
      trpc.useUtils().reservation.getAll.invalidate();
    },
    onError: (error) => {
      toast.error(`Failed to record deposit: ${error.message}`);
    },
  });

  // Create Studio with Reservation mutation
  const createStudioMutation = trpc.reservation.createStudioWithReservation.useMutation({
    onSuccess: (data) => {
      toast.success(data.message);
      setAddStudioModal(null);
      // Refetch both studios and reservations
      const utils = trpc.useUtils();
      utils.studio.getAll.invalidate();
      utils.reservation.getAll.invalidate();
    },
    onError: (error) => {
      toast.error(`Failed to create studio: ${error.message}`);
    },
  });

  // Adjust Spaces mutation
  const adjustSpacesMutation = trpc.reservation.adjustReservationSpaces.useMutation({
    onSuccess: (data) => {
      toast.success(data.message);
      setEditSpacesModal(null);
      // Refetch reservations to update spaces
      trpc.useUtils().reservation.getAll.invalidate();
    },
    onError: (error) => {
      toast.error(`Failed to adjust spaces: ${error.message}`);
    },
  });

  // Handlers
  const handleRecordDeposit = (reservation: any) => {
    setDepositModal({
      isOpen: true,
      reservationId: reservation.id,
      studioName: reservation.studios?.name || '',
      competitionName: reservation.competitions?.name || '',
      depositAmount: '',
      paymentMethod: 'etransfer',
      paymentDate: new Date().toISOString().split('T')[0],
      notes: '',
    });
  };

  const confirmRecordDeposit = () => {
    if (!depositModal) return;
    const amount = parseFloat(depositModal.depositAmount);
    if (isNaN(amount) || amount < 0) {
      toast.error('Please enter a valid deposit amount');
      return;
    }

    recordDepositMutation.mutate({
      reservationId: depositModal.reservationId,
      depositAmount: amount,
      paymentMethod: depositModal.paymentMethod as any,
      paymentDate: depositModal.paymentDate,
      notes: depositModal.notes || undefined,
    });
  };

  const handleAddStudio = () => {
    setAddStudioModal({
      isOpen: true,
      studioName: '',
      contactName: '',
      email: '',
      phone: '',
      competitionId: '',
      preApprovedSpaces: '1',
      depositAmount: '',
      comments: '',
    });
  };

  const confirmAddStudio = () => {
    if (!addStudioModal) return;

    // Validation
    if (!addStudioModal.studioName.trim()) {
      toast.error('Studio name is required');
      return;
    }
    if (!addStudioModal.contactName.trim()) {
      toast.error('Contact name is required');
      return;
    }
    if (!addStudioModal.email.trim()) {
      toast.error('Email is required');
      return;
    }
    if (!addStudioModal.competitionId) {
      toast.error('Please select a competition');
      return;
    }
    const spaces = parseInt(addStudioModal.preApprovedSpaces);
    if (isNaN(spaces) || spaces < 1) {
      toast.error('Pre-approved spaces must be at least 1');
      return;
    }

    const deposit = addStudioModal.depositAmount
      ? parseFloat(addStudioModal.depositAmount)
      : undefined;
    if (deposit !== undefined && (isNaN(deposit) || deposit < 0)) {
      toast.error('Invalid deposit amount');
      return;
    }

    createStudioMutation.mutate({
      studioName: addStudioModal.studioName,
      contactName: addStudioModal.contactName,
      email: addStudioModal.email,
      phone: addStudioModal.phone || undefined,
      competitionId: addStudioModal.competitionId,
      preApprovedSpaces: spaces,
      depositAmount: deposit,
      comments: addStudioModal.comments || undefined,
    });
  };

  const handleEditSpaces = (reservation: any) => {
    setEditSpacesModal({
      isOpen: true,
      reservationId: reservation.id,
      studioName: reservation.studios?.name || '',
      competitionName: reservation.competitions?.name || '',
      currentSpaces: reservation.spacesConfirmed || 0,
      entryCount: reservation.entryCount || 0,
      newSpaces: reservation.spacesConfirmed || 0,
      reason: '',
    });
  };

  const confirmAdjustSpaces = () => {
    if (!editSpacesModal) return;
    adjustSpacesMutation.mutate({
      reservationId: editSpacesModal.reservationId,
      newSpacesConfirmed: editSpacesModal.newSpaces,
      reason: editSpacesModal.reason || undefined,
    });
  };

  // Filter by tenant (frontend filter since backend already returns all)
  const filteredReservations = useMemo(() => {
    let result = [...reservations];

    // Tenant filter
    if (selectedTenantId) {
      result = result.filter((reservation: any) => reservation.competitions?.tenant_id === selectedTenantId);
    }

    return result;
  }, [reservations, selectedTenantId]);

  // Calculate totals
  const totals = useMemo(() => {
    return filteredReservations.reduce((acc: any, reservation: any) => {
      acc.spacesRequested += reservation.spaces_requested || 0;
      acc.spacesConfirmed += reservation.spaces_confirmed || 0;
      acc.totalAmount += Number(reservation.total_amount || 0);
      acc.depositAmount += Number(reservation.deposit_amount || 0);
      return acc;
    }, {
      spacesRequested: 0,
      spacesConfirmed: 0,
      totalAmount: 0,
      depositAmount: 0,
    });
  }, [filteredReservations]);

  return (
    <div className="max-w-7xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <Link
          href="/dashboard"
          className="text-white/60 hover:text-white transition-colors inline-flex items-center gap-2 mb-4"
        >
          ← Back to Dashboard
        </Link>

        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-4xl font-bold text-white">All Reservations (SA)</h1>
            <p className="text-white/60 mt-2">
              Multi-tenant view • {filteredReservations.length} reservations
            </p>
          </div>

          {/* Add Studio with Reservation button */}
          <button
            onClick={handleAddStudio}
            className="px-6 py-3 bg-gradient-to-r from-purple-500 to-pink-500 text-white font-semibold rounded-lg hover:from-purple-600 hover:to-pink-600 transition-all shadow-lg flex items-center gap-2"
          >
            <span>+</span>
            <span>Add Studio with Reservation</span>
          </button>
        </div>
      </div>

      {/* Summary Cards */}
      {!isLoading && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-white/10 backdrop-blur-md rounded-xl border border-white/20 p-4">
            <div className="text-white/60 text-sm">Total Requested</div>
            <div className="text-white text-2xl font-bold">{totals.spacesRequested}</div>
          </div>
          <div className="bg-white/10 backdrop-blur-md rounded-xl border border-white/20 p-4">
            <div className="text-white/60 text-sm">Total Confirmed</div>
            <div className="text-white text-2xl font-bold">{totals.spacesConfirmed}</div>
          </div>
          <div className="bg-white/10 backdrop-blur-md rounded-xl border border-white/20 p-4">
            <div className="text-white/60 text-sm">Total Amount</div>
            <div className="text-white text-2xl font-bold">${totals.totalAmount.toFixed(2)}</div>
          </div>
          <div className="bg-white/10 backdrop-blur-md rounded-xl border border-white/20 p-4">
            <div className="text-white/60 text-sm">Total Deposits</div>
            <div className="text-white text-2xl font-bold">${totals.depositAmount.toFixed(2)}</div>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="bg-white/10 backdrop-blur-md rounded-xl border border-white/20 p-6 mb-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
          {/* Tenant Filter */}
          <div>
            <label className="block text-sm font-medium text-white/80 mb-2">Tenant</label>
            <select
              value={selectedTenantId}
              onChange={(e) => setSelectedTenantId(e.target.value)}
              className="w-full px-4 py-2 bg-white/5 border border-white/20 rounded-lg text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-purple-500 disabled:opacity-50"
              disabled={isLoading}
            >
              <option value="" className="bg-gray-900">All Tenants</option>
              {tenants.map((tenant: any) => (
                <option key={tenant.id} value={tenant.id} className="bg-gray-900">
                  {tenant.name}
                </option>
              ))}
            </select>
          </div>

          {/* Competition Filter */}
          <div>
            <label className="block text-sm font-medium text-white/80 mb-2">Event/Competition</label>
            <select
              value={selectedCompetitionId}
              onChange={(e) => setSelectedCompetitionId(e.target.value)}
              className="w-full px-4 py-2 bg-white/5 border border-white/20 rounded-lg text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-purple-500 disabled:opacity-50"
              disabled={isLoading}
            >
              <option value="" className="bg-gray-900">All Events</option>
              {competitions.map((comp: any) => (
                <option key={comp.id} value={comp.id} className="bg-gray-900">
                  {comp.name}
                </option>
              ))}
            </select>
          </div>

          {/* Studio Filter */}
          <div>
            <label className="block text-sm font-medium text-white/80 mb-2">Studio</label>
            <select
              value={selectedStudioId}
              onChange={(e) => setSelectedStudioId(e.target.value)}
              className="w-full px-4 py-2 bg-white/5 border border-white/20 rounded-lg text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-purple-500 disabled:opacity-50"
              disabled={isLoading}
            >
              <option value="" className="bg-gray-900">All Studios</option>
              {studios.map((studio: any) => (
                <option key={studio.id} value={studio.id} className="bg-gray-900">
                  {studio.name}
                </option>
              ))}
            </select>
          </div>

          {/* Status Filter */}
          <div>
            <label className="block text-sm font-medium text-white/80 mb-2">Status</label>
            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              className="w-full px-4 py-2 bg-white/5 border border-white/20 rounded-lg text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-purple-500 disabled:opacity-50"
              disabled={isLoading}
            >
              <option value="all" className="bg-gray-900">All Status</option>
              <option value="pending" className="bg-gray-900">Pending</option>
              <option value="approved" className="bg-gray-900">Approved</option>
              <option value="rejected" className="bg-gray-900">Rejected</option>
              <option value="cancelled" className="bg-gray-900">Cancelled</option>
              <option value="summarized" className="bg-gray-900">Summarized</option>
            </select>
          </div>

          {/* Payment Status Filter */}
          <div>
            <label className="block text-sm font-medium text-white/80 mb-2">Payment Status</label>
            <select
              value={selectedPaymentStatus}
              onChange={(e) => setSelectedPaymentStatus(e.target.value)}
              className="w-full px-4 py-2 bg-white/5 border border-white/20 rounded-lg text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-purple-500 disabled:opacity-50"
              disabled={isLoading}
            >
              <option value="all" className="bg-gray-900">All Payment Status</option>
              <option value="pending" className="bg-gray-900">Pending</option>
              <option value="partial" className="bg-gray-900">Partial</option>
              <option value="paid" className="bg-gray-900">Paid</option>
              <option value="refunded" className="bg-gray-900">Refunded</option>
              <option value="cancelled" className="bg-gray-900">Cancelled</option>
            </select>
          </div>
        </div>
      </div>

      {/* Table */}
      {isLoading ? (
        <div className="bg-white/10 backdrop-blur-md rounded-xl border border-white/20 p-8 text-center">
          <div className="text-white/60">Loading reservations...</div>
        </div>
      ) : filteredReservations.length === 0 ? (
        <div className="bg-white/10 backdrop-blur-md rounded-xl border border-white/20 p-8 text-center">
          <div className="text-white/60">No reservations found matching the selected filters.</div>
        </div>
      ) : (
        <div className="bg-white/10 backdrop-blur-md rounded-xl border border-white/20 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-white/5 border-b border-white/20">
                  <th className="px-6 py-4 text-left text-sm font-semibold text-white/80">
                    Studio
                  </th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-white/80">
                    Tenant
                  </th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-white/80">
                    Competition
                  </th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-white/80">
                    Location
                  </th>
                  <th className="px-6 py-4 text-right text-sm font-semibold text-white/80">
                    Requested
                  </th>
                  <th className="px-6 py-4 text-right text-sm font-semibold text-white/80">
                    Confirmed
                  </th>
                  <th className="px-6 py-4 text-right text-sm font-semibold text-white/80">
                    Entries
                  </th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-white/80">
                    Status
                  </th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-white/80">
                    Payment
                  </th>
                  <th className="px-6 py-4 text-right text-sm font-semibold text-white/80">
                    Total
                  </th>
                  <th className="px-6 py-4 text-right text-sm font-semibold text-white/80">
                    Deposit
                  </th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-white/80">
                    Requested At
                  </th>
                  <th className="px-6 py-4 text-center text-sm font-semibold text-white/80">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody>
                {filteredReservations.map((reservation: any) => {
                  const entryCount = reservation._count?.competition_entries || 0;

                  // Status badge colors
                  const getStatusColor = (status: string) => {
                    switch (status) {
                      case 'approved':
                        return 'bg-green-500/20 text-green-300';
                      case 'pending':
                        return 'bg-yellow-500/20 text-yellow-300';
                      case 'rejected':
                        return 'bg-red-500/20 text-red-300';
                      case 'cancelled':
                        return 'bg-gray-500/20 text-gray-300';
                      case 'summarized':
                        return 'bg-blue-500/20 text-blue-300';
                      default:
                        return 'bg-white/20 text-white/70';
                    }
                  };

                  const getPaymentColor = (status: string) => {
                    switch (status) {
                      case 'paid':
                        return 'bg-green-500/20 text-green-300';
                      case 'partial':
                        return 'bg-yellow-500/20 text-yellow-300';
                      case 'pending':
                        return 'bg-orange-500/20 text-orange-300';
                      case 'refunded':
                        return 'bg-purple-500/20 text-purple-300';
                      case 'cancelled':
                        return 'bg-gray-500/20 text-gray-300';
                      default:
                        return 'bg-white/20 text-white/70';
                    }
                  };

                  const statusColor = getStatusColor(reservation.status);
                  const paymentColor = getPaymentColor(reservation.payment_status);

                  return (
                    <tr
                      key={reservation.id}
                      className="border-b border-white/10 hover:bg-white/5 transition-colors cursor-pointer"
                      onClick={() => {
                        window.location.href = `/dashboard/reservations/${reservation.id}`;
                      }}
                    >
                      <td className="px-6 py-4 text-white font-medium">{reservation.studios?.name || 'N/A'}</td>
                      <td className="px-6 py-4 text-white/70">{reservation.competitions?.tenants?.name || 'N/A'}</td>
                      <td className="px-6 py-4 text-white/70">{reservation.competitions?.name || 'N/A'}</td>
                      <td className="px-6 py-4 text-white/70">{reservation.competition_locations?.name || 'N/A'}</td>
                      <td className="px-6 py-4 text-right text-white/70">{reservation.spaces_requested}</td>
                      <td className="px-6 py-4 text-right text-white/70">{reservation.spaces_confirmed || 0}</td>
                      <td className="px-6 py-4 text-right text-white/70">{entryCount}</td>
                      <td className="px-6 py-4">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${statusColor}`}>
                          {reservation.status}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${paymentColor}`}>
                          {reservation.payment_status}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right text-white/70">
                        ${Number(reservation.total_amount || 0).toFixed(2)}
                      </td>
                      <td className="px-6 py-4 text-right text-white/70">
                        ${Number(reservation.deposit_amount || 0).toFixed(2)}
                      </td>
                      <td className="px-6 py-4 text-white/70">
                        {reservation.requested_at ? new Date(reservation.requested_at).toLocaleDateString() : 'N/A'}
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex gap-2 justify-center" onClick={(e) => e.stopPropagation()}>
                          {/* Edit Spaces button - show for approved+ statuses */}
                          {reservation.status && ['approved', 'summarized', 'invoiced'].includes(reservation.status) && (
                            <button
                              onClick={() => handleEditSpaces(reservation)}
                              className="px-3 py-1.5 bg-blue-500/20 border border-blue-500/30 text-blue-300 rounded-lg text-xs font-semibold hover:bg-blue-500/30 transition-all whitespace-nowrap"
                            >
                              ✏️ Edit Spaces
                            </button>
                          )}
                          {/* Record Deposit button - show for approved+ statuses */}
                          {reservation.status && ['approved', 'summarized', 'invoiced'].includes(reservation.status) && (
                            <button
                              onClick={() => handleRecordDeposit(reservation)}
                              className="px-3 py-1.5 bg-green-500/20 border border-green-500/30 text-green-300 rounded-lg text-xs font-semibold hover:bg-green-500/30 transition-all whitespace-nowrap"
                            >
                              💰 Record Deposit
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Record Deposit Modal */}
      {depositModal && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-gradient-to-br from-slate-800 to-slate-900 border border-white/20 rounded-xl p-6 max-w-md w-full">
            <h3 className="text-xl font-semibold text-white mb-4">
              Record Deposit
            </h3>

            {/* Current Info */}
            <div className="mb-4 p-3 bg-white/5 rounded-lg border border-white/10">
              <div className="text-sm text-gray-400 mb-1">Studio</div>
              <div className="text-white font-medium">{depositModal.studioName}</div>
              <div className="text-sm text-gray-400 mt-2 mb-1">Competition</div>
              <div className="text-white font-medium">{depositModal.competitionName}</div>
            </div>

            {/* Deposit Amount */}
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-400 mb-2">
                Deposit Amount *
              </label>
              <input
                type="number"
                min="0"
                step="0.01"
                value={depositModal.depositAmount}
                onChange={(e) => setDepositModal({ ...depositModal, depositAmount: e.target.value })}
                placeholder="0.00"
                className="w-full px-4 py-3 bg-white/5 border border-white/20 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-green-500"
              />
            </div>

            {/* Payment Method */}
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-400 mb-2">
                Payment Method
              </label>
              <select
                value={depositModal.paymentMethod}
                onChange={(e) => setDepositModal({ ...depositModal, paymentMethod: e.target.value })}
                className="w-full px-4 py-3 bg-white/5 border border-white/20 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-green-500"
              >
                <option value="cash" className="bg-gray-900">Cash</option>
                <option value="check" className="bg-gray-900">Check</option>
                <option value="etransfer" className="bg-gray-900">E-Transfer</option>
                <option value="credit_card" className="bg-gray-900">Credit Card</option>
                <option value="other" className="bg-gray-900">Other</option>
              </select>
            </div>

            {/* Payment Date */}
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-400 mb-2">
                Payment Date
              </label>
              <input
                type="date"
                value={depositModal.paymentDate}
                onChange={(e) => setDepositModal({ ...depositModal, paymentDate: e.target.value })}
                className="w-full px-4 py-3 bg-white/5 border border-white/20 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-green-500"
              />
            </div>

            {/* Notes */}
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-400 mb-2">
                Notes (Optional)
              </label>
              <textarea
                value={depositModal.notes}
                onChange={(e) => setDepositModal({ ...depositModal, notes: e.target.value })}
                placeholder="Additional notes..."
                rows={3}
                className="w-full px-4 py-3 bg-white/5 border border-white/20 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-green-500"
              />
            </div>

            {/* Buttons */}
            <div className="flex gap-3">
              <button
                onClick={() => setDepositModal(null)}
                disabled={recordDepositMutation.isPending}
                className="flex-1 px-4 py-2 bg-white/10 hover:bg-white/20 text-white rounded-lg transition-all disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={confirmRecordDeposit}
                disabled={recordDepositMutation.isPending}
                className="flex-1 px-4 py-2 bg-green-500 hover:bg-green-600 text-white font-medium rounded-lg transition-all disabled:opacity-50"
              >
                {recordDepositMutation.isPending ? 'Recording...' : 'Confirm'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add Studio with Reservation Modal */}
      {addStudioModal && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-gradient-to-br from-slate-800 to-slate-900 border border-white/20 rounded-xl p-6 max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <h3 className="text-xl font-semibold text-white mb-4">
              Add Studio with Pre-Approved Reservation
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Studio Name */}
              <div>
                <label className="block text-sm font-medium text-gray-400 mb-2">
                  Studio Name *
                </label>
                <input
                  type="text"
                  value={addStudioModal.studioName}
                  onChange={(e) => setAddStudioModal({ ...addStudioModal, studioName: e.target.value })}
                  placeholder="Dance Studio Name"
                  className="w-full px-4 py-3 bg-white/5 border border-white/20 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-purple-500"
                />
              </div>

              {/* Contact Name */}
              <div>
                <label className="block text-sm font-medium text-gray-400 mb-2">
                  Contact Name *
                </label>
                <input
                  type="text"
                  value={addStudioModal.contactName}
                  onChange={(e) => setAddStudioModal({ ...addStudioModal, contactName: e.target.value })}
                  placeholder="Studio Director Name"
                  className="w-full px-4 py-3 bg-white/5 border border-white/20 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-purple-500"
                />
              </div>

              {/* Email */}
              <div>
                <label className="block text-sm font-medium text-gray-400 mb-2">
                  Email *
                </label>
                <input
                  type="email"
                  value={addStudioModal.email}
                  onChange={(e) => setAddStudioModal({ ...addStudioModal, email: e.target.value })}
                  placeholder="contact@studio.com"
                  className="w-full px-4 py-3 bg-white/5 border border-white/20 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-purple-500"
                />
              </div>

              {/* Phone */}
              <div>
                <label className="block text-sm font-medium text-gray-400 mb-2">
                  Phone (Optional)
                </label>
                <input
                  type="tel"
                  value={addStudioModal.phone}
                  onChange={(e) => setAddStudioModal({ ...addStudioModal, phone: e.target.value })}
                  placeholder="(555) 123-4567"
                  className="w-full px-4 py-3 bg-white/5 border border-white/20 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-purple-500"
                />
              </div>

              {/* Competition */}
              <div>
                <label className="block text-sm font-medium text-gray-400 mb-2">
                  Competition *
                </label>
                <select
                  value={addStudioModal.competitionId}
                  onChange={(e) => setAddStudioModal({ ...addStudioModal, competitionId: e.target.value })}
                  className="w-full px-4 py-3 bg-white/5 border border-white/20 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                >
                  <option value="" className="bg-gray-900">Select Competition</option>
                  {competitions.map((comp: any) => (
                    <option key={comp.id} value={comp.id} className="bg-gray-900">
                      {comp.name} {comp.year}
                    </option>
                  ))}
                </select>
              </div>

              {/* Pre-Approved Spaces */}
              <div>
                <label className="block text-sm font-medium text-gray-400 mb-2">
                  Pre-Approved Spaces *
                </label>
                <input
                  type="number"
                  min="1"
                  step="1"
                  value={addStudioModal.preApprovedSpaces}
                  onChange={(e) => setAddStudioModal({ ...addStudioModal, preApprovedSpaces: e.target.value })}
                  className="w-full px-4 py-3 bg-white/5 border border-white/20 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                />
              </div>

              {/* Deposit Amount */}
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-400 mb-2">
                  Deposit Amount (Optional)
                </label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={addStudioModal.depositAmount}
                  onChange={(e) => setAddStudioModal({ ...addStudioModal, depositAmount: e.target.value })}
                  placeholder="0.00"
                  className="w-full px-4 py-3 bg-white/5 border border-white/20 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-purple-500"
                />
              </div>

              {/* Comments for Invitation Email */}
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-400 mb-2">
                  Comments for Invitation Email (Optional)
                </label>
                <textarea
                  value={addStudioModal.comments}
                  onChange={(e) => setAddStudioModal({ ...addStudioModal, comments: e.target.value })}
                  placeholder="These comments will be included in the studio invitation email..."
                  rows={3}
                  className="w-full px-4 py-3 bg-white/5 border border-white/20 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-purple-500"
                />
              </div>
            </div>

            {/* Buttons */}
            <div className="flex gap-3 mt-6">
              <button
                onClick={() => setAddStudioModal(null)}
                disabled={createStudioMutation.isPending}
                className="flex-1 px-4 py-2 bg-white/10 hover:bg-white/20 text-white rounded-lg transition-all disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={confirmAddStudio}
                disabled={createStudioMutation.isPending}
                className="flex-1 px-4 py-2 bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white font-medium rounded-lg transition-all disabled:opacity-50"
              >
                {createStudioMutation.isPending ? 'Creating...' : 'Create Studio & Send Invitation'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Spaces Modal */}
      {editSpacesModal?.isOpen && (
        <div
          className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50"
          onClick={() => setEditSpacesModal(null)}
        >
          <div
            className="bg-gradient-to-br from-slate-800 to-slate-900 border border-white/20 rounded-2xl p-8 max-w-md w-full mx-4 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-6">
              <h2 className="text-2xl font-bold text-white mb-2">Edit Reservation Spaces</h2>
              <p className="text-gray-400 text-sm">
                Adjust spaces for <strong className="text-white">{editSpacesModal.studioName}</strong> - <strong className="text-white">{editSpacesModal.competitionName}</strong>
              </p>
            </div>

            {/* Current Info */}
            <div className="bg-white/5 rounded-lg p-4 mb-6 space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-gray-400">Current Spaces:</span>
                <span className="text-white font-semibold">{editSpacesModal.currentSpaces}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-400">Entries Created:</span>
                <span className="text-white font-semibold">{editSpacesModal.entryCount}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-400">Minimum Allowed:</span>
                <span className="text-yellow-300 font-semibold">{editSpacesModal.entryCount}</span>
              </div>
            </div>

            {/* New Spaces Input */}
            <div className="mb-6">
              <label className="block text-sm font-semibold text-gray-300 mb-3">
                New Spaces Amount
              </label>
              <div className="flex items-center gap-3">
                <button
                  onClick={() => setEditSpacesModal({
                    ...editSpacesModal,
                    newSpaces: Math.max(editSpacesModal.entryCount, editSpacesModal.newSpaces - 1)
                  })}
                  className="px-4 py-2 bg-red-500/20 border border-red-500/30 text-red-300 rounded-lg font-bold hover:bg-red-500/30 transition-all"
                >
                  −
                </button>
                <input
                  type="number"
                  value={editSpacesModal.newSpaces}
                  onChange={(e) => setEditSpacesModal({
                    ...editSpacesModal,
                    newSpaces: Math.max(editSpacesModal.entryCount, parseInt(e.target.value) || 0)
                  })}
                  min={editSpacesModal.entryCount}
                  className="flex-1 px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white text-center text-xl font-bold focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <button
                  onClick={() => setEditSpacesModal({
                    ...editSpacesModal,
                    newSpaces: editSpacesModal.newSpaces + 1
                  })}
                  className="px-4 py-2 bg-green-500/20 border border-green-500/30 text-green-300 rounded-lg font-bold hover:bg-green-500/30 transition-all"
                >
                  +
                </button>
              </div>
              {editSpacesModal.newSpaces < editSpacesModal.entryCount && (
                <p className="text-red-400 text-xs mt-2">
                  Cannot reduce below {editSpacesModal.entryCount} (studio has created entries)
                </p>
              )}
            </div>

            {/* Delta Display */}
            {editSpacesModal.newSpaces !== editSpacesModal.currentSpaces && (
              <div className={`rounded-lg p-4 mb-6 ${
                editSpacesModal.newSpaces > editSpacesModal.currentSpaces
                  ? 'bg-green-500/10 border border-green-500/30'
                  : 'bg-yellow-500/10 border border-yellow-500/30'
              }`}>
                <p className={`text-sm font-semibold ${
                  editSpacesModal.newSpaces > editSpacesModal.currentSpaces
                    ? 'text-green-300'
                    : 'text-yellow-300'
                }`}>
                  {editSpacesModal.newSpaces > editSpacesModal.currentSpaces ? '↑' : '↓'}
                  {' '}
                  {editSpacesModal.newSpaces > editSpacesModal.currentSpaces ? 'Increasing' : 'Decreasing'} by{' '}
                  {Math.abs(editSpacesModal.newSpaces - editSpacesModal.currentSpaces)} space(s)
                </p>
              </div>
            )}

            {/* Reason */}
            <div className="mb-6">
              <label className="block text-sm font-semibold text-gray-300 mb-2">
                Reason (Optional)
              </label>
              <input
                type="text"
                value={editSpacesModal.reason}
                onChange={(e) => setEditSpacesModal({ ...editSpacesModal, reason: e.target.value })}
                placeholder="e.g., Studio requested increase/decrease"
                className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => setEditSpacesModal(null)}
                className="flex-1 px-6 py-3 bg-white/10 border border-white/20 text-white font-semibold rounded-lg hover:bg-white/20 transition-all"
              >
                Cancel
              </button>
              <button
                onClick={confirmAdjustSpaces}
                disabled={adjustSpacesMutation.isPending || editSpacesModal.newSpaces === editSpacesModal.currentSpaces}
                className="flex-1 px-6 py-3 bg-gradient-to-r from-blue-500 to-blue-600 text-white font-semibold rounded-lg hover:shadow-lg transition-all disabled:opacity-50"
              >
                {adjustSpacesMutation.isPending ? 'Saving...' : '✓ Save Changes'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
