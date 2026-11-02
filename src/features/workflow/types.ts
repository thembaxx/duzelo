import type { Attachment } from "@/features/messages/types";
export interface WorkflowView {
  id: string;
  version: number;
  status: string;
  client: boolean;
  readable: boolean;
  baseCents: number;
  totalCents: number;
  start: string;
  end: string;
  canChange: boolean;
  canStart: boolean;
  canComplete: boolean;
  canConfirm: boolean;
  canDispute: boolean;
  proposals: {
    id: string;
    kind: string;
    status: string;
    own: boolean;
    description: string;
    deltaCents: number;
    expiresAt: string;
    canAccept: boolean;
  }[];
  completions: {
    id: string;
    round: number;
    summary: string;
    status: string;
    reviewDue: string;
    supportDue: string | null;
    assets: Attachment[];
  }[];
  entries: {
    id: string;
    kind: string;
    body: string;
    at: string;
    own: boolean;
    assets: Attachment[];
  }[];
  dispute: { id: string; status: string; version: number; reason: string | null } | null;
}
export interface AuditView {
  expiresAt: number;
  hasMore: boolean;
  next: number;
  grantId: string;
  workflow: WorkflowView | null;
  messages: { id: string; sequence: number; body: string; at: string }[];
  assets: Attachment[];
  reports: { id: string; reason: string; status: string }[];
}
