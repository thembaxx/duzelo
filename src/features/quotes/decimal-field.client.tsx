"use client";
import { useState } from "react";
export function DecimalField({
  label,
  initial,
  parse,
  onValue,
}: {
  label: string;
  initial: string;
  parse: (raw: string) => number;
  onValue: (n: number) => void;
}) {
  const [raw, setRaw] = useState(initial);
  return (
    <label>
      {label}
      <input
        type="text"
        inputMode="decimal"
        required
        value={raw}
        onChange={(e) => {
          setRaw(e.target.value);
          try {
            const n = parse(e.target.value);
            e.target.setCustomValidity("");
            onValue(n);
          } catch {
            e.target.setCustomValidity(
              "Enter a valid bounded number with at most two decimal places.",
            );
          }
        }}
      />
    </label>
  );
}
