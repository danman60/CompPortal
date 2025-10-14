'use client';

import Link from 'next/link';
import { trpc } from '@/lib/trpc';

export default function StudioDirectorStats() {
  const { data: myInvoices, isLoading: invoicesLoading } = trpc.invoice.getAllInvoices.useQuery({});
  const { data: myEntries, isLoading: entriesLoading } = trpc.entry.getAll.useQuery();
  const { data: myReservations, isLoading: reservationsLoading } = trpc.reservation.getAll.useQuery();

  if (invoicesLoading || entriesLoading || reservationsLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {[1, 2, 3].map((i) => (
          <div key={i} className="bg-white/10 backdrop-blur-md rounded-xl border border-white/20 p-6 animate-pulse">
            <div className="h-4 bg-white/20 rounded w-1/2 mb-4"></div>
            <div className="h-8 bg-white/20 rounded w-1/4 mb-2"></div>
            <div className="h-3 bg-white/20 rounded w-3/4"></div>
          </div>
        ))}
      </div>
    );
  }

  const totalInvoices = myInvoices?.invoices?.length || 0;
  const unpaidInvoices = myInvoices?.invoices?.filter((inv: any) => inv.reservation?.payment_status !== 'paid').length || 0;
  const unpaidAmount = myInvoices?.invoices
    ?.filter((inv: any) => inv.reservation?.payment_status !== 'paid')
    .reduce((sum: number, inv: any) => sum + (inv.reservation?.total_amount || 0), 0) || 0;

  const totalEntries = myEntries?.entries?.length || 0;
  const registeredEntries = myEntries?.entries?.filter(e => e.status === 'registered' || e.status === 'confirmed').length || 0;
  const draftEntries = myEntries?.entries?.filter(e => e.status === 'draft').length || 0;

  const totalReservations = myReservations?.reservations?.length || 0;
  const approvedReservations = myReservations?.reservations?.filter(r => r.status === 'approved').length || 0;
  const pendingReservations = myReservations?.reservations?.filter(r => r.status === 'pending').length || 0;

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {/* Unpaid Invoices Card (replaced My Dancers) */}
      <Link
        href="/dashboard/invoices"
        className="bg-gradient-to-br from-red-500/20 to-orange-500/20 backdrop-blur-md rounded-xl border border-red-400/30 p-6 hover:from-red-500/30 hover:to-orange-500/30 transition-all duration-200 cursor-pointer"
      >
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-white">Unpaid Invoices</h3>
          <div className="text-3xl">💰</div>
        </div>
        <div className="text-4xl font-bold text-white mb-2">{unpaidInvoices}</div>
        <div className="space-y-1 text-sm">
          <div className="flex justify-between text-gray-300">
            <span>Amount Due:</span>
            <span className="font-semibold text-red-400">${unpaidAmount.toFixed(2)}</span>
          </div>
          <div className="flex justify-between text-gray-300">
            <span>Total Invoices:</span>
            <span className="font-semibold text-gray-400">{totalInvoices}</span>
          </div>
        </div>
      </Link>

      {/* My Routines Card */}
      <Link
        href="/dashboard/entries"
        className="bg-gradient-to-br from-blue-500/20 to-cyan-500/20 backdrop-blur-md rounded-xl border border-blue-400/30 p-6 hover:from-blue-500/30 hover:to-cyan-500/30 transition-all duration-200 cursor-pointer"
      >
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-white">My Routines</h3>
          <div className="text-3xl">🎭</div>
        </div>
        <div className="text-4xl font-bold text-white mb-2">{totalEntries}</div>
        <div className="space-y-1 text-sm">
          <div className="flex justify-between text-gray-300">
            <span>Registered:</span>
            <span className="font-semibold text-green-400">{registeredEntries}</span>
          </div>
          <div className="flex justify-between text-gray-300">
            <span>Drafts:</span>
            <span className="font-semibold text-yellow-400">{draftEntries}</span>
          </div>
        </div>
      </Link>

      {/* My Reservations Card */}
      <Link
        href="/dashboard/reservations"
        className="bg-gradient-to-br from-green-500/20 to-emerald-500/20 backdrop-blur-md rounded-xl border border-green-400/30 p-6 hover:from-green-500/30 hover:to-emerald-500/30 transition-all duration-200 cursor-pointer"
      >
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-white">My Reservations</h3>
          <div className="text-3xl">📋</div>
        </div>
        <div className="text-4xl font-bold text-white mb-2">{totalReservations}</div>
        <div className="space-y-1 text-sm">
          <div className="flex justify-between text-gray-300">
            <span>Approved:</span>
            <span className="font-semibold text-green-400">{approvedReservations}</span>
          </div>
          <div className="flex justify-between text-gray-300">
            <span>Pending:</span>
            <span className="font-semibold text-yellow-400">{pendingReservations}</span>
          </div>
        </div>
      </Link>
    </div>
  );
}
