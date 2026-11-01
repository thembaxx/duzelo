import type { QuoteTerms } from "./schema";
export interface GrantView {
  id: string;
  quoteId: string;
  visitStart: string;
  visitEnd: string;
  accessFrom: string;
  expires: string;
  revoked: boolean;
  active: boolean;
  feeCents: number;
}
export interface QuoteView {
  id: string;
  version: number;
  workerName: string;
  status: string;
  terms: QuoteTerms;
  subtotalCents: number | null;
  taxCents: number;
  totalCents: number | null;
  published: boolean;
  canPublish: boolean;
  canWithdraw: boolean;
  canChoose: boolean;
}
export interface QuotesView {
  jobId: string;
  jobVersion: number;
  title: string;
  description: string;
  town: string;
  jobStatus: string;
  worker: boolean;
  canQuote: boolean;
  eligibilityMessage: string;
  latest: QuoteView | null;
  offers: QuoteView[];
  history: QuoteView[];
  historyPage: number;
  hasMore: boolean;
  grants: GrantView[];
  bookingId: string | null;
  media: string[];
}
export interface ExactLocation {
  street: string;
  province: string;
  notes: string;
  point: { latitude: number; longitude: number } | null;
  until: string;
  basis: "confirmed_booking" | "inspection";
}
export interface BookingView {
  id: string;
  jobId: string;
  jobTitle: string;
  town: string;
  provider: string;
  status: string;
  version: number;
  worker: boolean;
  startsAt: string;
  endsAt: string;
  quote: QuoteView;
  canConfirm: boolean;
  conflict: boolean;
  eligible: boolean;
  canCancel: boolean;
  noShowAvailable: boolean;
  events: {
    id: string;
    type: string;
    from: string | null;
    to: string | null;
    at: string;
    reason: string | null;
  }[];
}
