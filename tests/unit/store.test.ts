import { afterEach, describe, expect, it, vi } from 'vitest';
import { randomUUID } from 'node:crypto';
import { newRoom, roomTransaction, rateLimit } from '../../src/server/store';
import { applyAction } from '../../src/game/engine';
import type { Room } from '../../src/game/types';
const avatar = { hat: 0, color: 0 };
afterEach(() => {
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
});
function useMemory() {
  vi.stubEnv('OVERLOAD_TEST_MODE', '1');
  vi.stubEnv('VERCEL', '');
  vi.stubEnv('OVERLOAD_TEST_REDIS', '');
}
describe('atomic room transactions', () => {
  it('rereads the room when a concurrent action commits before its receipt is checked', async () => {
    useMemory();
    const hash = randomUUID(),
      requestId = randomUUID();
    const room = await newRoom(hash, 'Host', avatar, false, randomUUID());
    const memory = (globalThis as typeof globalThis & { overloadMemory: Map<string, string> })
      .overloadMemory;
    const get = memory.get.bind(memory),
      roomKey = 'overload:test:v1:room:' + room.code;
    let committed = false;
    vi.spyOn(memory, 'get').mockImplementation((key) => {
      if (key.startsWith('overload:test:v1:action:') && !committed) {
        committed = true;
        const winner: Room = JSON.parse(get(roomKey)!);
        applyAction(
          winner,
          hash,
          { type: 'add-bot', personality: 'sam' },
          Date.now(),
          randomUUID(),
        );
        winner.actionIds.push(hash + ':' + requestId);
        winner.version++;
        memory.set(roomKey, JSON.stringify(winner));
        memory.set(key, '1');
      }
      return get(key);
    });
    const retried = await roomTransaction(
      room.code,
      hash,
      { type: 'add-bot', personality: 'sam' },
      requestId,
    );
    expect(committed).toBe(true);
    expect(retried.players).toHaveLength(2);
    expect(retried.version).toBe(room.version + 1);
  });
  it('returns one room and one seat for concurrent create retries', async () => {
    useMemory();
    const hash = randomUUID(),
      requestId = randomUUID();
    const rooms = await Promise.all(
      Array.from({ length: 6 }, () => newRoom(hash, 'Host', avatar, false, requestId)),
    );
    expect(new Set(rooms.map((r) => r.code)).size).toBe(1);
    expect(new Set(rooms.map((r) => r.meId)).size).toBe(1);
  });
  it('keeps action receipts after the in-room cache rolls over', async () => {
    useMemory();
    const hash = randomUUID(),
      creation = randomUUID();
    const room = await newRoom(hash, 'Host', avatar, false, creation),
      id = randomUUID();
    await Promise.all(
      Array.from({ length: 4 }, () =>
        roomTransaction(room.code, hash, { type: 'add-bot', personality: 'sam' }, id),
      ),
    );
    for (let i = 0; i < 130; i++)
      await roomTransaction(room.code, hash, { type: 'heartbeat' }, randomUUID());
    const replay = await roomTransaction(
      room.code,
      hash,
      { type: 'add-bot', personality: 'sam' },
      id,
    );
    expect(replay.players).toHaveLength(2);
    expect((await newRoom(hash, 'Host', avatar, false, creation)).code).toBe(room.code);
  });
});

it('rate limits each identity and opens a fresh time bucket', async () => {
  useMemory();
  const now = vi.spyOn(Date, 'now').mockReturnValue(1000);
  const identity = randomUUID();
  await rateLimit(identity, 2);
  await rateLimit(identity, 2);
  await expect(rateLimit(identity, 2)).rejects.toMatchObject({ status: 429 });
  await expect(rateLimit(randomUUID(), 2)).resolves.toBeUndefined();
  now.mockReturnValue(61000);
  await expect(rateLimit(identity, 2)).resolves.toBeUndefined();
});
