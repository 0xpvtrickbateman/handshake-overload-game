import { ImageResponse } from 'next/og';
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';

export const alt =
  'OVERLOAD: Load it up. Don’t snap the cable. A party game for 2 to 8 guests on their own phones.';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

const C = {
  night: '#170a0d',
  oxblood: '#2b0f15',
  lacquer: '#3f141c',
  brass: '#d8b064',
  brassHi: '#f2d491',
  brassLo: '#8f6b30',
  cream: '#f5e9d0',
  creamDim: '#d7c5a6',
  signal: '#ff6e5a',
  wood: '#b6824c',
  woodHi: '#d3a46a',
  woodLo: '#6e4527',
};

async function font(file: string) {
  try {
    return await readFile(join(process.cwd(), 'assets/og', file));
  } catch {
    return null;
  }
}

export default async function Image() {
  const [limelight, jost, jostBold] = await Promise.all([
    font('Limelight-400.woff'),
    font('jost-latin-400-normal.woff'),
    font('jost-latin-600-normal.woff'),
  ]);
  const fonts = [
    limelight && {
      name: 'Limelight',
      data: limelight,
      weight: 400 as const,
      style: 'normal' as const,
    },
    jost && { name: 'Jost', data: jost, weight: 400 as const, style: 'normal' as const },
    jostBold && { name: 'Jost', data: jostBold, weight: 600 as const, style: 'normal' as const },
  ].filter((f) => !!f);
  const display = limelight ? 'Limelight' : 'serif';
  const sans = jost ? 'Jost' : 'sans-serif';
  const crates = [
    { n: 6, h: 92, tilt: -6 },
    { n: 4, h: 74, tilt: 3 },
    { n: 6, h: 92, tilt: 8 },
  ];

  return new ImageResponse(
    <div
      style={{
        width: '100%',
        height: '100%',
        display: 'flex',
        padding: 22,
        fontFamily: sans,
        color: C.cream,
        background: `radial-gradient(circle at 30% 20%, #5a1d28 0%, ${C.oxblood} 55%, ${C.night} 100%)`,
      }}
    >
      <div
        style={{
          flex: 1,
          display: 'flex',
          border: `2px solid ${C.brass}`,
          padding: 6,
        }}
      >
        <div
          style={{
            flex: 1,
            display: 'flex',
            alignItems: 'center',
            border: `1px solid ${C.brassLo}`,
            padding: '0 56px 0 64px',
          }}
        >
          {/* Left: wordmark and promise */}
          <div style={{ display: 'flex', flexDirection: 'column', flex: 1 }}>
            <div
              style={{
                color: C.brass,
                fontSize: 20,
                fontWeight: 600,
                letterSpacing: 7,
              }}
            >
              THE GRAND HOTEL · FREIGHT LIFT · 1931
            </div>
            <div
              style={{
                fontFamily: display,
                fontSize: 116,
                lineHeight: 1,
                letterSpacing: 2,
                color: C.brassHi,
                marginTop: 26,
                textShadow: `0 4px 0 ${C.brassLo}, 0 14px 30px #00000099`,
              }}
            >
              OVERLOAD
            </div>
            <div style={{ display: 'flex', alignItems: 'center', marginTop: 22 }}>
              <div style={{ width: 120, height: 2, background: C.brass }} />
              <div
                style={{
                  width: 12,
                  height: 12,
                  margin: '0 12px',
                  background: C.brass,
                  transform: 'rotate(45deg)',
                }}
              />
              <div style={{ width: 120, height: 2, background: C.brass }} />
            </div>
            <div style={{ fontSize: 44, marginTop: 24, color: C.cream }}>
              Load it up. Don’t snap the cable.
            </div>
            <div
              style={{
                fontSize: 25,
                marginTop: 16,
                color: C.creamDim,
                lineHeight: 1.4,
                maxWidth: 600,
              }}
            >
              A bluffing party game for 2 to 8 guests.
            </div>
            <div
              style={{
                display: 'flex',
                marginTop: 34,
                fontSize: 22,
                fontWeight: 600,
                letterSpacing: 2,
                color: C.brass,
              }}
            >
              overload-game.vercel.app
            </div>
          </div>

          {/* Right: the lift car, mid-snap */}
          <div
            style={{
              width: 330,
              height: 500,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              position: 'relative',
              border: `6px solid ${C.brass}`,
              borderTopLeftRadius: 165,
              borderTopRightRadius: 165,
              background: `linear-gradient(180deg, ${C.lacquer}, ${C.night})`,
              boxShadow: `0 0 0 3px ${C.night}, 0 0 0 5px ${C.brassLo}, 0 30px 60px #000000aa`,
            }}
          >
            <svg width="240" height="130" viewBox="0 0 240 130" style={{ marginTop: 34 }}>
              <path
                d="M 30 110 A 90 90 0 0 1 210 110"
                fill="none"
                stroke={C.brassLo}
                strokeWidth="14"
              />
              <path
                d="M 30 110 A 90 90 0 0 1 183.6 46.4"
                fill="none"
                stroke={C.brass}
                strokeWidth="14"
              />
              <path
                d="M 183.6 46.4 A 90 90 0 0 1 210 110"
                fill="none"
                stroke={C.signal}
                strokeWidth="14"
              />
              <line
                x1="120"
                y1="110"
                x2="197"
                y2="80"
                stroke={C.cream}
                strokeWidth="6"
                strokeLinecap="round"
              />
              <circle cx="120" cy="110" r="11" fill={C.brassHi} />
            </svg>
            <div
              style={{
                display: 'flex',
                alignItems: 'baseline',
                marginTop: 4,
                fontSize: 26,
                fontWeight: 600,
                color: C.signal,
                letterSpacing: 2,
              }}
            >
              16 OF 14 · SNAP
            </div>
            <div
              style={{
                position: 'absolute',
                top: 212,
                left: 161,
                width: 4,
                height: 56,
                background: C.brass,
                transform: 'rotate(-7deg)',
              }}
            />
            <div
              style={{
                position: 'absolute',
                top: 290,
                left: 163,
                width: 4,
                height: 44,
                background: C.brassLo,
                transform: 'rotate(9deg)',
              }}
            />
            <div
              style={{
                position: 'absolute',
                bottom: 54,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'flex-end', gap: 8 }}>
                {crates.map((c, i) => (
                  <div
                    key={i}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      width: 78,
                      height: c.h,
                      transform: `rotate(${c.tilt}deg)`,
                      border: `4px solid ${C.woodLo}`,
                      background: `linear-gradient(180deg, ${C.woodHi}, ${C.wood})`,
                      color: C.oxblood,
                      fontFamily: display,
                      fontSize: 44,
                    }}
                  >
                    {c.n}
                  </div>
                ))}
              </div>
              <div
                style={{
                  width: 270,
                  height: 12,
                  marginTop: 6,
                  background: `linear-gradient(180deg, ${C.brassHi}, ${C.brassLo})`,
                  transform: 'rotate(4deg)',
                }}
              />
            </div>
          </div>
        </div>
      </div>
    </div>,
    { ...size, fonts: fonts.length ? fonts : undefined },
  );
}
