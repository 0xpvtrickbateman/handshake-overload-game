import { z } from 'zod';
import { GameError } from '@/game/engine';
import { sessionHash } from './store';
export const avatarSchema = z.object({ hat: z.number().int().min(0).max(3), color: z.number().int().min(0).max(5) });
export const nickname = z.string().trim().min(1).max(18).refine(s => !/[\p{Cc}\p{Cf}]/u.test(s), 'Use a simple nickname.');
export const requestId = z.string().uuid();
const roundFields = { round: z.number().int().min(1).max(8), game: z.number().int().positive() };
export const actionSchema = z.discriminatedUnion('type', [
  z.object({ type: z.literal('join'), name: nickname, avatar: avatarSchema }),
  z.object({ type: z.literal('signal'), signal: z.enum(['light', 'heavy', 'shrug']), ...roundFields }),
  z.object({ type: z.literal('load'), load: z.number().int().min(1).max(6), ...roundFields }),
  ...(['start', 'rematch', 'leave', 'heartbeat', 'resume', 'fill-bots'] as const).map(type => z.object({ type: z.literal(type) })),
  z.object({ type: z.literal('add-bot'), personality: z.enum(['sam', 'gus', 'lou', 'mel']) }),
  z.object({ type: z.literal('remove-bot'), id: z.string().min(1).max(100) }),
]);
export const noCache = { 'Cache-Control': 'no-store, max-age=0', 'X-Content-Type-Options': 'nosniff' };
export function auth(req: Request, required = true) {
  const token = req.headers.get('x-overload-session');
  if (!token && !required) return null;
  if (!token || !z.string().uuid().safeParse(token).success) throw new GameError('Rejoin the room to restore your seat.', 401);
  return sessionHash(token);
}
export function roomCode(code: string) { if (!/^[A-Z]{4}$/.test(code)) throw new GameError('Use the four-letter room code.'); return code; }
export async function body(req: Request) {
  const origin = req.headers.get('origin');
  if (origin && new URL(origin).host !== (req.headers.get('host') ?? new URL(req.url).host)) throw new GameError('Please play from the OVERLOAD site.', 403);
  if (Number(req.headers.get('content-length')) > 4096) throw new GameError('That request is too large.', 413);
  const text = await req.text();
  if (text.length > 4096) throw new GameError('That request is too large.', 413);
  try { return JSON.parse(text); } catch { throw new GameError('Please send a valid action.'); }
}
export function errorResponse(error: unknown) {
  if (error instanceof GameError) return Response.json({ error: error.message }, { status: error.status, headers: noCache });
  if (error instanceof z.ZodError) return Response.json({ error: 'Check your name, code, or choice and try again.' }, { status: 400, headers: noCache });
  console.error('OVERLOAD request failed', error instanceof Error ? error.message : 'Unknown error');
  return Response.json({ error: 'The hotel desk is reconnecting. Your seat is saved; try again.' }, { status: 503, headers: noCache });
}
