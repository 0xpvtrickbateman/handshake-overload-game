import type { Personality, Player, RoundResult, Signal } from './types';

export const BOT_NAMES: Record<Personality, string> = {
  sam: 'Steady Sam',
  gus: 'Greedy Gus',
  lou: 'Liar Lou',
  mel: 'Mirror Mel',
};
export const BOT_ORDER: Personality[] = ['sam', 'gus', 'lou', 'mel'];
export const SIGNALS: { id: Signal; label: string; icon: string }[] = [
  { id: 'light', label: 'Going light', icon: '↓' },
  { id: 'heavy', label: 'Going heavy', icon: '↑' },
  { id: 'shrug', label: 'Shrug', icon: '↔' },
];
export function weightLimit(players: number, offset: number) {
  if (!Number.isInteger(players) || players < 2 || players > 8 || ![-2, -1, 1, 2].includes(offset))
    throw new Error('Invalid lift configuration');
  return Math.max(players, Math.min(5 * players, Math.round(3.5 * players) + offset));
}
export function resolvedLoad(load: number | undefined) {
  return load === undefined ? 3 : load;
}
export function scoreRound(
  round: number,
  limit: number,
  players: Pick<Player, 'id' | 'name' | 'score'>[],
  loads: Record<string, number>,
  signals: Record<string, Signal>,
): RoundResult {
  const values = players.map((p) => resolvedLoad(loads[p.id]));
  if (values.some((n) => !Number.isInteger(n) || n < 1 || n > 6)) throw new Error('Invalid load');
  const total = values.reduce((a, b) => a + b, 0),
    fits = total <= limit,
    multiplier = round >= 7 ? 2 : 1;
  const high = Math.max(...values),
    low = Math.min(...values);
  return {
    round,
    limit,
    total,
    fits,
    multiplier,
    entries: players.map((p, i) => {
      const load = values[i],
        blame = !fits && load === high,
        salvage = !fits && load === low;
      const delta = multiplier * (fits ? load : (blame ? -3 : 0) + (salvage ? 2 : 0));
      return {
        id: p.id,
        name: p.name,
        signal: signals[p.id] ?? 'shrug',
        load,
        delta,
        before: p.score,
        after: p.score + delta,
        blame,
        salvage,
      };
    }),
  };
}
export function seededRandom(seed: string) {
  let state = 2166136261;
  for (const char of seed) state = Math.imul(state ^ char.charCodeAt(0), 16777619);
  return () => {
    state ^= state << 13;
    state ^= state >>> 17;
    state ^= state << 5;
    return (state >>> 0) / 4294967296;
  };
}
export function botChoice(personality: Personality, random: () => number, lastHumanLoad: number) {
  const n = random();
  const load =
    personality === 'sam'
      ? n < 0.8
        ? 3
        : n < 0.9
          ? 2
          : 4
      : personality === 'gus'
        ? n < 0.2
          ? 4
          : n < 0.65
            ? 5
            : 6
        : personality === 'lou'
          ? n < 0.5
            ? 2
            : 5
          : lastHumanLoad;
  const honest: Signal = load <= 3 ? 'light' : 'heavy';
  return {
    load,
    signal: (personality === 'lou' ? (honest === 'light' ? 'heavy' : 'light') : honest) as Signal,
  };
}
export function rankPlayers<T extends Pick<Player, 'score' | 'snaps'>>(players: T[]) {
  return [...players].sort((a, b) => b.score - a.score || a.snaps - b.snaps);
}
export function awards(
  players: Pick<Player, 'id' | 'name' | 'snaps' | 'score'>[],
  history: RoundResult[],
) {
  const finalLead = Math.max(...players.map((p) => p.score));
  const data = players.map((p) => {
    const entries = history.flatMap((r) => r.entries.filter((e) => e.id === p.id));
    const deficits = history.map(
      (r) =>
        Math.max(...r.entries.map((e) => e.after)) -
        (r.entries.find((e) => e.id === p.id)?.after ?? 0),
    );
    return {
      ...p,
      light: entries.reduce((n, e) => n + e.load, 0),
      honest: entries.filter((e) => e.signal === (e.load <= 3 ? 'light' : 'heavy')).length,
      comeback: Math.max(0, ...deficits) - (finalLead - p.score),
    };
  });
  const winner = (key: 'snaps' | 'light' | 'honest' | 'comeback', sign = 1) =>
    [...data].sort((a, b) => sign * (b[key] - a[key]))[0];
  return [
    { title: 'The Breaker', icon: 'ϟ', player: winner('snaps'), detail: 'Most snaps caused' },
    { title: 'The Saint', icon: '✧', player: winner('light', -1), detail: 'Fewest crates loaded' },
    { title: 'Honest Abe', icon: '◇', player: winner('honest'), detail: 'Most truthful signals' },
    {
      title: 'Dark Horse',
      icon: '♞',
      player: winner('comeback'),
      detail: 'Biggest recovery from behind',
    },
  ];
}
