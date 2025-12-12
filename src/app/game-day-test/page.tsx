'use client';

import { useState, useEffect, useCallback } from 'react';
import { useSearchParams } from 'next/navigation';

/**
 * Game Day Automated Testing Page
 *
 * Designed for Playwright automated testing with:
 * - URL params: ?competitionId=xxx
 * - data-testid attributes on all key elements
 * - Manual refresh control (no auto-refresh)
 * - Test score submission form
 * - Clear verification points
 *
 * Test Flow:
 * 1. Navigate to /game-day-test?competitionId=xxx
 * 2. Click "Refresh All" to load current state
 * 3. Submit a test score via the form
 * 4. Click "Refresh All" again
 * 5. Verify score appears in Tabulator view
 */

interface BackstageData {
  currentRoutine: {
    id: string;
    entryNumber: string;
    routineName: string;
    studioName: string;
    category: string;
    ageGroup: string;
    state: string | null;
  } | null;
  nextRoutine: {
    id: string;
    entryNumber: string;
    routineName: string;
    studioName: string;
  } | null;
  competitionName: string | null;
  competitionDay?: string;
  isActive: boolean;
}

interface TabulatorRoutine {
  id: string;
  entryNumber: number;
  routineName: string;
  studioName: string;
  averageScore: number;
  awardLevel: string;
  judges: Array<{ judgeNumber: number | null; score: number }>;
}

interface EntryForScoring {
  id: string;
  entry_number: string;
  routine_name: string;
  studio_name: string;
}

