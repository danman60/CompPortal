'use client';

/**
 * RoutinePool Component
 *
 * Display pool of unscheduled routines with:
 * - Table view (default) or Cards view
 * - Toggle button to switch views
 * - Loading skeleton states
 * - Error handling
 * - Empty state (all routines scheduled)
 * - Bulk selection
 *
 * Created: Session 56 (Frontend Component Extraction - Part 2)
 * Updated: Added table view + toggle (Session 64)
 * Spec: SCHEDULING_SPEC_V4_UNIFIED.md
 */

import React, { useState } from 'react';
import { RoutineCard, Routine, ViewMode } from './RoutineCard';
import { useDraggable } from '@dnd-kit/core';

interface FilterOption {
  id: string;
  label: string;
}

export interface FilterState {
  classifications: string[];
  ageGroups: string[];
  genres: string[];
  groupSizes: string[];
  studios: string[];
  routineAges: string[];
  search: string;
}

interface RoutinePoolProps {
  routines: Routine[];
  isLoading?: boolean;
  error?: { message: string } | null;
  viewMode: ViewMode;
  isDraggingAnything?: boolean;
  onRequestClick?: (routineId: string) => void;
  onNoteClick?: (routineId: string, routineTitle: string) => void;
  // Visual indicators (Session 58)
  conflicts?: Array<{ routine1Id: string; routine2Id: string; severity: 'critical' | 'error' | 'warning' }>;
  trophyHelper?: Array<{ routineId: string }>;
  ageChanges?: string[];
  routineNotes?: Record<string, boolean>;
  routineNotesText?: Record<string, string>; // Map of routine ID → note text for tooltips
  // Bulk selection (Session 63)
  selectedRoutineIds?: Set<string>;
  onToggleSelection?: (routineId: string, shiftKey: boolean) => void;
  onSelectAll?: () => void;
  onDeselectAll?: () => void;
  // Filter options and state (Session 64)
  classifications?: FilterOption[];
  ageGroups?: FilterOption[];
  genres?: FilterOption[];
  groupSizes?: FilterOption[];
  studios?: FilterOption[];
  routineAges?: FilterOption[];
  filters?: FilterState;
  onFiltersChange?: (filters: FilterState) => void;
  totalRoutines?: number;
  filteredRoutines?: number;
}

// Helper: Get classification color
function getClassificationColor(classification: string): string {
  const lower = classification.toLowerCase();
  if (lower.includes('emerald')) return 'bg-emerald-600 text-white';
  if (lower.includes('sapphire')) return 'bg-blue-600 text-white';
  if (lower.includes('crystal')) return 'bg-cyan-600 text-white';
  if (lower.includes('titanium')) return 'bg-slate-600 text-white';
  if (lower.includes('production')) return 'bg-purple-600 text-white';
  return 'bg-gray-500 text-white';
}

