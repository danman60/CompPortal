'use client';

import { useState, useEffect } from 'react';
import { trpc } from '@/lib/trpc';

/**
 * Game Day Multi-View Testing Page
 *
 * Shows all 3 views (Judge, Backstage, Tabulator) side by side
 * for verifying real-time sync in a single browser window.
 *
 * This allows Playwright to test sync behavior without needing
 * multiple browser windows.
 */

interface BackstageData {
  currentRoutine: {
    id: string;
    entryNumber: string;
    routineName: string;
    studioName: string;
    category: string;
    ageGroup: string;
    durationMs: number;
    startedAt: string | null;
    state: string | null;
  } | null;
  nextRoutine: {
    id: string;
    entryNumber: string;
    routineName: string;
    studioName: string;
    category: string;
    ageGroup: string;
    durationMs: number;
  } | null;
  competitionName: string | null;
  competitionDay?: string;
  isActive: boolean;
  serverTime?: string;
}

interface TabulatorRoutine {
  id: string;
  entryNumber: number;
  routineName: string;
  studioName: string;
  category: string;
  ageGroup: string;
  judges: Array<{
    judgeName: string;
    judgeNumber: number | null;
    score: number;
  }>;
  averageScore: number;
  awardLevel: string;
  scoredAt: string;
}

