import { describe, expect, it } from 'vitest';
import { botChoice, rankPlayers, resolvedLoad, scoreRound, seededRandom, weightLimit } from '../../src/game/rules';
const players = [1, 2, 3, 4].map(n => ({ id: `${n}`, name: `Guest ${n}`, score: 0 }));
describe('the lift ledger', () => {
  it('banks all crates at or below the limit', () => { const r = scoreRound(1, 12, players, { 1: 3, 2: 3, 3: 3, 4: 3 }, {}); expect(r.fits).toBe(true); expect(r.entries.map(e => e.delta)).toEqual([3, 3, 3, 3]); });
  it('blames heaviest and salvages lightest without banking on a snap', () => { const r = scoreRound(1, 10, players, { 1: 1, 2: 3, 3: 4, 4: 6 }, {}); expect(r.fits).toBe(false); expect(r.entries.map(e => e.delta)).toEqual([2, 0, 0, -3]); });
  it('applies blame and salvage to every tied player', () => { expect(scoreRound(1, 10, players, { 1: 2, 2: 2, 3: 6, 4: 6 }, {}).entries.map(e => e.delta)).toEqual([2, 2, -3, -3]); });
  it('applies both when everyone ties on a snap', () => { expect(scoreRound(1, 10, players, { 1: 4, 2: 4, 3: 4, 4: 4 }, {}).entries.map(e => e.delta)).toEqual([-1, -1, -1, -1]); });
  it('auto-loads exactly three', () => { expect(resolvedLoad(undefined)).toBe(3); expect(scoreRound(1, 20, players, {}, {}).total).toBe(12); });
  it.each([7, 8])('doubles all point changes in round %i', round => { expect(scoreRound(round, 10, players, { 1: 1, 2: 3, 3: 4, 4: 6 }, {}).entries.map(e => e.delta)).toEqual([4, 0, 0, -6]); expect(scoreRound(round, 24, players, { 1: 6, 2: 6, 3: 6, 4: 6 }, {}).entries[0].delta).toBe(12); });
  it.each([2, 3, 4, 5, 6, 7, 8])('bounds the limit for %i players', n => { for (const delta of [-2, -1, 1, 2]) { const limit = weightLimit(n, delta); expect(limit).toBeGreaterThanOrEqual(n); expect(limit).toBeLessThanOrEqual(5 * n); expect(limit).toBe(Math.round(3.5 * n) + delta); } });
  it('breaks score ties by fewest snaps', () => { expect(rankPlayers([{ score: 8, snaps: 3 }, { score: 8, snaps: 1 }])[0].snaps).toBe(1); });
  it('gives bots their promised personalities', () => { expect(botChoice('sam', () => .4, 2).load).toBe(3); expect(botChoice('gus', () => .8, 2).load).toBe(6); expect(botChoice('lou', () => .8, 2)).toEqual({ load: 5, signal: 'light' }); expect(botChoice('mel', () => .8, 2).load).toBe(2); expect(seededRandom('round')()).toBe(seededRandom('round')()); });
});
