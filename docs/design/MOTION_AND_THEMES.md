# Duzelo motion and colour themes — implementation contract

**Status:** approved feature specification for Milestone 00; **not yet running code**. This repository currently contains no Next.js application. Implement this contract as the initial design-system foundation rather than deferring dark mode until the pilot. Product workflows and security constraints in `01_PRODUCT_REQUIREMENTS.md` take precedence over decorative motion.

## Design goal

Duzelo should feel calm, clear and trustworthy to first-time clients, tradespeople and administrators on everyday South African phones and low-bandwidth connections. Motion communicates **where the user went, what changed and what happens next**. It may never disguise a failed submission, delay an urgent action, expose a private location, obscure a field error or replace a textual status.

Use the existing warm-neutral / deep-teal identity. Preserve the same navigation, content density and information hierarchy in both schemes. Do not invent verified workers, use synthetic worker photography as real people, or rebrand before founder references arrive.

## MotionDesign preflight and UX direction

Deterministic selection from the 120-character request (seed 120):

```text
seed=120 -> public-page hero: Cinematic Center; preferred type direction: Satoshi (licensed) or existing Geist
component directions: Inline Typography Images, Horizontal Accordions, Infinite Marquee
GSAP directions: Scroll Pinning, Scrubbing Text Reveals
```

**Application override:** these creative patterns are permitted **only in optional public editorial/marketing content** when they genuinely help tell a story, use approved/licensed assets and stay readable without JavaScript. Do not put pinned panels, marquee, masked text, heavy parallax or experimental navigation in authenticated client, worker, administrator, map, checkout, OTP or urgent reporting flows. The public page may follow navigation → attention → interest → desire → action, with headings no longer than 2–3 lines at 390px/1440px and a verified, dense three-card feature grid. If a bento treatment is used, apply `grid-flow-dense` and check for gaps at each breakpoint. No decorative spam badges, inaccessible hover-only controls, or fictional testimonials.

## Theme contract — deliver in Milestone 00

- **Three explicit settings:** Light, Dark, System. Initial preference is **System** unless a user chooses otherwise. Expose an accessible **Appearance** control in the signed-out header/account menu and `/app/settings`. Signed-out users must also be able to select a scheme. The explicit choice survives refresh, navigation and sign-in/sign-out on the same browser.
- Use a root class or `data-theme` on `<html>`; semantic CSS custom properties drive Tailwind/shadcn tokens rather than per-component hard-coded colours. `next-themes` is acceptable after confirming compatibility and license; otherwise build a small tested provider. Follow the provider's early bootstrap strategy to avoid first-paint flash and React hydration mismatches; do not read localStorage synchronously during a server render. Use `suppressHydrationWarning` only on the root element where the theme provider actually changes the class.
- The **System** option follows `(prefers-color-scheme: dark)` live, including OS changes while the tab remains open. An explicit Light/Dark choice ignores OS changes. Persist preference under a namespaced key such as `duzelo-theme`. Theme preference is not a permission or identity state; browser storage failure must fall back to System without crashing.
- Set `color-scheme` on the document, theme-specific form controls, meta `theme-color` for browser chrome where supported, and status bar/PWA shell surfaces. Keep SVG/icon strokes, chart labels, loading skeletons, overlays, focus indicators and native dialogs legible in both modes.
- Theme must not reset wizard drafts, tabs, filters, scroll, keyboard focus, a live MapLibre instance, or an active chat. For MapLibre, swap to approved **light/dark style URLs** only after the new style is ready; keep selected marker/list-card state, viewport, coarse location masking, attribution and keyboard-accessible list fallback. If a dark map style is unavailable, retain the licensed accessible light map rather than guessing a provider URL.
- Never derive verification, payment, booking, availability or safety statuses from theme colours. Use text + icon + semantic colour in both schemes. Test all placeholder, hover, disabled and danger states in both modes.

### Provisional semantic palette