// Draggable Table Row
function DraggableRoutineRow({ routine, viewMode, hasConflict, conflictSeverity, hasNotes, noteText, hasAgeChange, isLastRoutine, isSelected, onToggleSelection }: {
  routine: Routine;
  viewMode: ViewMode;
  hasConflict: boolean;
  conflictSeverity: 'critical' | 'error' | 'warning';
  hasNotes: boolean;
  noteText?: string;
  hasAgeChange: boolean;
  isLastRoutine: boolean;
  isSelected: boolean;
  onToggleSelection?: (routineId: string, shiftKey: boolean) => void;
}) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: routine.id,
  });

  const style = isDragging ? { opacity: 0.5 } : {};

  // Always show studio code (5-digit code)
  const studioDisplay = routine.studioCode;

  // Row classes
  const rowClasses = [
    'border-b border-white/10 hover:bg-white/5 transition-colors cursor-grab',
    isLastRoutine ? 'bg-yellow-500/10 border-l-4 border-l-yellow-400' : '',
    hasAgeChange ? 'bg-yellow-900/30' : '',
    hasConflict ? 'border-l-4 border-l-red-500' : '',
    isDragging ? 'opacity-50' : '',
  ].filter(Boolean).join(' ');

  return (
    <tr
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      className={rowClasses}
    >
      {/* Checkbox */}
      <td className="px-1 py-2 align-middle">
        {onToggleSelection && (
          <input
            type="checkbox"
            checked={isSelected}
            onChange={(e) => {
              e.stopPropagation();
              onToggleSelection(routine.id, (e.nativeEvent as MouseEvent).shiftKey);
            }}
            className="w-4 h-4 rounded border-2 border-white/40 bg-white/10 checked:bg-purple-600 checked:border-purple-600 cursor-pointer hover:border-white/60 transition-colors"
            title={isSelected ? "Deselect routine" : "Select routine"}
          />
        )}
      </td>

      {/* Title with indicators */}
      <td className="px-1 py-2 text-xs font-medium text-white align-middle w-32">
        <div className="flex flex-col gap-0.5 min-w-0">
          <div className="flex items-center gap-1 min-w-0">
            <span className="truncate" title={routine.title}>{routine.title}</span>
            <div className="flex items-center gap-0.5 flex-shrink-0">
              {isLastRoutine && <span className="text-yellow-400" title="Last in category">🏆</span>}
              {hasConflict && <span className="text-red-400" title="Has conflict">⚠️</span>}
              {hasNotes && <span className="text-blue-400" title={noteText ? `Note: ${noteText}` : "Has notes"}>📝</span>}
              {hasAgeChange && <span className="text-yellow-400" title="Age changed">🎂</span>}
            </div>
          </div>
          {/* Dancer names for Solo/Duet-Trio */}
          {(routine.entrySizeName === 'Solo' || routine.entrySizeName === 'Duet/Trio') && routine.participants.length > 0 && (
            <div className="text-[10px] text-gray-400 truncate">
              {routine.participants.map(p => {
                const parts = p.dancerName.split(' ');
                if (parts.length >= 2) {
                  const firstName = parts[0];
                  const lastInitial = parts[parts.length - 1].charAt(0);
                  return `${firstName} ${lastInitial}.`;
                }
                return p.dancerName;
              }).join(', ')}
            </div>
          )}
        </div>
      </td>

      {/* Studio */}
      <td className="px-1 py-2 text-xs text-white/80 align-middle whitespace-nowrap w-8 text-center">{studioDisplay}</td>

      {/* Classification */}
      <td className="px-1 py-2 align-middle w-24">
        <span className={`inline-block px-1.5 py-0.5 rounded-md text-xs font-semibold truncate ${getClassificationColor(routine.classificationName)}`}>
          {routine.classificationName}
        </span>
      </td>

      {/* Size */}
      <td className="px-1 py-2 text-xs text-white/80 align-middle whitespace-nowrap w-16">{routine.entrySizeName}</td>

      {/* Routine Age */}
      <td className="px-1 py-2 text-xs text-white/80 align-middle whitespace-nowrap w-12 text-center">
        {routine.routineAge ?? '-'}
      </td>

      {/* Overalls Age (Age Group) */}
      <td className="px-1 py-2 text-xs text-white/80 align-middle whitespace-nowrap w-16">{routine.ageGroupName}</td>

      {/* Category */}
      <td className="px-1 py-2 text-xs text-white/80 align-middle whitespace-nowrap w-20">{routine.categoryName}</td>

      {/* Duration */}
      <td className="px-1 py-2 text-xs text-white/80 align-middle whitespace-nowrap w-20">⏱️ {routine.duration} min</td>
    </tr>
  );
}

