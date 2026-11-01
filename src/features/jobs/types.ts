import type { DraftData } from "./schema";
import type { DiscoveryOptions } from "@/features/discovery/types";
export interface JobOptions {
  categories: { id: string; label: string; requiresTrade: boolean }[];
  areas: { id: string; label: string }[];
  saved: { id: string; label: string; town: string }[];
  local: boolean;
  map: DiscoveryOptions["map"] | null;
}
export interface OwnerJob {
  id: string;
  version: number;
  step: number;
  status: string;
  town: string;
  data: DraftData;
  directWorker: string | null;
  assets: { id: string; state: string }[];
  waves: number;
  invited: number;
  nextWave: string | null;
  expires: string | null;
  approximate: boolean;
  matches: { workerId: string; name: string; status: string; expires: string; blocked: boolean }[];
}
export interface Opportunity {
  matchId: string;
  jobId: string;
  title: string;
  description: string;
  category: string;
  town: string;
  urgency: string;
  slots: { start: string; end: string }[];
  contactWindow: string;
  budgetMin: number | null;
  budgetMax: number | null;
  status: string;
  expires: string;
  rationale: string;
  approximate: boolean;
  media: string[];
}
