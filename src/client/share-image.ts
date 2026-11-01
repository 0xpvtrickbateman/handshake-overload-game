'use client';
import type { Snapshot } from '@/game/types';
import { COLORS } from '@/components/Avatar';
export async function resultsImage(state: Snapshot): Promise<Blob> {
  const canvas = document.createElement('canvas');
  canvas.width = 1080;
  canvas.height = 1350;
  const c = canvas.getContext('2d')!;
  await document.fonts?.ready;
  const css = getComputedStyle(document.documentElement);
  const display = css.getPropertyValue('--font-display').trim() || 'Georgia',
    sans = css.getPropertyValue('--font-sans').trim() || 'Arial';
  c.fillStyle = '#2b0f15';
  c.fillRect(0, 0, 1080, 1350);
  const gradient = c.createRadialGradient(540, 0, 0, 540, 0, 1000);
  gradient.addColorStop(0, '#6a2230');
  gradient.addColorStop(1, '#2b0f15');
  c.fillStyle = gradient;
  c.fillRect(0, 0, 1080, 1350);
  c.strokeStyle = '#d8b064';
  c.lineWidth = 2;
  c.strokeRect(30, 30, 1020, 1290);
  c.strokeRect(40, 40, 1000, 1270);
  const text = (
    s: string,
    x: number,
    y: number,
    size: number,
    color = '#f5e9d0',
    font = sans,
    weight = '400',
  ) => {
    c.fillStyle = color;
    c.font = `${weight} ${size}px ${font}`;
    c.fillText(s, x, y);
  };
  c.textAlign = 'center';
  text('Overload', 540, 118, 72, '#f2d491', display);
  text('The Grand Hotel, final guest ledger', 540, 160, 22, '#d7c5a6');
  const winners = state.players.filter((p) => state.winnerIds.includes(p.id));
  text(
    winners.length > 1
      ? 'A shared penthouse.'
      : `${winners[0]?.name ?? 'The guests'} ${winners[0]?.name === 'You' ? 'take' : 'takes'} the penthouse.`,
    540,
    245,
    winners.length === 1 && winners[0]?.name.length > 13 ? 36 : 43,
    '#f5e9d0',
    display,
  );
  text('Eight rounds. A few broken promises.', 540, 290, 22, '#f2d491');
  const players = state.standings.map((id) => state.players.find((p) => p.id === id)!);
  let y = 355;
  for (let i = 0; i < players.length; i++) {
    const p = players[i];
    c.textAlign = 'left';
    text(String(i + 1), 90, y + 10, 30, '#f2d491', display);
    c.fillStyle = COLORS[p.avatar.color];
    c.beginPath();
    c.arc(170, y, 23, 0, Math.PI * 2);
    c.fill();
    c.fillStyle = '#2b0f15';
    c.fillRect(155, y - 6, 30, 5);
    c.fillRect(161, y - 20, 18, 15);
    text(p.name, 218, y + 10, 29);
    c.textAlign = 'right';
    text(String(p.score), 825, y + 10, 36, '#f2d491', display);
    text(`${p.snaps} ${p.snaps === 1 ? 'blame' : 'blames'}`, 980, y + 8, 20, '#ae9a82');
    c.strokeStyle = '#ffffff1c';
    c.beginPath();
    c.moveTo(90, y + 33);
    c.lineTo(990, y + 33);
    c.stroke();
    y += 67;
  }
  y = Math.max(780, y + 30);
  for (let i = 0; i < state.awards.length; i++) {
    const a = state.awards[i],
      x = i % 2 ? 570 : 90,
      ay = y + Math.floor(i / 2) * 102;
    c.textAlign = 'left';
    text(a.title, x, ay, 22, '#f2d491', sans, '600');
    text(a.name, x, ay + 38, 30, '#f5e9d0', sans, '500');
  }
  c.textAlign = 'center';
  text('Load it up. Don’t snap the cable.', 540, 1193, 34, '#f2d491', display);
  text(`overload-game.vercel.app   ·   Room ${state.code}`, 540, 1238, 22);
  text('Made for the Handshake × OpenAI challenge', 540, 1283, 16, '#ae9a82');
  return new Promise((resolve, reject) =>
    canvas.toBlob(
      (blob) =>
        blob ? resolve(blob) : reject(new Error('Could not create the image. Please try again.')),
      'image/png',
    ),
  );
}
