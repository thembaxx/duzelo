# Validation status and external references — Duzelo PRD v1.0

Date: 2026-10-31. This is a **design/specification pack**, not completed implementation or a verified production migration.

## What was checked in this session
- Requirements consolidated from all three completed discovery rounds; no further product-discovery questions.
- Inspected the PRD, SQL blueprints, milestone tasks, and environment example for consistency.
- Verified schema-qualified `REFERENCES` targets and RLS policy table names against declared schema objects via a lightweight static script.
- Public worker discovery cards separated from private account locations and verification records; unpublishing triggers drafted for suspended workers.
- Moved payment attempts/ledger into private schema; payment DTOs are served by authenticated, authorized server endpoints rather than granting public financial table access.
- Guest reviews require a sanitized server endpoint; raw review table is not exposed to anonymous clients.

## What has NOT been checked (mandatory in Codex milestone 01)
- No runnable Next.js application or deployment was built.
- SQL was not applied to a live or local PostgreSQL/Supabase project; no SQL parser or DB runtime was available in the current execution environment. Syntax and semantic correctness remain unverified until Codex runs local migrations.
- No actual RLS/pgTAP tests, provider sandbox payments, SMS, e-mail or location provider integrations were exercised.
- No trademark/domain/merchant legal clearance or data-protection certification was obtained.
- Reference photos for the visual direction have not been received.

## Important implementation gates
1. Current Supabase changelog: https://supabase.com/changelog?types=breaking-change — includes announced TLS cipher removal November 10, 2026; keep clients/runtimes updated.
2. Phone OTP and limits: https://supabase.com/docs/guides/auth/phone-login — provider setup, CAPTCHA and SMS rate-limiting.
3. SSR cookie auth: https://supabase.com/docs/guides/auth/server-side — `@supabase/ssr` remains documented as beta; pin and test.
4. PostGIS: https://supabase.com/docs/guides/database/extensions/postgis — use `extensions` schema, GIST indexes and geography; longitude comes before latitude when constructing PostGIS points.
5. MapLibre GeolocateControl: https://maplibre.org/maplibre-gl-js/docs/API/classes/GeolocateControl/ — geolocation requires user permission and typically HTTPS; offer manual fallback.
6. OSM tile rules: https://operations.osmfoundation.org/policies/tiles/ — no reliance on unlimited community raster hosting or offline tile downloads.
7. Nominatim policy: https://operations.osmfoundation.org/policies/nominatim/ — public endpoint is not suitable for autocomplete.
8. Paystack marketplace settlement: https://support.paystack.com/en/articles/2132802 and https://support.paystack.com/en/articles/2132866 — split settlement and transfers have business requirements and are not escrow.
9. Paystack webhook signatures: https://paystack.com/docs/payments/webhooks/ — validate raw-body HMAC-SHA512 with provider secret before processing, then verify event state and amounts server-side.
10. POPIA security compromise reporting: https://inforegulator.org.za/2025/08/19/fact-sheet-handling-of-security-compromises/ — establish security incident reporting procedures.
11. Information Officer registration: https://eservices.inforegulator.org.za/services.aspx .
12. South African Consumer Protection Act: https://www.gov.za/documents/consumer-protection-act — professional review required for estimates, pricing, service quality, cancellations and dispute wording.
13. CIPC trademark search: https://www.cipc.co.za/?page_id=4118 — Duzelo is provisional and not cleared.

## Handling inspiration photos later
When founder provides photos, create `docs/design/reference-analysis.md` separating: (a) reusable layout hierarchy, spacing, palettes, textures, typography mood, photography treatment and motion cues, (b) design elements not to copy, (c) implemented token changes and before/after screenshots. Do not identify real people in photos. Keep the existing information architecture and privacy/security requirements unless the founder explicitly changes them.
