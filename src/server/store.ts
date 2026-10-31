import { Redis } from '@upstash/redis';
import { createHash, randomInt, randomUUID } from 'node:crypto';
import { advanceRoom, applyAction, createRoom, GameError, publicSnapshot } from '@/game/engine';
import type { Action, Avatar, Room } from '@/game/types';

const TTL = 6 * 60 * 60;
const testMode = () => process.env.OVERLOAD_TEST_MODE === '1' && !process.env.VERCEL;
const globalStore = globalThis as typeof globalThis & { overloadMemory?: Map<string, string>; overloadRates?: Map<string, { count: number; until: number }> };
const memory = () => globalStore.overloadMemory ??= new Map();
let redis: Redis | undefined;
function db() {
  return redis ??= new Redis({ url: process.env.KV_REST_API_URL ?? process.env.UPSTASH_REDIS_REST_URL!, token: process.env.KV_REST_API_TOKEN ?? process.env.UPSTASH_REDIS_REST_TOKEN!, automaticDeserialization: false });
}
export const sessionHash = (token: string) => createHash('sha256').update(token).digest('hex');
const key = (code: string) => `overload:v1:room:${code}`;
async function get(code: string) { return testMode() ? memory().get(key(code)) ?? null : db().get<string>(key(code)); }
async function cas(code: string, old: string, next: string) {
  if (testMode()) { if (memory().get(key(code)) !== old) return false; memory().set(key(code), next); return true; }
  const result = await db().eval<[string, string, number], number>(`if redis.call('GET',KEYS[1]) == ARGV[1] then redis.call('SET',KEYS[1],ARGV[2],'EX',ARGV[3]); return 1 else return 0 end`, [key(code)], [old, next, TTL]);
  return result === 1;
}
export async function rateLimit(identity: string, limit = 90, period = 60) {
  const bucket = `overload:rate:${identity}:${Math.floor(Date.now() / (period * 1000))}`;
  if (testMode()) {
    const rates = globalStore.overloadRates ??= new Map();
    const record = rates.get(bucket) ?? { count: 0, until: Date.now() + period * 1000 }; record.count++; rates.set(bucket, record);
    if (rates.size > 1000) for (const [k, v] of rates) if (v.until < Date.now()) rates.delete(k);
    if (record.count > limit) throw new GameError('A little slower, please. Try again shortly.', 429);
  } else {
    const n = await db().eval<[number], number>(`local n=redis.call('INCR',KEYS[1]); if n==1 then redis.call('EXPIRE',KEYS[1],ARGV[1]) end; return n`, [bucket], [period]);
    if (n > limit) throw new GameError('A little slower, please. Try again shortly.', 429);
  }
}
export async function newRoom(hash: string, name: string, avatar: Avatar, solo: boolean, requestId: string) {
  // The same create request deterministically targets one room; SET NX resolves retries atomically.
  const digest = createHash('sha256').update(hash + requestId).digest();
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ';
  for (let attempt = 0; attempt < 8; attempt++) {
    const code = Array.from({ length: 4 }, (_, i) => alphabet[digest[attempt * 4 + i] % alphabet.length]).join('');
    const old = await get(code);
    if (old) { const room: Room = JSON.parse(old); if (room.actionIds.includes(`create:${hash}:${requestId}`)) return publicSnapshot(room, hash, Date.now()); continue; }
    const room = createRoom(code, hash, name, avatar, Date.now(), solo, randomUUID(), testMode());
    room.actionIds.push(`create:${hash}:${requestId}`);
    if (testMode()) { memory().set(key(code), JSON.stringify(room)); return publicSnapshot(room, hash, Date.now()); }
    if (await db().set(key(code), JSON.stringify(room), { nx: true, ex: TTL })) return publicSnapshot(room, hash, Date.now());
  }
  throw new GameError('The desk is busy. Please try creating your room again.', 503);
}
export async function roomTransaction(code: string, hash: string | null, action?: Action, requestId?: string) {
  for (let attempt = 0; attempt < 16; attempt++) {
    const raw = await get(code);
    if (!raw) throw new GameError('That room has checked out. Create a new room or check the code.', 404);
    const room: Room = JSON.parse(raw), now = Date.now();
    let changed = advanceRoom(room, now);
    if (action && hash) {
      const actionKey = `${hash}:${requestId}`;
      if (!room.actionIds.includes(actionKey)) {
        applyAction(room, hash, action, now, randomUUID());
        room.actionIds.push(actionKey); room.actionIds = room.actionIds.slice(-128); changed = true;
      }
    }
    if (!changed) return publicSnapshot(room, hash, now);
    room.version++;
    if (await cas(code, raw, JSON.stringify(room))) return publicSnapshot(room, hash, Date.now());
    await new Promise(resolve => setTimeout(resolve, randomInt(4, 20)));
  }
  throw new GameError('The desk is catching up. Please try once more.', 503);
}
