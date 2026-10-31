'use client';
import { useEffect, useRef, useState } from 'react';
import QRCode from 'qrcode';
export function RoomQR({ code, compact = false }: { code: string; compact?: boolean }) {
  const canvas = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    if (canvas.current)
      void QRCode.toCanvas(canvas.current, `${location.origin}/room/${code}`, {
        width: compact ? 256 : 360,
        margin: 2,
        color: { dark: '#28191c', light: '#f3e9d6' },
        errorCorrectionLevel: 'M',
      })
        .then(() => {
          canvas.current?.style.removeProperty('width');
          canvas.current?.style.removeProperty('height');
        })
        .catch(() => {});
  }, [code, compact]);
  return (
    <div className={`room-qr ${compact ? 'compact' : ''}`}>
      <canvas ref={canvas} aria-label={`Scan to join room ${code}`} role="img" />
      <div>
        <b>SCAN. JOIN. BLUFF.</b>
        <span>Room {code}</span>
      </div>
    </div>
  );
}
export function InviteButton({ code }: { code: string }) {
  const [label, setLabel] = useState('Invite friends ↗');
  return (
    <button
      className="secondary"
      onClick={async () => {
        const url = `${location.origin}/room/${code}`;
        try {
          if (navigator.share)
            await navigator.share({
              title: 'OVERLOAD — your lift is waiting',
              text: `Join room ${code}. Load it up. Don’t snap the cable.`,
              url,
            });
          else {
            await navigator.clipboard.writeText(url);
            setLabel('Invite copied ✓');
          }
        } catch (e) {
          if ((e as Error).name !== 'AbortError') setLabel(`Share code ${code}`);
        }
      }}
    >
      {label}
    </button>
  );
}
