# OLYMPUS

Live app: https://barkingbeast.github.io/olympus/

A private, two-player daily challenge, built for iPhone Safari. Animated SVG gods and bosses, one-tap check-ins, duo streaks, a journey map, XP, coins, quests, temples, cosmetics, recovery, private reflections and a weekly scoreboard.

## Architecture

- Buildless HTML, CSS and native JavaScript modules. No runtime framework or third-party JavaScript dependency.
- Supabase Auth REST endpoints with refresh-token persistence, plus one Postgres RPC.
- Private schema tables with RLS, explicit deny policies and no browser table grants. A narrowly scoped authenticated action function validates mutations, locks profiles for purchases, enforces a two-person duo, and returns only the caller's permitted data.
- Only a Supabase **publishable** key is shipped. No service-role key or database password belongs in this repository.
- Browser-local **demo** is clearly marked, isolated from real accounts, and saved separately.
- A service worker caches static assets only. API traffic and private data are never cached by the service worker. Live check-ins require a connection; no silent offline success.

## Backend

The `olympus` project has already been created and `backend/schema.sql` applied to Supabase project `viiapqmlvebglaugrtzj`, Mumbai region. Do not apply the schema again to that project. It is retained for inspection/reproduction in a fresh project.

Days and weeks reset at midnight **Asia/Kolkata**, shared by both players. Week begins Monday. No medical claims, monitoring, paid loot boxes or public personal-progress pages.

`backend/verify.sql` uses temporary users inside a rolled-back transaction to check duplicate prevention, note isolation, duo membership and spending validation. It leaves no test users or logs behind.

## GitHub Pages deployment

1. Create `olympus` under the intended GitHub account with an initial README, then upload these files at repository root. The workflow expects branch `main`.
2. Settings → Pages → Build and deployment → Source: **GitHub Actions**.
3. Push to `main`, or run the included Pages workflow. It checks syntax, runs tests and deploys **dist/** only. Backend SQL is not part of the hosted artifact.
4. In Supabase → Authentication → URL Configuration, set **Site URL** to the exact GitHub Pages URL, including `/olympus/`, and allow it in **Redirect URLs**. This is required for confirmation and password recovery emails. The owner approved instant signup without email confirmation on 2026-10-20. Password-reset emails still require a custom mail provider for non-team addresses.
5. Test account creation/confirmation and password recovery at the final URL. Supabase's built-in email delivery limits may require custom SMTP for broader usage.

Source repository: `barkingbeast/olympus`. Deployment uses the included GitHub Pages workflow. Repository creation and Pages configuration are handled through GitHub settings; source commits use the GitHub plugin.

## Local development and verification

Serve **dist/** through an HTTP server. ES modules do not run correctly by double-clicking `index.html`.

```sh
npm run check
npm test
```

No installation is required. Run `npm run dev` for a local preview at http://localhost:4173/. In the managed Codex environment, the provided Sites preview serves dist for internal UI verification. Do not commit `.openai/hosting.json` to GitHub; it is only local preview configuration.

## Reward rules

- Every day can have exactly one check-in, editable that day. Any check-in earns 10 XP and 20 coins; success earns another 40 XP.
- Each daily quest earns 25 XP and 10 coins once. Check-in corrections never multiply coins.
- Missing today preserves yesterday's streak until today's window closes. A logged slip resets the current streak immediately. Past XP and purchases remain.
- A success deals 75 boss damage, a quest 15, and both allies succeeding on the same date adds 50. Boss HP is 1,200, with a different animated enemy each week.
- Day 3: Spartan. Day 5: Greek God. Day 7: Olympian. Day 14: Titan. Day 21: God of Thunder. Day 30: Cosmic Deity.
- The first five successful days unlock the golden-laurel chest. Cosmetic coins have no monetary value.
- Temple stages cost 100, 200 and 300 coins; server enforces prerequisites and available balance.

## iPhone usage

Open the HTTPS URL in Safari. Share → Add to Home Screen for a standalone app experience. The interface includes safe-area padding, 44px primary targets, 16px text inputs to avoid Safari focus zoom, a fixed three-tab bar, reduced-motion support and lightweight vector animation.

The reset timer uses an absolute end time, so it resumes after Safari suspends the tab. Backup requests are **in-app only**, refreshed about every 30 seconds while visible; they are not phone push notifications. Users contact their friend themselves after responding.

## Verification status

JavaScript syntax and six game-rule tests pass. The private backend integration checks pass in a rolled-back transaction. Browser demo flows verified: daily check-in → day-five evolution, adventure map, temple purchase, chest, and profile/calendar. GitHub Pages deployment and the live app login screen are verified. Supabase Site URL and exact redirect allowlist are configured for the live domain. Full email confirmation/recovery with a real user and actual iPhone Safari remain to be verified.

## Edit with Codex on your Windows laptop

1. Clone this private repository while signed in to the `barkingbeast` GitHub account:

```powershell
git clone https://github.com/barkingbeast/olympus.git
cd olympus
npm run dev
```

2. In Codex/ChatGPT desktop, choose **Add new project** (or **Ctrl+O**) and select the cloned `olympus` folder. Codex reads `AGENTS.md` for project context.
3. Ask for a change, preview at http://localhost:4173/, and run `npm run check` and `npm test` when relevant. Demo mode is useful for checking the UI without changing live progress.
4. Ask Codex to commit and push when ready. Every push to `main` automatically redeploys GitHub Pages.

The repo is prepared for local use; it cannot be automatically placed into a desktop app or filesystem on a laptop that this session cannot access. The chat history does not have to transfer: the repository contains the architecture and continuation instructions.
