import type { Metadata, Viewport } from 'next';
import './globals.css';
export const metadata: Metadata = {
  title: 'OVERLOAD — Load it up. Don’t snap the cable.',
  description:
    'Secret crates. Public blame. A four-minute multiplayer bluffing game in a very old hotel elevator. Play with friends or jump straight in with bots.',
  metadataBase: new URL('https://overload-game.vercel.app'),
  openGraph: {
    title: 'OVERLOAD',
    description: 'Load it up. Don’t snap the cable. 2–8 guests. Four minutes. Trust optional.',
    type: 'website',
  },
  twitter: { card: 'summary_large_image' },
};
export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  themeColor: '#28191c',
  viewportFit: 'cover',
};
export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
