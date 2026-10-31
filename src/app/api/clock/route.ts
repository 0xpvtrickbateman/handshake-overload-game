export const dynamic = 'force-dynamic';
export function GET() {
  return Response.json({ serverNow: Date.now() }, { headers: { 'Cache-Control': 'no-store' } });
}
