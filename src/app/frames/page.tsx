import { notFound } from 'next/navigation';

// Preview-only layout harness: renders a path at several phone viewports side by side so a
// desktop browser can review mobile layouts. Never served in production.
const SIZES = [
  [375, 667],
  [390, 844],
] as const;
export default async function Frames({
  searchParams,
}: {
  searchParams: Promise<{ path?: string; tv?: string }>;
}) {
  if (process.env.VERCEL_ENV === 'production') notFound();
  const { path = '/', tv } = await searchParams;
  const safe = path.startsWith('/') && !path.startsWith('//') ? path : '/';
  return (
    <main style={{ display: 'flex', gap: 16, padding: 12, alignItems: 'flex-start' }}>
      {SIZES.map(([w, h]) => (
        <iframe
          key={w}
          title={`${safe} at ${w}x${h}`}
          src={safe}
          style={{ width: w, height: h, border: '1px solid #d8b06459', flexShrink: 0 }}
        />
      ))}
      {tv && (
        <iframe
          title="TV view"
          src={tv}
          style={{ width: 960, height: 540, border: '1px solid #d8b06459', flexShrink: 0 }}
        />
      )}
    </main>
  );
}
