"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { List, X, ArrowUpRight } from "@phosphor-icons/react";
import { useEffect, useState } from "react";
import { AppearanceControl } from "./appearance-control";
import { BrandMark } from "./brand-mark";

const links = [
  { href: "/services", label: "Services" },
  { href: "/explore", label: "Explore" },
  { href: "/how-it-works", label: "How it works" },
  { href: "/trust", label: "Trust & safety" },
];

export function SiteHeader() {
  const pathname = usePathname();
  const inAccount = ["/app/", "/onboarding", "/admin"].some((prefix) =>
    pathname.startsWith(prefix),
  );
  const [open, setOpen] = useState(false);
  useEffect(() => setOpen(false), [pathname]);

  if (pathname.startsWith("/demo"))
    return (
      <header className="site-header demo-site-header">
        <div className="site-header-inner shell">
          <Link href="/" className="brand-lockup" aria-label="Duzelo home">
            <BrandMark size={34} className="brand-logo" />
            <span>
              Duzelo<span className="brand-period">.</span>
            </span>
          </Link>
          <span className="demo-header-tagline">Good help, close to home.</span>
          <div className="header-actions">
            <AppearanceControl compact />
            <Link href="/" className="demo-exit">
              Exit demo <ArrowUpRight size={15} aria-hidden="true" />
            </Link>
          </div>
        </div>
      </header>
    );

  return (
    <header className="site-header">
      <div className="site-header-inner shell">
        <Link href="/" className="brand-lockup" aria-label="Duzelo home">
          <BrandMark size={37} className="brand-logo" />
          <span>
            Duzelo<span className="brand-period">.</span>
          </span>
        </Link>
        <nav className="desktop-navigation" aria-label="Main navigation">
          <Link href="/demo" className="navigation-link">
            Try the demo
          </Link>
          {links.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className={"navigation-link" + (pathname === link.href ? " active" : "")}
              aria-current={pathname === link.href ? "page" : undefined}
            >
              {link.label}
            </Link>
          ))}
        </nav>
        <div className="header-actions">
          <div className="desktop-appearance">
            <AppearanceControl compact />
          </div>
          <Link href="/settings" className="header-settings">
            Settings
          </Link>
          <Link
            href="/auth/sign-in"
            className="header-cta"
            aria-current={inAccount ? "page" : undefined}
          >
            {inAccount ? "My account" : "Get early access"}{" "}
            <ArrowUpRight size={16} aria-hidden="true" />
          </Link>
          <button
            type="button"
            className="menu-toggle"
            aria-label={open ? "Close menu" : "Open menu"}
            aria-controls="mobile-menu"
            aria-expanded={open}
            onClick={() => setOpen((value) => !value)}
          >
            {open ? <X size={23} /> : <List size={23} />}
          </button>
        </div>
      </div>
      <div id="mobile-menu" className={"mobile-menu" + (open ? " is-open" : "")} inert={!open}>
        <nav className="shell mobile-menu-inner" aria-label="Mobile navigation">
          <Link href="/demo">Try the interactive demo</Link>
          {links.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              aria-current={pathname === link.href ? "page" : undefined}
            >
              {link.label}
            </Link>
          ))}
          <Link href="/settings">Settings & appearance</Link>
          <Link href="/auth/sign-in" aria-current={inAccount ? "page" : undefined}>
            {inAccount ? "My account" : "Launch update"}
          </Link>
          <div className="mobile-theme">
            <AppearanceControl />
          </div>
        </nav>
      </div>
    </header>
  );
}
