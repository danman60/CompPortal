export default function EntriesLoading() {
  return (
    <main className="min-h-screen bg-gradient-to-br from-slate-900 via-gray-900 to-black">
      <div className="container mx-auto px-4 py-8">
        {/* Header Skeleton */}
        <div className="bg-white/10 backdrop-blur-md rounded-xl border border-white/20 p-6 mb-6 animate-pulse">
          <div className="flex justify-between items-center mb-4">
            <div className="h-8 w-48 bg-white/20 rounded"></div>
            <div className="h-10 w-32 bg-white/20 rounded-lg"></div>
          </div>
          <div className="h-4 w-96 bg-white/10 rounded"></div>
        </div>

        {/* Stats Cards Skeleton */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="bg-white/10 backdrop-blur-md rounded-xl border border-white/20 p-4 animate-pulse"
            >
              <div className="h-4 w-32 bg-white/20 rounded mb-2"></div>
              <div className="h-8 w-16 bg-white/30 rounded"></div>
            </div>
          ))}
        </div>

        {/* Entries List Skeleton */}
        <div className="bg-white/10 backdrop-blur-md rounded-xl border border-white/20 p-6 animate-pulse">
          <div className="space-y-4">
            {[1, 2, 3, 4, 5].map((i) => (
              <div
                key={i}
                className="bg-white/5 rounded-lg border border-white/10 p-4 flex items-center justify-between"
              >
                <div className="flex items-center gap-4 flex-1">
                  <div className="h-12 w-12 bg-white/20 rounded-full"></div>
                  <div className="flex-1 space-y-2">
                    <div className="h-5 bg-white/20 rounded w-1/3"></div>
                    <div className="h-3 bg-white/10 rounded w-1/4"></div>
                  </div>
                </div>
                <div className="flex gap-2">
                  <div className="h-9 w-20 bg-white/20 rounded"></div>
                  <div className="h-9 w-20 bg-white/20 rounded"></div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </main>
  );
}
