// The brass floor-indicator dial that hangs over every 1930s lift door, repurposed as the
// load meter. The red sector starts at the weight limit.
const R = 64,
  CX = 80,
  CY = 78;
const point = (fraction: number, r: number) => {
  const a = Math.PI * (1 - fraction);
  return [CX + r * Math.cos(a), CY - r * Math.sin(a)] as const;
};
const arc = (from: number, to: number, r: number) => {
  const [x1, y1] = point(from, r),
    [x2, y2] = point(to, r);
  return `M${x1.toFixed(2)} ${y1.toFixed(2)}A${r} ${r} 0 0 1 ${x2.toFixed(2)} ${y2.toFixed(2)}`;
};
export function Dial({
  value,
  limit,
  className = '',
  live = true,
}: {
  value: number;
  limit: number;
  className?: string;
  live?: boolean;
}) {
  const max = Math.ceil(limit * 1.3),
    clamp = Math.min(value, max) / max,
    danger = limit / max,
    over = value > limit;
  const ticks = Array.from({ length: max + 1 }, (_, i) => i).filter(
    (i) => max <= 20 || i % 2 === 0 || i === limit,
  );
  return (
    <svg
      viewBox="0 0 160 92"
      className={`dial ${over ? 'is-over' : ''} ${className}`}
      aria-hidden="true"
      focusable="false"
    >
      <path className="dial-sunburst" d={arc(0, 1, R + 10)} />
      {Array.from({ length: 9 }, (_, i) => {
        const [x, y] = point((i + 1) / 10, R + 9);
        return (
          <path key={i} className="dial-ray" d={`M${CX} ${CY}L${x.toFixed(1)} ${y.toFixed(1)}`} />
        );
      })}
      <path className="dial-face" d={`${arc(0, 1, R)}Z`} />
      <path className="dial-safe" d={arc(0.015, danger, R - 7)} />
      <path className="dial-danger" d={arc(danger, 0.985, R - 7)} />
      {ticks.map((i) => {
        const [x1, y1] = point(i / max, R - 13),
          [x2, y2] = point(i / max, i === limit ? R - 1 : R - 3);
        return (
          <path
            key={i}
            className={i === limit ? 'dial-limit-tick' : 'dial-tick'}
            d={`M${x1.toFixed(1)} ${y1.toFixed(1)}L${x2.toFixed(1)} ${y2.toFixed(1)}`}
          />
        );
      })}
      <g
        className="dial-needle"
        style={{ '--a': `${(-90 + clamp * 180).toFixed(1)}deg` } as React.CSSProperties}
        data-live={live}
      >
        <path d={`M${CX - 2.4} ${CY}L${CX} ${CY - R + 10}L${CX + 2.4} ${CY}Z`} />
      </g>
      <circle className="dial-hub" cx={CX} cy={CY} r="6" />
      <path className="dial-base" d={`M${CX - R - 12} ${CY + 0.5}H${CX + R + 12}`} />
    </svg>
  );
}
