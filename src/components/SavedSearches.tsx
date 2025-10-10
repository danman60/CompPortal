'use client';

import { useState } from 'react';
import { useSavedSearches, type SavedSearch } from '@/hooks/useSavedSearches';
import toast from 'react-hot-toast';

interface SavedSearchesProps {
  context: SavedSearch['context'];
  currentFilters: Record<string, any>;
  onApplySearch: (filters: Record<string, any>) => void;
  className?: string;
}

/**
 * Saved Searches Component
 * Allows users to save and quickly apply common filter combinations
 */
export default function SavedSearches({
  context,
  currentFilters,
  onApplySearch,
  className = '',
}: SavedSearchesProps) {
  const {
    searches,
    saveSearch,
    applySearch,
    deleteSearch,
    renameSearch,
    clearAll,
  } = useSavedSearches({ context });

  const [isOpen, setIsOpen] = useState(false);
  const [showSaveModal, setShowSaveModal] = useState(false);
  const [newSearchName, setNewSearchName] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState('');

  const handleSaveSearch = () => {
    if (!newSearchName.trim()) {
      toast.error('Please enter a search name');
      return;
    }

    // Check if current filters are empty
    const hasFilters = Object.values(currentFilters).some((val) =>
      val !== null && val !== undefined && val !== '' && val !== 'all'
    );

    if (!hasFilters) {
      toast.error('No active filters to save');
      return;
    }

    saveSearch(newSearchName, currentFilters);
    toast.success(`Search "${newSearchName}" saved`);
    setNewSearchName('');
    setShowSaveModal(false);
  };

  const handleApplySearch = (searchId: string) => {
    const filters = applySearch(searchId);
    if (filters) {
      onApplySearch(filters);
      setIsOpen(false);
      toast.success('Search applied');
    }
  };

  const handleDeleteSearch = (searchId: string, name: string) => {
    if (confirm(`Delete saved search "${name}"?`)) {
      deleteSearch(searchId);
      toast.success('Search deleted');
    }
  };

  const handleRenameSearch = (searchId: string) => {
    if (!editingName.trim()) {
      toast.error('Please enter a search name');
      return;
    }

    renameSearch(searchId, editingName);
    setEditingId(null);
    setEditingName('');
    toast.success('Search renamed');
  };

  return (
    <div className={`relative ${className}`}>
      {/* Saved Searches Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="px-4 py-2 bg-white/5 hover:bg-purple-500/20 border border-white/10 hover:border-purple-500/50 rounded-lg text-sm font-medium text-gray-300 hover:text-purple-300 transition-all flex items-center gap-2"
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
        </svg>
        Saved Searches
        {searches.length > 0 && (
          <span className="ml-1 px-2 py-0.5 bg-purple-500/20 text-purple-300 rounded-full text-xs font-semibold">
            {searches.length}
          </span>
        )}
      </button>

      {/* Dropdown */}
      {isOpen && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 z-40"
            onClick={() => setIsOpen(false)}
          />

          {/* Panel */}
          <div className="absolute left-0 mt-2 w-80 bg-gray-900 border border-white/20 rounded-xl shadow-2xl z-50 animate-fade-in">
            {/* Header */}
            <div className="p-4 border-b border-white/10 flex items-center justify-between">
              <h3 className="text-sm font-semibold text-white">Saved Searches</h3>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setShowSaveModal(true)}
                  className="px-3 py-1 bg-purple-500/20 hover:bg-purple-500/30 text-purple-300 rounded-lg text-xs font-medium transition-all border border-purple-500/50"
                >
                  + Save Current
                </button>
                {searches.length > 0 && (
                  <button
                    onClick={() => {
                      if (confirm('Clear all saved searches?')) {
                        clearAll();
                        toast.success('All searches cleared');
                      }
                    }}
                    className="text-xs text-gray-400 hover:text-red-300 transition-colors"
                  >
                    Clear All
                  </button>
                )}
              </div>
            </div>

            {/* Searches List */}
            <div className="max-h-96 overflow-y-auto">
              {searches.length === 0 ? (
                <div className="p-8 text-center">
                  <div className="text-4xl mb-2">🔖</div>
                  <p className="text-sm text-gray-400">No saved searches yet</p>
                  <p className="text-xs text-gray-500 mt-1">Apply filters and click "Save Current"</p>
                </div>
              ) : (
                <div className="p-2 space-y-1">
                  {searches.map((search) => (
                    <div
                      key={search.id}
                      className="group p-3 hover:bg-white/5 rounded-lg border border-white/5 hover:border-purple-500/30 transition-all"
                    >
                      {editingId === search.id ? (
                        <div className="flex gap-2">
                          <input
                            type="text"
                            value={editingName}
                            onChange={(e) => setEditingName(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') handleRenameSearch(search.id);
                              if (e.key === 'Escape') {
                                setEditingId(null);
                                setEditingName('');
                              }
                            }}
                            className="flex-1 px-2 py-1 bg-white/10 border border-white/20 rounded text-white text-sm focus:outline-none focus:ring-1 focus:ring-purple-500"
                            autoFocus
                          />
                          <button
                            onClick={() => handleRenameSearch(search.id)}
                            className="px-2 py-1 bg-green-500/20 text-green-300 rounded text-xs"
                          >
                            ✓
                          </button>
                          <button
                            onClick={() => {
                              setEditingId(null);
                              setEditingName('');
                            }}
                            className="px-2 py-1 bg-red-500/20 text-red-300 rounded text-xs"
                          >
                            ✗
                          </button>
                        </div>
                      ) : (
                        <>
                          <div className="flex items-start justify-between gap-2">
                            <button
                              onClick={() => handleApplySearch(search.id)}
                              className="flex-1 text-left"
                            >
                              <div className="text-sm font-medium text-white">
                                {search.name}
                              </div>
                              <div className="text-xs text-gray-500 mt-1">
                                {Object.entries(search.filters)
                                  .filter(([, val]) => val !== null && val !== '' && val !== 'all')
                                  .map(([key, val]) => `${key}: ${val}`)
                                  .join(' • ')}
                              </div>
                              <div className="text-xs text-gray-600 mt-1">
                                Used {search.usageCount} time{search.usageCount !== 1 ? 's' : ''}
                              </div>
                            </button>
                            <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                              <button
                                onClick={() => {
                                  setEditingId(search.id);
                                  setEditingName(search.name);
                                }}
                                className="p-1 hover:bg-white/10 rounded text-gray-400 hover:text-purple-300"
                                title="Rename"
                              >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                </svg>
                              </button>
                              <button
                                onClick={() => handleDeleteSearch(search.id, search.name)}
                                className="p-1 hover:bg-red-500/20 rounded text-gray-400 hover:text-red-300"
                                title="Delete"
                              >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                </svg>
                              </button>
                            </div>
                          </div>
                        </>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </>
      )}

      {/* Save Search Modal */}
      {showSaveModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-gray-900 border border-white/20 rounded-xl p-6 w-full max-w-md mx-4">
            <h3 className="text-xl font-bold text-white mb-4">Save Search</h3>

            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Search Name
              </label>
              <input
                type="text"
                value={newSearchName}
                onChange={(e) => setNewSearchName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleSaveSearch();
                  if (e.key === 'Escape') {
                    setShowSaveModal(false);
                    setNewSearchName('');
                  }
                }}
                placeholder="e.g., Pending Invoices, Jazz Routines..."
                className="w-full px-4 py-3 bg-white/5 border border-white/20 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500"
                autoFocus
              />
            </div>

            <div className="mb-4">
              <div className="text-sm font-medium text-gray-400 mb-2">Current Filters:</div>
              <div className="bg-white/5 rounded-lg p-3 text-xs text-gray-300">
                {Object.entries(currentFilters)
                  .filter(([, val]) => val !== null && val !== '' && val !== 'all')
                  .map(([key, val]) => (
                    <div key={key} className="mb-1">
                      <span className="text-purple-400">{key}:</span> {String(val)}
                    </div>
                  ))}
              </div>
            </div>

            <div className="flex gap-3">
              <button
                onClick={handleSaveSearch}
                className="flex-1 px-4 py-3 bg-purple-500 hover:bg-purple-600 text-white rounded-lg font-semibold transition-all"
              >
                Save Search
              </button>
              <button
                onClick={() => {
                  setShowSaveModal(false);
                  setNewSearchName('');
                }}
                className="flex-1 px-4 py-3 bg-white/5 hover:bg-white/10 text-white rounded-lg font-semibold transition-all border border-white/20"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
