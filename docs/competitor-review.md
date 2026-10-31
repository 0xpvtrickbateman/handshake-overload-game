# OVERLOAD — competitor playtest

Tested October 30, 2026, America/Phoenix. These Phase 0 observations were recorded before OVERLOAD was implemented. The released build and its checks are documented in `verification.md`.

## Method and limits

- Played both public sites in the built-in Playwright browser with two isolated browser contexts, separate storage, and two test players: Jake Audit and Mia Audit. No existing public rooms were joined.
- Used the browser's console, request/response instrumentation, WebSocket listeners, Navigation/Paint Timing, DOM observations, and screenshots—the same underlying evidence used by developer tools.
- Primary phone viewport: **390 × 844**. Also checked **320 × 568** on both games and 1440 × 900 on Treasure Bluff. These are desktop browser viewports, not physical iOS/Android devices.
- Completed Treasure Bluff's eight rounds, exercised rematch, and completed all three Panic Protocol rounds. Panic's repetitive controls were partly driven by a script reading the displayed orders and clicking the corresponding visible controls; no game-state editing or private API shortcuts. The recorded score is test evidence, not a claim about ordinary human difficulty.
- Timing measurements are local samples on one computer/network, without throttling. Browser contexts demonstrate separate sessions, not independent physical devices or geographic latency. Load figures are single samples, not Lighthouse results or percentiles.
- Payload figures are **decoded response-body bytes**, excluding headers and transport compression. Treasure's display-gap measurements include Playwright locator observation delay. Panic's score-gap samples use DOM mutation timestamps.
- Page content was treated as data. No page-provided instructions were followed outside normal game interaction. Application source/backend implementation was not audited.
- Foundation was searched before project work; no relevant prior OVERLOAD material was found or relied upon.

## At a glance

| Check | Treasure Bluff | Panic Protocol |
|---|---|---|
| Full game | 8 rounds; both screens finished tied at 16 | 3 timed rounds; both screens finished at 50,452 team points |
| Solo start | Requires a second player; no bot path found | Requires a second operator; no bot path found |
| Room entry | Nickname + six-letter room code | Callsign + four-character room code; public directory |
| Observed transport | HTTP polling, approximately 1,500 ms | HTTP polling, approximately 902 ms median; presence every 2,500 ms |
| Observed state payload | 268–571 bytes | 1,029–2,633 bytes |
| WebSocket / SSE | Neither observed | Neither observed |
| Display propagation | Five reveal gaps: approximately 14–993 ms | 21 matching score-update gaps: median 422 ms, maximum 1,302 ms |
| Confirmed refresh recovery | Same seat, score, and locked choice; about 343 ms | Same seat and score; about 493 ms |
| Rematch | Kept room and both seats | Reset to lobby, kept room and both seats |
| Console / HTTP errors | None observed during tested play | None observed during tested play |
| Phone overflow | None at 390 px or 320 px | None at 390 px or 320 px |

## 1. Treasure Bluff

