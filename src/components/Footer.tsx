'use client';

import { useTenantTheme } from '@/contexts/TenantThemeProvider';

export default function Footer() {
  const { tenant } = useTenantTheme();
  const tenantName = tenant?.name || 'EMPWR Dance Experience';
  const currentYear = new Date().getFullYear();

  return (
    <footer className="bg-black/20 backdrop-blur-sm border-t border-white/10 py-4 mt-auto">
      <div className="container mx-auto px-4 text-center">
        <p className="text-gray-400 text-sm">
          © {currentYear} CompSync for {tenantName}
        </p>
      </div>
    </footer>
  );
}
