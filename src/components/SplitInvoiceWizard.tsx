'use client';

import { useState } from 'react';
import { trpc } from '@/lib/trpc';
import { Button } from '@/components/rebuild/ui/Button';
import { X, Users, FileText, CheckCircle, AlertCircle } from 'lucide-react';

type SplitInvoiceWizardProps = {
  invoiceId: string;
  onClose: () => void;
  onSuccess: () => void;
};

export default function SplitInvoiceWizard({
  invoiceId,
  onClose,
  onSuccess,
}: SplitInvoiceWizardProps) {
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [error, setError] = useState<string | null>(null);

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
    splitMutation.mutate({ invoiceId });
  };

  const handleFinish = () => {
    onSuccess();
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="w-full max-w-3xl max-h-[90vh] overflow-y-auto bg-gradient-to-br from-purple-900 via-indigo-900 to-blue-900 rounded-xl shadow-2xl border border-white/20">
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
            <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg flex gap-2">
              <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <p className="font-medium text-red-900">Error</p>
                <p className="text-sm text-red-700">{error}</p>
              </div>
            </div>
          )}

          {step === 1 && (
            <Step1Review
              onNext={() => setStep(2)}
              onCancel={onClose}
              error={error}
            />
          )}

          {step === 2 && (
            <Step2Confirm
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

// Step 1: Review auto-detection
function Step1Review({
  onNext,
  onCancel,
  error,
}: {
  onNext: () => void;
  onCancel: () => void;
  error: string | null;
}) {
  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold mb-2 text-white">How Dancer Splitting Works</h3>
        <div className="space-y-3 text-sm text-gray-300">
          <p>
            <strong className="text-white">1. Grouping:</strong> Each dancer gets their own sub-invoice
          </p>
          <p>
            <strong className="text-white">2. Fee Calculation:</strong> Entry fees are split equally among dancers in each routine
          </p>
          <ul className="list-disc list-inside ml-4 space-y-1">
            <li>Solo: 100% to that dancer</li>
            <li>Duet: Each dancer pays 50%</li>
            <li>Trio: Each dancer pays 33.33%</li>
          </ul>
          <p>
            <strong className="text-white">3. Display:</strong> Sub-invoices show routine titles and totals only (no itemized fees)
          </p>
          <p>
            <strong className="text-white">4. Tax:</strong> 13% HST applied to each dancer's subtotal
          </p>
          <p>
            <strong className="text-white">5. Validation:</strong> All sub-invoices add up to main invoice exactly
          </p>
        </div>
      </div>

      <div className="bg-purple-500/20 border border-purple-400/50 rounded-lg p-4">
        <p className="text-sm text-purple-200 font-medium mb-2">
          ⚠️ Requirements
        </p>
        <ul className="text-sm text-purple-100 space-y-1 list-disc list-inside">
          <li>Invoice must have at least one entry</li>
          <li>Entries must not be cancelled</li>
        </ul>
      </div>

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
          Continue to Review
        </Button>
      </div>
    </div>
  );
}

// Step 2: Confirm and generate
function Step2Confirm({
  onSplit,
  onBack,
  isLoading,
}: {
  onSplit: () => void;
  onBack: () => void;
  isLoading: boolean;
}) {
  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold mb-2 text-white">Ready to Split Invoice</h3>
        <p className="text-sm text-gray-300">
          This will create dancer-specific sub-invoices based on participation in routines.
        </p>
      </div>

      <div className="bg-blue-500/20 border border-blue-400/50 rounded-lg p-4">
        <p className="text-sm text-blue-200 font-medium mb-2">
          ℹ️ What happens next
        </p>
        <ul className="text-sm text-blue-100 space-y-1 list-disc list-inside">
          <li>Dancer-specific sub-invoices will be generated</li>
          <li>Each dancer will see their routines and share of fees</li>
          <li>All sub-invoices will sum to your main invoice total</li>
          <li>You can regenerate splits if entries change</li>
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
              Generate Sub-Invoices
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
    dancers: Array<{ name: string; identifier: string; total: number }>;
  };
  onFinish: () => void;
}) {
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

      <div className="border border-white/20 rounded-lg overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-white/10">
            <tr>
              <th className="text-left px-4 py-2 font-medium text-white">Dancer</th>
              <th className="text-right px-4 py-2 font-medium text-white">Total</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/10">
            {result.dancers.map((dancer, i) => (
              <tr key={i} className="hover:bg-white/5">
                <td className="px-4 py-2">
                  <div>
                    <p className="font-medium text-white">{dancer.name}</p>
                    <p className="text-xs text-gray-400">{dancer.identifier}</p>
                  </div>
                </td>
                <td className="px-4 py-2 text-right font-medium text-white">
                  ${dancer.total.toFixed(2)}
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
          View Dancer Invoices
        </Button>
      </div>
    </div>
  );
}
