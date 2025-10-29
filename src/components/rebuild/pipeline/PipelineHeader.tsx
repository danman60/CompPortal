import Link from 'next/link';

/**
 * Pipeline Page Header
 * Back link + title + description
 */
export function PipelineHeader() {
  return (
    <>
      <Link
        href="/dashboard"
        className="text-purple-400 hover:text-purple-300 text-sm mb-4 inline-block"
      >
        ← Back to Dashboard
      </Link>

      <header className="mb-8">
        <div className="flex items-center gap-4 mb-2">
          <h1 className="text-4xl font-bold text-white">🎯 Studio Pipeline</h1>
          <span className="px-3 py-1 bg-blue-500/30 border border-blue-400/50 rounded-full text-blue-200 text-sm font-bold">
            🔨 REBUILD
          </span>
        </div>
        <p className="text-gray-400">
          Manage all studio reservations from request to payment in one unified dashboard
        </p>
      </header>
    </>
  );
}
