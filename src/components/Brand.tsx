import Link from 'next/link';
export function Brand({ small = false }: { small?: boolean }) {
  return (
    <Link href="/" className={`brand ${small ? 'small' : ''}`} aria-label="OVERLOAD home">
      <span className="brand-mark">↟</span>
      <span>OVERLOAD</span>
    </Link>
  );
}
export function Footer() {
  return <footer>Made for the Handshake × OpenAI challenge</footer>;
}
