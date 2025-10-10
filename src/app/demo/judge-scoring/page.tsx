'use client';

import { useState } from 'react';

export default function JudgeScoringDemoPage() {
  const [scores, setScores] = useState({
    technical: 75,
    artistic: 75,
    performance: 75,
  });
  const [comments, setComments] = useState('');
  const [specialAwards, setSpecialAwards] = useState<string[]>([]);
  const [activeTab, setActiveTab] = useState<'entry' | 'review'>('entry');
  const [entryIndex, setEntryIndex] = useState(0);

  // Demo data - 3 example routines
  const demoEntries = [
    {
      id: '1',
      entry_number: 42,
      title: 'Rising Stars',
      studio: 'Elite Dance Academy',
      category: 'Contemporary',
      ageGroup: 'Teen (13-15)',
      classification: 'Competitive',
      sizeCategory: 'Small Group (5-9)',
      duration: '3:45'
    },
    {
      id: '2',
      entry_number: 43,
      title: 'Electric Dreams',
      studio: 'Elite Dance Academy',
      category: 'Jazz',
      ageGroup: 'Junior (9-12)',
      classification: 'Elite',
      sizeCategory: 'Large Group (10+)',
      duration: '4:15'
    },
    {
      id: '3',
      entry_number: 44,
      title: 'Moonlight Sonata',
      studio: 'Elite Dance Academy',
      category: 'Lyrical',
      ageGroup: 'Teen (13-15)',
      classification: 'Competitive',
      sizeCategory: 'Duo/Trio (2-4)',
      duration: '3:30'
    }
  ];

  const currentEntry = demoEntries[entryIndex];

  // Demo submitted scores
  const demoSubmittedScores = [
    {
      id: '1',
      entry_number: 41,
      title: 'Fire and Ice',
      studio: 'Elite Dance Academy',
      category: 'Hip Hop',
      ageGroup: 'Junior (9-12)',
      technical_score: 88,
      artistic_score: 92,
      performance_score: 90,
      total_score: 270,
      comments: 'Excellent energy and synchronization!',
      scored_at: new Date().toISOString()
    }
  ];

  const handleScoreChange = (category: 'technical' | 'artistic' | 'performance', value: number) => {
    setScores({ ...scores, [category]: Math.max(60, Math.min(100, value)) });
  };

  const applyQuickScore = (category: 'technical' | 'artistic' | 'performance', score: number) => {
    setScores({ ...scores, [category]: score });
  };

  const toggleSpecialAward = (award: string) => {
    setSpecialAwards(prev =>
      prev.includes(award)
        ? prev.filter(a => a !== award)
        : [...prev, award]
    );
  };

  const totalScore = scores.technical + scores.artistic + scores.performance;
  const averageScore = totalScore / 3;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-gray-900 to-black p-4">
      <div className="max-w-6xl mx-auto">
        {/* Demo Banner */}
        <div className="bg-yellow-500/20 backdrop-blur-md rounded-xl border border-yellow-400/50 p-4 mb-6">
          <div className="flex items-center gap-3">
            <span className="text-2xl">⚡</span>
            <div>
              <h3 className="text-yellow-300 font-bold">DEMO MODE</h3>
              <p className="text-yellow-200 text-sm">Static judge scoring interface for demonstration purposes</p>
            </div>
          </div>
        </div>

        {/* Tab Switcher */}
        <div className="bg-white/10 backdrop-blur-md rounded-xl border border-white/20 p-2 mb-4">
          <div className="flex gap-2">
            <button
              onClick={() => setActiveTab('entry')}
              className={`flex-1 px-8 py-5 rounded-lg text-lg font-semibold transition-all ${
                activeTab === 'entry'
                  ? 'bg-gradient-to-r from-pink-500 to-purple-500 text-white'
                  : 'bg-white/5 text-gray-300 hover:bg-white/10'
              }`}
            >
              📝 Score Routine
            </button>
            <button
              onClick={() => setActiveTab('review')}
              className={`flex-1 px-8 py-5 rounded-lg text-lg font-semibold transition-all ${
                activeTab === 'review'
                  ? 'bg-gradient-to-r from-pink-500 to-purple-500 text-white'
                  : 'bg-white/5 text-gray-300 hover:bg-white/10'
              }`}
            >
              📋 Score Review ({demoSubmittedScores.length})
            </button>
          </div>
        </div>

        {/* Scoring Interface */}
        {activeTab === 'entry' && (
          <div className="space-y-4">
            {/* Entry Info */}
            <div className="bg-white/10 backdrop-blur-md rounded-xl border border-white/20 p-6">
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h2 className="text-3xl font-bold text-white mb-2">
                    {currentEntry.title}
                  </h2>
                  <div className="flex gap-4 text-gray-300">
                    <span>📋 Routine #{currentEntry.entry_number}</span>
                    <span>🏢 {currentEntry.studio}</span>
                    <span>🎭 {currentEntry.category}</span>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-sm text-gray-400">Routine Progress</div>
                  <div className="text-2xl font-bold text-white">
                    {entryIndex + 1} / {demoEntries.length}
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 text-sm text-gray-400">
                <div>📅 {currentEntry.ageGroup}</div>
                <div>⭐ {currentEntry.classification}</div>
                <div>👥 {currentEntry.sizeCategory}</div>
                <div>⏱️ {currentEntry.duration}</div>
              </div>
            </div>

            {/* Score Sliders */}
            <div className="space-y-6">
              {/* Technical Score */}
              <div className="bg-white/10 backdrop-blur-md rounded-xl border border-white/20 p-6">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-xl font-semibold text-white">🔧 Technical Score</h3>
                  <div className="text-5xl font-bold text-white">{scores.technical}</div>
                </div>
                <input
                  type="range"
                  min="60"
                  max="100"
                  value={scores.technical}
                  onChange={(e) => handleScoreChange('technical', parseInt(e.target.value))}
                  className="w-full h-8 bg-white/20 rounded-lg appearance-none cursor-pointer"
                  style={{
                    background: `linear-gradient(to right, rgb(59, 130, 246) 0%, rgb(59, 130, 246) ${((scores.technical - 60) / 40) * 100}%, rgba(255, 255, 255, 0.2) ${((scores.technical - 60) / 40) * 100}%, rgba(255, 255, 255, 0.2) 100%)`
                  }}
                />
                <div className="flex justify-between text-base text-gray-400 mt-3">
                  <span>60</span>
                  <span>100</span>
                </div>
                <div className="grid grid-cols-4 gap-2 mt-4">
                  <button
                    onClick={() => applyQuickScore('technical', 65)}
                    className="px-4 py-3 bg-red-500/20 hover:bg-red-500/30 border border-red-400/30 text-red-300 rounded-lg font-medium text-sm transition-all"
                  >
                    Poor 65
                  </button>
                  <button
                    onClick={() => applyQuickScore('technical', 75)}
                    className="px-4 py-3 bg-yellow-500/20 hover:bg-yellow-500/30 border border-yellow-400/30 text-yellow-300 rounded-lg font-medium text-sm transition-all"
                  >
                    Fair 75
                  </button>
                  <button
                    onClick={() => applyQuickScore('technical', 85)}
                    className="px-4 py-3 bg-blue-500/20 hover:bg-blue-500/30 border border-blue-400/30 text-blue-300 rounded-lg font-medium text-sm transition-all"
                  >
                    Good 85
                  </button>
                  <button
                    onClick={() => applyQuickScore('technical', 95)}
                    className="px-4 py-3 bg-green-500/20 hover:bg-green-500/30 border border-green-400/30 text-green-300 rounded-lg font-medium text-sm transition-all"
                  >
                    Excellent 95
                  </button>
                </div>
              </div>

              {/* Artistic Score */}
              <div className="bg-white/10 backdrop-blur-md rounded-xl border border-white/20 p-6">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-xl font-semibold text-white">🎨 Artistic Score</h3>
                  <div className="text-5xl font-bold text-white">{scores.artistic}</div>
                </div>
                <input
                  type="range"
                  min="60"
                  max="100"
                  value={scores.artistic}
                  onChange={(e) => handleScoreChange('artistic', parseInt(e.target.value))}
                  className="w-full h-8 bg-white/20 rounded-lg appearance-none cursor-pointer"
                  style={{
                    background: `linear-gradient(to right, rgb(168, 85, 247) 0%, rgb(168, 85, 247) ${((scores.artistic - 60) / 40) * 100}%, rgba(255, 255, 255, 0.2) ${((scores.artistic - 60) / 40) * 100}%, rgba(255, 255, 255, 0.2) 100%)`
                  }}
                />
                <div className="flex justify-between text-base text-gray-400 mt-3">
                  <span>60</span>
                  <span>100</span>
                </div>
                <div className="grid grid-cols-4 gap-2 mt-4">
                  <button
                    onClick={() => applyQuickScore('artistic', 65)}
                    className="px-4 py-3 bg-red-500/20 hover:bg-red-500/30 border border-red-400/30 text-red-300 rounded-lg font-medium text-sm transition-all"
                  >
                    Poor 65
                  </button>
                  <button
                    onClick={() => applyQuickScore('artistic', 75)}
                    className="px-4 py-3 bg-yellow-500/20 hover:bg-yellow-500/30 border border-yellow-400/30 text-yellow-300 rounded-lg font-medium text-sm transition-all"
                  >
                    Fair 75
                  </button>
                  <button
                    onClick={() => applyQuickScore('artistic', 85)}
                    className="px-4 py-3 bg-purple-500/20 hover:bg-purple-500/30 border border-purple-400/30 text-purple-300 rounded-lg font-medium text-sm transition-all"
                  >
                    Good 85
                  </button>
                  <button
                    onClick={() => applyQuickScore('artistic', 95)}
                    className="px-4 py-3 bg-green-500/20 hover:bg-green-500/30 border border-green-400/30 text-green-300 rounded-lg font-medium text-sm transition-all"
                  >
                    Excellent 95
                  </button>
                </div>
              </div>

              {/* Performance Score */}
              <div className="bg-white/10 backdrop-blur-md rounded-xl border border-white/20 p-6">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-xl font-semibold text-white">⭐ Performance Score</h3>
                  <div className="text-5xl font-bold text-white">{scores.performance}</div>
                </div>
                <input
                  type="range"
                  min="60"
                  max="100"
                  value={scores.performance}
                  onChange={(e) => handleScoreChange('performance', parseInt(e.target.value))}
                  className="w-full h-8 bg-white/20 rounded-lg appearance-none cursor-pointer"
                  style={{
                    background: `linear-gradient(to right, rgb(236, 72, 153) 0%, rgb(236, 72, 153) ${((scores.performance - 60) / 40) * 100}%, rgba(255, 255, 255, 0.2) ${((scores.performance - 60) / 40) * 100}%, rgba(255, 255, 255, 0.2) 100%)`
                  }}
                />
                <div className="flex justify-between text-base text-gray-400 mt-3">
                  <span>60</span>
                  <span>100</span>
                </div>
                <div className="grid grid-cols-4 gap-2 mt-4">
                  <button
                    onClick={() => applyQuickScore('performance', 65)}
                    className="px-4 py-3 bg-red-500/20 hover:bg-red-500/30 border border-red-400/30 text-red-300 rounded-lg font-medium text-sm transition-all"
                  >
                    Poor 65
                  </button>
                  <button
                    onClick={() => applyQuickScore('performance', 75)}
                    className="px-4 py-3 bg-yellow-500/20 hover:bg-yellow-500/30 border border-yellow-400/30 text-yellow-300 rounded-lg font-medium text-sm transition-all"
                  >
                    Fair 75
                  </button>
                  <button
                    onClick={() => applyQuickScore('performance', 85)}
                    className="px-4 py-3 bg-pink-500/20 hover:bg-pink-500/30 border border-pink-400/30 text-pink-300 rounded-lg font-medium text-sm transition-all"
                  >
                    Good 85
                  </button>
                  <button
                    onClick={() => applyQuickScore('performance', 95)}
                    className="px-4 py-3 bg-green-500/20 hover:bg-green-500/30 border border-green-400/30 text-green-300 rounded-lg font-medium text-sm transition-all"
                  >
                    Excellent 95
                  </button>
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

            {/* Special Awards */}
            <div className="bg-white/10 backdrop-blur-md rounded-xl border border-white/20 p-6">
              <h3 className="text-xl font-semibold text-white mb-3">🏆 Special Awards (Optional)</h3>
              <p className="text-base text-gray-400 mb-4">Select any special awards this routine deserves</p>

              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                {[
                  "Judge's Choice",
                  "Outstanding Technique",
                  "Best Choreography",
                  "Exceptional Performance",
                  "Rising Star",
                  "Crowd Favorite"
                ].map((award) => (
                  <button
                    key={award}
                    onClick={() => toggleSpecialAward(award)}
                    className={`px-5 py-4 rounded-lg border-2 transition-all text-base font-medium ${
                      specialAwards.includes(award)
                        ? 'bg-yellow-500/20 border-yellow-400 text-yellow-300'
                        : 'bg-white/5 border-white/20 text-gray-300 hover:bg-white/10'
                    }`}
                  >
                    {specialAwards.includes(award) ? '✓ ' : ''}{award}
                  </button>
                ))}
              </div>

              {specialAwards.length > 0 && (
                <div className="mt-4 p-3 bg-yellow-500/10 border border-yellow-400/30 rounded-lg">
                  <div className="text-sm text-yellow-200">
                    Selected Awards: {specialAwards.join(', ')}
                  </div>
                </div>
              )}
            </div>

            {/* Swipe Indicator */}
            <div className="bg-emerald-500/10 backdrop-blur-md rounded-xl border border-emerald-400/30 p-4">
              <div className="flex items-center justify-center gap-3 text-emerald-300">
                <span className="text-2xl">👈</span>
                <span className="text-sm font-medium">Swipe left/right to navigate routines</span>
                <span className="text-2xl">👉</span>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex gap-4">
              <button
                onClick={() => setEntryIndex(Math.max(0, entryIndex - 1))}
                disabled={entryIndex === 0}
                className="flex-1 px-8 py-6 bg-white/10 text-white text-xl font-semibold rounded-lg hover:bg-white/20 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                ← Previous Routine
              </button>

              <button
                onClick={() => alert('Demo mode - score not saved')}
                className="flex-1 px-8 py-6 bg-gradient-to-r from-pink-500 to-purple-500 text-white text-xl font-semibold rounded-lg hover:shadow-lg transition-all duration-200"
              >
                Submit Score & Next →
              </button>
            </div>

            {/* Quick Navigation */}
            <div className="bg-white/10 backdrop-blur-md rounded-xl border border-white/20 p-4">
              <div className="text-base text-gray-400 mb-3">Quick Jump to Routine:</div>
              <div className="flex flex-wrap gap-3">
                {demoEntries.map((entry, idx) => (
                  <button
                    key={entry.id}
                    onClick={() => setEntryIndex(idx)}
                    className={`px-5 py-3 rounded-lg text-base font-medium transition-colors ${
                      idx === entryIndex
                        ? 'bg-pink-500 text-white'
                        : 'bg-white/5 text-gray-300 hover:bg-white/10'
                    }`}
                  >
                    #{entry.entry_number}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Score Review Tab */}
        {activeTab === 'review' && (
          <div className="space-y-4">
            <div className="bg-white/10 backdrop-blur-md rounded-xl border border-white/20 p-6">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-bold text-white">Your Submitted Scores</h2>
                <div className="flex items-center gap-2 text-sm">
                  <span className="text-green-400">✅ All Synced</span>
                </div>
              </div>

              <div className="space-y-3">
                {demoSubmittedScores.map((score) => (
                  <div
                    key={score.id}
                    className="bg-white/5 rounded-lg border border-white/10 p-4 hover:bg-white/10 transition-colors"
                  >
                    <div className="flex justify-between items-start mb-3">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <span className="px-3 py-1 bg-pink-500/20 border border-pink-400/30 rounded-lg text-pink-300 font-semibold text-sm">
                            #{score.entry_number}
                          </span>
                          <h3 className="text-lg font-semibold text-white">
                            {score.title}
                          </h3>
                          <span className="text-green-400 text-sm">✅</span>
                        </div>
                        <div className="flex gap-4 text-sm text-gray-400">
                          <span>🏢 {score.studio}</span>
                          <span>🎭 {score.category}</span>
                          <span>📅 {score.ageGroup}</span>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-3xl font-bold text-white mb-1">
                          {Number(score.total_score).toFixed(1)}
                        </div>
                        <div className="text-xs text-gray-400">
                          {new Date(score.scored_at).toLocaleTimeString()}
                        </div>
                      </div>
                    </div>

                    <div className="grid grid-cols-3 gap-3 mt-3 pt-3 border-t border-white/10">
                      <div className="text-center">
                        <div className="text-xs text-gray-400 mb-1">Technical</div>
                        <div className="text-lg font-semibold text-blue-300">
                          {score.technical_score}
                        </div>
                      </div>
                      <div className="text-center">
                        <div className="text-xs text-gray-400 mb-1">Artistic</div>
                        <div className="text-lg font-semibold text-purple-300">
                          {score.artistic_score}
                        </div>
                      </div>
                      <div className="text-center">
                        <div className="text-xs text-gray-400 mb-1">Performance</div>
                        <div className="text-lg font-semibold text-pink-300">
                          {score.performance_score}
                        </div>
                      </div>
                    </div>

                    {score.comments && (
                      <div className="mt-3 pt-3 border-t border-white/10">
                        <div className="text-xs text-gray-400 mb-1">Comments</div>
                        <div className="text-sm text-gray-300">{score.comments}</div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-gradient-to-r from-green-500/20 to-emerald-500/20 backdrop-blur-md rounded-xl border border-green-400/30 p-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="text-3xl">📊</div>
                  <div>
                    <h3 className="text-lg font-semibold text-white">Session Summary</h3>
                    <p className="text-sm text-gray-300">
                      {demoSubmittedScores.length} routine{demoSubmittedScores.length !== 1 ? 's' : ''} scored
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-sm text-gray-400">Sync Status</div>
                  <div className="text-lg font-semibold text-green-400">✅ All Synced</div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
