'use client';

import { useState } from 'react';
import { trpc } from '@/lib/trpc';

export default function ScoreboardPage() {
  const [selectedCompetition, setSelectedCompetition] = useState<string>('');
  const [selectedEntry, setSelectedEntry] = useState<string | null>(null);

  // Fetch competitions
  const { data: competitions } = trpc.competition.getAll.useQuery();

  // Fetch entries for selected competition
  const { data: entriesData } = trpc.entry.getAll.useQuery(
    { competitionId: selectedCompetition },
    { enabled: !!selectedCompetition }
  );
  const entries = entriesData?.entries;

  // Fetch ALL scores for selected competition
  const { data: allCompetitionScores } = trpc.scoring.getScoresByCompetition.useQuery(
    { competition_id: selectedCompetition },
    { enabled: !!selectedCompetition }
  );

  // Fetch scores for selected entry (for modal)
  const { data: entryScores } = trpc.scoring.getScoresByEntry.useQuery(
    { entry_id: selectedEntry || '' },
    { enabled: !!selectedEntry }
  );

  // Calculate average scores for all entries
  const entriesWithScores = entries?.map((entry) => {
    const scores = allCompetitionScores?.filter(s => s.entry_id === entry.id) || [];
    const totalScore = scores.reduce((sum, s) => sum + (Number(s.total_score) || 0), 0);
    const avgScore = scores.length > 0 ? totalScore / scores.length : 0;
    return {
      ...entry,
      judgeCount: scores.length,
      averageScore: avgScore,
      scores: scores,
    };
  }).sort((a, b) => (b.averageScore || 0) - (a.averageScore || 0));

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-gray-900 to-black p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-white mb-2">📊 Live Scoreboard</h1>
          <p className="text-gray-400">Real-time competition scores and rankings</p>
        </div>

        {/* Competition Selector */}
        <div className="bg-white/10 backdrop-blur-md rounded-xl border border-white/20 p-6 mb-6">
          <label className="block text-sm font-medium text-gray-300 mb-2">
            Select Competition
          </label>
          <select
            value={selectedCompetition}
            onChange={(e) => setSelectedCompetition(e.target.value)}
            className="w-full px-4 py-2 rounded-lg bg-white/5 border border-white/20 text-white focus:outline-none focus:ring-2 focus:ring-pink-500"
          >
            <option value="" className="text-gray-900">-- Select a competition --</option>
            {competitions?.competitions?.map((comp) => (
              <option key={comp.id} value={comp.id} className="text-gray-900">
                {comp.name} ({comp.year})
              </option>
            ))}
          </select>
        </div>

        {/* Scoreboard */}
        {selectedCompetition && (
          <div className="bg-white/10 backdrop-blur-md rounded-xl border border-white/20 p-6">
            <h2 className="text-2xl font-semibold text-white mb-4">Current Standings</h2>

            {entriesWithScores && entriesWithScores.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-white/10">
                      <th className="pb-3 text-left text-gray-300 font-medium">Rank</th>
                      <th className="pb-3 text-left text-gray-300 font-medium">Entry</th>
                      <th className="pb-3 text-left text-gray-300 font-medium">Studio</th>
                      <th className="pb-3 text-left text-gray-300 font-medium">Category</th>
                      <th className="pb-3 text-center text-gray-300 font-medium">Judges</th>
                      <th className="pb-3 text-right text-gray-300 font-medium">Avg Score</th>
                      <th className="pb-3 text-right text-gray-300 font-medium">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {entriesWithScores.map((entry, index) => (
                      <tr
                        key={entry.id}
                        className="border-b border-white/5 hover:bg-white/5 transition-colors"
                      >
                        <td className="py-3">
                          <div className={`
                            inline-flex items-center justify-center w-10 h-10 rounded-full font-bold
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
                        </td>
                        <td className="py-3">
                          <div className="text-white font-medium">{entry.title}</div>
                          <div className="text-sm text-gray-400">#{entry.entry_number}</div>
                        </td>
                        <td className="py-3 text-gray-300">{entry.studios?.name}</td>
                        <td className="py-3 text-gray-300">{entry.dance_categories?.name}</td>
                        <td className="py-3 text-center">
                          <span className={`
                            px-2 py-1 rounded text-sm font-medium
                            ${entry.judgeCount === 0 ? 'bg-gray-500/20 text-gray-400' : 'bg-green-500/20 text-green-400'}
                          `}>
                            {entry.judgeCount} / 3
                          </span>
                        </td>
                        <td className="py-3 text-right">
                          <div className="text-2xl font-bold text-white">
                            {entry.averageScore?.toFixed(1) || '-'}
                          </div>
                        </td>
                        <td className="py-3 text-right">
                          <button
                            onClick={() => setSelectedEntry(entry.id)}
                            className="px-3 py-1 bg-white/10 hover:bg-white/20 text-white text-sm rounded transition-colors"
                          >
                            Details
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="text-center py-8">
                <p className="text-gray-400">No entries found for this competition.</p>
              </div>
            )}
          </div>
        )}

        {/* Score Details Modal */}
        {selectedEntry && entryScores && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50" onClick={() => setSelectedEntry(null)}>
            <div className="bg-gray-900 rounded-xl border border-white/20 p-6 max-w-2xl w-full" onClick={(e) => e.stopPropagation()}>
              <div className="flex justify-between items-start mb-6">
                <div>
                  <h3 className="text-2xl font-bold text-white mb-1">
                    {entries?.find(e => e.id === selectedEntry)?.title}
                  </h3>
                  <p className="text-gray-400">
                    {entries?.find(e => e.id === selectedEntry)?.studios?.name}
                  </p>
                </div>
                <button
                  onClick={() => setSelectedEntry(null)}
                  className="text-gray-400 hover:text-white text-2xl"
                >
                  ×
                </button>
              </div>

              <div className="space-y-4">
                {entryScores.length > 0 ? (
                  <>
                    {entryScores.map((score) => (
                      <div key={score.id} className="bg-white/5 rounded-lg border border-white/10 p-4">
                        <div className="flex justify-between items-start mb-3">
                          <div>
                            <div className="text-white font-medium">{score.judges?.name}</div>
                            <div className="text-sm text-gray-400">
                              Judge #{score.judges?.judge_number}
                            </div>
                          </div>
                          <div className="text-right">
                            <div className="text-sm text-gray-400">Total Score</div>
                            <div className="text-2xl font-bold text-white">
                              {Number(score.total_score)?.toFixed(1)}
                            </div>
                          </div>
                        </div>

                        <div className="grid grid-cols-3 gap-3 mb-3">
                          <div>
                            <div className="text-xs text-gray-400 mb-1">Technical</div>
                            <div className="text-lg font-semibold text-blue-400">
                              {Number(score.technical_score)?.toFixed(1)}
                            </div>
                          </div>
                          <div>
                            <div className="text-xs text-gray-400 mb-1">Artistic</div>
                            <div className="text-lg font-semibold text-purple-400">
                              {Number(score.artistic_score)?.toFixed(1)}
                            </div>
                          </div>
                          <div>
                            <div className="text-xs text-gray-400 mb-1">Performance</div>
                            <div className="text-lg font-semibold text-pink-400">
                              {Number(score.performance_score)?.toFixed(1)}
                            </div>
                          </div>
                        </div>

                        {score.comments && (
                          <div className="mt-3 pt-3 border-t border-white/10">
                            <div className="text-xs text-gray-400 mb-1">Comments</div>
                            <div className="text-sm text-gray-300">{score.comments}</div>
                          </div>
                        )}

                        <div className="mt-2 text-xs text-gray-500">
                          Scored: {score.scored_at ? new Date(score.scored_at).toLocaleString() : 'N/A'}
                        </div>
                      </div>
                    ))}

                    {/* Average Scores Summary */}
                    <div className="bg-gradient-to-r from-pink-500/20 to-purple-500/20 rounded-lg border border-white/20 p-4">
                      <h4 className="text-white font-semibold mb-3">Average Scores</h4>
                      <div className="grid grid-cols-4 gap-3">
                        <div>
                          <div className="text-xs text-gray-400 mb-1">Technical</div>
                          <div className="text-xl font-bold text-blue-400">
                            {(entryScores.reduce((sum, s) => sum + (Number(s.technical_score) || 0), 0) / entryScores.length).toFixed(1)}
                          </div>
                        </div>
                        <div>
                          <div className="text-xs text-gray-400 mb-1">Artistic</div>
                          <div className="text-xl font-bold text-purple-400">
                            {(entryScores.reduce((sum, s) => sum + (Number(s.artistic_score) || 0), 0) / entryScores.length).toFixed(1)}
                          </div>
                        </div>
                        <div>
                          <div className="text-xs text-gray-400 mb-1">Performance</div>
                          <div className="text-xl font-bold text-pink-400">
                            {(entryScores.reduce((sum, s) => sum + (Number(s.performance_score) || 0), 0) / entryScores.length).toFixed(1)}
                          </div>
                        </div>
                        <div>
                          <div className="text-xs text-gray-400 mb-1">Overall</div>
                          <div className="text-xl font-bold text-white">
                            {(entryScores.reduce((sum, s) => sum + (Number(s.total_score) || 0), 0) / entryScores.length).toFixed(1)}
                          </div>
                        </div>
                      </div>
                    </div>
                  </>
                ) : (
                  <div className="text-center py-8 text-gray-400">
                    No scores submitted for this entry yet.
                  </div>
                )}
              </div>

              <button
                onClick={() => setSelectedEntry(null)}
                className="w-full mt-6 px-4 py-2 bg-white/10 hover:bg-white/20 text-white rounded-lg transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
