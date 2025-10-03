'use client';

import { useState } from 'react';
import { trpc } from '@/lib/trpc';

export default function JudgesPage() {
  const [selectedCompetition, setSelectedCompetition] = useState<string>('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [newJudge, setNewJudge] = useState({
    name: '',
    email: '',
    phone: '',
    credentials: '',
    specialization: '',
    certification_level: '',
    years_judging: 0,
  });

  // Fetch competitions
  const { data: competitions } = trpc.competition.getAll.useQuery();

  // Fetch judges for selected competition
  const { data: judges, refetch: refetchJudges } = trpc.judges.getByCompetition.useQuery(
    { competition_id: selectedCompetition },
    { enabled: !!selectedCompetition }
  );

  // Fetch all judges
  const { data: allJudges } = trpc.judges.getAll.useQuery();

  // Create judge mutation
  const createJudge = trpc.judges.create.useMutation({
    onSuccess: () => {
      refetchJudges();
      setShowAddModal(false);
      setNewJudge({
        name: '',
        email: '',
        phone: '',
        credentials: '',
        specialization: '',
        certification_level: '',
        years_judging: 0,
      });
    },
  });

  // Check in mutation
  const checkInJudge = trpc.judges.checkIn.useMutation({
    onSuccess: () => {
      refetchJudges();
    },
  });

  const handleCreateJudge = () => {
    createJudge.mutate({
      ...newJudge,
      competition_id: selectedCompetition || undefined,
    });
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-gray-900 to-black p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-white mb-2">👨‍⚖️ Judge Management</h1>
          <p className="text-gray-400">Manage judge assignments and check-ins</p>
        </div>

        {/* Competition Selector */}
        <div className="bg-white/10 backdrop-blur-md rounded-xl border border-white/20 p-6 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Select Competition
              </label>
              <select
                value={selectedCompetition}
                onChange={(e) => setSelectedCompetition(e.target.value)}
                className="w-full px-4 py-2 rounded-lg bg-white/5 border border-white/20 text-white focus:outline-none focus:ring-2 focus:ring-pink-500"
              >
                <option value="">-- Select a competition --</option>
                {competitions?.competitions?.map((comp) => (
                  <option key={comp.id} value={comp.id}>
                    {comp.name} ({comp.year})
                  </option>
                ))}
              </select>
            </div>
            <div className="flex items-end">
              <button
                onClick={() => setShowAddModal(true)}
                disabled={!selectedCompetition}
                className="px-6 py-2 bg-gradient-to-r from-pink-500 to-purple-500 text-white rounded-lg hover:shadow-lg transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                ➕ Add Judge
              </button>
            </div>
          </div>
        </div>

        {/* Judges List */}
        {selectedCompetition && (
          <div className="bg-white/10 backdrop-blur-md rounded-xl border border-white/20 p-6">
            <h2 className="text-2xl font-semibold text-white mb-4">Competition Judges</h2>

            {judges && judges.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {judges.map((judge) => (
                  <div
                    key={judge.id}
                    className="bg-white/5 rounded-lg border border-white/10 p-4"
                  >
                    <div className="flex justify-between items-start mb-3">
                      <div>
                        <h3 className="text-lg font-semibold text-white">{judge.name}</h3>
                        {judge.judge_number && (
                          <p className="text-sm text-purple-400">Judge #{judge.judge_number}</p>
                        )}
                      </div>
                      <div className="flex gap-2">
                        {judge.confirmed ? (
                          <span className="px-2 py-1 bg-green-500/20 text-green-400 text-xs rounded">
                            ✓ Confirmed
                          </span>
                        ) : (
                          <span className="px-2 py-1 bg-yellow-500/20 text-yellow-400 text-xs rounded">
                            Pending
                          </span>
                        )}
                        {judge.checked_in ? (
                          <span className="px-2 py-1 bg-blue-500/20 text-blue-400 text-xs rounded">
                            ✓ Checked In
                          </span>
                        ) : (
                          <button
                            onClick={() => checkInJudge.mutate({ id: judge.id })}
                            className="px-2 py-1 bg-white/5 hover:bg-white/10 text-gray-300 text-xs rounded transition-colors"
                          >
                            Check In
                          </button>
                        )}
                      </div>
                    </div>

                    <div className="space-y-1 text-sm text-gray-400">
                      {judge.email && (
                        <p>✉️ {judge.email}</p>
                      )}
                      {judge.phone && (
                        <p>📱 {judge.phone}</p>
                      )}
                      {judge.credentials && (
                        <p>🏆 {judge.credentials}</p>
                      )}
                      {judge.specialization && (
                        <p>💃 {judge.specialization}</p>
                      )}
                      {judge.panel_assignment && (
                        <p>📋 Panel: {judge.panel_assignment}</p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8">
                <p className="text-gray-400">No judges assigned to this competition yet.</p>
                <button
                  onClick={() => setShowAddModal(true)}
                  className="mt-4 px-6 py-2 bg-gradient-to-r from-pink-500 to-purple-500 text-white rounded-lg hover:shadow-lg transition-all duration-200"
                >
                  Add First Judge
                </button>
              </div>
            )}
          </div>
        )}

        {/* All Judges (for reference) */}
        <div className="mt-8 bg-white/10 backdrop-blur-md rounded-xl border border-white/20 p-6">
          <h2 className="text-2xl font-semibold text-white mb-4">All Judges Database</h2>
          {allJudges && allJudges.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="border-b border-white/10">
                    <th className="pb-3 text-gray-300 font-medium">Name</th>
                    <th className="pb-3 text-gray-300 font-medium">Email</th>
                    <th className="pb-3 text-gray-300 font-medium">Credentials</th>
                    <th className="pb-3 text-gray-300 font-medium">Competition</th>
                  </tr>
                </thead>
                <tbody>
                  {allJudges.map((judge) => (
                    <tr key={judge.id} className="border-b border-white/5">
                      <td className="py-3 text-white">{judge.name}</td>
                      <td className="py-3 text-gray-400">{judge.email || '-'}</td>
                      <td className="py-3 text-gray-400">{judge.credentials || '-'}</td>
                      <td className="py-3 text-gray-400">
                        {judge.competitions?.name || 'Unassigned'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="text-gray-400 text-center py-4">No judges in database</p>
          )}
        </div>
      </div>

      {/* Add Judge Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-gray-900 rounded-xl border border-white/20 p-6 max-w-md w-full">
            <h3 className="text-2xl font-bold text-white mb-4">Add New Judge</h3>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">Name *</label>
                <input
                  type="text"
                  value={newJudge.name}
                  onChange={(e) => setNewJudge({ ...newJudge, name: e.target.value })}
                  className="w-full px-4 py-2 rounded-lg bg-white/5 border border-white/20 text-white focus:outline-none focus:ring-2 focus:ring-pink-500"
                  placeholder="Judge Name"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">Email *</label>
                <input
                  type="email"
                  value={newJudge.email}
                  onChange={(e) => setNewJudge({ ...newJudge, email: e.target.value })}
                  className="w-full px-4 py-2 rounded-lg bg-white/5 border border-white/20 text-white focus:outline-none focus:ring-2 focus:ring-pink-500"
                  placeholder="judge@example.com"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">Phone</label>
                <input
                  type="tel"
                  value={newJudge.phone}
                  onChange={(e) => setNewJudge({ ...newJudge, phone: e.target.value })}
                  className="w-full px-4 py-2 rounded-lg bg-white/5 border border-white/20 text-white focus:outline-none focus:ring-2 focus:ring-pink-500"
                  placeholder="(555) 123-4567"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">Credentials</label>
                <input
                  type="text"
                  value={newJudge.credentials}
                  onChange={(e) => setNewJudge({ ...newJudge, credentials: e.target.value })}
                  className="w-full px-4 py-2 rounded-lg bg-white/5 border border-white/20 text-white focus:outline-none focus:ring-2 focus:ring-pink-500"
                  placeholder="e.g., Certified Dance Judge"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">Specialization</label>
                <input
                  type="text"
                  value={newJudge.specialization}
                  onChange={(e) => setNewJudge({ ...newJudge, specialization: e.target.value })}
                  className="w-full px-4 py-2 rounded-lg bg-white/5 border border-white/20 text-white focus:outline-none focus:ring-2 focus:ring-pink-500"
                  placeholder="e.g., Contemporary, Ballet"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">Years Judging</label>
                <input
                  type="number"
                  value={newJudge.years_judging}
                  onChange={(e) => setNewJudge({ ...newJudge, years_judging: parseInt(e.target.value) || 0 })}
                  className="w-full px-4 py-2 rounded-lg bg-white/5 border border-white/20 text-white focus:outline-none focus:ring-2 focus:ring-pink-500"
                  placeholder="0"
                  min="0"
                />
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <button
                onClick={() => setShowAddModal(false)}
                className="flex-1 px-4 py-2 bg-white/10 text-white rounded-lg hover:bg-white/20 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleCreateJudge}
                disabled={!newJudge.name || !newJudge.email}
                className="flex-1 px-4 py-2 bg-gradient-to-r from-pink-500 to-purple-500 text-white rounded-lg hover:shadow-lg transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Add Judge
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
