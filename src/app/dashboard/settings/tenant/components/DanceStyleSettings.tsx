'use client';

import { useState, useEffect } from 'react';
import { trpc } from '@/lib/trpc';
import { toast } from 'react-hot-toast';

interface DanceStyle {
  name: string;
  description?: string;
}

interface DanceStyleSettingsProps {
  tenantId: string;
  currentSettings: DanceStyle[] | null;
  onSave: () => void;
}

export function DanceStyleSettings({ tenantId, currentSettings, onSave }: DanceStyleSettingsProps) {
  const [styles, setStyles] = useState<DanceStyle[]>(currentSettings || []);
  const [hasChanges, setHasChanges] = useState(false);

  // Use JSON.stringify to avoid infinite loop from object reference changes
  useEffect(() => {
    setStyles(currentSettings || []);
  }, [JSON.stringify(currentSettings)]);

  const updateMutation = trpc.tenantSettings.updateDanceStyles.useMutation({
    onSuccess: () => {
      toast.success('Dance styles updated successfully!');
      setHasChanges(false);
      onSave();
    },
    onError: (error) => {
      toast.error(`Error updating dance styles: ${error.message}`);
    },
  });

  const handleStyleChange = (index: number, field: keyof DanceStyle, value: string) => {
    const updated = [...styles];
    updated[index] = { ...updated[index], [field]: value };
    setStyles(updated);
    setHasChanges(true);
  };

  const handleAddStyle = () => {
    setStyles([...styles, { name: '', description: '' }]);
    setHasChanges(true);
  };

  const handleRemoveStyle = (index: number) => {
    const updated = styles.filter((_, i) => i !== index);
    setStyles(updated);
    setHasChanges(true);
  };

  const handleSave = () => {
    // Filter out empty styles
    const validStyles = styles.filter(style => style.name.trim() !== '');
    updateMutation.mutate({
      tenantId,
      danceStyles: validStyles,
    });
  };

  const handleLoadEmpwrDefaults = () => {
    const empwrStyles: DanceStyle[] = [
      { name: 'Classical Ballet', description: 'Traditional classical ballet technique' },
      { name: 'Acro', description: 'Acrobatic dance combining dance technique with acrobatic elements' },
      { name: 'Modern', description: 'Modern dance technique' },
      { name: 'Tap', description: 'Tap dance with percussion sounds' },
      { name: 'Open', description: 'Open category for contemporary, jazz, lyrical, and other styles' },
      { name: 'Pointe', description: 'Ballet en pointe' },
      { name: 'Production', description: 'Large-scale production numbers' },
    ];
    setStyles(empwrStyles);
    setHasChanges(true);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-white">Dance Styles</h2>
          <p className="text-gray-400 text-sm mt-1">
            Configure dance styles available for routine entries
          </p>
        </div>
        <button
          onClick={handleLoadEmpwrDefaults}
          className="px-4 py-2 bg-purple-500/20 border border-purple-500/30 text-purple-300 rounded-lg hover:bg-purple-500/30 transition-colors text-sm"
        >
          Load EMPWR Defaults
        </button>
      </div>

      {/* Styles Table */}
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-white/10">
              <th className="text-left text-sm font-medium text-gray-300 pb-2 px-2">Style Name</th>
              <th className="text-left text-sm font-medium text-gray-300 pb-2 px-2">Description</th>
              <th className="text-right text-sm font-medium text-gray-300 pb-2 px-2">Actions</th>
            </tr>
          </thead>
          <tbody>
            {styles.map((style, index) => (
              <tr key={index} className="border-b border-white/5">
                <td className="py-3 px-2">
                  <input
                    type="text"
                    value={style.name}
                    onChange={(e) => handleStyleChange(index, 'name', e.target.value)}
                    className="w-full bg-white/5 border border-white/10 rounded px-3 py-2 text-white text-sm focus:outline-none focus:border-purple-500"
                    placeholder="Style name"
                  />
                </td>
                <td className="py-3 px-2">
                  <input
                    type="text"
                    value={style.description || ''}
                    onChange={(e) => handleStyleChange(index, 'description', e.target.value)}
                    className="w-full bg-white/5 border border-white/10 rounded px-3 py-2 text-white text-sm focus:outline-none focus:border-purple-500"
                    placeholder="Optional description"
                  />
                </td>
                <td className="py-3 px-2 text-right">
                  <button
                    onClick={() => handleRemoveStyle(index)}
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
        onClick={handleAddStyle}
        className="px-4 py-2 bg-white/5 border border-white/10 text-white rounded-lg hover:bg-white/10 transition-colors text-sm"
      >
        + Add Dance Style
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
