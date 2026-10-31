# OVERLOAD design overhaul — pre-merge review

**Recommendation: hold the merge.** The game engine and multiplayer synchronization passed the review. Restore the missing rules and the snap weight readout before merging; also bring the phone rematch action back above the fold. No application code or tests were changed by this review.

Reviewed on 2026-10-30/31 against:

- Branch: `claude/overload-design-overhaul-qcl3wf`, application commit `5780a90ba9b143ab9126cd3ca2754312d00d19f6`. The branch name without `-qcl3wf` does not exist.
- [Tested Vercel preview](https://overload-game-5h1w8ls5s-williamjake.vercel.app), deployment `dpl_HbZ7VR8Wit6cuhvakBGfL1bFni9u`, on `williamjake/overload-game`.
- [Production](https://overload-game.vercel.app): `main` commit `4bb369741d94760bf8ce87f8ff7d09f7cc031ca6`, deployment `dpl_HHKKHDw9sYkGVGpLHhy76CATJanw`.

`main` was neither merged into nor pushed to. Production still pointed to its original deployment at the end of the checks. The review commit adds documentation/evidence only.

## Requested checks

| Item | Result | Evidence |
| --- | --- | --- |
| 1. Install, build, lint, typecheck, unit tests, full Playwright including WebKit | **FAIL — existing WebKit test assumption** | `npm ci`, build, lint, typecheck and all 26 unit tests passed. Full Chromium suite: **4/4 passed**. Full WebKit suite: **3/4 passed**; the eight-round test reaches results and times out waiting for a download. The same failure reproduced against production. No copy/selector failures required fixing. |
| 2. Gameplay/backend diff | **PASS** | Rules, engine, types, server/store/HTTP, Redis, connection/SSE/polling, sound, API routes, package manifests and deployment/test configuration are byte-identical to `origin/main`. Additional UI behavior and the new preview harness are listed below. |
| 3. Full preview multiplayer game | **PASS, native sharing unverified** | Two isolated human contexts plus a 1920×1080 TV completed eight real-time rounds. Every reveal had matching phase, total and score data. Both fit and snap occurred; final-round bank, blame and salvage doubled. All awards, eight recap rows, disclosure, PNG fallback, host departure and rematch worked. |
| 4. Resilience and solo/practice | **PASS** | Refresh retained a locked load/seat; absent player returned to the same seat; host transfer and rematch worked; QR late joiner spectated and was seated on rematch. Full solo game completed with Sam, Gus, Lou and Mel, followed by a working rematch. Practice showed all three lessons, auto-started, remembered mute, and its manual completion button worked. |
| 5. Layout, rules access, accessibility, keyboard, reduced motion | **FAIL — noted issues** | Controller fits 375×667 and 390×844 without either scroll direction, including eight seats. Also checked 768×1024, 1440×900 and 1920×1080 TV. L/H/S, 1–6 and Enter work. Reduced motion uses `snap-flash`. Inline icons rendered. 23 axe scans across preview and production found no automated WCAG A/AA violations; 114 sampled visible text/background pairs met AA contrast thresholds. Manual review found inherited focus escape and missing help on error/loading screens, plus the new visibility regressions below. |
| 6. Console, network, loading, Lighthouse | **PASS with preview SEO qualification** | No application console errors or unexpected HTTP failures during observed normal flows. Completed SSE streams lasted 30.100–31.186 seconds. One later `net::ERR_ABORTED` was caused by intentionally leaving a room. Warm navigation load events measured about 62–383 ms. Lighthouse mobile: **100 / 100 / 100 / 54**; SEO is affected by preview noindex/protection. |
| 7. Screen-by-screen production comparison | **FAIL — regressions found** | Rules completeness, snap readout persistence, and phone rematch visibility are worse. Visual consistency, SVG icons, lobby density and practice help improved. See comparison table and screenshots. |

## Findings and fix status

All findings below are **unfixed**. The authorized fix scope was test breakages caused by changed UI copy/selectors; none occurred. Expanding that scope to change application behavior, styling or the WebKit share test was intentionally avoided.

| ID | Severity / origin | Finding and reproduction | Relevant source / evidence |
| --- | --- | --- | --- |
| R1 | P2, new | The lobby's three-rule summary no longer teaches the signal, round count, doubled ending, winning condition, tiebreak, or that **nobody banks on a snap**. The expanded card restores some but still omits no-bank, the exact-limit fit case, Honest Abe's 1–3/4–6 definition, shared wins and explicit doubling of penalties/salvage. “Fits under the limit” is ambiguous at equality. Production explains these. Restore the complete concise rules and full edge cases. | `src/components/Rules.tsx:5`, `:49`; [preview rules](evidence/design-review/preview-rules-375.png); rule text in [browser audit](evidence/design-review/complete-browser-audit.json). |
| R2 | P2, new | At approximately 3.3 seconds into a snap reveal, the BLAME stage hides the total/limit subtitle. The gauge and capacity plate are also darkened behind the overlay. The new screen says SNAP but loses the readable explanation **40 / 27 crates** that production retains. Keep the readout visible on phones and TV throughout BLAME. | `src/app/globals.css:1580` explicitly sets the subtitle to `display: none`; [preview](evidence/design-review/preview-eight-snap-375.png), [production, same room/round](evidence/design-review/production-eight-snap-375.png), [TV](evidence/design-review/preview-eight-tv-1920.png). |
| R3 | P2, new | Results push rematch below the 375×667 fold. For the same solo result, production's button is at y=612.5–662.5; preview's is at y=701.6–757.6. Total page height grows from 836 to 999 px. Results scrolling itself is allowed by the controller-only constraint, but the primary replay action has become less discoverable. | `src/app/globals.css:2038` and podium/results spacing; [preview](evidence/design-review/preview-solo-results-375.png), [production, same result](evidence/design-review/production-same-results-375.png). |
| R4 | P2 accessibility, inherited | The modal declares `aria-modal` but does not trap focus or make the background inert. Shift+Tab escapes the preview dialog; repeated Tab also reaches background buttons on production. Escape/close and focus restoration work in the preview. | `src/components/Modal.tsx:22`; focus observations in [browser audit](evidence/design-review/complete-browser-audit.json). |
| R5 | P3, inherited | The reconnect/error shell has no `?` button. `/room/INVALID` shows the recovery message and back link but no rules access on either deployment. Rules opened successfully on every normal screen tested, including the newly supported practice and direct-join screens. | `src/components/RoomClient.tsx:36`; [error screen](evidence/design-review/preview-error.png). |
| T1 | Test failure, inherited | Full WebKit testing assumes “Share the evidence” emits a Playwright download. The app can instead use native Web Share. Both branch/local and production runs complete the game, awards and ledger checks, then time out at the same download wait. The built-in browser also reported file sharing supported and did not emit a download. Explicitly emulating a browser without native file sharing produced a valid 1080×1350 PNG. Do not mislabel this as a new gameplay failure, or silently alter the test under a copy-only fix allowance. | `tests/e2e/game.spec.ts:118`; [local WebKit result](evidence/design-review/local-webkit.json), [production reproduction](evidence/design-review/production-webkit.json), [error](evidence/design-review/webkit-error.md), [exported PNG](evidence/design-review/preview-results-image.png). |

## Synchronization

The live preview used distinct browser contexts, separate game session tokens for the two humans, and a read-only TV. Phase deadlines and outcomes came from the deployed server. Reveal timestamps came from the application's existing `overload:reveal` event, using the same measurement method as the recorded production baseline. Round 3 intentionally excludes the absent guest; the remaining host/TV pair was measured.

| Round | Reveal-start spread |
| --- | ---: |
| 1 | 28 ms |
| 2 | 20 ms |
| 3, guest away | 34 ms |
| 4 | 37 ms |
| 5 | 21 ms |
| 6 | 25 ms |
| 7, double | 16 ms |
| 8, double | 24 ms |

**Maximum 37 ms; median 24.5 ms.** This is 12 ms above the previously recorded production maximum of 25 ms, and 213 ms inside the 250 ms acceptance target. One run is not evidence that CSS caused the difference. The local Chromium suite measured a maximum of 14 ms; its polling fallback test measured 3 ms. WebKit's eight reveal assertions passed before its later share-test failure, and its focused polling test measured 10 ms.

The live game also verified matching scoreboard values at each reveal, hidden loads until reveal, signal/lock UI, refresh recovery, and doubled outcomes. See [per-round data](evidence/design-review/preview-browser-audit.json). The first immediate keyboard-signal sample in that file precedes the asynchronous acknowledgement; a later check explicitly awaited and verified all three L/H/S states in the complete audit.

## Scope review

`git diff --exit-code origin/main HEAD -- src/game src/server src/client/connection.ts src/client/sound.ts src/app/api package.json package-lock.json playwright.config.ts vercel.json next.config.ts` returned zero. No game-state transition, submission semantics, idempotency, authority, rate limiting, Redis TTL or synchronization behavior changed.

The original branch diff contains 17 files. Changes requiring explicit awareness beyond CSS are:

- New `src/app/frames/page.tsx`: a **preview-only UI harness route**, guarded by `notFound()` when `VERCEL_ENV === 'production'`. It was not deployed to production during this review. This is a new HTML endpoint, not an API/state endpoint.
- `src/client/share-image.ts`: canvas export colors/fonts and a `document.fonts.ready` wait. The scoring data and native-share/download decision remain unchanged.
- `src/app/layout.tsx`: self-hosted Next font assets for Jost/Limelight and the theme color.
- UI interaction changes: modal Escape/backdrop closing and focus restoration, join-code character cleanup, additional help entry points, and semantic labels/groups. These are UI behavior, not backend changes.
- The branch author already updated the share-button selector in `tests/e2e/game.spec.ts`. It passes the Chromium suite. This review did not change it.

There were no unrelated changes to dependencies, infrastructure or gameplay. `npm ci` did report 16 moderate advisories in the unchanged dependency tree; dependency remediation/security scanning was outside this review.

## Screen comparison

| Screen | Preview versus production |
| --- | --- |
| Landing | More coherent deco dial, typography and explicit rules panel. Fits both phones; production had a small page overflow. The rules panel is incomplete (R1). |
| Host / code join | Clearer fieldsets and avatar controls; large targets and no sideways overflow. The dialog focus issue remains (R4). |
| Direct link / QR join | Help and rules are now available here. At 375×667 the page grows from 667 to 724 px, but its join button remains visible, ending at y=654.6. At 390×844 it fits. |
| Lobby, including eight seats | Denser guest cards and bots fit both phone sizes. Winning information has disappeared from the quick rules (R1). |
| Practice | Three working lessons; clearer callouts and SVG icons; new help button. Auto-start, manual completion and remembered mute work. |
| Signal / load | All chips, six crate buttons and lock action stay in the viewport. Phase tracker, timer and SVG status icons are readable. Desktop keyboard input works. |
| Fit | Correct banking, gauge and readable verdict. New framing is visually consistent. |
| Snap / BLAME | Blame/salvage text is larger, but total/limit disappears during BLAME (R2), including on TV. |
| Results / awards | Clearer podium and awards; same scores and winners. Rematch moves below the small-phone fold (R3). |
| Recap / share | Eight working disclosures, aligned columns, and valid PNG fallback. Native share completion remains unverified (T1). |
| TV | Clearer typography, larger toolbar, working QR and scoreboard at 1920×1080. Same missing snap readout (R2). |
| Recovery / invalid room | Useful recovery message/back link; rules still absent (R5). |

## Loading, motion and accessibility evidence

Lighthouse 13.6.0, mobile simulated throttling, one fresh headless Chromium run per deployment:

| Metric | Preview | Production |
| --- | ---: | ---: |
| Performance | 100 | 100 |
| Accessibility | 100 | 100 |
| Best practices | 100 | 100 |
| SEO | 54 | 100 |
| FCP / LCP | 928 / 928 ms | 853 / 853 ms |
| Total blocking time | 9 ms | 4 ms |
| Landing CLS | 0 | 0 |
| Speed Index | 1,672 ms | 879 ms |

The preview SEO failures are `X-Robots-Tag: noindex` and a robots.txt fetch that received Vercel authentication HTML. This does not establish a production SEO regression. The new page has about 13.8 KB of render-blocking CSS; Lighthouse estimated 10.8 KB unused on the landing page. The measured Speed Index is slower in this single run, despite the unchanged 100 performance score. Reports: [preview](evidence/design-review/lighthouse-preview.json), [production](evidence/design-review/lighthouse-production.json). Authentication credentials were removed from artifacts.

Live gameplay has intentional movement when the central verdict changes into the corner BLAME label. A separate matching-state observer measured maximum layout-shift session windows of 0.104 preview versus 0.110 production, predominantly from that verdict repositioning. This did not move the controls. The earlier `rawShiftSum` fields are cumulative diagnostic sums across game rounds/resizing, **not** Web Vitals CLS scores.

23 axe checks across preview and production reported no automated violations, but gradient backgrounds produced some inconclusive contrast checks. A supplemental screenshot-background sampling pass checked 114 visible text fragments on landing, lobby, controller and rules: all met 4.5:1 for normal text or 3:1 for large text. Disabled controls, decorative glyphs and obscured/transient text were excluded. This is evidence for the sampled states, not a complete WCAG certification; the manual focus issue remains.

## Limits and handoff

- Tests used isolated contexts on one workstation. Independent physical phones, cellular/WAN jitter, actual camera scanning and device-specific haptics/audio quality were not tested. The QR image was decoded successfully to its actual join URL, which was then used to join.
- Native OS share-sheet completion is unverified. The PNG fallback and its rendered image were verified. The full WebKit test stops before its final leave/rematch assertions; these were independently verified in the live Chromium browser and the other resilience test covers host absence.
- Production was not changed, and a production build of this branch was not publicly deployed. The `/frames` production exclusion is confirmed by source, not by deploying the overhaul to production.
- There were no eligible copy/selector repairs. The pushed changes from this review are this report and its evidence only. Application fixes for R1/R2/R3 should receive another focused visual pass before merge; T1 needs a separately authorized test-harness change to distinguish native sharing from downloading.

Additional measurements and screenshots are in [the evidence directory](evidence/design-review/), especially [complete browser audit](evidence/design-review/complete-browser-audit.json), [supplemental audit](evidence/design-review/supplemental-browser-audit.json), and [contrast samples](evidence/design-review/contrast-sampling.json).
