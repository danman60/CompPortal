'use client';

import { Search, X, Eye, EyeOff } from 'lucide-react';
import type { PipelineFiltersProps } from './types';

export function Filters({ filters, onChange, competitions }: PipelineFiltersProps) {
  return (
    <div className="flex flex-wrap items-center gap-3">
      {/* Search */}
      <div className="relative flex-1 min-w-[200px] max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-purple-200/50" />
        <input
          type="text"
          placeholder="Search studios, contacts..."
          value={filters.search}
          onChange={(e) => onChange({ ...filters, search: e.target.value })}
          className="w-full pl-9 pr-4 py-2 bg-white/10 border border-white/20 rounded-lg text-sm text-white placeholder-purple-200/40 focus:ring-2 focus:ring-purple-400/50 focus:border-purple-400/50"
        />
        {filters.search && (
          <button
            onClick={() => onChange({ ...filters, search: '' })}
            className="absolute right-3 top-1/2 -translate-y-1/2"
          >
            <X className="h-4 w-4 text-purple-200/50 hover:text-white" />
          </button>
        )}
      </div>

      {/* Competition filter */}
      <select
        value={filters.competition || ''}
        onChange={(e) => onChange({ ...filters, competition: e.target.value || null })}
        className="px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-sm text-white focus:ring-2 focus:ring-purple-400/50 focus:border-purple-400/50"
      >
        <option value="" className="bg-purple-900 text-white">All Competitions</option>
        {competitions.map((c) => (
          <option key={c.id} value={c.id} className="bg-purple-900 text-white">
            {c.name} {c.year}
          </option>
        ))}
      </select>

      {/* Hide completed toggle */}
      <button
        onClick={() => onChange({ ...filters, hideCompleted: !filters.hideCompleted })}
        className={`flex items-center gap-2 px-3 py-2 rounded-lg border text-sm transition-colors ${
          filters.hideCompleted
            ? 'bg-purple-500/30 border-purple-400/50 text-purple-200'
            : 'bg-white/10 border-white/20 text-purple-200/60 hover:bg-white/20 hover:text-white'
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
          className="px-3 py-2 text-sm text-purple-200/50 hover:text-white"
        >
          Clear all
        </button>
      )}
    </div>
  );
}
