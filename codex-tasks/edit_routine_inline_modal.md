## Task: Edit Routine Inline Modal Component

**Context:**
- File: src/components/EntryEditModal.tsx
- Usage: Click routine card → quick edit modal (not full multi-step form)
- Pattern: Modal with essential fields only

**Requirements:**
1. Modal with routine details
2. Editable fields:
   - Routine title
   - Dance category (dropdown)
   - Props required (yes/no)
   - Special notes (textarea)
3. Participant list (read-only in quick edit)
4. Save/Cancel buttons
5. Glassmorphic modal design

**Deliverables:**
- Complete EntryEditModal.tsx component
- Export EntryEditModal
- Form state management

**Component Structure:**
```tsx
import { useState } from 'react';

interface Entry {
  id: string;
  routine_title: string;
  dance_category: string;
  props_required: boolean;
  special_notes?: string;
  entry_participants: Array<{
    dancer: { first_name: string; last_name: string };
  }>;
}

interface EntryEditModalProps {
  entry: Entry;
  isOpen: boolean;
  onClose: () => void;
  onSave: (updates: Partial<Entry>) => Promise<void>;
}

export function EntryEditModal({ entry, isOpen, onClose, onSave }: EntryEditModalProps) {
  const [formData, setFormData] = useState({
    routine_title: entry.routine_title,
    dance_category: entry.dance_category,
    props_required: entry.props_required,
    special_notes: entry.special_notes || '',
  });
  const [isSaving, setIsSaving] = useState(false);

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await onSave(formData);
      onClose();
    } catch (error) {
      console.error('Failed to save:', error);
    } finally {
      setIsSaving(false);
    }
  };

  if (!isOpen) return null;

  const dancerNames = entry.entry_participants
    .map(p => `${p.dancer.first_name} ${p.dancer.last_name}`)
    .join(', ');

  return (
    <>
      {/* Backdrop */}
      <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50" onClick={onClose} />

      {/* Modal */}
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div className="bg-gradient-to-br from-gray-900 to-gray-800 rounded-xl border border-white/20 shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-hidden">
          {/* Header */}
          <div className="p-6 border-b border-white/20">
            <h2 className="text-2xl font-bold text-white">Edit Routine</h2>
            <p className="text-sm text-gray-400 mt-1">Quick edit essential details</p>
          </div>

          {/* Content */}
          <div className="p-6 space-y-4 overflow-y-auto max-h-[calc(90vh-200px)]">
            {/* Routine Title */}
            <div>
              <label className="block text-sm font-medium text-gray-200 mb-2">
                Routine Title
              </label>
              <input
                type="text"
                value={formData.routine_title}
                onChange={(e) => setFormData({ ...formData, routine_title: e.target.value })}
                className="w-full px-4 py-2 rounded-lg bg-white/10 border border-white/20 text-white focus:outline-none focus:ring-2 focus:ring-purple-500/50"
              />
            </div>

            {/* Dance Category */}
            <div>
              <label className="block text-sm font-medium text-gray-200 mb-2">
                Dance Category
              </label>
              <select
                value={formData.dance_category}
                onChange={(e) => setFormData({ ...formData, dance_category: e.target.value })}
                className="w-full px-4 py-2 rounded-lg bg-gray-900 border border-white/20 text-white focus:outline-none focus:ring-2 focus:ring-purple-500/50"
              >
                <option value="Solo" className="bg-gray-900">Solo</option>
                <option value="Duo" className="bg-gray-900">Duo</option>
                <option value="Trio" className="bg-gray-900">Trio</option>
                <option value="Small Group" className="bg-gray-900">Small Group</option>
                <option value="Large Group" className="bg-gray-900">Large Group</option>
                <option value="Line" className="bg-gray-900">Line</option>
                <option value="Production" className="bg-gray-900">Production</option>
              </select>
            </div>

            {/* Props Required */}
            <div>
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={formData.props_required}
                  onChange={(e) => setFormData({ ...formData, props_required: e.target.checked })}
                  className="w-4 h-4 text-purple-500 rounded focus:ring-purple-500/50"
                />
                <span className="text-sm font-medium text-gray-200">Props Required</span>
              </label>
            </div>

            {/* Special Notes */}
            <div>
              <label className="block text-sm font-medium text-gray-200 mb-2">
                Special Notes
              </label>
              <textarea
                value={formData.special_notes}
                onChange={(e) => setFormData({ ...formData, special_notes: e.target.value })}
                rows={3}
                className="w-full px-4 py-2 rounded-lg bg-white/10 border border-white/20 text-white focus:outline-none focus:ring-2 focus:ring-purple-500/50"
                placeholder="Any special instructions or requirements..."
              />
            </div>

            {/* Participants (read-only) */}
            <div className="p-4 rounded-lg bg-white/5 border border-white/10">
              <h3 className="text-sm font-medium text-gray-200 mb-2">Participants</h3>
              <p className="text-sm text-gray-300">{dancerNames}</p>
              <p className="text-xs text-gray-400 mt-2">
                To edit participants, use the full entry form
              </p>
            </div>
          </div>

          {/* Footer */}
          <div className="flex justify-end gap-2 p-6 border-t border-white/20 bg-white/5">
            <button
              onClick={onClose}
              className="px-4 py-2 rounded-lg text-gray-400 hover:text-white hover:bg-white/10"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={isSaving}
              className="px-6 py-2 rounded-lg bg-purple-500 hover:bg-purple-600 text-white disabled:opacity-50"
            >
              {isSaving ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
```

**Usage Example:**
```tsx
const [editingEntry, setEditingEntry] = useState<Entry | null>(null);

// In entry card
<button onClick={() => setEditingEntry(entry)}>Quick Edit</button>

// Modal
<EntryEditModal
  entry={editingEntry}
  isOpen={!!editingEntry}
  onClose={() => setEditingEntry(null)}
  onSave={async (updates) => {
    await trpc.entry.update.mutate({ id: editingEntry.id, ...updates });
  }}
/>
```

**Validation:**
- Routine title: Required, non-empty
- Dance category: Required, one of valid options
- Props required: Boolean
- Special notes: Optional, max 500 chars

**Codex will**: Generate complete inline edit modal
**Claude will**: Integrate with entry list, connect to backend mutation
