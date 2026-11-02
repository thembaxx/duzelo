import { z } from "zod";
import { demoProviders, findDemoProvider } from "./catalogue";

export const DEMO_STORAGE_KEY = "duzelo-demo-v1";
export const demoSlots = ["09:00", "11:00", "14:00"] as const;
export const demoStatus = {
  confirmed: "Confirmed",
  "in-progress": "In progress",
  "awaiting-review": "Ready to review",
  completed: "Completed",
  cancelled: "Cancelled",
} as const;
const dateSchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/)
  .refine((s) => !Number.isNaN(Date.parse(s)) && new Date(s).toISOString().slice(0, 10) === s);
const eventSchema = z
  .object({
    kind: z.enum([
      "created",
      "confirmed",
      "started",
      "finished",
      "completed",
      "cancelled",
      "rescheduled",
      "supplies",
      "arrival",
      "reviewed",
    ]),
    at: z.string().max(40).datetime(),
    schedule: z
      .object({ date: dateSchema, slot: z.enum(demoSlots) })
      .strict()
      .optional(),
  })
  .strict();
const bookingSchema = z
  .object({
    id: z.string().regex(/^demo-booking-[a-z0-9-]{1,60}$/),
    provider: z.string().max(100),
    service: z.string().max(100),
    date: dateSchema,
    slot: z.enum(demoSlots),
    status: z.enum(["confirmed", "in-progress", "awaiting-review", "completed", "cancelled"]),
    events: z.array(eventSchema).min(1).max(80),
    review: z.number().int().min(1).max(5).optional(),
  })
  .strict()
  .refine(
    (b) => !!findDemoProvider(b.provider)?.services.some((s) => s.id === b.service),
    "Unknown demo service",
  );
export const demoStateSchema = z
  .object({
    version: z.literal(1),
    anchor: dateSchema,
    saved: z
      .array(z.string().refine((s) => !!findDemoProvider(s)))
      .max(8)
      .refine((s) => new Set(s).size === s.length, "Duplicate saved provider"),
    bookings: z.array(bookingSchema).max(200),
  })
  .strict()
  .refine(
    (s) => new Set(s.bookings.map((b) => b.id)).size === s.bookings.length,
    "Duplicate demo booking",
  );
export type DemoBooking = z.infer<typeof bookingSchema>;
export type DemoState = z.infer<typeof demoStateSchema>;
export type DemoEvent = z.infer<typeof eventSchema>;
export function demoToday(now = new Date()) {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Africa/Johannesburg",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(now);
}
export function shiftDemoDate(date: string, days: number) {
  const d = new Date(date + "T12:00:00Z");
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}
export function demoDate(date: string, short = false) {
  return new Intl.DateTimeFormat("en-ZA", {
    timeZone: "Africa/Johannesburg",
    weekday: short ? undefined : "short",
    day: "numeric",
    month: short ? "short" : "long",
  }).format(new Date(date + "T12:00:00Z"));
}
export function seedDemoState(anchor = demoToday()): DemoState {
  const offsets = [2, 4, 0, -1, -8, -23, -39, -55, -76, -94, -115, -137, -155, -178];
  const bookings = offsets.map((offset, index): DemoBooking => {
    const provider = demoProviders[index % demoProviders.length]!;
    const date = shiftDemoDate(anchor, offset);
    const status: DemoBooking["status"] =
      index < 2
        ? "confirmed"
        : index === 2
          ? "in-progress"
          : index === 3
            ? "awaiting-review"
            : index === 9
              ? "cancelled"
              : "completed";
    const kinds: DemoEvent["kind"][] = ["created", "confirmed"];
    if (["in-progress", "awaiting-review", "completed"].includes(status)) kinds.push("started");
    if (["awaiting-review", "completed"].includes(status)) kinds.push("finished");
    if (status === "completed") kinds.push("completed", "reviewed");
    if (status === "cancelled") kinds.push("cancelled");
    return {
      id: `demo-booking-${1001 + index}`,
      provider: provider.slug,
      service: provider.services[index % 2]!.id,
      date,
      slot: demoSlots[index % 3]!,
      status,
      events: kinds.map((kind, i) => ({
        kind,
        at: `${i < 2 ? shiftDemoDate(date, -3) : date}T${String(8 + i).padStart(2, "0")}:00:00.000Z`,
      })),
      ...(status === "completed" ? { review: index % 4 === 0 ? 4 : 5 } : {}),
    };
  });
  return { version: 1, anchor, saved: [demoProviders[0]!.slug, demoProviders[2]!.slug], bookings };
}
export type DemoAction =
  | { type: "save"; slug: string }
  | {
      type: "create";
      id: string;
      provider: string;
      service: string;
      date: string;
      slot: DemoBooking["slot"];
      at: string;
    }
  | { type: "progress"; id: string; at: string }
  | { type: "cancel"; id: string; at: string }
  | { type: "reschedule"; id: string; date: string; slot: DemoBooking["slot"]; at: string }
  | { type: "message"; id: string; kind: "supplies" | "arrival"; at: string }
  | { type: "review"; id: string; rating: number; at: string };
