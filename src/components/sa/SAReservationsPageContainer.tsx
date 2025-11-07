'use client';

import { useState, useMemo } from 'react';
import Link from 'next/link';
import { trpc } from '@/lib/trpc';

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
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
