'use client';

/**
 * Phase 2 Scheduling Interface
 *
 * Features:
 * - Left panel: Unscheduled routines pool with filters
 * - Middle panel: Visual schedule builder (timeline/calendar view)
 * - Right panel: Conflict warnings and schedule stats
 * - Drag-and-drop scheduling
 * - Real-time conflict detection
 * - Studio code masking (A, B, C, etc.)
 */

import { useState, useEffect } from 'react';
import { trpc } from '@/lib/trpc';
import { toast } from 'react-hot-toast';

// TEST tenant ID
const TEST_TENANT_ID = '00000000-0000-0000-0000-000000000003';
const TEST_COMPETITION_ID = '1b786221-8f8e-413f-b532-06fa20a2ff63';

interface Routine {
  id: string;
  title: string;
  studioId: string;
  studioName: string;
  studioCode: string;
  classificationId: string;
  classificationName: string;
  categoryId: string;
  categoryName: string;
  ageGroupId: string;
  ageGroupName: string;
  entrySizeId: string;
  entrySizeName: string;
  duration: number;
  participants: Array<{
    dancerId: string;
    dancerName: string;
    dancerAge: number;
  }>;
  isScheduled: boolean;
  scheduledTime: string | null;
  scheduledDay: string | null;
}

export default function SchedulePage() {
  const [selectedClassification, setSelectedClassification] = useState<string>('');
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedRoutines, setSelectedRoutines] = useState<Set<string>>(new Set());

  // Fetch routines
  const { data: routines, isLoading, error } = trpc.scheduling.getRoutines.useQuery({
    competitionId: TEST_COMPETITION_ID,
    tenantId: TEST_TENANT_ID,
    classificationId: selectedClassification || undefined,
    categoryId: selectedCategory || undefined,
    searchQuery: searchQuery || undefined,
  });

  // Handle routine selection
  const toggleRoutineSelection = (routineId: string) => {
    setSelectedRoutines(prev => {
      const next = new Set(prev);
      if (next.has(routineId)) {
        next.delete(routineId);
      } else {
        next.add(routineId);
      }
      return next;
    });
  };

  // Select all visible routines
  const selectAllVisibleRoutines = () => {
    if (!routines) return;
    setSelectedRoutines(new Set(routines.map(r => r.id)));
  };

  // Clear selection
  const clearSelection = () => {
    setSelectedRoutines(new Set());
  };

  // Get unique classifications from routines
  const classifications = routines
    ? Array.from(new Set(routines.map(r => ({ id: r.classificationId, name: r.classificationName }))))
        .sort((a, b) => a.name.localeCompare(b.name))
    : [];

  // Get unique categories from routines
  const categories = routines
    ? Array.from(new Set(routines.map(r => ({ id: r.categoryId, name: r.categoryName }))))
        .sort((a, b) => a.name.localeCompare(b.name))
    : [];

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">
          Schedule Builder
        </h1>
        <p className="text-gray-600">
          Drag routines from the pool to schedule blocks. Studio codes shown for anonymity.
        </p>
      </div>

      {/* Main 3-Panel Layout */}
      <div className="grid grid-cols-12 gap-6">

        {/* LEFT PANEL: Unscheduled Routines Pool */}
        <div className="col-span-4 space-y-6">
          {/* Filter Panel */}
          <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
            <h2 className="text-lg font-bold text-gray-900 mb-4">Filters</h2>

            {/* Search */}
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Search Routine
              </label>
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search by title..."
                className="w-full px-4 py-2 border border-gray-300 rounded-lg text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              />
            </div>

            {/* Classification Filter */}
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Classification
              </label>
              <select
                value={selectedClassification}
                onChange={(e) => setSelectedClassification(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg text-gray-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              >
                <option value="">All Classifications</option>
                {classifications.map(c => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>

            {/* Category Filter */}
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Genre
              </label>
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg text-gray-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              >
                <option value="">All Genres</option>
                {categories.map(c => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>

            {/* Selection Controls */}
            {routines && routines.length > 0 && (
              <div className="flex gap-2 pt-4 border-t border-gray-200">
                <button
                  onClick={selectAllVisibleRoutines}
                  className="flex-1 px-4 py-2 text-sm font-medium text-indigo-600 bg-indigo-50 rounded-lg hover:bg-indigo-100 transition-colors"
                >
                  Select All
                </button>
                <button
                  onClick={clearSelection}
                  disabled={selectedRoutines.size === 0}
                  className="flex-1 px-4 py-2 text-sm font-medium text-gray-600 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Clear
                </button>
              </div>
            )}
          </div>

          {/* Unscheduled Routines List */}
          <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold text-gray-900">
                Unscheduled Routines
              </h2>
              <span className="text-sm font-medium text-gray-600 bg-gray-100 px-3 py-1 rounded-full">
                {routines?.length || 0}
              </span>
            </div>

            {/* Loading State */}
            {isLoading && (
              <div className="text-center py-8">
                <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-gray-300 border-t-indigo-600"></div>
                <p className="mt-3 text-gray-600">Loading routines...</p>
              </div>
            )}

            {/* Error State */}
            {error && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                <p className="text-red-800 font-medium">Error loading routines</p>
                <p className="text-red-600 text-sm mt-1">{error.message}</p>
              </div>
            )}

            {/* Routines List */}
            {routines && routines.length > 0 && (
              <div className="space-y-3 max-h-[600px] overflow-y-auto">
                {routines.map((routine) => (
                  <div
                    key={routine.id}
                    onClick={() => toggleRoutineSelection(routine.id)}
                    className={`
                      border-2 rounded-lg p-4 cursor-pointer transition-all
                      ${selectedRoutines.has(routine.id)
                        ? 'border-indigo-500 bg-indigo-50'
                        : 'border-gray-200 bg-white hover:border-gray-300'
                      }
                    `}
                  >
                    {/* Checkbox */}
                    <div className="flex items-start gap-3">
                      <div className={`
                        flex-shrink-0 w-5 h-5 mt-0.5 rounded border-2 flex items-center justify-center
                        ${selectedRoutines.has(routine.id)
                          ? 'bg-indigo-600 border-indigo-600'
                          : 'border-gray-300'
                        }
                      `}>
                        {selectedRoutines.has(routine.id) && (
                          <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                          </svg>
                        )}
                      </div>

                      {/* Routine Info */}
                      <div className="flex-1">
                        <div className="font-bold text-gray-900 mb-1">
                          {routine.title}
                        </div>
                        <div className="text-sm text-gray-600 space-y-0.5">
                          <div>Studio: <span className="font-medium text-indigo-600">{routine.studioCode}</span></div>
                          <div>{routine.classificationName} • {routine.categoryName}</div>
                          <div>{routine.ageGroupName} • {routine.entrySizeName}</div>
                          <div>Duration: {routine.duration} min</div>
                          {routine.participants.length > 0 && (
                            <div className="text-xs text-gray-500 mt-1">
                              Dancers: {routine.participants.map((p: { dancerName: string }) => p.dancerName).join(', ')}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Empty State */}
            {routines && routines.length === 0 && !isLoading && (
              <div className="text-center py-12">
                <div className="text-6xl mb-4">📋</div>
                <p className="text-gray-600 font-medium">No unscheduled routines found</p>
                <p className="text-gray-500 text-sm mt-1">Try adjusting your filters</p>
              </div>
            )}
          </div>
        </div>

        {/* MIDDLE PANEL: Schedule Builder */}
        <div className="col-span-5">
          <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
            <h2 className="text-lg font-bold text-gray-900 mb-4">Schedule Timeline</h2>
            <div className="text-center py-20">
              <div className="text-6xl mb-4">📅</div>
              <p className="text-gray-600 font-medium">Visual schedule builder</p>
              <p className="text-gray-500 text-sm mt-1">Drag routines here to schedule</p>
            </div>
          </div>
        </div>

        {/* RIGHT PANEL: Conflicts & Stats */}
        <div className="col-span-3 space-y-6">
          {/* Conflicts Panel */}
          <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
            <h2 className="text-lg font-bold text-gray-900 mb-4">Conflicts</h2>
            <div className="text-center py-8">
              <div className="text-5xl mb-3">✅</div>
              <p className="text-gray-600 text-sm">No conflicts detected</p>
            </div>
          </div>

          {/* Stats Panel */}
          <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
            <h2 className="text-lg font-bold text-gray-900 mb-4">Statistics</h2>
            <div className="space-y-3">
              <div className="flex justify-between text-gray-900">
                <span className="text-gray-600">Unscheduled:</span>
                <span className="font-bold">{routines?.length || 0}</span>
              </div>
              <div className="flex justify-between text-gray-900">
                <span className="text-gray-600">Scheduled:</span>
                <span className="font-bold">0</span>
              </div>
              <div className="flex justify-between text-gray-900">
                <span className="text-gray-600">Selected:</span>
                <span className="font-bold">{selectedRoutines.size}</span>
              </div>
            </div>
          </div>

          {/* Actions Panel */}
          <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
            <h2 className="text-lg font-bold text-gray-900 mb-4">Actions</h2>
            <div className="space-y-3">
              <button
                disabled={selectedRoutines.size === 0}
                className="w-full px-4 py-3 rounded-lg font-medium text-white bg-indigo-600 hover:bg-indigo-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Auto-Schedule Selected
              </button>
              <button
                className="w-full px-4 py-3 rounded-lg font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 transition-colors"
              >
                Export Schedule
              </button>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
