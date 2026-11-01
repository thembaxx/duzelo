"use client";
import { useState } from "react";
import type { QuoteTerms } from "./schema";
import { randToCents } from "@/features/jobs/schema";
import { DecimalField } from "./decimal-field.client";
export function LineEditor({
  items,
  onChange,
  parseQuantity,
}: {
  items: QuoteTerms["items"];
  onChange: (items: QuoteTerms["items"]) => void;
  parseQuantity: (s: string) => number;
}) {
  const [keys, setKeys] = useState(() => items.map((_, i) => "initial-" + i));
  function patch(index: number, part: Partial<QuoteTerms["items"][number]>) {
    onChange(items.map((i, n) => (n === index ? { ...i, ...part } : i)));
  }
  return (
    <section className="quote-line-editor" aria-label="Quote line editor">
      <h3>Labor and materials</h3>
      {items.map((item, i) => (
        <fieldset key={keys[i]}>
          <legend>Line {i + 1}</legend>
          <label>
            Line {i + 1} kind
            <select
              value={item.kind}
              onChange={(e) => patch(i, { kind: e.target.value as "labor" | "materials" })}
            >
              <option value="labor">Labor</option>
              <option value="materials">Materials</option>
            </select>
          </label>
          <label>
            Line {i + 1} description
            <input
              required
              minLength={2}
              maxLength={160}
              value={item.description}
              onChange={(e) => patch(i, { description: e.target.value })}
            />
          </label>
          <div className="job-two-columns">
            <DecimalField
              label={"Line " + (i + 1) + " quantity"}
              initial={String(item.quantityHundredths / 100)}
              parse={parseQuantity}
              onValue={(quantityHundredths) => patch(i, { quantityHundredths })}
            />
            <DecimalField
              label={"Line " + (i + 1) + " unit price (ZAR)"}
              initial={(item.unitPriceCents / 100).toFixed(2)}
              parse={(raw) => {
                const n = randToCents(raw);
                if (n === null) throw new Error("PRICE");
                return n;
              }}
              onValue={(unitPriceCents) => patch(i, { unitPriceCents })}
            />
          </div>
          <button
            type="button"
            className="text-link"
            disabled={items.length <= 1}
            onClick={() => {
              setKeys((ids) => ids.filter((_, n) => n !== i));
              onChange(items.filter((_, n) => n !== i));
            }}
          >
            Remove line {i + 1}
          </button>
        </fieldset>
      ))}
      <button
        type="button"
        className="button button-secondary"
        disabled={items.length >= 20}
        onClick={() => {
          setKeys((ids) => [...ids, crypto.randomUUID()]);
          onChange([
            ...items,
            { kind: "materials", description: "", quantityHundredths: 100, unitPriceCents: 0 },
          ]);
        }}
      >
        Add line item
      </button>
    </section>
  );
}
