'use client';

import { useState, useRef, useEffect, useCallback } from 'react';

export interface SearchSuggestion {
  id: string;
  label: string;
  category?: string;
  meta?: string;
  icon?: string;
  onSelect: () => void;
}

interface MobileSearchAutocompleteProps {
  placeholder?: string;
  suggestions: SearchSuggestion[];
  onSearch: (query: string) => void;
  onClear?: () => void;
  isLoading?: boolean;
  recentSearches?: string[];
  onRecentSearchClick?: (search: string) => void;
  className?: string;
}

/**
 * Mobile Search Autocomplete
 * Optimized search component for mobile with autocomplete suggestions
 *
 * Features:
 * - Touch-optimized interface
 * - Autocomplete suggestions
 * - Recent searches
 * - Category grouping
 * - Keyboard navigation
 * - Loading states
 */
export default function MobileSearchAutocomplete({
  placeholder = 'Search...',
  suggestions,
  onSearch,
  onClear,
  isLoading = false,
  recentSearches = [],
  onRecentSearchClick,
  className = '',
}: MobileSearchAutocompleteProps) {
  const [query, setQuery] = useState('');
  const [isFocused, setIsFocused] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const inputRef = useRef<HTMLInputElement>(null);

  const showSuggestions = isFocused && (query.length > 0 || recentSearches.length > 0);
  const filteredSuggestions = query.length > 0 ? suggestions : [];

  // Group suggestions by category
  const groupedSuggestions = useCallback(() => {
    const groups = new Map<string, SearchSuggestion[]>();

    for (const suggestion of filteredSuggestions) {
      const category = suggestion.category || 'Results';
      if (!groups.has(category)) {
        groups.set(category, []);
      }
      groups.get(category)!.push(suggestion);
    }

    return groups;
  }, [filteredSuggestions]);

  const handleSearch = () => {
    if (query.trim()) {
      onSearch(query.trim());
      inputRef.current?.blur();
    }
  };

  const handleClear = () => {
    setQuery('');
    setSelectedIndex(-1);
    onClear?.();
    inputRef.current?.focus();
  };

  const handleSelect = (suggestion: SearchSuggestion) => {
    suggestion.onSelect();
    setQuery('');
    setIsFocused(false);
    inputRef.current?.blur();
  };

  const handleRecentClick = (search: string) => {
    setQuery(search);
    onRecentSearchClick?.(search);
    onSearch(search);
  };

  // Keyboard navigation
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!showSuggestions) return;

    const totalItems = filteredSuggestions.length + (query.length === 0 ? recentSearches.length : 0);

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setSelectedIndex(prev => (prev < totalItems - 1 ? prev + 1 : prev));
        break;
      case 'ArrowUp':
        e.preventDefault();
        setSelectedIndex(prev => (prev > -1 ? prev - 1 : -1));
        break;
      case 'Enter':
        e.preventDefault();
        if (selectedIndex >= 0 && selectedIndex < filteredSuggestions.length) {
          handleSelect(filteredSuggestions[selectedIndex]);
        } else if (selectedIndex >= filteredSuggestions.length && query.length === 0) {
          const recentIndex = selectedIndex - filteredSuggestions.length;
          if (recentIndex < recentSearches.length) {
            handleRecentClick(recentSearches[recentIndex]);
          }
        } else {
          handleSearch();
        }
        break;
      case 'Escape':
        setIsFocused(false);
        inputRef.current?.blur();
        break;
    }
  };

  // Close on outside click
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (inputRef.current && !inputRef.current.contains(event.target as Node)) {
        setIsFocused(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div className={`relative ${className}`}>
      {/* Search Input */}
      <div className="relative">
        <div className="absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none">
          {isLoading ? (
            <svg className="w-5 h-5 text-gray-400 animate-spin" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
            </svg>
          ) : (
            <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          )}
        </div>
        <input
          ref={inputRef}
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => setIsFocused(true)}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          className="w-full pl-12 pr-12 py-3 rounded-lg bg-white/10 backdrop-blur-md border border-white/20 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500/50 focus:border-purple-500 transition-all min-h-[44px]"
        />
        {query && (
          <button
            onClick={handleClear}
            className="absolute right-4 top-1/2 -translate-y-1/2 p-1 hover:bg-white/10 rounded-full transition-colors"
            aria-label="Clear search"
          >
            <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        )}
      </div>

      {/* Suggestions Dropdown */}
      {showSuggestions && (
        <div className="absolute top-full left-0 right-0 mt-2 bg-gray-900 border border-white/20 rounded-xl shadow-2xl max-h-[60vh] overflow-y-auto z-50 animate-fade-in">
          {/* Recent Searches */}
          {query.length === 0 && recentSearches.length > 0 && (
            <div className="p-2">
              <div className="px-3 py-2 text-xs font-semibold text-gray-400 uppercase">
                Recent Searches
              </div>
              {recentSearches.map((search, index) => (
                <button
                  key={search}
                  onClick={() => handleRecentClick(search)}
                  className={`w-full flex items-center gap-3 px-3 py-3 rounded-lg transition-all min-h-[44px] ${
                    selectedIndex === filteredSuggestions.length + index
                      ? 'bg-purple-500/20 text-purple-300'
                      : 'hover:bg-white/5 text-gray-300'
                  }`}
                >
                  <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <span className="flex-1 text-left text-sm">{search}</span>
                </button>
              ))}
            </div>
          )}

          {/* Grouped Suggestions */}
          {query.length > 0 && filteredSuggestions.length > 0 && (
            <div className="p-2">
              {Array.from(groupedSuggestions()).map(([category, items]) => (
                <div key={category}>
                  <div className="px-3 py-2 text-xs font-semibold text-gray-400 uppercase">
                    {category}
                  </div>
                  {items.map((suggestion, index) => {
                    const globalIndex = filteredSuggestions.indexOf(suggestion);
                    return (
                      <button
                        key={suggestion.id}
                        onClick={() => handleSelect(suggestion)}
                        className={`w-full flex items-center gap-3 px-3 py-3 rounded-lg transition-all min-h-[44px] ${
                          selectedIndex === globalIndex
                            ? 'bg-purple-500/20 text-purple-300 border border-purple-500/50'
                            : 'hover:bg-white/5 text-gray-300 border border-transparent'
                        }`}
                      >
                        {suggestion.icon && (
                          <span className="text-xl flex-shrink-0">{suggestion.icon}</span>
                        )}
                        <div className="flex-1 text-left min-w-0">
                          <div className="text-sm font-medium truncate">{suggestion.label}</div>
                          {suggestion.meta && (
                            <div className="text-xs text-gray-500 truncate">{suggestion.meta}</div>
                          )}
                        </div>
                        <svg className="w-4 h-4 flex-shrink-0 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                        </svg>
                      </button>
                    );
                  })}
                </div>
              ))}
            </div>
          )}

          {/* No Results */}
          {query.length > 0 && filteredSuggestions.length === 0 && !isLoading && (
            <div className="p-8 text-center">
              <div className="text-4xl mb-2">🔍</div>
              <p className="text-gray-400 text-sm">No results found for "{query}"</p>
            </div>
          )}

          {/* Loading */}
          {isLoading && (
            <div className="p-8 text-center">
              <svg className="w-8 h-8 text-purple-400 animate-spin mx-auto mb-2" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
              </svg>
              <p className="text-gray-400 text-sm">Searching...</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

/**
 * Compact Mobile Search Bar
 * Minimal version for navigation bars
 */
export function CompactMobileSearch({
  placeholder = 'Search',
  onFocus,
  className = '',
}: {
  placeholder?: string;
  onFocus?: () => void;
  className?: string;
}) {
  return (
    <button
      onClick={onFocus}
      className={`w-full flex items-center gap-3 px-4 py-2 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 transition-all min-h-[44px] ${className}`}
    >
      <svg className="w-5 h-5 text-gray-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
      </svg>
      <span className="text-gray-400 text-sm flex-1 text-left">{placeholder}</span>
    </button>
  );
}
