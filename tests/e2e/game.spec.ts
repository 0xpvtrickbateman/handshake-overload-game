import { test, expect } from '@playwright/test';
import { randomUUID } from 'node:crypto';
import { fitsPhone, revealSkew, trackReveals } from './helpers';
import type { Snapshot } from '../../src/game/types';

test('two humans and TV complete eight synchronized lifts, refresh, leave, and rematch', async ({
  browser,
  request,
}, info) => {
  const contexts = await Promise.all([
    browser.newContext({ viewport: { width: 375, height: 667 } }),
    browser.newContext({ viewport: { width: 390, height: 844 } }),
    browser.newContext({ viewport: { width: 1280, height: 800 } }),
  ]);
  const [host, guest, tv] = await Promise.all(contexts.map((c) => c.newPage()));
  const errors: string[] = [],
    streamDurations: number[] = [];
  const network = { streams: 0, polls: 0, failures: [] as string[] };
  for (const p of [host, guest, tv]) {
    await trackReveals(p);
    p.on('pageerror', (e) => errors.push(e.message));
    p.on('console', (m) => {
      if (m.type() === 'error') errors.push(m.text());
    });
    p.on('response', (r) => {
      if (!r.url().includes('/api/')) return;
      if (r.status() >= 400) network.failures.push(new URL(r.url()).pathname + ' ' + r.status());
      if (r.url().endsWith('/events')) network.streams++;
      else if (r.request().method() === 'GET' && r.url().includes('/rooms/')) network.polls++;
    });
    p.on('requestfinished', (r) => {
      if (r.url().endsWith('/events')) streamDurations.push(Math.round(r.timing().responseEnd));
    });
  }
  await host.goto('/');
  await host.getByRole('button', { name: 'Host a room', exact: true }).click();
  await host.getByLabel('YOUR NAME AT THE DESK').fill('Ada');
  await host.getByRole('button', { name: /^Create room/ }).click();
  await expect(host).toHaveURL(/\/room\/[A-Z]{4}$/);
  const code = host.url().split('/').at(-1)!;
  await guest.goto('/room/' + code);
  await guest.getByLabel('YOUR NAME AT THE DESK').fill('Grace');
  await guest.getByRole('button', { name: /Join the lift/ }).click();
  await expect(host.getByText('Grace', { exact: true })).toBeVisible();
  await host.getByRole('button', { name: 'Fill to 4 with bots' }).click();
  await expect(host.locator('.guest-list').getByText('Greedy Gus', { exact: true })).toBeVisible();
  await tv.goto('/tv/' + code);
  await host.getByRole('button', { name: /Start the lift/ }).click();
  const measurements: { round: number; skewMs: number }[] = [];
  const lateToken = randomUUID();
  for (let round = 1; round <= 8; round++) {
    await expect(host.getByTestId('controller')).toHaveAttribute('data-round', String(round));
    if (round === 1) {
      await fitsPhone(host);
      await fitsPhone(guest);
    }
    await expect(host.getByTestId('controller')).toHaveAttribute('data-phase', 'load');
    await host.getByRole('button', { name: 'Load 2 crates', exact: true }).click();
    await host.getByTestId('lock-button').click();
    if (round === 2) {
      await host.reload();
      await expect(host.getByTestId('lock-button')).toContainText('2 crates locked');
    }
    if (round === 3) await guest.goto('about:blank');
    if (round !== 3) {
      await expect(guest.getByTestId('controller')).toHaveAttribute('data-phase', 'load');
      await guest.getByRole('button', { name: 'Load 6 crates', exact: true }).click();
      await guest.getByTestId('lock-button').click();
    }
    const screens = round === 3 ? [host, tv] : [host, guest, tv];
    for (const p of screens) await expect(p.getByTestId('reveal-result')).toBeVisible();
    const states = await Promise.all(
      screens.map((p) =>
        p
          .getByTestId('controller')
          .evaluate((el) => ({
            phase: el.getAttribute('data-phase'),
            total: el.getAttribute('data-total'),
            scores: el.getAttribute('data-scores'),
          })),
      ),
    );
    for (const state of states) expect(state).toEqual(states[0]);
    const skewMs = await revealSkew(screens, round);
    measurements.push({ round, skewMs });
    expect(skewMs).toBeLessThanOrEqual(250);
    const scores: [string, number][] = JSON.parse(states[0].scores!);
    for (const p of screens)
      for (const [id, score] of scores)
        await expect(p.locator('[data-player-score="' + id + '"]')).toHaveText(score + ' PT');
    if (round === 3) {
      await guest.goto('/room/' + code);
      await expect(guest.getByTestId('controller')).toBeVisible();
    }
    if (round === 4) {
      const response = await request.post('/api/rooms/' + code, {
        headers: { 'x-overload-session': lateToken },
        data: {
          requestId: randomUUID(),
          action: { type: 'join', name: 'Late guest', avatar: { hat: 2, color: 5 } },
        },
      });
      expect(response.ok()).toBe(true);
      const state: Snapshot = await response.json();
      expect(state.players.find((p) => p.id === state.meId)?.seat).toBe(false);
    }
  }
  for (const p of [host, guest, tv])
    await expect(
      p
        .getByText('One more lift?', { exact: false })
        .or(p.getByText('Back to the hotel', { exact: true }))
        .first(),
    ).toBeVisible();
  for (const award of ['The Breaker', 'The Saint', 'Honest Abe', 'Dark Horse'])
    await expect(host.getByText(award, { exact: true })).toBeVisible();
  await host.getByRole('button', { name: 'Open the guest ledger' }).click();
  await expect(host.locator('.round-ledger')).toHaveCount(8);
  await host.getByRole('button', { name: 'Close ledger' }).click();
  const download = host.waitForEvent('download');
  await host.getByRole('button', { name: 'Share the evidence ↗' }).click();
  const image = await download;
  expect(image.suggestedFilename()).toBe('OVERLOAD-' + code + '.png');
  await image.saveAs(info.outputPath('results.png'));
  await info.attach('results-image', {
    path: info.outputPath('results.png'),
    contentType: 'image/png',
  });
  await host.getByRole('button', { name: 'Leave room', exact: true }).click();
  await expect(host).toHaveURL('/');
  await guest.getByRole('button', { name: /One more lift/ }).click();
  await expect(guest.getByRole('button', { name: /Start the lift/ })).toBeVisible();
  const next: Snapshot = await (
    await request.get('/api/rooms/' + code, { headers: { 'x-overload-session': lateToken } })
  ).json();
  expect(next.players.find((p) => p.id === next.meId)?.seat).toBe(true);
  expect(errors).toEqual([]);
  expect(network.failures).toEqual([]);
  expect(streamDurations.some((n) => n >= 25000 && n <= 50000)).toBe(true);
  await info.attach('reveal-sync-measurements', {
    body: JSON.stringify(measurements, null, 2),
    contentType: 'application/json',
  });
  await info.attach('network-audit', {
    body: JSON.stringify({ ...network, streamDurations, errors }, null, 2),
    contentType: 'application/json',
  });
  console.log('REVEAL_SYNC_MS', JSON.stringify(measurements));
  console.log('NETWORK_AUDIT', JSON.stringify({ ...network, streamDurations, errors }));
  await Promise.all(contexts.map((c) => c.close()));
});
