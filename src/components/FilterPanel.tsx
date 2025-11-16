'use client';

/**
 * FilterPanel Component
 *
 * Multi-select filter panel for unscheduled routines pool:
 * - Classification filters (Emerald, Sapphire, Crystal, Titanium)
 * - Age Group filters (Mini, Junior, Teen, Senior, etc.)
 * - Genre filters (Ballet, Jazz, Contemporary, Tap, Hip Hop, etc.)
 * - Studio filters (by studio code: A, B, C, D, etc.)
 * - Search bar (routine title search)
 *
 * Created: Session 56 (Frontend Component Extraction)
 * Spec: SCHEDULING_SPEC_V4_UNIFIED.md
 */

import { useState } from 'react';

export interface FilterState {
  classifications: string[]; // classification IDs
  ageGroups: string[]; // age group IDs
  genres: string[]; // category IDs
  studios: string[]; // studio IDs
  search: string; // routine title search
}

interface FilterOption {
  id: string;
  label: string;
  color?: string; // For classification/age group badges
  icon?: string; // Optional emoji icon
}

interface FilterPanelProps {
  // Available options
  classifications: FilterOption[];
  ageGroups: FilterOption[];
  genres: FilterOption[];
  studios: FilterOption[];

  // Current filter state
  filters: FilterState;
  onFiltersChange: (filters: FilterState) => void;

  // Stats
  totalRoutines?: number;
  filteredRoutines?: number;

  // UI state
  isCollapsed?: boolean;
  onToggleCollapse?: () => void;
}

