/**
 * useCountUp Hook
 * Animates numbers counting up from current value to target value
 * Re-animates when target value changes
 */

import { useState, useEffect, useRef } from 'react';

export function useCountUp(end: number, duration = 1000, startOnMount = true) {
  const [count, setCount] = useState(startOnMount ? 0 : end);
  const [isAnimating, setIsAnimating] = useState(false);
  const prevEnd = useRef(end);

  useEffect(() => {
    if (!startOnMount) return;

    // If the end value changed, animate from current count to new end
    if (prevEnd.current !== end) {
      prevEnd.current = end;
      setIsAnimating(true);

      const start = count;
      const diff = end - start;
      const increment = diff / (duration / 16); // 60fps
      let current = start;
      let frame: number;

      const animate = () => {
        current += increment;
        const shouldFinish = (increment > 0 && current >= end) || (increment < 0 && current <= end);

        if (shouldFinish) {
          setCount(end);
          setIsAnimating(false);
        } else {
          setCount(Math.floor(current));
          frame = requestAnimationFrame(animate);
        }
      };

      frame = requestAnimationFrame(animate);

      return () => {
        if (frame) {
          cancelAnimationFrame(frame);
        }
      };
    }
  }, [end, duration, startOnMount, count]);

  return { count, isAnimating };
}
