import { test, expect } from '@playwright/test';
import { randomUUID } from 'node:crypto';
import { fitsPhone, revealSkew, trackReveals } from './helpers';
import type { Snapshot } from '../../src/game/types';

test('API rejects invalid and unauthorized input and deduplicates concurrent requests', async ({
  request,
}) => {
  const token = randomUUID(),
    other = randomUUID();
  const headers = { 'x-overload-session': token };
  const data = {
    name: 'Retry guest',
    avatar: { hat: 0, color: 0 },
    solo: false,
    requestId: randomUUID(),
  };
  const rooms = await Promise.all(
    Array.from({ length: 3 }, async () => {
      const response = await request.post('/api/rooms', { headers, data });
      expect(response.ok()).toBe(true);
      return response.json() as Promise<Snapshot>;
    }),
  );
  expect(new Set(rooms.map((r) => r.code)).size).toBe(1);
  expect(new Set(rooms.map((r) => r.meId)).size).toBe(1);
  const url = '/api/rooms/' + rooms[0].code,
    bot = { requestId: randomUUID(), action: { type: 'add-bot', personality: 'sam' } };
  const added = await Promise.all(
    Array.from({ length: 3 }, async () => {
      const response = await request.post(url, { headers, data: bot });
      expect(response.ok()).toBe(true);
      return response.json() as Promise<Snapshot>;
    }),
  );
  for (const room of added) expect(room.players).toHaveLength(2);
  expect((await request.post(url, { data: bot })).status()).toBe(401);
  expect(
    (
      await request.post(url, {
        headers,
        data: { requestId: randomUUID(), action: { type: 'load', load: 7, round: 1, game: 1 } },
      })
    ).status(),
  ).toBe(400);
  expect(
    (
      await request.post(url, {
        headers: { ...headers, origin: 'https://unrelated.example' },
        data: bot,
      })
    ).status(),
  ).toBe(403);
  await request.post(url, {
    headers: { 'x-overload-session': other },
    data: {
      requestId: randomUUID(),
      action: { type: 'join', name: 'Other', avatar: { hat: 1, color: 1 } },
    },
  });
  expect(
    (
      await request.post(url, {
        headers: { 'x-overload-session': other },
        data: { requestId: randomUUID(), action: { type: 'start' } },
      })
    ).status(),
  ).toBe(403);
  await request.post(url, {
    headers,
    data: { requestId: randomUUID(), action: { type: 'start' } },
  });
  await expect
    .poll(async () => (await (await request.get(url)).json()).phase, { timeout: 12000 })
    .toBe('load');
  const load = { requestId: randomUUID(), action: { type: 'load', load: 6, round: 1, game: 1 } };
  await request.post(url, { headers, data: load });
  await request.post(url, { headers, data: load });
  const owner: Snapshot = await (await request.get(url, { headers })).json();
  const publicState: Snapshot = await (await request.get(url)).json();
  expect(owner.myLoad).toBe(6);
  expect(publicState.myLoad).toBeNull();
  expect(publicState.meId).toBeNull();
  expect(publicState.result).toBeNull();
  expect(publicState.history).toEqual([]);
  for (const privateField of ['sessionHash', 'creationId', 'plans', 'lastHumanLoad'])
    expect(JSON.stringify(publicState)).not.toContain(privateField);
  const changed: Snapshot = await (
    await request.post(url, {
      headers,
      data: { requestId: randomUUID(), action: { type: 'load', load: 1, round: 1, game: 1 } },
    })
  ).json();
  expect(changed.myLoad).toBe(6);
});

