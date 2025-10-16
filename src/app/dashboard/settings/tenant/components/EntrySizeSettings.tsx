'use client';

import { useState, useEffect } from 'react';
import { trpc } from '@/lib/trpc';
import { toast } from 'react-hot-toast';
import { EMPWR_ENTRY_SIZE_CATEGORIES } from '@/lib/empwrDefaults';

interface EntrySizeCategory {
  name: string;
  minDancers: number;
  maxDancers: number;
  baseFee?: number;
  perDancerFee?: number;
  description?: string;
}

interface EntrySizeSettingsProps {
  tenantId: string;
  currentSettings: { categories: EntrySizeCategory[] } | null;
  onSave: () => void;
}

export function EntrySizeSettings({ tenantId, currentSettings, onSave }: EntrySizeSettingsProps) {
  const [categories, setCategories] = useState<EntrySizeCategory[]>(
    currentSettings?.categories || EMPWR_ENTRY_SIZE_CATEGORIES.categories
  );
  const [hasChanges, setHasChanges] = useState(false);

  // Reset categories when currentSettings changes
  useEffect(() => {
    setCategories(currentSettings?.categories || EMPWR_ENTRY_SIZE_CATEGORIES.categories);
    setHasChanges(false);
  }, [currentSettings]);

  const updateMutation = trpc.tenantSettings.updateEntrySizeCategories.useMutation({
    onSuccess: () => {
      onSave();
      setHasChanges(false);
      toast.success('Entry size categories updated successfully!');
    },
    onError: (error) => {
      toast.error(`Error updating entry size categories: ${error.message}`);
    },
  });

  const handleSave = () => {
    updateMutation.mutate({
      tenantId,
      categories,
    });
  };

  const handleReset = () => {
    setCategories(currentSettings?.categories || EMPWR_ENTRY_SIZE_CATEGORIES.categories);
    setHasChanges(false);
  };

  const handleAddCategory = () => {
    setCategories([
      ...categories,
      { name: '', minDancers: 1, maxDancers: 1, perDancerFee: 0, description: '' },
    ]);
    setHasChanges(true);
  };

  const handleRemoveCategory = (index: number) => {
    setCategories(categories.filter((_, i) => i !== index));
    setHasChanges(true);
  };

  const handleUpdateCategory = (index: number, field: keyof EntrySizeCategory, value: string | number | undefined) => {
    const updated = [...categories];
    updated[index] = {
      ...updated[index],
      [field]: value,
    };
    setCategories(updated);
    setHasChanges(true);
  };

  const isValid = categories.every(c =>
    c.name &&
    c.minDancers > 0 &&
    c.maxDancers >= c.minDancers &&
    (c.baseFee !== undefined || c.perDancerFee !== undefined)
  );

  return (
    <div className="bg-white/5 backdrop-blur-md rounded-xl border border-white/10 p-6 space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-white mb-2">Entry Size Categories</h2>
        <p className="text-gray-300">
          Configure group size categories for competition entries. Each category defines the number of dancers and associated fees.
        </p>
      </div>

      {/* Categories Table */}
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-white/10">
              <th className="text-left text-sm font-medium text-gray-300 pb-2 px-2">Category</th>
              <th className="text-left text-sm font-medium text-gray-300 pb-2 px-2">Min</th>
              <th className="text-left text-sm font-medium text-gray-300 pb-2 px-2">Max</th>
              <th className="text-left text-sm font-medium text-gray-300 pb-2 px-2">Base Fee</th>
              <th className="text-left text-sm font-medium text-gray-300 pb-2 px-2">Per Dancer</th>
              <th className="text-left text-sm font-medium text-gray-300 pb-2 px-2">Description</th>
              <th className="text-right text-sm font-medium text-gray-300 pb-2 px-2">Actions</th>
            </tr>
          </thead>
          <tbody>
            {categories.map((category, index) => (
              <tr key={index} className="border-b border-white/5">
                <td className="py-3 px-2">
                  <input
                    type="text"
                    value={category.name}
                    onChange={(e) => handleUpdateCategory(index, 'name', e.target.value)}
                    className="w-full px-3 py-2 bg-white/5 border border-white/20 rounded-lg text-white placeholder-gray-400 focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                    placeholder="e.g., Solo"
                  />
                </td>
                <td className="py-3 px-2">
                  <input
                    type="number"
                    value={category.minDancers}
                    onChange={(e) => handleUpdateCategory(index, 'minDancers', parseInt(e.target.value) || 1)}
                    className="w-20 px-3 py-2 bg-white/5 border border-white/20 rounded-lg text-white placeholder-gray-400 focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                    min={1}
                  />
                </td>
                <td className="py-3 px-2">
                  <input
                    type="number"
                    value={category.maxDancers}
                    onChange={(e) => handleUpdateCategory(index, 'maxDancers', parseInt(e.target.value) || 1)}
                    className="w-20 px-3 py-2 bg-white/5 border border-white/20 rounded-lg text-white placeholder-gray-400 focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                    min={1}
                  />
                </td>
                <td className="py-3 px-2">
                  <input
                    type="number"
                    value={category.baseFee || ''}
                    onChange={(e) => handleUpdateCategory(index, 'baseFee', e.target.value ? parseFloat(e.target.value) : undefined)}
                    className="w-24 px-3 py-2 bg-white/5 border border-white/20 rounded-lg text-white placeholder-gray-400 focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                    placeholder="$"
                    min={0}
                    step={0.01}
                  />
                </td>
                <td className="py-3 px-2">
                  <input
                    type="number"
                    value={category.perDancerFee || ''}
                    onChange={(e) => handleUpdateCategory(index, 'perDancerFee', e.target.value ? parseFloat(e.target.value) : undefined)}
                    className="w-24 px-3 py-2 bg-white/5 border border-white/20 rounded-lg text-white placeholder-gray-400 focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                    placeholder="$"
                    min={0}
                    step={0.01}
                  />
                </td>
                <td className="py-3 px-2">
                  <input
                    type="text"
                    value={category.description || ''}
                    onChange={(e) => handleUpdateCategory(index, 'description', e.target.value)}
                    className="w-full px-3 py-2 bg-white/5 border border-white/20 rounded-lg text-white placeholder-gray-400 focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                    placeholder="Optional"
                  />
                </td>
                <td className="py-3 px-2 text-right">
                  <button
                    onClick={() => handleRemoveCategory(index)}
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

      {/* Add Category Button */}
      <button
        onClick={handleAddCategory}
        className="px-4 py-2 bg-white/10 border border-white/20 text-white rounded-lg hover:bg-white/20 transition-colors"
      >
        + Add Category
      </button>

      {/* Help Text */}
      <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-4">
        <p className="text-blue-200 text-sm">
          <strong>Tip:</strong> Use Base Fee for fixed-price categories (like Solo) or Per Dancer Fee for categories with variable pricing (like Groups).
        </p>
      </div>

      {/* Validation Warning */}
      {!isValid && (
        <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-lg p-4">
          <p className="text-yellow-200 text-sm">
            Please ensure all categories have a name, valid dancer range (max ≥ min), and at least one fee type (base or per dancer).
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
