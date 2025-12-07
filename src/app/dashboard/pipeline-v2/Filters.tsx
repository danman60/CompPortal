'use client';

import { Search, X, Eye, EyeOff } from 'lucide-react';
import type { PipelineFiltersProps } from './types';

export function Filters({ filters, onChange, competitions }: PipelineFiltersProps) {
  return (
    <div className="flex flex-wrap items-center gap-3">
      {/* Search */}
      <div className="relative flex-1 min-w-[200px] max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
        <input
          type="text"
          placeholder="Search studios, contacts..."
          value={filters.search}
          onChange={(e) => onChange({ ...filters, search: e.target.value })}
          className="w-full pl-9 pr-4 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
        />
        {filters.search && (
          <button
            onClick={() => onChange({ ...filters, search: '' })}
            className="absolute right-3 top-1/2 -translate-y-1/2"
          >
            <X className="h-4 w-4 text-gray-400 hover:text-gray-600" />
          </button>
        )}
      </div>

      {/* Competition filter */}
      <select
        value={filters.competition || ''}
        onChange={(e) => onChange({ ...filters, competition: e.target.value || null })}
        className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
      >
        <option value="">All Competitions</option>
        {competitions.map((c) => (
          <option key={c.id} value={c.id}>
            {c.name} {c.year}
          </option>
        ))}
      </select>

      {/* Hide completed toggle */}
      <button
        onClick={() => onChange({ ...filters, hideCompleted: !filters.hideCompleted })}
        className={`flex items-center gap-2 px-3 py-2 rounded-lg border text-sm transition-colors ${
          filters.hideCompleted
            ? 'bg-indigo-50 border-indigo-200 text-indigo-700'
            : 'bg-white border-gray-300 text-gray-700 hover:bg-gray-50'
        }`}
      >
        {filters.hideCompleted ? (
          <EyeOff className="h-4 w-4" />
        ) : (
          <Eye className="h-4 w-4" />
        )}
        {filters.hideCompleted ? 'Showing Active Only' : 'Hide Completed'}
      </button>

      {/* Clear filters */}
      {(filters.search || filters.competition || filters.status || filters.hideCompleted) && (
        <button
          onClick={() =>
            onChange({ search: '', competition: null, status: null, hideCompleted: false })
          }
          className="px-3 py-2 text-sm text-gray-500 hover:text-gray-700"
        >
          Clear all
        </button>
      )}
    </div>
  );
}
