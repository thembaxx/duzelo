"use client";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { priceQuote, quantityInput, type QuoteTerms } from "./schema";
import { money } from "@/features/jobs/format";
import { randToCents } from "@/features/jobs/schema";
import { useAgreementMutation } from "./client-api";
import type { QuoteView } from "./types";
import { LineEditor } from "./line-editor.client";
import { DecimalField } from "./decimal-field.client";
import { QuoteTiming } from "./timing.client";
export function QuoteBuilder({ jobId, latest }: { jobId: string; latest: QuoteView | null }) {
  const router = useRouter(),
    mutation = useAgreementMutation(),
    [pending, startTransition] = useTransition();
  const day = new Date(Date.now() + 2 * 86400000);
  day.setUTCSeconds(0, 0);
  const [terms, setTerms] = useState<QuoteTerms>(
    () =>
      latest?.terms ?? {
        pricingType: "fixed",
        scope: "",
        exclusions: "",
        items: [{ kind: "labor", description: "", quantityHundredths: 100, unitPriceCents: 0 }],
        travelFeeCents: 0,
        inspectionFeeCents: 0,
        taxMode: "none",
        startsAt: day.toISOString(),
        endsAt: new Date(day.getTime() + 3600000).toISOString(),
        validUntil: new Date(Date.now() + 3600000).toISOString(),
      },
  );
  const [message, setMessage] = useState("");
  function change(patch: Partial<QuoteTerms>) {
    setTerms((t) => ({ ...t, ...patch }));
    setMessage("");
    mutation.setError("");
  }
  let preview;
  try {
    preview = priceQuote(terms);
  } catch {}
  const busy = mutation.busy || pending;
  function amount(value: string) {
    const n = randToCents(value);
    if (n === null) throw new Error("PRICE");
    return n;
  }
  return (
    <section className="job-panel quote-builder" aria-label="Quote builder">
      <h2>{latest ? "Prepare a new version" : "Build a clear quote"}</h2>
      <p>
        Saving creates a new private version. Review the saved version before sending. An unsent
        amendment leaves your existing sent offer in place.
      </p>
      <form
        method="post"
        onSubmit={async (e) => {
          e.preventDefault();
          setMessage("");
          try {
            const result = await mutation.run("save", {
              jobId,
              previousQuoteId: latest?.id ?? null,
              expectedVersion: latest?.version ?? 0,
              terms,
            });
            setMessage(String(result.message));
            startTransition(() => router.refresh());
          } catch {}
        }}
      >
        <fieldset disabled={busy}>
          <legend>Scope and price</legend>
          <label>
            Quote type
            <select
              value={terms.pricingType}
              onChange={(e) => {
                const type = e.target.value as QuoteTerms["pricingType"];
                change({
                  pricingType: type,
                  items:
                    type === "inspection_required"
                      ? []
                      : terms.items.length
                        ? terms.items
                        : [
                            {
                              kind: "labor",
                              description: "",
                              quantityHundredths: 100,
                              unitPriceCents: 0,
                            },
                          ],
                  inspectionFeeCents: 0,
                  travelFeeCents: 0,
                  taxMode: "none",
                });
              }}
            >
              <option value="fixed">Fixed work price</option>
              <option value="estimate">Estimate with assumptions</option>
              <option value="inspection_required">Inspection required before pricing</option>
            </select>
          </label>
          <label>
            Scope and assumptions
            <textarea
              required
              minLength={15}
              maxLength={2000}
              rows={4}
              value={terms.scope}
              onChange={(e) => change({ scope: e.target.value })}
            />
          </label>
          <label>
            Exclusions
            <textarea
              maxLength={1000}
              rows={2}
              value={terms.exclusions}
              onChange={(e) => change({ exclusions: e.target.value })}
            />
          </label>
          {terms.pricingType === "inspection_required" ? (
            <>
              <DecimalField
                label="Disclosed inspection fee (ZAR)"
                initial={(terms.inspectionFeeCents / 100).toFixed(2)}
                parse={amount}
                onValue={(inspectionFeeCents) => change({ inspectionFeeCents })}
              />
              <p>
                Only the visit fee is proposed. Do not enter a full work price here. The client must
                separately approve the fee, visit time and temporary exact-location access.
              </p>
            </>
          ) : (
            <>
              <LineEditor
                items={terms.items}
                onChange={(items) => change({ items })}
                parseQuantity={quantityInput}
              />
              <DecimalField
                key={terms.pricingType + "-travel"}
                label="Travel fee (ZAR)"
                initial={(terms.travelFeeCents / 100).toFixed(2)}
                parse={amount}
                onValue={(travelFeeCents) => change({ travelFeeCents })}
              />
              <label>
                Tax presentation
                <select
                  value={terms.taxMode}
                  onChange={(e) => change({ taxMode: e.target.value as QuoteTerms["taxMode"] })}
                >
                  <option value="none">VAT not charged</option>
                  <option value="vat_15_exclusive">Add VAT at 15% (my declaration)</option>
                  <option value="vat_15_inclusive">VAT at 15% included (my declaration)</option>
                </select>
              </label>
              <p>
                Choose a tax treatment you are entitled to use. Registration is not verified here
                and this is not a tax invoice.
              </p>
            </>
          )}
          <QuoteTiming
            terms={terms}
            change={change}
            onError={(message) => mutation.setError(message)}
          />
          <p role="status">
            Calculated preview:{" "}
            {preview
              ? preview.totalCents === null
                ? "Work unpriced · Visit fee " + money(preview.inspectionFeeCents)
                : money(preview.totalCents)
              : "Complete the valid line and price fields."}
          </p>
          <button type="submit" className="button button-primary">
            {busy ? "Saving new version…" : "Save private quote version"}
          </button>
        </fieldset>
      </form>
      {mutation.error && (
        <p role="alert" className="form-error">
          {mutation.error}
        </p>
      )}
      {message && <p role="status">{message}</p>}
    </section>
  );
}
