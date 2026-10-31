'use client';
import { useCallback, useState } from 'react';
import { Icon } from './Icon';
import { Modal } from './Modal';
export function RuleLines({ className = '' }: { className?: string }) {
  return (
    <ul className={`rule-lines ${className}`}>
      <li>
        <span className="rule-icon load">
          <Icon name="crate" size={16} />
        </span>
        <span>
          Each round, signal anything, then <b>secretly load 1 to 6 crates.</b>
        </span>
      </li>
      <li>
        <span className="rule-icon fit">
          <Icon name="check" size={16} strokeWidth={2.4} />
        </span>
        <span>
          At or under the limit? It fits: <b>everyone banks their crates.</b>
        </span>
      </li>
      <li>
        <span className="rule-icon snap">
          <Icon name="bolt" size={15} />
        </span>
        <span>
          Over the limit? The cable snaps:{' '}
          <b>nobody banks, the heaviest loader loses 3, the lightest gets +2.</b>
        </span>
      </li>
      <li>
        <span className="rule-icon win">
          <Icon name="crown" size={14} />
        </span>
        <span>
          8 rounds, the last two count double. <b>Most points wins.</b>
        </span>
      </li>
    </ul>
  );
}
export function Rules() {
  const [open, setOpen] = useState(false);
  const close = useCallback(() => setOpen(false), []);
  return (
    <>
      <button
        className="icon-button help-button"
        aria-label="How to play"
        aria-haspopup="dialog"
        onClick={() => setOpen(true)}
      >
        <span aria-hidden="true">?</span>
      </button>
      {open && (
        <Modal label="How to play" closeLabel="Close rules" onClose={close} className="rules-modal">
          <h2>How to play</h2>
          <RuleLines />
          <dl className="rule-details">
            <div>
              <dt>Signals</dt>
              <dd>
                Before loading, everyone shows a signal. Going light means 1 to 3 crates, Going
                heavy means 4 to 6, and Shrug promises nothing. Signals are promises you don’t have
                to keep; keeping them counts toward the Honest Abe award.
              </dd>
            </div>
            <div>
              <dt>Timing</dt>
              <dd>5 seconds to signal, 10 to load. No pick in time? The porter loads 3 for you.</dd>
            </div>
            <div>
              <dt>Fit or snap</dt>
              <dd>
                A total exactly at the limit still fits. Over the limit, nobody banks any crates
                that round.
              </dd>
            </div>
            <div>
              <dt>Ties</dt>
              <dd>
                Every tied heaviest loader loses 3 and every tied lightest loader gets +2. If
                everyone loads the same on a snap, both apply to everyone.
              </dd>
            </div>
            <div>
              <dt>Double rounds</dt>
              <dd>The last two rounds double everything: banked crates, penalties and salvage.</dd>
            </div>
            <div>
              <dt>Winning</dt>
              <dd>
                Most points after 8 rounds wins. Fewer blames breaks a tie. Equal points and equal
                blames share the win.
              </dd>
            </div>
          </dl>
          <p className="keyboard-hint">
            Keyboard: <kbd>L</kbd> <kbd>H</kbd> <kbd>S</kbd> to signal, <kbd>1</kbd>–<kbd>6</kbd> to
            pick, <kbd>Enter</kbd> to lock in.
          </p>
          <button className="primary" onClick={close}>
            Got it
          </button>
        </Modal>
      )}
    </>
  );
}
