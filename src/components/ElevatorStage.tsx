'use client';
import { useEffect, useRef } from 'react';
import type { Snapshot } from '@/game/types';
import { playSound } from '@/client/sound';
import { Avatar } from './Avatar';
export function revealTiming(state: Snapshot) {
  const scale = Math.min(1, Math.max(0.1, (state.phaseEndsAt - state.revealAt) / 10200));
  const seats = state.players.filter((p) => p.seat).length;
  return {
    scale,
    interval: Math.min(300, 1700 / seats) * scale,
    firstDrop: 550 * scale,
    verdict: 2600 * scale,
    spotlight: 3300 * scale,
    score: 4400 * scale,
    end: 6000 * scale,
  };
}
export function ElevatorStage({
  state,
  now,
  practice = false,
}: {
  state: Snapshot;
  now: number;
  practice?: boolean;
}) {
  const result = state.result,
    seats = state.players.filter((p) => p.seat),
    elapsed = now - state.revealAt;
  const isReveal = state.phase === 'reveal' && elapsed >= 0,
    timing = revealTiming(state);
  const dropCount = isReveal
    ? Math.min(
        seats.length,
        Math.max(0, Math.floor((elapsed - timing.firstDrop) / timing.interval) + 1),
      )
    : 0;
  const verdict = isReveal && elapsed >= timing.verdict,
    spotlight = verdict && elapsed >= timing.spotlight;
  const scored = verdict && elapsed >= timing.score;
  const total = result?.entries.slice(0, dropCount).reduce((n, e) => n + e.load, 0) ?? 0;
  const blamed = result?.entries.filter((e) => e.blame) ?? [],
    salvaged = result?.entries.filter((e) => e.salvage) ?? [];
  const soundMarks = useRef(new Set<string>());
  useEffect(() => {
    if (!isReveal) return;
    for (let i = 0; i < dropCount; i++) {
      if (!soundMarks.current.has(`drop-${i}`)) {
        soundMarks.current.add(`drop-${i}`);
        if (elapsed - (timing.firstDrop + i * timing.interval) < 200) playSound('thud', i);
      }
    }
    if (verdict && !soundMarks.current.has('verdict')) {
      soundMarks.current.add('verdict');
      if (elapsed - timing.verdict < 200) {
        playSound(result?.fits ? 'fit' : 'snap');
        if (!result?.fits) navigator.vibrate?.([45, 35, 100]);
      }
    }
    if (spotlight && salvaged.length && !soundMarks.current.has('salvage')) {
      soundMarks.current.add('salvage');
      if (elapsed - timing.spotlight < 200) playSound('salvage');
    }
  }, [
    isReveal,
    dropCount,
    elapsed,
    timing.firstDrop,
    timing.interval,
    timing.verdict,
    timing.spotlight,
    verdict,
    spotlight,
    result?.fits,
    salvaged.length,
  ]);
  const needle = -85 + (Math.min(1.25, total / state.limit) / 1.25) * 170;
  return (
    <div
      data-testid="elevator-stage"
      className={`elevator-stage choreographed ${verdict ? (result?.fits ? 'fits' : 'snapped') : ''} ${spotlight ? 'spotlit' : ''} ${scored ? 'scored' : ''}`}
      style={
        {
          '--motion-time': `${timing.scale}s`,
          '--shake-delay': `${-Math.max(0, elapsed - timing.verdict)}ms`,
        } as React.CSSProperties
      }
    >
      <div className="stage-crown">
        THE GRAND <span>{practice ? 'PRACTICE LIFT · ROUND 0' : 'FREIGHT № 01'}</span>
      </div>
      <div className="cable" />
      <div className="capacity-plate">
        <small>WEIGHT LIMIT</small>
        <strong>{state.limit}</strong>
        <span>CRATES</span>
      </div>
      <div className="weight-gauge" aria-label={`${total} of ${state.limit} crates on the lift`}>
        <svg viewBox="0 0 150 90" aria-hidden="true">
          <path d="M15 73A60 60 0 0 1 135 73" fill="#1c1619" stroke="#c6a66c" strokeWidth="2" />
          <path d="M122 35A60 60 0 0 1 135 73" fill="none" stroke="#c56b65" strokeWidth="7" />
          {[-80, -50, -20, 10, 40, 70].map((a) => (
            <path
              key={a}
              d="M75 16v7"
              stroke="#d3b579"
              strokeWidth="1"
              transform={`rotate(${a} 75 73)`}
            />
          ))}
          <path
            d="M75 73V25"
            stroke={total > state.limit ? '#ef998c' : '#ead1a0'}
            strokeWidth="3"
            transform={`rotate(${needle} 75 73)`}
          />
          <circle cx="75" cy="73" r="5" fill="#d3b579" />
        </svg>
        <span>{isReveal ? `${total} / ${state.limit}` : 'EVERY CRATE COUNTS'}</span>
      </div>
      <div className="platform">
        <div className="platform-crates">
          {seats.map((p, i) => {
            const dropped = i < dropCount,
              entry = result?.entries[i];
            return (
              <div
                key={p.id}
                className={`cargo ${dropped ? 'dropped' : ''} ${isReveal && !dropped ? 'pending-crate' : ''}`}
                style={
                  {
                    '--drop-delay': `${-Math.max(0, elapsed - timing.firstDrop - i * timing.interval)}ms`,
                  } as React.CSSProperties
                }
              >
                {dropped ? (
                  <>
                    <b>{entry?.load}</b>
                    <small>
                      {p.id === state.meId ? 'YOU' : p.name.split(' ').at(-1)?.slice(0, 5)}
                    </small>
                  </>
                ) : (
                  '?'
                )}
              </div>
            );
          })}
        </div>
        <div className="platform-base" />
      </div>
      {isReveal && !verdict && (
        <div className="recap-label">
          {elapsed < timing.firstDrop
            ? 'Promises made. Cargo incoming.'
            : `${dropCount} OF ${seats.length} GUESTS LOADED`}
        </div>
      )}
      {verdict && result && (
        <div
          className={`verdict ${result.fits ? 'fit' : 'snap'} ${spotlight && !result.fits ? 'verdict-small' : ''}`}
          data-testid="reveal-result"
        >
          <strong>{result.fits ? 'IT FITS!' : 'SNAP!'}</strong>
          <span>
            {result.total} / {result.limit} crates
          </span>
        </div>
      )}
      {spotlight && !result?.fits && (
        <div className="blame-scene">
          <div className="blame-avatars">
            {blamed.map((e) => {
              const player = seats.find((p) => p.id === e.id)!;
              return (
                <div key={e.id}>
                  <Avatar avatar={player.avatar} size={42} />
                  <span>{e.load} crates</span>
                </div>
              );
            })}
          </div>
          <strong className="blame-stamp">BLAME</strong>
          <p>
            {blamed.length > 2
              ? `${blamed.length} guests share the blame`
              : blamed.map((e) => e.name).join(' & ')}{' '}
            <b>−{3 * (result?.multiplier ?? 1)}</b>
          </p>
          <span className="salvage-line">
            ✧{' '}
            {salvaged.length > 2
              ? `${salvaged.length} light packers`
              : salvaged.map((e) => e.name).join(' & ')}{' '}
            salvaged +{2 * (result?.multiplier ?? 1)}
          </span>
        </div>
      )}
      <div className="closing-door left" />
      <div className="closing-door right" />
      <div className="stage-floor">
        {scored
          ? 'LEDGER UPDATED · NEXT LIFT COMING'
          : verdict
            ? result?.fits
              ? 'THE CABLE LIVES ANOTHER ROUND.'
              : 'NOBODY BANKS. SOMEONE GETS THE BLAME.'
            : state.phase === 'reveal' && !isReveal
              ? 'DOORS SEALED · EVERYONE IS LOCKED'
              : 'LOAD IT UP. DON’T SNAP THE CABLE.'}
      </div>
    </div>
  );
}
