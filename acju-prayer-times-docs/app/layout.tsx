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

export const metadata = {
  title: 'ACJU Prayer Times API | Developer Documentation',
  description: 'Independent ACJU-sourced prayer-time API for Sri Lanka, built by KR Hasni Zihar.',
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
