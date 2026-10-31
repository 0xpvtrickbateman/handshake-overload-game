'use client';
import { useCallback, useEffect, useRef, useState } from 'react';
import type { Action, Snapshot } from '@/game/types';

let memoryToken = '';
let offset = 0;
export function sessionToken() {
  if (typeof window === 'undefined') return '';
  try { const saved = localStorage.getItem('overload:session'); if (saved) return saved; const token = crypto.randomUUID(); localStorage.setItem('overload:session', token); return token; }
  catch { return memoryToken ||= crypto.randomUUID(); }
}
export async function api<T>(url: string, payload?: unknown, signal?: AbortSignal): Promise<T> {
  const response = await fetch(url, { method: payload ? 'POST' : 'GET', headers: { 'Content-Type': 'application/json', 'x-overload-session': sessionToken() }, body: payload ? JSON.stringify(payload) : undefined, cache: 'no-store', signal: signal ?? AbortSignal.timeout(6500) });
  const data = await response.json();
  if (!response.ok) throw new Error(data.error ?? 'The hotel desk is reconnecting. Try again.');
  return data;
}
export function serverNow() { return Date.now() + offset; }
async function calibrate() {
  const samples: { rtt: number; offset: number }[] = [];
  for (let i = 0; i < 3; i++) {
    const before = Date.now();
    try { const data = await api<{ serverNow: number }>('/api/clock'); const after = Date.now(); samples.push({ rtt: after - before, offset: data.serverNow - (before + after) / 2 }); } catch {}
  }
  if (samples.length) offset = samples.sort((a, b) => a.rtt - b.rtt)[0].offset;
}
export function useServerNow() {
  const [now, setNow] = useState(serverNow);
  useEffect(() => { const timer = setInterval(() => setNow(serverNow()), 33); return () => clearInterval(timer); }, []);
  return now;
}
export function useRoom(code: string, tv = false) {
  const [state, setState] = useState<Snapshot | null>(null), [error, setError] = useState(''), [connected, setConnected] = useState(false);
  const current = useRef<Snapshot | null>(null), lastMessage = useRef(0);
  const accept = useCallback((next: Snapshot) => {
    setConnected(true);
    if (!current.current || next.version > current.current.version || next.code !== current.current.code) { current.current = next; setState(next); }
  }, []);
  const send = useCallback(async (action: Action) => {
    const payload = { action, requestId: crypto.randomUUID() };
    try { const next = await api<Snapshot>(`/api/rooms/${code}`, payload); accept(next); setError(''); return next; }
    catch (e) { setError(e instanceof Error ? e.message : 'Try that once more.'); throw e; }
  }, [code, accept]);
  useEffect(() => {
    let disposed = false, polling = false;
    const abort = new AbortController();
    const fetchState = async () => {
      if (polling || disposed) return; polling = true;
      try { const before = Date.now(); const next = await api<Snapshot>(`/api/rooms/${code}`); if (!disposed) { if (!current.current) offset = next.serverNow - (before + Date.now()) / 2; accept(next); setError(''); } }
      catch (e) { if (!disposed) { setConnected(false); setError(e instanceof Error ? e.message : 'Reconnecting to the hotel…'); } }
      finally { polling = false; }
    };
    const stream = async () => {
      while (!disposed) {
        try {
          const response = await fetch(`/api/rooms/${code}/events`, { headers: tv ? {} : { 'x-overload-session': sessionToken() }, cache: 'no-store', signal: abort.signal });
          if (!response.ok || !response.body) throw new Error('Stream unavailable');
          const reader = response.body.getReader(), decoder = new TextDecoder(); let buffer = '';
          while (!disposed) {
            const { value, done } = await reader.read(); if (done) break;
            buffer += decoder.decode(value, { stream: true });
            let end: number;
            while ((end = buffer.indexOf('\n\n')) >= 0) {
              const event = buffer.slice(0, end); buffer = buffer.slice(end + 2);
              lastMessage.current = Date.now(); setConnected(true);
              if (event.startsWith('event: state')) { const raw = event.split('\ndata: ')[1]; if (raw) accept(JSON.parse(raw)); }
            }
          }
        } catch { if (!disposed) lastMessage.current = 0; }
        if (!disposed) await new Promise(resolve => setTimeout(resolve, lastMessage.current ? 80 : 1200));
      }
    };
    void fetchState(); void calibrate(); void stream();
    const fallback = setInterval(() => { if (!document.hidden && Date.now() - lastMessage.current > 4500) { setConnected(false); void fetchState(); } }, 500);
    const heartbeat = setInterval(() => { if (!tv && !document.hidden && current.current?.meId) void send({ type: 'heartbeat' }).catch(() => {}); }, 4000);
    const clock = setInterval(() => { if (!document.hidden) void calibrate(); }, 20000);
    const resume = () => { if (!document.hidden) { void calibrate(); void fetchState(); if (!tv && current.current?.meId) void send({ type: 'resume' }).catch(() => {}); } };
    document.addEventListener('visibilitychange', resume); window.addEventListener('online', resume);
    return () => { disposed = true; abort.abort(); clearInterval(fallback); clearInterval(heartbeat); clearInterval(clock); document.removeEventListener('visibilitychange', resume); window.removeEventListener('online', resume); };
  }, [code, accept, send, tv]);
  return { state, send, error, connected, setError };
}
