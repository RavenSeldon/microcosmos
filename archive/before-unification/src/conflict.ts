// G1b: network conflict per world over the fixed six rounds, by policy.
import type { Params } from './params.ts';
import { makeWorld } from './world.ts';
import type { Bot } from './bots.ts';
import { evaluateBot } from './evaluate.ts';
import { kindOf } from './engine.ts';

export const CONFLICT_KEYS = ['threatsIssued', 'executed', 'cancelled', 'interrupted', 'threatOutstanding', 'retaliation', 'provoked', 'unprovoked', 'strikes'] as const;
export type ConflictKey = (typeof CONFLICT_KEYS)[number];
export interface ConflictStat {
  legacyWinRate: number;
  mean: Record<ConflictKey, number> & { destroyed: number; hardship: number; basinHarm: number; reserveChange: number; stationDamage: number; stationStrikes: number };
  worldsWithNoStrike: number;
}

export function analyseConflict(p: Params, seeds: number[], registry: Record<string, Bot>): Record<string, ConflictStat> {
  const out: Record<string, ConflictStat> = {};
  for (const [name, bot] of Object.entries(registry)) {
    const m: any = Object.fromEntries(CONFLICT_KEYS.map((k) => [k, 0]));
    Object.assign(m, { destroyed: 0, hardship: 0, basinHarm: 0, reserveChange: 0, stationDamage: 0, stationStrikes: 0 });
    let wins = 0, quiet = 0;
    for (const seed of seeds) {
      const ev = evaluateBot(makeWorld(seed, p), p, bot);
      const L = ev.ledger;
      for (const k of CONFLICT_KEYS) m[k] += L.conflict[k];
      m.destroyed += L.destroyed; m.hardship += L.totals.hardship; m.basinHarm += L.basin.harm; m.reserveChange += L.totals.reserveChange;
      m.stationDamage += L.station.damage; m.stationStrikes += ev.actions.filter((a) => kindOf(a) === 'K').length;
      if (L.legacy.outcome === 'won') wins++;
      if (L.conflict.strikes === 0) quiet++;
    }
    for (const k of Object.keys(m)) m[k] /= seeds.length;
    out[name] = { legacyWinRate: wins / seeds.length, mean: m, worldsWithNoStrike: quiet / seeds.length };
  }
  return out;
}
