'use client';

import { useState, useEffect } from 'react';
import { trpc } from '@/lib/trpc';
import { toast } from 'react-hot-toast';

interface ScoreLevel {
  name: string;
  minScore: number;
  maxScore: number;
  color?: string;
}

interface ScoringRubricSettingsProps {
  tenantId: string;
  currentSettings: ScoreLevel[] | null;
  onSave: () => void;
}

export function ScoringRubricSettings({ tenantId, currentSettings, onSave }: ScoringRubricSettingsProps) {
  const [levels, setLevels] = useState<ScoreLevel[]>(currentSettings || []);
  const [hasChanges, setHasChanges] = useState(false);

  useEffect(() => {
    if (currentSettings) {
      setLevels(currentSettings);
    }
  }, [currentSettings]);

  const updateMutation = trpc.tenantSettings.updateScoringRubric.useMutation({
    onSuccess: () => {
      toast.success('Scoring rubric updated successfully!');
      setHasChanges(false);
      onSave();
    },
    onError: (error) => {
      toast.error(`Error updating scoring rubric: ${error.message}`);
    },
  });

  const handleLevelChange = (index: number, field: keyof ScoreLevel, value: string | number) => {
    const updated = [...levels];
    updated[index] = { ...updated[index], [field]: value };
    setLevels(updated);
    setHasChanges(true);
  };

  const handleAddLevel = () => {
    setLevels([...levels, { name: '', minScore: 0, maxScore: 0, color: '' }]);
    setHasChanges(true);
  };

  const handleRemoveLevel = (index: number) => {
    const updated = levels.filter((_, i) => i !== index);
    setLevels(updated);
    setHasChanges(true);
  };

  const handleSave = () => {
    // Validate levels
    const validLevels = levels.filter(level => level.name.trim() !== '');

    // Sort by minScore ascending
    validLevels.sort((a, b) => a.minScore - b.minScore);

    updateMutation.mutate({
      tenantId,
      scoringRubric: validLevels,
    });
  };

  const handleLoadEmpwrDefaults = () => {
    const empwrLevels: ScoreLevel[] = [
      { name: 'Bronze', minScore: 0, maxScore: 84.00, color: '#CD7F32' },
      { name: 'Silver', minScore: 84.00, maxScore: 86.99, color: '#C0C0C0' },
      { name: 'Gold', minScore: 87.00, maxScore: 89.99, color: '#FFD700' },
      { name: 'Titanium', minScore: 90.00, maxScore: 92.99, color: '#878681' },
      { name: 'Platinum', minScore: 93.00, maxScore: 95.99, color: '#E5E4E2' },
      { name: 'Pandora', minScore: 96.00, maxScore: 100.00, color: '#9966FF' },
    ];
    setLevels(empwrLevels);
    setHasChanges(true);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-white">Scoring Rubric</h2>
          <p className="text-gray-400 text-sm mt-1">
            Configure score ranges and award levels for routine judging
          </p>
        </div>
        <button
          onClick={handleLoadEmpwrDefaults}
          className="px-4 py-2 bg-purple-500/20 border border-purple-500/30 text-purple-300 rounded-lg hover:bg-purple-500/30 transition-colors text-sm"
        >
          Load EMPWR Defaults
        </button>
      </div>

      {/* Levels Table */}
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-white/10">
              <th className="text-left text-sm font-medium text-gray-300 pb-2 px-2">Award Level</th>
              <th className="text-left text-sm font-medium text-gray-300 pb-2 px-2">Min Score</th>
              <th className="text-left text-sm font-medium text-gray-300 pb-2 px-2">Max Score</th>
              <th className="text-left text-sm font-medium text-gray-300 pb-2 px-2">Color</th>
              <th className="text-right text-sm font-medium text-gray-300 pb-2 px-2">Actions</th>
            </tr>
          </thead>
          <tbody>
            {levels.map((level, index) => (
              <tr key={index} className="border-b border-white/5">
                <td className="py-3 px-2">
                  <input
                    type="text"
                    value={level.name}
                    onChange={(e) => handleLevelChange(index, 'name', e.target.value)}
                    className="w-full bg-white/5 border border-white/10 rounded px-3 py-2 text-white text-sm focus:outline-none focus:border-purple-500"
                    placeholder="Award name"
                  />
                </td>
                <td className="py-3 px-2">
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    max="100"
                    value={level.minScore}
                    onChange={(e) => handleLevelChange(index, 'minScore', parseFloat(e.target.value) || 0)}
                    className="w-full bg-white/5 border border-white/10 rounded px-3 py-2 text-white text-sm focus:outline-none focus:border-purple-500"
                  />
                </td>
                <td className="py-3 px-2">
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    max="100"
                    value={level.maxScore}
                    onChange={(e) => handleLevelChange(index, 'maxScore', parseFloat(e.target.value) || 0)}
                    className="w-full bg-white/5 border border-white/10 rounded px-3 py-2 text-white text-sm focus:outline-none focus:border-purple-500"
                  />
                </td>
                <td className="py-3 px-2">
                  <div className="flex items-center gap-2">
                    <input
                      type="color"
                      value={level.color || '#FFFFFF'}
                      onChange={(e) => handleLevelChange(index, 'color', e.target.value)}
                      className="w-10 h-8 bg-white/5 border border-white/10 rounded cursor-pointer"
                    />
                    <input
                      type="text"
                      value={level.color || ''}
                      onChange={(e) => handleLevelChange(index, 'color', e.target.value)}
                      className="flex-1 bg-white/5 border border-white/10 rounded px-3 py-2 text-white text-sm focus:outline-none focus:border-purple-500"
                      placeholder="#FFFFFF"
                    />
                  </div>
                </td>
                <td className="py-3 px-2 text-right">
                  <button
                    onClick={() => handleRemoveLevel(index)}
                    className="text-red-400 hover:text-red-300 text-sm"
                  >
                    Remove
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Add Button */}
      <button
        onClick={handleAddLevel}
        className="px-4 py-2 bg-white/5 border border-white/10 text-white rounded-lg hover:bg-white/10 transition-colors text-sm"
      >
        + Add Score Level
      </button>

      {/* Save Button */}
      {hasChanges && (
        <div className="flex justify-end">
          <button
            onClick={handleSave}
            disabled={updateMutation.isPending}
            className="px-6 py-2 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-lg hover:shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {updateMutation.isPending ? 'Saving...' : 'Save Changes'}
          </button>
        </div>
      )}
    </div>
  );
}
