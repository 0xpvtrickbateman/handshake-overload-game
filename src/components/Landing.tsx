'use client';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { SoundToggle } from './Sound';
import { useState } from 'react';
import { api } from '@/client/connection';
import type { Snapshot } from '@/game/types';
import { Avatar, COLORS } from './Avatar';
import { Brand, Footer } from './Brand';
import { Rules } from './Rules';

export function GuestForm({ onSubmit, label, busy = false }: { onSubmit: (name: string, avatar: { hat: number; color: number }) => void; label: string; busy?: boolean }) {
  const [name, setName] = useState(''), [hat, setHat] = useState(0), [color, setColor] = useState(0);
  return <form className="guest-form" onSubmit={e => { e.preventDefault(); onSubmit(name.trim() || 'Hotel Guest', { hat, color }); }}><label htmlFor="nickname">YOUR NAME AT THE DESK</label><input id="nickname" name="nickname" maxLength={18} placeholder="e.g. The Duchess" autoComplete="nickname" value={name} onChange={e => setName(e.target.value)} /><div className="avatar-picker"><Avatar avatar={{ hat, color }} size={58} /><div><div className="hat-options">{['Top hat', 'Cloche', 'Cap', 'Crown'].map((label, i) => <button type="button" key={label} aria-label={label} aria-pressed={hat === i} onClick={() => setHat(i)}>{['♜', '◡', '◒', '♛'][i]}</button>)}</div><div className="color-options">{COLORS.map((c, i) => <button type="button" key={c} style={{ background: c }} aria-label={`Guest color ${i + 1}`} aria-pressed={color === i} onClick={() => setColor(i)} />)}</div></div></div><button className="primary" disabled={busy} type="submit">{busy ? 'Checking in…' : label} <span>↗</span></button></form>;
}
export function Landing() {
  const router = useRouter();
  const [mode, setMode] = useState<'create' | 'join' | null>(null), [code, setCode] = useState(''), [error, setError] = useState(''), [busy, setBusy] = useState(false);
  async function create(name: string, avatar: { hat: number; color: number }, solo = false) {
    setBusy(true); setError('');
    try { const room = await api<Snapshot>('/api/rooms', { name, avatar, solo, requestId: crypto.randomUUID() }); router.push(`/room/${room.code}`); }
    catch (e) { setError((e as Error).message); setBusy(false); }
  }
  return <main className="landing"><header><Brand /><div className="header-tools"><SoundToggle /><Rules /></div></header><section className="hero"><p className="eyebrow">THE GRAND HOTEL · EST. 1931</p><h1>Good company.<br /><em>Questionable cargo.</em></h1><p className="tagline">Load it up. Don’t snap the cable.</p><div className="hero-lift" aria-hidden="true"><div className="lift-crown">◆ &nbsp; FREIGHT &nbsp; ◆</div><div className="lift-doors"><div /><div /><span className="lift-dial">↟<small>CAPACITY<br />PROBABLY FINE</small></span><div className="hero-crates"><i>1</i><i>3</i><i>6</i></div></div><div className="lift-floor" /></div><div className="hero-meta"><span>2–8 guests</span><b>◆</b><span>4 minutes</span><b>◆</b><span>Trust optional</span></div><button className="primary play-now" disabled={busy} onClick={() => { let practiced = false; try { practiced = localStorage.getItem('overload:practiced') === 'true'; } catch {} if (practiced) void create('You', { hat: 0, color: 0 }, true); else router.push('/practice'); }}>{busy ? 'Your lift is arriving…' : 'Play now vs bots'} <span>↗</span></button><div className="split-actions"><button className="secondary" onClick={() => setMode('create')}>Host a room</button><button className="secondary" onClick={() => setMode('join')}>Join friends</button></div>{error && <p className="error" role="alert">{error}</p>}<p className="hero-note">Secret crates. Public blame. Absolutely no account.</p><Link className="practice-link" href="/practice">Learn it in 15 seconds ↗</Link></section><Footer />{mode && <div className="modal-backdrop"><section className="modal" role="dialog" aria-modal="true" aria-label={mode === 'create' ? 'Host a room' : 'Join a room'}><button className="close" aria-label="Close" onClick={() => setMode(null)}>×</button><p className="eyebrow">WELCOME TO THE GRAND</p><h2>{mode === 'create' ? 'Your usual room?' : 'The gang’s upstairs.'}</h2>{mode === 'join' && <label className="code-label">FOUR-LETTER ROOM CODE<input aria-label="Room code" maxLength={4} placeholder="ABCD" value={code} onChange={e => setCode(e.target.value.toUpperCase().replace(/[^A-Z]/g, ''))} /></label>}<GuestForm busy={busy} label={mode === 'create' ? 'Create room' : 'Join room'} onSubmit={(name, avatar) => { if (mode === 'create') void create(name, avatar); else { if (code.length !== 4) { setError('Enter the four-letter room code.'); return; } setBusy(true); void api<Snapshot>(`/api/rooms/${code}`, { action: { type: 'join', name, avatar }, requestId: crypto.randomUUID() }).then(() => router.push(`/room/${code}`)).catch(e => { setError(e.message); setBusy(false); }); } }} />{error && <p role="alert" className="error">{error}</p>}</section></div>}</main>;
}
