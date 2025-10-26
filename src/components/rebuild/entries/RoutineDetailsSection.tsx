import { EntryFormState } from '@/hooks/rebuild/useEntryForm';

interface Category {
  id: string;
  name: string;
}

interface Classification {
  id: string;
  name: string;
}

interface RoutineDetailsSectionProps {
  form: EntryFormState;
  updateField: <K extends keyof EntryFormState>(field: K, value: EntryFormState[K]) => void;
  categories: Category[];
  classifications: Classification[];
}

/**
 * Routine Details Section
 * Collects basic entry information:
 * - Title (required)
 * - Choreographer
 * - Category (required)
 * - Classification (required)
 * - Special requirements/notes
 */
export function RoutineDetailsSection({
  form,
  updateField,
  categories,
  classifications,
}: RoutineDetailsSectionProps) {
  return (
    <div className="bg-white/10 backdrop-blur-md rounded-xl border border-white/20 p-6">
      <h2 className="text-xl font-bold text-white mb-4">Routine Details</h2>

      <div className="space-y-4">
        {/* Title */}
        <div>
          <label htmlFor="title" className="block text-sm font-semibold text-white/90 mb-2">
            Title <span className="text-red-400">*</span>
          </label>
          <input
            id="title"
            type="text"
            value={form.title}
            onChange={(e) => updateField('title', e.target.value)}
            className="w-full px-4 py-3 bg-white/5 border border-white/20 rounded-lg text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
            placeholder="Enter routine title"
            autoFocus
            required
          />
          {form.title.trim().length === 0 && (
            <p className="text-xs text-red-400 mt-1">Title is required</p>
          )}
        </div>

        {/* Choreographer */}
        <div>
          <label htmlFor="choreographer" className="block text-sm font-semibold text-white/90 mb-2">
            Choreographer
          </label>
          <input
            id="choreographer"
            type="text"
            value={form.choreographer}
            onChange={(e) => updateField('choreographer', e.target.value)}
            className="w-full px-4 py-3 bg-white/5 border border-white/20 rounded-lg text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
            placeholder="Enter choreographer name"
          />
        </div>

        {/* Category & Classification (side by side) */}
        <div className="grid grid-cols-2 gap-4">
          {/* Category */}
          <div>
            <label htmlFor="category" className="block text-sm font-semibold text-white/90 mb-2">
              Category <span className="text-red-400">*</span>
            </label>
            <select
              id="category"
              value={form.category_id}
              onChange={(e) => updateField('category_id', e.target.value)}
              className="w-full px-4 py-3 bg-white/5 border border-white/20 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent appearance-none cursor-pointer"
              required
            >
              <option value="" className="bg-gray-900">Select category...</option>
              {categories.map((cat) => (
                <option key={cat.id} value={cat.id} className="bg-gray-900">
                  {cat.name}
                </option>
              ))}
            </select>
            {form.category_id.length === 0 && (
              <p className="text-xs text-red-400 mt-1">Category is required</p>
            )}
          </div>

          {/* Classification */}
          <div>
            <label htmlFor="classification" className="block text-sm font-semibold text-white/90 mb-2">
              Classification <span className="text-red-400">*</span>
            </label>
            <select
              id="classification"
              value={form.classification_id}
              onChange={(e) => updateField('classification_id', e.target.value)}
              className="w-full px-4 py-3 bg-white/5 border border-white/20 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent appearance-none cursor-pointer"
              required
            >
              <option value="" className="bg-gray-900">Select classification...</option>
              {classifications.map((cls) => (
                <option key={cls.id} value={cls.id} className="bg-gray-900">
                  {cls.name}
                </option>
              ))}
            </select>
            {form.classification_id.length === 0 && (
              <p className="text-xs text-red-400 mt-1">Classification is required</p>
            )}
          </div>
        </div>

        {/* Special Requirements */}
        <div>
          <label htmlFor="special_requirements" className="block text-sm font-semibold text-white/90 mb-2">
            Notes / Special Requirements
          </label>
          <textarea
            id="special_requirements"
            value={form.special_requirements}
            onChange={(e) => updateField('special_requirements', e.target.value)}
            rows={3}
            className="w-full px-4 py-3 bg-white/5 border border-white/20 rounded-lg text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent resize-none"
            placeholder="Any special requirements or notes for this routine..."
          />
        </div>
      </div>
    </div>
  );
}
