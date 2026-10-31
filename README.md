# OVERLOAD

```text
         ||
         ||
  +------++------------------+
  |         OVERLOAD         |
  |--------------------------|
  |          [ ][ ]          |
  |        [ ][ ][ ]         |
  +==========================+
```

**Load it up. Don't snap the cable.**

A party game for 2-8 players in a 1930s hotel freight elevator.
Eight rounds. Secret loads. One shared weight limit.

[Play OVERLOAD](https://overload-game.vercel.app) |
[Source](https://github.com/0xpvtrickbateman/handshake-overload-game)

## Play

- **Solo:** play against bots, with a skippable 15-second practice lift.
- **With friends:** host a room and share its four-letter code, link, or QR code. No accounts. The host adds bots and starts the game.
- **On a TV:** open `https://overload-game.vercel.app/tv/CODE`. Phones stay in control at `/room/CODE`; the TV shows the game.

Late arrivals spectate and get seats on rematch, up to eight players. Refreshing restores your seat. Bots cover absent players; an absent host passes control to the next online human.

## Rules

1. **Signal, then load.** You have 5 seconds to signal light, heavy, or shrug, then 10 seconds to secretly load 1-6 crates. Signals are promises you can break. No pick means 3 crates.
2. **Fit or snap.** At or below the limit, everyone banks their crates. Over it, nobody banks: every tied heaviest loader loses 3 and every tied lightest loader gets +2. If everyone ties, both apply.
3. **Most points wins.** Play 8 rounds. The final two double all point changes. Fewer blamed snaps breaks a score tie; an exact tie shares the win.

Each round's limit is `clamp(round(3.5 * players) + offset, players, 5 * players)`, with `offset` chosen from `[-2, -1, 1, 2]`.

| Guest      | Habit                                                                     |
| ---------- | ------------------------------------------------------------------------- |
| Steady Sam | Usually loads 3                                                           |
| Greedy Gus | Loads 4-6                                                                 |
| Liar Lou   | Signals the opposite of his load                                          |
| Mirror Mel | Copies the last confirmed human load from the previous round; starts at 3 |

**Keyboard:** L / H / S to signal, 1-6 to select crates, Enter to lock.

Sound can be muted and remembers your choice. Reduced motion is supported. Results include awards, a round-by-round ledger, a shareable PNG, and a rematch that keeps the room.

## Architecture

Next.js App Router, TypeScript, React, Tailwind/CSS, Upstash Redis, and Vercel.

- [rules.ts](src/game/rules.ts) handles scoring, limits, bots, and awards. [engine.ts](src/game/engine.ts) handles phases and actions. The server decides outcomes.
- Redis keeps rooms for 6 hours. Atomic writes and idempotent actions protect against simultaneous requests and retries.
- Requests advance expired phases. No background worker or player confirmation is needed.
- Versioned snapshots expose signals and lock status; loads stay private until loading closes. A local session token restores the player's seat.
- SSE reconnects about every 30 seconds, with polling around every 500 ms as a fallback.
- Clients estimate server time and share one reveal timestamp. The server allows 1.8 seconds for delivery before the reveal starts.
- API routes validate inputs, rate-limit actions, and check same-origin writes.

## Run locally

Requires Node.js 26, npm, the Vercel CLI, and access to the `williamjake/overload-game` project.

```sh
npm ci
vercel link --project overload-game --scope williamjake
vercel env pull .env.local --scope williamjake
npm run dev
```

Redis uses `KV_REST_API_URL` and `KV_REST_API_TOKEN`. The equivalent `UPSTASH_REDIS_REST_URL` and `UPSTASH_REDIS_REST_TOKEN` names also work. Keep tokens server-side, never in `NEXT_PUBLIC_` variables.

## Test

```sh
npx playwright install chromium webkit
npm run build
npm run lint
npm run typecheck
npm test
npm run test:e2e
npm run test:e2e -- --browser=webkit
```

Playwright checks a full game across two human sessions and TV, reveal timing, matching scores, phone layout, refresh, departures, late joiners, rematch, polling fallback, practice, and sharing.

Local E2E tests use an isolated in-memory store and accelerated rounds. Test mode is disabled on Vercel. To test Redis locally, use `OVERLOAD_TEST_REDIS=1 npm run test:e2e`. To test a deployed build at normal speed:

```sh
PLAYWRIGHT_BASE_URL=https://overload-game.vercel.app npm run test:e2e
```

## Deploy

Vercel's GitHub integration connects this repository's `main` branch to **williamjake/overload-game**. Push tested changes to deploy:

```sh
git push origin main
```

A successful build updates [overload-game.vercel.app](https://overload-game.vercel.app). The project's Redis integration supplies environment variables for production, previews, and local development. Functions and Redis run in `iad1`.

Deployment checks and measurements: [verification](docs/verification.md) and [competitor review](docs/competitor-review.md).

---

Made for the Handshake x OpenAI challenge.
