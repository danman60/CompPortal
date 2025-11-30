'use client';

import { useEffect, useState } from 'react';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { trpc } from '@/lib/trpc';
import toast from 'react-hot-toast';
import { Hash, Calendar, Building2, AlertCircle, CheckCircle } from 'lucide-react';

interface AssignStudioCodesModalProps {
  isOpen: boolean;
  onClose: () => void;
  competitionId: string;
  tenantId: string;
  onAssignComplete: () => void;
}

export function AssignStudioCodesModal({
  isOpen,
  onClose,
  competitionId,
  tenantId,
  onAssignComplete,
}: AssignStudioCodesModalProps) {
  const [isAssigning, setIsAssigning] = useState(false);

  // Query unassigned studio codes
  const { data, isLoading, refetch } = trpc.scheduling.getUnassignedStudioCodes.useQuery(
    {
      competitionId,
      tenantId,
    },
    {
      enabled: isOpen,
    }
  );

  // Auto-assign mutation
  const assignMutation = trpc.scheduling.autoAssignStudioCodes.useMutation({
    onSuccess: (result) => {
      toast.success(`Successfully assigned ${result.assignedCount} studio codes`);
      onAssignComplete();
      onClose();
      setIsAssigning(false);
    },
    onError: (error) => {
      toast.error(`Failed to assign studio codes: ${error.message}`);
      setIsAssigning(false);
    },
  });

  const handleAutoAssign = () => {
    setIsAssigning(true);
    assignMutation.mutate({
      competitionId,
      tenantId,
    });
  };

  // Helper to generate proposed code (same logic as backend)
  const generateCode = (index: number): string => {
    let code = '';
    let num = index;
    do {
      code = String.fromCharCode(65 + (num % 26)) + code;
      num = Math.floor(num / 26) - 1;
    } while (num >= 0);
    return code;
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Auto-Assign Studio Codes"
      description="Assign anonymous letter codes to studios based on reservation approval order"
      size="lg"
      footer={
        <div className="flex justify-end gap-3">
          <Button
            variant="secondary"
            onClick={onClose}
            disabled={isAssigning}
          >
            Cancel
          </Button>
          <Button
            variant="primary"
            onClick={handleAutoAssign}
            disabled={isAssigning || !data || data.unassignedCount === 0}
            className="bg-purple-600 hover:bg-purple-700"
          >
            {isAssigning ? (
              <span className="flex items-center gap-2">
                <span className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full" />
                Assigning...
              </span>
            ) : (
              <span className="flex items-center gap-2">
                <Hash className="h-4 w-4" />
                Auto-Assign Studio Codes
              </span>
            )}
          </Button>
        </div>
      }
    >
      <div className="space-y-6">
        {/* Loading State */}
        {isLoading && (
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin h-8 w-8 border-4 border-purple-500 border-t-transparent rounded-full" />
          </div>
        )}

        {/* No Data State */}
        {!isLoading && !data && (
          <div className="text-center py-8 text-gray-400">
            Failed to load studio data
          </div>
        )}

        {/* Loaded Data */}
        {!isLoading && data && (
          <>
            {/* Summary */}
            <div className="flex items-center gap-4 text-sm">
              <div className="flex items-center gap-2">
                <Building2 className="h-4 w-4 text-gray-400" />
                <span className="text-white font-medium">{data.totalCount}</span>
                <span className="text-gray-400">total studios</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle className="h-4 w-4 text-green-400" />
                <span className="text-white font-medium">{data.assigned.length}</span>
                <span className="text-gray-400">already assigned</span>
              </div>
              <div className="flex items-center gap-2">
                <AlertCircle className="h-4 w-4 text-yellow-400" />
                <span className="text-white font-medium">{data.unassignedCount}</span>
                <span className="text-gray-400">need codes</span>
              </div>
            </div>

            {/* Info Box */}
            {data.unassignedCount > 0 && (
              <div className="bg-purple-900/30 border border-purple-500/30 rounded-lg p-4">
                <h4 className="font-medium text-purple-200 mb-3 flex items-center gap-2">
                  <AlertCircle className="h-4 w-4" />
                  Assignment Preview
                </h4>
                <ul className="space-y-2 text-sm text-purple-100">
                  <li className="flex items-start gap-2">
                    <span className="text-purple-400 mt-0.5">•</span>
                    <span>Codes assigned alphabetically (A-Z, AA-ZZ, etc.)</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-purple-400 mt-0.5">•</span>
                    <span>Order based on reservation approval timestamp</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-purple-400 mt-0.5">•</span>
                    <span>Codes are anonymous and competition-specific</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-purple-400 mt-0.5">•</span>
                    <span>Same studio can have different codes at different competitions</span>
                  </li>
                </ul>
              </div>
            )}

            {/* Unassigned Studios Table */}
            {data.unassignedCount > 0 ? (
              <div className="space-y-2">
                <h4 className="text-sm font-medium text-white flex items-center gap-2">
                  <Hash className="h-4 w-4" />
                  Studios to be assigned ({data.unassignedCount})
                </h4>
                <div className="border border-gray-700 rounded-lg overflow-hidden">
                  <div className="max-h-96 overflow-y-auto">
                    <table className="min-w-full divide-y divide-gray-700">
                      <thead className="bg-gray-800 sticky top-0">
                        <tr>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                            Proposed Code
                          </th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                            Studio Name
                          </th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                            Approved At
                          </th>
                        </tr>
                      </thead>
                      <tbody className="bg-gray-900 divide-y divide-gray-700">
                        {data.unassigned.map((studio, index) => (
                          <tr key={studio.reservationId} className="hover:bg-gray-800/50">
                            <td className="px-4 py-3 whitespace-nowrap">
                              <span className="inline-flex items-center px-3 py-1 rounded-md text-sm font-bold bg-amber-500/20 text-amber-300 border border-amber-500/40">
                                {generateCode(data.assigned.length + index)}
                              </span>
                            </td>
                            <td className="px-4 py-3 text-sm text-white">
                              {studio.studioName}
                            </td>
                            <td className="px-4 py-3 text-sm text-gray-400">
                              {studio.approvedAt
                                ? new Date(studio.approvedAt).toLocaleDateString('en-US', {
                                    month: 'short',
                                    day: 'numeric',
                                    year: 'numeric',
                                    hour: 'numeric',
                                    minute: '2-digit',
                                  })
                                : 'N/A'}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            ) : (
              <div className="bg-green-900/30 border border-green-500/30 rounded-lg p-6 text-center">
                <CheckCircle className="h-12 w-12 text-green-400 mx-auto mb-3" />
                <h4 className="font-medium text-green-200 mb-2">All studios have codes!</h4>
                <p className="text-sm text-green-100">
                  Every approved studio already has an assigned code.
                </p>
              </div>
            )}

            {/* Already Assigned Studios (Collapsible) */}
            {data.assigned.length > 0 && (
              <details className="space-y-2">
                <summary className="text-sm font-medium text-gray-400 cursor-pointer hover:text-gray-300">
                  View already assigned codes ({data.assigned.length})
                </summary>
                <div className="border border-gray-700 rounded-lg overflow-hidden mt-2">
                  <div className="max-h-64 overflow-y-auto">
                    <table className="min-w-full divide-y divide-gray-700">
                      <thead className="bg-gray-800">
                        <tr>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                            Code
                          </th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                            Studio Name
                          </th>
                        </tr>
                      </thead>
                      <tbody className="bg-gray-900 divide-y divide-gray-700">
                        {data.assigned.map((studio) => (
                          <tr key={studio.studioId} className="hover:bg-gray-800/50">
                            <td className="px-4 py-3 whitespace-nowrap">
                              <span className="inline-flex items-center px-3 py-1 rounded-md text-sm font-bold bg-green-500/20 text-green-300 border border-green-500/40">
                                {studio.code}
                              </span>
                            </td>
                            <td className="px-4 py-3 text-sm text-white">
                              {studio.studioName}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </details>
            )}
          </>
        )}
      </div>
    </Modal>
  );
}
