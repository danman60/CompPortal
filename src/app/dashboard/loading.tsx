export default function DashboardLoading() {
  return (
    <main className="min-h-screen bg-gradient-to-br from-slate-900 via-gray-900 to-black relative overflow-hidden">
      {/* Animated Gradient Overlay */}
      <div className="absolute inset-0 opacity-15 pointer-events-none">
        <div className="absolute inset-0 bg-gradient-to-br from-pink-500 via-purple-500 to-pink-500 animate-gradient-shift" style={{ backgroundSize: '200% 200%' }}></div>
      </div>

      <div className="container mx-auto px-4 py-8 relative z-10">
        {/* Header Skeleton */}
        <div className="flex justify-end mb-4">
          <div className="h-10 w-24 bg-white/10 backdrop-blur-md rounded-lg border border-white/20 animate-pulse"></div>
        </div>

        {/* Dashboard Skeleton */}
        <div className="space-y-6 animate-fade-in">
          {/* Title Skeleton */}
          <div className="h-12 w-64 bg-white/10 backdrop-blur-md rounded-xl border border-white/20 animate-pulse"></div>

          {/* Stats Cards Skeleton */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {[1, 2, 3, 4].map((i) => (
              <div
                key={i}
                className="bg-white/10 backdrop-blur-md rounded-xl border border-white/20 p-6 animate-pulse"
              >
                <div className="h-4 w-24 bg-white/20 rounded mb-4"></div>
                <div className="h-8 w-16 bg-white/30 rounded mb-2"></div>
                <div className="h-3 w-32 bg-white/10 rounded"></div>
              </div>
            ))}
          </div>

          {/* Main Content Skeleton */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {[1, 2].map((i) => (
              <div
                key={i}
                className="bg-white/10 backdrop-blur-md rounded-xl border border-white/20 p-6 animate-pulse"
              >
                <div className="h-6 w-48 bg-white/20 rounded mb-6"></div>
                <div className="space-y-4">
                  {[1, 2, 3].map((j) => (
                    <div key={j} className="flex items-center gap-4">
                      <div className="h-12 w-12 bg-white/20 rounded-full"></div>
                      <div className="flex-1 space-y-2">
                        <div className="h-4 bg-white/20 rounded w-3/4"></div>
                        <div className="h-3 bg-white/10 rounded w-1/2"></div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>

          {/* Table Skeleton */}
          <div className="bg-white/10 backdrop-blur-md rounded-xl border border-white/20 p-6 animate-pulse">
            <div className="h-6 w-40 bg-white/20 rounded mb-6"></div>
            <div className="space-y-3">
              {[1, 2, 3, 4, 5].map((i) => (
                <div key={i} className="h-12 bg-white/10 rounded"></div>
              ))}
            </div>
          </div>
        </div>

        {/* Footer Skeleton */}
        <footer className="mt-12 pt-6 border-t border-white/10">
          <div className="flex justify-center items-center gap-4">
            <div className="h-4 w-32 bg-white/10 rounded animate-pulse"></div>
            <span className="text-gray-500">•</span>
            <div className="h-4 w-32 bg-white/10 rounded animate-pulse"></div>
          </div>
        </footer>
      </div>
    </main>
  );
}
