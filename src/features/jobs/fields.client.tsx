"use client";
import { useState } from "react";
import type { DraftData } from "./schema";
import { randToCents } from "./schema";
import type { JobOptions } from "./types";
import { budgetInput, toSastInput, fromSastInput } from "./format";
export type JobFieldsProps = {
  data: DraftData;
  update: (patch: Partial<DraftData>) => void;
  options: JobOptions;
};
export function CategoryFields({ data, update, options }: JobFieldsProps) {
  return (
    <label>
      Service category
      <select
        value={data.categoryId ?? ""}
        onChange={(e) => update({ categoryId: e.target.value || null })}
      >
        <option value="">Choose a service</option>
        {options.categories.map((c) => (
          <option key={c.id} value={c.id}>
            {c.label}
            {c.requiresTrade ? " · trade review required" : ""}
          </option>
        ))}
      </select>
    </label>
  );
}
export function DetailFields({ data, update }: JobFieldsProps) {
  return (
    <>
      <label>
        Request title
        <input
          value={data.title}
          maxLength={140}
          onChange={(e) => update({ title: e.target.value })}
        />
      </label>
      <label>
        What needs doing?
        <textarea
          rows={5}
          value={data.description}
          maxLength={4000}
          onChange={(e) => update({ description: e.target.value })}
        />
      </label>
      <p>
        Invited workers can read the title and work details. Keep your street address, phone number
        and access instructions in the private location fields.
      </p>
    </>
  );
}
export function TimingFields({ data, update }: JobFieldsProps) {
  function edit(index: number, key: "start" | "end", value: string) {
    if (!value) return;
    try {
      const iso = fromSastInput(value);
      update({ slots: data.slots.map((s, i) => (i === index ? { ...s, [key]: iso } : s)) });
    } catch {}
  }
  return (
    <>
      <label>
        When is help needed?
        <select
          value={data.urgency}
          onChange={(e) => update({ urgency: e.target.value as DraftData["urgency"] })}
        >
          <option value="flexible">Flexible</option>
          <option value="scheduled">Choose requested times</option>
          <option value="urgent">Urgent today</option>
        </select>
      </label>
      {data.urgency === "urgent" && (
        <p className="job-notice">
          This is not an emergency response service. If there is immediate danger, contact local
          emergency services. With no selected slot, invitations cover the next two hours, capped at
          the end of today in South African time. No response time is guaranteed.
        </p>
      )}
      <p>
        All dates and times use South African Standard Time (Africa/Johannesburg). These are
        requested windows, not confirmed appointments.
      </p>
      {data.slots.map((slot, i) => (
        <fieldset key={i}>
          <legend>Requested window {i + 1}</legend>
          <label>
            Start time {i + 1}
            <input
              type="datetime-local"
              value={toSastInput(slot.start)}
              onChange={(e) => edit(i, "start", e.target.value)}
            />
          </label>
          <label>
            End time {i + 1}
            <input
              type="datetime-local"
              value={toSastInput(slot.end)}
              onChange={(e) => edit(i, "end", e.target.value)}
            />
          </label>
          <button
            type="button"
            className="button button-secondary"
            onClick={() => update({ slots: data.slots.filter((_, n) => n !== i) })}
          >
            Remove time window {i + 1}
          </button>
        </fieldset>
      ))}
      {data.slots.length < 3 && (
        <button
          type="button"
          className="button button-secondary"
          onClick={() => {
            const start = new Date(Date.now() + 86400000).toISOString();
            update({
              slots: [
                ...data.slots,
                { start, end: new Date(Date.parse(start) + 7200000).toISOString() },
              ],
            });
          }}
        >
          Add requested time window
        </button>
      )}
      <label>
        When can you respond about this request?
        <input
          value={data.contactWindow}
          maxLength={200}
          onChange={(e) => update({ contactWindow: e.target.value })}
        />
      </label>
      <p>For example, “After 17:00”. Do not add phone numbers or private directions here.</p>
    </>
  );
}
export function BudgetFields({ data, update }: JobFieldsProps) {
  const [minimum, setMinimum] = useState(budgetInput(data.budgetMin)),
    [maximum, setMaximum] = useState(budgetInput(data.budgetMax)),
    [error, setError] = useState("");
  function apply() {
    try {
      const min = randToCents(minimum),
        max = randToCents(maximum);
      if (min !== null && max !== null && min > max) throw new Error();
      update({ budgetMin: min, budgetMax: max });
      setError("");
    } catch {
      setError(
        "Use a valid rand amount with up to two decimal places and a maximum no lower than the minimum.",
      );
    }
  }
  return (
    <>
      <p>
        A budget is optional and will be shown to invited workers. It is an approximate range, not
        an agreed price, quote, deposit or payment.
      </p>
      <label>
        Minimum budget (ZAR, optional)
        <input inputMode="decimal" value={minimum} onChange={(e) => setMinimum(e.target.value)} />
      </label>
      <label>
        Maximum budget (ZAR, optional)
        <input inputMode="decimal" value={maximum} onChange={(e) => setMaximum(e.target.value)} />
      </label>
      <button type="button" className="button button-secondary" onClick={apply}>
        Use this budget range
      </button>
      {error && (
        <p role="alert" className="form-error">
          {error}
        </p>
      )}
      <p>Choose “Use this budget range” to include your amounts, or leave the range unset.</p>
    </>
  );
}