| Token | Light | Dark | Role |
|---|---|---|---|
| `--background` | `#FAFAF7` | `#111D18` | Page background |
| `--surface` | `#FFFFFF` | `#1A2A22` | Panels, cards, dialogs |
| `--surface-raised` | `#F3F6F1` | `#23372C` | Active/hover surfaces |
| `--foreground` | `#162520` | `#E8F5ED` | Body and headings |
| `--muted-foreground` | `#5B6D64` | `#ADC2B6` | Supporting text |
| `--border` | `#DAE3DC` | `#3B5145` | Borders and separators |
| `--primary` | `#0B6F65` | `#4BD6C0` | Primary interactive surface |
| `--primary-foreground` | `#FFFFFF` | `#081F1A` | Text/icons on primary |
| `--ring` | `#0B6F65` | `#86E9D5` | Focus indicator |
| `--destructive` | `#B42318` | `#FF8C82` | Errors and destructive actions |

Keep legacy `--brand-600`, `--brand-900` and `--accent-200` as brand source values if useful, but map **interactive states** through semantic tokens. For example, white on `#0D9488` has approximately 3.74:1 contrast and is **not** acceptable for normal-sized button text; use `#0B6F65` (approximately 6.04:1 against white). These examples are provisional, not an accessibility certification. Check actual computed colours, font sizes and opacity at WCAG 2.2 AA (4.5:1 normal text, 3:1 large text and pertinent non-text UI), including destructive, warning, map marker and selected states.

## Motion contract — prioritize task clarity

### Motion token budget

| Usage | Suggested duration | Behaviour |
|---|---:|---|
| Tap/press/hover/focus | 80–150 ms | Subtle scale (press ~0.985) or opacity, never a moving target |
| Tabs, menus, tooltips | 140–220 ms | Small transform + opacity, no layout shift |
| Sheet/dialog enter/exit | 180–280 ms | One layer moves, focus lands on meaningful control |
| Wizard step, route content | 180–320 ms | Directional 8–16px translation + fade; preserve prior draft and focus |
| Success/confirmed state | 250–400 ms | One finite emphasis, paired with live text announcement |
| Optional public scroll story | Case-by-case | Lazy-load GSAP + ScrollTrigger, safe fallback; no blocking content |

Use one consistent `cubic-bezier(0.22,1,0.36,1)` entrance and `cubic-bezier(0.4,0,0.2,1)` state transition as starter tokens. Prefer CSS for simple state changes and use `gsap` / `@gsap/react` only for intentional coordinated sequences, with contexts scoped to DOM refs and cleanup on unmount. Load `ScrollTrigger` dynamically on public screens only and destroy its instances on route changes. Do not add a second animation runtime without an ADR. Do not use `transition-all` on huge subtrees, constantly running blurs, expensive shadow animation, or unbounded stagger on worker lists.

### Interaction-specific choreography

1. **Public landing and category discovery:** optional hero entrance, responsive cards and finite scroll reveal; category interaction must work keyboard/touch without animation. No autoplay content that hides essential links.
2. **Navigation and mode switch:** clear active state first, then subtle shared highlight. Never imply a role change grants extra permissions. Keep mobile bottom-nav hit targets at least 44×44.
3. **Job wizard / worker verification:** sliding steps reflect forward/back direction and maintain form input focus and draft values; errors are announced immediately and are not hidden behind transitions. In-flight submission disables duplicate submit and shows persistent text; do not animate it into false success.
4. **Map/list and worker cards:** selected list row synchronizes with a coarse marker through a short highlight. Avoid moving the map until the user initiates it; respect reduced motion and preserve privacy. Sheet gesture settling may use transform, not repeated height reflows; list alternative must always be available.
5. **Quotes, booking timeline and statuses:** transition from pending → confirmed only after authoritative server response. Animate a small status/step cue once; retain explicit text and timestamps. Rollback optimistic UI visibly on error.
6. **Messages and notifications:** single incoming-message entry only for newly received records; do not auto-scroll if the reader is reviewing earlier messages. No rapid infinite notification animations.
7. **Admin / high-stakes:** no decorative transition delaying MFA, worker rejection, dispute resolution, refunds or emergency reporting. Prefer immediate state + concise feedback.
8. **Theme change:** instant semantic surface repaint with optional 120–180ms colour interpolation **only when reduced motion is not requested**. No full-screen circular wipe, blur, canvas transition or forced page reload.

