import type { Metadata, Viewport } from 'next';
import type { ReactNode } from 'react';
import { GeistSans } from 'geist/font/sans';
import { GeistSerifRegular } from 'geist/font/serif/regular';
import { SiteHeader } from '@/components/site-header';
import { SiteFooter } from '@/components/site-footer';
import { ThemeProvider } from '@/components/theme-provider';
import './globals.css';

export const metadata: Metadata = {
  metadataBase: new URL('https://duzelo-thembaxxs-projects.vercel.app'),
  title: { default: 'Duzelo — Good help, close to home', template: '%s | Duzelo' },
  description: 'Duzelo is preparing a local-services marketplace for South Africa. Explore service categories and see how the marketplace will work.',
  applicationName: 'Duzelo',
  manifest: '/manifest.webmanifest',
  icons: { icon: '/icon.svg' },
  robots: { index: false, follow: false }, // prelaunch: do not index non-operational marketplace
};

export const viewport: Viewport = { width: 'device-width', initialScale: 1, themeColor: [
  { media: '(prefers-color-scheme: light)', color: '#FAFAF7' },
  { media: '(prefers-color-scheme: dark)', color: '#111D18' },
] };

export default function RootLayout({ children }: Readonly<{ children: ReactNode }>) {
  return (
    <html lang="en" className={`${GeistSans.variable} ${GeistSerifRegular.variable}`} suppressHydrationWarning>
      <body>
        <ThemeProvider>
          <a href="#main-content" className="skip-link">Skip to main content</a>
          <SiteHeader />
          <main id="main-content" className="main-content">{children}</main>
          <SiteFooter />
        </ThemeProvider>
      </body>
    </html>
  );
}
