"use client";
import type { Catalog } from "./types";
import type { WorkerDraft } from "./schema";
import { Button } from "@/features/auth/button";
export function ServiceFields({
  services,
  categories,
  onChange,
}: {
  services: WorkerDraft["services"];
  categories: Catalog["categories"];
  onChange: (services: WorkerDraft["services"]) => void;
}) {
  function update(index: number, name: string, value: string) {
    onChange(
      services.map((s, n) =>
        n === index
          ? {
              ...s,
              [name]: value,
              ...(name === "pricing" && value === "quote" ? { price: "" } : {}),
            }
          : s,
      ),
    );
  }
  return (
    <section className="worker-section">
      <h2>Your services</h2>
      <p>
        Describe the work and its scope. Keep phone numbers, exact locations and contact links out
        of public text.
      </p>
      {services.map((service, index) => (
        <fieldset key={index}>
          <legend>Service {index + 1}</legend>
          <label>
            Category
            <select
              required
              value={service.categoryId}
              onChange={(e) => update(index, "categoryId", e.target.value)}
            >
              <option value="">Choose a category</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.label}
                  {c.requiresTrade ? " — trade evidence required" : ""}
                </option>
              ))}
            </select>
          </label>
          <label>
            Service title
            <input
              required
              minLength={3}
              maxLength={80}
              value={service.title}
              onChange={(e) => update(index, "title", e.target.value)}
            />
          </label>
          <label>
            What is included?
            <textarea
              required
              minLength={5}
              maxLength={350}
              value={service.description}
              onChange={(e) => update(index, "description", e.target.value)}
            />
          </label>
          <label>
            Pricing
            <select
              value={service.pricing}
              onChange={(e) => update(index, "pricing", e.target.value)}
            >
              <option value="fixed">Fixed price</option>
              <option value="from">Starting price</option>
              <option value="quote">Custom quote</option>
            </select>
          </label>
          {service.pricing !== "quote" && (
            <label>
              Price in rand
              <input
                required
                inputMode="decimal"
                value={service.price}
                onChange={(e) => update(index, "price", e.target.value)}
              />
            </label>
          )}
          {service.pricing === "quote" && (
            <p>A price is agreed after the scope is understood. We will not advertise R0.</p>
          )}
          {services.length > 1 && (
            <Button
              type="button"
              variant="outline"
              onClick={() => onChange(services.filter((_, n) => n !== index))}
            >
              Remove service {index + 1}
            </Button>
          )}
        </fieldset>
      ))}
      {services.length < 8 && (
        <Button
          type="button"
          variant="outline"
          onClick={() =>
            onChange([
              ...services,
              { categoryId: "", title: "", description: "", pricing: "quote", price: "" },
            ])
          }
        >
          Add another service
        </Button>
      )}
    </section>
  );
}