export default function GameDayTestPage() {
  const [competitionId, setCompetitionId] = useState<string>('');
  const [backstageData, setBackstageData] = useState<BackstageData | null>(null);
  const [tabulatorData, setTabulatorData] = useState<TabulatorRoutine[]>([]);
  const [refreshCount, setRefreshCount] = useState(0);
  const [autoRefresh, setAutoRefresh] = useState(true);

  // Get competitions list
  const { data: competitions } = trpc.competition.getAll.useQuery();

  // Fetch backstage data
  useEffect(() => {
    if (!competitionId) return;

    const fetchBackstage = async () => {
      try {
        const response = await fetch(`/api/backstage?competitionId=${competitionId}`);
        const data = await response.json();
        setBackstageData(data);
      } catch (error) {
        console.error('Backstage fetch error:', error);
      }
    };

    fetchBackstage();

    if (autoRefresh) {
      const interval = setInterval(() => {
        fetchBackstage();
        setRefreshCount(c => c + 1);
      }, 2000);
      return () => clearInterval(interval);
    }
  }, [competitionId, autoRefresh]);

  // Fetch tabulator data
  useEffect(() => {
    if (!competitionId) return;

    const fetchTabulator = async () => {
      try {
        const response = await fetch(`/api/tabulator/scored-routines?competitionId=${competitionId}`);
        const data = await response.json();
        setTabulatorData(data.routines || []);
      } catch (error) {
        console.error('Tabulator fetch error:', error);
      }
    };

    fetchTabulator();

    if (autoRefresh) {
      const interval = setInterval(fetchTabulator, 2000);
      return () => clearInterval(interval);
    }
  }, [competitionId, autoRefresh]);

  return (
    <div className="min-h-screen bg-gray-900 text-white p-4">
      <div className="max-w-[1920px] mx-auto">
        {/* Header */}
        <div className="bg-gray-800 rounded-lg p-4 mb-4">
          <h1 className="text-2xl font-bold mb-4">🎮 Game Day Multi-View Test</h1>

          <div className="flex flex-wrap gap-4 items-center">
            <div>
              <label className="block text-sm text-gray-400 mb-1">Competition</label>
              <select
                value={competitionId}
                onChange={(e) => setCompetitionId(e.target.value)}
                className="bg-gray-700 border border-gray-600 rounded px-3 py-2 text-white min-w-[300px]"
              >
                <option value="">Select Competition...</option>
                {competitions?.competitions?.map((comp) => (
                  <option key={comp.id} value={comp.id}>
                    {comp.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="autoRefresh"
                checked={autoRefresh}
                onChange={(e) => setAutoRefresh(e.target.checked)}
                className="w-4 h-4"
              />
              <label htmlFor="autoRefresh" className="text-sm">Auto-refresh (2s)</label>
            </div>

            <div className="text-sm text-gray-400">
              Refreshes: {refreshCount}
            </div>

            <a
              href={`/judge?competitionId=${competitionId}`}
              target="_blank"
              className="bg-blue-600 hover:bg-blue-700 px-4 py-2 rounded text-sm"
            >
              Open Judge Panel →
            </a>
          </div>
        </div>

        {/* Three Column Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {/* Backstage View */}
          <div className="bg-black rounded-lg overflow-hidden">
            <div className="bg-purple-900 px-4 py-2 font-bold">
              📺 BACKSTAGE VIEW
            </div>
            <div className="p-4">
              {!backstageData ? (
                <div className="text-gray-500 text-center py-8">
                  Select a competition...
                </div>
              ) : !backstageData.isActive ? (
                <div className="text-yellow-500 text-center py-8">
                  Competition not active
                </div>
              ) : (
                <div className="space-y-4">
                  {/* Current Routine */}
                  <div>
                    <div className="text-xs text-gray-500 uppercase mb-1">NOW PERFORMING</div>
                    {backstageData.currentRoutine ? (
                      <div className="bg-green-900/50 border border-green-700 rounded p-3">
                        <div className="text-2xl font-bold text-green-400">
                          #{backstageData.currentRoutine.entryNumber}
                        </div>
                        <div className="text-xl font-semibold">
                          {backstageData.currentRoutine.routineName}
                        </div>
                        <div className="text-gray-400">
                          {backstageData.currentRoutine.studioName}
                        </div>
                        <div className="text-sm text-gray-500">
                          {backstageData.currentRoutine.category} • {backstageData.currentRoutine.ageGroup}
                        </div>
                        <div className="text-xs text-gray-600 mt-2">
                          State: {backstageData.currentRoutine.state || 'performing'}
                        </div>
                      </div>
                    ) : (
                      <div className="text-gray-600 italic">No routine performing</div>
                    )}
                  </div>

                  {/* Next Routine */}
                  <div>
                    <div className="text-xs text-gray-500 uppercase mb-1">UP NEXT</div>
                    {backstageData.nextRoutine ? (
                      <div className="bg-gray-800 border border-gray-700 rounded p-3">
                        <div className="text-lg font-bold text-yellow-400">
                          #{backstageData.nextRoutine.entryNumber}
                        </div>
                        <div className="font-semibold">
                          {backstageData.nextRoutine.routineName}
                        </div>
                        <div className="text-sm text-gray-400">
                          {backstageData.nextRoutine.studioName}
                        </div>
                      </div>
                    ) : (
                      <div className="text-gray-600 italic">No more routines</div>
                    )}
                  </div>

                  {/* Server Time */}
                  {backstageData.serverTime && (
                    <div className="text-xs text-gray-600 text-center">
                      Server: {new Date(backstageData.serverTime).toLocaleTimeString()}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Judge Summary View */}
          <div className="bg-gray-800 rounded-lg overflow-hidden">
            <div className="bg-blue-900 px-4 py-2 font-bold">
              ⚖️ JUDGE SCORES (Recent)
            </div>
            <div className="p-4">
              {tabulatorData.length === 0 ? (
                <div className="text-gray-500 text-center py-8">
                  No scores yet...
                </div>
              ) : (
                <div className="space-y-2 max-h-[400px] overflow-y-auto">
                  {tabulatorData.slice(-10).reverse().map((routine) => (
                    <div
                      key={routine.id}
                      className="bg-gray-700 rounded p-2 text-sm"
                    >
                      <div className="flex justify-between items-start">
                        <div>
                          <span className="text-blue-400">#{routine.entryNumber}</span>
                          <span className="ml-2">{routine.routineName}</span>
                        </div>
                        <div className="text-right">
                          <div className="text-lg font-bold text-green-400">
                            {routine.averageScore.toFixed(2)}
                          </div>
                          <div className="text-xs text-yellow-400">
                            {routine.awardLevel}
                          </div>
                        </div>
                      </div>
                      <div className="text-xs text-gray-500 mt-1">
                        {routine.judges.map((j, i) => (
                          <span key={i} className="mr-2">
                            J{j.judgeNumber || i + 1}: {j.score.toFixed(2)}
                          </span>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Tabulator Full View */}
          <div className="bg-gray-800 rounded-lg overflow-hidden">
            <div className="bg-orange-900 px-4 py-2 font-bold">
              📊 TABULATOR VIEW
            </div>
            <div className="p-4">
              {tabulatorData.length === 0 ? (
                <div className="text-gray-500 text-center py-8">
                  No scored routines...
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="text-left text-gray-400 border-b border-gray-700">
                        <th className="pb-2">#</th>
                        <th className="pb-2">Routine</th>
                        <th className="pb-2 text-right">Avg</th>
                        <th className="pb-2 text-right">Award</th>
                      </tr>
                    </thead>
                    <tbody>
                      {tabulatorData.map((routine) => (
                        <tr key={routine.id} className="border-b border-gray-700/50">
                          <td className="py-1 text-blue-400">{routine.entryNumber}</td>
                          <td className="py-1">
                            <div className="truncate max-w-[150px]" title={routine.routineName}>
                              {routine.routineName}
                            </div>
                            <div className="text-xs text-gray-500 truncate max-w-[150px]">
                              {routine.studioName}
                            </div>
                          </td>
                          <td className="py-1 text-right font-mono text-green-400">
                            {routine.averageScore.toFixed(2)}
                          </td>
                          <td className="py-1 text-right">
                            <span className={`text-xs px-1 rounded ${
                              routine.awardLevel === 'Platinum' ? 'bg-purple-900 text-purple-300' :
                              routine.awardLevel === 'High Gold' ? 'bg-yellow-900 text-yellow-300' :
                              routine.awardLevel === 'Gold' ? 'bg-yellow-800 text-yellow-200' :
                              'bg-gray-700 text-gray-300'
                            }`}>
                              {routine.awardLevel}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  <div className="text-xs text-gray-600 mt-2 text-center">
                    Total: {tabulatorData.length} scored routines
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Test Instructions */}
        <div className="bg-gray-800 rounded-lg p-4 mt-4 text-sm">
          <h2 className="font-bold mb-2">🧪 Testing Instructions</h2>
          <ol className="list-decimal list-inside space-y-1 text-gray-400">
            <li>Select a competition with an active live state</li>
            <li>Open the Judge Panel in a new tab (or use Playwright to control it)</li>
            <li>Start the competition and advance to a routine</li>
            <li>Submit a score from the judge panel</li>
            <li>Watch all 3 views update automatically (2s refresh)</li>
            <li>Verify: Backstage shows current routine, Tabulator shows score</li>
          </ol>
        </div>
      </div>
    </div>
  );
}
