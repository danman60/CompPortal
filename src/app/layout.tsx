import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import { TRPCProvider } from '@/providers/trpc-provider';
import ToastProvider from '@/components/ToastProvider';
import { TenantThemeProvider } from '@/contexts/TenantThemeProvider';
import { getTenantData } from '@/lib/tenant-context';
import Script from 'next/script';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'Competition Portal',
  description: 'Modern dance competition management platform',
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  // Fetch tenant data server-side for SSR
  const tenantData = await getTenantData();

  return (
    <html lang="en">
      <body className={inter.className}>
        {/* Support chat widget (Crisp) */}
        <Script
          id="crisp-widget"
          strategy="afterInteractive"
          dangerouslySetInnerHTML={{
            __html: `
              window.$crisp = [];
              window.CRISP_WEBSITE_ID = "PLACEHOLDER_CRISP_ID";
              (function(){
                var d=document; var s=d.createElement("script");
                s.src = "https://client.crisp.chat/l.js"; s.async = 1;
                d.getElementsByTagName("head")[0].appendChild(s);
              })();
              // Match portal branding
              window.$crisp.push(["config", "color:theme", ["purple"]]);
            `,
          }}
        />
        <TenantThemeProvider initialTenant={tenantData}>
          <TRPCProvider>
            <ToastProvider />
            {children}
          </TRPCProvider>
        </TenantThemeProvider>
      </body>
    </html>
  );
}
