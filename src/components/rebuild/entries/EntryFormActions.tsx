interface EntryFormActionsProps {
  canSave: boolean;
  isLoading: boolean;
  onSave: (action: 'cancel' | 'save' | 'save-another' | 'save-like-this') => Promise<void>;
}

/**
 * Entry Form Actions
 * 4 action buttons for entry creation
 *
 * Actions:
 * 1. Cancel - Discard and return to entries list
 * 2. Create Another Like This - Save and keep dancers, clear details
 * 3. Save & Create Another - Save and reset all fields
 * 4. Save - Save and return to entries list
 */
export function EntryFormActions({ canSave, isLoading, onSave }: EntryFormActionsProps) {
  return (
    <div className="bg-white/10 backdrop-blur-md rounded-xl border border-white/20 p-6">
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        {/* Cancel Button (Left) */}
        <button
          onClick={() => onSave('cancel')}
          disabled={isLoading}
          className="px-6 py-3 bg-white/5 hover:bg-white/10 border border-white/20 text-white rounded-lg font-semibold transition-all disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Cancel
        </button>

        {/* Action Buttons (Right) */}
        <div className="flex flex-col sm:flex-row gap-3">
          {/* Create Another Like This */}
          <button
            onClick={() => onSave('save-like-this')}
            disabled={!canSave || isLoading}
            className="px-6 py-3 bg-blue-500/20 hover:bg-blue-500/30 border border-blue-500/50 text-blue-200 rounded-lg font-semibold transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            title="Save and create another with same dancers"
          >
            <span>🔄</span>
            <span>Create Another Like This</span>
          </button>

          {/* Save & Create Another */}
          <button
            onClick={() => onSave('save-another')}
            disabled={!canSave || isLoading}
            className="px-6 py-3 bg-green-500/20 hover:bg-green-500/30 border border-green-500/50 text-green-200 rounded-lg font-semibold transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            title="Save and start fresh"
          >
            <span>➕</span>
            <span>Save & Create Another</span>
          </button>

          {/* Save */}
          <button
            onClick={() => onSave('save')}
            disabled={!canSave || isLoading}
            className="px-6 py-3 bg-purple-500 hover:bg-purple-600 text-white rounded-lg font-semibold transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            title="Save and return to entries"
          >
            <span>✓</span>
            <span>{isLoading ? 'Saving...' : 'Save'}</span>
          </button>
        </div>
      </div>

      {/* Validation Message */}
      {!canSave && !isLoading && (
        <div className="mt-4 p-3 bg-yellow-500/10 border border-yellow-500/30 rounded-lg">
          <div className="text-sm text-yellow-200">
            <strong>Missing required fields:</strong>
            <ul className="list-disc list-inside mt-1 text-yellow-300/80">
              <li>Title, Category, Classification must be filled</li>
              <li>At least one dancer must be selected</li>
            </ul>
          </div>
        </div>
      )}
    </div>
  );
}
