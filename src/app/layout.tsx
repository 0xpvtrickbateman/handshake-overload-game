import type { Metadata, Viewport } from 'next';
import { Jost, Limelight } from 'next/font/google';
import './globals.css';
const display = Limelight({
  weight: '400',
  subsets: ['latin'],
  variable: '--font-display',
  display: 'swap',
});
const sans = Jost({
  subsets: ['latin'],
  variable: '--font-sans',
  display: 'swap',
});
export const metadata: Metadata = {
  title: 'OVERLOAD: Load it up. Don’t snap the cable.',
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
  themeColor: '#1d0b0f',
  viewportFit: 'cover',
};
export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className={`${display.variable} ${sans.variable}`}>
      <body>{children}</body>
    </html>
  );
}
