export type Signal = 'light' | 'heavy' | 'shrug';
export type Personality = 'sam' | 'gus' | 'lou' | 'mel';
export type Phase = 'lobby' | 'signal' | 'load' | 'reveal' | 'finished';
export type Avatar = { hat: number; color: number };
export type Player = {
  id: string; name: string; avatar: Avatar; sessionHash: string | null;
  bot: Personality | null; seat: boolean; departed: boolean; joinedAt: number;
  lastSeen: number; missed: number; score: number; snaps: number;
};
export type RoundEntry = { id: string; name: string; signal: Signal; load: number; delta: number; before: number; after: number; blame: boolean; salvage: boolean };
export type RoundResult = { round: number; limit: number; total: number; fits: boolean; multiplier: number; entries: RoundEntry[] };
export type BotPlan = { signal: Signal; load: number; signalAt: number; loadAt: number };
export type Room = {
  code: string; version: number; game: number; hostId: string; createdAt: number;
  phase: Phase; round: number; limit: number; phaseEndsAt: number; revealAt: number;
  players: Player[]; signals: Record<string, Signal>; loads: Record<string, number>;
  plans: Record<string, BotPlan>; history: RoundResult[]; actionIds: string[];
  durations: { signal: number; load: number; reveal: number; lead: number };
};
export type PublicPlayer = Omit<Player, 'sessionHash' | 'lastSeen' | 'joinedAt' | 'missed'> & { connected: boolean; covered: boolean; signal: Signal | null; locked: boolean };
export type Award = { title: string; icon: string; playerId: string; name: string; detail: string };
export type Snapshot = {
  code: string; version: number; game: number; hostId: string; phase: Phase;
  round: number; limit: number; phaseEndsAt: number; revealAt: number; serverNow: number;
  players: PublicPlayer[]; meId: string | null; myLoad: number | null;
  history: RoundResult[]; result: RoundResult | null;
  standings: string[]; winnerIds: string[]; awards: Award[];
};
export type Action =
  | { type: 'join'; name: string; avatar: Avatar }
  | { type: 'signal'; signal: Signal; round: number; game: number }
  | { type: 'load'; load: number; round: number; game: number }
  | { type: 'start' | 'rematch' | 'leave' | 'heartbeat' | 'resume' | 'fill-bots' }
  | { type: 'add-bot'; personality: Personality }
  | { type: 'remove-bot'; id: string };
