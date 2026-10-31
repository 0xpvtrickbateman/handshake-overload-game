import { auth, errorResponse, noCache, roomCode } from '@/server/http';
import { roomTransaction } from '@/server/store';
export const maxDuration = 60;
export const dynamic = 'force-dynamic';
export async function GET(req: Request, ctx: { params: Promise<{ code: string }> }) {
  try {
    const code = roomCode((await ctx.params).code),
      hash = auth(req, false);
    const first = await roomTransaction(code, hash),
      encoder = new TextEncoder();
    let stopped = false;
    const stream = new ReadableStream({
      async start(controller) {
        const began = Date.now();
        let version = first.version,
          lastBeat = began;
        const send = (event: string, data: unknown) =>
          controller.enqueue(encoder.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`));
        try {
          send('state', first);
          while (!stopped && !req.signal.aborted && Date.now() - began < 30_000) {
            await new Promise((resolve) => setTimeout(resolve, 180));
            if (stopped || req.signal.aborted) break;
            const state = await roomTransaction(code, hash);
            if (state.version !== version) {
              version = state.version;
              send('state', state);
            }
            if (Date.now() - lastBeat >= 3000) {
              send('heartbeat', { serverNow: Date.now() });
              lastBeat = Date.now();
            }
          }
          if (!stopped && !req.signal.aborted) send('reconnect', {});
        } catch {
          if (!stopped && !req.signal.aborted) {
            try {
              send('reconnect', {});
            } catch {}
          }
        } finally {
          if (!stopped) {
            try {
              controller.close();
            } catch {}
          }
        }
      },
      cancel() {
        stopped = true;
      },
    });
    return new Response(stream, {
      headers: {
        ...noCache,
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache, no-transform',
        'X-Accel-Buffering': 'no',
      },
    });
  } catch (error) {
    return errorResponse(error);
  }
}
