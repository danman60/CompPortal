interface RoutinesFiltersProps {
  competitions: any[];
  studios: any[];
  categoryTypes: any[];
  danceCategories: any[];
  ageDivisions: any[];
  selectedCompetitionId: string;
  selectedStudioId: string;
  selectedStatus: 'draft' | 'submitted' | 'confirmed' | 'all';
  selectedCategoryTypeId: string;
  selectedDanceCategoryId: string;
  selectedAgeDivisionId: string;
  onCompetitionChange: (id: string) => void;
  onStudioChange: (id: string) => void;
  onStatusChange: (status: 'draft' | 'submitted' | 'confirmed' | 'all') => void;
  onCategoryTypeChange: (id: string) => void;
  onDanceCategoryChange: (id: string) => void;
  onAgeDivisionChange: (id: string) => void;
  isLoading: boolean;
}

/**
 * Filters for CD routines page
 * Cumulative AND logic - all selected filters apply simultaneously
 */
export function RoutinesFilters({
  competitions,
  studios,
  categoryTypes,
  danceCategories,
  ageDivisions,
  selectedCompetitionId,
  selectedStudioId,
  selectedStatus,
  selectedCategoryTypeId,
  selectedDanceCategoryId,
  selectedAgeDivisionId,
  onCompetitionChange,
  onStudioChange,
  onStatusChange,
  onCategoryTypeChange,
  onDanceCategoryChange,
  onAgeDivisionChange,
  isLoading,
}: RoutinesFiltersProps) {
  return (
    <div className="bg-white/10 backdrop-blur-md rounded-xl border border-white/20 p-6 mb-6">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {/* Competition Filter */}
        <div>
          <label className="block text-sm font-medium text-white/80 mb-2">
            Event/Competition
          </label>
          <select
            value={selectedCompetitionId}
            onChange={(e) => onCompetitionChange(e.target.value)}
            disabled={isLoading}
            className="w-full px-4 py-2 bg-white/5 border border-white/20 rounded-lg text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-purple-500 disabled:opacity-50"
          >
            <option value="">All Events</option>
            {competitions.map((comp) => (
              <option key={comp.id} value={comp.id} className="bg-gray-900">
                {comp.name} ({comp.year})
              </option>
            ))}
          </select>
        </div>

        {/* Studio Filter */}
        <div>
          <label className="block text-sm font-medium text-white/80 mb-2">
            Studio
          </label>
          <select
            value={selectedStudioId}
            onChange={(e) => onStudioChange(e.target.value)}
            disabled={isLoading}
            className="w-full px-4 py-2 bg-white/5 border border-white/20 rounded-lg text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-purple-500 disabled:opacity-50"
          >
            <option value="">All Studios</option>
            {studios.map((studio) => (
              <option key={studio.id} value={studio.id} className="bg-gray-900">
                {studio.name}
              </option>
            ))}
          </select>
        </div>

        {/* Status Filter */}
        <div>
          <label className="block text-sm font-medium text-white/80 mb-2">
            Status
          </label>
          <select
            value={selectedStatus}
            onChange={(e) => onStatusChange(e.target.value as 'draft' | 'submitted' | 'confirmed' | 'all')}
            disabled={isLoading}
            className="w-full px-4 py-2 bg-white/5 border border-white/20 rounded-lg text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-purple-500 disabled:opacity-50"
          >
            <option value="all" className="bg-gray-900">All</option>
            <option value="draft" className="bg-gray-900">Draft</option>
            <option value="submitted" className="bg-gray-900">Submitted</option>
            <option value="confirmed" className="bg-gray-900">Confirmed</option>
          </select>
        </div>

        {/* Category Type Filter */}
        <div>
          <label className="block text-sm font-medium text-white/80 mb-2">
            Category Type
          </label>
          <select
            value={selectedCategoryTypeId}
            onChange={(e) => onCategoryTypeChange(e.target.value)}
            disabled={isLoading}
            className="w-full px-4 py-2 bg-white/5 border border-white/20 rounded-lg text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-purple-500 disabled:opacity-50"
          >
            <option value="">All Category Types</option>
            {categoryTypes.map((cat) => (
              <option key={cat.id} value={cat.id} className="bg-gray-900">
                {cat.name}
              </option>
            ))}
          </select>
        </div>

        {/* Dance Category Filter */}
        <div>
          <label className="block text-sm font-medium text-white/80 mb-2">
            Dance Category
          </label>
          <select
            value={selectedDanceCategoryId}
            onChange={(e) => onDanceCategoryChange(e.target.value)}
            disabled={isLoading}
            className="w-full px-4 py-2 bg-white/5 border border-white/20 rounded-lg text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-purple-500 disabled:opacity-50"
          >
            <option value="">All Dance Categories</option>
            {danceCategories.map((cat) => (
              <option key={cat.id} value={cat.id} className="bg-gray-900">
                {cat.name}
              </option>
            ))}
          </select>
        </div>

        {/* Age Division Filter */}
        <div>
          <label className="block text-sm font-medium text-white/80 mb-2">
            Age Division
          </label>
          <select
            value={selectedAgeDivisionId}
            onChange={(e) => onAgeDivisionChange(e.target.value)}
            disabled={isLoading}
            className="w-full px-4 py-2 bg-white/5 border border-white/20 rounded-lg text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-purple-500 disabled:opacity-50"
          >
            <option value="">All Age Divisions</option>
            {ageDivisions.map((age) => (
              <option key={age.id} value={age.id} className="bg-gray-900">
                {age.name}
              </option>
            ))}
          </select>
        </div>
      </div>
    </div>
  );
}
