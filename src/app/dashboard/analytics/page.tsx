'use client';

import { useState } from 'react';
import { trpc } from '@/lib/trpc';

export default function AnalyticsPage() {
  const [selectedCompetition, setSelectedCompetition] = useState<string>('');

  // Fetch competitions
  const { data: competitions } = trpc.competition.getAll.useQuery();

  // Fetch competition stats
  const { data: compStats } = trpc.analytics.getCompetitionStats.useQuery(
    { competition_id: selectedCompetition },
    { enabled: !!selectedCompetition }
  );

  // Fetch revenue stats
  const { data: revenueStats } = trpc.analytics.getRevenueStats.useQuery(
    { competition_id: selectedCompetition },
    { enabled: !!selectedCompetition }
  );

  // Fetch judge stats
  const { data: judgeStats } = trpc.analytics.getJudgeStats.useQuery(
    { competition_id: selectedCompetition },
    { enabled: !!selectedCompetition }
  );

  // Fetch top performers
  const { data: topPerformers } = trpc.analytics.getTopPerformers.useQuery(
    { competition_id: selectedCompetition, limit: 10 },
    { enabled: !!selectedCompetition }
  );

  // Fetch system stats (if no competition selected)
  const { data: systemStats } = trpc.analytics.getSystemStats.useQuery(
    undefined,
    { enabled: !selectedCompetition }
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-gray-900 to-black p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-white mb-2">📊 Analytics Dashboard</h1>
          <p className="text-gray-400">Competition insights and performance metrics</p>
        </div>

        {/* Event Selector */}
        <div className="bg-white/10 backdrop-blur-md rounded-xl border border-white/20 p-6 mb-6">
          <label className="block text-sm font-medium text-gray-300 mb-2">
            Select Competition (or view system-wide metrics)
          </label>
          <select
            value={selectedCompetition}
            onChange={(e) => setSelectedCompetition(e.target.value)}
            className="w-full px-4 py-2 rounded-lg bg-white/5 border border-white/20 text-white focus:outline-none focus:ring-2 focus:ring-pink-500"
          >
            <option value="" className="text-gray-900">-- System-Wide Metrics --</option>
            {competitions?.competitions?.map((comp) => (
              <option key={comp.id} value={comp.id} className="text-gray-900">
                {comp.name} ({comp.year})
              </option>
            ))}
          </select>
        </div>

        {/* System-Wide Metrics */}
        {!selectedCompetition && systemStats && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="bg-gradient-to-br from-pink-500/20 to-purple-500/20 backdrop-blur-md rounded-xl border border-white/20 p-6">
                <div className="text-sm text-gray-400 mb-1">Total Competitions</div>
                <div className="text-4xl font-bold text-white">{systemStats.totalCompetitions}</div>
              </div>

              <div className="bg-gradient-to-br from-blue-500/20 to-cyan-500/20 backdrop-blur-md rounded-xl border border-white/20 p-6">
                <div className="text-sm text-gray-400 mb-1">Total Studios</div>
                <div className="text-4xl font-bold text-white">{systemStats.totalStudios}</div>
              </div>

              <div className="bg-gradient-to-br from-green-500/20 to-emerald-500/20 backdrop-blur-md rounded-xl border border-white/20 p-6">
                <div className="text-sm text-gray-400 mb-1">Total Dancers</div>
                <div className="text-4xl font-bold text-white">{systemStats.totalDancers}</div>
              </div>

              <div className="bg-gradient-to-br from-yellow-500/20 to-orange-500/20 backdrop-blur-md rounded-xl border border-white/20 p-6">
                <div className="text-sm text-gray-400 mb-1">Total Routines</div>
                <div className="text-4xl font-bold text-white">{systemStats.totalEntries}</div>
              </div>
            </div>

            <div className="bg-white/10 backdrop-blur-md rounded-xl border border-white/20 p-6">
              <h2 className="text-2xl font-semibold text-white mb-4">System Overview</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <h3 className="text-lg font-medium text-white mb-3">Competitions by Status</h3>
                  <div className="space-y-2">
                    {systemStats.competitionsByStatus.map((stat) => (
                      <div key={stat.status} className="flex justify-between items-center">
                        <span className="text-gray-300 capitalize">{stat.status}</span>
                        <span className="px-3 py-1 bg-white/10 rounded text-white font-medium">
                          {stat._count}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                <div>
                  <h3 className="text-lg font-medium text-white mb-3">Studios by Status</h3>
                  <div className="space-y-2">
                    {systemStats.studiosByStatus.map((stat) => (
                      <div key={stat.status} className="flex justify-between items-center">
                        <span className="text-gray-300 capitalize">{stat.status}</span>
                        <span className="px-3 py-1 bg-white/10 rounded text-white font-medium">
                          {stat._count}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Competition-Specific Analytics */}
        {selectedCompetition && compStats && (
          <div className="space-y-6">
            {/* Key Metrics */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="bg-gradient-to-br from-pink-500/20 to-purple-500/20 backdrop-blur-md rounded-xl border border-white/20 p-6">
                <div className="text-sm text-gray-400 mb-1">Total Routines</div>
                <div className="text-4xl font-bold text-white">{compStats.totalEntries}</div>
              </div>

              <div className="bg-gradient-to-br from-blue-500/20 to-cyan-500/20 backdrop-blur-md rounded-xl border border-white/20 p-6">
                <div className="text-sm text-gray-400 mb-1">Participating Studios</div>
                <div className="text-4xl font-bold text-white">{compStats.totalStudios}</div>
              </div>

              <div className="bg-gradient-to-br from-green-500/20 to-emerald-500/20 backdrop-blur-md rounded-xl border border-white/20 p-6">
                <div className="text-sm text-gray-400 mb-1">Total Dancers</div>
                <div className="text-4xl font-bold text-white">{compStats.totalDancers}</div>
              </div>

              <div className="bg-gradient-to-br from-yellow-500/20 to-orange-500/20 backdrop-blur-md rounded-xl border border-white/20 p-6">
                <div className="text-sm text-gray-400 mb-1">Scoring Progress</div>
                <div className="text-4xl font-bold text-white">{compStats.scoringProgress}%</div>
              </div>
            </div>

            {/* Routines by Category */}
            <div className="bg-white/10 backdrop-blur-md rounded-xl border border-white/20 p-6">
              <h2 className="text-2xl font-semibold text-white mb-4">Routines by Category</h2>
              <div className="space-y-2">
                {compStats.categoryStats.map((stat) => (
                  <div key={stat.category_id} className="flex items-center gap-4">
                    <div className="flex-1">
                      <div className="flex justify-between mb-1">
                        <span className="text-white">{stat.category_name}</span>
                        <span className="text-gray-400">{stat.entry_count} routines</span>
                      </div>
                      <div className="w-full bg-white/10 rounded-full h-2">
                        <div
                          className="bg-gradient-to-r from-pink-500 to-purple-500 h-2 rounded-full"
                          style={{
                            width: `${(stat.entry_count / compStats.totalEntries) * 100}%`,
                          }}
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Routines by Studio */}
            <div className="bg-white/10 backdrop-blur-md rounded-xl border border-white/20 p-6">
              <h2 className="text-2xl font-semibold text-white mb-4">Routines by Studio</h2>
              <div className="space-y-2">
                {compStats.studioStats
                  .sort((a, b) => b.entry_count - a.entry_count)
                  .slice(0, 10)
                  .map((stat) => (
                    <div key={stat.studio_id} className="flex items-center gap-4">
                      <div className="flex-1">
                        <div className="flex justify-between mb-1">
                          <span className="text-white">{stat.studio_name}</span>
                          <span className="text-gray-400">{stat.entry_count} routines</span>
                        </div>
                        <div className="w-full bg-white/10 rounded-full h-2">
                          <div
                            className="bg-gradient-to-r from-blue-500 to-cyan-500 h-2 rounded-full"
                            style={{
                              width: `${(stat.entry_count / compStats.totalEntries) * 100}%`,
                            }}
                          />
                        </div>
                      </div>
                    </div>
                  ))}
              </div>
            </div>

            {/* Revenue Analytics */}
            {revenueStats && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-white/10 backdrop-blur-md rounded-xl border border-white/20 p-6">
                  <h2 className="text-2xl font-semibold text-white mb-4">Revenue Overview</h2>
                  <div className="space-y-4">
                    <div className="flex justify-between items-center pb-3 border-b border-white/10">
                      <span className="text-gray-400">Total Revenue</span>
                      <span className="text-2xl font-bold text-green-400">
                        ${revenueStats.totalRevenue.toLocaleString()}
                      </span>
                    </div>
                    <div className="flex justify-between items-center pb-3 border-b border-white/10">
                      <span className="text-gray-400">Routine Fees</span>
                      <span className="text-lg font-semibold text-white">
                        ${revenueStats.totalEntryFees.toLocaleString()}
                      </span>
                    </div>
                    <div className="flex justify-between items-center pb-3 border-b border-white/10">
                      <span className="text-gray-400">Late Fees</span>
                      <span className="text-lg font-semibold text-yellow-400">
                        ${revenueStats.totalLateFees.toLocaleString()}
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-gray-400">Avg per Routine</span>
                      <span className="text-lg font-semibold text-white">
                        ${revenueStats.averageEntryFee.toFixed(2)}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="bg-white/10 backdrop-blur-md rounded-xl border border-white/20 p-6">
                  <h2 className="text-2xl font-semibold text-white mb-4">Top Revenue Studios</h2>
                  <div className="space-y-3">
                    {revenueStats.revenueByStudio.slice(0, 5).map((studio, index) => (
                      <div key={studio.studio_id} className="flex items-center gap-3">
                        <div className={`
                          w-8 h-8 rounded-full flex items-center justify-center font-bold
                          ${index === 0 ? 'bg-yellow-500/20 text-yellow-400' : ''}
                          ${index === 1 ? 'bg-gray-400/20 text-gray-300' : ''}
                          ${index === 2 ? 'bg-orange-500/20 text-orange-400' : ''}
                          ${index > 2 ? 'bg-white/10 text-gray-400' : ''}
                        `}>
                          {index + 1}
                        </div>
                        <div className="flex-1">
                          <div className="text-white">{studio.studio_name}</div>
                          <div className="text-sm text-gray-400">
                            {studio.entry_count} routines
                          </div>
                        </div>
                        <div className="text-lg font-semibold text-green-400">
                          ${studio.revenue.toLocaleString()}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Judge Performance */}
            {judgeStats && judgeStats.length > 0 && (
              <div className="bg-white/10 backdrop-blur-md rounded-xl border border-white/20 p-6">
                <h2 className="text-2xl font-semibold text-white mb-4">Judge Performance</h2>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-white/10">
                        <th className="pb-3 text-left text-gray-300 font-medium">Judge</th>
                        <th className="pb-3 text-center text-gray-300 font-medium">Scores</th>
                        <th className="pb-3 text-center text-gray-300 font-medium">Technical</th>
                        <th className="pb-3 text-center text-gray-300 font-medium">Artistic</th>
                        <th className="pb-3 text-center text-gray-300 font-medium">Performance</th>
                        <th className="pb-3 text-center text-gray-300 font-medium">Average</th>
                      </tr>
                    </thead>
                    <tbody>
                      {judgeStats.map((judge) => (
                        <tr key={judge.judge_id} className="border-b border-white/5">
                          <td className="py-3">
                            <div className="text-white font-medium">{judge.judge_name}</div>
                            <div className="text-sm text-gray-400">Judge #{judge.judge_number}</div>
                          </td>
                          <td className="py-3 text-center text-white">{judge.total_scores}</td>
                          <td className="py-3 text-center text-blue-400">
                            {judge.avg_technical.toFixed(1)}
                          </td>
                          <td className="py-3 text-center text-purple-400">
                            {judge.avg_artistic.toFixed(1)}
                          </td>
                          <td className="py-3 text-center text-pink-400">
                            {judge.avg_performance.toFixed(1)}
                          </td>
                          <td className="py-3 text-center">
                            <span className="px-3 py-1 bg-green-500/20 text-green-400 rounded font-semibold">
                              {judge.avg_total.toFixed(1)}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Top Performers */}
            {topPerformers && topPerformers.length > 0 && (
              <div className="bg-white/10 backdrop-blur-md rounded-xl border border-white/20 p-6">
                <h2 className="text-2xl font-semibold text-white mb-4">🏆 Top 10 Performers</h2>
                <div className="space-y-3">
                  {topPerformers.map((performer, index) => (
                    <div
                      key={performer.entry_id}
                      className="flex items-center gap-4 p-3 bg-white/5 rounded-lg"
                    >
                      <div className={`
                        w-10 h-10 rounded-full flex items-center justify-center font-bold text-lg
                        ${index === 0 ? 'bg-yellow-500/20 text-yellow-400' : ''}
                        ${index === 1 ? 'bg-gray-400/20 text-gray-300' : ''}
                        ${index === 2 ? 'bg-orange-500/20 text-orange-400' : ''}
                        ${index > 2 ? 'bg-white/10 text-gray-400' : ''}
                      `}>
                        {index === 0 && '🥇'}
                        {index === 1 && '🥈'}
                        {index === 2 && '🥉'}
                        {index > 2 && (index + 1)}
                      </div>
                      <div className="flex-1">
                        <div className="text-white font-medium">{performer.title}</div>
                        <div className="text-sm text-gray-400">
                          {performer.studio_name} • {performer.category_name} • {performer.age_group_name}
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-2xl font-bold text-white">
                          {performer.average_score.toFixed(1)}
                        </div>
                        <div className="text-xs text-gray-400">
                          {performer.judge_count} judges
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Empty State */}
        {!selectedCompetition && !systemStats && (
          <div className="bg-white/10 backdrop-blur-md rounded-xl border border-white/20 p-12 text-center">
            <div className="text-6xl mb-4">📊</div>
            <h2 className="text-2xl font-bold text-white mb-2">Analytics Dashboard</h2>
            <p className="text-gray-400">
              Select a competition above to view detailed analytics and insights.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