export default function GameDayTestPage() {
  const searchParams = useSearchParams();
  const competitionIdFromUrl = searchParams.get('competitionId') || '';

  const [competitionId, setCompetitionId] = useState(competitionIdFromUrl);
  const [backstageData, setBackstageData] = useState<BackstageData | null>(null);
  const [tabulatorData, setTabulatorData] = useState<TabulatorRoutine[]>([]);
  const [entries, setEntries] = useState<EntryForScoring[]>([]);
  const [lastRefresh, setLastRefresh] = useState<string>('Never');
  const [isLoading, setIsLoading] = useState(false);

  // Score submission form state
  const [selectedEntryId, setSelectedEntryId] = useState('');
  const [scoreValue, setScoreValue] = useState('85.00');
  const [judgeNumber, setJudgeNumber] = useState('1');
  const [submitStatus, setSubmitStatus] = useState<string>('');

  // Update competitionId when URL changes
  useEffect(() => {
    if (competitionIdFromUrl) {
      setCompetitionId(competitionIdFromUrl);
    }
  }, [competitionIdFromUrl]);

  // Fetch all data
  const refreshAll = useCallback(async () => {
    if (!competitionId) return;

    setIsLoading(true);

    try {
      // Fetch backstage
      const backstageRes = await fetch(`/api/backstage?competitionId=${competitionId}`);
      const backstageJson = await backstageRes.json();
      setBackstageData(backstageJson);

      // Fetch tabulator
      const tabulatorRes = await fetch(`/api/tabulator/scored-routines?competitionId=${competitionId}`);
      const tabulatorJson = await tabulatorRes.json();
      setTabulatorData(tabulatorJson.routines || []);

      // Fetch entries for scoring dropdown
      const entriesRes = await fetch(`/api/test/get-entries?competitionId=${competitionId}`);
      if (entriesRes.ok) {
        const entriesJson = await entriesRes.json();
        setEntries(entriesJson.entries || []);
      }

      setLastRefresh(new Date().toLocaleTimeString());
    } catch (error) {
      console.error('Refresh error:', error);
    } finally {
      setIsLoading(false);
    }
  }, [competitionId]);

  // Submit test score
  const submitScore = async () => {
    if (!selectedEntryId || !competitionId) {
      setSubmitStatus('Error: Select an entry first');
      return;
    }

    setSubmitStatus('Submitting...');

    try {
      const response = await fetch('/api/test/submit-score', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          competitionId,
          entryId: selectedEntryId,
          judgeNumber: parseInt(judgeNumber),
          score: parseFloat(scoreValue),
        }),
      });

      const result = await response.json();

      if (response.ok) {
        setSubmitStatus(`✅ ${result.message}`);
      } else {
        setSubmitStatus(`❌ ${result.error}`);
      }
    } catch (error) {
      setSubmitStatus(`❌ Error: ${String(error)}`);
    }
  };

  return (
    <div className="min-h-screen bg-gray-900 text-white p-4" data-testid="game-day-test-page">
      {/* Header Controls */}
      <div className="bg-gray-800 rounded-lg p-4 mb-4" data-testid="controls-panel">
        <h1 className="text-xl font-bold mb-4">🧪 Game Day Automated Test Page</h1>

        <div className="flex flex-wrap gap-4 items-end">
          {/* Competition ID Input */}
          <div>
            <label className="block text-sm text-gray-400 mb-1">Competition ID</label>
            <input
              type="text"
              value={competitionId}
              onChange={(e) => setCompetitionId(e.target.value)}
              placeholder="Enter competition UUID"
              className="bg-gray-700 border border-gray-600 rounded px-3 py-2 text-white w-80"
              data-testid="competition-id-input"
            />
          </div>

          {/* Refresh Button */}
          <button
            onClick={refreshAll}
            disabled={!competitionId || isLoading}
            className="bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 px-4 py-2 rounded font-medium"
            data-testid="refresh-button"
          >
            {isLoading ? 'Loading...' : '🔄 Refresh All'}
          </button>

          {/* Last Refresh Time */}
          <div className="text-sm text-gray-400" data-testid="last-refresh">
            Last refresh: <span data-testid="last-refresh-time">{lastRefresh}</span>
          </div>
        </div>
      </div>

      {/* Score Submission Form */}
      <div className="bg-gray-800 rounded-lg p-4 mb-4" data-testid="score-form-panel">
        <h2 className="font-bold mb-3">📝 Submit Test Score</h2>

        <div className="flex flex-wrap gap-4 items-end">
          {/* Entry Selector */}
          <div>
            <label className="block text-sm text-gray-400 mb-1">Entry</label>
            <select
              value={selectedEntryId}
              onChange={(e) => setSelectedEntryId(e.target.value)}
              className="bg-gray-700 border border-gray-600 rounded px-3 py-2 text-white min-w-[300px]"
              data-testid="entry-select"
            >
              <option value="">Select entry...</option>
              {entries.map((entry) => (
                <option key={entry.id} value={entry.id}>
                  #{entry.entry_number} - {entry.routine_name} ({entry.studio_name})
                </option>
              ))}
            </select>
          </div>

          {/* Judge Number */}
          <div>
            <label className="block text-sm text-gray-400 mb-1">Judge #</label>
            <select
              value={judgeNumber}
              onChange={(e) => setJudgeNumber(e.target.value)}
              className="bg-gray-700 border border-gray-600 rounded px-3 py-2 text-white"
              data-testid="judge-select"
            >
              <option value="1">Judge 1</option>
              <option value="2">Judge 2</option>
              <option value="3">Judge 3</option>
            </select>
          </div>

          {/* Score Input */}
          <div>
            <label className="block text-sm text-gray-400 mb-1">Score (0-99.99)</label>
            <input
              type="number"
              value={scoreValue}
              onChange={(e) => setScoreValue(e.target.value)}
              min="0"
              max="99.99"
              step="0.01"
              className="bg-gray-700 border border-gray-600 rounded px-3 py-2 text-white w-24"
              data-testid="score-input"
            />
          </div>

          {/* Submit Button */}
          <button
            onClick={submitScore}
            disabled={!selectedEntryId}
            className="bg-green-600 hover:bg-green-700 disabled:bg-gray-600 px-4 py-2 rounded font-medium"
            data-testid="submit-score-button"
          >
            Submit Score
          </button>

          {/* Status */}
          <div
            className="text-sm px-3 py-2"
            data-testid="submit-status"
          >
            {submitStatus}
          </div>
        </div>
      </div>

      {/* Three Column Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Backstage View */}
        <div className="bg-black rounded-lg overflow-hidden" data-testid="backstage-panel">
          <div className="bg-purple-900 px-4 py-2 font-bold">📺 BACKSTAGE</div>
          <div className="p-4">
            <div data-testid="backstage-status">
              {!backstageData ? (
                <span className="text-gray-500">No data - click Refresh</span>
              ) : !backstageData.isActive ? (
                <span className="text-yellow-500">Competition not active</span>
              ) : (
                <span className="text-green-500">Active</span>
              )}
            </div>

            {backstageData?.currentRoutine && (
              <div className="mt-3 bg-green-900/50 border border-green-700 rounded p-3" data-testid="current-routine">
                <div className="text-xs text-gray-400">NOW PERFORMING</div>
                <div
                  className="text-2xl font-bold text-green-400"
                  data-testid="current-entry-number"
                >
                  #{backstageData.currentRoutine.entryNumber}
                </div>
                <div data-testid="current-routine-name">
                  {backstageData.currentRoutine.routineName}
                </div>
                <div className="text-sm text-gray-400" data-testid="current-studio-name">
                  {backstageData.currentRoutine.studioName}
                </div>
              </div>
            )}

            {backstageData?.nextRoutine && (
              <div className="mt-3 bg-gray-800 border border-gray-700 rounded p-3" data-testid="next-routine">
                <div className="text-xs text-gray-400">UP NEXT</div>
                <div className="font-bold text-yellow-400" data-testid="next-entry-number">
                  #{backstageData.nextRoutine.entryNumber}
                </div>
                <div data-testid="next-routine-name">
                  {backstageData.nextRoutine.routineName}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Score Summary */}
        <div className="bg-gray-800 rounded-lg overflow-hidden" data-testid="scores-panel">
          <div className="bg-blue-900 px-4 py-2 font-bold">⚖️ RECENT SCORES</div>
          <div className="p-4">
            <div data-testid="scores-count" className="text-sm text-gray-400 mb-2">
              Total scored: {tabulatorData.length}
            </div>

            <div className="space-y-2 max-h-[350px] overflow-y-auto">
              {tabulatorData.slice(-8).reverse().map((routine, idx) => (
                <div
                  key={routine.id}
                  className="bg-gray-700 rounded p-2 text-sm"
                  data-testid={`score-row-${idx}`}
                >
                  <div className="flex justify-between">
                    <span data-testid={`score-row-${idx}-entry`}>
                      #{routine.entryNumber}
                    </span>
                    <span
                      className="text-green-400 font-mono"
                      data-testid={`score-row-${idx}-avg`}
                    >
                      {routine.averageScore.toFixed(2)}
                    </span>
                  </div>
                  <div className="text-xs text-gray-500">
                    {routine.judges.map((j, i) => (
                      <span key={i} className="mr-2" data-testid={`score-row-${idx}-judge-${i}`}>
                        J{j.judgeNumber || i + 1}:{j.score.toFixed(2)}
                      </span>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Tabulator Full View */}
        <div className="bg-gray-800 rounded-lg overflow-hidden" data-testid="tabulator-panel">
          <div className="bg-orange-900 px-4 py-2 font-bold">📊 TABULATOR</div>
          <div className="p-4">
            <table className="w-full text-sm" data-testid="tabulator-table">
              <thead>
                <tr className="text-left text-gray-400 border-b border-gray-700">
                  <th className="pb-2">#</th>
                  <th className="pb-2">Routine</th>
                  <th className="pb-2 text-right">Avg</th>
                  <th className="pb-2 text-right">Award</th>
                </tr>
              </thead>
              <tbody data-testid="tabulator-body">
                {tabulatorData.map((routine, idx) => (
                  <tr
                    key={routine.id}
                    className="border-b border-gray-700/50"
                    data-testid={`tabulator-row-${routine.entryNumber}`}
                  >
                    <td className="py-1 text-blue-400">{routine.entryNumber}</td>
                    <td className="py-1 truncate max-w-[120px]">{routine.routineName}</td>
                    <td
                      className="py-1 text-right font-mono text-green-400"
                      data-testid={`tabulator-avg-${routine.entryNumber}`}
                    >
                      {routine.averageScore.toFixed(2)}
                    </td>
                    <td className="py-1 text-right text-xs">
                      <span
                        className={`px-1 rounded ${
                          routine.awardLevel === 'Platinum' ? 'bg-purple-900 text-purple-300' :
                          routine.awardLevel === 'High Gold' ? 'bg-yellow-900 text-yellow-300' :
                          routine.awardLevel === 'Gold' ? 'bg-yellow-800 text-yellow-200' :
                          'bg-gray-700 text-gray-300'
                        }`}
                        data-testid={`tabulator-award-${routine.entryNumber}`}
                      >
                        {routine.awardLevel}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Playwright Test Instructions */}
      <div className="bg-gray-800 rounded-lg p-4 mt-4 text-xs text-gray-500" data-testid="test-instructions">
        <strong>Playwright Selectors:</strong>
        <code className="block mt-1">
          [data-testid="refresh-button"] | [data-testid="entry-select"] |
          [data-testid="score-input"] | [data-testid="submit-score-button"] |
          [data-testid="tabulator-avg-X"] | [data-testid="scores-count"]
        </code>
      </div>
    </div>
  );
}
