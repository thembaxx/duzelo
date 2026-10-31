import type { WorkerDraft } from "./schema";
export interface Catalog {
  categories: { id: string; label: string; requiresTrade: boolean }[];
  areas: { id: string; label: string }[];
}
export interface Asset {
  id: string;
  kind: string;
  categoryId: string | null;
  caption: string;
}
export interface Verification {
  id: string;
  kind: string;
  categoryId: string | null;
  status: string;
  reason: string | null;
  expiry: string | null;
}
export interface OwnerApplication extends Catalog {
  workerId: string;
  publicSlug: string | null;
  status: string;
  revision: number | null;
  state: string | null;
  draft: WorkerDraft | null;
  assets: Asset[];
  verifications: Verification[];
  retentionDays: number;
  local: boolean;
}
export interface PublicWorker {
  slug: string;
  name: string;
  bio: string;
  town: string;
  identityReviewed: boolean;
  businessReviewed: boolean;
  travelFeeCents: number;
  categories: { id: string; label: string; tradeReviewed: boolean }[];
  services: {
    id: string;
    title: string;
    description: string;
    pricing: string;
    priceCents: number | null;
    categoryId: string;
  }[];
  media: { id: string; caption: string; kind: string }[];
}
