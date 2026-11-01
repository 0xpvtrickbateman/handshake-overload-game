'use client';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { SoundToggle } from './Sound';
import { useCallback, useState } from 'react';
import { api } from '@/client/connection';
import type { Snapshot } from '@/game/types';
import { Avatar, COLORS } from './Avatar';
import { Brand, Footer } from './Brand';
import { RuleLines, Rules } from './Rules';
import { Dial } from './Dial';
import { Modal } from './Modal';

const HATS = ['Top hat', 'Cloche', 'Cap', 'Crown'];
export function GuestForm({
  onSubmit,
  label,
  busy = false,
}: {
  onSubmit: (name: string, avatar: { hat: number; color: number }) => void;
  label: string;
  busy?: boolean;
}) {
  const [name, setName] = useState(''),
    [hat, setHat] = useState(0),
    [color, setColor] = useState(0);
  return (
    <form
      className="guest-form"
      onSubmit={(e) => {
        e.preventDefault();
        onSubmit(name.trim() || 'Hotel Guest', { hat, color });
      }}
    >
      <label htmlFor="nickname">Your name at the desk</label>
      <input
        id="nickname"
        name="nickname"
        maxLength={18}
        placeholder="The Duchess"
        autoComplete="nickname"
        value={name}
        onChange={(e) => setName(e.target.value)}
      />
      <fieldset className="avatar-picker">
        <legend>Pick a look</legend>
        <Avatar avatar={{ hat, color }} size={64} />
        <div className="avatar-options">
          <div className="hat-options" role="group" aria-label="Hat">
            {HATS.map((label, i) => (
              <button
                type="button"
                key={label}
                aria-label={label}
                aria-pressed={hat === i}
                onClick={() => setHat(i)}
              >
                <Avatar avatar={{ hat: i, color }} size={30} />
              </button>
            ))}
          </div>
          <div className="color-options" role="group" aria-label="Color">
            {COLORS.map((c, i) => (
              <button
                type="button"
                key={c}
                style={{ background: c }}
                aria-label={`Guest color ${i + 1}`}
                aria-pressed={color === i}
                onClick={() => setColor(i)}
              />
            ))}
          </div>
        </div>
      </fieldset>
      <button className="primary" disabled={busy} type="submit">
        {busy ? 'Checking in…' : label}
      </button>
    </form>
  );
}

function HeroLift() {
  return (
    <div className="hero-lift">
      <div className="lift-transom">
        <Dial value={12} limit={14} className="hero-dial" />
        <p className="dial-caption">
          Tonight the cable holds <b>14 crates</b>
        </p>
      </div>
      <div className="lift-frame" aria-hidden="true">
        <div className="lift-door left" />
        <div className="lift-door right" />
        <div className="lift-sill" />
      </div>
    </div>
  );
}

export function Landing() {
  const router = useRouter();
  const [mode, setMode] = useState<'create' | 'join' | null>(null),
    [code, setCode] = useState(''),
    [error, setError] = useState(''),
    [busy, setBusy] = useState(false);
  const close = useCallback(() => {
    setMode(null);
    setError('');
  }, []);
  async function create(name: string, avatar: { hat: number; color: number }, solo = false) {
    setBusy(true);
    setError('');
    try {
      const room = await api<Snapshot>('/api/rooms', {
        name,
        avatar,
        solo,
        requestId: crypto.randomUUID(),
      });
      router.push(`/room/${room.code}`);
    } catch (e) {
      setError((e as Error).message);
      setBusy(false);
    }
  }
  return (
    <main className="landing">
      <header className="site-header">
        <Brand />
        <div className="header-tools">
          <SoundToggle />
          <Rules />
        </div>
      </header>
      <section className="hero" aria-labelledby="hero-title">
        <HeroLift />
        <div className="hero-copy">
          <h1 id="hero-title">
            Load it up.
            <br />
            Don’t snap the cable.
          </h1>
          <p className="lede">
            A bluffing game for 2 to 8 guests in a very old hotel freight lift. Four minutes, no
            account.
          </p>
          <div className="rules-plaque">
            <h2 className="plaque-title">How it works</h2>
            <RuleLines />
            <Link className="practice-link" href="/practice">
              Learn it in 15 seconds
            </Link>
          </div>
          <div className="hero-actions">
            <button
              className="primary play-now"
              disabled={busy}
              onClick={() => {
                let practiced = false;
                try {
                  practiced = localStorage.getItem('overload:practiced') === 'true';
                } catch {}
                if (practiced) void create('You', { hat: 0, color: 0 }, true);
                else router.push('/practice');
              }}
            >
              {busy ? 'Your lift is arriving…' : 'Play now vs bots'}
            </button>
            <div className="split-actions">
              <button className="secondary" onClick={() => setMode('create')}>
                Host a room
              </button>
              <button className="secondary" onClick={() => setMode('join')}>
                Join friends
              </button>
            </div>
            {error && !mode && (
              <p className="error" role="alert">
                {error}
              </p>
            )}
          </div>
        </div>
      </section>
      <Footer />
      {mode && (
        <Modal label={mode === 'create' ? 'Host a room' : 'Join a room'} onClose={close}>
          <h2>{mode === 'create' ? 'Host a room' : 'Join your friends'}</h2>
          <p className="modal-lede">
            {mode === 'create'
              ? 'You’ll get a room code and a QR to share. Bots can fill empty seats.'
              : 'Ask the host for the four-letter code on their screen.'}
          </p>
          {mode === 'join' && (
            <label className="code-label">
              Room code
              <input
                aria-label="Room code"
                maxLength={4}
                placeholder="ABCD"
                autoCapitalize="characters"
                autoComplete="off"
                spellCheck={false}
                value={code}
                onChange={(e) => setCode(e.target.value.toUpperCase().replace(/[^A-Z]/g, ''))}
              />
            </label>
          )}
          <GuestForm
            busy={busy}
            label={mode === 'create' ? 'Create room' : 'Join room'}
            onSubmit={(name, avatar) => {
              if (mode === 'create') void create(name, avatar);
              else {
                if (code.length !== 4) {
                  setError('Enter the four-letter room code.');
                  return;
                }
                setBusy(true);
                void api<Snapshot>(`/api/rooms/${code}`, {
                  action: { type: 'join', name, avatar },
                  requestId: crypto.randomUUID(),
                })
                  .then(() => router.push(`/room/${code}`))
                  .catch((e) => {
                    setError(e.message);
                    setBusy(false);
                  });
              }
            }}
          />
          {error && (
            <p role="alert" className="error">
              {error}
            </p>
          )}
        </Modal>
      )}
    </main>
  );
}
