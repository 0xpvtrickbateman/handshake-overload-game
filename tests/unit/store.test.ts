import { afterEach, describe, expect, it, vi } from 'vitest';
import { randomUUID } from 'node:crypto';
import { newRoom, roomTransaction } from '../../src/server/store';
const avatar = { hat: 0, color: 0 };
afterEach(() => vi.unstubAllEnvs());
function useMemory() {
  vi.stubEnv('OVERLOAD_TEST_MODE', '1');
  vi.stubEnv('VERCEL', '');
  vi.stubEnv('OVERLOAD_TEST_REDIS', '');
}
describe('atomic room transactions', () => {
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
