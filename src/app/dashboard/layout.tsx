'use client';

import MobileBottomNav from '@/components/MobileBottomNav';
import KeyboardShortcutsModal from '@/components/KeyboardShortcutsModal';
import { useKeyboardNavigation } from '@/hooks/useKeyboardNavigation';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Enable global keyboard navigation
  useKeyboardNavigation();

  return (
    <>
      <div className="pb-20 md:pb-0">{children}</div>
      <MobileBottomNav />
      <KeyboardShortcutsModal />
    </>
  );
}