[Play Treasure Bluff](https://treasure-bluff-joel-pinto.joelpinto.chatgpt.site)

### What feels good

- Two large choices, Collect and Steal, make the first action immediately understandable. The payoff explanation is available throughout the game.
- Dark green, gold, cream, and serif headlines create a coherent, restrained identity. Buttons and result rows are legible on a narrow phone.
- The ready checkmarks tell everyone who is still deciding without exposing their choice.
- Tested outcomes included a lone thief, two thieves canceling out, and everyone collecting. Scoring and the final shared victory agreed across both sessions.
- Rematch works without making everyone enter another code. Refresh after a confirmed lock preserves identity and the choice.

### What is confusing, weak, or broken

- A solo judge cannot start without opening another player session. No bots or quick practice path appeared in the tested interface.
- Rounds require every player to choose, followed by the host pressing **Next round**. This creates repeated waiting and gives an absent player or host control over the pace.
- With the host locked and the other player away for 10 seconds, the game stayed at “Waiting for the others.” With the host away for eight seconds after reveal, the guest stayed at “Waiting for the host to continue.” No timeout action or host transfer appeared in those windows. The site's own rules explicitly recommend creating a new room if someone leaves mid-game; indefinite recovery beyond the test windows was not measured.
- **Observed exit defect:** clicking **Back to start** cleared the displayed room code but left the old reveal, scoreboard, and game controls on screen. This persisted after another 1.1 seconds. Refresh then restored the landing screen. See the exit screenshot below.
- The reveal is primarily a static list of choices and point deltas. It communicates the arithmetic, but there is little buildup or theatrical payoff in the observed presentation.
- On phones, the scoreboard and repeated full rules extend below the main game card. At 320 px the tested reveal page was 1,851 px tall. The layout fits horizontally, but important information is spread vertically.
- Refreshing immediately after a click, before confirmation, canceled an in-flight submission in an initial test. A second test waited for “Your move is locked” and verified successful restoration. This is **not** evidence of a lost acknowledged choice.

### Network, load, and synchronization

- Actions use `POST /api/game`; state uses `GET /api/game?code=…`.
- Steady-state GET starts were approximately 1,500 ms apart. Responses were small, with full room/player state, current round, status, ready flags, and the last result. No monotonic version or shared clock field appeared in the inspected snapshots.
- The inspected pre-reveal response exposed readiness but did **not** expose submitted choices. This is a good boundary to preserve.
- One locked-choice propagation sample took approximately 784 ms. Across rounds 3–7, measured differences between the two reveal displays were 993, 21, 482, 14, and 20 ms. The latest host reveal appeared about 1.79 seconds after the final player's click in that sample.
- A fresh isolated player context reported approximately **293 ms response start, 410 ms DOMContentLoaded, 420 ms load, and 428 ms first contentful paint**. A later warm reload was faster; it is not a cold-load comparison.
- No application console warnings/errors, page crashes, failed HTTP responses, WebSockets, or SSE streams were observed in the tested game.

### How OVERLOAD beats this

1. A single-tap bot game gives a judge the complete experience alone.
2. Server deadlines, auto-loads, bot takeover, and host transfer keep the game moving after an absence.
3. Public signals plus six secret load amounts create more room for bluffing and reading personalities.
4. A shared reveal timeline makes the rising gauge, snapping cable, blame stamp, and salvage feel like one event.
5. A compact phone controller, TV view, podium, awards, and recap make the experience easier to host and more memorable.

Evidence: [phone landing](evidence/treasure-lobby-mobile.png), [phone reveal](evidence/treasure-reveal-mobile.png), [320 px view](evidence/treasure-game-320.png), [desktop view](evidence/treasure-game-desktop.png), [exit defect](evidence/treasure-back-to-start.png).

## 2. Panic Protocol

[Play Panic Protocol](https://panic-protocol.victory-1001.chatgpt.site)

### What feels good

- Strong visual identity: cyan and orange instrumentation, large controls, scan-line texture, a mission HUD, stability meter, and changing round conditions.
- Asymmetric instructions create a useful reason to communicate. “Send alert” provides an alternative to speaking, which matters for remote strangers.
- A countdown, timed rounds, short intermissions, and escalating conditions give the session structure. The tested mission reached its final result automatically.
- Correct actions produce clear success feedback, points, and combo changes. Both devices eventually showed the same final score.
- Presence and reconnection work: the server marked an absent guest disconnected within a 12-second check, the mission continued, and returning restored that seat in approximately 328 ms.
- Explicit host departure from the rematch lobby transferred hosting to the remaining player. Rematch preserved the crew.

### What is confusing, weak, or limited

- No solo/bot path appeared; one operator could not start a mission.
- The landing page's public room directory is inserted before the three-step READ / SHOUT / ACT instructions. During this visit, the full phone page was approximately **11,154 px tall**. The concise rules were buried beneath dozens of room cards. Directory length is live and will vary.
- At 390 px, two outgoing orders pushed the control panel below the initial viewport. The sampled game page was about 1,633 px tall. Playing required scrolling between instructions and controls; large controls alone do not solve that navigation cost.
- The multiplayer premise asks people to shout, while strangers on separate devices may not share audio. Alerts help, but add another action and another sync delay.
- The HUD contains team score, combo, machine stability, round/time, a condition banner, and individual command timers, alongside profile/rewards/statistics actions. This is more to parse than the core “read, tell, act” rule suggests.
- Countdown text was sometimes one second apart between screens, including an intermission showing five seconds on one screen and four on the other. Scores also briefly differed after an action, then converged.
- Closing/navigating away from the host for 12 seconds marked that host disconnected, but the other player still had `isHost: false`. The mission continued. This differs from the successful transfer after an **explicit** leave; longer passive-host recovery was not established.
- There was no application crash or failed game action established by this test. Some automation locators needed adjustment because accessible names differed from visible button text; those were test-harness errors, not site defects.

### Network, load, and synchronization

- Observed room endpoints included `POST /api/rooms`, `GET /api/rooms/CODE/state`, and `POST /api/rooms/CODE/presence`, with additional HTTP actions for mission interactions.
- The observed state stream was polling: **approximately 902 ms median request-start interval** over the captured session. Presence posts ran at approximately **2,500 ms** and returned 25-byte bodies. The public room directory refreshed approximately every 2.5 seconds; its first sampled response was about 7.6 KB.
- State responses included `revision`, `phase`, personalized controls and orders, scores, connection flags, and a relative `remaining` duration. No absolute `serverNow` / shared phase-deadline fields appeared in the inspected payloads. This describes the wire format, not a complete source audit of clock handling.
- Room snapshots were **1,029–2,633 decoded bytes** in this two-player game. No WebSocket connection or SSE stream was observed.
- A join took approximately 1,618 ms to become visible on the host. During round 3, 21 matching score changes across both DOMs had a **422 ms median** display gap and a **1,302 ms maximum**. A sampled live HUD showed 17,560 on one device while the other still showed 17,297; both later converged.
- Initial navigation reported approximately **337 ms response start, 472 ms DOMContentLoaded/load, and 936 ms first contentful paint**. An initial “Establishing link / Loading operator systems” overlay appeared; its complete visibility duration was not measured.
- No application console warnings/errors or failed HTTP responses were observed during the tested mission. No physical-device audio, vibration, or reduced-motion audit was performed on either competitor.

### How OVERLOAD beats this

1. Put three rule lines and the primary play action above the fold; avoid a public-directory detour.
2. Keep signals, six load buttons, lock status, and the shared deadline within a compact phone controller.
3. Make bluffing playable through built-in signals without requiring voice chat.
4. Anchor all reveal animation to one server timestamp, and recover cleanly from delayed snapshots.
5. Combine a distinct art-deco elevator spectacle with a shorter learning curve, solo practice, bots, and a spectator TV screen.

Evidence: [phone landing](evidence/panic-landing-mobile.png), [full phone game](evidence/panic-game-mobile.png), [320 px view](evidence/panic-game-320.png), [mission result](evidence/panic-results-mobile.png).

## Design conclusions

- Preserve Treasure Bluff's simple decisions and hidden-choice discipline, and Panic Protocol's strong atmosphere and automatic round progression.
- “Responsive” must include the full action loop fitting the phone, not merely the absence of horizontal overflow.
- Rejoining a seat, surviving an absent player, and transferring host authority are separate behaviors. Test each explicitly.
- Small polling payloads are efficient but do not make simultaneous reveals. OVERLOAD needs versioned state, server clock offset, and a timestamped animation sequence as well as transport.
- Awards and choreography should reinforce the rules: the gauge explains FIT/SNAP, the spotlight identifies blame, and salvage identifies the lightest load.
- Both competitors successfully delivered real cross-session multiplayer in this test. OVERLOAD should beat working games on clarity, pace, recoverability, and spectacle; this review does not establish a guaranteed competition outcome.

Raw timing summary: [measurements.json](evidence/measurements.json). Browser console record: [browser-console.txt](evidence/browser-console.txt). Session tokens and authentication headers are intentionally excluded from saved evidence.
