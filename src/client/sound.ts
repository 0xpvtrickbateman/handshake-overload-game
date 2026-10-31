'use client';
let context: AudioContext | null = null;
let hum: GainNode | null = null;
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
      const drone = context.createOscillator();
      drone.type = 'sine';
      drone.frequency.value = 54;
      drone.connect(hum);
      drone.start();
    }
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
function noise(duration: number, volume: number, frequency: number, delay = 0) {
  if (!context) return;
  const buffer = context.createBuffer(1, context.sampleRate * duration, context.sampleRate),
    channel = buffer.getChannelData(0);
  for (let i = 0; i < channel.length; i++)
    channel[i] = (Math.random() * 2 - 1) * (1 - i / channel.length);
  const source = context.createBufferSource(),
    filter = context.createBiquadFilter(),
    gain = context.createGain();
  source.buffer = buffer;
  filter.type = 'bandpass';
  filter.frequency.value = frequency;
  filter.Q.value = 1;
  gain.gain.value = volume;
  source.connect(filter);
  filter.connect(gain);
  gain.connect(context.destination);
  source.start(context.currentTime + delay);
}
export function playSound(cue: 'lock' | 'thud' | 'fit' | 'snap' | 'salvage', index = 0) {
  if (isMuted() || !context || context.state !== 'running') return;
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
