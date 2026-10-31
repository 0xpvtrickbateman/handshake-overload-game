import { describe, expect, it } from 'vitest';
import { advanceRoom, applyAction, createRoom, publicSnapshot } from '../../src/game/engine';
const avatar = { hat: 0, color: 0 };
const make = () => createRoom('TEST', 'host-hash', 'Host', avatar, 1000, false, 'host', true);
describe('authoritative room progression', () => {
  it('finishes eight rounds even when every human misses every deadline', () => {
    const r = make();
    applyAction(r, 'host-hash', { type: 'fill-bots' }, 1000, 'bot');
    applyAction(r, 'host-hash', { type: 'start' }, 1000, 'x');
    for (let i = 0; i < 24; i++) advanceRoom(r, r.phaseEndsAt + 1);
    expect(r.phase).toBe('finished');
    expect(r.history).toHaveLength(8);
    expect(r.history[0].entries[0].load).toBe(3);
    expect(r.players[0].missed).toBeGreaterThan(0);
  });
  it('keeps loads private until reveal and refuses a second different load', () => {
    const r = createRoom('TEST', 'hash', 'Host', avatar, 1000, true, 'host', true);
    advanceRoom(r, r.phaseEndsAt);
    applyAction(r, 'hash', { type: 'load', load: 6, round: 1, game: 1 }, 2300, 'x');
    applyAction(r, 'hash', { type: 'load', load: 1, round: 1, game: 1 }, 2301, 'x');
    const publicState = publicSnapshot(r, null, 2302);
    expect(publicState.myLoad).toBeNull();
    expect(publicState.result).toBeNull();
    expect(publicState.history).toEqual([]);
    expect(JSON.stringify(publicState)).not.toContain('sessionHash');
    expect(r.loads.host).toBe(6);
  });
  it('transfers a departed host and seats a late joiner only next game', () => {
    const r = createRoom('TEST', 'hash', 'Host', avatar, 1000, true, 'host', true);
    applyAction(r, 'guest', { type: 'join', name: 'Guest', avatar }, 1100, 'guest');
    expect(r.players.at(-1)?.seat).toBe(false);
    applyAction(r, 'hash', { type: 'leave' }, 1200, 'x');
    expect(r.hostId).toBe('guest');
    for (let i = 0; i < 24; i++) advanceRoom(r, r.phaseEndsAt + 1);
    applyAction(r, 'guest', { type: 'rematch' }, r.revealAt + 5000, 'x');
    expect(r.phase).toBe('lobby');
    expect(r.players.find((p) => p.id === 'guest')?.seat).toBe(true);
    expect(r.game).toBe(2);
  });
  it('does not accept stale round actions', () => {
    const r = createRoom('TEST', 'hash', 'Host', avatar, 1000, true, 'host', true);
    expect(() =>
      applyAction(r, 'hash', { type: 'load', load: 3, round: 8, game: 1 }, 1100, 'x'),
    ).toThrow('already left');
  });
});

it('Mirror Mel copies the most recently confirmed human load without exposing the plan', () => {
  const r = make();
  applyAction(r, 'guest', { type: 'join', name: 'Guest', avatar }, 1000, 'guest');
  applyAction(r, 'host-hash', { type: 'add-bot', personality: 'mel' }, 1000, 'mel');
  applyAction(r, 'host-hash', { type: 'start' }, 1000, 'x');
  advanceRoom(r, r.phaseEndsAt);
  applyAction(r, 'host-hash', { type: 'load', load: 2, round: 1, game: 1 }, 2201, 'x');
  applyAction(r, 'guest', { type: 'load', load: 5, round: 1, game: 1 }, 2202, 'x');
  applyAction(r, 'host-hash', { type: 'load', load: 6, round: 1, game: 1 }, 2203, 'x');
  advanceRoom(r, r.phaseEndsAt);
  advanceRoom(r, r.phaseEndsAt);
  expect(r.round).toBe(2);
  expect(r.plans.mel.load).toBe(5);
  expect(JSON.stringify(publicSnapshot(r, null, r.phaseEndsAt - 1))).not.toContain('plans');
});

it('anonymous TV viewers never inherit a bot seat or its hidden load', () => {
  const r = createRoom('TEST', 'hash', 'Host', avatar, 1000, true, 'host', true);
  advanceRoom(r, r.phaseEndsAt);
  for (const p of r.players.filter((p) => p.bot)) r.loads[p.id] = 6;
  const view = publicSnapshot(r, null, r.phaseEndsAt - 1);
  expect(view.meId).toBeNull();
  expect(view.myLoad).toBeNull();
  expect(view.result).toBeNull();
  expect(view.history).toEqual([]);
});
