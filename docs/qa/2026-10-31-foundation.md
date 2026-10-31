# Foundation browser QA — 31 October 2026

Target: production prelaunch homepage `https://duzelo.vercel.app`, commit on main before Milestone 01 database changes.

## Executed desktop checks (browser automation, 1440×900)

- Home page loads with accessible navigation, service search and category cards — **pass**.
- Services category list and /services/plumbing navigation — **pass**.
- Search for `plumbing` returns the Plumbing category — **pass**.
- Dark theme applies and persists after reload — **pass**.
- System theme option usable — **pass**.
- No observed Next hydration errors or horizontal overflow during the inspection — **pass within inspected route**.

## Mobile inspection

- Visited homepage/settings, inspected the theme control and its Light/Dark/System labels, exercised navigation/appearance controls — **partial pass**.
- Additional independent 390×844 screenshot request succeeded, as did a 1440×900 screenshot request; remote capture assets were **not committed**.
- The browser driver did not conclusively certify real-device touch behaviour, keyboard focus order, OS colour-scheme changes or reduced-motion animation timing.
- Browser driver's initial viewport reported desktop dimensions during part of the mobile session. Do NOT call this a validated 390×844 Playwright run.

## Remaining browser gate

Run `npm run test:e2e` with a real Playwright Chromium installation against a local/authorized app and inspect actual screenshot output from 390×844 and 1440×900 in both light/dark plus system preference and reduced-motion scenarios. Include no console/hydration warnings, keyboard focus/focus trapping, mobile menu, search and protected-route redirect. These are still **not verified**.

Milestone 01 adds only migrations, tests and docs; no public app features or live credentials are introduced.
