'use client';

import { useTenantTheme } from '@/contexts/TenantThemeProvider';
import packageJson from '../../package.json';

export default function Footer() {
  const { tenant } = useTenantTheme();
  const tenantName = tenant?.name || 'EMPWR Dance Experience';
  const currentYear = new Date().getFullYear();

  // Get commit hash from Vercel env var or fallback
  const commitHash = process.env.NEXT_PUBLIC_VERCEL_GIT_COMMIT_SHA?.slice(0, 7) || 'dev';
  const version = packageJson.version;

  // Get and format commit timestamp (manual formatting to avoid SSR/CSR hydration mismatch)
  const commitTimestamp = process.env.NEXT_PUBLIC_GIT_COMMIT_TIMESTAMP;
  const formattedTime = commitTimestamp && commitTimestamp !== 'unknown'
    ? (() => {
        const date = new Date(parseInt(commitTimestamp) * 1000);
        const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
        const month = months[date.getUTCMonth()];
        const day = date.getUTCDate();
        const year = date.getUTCFullYear();
        const hours = date.getUTCHours();
        const minutes = date.getUTCMinutes();
        const ampm = hours >= 12 ? 'PM' : 'AM';
        const displayHours = hours % 12 || 12;
        const displayMinutes = minutes.toString().padStart(2, '0');
        return `${month} ${day}, ${year}, ${displayHours}:${displayMinutes} ${ampm} UTC`;
      })()
    : null;

  return (
    <footer className="bg-gradient-to-r from-slate-900 via-gray-900 to-black border-t border-white/10 py-6 mt-auto">
      <div className="container mx-auto px-4 text-center">
        <p className="text-gray-400 text-sm">
          © {currentYear} <span className="font-semibold text-white">{tenantName}</span> · Powered by <span className="font-semibold text-purple-400">CompSync</span>
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
          <span className="mx-2">·</span>
          <span className="font-mono">
            v{version} ({commitHash})
            {formattedTime && (
              <>
                <span className="mx-2">·</span>
                {formattedTime}
              </>
            )}
          </span>
        </p>
      </div>
    </footer>
  );
}
