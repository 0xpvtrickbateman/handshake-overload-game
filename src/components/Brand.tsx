import Link from 'next/link';
export function BrandMark({ size = 30 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size * 1.15}
      viewBox="0 0 30 34.5"
      className="brand-mark"
      aria-hidden="true"
      focusable="false"
    >
      <path
        d="M2 33V11l4-4h3l3-4h6l3 4h3l4 4v22z"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinejoin="round"
      />
      <path d="M15 12v15M10 17l5-5 5 5" fill="none" stroke="currentColor" strokeWidth="2.2" />
      <path d="M6 30h18" stroke="currentColor" strokeWidth="1.6" />
    </svg>
  );
}
export function Brand({ small = false }: { small?: boolean }) {
  return (
    <Link href="/" className={`brand ${small ? 'small' : ''}`} aria-label="OVERLOAD home">
      <BrandMark size={small ? 22 : 26} />
      <span className="brand-word">Overload</span>
    </Link>
  );
}
export function Footer() {
  return <footer>Made for the Handshake × OpenAI challenge</footer>;
}
