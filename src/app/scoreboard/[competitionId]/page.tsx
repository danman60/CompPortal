'use client';

import { useParams } from 'next/navigation';
import { useEffect, useState, useCallback } from 'react';

// Award level color mapping
const awardColors: Record<string, { bg: string; text: string; border: string }> = {
  'Platinum': { bg: 'bg-gradient-to-r from-slate-200 to-slate-300', text: 'text-slate-800', border: 'border-slate-400' },
  'High Gold': { bg: 'bg-gradient-to-r from-yellow-300 to-yellow-400', text: 'text-yellow-900', border: 'border-yellow-500' },
  'Gold': { bg: 'bg-gradient-to-r from-yellow-200 to-yellow-300', text: 'text-yellow-800', border: 'border-yellow-400' },
  'High Silver': { bg: 'bg-gradient-to-r from-gray-200 to-gray-300', text: 'text-gray-700', border: 'border-gray-400' },
  'Silver': { bg: 'bg-gradient-to-r from-gray-100 to-gray-200', text: 'text-gray-600', border: 'border-gray-300' },
  'Bronze': { bg: 'bg-gradient-to-r from-orange-200 to-orange-300', text: 'text-orange-800', border: 'border-orange-400' },
};

interface StandingEntry {
  id: string;
  entryNumber: string;
  routineName: string;
  studioName: string;
  category: string;
  ageGroup: string;
  entryType: string;
  averageScore: number;
  awardLevel: string;
  placement: number | null;
  scoredAt: string;
}

interface ScheduleStatus {
  totalRoutines: number;
  completedRoutines: number;
  currentRoutine: string | null;
  minutesAhead: number;
}

