'use client';
import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import type { Action, Snapshot } from '@/game/types';
import { SIGNALS } from '@/game/rules';
import { resultsImage } from '@/client/share-image';
import { Avatar } from './Avatar';
import { Footer } from './Brand';
import { AWARD_ICONS, Icon } from './Icon';
import { Modal } from './Modal';
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
    [shareLabel, setShareLabel] = useState('Share the evidence'),
    [blob, setBlob] = useState<Blob | null>(null);
  useEffect(() => {
    void resultsImage(state)
      .then(setBlob)
      .catch(() => {});
  }, [state]);
  const closeRecap = useCallback(() => setRecap(false), []);
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
        setShareLabel('Results image saved');
      }
    } catch (e) {
      if ((e as Error).name !== 'AbortError') setShareLabel('Couldn’t share. Try again');
    }
  }
  return (
    <section className="results">
      <p className="results-kicker">Final standings after 8 rounds</p>
      <h1>
        <span className="winner-name">{winners.map((p) => p.name).join(' & ')}</span>{' '}
        {winners.length > 1 ? 'share the penthouse' : 'takes the penthouse'}
      </h1>
      <div className="podium">
        {[1, 0, 2]
          .filter((i) => players[i])
          .map((i) => {
            const p = players[i];
            return (
              <div className={`podium-place place-${i + 1}`} key={p.id}>
                <span className="podium-crown">{i === 0 && <Icon name="crown" size={28} />}</span>
                <Avatar avatar={p.avatar} size={i === 0 ? 62 : 48} />
                <b>{p.name}</b>
                <div>
                  <strong>{p.score}</strong>
                  <small>points</small>
                  <span className="podium-rank">{['1st', '2nd', '3rd'][i]}</span>
                </div>
              </div>
            );
          })}
      </div>
      <div className="award-grid">
        {state.awards.map((a) => (
          <div className="award-card" key={a.title}>
            <span className="award-icon">
              <Icon name={AWARD_ICONS[a.title] ?? 'diamond'} size={22} />
            </span>
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
            One more lift? <span className="button-meta">Rematch</span>
            <Icon name="rematch" size={18} strokeWidth={2.2} />
          </button>
        )}
        <div className="split-actions">
          <button className="secondary" onClick={() => setRecap(true)}>
            Open the guest ledger
          </button>
          <button className="secondary" onClick={() => void share()}>
            <Icon name="share" size={16} />
            {shareLabel}
          </button>
        </div>
      </div>
      <p className="result-note">
        The winner took the blame for {first.snaps} {first.snaps === 1 ? 'snap' : 'snaps'}. A stay
        to remember.
      </p>
      <Link className="text-link" href="/">
        Back to the hotel
      </Link>
      <Footer />
      {recap && (
        <Modal
          label="Round-by-round guest ledger"
          closeLabel="Close ledger"
          onClose={closeRecap}
          className="ledger"
        >
          <h2>The guest ledger</h2>
          <p className="modal-lede">Every round, every load, every broken promise.</p>
          <div className="final-scores">
            {players.map((p, i) => (
              <div key={p.id}>
                <b>{i + 1}</b>
                <Avatar avatar={p.avatar} size={28} />
                <span>{p.name}</span>
                <strong>{p.score}</strong>
                <small>
                  {p.snaps} {p.snaps === 1 ? 'blame' : 'blames'}
                </small>
              </div>
            ))}
          </div>
          {state.history.map((r) => (
            <details key={r.round} className="round-ledger">
              <summary>
                <b>
                  Round {r.round}
                  {r.multiplier === 2 ? ' ×2' : ''}
                </b>
                <span>
                  {r.total} of {r.limit}
                </span>
                <strong className={r.fits ? 'fit-text' : 'snap-text'}>
                  {r.fits ? 'Fit' : 'Snap'}
                </strong>
              </summary>
              <div className="ledger-columns">
                <span>Guest and signal</span>
                <span>Load</span>
                <span>Points</span>
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
                    {e.blame ? ' blame' : e.salvage ? ' lightest' : ''}
                  </span>
                </div>
              ))}
            </details>
          ))}
        </Modal>
      )}
    </section>
  );
}
