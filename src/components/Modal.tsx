'use client';
import { useEffect, useRef } from 'react';
import { Icon } from './Icon';
export function Modal({
  label,
  onClose,
  closeLabel = 'Close',
  className = '',
  children,
}: {
  label: string;
  onClose: () => void;
  closeLabel?: string;
  className?: string;
  children: React.ReactNode;
}) {
  const panel = useRef<HTMLElement>(null),
    closer = useRef(onClose);
  useEffect(() => {
    closer.current = onClose;
  });
  useEffect(() => {
    const opener = document.activeElement as HTMLElement | null;
    panel.current?.focus();
    const key = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        closer.current();
        return;
      }
      if (e.key !== 'Tab' || !panel.current) return;
      // Keep keyboard focus inside the dialog.
      const items = [
        ...panel.current.querySelectorAll<HTMLElement>(
          'a[href],button:not([disabled]),input:not([disabled]),select:not([disabled]),summary,[tabindex]:not([tabindex="-1"])',
        ),
      ].filter((el) => el.offsetParent !== null);
      if (!items.length) {
        e.preventDefault();
        return;
      }
      const first = items[0],
        last = items[items.length - 1],
        active = document.activeElement;
      if (e.shiftKey && (active === first || active === panel.current)) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && (active === last || !panel.current.contains(active))) {
        e.preventDefault();
        first.focus();
      }
    };
    window.addEventListener('keydown', key);
    return () => {
      window.removeEventListener('keydown', key);
      opener?.focus?.();
    };
  }, []);
  return (
    <div className="modal-backdrop" onClick={onClose}>
      <section
        ref={panel}
        tabIndex={-1}
        className={`modal ${className}`}
        role="dialog"
        aria-modal="true"
        aria-label={label}
        onClick={(e) => e.stopPropagation()}
      >
        <button className="close" aria-label={closeLabel} onClick={onClose}>
          <Icon name="close" size={20} />
        </button>
        {children}
      </section>
    </div>
  );
}
