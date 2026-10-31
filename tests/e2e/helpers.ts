import { expect, type Page } from '@playwright/test';
export async function trackReveals(page: Page) {
  await page.addInitScript(() => {
    const w = window as unknown as { reveals: unknown[] };
    w.reveals = [];
    window.addEventListener('overload:reveal', (e) => w.reveals.push((e as CustomEvent).detail));
  });
}
export async function fitsPhone(page: Page) {
  for (const id of ['signal-chips', 'crate-picker', 'lock-button']) {
    const box = await page.getByTestId(id).boundingBox();
    expect(box).not.toBeNull();
    expect(box!.y).toBeGreaterThanOrEqual(0);
    expect(box!.y + box!.height).toBeLessThanOrEqual(page.viewportSize()!.height);
    expect(box!.x + box!.width).toBeLessThanOrEqual(page.viewportSize()!.width);
  }
  expect(
    await page.evaluate(
      () =>
        document.documentElement.scrollHeight <= innerHeight &&
        document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
}
export async function revealSkew(pages: Page[], round: number) {
  const timestamps = await Promise.all(
    pages.map((p) =>
      p.evaluate(
        (r) =>
          (window as unknown as { reveals: { round: number; actualAt: number }[] }).reveals.find(
            (x) => x.round === r,
          )?.actualAt,
        round,
      ),
    ),
  );
  expect(timestamps.every((n) => typeof n === 'number')).toBe(true);
  return Math.max(...(timestamps as number[])) - Math.min(...(timestamps as number[]));
}
