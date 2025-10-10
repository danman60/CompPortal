import { ReactNode, useEffect, useRef, useState } from 'react';

interface HoverPreviewProps {
  trigger: ReactNode;
  content: ReactNode;
  delay?: number; // Delay before showing (ms)
}

export default function HoverPreview({ trigger, content, delay = 300 }: HoverPreviewProps) {
  const [isVisible, setIsVisible] = useState(false);
  const [position, setPosition] = useState<'top' | 'bottom'>('bottom');
  const triggerRef = useRef<HTMLDivElement>(null);
  const previewRef = useRef<HTMLDivElement>(null);
  const timeoutRef = useRef<NodeJS.Timeout>();

  const handleMouseEnter = () => {
    timeoutRef.current = setTimeout(() => {
      setIsVisible(true);

      // Calculate position based on viewport
      if (triggerRef.current) {
        const rect = triggerRef.current.getBoundingClientRect();
        const spaceBelow = window.innerHeight - rect.bottom;
        const spaceAbove = rect.top;

        // Show above if not enough space below
        setPosition(spaceBelow < 300 && spaceAbove > spaceBelow ? 'top' : 'bottom');
      }
    }, delay);
  };

  const handleMouseLeave = () => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    setIsVisible(false);
  };

  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  return (
    <div
      ref={triggerRef}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      className="relative inline-block w-full"
    >
      {trigger}

      {isVisible && (
        <div
          ref={previewRef}
          className={`absolute left-0 right-0 z-50 pointer-events-none ${
            position === 'top' ? 'bottom-full mb-2' : 'top-full mt-2'
          }`}
        >
          <div className="bg-gradient-to-br from-slate-900 to-gray-900 backdrop-blur-md rounded-xl border border-white/20 p-4 shadow-2xl animate-in fade-in slide-in-from-bottom-2 duration-200">
            {content}
          </div>
        </div>
      )}
    </div>
  );
}
