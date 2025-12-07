'use client';

import { usePipelineV2 } from './usePipelineV2';
import { PipelineV2 } from './PipelineV2';

export default function PipelineV2Page() {
  const pipelineData = usePipelineV2();

  if (pipelineData.isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading pipeline...</p>
        </div>
      </div>
    );
  }

  return <PipelineV2 {...pipelineData} />;
}
