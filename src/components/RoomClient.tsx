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
import { RoomQR, InviteButton, JoinAddress } from './RoomQR';
import { Results } from './Results';
import { playSound } from '@/client/sound';
import { Icon, SIGNAL_ICONS } from './Icon';

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
        <header className="site-header shell-header">
          <Brand small />
          <div className="header-tools">
            <SoundToggle />
            <Rules />
          </div>
        </header>
        <div className="skeleton lift-skeleton" aria-hidden="true" />
        <h2>{error ? 'We can’t reach that room' : 'Your lift is arriving'}</h2>
        <p role="status">{error || 'Finding room ' + code + '…'}</p>
        <Link className="secondary" href="/">
          Back to the desk
        </Link>
      </main>
    );
  if (!state.meId && !tv)
    return (
      <main className="join-page">
        <header className="site-header">
          <Brand small />
          <div className="header-tools">
            <SoundToggle />
            <Rules />
          </div>
        </header>
        <p className="room-tag">
          Room <b>{code}</b>
        </p>
        <h1>{state.phase === 'lobby' ? 'You’re on the list' : 'Take a front-row seat'}</h1>
        <p className="join-lede">
          {state.phase === 'lobby'
            ? 'Pick a name and a hat, then wait for the host to start.'
            : 'This game is underway. Watch it now and you’ll get a seat for the next one.'}
        </p>
        <RuleLines className="compact" />
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
            title={connected ? 'Live connection' : 'Reconnecting. Your seat is saved.'}
            role="status"
          >
            {connected ? 'Live' : 'Rejoining'}
          </span>
          <SoundToggle />
          <Rules />
          {tv ? (
            <Link className="icon-button" href="/" aria-label="Leave TV view">
              <Icon name="leave" size={18} />
            </Link>
          ) : (
            <button
              className="icon-button"
              aria-label="Leave room"
              disabled={leaving}
              onClick={() => void leave()}
            >
              <Icon name="leave" size={18} />
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
    <section className="lobby" data-crowded={seats.length >= 6}>
      <div className="room-code">
        <span>Room code</span>
        <strong>{state.code}</strong>
        {tv ? <JoinAddress code={state.code} /> : <InviteButton code={state.code} />}
        <RoomQR code={state.code} compact />
      </div>
      <h1>Who’s bringing too much baggage?</h1>
      <RuleLines className="compact" />
      <div className="guest-list">
        {seats.map((p) => (
          <div className="guest-row" key={p.id}>
            <Avatar avatar={p.avatar} />
            <div>
              <b>{p.name}</b>
              <small>{p.bot ? 'Bot' : p.id === state.hostId ? 'Host' : 'Checked in'}</small>
            </div>
            {p.bot && host && !tv && (
              <button
                className="icon-button"
                aria-label={`Remove ${p.name}`}
                onClick={() => void send({ type: 'remove-bot', id: p.id }).catch(() => {})}
              >
                <Icon name="minus" size={14} strokeWidth={2.4} />
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
              <option value="">Add a bot…</option>
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
            Start the lift <span className="button-meta">{seats.length} of 8 guests</span>
          </button>
        </>
      ) : (
        <p className="waiting" role="status">
          Waiting for the host to start. Get your story straight.
        </p>
      )}
      {!tv && (
        <Link className="tv-link" href={`/tv/${state.code}`} target="_blank">
          <Icon name="tv" size={16} /> Open the TV view for a big screen
        </Link>
      )}
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
          Room <b>{state.code}</b>
        </span>
        <span className="round-count" aria-label={`Round ${state.round} of 8`}>
          {Array.from({ length: 8 }, (_, i) => (
            <i
              key={i}
              className={i + 1 < state.round ? 'done' : i + 1 === state.round ? 'now' : ''}
            />
          ))}
          <b>{state.round}</b>/8
        </span>
        <span className={state.round >= 7 ? 'double active' : 'double'}>
          {state.round >= 7 ? 'Double points' : 'Last two ×2'}
        </span>
      </div>
      <div className="phase-heading">
        <div>
          <ol className="phase-track" aria-label="Round steps">
            {(['signal', 'load', 'reveal'] as const).map((phase) => (
              <li
                key={phase}
                aria-current={state.phase === phase ? 'step' : undefined}
                className={state.phase === phase ? 'now' : ''}
              >
                {phase === 'signal' ? 'Signal' : phase === 'load' ? 'Load' : 'Reveal'}
              </li>
            ))}
          </ol>
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
                  : 'How many crates?'}
          </h2>
        </div>
        <div
          className={`timer ${countdown <= 3 && !reveal ? 'urgent' : ''}`}
          role="timer"
          aria-label={`${countdown} seconds remaining`}
        >
          {countdown}
          <small>sec</small>
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
                <span
                  className={`player-state ${
                    reveal && revealing && elapsed >= timing.verdict
                      ? entry?.blame
                        ? 'blame'
                        : entry?.salvage
                          ? 'salvage'
                          : 'ok'
                      : p.locked
                        ? 'locked'
                        : p.signal
                          ? 'signalled'
                          : 'idle'
                  }`}
                >
                  {reveal && revealing && elapsed >= timing.verdict ? (
                    <Icon
                      name={entry?.blame ? 'minus' : entry?.salvage ? 'plus' : 'check'}
                      size={10}
                      strokeWidth={3}
                    />
                  ) : p.locked ? (
                    <Icon name="check" size={10} strokeWidth={3} />
                  ) : p.signal ? (
                    <Icon name={SIGNAL_ICONS[p.signal]} size={10} strokeWidth={2.6} />
                  ) : null}
                </span>
              </div>
              <b>{p.id === me?.id ? 'You' : p.name.split(' ').at(-1)?.slice(0, 7)}</b>
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
                </span>
              )}
            </div>
          );
        })}
      </div>
      {!tv ? (
        <>
          <div
            className={`signal-chips ${state.phase === 'signal' && me?.seat ? 'is-active' : ''}`}
            data-testid="signal-chips"
            role="group"
            aria-label="Signal your plan"
          >
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
                <Icon name={SIGNAL_ICONS[s.id]} size={18} strokeWidth={2.2} />
                {s.label}
              </button>
            ))}
          </div>
          <div
            className={`crate-picker ${canLoad ? 'is-active' : ''}`}
            data-testid="crate-picker"
            role="group"
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
            className={`primary lock-button ${me?.locked ? 'is-locked' : ''}`}
            disabled={!canLoad}
            onClick={() => void lock().catch(() => {})}
          >
            {(me?.locked || canLoad) && (
              <Icon name={me?.locked ? 'check' : 'lock'} size={18} strokeWidth={2.2} />
            )}
            {!me?.seat
              ? 'Watching. You’re seated next game.'
              : reveal
                ? 'The cable has spoken'
                : state.phase === 'signal'
                  ? 'Signal first, then load'
                  : me?.locked
                    ? `${state.myLoad} ${state.myLoad === 1 ? 'crate' : 'crates'} locked`
                    : pending
                      ? 'Locking in…'
                      : `Lock in ${pick} ${pick === 1 ? 'crate' : 'crates'}`}
          </button>
          <p className="controller-note">
            {reveal
              ? 'The next round starts automatically.'
              : state.phase === 'signal'
                ? 'Everyone sees your signal. Nobody can hold you to it.'
                : 'No pick in time? The porter loads 3 for you.'}
          </p>
        </>
      ) : (
        <div className="tv-message">
          <div>
            <h2>The lift is better with company</h2>
            <p>Scan to play on your phone, or open</p>
            <JoinAddress code={state.code} />
          </div>
          <RoomQR code={state.code} compact />
        </div>
      )}
    </section>
  );
}
