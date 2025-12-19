'use client';

import { useState, useEffect } from 'react';
import { Modal } from '@/components/ui/Modal';
import { trpc } from '@/lib/trpc';
import { toast } from 'react-hot-toast';

interface RoutineEditModalProps {
  isOpen: boolean;
  onClose: () => void;
  routineId: string | null;
  tenantId: string;
  onSaved?: () => void;
}

type TabId = 'core' | 'classification' | 'timing' | 'music' | 'notes' | 'flags' | 'fees' | 'dancers';

/**
 * RoutineEditModal - CD Admin Override Modal
 *
 * Allows Competition Director to edit ANY field on a routine
 * without notifying Studio Director.
 *
 * Features:
 * - Tabbed interface for 32+ editable fields
 * - All classification dropdowns (category, classification, age_group, entry_size)
 * - Age override capability
 * - Music info editing
 * - Competition flags
 * - Fee adjustments
 * - Dancer management
 */
export function RoutineEditModal({
  isOpen,
  onClose,
  routineId,
  tenantId,
  onSaved,
}: RoutineEditModalProps) {
  const [activeTab, setActiveTab] = useState<TabId>('core');
  const [formData, setFormData] = useState<Record<string, any>>({});
  const [hasChanges, setHasChanges] = useState(false);

  // Fetch entry data (tenantId comes from ctx)
  const { data: entry, isLoading, refetch } = trpc.entry.getById.useQuery(
    { id: routineId! },
    { enabled: isOpen && !!routineId }
  );

  // Fetch all lookup data at once (tenant-aware via ctx)
  const { data: lookupData } = trpc.lookup.getAllForEntry.useQuery(
    undefined,
    { enabled: isOpen }
  );

  // Extract lookup arrays
  const categories = lookupData?.categories || [];
  const classifications = lookupData?.classifications || [];
  const ageGroups = lookupData?.ageGroups || [];
  const entrySizes = lookupData?.entrySizeCategories || [];

  // Update mutation
  const updateMutation = trpc.entry.update.useMutation({
    onSuccess: () => {
      toast.success('Routine updated successfully');
      setHasChanges(false);
      onSaved?.();
      refetch();
    },
    onError: (error) => {
      toast.error(`Failed to update: ${error.message}`);
    },
  });

  // Initialize form data when entry loads
  useEffect(() => {
    if (entry) {
      setFormData({
        // Core
        title: entry.title || '',
        choreographer: entry.choreographer || '',
        // Classification
        category_id: entry.category_id || '',
        classification_id: entry.classification_id || '',
        age_group_id: entry.age_group_id || '',
        entry_size_category_id: entry.entry_size_category_id || '',
        // Age
        routine_age: entry.routine_age || '',
        // Timing
        routine_length_minutes: entry.routine_length_minutes || '',
        routine_length_seconds: entry.routine_length_seconds || '',
        extended_time_requested: entry.extended_time_requested || false,
        // Music
        music_title: entry.music_title || '',
        music_artist: entry.music_artist || '',
        music_file_url: entry.music_file_url || '',
        music_exempt: entry.music_exempt || false,
        music_exempt_reason: entry.music_exempt_reason || '',
        // Notes
        special_requirements: entry.special_requirements || '',
        props_required: entry.props_required || '',
        accessibility_needs: entry.accessibility_needs || '',
        costume_description: entry.costume_description || '',
        scheduling_notes: entry.scheduling_notes || '',
        // Flags
        is_title_upgrade: entry.is_title_upgrade || false,
        is_late_entry: entry.is_late_entry || false,
        entry_suffix: entry.entry_suffix || '',
        is_trophy_helper: entry.is_trophy_helper || false,
        is_glow_off_round: entry.is_glow_off_round || false,
        is_overall_competition: entry.is_overall_competition || false,
        is_improvisation: entry.is_improvisation || false,
        is_title_interview: entry.is_title_interview || false,
        // Fees
        entry_fee: entry.entry_fee || '',
        late_fee: entry.late_fee || '',
        total_fee: entry.total_fee || '',
        // Status
        status: entry.status || 'draft',
      });
      setHasChanges(false);
    }
  }, [entry]);

  const updateField = (field: string, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    setHasChanges(true);
  };

  const handleSave = async () => {
    if (!routineId) return;

    // Build update payload with only changed fields
    const payload: Record<string, any> = {
      id: routineId,
      tenantId,
      adminOverride: true, // Flag to skip SD notification
    };

    // Add all form fields
    Object.entries(formData).forEach(([key, value]) => {
      // Convert empty strings to null for optional fields
      if (value === '') {
        payload[key] = null;
      } else if (key.includes('fee') && value !== null) {
        payload[key] = parseFloat(value);
      } else if (key === 'routine_age' && value !== null && value !== '') {
        payload[key] = parseInt(value);
      } else if (key === 'routine_length_minutes' && value !== null && value !== '') {
        payload[key] = parseInt(value);
      } else if (key === 'routine_length_seconds' && value !== null && value !== '') {
        payload[key] = parseInt(value);
      } else {
        payload[key] = value;
      }
    });

    updateMutation.mutate(payload as any);
  };

  const tabs: { id: TabId; label: string; icon: string }[] = [
    { id: 'core', label: 'Core', icon: '📝' },
    { id: 'classification', label: 'Classification', icon: '🏷️' },
    { id: 'timing', label: 'Timing', icon: '⏱️' },
    { id: 'music', label: 'Music', icon: '🎵' },
    { id: 'notes', label: 'Notes', icon: '📋' },
    { id: 'flags', label: 'Flags', icon: '🚩' },
    { id: 'fees', label: 'Fees', icon: '💰' },
    { id: 'dancers', label: 'Dancers', icon: '👯' },
  ];

  if (!isOpen) return null;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={entry ? `Edit: ${entry.title}` : 'Loading...'}
      description={entry ? `${entry.studios?.name || 'Unknown Studio'} • Entry #${entry.entry_number || 'N/A'}` : ''}
      size="4xl"
      footer={
        <>
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-lg text-gray-400 hover:text-white hover:bg-white/10 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={!hasChanges || updateMutation.isPending}
            className="px-6 py-2 rounded-lg bg-gradient-to-r from-purple-600 to-purple-500 hover:from-purple-500 hover:to-purple-400 text-white font-semibold disabled:opacity-50 disabled:cursor-not-allowed transition-all"
          >
            {updateMutation.isPending ? 'Saving...' : 'Save Changes'}
          </button>
        </>
      }
    >
      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-500"></div>
          <span className="ml-3 text-white/60">Loading routine...</span>
        </div>
      ) : (
        <div className="space-y-4">
          {/* Tab Navigation */}
          <div className="flex flex-wrap gap-1 p-1 bg-white/5 rounded-xl border border-white/10">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`px-3 py-2 rounded-lg text-sm font-medium transition-all ${
                  activeTab === tab.id
                    ? 'bg-gradient-to-r from-purple-600 to-purple-500 text-white shadow-lg'
                    : 'text-white/60 hover:text-white hover:bg-white/10'
                }`}
              >
                <span className="mr-1">{tab.icon}</span>
                {tab.label}
              </button>
            ))}
          </div>

          {/* Tab Content */}
          <div className="bg-white/5 rounded-xl border border-white/10 p-6">
            {/* CORE TAB */}
            {activeTab === 'core' && (
              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-white mb-4">Core Information</h3>

                {/* Title */}
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Routine Title <span className="text-red-400">*</span>
                  </label>
                  <input
                    type="text"
                    value={formData.title || ''}
                    onChange={(e) => updateField('title', e.target.value)}
                    className="w-full px-4 py-2 bg-white/5 border border-white/20 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-purple-500/50 focus:border-purple-500"
                    placeholder="Enter routine title"
                  />
                </div>

                {/* Choreographer */}
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Choreographer
                  </label>
                  <input
                    type="text"
                    value={formData.choreographer || ''}
                    onChange={(e) => updateField('choreographer', e.target.value)}
                    className="w-full px-4 py-2 bg-white/5 border border-white/20 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-purple-500/50 focus:border-purple-500"
                    placeholder="Enter choreographer name"
                  />
                </div>

                {/* Status */}
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Status
                  </label>
                  <select
                    value={formData.status || 'draft'}
                    onChange={(e) => updateField('status', e.target.value)}
                    className="w-full px-4 py-2 bg-gray-900 border border-white/20 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500/50"
                  >
                    <option value="draft">Draft</option>
                    <option value="submitted">Submitted</option>
                    <option value="summarized">Summarized</option>
                    <option value="cancelled">Cancelled</option>
                  </select>
                </div>

                {/* Read-only Info */}
                <div className="mt-6 p-4 bg-white/5 rounded-lg border border-white/10">
                  <h4 className="text-sm font-medium text-gray-400 mb-2">Read-Only Info</h4>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="text-gray-500">Studio:</span>
                      <span className="ml-2 text-white">{entry?.studios?.name || 'N/A'}</span>
                    </div>
                    <div>
                      <span className="text-gray-500">Entry #:</span>
                      <span className="ml-2 text-white">{entry?.entry_number || 'N/A'}</span>
                    </div>
                    <div>
                      <span className="text-gray-500">Created:</span>
                      <span className="ml-2 text-white">
                        {entry?.created_at ? new Date(entry.created_at).toLocaleDateString() : 'N/A'}
                      </span>
                    </div>
                    <div>
                      <span className="text-gray-500">Scheduled:</span>
                      <span className="ml-2 text-white">
                        {entry?.is_scheduled ? `${entry.scheduled_day} #${entry.schedule_sequence}` : 'Not scheduled'}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* CLASSIFICATION TAB */}
            {activeTab === 'classification' && (
              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-white mb-4">Classification</h3>

                <div className="grid grid-cols-2 gap-4">
                  {/* Dance Category */}
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      Dance Category <span className="text-red-400">*</span>
                    </label>
                    <select
                      value={formData.category_id || ''}
                      onChange={(e) => updateField('category_id', e.target.value)}
                      className="w-full px-4 py-2 bg-gray-900 border border-white/20 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500/50"
                    >
                      <option value="">Select category</option>
                      {categories?.map((cat: any) => (
                        <option key={cat.id} value={cat.id}>{cat.name}</option>
                      ))}
                    </select>
                  </div>

                  {/* Classification (Skill Level) */}
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      Classification <span className="text-red-400">*</span>
                    </label>
                    <select
                      value={formData.classification_id || ''}
                      onChange={(e) => updateField('classification_id', e.target.value)}
                      className="w-full px-4 py-2 bg-gray-900 border border-white/20 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500/50"
                    >
                      <option value="">Select classification</option>
                      {classifications?.map((cls: any) => (
                        <option key={cls.id} value={cls.id}>{cls.name}</option>
                      ))}
                    </select>
                  </div>

                  {/* Age Group */}
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      Age Division <span className="text-red-400">*</span>
                    </label>
                    <select
                      value={formData.age_group_id || ''}
                      onChange={(e) => updateField('age_group_id', e.target.value)}
                      className="w-full px-4 py-2 bg-gray-900 border border-white/20 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500/50"
                    >
                      <option value="">Select age division</option>
                      {ageGroups?.map((ag: any) => (
                        <option key={ag.id} value={ag.id}>{ag.name}</option>
                      ))}
                    </select>
                  </div>

                  {/* Entry Size */}
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      Entry Size <span className="text-red-400">*</span>
                    </label>
                    <select
                      value={formData.entry_size_category_id || ''}
                      onChange={(e) => updateField('entry_size_category_id', e.target.value)}
                      className="w-full px-4 py-2 bg-gray-900 border border-white/20 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500/50"
                    >
                      <option value="">Select size</option>
                      {entrySizes?.map((sz: any) => (
                        <option key={sz.id} value={sz.id}>{sz.name}</option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Age Override Section */}
                <div className="mt-6 p-4 bg-purple-900/20 rounded-lg border border-purple-500/30">
                  <h4 className="text-sm font-semibold text-purple-300 mb-3">Age Override</h4>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-2">
                        Routine Age (Override)
                      </label>
                      <input
                        type="number"
                        min="5"
                        max="99"
                        value={formData.routine_age || ''}
                        onChange={(e) => updateField('routine_age', e.target.value)}
                        className="w-full px-4 py-2 bg-white/5 border border-white/20 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-purple-500/50"
                        placeholder="Leave blank for calculated"
                      />
                    </div>
                    <div className="flex items-end">
                      <div className="text-sm text-gray-400">
                        <span className="block">Calculated from dancers:</span>
                        <span className="text-lg font-semibold text-white">
                          {entry?.routine_age || 'N/A'}
                        </span>
                        {entry?.age_changed && (
                          <span className="ml-2 text-yellow-400 text-xs">⚠️ Age was overridden</span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* TIMING TAB */}
            {activeTab === 'timing' && (
              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-white mb-4">Duration & Timing</h3>

                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      Minutes
                    </label>
                    <input
                      type="number"
                      min="0"
                      max="10"
                      value={formData.routine_length_minutes || ''}
                      onChange={(e) => updateField('routine_length_minutes', e.target.value)}
                      className="w-full px-4 py-2 bg-white/5 border border-white/20 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-purple-500/50"
                      placeholder="0"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      Seconds
                    </label>
                    <input
                      type="number"
                      min="0"
                      max="59"
                      value={formData.routine_length_seconds || ''}
                      onChange={(e) => updateField('routine_length_seconds', e.target.value)}
                      className="w-full px-4 py-2 bg-white/5 border border-white/20 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-purple-500/50"
                      placeholder="0"
                    />
                  </div>
                  <div className="flex items-end">
                    <label className="flex items-center gap-3 cursor-pointer p-2 rounded-lg hover:bg-white/5">
                      <input
                        type="checkbox"
                        checked={formData.extended_time_requested || false}
                        onChange={(e) => updateField('extended_time_requested', e.target.checked)}
                        className="w-5 h-5 rounded border-white/20 bg-white/5 text-purple-500 focus:ring-purple-500/50"
                      />
                      <span className="text-white">Extended Time</span>
                    </label>
                  </div>
                </div>

                {/* MP3 Duration Info */}
                {entry?.mp3_duration_ms && (
                  <div className="mt-4 p-3 bg-white/5 rounded-lg border border-white/10">
                    <span className="text-sm text-gray-400">MP3 Duration: </span>
                    <span className="text-white font-medium">
                      {Math.floor(entry.mp3_duration_ms / 60000)}:{String(Math.floor((entry.mp3_duration_ms % 60000) / 1000)).padStart(2, '0')}
                    </span>
                    {entry.mp3_validated && <span className="ml-2 text-green-400">✓ Validated</span>}
                  </div>
                )}
              </div>
            )}

            {/* MUSIC TAB */}
            {activeTab === 'music' && (
              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-white mb-4">Music Information</h3>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      Song Title
                    </label>
                    <input
                      type="text"
                      value={formData.music_title || ''}
                      onChange={(e) => updateField('music_title', e.target.value)}
                      className="w-full px-4 py-2 bg-white/5 border border-white/20 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-purple-500/50"
                      placeholder="Enter song title"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      Artist
                    </label>
                    <input
                      type="text"
                      value={formData.music_artist || ''}
                      onChange={(e) => updateField('music_artist', e.target.value)}
                      className="w-full px-4 py-2 bg-white/5 border border-white/20 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-purple-500/50"
                      placeholder="Enter artist name"
                    />
                  </div>
                </div>

                {/* Music File URL */}
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Music File URL
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={formData.music_file_url || ''}
                      onChange={(e) => updateField('music_file_url', e.target.value)}
                      className="flex-1 px-4 py-2 bg-white/5 border border-white/20 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-purple-500/50"
                      placeholder="https://..."
                    />
                    {formData.music_file_url && (
                      <a
                        href={formData.music_file_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="px-4 py-2 bg-white/10 hover:bg-white/20 rounded-lg text-white transition-colors"
                      >
                        ▶️ Play
                      </a>
                    )}
                  </div>
                </div>

                {/* Music Exempt */}
                <div className="mt-4 p-4 bg-yellow-900/20 rounded-lg border border-yellow-500/30">
                  <label className="flex items-center gap-3 cursor-pointer mb-3">
                    <input
                      type="checkbox"
                      checked={formData.music_exempt || false}
                      onChange={(e) => updateField('music_exempt', e.target.checked)}
                      className="w-5 h-5 rounded border-white/20 bg-white/5 text-yellow-500 focus:ring-yellow-500/50"
                    />
                    <span className="text-yellow-300 font-medium">Music Exempt</span>
                  </label>
                  {formData.music_exempt && (
                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-2">
                        Exempt Reason
                      </label>
                      <input
                        type="text"
                        value={formData.music_exempt_reason || ''}
                        onChange={(e) => updateField('music_exempt_reason', e.target.value)}
                        className="w-full px-4 py-2 bg-white/5 border border-white/20 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-yellow-500/50"
                        placeholder="Reason for music exemption"
                      />
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* NOTES TAB */}
            {activeTab === 'notes' && (
              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-white mb-4">Notes & Requirements</h3>

                {/* Special Requirements */}
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Special Requirements
                  </label>
                  <textarea
                    value={formData.special_requirements || ''}
                    onChange={(e) => updateField('special_requirements', e.target.value)}
                    rows={3}
                    className="w-full px-4 py-2 bg-white/5 border border-white/20 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-purple-500/50 resize-none"
                    placeholder="Props, special needs, etc."
                  />
                </div>

                {/* Props Required */}
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Props Required
                  </label>
                  <input
                    type="text"
                    value={formData.props_required || ''}
                    onChange={(e) => updateField('props_required', e.target.value)}
                    className="w-full px-4 py-2 bg-white/5 border border-white/20 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-purple-500/50"
                    placeholder="List props needed"
                  />
                </div>

                {/* Accessibility Needs */}
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Accessibility Needs
                  </label>
                  <input
                    type="text"
                    value={formData.accessibility_needs || ''}
                    onChange={(e) => updateField('accessibility_needs', e.target.value)}
                    className="w-full px-4 py-2 bg-white/5 border border-white/20 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-purple-500/50"
                    placeholder="Any accessibility requirements"
                  />
                </div>

                {/* Costume Description */}
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Costume Description
                  </label>
                  <textarea
                    value={formData.costume_description || ''}
                    onChange={(e) => updateField('costume_description', e.target.value)}
                    rows={2}
                    className="w-full px-4 py-2 bg-white/5 border border-white/20 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-purple-500/50 resize-none"
                    placeholder="Describe costumes"
                  />
                </div>

                {/* Scheduling Notes (CD Only) */}
                <div className="p-4 bg-purple-900/20 rounded-lg border border-purple-500/30">
                  <label className="block text-sm font-semibold text-purple-300 mb-2">
                    📋 Scheduling Notes (CD Only)
                  </label>
                  <textarea
                    value={formData.scheduling_notes || ''}
                    onChange={(e) => updateField('scheduling_notes', e.target.value)}
                    rows={3}
                    className="w-full px-4 py-2 bg-white/5 border border-purple-500/30 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-purple-500/50 resize-none"
                    placeholder="Internal notes for scheduling (not visible to studio)"
                  />
                </div>
              </div>
            )}

            {/* FLAGS TAB */}
            {activeTab === 'flags' && (
              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-white mb-4">Competition Flags</h3>

                <div className="grid grid-cols-2 gap-4">
                  {/* Left Column - Entry Flags */}
                  <div className="space-y-3">
                    <h4 className="text-sm font-medium text-gray-400 uppercase tracking-wider">Entry Flags</h4>

                    <label className="flex items-center gap-3 cursor-pointer p-3 rounded-lg hover:bg-white/5 border border-white/10">
                      <input
                        type="checkbox"
                        checked={formData.is_late_entry || false}
                        onChange={(e) => updateField('is_late_entry', e.target.checked)}
                        className="w-5 h-5 rounded border-white/20 bg-white/5 text-purple-500 focus:ring-purple-500/50"
                      />
                      <div>
                        <span className="text-white font-medium">Late Entry</span>
                        <p className="text-xs text-gray-500">Entry submitted after deadline</p>
                      </div>
                    </label>

                    {formData.is_late_entry && (
                      <div className="ml-8">
                        <label className="block text-sm font-medium text-gray-300 mb-2">
                          Late Suffix
                        </label>
                        <input
                          type="text"
                          value={formData.entry_suffix || ''}
                          onChange={(e) => updateField('entry_suffix', e.target.value)}
                          className="w-24 px-3 py-1 bg-white/5 border border-white/20 rounded-lg text-white text-sm"
                          placeholder="A, B..."
                          maxLength={5}
                        />
                      </div>
                    )}

                    <label className="flex items-center gap-3 cursor-pointer p-3 rounded-lg hover:bg-white/5 border border-white/10">
                      <input
                        type="checkbox"
                        checked={formData.is_title_upgrade || false}
                        onChange={(e) => updateField('is_title_upgrade', e.target.checked)}
                        className="w-5 h-5 rounded border-white/20 bg-white/5 text-purple-500 focus:ring-purple-500/50"
                      />
                      <div>
                        <span className="text-white font-medium">Title Upgrade</span>
                        <p className="text-xs text-gray-500">Competing for title</p>
                      </div>
                    </label>

                    <label className="flex items-center gap-3 cursor-pointer p-3 rounded-lg hover:bg-white/5 border border-white/10">
                      <input
                        type="checkbox"
                        checked={formData.is_title_interview || false}
                        onChange={(e) => updateField('is_title_interview', e.target.checked)}
                        className="w-5 h-5 rounded border-white/20 bg-white/5 text-purple-500 focus:ring-purple-500/50"
                      />
                      <div>
                        <span className="text-white font-medium">Title Interview</span>
                        <p className="text-xs text-gray-500">Has title interview</p>
                      </div>
                    </label>

                    <label className="flex items-center gap-3 cursor-pointer p-3 rounded-lg hover:bg-white/5 border border-white/10">
                      <input
                        type="checkbox"
                        checked={formData.is_improvisation || false}
                        onChange={(e) => updateField('is_improvisation', e.target.checked)}
                        className="w-5 h-5 rounded border-white/20 bg-white/5 text-purple-500 focus:ring-purple-500/50"
                      />
                      <div>
                        <span className="text-white font-medium">Improvisation</span>
                        <p className="text-xs text-gray-500">Improv performance</p>
                      </div>
                    </label>
                  </div>

                  {/* Right Column - Competition Flags */}
                  <div className="space-y-3">
                    <h4 className="text-sm font-medium text-gray-400 uppercase tracking-wider">Competition Flags</h4>

                    <label className="flex items-center gap-3 cursor-pointer p-3 rounded-lg hover:bg-white/5 border border-white/10">
                      <input
                        type="checkbox"
                        checked={formData.is_trophy_helper || false}
                        onChange={(e) => updateField('is_trophy_helper', e.target.checked)}
                        className="w-5 h-5 rounded border-white/20 bg-white/5 text-amber-500 focus:ring-amber-500/50"
                      />
                      <div>
                        <span className="text-white font-medium">🏆 Trophy Helper</span>
                        <p className="text-xs text-gray-500">Helps with adjudication timing</p>
                      </div>
                    </label>

                    <label className="flex items-center gap-3 cursor-pointer p-3 rounded-lg hover:bg-white/5 border border-white/10">
                      <input
                        type="checkbox"
                        checked={formData.is_glow_off_round || false}
                        onChange={(e) => updateField('is_glow_off_round', e.target.checked)}
                        className="w-5 h-5 rounded border-white/20 bg-white/5 text-cyan-500 focus:ring-cyan-500/50"
                      />
                      <div>
                        <span className="text-white font-medium">✨ Glow-Off Round</span>
                        <p className="text-xs text-gray-500">Special glow-off competition</p>
                      </div>
                    </label>

                    <label className="flex items-center gap-3 cursor-pointer p-3 rounded-lg hover:bg-white/5 border border-white/10">
                      <input
                        type="checkbox"
                        checked={formData.is_overall_competition || false}
                        onChange={(e) => updateField('is_overall_competition', e.target.checked)}
                        className="w-5 h-5 rounded border-white/20 bg-white/5 text-yellow-500 focus:ring-yellow-500/50"
                      />
                      <div>
                        <span className="text-white font-medium">🥇 Overall Competition</span>
                        <p className="text-xs text-gray-500">Competing for overall award</p>
                      </div>
                    </label>
                  </div>
                </div>
              </div>
            )}

            {/* FEES TAB */}
            {activeTab === 'fees' && (
              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-white mb-4">Fee Adjustments</h3>

                <div className="p-4 bg-yellow-900/20 rounded-lg border border-yellow-500/30 mb-4">
                  <p className="text-yellow-300 text-sm">
                    ⚠️ Fee changes here are admin overrides. Invoice may need to be regenerated.
                  </p>
                </div>

                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      Entry Fee ($)
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      value={formData.entry_fee || ''}
                      onChange={(e) => updateField('entry_fee', e.target.value)}
                      className="w-full px-4 py-2 bg-white/5 border border-white/20 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-purple-500/50"
                      placeholder="0.00"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      Late Fee ($)
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      value={formData.late_fee || ''}
                      onChange={(e) => updateField('late_fee', e.target.value)}
                      className="w-full px-4 py-2 bg-white/5 border border-white/20 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-purple-500/50"
                      placeholder="0.00"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      Total Fee ($)
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      value={formData.total_fee || ''}
                      onChange={(e) => updateField('total_fee', e.target.value)}
                      className="w-full px-4 py-2 bg-white/5 border border-white/20 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-purple-500/50"
                      placeholder="0.00"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* DANCERS TAB */}
            {activeTab === 'dancers' && (
              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-white mb-4">Dancers</h3>

                {/* Dancer List */}
                <div className="bg-white/5 rounded-lg border border-white/10 divide-y divide-white/10">
                  {entry?.entry_participants && entry.entry_participants.length > 0 ? (
                    entry.entry_participants.map((p: any, idx: number) => (
                      <div key={p.id || idx} className="flex items-center justify-between p-3">
                        <div className="flex items-center gap-3">
                          <span className="w-8 h-8 rounded-full bg-purple-500/20 flex items-center justify-center text-purple-300 text-sm font-medium">
                            {idx + 1}
                          </span>
                          <div>
                            <span className="text-white font-medium">
                              {p.dancer?.first_name} {p.dancer?.last_name}
                            </span>
                            {p.dancer?.date_of_birth && (
                              <span className="ml-2 text-gray-500 text-sm">
                                (Age: {calculateAge(p.dancer.date_of_birth)})
                              </span>
                            )}
                          </div>
                        </div>
                        <button
                          className="text-red-400 hover:text-red-300 text-sm px-2 py-1 rounded hover:bg-red-500/10"
                          onClick={() => {
                            // TODO: Implement remove dancer
                            toast.error('Remove dancer not yet implemented');
                          }}
                        >
                          Remove
                        </button>
                      </div>
                    ))
                  ) : (
                    <div className="p-6 text-center text-gray-500">
                      No dancers assigned
                    </div>
                  )}
                </div>

                {/* Add Dancer Button */}
                <button
                  className="w-full py-3 border-2 border-dashed border-white/20 rounded-lg text-gray-400 hover:text-white hover:border-purple-500/50 transition-colors"
                  onClick={() => {
                    // TODO: Implement add dancer modal
                    toast.error('Add dancer not yet implemented');
                  }}
                >
                  + Add Dancer
                </button>

                {/* Dancer Stats */}
                <div className="p-4 bg-white/5 rounded-lg border border-white/10">
                  <div className="grid grid-cols-3 gap-4 text-center">
                    <div>
                      <div className="text-2xl font-bold text-white">
                        {entry?.entry_participants?.length || 0}
                      </div>
                      <div className="text-xs text-gray-500">Dancers</div>
                    </div>
                    <div>
                      <div className="text-2xl font-bold text-white">
                        {formData.routine_age || 'N/A'}
                      </div>
                      <div className="text-xs text-gray-500">Routine Age</div>
                    </div>
                    <div>
                      <div className="text-2xl font-bold text-white">
                        {entry?.conflict_count || 0}
                      </div>
                      <div className="text-xs text-gray-500">Conflicts</div>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Change indicator */}
          {hasChanges && (
            <div className="flex items-center gap-2 text-yellow-400 text-sm">
              <span className="w-2 h-2 rounded-full bg-yellow-400 animate-pulse"></span>
              Unsaved changes
            </div>
          )}
        </div>
      )}
    </Modal>
  );
}

// Helper function to calculate age as of Dec 31, 2025
function calculateAge(dateOfBirth: string): number {
  const dob = new Date(dateOfBirth);
  const cutoff = new Date('2025-12-31');
  let age = cutoff.getFullYear() - dob.getFullYear();
  const monthDiff = cutoff.getMonth() - dob.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && cutoff.getDate() < dob.getDate())) {
    age--;
  }
  return age;
}
