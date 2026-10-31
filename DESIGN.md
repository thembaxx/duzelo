# Duzelo design brief

Duzelo is a configurable working name. Keep “Good help, close to home.” and the confirmed South African product decisions. Identity remains provisional; these references are direction, not permission to copy another product's logo, character, photography or claims.

## References that inform implementation

Read this file before changing interfaces. Preserve source, intended pattern and the implemented decision together. New references should extend this table and be checked against a real screen at 390×844 and 1440×900.

| Reference                                                                                                                                        | Useful pattern                                                                                   | Duzelo implementation                                                                                                                   |
| ------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------- |
| [Noe's root post](https://x.com/noechague/status/2116243745821937803) and [author follow-up](https://x.com/noechague/status/2116243746476147043) | Saved references reach the coding agent, rather than becoming detached bookmarks                 | This versioned design brief maps each reference to a component and validation evidence                                                  |
| [Marked](https://marked.dev/)                                                                                                                    | Project collections, interaction-oriented retrieval, source attribution and agent access via MCP | Keep sources and implementation intent together here; no Marked account, private collection or MCP connection has been created          |
| Founder: LOOP dark onboarding and dashboard images                                                                                               | Clear hierarchy, large rounded actions, compact floating navigation                              | Charcoal/lime system, restrained glass navigation, visible current Account state on private screens; no borrowed mascots or bubble logo |
| Founder: Wishly boards and onboarding                                                                                                            | Contained choices, short explanations, friendly scale                                            | Native radio cards explain client, worker and both; selected state has a border and radio indicator, not color alone                    |
| Founder: white fitness onboarding                                                                                                                | One clear decision at a time, explicit progress                                                  | Sign-in distinguishes number entry and verification; mandatory consent is never skipped to imitate a carousel                           |
| Founder: 28-brand logo process image                                                                                                             | A simple concept that survives small sizes                                                       | Preserve main's original link-and-location mark and existing Geist display type; improve account controls without replacing concurrent brand work    |
| Founder: glass controls, tonal cards and light dashboards                                                                                        | Layering, spacing and subtle material                                                            | Existing capsule navigation and generous surfaces; avoid decorative sliders, fictional metrics or unreadable text over imagery          |

## Identity and tokens

The current main branch supplies its own original `src/components/brand-mark.tsx`, linked install icons, Geist fonts, warm editorial surfaces and Light/Dark/System controls. Preserve them. The earlier isolated M02 doorway concept is not transplanted over this newer identity. This task adds theme-aware account cards and current mode/account states using the existing semantic palette. No third-party logo, mascot or screenshot is copied.

Use semantic values in `src/app/globals.css`, 44px or larger primary targets, real links, clear focus and native form semantics. Respect reduced motion. Keep decorative public motion outside authentication and administrator flows.

## Account interfaces

- Mode links change the current view. Server-owned capabilities, worker approval and live session checks still decide access.
- Keep ordinary phone access distinct from administrator MFA. Do not expose phone numbers, MFA secrets or provider errors in screenshots or notifications.
- A worker draft is labelled draft. Account creation does not approve a worker or invent opportunities.
- Preferences save real account settings; delivery remains inactive and is described that way.
- Sign-in and account changes require JavaScript. Submit controls wait for hydration; native forms use POST so secrets do not become URL query parameters if scripts fail.

## Source coverage and limits

Firecrawl retrieved the root post and the author's “try here” follow-up, then returned the same two author posts when the follow-up was read separately. No additional author continuation was returned. The linked Marked landing page was read. The retrieval did not expose a video transcript or private saved collections; neither is claimed reviewed. Supplied screenshots were inspected directly in the conversation; original creators beyond visible labels are unknown. Do not publish the reference screenshots as Duzelo product imagery.

See `docs/evidence/milestone-02.md` for actual accessibility, viewport and functional results on the integrated current-main application. M03 worker onboarding, matching and payments are outside this design change.
