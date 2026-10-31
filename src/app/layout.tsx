import type { Metadata, Viewport } from "next";
import Link from "next/link";
import { brand } from "@/config/brand";
import { publicEnv } from "@/config/env";
import { validateServerEnv } from "@/config/server";
import { Sidebar, Topbar, BottomNavigation } from "@/components/layout/navigation.client";
import { PwaStatus } from "@/components/layout/pwa.client";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL(publicEnv.siteUrl),
  title: { default: `${brand.name} — ${brand.tagline}`, template: `%s | ${brand.name}` },
  description: `A local-services marketplace being built for ${brand.area}. ${brand.tagline}`,
  applicationName: brand.name,
  manifest: "/manifest.webmanifest",
  icons: { icon: "/icons/icon-192.png", apple: "/icons/apple-touch-icon.png" },
  appleWebApp: { capable: true, statusBarStyle: "default", title: brand.name },
  robots: { index: false, follow: false }, // Foundation preview; no public launch authorised.
};
export const viewport: Viewport = { width: "device-width", initialScale: 1, themeColor: "#121311" };
export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  validateServerEnv();
  return (
    <html lang="en-ZA">
      <body>
        <a className="skip-link" href="#main-content">
          Skip to content
        </a>
        <div className="app-shell">
          <Sidebar />
          <div className="shell-content">
            <Topbar />
            <main id="main-content" tabIndex={-1}>
              <PwaStatus />
              {children}
            </main>
            <footer className="site-footer">
              <span>© {brand.name}. Working name. Pilot in preparation.</span>
              <div>
                <Link href="/legal/privacy">Privacy</Link>
                <Link href="/legal/terms">Terms</Link>
                <Link href="/help">Help & install</Link>
              </div>
            </footer>
          </div>
          <BottomNavigation />
        </div>
      </body>
    </html>
  );
}
