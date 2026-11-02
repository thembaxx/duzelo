"use client";

import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
import {
  ArrowRight,
  ArrowUpRight,
  CalendarBlank,
  CheckCircle,
  Clock,
  Plant,
  Sparkle,
} from "@phosphor-icons/react";
import { demoMoney, findDemoProvider } from "./catalogue";
import { demoDate, demoStatus, type DemoBooking } from "./state";
import { useDemo } from "./store.client";

export function BookingStatus({ status }: { status: DemoBooking["status"] }) {
  return (
    <span className={`demo-status demo-status-${status}`}>
      <span aria-hidden="true" />
      {demoStatus[status]}
    </span>
  );
}
export function DemoBookings() {
  const { state } = useDemo(),
    [tab, setTab] = useState("upcoming");
  if (!state)
    return (
      <div className="demo-shell demo-page-loading" role="status">
        Setting out your sample booking history…
      </div>
    );
  const upcoming = state.bookings.filter((b) => !["completed", "cancelled"].includes(b.status));
  const history = state.bookings.filter((b) => ["completed", "cancelled"].includes(b.status));
  const list = [...(tab === "upcoming" ? upcoming : history)].sort((a, b) =>
    tab === "upcoming" ? a.date.localeCompare(b.date) : b.date.localeCompare(a.date),
  );
  const next = upcoming
    .filter((b) => b.status === "confirmed")
    .sort((a, b) => a.date.localeCompare(b.date))[0];
  const provider = next ? findDemoProvider(next.provider) : null;
  const completed = state.bookings.filter((b) => b.status === "completed");
  return (
    <div className="demo-shell demo-bookings-page demo-enter">
      <div className="demo-page-heading">
        <div>
          <p className="demo-kicker">NANDI’S SAMPLE WORKSPACE</p>
          <h1>
            A little less to do.
            <br />
            <em>A little more you.</em>
          </h1>
          <p>Your visits, projects and small wins, all in one place.</p>
        </div>
        <Link href="/demo" className="button button-primary">
          Find your next helping hand <ArrowUpRight size={18} aria-hidden="true" />
        </Link>
      </div>
      <div className="demo-workspace-grid">
        <section className="demo-next-visit" aria-label="Next sample visit">
          <div className="demo-next-copy">
            <p className="demo-kicker">NEXT IN YOUR DIARY</p>
            {next && provider ? (
              <>
                <BookingStatus status={next.status} />
                <h2>{provider.services.find((s) => s.id === next.service)!.name}</h2>
                <p>With {provider.name}</p>
                <span className="demo-next-date">
                  <CalendarBlank size={18} aria-hidden="true" />
                  {demoDate(next.date)} · {next.slot} SAST
                </span>
                <Link href={`/demo/bookings/${next.id}`}>
                  View demo booking <ArrowRight size={18} aria-hidden="true" />
                </Link>
              </>
            ) : (
              <>
                <h2>A little breathing room.</h2>
                <p>You have no confirmed sample visits. Find a provider to try a new booking.</p>
                <Link href="/demo">
                  Explore providers <ArrowRight size={18} aria-hidden="true" />
                </Link>
              </>
            )}
          </div>
          <div className="demo-next-image">
            <Image
              src={`/demo/${provider?.photo ?? "home"}.webp`}
              alt="Illustrative service photograph for your next sample visit"
              fill
              sizes="(max-width:700px) 40vw, 30vw"
            />
            <span>Illustrative photo</span>
          </div>
        </section>
        <aside className="demo-history-summary demo-panel">
          <span className="demo-summary-icon">
            <Plant size={27} weight="duotone" aria-hidden="true" />
          </span>
          <p className="demo-kicker">SIX MONTHS, MANY LITTLE WINS</p>
          <div className="demo-summary-numbers">
            <div>
              <strong>{completed.length}</strong>
              <span>sample jobs done</span>
            </div>
            <div>
              <strong>{new Set(completed.map((b) => b.provider)).size}</strong>
              <span>familiar providers</span>
            </div>
          </div>
          <div className="demo-activity-chart" aria-hidden="true">
            {[0, 1, 2, 3, 4, 5].map((i) => {
              const from =
                new Date(state.anchor + "T00:00:00Z").getTime() - (6 - i) * 30 * 86400000;
              const to = from + 30 * 86400000;
              const count = completed.filter((b) => {
                const t = Date.parse(b.date);
                return t >= from && t <= to;
              }).length;
              return (
                <div key={i}>
                  <span className={`demo-bar demo-bar-${Math.min(count, 5)}`} />
                  <small>
                    {new Intl.DateTimeFormat("en-ZA", {
                      month: "short",
                      timeZone: "Africa/Johannesburg",
                    }).format(new Date(from + 15 * 86400000))}
                  </small>
                </div>
              );
            })}
          </div>
          <p className="demo-fine-print">
            Fictional history, remembered in this browser. Explore a job to see its timeline.
          </p>
        </aside>
      </div>
      <p className="demo-mobile-summary">
        <CheckCircle size={18} aria-hidden="true" />
        <strong>{completed.length} sample jobs done</strong> · six months of little wins
      </p>
      <div className="demo-booking-tabs" role="group" aria-label="Booking filter">
        <button aria-pressed={tab === "upcoming"} onClick={() => setTab("upcoming")}>
          In the diary <span>{upcoming.length}</span>
        </button>
        <button aria-pressed={tab === "history"} onClick={() => setTab("history")}>
          Past visits <span>{history.length}</span>
        </button>
      </div>
      <div className="demo-booking-list">
        {list.map((b) => (
          <BookingRow key={b.id} booking={b} />
        ))}
        {!list.length && (
          <div className="demo-empty">
            <Sparkle size={38} aria-hidden="true" />
            <h2>All caught up.</h2>
            <p>Try creating a new sample booking to see it here.</p>
            <Link href="/demo" className="button button-primary">
              Explore sample services
            </Link>
          </div>
        )}
      </div>
      <div className="demo-closer-note">
        <CheckCircle size={30} weight="duotone" aria-hidden="true" />
        <div>
          <h2>Your home has a little history here.</h2>
          <p>
            Open past visits to see scope, sample prices and progress. Book again to bring a
            familiar provider back.
          </p>
        </div>
      </div>
    </div>
  );
}
function BookingRow({ booking: b }: { booking: DemoBooking }) {
  const p = findDemoProvider(b.provider)!;
  const s = p.services.find((s) => s.id === b.service)!;
  return (
    <article className="demo-booking-row demo-enter">
      <div className="demo-booking-thumb">
        <Image
          src={`/demo/${p.photo}.webp`}
          alt="Illustrative service photograph"
          fill
          sizes="100px"
        />
      </div>
      <div className="demo-booking-row-main">
        <BookingStatus status={b.status} />
        <h2>
          <Link href={`/demo/bookings/${b.id}`}>{s.name}</Link>
        </h2>
        <p>
          {p.name}
          <span className="demo-mobile-row-price"> · {demoMoney(s.price)} sample total</span>
        </p>
      </div>
      <div className="demo-booking-row-date">
        <span>
          <CalendarBlank size={16} aria-hidden="true" />
          {demoDate(b.date, true)}
        </span>
        <small>
          <Clock size={14} aria-hidden="true" />
          {b.slot} SAST · {s.duration}
        </small>
      </div>
      <div className="demo-booking-row-price">
        <strong>{demoMoney(s.price)}</strong>
        <small>Sample total</small>
      </div>
      <Link
        href={`/demo/bookings/${b.id}`}
        className="demo-row-open"
        aria-label={`Open ${s.name}, ${demoDate(b.date, true)}`}
      >
        <ArrowUpRight size={22} aria-hidden="true" />
      </Link>
    </article>
  );
}
