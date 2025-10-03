'use client';

import { trpc } from '@/lib/trpc';

export default function DashboardStats() {
  const { data: studioStats, isLoading: studiosLoading } = trpc.studio.getStats.useQuery();
  const { data: dancerStats, isLoading: dancersLoading } = trpc.dancer.getStats.useQuery();
  const { data: competitionStats, isLoading: competitionsLoading } = trpc.competition.getStats.useQuery();

  if (studiosLoading || dancersLoading || competitionsLoading) {
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

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
      {/* Studios Card */}
      <div className="bg-gradient-to-br from-blue-500/20 to-cyan-500/20 backdrop-blur-md rounded-xl border border-blue-400/30 p-6">
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

      {/* Dancers Card */}
      <div className="bg-gradient-to-br from-purple-500/20 to-pink-500/20 backdrop-blur-md rounded-xl border border-purple-400/30 p-6">
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

      {/* Competitions Card */}
      <div className="bg-gradient-to-br from-yellow-500/20 to-orange-500/20 backdrop-blur-md rounded-xl border border-yellow-400/30 p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-white">Competitions</h3>
          <div className="text-3xl">🏆</div>
        </div>
        <div className="text-4xl font-bold text-white mb-2">{competitionStats?.total || 0}</div>
        <div className="space-y-1 text-sm">
          <div className="flex justify-between text-gray-300">
            <span>Upcoming:</span>
            <span className="font-semibold text-green-400">{competitionStats?.byStatus?.upcoming || 0}</span>
          </div>
          <div className="flex justify-between text-gray-300">
            <span>Registration Open:</span>
            <span className="font-semibold text-blue-400">{competitionStats?.byStatus?.registration_open || 0}</span>
          </div>
          <div className="flex justify-between text-gray-300">
            <span>This Year:</span>
            <span className="font-semibold">{competitionStats?.byYear?.[0]?.count || 0}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
