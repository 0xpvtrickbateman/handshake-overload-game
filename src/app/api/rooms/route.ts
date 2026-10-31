import { z } from 'zod';
import { auth, avatarSchema, body, errorResponse, nickname, noCache, requestId } from '@/server/http';
import { newRoom, rateLimit, sessionHash } from '@/server/store';
export async function POST(req: Request) {
  try {
    const hash = auth(req)!;
    const data = z.object({ name: nickname, avatar: avatarSchema, solo: z.boolean().default(false), requestId }).parse(await body(req));
    await rateLimit(`create:${hash}`, 10);
    await rateLimit(`ip:${sessionHash(req.headers.get('x-forwarded-for')?.split(',')[0] ?? 'local')}`, 30);
    return Response.json(await newRoom(hash, data.name, data.avatar, data.solo, data.requestId), { headers: noCache });
  } catch (error) { return errorResponse(error); }
}
