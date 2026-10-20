# OLYMPUS project guide

This is a two-person habit challenge game, optimized for iPhone Safari. Preserve the dark green/gold Greek mythology design, lightweight animated SVG characters and bosses, reduced-motion support, and the three-tab layout.

## Run locally

Requires Node.js 22+ and Git. No npm install is needed: this project has no package dependencies.

- `npm run dev` serves `dist/` at http://localhost:4173/ on Windows, macOS and Linux.
- `npm run check` checks JavaScript syntax.
- `npm test` checks streaks, recovery, shared progress and boss rewards.
- Keep shell commands portable. Windows users may use `npm.cmd` if PowerShell blocks npm.ps1.

## Files

- `dist/app.js`: UI, forms, auth callbacks and game interactions.
- `dist/game.js`: pure streak, XP, progression, date and boss calculations.
- `dist/motion.js`: SVG battle timelines and a progress-free animation studio.
- `dist/art.js`: animated SVG avatars, bosses, temple and icons.
- `dist/style.css`: responsive styles and animations.
- `dist/api.js`: Supabase REST authentication/session refresh and game RPC.
- `dist/sw.js`: static asset caching. Bump its cache version when changing cached assets.
- `backend/schema.sql`: reference schema already applied to the live project. Do not rerun it on production.
- `backend/verify.sql`: tests scoped to a rolled-back transaction.

## Backend and privacy

Supabase project: `viiapqmlvebglaugrtzj`, name `olympus`, Mumbai region. The frontend publishable key is intentionally public. Never commit service-role keys, database passwords, SMTP secrets, access tokens or personal check-in exports.

The only game API is `public.olympus_action(op,p)`. Tables live in `olympus_private`, have RLS and deny direct client access. Its scoped private action validates `auth.uid()`, owns transactions and controls private duo access. Keep reflections visible only to their author. Preserve idempotent rewards and the two-person duo limit. Test relevant backend changes before deployment; do not modify the unrelated GEMINIWILLDOTHEWORK project.

Email/password signup is intentionally configured **without email confirmation**, explicitly approved by the owner on 2026-10-20. Password reset emails still require a configured mail provider. Preserve that choice unless the owner requests a change. Existing test/demo data must not be passed off as real synced progress.

Day boundaries and weekly resets use Asia/Kolkata. Both players share that calendar. Demo mode uses separate local storage and a clearly marked sample friend.

## Deployment

Repository: https://github.com/barkingbeast/olympus (private).
Live app: https://barkingbeast.github.io/olympus/ (public app shell; private authenticated data).

GitHub Actions deploys `dist/` whenever `main` is pushed. Preview and run the relevant checks first. Commit and push only when requested; pushing main publishes the changes. Do not change repository visibility or Supabase access settings as part of routine UI edits.
