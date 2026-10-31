'use client';
let context: AudioContext | null = null;
let hum: GainNode | null = null;
let muted = false;
let initialized = false;
const listeners = new Set<() => void>();
export function subscribeSound(listener: () => void) { listeners.add(listener); return () => { listeners.delete(listener); }; }
export function isMuted() { if (!initialized && typeof window !== 'undefined') { try { muted = localStorage.getItem('overload:muted') === 'true'; } catch {} initialized = true; } return muted; }
export function setMuted(value: boolean) { muted = value; try { localStorage.setItem('overload:muted', String(value)); } catch {} if (hum && context) hum.gain.setTargetAtTime(value ? 0 : .018, context.currentTime, .15); if (!value) void unlockAudio(); listeners.forEach(listener => listener()); }
export async function unlockAudio() {
  if (isMuted()) return;
  try {
    context ??= new AudioContext();
    if (context.state === 'suspended') await context.resume();
    if (!hum) { hum = context.createGain(); hum.gain.value = .018; hum.connect(context.destination); const drone = context.createOscillator(); drone.type = 'sine'; drone.frequency.value = 54; drone.connect(hum); drone.start(); }
  } catch {}
}
export function pauseAudio() { if (context?.state === 'running') void context.suspend(); }
function tone(frequency: number, duration: number, volume: number, delay = 0, end = frequency, type: OscillatorType = 'sine') {
  if (!context) return; const t = context.currentTime + delay, oscillator = context.createOscillator(), envelope = context.createGain();
  oscillator.type = type; oscillator.frequency.setValueAtTime(frequency, t); oscillator.frequency.exponentialRampToValueAtTime(Math.max(end, 1), t + duration);
  envelope.gain.setValueAtTime(.001, t); envelope.gain.exponentialRampToValueAtTime(volume, t + .008); envelope.gain.exponentialRampToValueAtTime(.001, t + duration);
  oscillator.connect(envelope); envelope.connect(context.destination); oscillator.start(t); oscillator.stop(t + duration + .02);
}
function noise(duration: number, volume: number, frequency: number, delay = 0) {
  if (!context) return; const buffer = context.createBuffer(1, context.sampleRate * duration, context.sampleRate), channel = buffer.getChannelData(0);
  for (let i = 0; i < channel.length; i++) channel[i] = (Math.random() * 2 - 1) * (1 - i / channel.length);
  const source = context.createBufferSource(), filter = context.createBiquadFilter(), gain = context.createGain();
  source.buffer = buffer; filter.type = 'bandpass'; filter.frequency.value = frequency; filter.Q.value = 1; gain.gain.value = volume;
  source.connect(filter); filter.connect(gain); gain.connect(context.destination); source.start(context.currentTime + delay);
}
export function playSound(cue: 'lock' | 'thud' | 'fit' | 'snap' | 'salvage', index = 0) {
  if (isMuted() || !context || context.state !== 'running') return;
  if (cue === 'lock') { tone(260, .09, .08); tone(390, .09, .05, .07); }
  if (cue === 'thud') { tone(100 + index * 18, .2, .18, 0, 42 + index * 8, 'triangle'); noise(.08, .16, 500); }
  if (cue === 'fit') { tone(880, .9, .12); tone(1320, .8, .065, .08); }
  if (cue === 'snap') { tone(280, .6, .15, 0, 25, 'sawtooth'); noise(.15, .35, 2200); noise(.9, .2, 700, .25); }
  if (cue === 'salvage') { tone(520, .16, .045); tone(780, .25, .035, .1); }
}
