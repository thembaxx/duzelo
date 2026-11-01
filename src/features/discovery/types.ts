import type { Point } from "./schema";
export interface DiscoveryOptions {
  categories: { id: string; label: string; requiresTrade: boolean }[];
  towns: { id: string; label: string; point: Point }[];
  saved: { id: string; label: string; town: string }[];
  canSave: boolean;
  local: boolean;
  map: { light: string | null; dark: string | null; fixture: boolean };
  geocoding: boolean;
}
export interface DiscoveryCard {
  slug: string;
  name: string;
  bio: string;
  town: string;
  point: Point;
  available: boolean;
  identityReviewed: boolean;
  businessReviewed: boolean;
  avatarId: string | null;
  categories: { id: string; label: string; tradeReviewed: boolean }[];
  distanceBand: string | null;
}
export interface SearchResult {
  workers: DiscoveryCard[];
  nextCursor: string | null;
  center: Point | null;
}
export interface Place {
  label: string;
  point: Point;
}
