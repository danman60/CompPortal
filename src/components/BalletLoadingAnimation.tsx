'use client';

import { useEffect, useState } from 'react';

interface BalletLoadingAnimationProps {
  onAnimationComplete?: () => void;
  minDuration?: number; // Minimum time to show animation (ms)
}

export default function BalletLoadingAnimation({
  onAnimationComplete,
  minDuration = 1500
}: BalletLoadingAnimationProps) {
  const [isComplete, setIsComplete] = useState(false);

  useEffect(() => {
    // Wait for minimum duration and animation peak
    const timer = setTimeout(() => {
      setIsComplete(true);
      onAnimationComplete?.();
    }, minDuration);

    return () => clearTimeout(timer);
  }, [minDuration, onAnimationComplete]);

  if (isComplete) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-gradient-to-br from-slate-900 via-gray-900 to-black">
      <div className="relative">
        {/* Stage floor */}
        <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-64 h-1 bg-gradient-to-r from-transparent via-purple-500/50 to-transparent rounded-full blur-sm" />

        {/* Ballet dancer */}
        <div className="ballet-dancer text-8xl">
          🩰
        </div>

        {/* Loading text */}
        <div className="mt-8 text-center">
          <div className="loading-dots flex items-center justify-center gap-2">
            <span className="text-purple-400 font-semibold text-lg">Loading</span>
            <span className="dot">.</span>
            <span className="dot">.</span>
            <span className="dot">.</span>
          </div>
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

        @keyframes fadeIn {
          from {
            opacity: 0;
          }
          to {
            opacity: 1;
          }
        }

        @keyframes dotBounce {
          0%, 80%, 100% {
            transform: translateY(0);
            opacity: 0.4;
          }
          40% {
            transform: translateY(-8px);
            opacity: 1;
          }
        }

        .ballet-dancer {
          animation: balletJump 1.5s ease-in-out infinite;
          display: inline-block;
        }

        .loading-dots {
          animation: fadeIn 0.5s ease-in;
        }

        .dot {
          animation: dotBounce 1.4s infinite;
          display: inline-block;
          color: #a855f7;
          font-size: 1.5rem;
          font-weight: bold;
        }

        .dot:nth-child(2) {
          animation-delay: 0.2s;
        }

        .dot:nth-child(3) {
          animation-delay: 0.4s;
        }

        .dot:nth-child(4) {
          animation-delay: 0.6s;
        }
      `}</style>
    </div>
  );
}
