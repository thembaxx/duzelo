"use client";
import Link from "next/link";
import { useRef, useState } from "react";
import { ArrowRight, CalendarBlank, CheckCircle, X } from "@phosphor-icons/react";
import { demoDate, demoSlots, demoToday, shiftDemoDate, type DemoBooking } from "./state";
import { useDemo } from "./store.client";

export function BookingActions({ booking: b }: { booking: DemoBooking }) {
  const { dispatch } = useDemo(),
    cancel = useRef<HTMLDialogElement>(null);
  const [notice, setNotice] = useState(""),
    [day, setDay] = useState("2"),
    [slot, setSlot] = useState<DemoBooking["slot"]>(b.slot),
    [rating, setRating] = useState("5");
  const finished = ["completed", "cancelled"].includes(b.status);
  const full = b.events.length >= 80;
  const anchor = demoToday();
  const button = {
    confirmed: "Simulate provider arrival",
    "in-progress": "Simulate work finished",
    "awaiting-review": "Confirm demo completion",
    completed: "Completed",
    cancelled: "Cancelled",
  }[b.status];
  return (
    <div className="demo-booking-actions demo-panel">
      <p className="demo-kicker">TAKE THE NEXT STEP</p>
      <h2>
        {b.status === "completed"
          ? "One less thing on your list."
          : b.status === "cancelled"
            ? "Plans change. That’s okay."
            : "See how it comes together."}
      </h2>
      {!finished && (
        <>
          <p>
            Use the demo controls to move this sample job through its next step. No real worker
            receives these updates.
          </p>
          <button
            className="button button-primary demo-full-button"
            disabled={full}
            onClick={() => {
              dispatch({ type: "progress", id: b.id, at: new Date().toISOString() });
              setNotice("Demo progress updated. The timeline now shows your next step.");
            }}
          >
            {button}
            <ArrowRight size={18} aria-hidden="true" />
          </button>
        </>
      )}
      {b.status === "confirmed" && (
        <>
          <details className="demo-reschedule">
            <summary>
              <CalendarBlank size={17} aria-hidden="true" /> Change sample date & time
            </summary>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                setNotice("");
                const at = new Date().toISOString(),
                  date = shiftDemoDate(anchor, Number(day));
                if (date <= demoToday(new Date(at))) {
                  setNotice(
                    "The day changed while this form was open. Choose a future sample day and try again.",
                  );
                  return;
                }
                const accepted = dispatch({
                  type: "reschedule",
                  id: b.id,
                  date,
                  slot,
                  at,
                });
                setNotice(
                  accepted
                    ? "Your demo visit has been rescheduled. The new date is saved in this browser."
                    : "The sample workspace changed. Please try the schedule again.",
                );
              }}
            >
              <div className="demo-form-grid">
                <label>
                  New day
                  <select
                    aria-label="New booking day"
                    value={day}
                    onChange={(e) => setDay(e.target.value)}
                  >
                    {Array.from({ length: 14 }, (_, i) => (
                      <option key={i + 1} value={i + 1}>
                        {demoDate(shiftDemoDate(anchor, i + 1), true)}
                      </option>
                    ))}
                  </select>
                </label>
                <label>
                  Start time (SAST)
                  <select
                    aria-label="New booking time"
                    value={slot}
                    onChange={(e) => setSlot(e.target.value as typeof slot)}
                  >
                    {demoSlots.map((s) => (
                      <option key={s}>{s}</option>
                    ))}
                  </select>
                </label>
              </div>
              <button className="button button-secondary demo-full-button" disabled={full}>
                Save demo schedule
              </button>
            </form>
          </details>
          <button
            className="demo-text-button demo-cancel"
            onClick={() => cancel.current?.showModal()}
            disabled={full}
          >
            Cancel sample booking
          </button>
        </>
      )}
      {b.status === "completed" &&
        (b.review ? (
          <p className="demo-review-saved">
            <CheckCircle size={20} aria-hidden="true" /> Your sample review: {b.review} out of 5
            stars.
          </p>
        ) : (
          <form
            onSubmit={(e) => {
              e.preventDefault();
              dispatch({
                type: "review",
                id: b.id,
                rating: Number(rating),
                at: new Date().toISOString(),
              });
              setNotice("Your sample review is saved in this demo only.");
            }}
          >
            <p>
              Leave a sample rating to complete the experience. It never affects a real provider.
            </p>
            <label className="demo-rating-label">
              Sample rating
              <select
                aria-label="Sample rating"
                value={rating}
                onChange={(e) => setRating(e.target.value)}
              >
                {[5, 4, 3, 2, 1].map((n) => (
                  <option key={n} value={n}>
                    {n} {n === 1 ? "star" : "stars"}
                  </option>
                ))}
              </select>
            </label>
            <button className="button button-primary demo-full-button" disabled={full}>
              Save sample review
            </button>
          </form>
        ))}
      {finished && (
        <Link
          href={`/demo/providers/${b.provider}#demo-booking-form`}
          className="button button-secondary demo-full-button"
        >
          Book this sample provider again <ArrowRight size={17} aria-hidden="true" />
        </Link>
      )}
      {full && <p role="status">This sample timeline is full. Reset the demo to try it again.</p>}
      {notice && (
        <p className="demo-success" role="status" aria-live="polite">
          {notice}
        </p>
      )}
      <dialog ref={cancel} className="demo-dialog" aria-labelledby="demo-cancel-title">
        <div className="demo-dialog-heading">
          <h2 id="demo-cancel-title">Cancel this sample visit?</h2>
          <button
            className="demo-icon-button"
            aria-label="Close cancellation dialog"
            onClick={() => cancel.current?.close()}
          >
            <X size={20} />
          </button>
        </div>
        <p>
          The booking moves to your past visits. There is no cancellation fee or real provider to
          notify.
        </p>
        <div className="demo-button-row">
          <button className="button button-secondary" onClick={() => cancel.current?.close()}>
            Keep the visit
          </button>
          <button
            className="button button-primary"
            onClick={() => {
              dispatch({ type: "cancel", id: b.id, at: new Date().toISOString() });
              cancel.current?.close();
              setNotice("Sample booking cancelled. It is now in your past visits.");
            }}
          >
            Confirm demo cancellation
          </button>
        </div>
      </dialog>
    </div>
  );
}
