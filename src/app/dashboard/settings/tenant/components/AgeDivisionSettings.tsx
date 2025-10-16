'use client';

import { useState, useEffect } from 'react';
import { trpc } from '@/lib/trpc';
import { toast } from 'react-hot-toast';
import { EMPWR_AGE_DIVISIONS } from '@/lib/empwrDefaults';

interface AgeDivision {
  name: string;
  shortName: string;
  minAge: number;
  maxAge: number;
}

interface AgeDivisionSettingsProps {
  tenantId: string;
  currentSettings: { divisions: AgeDivision[] } | null;
  onSave: () => void;
}

export function AgeDivisionSettings({ tenantId, currentSettings, onSave }: AgeDivisionSettingsProps) {
  const [divisions, setDivisions] = useState<AgeDivision[]>(
    currentSettings?.divisions || EMPWR_AGE_DIVISIONS.divisions
  );
  const [hasChanges, setHasChanges] = useState(false);

  // Reset divisions when currentSettings changes
  useEffect(() => {
    setDivisions(currentSettings?.divisions || EMPWR_AGE_DIVISIONS.divisions);
    setHasChanges(false);
  }, [currentSettings]);

  const updateMutation = trpc.tenantSettings.updateAgeDivisions.useMutation({
    onSuccess: () => {
      onSave();
      setHasChanges(false);
      toast.success('Age divisions updated successfully!');
    },
    onError: (error) => {
      toast.error(`Error updating age divisions: ${error.message}`);
    },
  });

  const handleSave = () => {
    updateMutation.mutate({
      tenantId,
      divisions,
    });
  };

  const handleReset = () => {
    setDivisions(currentSettings?.divisions || EMPWR_AGE_DIVISIONS.divisions);
    setHasChanges(false);
  };

  const handleAddDivision = () => {
    setDivisions([
      ...divisions,
      { name: '', shortName: '', minAge: 0, maxAge: 0 },
    ]);
    setHasChanges(true);
  };

  const handleRemoveDivision = (index: number) => {
    setDivisions(divisions.filter((_, i) => i !== index));
    setHasChanges(true);
  };

  const handleUpdateDivision = (index: number, field: keyof AgeDivision, value: string | number) => {
    const updated = [...divisions];
    updated[index] = {
      ...updated[index],
      [field]: value,
    };
    setDivisions(updated);
    setHasChanges(true);
  };

  const isValid = divisions.every(d => d.name && d.shortName && d.minAge >= 0 && d.maxAge > d.minAge);

  return (
    <div className="bg-white/5 backdrop-blur-md rounded-xl border border-white/10 p-6 space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-white mb-2">Age Divisions</h2>
        <p className="text-gray-300">
          Configure age divisions for competition entries. Dancers will be grouped based on their age at the time of competition.
        </p>
      </div>

      {/* Divisions Table */}
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-white/10">
              <th className="text-left text-sm font-medium text-gray-300 pb-2 px-2">Division Name</th>
              <th className="text-left text-sm font-medium text-gray-300 pb-2 px-2">Short</th>
              <th className="text-left text-sm font-medium text-gray-300 pb-2 px-2">Min Age</th>
              <th className="text-left text-sm font-medium text-gray-300 pb-2 px-2">Max Age</th>
              <th className="text-right text-sm font-medium text-gray-300 pb-2 px-2">Actions</th>
            </tr>
          </thead>
          <tbody>
            {divisions.map((division, index) => (
              <tr key={index} className="border-b border-white/5">
                <td className="py-3 px-2">
                  <input
                    type="text"
                    value={division.name}
                    onChange={(e) => handleUpdateDivision(index, 'name', e.target.value)}
                    className="w-full px-3 py-2 bg-white/5 border border-white/20 rounded-lg text-white placeholder-gray-400 focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                    placeholder="e.g., Junior"
                  />
                </td>
                <td className="py-3 px-2">
                  <input
                    type="text"
                    value={division.shortName}
                    onChange={(e) => handleUpdateDivision(index, 'shortName', e.target.value)}
                    className="w-20 px-3 py-2 bg-white/5 border border-white/20 rounded-lg text-white placeholder-gray-400 focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                    placeholder="J"
                    maxLength={2}
                  />
                </td>
                <td className="py-3 px-2">
                  <input
                    type="number"
                    value={division.minAge}
                    onChange={(e) => handleUpdateDivision(index, 'minAge', parseInt(e.target.value) || 0)}
                    className="w-24 px-3 py-2 bg-white/5 border border-white/20 rounded-lg text-white placeholder-gray-400 focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                    min={0}
                  />
                </td>
                <td className="py-3 px-2">
                  <input
                    type="number"
                    value={division.maxAge}
                    onChange={(e) => handleUpdateDivision(index, 'maxAge', parseInt(e.target.value) || 0)}
                    className="w-24 px-3 py-2 bg-white/5 border border-white/20 rounded-lg text-white placeholder-gray-400 focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                    min={0}
                  />
                </td>
                <td className="py-3 px-2 text-right">
                  <button
                    onClick={() => handleRemoveDivision(index)}
                    className="px-3 py-1 text-red-400 hover:text-red-300 hover:bg-red-500/10 rounded transition-colors"
                  >
                    Remove
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Add Division Button */}
      <button
        onClick={handleAddDivision}
        className="px-4 py-2 bg-white/10 border border-white/20 text-white rounded-lg hover:bg-white/20 transition-colors"
      >
        + Add Division
      </button>

      {/* Validation Warning */}
      {!isValid && (
        <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-lg p-4">
          <p className="text-yellow-200 text-sm">
            Please ensure all divisions have a name, short name, and valid age range (max age must be greater than min age).
          </p>
        </div>
      )}

      {/* Action Buttons */}
      <div className="flex gap-3 pt-4">
        <button
          onClick={handleSave}
          disabled={!hasChanges || updateMutation.isPending || !isValid}
          className="px-6 py-3 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-lg hover:shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed font-semibold"
        >
          {updateMutation.isPending ? 'Saving...' : 'Save Changes'}
        </button>

        <button
          onClick={handleReset}
          disabled={!hasChanges || updateMutation.isPending}
          className="px-6 py-3 bg-white/10 border border-white/20 text-white rounded-lg hover:bg-white/20 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Reset
        </button>
      </div>

      {!hasChanges && (
        <p className="text-sm text-gray-400">
          No unsaved changes
        </p>
      )}
    </div>
  );
}
