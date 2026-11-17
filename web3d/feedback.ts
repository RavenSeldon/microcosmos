// A score for a resolved moment, not a second simulation. Every moving light comes from a
// recorded transfer; accents identify actual actions/discoveries. Timing never changes a rule.
import type { Moment, GameEvent, Transfer } from '../src/microcosmos.ts';
export interface Passage { transfer: Transfer; at: number; duration: number }
export interface Accent { world: number; kind: 'action' | 'wake' | 'warning'; at: number }
export interface Performance { duration: number; passages: Passage[]; accents: Accent[] }
export function scoreMoment(m: Moment): Performance {
  return {
    duration: 1300,
    passages: m.transfers.map((transfer, i) => ({ transfer, at: 160 + i * 420 / Math.max(1, m.transfers.length - 1), duration: 560 })),
    accents: m.events.flatMap(e => e.kind === 'ability' || e.kind === 'link' || e.kind === 'gift'
      ? [{ world: e.world, kind: 'action' as const, at: 0 }]
      : e.kind === 'woke' ? [{ world: e.world, kind: 'wake' as const, at: 760 }]
      : e.kind === 'dormant' || e.kind === 'spill' ? [{ world: e.world, kind: 'warning' as const, at: 850 }] : []),
  };
}
export function momentTitle(m: Moment): string {
  const has = (kind: GameEvent['kind']) => m.events.some(e => e.kind === kind);
  if (has('dormant')) return 'A world falls quiet';
  if (has('woke')) return 'A world wakes';
  if (has('sheltered')) return 'The shelter holds';
  if (has('mediated') || has('settled')) return 'A different answer';
  if (has('seized')) return 'A current of consequence';
  if (has('threat')) return 'Someone reaches out';
  if (has('link')) return 'A current begins';
  if (has('unlink')) return 'Room for another way';
  if (has('ability')) return 'A world answers';
  if (has('gift')) return 'A little room to breathe';
  if (has('spill')) return 'Water slips away';
  if (m.learned.length) return 'Something comes into focus';
  return m.sky === 'dark' ? 'Holding through the dark' : 'The orbit breathes';
}
