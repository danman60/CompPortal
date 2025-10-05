import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Dashboard | CompPortal',
  description: 'Competition management dashboard',
};

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
