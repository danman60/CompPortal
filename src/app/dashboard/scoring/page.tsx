'use client';

import { useState, useEffect } from 'react';
import { trpc } from '@/lib/trpc';

export default function ScoringPage() {
  const [selectedCompetition, setSelectedCompetition] = useState<string>('');
  const [selectedJudge, setSelectedJudge] = useState<string>('');
  const [currentEntry, setCurrentEntry] = useState<any>(null);
  const [scores, setScores] = useState({
    technical: 0,
    artistic: 0,
    performance: 0,
  });
  const [comments, setComments] = useState('');
  const [entryIndex, setEntryIndex] = useState(0);

  // Fetch competitions
  const { data: competitions } = trpc.competition.getAll.useQuery();

  // Fetch judges for selected competition
  const { data: judges } = trpc.judges.getByCompetition.useQuery(
    { competition_id: selectedCompetition },
    { enabled: !!selectedCompetition }
  );

  // Fetch entries for selected competition
  const { data: entriesData } = trpc.entry.getAll.useQuery(
    { competitionId: selectedCompetition },
    { enabled: !!selectedCompetition }
  );
  const entries = entriesData?.entries;

  // Submit score mutation
  const submitScore = trpc.scoring.submitScore.useMutation({
    onSuccess: () => {
      // Move to next entry
      if (entries && entryIndex < entries.length - 1) {
        setEntryIndex(entryIndex + 1);
      }
      // Reset scores
      setScores({ technical: 0, artistic: 0, performance: 0 });
      setComments('');
    },
  });

  // Update current entry when index changes
  useEffect(() => {
    if (entries && entries[entryIndex]) {
      setCurrentEntry(entries[entryIndex]);
    }
  }, [entries, entryIndex]);

  const handleScoreChange = (category: 'technical' | 'artistic' | 'performance', value: number) => {
    setScores({ ...scores, [category]: Math.max(0, Math.min(100, value)) });
  };

  const handleSubmitScore = () => {
    if (!selectedJudge || !currentEntry) return;

    submitScore.mutate({
      judge_id: selectedJudge,
      entry_id: currentEntry.id,
      technical_score: scores.technical,
      artistic_score: scores.artistic,
      performance_score: scores.performance,
      comments: comments || undefined,
    });
  };

  const totalScore = scores.technical + scores.artistic + scores.performance;
  const averageScore = totalScore / 3;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-gray-900 to-black p-4">
      <div className="max-w-6xl mx-auto">
        {/* Setup (if not configured) */}
        {(!selectedCompetition || !selectedJudge) && (
          <div className="bg-white/10 backdrop-blur-md rounded-xl border border-white/20 p-8">
            <h1 className="text-3xl font-bold text-white mb-6">Judge Scoring Setup</h1>

            <div className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Select Competition
                </label>
                <select
                  value={selectedCompetition}
                  onChange={(e) => setSelectedCompetition(e.target.value)}
                  className="w-full px-4 py-3 rounded-lg bg-white/5 border border-white/20 text-white text-lg focus:outline-none focus:ring-2 focus:ring-pink-500"
                >
                  <option value="" className="text-gray-900">-- Select a competition --</option>
                  {competitions?.competitions?.map((comp) => (
                    <option key={comp.id} value={comp.id} className="text-gray-900">
                      {comp.name} ({comp.year})
                    </option>
                  ))}
                </select>
              </div>

              {selectedCompetition && (
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Select Your Judge Profile
                  </label>
                  <select
                    value={selectedJudge}
                    onChange={(e) => setSelectedJudge(e.target.value)}
                    className="w-full px-4 py-3 rounded-lg bg-white/5 border border-white/20 text-white text-lg focus:outline-none focus:ring-2 focus:ring-pink-500"
                  >
                    <option value="" className="text-gray-900">-- Select your profile --</option>
                    {judges?.map((judge) => (
                      <option key={judge.id} value={judge.id} className="text-gray-900">
                        {judge.name} {judge.judge_number && `(Judge #${judge.judge_number})`}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {selectedCompetition && selectedJudge && (
                <button
                  onClick={() => {/* Will close setup */}}
                  className="w-full px-6 py-4 bg-gradient-to-r from-pink-500 to-purple-500 text-white text-lg font-semibold rounded-lg hover:shadow-lg transition-all duration-200"
                >
                  Start Scoring →
                </button>
              )}
            </div>
          </div>
        )}

        {/* Scoring Interface (when configured) */}
        {selectedCompetition && selectedJudge && currentEntry && (
          <div className="space-y-4">
            {/* Entry Info */}
            <div className="bg-white/10 backdrop-blur-md rounded-xl border border-white/20 p-6">
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h2 className="text-3xl font-bold text-white mb-2">
                    {currentEntry.title}
                  </h2>
                  <div className="flex gap-4 text-gray-300">
                    <span>📋 Entry #{currentEntry.entry_number}</span>
                    <span>🏢 {currentEntry.studios?.name}</span>
                    <span>🎭 {currentEntry.dance_categories?.name}</span>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-sm text-gray-400">Entry Progress</div>
                  <div className="text-2xl font-bold text-white">
                    {entryIndex + 1} / {entries?.length || 0}
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 text-sm text-gray-400">
                <div>📅 {currentEntry.age_groups?.name}</div>
                <div>⭐ {currentEntry.classifications?.name}</div>
                <div>👥 {currentEntry.entry_size_categories?.name}</div>
                <div>⏱️ {currentEntry.duration || 'N/A'}</div>
              </div>
            </div>

            {/* Score Entry */}
            <div className="space-y-6">
              {/* Technical Score */}
              <div className="bg-white/10 backdrop-blur-md rounded-xl border border-white/20 p-6">
                <div className="flex justify-between items-center mb-3">
                  <h3 className="text-lg font-semibold text-white">🔧 Technical Score</h3>
                  <div className="text-3xl font-bold text-white">{scores.technical}</div>
                </div>
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={scores.technical}
                  onChange={(e) => handleScoreChange('technical', parseInt(e.target.value))}
                  className="w-full h-3 bg-white/20 rounded-lg appearance-none cursor-pointer"
                  style={{
                    background: `linear-gradient(to right, rgb(59, 130, 246) 0%, rgb(59, 130, 246) ${scores.technical}%, rgba(255, 255, 255, 0.2) ${scores.technical}%, rgba(255, 255, 255, 0.2) 100%)`
                  }}
                />
                <div className="flex justify-between text-sm text-gray-400 mt-2">
                  <span>0</span>
                  <span>100</span>
                </div>
              </div>

              {/* Artistic Score */}
              <div className="bg-white/10 backdrop-blur-md rounded-xl border border-white/20 p-6">
                <div className="flex justify-between items-center mb-3">
                  <h3 className="text-lg font-semibold text-white">🎨 Artistic Score</h3>
                  <div className="text-3xl font-bold text-white">{scores.artistic}</div>
                </div>
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={scores.artistic}
                  onChange={(e) => handleScoreChange('artistic', parseInt(e.target.value))}
                  className="w-full h-3 bg-white/20 rounded-lg appearance-none cursor-pointer"
                  style={{
                    background: `linear-gradient(to right, rgb(168, 85, 247) 0%, rgb(168, 85, 247) ${scores.artistic}%, rgba(255, 255, 255, 0.2) ${scores.artistic}%, rgba(255, 255, 255, 0.2) 100%)`
                  }}
                />
                <div className="flex justify-between text-sm text-gray-400 mt-2">
                  <span>0</span>
                  <span>100</span>
                </div>
              </div>

              {/* Performance Score */}
              <div className="bg-white/10 backdrop-blur-md rounded-xl border border-white/20 p-6">
                <div className="flex justify-between items-center mb-3">
                  <h3 className="text-lg font-semibold text-white">⭐ Performance Score</h3>
                  <div className="text-3xl font-bold text-white">{scores.performance}</div>
                </div>
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={scores.performance}
                  onChange={(e) => handleScoreChange('performance', parseInt(e.target.value))}
                  className="w-full h-3 bg-white/20 rounded-lg appearance-none cursor-pointer"
                  style={{
                    background: `linear-gradient(to right, rgb(236, 72, 153) 0%, rgb(236, 72, 153) ${scores.performance}%, rgba(255, 255, 255, 0.2) ${scores.performance}%, rgba(255, 255, 255, 0.2) 100%)`
                  }}
                />
                <div className="flex justify-between text-sm text-gray-400 mt-2">
                  <span>0</span>
                  <span>100</span>
                </div>
              </div>
            </div>

            {/* Total Score Display */}
            <div className="bg-gradient-to-r from-pink-500/20 to-purple-500/20 backdrop-blur-md rounded-xl border border-white/20 p-6">
              <div className="grid grid-cols-2 gap-8">
                <div className="text-center">
                  <div className="text-sm text-gray-400 mb-1">Total Score</div>
                  <div className="text-5xl font-bold text-white">{totalScore.toFixed(1)}</div>
                </div>
                <div className="text-center">
                  <div className="text-sm text-gray-400 mb-1">Average Score</div>
                  <div className="text-5xl font-bold text-white">{averageScore.toFixed(1)}</div>
                </div>
              </div>
            </div>

            {/* Comments */}
            <div className="bg-white/10 backdrop-blur-md rounded-xl border border-white/20 p-6">
              <label className="block text-lg font-semibold text-white mb-3">
                📝 Judge Comments (Optional)
              </label>
              <textarea
                value={comments}
                onChange={(e) => setComments(e.target.value)}
                className="w-full px-4 py-3 rounded-lg bg-white/5 border border-white/20 text-white resize-none focus:outline-none focus:ring-2 focus:ring-pink-500"
                rows={4}
                placeholder="Enter your feedback..."
              />
            </div>

            {/* Action Buttons */}
            <div className="flex gap-4">
              <button
                onClick={() => setEntryIndex(Math.max(0, entryIndex - 1))}
                disabled={entryIndex === 0}
                className="flex-1 px-6 py-4 bg-white/10 text-white text-lg font-semibold rounded-lg hover:bg-white/20 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                ← Previous Entry
              </button>

              <button
                onClick={handleSubmitScore}
                disabled={totalScore === 0}
                className="flex-1 px-6 py-4 bg-gradient-to-r from-pink-500 to-purple-500 text-white text-lg font-semibold rounded-lg hover:shadow-lg transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Submit Score & Next →
              </button>
            </div>

            {/* Quick Navigation */}
            <div className="bg-white/10 backdrop-blur-md rounded-xl border border-white/20 p-4">
              <div className="text-sm text-gray-400 mb-2">Quick Jump to Entry:</div>
              <div className="flex flex-wrap gap-2">
                {entries?.slice(0, 20).map((entry, idx) => (
                  <button
                    key={entry.id}
                    onClick={() => setEntryIndex(idx)}
                    className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                      idx === entryIndex
                        ? 'bg-pink-500 text-white'
                        : 'bg-white/5 text-gray-300 hover:bg-white/10'
                    }`}
                  >
                    #{entry.entry_number}
                  </button>
                ))}
                {(entries?.length || 0) > 20 && (
                  <span className="px-3 py-2 text-sm text-gray-400">
                    +{(entries?.length || 0) - 20} more
                  </span>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Empty State */}
        {selectedCompetition && selectedJudge && !currentEntry && entries?.length === 0 && (
          <div className="bg-white/10 backdrop-blur-md rounded-xl border border-white/20 p-12 text-center">
            <div className="text-6xl mb-4">📋</div>
            <h2 className="text-2xl font-bold text-white mb-2">No Entries Found</h2>
            <p className="text-gray-400">
              No competition entries found for this competition. Please check the scheduling page.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
