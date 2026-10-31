'use client';
import { useEffect, useSyncExternalStore } from 'react';
import { isMuted, pauseAudio, setMuted, subscribeSound, unlockAudio } from '@/client/sound';
export function SoundToggle() {
  const off = useSyncExternalStore(subscribeSound, isMuted, () => true);
  useEffect(() => {
    const start = () => void unlockAudio();
    const visibility = () => {
      if (document.hidden) pauseAudio();
      else void unlockAudio();
    };
    document.addEventListener('pointerdown', start);
    document.addEventListener('keydown', start);
    document.addEventListener('visibilitychange', visibility);
    return () => {
      document.removeEventListener('pointerdown', start);
      document.removeEventListener('keydown', start);
      document.removeEventListener('visibilitychange', visibility);
    };
  }, []);
  return (
    <button
      className="icon-button sound-button"
      aria-label={off ? 'Unmute sound' : 'Mute sound'}
      aria-pressed={!off}
      onClick={() => {
        const next = !off;
        setMuted(next);
      }}
    >
      {off ? (
        <svg
          width="17"
          height="17"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.6"
          aria-hidden="true"
        >
          <path d="M11 5 6 9H3v6h3l5 4zM16 9l6 6m0-6-6 6" />
        </svg>
      ) : (
        <svg
          width="17"
          height="17"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.6"
          aria-hidden="true"
        >
          <path d="M11 5 6 9H3v6h3l5 4zM16 8a6 6 0 0 1 0 8M19 5a10 10 0 0 1 0 14" />
        </svg>
      )}
    </button>
  );
}
