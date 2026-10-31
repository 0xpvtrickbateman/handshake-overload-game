# OVERLOAD — shipped release verification

Verified October 30, 2026 (America/Phoenix); production suite completed October 31 UTC.

## Initial release

- Live: **https://overload-game.vercel.app**
- TV: **https://overload-game.vercel.app/tv/CODE** (replace CODE with the room code).
- Vercel team/project: **Jake / williamjake / overload-game**.
- Verified deployment: `dpl_86S1uN7D3KmZ5Sjyspte6UsN49Qv` — [immutable deployment](https://overload-game-gw4ufr2qe-williamjake.vercel.app).
- Baseline runtime source commit: `3ebd02a`. The Git delivery follow-up below describes a subsequent retry-response correction.
- Upstash Marketplace resource: `overload-game-redis`, region `iad1`, attached to production, preview, and development. Room TTL and action-receipt window: six hours. Credentials remain server-only.
- Four successive production releases kept a playable version live: baseline, presentation, retry/privacy hardening, then compact lobby/QR polish.

## Final production results

Command: `PLAYWRIGHT_BASE_URL=https://overload-game.vercel.app npm run test:e2e`.

**All four tests passed in about 4.7 minutes**, using the production API, real Redis, real SSE, and normal 5-second signal / 10-second load phases. No test-duration override was enabled on Vercel.

| Round | Reveal start separation across active screens |
| ----- | --------------------------------------------: |
| 1     |                                         25 ms |
| 2     |                                         21 ms |
| 3     |                                          8 ms |
| 4     |                                         21 ms |
| 5     |                                          6 ms |
| 6     |                                          9 ms |
| 7     |                                         14 ms |
| 8     |                                         18 ms |

Maximum **25 ms**, against the requested 250 ms target. Round 3 compares the remaining human and TV while the second human is deliberately absent. Every other round compares both humans and TV. These are isolated browser contexts on one computer/network, not geographically separated physical-device measurements or a universal latency guarantee.

The forced-SSE-failure test measured **15 ms** reveal separation between a polling phone and an SSE phone, with eight seated players. Normal-play SSE connections completed in **30.098–30.327 seconds**; the client opened 25 streams over the full test, including intentional refresh/rejoin sessions. There were **zero browser console/page errors and zero failed API responses during normal play**. Intentional invalid-input and blocked-stream tests are separate.

The full multiplayer test checks matching phase, total, authoritative scores, and visible score text on every reveal. It also verifies:

- 375×667 and 390×844 controllers with all signal, crate, and lock controls inside the viewport; no horizontal or vertical page overflow.
- A confirmed load surviving a refresh mid-round.
- A player navigating away, missing a round, and returning to the same seat.
- A late guest spectating, then receiving a seat on rematch.
- Eight completed rounds, all four awards, an eight-round ledger, and a real PNG results download.
- The host leaving after results; the remaining human rematching and becoming host without losing the room.
- Short-lived SSE connections rotating automatically.

The additional production tests verify concurrent room-creation retries return one room and seat; concurrent duplicate bot actions add one bot; invalid inputs and unauthorized/cross-origin actions are rejected; hidden loads and private identity/plan fields are redacted; an eight-way heaviest/lightest tie is readable; reduced motion uses a flash; passive host absence transfers authority; and all three practice lessons complete automatically with mute memory surviving refresh.

Raw evidence: [suite summary](evidence/production-verification.json), [reveal timings](evidence/production-sync.json), [network audit](evidence/production-network.json), [polling result](evidence/production-polling-sync.json).

## Local checks and browser coverage

- `npm run build` passed, including Next.js production generation and TypeScript checks.
- `npm run lint` passed.
- `npm test`: **25 tests passed**. Coverage includes fit/snap arithmetic, tied extrema and all-player ties, auto-load, double rounds, all limit offsets for 2–8 players, ranking, bot personalities, uninterrupted eight-round progression, refresh/leave/late-join state, secret-load redaction including anonymous TV, concurrent create/action retries, receipts surviving the in-room cache, and per-identity rate limits.
- Full local Chromium suite: **4 tests passed**. Separate real-Redis API concurrency/validation test passed with `OVERLOAD_TEST_REDIS=1` in an isolated test namespace.
- WebKit: **2 focused tests passed** (eight-player/polling/host-recovery and complete practice/mute flow).
- Production dependencies: `npm audit --omit=dev` reported **0 vulnerabilities**. This is not a claim that all development dependencies are advisory-free.

## Manual built-in browser review

Played the live release with two isolated player contexts and a third TV context. Both phones and TV showed the same 20/15 snap, both tied heaviest guests, both tied lightest guests, and matching scores. The manually observed first two reveal gaps were 25 ms and 21 ms. The host console and API-response capture were clean; the automated production test additionally captures all three contexts.

The final eight-seat lobby was checked with an 18-character nickname at 375×667: page size remained exactly 375×667, with Start visible. Phone controller, eight-player blame scene, TV layout, results PNG, and Open Graph image were visually inspected. Production HTML contains the title, description, Open Graph image, favicon, and challenge footer; image and icon endpoints return HTTP 200.

Screenshots: [small-phone lobby](evidence/overload-lobby-eight-375.png), [live phone reveal](evidence/overload-live-snap-375.png), [390 px phone](evidence/overload-live-snap-390.png), [live TV](evidence/overload-live-tv.png), [eight-player reveal](evidence/overload-production-eight-player.png), [downloaded results image](evidence/overload-production-results.png), [Open Graph poster](evidence/overload-og.png).

## Competitive advantages delivered

- A judge can start alone, learn through a skippable 15-second practice, and complete a full bot game in roughly four minutes.
- The phone controller keeps the entire action loop on one screen; the eight-seat small-phone lobby fits too.
- Deadlines, automatic loads, bot coverage, passive host transfer, and any-human rematch prevent an absent player from controlling the pace.
- Signals support bluffing without voice chat. Four bot personalities make solo play demonstrate that tension.
- The shared reveal clock drives crates, gauge, bell/snap, blame, salvage, score movement, sound, and haptics; eight players still complete the choreography within six seconds.
- TV, QR invites, podium, awards, ledger, and results-image sharing provide a complete party-game loop.

The competitor timing samples involve different event types and observation methods. They support the design choices, not a standardized benchmark or a guaranteed challenge win. See [the competition review](competitor-review.md).

## Remaining verification limits

No blocking application issue was found in these checks. Physical iOS/Android devices, their vibration hardware, and native OS share sheets were not tested. Vibration depends on browser support; the PNG download fallback was verified. Browser contexts were isolated sessions on one machine; broad geographic/network testing and high-concurrency load testing were not performed. Room capacity remains eight seated guests, with extra viewers spectating.

## Git delivery follow-up

The source is published at [0xpvtrickbateman/handshake-overload-game](https://github.com/0xpvtrickbateman/handshake-overload-game). Vercel's existing `williamjake/overload-game` project is connected to that repository with `main` as its production branch and automatic domain assignment enabled. A push of commit `818cf2b` created a production deployment with source `git`; both Vercel and the GitHub commit status reported success. No manual CLI deployment was used to trigger it.

An additional API smoke test exposed a retry-response race: a concurrent action could commit between the room read and the action-receipt read, allowing the retry to return an older snapshot. The server now rereads the room after finding an already-committed receipt. A deterministic regression test failed against the previous implementation and passed with the correction.

After the correction, build and lint passed, all **26 unit tests** passed, and the concurrent API/validation test passed **three consecutive runs against real Redis** locally. The full-game and timing measurements above remain the recorded baseline checks; the new regression specifically covers the receipt/read ordering. The fix is delivered by pushing `main` through the same Git integration.
