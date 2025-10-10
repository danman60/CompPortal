import { useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { hapticLight } from '@/lib/haptics';

/**
 * Global keyboard navigation shortcuts
 * Alt+1-5 for quick navigation
 */
export function useKeyboardNavigation() {
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Only trigger on Alt key (not Ctrl or Meta)
      if (!e.altKey || e.ctrlKey || e.metaKey) return;

      // Don't trigger if typing in an input
      const target = e.target as HTMLElement;
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA') return;

      let route: string | null = null;

      switch (e.key) {
        case '1':
          route = '/dashboard';
          break;
        case '2':
          route = '/dashboard/entries';
          break;
        case '3':
          route = '/dashboard/dancers';
          break;
        case '4':
          route = '/dashboard/invoices/all';
          break;
        case '5':
          route = '/dashboard/reservations';
          break;
        default:
          return;
      }

      if (route && pathname !== route) {
        e.preventDefault();
        hapticLight();
        router.push(route);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [router, pathname]);
}
