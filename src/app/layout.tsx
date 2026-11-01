import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";
import { GeistSans } from "geist/font/sans";
import { GeistSerifRegular } from "geist/font/serif/regular";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { ThemeProvider } from "@/components/theme-provider";
import { BrowserTheme } from "@/components/browser-theme";
import { PwaRuntime } from "@/components/pwa-runtime";
import { RevealDirector } from "@/components/reveal-director";
import { SITE_URL, SITE_TITLE, SITE_DESCRIPTION } from "@/lib/site";
import "./globals.css";
import "@/features/auth/auth.css";
import { discoveryConfig } from "@/features/discovery/config";
import { workerConfig } from "@/features/workers/config";
import { readAuthConfig } from "@/config/auth";
import { jobsConfig } from "@/features/jobs/config";
import { quotesConfig } from "@/features/quotes/config";
import "@/features/jobs/jobs.css";
import "@/features/discovery/discovery.css";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: { default: SITE_TITLE, template: "%s | Duzelo" },
  description: SITE_DESCRIPTION,
  applicationName: "Duzelo",
  manifest: "/manifest.webmanifest",
  alternates: { canonical: "/" },
  openGraph: {
    type: "website",
    locale: "en_ZA",
    siteName: "Duzelo",
    url: SITE_URL,
    title: SITE_TITLE,
    description: SITE_DESCRIPTION,
    images: [
      { url: "/opengraph-image", width: 1200, height: 630, alt: "Duzelo local services preview" },
    ],
  },
  twitter: { card: "summary_large_image", title: SITE_TITLE, description: SITE_DESCRIPTION },
  appleWebApp: { capable: true, statusBarStyle: "default", title: "Duzelo" },
  icons: {
    icon: [
      { url: "/icon.svg", type: "image/svg+xml" },
      { url: "/favicon-32.png", sizes: "32x32", type: "image/png" },
    ],
    apple: [{ url: "/apple-touch-icon.png", sizes: "180x180", type: "image/png" }],
  },
  robots: { index: true, follow: true },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#F9F7F0" },
    { media: "(prefers-color-scheme: dark)", color: "#101C17" },
  ],
};

export default function RootLayout({ children }: Readonly<{ children: ReactNode }>) {
  readAuthConfig();
  workerConfig();
  discoveryConfig();
  jobsConfig();
  quotesConfig();
  return (
    <html
      lang="en"
      className={`${GeistSans.variable} ${GeistSerifRegular.variable}`}
      suppressHydrationWarning
    >
      <body>
        <ThemeProvider>
          <BrowserTheme />
          <RevealDirector />
          <a href="#main-content" className="skip-link">
            Skip to main content
          </a>
          <SiteHeader />
          <main id="main-content" className="main-content">
            {children}
          </main>
          <SiteFooter />
          <PwaRuntime />
        </ThemeProvider>
      </body>
    </html>
  );
}
