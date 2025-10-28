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
  const { data: competitionStats, isLoading: competitionsLoading } = trpc.competition.getStats.useQuery();
  const { data: allInvoices, isLoading: invoicesLoading } = trpc.invoice.getAllInvoices.useQuery({});
  const { data: upcomingCompetitions, isLoading: upcomingLoading } = trpc.competition.getUpcoming.useQuery();

  if (reservationsLoading || studiosLoading || dancersLoading || competitionsLoading || invoicesLoading || upcomingLoading) {
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

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
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

      {/* Competitions Card with Capacity Meters */}
      <Link href="/dashboard/competitions">
        <div className="bg-gradient-to-br from-yellow-500/20 to-orange-500/20 backdrop-blur-md rounded-xl border border-yellow-400/30 p-6 hover:from-yellow-500/30 hover:to-orange-500/30 transition-all duration-200 cursor-pointer min-h-[280px] flex flex-col">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-white">Events Capacity</h3>
            <div className="text-3xl">🏆</div>
          </div>
          <div className="text-4xl font-bold text-white mb-2">{competitionStats?.total || 0}</div>

          {/* Upcoming Competitions with Capacity Bars */}
          <div className="space-y-1 text-sm flex-1">
            {upcomingCompetitions?.competitions && upcomingCompetitions.competitions.length > 0 ? (
              upcomingCompetitions.competitions.slice(0, 3).map((comp) => {
                // Use proper capacity from competition tokens
                const totalCapacity = comp.total_reservation_tokens || comp.venue_capacity || 600;
                const availableCapacity = comp.available_reservation_tokens ?? totalCapacity;
                const usedCapacity = totalCapacity - availableCapacity;
                const utilizationPercent = totalCapacity > 0 ? (usedCapacity / totalCapacity) * 100 : 0;
                const barColor = getCapacityColor(utilizationPercent);

                return (
                  <div key={comp.id} className="space-y-1">
                    <div className="flex justify-between items-center text-xs">
                      <span className="text-gray-300 truncate mr-2">{comp.name}</span>
                      <span className="text-white font-semibold whitespace-nowrap">
                        {usedCapacity}/{totalCapacity}
                      </span>
                    </div>
                    <div className="w-full bg-white/10 rounded-full h-2 overflow-hidden">
                      <div
                        className={`${barColor} h-full transition-all duration-500 rounded-full`}
                        style={{ width: `${Math.min(utilizationPercent, 100)}%` }}
                      />
                    </div>
                    <div className="text-xs text-gray-400">
                      {utilizationPercent >= 90 ? '🔴' : utilizationPercent >= 70 ? '🟡' : '🟢'} {utilizationPercent.toFixed(1)}% full
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="text-sm text-gray-400">No upcoming events</div>
            )}
          </div>
        </div>
      </Link>
    </div>
  );
}
