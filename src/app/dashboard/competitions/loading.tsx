export default function CompetitionsLoading() {
  return (
    <main className="min-h-screen bg-gradient-to-br from-slate-900 via-gray-900 to-black">
      <div className="container mx-auto px-4 py-8">
        {/* Header Skeleton */}
        <div className="bg-white/10 backdrop-blur-md rounded-xl border border-white/20 p-6 mb-6 animate-pulse">
          <div className="flex justify-between items-center mb-4">
            <div>
              <div className="h-8 w-56 bg-white/20 rounded mb-2"></div>
              <div className="h-4 w-80 bg-white/10 rounded"></div>
            </div>
            <div className="h-10 w-48 bg-white/20 rounded-lg"></div>
          </div>
        </div>

        {/* Competitions Grid Skeleton */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div
              key={i}
              className="bg-white/10 backdrop-blur-md rounded-xl border border-white/20 overflow-hidden animate-pulse"
            >
              {/* Card Header */}
              <div className="bg-gradient-to-r from-purple-500/20 to-pink-500/20 p-6 border-b border-white/10">
                <div className="h-6 bg-white/30 rounded w-3/4 mb-2"></div>
                <div className="h-4 bg-white/20 rounded w-1/2"></div>
              </div>

              {/* Card Body */}
              <div className="p-6 space-y-4">
                <div className="flex items-center gap-3">
                  <div className="h-5 w-5 bg-white/20 rounded"></div>
                  <div className="h-4 bg-white/20 rounded flex-1"></div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="h-5 w-5 bg-white/20 rounded"></div>
                  <div className="h-4 bg-white/20 rounded flex-1"></div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="h-5 w-5 bg-white/20 rounded"></div>
                  <div className="h-4 bg-white/20 rounded flex-1"></div>
                </div>

                {/* Stats Row */}
                <div className="grid grid-cols-3 gap-4 pt-4 border-t border-white/10">
                  {[1, 2, 3].map((j) => (
                    <div key={j}>
                      <div className="h-3 bg-white/10 rounded w-full mb-1"></div>
                      <div className="h-6 bg-white/30 rounded w-12"></div>
                    </div>
                  ))}
                </div>

                {/* Action Buttons */}
                <div className="flex gap-2 pt-4">
                  <div className="h-9 bg-white/20 rounded flex-1"></div>
                  <div className="h-9 w-9 bg-white/20 rounded"></div>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Empty State Skeleton (alternative layout) */}
        <div className="hidden">
          <div className="bg-white/10 backdrop-blur-md rounded-xl border border-white/20 p-12 text-center animate-pulse">
            <div className="h-16 w-16 bg-white/20 rounded-full mx-auto mb-4"></div>
            <div className="h-6 bg-white/20 rounded w-64 mx-auto mb-2"></div>
            <div className="h-4 bg-white/10 rounded w-96 mx-auto"></div>
          </div>
        </div>
      </div>
    </main>
  );
}
