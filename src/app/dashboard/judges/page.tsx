'use client';

import { useState } from 'react';
import { trpc } from '@/lib/trpc';

export default function JudgesPage() {
  const [selectedCompetition, setSelectedCompetition] = useState<string>('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingJudge, setEditingJudge] = useState<any>(null);
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

  // Update judge mutation
  const updateJudge = trpc.judges.update.useMutation({
    onSuccess: () => {
      refetchJudges();
      setShowEditModal(false);
      setEditingJudge(null);
    },
    onError: (error) => {
      alert(`Failed to update judge: ${error.message}`);
    },
  });

  // Delete judge mutation
  const deleteJudge = trpc.judges.delete.useMutation({
    onSuccess: () => {
      refetchJudges();
    },
    onError: (error) => {
      alert(`Failed to delete judge: ${error.message}`);
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

  const handleEditJudge = (judge: any) => {
    setEditingJudge(judge);
    setShowEditModal(true);
  };

  const handleUpdateJudge = () => {
    if (!editingJudge) return;
    updateJudge.mutate({
      id: editingJudge.id,
      name: editingJudge.name,
      email: editingJudge.email,
      phone: editingJudge.phone || undefined,
      credentials: editingJudge.credentials || undefined,
      specialization: editingJudge.specialization || undefined,
      certification_level: editingJudge.certification_level || undefined,
      years_judging: editingJudge.years_judging || 0,
      judge_number: editingJudge.judge_number || undefined,
      panel_assignment: editingJudge.panel_assignment || undefined,
    });
  };

  const handleDeleteJudge = (id: string, name: string) => {
    if (confirm(`Are you sure you want to delete judge "${name}"? This action cannot be undone. (Note: Judges with existing scores cannot be deleted)`)) {
      deleteJudge.mutate({ id });
    }
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
                <option value="" className="text-gray-900">-- Select a competition --</option>
                {competitions?.competitions?.map((comp) => (
                  <option key={comp.id} value={comp.id} className="text-gray-900">
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

                    <div className="flex gap-2 mt-4 pt-3 border-t border-white/10">
                      <button
                        onClick={() => handleEditJudge(judge)}
                        className="flex-1 px-3 py-1.5 bg-blue-500/20 text-blue-400 border border-blue-400/30 rounded hover:bg-blue-500/30 transition-colors text-sm"
                      >
                        ✏️ Edit
                      </button>
                      <button
                        onClick={() => handleDeleteJudge(judge.id, judge.name)}
                        className="flex-1 px-3 py-1.5 bg-red-500/20 text-red-400 border border-red-400/30 rounded hover:bg-red-500/30 transition-colors text-sm"
                        disabled={deleteJudge.isPending}
                      >
                        {deleteJudge.isPending ? '⏳' : '🗑️'} Delete
                      </button>
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
            <>
            {/* Desktop Table View */}
            <div className="hidden md:block overflow-x-auto">
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

            {/* Mobile Card View */}
            <div className="md:hidden space-y-3">
              {allJudges.map((judge) => (
                <div
                  key={judge.id}
                  className="bg-white/5 rounded-lg border border-white/10 p-4"
                >
                  <h3 className="text-white font-semibold mb-2">{judge.name}</h3>
                  <div className="space-y-1 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-400">Email:</span>
                      <span className="text-gray-300">{judge.email || '-'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-400">Credentials:</span>
                      <span className="text-gray-300">{judge.credentials || '-'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-400">Competition:</span>
                      <span className="text-gray-300">{judge.competitions?.name || 'Unassigned'}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
            </>
          ) : (
            <p className="text-gray-400 text-center py-4">No judges in database</p>
          )}
        </div>
      </div>

      {/* Edit Judge Modal */}
      {showEditModal && editingJudge && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-gray-900 rounded-xl border border-white/20 p-6 max-w-md w-full max-h-[90vh] overflow-y-auto">
            <h3 className="text-2xl font-bold text-white mb-4">Edit Judge</h3>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">Name *</label>
                <input
                  type="text"
                  value={editingJudge.name}
                  onChange={(e) => setEditingJudge({ ...editingJudge, name: e.target.value })}
                  className="w-full px-4 py-2 rounded-lg bg-white/5 border border-white/20 text-white focus:outline-none focus:ring-2 focus:ring-pink-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">Email *</label>
                <input
                  type="email"
                  value={editingJudge.email}
                  onChange={(e) => setEditingJudge({ ...editingJudge, email: e.target.value })}
                  className="w-full px-4 py-2 rounded-lg bg-white/5 border border-white/20 text-white focus:outline-none focus:ring-2 focus:ring-pink-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">Phone</label>
                <input
                  type="tel"
                  value={editingJudge.phone || ''}
                  onChange={(e) => setEditingJudge({ ...editingJudge, phone: e.target.value })}
                  className="w-full px-4 py-2 rounded-lg bg-white/5 border border-white/20 text-white focus:outline-none focus:ring-2 focus:ring-pink-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">Credentials</label>
                <input
                  type="text"
                  value={editingJudge.credentials || ''}
                  onChange={(e) => setEditingJudge({ ...editingJudge, credentials: e.target.value })}
                  className="w-full px-4 py-2 rounded-lg bg-white/5 border border-white/20 text-white focus:outline-none focus:ring-2 focus:ring-pink-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">Specialization</label>
                <input
                  type="text"
                  value={editingJudge.specialization || ''}
                  onChange={(e) => setEditingJudge({ ...editingJudge, specialization: e.target.value })}
                  className="w-full px-4 py-2 rounded-lg bg-white/5 border border-white/20 text-white focus:outline-none focus:ring-2 focus:ring-pink-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">Certification Level</label>
                <input
                  type="text"
                  value={editingJudge.certification_level || ''}
                  onChange={(e) => setEditingJudge({ ...editingJudge, certification_level: e.target.value })}
                  className="w-full px-4 py-2 rounded-lg bg-white/5 border border-white/20 text-white focus:outline-none focus:ring-2 focus:ring-pink-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">Years Judging</label>
                <input
                  type="number"
                  value={editingJudge.years_judging || 0}
                  onChange={(e) => setEditingJudge({ ...editingJudge, years_judging: parseInt(e.target.value) || 0 })}
                  className="w-full px-4 py-2 rounded-lg bg-white/5 border border-white/20 text-white focus:outline-none focus:ring-2 focus:ring-pink-500"
                  min="0"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">Judge Number</label>
                <input
                  type="number"
                  value={editingJudge.judge_number || ''}
                  onChange={(e) => setEditingJudge({ ...editingJudge, judge_number: parseInt(e.target.value) || null })}
                  className="w-full px-4 py-2 rounded-lg bg-white/5 border border-white/20 text-white focus:outline-none focus:ring-2 focus:ring-pink-500"
                  min="1"
                  placeholder="e.g., 1, 2, 3"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">Panel Assignment</label>
                <input
                  type="text"
                  value={editingJudge.panel_assignment || ''}
                  onChange={(e) => setEditingJudge({ ...editingJudge, panel_assignment: e.target.value })}
                  className="w-full px-4 py-2 rounded-lg bg-white/5 border border-white/20 text-white focus:outline-none focus:ring-2 focus:ring-pink-500"
                  placeholder="e.g., Panel A, Main Stage"
                />
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <button
                onClick={() => {
                  setShowEditModal(false);
                  setEditingJudge(null);
                }}
                className="flex-1 px-4 py-2 bg-white/10 text-white rounded-lg hover:bg-white/20 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleUpdateJudge}
                disabled={!editingJudge.name || !editingJudge.email || updateJudge.isPending}
                className="flex-1 px-4 py-2 bg-gradient-to-r from-pink-500 to-purple-500 text-white rounded-lg hover:shadow-lg transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {updateJudge.isPending ? '⏳ Updating...' : '💾 Save Changes'}
              </button>
            </div>
          </div>
        </div>
      )}

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
