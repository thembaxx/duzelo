"use client";
import Image from "next/image";
import Link from "next/link";
import {
  ArrowLeft,
  ArrowUpRight,
  CalendarBlank,
  ChatCircle,
  Check,
  CheckCircle,
  Clock,
  MapPin,
} from "@phosphor-icons/react";
import { demoMoney, findDemoProvider } from "./catalogue";
import { demoDate, type DemoBooking, type DemoEvent } from "./state";
import { useDemo } from "./store.client";
import { BookingStatus } from "./bookings.client";
import { BookingActions } from "./booking-actions.client";
const eventLabels: Record<DemoEvent["kind"], string> = {
  reviewed: "Sample rating saved",
  created: "Sample request created",
  confirmed: "Sample scope and time confirmed",
  started: "Provider arrival simulated",
  finished: "Work completion simulated",
  completed: "Demo completion confirmed",
  cancelled: "Sample booking cancelled",
  rescheduled: "Sample visit rescheduled",
  supplies: "Sample supplies question answered",
  arrival: "Sample arrival question answered",
};

export function DemoBookingDetail({ id }: { id: string }) {
  const { state } = useDemo();
  if (!state)
    return (
      <p className="demo-shell demo-page-loading" role="status">
        Opening your sample booking…
      </p>
    );
  const b = state.bookings.find((b) => b.id === id);
  if (!b)
    return (
      <div className="demo-shell demo-empty">
        <h1>This sample visit isn’t here.</h1>
        <p>
          New demo bookings belong to the browser where you created them. Resetting the workspace
          clears them.
        </p>
        <Link href="/demo/bookings" className="button button-primary">
          Back to demo bookings
        </Link>
      </div>
    );
  const p = findDemoProvider(b.provider)!,
    s = p.services.find((s) => s.id === b.service)!;
  const step = {
    confirmed: 0,
    "in-progress": 1,
    "awaiting-review": 2,
    completed: 3,
    cancelled: -1,
  }[b.status];
  return (
    <div className="demo-shell demo-detail-page demo-enter">
      <Link href="/demo/bookings" className="demo-back">
        <ArrowLeft size={17} aria-hidden="true" /> All my demo bookings
      </Link>
      <div className="demo-booking-detail-heading">
        <div>
          <p className="demo-kicker">
            YOUR SAMPLE VISIT · {b.id.replace("demo-booking-", "").slice(0, 8).toUpperCase()}
          </p>
          <h1>{s.name}</h1>
          <p>One little thing, taken care of.</p>
        </div>
        <BookingStatus status={b.status} />
      </div>
      <div className="demo-detail-layout">
        <div>
          <section className="demo-visit-overview demo-panel">
            <div className="demo-visit-photo">
              <Image
                src={`/demo/${p.photo}.webp`}
                alt={p.photoAlt}
                fill
                sizes="(max-width:700px) 100vw, 50vw"
              />
              <span>Illustrative photo</span>
            </div>
            <div className="demo-visit-info">
              <span className={`demo-avatar demo-avatar-${p.accent}`} aria-hidden="true">
                {p.initials}
              </span>
              <div>
                <p className="demo-kicker">YOUR FICTIONAL PROVIDER</p>
                <h2>
                  <Link href={`/demo/providers/${p.slug}`}>
                    {p.name} <ArrowUpRight size={18} aria-hidden="true" />
                  </Link>
                </h2>
                <p>{p.person}</p>
              </div>
            </div>
            <dl className="demo-visit-facts">
              <div>
                <dt>
                  <CalendarBlank size={18} aria-hidden="true" /> Your time
                </dt>
                <dd>
                  {demoDate(b.date)}
                  <small>
                    {b.slot} SAST · {s.duration}
                  </small>
                </dd>
              </div>
              <div>
                <dt>
                  <MapPin size={18} aria-hidden="true" /> Sample area
                </dt>
                <dd>
                  {p.area}
                  <small>No real address stored or shared</small>
                </dd>
              </div>
            </dl>
          </section>
          {b.status !== "cancelled" && (
            <ol className="demo-stepper" aria-label="Demo booking progress">
              {["Scheduled", "In progress", "Your review", "All done"].map((name, i) => (
                <li
                  key={name}
                  className={i <= step ? "is-reached" : ""}
                  aria-current={i === step ? "step" : undefined}
                >
                  <span>{i < step ? <Check size={15} aria-hidden="true" /> : i + 1}</span>
                  {name}
                </li>
              ))}
            </ol>
          )}
          <section className="demo-panel demo-scope">
            <p className="demo-kicker">SAME PAGE, FROM THE START</p>
            <h2>What’s in this visit</h2>
            <ul className="demo-includes">
              {s.includes.map((item) => (
                <li key={item}>
                  <CheckCircle size={18} aria-hidden="true" />
                  {item}
                </li>
              ))}
            </ul>
            <div className="demo-price-summary">
              <span>
                Illustrative agreed scope
                <small>This is a demo total, not a payment or invoice.</small>
              </span>
              <strong>{demoMoney(s.price)}</strong>
            </div>
          </section>
          <DemoConversation booking={b} provider={p.name} />
        </div>
        <aside>
          <BookingActions booking={b} />
          <section className="demo-panel demo-timeline">
            <p className="demo-kicker">EVERY LITTLE STEP</p>
            <h2>Your visit timeline</h2>
            <ol>
              {b.events.map((event, i) => (
                <li key={i}>
                  <span className="demo-timeline-dot" aria-hidden="true" />
                  <div>
                    <strong>{eventLabels[event.kind]}</strong>
                    <time dateTime={event.at}>
                      {new Intl.DateTimeFormat("en-ZA", {
                        timeZone: "Africa/Johannesburg",
                        day: "numeric",
                        month: "short",
                        hour: "2-digit",
                        minute: "2-digit",
                        hour12: false,
                      }).format(new Date(event.at))}{" "}
                      SAST
                    </time>
                  </div>
                </li>
              ))}
            </ol>
            <p className="demo-fine-print">
              <Clock size={14} aria-hidden="true" /> Seeded history and your simulated updates.
            </p>
          </section>
        </aside>
      </div>
    </div>
  );
}
function DemoConversation({ booking: b, provider }: { booking: DemoBooking; provider: string }) {
  const { dispatch } = useDemo();
  return (
    <section className="demo-panel demo-conversation">
      <div className="demo-section-title">
        <div>
          <p className="demo-kicker">A LITTLE LESS BACK-AND-FORTH</p>
          <h2>Stay in the loop.</h2>
        </div>
        <ChatCircle size={27} weight="duotone" aria-hidden="true" />
      </div>
      <p className="demo-fine-print">
        Scripted demo conversation · no messages are sent to anyone.
      </p>
      <div role="log" aria-label="Scripted demo messages" aria-live="polite">
        <div className="demo-message">
          <strong>{provider} · fictional provider</strong>
          <p>
            Thanks for the booking. The sample scope is all set. You can try a question below to see
            how updates feel.
          </p>
        </div>
        {b.events
          .filter((e) => e.kind === "supplies" || e.kind === "arrival")
          .map((e, i) => (
            <div key={i} className="demo-message-exchange demo-enter">
              <div className="demo-message demo-message-mine">
                <strong>You · sample client</strong>
                <p>
                  {e.kind === "supplies"
                    ? "What should I have ready?"
                    : "Can you confirm the arrival time?"}
                </p>
              </div>
              <div className="demo-message">
                <strong>{provider} · scripted reply</strong>
                <p>
                  {e.kind === "supplies"
                    ? "The sample service checklist above explains what’s included. For this demo, just make space around the work area. No real visit is arranged."
                    : e.schedule
                      ? `Your demo arrival window begins at ${e.schedule.slot} SAST on ${demoDate(e.schedule.date, true)}. This is a simulated schedule.`
                      : "This older demo reply did not save its original arrival window. Check the current sample schedule above."}
                </p>
              </div>
            </div>
          ))}
      </div>
      {!["completed", "cancelled"].includes(b.status) && (
        <div className="demo-quick-messages">
          <span>Try a sample question</span>
          <button
            disabled={b.events.length >= 80}
            onClick={() =>
              dispatch({
                type: "message",
                id: b.id,
                kind: "supplies",
                at: new Date().toISOString(),
              })
            }
          >
            What should I have ready?
          </button>
          <button
            disabled={b.events.length >= 80}
            onClick={() =>
              dispatch({ type: "message", id: b.id, kind: "arrival", at: new Date().toISOString() })
            }
          >
            Confirm arrival time
          </button>
        </div>
      )}
    </section>
  );
}