export default function ScoreboardPage() {
  const params = useParams();
  const competitionId = params.competitionId as string;

  const [standings, setStandings] = useState<StandingEntry[]>([]);
  const [scheduleStatus, setScheduleStatus] = useState<ScheduleStatus | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [categories, setCategories] = useState<string[]>([]);
  const [competitionName, setCompetitionName] = useState<string>('');
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date());
  const [isLoading, setIsLoading] = useState(true);

  // Fetch standings data
  const fetchStandings = useCallback(async () => {
    try {
      const response = await fetch(`/api/scoreboard/${competitionId}?category=${selectedCategory}`);
      if (response.ok) {
        const data = await response.json();
        setStandings(data.standings || []);
        setScheduleStatus(data.scheduleStatus || null);
        setCategories(data.categories || []);
        setCompetitionName(data.competitionName || 'Competition');
        setLastUpdate(new Date());
      }
    } catch (error) {
      console.error('Failed to fetch standings:', error);
    } finally {
      setIsLoading(false);
    }
  }, [competitionId, selectedCategory]);

  // Initial fetch and auto-refresh every 5 seconds
  useEffect(() => {
    fetchStandings();
    const interval = setInterval(fetchStandings, 5000);
    return () => clearInterval(interval);
  }, [fetchStandings]);

  const getAwardStyle = (level: string) => {
    return awardColors[level] || { bg: 'bg-gray-100', text: 'text-gray-600', border: 'border-gray-300' };
  };

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-gray-900 via-slate-900 to-black flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-6" />
          <div className="text-gray-300 text-2xl font-medium">Loading Scoreboard...</div>
          <div className="text-gray-500 text-sm mt-2">Fetching live scores</div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-900 via-slate-900 to-black text-white p-4 md:p-8">
      {/* Header */}
      <div className="max-w-7xl mx-auto">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
          <div>
            <h1 className="text-3xl md:text-4xl font-bold bg-gradient-to-r from-blue-400 via-cyan-300 to-blue-400 bg-clip-text text-transparent">
              {competitionName}
            </h1>
            <div className="flex items-center gap-2 mt-2">
              <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
              <p className="text-gray-400">Live Scoreboard</p>
            </div>
          </div>

          {/* Schedule Status */}
          {scheduleStatus && (
            <div className="bg-gradient-to-br from-gray-800/80 to-gray-900/80 border border-gray-700/50 rounded-xl px-5 py-4 flex items-center gap-5 shadow-lg">
              <div className="text-center">
                <div className="text-2xl font-bold bg-gradient-to-r from-blue-400 to-cyan-400 bg-clip-text text-transparent">
                  {scheduleStatus.completedRoutines}/{scheduleStatus.totalRoutines}
                </div>
                <div className="text-xs text-gray-400 font-medium uppercase tracking-wide">Completed</div>
              </div>
              <div className="h-12 w-px bg-gradient-to-b from-transparent via-gray-600 to-transparent"></div>
              <div className="text-center">
                <div className={`text-2xl font-bold ${
                  scheduleStatus.minutesAhead >= 0
                    ? 'bg-gradient-to-r from-green-400 to-emerald-400 bg-clip-text text-transparent'
                    : 'bg-gradient-to-r from-red-400 to-orange-400 bg-clip-text text-transparent'
                }`}>
                  {scheduleStatus.minutesAhead >= 0 ? '+' : ''}{scheduleStatus.minutesAhead}m
                </div>
                <div className="text-xs text-gray-400 font-medium uppercase tracking-wide">Schedule</div>
              </div>
            </div>
          )}
        </div>

        {/* Controls Bar */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4 bg-gradient-to-r from-gray-800/50 via-slate-800/50 to-gray-800/50 rounded-xl p-4 border border-gray-700/30">
          {/* Category Filter */}
          <div className="flex items-center gap-3">
            <label className="text-gray-300 text-sm font-medium">Category:</label>
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="bg-gray-900/80 border border-gray-600 rounded-lg px-4 py-2.5 text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 transition-all cursor-pointer hover:border-gray-500"
            >
              <option value="all">All Categories</option>
              {categories.map((cat) => (
                <option key={cat} value={cat}>{cat}</option>
              ))}
            </select>
          </div>

          {/* Auto-refresh indicator */}
          <div className="flex items-center gap-3 px-4 py-2 bg-gray-900/50 rounded-lg border border-gray-700/30">
            <div className="flex items-center gap-2">
              <div className="w-2.5 h-2.5 rounded-full bg-green-500 animate-pulse shadow-lg shadow-green-500/50"></div>
              <span className="text-sm text-green-400 font-medium">LIVE</span>
            </div>
            <div className="w-px h-4 bg-gray-600"></div>
            <span className="text-sm text-gray-400">Last update: {formatTime(lastUpdate)}</span>
          </div>
        </div>

        {/* Standings Table */}
        <div className="bg-gradient-to-br from-gray-800/80 to-gray-900/80 rounded-2xl overflow-hidden shadow-2xl border border-gray-700/50">
          <table className="w-full">
            <thead>
              <tr className="bg-gradient-to-r from-gray-900 via-slate-900 to-gray-900 text-gray-300 text-sm uppercase tracking-wider border-b border-gray-700/50">
                <th className="py-5 px-4 text-left w-16 font-semibold">Place</th>
                <th className="py-5 px-4 text-left w-20 font-semibold">Entry</th>
                <th className="py-5 px-4 text-left font-semibold">Routine</th>
                <th className="py-5 px-4 text-left hidden md:table-cell font-semibold">Studio</th>
                <th className="py-5 px-4 text-left hidden lg:table-cell font-semibold">Category</th>
                <th className="py-5 px-4 text-center w-24 font-semibold">Score</th>
                <th className="py-5 px-4 text-center w-32 font-semibold">Award</th>
              </tr>
            </thead>
            <tbody>
              {standings.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-16 text-center">
                    <div className="text-gray-500 text-lg">No scores available yet</div>
                    <div className="text-gray-600 text-sm mt-2">Scores will appear here as routines are judged</div>
                  </td>
                </tr>
              ) : (
                standings.map((entry, index) => {
                  const awardStyle = getAwardStyle(entry.awardLevel);
                  const isTop3 = entry.placement !== null && entry.placement <= 3;

                  return (
                    <tr
                      key={entry.id}
                      className={`border-b border-gray-700/50 hover:bg-gray-700/30 transition-all duration-200 ${
                        isTop3 ? 'bg-gradient-to-r from-yellow-900/10 via-transparent to-yellow-900/10' : ''
                      }`}
                    >
                      <td className="py-4 px-4">
                        {entry.placement !== null ? (
                          <span className={`inline-flex items-center justify-center w-9 h-9 rounded-full font-bold shadow-lg ${
                            entry.placement === 1 ? 'bg-gradient-to-br from-yellow-400 to-yellow-600 text-yellow-900 shadow-yellow-500/30' :
                            entry.placement === 2 ? 'bg-gradient-to-br from-gray-200 to-gray-400 text-gray-800 shadow-gray-400/30' :
                            entry.placement === 3 ? 'bg-gradient-to-br from-orange-400 to-orange-600 text-orange-900 shadow-orange-500/30' :
                            'bg-gray-700 text-gray-300'
                          }`}>
                            {entry.placement}
                          </span>
                        ) : (
                          <span className="text-gray-600">-</span>
                        )}
                      </td>
                      <td className="py-4 px-4 font-mono text-gray-400">
                        #{entry.entryNumber}
                      </td>
                      <td className="py-4 px-4">
                        <div className="font-semibold text-white">{entry.routineName}</div>
                        <div className="text-sm text-gray-400 md:hidden">{entry.studioName}</div>
                      </td>
                      <td className="py-4 px-4 text-gray-300 hidden md:table-cell">
                        {entry.studioName}
                      </td>
                      <td className="py-4 px-4 hidden lg:table-cell">
                        <span className="text-sm text-gray-400">
                          {entry.category} | {entry.ageGroup} | {entry.entryType}
                        </span>
                      </td>
                      <td className="py-4 px-4 text-center">
                        <span className="text-xl font-bold bg-gradient-to-r from-white to-gray-300 bg-clip-text text-transparent">
                          {entry.averageScore.toFixed(2)}
                        </span>
                      </td>
                      <td className="py-4 px-4 text-center">
                        <span className={`inline-block px-3 py-1 rounded-full text-sm font-semibold border ${awardStyle.bg} ${awardStyle.text} ${awardStyle.border}`}>
                          {entry.awardLevel}
                        </span>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Award Level Legend */}
        <div className="mt-10 p-4 bg-gradient-to-r from-gray-800/30 via-slate-800/50 to-gray-800/30 rounded-xl border border-gray-700/30">
          <div className="text-center text-gray-400 text-xs uppercase tracking-wider mb-4 font-medium">Award Levels</div>
          <div className="flex flex-wrap gap-3 justify-center">
            {Object.entries(awardColors).map(([level, style]) => (
              <div
                key={level}
                className={`px-4 py-1.5 rounded-full text-sm font-semibold border shadow-md ${style.bg} ${style.text} ${style.border}`}
              >
                {level}
              </div>
            ))}
          </div>
        </div>

        {/* Footer */}
        <div className="mt-10 text-center">
          <div className="inline-flex items-center gap-3 px-6 py-3 bg-gray-800/50 rounded-xl border border-gray-700/30">
            <span className="w-2 h-2 bg-blue-500 rounded-full animate-pulse" />
            <span className="text-gray-400 text-sm">Powered by <span className="text-blue-400 font-medium">CompSync</span></span>
            <span className="text-gray-600">|</span>
            <span className="text-gray-500 text-sm">Optimized for TV viewing</span>
          </div>
        </div>
      </div>
    </div>
  );
}
