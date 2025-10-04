'use client';

import { useState } from 'react';
import { trpc } from '@/lib/trpc';

// Define the 7 categories
const CATEGORIES = [
  { id: 'routine_types', label: 'Routine Types', icon: '🎭' },
  { id: 'age_divisions', label: 'Age Divisions', icon: '👥' },
  { id: 'classification_levels', label: 'Classification Levels', icon: '🏆' },
  { id: 'dance_styles', label: 'Dance Styles', icon: '💃' },
  { id: 'time_limits', label: 'Time Limits', icon: '⏱️' },
  { id: 'scoring_rubric', label: 'Scoring Rubric', icon: '📊' },
  { id: 'awards', label: 'Awards', icon: '🥇' },
] as const;

type CategoryId = typeof CATEGORIES[number]['id'];

type Setting = {
  id: string;
  setting_category: string;
  setting_key: string;
  setting_value: any;
  display_order: number;
  is_active: boolean;
  created_at: Date | null;
  updated_at: Date | null;
};

export default function CompetitionSettingsForm() {
  const [activeTab, setActiveTab] = useState<CategoryId>('routine_types');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editValue, setEditValue] = useState<any>(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [newSetting, setNewSetting] = useState({
    key: '',
    value: { label: '', description: '' },
    display_order: 0,
  });

  const utils = trpc.useUtils();

  // Fetch all settings
  const { data: allSettingsData, isLoading } = trpc.settings.getAllSettings.useQuery();

  // Update mutation
  const updateMutation = trpc.settings.updateSettings.useMutation({
    onSuccess: () => {
      utils.settings.getAllSettings.invalidate();
      setEditingId(null);
      setEditValue(null);
    },
  });

  // Create mutation
  const createMutation = trpc.settings.createSetting.useMutation({
    onSuccess: () => {
      utils.settings.getAllSettings.invalidate();
      setShowAddForm(false);
      setNewSetting({ key: '', value: { label: '', description: '' }, display_order: 0 });
    },
  });

  // Delete mutation
  const deleteMutation = trpc.settings.deleteSetting.useMutation({
    onSuccess: () => {
      utils.settings.getAllSettings.invalidate();
    },
  });

  const currentSettings = allSettingsData?.groupedSettings?.[activeTab] || [];

  const handleEdit = (setting: Setting) => {
    setEditingId(setting.id);
    setEditValue(setting.setting_value);
  };

  const handleSaveEdit = (setting: Setting) => {
    // Update the entire category with modified setting
    const updatedSettings = currentSettings.map((s: Setting) =>
      s.id === setting.id
        ? { key: s.setting_key, value: editValue, display_order: s.display_order, is_active: s.is_active }
        : { key: s.setting_key, value: s.setting_value, display_order: s.display_order, is_active: s.is_active }
    );

    updateMutation.mutate({
      category: activeTab,
      settings: updatedSettings,
    });
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    setEditValue(null);
  };

  const handleToggleActive = (setting: Setting) => {
    const updatedSettings = currentSettings.map((s: Setting) =>
      s.id === setting.id
        ? { key: s.setting_key, value: s.setting_value, display_order: s.display_order, is_active: !s.is_active }
        : { key: s.setting_key, value: s.setting_value, display_order: s.display_order, is_active: s.is_active }
    );

    updateMutation.mutate({
      category: activeTab,
      settings: updatedSettings,
    });
  };

  const handleDelete = (id: string) => {
    if (confirm('Are you sure you want to delete this setting?')) {
      deleteMutation.mutate({ id });
    }
  };

  const handleAddNew = () => {
    createMutation.mutate({
      category: activeTab,
      key: newSetting.key,
      value: newSetting.value,
      display_order: newSetting.display_order,
    });
  };

  const handleBatchSave = () => {
    // Save all settings in current category
    const settingsToUpdate = currentSettings.map((setting: Setting) => ({
      key: setting.setting_key,
      value: setting.setting_value,
      display_order: setting.display_order,
      is_active: setting.is_active,
    }));

    updateMutation.mutate({
      category: activeTab,
      settings: settingsToUpdate,
    });
  };

  if (isLoading) {
    return (
      <div className="bg-white/10 backdrop-blur-md rounded-xl border border-white/20 p-6">
        <div className="flex items-center justify-center py-12">
          <div className="text-white text-lg">Loading settings...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white/10 backdrop-blur-md rounded-xl border border-white/20 p-6">
      {/* Tabs */}
      <div className="flex flex-wrap gap-2 mb-6 border-b border-white/20 pb-4">
        {CATEGORIES.map((category) => (
          <button
            key={category.id}
            onClick={() => setActiveTab(category.id)}
            className={`px-4 py-2 rounded-lg font-medium transition-all duration-200 ${
              activeTab === category.id
                ? 'bg-purple-600 text-white shadow-lg'
                : 'bg-white/5 text-white/70 hover:bg-white/10'
            }`}
          >
            {category.icon} {category.label}
          </button>
        ))}
      </div>

      {/* Active Category Header */}
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-white mb-2">
          {CATEGORIES.find((c) => c.id === activeTab)?.icon}{' '}
          {CATEGORIES.find((c) => c.id === activeTab)?.label}
        </h2>
        <p className="text-white/70">
          Manage {CATEGORIES.find((c) => c.id === activeTab)?.label.toLowerCase()} for your competition
        </p>
      </div>

      {/* Settings Table */}
      <div className="bg-white/5 rounded-lg overflow-hidden mb-6">
        <table className="w-full">
          <thead className="bg-white/10">
            <tr>
              <th className="px-4 py-3 text-left text-white font-semibold">Label</th>
              <th className="px-4 py-3 text-left text-white font-semibold">Display Order</th>
              <th className="px-4 py-3 text-left text-white font-semibold">Active</th>
              <th className="px-4 py-3 text-right text-white font-semibold">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/10">
            {currentSettings.length === 0 ? (
              <tr>
                <td colSpan={4} className="px-4 py-8 text-center text-white/60">
                  No settings found for this category. Add a new one to get started.
                </td>
              </tr>
            ) : (
              currentSettings.map((setting: Setting) => (
                <tr key={setting.id} className="hover:bg-white/5 transition-colors">
                  <td className="px-4 py-3">
                    {editingId === setting.id ? (
                      <input
                        type="text"
                        value={
                          typeof editValue === 'object' && editValue?.label
                            ? editValue.label
                            : editValue
                        }
                        onChange={(e) =>
                          setEditValue(
                            typeof editValue === 'object'
                              ? { ...editValue, label: e.target.value }
                              : e.target.value
                          )
                        }
                        className="bg-white/10 border border-white/20 rounded px-3 py-1 text-white w-full"
                      />
                    ) : (
                      <span className="text-white">
                        {typeof setting.setting_value === 'object' && setting.setting_value?.label
                          ? setting.setting_value.label
                          : JSON.stringify(setting.setting_value)}
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <span className="text-white/80">{setting.display_order}</span>
                  </td>
                  <td className="px-4 py-3">
                    <button
                      onClick={() => handleToggleActive(setting)}
                      className={`px-3 py-1 rounded-full text-xs font-semibold ${
                        setting.is_active
                          ? 'bg-green-500/20 text-green-300'
                          : 'bg-red-500/20 text-red-300'
                      }`}
                    >
                      {setting.is_active ? '✓ Active' : '✗ Inactive'}
                    </button>
                  </td>
                  <td className="px-4 py-3 text-right space-x-2">
                    {editingId === setting.id ? (
                      <>
                        <button
                          onClick={() => handleSaveEdit(setting)}
                          disabled={updateMutation.isPending}
                          className="px-3 py-1 bg-green-600 hover:bg-green-700 text-white rounded text-sm disabled:opacity-50"
                        >
                          Save
                        </button>
                        <button
                          onClick={handleCancelEdit}
                          className="px-3 py-1 bg-gray-600 hover:bg-gray-700 text-white rounded text-sm"
                        >
                          Cancel
                        </button>
                      </>
                    ) : (
                      <>
                        <button
                          onClick={() => handleEdit(setting)}
                          className="px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded text-sm"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => handleDelete(setting.id)}
                          disabled={deleteMutation.isPending}
                          className="px-3 py-1 bg-red-600 hover:bg-red-700 text-white rounded text-sm disabled:opacity-50"
                        >
                          Delete
                        </button>
                      </>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Add New Setting */}
      {showAddForm ? (
        <div className="bg-white/5 rounded-lg p-4 mb-6 border border-white/20">
          <h3 className="text-lg font-semibold text-white mb-4">Add New Setting</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
            <div>
              <label className="block text-white/80 text-sm mb-2">Key</label>
              <input
                type="text"
                value={newSetting.key}
                onChange={(e) => setNewSetting({ ...newSetting, key: e.target.value })}
                className="bg-white/10 border border-white/20 rounded px-3 py-2 text-white w-full"
                placeholder="e.g., solo"
              />
            </div>
            <div>
              <label className="block text-white/80 text-sm mb-2">Label</label>
              <input
                type="text"
                value={newSetting.value.label || ''}
                onChange={(e) =>
                  setNewSetting({
                    ...newSetting,
                    value: { ...newSetting.value, label: e.target.value },
                  })
                }
                className="bg-white/10 border border-white/20 rounded px-3 py-2 text-white w-full"
                placeholder="e.g., Solo"
              />
            </div>
            <div>
              <label className="block text-white/80 text-sm mb-2">Display Order</label>
              <input
                type="number"
                value={newSetting.display_order}
                onChange={(e) =>
                  setNewSetting({ ...newSetting, display_order: parseInt(e.target.value) || 0 })
                }
                className="bg-white/10 border border-white/20 rounded px-3 py-2 text-white w-full"
              />
            </div>
          </div>
          <div className="flex gap-2">
            <button
              onClick={handleAddNew}
              disabled={createMutation.isPending || !newSetting.key || !newSetting.value.label}
              className="px-6 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg disabled:opacity-50"
            >
              {createMutation.isPending ? 'Adding...' : 'Add Setting'}
            </button>
            <button
              onClick={() => {
                setShowAddForm(false);
                setNewSetting({ key: '', value: { label: '', description: '' }, display_order: 0 });
              }}
              className="px-6 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded-lg"
            >
              Cancel
            </button>
          </div>
        </div>
      ) : (
        <button
          onClick={() => setShowAddForm(true)}
          className="mb-6 px-6 py-3 bg-white/10 hover:bg-white/20 text-white rounded-lg border border-white/20 font-medium"
        >
          + Add New Setting
        </button>
      )}

      {/* Action Buttons */}
      <div className="flex gap-4">
        <button
          onClick={handleBatchSave}
          disabled={updateMutation.isPending}
          className="px-6 py-3 bg-purple-600 hover:bg-purple-700 text-white rounded-lg font-medium disabled:opacity-50"
        >
          {updateMutation.isPending ? 'Saving...' : 'Save Changes'}
        </button>

        {/* Success/Error Messages */}
        {updateMutation.isSuccess && (
          <div className="flex items-center text-green-300 bg-green-500/20 px-4 py-2 rounded-lg">
            ✓ Settings updated successfully
          </div>
        )}
        {updateMutation.isError && (
          <div className="flex items-center text-red-300 bg-red-500/20 px-4 py-2 rounded-lg">
            ✗ Error updating settings
          </div>
        )}
      </div>
    </div>
  );
}
