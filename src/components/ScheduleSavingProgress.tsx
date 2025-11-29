'use client';

interface ScheduleSavingProgressProps {
  currentDay: number;
  totalDays: number;
  currentDayName: string;
}

export default function ScheduleSavingProgress({
  currentDay,
  totalDays,
  currentDayName,
}: ScheduleSavingProgressProps) {
  const progressPercent = totalDays > 0 ? (currentDay / totalDays) * 100 : 0;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-gradient-to-br from-slate-900 via-gray-900 to-black">
      <div className="relative max-w-md w-full px-6">
        {/* Stage floor */}
        <div className="absolute bottom-20 left-1/2 -translate-x-1/2 w-64 h-1 bg-gradient-to-r from-transparent via-purple-500/50 to-transparent rounded-full blur-sm" />

        {/* Ballet shoes */}
        <div className="ballet-shoes text-8xl text-center mb-8">
          🩰
        </div>

        {/* Status text */}
        <div className="text-center mb-6">
          <div className="text-purple-400 font-semibold text-2xl mb-2">
            Saving Schedule
          </div>
          <div className="text-gray-400 text-sm">
            Day {currentDay} of {totalDays}: {currentDayName}
          </div>
        </div>

        {/* Progress bar container */}
        <div className="w-full bg-gray-800 rounded-full h-3 overflow-hidden shadow-inner mb-2">
          {/* Progress bar fill */}
          <div
            className="bg-gradient-to-r from-purple-600 via-purple-500 to-pink-500 h-full transition-all duration-500 ease-out rounded-full shadow-lg"
            style={{ width: `${progressPercent}%` }}
          >
            {/* Shimmer effect */}
            <div className="shimmer h-full w-full"></div>
          </div>
        </div>

        {/* Progress percentage */}
        <div className="text-center text-gray-500 text-xs font-medium">
          {Math.round(progressPercent)}%
        </div>

        {/* Please wait message */}
        <div className="text-center mt-6 text-gray-400 text-sm">
          Please wait... This may take up to 2 minutes for large schedules.
        </div>
      </div>

      <style jsx>{`
        @keyframes balletJump {
          0% {
            transform: translateY(0) rotate(0deg) scale(1);
            opacity: 0.8;
          }
          25% {
            transform: translateY(-60px) rotate(-10deg) scale(1.1);
            opacity: 1;
          }
          50% {
            transform: translateY(-120px) rotate(0deg) scale(1.2);
            opacity: 1;
            filter: drop-shadow(0 0 20px rgba(168, 85, 247, 0.6));
          }
          75% {
            transform: translateY(-60px) rotate(10deg) scale(1.1);
            opacity: 1;
          }
          100% {
            transform: translateY(0) rotate(0deg) scale(1);
            opacity: 0.8;
          }
        }

        @keyframes shimmer {
          0% {
            background-position: -200% 0;
          }
          100% {
            background-position: 200% 0;
          }
        }

        .ballet-shoes {
          animation: balletJump 1.5s ease-in-out infinite;
          display: inline-block;
        }

        .shimmer {
          background: linear-gradient(
            90deg,
            transparent 0%,
            rgba(255, 255, 255, 0.3) 50%,
            transparent 100%
          );
          background-size: 200% 100%;
          animation: shimmer 2s infinite;
        }
      `}</style>
    </div>
  );
}
