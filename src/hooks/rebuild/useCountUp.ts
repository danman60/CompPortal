/**
 * useCountUp Hook
 * Animates numbers counting up from 0 to target value
 * Only animates once on mount, not on re-renders
 */

import { useState, useEffect, useRef } from 'react';

export function useCountUp(end: number, duration = 1000, startOnMount = true) {
  const [count, setCount] = useState(startOnMount ? 0 : end);
  const [isAnimating, setIsAnimating] = useState(false);
  const hasAnimated = useRef(false);

  useEffect(() => {
    if (!startOnMount || hasAnimated.current) return;

    hasAnimated.current = true;
    setIsAnimating(true);
    let start = 0;
    const increment = end / (duration / 16); // 60fps
    let frame: number;

    const animate = () => {
      start += increment;
      if (start >= end) {
        setCount(end);
        setIsAnimating(false);
      } else {
        setCount(Math.floor(start));
        frame = requestAnimationFrame(animate);
      }
    };

    frame = requestAnimationFrame(animate);

    return () => {
      if (frame) {
        cancelAnimationFrame(frame);
      }
    };
  }, [end, duration, startOnMount]);

  return { count, isAnimating };
}
