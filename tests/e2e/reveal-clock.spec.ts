import { expect, test, type Page } from '@playwright/test';

// The car's fall, tumble and lift are scrubbed by the shared reveal clock (--shake-delay),
// not by each browser's own animation clock. If the browser clock also advanced, a car
// mounted early would be twice as far through its fall as one mounted late at the same
// reveal time, and phones would disagree about the pose.
async function clockDrift(page: Page, names: string[]) {
  return page.evaluate((names) => {
    return document
      .getAnimations()
      .filter(
        (a): a is CSSAnimation => a instanceof CSSAnimation && names.includes(a.animationName),
      )
      .map((a) => {
        const timing = a.effect!.getComputedTiming();
        const delay = Number(timing.delay ?? 0),
          duration = Number(timing.duration);
        // The shared clock puts this animation at -delay ms in; the pose must be exactly there.
        const target = Math.min(1, Math.max(0, -delay / duration));
        return { name: a.animationName, delay, target, actual: Number(timing.progress ?? 0) };
      });
  }, names);
}

for (const { lesson, verdict, names } of [
  { lesson: 'FIT → BANK YOUR CRATES', verdict: 'IT FITS!', names: ['platform-rise'] },
  {
    lesson: 'SNAP → HEAVIEST LOSES 3',
    verdict: 'SNAP!',
    names: ['platform-fall', 'cargo-tumble'],
  },
]) {
  test(`reveal animation follows the shared clock: ${verdict}`, async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto('/practice');
    await expect(page.getByText(lesson)).toBeVisible({ timeout: 8000 });
    await expect(page.getByTestId('reveal-result').getByText(verdict)).toBeVisible({
      timeout: 6000,
    });
    // Sample mid-motion, while the browser's own clock has been running alongside.
    await page.waitForTimeout(180);
    const rows = await clockDrift(page, names);
    expect(rows.length).toBeGreaterThan(0);
    for (const r of rows) {
      // Progress must match the shared clock (one 33 ms render tick of slack), not run ahead.
      expect(Math.abs(r.actual - r.target), JSON.stringify(r)).toBeLessThan(0.12);
    }
  });
}
