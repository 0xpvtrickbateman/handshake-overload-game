'use client';
import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useRoom, useServerNow } from '@/client/connection';
import type { Action, Snapshot } from '@/game/types';
import { BOT_NAMES, BOT_ORDER, SIGNALS } from '@/game/rules';
import { Avatar } from './Avatar';
import { Brand, Footer } from './Brand';
import { RuleLines, Rules } from './Rules';
import { GuestForm } from './Landing';
import { ElevatorStage, revealTiming } from './ElevatorStage';
import { SoundToggle } from './Sound';
import { RoomQR, InviteButton } from './RoomQR';
import { Results } from './Results';
import { playSound } from '@/client/sound';

type Send = (action: Action) => Promise<Snapshot>;
export function RoomClient({ code, tv = false }: { code: string; tv?: boolean }) {
  const { state, send, error, connected } = useRoom(code, tv),
    router = useRouter();
  const [leaving, setLeaving] = useState(false);
  useEffect(() => {
    if (state?.meId && !tv) void send({ type: 'resume' }).catch(() => {});
  }, [state?.meId, send, tv]);
  const leave = async () => {
    setLeaving(true);
    try {
      await send({ type: 'leave' });
      router.push('/');
    } catch {
      setLeaving(false);
    }
  };
  if (!state)
    return (
      <main className="reconnect-shell">
        <Brand />
        <div className="skeleton lift-skeleton" />
        <h2>Your lift is arriving.</h2>
        <p>{error || 'The desk is finding your room…'}</p>
        <Link className="secondary" href="/">
          Back to the desk
        </Link>
      </main>
    );
  if (!state.meId && !tv)
    return (
      <main className="join-page">
        <Brand />
        <p className="eyebrow">ROOM {code}</p>
        <h1>{state.phase === 'lobby' ? 'You’re on the list.' : 'Take a front-row seat.'}</h1>
        <p>
          {state.phase === 'lobby'
            ? 'Choose a name and a hat. We’ll handle the cargo.'
            : 'Watch this game. You’ll be seated for the next one.'}
        </p>
        <GuestForm
          label={state.phase === 'lobby' ? 'Join the lift' : 'Watch & join next game'}
          onSubmit={(name, avatar) => void send({ type: 'join', name, avatar }).catch(() => {})}
        />
        {error && (
          <p className="error" role="alert">
            {error}
          </p>
        )}
        <Footer />
      </main>
    );
  return (
    <>
      <div className={`room-root ${tv ? 'tv-root' : ''}`}>
        <div className="room-toolbar">
          <Brand small />
          <span
            className={`connection ${connected ? '' : 'offline'}`}
            title={connected ? 'Live connection' : 'Reconnecting; seat saved'}
          >
            {connected ? 'LIVE' : 'REJOINING'}
          </span>
          <SoundToggle />
          <Rules />
          {tv ? (
            <Link className="icon-button" href="/" aria-label="Leave TV view">
              ↗
            </Link>
          ) : (
            <button
              className="icon-button"
              aria-label="Leave room"
              disabled={leaving}
              onClick={() => void leave()}
            >
              ↗
            </button>
          )}
        </div>
        {state.phase === 'lobby' ? (
          <Lobby state={state} send={send} tv={tv} />
        ) : state.phase === 'finished' ? (
          <Results state={state} send={send} tv={tv} />
        ) : (
          <Controller key={`${state.game}:${state.round}`} state={state} send={send} tv={tv} />
        )}
        {error && (
          <div className="toast" role="alert">
            {error}
          </div>
        )}
      </div>
    </>
  );
}
function Lobby({ state, send, tv }: { state: Snapshot; send: Send; tv: boolean }) {
  const seats = state.players.filter((p) => p.seat),
    host = state.meId === state.hostId;
  return (
    <section className="lobby">
      <p className="eyebrow">YOUR PRIVATE FREIGHT LIFT</p>
      <div className="room-code">
        <span>ROOM</span>
        <strong>{state.code}</strong>
        <InviteButton code={state.code} />
        <RoomQR code={state.code} compact />
      </div>
      <h1>
        Who’s bringing
        <br />
        <em>too much baggage?</em>
      </h1>
      <RuleLines />
      <div className="guest-list">
        {seats.map((p) => (
          <div className="guest-row" key={p.id}>
            <Avatar avatar={p.avatar} />
            <div>
              <b>{p.name}</b>
              <small>
                {p.bot ? 'HOTEL REGULAR · BOT' : p.id === state.hostId ? 'HOST' : 'CHECKED IN'}
              </small>
            </div>
            {p.bot && host && !tv && (
              <button
                className="icon-button"
                aria-label={`Remove ${p.name}`}
                onClick={() => void send({ type: 'remove-bot', id: p.id }).catch(() => {})}
              >
                −
              </button>
            )}
          </div>
        ))}
      </div>
      {host && !tv ? (
        <>
          <div className="bot-controls">
            <button
              className="secondary"
              disabled={seats.length >= 4}
              onClick={() => void send({ type: 'fill-bots' }).catch(() => {})}
            >
              Fill to 4 with bots
            </button>
            <select
              aria-label="Add a bot"
              value=""
              disabled={seats.length === 8}
              onChange={(e) => {
                if (e.target.value)
                  void send({
                    type: 'add-bot',
                    personality: e.target.value as (typeof BOT_ORDER)[number],
                  }).catch(() => {});
              }}
            >
              <option value="">+ Add a regular</option>
              {BOT_ORDER.map((b) => (
                <option key={b} value={b}>
                  {BOT_NAMES[b]}
                </option>
              ))}
            </select>
          </div>
          <button
            className="primary"
            disabled={seats.length < 2}
            onClick={() => void send({ type: 'start' }).catch(() => {})}
          >
            Start the lift <span>{seats.length}/8 guests ↟</span>
          </button>
        </>
      ) : (
        <p className="waiting">Waiting for the host. Get your story straight.</p>
      )}
      <Link className="tv-link" href={`/tv/${state.code}`} target="_blank">
        Open big-screen TV view ↗
      </Link>
      <Footer />
    </section>
  );
}
function Controller({ state, send, tv }: { state: Snapshot; send: Send; tv: boolean }) {
  const now = useServerNow(),
    [pick, setPick] = useState(3),
    [pending, setPending] = useState(false);
  const me = state.players.find((p) => p.id === state.meId),
    seats = state.players.filter((p) => p.seat);
  const reveal = state.phase === 'reveal',
    elapsed = now - state.revealAt;
  const revealing = reveal && elapsed >= 0;
  const countdown = Math.max(0, Math.ceil((state.phaseEndsAt - now) / 1000));
  const result = state.result,
    timing = revealTiming(state),
    scored = revealing && elapsed >= timing.score;
  const announcement = useRef(false);
  useEffect(() => {
    if (revealing && !announcement.current) {
      announcement.current = true;
      window.dispatchEvent(
        new CustomEvent('overload:reveal', {
          detail: {
            round: state.round,
            game: state.game,
            actualAt: Date.now(),
            scheduledAt: state.revealAt,
          },
        }),
      );
    }
  }, [revealing, state.round, state.game, state.revealAt]);
  const canLoad = state.phase === 'load' && !!me?.seat && !me.locked && !pending && !tv;
  const lock = async () => {
    if (!canLoad) return;
    setPending(true);
    try {
      await send({ type: 'load', load: pick, round: state.round, game: state.game });
      navigator.vibrate?.(20);
      playSound('lock');
    } finally {
      setPending(false);
    }
  };
  useEffect(() => {
    const key = (e: KeyboardEvent) => {
      if (
        (e.target as HTMLElement).matches('input,textarea,select') ||
        document.querySelector('[role="dialog"]')
      )
        return;
      if (/^[1-6]$/.test(e.key) && canLoad) setPick(Number(e.key));
      if (e.key === 'Enter' && canLoad) {
        e.preventDefault();
        void lock().catch(() => {});
      }
      const signal = ({ l: 'light', h: 'heavy', s: 'shrug' } as const)[e.key.toLowerCase() as 'l'];
      if (signal && state.phase === 'signal' && me?.seat && !tv)
        void send({ type: 'signal', signal, round: state.round, game: state.game }).catch(() => {});
    };
    window.addEventListener('keydown', key);
    return () => window.removeEventListener('keydown', key);
  });
  return (
    <section
      className={`controller ${tv ? 'tv-controller' : ''}`}
      data-testid="controller"
      data-phase={state.phase}
      data-round={state.round}
      data-total={result?.total ?? ''}
      data-scores={JSON.stringify(seats.map((p) => [p.id, p.score]))}
    >
      <div className="round-strip">
        <span>
          ROOM <b>{state.code}</b>
        </span>
        <span>
          LIFT <b>{String(state.round).padStart(2, '0')}</b> / 08
        </span>
        <span className={state.round >= 7 ? 'double active' : 'double'}>
          {state.round >= 7 ? 'Final two rounds count double' : 'LAST TWO ×2'}
        </span>
      </div>
      <div className="phase-heading">
        <div>
          <p className="eyebrow">
            {reveal
              ? 'THE MOMENT OF TRUTH'
              : state.phase === 'signal'
                ? '01 / SAY SOMETHING'
                : '02 / LOAD IN SECRET'}
          </p>
          <h2>
            {reveal
              ? revealing
                ? elapsed < timing.verdict
                  ? 'Let’s see who meant it.'
                  : result?.fits
                    ? 'Going up.'
                    : 'Someone overpacked.'
                : 'Doors sealed…'
              : state.phase === 'signal'
                ? 'What’s your story?'
                : me?.locked
                  ? 'Your secret is safe.'
                  : 'How much do you dare?'}
          </h2>
        </div>
        <div className="timer" role="timer" aria-label={`${countdown} seconds remaining`}>
          {countdown}
          <small>SEC</small>
        </div>
      </div>
      <ElevatorStage state={state} now={now} />
      <div className="player-rail" style={{ '--seats': seats.length } as React.CSSProperties}>
        {seats.map((p) => {
          const entry = result?.entries.find((e) => e.id === p.id);
          return (
            <div
              key={p.id}
              className={`player-token ${p.id === me?.id ? 'is-me' : ''}`}
              title={`${p.name}${p.covered ? ' · bot covering' : ''}`}
            >
              <div className="avatar-wrap">
                <Avatar avatar={p.avatar} size={32} />
                <span className="player-state">
                  {reveal && revealing && elapsed >= timing.verdict
                    ? entry?.blame
                      ? '−'
                      : entry?.salvage
                        ? '+'
                        : '✓'
                    : p.locked
                      ? '✓'
                      : (SIGNALS.find((s) => s.id === p.signal)?.icon ?? '·')}
                </span>
              </div>
              <b>{p.id === me?.id ? 'YOU' : p.name.split(' ').at(-1)?.slice(0, 7)}</b>
              <span data-player-score={p.id}>
                {reveal && !scored ? (entry?.before ?? p.score) : p.score}
                <small> PT</small>
              </span>
              {scored && entry && elapsed - timing.score < 1500 && (
                <span
                  className={`point-burst ${entry.delta < 0 ? 'negative' : ''}`}
                  style={{ animationDelay: `${-(elapsed - timing.score)}ms` }}
                >
                  {entry.delta > 0 ? '+' : ''}
                  {entry.delta}
                  {entry.salvage ? ' ✧' : ''}
                </span>
              )}
            </div>
          );
        })}
      </div>
      {!tv ? (
        <>
          <div className="signal-chips" data-testid="signal-chips">
            {SIGNALS.map((s) => (
              <button
                key={s.id}
                aria-pressed={me?.signal === s.id}
                disabled={state.phase !== 'signal' || !me?.seat}
                onClick={() =>
                  void send({
                    type: 'signal',
                    signal: s.id,
                    round: state.round,
                    game: state.game,
                  }).catch(() => {})
                }
              >
                <span>{s.icon}</span>
                {s.label}
              </button>
            ))}
          </div>
          <div
            className="crate-picker"
            data-testid="crate-picker"
            aria-label="Choose your secret load"
          >
            {[1, 2, 3, 4, 5, 6].map((n) => (
              <button
                key={n}
                aria-label={`Load ${n} ${n === 1 ? 'crate' : 'crates'}`}
                aria-pressed={(me?.locked ? state.myLoad : pick) === n}
                disabled={!canLoad}
                onClick={() => setPick(n)}
              >
                <span className="crate-number">{n}</span>
              </button>
            ))}
          </div>
          <button
            data-testid="lock-button"
            className="primary lock-button"
            disabled={!canLoad}
            onClick={() => void lock().catch(() => {})}
          >
            {!me?.seat
              ? 'Spectating · seated next game'
              : reveal
                ? 'The cable has spoken'
                : state.phase === 'signal'
                  ? 'Pick a signal first'
                  : me?.locked
                    ? `${state.myLoad} crates locked ✓`
                    : pending
                      ? 'Sealing your load…'
                      : `Lock in ${pick} ${pick === 1 ? 'crate' : 'crates'}`}
            <span>{!me?.locked && state.phase === 'load' ? '↟' : ''}</span>
          </button>
          <p className="controller-note">
            {reveal
              ? 'Next lift leaves automatically.'
              : state.phase === 'signal'
                ? 'A promise? A bluff? Nobody can hold you to it.'
                : 'No pick by the bell? The porter loads 3.'}
          </p>
        </>
      ) : (
        <div className="tv-message">
          <div>
            <h2>The lift is better with company.</h2>
            <p>
              Scan to play on your phone · Room <b>{state.code}</b>
            </p>
          </div>
          <RoomQR code={state.code} compact />
        </div>
      )}
    </section>
  );
}
