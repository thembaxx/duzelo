# Vercel foundation deployment — 2026-10-31

Authorized by the founder after Milestone 00. The earlier instruction not to deploy was superseded by “Deploy to Vercel and then continue”.

- URL: https://duzelo.vercel.app
- Immutable deployment URL: https://duzelo-9k3dgprif-thembaxxs-projects.vercel.app
- Team: thembaxxs-projects (`team_cFpGnASFJam5O1q0Fgep1NXk`)
- Project: duzelo (`prj_thRIZe4cGWyc4zKTrVcAzudztEcx`)
- Deployment: `dpl_4HyjQMsgzBuSVy1XXJsJo2YNfjLF`
- Commit: `9f1d01e073082d5b74d9891e9bf7e24cc99a825d` (verified Milestone 00 foundation)
- Framework: Next.js. Node override and persistent project setting: 24.x.
- State: **READY**. Build interval reported by Vercel: 29.18 seconds.
- Actual target: **production**. The API was asked for preview, but Vercel classified the first deployment as production and assigned the stable alias. That observed state is reported rather than calling it a preview.

Verification: Vercel authenticated fetch returned HTTP 200 and the expected tagline on home; `/app/client` followed the denial redirect and returned the unavailable sign-in/protected-workspace notice. A direct anonymous HTTPS request to the stable alias also returned HTTP 200. Generated deployment access has Vercel protection; the stable production alias is publicly accessible. App workspace guards still deny all sessions. Direct HTTPS checks of `/app/client`, `/app/worker` and `/admin` each returned HTTP 307 to their unavailable sign-in notice with `private, no-store, max-age=0`; `/manifest.webmanifest` returned HTTP 200.

No secret was added, no provider was contacted and no Supabase project/database was provisioned. Sensitive application capabilities remain OFF. The M01 database work is local and is not connected to this deployment. No automatic application account, approval or payment action is implied by the website being live. The foundation remains `noindex` and legal/brand/provider validation is still outstanding.
