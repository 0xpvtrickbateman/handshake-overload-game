import { test, expect, type Page } from '@playwright/test';

async function trackReveals(page: Page) {
  await page.addInitScript(() => { (window as unknown as { reveals: unknown[] }).reveals = []; window.addEventListener('overload:reveal', e => { (window as unknown as { reveals: unknown[] }).reveals.push((e as CustomEvent).detail); }); });
}
async function fitsPhone(page: Page) {
  for (const id of ['signal-chips', 'crate-picker', 'lock-button']) {
    const box = await page.getByTestId(id).boundingBox(); expect(box).not.toBeNull(); expect(box!.y).toBeGreaterThanOrEqual(0); expect(box!.y + box!.height).toBeLessThanOrEqual(page.viewportSize()!.height); expect(box!.x + box!.width).toBeLessThanOrEqual(page.viewportSize()!.width);
  }
  expect(await page.evaluate(() => document.documentElement.scrollHeight <= innerHeight)).toBe(true);
}
test('two humans and TV complete eight synchronized lifts, refresh, leave, and rematch', async ({ browser }, info) => {
  const contexts = await Promise.all([browser.newContext({ viewport: { width: 375, height: 667 } }), browser.newContext({ viewport: { width: 390, height: 844 } }), browser.newContext({ viewport: { width: 1280, height: 800 } })]);
  const [host, guest, tv] = await Promise.all(contexts.map(c => c.newPage()));
  for (const p of [host, guest, tv]) await trackReveals(p);
  const consoleErrors: string[] = [];
  for (const p of [host, guest, tv]) p.on('pageerror', e => consoleErrors.push(e.message));
  await host.goto('/'); await host.getByRole('button', { name: 'Host a room', exact: true }).click(); await host.getByLabel('YOUR NAME AT THE DESK').fill('Ada'); await host.getByRole('button', { name: /^Create room/ }).click(); await expect(host).toHaveURL(/\/room\/[A-Z]{4}$/);
  const code = host.url().split('/').at(-1)!;
  await guest.goto(`/room/${code}`); await guest.getByLabel('YOUR NAME AT THE DESK').fill('Grace'); await guest.getByRole('button', { name: /Join the lift/ }).click();
  await expect(host.getByText('Grace', { exact: true })).toBeVisible();
  await host.getByRole('button', { name: 'Fill to 4 with bots' }).click();
  await tv.goto(`/tv/${code}`);
  await host.getByRole('button', { name: /Start the lift/ }).click();
  const measurements: { round: number; skewMs: number }[] = [];
  for (let round = 1; round <= 8; round++) {
    await expect(host.getByTestId('controller')).toHaveAttribute('data-round', String(round));
    if (round === 1) { await fitsPhone(host); await fitsPhone(guest); }
    await expect(host.getByTestId('controller')).toHaveAttribute('data-phase', 'load');
    await host.getByRole('button', { name: 'Load 2 crates', exact: true }).click(); await host.getByTestId('lock-button').click();
    if (round === 2) { await host.reload(); await expect(host.getByTestId('lock-button')).toContainText('2 crates locked'); }
    if (round === 3) { await guest.goto('about:blank'); }
    if (round !== 3) { await expect(guest.getByTestId('controller')).toHaveAttribute('data-phase', 'load'); await guest.getByRole('button', { name: 'Load 6 crates', exact: true }).click(); await guest.getByTestId('lock-button').click(); }
    const screens = round === 3 ? [host, tv] : [host, guest, tv];
    for (const p of screens) await expect(p.getByTestId('reveal-result')).toBeVisible();
    const states = await Promise.all(screens.map(p => p.getByTestId('controller').evaluate(el => ({ phase: el.getAttribute('data-phase'), total: el.getAttribute('data-total'), scores: el.getAttribute('data-scores') }))));
    for (const state of states) expect(state).toEqual(states[0]);
    const timestamps = await Promise.all(screens.map(p => p.evaluate(r => (window as unknown as { reveals: { round: number; actualAt: number }[] }).reveals.find(x => x.round === r)?.actualAt, round)));
    expect(timestamps.every(n => typeof n === 'number')).toBe(true);
    const skewMs = Math.max(...timestamps as number[]) - Math.min(...timestamps as number[]); measurements.push({ round, skewMs }); expect(skewMs).toBeLessThanOrEqual(250);
    if (round === 3) { await guest.goto(`/room/${code}`); await expect(guest.getByTestId('controller')).toBeVisible(); }
  }
  for (const p of [host, guest, tv]) await expect(p.getByText('One more lift?', { exact: false }).or(p.getByText('Back to the hotel', { exact: true })).first()).toBeVisible();
  await host.getByRole('button', { name: 'Leave room', exact: true }).click(); await expect(host).toHaveURL('/');
  await guest.getByRole('button', { name: /One more lift/ }).click(); await expect(guest.getByRole('button', { name: /Start the lift/ })).toBeVisible();
  expect(consoleErrors).toEqual([]);
  await info.attach('reveal-sync-measurements', { body: JSON.stringify(measurements, null, 2), contentType: 'application/json' });
  console.log('REVEAL_SYNC_MS', JSON.stringify(measurements));
  await Promise.all(contexts.map(c => c.close()));
});
