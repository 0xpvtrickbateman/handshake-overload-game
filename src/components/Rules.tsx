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
          Each round, <b>secretly load 1 to 6 crates.</b>
        </span>
      </li>
      <li>
        <span className="rule-icon fit">
          <Icon name="check" size={16} strokeWidth={2.4} />
        </span>
        <span>
          Fits under the limit? <b>Everyone banks their crates.</b>
        </span>
      </li>
      <li>
        <span className="rule-icon snap">
          <Icon name="bolt" size={15} />
        </span>
        <span>
          Too heavy? The cable snaps: <b>the heaviest loader loses 3, the lightest gets +2.</b>
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
                Before loading, everyone shows Going light, Going heavy or Shrug. It’s a promise you
                don’t have to keep.
              </dd>
            </div>
            <div>
              <dt>Timing</dt>
              <dd>5 seconds to signal, 10 to load. No pick in time? The porter loads 3.</dd>
            </div>
            <div>
              <dt>Ties</dt>
              <dd>Every tied heaviest loader loses 3 and every tied lightest loader gets +2.</dd>
            </div>
            <div>
              <dt>Winning</dt>
              <dd>
                8 rounds. The last two count double. Most points wins; fewer blames breaks a tie.
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
