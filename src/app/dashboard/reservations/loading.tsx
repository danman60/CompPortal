export default function ReservationsLoading() {
  return (
    <main className="min-h-screen bg-gradient-to-br from-slate-900 via-gray-900 to-black">
      <div className="container mx-auto px-4 py-8">
        {/* Header Skeleton */}
        <div className="bg-white/10 backdrop-blur-md rounded-xl border border-white/20 p-6 mb-6 animate-pulse">
          <div className="flex justify-between items-center mb-4">
            <div>
              <div className="h-8 w-48 bg-white/20 rounded mb-2"></div>
              <div className="h-4 w-96 bg-white/10 rounded"></div>
            </div>
            <div className="h-10 w-40 bg-white/20 rounded-lg"></div>
          </div>
        </div>

        {/* Stats Overview Skeleton */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          {[1, 2, 3, 4].map((i) => (
            <div
              key={i}
              className="bg-white/10 backdrop-blur-md rounded-xl border border-white/20 p-4 animate-pulse"
            >
              <div className="h-4 w-24 bg-white/20 rounded mb-2"></div>
              <div className="h-8 w-16 bg-white/30 rounded mb-1"></div>
              <div className="h-3 w-20 bg-white/10 rounded"></div>
            </div>
          ))}
        </div>

        {/* Reservations Table Skeleton */}
        <div className="bg-white/10 backdrop-blur-md rounded-xl border border-white/20 overflow-hidden animate-pulse">
          {/* Table Header */}
          <div className="bg-white/5 border-b border-white/10 p-4">
            <div className="grid grid-cols-5 gap-4">
              {['Studio', 'Competition', 'Spaces', 'Status', 'Actions'].map((_, i) => (
                <div key={i} className="h-4 bg-white/20 rounded w-24"></div>
              ))}
            </div>
          </div>

          {/* Table Rows */}
          <div className="divide-y divide-white/10">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div key={i} className="p-4">
                <div className="grid grid-cols-5 gap-4 items-center">
                  <div className="h-5 bg-white/20 rounded w-32"></div>
                  <div className="h-5 bg-white/20 rounded w-40"></div>
                  <div className="h-5 bg-white/20 rounded w-16"></div>
                  <div className="h-6 bg-white/20 rounded w-20"></div>
                  <div className="flex gap-2">
                    <div className="h-8 w-20 bg-white/20 rounded"></div>
                    <div className="h-8 w-20 bg-white/20 rounded"></div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </main>
  );
}
