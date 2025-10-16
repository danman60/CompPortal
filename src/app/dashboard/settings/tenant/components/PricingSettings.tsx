'use client';

import { useState, useEffect } from 'react';
import { trpc } from '@/lib/trpc';
import { toast } from 'react-hot-toast';
import { EMPWR_ENTRY_FEES } from '@/lib/empwrDefaults';

interface EntryFees {
  solo: number;
  duetTrio: number;
  group: number;
  titleUpgrade: number;
}

interface PricingSettingsData {
  fees: EntryFees;
  currency: string;
  description?: string;
}

interface PricingSettingsProps {
  tenantId: string;
  currentSettings: PricingSettingsData | null;
  onSave: () => void;
}

export function PricingSettings({ tenantId, currentSettings, onSave }: PricingSettingsProps) {
  const [fees, setFees] = useState<EntryFees>(
    currentSettings?.fees || EMPWR_ENTRY_FEES.fees
  );
  const [currency, setCurrency] = useState(
    currentSettings?.currency || EMPWR_ENTRY_FEES.currency
  );
  const [description, setDescription] = useState(
    currentSettings?.description || EMPWR_ENTRY_FEES.description || ''
  );
  const [hasChanges, setHasChanges] = useState(false);

  // Reset when currentSettings changes
  useEffect(() => {
    setFees(currentSettings?.fees || EMPWR_ENTRY_FEES.fees);
    setCurrency(currentSettings?.currency || EMPWR_ENTRY_FEES.currency);
    setDescription(currentSettings?.description || EMPWR_ENTRY_FEES.description || '');
    setHasChanges(false);
  }, [currentSettings]);

  const updateMutation = trpc.tenantSettings.updateEntryFees.useMutation({
    onSuccess: () => {
      onSave();
      setHasChanges(false);
      toast.success('Pricing settings updated successfully!');
    },
    onError: (error) => {
      toast.error(`Error updating pricing settings: ${error.message}`);
    },
  });

  const handleSave = () => {
    updateMutation.mutate({
      tenantId,
      fees: {
        fees,
        currency,
        description: description || undefined,
      },
    });
  };

  const handleReset = () => {
    setFees(currentSettings?.fees || EMPWR_ENTRY_FEES.fees);
    setCurrency(currentSettings?.currency || EMPWR_ENTRY_FEES.currency);
    setDescription(currentSettings?.description || EMPWR_ENTRY_FEES.description || '');
    setHasChanges(false);
  };

  const handleUpdateFee = (field: keyof EntryFees, value: number) => {
    setFees({
      ...fees,
      [field]: value,
    });
    setHasChanges(true);
  };

  const isValid = () => {
    return (
      fees.solo >= 0 &&
      fees.duetTrio >= 0 &&
      fees.group >= 0 &&
      fees.titleUpgrade >= 0 &&
      currency.length > 0
    );
  };

  return (
    <div className="bg-white/5 backdrop-blur-md rounded-xl border border-white/10 p-6 space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-white mb-2">Pricing & Fees</h2>
        <p className="text-gray-300">
          Configure default entry fees for different performance categories. These fees will apply to all competitions unless overridden.
        </p>
      </div>

      {/* Main Fee Structure */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Solo Fee */}
        <div className="space-y-2">
          <label className="block text-sm font-semibold text-white">
            Solo Entry Fee
          </label>
          <input
            type="number"
            value={fees.solo}
            onChange={(e) => handleUpdateFee('solo', parseFloat(e.target.value) || 0)}
            className="w-full px-4 py-3 bg-white/5 border border-white/20 rounded-lg text-white placeholder-gray-400 focus:ring-2 focus:ring-purple-500 focus:border-transparent"
            placeholder="115.00"
            min={0}
            step={0.01}
          />
          <p className="text-xs text-gray-400">
            Fixed fee for solo performances (1 dancer)
          </p>
        </div>

        {/* Duet/Trio Fee */}
        <div className="space-y-2">
          <label className="block text-sm font-semibold text-white">
            Duet/Trio Fee (Per Dancer)
          </label>
          <input
            type="number"
            value={fees.duetTrio}
            onChange={(e) => handleUpdateFee('duetTrio', parseFloat(e.target.value) || 0)}
            className="w-full px-4 py-3 bg-white/5 border border-white/20 rounded-lg text-white placeholder-gray-400 focus:ring-2 focus:ring-purple-500 focus:border-transparent"
            placeholder="70.00"
            min={0}
            step={0.01}
          />
          <p className="text-xs text-gray-400">
            Per dancer fee for duets and trios (2-3 dancers)
          </p>
        </div>

        {/* Group Fee */}
        <div className="space-y-2">
          <label className="block text-sm font-semibold text-white">
            Group Fee (Per Dancer)
          </label>
          <input
            type="number"
            value={fees.group}
            onChange={(e) => handleUpdateFee('group', parseFloat(e.target.value) || 0)}
            className="w-full px-4 py-3 bg-white/5 border border-white/20 rounded-lg text-white placeholder-gray-400 focus:ring-2 focus:ring-purple-500 focus:border-transparent"
            placeholder="55.00"
            min={0}
            step={0.01}
          />
          <p className="text-xs text-gray-400">
            Per dancer fee for groups (4+ dancers)
          </p>
        </div>

        {/* Title Upgrade Fee */}
        <div className="space-y-2">
          <label className="block text-sm font-semibold text-white">
            Title Division Upgrade Fee
          </label>
          <input
            type="number"
            value={fees.titleUpgrade}
            onChange={(e) => handleUpdateFee('titleUpgrade', parseFloat(e.target.value) || 0)}
            className="w-full px-4 py-3 bg-white/5 border border-white/20 rounded-lg text-white placeholder-gray-400 focus:ring-2 focus:ring-purple-500 focus:border-transparent"
            placeholder="30.00"
            min={0}
            step={0.01}
          />
          <p className="text-xs text-gray-400">
            Additional fee to enter title division
          </p>
        </div>
      </div>

      {/* Currency */}
      <div className="space-y-2">
        <label className="block text-sm font-semibold text-white">
          Currency
        </label>
        <input
          type="text"
          value={currency}
          onChange={(e) => {
            setCurrency(e.target.value);
            setHasChanges(true);
          }}
          className="max-w-xs px-4 py-3 bg-white/5 border border-white/20 rounded-lg text-white placeholder-gray-400 focus:ring-2 focus:ring-purple-500 focus:border-transparent"
          placeholder="USD"
          maxLength={3}
        />
        <p className="text-xs text-gray-400">
          Currency code (e.g., USD, CAD, EUR)
        </p>
      </div>

      {/* Description */}
      <div className="space-y-2">
        <label className="block text-sm font-semibold text-white">
          Description (Optional)
        </label>
        <input
          type="text"
          value={description}
          onChange={(e) => {
            setDescription(e.target.value);
            setHasChanges(true);
          }}
          className="w-full px-4 py-3 bg-white/5 border border-white/20 rounded-lg text-white placeholder-gray-400 focus:ring-2 focus:ring-purple-500 focus:border-transparent"
          placeholder="Standard entry fees by category type"
        />
        <p className="text-xs text-gray-400">
          Internal description of pricing structure
        </p>
      </div>

      {/* Fee Examples */}
      <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-4">
        <p className="text-blue-200 text-sm">
          <strong>Examples:</strong>
        </p>
        <ul className="mt-2 space-y-1 list-disc list-inside text-blue-200 text-sm">
          <li>Solo: ${fees.solo.toFixed(2)} per entry</li>
          <li>Duet (2 dancers): ${(fees.duetTrio * 2).toFixed(2)} total</li>
          <li>Small Group (5 dancers): ${(fees.group * 5).toFixed(2)} total</li>
          <li>Title Upgrade: +${fees.titleUpgrade.toFixed(2)} per entry</li>
        </ul>
      </div>

      {/* Validation Warning */}
      {!isValid() && (
        <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-lg p-4">
          <p className="text-yellow-200 text-sm">
            Please ensure all fees are non-negative and currency is specified.
          </p>
        </div>
      )}

      {/* Action Buttons */}
      <div className="flex gap-3 pt-4">
        <button
          onClick={handleSave}
          disabled={!hasChanges || updateMutation.isPending || !isValid()}
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
