import { z } from 'zod';
import {
  actionSchema,
  auth,
  body,
  errorResponse,
  noCache,
  requestId,
  roomCode,
} from '@/server/http';
import { rateLimit, roomTransaction } from '@/server/store';
type Context = { params: Promise<{ code: string }> };
export async function GET(req: Request, ctx: Context) {
  try {
    return Response.json(
      await roomTransaction(roomCode((await ctx.params).code), auth(req, false)),
      { headers: noCache },
    );
  } catch (error) {
    return errorResponse(error);
  }
}
export async function POST(req: Request, ctx: Context) {
  try {
    const hash = auth(req)!,
      code = roomCode((await ctx.params).code);
    const data = z.object({ action: actionSchema, requestId }).parse(await body(req));
    await rateLimit(`actions:${hash}`, 150);
    return Response.json(await roomTransaction(code, hash, data.action, data.requestId), {
      headers: noCache,
    });
  } catch (error) {
    return errorResponse(error);
  }
}
