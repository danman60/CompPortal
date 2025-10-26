'use client';

import { useTenantTheme } from '@/contexts/TenantThemeProvider';

export default function Footer() {
  const { tenant } = useTenantTheme();
  const tenantName = tenant?.name || 'EMPWR Dance Experience';
  const currentYear = new Date().getFullYear();

  return (
    <footer className="bg-gradient-to-r from-slate-900 via-gray-900 to-black border-t border-white/10 py-6 mt-auto">
      <div className="container mx-auto px-4 text-center">
        <p className="text-gray-400 text-sm">
          © {currentYear} <span className="font-semibold text-white">EMPWR Dance Experience</span> · Powered by <span className="font-semibold text-purple-400">CompSync</span>
        </p>
        <p className="text-gray-500 text-xs mt-2">
          <a
            href="/status"
            className="hover:text-purple-400 transition-colors"
            target="_blank"
            rel="noopener noreferrer"
          >
            System Status
          </a>
        </p>
      </div>
    </footer>
  );
}
