// Inline SVG icons. Unicode glyphs like ↟ ◆ ♛ ϟ fall back to boxes on some phones.
const PATHS = {
  up: 'M12 20V5M6 11l6-6 6 6',
  down: 'M12 4v15M6 13l6 6 6-6',
  shrug: 'M4 12h16M8 8l-4 4 4 4M16 8l4 4-4 4',
  arrow: 'M7 17 17 7M8 7h9v9',
  leave: 'M14 4h5v16h-5M10 8l-4 4 4 4M6 12h10',
  check: 'M5 12.5l4.5 4.5L19 7.5',
  minus: 'M6 12h12',
  plus: 'M12 6v12M6 12h12',
  close: 'M6 6l12 12M18 6 6 18',
  rematch: 'M19 12a7 7 0 1 1-2.05-4.95M19 4v4h-4',
  share: 'M12 15V4M8 8l4-4 4 4M5 13v6h14v-6',
  tv: 'M3 6h18v11H3zM8 21h8M12 17v4',
  lock: 'M7 11V8a5 5 0 0 1 10 0v3M5 11h14v10H5z',
  bolt: 'M13 2 5 14h6l-1 8 8-12h-6z',
  feather: 'M20 4C11 4 6 9 5 19M5 19l3-3M9 15h5M12 11h5',
  diamond: 'M12 3l7 9-7 9-7-9z',
  climb: 'M3 18l6-6 4 4 8-8M15 8h6v6',
  crown: 'M3 18 5 7l4.5 5L12 5l2.5 7L19 7l2 11z',
  crate: 'M4 6h16v14H4zM4 6l16 14M20 6 4 20',
} as const;
export type IconName = keyof typeof PATHS;
export function Icon({
  name,
  size = 18,
  className,
  strokeWidth = 1.8,
}: {
  name: IconName;
  size?: number;
  className?: string;
  strokeWidth?: number;
}) {
  const filled = name === 'crown' || name === 'bolt' || name === 'diamond';
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill={filled ? 'currentColor' : 'none'}
      stroke="currentColor"
      strokeWidth={filled ? 0 : strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={`icon ${className ?? ''}`}
      aria-hidden="true"
      focusable="false"
    >
      <path d={PATHS[name]} />
    </svg>
  );
}
export const SIGNAL_ICONS = { light: 'down', heavy: 'up', shrug: 'shrug' } as const;
export const AWARD_ICONS: Record<string, IconName> = {
  'The Breaker': 'bolt',
  'The Saint': 'feather',
  'Honest Abe': 'diamond',
  'Dark Horse': 'climb',
};
