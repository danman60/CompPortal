'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';

/**
 * Game Day Comprehensive Test Page
 *
 * Full-fidelity replicas of all 3 Game Day views for Playwright automation:
 * 1. BACKSTAGE - Timer countdown, progress bar, current/next routine
 * 2. JUDGE - Score input (XX.XX), award level, comments, break requests
 * 3. TABULATOR - Full table with judge scores, averages, awards
 *
 * Test Flow:
 * 1. Navigate to /game-day-test?competitionId=xxx
 * 2. Click "Refresh All" to load current state
 * 3. Use Judge panel to submit a test score
 * 4. Click "Refresh All" to see score in Tabulator
 * 5. Use "Advance Routine" to move to next entry
 */

// Default test competition for tester environment
const DEFAULT_TEST_COMPETITION_ID = '1b786221-8f8e-413f-b532-06fa20a2ff63';

// Default award levels (fallback if API fails)
const DEFAULT_AWARD_LEVELS = [
  { name: 'Dynamic Diamond', min: 95.0, max: 99.99, color: '#00D4FF' },
  { name: 'Titanium', min: 92.0, max: 94.99, color: '#C0C0C0' },
  { name: 'Platinum', min: 88.0, max: 91.99, color: '#E5E4E2' },
  { name: 'Afterglow', min: 85.0, max: 87.99, color: '#FFD700' },
  { name: 'High Gold', min: 82.0, max: 84.99, color: '#DAA520' },
  { name: 'Gold', min: 78.0, max: 81.99, color: '#FFD700' },
  { name: 'Silver', min: 72.0, max: 77.99, color: '#C0C0C0' },
  { name: 'Bronze', min: 65.0, max: 71.99, color: '#CD7F32' },
  { name: 'Participation', min: 0, max: 64.99, color: '#808080' },
];

interface AwardLevel {
  name: string;
  min: number;
  max: number;
  color: string;
}

// Helper to get Tailwind classes based on award color
function getAwardClasses(color: string): { bg: string; text: string } {
  const colorMap: Record<string, { bg: string; text: string }> = {
    '#00D4FF': { bg: 'bg-cyan-100', text: 'text-cyan-800' },
    '#C0C0C0': { bg: 'bg-gray-200', text: 'text-gray-700' },
    '#A0A0A0': { bg: 'bg-gray-200', text: 'text-gray-700' },
    '#E5E4E2': { bg: 'bg-slate-200', text: 'text-slate-800' },
    '#FFD700': { bg: 'bg-yellow-200', text: 'text-yellow-800' },
    '#DAA520': { bg: 'bg-yellow-100', text: 'text-yellow-700' },
    '#CD7F32': { bg: 'bg-orange-100', text: 'text-orange-700' },
    '#808080': { bg: 'bg-gray-100', text: 'text-gray-600' },
  };
  return colorMap[color] || { bg: 'bg-gray-100', text: 'text-gray-700' };
}

// Get award level for a given score
function getAwardLevel(score: number, levels: AwardLevel[] = DEFAULT_AWARD_LEVELS): AwardLevel | null {
  for (const level of levels) {
    if (score >= level.min && score <= level.max) {
      return level;
    }
  }
  return null;
}

