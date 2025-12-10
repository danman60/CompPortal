'use client';

import type { PipelineKPICardsProps, DisplayStatus } from './types';

interface KPICard {
  key: DisplayStatus | null;
  label: string;
  getValue: (stats: PipelineKPICardsProps['stats']) => number;
  textColor: string;
  hoverBorder: string;
  extraBorder?: string;
}

const kpiCards: KPICard[] = [
  {
    key: null,
    label: 'Total Studios',
    getValue: (s) => s.total,
    textColor: 'text-white',
    hoverBorder: '',
  },
  {
    key: 'pending_review',
    label: 'Pending Review',
    getValue: (s) => s.pending,
    textColor: 'text-yellow-400',
    hoverBorder: 'hover:border-yellow-400/50',
  },
  {
    key: 'approved',
    label: 'Awaiting Submission',
    getValue: (s) => s.approved,
    textColor: 'text-orange-400',
    hoverBorder: 'hover:border-orange-400/50',
  },
  {
    key: 'ready_to_invoice',
    label: 'Ready to Invoice',
    getValue: (s) => s.readyToInvoice,
    textColor: 'text-purple-400',
    hoverBorder: 'hover:border-purple-400/50',
  },
  {
    key: 'invoice_sent',
    label: 'Awaiting Payment',
    getValue: (s) => s.awaitingPayment,
    textColor: 'text-blue-400',
    hoverBorder: 'hover:border-blue-400/50',
  },
  {
    key: 'paid_complete',
    label: 'Paid Complete',
    getValue: (s) => s.paidComplete,
    textColor: 'text-emerald-400',
    hoverBorder: '',
  },
  {
    key: 'needs_attention',
    label: 'Needs Attention',
    getValue: (s) => s.needsAttention,
    textColor: 'text-red-400',
    hoverBorder: 'hover:border-red-400/50',
    extraBorder: 'border-red-400/30',
  },
];

export function KPICards({ stats, onFilterClick, activeFilter }: PipelineKPICardsProps) {
  return (
    <div className="space-y-3">
      {/* Clear Filter Button - shown when a filter is active */}
      {activeFilter && (
        <div className="flex justify-end">
          <button
            onClick={() => onFilterClick(null)}
            className="flex items-center gap-2 px-3 py-1.5 text-sm bg-white/10 hover:bg-white/20 text-white/80 hover:text-white rounded-lg border border-white/20 transition-all"
          >
            <span>✕</span>
            <span>Clear Filter</span>
          </button>
        </div>
      )}

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-4">
        {kpiCards.map((card) => {
          const value = card.getValue(stats);
          const isActive = activeFilter === card.key;
          const isClickable = card.key !== null && card.hoverBorder;

          return (
            <button
              key={card.key || 'total'}
              onClick={() => isClickable && onFilterClick(isActive ? null : card.key)}
              className={`glass-card bg-white/10 backdrop-blur-sm rounded-xl p-4 border-2 transition-all ${
                isClickable ? 'cursor-pointer' : 'cursor-default'
              } ${
                isActive
                  ? 'border-white/40 bg-white/20'
                  : `border-white/20 ${card.hoverBorder} ${card.extraBorder || ''}`
              }`}
            >
              <div className={`text-2xl font-bold ${card.textColor}`}>{value}</div>
              <div className="text-xs text-purple-200/60 mt-1">{card.label}</div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
