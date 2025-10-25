type PipelineStatus = 'all' | 'pending' | 'approved' | 'summary_in' | 'invoiced' | 'paid';

interface PipelineStats {
  needAction: number;
  approved: number;
  summariesIn: number;
  invoicesOut: number;
  paid: number;
}

interface PipelineStatusTabsProps {
  statusFilter: PipelineStatus;
  onStatusFilterChange: (status: PipelineStatus) => void;
  stats: PipelineStats;
  totalReservations: number;
}

/**
 * Pipeline Status Filter Tabs
 * 6 status filters with counts
 */
export function PipelineStatusTabs({
  statusFilter,
  onStatusFilterChange,
  stats,
  totalReservations,
}: PipelineStatusTabsProps) {
  const tabs: Array<{ key: PipelineStatus; label: string; count: number }> = [
    { key: 'all', label: 'All', count: totalReservations },
    { key: 'pending', label: 'Pending Reservation', count: stats.needAction },
    { key: 'approved', label: 'Pending Routine Creation', count: stats.approved },
    { key: 'summary_in', label: 'Pending Invoice', count: stats.summariesIn },
    { key: 'invoiced', label: 'Invoiced', count: stats.invoicesOut },
    { key: 'paid', label: 'Paid', count: stats.paid },
  ];

  return (
    <div className="flex gap-2 mb-6 flex-wrap">
      {tabs.map((tab) => (
        <button
          key={tab.key}
          onClick={() => onStatusFilterChange(tab.key)}
          className={`px-4 py-2 rounded-lg font-semibold text-sm transition-all ${
            statusFilter === tab.key
              ? 'bg-gradient-to-r from-pink-500 to-purple-500 text-white shadow-lg shadow-purple-500/50'
              : 'bg-white/10 text-gray-300 border border-white/20 hover:bg-white/20'
          }`}
        >
          {tab.label} <span className="ml-2 opacity-70">({tab.count})</span>
        </button>
      ))}
    </div>
  );
}