test('eight-player snap fits both phones, polling stays synchronized, and host absence transfers', async ({
  browser,
  request,
}, info) => {
  const tokens = Array.from({ length: 8 }, () => randomUUID());
  const created = await request.post('/api/rooms', {
    headers: { 'x-overload-session': tokens[0] },
    data: { name: 'Guest 1', avatar: { hat: 0, color: 0 }, solo: false, requestId: randomUUID() },
  });
  expect(created.ok()).toBe(true);
  const room: Snapshot = await created.json(),
    url = '/api/rooms/' + room.code;
  for (let i = 1; i < 8; i++) {
    const joined = await request.post(url, {
      headers: { 'x-overload-session': tokens[i] },
      data: {
        requestId: randomUUID(),
        action: { type: 'join', name: 'Guest ' + (i + 1), avatar: { hat: i % 4, color: i % 6 } },
      },
    });
    expect(joined.ok()).toBe(true);
  }
  const contexts = await Promise.all([
    browser.newContext({ viewport: { width: 375, height: 667 }, reducedMotion: 'reduce' }),
    browser.newContext({ viewport: { width: 390, height: 844 } }),
  ]);
  for (let i = 0; i < 2; i++)
    await contexts[i].addInitScript(
      (token) => localStorage.setItem('overload:session', token),
      tokens[i],
    );
  let pollingRequests = 0;
  await contexts[0].route('**/events', (route) => route.abort());
  const [host, guest] = await Promise.all(contexts.map((c) => c.newPage()));
  host.on('request', (r) => {
    if (r.method() === 'GET' && new URL(r.url()).pathname === url) pollingRequests++;
  });
  for (const page of [host, guest]) {
    await trackReveals(page);
    await page.goto('/room/' + room.code);
  }
  await host.getByRole('button', { name: /Start the lift/ }).click();
  await expect(host.getByTestId('controller')).toHaveAttribute('data-phase', 'signal');
  await host.keyboard.press('l');
  await expect(host.getByRole('button', { name: /Going light/ })).toHaveAttribute(
    'aria-pressed',
    'true',
  );
  await fitsPhone(host);
  await fitsPhone(guest);
  await expect(host.getByTestId('controller')).toHaveAttribute('data-phase', 'load');
  await host.keyboard.press('6');
  await host.keyboard.press('Enter');
  await Promise.all(
    tokens.slice(1).map(async (token) => {
      const response = await request.post(url, {
        headers: { 'x-overload-session': token },
        data: { requestId: randomUUID(), action: { type: 'load', load: 6, round: 1, game: 1 } },
      });
      expect(response.ok()).toBe(true);
    }),
  );
  for (const page of [host, guest])
    await expect(page.getByTestId('reveal-result')).toContainText('SNAP!');
  const skewMs = await revealSkew([host, guest], 1);
  expect(skewMs).toBeLessThanOrEqual(250);
  expect(pollingRequests).toBeGreaterThan(2);
  await expect(host.locator('.blame-scene')).toBeVisible();
  await expect(host.locator('.blame-avatars > div')).toHaveCount(8);
  expect(
    await host.getByTestId('elevator-stage').evaluate((el) => getComputedStyle(el).animationName),
  ).toBe('snap-flash');
  await fitsPhone(host);
  await fitsPhone(guest);
  await host.screenshot({ path: info.outputPath('eight-player-snap-375.png') });
  await info.attach('eight-player-snap', {
    path: info.outputPath('eight-player-snap-375.png'),
    contentType: 'image/png',
  });
  const second: Snapshot = await (
    await request.get(url, { headers: { 'x-overload-session': tokens[1] } })
  ).json();
  await host.goto('about:blank');
  await expect
    .poll(async () => (await (await request.get(url)).json()).hostId, {
      timeout: 18000,
      intervals: [500],
    })
    .toBe(second.meId);
  console.log('POLLING_REVEAL_SYNC_MS', skewMs);
  await info.attach('polling-sync', {
    body: JSON.stringify({ skewMs, pollingRequests }),
    contentType: 'application/json',
  });
  await Promise.all(contexts.map((c) => c.close()));
});

test('practice teaches all three outcomes, starts automatically, and remembers mute', async ({
  page,
}) => {
  await page.setViewportSize({ width: 375, height: 667 });
  await page.goto('/');
  await page.getByRole('button', { name: 'Play now vs bots' }).click();
  await expect(page).toHaveURL('/practice');
  const sound = page.getByRole('button', { name: 'Mute sound', exact: true });
  if (await sound.isVisible()) await sound.click();
  await expect(page.getByText('FIT → BANK YOUR CRATES')).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollHeight <= innerHeight)).toBe(
    true,
  );
  await expect(page.getByText('SNAP → HEAVIEST LOSES 3')).toBeVisible({ timeout: 6500 });
  await expect(page.getByText('LIGHTEST → SALVAGE +2')).toBeVisible({ timeout: 6500 });
  await expect(page).toHaveURL(/\/room\/[A-Z]{4}$/, { timeout: 8000 });
  await expect(page.getByTestId('controller')).toBeVisible();
  await page.reload();
  await expect(page.getByRole('button', { name: 'Unmute sound', exact: true })).toBeVisible();
});
