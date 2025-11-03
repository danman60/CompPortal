'use client';

import { trpc } from '@/lib/trpc';
import Link from 'next/link';
import { SkeletonMetricCard } from '@/components/ui';

interface DashboardStatsProps {
  role?: 'studio_director' | 'competition_director' | 'super_admin';
}

export default function DashboardStats({ role = 'studio_director' }: DashboardStatsProps) {
  const { data: reservationStats, isLoading: reservationsLoading } = trpc.reservation.getStats.useQuery();
  const { data: studioStats, isLoading: studiosLoading } = trpc.studio.getStats.useQuery();
  const { data: dancerStats, isLoading: dancersLoading } = trpc.dancer.getStats.useQuery();
  const { data: allCompetitions, isLoading: competitionsLoading } = trpc.competition.getAll.useQuery({});
  const { data: allInvoices, isLoading: invoicesLoading } = trpc.invoice.getAllInvoices.useQuery({});

  if (reservationsLoading || studiosLoading || dancersLoading || competitionsLoading || invoicesLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <SkeletonMetricCard />
        <SkeletonMetricCard />
        <SkeletonMetricCard />
        <SkeletonMetricCard />
      </div>
    );
  }

  const invoices = allInvoices?.invoices || [];
  const unpaidCount = invoices.filter(inv => inv.reservation?.paymentStatus === 'pending' || !inv.reservation?.paymentStatus).length;
  const paidCount = invoices.filter(inv => inv.reservation?.paymentStatus === 'paid').length;
  const sentCount = invoices.filter(inv => inv.reservation?.paymentStatus === 'sent').length;
  const totalInvoices = invoices.length;

  // Helper function to get capacity color
  const getCapacityColor = (percent: number) => {
    if (percent >= 90) return 'bg-red-500';
    if (percent >= 70) return 'bg-yellow-500';
    return 'bg-green-500';
  };

  // Determine grid columns based on role (3 cards for CD, 4 for SD)
  const gridCols = role === 'studio_director' ? 'lg:grid-cols-4' : 'lg:grid-cols-3';

  return (
    <div className={`grid grid-cols-1 md:grid-cols-2 ${gridCols} gap-6`}>
      {/* Reservations Card - Studio Directors Only */}
      {role === 'studio_director' && (
        <Link href="/dashboard/competitions">
          <div className="bg-gradient-to-br from-orange-500/30 to-red-500/30 backdrop-blur-md rounded-xl border border-orange-400/40 p-6 hover:from-orange-500/40 hover:to-red-500/40 transition-all duration-200 cursor-pointer shadow-lg min-h-[280px] flex flex-col">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-white">Reservations</h3>
              <div className="text-3xl">📋</div>
            </div>
            <div className="text-4xl font-bold text-white mb-2">{reservationStats?.total || 0}</div>
            <div className="space-y-1 text-sm">
              <div className="flex justify-between text-gray-300">
                <span>Approved:</span>
                <span className="font-semibold text-green-400">{reservationStats?.approved || 0}</span>
              </div>
              <div className="flex justify-between text-gray-300">
                <span>Pending:</span>
                <span className="font-semibold text-yellow-400">{reservationStats?.pending || 0}</span>
              </div>
              <div className="flex justify-between text-gray-300">
                <span>Rejected:</span>
                <span className="font-semibold text-red-400">{reservationStats?.rejected || 0}</span>
              </div>
            </div>
          </div>
        </Link>
      )}

      {/* Studios Card */}
      <Link href="/dashboard/studios">
        <div className="bg-gradient-to-br from-blue-500/20 to-cyan-500/20 backdrop-blur-md rounded-xl border border-blue-400/30 p-6 hover:from-blue-500/30 hover:to-cyan-500/30 transition-all duration-200 cursor-pointer min-h-[280px] flex flex-col">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-white">Studios</h3>
            <div className="text-3xl">🏢</div>
          </div>
          <div className="text-4xl font-bold text-white mb-2">{studioStats?.total || 0}</div>
          <div className="space-y-1 text-sm">
            <div className="flex justify-between text-gray-300">
              <span>Approved:</span>
              <span className="font-semibold text-green-400">{studioStats?.approved || 0}</span>
            </div>
            <div className="flex justify-between text-gray-300">
              <span>Pending:</span>
              <span className="font-semibold text-yellow-400">{studioStats?.pending || 0}</span>
            </div>
            <div className="flex justify-between text-gray-300">
              <span>With Dancers:</span>
              <span className="font-semibold">{studioStats?.withDancers || 0}</span>
            </div>
          </div>
        </div>
      </Link>

      {/* Dancers Card - Studio Directors Only */}
      {role === 'studio_director' && (
        <div className="bg-gradient-to-br from-purple-500/20 to-pink-500/20 backdrop-blur-md rounded-xl border border-purple-400/30 p-6 min-h-[280px] flex flex-col">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-white">Dancers</h3>
            <div className="text-3xl">💃</div>
          </div>
          <div className="text-4xl font-bold text-white mb-2">{dancerStats?.total || 0}</div>
          <div className="space-y-1 text-sm">
            <div className="flex justify-between text-gray-300">
              <span>Active:</span>
              <span className="font-semibold text-green-400">{dancerStats?.active || 0}</span>
            </div>
            <div className="flex justify-between text-gray-300">
              <span>Male:</span>
              <span className="font-semibold">{dancerStats?.byGender?.Male || 0}</span>
            </div>
            <div className="flex justify-between text-gray-300">
              <span>Female:</span>
              <span className="font-semibold">{dancerStats?.byGender?.Female || 0}</span>
            </div>
          </div>
        </div>
      )}

      {/* Invoices Card */}
      <Link href="/dashboard/invoices/all">
        <div className="bg-gradient-to-br from-red-500/20 to-pink-500/20 backdrop-blur-md rounded-xl border border-red-400/30 p-6 hover:from-red-500/30 hover:to-pink-500/30 transition-all duration-200 cursor-pointer min-h-[280px] flex flex-col">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-white">Invoices</h3>
            <div className="text-3xl">💰</div>
          </div>
          <div className="text-4xl font-bold text-white mb-2">{totalInvoices}</div>
          <div className="space-y-1 text-sm">
            <div className="flex justify-between text-gray-300">
              <span>Sent:</span>
              <span className="font-semibold text-blue-400">{sentCount}</span>
            </div>
            <div className="flex justify-between text-gray-300">
              <span>Paid:</span>
              <span className="font-semibold text-green-400">{paidCount}</span>
            </div>
            <div className="flex justify-between text-gray-300">
              <span>Unpaid:</span>
              <span className="font-semibold text-yellow-400">{unpaidCount}</span>
            </div>
          </div>
        </div>
      </Link>

      {/* Events Card */}
      <Link href="/dashboard/competitions">
        <div className="bg-gradient-to-br from-yellow-500/20 to-orange-500/20 backdrop-blur-md rounded-xl border border-yellow-400/30 p-6 hover:from-yellow-500/30 hover:to-orange-500/30 transition-all duration-200 cursor-pointer">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-white">Events</h3>
            <div className="text-3xl">🎪</div>
          </div>
          <div className="text-4xl font-bold text-white mb-2">{allCompetitions?.total || 0}</div>
          <div className="space-y-1 text-sm">
            <div className="flex justify-between text-gray-300">
              <span>Registration Open:</span>
              <span className="font-semibold text-green-400">
                {allCompetitions?.competitions?.filter((c: any) => c.status === 'registration_open').length || 0}
              </span>
            </div>
            <div className="flex justify-between text-gray-300">
              <span>Upcoming:</span>
              <span className="font-semibold text-blue-400">
                {allCompetitions?.competitions?.filter((c: any) => c.status === 'upcoming').length || 0}
              </span>
            </div>
            <div className="flex justify-between text-gray-300">
              <span>In Progress:</span>
              <span className="font-semibold text-yellow-400">
                {allCompetitions?.competitions?.filter((c: any) => c.status === 'in_progress').length || 0}
              </span>
            </div>
          </div>
        </div>
      </Link>
    </div>
  );
}
