'use client';
let context: AudioContext | null = null;
let hum: GainNode | null = null;
let drone: OscillatorNode | null = null;
// 0 to 1: how hard the car is pulling on the cable. Bends the drone from 54 Hz toward 62 Hz.
let strain = 0;
const DRONE_BASE = 54,
  DRONE_STRAINED = 62;
let muted = false;
let initialized = false;
const listeners = new Set<() => void>();
export function subscribeSound(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}
export function isMuted() {
  if (!initialized && typeof window !== 'undefined') {
    try {
      muted = localStorage.getItem('overload:muted') === 'true';
    } catch {}
    initialized = true;
  }
  return muted;
}
export function setMuted(value: boolean) {
  muted = value;
  try {
    localStorage.setItem('overload:muted', String(value));
  } catch {}
  if (hum && context) hum.gain.setTargetAtTime(value ? 0 : 0.018, context.currentTime, 0.15);
  if (!value) void unlockAudio();
  listeners.forEach((listener) => listener());
}
export async function unlockAudio() {
  if (isMuted()) return;
  try {
    context ??= new AudioContext();
    if (context.state === 'suspended') await context.resume();
    if (!hum) {
      hum = context.createGain();
      hum.gain.value = 0.018;
      hum.connect(context.destination);
      drone = context.createOscillator();
      drone.type = 'sine';
      drone.frequency.value = DRONE_BASE + (DRONE_STRAINED - DRONE_BASE) * strain;
      drone.connect(hum);
      drone.start();
    }
  } catch {}
}
export function setStrain(fraction: number) {
  const next = Number.isFinite(fraction) ? Math.min(1, Math.max(0, fraction)) : 0;
  if (next === strain) return;
  strain = next;
  if (!drone || !context) return;
  try {
    drone.frequency.setTargetAtTime(
      DRONE_BASE + (DRONE_STRAINED - DRONE_BASE) * next,
      context.currentTime,
      next ? 0.2 : 0.45,
    );
  } catch {}
}
// Haptics never fire before the page has had a tap or key press: browsers block (and log)
// vibrate calls without user activation, and iOS Safari has no vibrate at all.
export function haptic(pattern: number | number[]) {
  try {
    if (typeof navigator === 'undefined' || typeof navigator.vibrate !== 'function') return;
    const activation = (navigator as Navigator & { userActivation?: { hasBeenActive: boolean } })
      .userActivation;
    if (activation && !activation.hasBeenActive) return;
    navigator.vibrate(pattern);
  } catch {}
}
export function pauseAudio() {
  if (context?.state === 'running') void context.suspend();
}
function tone(
  frequency: number,
  duration: number,
  volume: number,
  delay = 0,
  end = frequency,
  type: OscillatorType = 'sine',
) {
  if (!context) return;
  const t = context.currentTime + delay,
    oscillator = context.createOscillator(),
    envelope = context.createGain();
  oscillator.type = type;
  oscillator.frequency.setValueAtTime(frequency, t);
  oscillator.frequency.exponentialRampToValueAtTime(Math.max(end, 1), t + duration);
  envelope.gain.setValueAtTime(0.001, t);
  envelope.gain.exponentialRampToValueAtTime(volume, t + 0.008);
  envelope.gain.exponentialRampToValueAtTime(0.001, t + duration);
  oscillator.connect(envelope);
  envelope.connect(context.destination);
  oscillator.start(t);
  oscillator.stop(t + duration + 0.02);
}
function noise(
  duration: number,
  volume: number,
  frequency: number,
  delay = 0,
  end = frequency,
  q = 1,
) {
  if (!context) return;
  const t = context.currentTime + delay;
  const buffer = context.createBuffer(1, context.sampleRate * duration, context.sampleRate),
    channel = buffer.getChannelData(0);
  for (let i = 0; i < channel.length; i++)
    channel[i] = (Math.random() * 2 - 1) * (1 - i / channel.length);
  const source = context.createBufferSource(),
    filter = context.createBiquadFilter(),
    gain = context.createGain();
  source.buffer = buffer;
  filter.type = 'bandpass';
  filter.frequency.setValueAtTime(frequency, t);
  if (end !== frequency)
    filter.frequency.exponentialRampToValueAtTime(Math.max(end, 1), t + duration);
  filter.Q.value = q;
  gain.gain.value = volume;
  source.connect(filter);
  filter.connect(gain);
  gain.connect(context.destination);
  source.start(t);
}
export type SoundCue = 'lock' | 'thud' | 'fit' | 'snap' | 'salvage' | 'chime' | 'creak';
// intensity is only read by 'creak': the load on the car as a fraction of the limit.
export function playSound(cue: SoundCue, index = 0, intensity = 1) {
  if (isMuted() || !context || context.state !== 'running') return;
  try {
    voice(cue, index, intensity);
  } catch {}
}
function voice(cue: SoundCue, index: number, intensity: number) {
  if (cue === 'chime') {
    // The lift bell: a soft high-low ding-dong as the doors seal.
    tone(1046, 0.2, 0.05);
    tone(784, 0.23, 0.045, 0.12);
  }
  if (cue === 'creak') {
    const load = Math.min(1.15, Math.max(0, intensity));
    noise(0.3, 0.55 * load, 180, 0.02, 90, 4);
  }
  if (cue === 'lock') {
    tone(260, 0.09, 0.08);
    tone(390, 0.09, 0.05, 0.07);
  }
  if (cue === 'thud') {
    tone(100 + index * 18, 0.2, 0.18, 0, 42 + index * 8, 'triangle');
    noise(0.08, 0.16, 500);
  }
  if (cue === 'fit') {
    tone(880, 0.9, 0.12);
    tone(1320, 0.8, 0.065, 0.08);
  }
  if (cue === 'snap') {
    tone(280, 0.6, 0.15, 0, 25, 'sawtooth');
    noise(0.15, 0.35, 2200);
    noise(0.9, 0.2, 700, 0.25);
  }
  if (cue === 'salvage') {
    tone(520, 0.16, 0.045);
    tone(780, 0.25, 0.035, 0.1);
  }
}
