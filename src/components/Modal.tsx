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
      if (e.key === 'Escape') closer.current();
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
