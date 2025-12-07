'use client';

import { Clock, CheckCircle, FileText, Send, DollarSign, AlertTriangle } from 'lucide-react';
import type { PipelineKPICardsProps, DisplayStatus } from './types';

interface KPICard {
  key: DisplayStatus | null;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  getValue: (stats: PipelineKPICardsProps['stats']) => number;
  textColor: string;
  hoverBorder: string;
}

const kpiCards: KPICard[] = [
  {
    key: 'pending_review',
    label: 'Pending Review',
    icon: Clock,
    getValue: (s) => s.pending,
    textColor: 'text-yellow-400',
    hoverBorder: 'hover:border-yellow-400/50',
  },
  {
    key: 'approved',
    label: 'Approved',
    icon: CheckCircle,
    getValue: (s) => s.approved,
    textColor: 'text-blue-400',
    hoverBorder: 'hover:border-blue-400/50',
  },
  {
    key: 'ready_to_invoice',
    label: 'Ready to Invoice',
    icon: FileText,
    getValue: (s) => s.readyToInvoice,
    textColor: 'text-purple-400',
    hoverBorder: 'hover:border-purple-400/50',
  },
  {
    key: 'invoice_sent',
    label: 'Awaiting Payment',
    icon: Send,
    getValue: (s) => s.awaitingPayment,
    textColor: 'text-cyan-400',
    hoverBorder: 'hover:border-cyan-400/50',
  },
  {
    key: 'paid_complete',
    label: 'Paid',
    icon: DollarSign,
    getValue: (s) => s.paidComplete,
    textColor: 'text-emerald-400',
    hoverBorder: 'hover:border-emerald-400/50',
  },
  {
    key: 'needs_attention',
    label: 'Needs Attention',
    icon: AlertTriangle,
    getValue: (s) => s.needsAttention,
    textColor: 'text-red-400',
    hoverBorder: 'hover:border-red-400/50',
  },
];

export function KPICards({ stats, onFilterClick, activeFilter }: PipelineKPICardsProps) {
  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
      {kpiCards.map((card) => {
        const Icon = card.icon;
        const value = card.getValue(stats);
        const isActive = activeFilter === card.key;

        return (
          <button
            key={card.key || 'all'}
            onClick={() => onFilterClick(isActive ? null : card.key)}
            className={`bg-white/10 backdrop-blur-sm rounded-xl p-4 border-2 transition-all cursor-pointer ${
              isActive
                ? 'border-white/40 bg-white/20'
                : `border-white/20 ${card.hoverBorder}`
            }`}
          >
            <div className="flex items-center gap-3">
              <div className={`p-2 rounded-lg bg-white/10`}>
                <Icon className={`h-4 w-4 ${card.textColor}`} />
              </div>
              <div className="text-left">
                <p className={`text-2xl font-bold ${card.textColor}`}>{value}</p>
                <p className="text-xs text-purple-200/60 mt-1">{card.label}</p>
              </div>
            </div>
          </button>
        );
      })}
    </div>
  );
}