export function FilterPanel({
  classifications,
  ageGroups,
  genres,
  studios,
  filters,
  onFiltersChange,
  totalRoutines = 0,
  filteredRoutines = 0,
  isCollapsed = false,
  onToggleCollapse,
}: FilterPanelProps) {
  const [expandedSections, setExpandedSections] = useState({
    classification: true,
    ageGroup: true,
    genre: true,
    studio: false, // Collapsed by default (many studios)
  });

  const toggleSection = (section: keyof typeof expandedSections) => {
    setExpandedSections((prev) => ({
      ...prev,
      [section]: !prev[section],
    }));
  };

  const toggleFilter = (category: keyof FilterState, value: string) => {
    if (category === 'search') return; // Search handled separately

    const currentValues = filters[category] as string[];
    const newValues = currentValues.includes(value)
      ? currentValues.filter((v) => v !== value)
      : [...currentValues, value];

    onFiltersChange({
      ...filters,
      [category]: newValues,
    });
  };

  const clearFilters = () => {
    onFiltersChange({
      classifications: [],
      ageGroups: [],
      genres: [],
      studios: [],
      search: '',
    });
  };

  const hasActiveFilters =
    filters.classifications.length > 0 ||
    filters.ageGroups.length > 0 ||
    filters.genres.length > 0 ||
    filters.studios.length > 0 ||
    filters.search.length > 0;

  if (isCollapsed) {
    return (
      <div className="bg-white/5 backdrop-blur-md border border-white/10 rounded-lg p-4">
        <button
          onClick={onToggleCollapse}
          className="w-full flex items-center justify-between text-white hover:text-purple-300 transition-colors"
        >
          <span className="font-semibold">🔍 Filters</span>
          <span className="text-2xl">▶</span>
        </button>
        {hasActiveFilters && (
          <div className="mt-2 text-xs text-purple-300">
            {filteredRoutines} / {totalRoutines} routines
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="bg-white/5 backdrop-blur-md border border-white/10 rounded-lg p-4 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-bold text-white flex items-center gap-2">
            🔍 Filters
            {hasActiveFilters && (
              <span className="text-xs bg-purple-600 px-2 py-1 rounded-full">
                {filters.classifications.length +
                  filters.ageGroups.length +
                  filters.genres.length +
                  filters.studios.length}
              </span>
            )}
          </h3>
          <p className="text-xs text-gray-400 mt-1">
            {filteredRoutines} / {totalRoutines} routines
          </p>
        </div>
        <div className="flex items-center gap-2">
          {hasActiveFilters && (
            <button
              onClick={clearFilters}
              className="text-xs text-purple-300 hover:text-purple-200 underline"
              data-action="clear-filters"
            >
              Clear All
            </button>
          )}
          {onToggleCollapse && (
            <button
              onClick={onToggleCollapse}
              className="text-white hover:text-purple-300 transition-colors"
            >
              <span className="text-2xl">◀</span>
            </button>
          )}
        </div>
      </div>

      {/* Search Bar */}
      <div>
        <label className="block text-sm font-medium text-gray-300 mb-2">🔎 Search Routines</label>
        <div className="relative">
          <input
            type="text"
            value={filters.search}
            onChange={(e) => onFiltersChange({ ...filters, search: e.target.value })}
            placeholder="Search by routine title..."
            className="w-full px-4 py-2 pr-10 bg-black/20 border border-white/20 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
            data-filter="search"
          />
          {filters.search && (
            <button
              onClick={() => onFiltersChange({ ...filters, search: '' })}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white"
            >
              ✕
            </button>
          )}
        </div>
      </div>

      {/* Classification Filters */}
      <FilterSection
        title="🔷 Classification"
        isExpanded={expandedSections.classification}
        onToggle={() => toggleSection('classification')}
      >
        <div className="flex flex-wrap gap-2">
          {classifications.map((option) => (
            <FilterBadge
              key={option.id}
              label={option.label}
              icon={option.icon}
              color={option.color}
              isActive={filters.classifications.includes(option.id)}
              onClick={() => toggleFilter('classifications', option.id)}
              dataAttr={`classification-${option.label.toLowerCase()}`}
            />
          ))}
        </div>
      </FilterSection>

      {/* Age Group Filters */}
      <FilterSection
        title="👶 Age Groups"
        isExpanded={expandedSections.ageGroup}
        onToggle={() => toggleSection('ageGroup')}
      >
        <div className="flex flex-wrap gap-2">
          {ageGroups.map((option) => (
            <FilterBadge
              key={option.id}
              label={option.label}
              icon={option.icon}
              color={option.color}
              isActive={filters.ageGroups.includes(option.id)}
              onClick={() => toggleFilter('ageGroups', option.id)}
              dataAttr={`age-${option.label.toLowerCase().replace(/\s+/g, '-')}`}
            />
          ))}
        </div>
      </FilterSection>

      {/* Genre Filters */}
      <FilterSection
        title="🎭 Dance Genres"
        isExpanded={expandedSections.genre}
        onToggle={() => toggleSection('genre')}
      >
        <div className="flex flex-wrap gap-2">
          {genres.map((option) => (
            <FilterBadge
              key={option.id}
              label={option.label}
              icon={option.icon}
              color={option.color}
              isActive={filters.genres.includes(option.id)}
              onClick={() => toggleFilter('genres', option.id)}
              dataAttr={`genre-${option.label.toLowerCase()}`}
            />
          ))}
        </div>
      </FilterSection>

      {/* Studio Filters */}
      <FilterSection
        title="🏫 Studios"
        isExpanded={expandedSections.studio}
        onToggle={() => toggleSection('studio')}
      >
        <div className="flex flex-wrap gap-2 max-h-48 overflow-y-auto">
          {studios.map((option) => (
            <FilterBadge
              key={option.id}
              label={option.label}
              icon={option.icon}
              isActive={filters.studios.includes(option.id)}
              onClick={() => toggleFilter('studios', option.id)}
              dataAttr={`studio-${option.label.toLowerCase().replace(/\s+/g, '-')}`}
            />
          ))}
        </div>
      </FilterSection>
    </div>
  );
}

// Sub-component: Filter Section (collapsible)
function FilterSection({
  title,
  isExpanded,
  onToggle,
  children,
}: {
  title: string;
  isExpanded: boolean;
  onToggle: () => void;
  children: React.ReactNode;
}) {
  return (
    <div className="border-t border-white/10 pt-3">
      <button
        onClick={onToggle}
        className="w-full flex items-center justify-between text-sm font-medium text-gray-300 hover:text-white transition-colors mb-2"
      >
        <span>{title}</span>
        <span className="text-lg">{isExpanded ? '▼' : '▶'}</span>
      </button>
      {isExpanded && <div>{children}</div>}
    </div>
  );
}

// Sub-component: Filter Badge
function FilterBadge({
  label,
  icon,
  color,
  isActive,
  onClick,
  dataAttr,
}: {
  label: string;
  icon?: string;
  color?: string;
  isActive: boolean;
  onClick: () => void;
  dataAttr?: string;
}) {
  return (
    <button
      onClick={onClick}
      className={`
        px-3 py-1.5 rounded-lg border-2 text-sm font-medium transition-all
        ${
          isActive
            ? 'bg-gradient-to-r from-purple-600 to-pink-600 border-purple-500 text-white shadow-lg scale-105'
            : `bg-black/20 border-white/20 text-gray-300 hover:border-purple-500 hover:text-white ${color || ''}`
        }
      `}
      data-filter={dataAttr}
      data-active={isActive}
    >
      {icon && <span className="mr-1">{icon}</span>}
      {label}
    </button>
  );
}
