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

- New successful daily check-ins earn **100 XP and 30 coins**. A fresh-start check-in earns 10 XP and 5 coins. Same-day edits change the existing entry and never create another reward.
- Boulder Roll, Hades’ Lantern, and Golden Fleece each earn **5 XP and 2 coins**, once per game per day, with at most **two rewarded games daily** (10 XP / 4 coins total). Replays are free and reward-free.
- Server-issued game tokens, a minimum 10-second round, a 30-minute claim expiry, unique activity keys, and the existing player row lock enforce the reward limits. Game outcomes run in the browser; these are casual self-accountability games, not competitive proof of skill.
- Existing activities without `payload.economy=2` retain their original rewards: check-in 10 XP +40 XP for success / 20 coins; old quest 25 XP / 10 coins. Historical rows, purchases, notes, duos and profiles are not rewritten. Existing same-day entries keep their original economy when corrected.
- Reset and ally-support utilities remain available, with no new XP/coin rewards. Retired exercise quests cannot be claimed by old clients.
- Check-ins deal 75 boss damage, rewarded games 5, and both allies succeeding on the same day add 50. Historical quests retain 15 damage. Boss HP stays 1,200.
- Week and day boundaries use Asia/Kolkata. Game rewards reset at midnight. Started rounds do not cross the daily boundary.
- Temple and cosmetic prices are unchanged. Purchase validation uses the same legacy-aware coin formula as the client.

`backend/arcade_rewards.sql` is the non-destructive upgrade applied after the base schema. `backend/verify_arcade.sql` verifies tokens, duplicates, caps, rewards, purchases, and player isolation in a rolled-back transaction.

## iPhone usage

Open the HTTPS URL in Safari. Share → Add to Home Screen for a standalone app experience. The interface includes safe-area padding, 44px primary targets, 16px text inputs to avoid Safari focus zoom, a fixed three-tab bar, reduced-motion support and lightweight vector animation.

The reset timer uses an absolute end time, so it resumes after Safari suspends the tab. Backup requests are **in-app only**, refreshed about every 30 seconds while visible; they are not phone push notifications. Users contact their friend themselves after responding.

## Verification status

JavaScript syntax and eight game-rule tests pass. The private backend integration checks pass in a rolled-back transaction. Browser demo flows verified: daily check-in → day-five evolution, adventure map, temple purchase, chest, and profile/calendar. GitHub Pages deployment and the live app login screen are verified. Supabase Site URL and exact redirect allowlist are configured for the live domain. Full email confirmation/recovery with a real user and actual iPhone Safari remain to be verified.

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

## SVG combat animations

Saved check-ins and quests that increase weekly boss damage play a skippable battle sequence: god attack, divine beam, boss hit, and HP decrease. Crossing zero HP triggers a boss fall/dissolve followed by a god victory pose. Repeated check-ins without new damage do not replay attacks. Reduced-motion users skip these sequences.

Open **Profile → Preview animations**, or **Battle details → Preview battle animations**, to try god attack, hit, fall/revival, victory and ascension, plus boss hit, death and revival, without changing any progress.
