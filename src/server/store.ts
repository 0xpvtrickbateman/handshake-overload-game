import { Redis } from '@upstash/redis';
import { createHash, randomInt, randomUUID } from 'node:crypto';
import { advanceRoom, applyAction, createRoom, GameError, publicSnapshot } from '@/game/engine';
import type { Action, Avatar, Room, Snapshot } from '@/game/types';

const TTL = 6 * 60 * 60;
const testMode = () => process.env.OVERLOAD_TEST_MODE === '1' && !process.env.VERCEL;
const memoryMode = () => testMode() && process.env.OVERLOAD_TEST_REDIS !== '1';
const namespace = () => (testMode() ? 'overload:test:v1:' : 'overload:v1:');
const globalStore = globalThis as typeof globalThis & {
  overloadMemory?: Map<string, string>;
  overloadRates?: Map<string, { count: number; until: number }>;
};
const memory = () => (globalStore.overloadMemory ??= new Map());
let redis: Redis | undefined;
function db() {
  return (redis ??= new Redis({
    url: process.env.KV_REST_API_URL ?? process.env.UPSTASH_REDIS_REST_URL!,
    token: process.env.KV_REST_API_TOKEN ?? process.env.UPSTASH_REDIS_REST_TOKEN!,
    automaticDeserialization: false,
    retry: false,
    signal: () => AbortSignal.timeout(3000),
  }));
}
export const sessionHash = (token: string) => createHash('sha256').update(token).digest('hex');
const key = (code: string) => namespace() + 'room:' + code;
const actionKey = (code: string, hash: string, requestId: string) =>
  namespace() + 'action:' + code + ':' + sessionHash(hash + requestId);
async function read(key: string) {
  return memoryMode() ? (memory().get(key) ?? null) : db().get<string>(key);
}
async function cas(code: string, old: string, next: string, receipt?: string) {
  if (memoryMode()) {
    if (receipt && memory().has(receipt)) return 2;
    if (memory().get(key(code)) !== old) return 0;
    memory().set(key(code), next);
    if (receipt) memory().set(receipt, '1');
    return 1;
  }
  return db().eval<[string, string, number], number>(
    `
    if #KEYS > 1 and redis.call('EXISTS',KEYS[2]) == 1 then return 2 end
    if redis.call('GET',KEYS[1]) ~= ARGV[1] then return 0 end
    redis.call('SET',KEYS[1],ARGV[2],'EX',ARGV[3])
    if #KEYS > 1 then redis.call('SET',KEYS[2],'1','EX',ARGV[3]) end
    return 1`,
    receipt ? [key(code), receipt] : [key(code)],
    [old, next, TTL],
  );
}
export async function rateLimit(identity: string, limit = 90, period = 60) {
  const bucket = namespace() + 'rate:' + identity + ':' + Math.floor(Date.now() / (period * 1000));
  if (memoryMode()) {
    const rates = (globalStore.overloadRates ??= new Map());
    const record = rates.get(bucket) ?? { count: 0, until: Date.now() + period * 1000 };
    record.count++;
    rates.set(bucket, record);
    if (rates.size > 1000) for (const [k, v] of rates) if (v.until < Date.now()) rates.delete(k);
    if (record.count > limit)
      throw new GameError('A little slower, please. Try again shortly.', 429);
  } else {
    const n = await db().eval<[number], number>(
      `local n=redis.call('INCR',KEYS[1]); if n==1 then redis.call('EXPIRE',KEYS[1],ARGV[1]) end; return n`,
      [bucket],
      [period],
    );
    if (n > limit) throw new GameError('A little slower, please. Try again shortly.', 429);
  }
}
export async function newRoom(
  hash: string,
  name: string,
  avatar: Avatar,
  solo: boolean,
  requestId: string,
) {
  const creationId = hash + ':' + requestId;
  const digest = createHash('sha256')
    .update(hash + requestId)
    .digest();
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ';
  const sameRequest = (room: Room) =>
    room.creationId === creationId || room.actionIds.includes('create:' + creationId);
  for (let attempt = 0; attempt < 8; attempt++) {
    const code = Array.from(
      { length: 4 },
      (_, i) => alphabet[digest[attempt * 4 + i] % alphabet.length],
    ).join('');
    const old = await read(key(code));
    if (old) {
      const existing: Room = JSON.parse(old);
      if (sameRequest(existing)) return publicSnapshot(existing, hash, Date.now());
      continue;
    }
    const room = createRoom(code, hash, name, avatar, Date.now(), solo, randomUUID(), testMode());
    room.creationId = creationId;
    const inserted = memoryMode()
      ? !memory().has(key(code)) && !!memory().set(key(code), JSON.stringify(room))
      : await db().set(key(code), JSON.stringify(room), { nx: true, ex: TTL });
    if (inserted) return publicSnapshot(room, hash, Date.now());
    // A concurrent retry may have won SET NX. Return its seat instead of creating another room.
    const winner = await read(key(code));
    if (winner) {
      const existing: Room = JSON.parse(winner);
      if (sameRequest(existing)) return publicSnapshot(existing, hash, Date.now());
    }
  }
  throw new GameError('The desk is busy. Please try creating your room again.', 503);
}
export async function roomTransaction(
  code: string,
  hash: string | null,
  action?: Action,
  requestId?: string,
): Promise<Snapshot> {
  const receipt =
    action && hash && requestId && action.type !== 'heartbeat'
      ? actionKey(code, hash, requestId)
      : undefined;
  for (let attempt = 0; attempt < 16; attempt++) {
    const raw = await read(key(code));
    if (!raw)
      throw new GameError('That room has checked out. Create a new room or check the code.', 404);
    const room: Room = JSON.parse(raw),
      now = Date.now();
    let changed = advanceRoom(room, now),
      applied = false;
    if (action && hash) {
      const localKey = hash + ':' + requestId;
      if (!room.actionIds.includes(localKey)) {
        // A concurrent commit can land between the room read and this receipt read.
        // Return a snapshot read after that commit, never the earlier room value.
        if (receipt && (await read(receipt))) return roomTransaction(code, hash);
        applyAction(room, hash, action, now, randomUUID());
        room.actionIds.push(localKey);
        room.actionIds = room.actionIds.slice(-128);
        changed = true;
        applied = true;
      }
    }
    if (!changed) return publicSnapshot(room, hash, now);
    room.version++;
    const committed = await cas(code, raw, JSON.stringify(room), applied ? receipt : undefined);
    if (committed === 1) return publicSnapshot(room, hash, Date.now());
    if (committed === 2) return roomTransaction(code, hash);
    await new Promise((resolve) => setTimeout(resolve, randomInt(4, 20)));
  }
  throw new GameError('The desk is catching up. Please try once more.', 503);
}
