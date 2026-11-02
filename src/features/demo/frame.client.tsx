"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useRef } from "react";
import {
  ArrowCounterClockwise,
  CalendarBlank,
  Compass,
  Heart,
  MapPin,
  X,
} from "@phosphor-icons/react";
import { useDemo } from "./store.client";

export function DemoFrame({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { state, reset, storageNotice } = useDemo();
  const dialog = useRef<HTMLDialogElement>(null);
  const links = [
    {
      href: "/demo",
      label: "Discover",
      Icon: Compass,
      active: pathname === "/demo" || pathname.startsWith("/demo/providers/"),
    },
    {
      href: "/demo/bookings",
      label: "Bookings",
      Icon: CalendarBlank,
      active: pathname.startsWith("/demo/bookings"),
      count: state?.bookings.filter((b) => !["completed", "cancelled"].includes(b.status)).length,
    },
    {
      href: "/demo/saved",
      label: "Saved",
      Icon: Heart,
      active: pathname === "/demo/saved",
      count: state?.saved.length,
    },
  ];
  return (
    <div className="demo-app">
      <div className="demo-disclosure">
        <div className="demo-shell">
          <span>
            <span className="demo-live-dot" aria-hidden="true" /> Interactive demo{" "}
            <span className="demo-disclosure-detail">
              · Fictional providers, reviews & bookings. No real services or charges.
            </span>
          </span>
          <button type="button" onClick={() => dialog.current?.showModal()} disabled={!state}>
            <ArrowCounterClockwise size={14} aria-hidden="true" /> Reset demo
          </button>
        </div>
      </div>
      <div className="demo-shell demo-workspace-bar">
        <span className="demo-location">
          <MapPin size={19} weight="duotone" aria-hidden="true" />
          <span>
            Mkhondo, Mpumalanga<small>Your sample neighbourhood</small>
          </span>
        </span>
        <nav className="demo-nav" aria-label="Demo navigation">
          {links.map(({ href, label, Icon, active, count }) => (
            <Link key={href} href={href} aria-current={active ? "page" : undefined}>
              <Icon size={20} weight={active ? "fill" : "regular"} aria-hidden="true" />
              <span>{label}</span>
              {count !== undefined && count > 0 && <small>{count}</small>}
            </Link>
          ))}
        </nav>
        <span className="demo-profile">
          <span className="demo-avatar" aria-hidden="true">
            NM
          </span>
          <span>
            Nandi’s workspace<small>Sample client account</small>
          </span>
        </span>
      </div>
      {storageNotice && (
        <p className="demo-shell demo-notice" role="status">
          {storageNotice}
        </p>
      )}
      {children}
      <div className="demo-shell demo-endnote">
        <span>Made for the everyday, close to home.</span>
        <p>
          All people, ratings, prices, locations and activity in this demo are examples. Stock
          photos illustrate services; they do not identify these fictional providers.{" "}
          <Link href="/demo/about">About this demo & photo credits</Link>
        </p>
      </div>
      <dialog ref={dialog} className="demo-dialog" aria-labelledby="demo-reset-title">
        <div className="demo-dialog-heading">
          <h2 id="demo-reset-title">Start fresh?</h2>
          <button
            className="demo-icon-button"
            aria-label="Close reset dialog"
            onClick={() => dialog.current?.close()}
          >
            <X size={20} />
          </button>
        </div>
        <p>
          This restores the sample providers, saved list and six-month booking history. It only
          clears this demo workspace in your browser.
        </p>
        <div className="demo-button-row">
          <button className="button button-secondary" onClick={() => dialog.current?.close()}>
            Keep exploring
          </button>
          <button
            className="button button-primary"
            onClick={() => {
              reset();
              dialog.current?.close();
            }}
          >
            Reset sample workspace
          </button>
        </div>
      </dialog>
    </div>
  );
}