export function RoutinePool({
  routines,
  isLoading = false,
  error = null,
  viewMode,
  isDraggingAnything = false,
  onRequestClick,
  onNoteClick,
  conflicts = [],
  trophyHelper = [],
  ageChanges = [],
  routineNotes = {},
  routineNotesText = {},
  selectedRoutineIds = new Set(),
  onToggleSelection,
  onSelectAll,
  onDeselectAll,
  classifications = [],
  ageGroups = [],
  genres = [],
  groupSizes = [],
  studios = [],
  routineAges = [],
  filters = { classifications: [], ageGroups: [], genres: [], groupSizes: [], studios: [], routineAges: [], search: '' },
  onFiltersChange,
  totalRoutines = 0,
  filteredRoutines = 0,
}: RoutinePoolProps) {
  const isEmpty = routines.length === 0 && !isLoading;

  // Display mode: 'table' (default) or 'cards'
  const [displayMode, setDisplayMode] = useState<'table' | 'cards'>('table');

  // Dropdown state for each filter category
  const [openDropdown, setOpenDropdown] = useState<string | null>(null);

  // Helper: Check if routine has conflict
  const hasConflict = (routineId: string) => {
    return conflicts.some((c) => c.routine1Id === routineId || c.routine2Id === routineId);
  };

  // Helper: Get conflict severity
  const getConflictSeverity = (routineId: string): 'critical' | 'error' | 'warning' => {
    const routineConflicts = conflicts.filter((c) => c.routine1Id === routineId || c.routine2Id === routineId);
    if (routineConflicts.length === 0) return 'warning';
    return routineConflicts.reduce((max, c) => {
      const severityOrder = { critical: 3, error: 2, warning: 1 };
      return severityOrder[c.severity] > severityOrder[max] ? c.severity : max;
    }, 'warning' as 'critical' | 'error' | 'warning');
  };

  // Helper: Check if routine is last (trophy helper)
  const isLastRoutine = (routineId: string) => {
    return trophyHelper.some((t) => t.routineId === routineId);
  };

  return (
    <div className="bg-white/10 backdrop-blur-md rounded-xl border border-white/20 p-4 shadow-[0_8px_32px_rgba(0,0,0,0.1)]">
      {/* Unified Header Section */}
      <div className="mb-3 space-y-2">
        {/* Title Row + View Toggle + Bulk Selection */}
        <div className="flex items-center justify-between pb-2 border-b border-white/10">
          {/* Left: Title + Count */}
          <div className="flex items-center gap-2">
            <h2 className="text-base font-bold text-white">
              Unscheduled Routines
            </h2>
            <span className="text-xs font-medium text-white bg-purple-600 px-2 py-0.5 rounded-full">
              {routines.length}
            </span>
            {/* Bulk Selection Info */}
            {routines.length > 0 && onSelectAll && onDeselectAll && selectedRoutineIds.size > 0 && (
              <span className="text-xs text-white/70">
                • {selectedRoutineIds.size} selected
              </span>
            )}
          </div>

          {/* Right: Bulk Actions + View Toggle */}
          <div className="flex items-center gap-2">
            {/* Bulk Selection Buttons */}
            {routines.length > 0 && onSelectAll && onDeselectAll && (
              <>
                {selectedRoutineIds.size === 0 && (
                  <button
                    onClick={onSelectAll}
                    className="px-2 py-1 bg-purple-600 hover:bg-purple-700 text-white text-xs font-medium rounded transition-colors"
                    title="Select all filtered routines"
                  >
                    ✓ Select All
                  </button>
                )}
                {selectedRoutineIds.size > 0 && (
                  <button
                    onClick={onDeselectAll}
                    className="px-2 py-1 bg-white/10 hover:bg-white/20 text-white text-xs font-medium rounded transition-colors"
                    title="Clear selection"
                  >
                    Clear
                  </button>
                )}
              </>
            )}

            {/* View Toggle */}
            <div className="flex items-center bg-white/10 border border-white/20 rounded-lg overflow-hidden">
              <button
                onClick={() => setDisplayMode('table')}
                className={`px-2 py-1 text-xs font-medium transition-colors ${
                  displayMode === 'table'
                    ? 'bg-purple-600 text-white'
                    : 'text-white/70 hover:text-white hover:bg-white/5'
                }`}
                title="Table view"
              >
                ⊞ Table
              </button>
              <button
                onClick={() => setDisplayMode('cards')}
                className={`px-2 py-1 text-xs font-medium transition-colors ${
                  displayMode === 'cards'
                    ? 'bg-purple-600 text-white'
                    : 'text-white/70 hover:text-white hover:bg-white/5'
                }`}
                title="Cards view"
              >
                ⊟ Cards
              </button>
            </div>
          </div>
        </div>

        {/* Search + Filters */}
        {onFiltersChange && (
          <div className="space-y-2">
            {/* Search Box (above filters) */}
            <div>
              <input
                type="text"
                value={filters.search}
                onChange={(e) => onFiltersChange({ ...filters, search: e.target.value })}
                placeholder="🔍 Search routines..."
                className="w-full px-3 py-2 bg-black/20 border border-white/20 rounded-lg text-white text-sm placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all"
              />
            </div>

            {/* Filters on same line */}
            <div className="flex flex-nowrap items-center gap-1 overflow-x-auto custom-scrollbar py-1">
            {/* Classification Filter */}
            {classifications.length > 0 && (
              <FilterDropdown
                label="Class"
                options={classifications}
                selectedIds={filters.classifications}
                onToggle={(id) => {
                  const newValues = filters.classifications.includes(id)
                    ? filters.classifications.filter(v => v !== id)
                    : [...filters.classifications, id];
                  onFiltersChange({ ...filters, classifications: newValues });
                }}
                isOpen={openDropdown === 'classifications'}
                onToggleOpen={() => setOpenDropdown(openDropdown === 'classifications' ? null : 'classifications')}
              />
            )}

            {/* Age Group Filter */}
            {ageGroups.length > 0 && (
              <FilterDropdown
                label="Age"
                options={ageGroups}
                selectedIds={filters.ageGroups}
                onToggle={(id) => {
                  const newValues = filters.ageGroups.includes(id)
                    ? filters.ageGroups.filter(v => v !== id)
                    : [...filters.ageGroups, id];
                  onFiltersChange({ ...filters, ageGroups: newValues });
                }}
                isOpen={openDropdown === 'ageGroups'}
                onToggleOpen={() => setOpenDropdown(openDropdown === 'ageGroups' ? null : 'ageGroups')}
              />
            )}

            {/* Category Filter */}
            {genres.length > 0 && (
              <FilterDropdown
                label="Category"
                options={genres}
                selectedIds={filters.genres}
                onToggle={(id) => {
                  const newValues = filters.genres.includes(id)
                    ? filters.genres.filter(v => v !== id)
                    : [...filters.genres, id];
                  onFiltersChange({ ...filters, genres: newValues });
                }}
                isOpen={openDropdown === 'genres'}
                onToggleOpen={() => setOpenDropdown(openDropdown === 'genres' ? null : 'genres')}
              />
            )}

            {/* Group Size Filter */}
            {groupSizes.length > 0 && (
              <FilterDropdown
                label="Size"
                options={groupSizes}
                selectedIds={filters.groupSizes}
                onToggle={(id) => {
                  const newValues = filters.groupSizes.includes(id)
                    ? filters.groupSizes.filter(v => v !== id)
                    : [...filters.groupSizes, id];
                  onFiltersChange({ ...filters, groupSizes: newValues });
                }}
                isOpen={openDropdown === 'groupSizes'}
                onToggleOpen={() => setOpenDropdown(openDropdown === 'groupSizes' ? null : 'groupSizes')}
              />
            )}

            {/* Studio Filter */}
            {studios.length > 0 && (
              <FilterDropdown
                label="Studio"
                options={studios}
                selectedIds={filters.studios}
                onToggle={(id) => {
                  const newValues = filters.studios.includes(id)
                    ? filters.studios.filter(v => v !== id)
                    : [...filters.studios, id];
                  onFiltersChange({ ...filters, studios: newValues });
                }}
                isOpen={openDropdown === 'studios'}
                onToggleOpen={() => setOpenDropdown(openDropdown === 'studios' ? null : 'studios')}
              />
            )}

            {/* Routine Age Filter */}
            {routineAges.length > 0 && (
              <FilterDropdown
                label="Routine Age"
                options={routineAges}
                selectedIds={filters.routineAges}
                onToggle={(id) => {
                  const newValues = filters.routineAges.includes(id)
                    ? filters.routineAges.filter(v => v !== id)
                    : [...filters.routineAges, id];
                  onFiltersChange({ ...filters, routineAges: newValues });
                }}
                isOpen={openDropdown === 'routineAges'}
                onToggleOpen={() => setOpenDropdown(openDropdown === 'routineAges' ? null : 'routineAges')}
              />
            )}

            {/* Clear Filters */}
            {(filters.classifications.length > 0 || filters.ageGroups.length > 0 || filters.genres.length > 0 || filters.groupSizes.length > 0 || filters.studios.length > 0 || filters.routineAges.length > 0 || filters.search.length > 0) && (
              <button
                onClick={() => onFiltersChange({ classifications: [], ageGroups: [], genres: [], groupSizes: [], studios: [], routineAges: [], search: '' })}
                className="px-2 py-1 bg-white/10 hover:bg-white/20 text-white text-xs font-medium rounded transition-colors flex-shrink-0 whitespace-nowrap"
                title="Clear all filters"
              >
                ✕ Clear
              </button>
            )}
            </div>
          </div>
        )}

      </div>

      {/* Loading State - Skeleton Loaders */}
      {isLoading && (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="bg-white/10 border border-white/20 rounded-xl p-4 animate-pulse">
              <div className="flex items-start justify-between mb-2">
                <div className="h-5 bg-white/20 rounded w-3/4"></div>
                <div className="h-6 w-8 bg-white/20 rounded"></div>
              </div>
              <div className="h-8 bg-white/15 rounded-lg w-2/3 mb-2"></div>
              <div className="h-4 bg-white/10 rounded w-1/2"></div>
            </div>
          ))}
        </div>
      )}

      {/* Error State */}
      {error && (
        <div className="bg-red-900/50 border border-red-500 rounded-lg p-4">
          <p className="text-red-200 font-medium">Error loading routines</p>
          <p className="text-red-300 text-sm mt-1">{error.message}</p>
        </div>
      )}

      {/* TABLE VIEW */}
      {displayMode === 'table' && routines.length > 0 && !isLoading && (
        <div className="bg-white/10 backdrop-blur-md rounded-xl border border-white/20 overflow-hidden">
          <div className="h-full overflow-y-auto custom-scrollbar">
            <table className="w-full" style={{ tableLayout: 'fixed' }}>
              <thead>
                <tr className="bg-white/10 border-b border-white/20">
                  <th className="px-1 py-2 text-center text-xs font-semibold text-white/80 uppercase tracking-wider align-middle" style={{ width: '30px' }}>
                    {onSelectAll && onDeselectAll && (
                      <input
                        type="checkbox"
                        checked={selectedRoutineIds.size > 0 && selectedRoutineIds.size === routines.length}
                        onChange={(e) => {
                          if (e.target.checked) {
                            onSelectAll();
                          } else {
                            onDeselectAll();
                          }
                        }}
                        className="w-4 h-4 rounded border-white/30 bg-white/10 text-purple-600 focus:ring-2 focus:ring-purple-500 cursor-pointer"
                        title="Select all"
                      />
                    )}
                  </th>
                  <th className="px-1 py-2 text-left text-xs font-semibold text-white/80 uppercase tracking-wider align-middle" style={{ width: '100px' }}>
                    Routine
                  </th>
                  <th className="px-1 py-2 text-center text-xs font-semibold text-white/80 uppercase tracking-wider align-middle" style={{ width: '35px' }}>
                    Std
                  </th>
                  <th className="px-1 py-2 text-left text-xs font-semibold text-white/80 uppercase tracking-wider align-middle" style={{ width: '80px' }}>
                    Class
                  </th>
                  <th className="px-1 py-2 text-left text-xs font-semibold text-white/80 uppercase tracking-wider align-middle" style={{ width: '65px' }}>
                    Size
                  </th>
                  <th className="px-1 py-2 text-center text-xs font-semibold text-white/80 uppercase tracking-wider align-middle" style={{ width: '40px' }}>
                    RA
                  </th>
                  <th className="px-1 py-2 text-left text-xs font-semibold text-white/80 uppercase tracking-wider align-middle" style={{ width: '65px' }}>
                    Age
                  </th>
                  <th className="px-1 py-2 text-left text-xs font-semibold text-white/80 uppercase tracking-wider align-middle" style={{ width: '75px' }}>
                    Genre
                  </th>
                  <th className="px-1 py-2 text-center text-xs font-semibold text-white/80 uppercase tracking-wider align-middle" style={{ width: '60px' }}>
                    Dur
                  </th>
                </tr>
              </thead>
              <tbody>
                {routines.map((routine) => (
                  <DraggableRoutineRow
                    key={routine.id}
                    routine={routine}
                    viewMode={viewMode}
                    hasConflict={hasConflict(routine.id)}
                    conflictSeverity={getConflictSeverity(routine.id)}
                    hasNotes={routineNotes[routine.id] || false}
                    noteText={routineNotesText[routine.id]}
                    hasAgeChange={ageChanges.includes(routine.id)}
                    isLastRoutine={isLastRoutine(routine.id)}
                    isSelected={selectedRoutineIds.has(routine.id)}
                    onToggleSelection={onToggleSelection}
                  />
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* CARDS VIEW */}
      {displayMode === 'cards' && routines.length > 0 && !isLoading && (
        <div className="grid grid-cols-2 gap-2 h-full overflow-y-auto pr-2 custom-scrollbar">
          {routines.map((routine) => (
            <RoutineCard
              key={routine.id}
              routine={routine}
              viewMode={viewMode}
              isDraggingAnything={isDraggingAnything}
              onRequestClick={onRequestClick}
              onNoteClick={onNoteClick}
              hasConflict={hasConflict(routine.id)}
              conflictSeverity={getConflictSeverity(routine.id)}
              hasNotes={routineNotes[routine.id] || false}
              hasAgeChange={ageChanges.includes(routine.id)}
              isLastRoutine={isLastRoutine(routine.id)}
              isSelected={selectedRoutineIds.has(routine.id)}
              onToggleSelection={onToggleSelection}
            />
          ))}
        </div>
      )}

      {/* Empty State */}
      {isEmpty && (
        <div className="text-center py-12">
          <div className="text-6xl mb-4">✅</div>
          <p className="text-purple-200 font-medium">All routines scheduled!</p>
        </div>
      )}
    </div>
  );
}

// FilterDropdown Component
function FilterDropdown({
  label,
  options,
  selectedIds,
  onToggle,
  isOpen,
  onToggleOpen,
}: {
  label: string;
  options: FilterOption[];
  selectedIds: string[];
  onToggle: (id: string) => void;
  isOpen: boolean;
  onToggleOpen: () => void;
}) {
  const selectedCount = selectedIds.length;
  const dropdownRef = React.useRef<HTMLDivElement>(null);
  const buttonRef = React.useRef<HTMLButtonElement>(null);
  const [dropdownPosition, setDropdownPosition] = React.useState({ top: 0, left: 0 });

  // Calculate dropdown position when it opens and on scroll/resize
  React.useEffect(() => {
    if (!isOpen || !buttonRef.current) return;

    const updatePosition = () => {
      if (buttonRef.current) {
        const rect = buttonRef.current.getBoundingClientRect();
        // For position:fixed, use viewport coordinates directly (no scroll offset)
        setDropdownPosition({
          top: rect.bottom + 4,   // 4px gap below button
          left: rect.left,
        });
      }
    };

    // Initial position
    updatePosition();

    // Update on scroll (parent might scroll, changing button's viewport position)
    window.addEventListener('scroll', updatePosition, true); // Use capture to catch all scrolls
    window.addEventListener('resize', updatePosition);

    return () => {
      window.removeEventListener('scroll', updatePosition, true);
      window.removeEventListener('resize', updatePosition);
    };
  }, [isOpen]);

  // Close dropdown when clicking outside
  React.useEffect(() => {
    if (!isOpen) return;

    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        onToggleOpen(); // Close the dropdown
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen, onToggleOpen]);

  return (
    <div ref={dropdownRef} className="relative flex-shrink-0">
      <button
        ref={buttonRef}
        onClick={onToggleOpen}
        className={`px-2 py-1 text-xs font-medium rounded border transition-colors whitespace-nowrap ${
          selectedCount > 0
            ? 'bg-purple-600 text-white border-purple-500'
            : 'bg-white/10 text-white/80 border-white/20 hover:bg-white/20'
        }`}
      >
        {label}{selectedCount > 0 && ` (${selectedCount})`} ▼
      </button>

      {isOpen && (
        <div
          className="fixed z-[9999] bg-gray-900 border border-white/20 rounded-lg shadow-xl min-w-[200px] max-h-[300px] overflow-y-auto custom-scrollbar"
          style={{
            top: `${dropdownPosition.top}px`,
            left: `${dropdownPosition.left}px`,
          }}
        >
          {options.map((option) => (
            <button
              key={option.id}
              onClick={() => {
                onToggle(option.id);
                onToggleOpen(); // Close dropdown after selection
              }}
              className={`w-full px-3 py-2 text-left text-sm transition-colors ${
                selectedIds.includes(option.id)
                  ? 'bg-purple-600 text-white'
                  : 'text-white/80 hover:bg-white/10'
              }`}
            >
              <span className="mr-2">{selectedIds.includes(option.id) ? '✓' : ' '}</span>
              {option.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
