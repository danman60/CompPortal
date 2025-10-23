'use client';

import { useState, useEffect } from 'react';
import { trpc } from '@/lib/trpc';
import { toast } from 'react-hot-toast';

interface AwardCategory {
  categoryName: string;
  topN: number; // e.g., Top 10, Top 3
}

interface AwardsSettingsProps {
  tenantId: string;
  currentSettings: AwardCategory[] | null;
  onSave: () => void;
}

export function AwardsSettings({ tenantId, currentSettings, onSave }: AwardsSettingsProps) {
  const [awards, setAwards] = useState<AwardCategory[]>(currentSettings || []);
  const [hasChanges, setHasChanges] = useState(false);

  // Use JSON.stringify to avoid infinite loop from object reference changes
  useEffect(() => {
    if (currentSettings) {
      setAwards(currentSettings);
    }
  }, [JSON.stringify(currentSettings)]);

  const updateMutation = trpc.tenantSettings.updateAwards.useMutation({
    onSuccess: () => {
      toast.success('Awards updated successfully!');
      setHasChanges(false);
      onSave();
    },
    onError: (error) => {
      toast.error(`Error updating awards: ${error.message}`);
    },
  });

  const handleAwardChange = (index: number, field: keyof AwardCategory, value: string | number) => {
    const updated = [...awards];
    updated[index] = { ...updated[index], [field]: value };
    setAwards(updated);
    setHasChanges(true);
  };

  const handleAddAward = () => {
    setAwards([...awards, { categoryName: '', topN: 3 }]);
    setHasChanges(true);
  };

  const handleRemoveAward = (index: number) => {
    const updated = awards.filter((_, i) => i !== index);
    setAwards(updated);
    setHasChanges(true);
  };

  const handleSave = () => {
    // Filter out empty awards
    const validAwards = awards.filter(award => award.categoryName.trim() !== '' && award.topN > 0);
    updateMutation.mutate({
      tenantId,
      awards: validAwards,
    });
  };

  const handleLoadEmpwrDefaults = () => {
    const empwrAwards: AwardCategory[] = [
      { categoryName: 'Solos', topN: 10 },
      { categoryName: 'Duets/Trios', topN: 3 },
      { categoryName: 'Small Groups', topN: 3 },
      { categoryName: 'Large Groups', topN: 3 },
      { categoryName: 'Lines', topN: 3 },
      { categoryName: 'Super Lines', topN: 3 },
      { categoryName: 'Productions', topN: 3 },
    ];
    setAwards(empwrAwards);
    setHasChanges(true);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-white">Overall Awards</h2>
          <p className="text-gray-400 text-sm mt-1">
            Configure how many top routines receive overall awards per category
          </p>
        </div>
        <button
          onClick={handleLoadEmpwrDefaults}
          className="px-4 py-2 bg-purple-500/20 border border-purple-500/30 text-purple-300 rounded-lg hover:bg-purple-500/30 transition-colors text-sm"
        >
          Load EMPWR Defaults
        </button>
      </div>

      {/* Info Alert */}
      <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-4">
        <p className="text-blue-200 text-sm">
          Overall awards are given to the top-scoring routines in each category across all age divisions and dance styles. For example, "Solos - Top 10" means the 10 highest-scoring solo routines receive overall awards.
        </p>
      </div>

      {/* Awards Table */}
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-white/10">
              <th className="text-left text-sm font-medium text-gray-300 pb-2 px-2">Routine Category</th>
              <th className="text-left text-sm font-medium text-gray-300 pb-2 px-2">Top N Routines</th>
              <th className="text-right text-sm font-medium text-gray-300 pb-2 px-2">Actions</th>
            </tr>
          </thead>
          <tbody>
            {awards.map((award, index) => (
              <tr key={index} className="border-b border-white/5">
                <td className="py-3 px-2">
                  <input
                    type="text"
                    value={award.categoryName}
                    onChange={(e) => handleAwardChange(index, 'categoryName', e.target.value)}
                    className="w-full bg-white/5 border border-white/10 rounded px-3 py-2 text-white text-sm focus:outline-none focus:border-purple-500"
                    placeholder="Category name (e.g., Solos, Duets/Trios)"
                  />
                </td>
                <td className="py-3 px-2">
                  <div className="flex items-center gap-2">
                    <span className="text-gray-400 text-sm">Top</span>
                    <input
                      type="number"
                      min="1"
                      max="20"
                      value={award.topN}
                      onChange={(e) => handleAwardChange(index, 'topN', parseInt(e.target.value) || 1)}
                      className="w-20 bg-white/5 border border-white/10 rounded px-3 py-2 text-white text-sm focus:outline-none focus:border-purple-500"
                    />
                    <span className="text-gray-400 text-sm">routines</span>
                  </div>
                </td>
                <td className="py-3 px-2 text-right">
                  <button
                    onClick={() => handleRemoveAward(index)}
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
        onClick={handleAddAward}
        className="px-4 py-2 bg-white/5 border border-white/10 text-white rounded-lg hover:bg-white/10 transition-colors text-sm"
      >
        + Add Award Category
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
