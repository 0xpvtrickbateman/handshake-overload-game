# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: game.spec.ts >> two humans and TV complete eight synchronized lifts, refresh, leave, and rematch
- Location: tests/e2e/game.spec.ts:6:1

# Error details

```
TimeoutError: page.waitForEvent: Timeout 8000ms exceeded while waiting for event "download"
=========================== logs ===========================
waiting for event "download"
============================================================
```

# Page snapshot

```yaml
- generic [active] [ref=f1e1]:
  - alert [ref=f1e2]
  - generic [ref=f1e3]:
    - generic [ref=f1e4]:
      - link "OVERLOAD home" [ref=f1e5]:
        - /url: /
      - status "Live connection" [ref=f1e9]: Live
      - button "Mute sound" [pressed] [ref=f1e10] [cursor=pointer]
      - button "How to play" [ref=f1e13] [cursor=pointer]:
        - generic [aria-hidden] [ref=f1e14]: "?"
      - button "Leave room" [ref=f1e15] [cursor=pointer]
    - generic [ref=f1e18]:
      - paragraph [ref=f1e19]: Final standings after 8 rounds
      - heading "Greedy Gus takes the penthouse" [level=1] [ref=f1e20]:
        - generic [ref=f1e21]: Greedy Gus
        - text: takes the penthouse
      - generic [ref=f1e22]:
        - generic [ref=f1e23]:
          - generic [ref=f1e30]: Grace
          - generic [ref=f1e31]:
            - strong [ref=f1e32]: "30"
            - generic [ref=f1e33]: points
            - generic [ref=f1e34]: 2nd
        - generic [ref=f1e35]:
          - generic [ref=f1e45]: Greedy Gus
          - generic [ref=f1e46]:
            - strong [ref=f1e47]: "34"
            - generic [ref=f1e48]: points
            - generic [ref=f1e49]: 1st
        - generic [ref=f1e50]:
          - generic [ref=f1e57]: Ada
          - generic [ref=f1e58]:
            - strong [ref=f1e59]: "20"
            - generic [ref=f1e60]: points
            - generic [ref=f1e61]: 3rd
      - generic [ref=f1e62]:
        - generic [ref=f1e67]:
          - generic [ref=f1e68]: The Breaker
          - generic [ref=f1e69]: Grace
          - paragraph [ref=f1e70]: Most snaps caused
        - generic [ref=f1e75]:
          - generic [ref=f1e76]: The Saint
          - generic [ref=f1e77]: Ada
          - paragraph [ref=f1e78]: Fewest crates loaded
        - generic [ref=f1e83]:
          - generic [ref=f1e84]: Honest Abe
          - generic [ref=f1e85]: Steady Sam
          - paragraph [ref=f1e86]: Most truthful signals
        - generic [ref=f1e91]:
          - generic [ref=f1e92]: Dark Horse
          - generic [ref=f1e93]: Grace
          - paragraph [ref=f1e94]: Biggest recovery from behind
      - generic [ref=f1e95]:
        - button "One more lift? Rematch" [ref=f1e96] [cursor=pointer]:
          - text: One more lift?
          - generic [ref=f1e97]: Rematch
        - generic [ref=f1e100]:
          - button "Open the guest ledger" [ref=f1e101] [cursor=pointer]
          - button "Share the evidence" [ref=f1e102] [cursor=pointer]
      - paragraph [ref=f1e103]: The winner never took the blame for a snap. A stay to remember.
      - link "Back to the hotel" [ref=f1e104]:
        - /url: /
      - generic [ref=f1e105]: Made for the Handshake × OpenAI challenge
```

# Test source

