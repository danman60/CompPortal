"use client";

import { EntryFormV2State } from '@/hooks/rebuild/useEntryFormV2';

interface SizeCategory {
  id: string;
  name: string;
  min_participants: number;
  max_participants: number;
  sort_order: number | null;
  max_time_minutes?: number | null;
  max_time_seconds?: number | null;
}

interface Props {
  form: EntryFormV2State;
  updateField: <K extends keyof EntryFormV2State>(
    field: K,
    value: EntryFormV2State[K]
  ) => void;
  effectiveSizeCategory: SizeCategory | null;
}

/**
 * Extended Time Section
 * Phase 2 spec lines 324-373: Extended time tracking
 */
export function ExtendedTimeSection({
  form,
  updateField,
  effectiveSizeCategory,
}: Props) {
  return (
    <div className="bg-gradient-to-br from-blue-500/10 to-indigo-500/10 backdrop-blur-md rounded-xl border border-blue-400/30 p-6">
      <h2 className="text-xl font-bold text-white mb-4">Extended Time Options</h2>

      <div className="space-y-4">
        {/* Extended Time Checkbox */}
        <div className="flex items-start gap-4">
          <input
            type="checkbox"
            id="extended_time_requested"
            checked={form.extended_time_requested}
            onChange={(e) => updateField('extended_time_requested', e.target.checked)}
            className="w-5 h-5 mt-1 rounded border-blue-400/30 bg-white/10 checked:bg-blue-500 focus:ring-blue-500 focus:ring-2"
          />
          <div className="flex-1">
            <label
              htmlFor="extended_time_requested"
              className="text-lg font-bold text-white cursor-pointer block mb-2"
            >
              ⏱️ Request Extended Time
            </label>
            <p className="text-sm text-gray-300">
              Check this if your routine exceeds the standard time limit for this entry size.
            </p>
          </div>
        </div>

        {/* Routine Length (shown only if extended time requested) */}
        {form.extended_time_requested && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pl-9">
            <div>
              <label className="block text-sm text-gray-300 mb-1">
                Routine Length <span className="text-red-400">*</span>
              </label>
              <div className="flex gap-2">
                <div className="flex-1">
                  <input
                    type="number"
                    min="0"
                    max="15"
                    placeholder="Min"
                    value={form.routine_length_minutes || ''}
                    onChange={(e) =>
                      updateField('routine_length_minutes', parseInt(e.target.value) || 0)
                    }
                    className="w-full px-3 py-2 bg-white/5 border border-white/20 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <div className="text-xs text-gray-400 mt-1">Minutes</div>
                </div>
                <div className="flex-1">
                  <input
                    type="number"
                    min="0"
                    max="59"
                    placeholder="Sec"
                    value={form.routine_length_seconds || ''}
                    onChange={(e) =>
                      updateField('routine_length_seconds', parseInt(e.target.value) || 0)
                    }
                    className="w-full px-3 py-2 bg-white/5 border border-white/20 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <div className="text-xs text-gray-400 mt-1">Seconds</div>
                </div>
              </div>
              {effectiveSizeCategory && (effectiveSizeCategory.max_time_minutes || effectiveSizeCategory.max_time_seconds) && (
                <div className="text-xs text-blue-300 mt-2">
                  Max time for {effectiveSizeCategory.name}: {effectiveSizeCategory.max_time_minutes || 0}:
                  {String(effectiveSizeCategory.max_time_seconds || 0).padStart(2, '0')}
                </div>
              )}
            </div>
            <div className="md:col-span-2">
              <label className="block text-sm text-gray-300 mb-1">Scheduling Notes</label>
              <textarea
                className="w-full px-3 py-2 bg-white/5 border border-white/20 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                rows={2}
                placeholder="Any special scheduling requests or notes..."
                value={form.scheduling_notes}
                onChange={(e) => updateField('scheduling_notes', e.target.value)}
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
