import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import { TRPCProvider } from '@/providers/trpc-provider';
import ToastProvider from '@/components/ToastProvider';
import { TenantThemeProvider } from '@/contexts/TenantThemeProvider';
import { getTenantData } from '@/lib/tenant-context';
import Script from 'next/script';
import Footer from '@/components/Footer';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { Analytics } from '@vercel/analytics/react';
import { SpeedInsights } from '@vercel/speed-insights/next';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: {
    default: 'CompPortal - Dance Competition Management',
    template: '%s | CompPortal',
  },
  description: 'Modern dance competition management platform for studios, directors, and judges. Streamline registrations, scheduling, scoring, and results.',
  keywords: ['dance competition', 'competition management', 'dance studio', 'competition software', 'dance registration', 'scoring system'],
  authors: [{ name: 'CompPortal Team' }],
  creator: 'CompPortal',
  publisher: 'CompPortal',
  metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL || 'https://comp-portal-one.vercel.app'),
  openGraph: {
    type: 'website',
    locale: 'en_US',
    url: '/',
    title: 'CompPortal - Dance Competition Management',
    description: 'Modern dance competition management platform for studios, directors, and judges. Streamline registrations, scheduling, scoring, and results.',
    siteName: 'CompPortal',
    images: [
      {
        url: '/og-image.png',
        width: 1200,
        height: 630,
        alt: 'CompPortal - Dance Competition Management',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'CompPortal - Dance Competition Management',
    description: 'Modern dance competition management platform for studios, directors, and judges.',
    images: ['/og-image.png'],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
  icons: {
    icon: '/favicon.ico',
    apple: '/apple-touch-icon.png',
  },
  manifest: '/manifest.json',
  viewport: {
    width: 'device-width',
    initialScale: 1,
    maximumScale: 5,
  },
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
      <body className={`${inter.className} flex flex-col min-h-screen`}>
        <ErrorBoundary>
          <TenantThemeProvider initialTenant={tenantData}>
            <TRPCProvider>
              <ToastProvider />
              <div className="flex-1">{children}</div>
              <Footer />
            </TRPCProvider>
          </TenantThemeProvider>
        </ErrorBoundary>
        <Analytics />
        <SpeedInsights />
      </body>
    </html>
  );
}
