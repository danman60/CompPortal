'use client';

import { Clock, CheckCircle, FileText, Send, DollarSign, AlertTriangle } from 'lucide-react';
import type { PipelineKPICardsProps, DisplayStatus } from './types';

interface KPICard {
  key: DisplayStatus | null;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  getValue: (stats: PipelineKPICardsProps['stats']) => number;
  bgColor: string;
  iconColor: string;
  borderColor: string;
}

const kpiCards: KPICard[] = [
  {
    key: 'pending_review',
    label: 'Pending',
    icon: Clock,
    getValue: (s) => s.pending,
    bgColor: 'bg-amber-50',
    iconColor: 'text-amber-600',
    borderColor: 'border-amber-200',
  },
  {
    key: 'approved',
    label: 'Approved',
    icon: CheckCircle,
    getValue: (s) => s.approved,
    bgColor: 'bg-blue-50',
    iconColor: 'text-blue-600',
    borderColor: 'border-blue-200',
  },
  {
    key: 'ready_to_invoice',
    label: 'Ready to Invoice',
    icon: FileText,
    getValue: (s) => s.readyToInvoice,
    bgColor: 'bg-purple-50',
    iconColor: 'text-purple-600',
    borderColor: 'border-purple-200',
  },
  {
    key: 'invoice_sent',
    label: 'Awaiting Payment',
    icon: Send,
    getValue: (s) => s.awaitingPayment,
    bgColor: 'bg-cyan-50',
    iconColor: 'text-cyan-600',
    borderColor: 'border-cyan-200',
  },
  {
    key: 'paid_complete',
    label: 'Paid',
    icon: DollarSign,
    getValue: (s) => s.paidComplete,
    bgColor: 'bg-green-50',
    iconColor: 'text-green-600',
    borderColor: 'border-green-200',
  },
  {
    key: 'needs_attention',
    label: 'Needs Attention',
    icon: AlertTriangle,
    getValue: (s) => s.needsAttention,
    bgColor: 'bg-red-50',
    iconColor: 'text-red-600',
    borderColor: 'border-red-200',
  },
];

export function KPICards({ stats, onFilterClick, activeFilter }: PipelineKPICardsProps) {
  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
      {kpiCards.map((card) => {
        const Icon = card.icon;
        const value = card.getValue(stats);
        const isActive = activeFilter === card.key;

        return (
          <button
            key={card.key || 'all'}
            onClick={() => onFilterClick(isActive ? null : card.key)}
            className={`flex items-center gap-3 p-3 rounded-lg border transition-all ${
              isActive
                ? `${card.bgColor} ${card.borderColor} border-2 shadow-sm`
                : `bg-white border-gray-200 hover:${card.bgColor} hover:${card.borderColor}`
            }`}
          >
            <div className={`p-2 rounded-lg ${card.bgColor}`}>
              <Icon className={`h-4 w-4 ${card.iconColor}`} />
            </div>
            <div className="text-left">
              <p className="text-lg font-semibold text-gray-900">{value}</p>
              <p className="text-xs text-gray-500">{card.label}</p>
            </div>
          </button>
        );
      })}
    </div>
  );
}
