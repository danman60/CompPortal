'use client';

import { useState } from 'react';
import { trpc } from '@/lib/trpc';
import { toast } from 'react-hot-toast';
import { AgeDivisionSettings } from './components/AgeDivisionSettings';
import { EntrySizeSettings } from './components/EntrySizeSettings';
import { PricingSettings } from './components/PricingSettings';
import { DanceStyleSettings } from './components/DanceStyleSettings';
import { ScoringRubricSettings } from './components/ScoringRubricSettings';
import { AwardsSettings } from './components/AwardsSettings';
import { useRouter } from 'next/navigation';

export default function TenantSettingsPage() {
  const router = useRouter();
  const [showLoadDefaultsConfirm, setShowLoadDefaultsConfirm] = useState(false);
  const [activeTab, setActiveTab] = useState('routine-categories');

  // Hardcoded EMPWR tenant ID (no multi-tenant support)
  const tenantId = '00000000-0000-0000-0000-000000000001';
  const userLoading = false;

  // Fetch current tenant settings
  const { data: settingsData, isLoading: settingsLoading, refetch } = trpc.tenantSettings.getTenantSettings.useQuery(
    { tenantId: tenantId! },
    { enabled: !!tenantId }
  );

  // Fetch EMPWR defaults for preview
  const { data: empwrDefaults } = trpc.tenantSettings.getEmpwrDefaults.useQuery();

  // Load EMPWR defaults mutation
  const loadDefaults = trpc.tenantSettings.loadEmpwrDefaults.useMutation({
    onSuccess: () => {
      refetch();
      setShowLoadDefaultsConfirm(false);
      toast.success('EMPWR defaults loaded successfully!');
    },
    onError: (error) => {
      toast.error(`Error loading defaults: ${error.message}`);
    },
  });

  const handleLoadDefaults = () => {
    if (confirm('This will overwrite your current settings with EMPWR defaults. Are you sure?')) {
      loadDefaults.mutate({ tenantId: tenantId! });
    }
  };

  const isLoading = userLoading || settingsLoading;

  if (isLoading) {
    return (
      <main className="min-h-screen bg-gradient-to-br from-purple-900 via-indigo-900 to-blue-900 p-6">
        <div className="max-w-6xl mx-auto">
          <div className="flex items-center justify-center min-h-[400px]">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white"></div>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-gradient-to-br from-purple-900 via-indigo-900 to-blue-900 p-6">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Back Link */}
        <button
          onClick={() => router.push('/dashboard')}
          className="text-purple-400 hover:text-purple-300 text-sm flex items-center gap-2"
        >
          ← Back to Dashboard
        </button>

        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">
              Competition Settings
            </h1>
            <p className="text-gray-300 mt-2">
              Configure default competition settings for your organization
            </p>
          </div>

          <div className="flex gap-2">
            <button
              onClick={() => {
                toast('Preview functionality coming soon!');
              }}
              className="px-4 py-2 bg-white/10 border border-white/20 text-white rounded-lg hover:bg-white/20 transition-colors"
            >
              Preview EMPWR Defaults
            </button>

            <button
              onClick={handleLoadDefaults}
              disabled={loadDefaults.isPending}
              className="px-4 py-2 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-lg hover:shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loadDefaults.isPending ? 'Loading...' : 'Load EMPWR Defaults'}
            </button>
          </div>
        </div>

        {/* Info Alert */}
        <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-4">
          <p className="text-blue-200 text-sm">
            These settings apply to all competitions in your organization. Individual competitions
            can override these defaults in the future.
          </p>
        </div>

        {/* Settings Tabs */}
        <div className="bg-white/10 backdrop-blur-md border border-white/20 rounded-xl p-6">
          {/* Tab Navigation */}
          <div className="flex gap-2 border-b border-white/10 mb-6 overflow-x-auto">
            <button
              onClick={() => setActiveTab('routine-categories')}
              className={`px-4 py-2 font-medium transition-colors whitespace-nowrap ${
                activeTab === 'routine-categories'
                  ? 'text-white border-b-2 border-purple-500'
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              Routine Categories
            </button>
            <button
              onClick={() => setActiveTab('age-divisions')}
              className={`px-4 py-2 font-medium transition-colors whitespace-nowrap ${
                activeTab === 'age-divisions'
                  ? 'text-white border-b-2 border-purple-500'
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              Age Divisions
            </button>
            <button
              onClick={() => setActiveTab('dance-styles')}
              className={`px-4 py-2 font-medium transition-colors whitespace-nowrap ${
                activeTab === 'dance-styles'
                  ? 'text-white border-b-2 border-purple-500'
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              Dance Styles
            </button>
            <button
              onClick={() => setActiveTab('scoring-rubric')}
              className={`px-4 py-2 font-medium transition-colors whitespace-nowrap ${
                activeTab === 'scoring-rubric'
                  ? 'text-white border-b-2 border-purple-500'
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              Scoring Rubric
            </button>
            <button
              onClick={() => setActiveTab('awards')}
              className={`px-4 py-2 font-medium transition-colors whitespace-nowrap ${
                activeTab === 'awards'
                  ? 'text-white border-b-2 border-purple-500'
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              Awards
            </button>
          </div>

          {/* Tab Content */}
          {activeTab === 'routine-categories' && (
            <EntrySizeSettings
              tenantId={tenantId}
              currentSettings={settingsData?.settings.entrySizeCategories || null}
              onSave={() => refetch()}
            />
          )}

          {activeTab === 'age-divisions' && (
            <AgeDivisionSettings
              tenantId={tenantId}
              currentSettings={settingsData?.settings.ageDivisions || null}
              onSave={() => refetch()}
            />
          )}

          {activeTab === 'dance-styles' && (
            <DanceStyleSettings
              tenantId={tenantId}
              currentSettings={settingsData?.settings.danceStyles || null}
              onSave={() => refetch()}
            />
          )}

          {activeTab === 'scoring-rubric' && (
            <ScoringRubricSettings
              tenantId={tenantId}
              currentSettings={settingsData?.settings.scoringRubric || null}
              onSave={() => refetch()}
            />
          )}

          {activeTab === 'awards' && (
            <AwardsSettings
              tenantId={tenantId}
              currentSettings={settingsData?.settings.awards || null}
              onSave={() => refetch()}
            />
          )}
        </div>
      </div>
    </main>
  );
}
