# OVERLOAD

**Load it up. Don’t snap the cable.** A mobile party game in a 1930s hotel freight elevator, made for the Handshake × OpenAI challenge.

## Play

- **Play now vs bots** creates a private game immediately, with all four bot personalities.
- Host a room and share its four-letter code or link. Guests choose a nickname, hat, and color. The host can add/remove bots or fill to four seats.
- `/room/CODE` is the phone controller. `/tv/CODE` is a read-only big-screen view.
- The first solo visit includes a skippable 15-second practice lift. It demonstrates fit, blame, and salvage using examples scored by the same server rules module.
- Room links and QR codes work without accounts. The phone controller fits 375×667 and 390×844 without scrolling; results and the optional ledger can scroll.
- 2–8 seated players; later arrivals watch and are seated at rematch, with humans taking priority over bots.

## Rules

1. Signal light, heavy, or shrug for five seconds. Secretly load 1–6 crates in ten seconds; no pick means three.
2. At or below the limit, everyone banks their load. Over the limit, nobody banks: every tied heaviest loader loses three, every tied lightest loader salvages two. Both apply if all loads tie.
3. Eight rounds. Rounds seven and eight double **all point changes**. Highest score wins; fewest blamed snaps breaks a tie. An exact tie shares victory.

Limit: `clamp(round(3.5 × seated players) + offset, players, 5 × players)`, with offset chosen from `[-2, -1, 1, 2]`.

Steady Sam usually loads three. Greedy Gus loads four to six. Liar Lou signals the opposite of his load. Mirror Mel copies the previous round's first human load (three before any human history exists). Their choices and delayed actions are planned by the server.

Keyboard: **L / H / S** signal, **1–6** select crates, **Enter** locks. Signals remain non-binding.

## Presentation and accessibility

The six-second reveal recaps signals, drops each guest's crates with rising-pitch thuds, climbs a brass gauge, and resolves with a bell or cable snap. Eight-player drops accelerate to keep the same total length. Snaps spotlight every tied heaviest guest and identify the lightest guests' salvage. Scores appear on the shared reveal timeline.

Audio is synthesized locally with Web Audio: elevator hum, thuds, bell, cable twang, and a gasp-like noise envelope. Sound begins after a user gesture; mute is saved per device. Lock and snap request vibration where supported. Reduced motion replaces shake with a brief flash and removes movement.

The end screen includes a podium, four server-calculated awards, an expandable round-by-round ledger, and a one-tap PNG share (native sharing where supported, download otherwise). The Breaker has most blamed snaps; The Saint loaded fewest crates; Honest Abe made most matching light/heavy signals (light = 1–3, heavy = 4–6, shrug unscored); Dark Horse recovered most from their largest deficit behind the leader. Award ties use seat order.

## Architecture

- Next.js App Router, TypeScript, React, Tailwind/CSS. No account or external game service is required.
- `src/game/rules.ts` is the pure scoring/limit/bot/award module. `engine.ts` owns phases and actions. Only the server runs authoritative transitions.
- Upstash Redis stores rooms with a six-hour TTL. REST reads and atomic Lua compare-and-swap writes prevent concurrent actions from losing updates. A bounded request-ID ledger and immutable per-round loads make retries safe.
- A browser-local random session token is hashed server-side and reconnects the same seat. Only hashes are stored in private room state; neither tokens nor hashes enter public snapshots.
- Every request advances expired phases. No player needs to press Next, and no background worker is required. A missed first load defaults to three; bot coverage handles later missed rounds until the player returns. An absent host transfers to the next online human.
- Public state is versioned and redacted. Other players see signals and lock flags, never private loads before loading closes.
- SSE streams last about 30 seconds under a 60-second function limit and reconnect automatically. If SSE stops arriving, clients poll about every 500 ms. Redis reads happen server-side during each stream; this is not a Redis pub/sub deployment.
- Clients calibrate clock offset using low-RTT samples. After loading closes, the server publishes the reveal with 1.8 seconds of delivery headroom. Every client uses that one timestamp for the animation; local timers never score a game or advance a phase.
- Rate limits apply to room creation and player actions. Inputs, room codes, session tokens, and same-origin writes are checked server-side.

## Local development

Node.js 26 and npm are used by this project.

```sh
npm ci
vercel link --project overload-game --scope williamjake
vercel env pull .env.local --scope williamjake
npm run dev
```

The Marketplace integration injects `KV_REST_API_URL` and `KV_REST_API_TOKEN`. The equivalent `UPSTASH_REDIS_REST_URL` and `UPSTASH_REDIS_REST_TOKEN` names also work. Never put either token in a `NEXT_PUBLIC_` variable.

## Verification

```sh
npm test
npm run lint
npm run build
npm run test:e2e
```

Playwright starts the production build locally and creates isolated contexts for two humans and TV, plays eight accelerated local rounds, checks reveal phase/totals/scores, measures reveal-start skew, verifies 375×667 and 390×844 controller fit, refreshes mid-round, tests an absent player, and rematches after the host leaves. Run `npm run build` before the local end-to-end suite.

The local test server explicitly uses `OVERLOAD_TEST_MODE=1`, an isolated in-memory store and shorter phase durations. This mode is **disabled whenever `VERCEL` is set** and is not used for production validation. Production must be checked separately against real Redis, SSE, and normal round lengths.

## Deploy

```sh
vercel project inspect --scope williamjake --non-interactive
vercel --prod --scope williamjake --yes
```

Target: **Jake / williamjake / overload-game**. Database: `overload-game-redis`, Upstash Marketplace, primary region `iad1`; Vercel functions use the same region. The integration is connected to production, preview, and development.

Keep the last working production deployment available while preparing the next release. Verify an anonymous production page load and a real multi-session game after deployment. The competitor review and measurement evidence are under `docs/`.
