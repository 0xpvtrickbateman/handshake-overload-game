'use client';
import type { Snapshot } from '@/game/types';
import { COLORS } from '@/components/Avatar';
export async function resultsImage(state: Snapshot): Promise<Blob> {
  const canvas = document.createElement('canvas');
  canvas.width = 1080;
  canvas.height = 1350;
  const c = canvas.getContext('2d')!;
  c.fillStyle = '#28191c';
  c.fillRect(0, 0, 1080, 1350);
  const gradient = c.createRadialGradient(540, 0, 0, 540, 0, 1000);
  gradient.addColorStop(0, '#6c2934');
  gradient.addColorStop(1, '#28191c');
  c.fillStyle = gradient;
  c.fillRect(0, 0, 1080, 1350);
  c.strokeStyle = '#d3b579';
  c.lineWidth = 2;
  c.strokeRect(30, 30, 1020, 1290);
  c.strokeRect(40, 40, 1000, 1270);
  const text = (
    s: string,
    x: number,
    y: number,
    size: number,
    color = '#f3e9d6',
    font = 'Arial',
    weight = '400',
  ) => {
    c.fillStyle = color;
    c.font = `${weight} ${size}px ${font}`;
    c.fillText(s, x, y);
  };
  c.textAlign = 'center';
  text('O V E R L O A D', 540, 115, 58, '#d3b579', 'Arial', '900');
  text('THE GRAND HOTEL  ·  FINAL GUEST LEDGER', 540, 157, 17, '#c4ae96');
  const winners = state.players.filter((p) => state.winnerIds.includes(p.id));
  text(
    winners.length > 1
      ? 'A shared penthouse.'
      : `${winners[0]?.name ?? 'The guests'} takes the penthouse.`,
    540,
    245,
    winners.length === 1 && winners[0]?.name.length > 13 ? 36 : 43,
    '#f3e9d6',
    'Georgia',
  );
  text('EIGHT LIFTS. A FEW BROKEN PROMISES.', 540, 284, 17, '#d3b579');
  const players = state.standings.map((id) => state.players.find((p) => p.id === id)!);
  let y = 355;
  for (let i = 0; i < players.length; i++) {
    const p = players[i];
    c.textAlign = 'left';
    text(String(i + 1).padStart(2, '0'), 90, y + 10, 25, '#d3b579', 'Georgia');
    c.fillStyle = COLORS[p.avatar.color];
    c.beginPath();
    c.arc(170, y, 23, 0, Math.PI * 2);
    c.fill();
    c.fillStyle = '#28191c';
    c.fillRect(155, y - 6, 30, 5);
    c.fillRect(161, y - 20, 18, 15);
    text(p.name, 218, y + 10, 29);
    c.textAlign = 'right';
    text(String(p.score), 825, y + 10, 32, '#d3b579', 'Georgia');
    text(`${p.snaps} blame`, 980, y + 8, 18, '#b7a797');
    c.strokeStyle = '#5c4740';
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
    text(a.title.toUpperCase(), x, ay, 18, '#d3b579', 'Arial', '700');
    text(a.name, x, ay + 37, 28, '#f3e9d6', 'Georgia');
  }
  c.textAlign = 'center';
  text('Load it up. Don’t snap the cable.', 540, 1193, 29, '#d3b579', 'Georgia');
  text(`overload-game.vercel.app   ·   Room ${state.code}`, 540, 1238, 22);
  text('MADE FOR THE HANDSHAKE × OPENAI CHALLENGE', 540, 1283, 13, '#b7a797');
  return new Promise((resolve, reject) =>
    canvas.toBlob(
      (blob) =>
        blob ? resolve(blob) : reject(new Error('Could not create the image. Please try again.')),
      'image/png',
    ),
  );
}
