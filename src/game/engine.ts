import { BOT_NAMES, BOT_ORDER, botChoice, scoreRound, seededRandom, weightLimit } from './rules';
import type { Action, Avatar, Personality, Player, Room, Snapshot } from './types';

export const PRESENCE_MS = 12_000;
export const DURATIONS = { signal: 5_000, load: 10_000, reveal: 12_000, lead: 1_800 };
export const TEST_DURATIONS = { signal: 1_200, load: 2_000, reveal: 2_800, lead: 900 };
export class GameError extends Error { constructor(message: string, public status = 400) { super(message); } }
const seated = (r: Room) => r.players.filter(p => p.seat);
const online = (p: Player, now: number) => !p.departed && (p.bot !== null || now - p.lastSeen < PRESENCE_MS);
const covered = (p: Player) => !!p.bot || p.departed || p.missed > 0;
function addBot(r: Room, personality: Personality, now: number, id: string) {
  if (seated(r).length >= 8) throw new GameError('The lift has all eight guests.');
  r.players.push({ id, name: BOT_NAMES[personality], avatar: { hat: BOT_ORDER.indexOf(personality), color: (BOT_ORDER.indexOf(personality) + 2) % 6 }, bot: personality, sessionHash: null, seat: true, departed: false, joinedAt: now, lastSeen: now, missed: 0, score: 0, snaps: 0 });
}
export function createRoom(code: string, hash: string, name: string, avatar: Avatar, now: number, solo: boolean, id: string, test = false): Room {
  const host: Player = { id, name, avatar, sessionHash: hash, bot: null, seat: true, departed: false, joinedAt: now, lastSeen: now, missed: 0, score: 0, snaps: 0 };
  const r: Room = { code, version: 1, game: 1, hostId: id, createdAt: now, phase: 'lobby', round: 0, limit: 0, phaseEndsAt: 0, revealAt: 0, players: [host], signals: {}, loads: {}, plans: {}, history: [], actionIds: [], durations: test ? TEST_DURATIONS : DURATIONS };
  if (solo) { for (const bot of BOT_ORDER) addBot(r, bot, now, `${id}-${bot}`); beginRound(r, now); }
  return r;
}
function beginRound(r: Room, at: number) {
  r.round++; r.phase = 'signal'; r.phaseEndsAt = at + r.durations.signal;
  r.revealAt = r.phaseEndsAt + r.durations.load + r.durations.lead;
  r.signals = {}; r.loads = {}; r.plans = {};
  const random = seededRandom(`${r.code}:${r.createdAt}:${r.game}:${r.round}`);
  r.limit = weightLimit(seated(r).length, [-2, -1, 1, 2][Math.floor(random() * 4)]);
  const last = r.history.at(-1)?.entries.find(e => r.players.some(p => p.id === e.id && !p.bot))?.load ?? 3;
  for (const p of seated(r)) {
    const choice = botChoice(p.bot ?? BOT_ORDER[r.players.indexOf(p) % 4], random, last);
    r.plans[p.id] = { ...choice, signalAt: at + r.durations.signal * (.15 + random() * .6), loadAt: r.phaseEndsAt + r.durations.load * (.2 + random() * .65) };
  }
}
export function advanceRoom(r: Room, now: number) {
  let changed = false;
  const host = r.players.find(p => p.id === r.hostId);
  if (!host || !online(host, now)) {
    const next = r.players.find(p => !p.bot && online(p, now));
    if (next && r.hostId !== next.id) { r.hostId = next.id; changed = true; }
  }
  for (let guard = 0; guard < 32; guard++) {
    for (const p of seated(r)) {
      const plan = r.plans[p.id];
      if (!plan || !covered(p)) continue;
      if (r.phase === 'signal' && !r.signals[p.id] && now >= plan.signalAt) { r.signals[p.id] = plan.signal; changed = true; }
      if (r.phase === 'load' && r.loads[p.id] === undefined && now >= plan.loadAt) { r.loads[p.id] = plan.load; changed = true; }
    }
    if (r.phase === 'lobby' || r.phase === 'finished' || now < r.phaseEndsAt) break;
    const at = r.phaseEndsAt;
    if (r.phase === 'signal') {
      for (const p of seated(r)) r.signals[p.id] ??= 'shrug';
      r.phase = 'load'; r.phaseEndsAt = at + r.durations.load;
    } else if (r.phase === 'load') {
      for (const p of seated(r)) { if (r.loads[p.id] === undefined) { r.loads[p.id] = 3; if (!p.bot) p.missed++; } }
      const result = scoreRound(r.round, r.limit, seated(r), r.loads, r.signals);
      r.history.push(result);
      for (const entry of result.entries) { const p = r.players.find(p => p.id === entry.id)!; p.score = entry.after; if (entry.blame) p.snaps++; }
      r.phase = 'reveal';
      // Schedule with delivery headroom even when the triggering request arrived late.
      r.revealAt = Math.max(at + r.durations.lead, now + r.durations.lead);
      r.phaseEndsAt = r.revealAt + r.durations.reveal - r.durations.lead;
    } else if (r.round === 8) { r.phase = 'finished'; r.phaseEndsAt = 0; }
    else beginRound(r, at);
    changed = true;
  }
  return changed;
}
export function applyAction(r: Room, hash: string, action: Action, now: number, newId: string) {
  let p = r.players.find(p => p.sessionHash === hash);
  if (action.type === 'join') {
    if (p) { p.departed = false; p.lastSeen = now; p.missed = 0; if (r.phase === 'lobby' && !p.seat && seated(r).length < 8) p.seat = true; return; }
    if (r.players.length >= 24) throw new GameError('The gallery is full. Try a new room.');
    p = { id: newId, name: action.name, avatar: action.avatar, sessionHash: hash, bot: null, seat: r.phase === 'lobby' && seated(r).length < 8, departed: false, joinedAt: now, lastSeen: now, missed: 0, score: 0, snaps: 0 };
    r.players.push(p); return;
  }
  if (!p) throw new GameError('Join this room to play.', 401);
  p.lastSeen = now;
  if (action.type === 'heartbeat') return;
  p.departed = false; p.missed = 0;
  if (action.type === 'resume') return;
  if (action.type === 'leave') { p.departed = true; if (r.phase === 'lobby') p.seat = false; advanceRoom(r, now); return; }
  if (action.type === 'signal' || action.type === 'load') {
    if (!p.seat) throw new GameError('You are watching this game. Your seat opens next game.');
    if (action.round !== r.round || action.game !== r.game) throw new GameError('That lift has already left. Your next turn is coming.', 409);
    if (action.type === 'signal') { if (r.phase !== 'signal') throw new GameError('Signals have closed for this lift.', 409); r.signals[p.id] = action.signal; }
    else { if (r.phase !== 'load') throw new GameError('Loading has closed for this lift.', 409); r.loads[p.id] ??= action.load; }
    return;
  }
  if (action.type === 'rematch') {
    if (r.phase !== 'finished') throw new GameError('Finish this game first.');
    r.players = r.players.filter(p => !p.departed || p.bot);
    // Humans waiting in the gallery get priority over bots in the next game.
    const humans = r.players.filter(p => !p.bot), bots = r.players.filter(p => p.bot);
    r.players = [...humans, ...bots.slice(0, Math.max(0, 8 - humans.length))];
    r.players.forEach((p, i) => { p.seat = i < 8; p.score = 0; p.snaps = 0; });
    r.hostId = p.id; r.game++; r.round = 0; r.phase = 'lobby'; r.history = []; r.loads = {}; r.signals = {}; r.plans = {}; r.phaseEndsAt = 0;
    return;
  }
  if (r.hostId !== p.id) throw new GameError('Only the host can change the lobby.', 403);
  if (r.phase !== 'lobby') throw new GameError('Lobby changes open after the game.', 409);
  if (action.type === 'add-bot') addBot(r, action.personality, now, newId);
  if (action.type === 'fill-bots') for (let i = 0; seated(r).length < 4; i++) addBot(r, BOT_ORDER[i % 4], now, `${newId}-${i}`);
  if (action.type === 'remove-bot') r.players = r.players.filter(p => !(p.id === action.id && p.bot));
  if (action.type === 'start') { if (seated(r).length < 2) throw new GameError('Invite a friend or add a bot.'); beginRound(r, now); }
}
export function publicSnapshot(r: Room, hash: string | null, now: number): Snapshot {
  const me = r.players.find(p => p.sessionHash === hash);
  return { code: r.code, version: r.version, game: r.game, hostId: r.hostId, phase: r.phase, round: r.round, limit: r.limit, phaseEndsAt: r.phaseEndsAt, revealAt: r.revealAt, serverNow: now,
    players: r.players.map(p => ({ id: p.id, name: p.name, avatar: p.avatar, bot: p.bot, seat: p.seat, departed: p.departed, score: p.score, snaps: p.snaps, connected: online(p, now), covered: covered(p), signal: r.signals[p.id] ?? null, locked: r.loads[p.id] !== undefined })),
    meId: me?.id ?? null, myLoad: me ? r.loads[me.id] ?? null : null,
    history: r.history, result: r.phase === 'reveal' || r.phase === 'finished' ? r.history.at(-1) ?? null : null,
  };
}
