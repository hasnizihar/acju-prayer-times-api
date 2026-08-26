import { RootProvider } from 'fumadocs-ui/provider/next';
import './global.css';
import { Inter, Geist_Mono } from 'next/font/google';
import type { ReactNode } from 'react';

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
});

const geistMono = Geist_Mono({
  subsets: ['latin'],
  variable: '--font-geist-mono',
});

import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: {
    template: '%s | SalahSL API',
    default: 'SalahSL API | Sri Lanka Islamic Prayer Times API',
  },
  description: 'Free and developer-friendly REST API providing Islamic prayer times for Sri Lanka, powered by ACJU prayer time data. Get Fajr, Dhuhr, Asr, Maghrib and Isha times by location and date.',
  keywords: [
    'Sri Lanka prayer times API',
    'Islamic prayer times API',
    'prayer times API Sri Lanka',
    'SalahSL API',
    'Muslim prayer times API',
    'Salah times API',
    'Fajr Dhuhr Asr Maghrib Isha API',
    'Sri Lanka Islamic calendar API',
    'prayer time REST API',
    'prayer times JSON API'
  ],
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL || 'https://salahsl.vercel.app'),
  alternates: {
    canonical: '/guide',
  },
  openGraph: {
    title: 'SalahSL API',
    description: 'Access Islamic prayer times across Sri Lanka through a simple REST API.',
    type: 'website',
    url: '/guide',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'SalahSL API',
    description: 'Access Islamic prayer times across Sri Lanka through a simple REST API.',
  },
};

export default function Layout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" className={`${inter.variable} ${geistMono.variable}`} suppressHydrationWarning>
      <body className="flex flex-col min-h-screen bg-fd-background text-fd-foreground antialiased">
        <RootProvider>
          {children}
        </RootProvider>
      </body>
    </html>
  );
}
