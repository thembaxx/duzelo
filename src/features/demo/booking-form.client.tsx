"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, CalendarBlank, Check, LockSimple } from "@phosphor-icons/react";
import { demoMoney, type DemoProvider } from "./catalogue";
import { demoDate, demoSlots, demoToday, shiftDemoDate } from "./state";
import { useDemo } from "./store.client";

export function BookingForm({ provider: p }: { provider: DemoProvider }) {
  const { state, dispatch } = useDemo(),
    router = useRouter();
  const [serviceId, setServiceId] = useState(p.services[0]!.id),
    [day, setDay] = useState("1"),
    [slot, setSlot] = useState<(typeof demoSlots)[number]>("09:00");
  const [error, setError] = useState(""),
    [submitting, setSubmitting] = useState(false);
  const service = p.services.find((s) => s.id === serviceId)!;
  const anchor = state ? demoToday() : null;
  return (
    <form
      id="demo-booking-form"
      className="demo-booking-form demo-panel"
      onSubmit={(e) => {
        e.preventDefault();
        setError("");
        if (!state || !anchor || submitting) return;
        if (state.bookings.length >= 200) {
          setError(
            "This sample workspace is full. Reset the demo to explore a fresh set of bookings.",
          );
          return;
        }
        setSubmitting(true);
        const id = "demo-booking-" + crypto.randomUUID();
        dispatch({
          type: "create",
          id,
          provider: p.slug,
          service: service.id,
          date: shiftDemoDate(anchor, Number(day)),
          slot,
          at: new Date().toISOString(),
        });
        router.push(`/demo/bookings/${id}?created=1`);
      }}
    >
      <p className="demo-kicker">TRY IT FROM START TO FINISH</p>
      <h2>Make a little room.</h2>
      <p>Choose a sample service and time. See the full booking experience.</p>
      <fieldset>
        <legend>1. Choose your service</legend>
        {p.services.map((s) => (
          <label className="demo-service-option" key={s.id}>
            <input
              type="radio"
              name="service"
              value={s.id}
              checked={serviceId === s.id}
              onChange={() => setServiceId(s.id)}
            />
            <span>
              <strong>{s.name}</strong>
              <small>{s.duration}</small>
            </span>
            <strong>{demoMoney(s.price)}</strong>
          </label>
        ))}
      </fieldset>
      <ul className="demo-includes">
        {service.includes.map((item) => (
          <li key={item}>
            <Check size={16} aria-hidden="true" />
            {item}
          </li>
        ))}
      </ul>
      <div className="demo-form-grid">
        <label>
          <span>2. Sample day</span>
          <select
            disabled={!anchor}
            value={anchor ? day : ""}
            onChange={(e) => setDay(e.target.value)}
            aria-label="Booking day"
          >
            {!anchor && <option value="">Loading sample days…</option>}
            {anchor &&
              Array.from({ length: 14 }, (_, i) => (
                <option key={i + 1} value={i + 1}>
                  {demoDate(shiftDemoDate(anchor, i + 1), true)}
                </option>
              ))}
          </select>
        </label>
        <label>
          <span>3. Start time (SAST)</span>
          <select
            value={slot}
            onChange={(e) => setSlot(e.target.value as typeof slot)}
            aria-label="Booking time"
          >
            {demoSlots.map((s) => (
              <option key={s}>{s}</option>
            ))}
          </select>
        </label>
      </div>
      <div className="demo-price-summary">
        <span>
          Illustrative total<small>No payment required</small>
        </span>
        <strong>{demoMoney(service.price)}</strong>
      </div>
      {error && (
        <p className="demo-form-error" role="alert">
          {error}
        </p>
      )}
      <button className="button button-primary demo-full-button" disabled={!state || submitting}>
        <CalendarBlank size={19} aria-hidden="true" />
        {submitting ? "Opening your demo booking…" : "Create demo booking"}
        <ArrowRight size={18} aria-hidden="true" />
      </button>
      <p className="demo-form-footnote">
        <LockSimple size={15} aria-hidden="true" />
        This only updates your browser’s sample workspace. No provider is contacted and no real
        service is booked.
      </p>
    </form>
  );
}