function formatTime(ms: number): string {
  const totalSeconds = Math.floor(ms / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${seconds.toString().padStart(2, '0')}`;
}

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
  averageScore: number;
  awardLevel: string;
  judges: Array<{ judgeName: string; judgeNumber: number | null; score: number }>;
  scoredAt: string;
}

interface EntryForScoring {
  id: string;
  entry_number: string;
  routine_name: string;
  studio_name: string;
}

export default function GameDayTestPage() {
  const searchParams = useSearchParams();
  const competitionIdFromUrl = searchParams.get('competitionId') || DEFAULT_TEST_COMPETITION_ID;

  const [competitionId, setCompetitionId] = useState(competitionIdFromUrl);
  const [backstageData, setBackstageData] = useState<BackstageData | null>(null);
  const [tabulatorData, setTabulatorData] = useState<TabulatorRoutine[]>([]);
  const [entries, setEntries] = useState<EntryForScoring[]>([]);
  const [lastRefresh, setLastRefresh] = useState<string>('Never');
  const [isLoading, setIsLoading] = useState(false);

  // Timer state for backstage
  const [elapsedMs, setElapsedMs] = useState(0);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // Judge panel state
  const [selectedEntryId, setSelectedEntryId] = useState('');
  const [scoreValue, setScoreValue] = useState('85.00');
  const [judgeNumber, setJudgeNumber] = useState('1');
  const [judgeComments, setJudgeComments] = useState('');
  const [specialAwards, setSpecialAwards] = useState('');
  const [submitStatus, setSubmitStatus] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Tabulator filter
  const [searchFilter, setSearchFilter] = useState('');

  // Dynamic award levels (fetched from competition settings)
  const [awardLevels, setAwardLevels] = useState<AwardLevel[]>(DEFAULT_AWARD_LEVELS);

  // Update competitionId when URL changes
  useEffect(() => {
    if (competitionIdFromUrl) {
      setCompetitionId(competitionIdFromUrl);
    }
  }, [competitionIdFromUrl]);

  // Timer effect for backstage countdown
  useEffect(() => {
    if (backstageData?.currentRoutine?.startedAt) {
      const startTime = new Date(backstageData.currentRoutine.startedAt).getTime();

      const updateTimer = () => {
        const now = Date.now();
        setElapsedMs(now - startTime);
      };

      updateTimer();
      timerRef.current = setInterval(updateTimer, 100);

      return () => {
        if (timerRef.current) clearInterval(timerRef.current);
      };
    } else {
      setElapsedMs(0);
    }
  }, [backstageData?.currentRoutine?.startedAt]);

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

      // Fetch award levels from competition settings
      const awardLevelsRes = await fetch(`/api/test/get-award-levels?competitionId=${competitionId}`);
      if (awardLevelsRes.ok) {
        const awardLevelsJson = await awardLevelsRes.json();
        if (awardLevelsJson.levels && awardLevelsJson.levels.length > 0) {
          setAwardLevels(awardLevelsJson.levels);
        }
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

    setIsSubmitting(true);
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
        setSubmitStatus(`Score ${parseFloat(scoreValue).toFixed(2)} submitted for Judge ${judgeNumber}`);
      } else {
        setSubmitStatus(`Error: ${result.error}`);
      }
    } catch (error) {
      setSubmitStatus(`Error: ${String(error)}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Get award level for current score input (uses dynamic levels)
  const currentScore = parseFloat(scoreValue) || 0;
  const rawAward = getAwardLevel(currentScore, awardLevels);
  const currentAward = rawAward
    ? { ...rawAward, ...getAwardClasses(rawAward.color) }
    : { name: 'N/A', min: 0, max: 0, color: '#808080', bg: 'bg-gray-100', text: 'text-gray-600' };

  // Filter tabulator data
  const filteredTabulatorData = tabulatorData.filter(r => {
    if (!searchFilter) return true;
    const search = searchFilter.toLowerCase();
    return (
      r.routineName?.toLowerCase().includes(search) ||
      r.studioName?.toLowerCase().includes(search) ||
      r.entryNumber.toString().includes(search)
    );
  });

  // Calculate backstage progress
  const durationMs = backstageData?.currentRoutine?.durationMs || 180000;
  const remainingMs = Math.max(0, durationMs - elapsedMs);
  const progressPercent = Math.min(100, (elapsedMs / durationMs) * 100);
  const isLowTime = remainingMs < 30000;

  return (
    <div className="min-h-screen bg-gray-950 text-white" data-testid="game-day-test-page">
      {/* Control Bar */}
      <div className="bg-gray-900 border-b border-gray-700 p-3" data-testid="controls-panel">
        <div className="flex flex-wrap gap-3 items-center">
          <span className="text-sm font-bold text-yellow-400">TEST PAGE</span>

          <input
            type="text"
            value={competitionId}
            onChange={(e) => setCompetitionId(e.target.value)}
            placeholder="Competition UUID"
            className="bg-gray-800 border border-gray-600 rounded px-2 py-1 text-sm text-white w-72"
            data-testid="competition-id-input"
          />

          <button
            onClick={refreshAll}
            disabled={!competitionId || isLoading}
            className="bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 px-3 py-1 rounded text-sm font-medium"
            data-testid="refresh-button"
          >
            {isLoading ? 'Loading...' : 'Refresh All'}
          </button>

          <span className="text-xs text-gray-400" data-testid="last-refresh">
            Last: <span data-testid="last-refresh-time">{lastRefresh}</span>
          </span>

          <span className="text-xs text-gray-500 ml-auto">
            Scored: {tabulatorData.length} | Entries: {entries.length}
          </span>
        </div>
      </div>

      {/* Navigation Links to Individual Views */}
      <div className="bg-gray-800 border-b border-gray-700 px-3 py-2" data-testid="view-nav">
        <div className="flex items-center gap-2 text-xs">
          <span className="text-gray-500 mr-2">Open Full Views:</span>
          <Link
            href={`/backstage${competitionId ? `?competitionId=${competitionId}` : ''}`}
            target="_blank"
            className="px-2 py-1 bg-purple-700 hover:bg-purple-600 rounded text-white"
            data-testid="nav-backstage"
          >
            Backstage
          </Link>
          <Link
            href={`/judge${competitionId ? `?competitionId=${competitionId}` : ''}`}
            target="_blank"
            className="px-2 py-1 bg-green-700 hover:bg-green-600 rounded text-white"
            data-testid="nav-judge"
          >
            Judge
          </Link>
          <Link
            href={`/tabulator${competitionId ? `?competitionId=${competitionId}` : ''}`}
            target="_blank"
            className="px-2 py-1 bg-orange-600 hover:bg-orange-500 rounded text-white"
            data-testid="nav-tabulator"
          >
            Tabulator
          </Link>
          <Link
            href={`/scoreboard${competitionId ? `/${competitionId}` : ''}`}
            target="_blank"
            className="px-2 py-1 bg-blue-700 hover:bg-blue-600 rounded text-white"
            data-testid="nav-scoreboard"
          >
            Scoreboard
          </Link>
        </div>
      </div>

      {/* Three Column Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-0 h-[calc(100vh-56px)]">

        {/* ========== BACKSTAGE PANEL ========== */}
        <div className="bg-black border-r border-gray-800 flex flex-col" data-testid="backstage-panel">
          <div className="bg-purple-900/50 px-3 py-2 border-b border-purple-700">
            <span className="font-bold text-purple-300">BACKSTAGE MONITOR</span>
            {backstageData?.competitionName && (
              <span className="text-xs text-purple-400 ml-2">{backstageData.competitionName}</span>
            )}
          </div>

          <div className="flex-1 flex flex-col items-center justify-center p-4" data-testid="backstage-content">
            {!backstageData ? (
              <span className="text-gray-500" data-testid="backstage-status">Click Refresh to load</span>
            ) : !backstageData.isActive ? (
              <span className="text-yellow-500" data-testid="backstage-status">Competition not active</span>
            ) : backstageData.currentRoutine ? (
              <div className="w-full text-center" data-testid="current-routine">
                <div className="text-blue-400 text-xs mb-1">NOW PERFORMING</div>
                <div className="text-5xl font-bold text-white mb-2" data-testid="current-entry-number">
                  #{backstageData.currentRoutine.entryNumber}
                </div>
                <div className="text-3xl font-semibold text-white mb-1" data-testid="current-routine-name">
                  {backstageData.currentRoutine.routineName}
                </div>
                <div className="text-xl text-gray-300 mb-1" data-testid="current-studio-name">
                  {backstageData.currentRoutine.studioName}
                </div>
                <div className="text-sm text-gray-400 mb-4" data-testid="current-category">
                  {backstageData.currentRoutine.category} | {backstageData.currentRoutine.ageGroup}
                </div>

                {/* Progress Bar */}
                <div className="w-full bg-gray-800 rounded-full h-3 mb-2" data-testid="progress-bar">
                  <div
                    className={`h-3 rounded-full transition-all ${isLowTime ? 'bg-red-500' : 'bg-blue-500'}`}
                    style={{ width: `${progressPercent}%` }}
                    data-testid="progress-fill"
                  />
                </div>

                {/* Timer */}
                <div
                  className={`text-6xl font-mono font-bold ${isLowTime ? 'text-red-500 animate-pulse' : 'text-white'}`}
                  data-testid="time-remaining"
                >
                  {formatTime(remainingMs)}
                </div>
                <div className="text-sm text-gray-500" data-testid="time-total">
                  of {formatTime(durationMs)}
                </div>
              </div>
            ) : (
              <span className="text-gray-500" data-testid="backstage-status">No routine performing</span>
            )}
          </div>

          {/* Next Up Section */}
          {backstageData?.nextRoutine && (
            <div className="bg-gray-900/50 border-t border-gray-700 p-3" data-testid="next-routine">
              <div className="text-xs text-gray-500 mb-1">UP NEXT</div>
              <div className="flex items-center gap-2">
                <span className="text-yellow-400 font-bold" data-testid="next-entry-number">
                  #{backstageData.nextRoutine.entryNumber}
                </span>
                <span className="text-white" data-testid="next-routine-name">
                  {backstageData.nextRoutine.routineName}
                </span>
                <span className="text-gray-400 text-sm">
                  ({backstageData.nextRoutine.studioName})
                </span>
              </div>
            </div>
          )}
        </div>

        {/* ========== JUDGE SCORING PANEL ========== */}
        <div className="bg-gradient-to-b from-slate-900 to-black border-r border-gray-800 flex flex-col" data-testid="judge-panel">
          <div className="bg-green-900/50 px-3 py-2 border-b border-green-700 flex items-center justify-between">
            <span className="font-bold text-green-300">JUDGE SCORING</span>
            <span className="text-xs px-2 py-0.5 bg-green-600 rounded">Judge {judgeNumber}</span>
          </div>

          <div className="flex-1 p-4 space-y-4 overflow-y-auto" data-testid="judge-content">
            {/* Entry Selection */}
            <div>
              <label className="block text-xs text-gray-400 mb-1">Select Entry to Score</label>
              <select
                value={selectedEntryId}
                onChange={(e) => setSelectedEntryId(e.target.value)}
                className="w-full bg-gray-800 border border-gray-600 rounded px-3 py-2 text-white"
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
              <label className="block text-xs text-gray-400 mb-1">Judge Position</label>
              <div className="flex gap-2">
                {['1', '2', '3'].map(num => (
                  <button
                    key={num}
                    onClick={() => setJudgeNumber(num)}
                    className={`flex-1 py-2 rounded font-medium ${
                      judgeNumber === num
                        ? 'bg-green-600 text-white'
                        : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                    }`}
                    data-testid={`judge-btn-${num}`}
                  >
                    Judge {num}
                  </button>
                ))}
              </div>
            </div>

            {/* Score Input - Large */}
            <div className="bg-gray-800/50 rounded-lg p-4 border border-gray-700">
              <label className="block text-xs text-gray-400 mb-2">Score (XX.XX)</label>
              <input
                type="number"
                value={scoreValue}
                onChange={(e) => setScoreValue(e.target.value)}
                min="0"
                max="99.99"
                step="0.01"
                className="w-full bg-gray-900 border-2 rounded-lg px-4 py-3 text-center font-mono text-4xl"
                style={{
                  borderColor: currentAward.color,
                  color: currentAward.color
                }}
                data-testid="score-input"
              />

              {/* Score Slider */}
              <input
                type="range"
                value={parseFloat(scoreValue) || 0}
                onChange={(e) => setScoreValue(parseFloat(e.target.value).toFixed(2))}
                min="0"
                max="99.99"
                step="0.5"
                className="w-full mt-3"
                data-testid="score-slider"
              />

              {/* Award Level Display */}
              <div
                className={`mt-3 text-center py-2 rounded-lg font-bold ${currentAward.bg} ${currentAward.text}`}
                data-testid="award-level-display"
              >
                {currentAward.name}
              </div>
            </div>

            {/* Comments */}
            <div>
              <label className="block text-xs text-gray-400 mb-1">Comments (Optional)</label>
              <textarea
                value={judgeComments}
                onChange={(e) => setJudgeComments(e.target.value)}
                placeholder="Performance notes..."
                className="w-full bg-gray-800 border border-gray-600 rounded px-3 py-2 text-white text-sm h-16 resize-none"
                data-testid="judge-comments"
              />
            </div>

            {/* Special Awards */}
            <div>
              <label className="block text-xs text-gray-400 mb-1">Special Awards (Optional)</label>
              <input
                type="text"
                value={specialAwards}
                onChange={(e) => setSpecialAwards(e.target.value)}
                placeholder="e.g., Best Choreography..."
                className="w-full bg-gray-800 border border-gray-600 rounded px-3 py-2 text-white text-sm"
                data-testid="special-awards"
              />
            </div>

            {/* Submit Button */}
            <button
              onClick={submitScore}
              disabled={!selectedEntryId || isSubmitting}
              className="w-full bg-green-600 hover:bg-green-700 disabled:bg-gray-600 py-3 rounded-lg font-bold text-lg"
              data-testid="submit-score-button"
            >
              {isSubmitting ? 'Submitting...' : 'SUBMIT SCORE'}
            </button>

            {/* Status */}
            {submitStatus && (
              <div
                className={`text-center py-2 rounded ${submitStatus.includes('Error') ? 'bg-red-900/50 text-red-300' : 'bg-green-900/50 text-green-300'}`}
                data-testid="submit-status"
              >
                {submitStatus}
              </div>
            )}

            {/* Award Levels Reference (Dynamic) */}
            <div className="bg-gray-800/30 rounded p-3">
              <div className="text-xs text-gray-500 mb-2">Award Levels</div>
              <div className="grid grid-cols-2 gap-1 text-xs">
                {awardLevels.map(level => (
                  <div key={level.name} className="flex justify-between">
                    <span style={{ color: level.color }}>{level.name}</span>
                    <span className="text-gray-500">{level.min}-{level.max}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* ========== TABULATOR PANEL ========== */}
        <div className="bg-gray-100 text-gray-900 flex flex-col" data-testid="tabulator-panel">
          <div className="bg-orange-600 px-3 py-2 flex items-center justify-between">
            <span className="font-bold text-white">TABULATOR</span>
            <span className="text-xs text-orange-200" data-testid="scores-count">
              {filteredTabulatorData.length} scored
            </span>
          </div>

          {/* Search */}
          <div className="p-2 bg-white border-b">
            <input
              type="text"
              value={searchFilter}
              onChange={(e) => setSearchFilter(e.target.value)}
              placeholder="Search routines..."
              className="w-full bg-gray-100 border border-gray-300 rounded px-3 py-1 text-sm"
              data-testid="tabulator-search"
            />
          </div>

          {/* Table */}
          <div className="flex-1 overflow-y-auto" data-testid="tabulator-content">
            <table className="w-full text-sm" data-testid="tabulator-table">
              <thead className="bg-gray-200 sticky top-0">
                <tr>
                  <th className="px-2 py-2 text-left font-medium">#</th>
                  <th className="px-2 py-2 text-left font-medium">Routine</th>
                  <th className="px-2 py-2 text-center font-medium">J1</th>
                  <th className="px-2 py-2 text-center font-medium">J2</th>
                  <th className="px-2 py-2 text-center font-medium">J3</th>
                  <th className="px-2 py-2 text-center font-medium">Avg</th>
                  <th className="px-2 py-2 text-center font-medium">Award</th>
                </tr>
              </thead>
              <tbody data-testid="tabulator-body">
                {filteredTabulatorData.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="text-center py-8 text-gray-500">
                      No scored routines yet
                    </td>
                  </tr>
                ) : (
                  filteredTabulatorData.map((routine) => {
                    const rawAward = getAwardLevel(routine.averageScore, awardLevels);
                    const award = rawAward
                      ? { ...rawAward, ...getAwardClasses(rawAward.color) }
                      : { name: 'N/A', min: 0, max: 0, color: '#808080', bg: 'bg-gray-100', text: 'text-gray-600' };
                    // Get scores by judge number
                    const j1 = routine.judges.find(j => j.judgeNumber === 1)?.score;
                    const j2 = routine.judges.find(j => j.judgeNumber === 2)?.score;
                    const j3 = routine.judges.find(j => j.judgeNumber === 3)?.score;

                    return (
                      <tr
                        key={routine.id}
                        className="border-b border-gray-200 hover:bg-gray-50"
                        data-testid={`tabulator-row-${routine.entryNumber}`}
                      >
                        <td className="px-2 py-2 font-mono font-semibold text-blue-600">
                          {routine.entryNumber}
                        </td>
                        <td className="px-2 py-2">
                          <div className="font-medium truncate max-w-[120px]">{routine.routineName}</div>
                          <div className="text-xs text-gray-500 truncate">{routine.studioName}</div>
                        </td>
                        <td className="px-2 py-2 text-center font-mono" data-testid={`score-j1-${routine.entryNumber}`}>
                          {j1?.toFixed(2) || '-'}
                        </td>
                        <td className="px-2 py-2 text-center font-mono" data-testid={`score-j2-${routine.entryNumber}`}>
                          {j2?.toFixed(2) || '-'}
                        </td>
                        <td className="px-2 py-2 text-center font-mono" data-testid={`score-j3-${routine.entryNumber}`}>
                          {j3?.toFixed(2) || '-'}
                        </td>
                        <td
                          className="px-2 py-2 text-center font-mono font-bold"
                          data-testid={`tabulator-avg-${routine.entryNumber}`}
                        >
                          {routine.averageScore.toFixed(2)}
                        </td>
                        <td className="px-2 py-2 text-center">
                          <span
                            className={`px-2 py-0.5 rounded text-xs font-medium ${award.bg} ${award.text}`}
                            data-testid={`tabulator-award-${routine.entryNumber}`}
                          >
                            {routine.awardLevel}
                          </span>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Playwright Selectors Reference (collapsible) */}
      <details className="fixed bottom-2 right-2 bg-gray-800 rounded text-xs p-2 max-w-md" data-testid="test-instructions">
        <summary className="cursor-pointer text-gray-400">Playwright Selectors</summary>
        <code className="block mt-1 text-gray-500 whitespace-pre-wrap">
{`[data-testid="refresh-button"]
[data-testid="entry-select"]
[data-testid="score-input"]
[data-testid="score-slider"]
[data-testid="submit-score-button"]
[data-testid="submit-status"]
[data-testid="tabulator-avg-X"]
[data-testid="score-j1-X"]
[data-testid="award-level-display"]
[data-testid="time-remaining"]
[data-testid="progress-bar"]`}
        </code>
      </details>
    </div>
  );
}
