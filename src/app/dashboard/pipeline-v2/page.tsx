'use client';

import { usePipelineV2 } from './usePipelineV2';
import { PipelineV2 } from './PipelineV2';

export default function PipelineV2Page() {
  const pipelineData = usePipelineV2();

  if (pipelineData.isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-900 via-indigo-900 to-blue-900 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-400 mx-auto mb-4"></div>
          <p className="text-purple-200/60">Loading pipeline...</p>
        </div>
      </div>
    );
  }

  return <PipelineV2 {...pipelineData} />;
}
