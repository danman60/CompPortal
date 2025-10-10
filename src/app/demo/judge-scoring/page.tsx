'use client';

import { useState } from 'react';

export default function JudgeScoringDemoPage() {
  const [scores, setScores] = useState({
    technical: 75,
    artistic: 75,
    performance: 75,
  });

  const handleScoreChange = (category: 'technical' | 'artistic' | 'performance', value: number) => {
    setScores({ ...scores, [category]: Math.max(60, Math.min(100, value)) });
  };

  const applyQuickScore = (category: 'technical' | 'artistic' | 'performance', score: number) => {
    setScores({ ...scores, [category]: score });
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

        {/* Entry Info */}
        <div className="bg-white/10 backdrop-blur-md rounded-xl border border-white/20 p-6 mb-4">
          <div className="flex justify-between items-start mb-4">
            <div>
              <h2 className="text-3xl font-bold text-white mb-2">
                Demo Routine - "Rising Stars"
              </h2>
              <div className="flex gap-4 text-gray-300">
                <span>📋 Routine #42</span>
                <span>🏢 Elite Dance Academy</span>
                <span>🎭 Contemporary</span>
              </div>
            </div>
            <div className="text-right">
              <div className="text-sm text-gray-400">Demo Routine</div>
              <div className="text-2xl font-bold text-white">
                1 / 1
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4 text-sm text-gray-400">
            <div>📅 Teen (13-15)</div>
            <div>⭐ Competitive</div>
            <div>👥 Small Group (5-9)</div>
            <div>⏱️ 3:45</div>
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
            {/* Quick Score Presets */}
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
            {/* Quick Score Presets */}
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
            {/* Quick Score Presets */}
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
        <div className="bg-gradient-to-r from-pink-500/20 to-purple-500/20 backdrop-blur-md rounded-xl border border-white/20 p-6 mt-6">
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

        {/* Demo Submit Button */}
        <div className="mt-6">
          <button
            onClick={() => alert('Demo mode - scores not saved')}
            className="w-full px-8 py-6 bg-gradient-to-r from-pink-500 to-purple-500 text-white text-xl font-semibold rounded-lg hover:shadow-lg transition-all duration-200"
          >
            Submit Score (Demo Only)
          </button>
        </div>
      </div>
    </div>
  );
}
