'use client';
import { useEffect, useRef } from 'react';
import type { Snapshot } from '@/game/types';
import { haptic, playSound, setStrain } from '@/client/sound';
import { Avatar } from './Avatar';
import { Dial } from './Dial';
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
  // How hard the car pulls on the cable: drives the sag, the strain beat and the drone pitch.
  const loadRatio = state.limit > 0 ? total / state.limit : 0,
    straining = isReveal && !verdict && loadRatio >= 0.85,
    strain = isReveal && !verdict ? Math.min(1, loadRatio) : 0;
  const blamed = result?.entries.filter((e) => e.blame) ?? [],
    salvaged = result?.entries.filter((e) => e.salvage) ?? [];
  const soundMarks = useRef(new Set<string>());
  useEffect(() => {
    if (!isReveal) return;
    // Every cue and buzz fires once, and only within 200 ms of its scheduled moment, so a
    // late joiner or a polling client never gets a burst of catch-up noise.
    if (!soundMarks.current.has('chime')) {
      soundMarks.current.add('chime');
      if (elapsed < 200) playSound('chime');
    }
    let running = 0;
    for (let i = 0; i < dropCount; i++) {
      running += result?.entries[i]?.load ?? 0;
      if (!soundMarks.current.has(`drop-${i}`)) {
        soundMarks.current.add(`drop-${i}`);
        if (elapsed - (timing.firstDrop + i * timing.interval) < 200) {
          playSound('thud', i);
          if (state.limit > 0 && running >= 0.75 * state.limit)
            playSound('creak', i, running / state.limit);
          haptic(12);
        }
      }
    }
    if (verdict && !soundMarks.current.has('verdict')) {
      soundMarks.current.add('verdict');
      if (elapsed - timing.verdict < 200) {
        playSound(result?.fits ? 'fit' : 'snap');
        haptic(result?.fits ? [20, 30, 20] : [45, 35, 100]);
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
    result,
    state.limit,
    salvaged.length,
  ]);
  useEffect(() => {
    setStrain(strain);
  }, [strain]);
  useEffect(() => () => setStrain(0), []);
  return (
    <div
      data-testid="elevator-stage"
      className={`elevator-stage choreographed ${practice ? 'practice-stage' : ''} ${straining ? 'straining' : ''} ${verdict ? (result?.fits ? 'fits' : 'snapped') : ''} ${spotlight ? 'spotlit' : ''} ${scored ? 'scored' : ''}`}
      style={
        {
          '--motion-time': `${timing.scale}s`,
          '--shake-delay': `${-Math.max(0, elapsed - timing.verdict)}ms`,
          '--load': Math.min(1.15, loadRatio).toFixed(3),
        } as React.CSSProperties
      }
    >
      <div className="shaft" aria-hidden="true" />
      <div className="cable" />
      <div className="capacity-plate">
        <small>Limit</small>
        <strong>{state.limit}</strong>
        <span>crates</span>
      </div>
      <div
        className="weight-gauge"
        role="img"
        aria-label={`${total} of ${state.limit} crates on the lift`}
      >
        <Dial value={total} limit={state.limit} />
        <span className={isReveal ? 'gauge-readout live' : 'gauge-readout'}>
          {isReveal ? (
            <>
              <b>{total}</b> aboard
            </>
          ) : (
            'Every crate counts'
          )}
        </span>
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
                    '--i': i,
                  } as React.CSSProperties
                }
              >
                {dropped ? (
                  <>
                    <b>{entry?.load}</b>
                    <small>
                      {p.id === state.meId ? 'You' : p.name.split(' ').at(-1)?.slice(0, 5)}
                    </small>
                  </>
                ) : (
                  <span className="mystery" aria-hidden="true">
                    ?
                  </span>
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
            : `${dropCount} of ${seats.length} guests loaded`}
        </div>
      )}
      {verdict && result && (
        <div
          className={`verdict ${result.fits ? 'fit' : 'snap'} ${spotlight && !result.fits ? 'verdict-small' : ''}`}
          data-testid="reveal-result"
        >
          <strong>{result.fits ? 'IT FITS!' : 'SNAP!'}</strong>
          <span className="verdict-detail">
            {result.total} crates on a {result.limit}-crate limit
          </span>
          <span className="verdict-short">
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
            Lightest:{' '}
            {salvaged.length > 2
              ? `${salvaged.length} guests`
              : salvaged.map((e) => e.name).join(' & ')}{' '}
            <b>+{2 * (result?.multiplier ?? 1)}</b>
          </span>
        </div>
      )}
      <p className="sr-only" role="status" aria-live="polite">
        {verdict && result
          ? result.fits
            ? `The lift held: ${result.total} crates against a limit of ${result.limit}. Everyone banks.`
            : `The cable snapped: ${result.total} crates against a limit of ${result.limit}. Nobody banks.`
          : ''}
      </p>
      <div className="closing-door left" />
      <div className="closing-door right" />
      <div className="stage-floor">
        {scored
          ? 'Scores updated. Next lift is on its way.'
          : verdict
            ? result?.fits
              ? 'Everyone banks what they loaded.'
              : `${result?.total} crates on a ${result?.limit} limit. Nobody banks.`
            : state.phase === 'reveal' && !isReveal
              ? 'Doors sealed. Everyone is locked in.'
              : practice
                ? 'Practice lift'
                : 'Load it up. Don’t snap the cable.'}
      </div>
    </div>
  );
}
