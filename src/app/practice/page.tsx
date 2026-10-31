import { Practice } from '@/components/Practice';
import { scoreRound } from '@/game/rules';
import type { Snapshot } from '@/game/types';
export default function PracticePage() {
  const players = [
    { id: 'you', name: 'You', avatar: { hat: 0, color: 0 } }, { id: 'sam', name: 'Steady Sam', avatar: { hat: 0, color: 2 } }, { id: 'lou', name: 'Liar Lou', avatar: { hat: 2, color: 4 } }, { id: 'gus', name: 'Greedy Gus', avatar: { hat: 1, color: 3 } },
  ].map(p => ({ ...p, score: 0, snaps: 0, bot: null, seat: true, departed: false, connected: true, covered: false, signal: 'light' as const, locked: true }));
  const scenarios = [{ you: 3, sam: 2, lou: 3, gus: 4 }, { you: 2, sam: 3, lou: 5, gus: 6 }, { you: 1, sam: 4, lou: 5, gus: 6 }];
  const scenes: Snapshot[] = scenarios.map(loads => ({ code: 'DEMO', version: 1, game: 0, hostId: 'you', phase: 'reveal', round: 0, limit: 14, phaseEndsAt: 8000, revealAt: 0, serverNow: 0, players, meId: 'you', myLoad: loads.you, history: [], result: scoreRound(1, 14, players, loads, {}), standings: [], winnerIds: [], awards: [] }));
  return <Practice scenes={scenes} />;
}
