'use client';
import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import type { Snapshot } from '@/game/types';
import { api } from '@/client/connection';
import { Brand } from './Brand';
import { SoundToggle } from './Sound';
import { ElevatorStage } from './ElevatorStage';
const lessons = [
  {
    title: 'Room for a little ambition.',
    text: '12 crates. Limit 14. It fits! Everyone banks exactly what they loaded.',
    label: 'FIT → BANK YOUR CRATES',
    icon: '↟',
  },
  {
    title: 'Meet the blame game.',
    text: '16 crates. Limit 14. Snap! Nobody banks. Gus loaded the most, so he loses 3.',
    label: 'SNAP → HEAVIEST LOSES 3',
    icon: 'ϟ',
  },
  {
    title: 'Travel light. Land on your feet.',
    text: 'The lift snapped, but you packed the least. Salvage +2 while the greedy guest pays.',
    label: 'LIGHTEST → SALVAGE +2',
    icon: '✧',
  },
];
export function Practice({ scenes }: { scenes: Snapshot[] }) {
  const router = useRouter(),
    [elapsed, setElapsed] = useState(0),
    [error, setError] = useState(''),
    [busy, setBusy] = useState(false),
    starting = useRef(false);
  const began = useRef(0);
  useEffect(() => {
    began.current = Date.now();
    const timer = setInterval(() => setElapsed(Date.now() - began.current), 33);
    return () => clearInterval(timer);
  }, []);
  const index = Math.min(2, Math.floor(elapsed / 5000)),
    local = elapsed - index * 5000,
    lesson = lessons[index];
  async function play() {
    if (starting.current) return;
    starting.current = true;
    setBusy(true);
    setError('');
    try {
      try {
        localStorage.setItem('overload:practiced', 'true');
      } catch {}
      const room = await api<Snapshot>('/api/rooms', {
        name: 'You',
        avatar: { hat: 0, color: 0 },
        solo: true,
        requestId: crypto.randomUUID(),
      });
      router.replace(`/room/${room.code}`);
    } catch (e) {
      starting.current = false;
      setBusy(false);
      setError((e as Error).message);
    }
  }
  useEffect(() => {
    if (elapsed >= 15000 && !starting.current && !error) void play();
  });
  return (
    <main className="practice-page">
      <header>
        <Brand small />
        <SoundToggle />
      </header>
      <div className="practice-heading">
        <p className="eyebrow">ROUND 0 · THE PORTER’S CRASH COURSE</p>
        <h1>{lesson.title}</h1>
      </div>
      <ElevatorStage key={index} state={scenes[index]} now={local} practice />
      <div className="practice-callout">
        <span>{lesson.icon}</span>
        <div>
          <b>{lesson.label}</b>
          <p>{lesson.text}</p>
        </div>
      </div>
      <div className="practice-progress">
        {lessons.map((_, i) => (
          <i className={i <= index ? 'done' : ''} key={i} />
        ))}
      </div>
      <button className="primary" disabled={busy} onClick={() => void play()}>
        {busy
          ? 'Your first real lift is arriving…'
          : index === 2
            ? 'Got it. Let’s play.'
            : 'Skip practice & play'}
        <span>↗</span>
      </button>
      <p className="controller-note">
        {error || '15 seconds. Three lessons. Then the real thing.'}
      </p>
    </main>
  );
}