### Performance and accessibility

- Animate `transform` and `opacity` preferentially. Use `will-change` briefly, not permanently. Keep layouts readable at 320, 390, 768, 1024 and 1440px and ensure no horizontal overflow.
- Honour `prefers-reduced-motion: reduce`: zero nonessential movement, disable GSAP scroll pinning/scrubbing, stop marquee/parallax, remove smooth scroll, allow essential opacity/instant state changes. Dynamic OS preference changes must take effect without reload.
- Preserve focus order and screen reader announcements; all controls are semantic buttons/links, dialogs manage focus and restore it on closing. Never rely on animation to convey success, failure, location permission or verification status.
- Target smooth 60fps on representative mid/low-range Android devices and Safari iOS; avoid large DOM animation batches. Monitor input delay, layout shifts and scroll jank. Disable public GSAP storytelling on low-data / constrained devices where appropriate.

## Implementation sketch for Codex

Recommended app-owned modules after Milestone 00 bootstrap (use the actual initialized framework versions):

```text
src/components/providers/theme-provider.tsx
src/components/settings/appearance-control.tsx
src/lib/design/theme.ts
src/lib/design/motion.ts
src/components/motion/route-presence.tsx
src/components/motion/accessible-reveal.tsx
src/styles/tokens.css
tests/unit/theme-preference.test.ts
tests/e2e/appearance.spec.ts
tests/e2e/motion-accessibility.spec.ts
```

Root theme provider wraps all public, client, worker and admin shells; no provider nesting in routes. The Appearance control uses a fully labelled, keyboard operable 3-choice radio group or segmented control, exposes current selection, and never requires authentication. Add a matching `appearance` setting to the settings page and a quick switch in the menu. The one storage key and semantic CSS variable contract are the source of truth.

The `motion.ts` module should expose short, medium and long tokens, reduced-motion guards and reusable sequences, rather than putting GSAP calls inside business-domain components. Never run GSAP on the server; ensure correct `'use client'` boundaries. CSS and JavaScript animations must both honour the same accessibility preference.

## Verification and acceptance gates

1. On first visit with OS dark mode, **System** renders dark before meaningful content paint; OS light renders light. No theme flash, hydration warning, or client/server mismatch.
2. Selecting Light or Dark persists across reload, navigation, client/worker mode change and auth/logout; choosing System resumes live OS tracking. Blocked localStorage still renders safely.
3. Render public home, category results, map/list, worker preview, phone OTP, wizard, worker onboarding, inbox, admin table, dialogs and status cards under both palettes. Contrast/focus are verified in every variant.
4. Mobile 390×844 and desktop 1440×900 Playwright: controls function with keyboard, touch and Escape; theme switching does not lose form draft, selection, scroll, map viewport, or focus.
5. Run Playwright with `reducedMotion: 'reduce'` plus device emulation: route, modal, wizard and GSAP scroll behaviours have no nonessential movement and remain usable. Test runtime changes to the media query if feasible.
6. Check GSAP context cleanup after repeated route navigation; no duplicate ScrollTriggers, console errors, listener leaks or long tasks. In low-end emulation, no unexpected layout shift or horizontal scroll.
7. Verify announcement and state truthfulness during quote submit, booking confirmation, failed payment, worker approval, offline/permission-denied transitions. The UI must not render false success while waiting for a server command.
8. Run the actual repository formatter, lint, TypeScript check, unit, browser smoke, production build and security checks before claiming completion or merging. No unexecuted checks may be called passing.

## Delivery boundaries

Milestone 00 must provide actual working theme provider, UI control and base motion primitives; later milestones apply them to their real screens. Treat the above as part of the main implementation plan. The original build pack remains a blueprint until runnable code is committed and tested.

**Product Design plugin:** full screenshot-driven visual audit and selectable alternatives require ChatGPT Work. No screenshots of Duzelo are available yet, so no visual QA, design approval or verified prototype is claimed here.
