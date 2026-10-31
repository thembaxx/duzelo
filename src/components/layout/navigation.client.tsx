"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Home,
  Compass,
  Shapes,
  CircleHelp,
  ShieldCheck,
  UserRound,
  ArrowUpRight,
  Menu,
  BookOpen,
  MapPin,
} from "lucide-react";
import { brand } from "@/config/brand";
import { getMessages } from "@/locales";

const t = getMessages().navigation;
const mainLinks = [
  { href: "/", label: t.home, icon: Home },
  { href: "/explore", label: t.explore, icon: Compass },
  { href: "/services", label: t.services, icon: Shapes },
  { href: "/how-it-works", label: t.howItWorks, icon: BookOpen },
  { href: "/trust", label: t.trust, icon: ShieldCheck },
];
const accountLink = { href: "/auth/sign-in", label: t.account, icon: UserRound };
function isCurrent(pathname: string, href: string) {
  if (href === "/auth/sign-in")
    return ["/auth/", "/app/", "/onboarding", "/admin"].some((prefix) =>
      pathname.startsWith(prefix),
    );
  return href === "/" ? pathname === href : pathname.startsWith(href);
}
export function Wordmark() {
  return (
    <Link href="/" className="wordmark" aria-label={`${brand.name} home`}>
      <span className="brand-symbol" aria-hidden="true" />
      {brand.name.toLowerCase()}
    </Link>
  );
}
export function Sidebar() {
  const pathname = usePathname();
  return (
    <aside className="sidebar">
      <div>
        <Wordmark />
        <p className="sidebar-caption">A little more local.</p>
      </div>
      <nav className="nav-list" aria-label="Main navigation">
        {mainLinks.map(({ href, label, icon: Icon }) => (
          <Link
            key={href}
            href={href}
            className="nav-link"
            aria-current={isCurrent(pathname, href) ? "page" : undefined}
          >
            <Icon size={18} aria-hidden="true" />
            {label}
          </Link>
        ))}
      </nav>
      <div className="sidebar-foot">
        <Link href="/help" className="nav-link">
          <CircleHelp size={18} aria-hidden="true" />
          {t.help}
        </Link>
        <Link
          href="/auth/sign-in"
          className="nav-link"
          aria-current={isCurrent(pathname, accountLink.href) ? "page" : undefined}
        >
          <UserRound size={18} aria-hidden="true" />
          {t.account}
          <ArrowUpRight size={14} aria-hidden="true" />
        </Link>
        <p>
          Made for everyday life.
          <br />
          Starting in Mpumalanga.
        </p>
      </div>
    </aside>
  );
}
export function Topbar() {
  const pathname = usePathname();
  return (
    <header className="topbar">
      <div className="topbar-context">
        <MapPin size={16} aria-hidden="true" />
        {brand.area}
      </div>
      <div className="mobile-brand">
        <Wordmark />
      </div>
      <div className="topbar-actions">
        <Link href="/help#languages" aria-label="Language: English">
          EN
        </Link>
        <Link href="/how-it-works" className="desktop-action">
          How it works <ArrowUpRight size={13} className="inline" aria-hidden="true" />
        </Link>
        <Link
          href="/auth/sign-in"
          className="desktop-action rounded-full border border-border px-4 py-3"
        >
          {isCurrent(pathname, accountLink.href) ? "My account" : "Sign in"}
        </Link>
        <details className="mobile-menu" key={pathname}>
          <summary aria-label="Open navigation menu">
            <Menu size={19} aria-hidden="true" />
          </summary>
          <nav aria-label="More navigation">
            {[...mainLinks, { href: "/help", label: t.help, icon: CircleHelp }].map(
              ({ href, label, icon: Icon }) => (
                <Link
                  key={href}
                  href={href}
                  className="nav-link"
                  aria-current={isCurrent(pathname, href) ? "page" : undefined}
                >
                  <Icon size={18} aria-hidden="true" />
                  {label}
                </Link>
              ),
            )}
          </nav>
        </details>
      </div>
    </header>
  );
}
export function BottomNavigation() {
  const pathname = usePathname();
  return (
    <nav className="bottom-nav" aria-label="Mobile navigation">
      {[mainLinks[0]!, mainLinks[1]!, mainLinks[3]!, accountLink].map(
        ({ href, label, icon: Icon }) => (
          <Link
            key={href}
            href={href}
            aria-current={isCurrent(pathname, href) ? "page" : undefined}
          >
            <Icon size={19} aria-hidden="true" />
            <span>{label === t.howItWorks ? "How it works" : label}</span>
          </Link>
        ),
      )}
    </nav>
  );
}
