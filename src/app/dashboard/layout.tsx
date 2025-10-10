import type { Metadata } from 'next';
import MobileBottomNav from '@/components/MobileBottomNav';

export const metadata: Metadata = {
  title: 'Dashboard | CompPortal',
  description: 'Competition management dashboard',
};

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      <div className="pb-20 md:pb-0">{children}</div>
      <MobileBottomNav />
    </>
  );
}
