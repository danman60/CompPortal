'use client';

import { useState, useEffect, useMemo } from 'react';
import { trpc } from '@/lib/trpc';
import { Button } from '@/components/rebuild/ui/Button';
import { X, Users, FileText, CheckCircle, AlertCircle, DollarSign, ChevronDown, ChevronUp } from 'lucide-react';

type SplitInvoiceWizardProps = {
  invoiceId: string;
  onClose: () => void;
  onSuccess: () => void;
};

type MarginConfigValue = {
  type: 'percentage_per_routine' | 'fixed_per_routine' | 'percentage_per_dancer' | 'fixed_per_dancer';
  value: number;
};

type MarginConfig = MarginConfigValue | null;

export default function SplitInvoiceWizard({
  invoiceId,
  onClose,
  onSuccess,
}: SplitInvoiceWizardProps) {
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [error, setError] = useState<string | null>(null);
  const [marginConfig, setMarginConfig] = useState<MarginConfig>(null);

  const splitMutation = trpc.invoice.splitInvoice.useMutation({
    onSuccess: (data) => {
      setStep(3);
    },
    onError: (err) => {
      setError(err.message);
    },
  });

  const handleSplit = () => {
    setError(null);
    splitMutation.mutate({
      invoiceId,
      margin: marginConfig || undefined
    });
  };

  const handleFinish = () => {
    onSuccess();
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="w-full max-w-4xl max-h-[90vh] overflow-y-auto bg-gradient-to-br from-purple-900 via-indigo-900 to-blue-900 rounded-xl shadow-2xl border border-white/20">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-white/20">
          <div className="flex items-center gap-3">
            <Users className="w-6 h-6 text-purple-300" />
            <div>
              <h2 className="text-xl font-semibold text-white">Split Invoice by Dancer</h2>
              <p className="text-sm text-gray-400">
                Step {step} of 3
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
          {error && (
            <div className="mb-4 p-4 bg-red-500/20 border border-red-400/50 rounded-lg flex gap-2">
              <AlertCircle className="w-5 h-5 text-red-300 flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <p className="font-medium text-red-200">Error</p>
                <p className="text-sm text-red-100">{error}</p>
              </div>
            </div>
          )}

          {step === 1 && (
            <Step1MarginCalculator
              invoiceId={invoiceId}
              marginConfig={marginConfig}
              setMarginConfig={setMarginConfig}
              onNext={() => setStep(2)}
              onCancel={onClose}
            />
          )}

          {step === 2 && (
            <Step2Confirm
              marginConfig={marginConfig}
              onSplit={handleSplit}
              onBack={() => setStep(1)}
              isLoading={splitMutation.isPending}
            />
          )}

          {step === 3 && splitMutation.data && (
            <Step3Success
              result={splitMutation.data}
              onFinish={handleFinish}
            />
          )}
        </div>
      </div>
    </div>
  );
}

