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
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-white text-2xl">Loading Scoreboard...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-900 text-white p-4 md:p-8">
      {/* Header */}
      <div className="max-w-7xl mx-auto">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
          <div>
            <h1 className="text-3xl md:text-4xl font-bold text-white">{competitionName}</h1>
            <p className="text-gray-400 mt-1">Live Scoreboard</p>
          </div>

          {/* Schedule Status */}
          {scheduleStatus && (
            <div className="bg-gray-800 rounded-lg px-4 py-3 flex items-center gap-4">
              <div className="text-center">
                <div className="text-2xl font-bold text-blue-400">
                  {scheduleStatus.completedRoutines}/{scheduleStatus.totalRoutines}
                </div>
                <div className="text-xs text-gray-400">Completed</div>
              </div>
              <div className="h-10 w-px bg-gray-700"></div>
              <div className="text-center">
                <div className={`text-2xl font-bold ${
                  scheduleStatus.minutesAhead >= 0 ? 'text-green-400' : 'text-red-400'
                }`}>
                  {scheduleStatus.minutesAhead >= 0 ? '+' : ''}{scheduleStatus.minutesAhead}m
                </div>
                <div className="text-xs text-gray-400">Schedule</div>
              </div>
            </div>
          )}
        </div>

        {/* Controls Bar */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
          {/* Category Filter */}
          <div className="flex items-center gap-2">
            <label className="text-gray-400 text-sm">Category:</label>
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">All Categories</option>
              {categories.map((cat) => (
                <option key={cat} value={cat}>{cat}</option>
              ))}
            </select>
          </div>

          {/* Auto-refresh indicator */}
          <div className="flex items-center gap-2 text-sm text-gray-400">
            <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></div>
            <span>Auto-refresh | Last: {formatTime(lastUpdate)}</span>
          </div>
        </div>

        {/* Standings Table */}
        <div className="bg-gray-800 rounded-xl overflow-hidden shadow-xl">
          <table className="w-full">
            <thead>
              <tr className="bg-gray-900 text-gray-300 text-sm uppercase tracking-wider">
                <th className="py-4 px-4 text-left w-16">Place</th>
                <th className="py-4 px-4 text-left w-20">Entry</th>
                <th className="py-4 px-4 text-left">Routine</th>
                <th className="py-4 px-4 text-left hidden md:table-cell">Studio</th>
                <th className="py-4 px-4 text-left hidden lg:table-cell">Category</th>
                <th className="py-4 px-4 text-center w-24">Score</th>
                <th className="py-4 px-4 text-center w-32">Award</th>
              </tr>
            </thead>
            <tbody>
              {standings.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-gray-500">
                    No scores available yet
                  </td>
                </tr>
              ) : (
                standings.map((entry, index) => {
                  const awardStyle = getAwardStyle(entry.awardLevel);
                  const isTop3 = entry.placement !== null && entry.placement <= 3;

                  return (
                    <tr
                      key={entry.id}
                      className={`border-b border-gray-700 hover:bg-gray-750 transition-colors ${
                        isTop3 ? 'bg-gray-800/50' : ''
                      }`}
                    >
                      <td className="py-4 px-4">
                        {entry.placement !== null ? (
                          <span className={`inline-flex items-center justify-center w-8 h-8 rounded-full font-bold ${
                            entry.placement === 1 ? 'bg-yellow-500 text-yellow-900' :
                            entry.placement === 2 ? 'bg-gray-300 text-gray-800' :
                            entry.placement === 3 ? 'bg-orange-400 text-orange-900' :
                            'bg-gray-700 text-gray-300'
                          }`}>
                            {entry.placement}
                          </span>
                        ) : (
                          <span className="text-gray-500">-</span>
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
                        <span className="text-xl font-bold text-white">
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
        <div className="mt-8 flex flex-wrap gap-3 justify-center">
          {Object.entries(awardColors).map(([level, style]) => (
            <div
              key={level}
              className={`px-3 py-1 rounded-full text-sm font-semibold border ${style.bg} ${style.text} ${style.border}`}
            >
              {level}
            </div>
          ))}
        </div>

        {/* Footer */}
        <div className="mt-8 text-center text-gray-500 text-sm">
          Powered by CompSync | Display optimized for TV viewing
        </div>
      </div>
    </div>
  );
}
