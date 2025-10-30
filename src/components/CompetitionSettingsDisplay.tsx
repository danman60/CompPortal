'use client';

import { trpc } from '@/lib/trpc';

export default function CompetitionSettingsDisplay() {
  const { data, isLoading, error } = trpc.lookup.getAllForSettings.useQuery();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-white">Loading settings...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-6">
        <p className="text-red-400">Error loading settings: {error.message}</p>
      </div>
    );
  }

  if (!data) {
    return null;
  }

  const { ageGroups, classifications, categories, entrySizeCategories, scoringTiers } = data;

  return (
    <div className="space-y-6">
      {/* Info Banner */}
      <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-6">
        <div className="flex items-start gap-3">
          <div className="text-blue-400 text-xl">ℹ️</div>
          <div>
            <h3 className="text-blue-300 font-semibold mb-1">
              Tenant-Specific Settings (Read-Only)
            </h3>
            <p className="text-blue-200/80 text-sm">
              These settings are specific to your tenant and apply to all competitions.
              Contact support to request changes.
            </p>
          </div>
        </div>
      </div>

      {/* Age Divisions */}
      <div className="bg-white/5 backdrop-blur-sm rounded-lg p-6 border border-white/10">
        <h2 className="text-2xl font-bold text-white mb-4">Age Divisions</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {ageGroups.map((group) => (
            <div
              key={group.id}
              className="bg-white/5 rounded-lg p-4 border border-white/10"
            >
              <h3 className="text-lg font-semibold text-white mb-2">{group.name}</h3>
              <p className="text-white/70">
                Ages {group.min_age}-{group.max_age === 99 ? '99+' : group.max_age}
              </p>
            </div>
          ))}
        </div>
      </div>

      {/* Classifications */}
      <div className="bg-white/5 backdrop-blur-sm rounded-lg p-6 border border-white/10">
        <h2 className="text-2xl font-bold text-white mb-4">Classifications</h2>
        <div className="space-y-3">
          {classifications.map((classification) => (
            <div
              key={classification.id}
              className="bg-white/5 rounded-lg p-4 border border-white/10"
            >
              <h3 className="text-lg font-semibold text-white mb-1">
                {classification.name}
              </h3>
              <p className="text-white/70 text-sm">{classification.description}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Dance Styles */}
      <div className="bg-white/5 backdrop-blur-sm rounded-lg p-6 border border-white/10">
        <h2 className="text-2xl font-bold text-white mb-4">Dance Styles</h2>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
          {categories.map((category) => (
            <div
              key={category.id}
              className="bg-white/5 rounded-lg p-3 border border-white/10 text-center"
            >
              <p className="text-white font-medium">{category.name}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Entry Sizes & Fees */}
      <div className="bg-white/5 backdrop-blur-sm rounded-lg p-6 border border-white/10">
        <h2 className="text-2xl font-bold text-white mb-4">Entry Sizes & Fees</h2>
        <div className="space-y-3">
          {entrySizeCategories.map((category) => {
            const baseFee = Number(category.base_fee || 0);
            const perParticipantFee = Number(category.per_participant_fee || 0);

            let feeDisplay = '';
            if (baseFee > 0 && perParticipantFee === 0) {
              feeDisplay = `$${baseFee.toFixed(2)} per entry`;
            } else if (baseFee === 0 && perParticipantFee > 0) {
              feeDisplay = `$${perParticipantFee.toFixed(2)} per dancer`;
            } else if (baseFee > 0 && perParticipantFee > 0) {
              feeDisplay = `$${baseFee.toFixed(2)} base + $${perParticipantFee.toFixed(2)} per dancer`;
            }

            return (
              <div
                key={category.id}
                className="bg-white/5 rounded-lg p-4 border border-white/10 flex justify-between items-center"
              >
                <div>
                  <h3 className="text-lg font-semibold text-white">
                    {category.name}
                  </h3>
                  <p className="text-white/60 text-sm">
                    {category.min_participants}-{category.max_participants === 999 ? '20+' : category.max_participants} dancers
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-green-400 font-semibold">{feeDisplay}</p>
                </div>
              </div>
            );
          })}
        </div>

        {/* Title Upgrade Note */}
        <div className="mt-4 bg-purple-500/10 border border-purple-500/20 rounded-lg p-4">
          <p className="text-purple-300 text-sm">
            <span className="font-semibold">Title Division Upgrade:</span> +$30 per solo entry
          </p>
        </div>
      </div>

      {/* Scoring System */}
      <div className="bg-white/5 backdrop-blur-sm rounded-lg p-6 border border-white/10">
        <h2 className="text-2xl font-bold text-white mb-4">Scoring System</h2>
        <div className="space-y-3">
          {scoringTiers.map((tier) => (
            <div
              key={tier.id}
              className="bg-white/5 rounded-lg p-4 border border-white/10 flex justify-between items-center"
            >
              <h3 className="text-lg font-semibold text-white">{tier.name}</h3>
              <p className="text-white/70">
                {Number(tier.min_score).toFixed(2)} - {Number(tier.max_score).toFixed(2)}
              </p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