// Step 1: Business Rules + Margin Calculator
function Step1MarginCalculator({
  invoiceId,
  marginConfig,
  setMarginConfig,
  onNext,
  onCancel,
}: {
  invoiceId: string;
  marginConfig: MarginConfig;
  setMarginConfig: (config: MarginConfig) => void;
  onNext: () => void;
  onCancel: () => void;
}) {
  const [showBusinessRules, setShowBusinessRules] = useState(false);
  const [marginType, setMarginType] = useState<'per_routine' | 'per_dancer'>('per_routine');
  const [marginMode, setMarginMode] = useState<'percentage' | 'fixed'>('percentage');
  const [marginValue, setMarginValue] = useState<string>('');

  // Fetch invoice data with entries for preview
  const { data: invoiceData } = trpc.invoice.getInvoiceWithEntries.useQuery({ invoiceId });

  // Calculate margin config whenever inputs change
  useEffect(() => {
    const value = parseFloat(marginValue);
    if (!marginValue || isNaN(value) || value < 0) {
      setMarginConfig(null);
      return;
    }

    const type = `${marginMode}_${marginType}` as MarginConfigValue['type'];
    setMarginConfig({ type, value });
  }, [marginType, marginMode, marginValue, setMarginConfig]);

  // Select representative dancers for preview (low, medium, high routine counts)
  const representativeDancers = useMemo(() => {
    if (!invoiceData?.invoice || !invoiceData.entries) return [];

    // Build dancer map with routine counts
    const dancerRoutines = new Map<string, { name: string; routines: any[] }>();

    invoiceData.entries.forEach(entry => {
      const participants = (entry as any).entry_participants || [];
      participants.forEach((ep: any) => {
        const dancerId = ep.dancer_id;
        const dancerName = `${ep.dancers.first_name} ${ep.dancers.last_name}`;

        if (!dancerRoutines.has(dancerId)) {
          dancerRoutines.set(dancerId, { name: dancerName, routines: [] });
        }

        const dancer = dancerRoutines.get(dancerId)!;
        const participantCount = participants.length;
        const shareAmount = Number(entry.total_fee || 0) / participantCount;

        dancer.routines.push({
          title: entry.title,
          sizeCategory: (entry as any).entry_size_categories?.name || 'Solo',
          shareAmount: shareAmount,
        });
      });
    });

    // Categorize dancers by routine count
    const dancers = Array.from(dancerRoutines.entries()).map(([id, data]) => ({
      id,
      name: data.name,
      routineCount: data.routines.length,
      routines: data.routines,
      originalSubtotal: data.routines.reduce((sum, r) => sum + r.shareAmount, 0),
    }));

    const low = dancers.filter(d => d.routineCount <= 2);
    const medium = dancers.filter(d => d.routineCount >= 3 && d.routineCount <= 5);
    const high = dancers.filter(d => d.routineCount >= 6);

    const selected: typeof dancers = [];
    if (low.length > 0) selected.push(low[0]);
    if (medium.length > 0) selected.push(medium[0]);
    if (high.length > 0) selected.push(high[0]);

    // If we don't have 3 categories, fill with available dancers
    if (selected.length < 3) {
      const remaining = dancers.filter(d => !selected.includes(d));
      selected.push(...remaining.slice(0, 3 - selected.length));
    }

    return selected.slice(0, 3);
  }, [invoiceData]);

  // Calculate preview totals for each representative dancer
  const previewDancers = useMemo(() => {
    if (!marginConfig || representativeDancers.length === 0) {
      return representativeDancers.map(d => ({
        ...d,
        marginAmount: 0,
        adjustedSubtotal: d.originalSubtotal,
        tax: d.originalSubtotal * 0.13,
        total: d.originalSubtotal * 1.13,
      }));
    }

    const { type, value } = marginConfig;

    return representativeDancers.map(dancer => {
      let marginAmount = 0;
      let adjustedSubtotal = dancer.originalSubtotal;

      if (type === 'percentage_per_routine') {
        marginAmount = dancer.routines.reduce((sum, r) => sum + (r.shareAmount * value / 100), 0);
        adjustedSubtotal = dancer.originalSubtotal + marginAmount;
      } else if (type === 'fixed_per_routine') {
        marginAmount = value * dancer.routineCount;
        adjustedSubtotal = dancer.originalSubtotal + marginAmount;
      } else if (type === 'percentage_per_dancer') {
        marginAmount = dancer.originalSubtotal * (value / 100);
        adjustedSubtotal = dancer.originalSubtotal + marginAmount;
      } else if (type === 'fixed_per_dancer') {
        marginAmount = value;
        adjustedSubtotal = dancer.originalSubtotal + marginAmount;
      }

      const tax = adjustedSubtotal * 0.13;
      const total = adjustedSubtotal + tax;

      return {
        ...dancer,
        marginAmount,
        adjustedSubtotal,
        tax,
        total,
      };
    });
  }, [representativeDancers, marginConfig]);

  // Total estimated margin across all dancers (approximation based on representative sample)
  const totalEstimatedMargin = useMemo(() => {
    if (!marginConfig || representativeDancers.length === 0) return 0;

    const avgMarginPerRoutine = previewDancers.reduce((sum, d) => sum + d.marginAmount / d.routineCount, 0) / previewDancers.length;
    const totalRoutines = representativeDancers.reduce((sum, d) => sum + d.routineCount, 0);

    return avgMarginPerRoutine * totalRoutines;
  }, [previewDancers, marginConfig, representativeDancers]);

  return (
    <div className="space-y-6">
      {/* Business Rules (Collapsible) */}
      <div className="bg-white/5 border border-white/10 rounded-lg overflow-hidden">
        <button
          onClick={() => setShowBusinessRules(!showBusinessRules)}
          className="w-full flex items-center justify-between p-4 hover:bg-white/5 transition-colors"
        >
          <div className="flex items-center gap-2">
            <FileText className="w-5 h-5 text-purple-300" />
            <h3 className="text-lg font-semibold text-white">How Dancer Splitting Works</h3>
          </div>
          {showBusinessRules ? (
            <ChevronUp className="w-5 h-5 text-gray-400" />
          ) : (
            <ChevronDown className="w-5 h-5 text-gray-400" />
          )}
        </button>

        {showBusinessRules && (
          <div className="p-4 pt-0 space-y-3 text-sm text-gray-300 border-t border-white/10">
            <p><strong className="text-white">1. Grouping:</strong> Each dancer gets their own invoice</p>
            <p><strong className="text-white">2. Fee Calculation:</strong> Entry fees split equally per routine</p>
            <ul className="list-disc list-inside ml-4 space-y-1">
              <li>Solo: 100% to that dancer</li>
              <li>Duet: Each dancer pays 50%</li>
              <li>Trio: Each dancer pays 33.33%</li>
            </ul>
            <p><strong className="text-white">3. Tax:</strong> 13% HST applied to each dancer's subtotal</p>
          </div>
        )}
      </div>

      {/* Margin Calculator */}
      <div className="bg-white/5 border border-white/10 rounded-lg p-6 space-y-4">
        <div className="flex items-start gap-3">
          <DollarSign className="w-6 h-6 text-green-400 flex-shrink-0" />
          <div className="flex-1">
            <h3 className="text-lg font-semibold text-white mb-1">Add Margin (Optional)</h3>
            <div className="bg-yellow-500/20 border border-yellow-400/50 rounded p-3 mb-4">
              <p className="text-sm text-yellow-200 font-medium">
                ⚠️ IMPORTANT: Margin will NOT appear on dancer invoices
              </p>
              <p className="text-xs text-yellow-100 mt-1">
                Parents see only the blended subtotal + tax. Your profit is invisible.
              </p>
            </div>

            {/* Apply Margin To */}
            <div className="space-y-2 mb-4">
              <label className="text-sm font-medium text-white">Apply Margin:</label>
              <div className="flex gap-3">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    checked={marginType === 'per_routine'}
                    onChange={() => setMarginType('per_routine')}
                    className="text-purple-500"
                  />
                  <span className="text-gray-300">Per Routine</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    checked={marginType === 'per_dancer'}
                    onChange={() => setMarginType('per_dancer')}
                    className="text-purple-500"
                  />
                  <span className="text-gray-300">Per Dancer</span>
                </label>
              </div>
            </div>

            {/* Margin Amount Type */}
            <div className="space-y-2 mb-4">
              <label className="text-sm font-medium text-white">Margin Amount:</label>
              <div className="flex gap-3 items-center">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    checked={marginMode === 'percentage'}
                    onChange={() => setMarginMode('percentage')}
                    className="text-purple-500"
                  />
                  <span className="text-gray-300">Percentage</span>
                </label>
                <input
                  type="number"
                  value={marginValue}
                  onChange={(e) => setMarginValue(e.target.value)}
                  disabled={marginMode !== 'percentage'}
                  placeholder="10"
                  className="w-24 px-3 py-2 rounded bg-white/10 border border-white/20 text-white placeholder-gray-500 disabled:opacity-50"
                />
                <span className="text-gray-300">%</span>

                <label className="flex items-center gap-2 cursor-pointer ml-4">
                  <input
                    type="radio"
                    checked={marginMode === 'fixed'}
                    onChange={() => setMarginMode('fixed')}
                    className="text-purple-500"
                  />
                  <span className="text-gray-300">Fixed Amount $</span>
                </label>
                <input
                  type="number"
                  value={marginValue}
                  onChange={(e) => setMarginValue(e.target.value)}
                  disabled={marginMode !== 'fixed'}
                  placeholder="5.00"
                  step="0.01"
                  className="w-24 px-3 py-2 rounded bg-white/10 border border-white/20 text-white placeholder-gray-500 disabled:opacity-50"
                />
              </div>
            </div>

            {/* Estimated Total Margin */}
            {marginConfig && (
              <div className="bg-green-500/20 border border-green-400/50 rounded p-3">
                <p className="text-sm text-green-200 font-medium">
                  Your Estimated Margin: <span className="text-lg">${totalEstimatedMargin.toFixed(2)}</span> across {representativeDancers.length}+ dancers
                </p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Preview */}
      {previewDancers.length > 0 && (
        <div className="bg-white/5 border border-white/10 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-white mb-4">📊 Preview (Representative Dancers)</h3>
          <div className="space-y-4">
            {previewDancers.map((dancer, idx) => (
              <div key={idx} className="bg-white/5 rounded-lg p-4 border border-white/10">
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <p className="font-semibold text-white">{dancer.name}</p>
                    <p className="text-xs text-gray-400">{dancer.routineCount} routine{dancer.routineCount !== 1 ? 's' : ''}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm text-gray-400">
                      Original: <span className="text-white font-medium">${dancer.originalSubtotal.toFixed(2)}</span>
                    </p>
                    {marginConfig && (
                      <p className="text-sm text-green-300">
                        With margin: <span className="font-semibold">${dancer.adjustedSubtotal.toFixed(2)}</span>
                      </p>
                    )}
                  </div>
                </div>
                <div className="border-t border-white/10 pt-2 mt-2 text-sm">
                  <div className="flex justify-between text-gray-300">
                    <span>Tax (13%):</span>
                    <span>${dancer.tax.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-white font-semibold mt-1">
                    <span>Total:</span>
                    <span>${dancer.total.toFixed(2)}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Actions */}
      <div className="flex gap-3 justify-end pt-4">
        <Button
          variant="secondary"
          onClick={onCancel}
        >
          Cancel
        </Button>
        <Button
          onClick={onNext}
          className="bg-gradient-to-r from-purple-500 to-pink-500 hover:shadow-lg"
        >
          Continue to Confirm
        </Button>
      </div>
    </div>
  );
}

// Step 2: Confirm
function Step2Confirm({
  marginConfig,
  onSplit,
  onBack,
  isLoading,
}: {
  marginConfig: MarginConfig;
  onSplit: () => void;
  onBack: () => void;
  isLoading: boolean;
}) {
  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold mb-2 text-white">Ready to Split Invoice</h3>
        <p className="text-sm text-gray-300">
          This will create dancer-specific invoices based on participation in routines.
        </p>
      </div>

      {marginConfig && (
        <div className="bg-green-500/20 border border-green-400/50 rounded-lg p-4">
          <p className="text-sm text-green-200 font-medium mb-2">
            💰 Margin Applied
          </p>
          <p className="text-sm text-green-100">
            {marginConfig.type.startsWith('percentage_') ? `${marginConfig.value}%` : `$${marginConfig.value}`}
            {' '}per {marginConfig.type.includes('_per_routine') ? 'routine' : 'dancer'}
          </p>
        </div>
      )}

      <div className="bg-blue-500/20 border border-blue-400/50 rounded-lg p-4">
        <p className="text-sm text-blue-200 font-medium mb-2">
          ℹ️ What happens next
        </p>
        <ul className="text-sm text-blue-100 space-y-1 list-disc list-inside">
          <li>Dancer-specific invoices will be generated</li>
          <li>Each dancer will see their routines and share of fees</li>
          {marginConfig ? (
            <li>Margin will be blended invisibly into routine fees</li>
          ) : (
            <li>All invoices will sum to your main invoice total</li>
          )}
          <li>You can regenerate splits if needed</li>
        </ul>
      </div>

      <div className="flex gap-3 justify-end pt-4">
        <Button
          variant="secondary"
          onClick={onBack}
          disabled={isLoading}
        >
          Back
        </Button>
        <Button
          onClick={onSplit}
          disabled={isLoading}
          className="bg-gradient-to-r from-purple-500 to-pink-500 hover:shadow-lg"
        >
          {isLoading ? (
            <>
              <span className="animate-spin">⏳</span>
              Generating...
            </>
          ) : (
            <>
              <FileText className="w-4 h-4 mr-2" />
              Generate Dancer Invoices
            </>
          )}
        </Button>
      </div>
    </div>
  );
}

// Step 3: Success
function Step3Success({
  result,
  onFinish,
}: {
  result: {
    success: boolean;
    sub_invoice_count: number;
    total_margin?: number;
    main_invoice_total?: number;
    dancer_invoices_total?: number;
    dancers: Array<{
      name: string;
      identifier: string;
      routines_count?: number;
      original_total?: number;
      final_total: number;
      margin?: number;
    }>;
  };
  onFinish: () => void;
}) {
  const hasMargin = result.total_margin && result.total_margin > 0;

  return (
    <div className="space-y-6">
      <div className="text-center">
        <div className="inline-flex items-center justify-center w-16 h-16 bg-green-500/20 border-2 border-green-400/50 rounded-full mb-4">
          <CheckCircle className="w-10 h-10 text-green-300" />
        </div>
        <h3 className="text-lg font-semibold mb-2 text-white">
          Successfully Split Invoice!
        </h3>
        <p className="text-sm text-gray-300">
          Created {result.sub_invoice_count} dancer invoice{result.sub_invoice_count !== 1 ? 's' : ''}
        </p>
      </div>

      {hasMargin && (
        <div className="bg-green-500/20 border border-green-400/50 rounded-lg p-4">
          <p className="text-sm text-green-200 font-medium mb-2">
            💰 Your Margin Report
          </p>
          <div className="text-sm text-green-100 space-y-1">
            <div className="flex justify-between">
              <span>Dancer Invoices Total:</span>
              <span className="font-semibold">${result.dancer_invoices_total?.toFixed(2)}</span>
            </div>
            <div className="flex justify-between">
              <span>Main Invoice Total:</span>
              <span className="font-semibold">${result.main_invoice_total?.toFixed(2)}</span>
            </div>
            <div className="flex justify-between border-t border-green-400/30 pt-1 mt-1">
              <span>Your Margin:</span>
              <span className="font-bold text-lg">${result.total_margin?.toFixed(2)}</span>
            </div>
          </div>
        </div>
      )}

      <div className="border border-white/20 rounded-lg overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-white/10">
            <tr>
              <th className="text-left px-4 py-2 font-medium text-white">Dancer</th>
              <th className="text-center px-4 py-2 font-medium text-white">Routines</th>
              {hasMargin && <th className="text-right px-4 py-2 font-medium text-white">Margin</th>}
              <th className="text-right px-4 py-2 font-medium text-white">Total</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/10">
            {result.dancers.map((dancer, i) => (
              <tr key={i} className="hover:bg-white/5">
                <td className="px-4 py-2 text-white">{dancer.name}</td>
                <td className="px-4 py-2 text-center text-gray-300">{dancer.routines_count || '—'}</td>
                {hasMargin && (
                  <td className="px-4 py-2 text-right text-green-300">
                    +${dancer.margin?.toFixed(2) || '0.00'}
                  </td>
                )}
                <td className="px-4 py-2 text-right font-medium text-white">
                  ${dancer.final_total.toFixed(2)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="bg-green-500/20 border border-green-400/50 rounded-lg p-4">
        <p className="text-sm text-green-100">
          ✅ All dancer invoices have been generated and validated.
          You can now view, download, or send these invoices to dancers.
        </p>
      </div>

      <div className="flex justify-end pt-4">
        <Button
          onClick={onFinish}
          className="bg-gradient-to-r from-purple-500 to-pink-500 hover:shadow-lg"
        >
          View Dancer Invoices ({result.sub_invoice_count})
        </Button>
      </div>
    </div>
  );
}
