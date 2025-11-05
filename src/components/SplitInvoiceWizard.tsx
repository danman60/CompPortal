'use client';

import { useState } from 'react';
import { api } from '@/lib/trpc-client';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
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

  const splitMutation = api.invoice.splitInvoice.useMutation({
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
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <Card className="w-full max-w-3xl max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b">
          <div className="flex items-center gap-3">
            <Users className="w-6 h-6 text-purple-600" />
            <div>
              <h2 className="text-xl font-semibold">Split Invoice by Family</h2>
              <p className="text-sm text-muted-foreground">
                Step {step} of 3
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-muted-foreground hover:text-foreground"
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
      </Card>
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
        <h3 className="text-lg font-semibold mb-2">How Family Splitting Works</h3>
        <div className="space-y-3 text-sm text-muted-foreground">
          <p>
            <strong className="text-foreground">1. Grouping:</strong> Dancers are grouped by parent email
          </p>
          <p>
            <strong className="text-foreground">2. Fee Calculation:</strong> Entry fees are split equally among dancers
          </p>
          <ul className="list-disc list-inside ml-4 space-y-1">
            <li>Solo: 100% to that family</li>
            <li>Duet with 2 siblings: Parents pay 100% (2/2 share)</li>
            <li>Trio with 2 siblings + 1 other: Siblings parents pay 2/3, other family pays 1/3</li>
          </ul>
          <p>
            <strong className="text-foreground">3. Display:</strong> Sub-invoices show routine titles and totals only (no itemized fees)
          </p>
          <p>
            <strong className="text-foreground">4. Tax:</strong> 13% HST applied to each family's subtotal
          </p>
          <p>
            <strong className="text-foreground">5. Validation:</strong> All sub-invoices add up to main invoice exactly
          </p>
        </div>
      </div>

      <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
        <p className="text-sm text-purple-900 font-medium mb-2">
          ⚠️ Requirements
        </p>
        <ul className="text-sm text-purple-800 space-y-1 list-disc list-inside">
          <li>All dancers must have a parent email</li>
          <li>Invoice must have at least one entry</li>
          <li>Entries must not be cancelled</li>
        </ul>
      </div>

      <div className="flex gap-3 justify-end pt-4">
        <Button
          variant="ghost"
          onClick={onCancel}
        >
          Cancel
        </Button>
        <Button
          onClick={onNext}
          className="bg-purple-600 hover:bg-purple-700"
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
        <h3 className="text-lg font-semibold mb-2">Ready to Split Invoice</h3>
        <p className="text-sm text-muted-foreground">
          This will create family-specific sub-invoices based on dancer participation in routines.
        </p>
      </div>

      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <p className="text-sm text-blue-900 font-medium mb-2">
          ℹ️ What happens next
        </p>
        <ul className="text-sm text-blue-800 space-y-1 list-disc list-inside">
          <li>Family-specific sub-invoices will be generated</li>
          <li>Each family will see their dancers' routines</li>
          <li>All sub-invoices will sum to your main invoice total</li>
          <li>You can regenerate splits if entries change</li>
        </ul>
      </div>

      <div className="flex gap-3 justify-end pt-4">
        <Button
          variant="ghost"
          onClick={onBack}
          disabled={isLoading}
        >
          Back
        </Button>
        <Button
          onClick={onSplit}
          disabled={isLoading}
          className="bg-purple-600 hover:bg-purple-700"
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
    families: Array<{ name: string; identifier: string; total: number }>;
  };
  onFinish: () => void;
}) {
  return (
    <div className="space-y-6">
      <div className="text-center">
        <div className="inline-flex items-center justify-center w-16 h-16 bg-green-100 rounded-full mb-4">
          <CheckCircle className="w-10 h-10 text-green-600" />
        </div>
        <h3 className="text-lg font-semibold mb-2">
          Successfully Split Invoice!
        </h3>
        <p className="text-sm text-muted-foreground">
          Created {result.sub_invoice_count} family invoice{result.sub_invoice_count !== 1 ? 's' : ''}
        </p>
      </div>

      <div className="border rounded-lg overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-muted">
            <tr>
              <th className="text-left px-4 py-2 font-medium">Family</th>
              <th className="text-right px-4 py-2 font-medium">Total</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {result.families.map((family, i) => (
              <tr key={i} className="hover:bg-muted/50">
                <td className="px-4 py-2">
                  <div>
                    <p className="font-medium">{family.name}</p>
                    <p className="text-xs text-muted-foreground">{family.identifier}</p>
                  </div>
                </td>
                <td className="px-4 py-2 text-right font-medium">
                  ${family.total.toFixed(2)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="bg-green-50 border border-green-200 rounded-lg p-4">
        <p className="text-sm text-green-900">
          ✅ All family invoices have been generated and validated.
          You can now view, download, or send these invoices to families.
        </p>
      </div>

      <div className="flex justify-end pt-4">
        <Button
          onClick={onFinish}
          className="bg-purple-600 hover:bg-purple-700"
        >
          View Family Invoices
        </Button>
      </div>
    </div>
  );
}