```ts
  18  |   const network = { streams: 0, polls: 0, failures: [] as string[] };
  19  |   for (const p of [host, guest, tv]) {
  20  |     await trackReveals(p);
  21  |     p.on('pageerror', (e) => errors.push(e.message));
  22  |     p.on('console', (m) => {
  23  |       if (m.type() === 'error') errors.push(m.text());
  24  |     });
  25  |     p.on('response', (r) => {
  26  |       if (!r.url().includes('/api/')) return;
  27  |       if (r.status() >= 400) network.failures.push(new URL(r.url()).pathname + ' ' + r.status());
  28  |       if (r.url().endsWith('/events')) network.streams++;
  29  |       else if (r.request().method() === 'GET' && r.url().includes('/rooms/')) network.polls++;
  30  |     });
  31  |     p.on('requestfinished', (r) => {
  32  |       if (r.url().endsWith('/events')) streamDurations.push(Math.round(r.timing().responseEnd));
  33  |     });
  34  |   }
  35  |   await host.goto('/');
  36  |   await host.getByRole('button', { name: 'Host a room', exact: true }).click();
  37  |   await host.getByLabel('YOUR NAME AT THE DESK').fill('Ada');
  38  |   await host.getByRole('button', { name: /^Create room/ }).click();
  39  |   await expect(host).toHaveURL(/\/room\/[A-Z]{4}$/);
  40  |   const code = host.url().split('/').at(-1)!;
  41  |   await guest.goto('/room/' + code);
  42  |   await guest.getByLabel('YOUR NAME AT THE DESK').fill('Grace');
  43  |   await guest.getByRole('button', { name: /Join the lift/ }).click();
  44  |   await expect(host.getByText('Grace', { exact: true })).toBeVisible();
  45  |   await host.getByRole('button', { name: 'Fill to 4 with bots' }).click();
  46  |   await expect(host.locator('.guest-list').getByText('Greedy Gus', { exact: true })).toBeVisible();
  47  |   await tv.goto('/tv/' + code);
  48  |   await host.getByRole('button', { name: /Start the lift/ }).click();
  49  |   const measurements: { round: number; skewMs: number }[] = [];
  50  |   const lateToken = randomUUID();
  51  |   for (let round = 1; round <= 8; round++) {
  52  |     await expect(host.getByTestId('controller')).toHaveAttribute('data-round', String(round));
  53  |     if (round === 1) {
  54  |       await fitsPhone(host);
  55  |       await fitsPhone(guest);
  56  |     }
  57  |     await expect(host.getByTestId('controller')).toHaveAttribute('data-phase', 'load');
  58  |     await host.getByRole('button', { name: 'Load 2 crates', exact: true }).click();
  59  |     await host.getByTestId('lock-button').click();
  60  |     if (round === 2) {
  61  |       await host.reload();
  62  |       await expect(host.getByTestId('lock-button')).toContainText('2 crates locked');
  63  |     }
  64  |     if (round === 3) await guest.goto('about:blank');
  65  |     if (round !== 3) {
  66  |       await expect(guest.getByTestId('controller')).toHaveAttribute('data-phase', 'load');
  67  |       await guest.getByRole('button', { name: 'Load 6 crates', exact: true }).click();
  68  |       await guest.getByTestId('lock-button').click();
  69  |     }
  70  |     const screens = round === 3 ? [host, tv] : [host, guest, tv];
  71  |     for (const p of screens) await expect(p.getByTestId('reveal-result')).toBeVisible();
  72  |     const states = await Promise.all(
  73  |       screens.map((p) =>
  74  |         p.getByTestId('controller').evaluate((el) => ({
  75  |           phase: el.getAttribute('data-phase'),
  76  |           total: el.getAttribute('data-total'),
  77  |           scores: el.getAttribute('data-scores'),
  78  |         })),
  79  |       ),
  80  |     );
  81  |     for (const state of states) expect(state).toEqual(states[0]);
  82  |     const skewMs = await revealSkew(screens, round);
  83  |     measurements.push({ round, skewMs });
  84  |     expect(skewMs).toBeLessThanOrEqual(250);
  85  |     const scores: [string, number][] = JSON.parse(states[0].scores!);
  86  |     for (const p of screens)
  87  |       for (const [id, score] of scores)
  88  |         await expect(p.locator('[data-player-score="' + id + '"]')).toHaveText(score + ' PT');
  89  |     if (round === 3) {
  90  |       await guest.goto('/room/' + code);
  91  |       await expect(guest.getByTestId('controller')).toBeVisible();
  92  |     }
  93  |     if (round === 4) {
  94  |       const response = await request.post('/api/rooms/' + code, {
  95  |         headers: { 'x-overload-session': lateToken },
  96  |         data: {
  97  |           requestId: randomUUID(),
  98  |           action: { type: 'join', name: 'Late guest', avatar: { hat: 2, color: 5 } },
  99  |         },
  100 |       });
  101 |       expect(response.ok()).toBe(true);
  102 |       const state: Snapshot = await response.json();
  103 |       expect(state.players.find((p) => p.id === state.meId)?.seat).toBe(false);
  104 |     }
  105 |   }
  106 |   for (const p of [host, guest, tv])
  107 |     await expect(
  108 |       p
  109 |         .getByText('One more lift?', { exact: false })
  110 |         .or(p.getByText('Back to the hotel', { exact: true }))
  111 |         .first(),
  112 |     ).toBeVisible();
  113 |   for (const award of ['The Breaker', 'The Saint', 'Honest Abe', 'Dark Horse'])
  114 |     await expect(host.getByText(award, { exact: true })).toBeVisible();
  115 |   await host.getByRole('button', { name: 'Open the guest ledger' }).click();
  116 |   await expect(host.locator('.round-ledger')).toHaveCount(8);
  117 |   await host.getByRole('button', { name: 'Close ledger' }).click();
> 118 |   const download = host.waitForEvent('download');
      |                         ^ TimeoutError: page.waitForEvent: Timeout 8000ms exceeded while waiting for event "download"
  119 |   await host.getByRole('button', { name: 'Share the evidence' }).click();
  120 |   const image = await download;
  121 |   expect(image.suggestedFilename()).toBe('OVERLOAD-' + code + '.png');
  122 |   await image.saveAs(info.outputPath('results.png'));
  123 |   await info.attach('results-image', {
  124 |     path: info.outputPath('results.png'),
  125 |     contentType: 'image/png',
  126 |   });
  127 |   await host.getByRole('button', { name: 'Leave room', exact: true }).click();
  128 |   await expect(host).toHaveURL('/');
  129 |   await guest.getByRole('button', { name: /One more lift/ }).click();
  130 |   await expect(guest.getByRole('button', { name: /Start the lift/ })).toBeVisible();
  131 |   const next: Snapshot = await (
  132 |     await request.get('/api/rooms/' + code, { headers: { 'x-overload-session': lateToken } })
  133 |   ).json();
  134 |   expect(next.players.find((p) => p.id === next.meId)?.seat).toBe(true);
  135 |   expect(errors).toEqual([]);
  136 |   expect(network.failures).toEqual([]);
  137 |   expect(streamDurations.some((n) => n >= 25000 && n <= 50000)).toBe(true);
  138 |   await info.attach('reveal-sync-measurements', {
  139 |     body: JSON.stringify(measurements, null, 2),
  140 |     contentType: 'application/json',
  141 |   });
  142 |   await info.attach('network-audit', {
  143 |     body: JSON.stringify({ ...network, streamDurations, errors }, null, 2),
  144 |     contentType: 'application/json',
  145 |   });
  146 |   console.log('REVEAL_SYNC_MS', JSON.stringify(measurements));
  147 |   console.log('NETWORK_AUDIT', JSON.stringify({ ...network, streamDurations, errors }));
  148 |   await Promise.all(contexts.map((c) => c.close()));
  149 | });
  150 |
```
