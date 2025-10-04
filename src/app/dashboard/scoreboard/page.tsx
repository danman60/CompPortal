'use client';

import { useState } from 'react';
import { useRealtimeScores } from '@/hooks/useRealtimeScores';

export default function ScoreboardPage() {
  const [selectedCompetition, setSelectedCompetition] = useState('');

  const { data: scoreboard, isConnected, error } = useRealtimeScores(
    selectedCompetition || null
  );

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <div className="flex items-center gap-4">
          <h1 className="text-3xl font-bold text-white">Live Scoreboard</h1>
          {selectedCompetition && (
            <div className="flex items-center gap-2">
              <div className={`w-2 h-2 rounded-full ${isConnected ? 'bg-green-500' : 'bg-red-500'}`} />
              <span className="text-sm text-gray-300">
                {isConnected ? 'Connected' : 'Disconnected'}
              </span>
            </div>
          )}
        </div>
      </div>

      {error && (
        <div className="mb-4 p-3 bg-red-500/20 border border-red-500/50 rounded-lg text-red-300 text-sm">
          {error}
        </div>
      )}

      <div className="mb-6">
        <label className="block text-sm font-medium text-gray-300 mb-2">Competition ID</label>
        <input
          type="text"
          value={selectedCompetition}
          onChange={(e) => setSelectedCompetition(e.target.value)}
          className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white max-w-md"
          placeholder="Enter competition UUID"
        />
      </div>

      {scoreboard && scoreboard.length > 0 && (
        <div className="bg-white/10 backdrop-blur-lg border border-white/20 rounded-2xl overflow-hidden">
          <table className="w-full">
            <thead className="bg-white/10">
              <tr>
                <th className="px-4 py-3 text-left text-white font-semibold">Entry #</th>
                <th className="px-4 py-3 text-left text-white font-semibold">Title</th>
                <th className="px-4 py-3 text-left text-white font-semibold">Studio</th>
                <th className="px-4 py-3 text-left text-white font-semibold">Category</th>
                <th className="px-4 py-3 text-center text-white font-semibold">Score</th>
                <th className="px-4 py-3 text-center text-white font-semibold">Award</th>
                <th className="px-4 py-3 text-center text-white font-semibold">Place</th>
              </tr>
            </thead>
            <tbody>
              {scoreboard.map((entry) => (
                <tr key={entry.id} className="border-t border-white/10 hover:bg-white/5">
                  <td className="px-4 py-3 text-white font-bold">
                    #{entry.entry_number}{entry.entry_suffix || ''}
                  </td>
                  <td className="px-4 py-3 text-white">{entry.title}</td>
                  <td className="px-4 py-3 text-gray-300">{entry.studios.name}</td>
                  <td className="px-4 py-3 text-gray-300">{entry.dance_categories.name}</td>
                  <td className="px-4 py-3 text-center">
                    <span className="text-lg font-bold text-cyan-400">
                      {entry.calculated_score?.toFixed(2) || 'N/A'}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-center">
                    <span className={`px-3 py-1 rounded-full text-sm font-semibold ${
                      entry.award_level === 'Platinum' ? 'bg-purple-500 text-white' :
                      entry.award_level === 'High Gold' ? 'bg-yellow-500 text-black' :
                      entry.award_level === 'Gold' ? 'bg-yellow-600 text-white' :
                      entry.award_level === 'Silver' ? 'bg-gray-400 text-black' :
                      'bg-gray-600 text-white'
                    }`}>
                      {entry.award_level || 'Pending'}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-center">
                    <span className="text-xl font-bold text-white">
                      {entry.category_placement ? `${entry.category_placement}${entry.category_placement === 1 ? 'st' : entry.category_placement === 2 ? 'nd' : entry.category_placement === 3 ? 'rd' : 'th'}` : '-'}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {scoreboard && scoreboard.length === 0 && (
        <div className="text-center text-gray-400 py-12">
          No scored entries yet for this competition.
        </div>
      )}
    </div>
  );
}