function futureDate(date: string, at: string) {
  return (
    dateSchema.safeParse(date).success &&
    date > demoToday(new Date(at)) &&
    date <= shiftDemoDate(demoToday(new Date(at)), 30)
  );
}
export function reduceDemoState(state: DemoState, action: DemoAction): DemoState {
  if (action.type === "save") {
    if (!findDemoProvider(action.slug)) return state;
    if (!state.saved.includes(action.slug) && state.saved.length >= demoProviders.length)
      return state;
    return {
      ...state,
      saved: state.saved.includes(action.slug)
        ? state.saved.filter((s) => s !== action.slug)
        : [...state.saved, action.slug],
    };
  }
  if (!z.string().max(40).datetime().safeParse(action.at).success) return state;
  if (action.type === "create") {
    if (
      state.bookings.length >= 200 ||
      state.bookings.some((b) => b.id === action.id) ||
      !futureDate(action.date, action.at)
    )
      return state;
    const result = bookingSchema.safeParse({
      id: action.id,
      provider: action.provider,
      service: action.service,
      date: action.date,
      slot: action.slot,
      status: "confirmed",
      events: [
        { kind: "created", at: action.at },
        { kind: "confirmed", at: action.at },
      ],
    });
    return result.success ? { ...state, bookings: [result.data, ...state.bookings] } : state;
  }
  const bookings = state.bookings.map((b): DemoBooking => {
    if (b.id !== action.id || b.events.length >= 80) return b;
    let next = b;
    let kind: DemoEvent["kind"] | null = null;
    if (action.type === "progress") {
      const steps = {
        confirmed: ["in-progress", "started"],
        "in-progress": ["awaiting-review", "finished"],
        "awaiting-review": ["completed", "completed"],
      } as const;
      const step = steps[b.status as keyof typeof steps];
      if (step) {
        next = { ...b, status: step[0] };
        kind = step[1];
      }
    }
    if (action.type === "cancel" && b.status === "confirmed") {
      next = { ...b, status: "cancelled" };
      kind = "cancelled";
    }
    if (
      action.type === "reschedule" &&
      b.status === "confirmed" &&
      futureDate(action.date, action.at) &&
      demoSlots.includes(action.slot)
    ) {
      next = { ...b, date: action.date, slot: action.slot };
      kind = "rescheduled";
    }
    if (action.type === "message" && !["cancelled", "completed"].includes(b.status))
      kind = action.kind;
    if (
      action.type === "review" &&
      b.status === "completed" &&
      !b.review &&
      Number.isInteger(action.rating) &&
      action.rating >= 1 &&
      action.rating <= 5
    ) {
      next = { ...b, review: action.rating };
      kind = "reviewed";
    }
    return kind
      ? {
          ...next,
          events: [
            ...next.events,
            {
              kind,
              at: action.at,
              ...(kind === "arrival" ? { schedule: { date: b.date, slot: b.slot } } : {}),
            },
          ],
        }
      : b;
  });
  return bookings.some((b, i) => b !== state.bookings[i]) ? { ...state, bookings } : state;
}

/** Completed events, rather than appointment dates, drive rolling 30-day activity. */
export function demoActivity(bookings: readonly DemoBooking[], today = demoToday()) {
  const end = Date.parse(today + "T00:00:00+02:00") + 86400000;
  return Array.from({ length: 6 }, (_, i) => {
    const from = end - (6 - i) * 30 * 86400000,
      to = from + 30 * 86400000;
    const count = bookings.filter(
      (b) =>
        b.status === "completed" &&
        b.events.some(
          (e) => e.kind === "completed" && Date.parse(e.at) >= from && Date.parse(e.at) < to,
        ),
    ).length;
    const label =
      i === 5
        ? "Now"
        : new Intl.DateTimeFormat("en-ZA", {
            month: "short",
            timeZone: "Africa/Johannesburg",
          }).format(new Date(from + 15 * 86400000));
    return { count, label };
  });
}
