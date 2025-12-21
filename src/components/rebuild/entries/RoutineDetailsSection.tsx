"use client";

import { EntryFormV2State } from '@/hooks/rebuild/useEntryFormV2';

interface Category {
  id: string;
  name: string;
}

interface Classification {
  id: string;
  name: string;
  skill_level: number | null;
}

interface Props {
  form: EntryFormV2State;
  updateField: <K extends keyof EntryFormV2State>(
    field: K,
    value: EntryFormV2State[K]
  ) => void;
  categories: Category[];
  classifications: Classification[];
  disabled?: boolean; // Disable fields except title and choreographer when entry is summarized
}

/**
 * Routine Details Section
 * Phase 1 Spec lines 457-461: Required entry fields
 */
export function RoutineDetailsSection({
  form,
  updateField,
  categories,
  classifications,
  disabled = false,
}: Props) {
  return (
    <div className="bg-white/10 backdrop-blur-md rounded-xl border border-white/20 p-6">
      <h2 className="text-xl font-bold text-white mb-4">Routine Details</h2>

      <div className="space-y-4">
        {/* Title */}
        <div>
          <label
            htmlFor="title"
            className="block text-sm font-medium text-gray-300 mb-2"
          >
            Routine Title <span className="text-red-400">*</span>
          </label>
          <input
            type="text"
            id="title"
            value={form.title}
            onChange={(e) => updateField('title', e.target.value)}
            className="w-full px-4 py-2 bg-white/5 border border-white/20 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500"
            placeholder="Enter routine title (min 3 characters)"
            maxLength={255}
          />
          {form.title.trim().length > 0 && form.title.trim().length < 3 && (
            <p className="text-red-400 text-sm mt-1">
              Title must be at least 3 characters
            </p>
          )}
        </div>

        {/* Choreographer - Phase 2 spec lines 36-42: Required */}
        <div>
          <label
            htmlFor="choreographer"
            className="block text-sm font-medium text-gray-300 mb-2"
          >
            Choreographer <span className="text-red-400">*</span>
          </label>
          <input
            type="text"
            id="choreographer"
            value={form.choreographer}
            onChange={(e) => updateField('choreographer', e.target.value)}
            className="w-full px-4 py-2 bg-white/5 border border-white/20 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500"
            placeholder="Enter choreographer name"
            maxLength={255}
          />
          {form.choreographer.trim().length === 0 && (
            <p className="text-gray-400 text-xs mt-1">
              Required - enter the choreographer's name for this routine
            </p>
          )}
        </div>

        {/* Category */}
        <div>
          <label
            htmlFor="category_id"
            className="block text-sm font-medium text-gray-300 mb-2"
          >
            Dance Category <span className="text-red-400">*</span>
          </label>
          <select
            id="category_id"
            value={form.category_id}
            onChange={(e) => updateField('category_id', e.target.value)}
            disabled={disabled}
            className="w-full px-4 py-2 bg-white/5 border border-white/20 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <option value="" className="bg-gray-900">
              Select a category
            </option>
            {categories.map((cat) => (
              <option key={cat.id} value={cat.id} className="bg-gray-900">
                {cat.name}
              </option>
            ))}
          </select>
        </div>

        {/* Classification REMOVED - Now in Auto-Calculated Section (Nov 4 transcript requirements) */}

        {/* Special Requirements & Scheduling Requests */}
        <div>
          <label
            htmlFor="special_requirements"
            className="block text-sm font-medium text-gray-300 mb-2"
          >
            Special Requirements <span className="text-amber-400 font-semibold">& SCHEDULING REQUESTS</span>
          </label>
          <textarea
            id="special_requirements"
            value={form.special_requirements}
            onChange={(e) =>
              updateField('special_requirements', e.target.value)
            }
            disabled={disabled}
            className="w-full px-4 py-2 bg-white/5 border border-white/20 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500 resize-none disabled:opacity-50 disabled:cursor-not-allowed"
            placeholder="Props, accessibility needs, scheduling preferences, etc. (optional)"
            rows={3}
          />
        </div>
      </div>
    </div>
  );
}
