'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import type { Action, Snapshot } from '@/game/types';
import { SIGNALS } from '@/game/rules';
import { resultsImage } from '@/client/share-image';
import { Avatar } from './Avatar';
import { Footer } from './Brand';
export function Results({
  state,
  send,
  tv,
}: {
  state: Snapshot;
  send: (action: Action) => Promise<Snapshot>;
  tv: boolean;
}) {
  const players = state.standings.map((id) => state.players.find((p) => p.id === id)!),
    first = players[0];
  const winners = players.filter((p) => state.winnerIds.includes(p.id));
  const [recap, setRecap] = useState(false),
    [shareLabel, setShareLabel] = useState('Share the evidence ↗'),
    [blob, setBlob] = useState<Blob | null>(null);
  useEffect(() => {
    void resultsImage(state)
      .then(setBlob)
      .catch(() => {});
  }, [state]);
  async function share() {
    try {
      const image = blob ?? (await resultsImage(state));
      const file = new File([image], `OVERLOAD-${state.code}.png`, { type: 'image/png' });
      if (navigator.canShare?.({ files: [file] }))
        await navigator.share({ files: [file], title: 'OVERLOAD — the final guest ledger' });
      else {
        const url = URL.createObjectURL(image),
          a = document.createElement('a');
        a.href = url;
        a.download = file.name;
        a.click();
        setTimeout(() => URL.revokeObjectURL(url), 1000);
        setShareLabel('Results image saved ✓');
      }
    } catch (e) {
      if ((e as Error).name !== 'AbortError') setShareLabel('Try sharing again ↗');
    }
  }
  return (
    <section className="results">
      <p className="eyebrow">EIGHT LIFTS. A FEW BROKEN PROMISES.</p>
      <h1>
        {winners.map((p) => p.name).join(' & ')}
        <br />
        <em>{winners.length > 1 ? 'share the penthouse.' : 'takes the penthouse.'}</em>
      </h1>
      <div className="podium">
        {[1, 0, 2]
          .filter((i) => players[i])
          .map((i) => {
            const p = players[i];
            return (
              <div className={`podium-place place-${i + 1}`} key={p.id}>
                <span className="podium-crown">{i === 0 ? '♛' : ''}</span>
                <Avatar avatar={p.avatar} size={i === 0 ? 62 : 48} />
                <b>{p.name}</b>
                <div>
                  <strong>{p.score}</strong>
                  <small>POINTS</small>
                  <span>{i + 1}</span>
                </div>
              </div>
            );
          })}
      </div>
      <div className="award-grid">
        {state.awards.map((a) => (
          <div className="award-card" key={a.title}>
            <span>{a.icon}</span>
            <div>
              <small>{a.title}</small>
              <b>{a.name}</b>
              <p>{a.detail}</p>
            </div>
          </div>
        ))}
      </div>
      <div className="results-actions">
        {!tv && (
          <button
            className="primary"
            onClick={() => void send({ type: 'rematch' }).catch(() => {})}
          >
            One more lift? <span>Rematch ↻</span>
          </button>
        )}
        <div className="split-actions">
          <button className="secondary" onClick={() => setRecap(true)}>
            Open the guest ledger
          </button>
          <button className="secondary" onClick={() => void share()}>
            {shareLabel}
          </button>
        </div>
      </div>
      <p className="result-note">
        {first.snaps} blamed {first.snaps === 1 ? 'snap' : 'snaps'} for the winner. A stay to
        remember.
      </p>
      <Link className="text-link" href="/">
        Back to the hotel
      </Link>
      <Footer />
      {recap && (
        <div className="modal-backdrop">
          <section
            className="modal ledger"
            role="dialog"
            aria-modal="true"
            aria-label="Round-by-round guest ledger"
          >
            <button className="close" aria-label="Close ledger" onClick={() => setRecap(false)}>
              ×
            </button>
            <p className="eyebrow">THE HOTEL KEEPS RECEIPTS</p>
            <h2>The guest ledger</h2>
            <div className="final-scores">
              {players.map((p, i) => (
                <div key={p.id}>
                  <b>{i + 1}</b>
                  <Avatar avatar={p.avatar} size={28} />
                  <span>{p.name}</span>
                  <strong>{p.score}</strong>
                  <small>{p.snaps} blame</small>
                </div>
              ))}
            </div>
            {state.history.map((r) => (
              <details key={r.round} className="round-ledger">
                <summary>
                  <b>
                    Lift {r.round}
                    {r.multiplier === 2 ? ' ×2' : ''}
                  </b>
                  <span>
                    {r.total} / {r.limit}
                  </span>
                  <strong className={r.fits ? 'fit-text' : 'snap-text'}>
                    {r.fits ? 'FIT' : 'SNAP'}
                  </strong>
                </summary>
                <div className="ledger-columns">
                  <span>GUEST / SIGNAL</span>
                  <span>LOAD</span>
                  <span>POINTS</span>
                </div>
                {r.entries.map((e) => (
                  <div className="ledger-row" key={e.id}>
                    <div>
                      <b>{e.name}</b>
                      <small>{SIGNALS.find((s) => s.id === e.signal)?.label}</small>
                    </div>
                    <strong>{e.load}</strong>
                    <span className={e.delta < 0 ? 'snap-text' : 'fit-text'}>
                      {e.delta > 0 ? '+' : ''}
                      {e.delta}
                      {e.blame ? ' BLAME' : e.salvage ? ' SAVE' : ''}
                    </span>
                  </div>
                ))}
              </details>
            ))}
          </section>
        </div>
      )}
    </section>
  );
}
