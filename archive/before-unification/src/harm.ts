// G1a: aggregates the consequence ledger over a seed suite, on the fixed six-round horizon.
// Every policy is compared with doing nothing IN THE SAME WORLD, so a difference is what the
// policy's own actions added or removed.
import type { Params } from './params.ts';
import { makeWorld } from './world.ts';
import { BOTS, randomBot, hideAlways } from './bots.ts';
import type { Bot } from './bots.ts';
import { evaluateBot } from './evaluate.ts';
import type { Ledger } from './ledger.ts';

export const METRICS = [
  'hardship', 'distressRounds', 'basinHarm', 'destroyed', 'reserveChange', 'emptyReserves', 'agreementDraw', 'emergencyDraw',
  'stationDamage', 'catchupOutstanding', 'agreementRoundsOutstanding', 'agreementDrawCommitted',
] as const;
export type Metric = (typeof METRICS)[number];

export function measure(L: Ledger): Record<Metric, number> {
  return {
    hardship: L.totals.hardship,
    distressRounds: L.totals.distressRounds,
    basinHarm: L.basin.harm,
    destroyed: L.destroyed,
    reserveChange: L.totals.reserveChange,
    emptyReserves: L.district.reserveFinal.filter((x) => x === 0).length,
    agreementDraw: L.totals.agreementDraw,
    emergencyDraw: L.totals.emergencyDraw,
    stationDamage: L.station.damage,
    catchupOutstanding: L.totals.catchupOutstanding,
    agreementRoundsOutstanding: L.totals.agreementRoundsOutstanding,
    agreementDrawCommitted: L.totals.agreementDrawCommitted,
  };
}

export interface Interval { diff: number; lo: number; hi: number }
export interface HarmStat {
  legacyWinRate: number;
  meanEndedRound: number;
  mean: Record<Metric, number>;                 // per world, over the fixed six rounds
  vsNothing: Record<Metric, Interval>;          // paired difference from doing nothing in the same world, 95% interval
  wins: {                                       // legacy wins only
    n: number;
    shareWithHardship: number;                  // at least one unit of unmet need somewhere
    shareWithEmptyReserve: number;              // at least one district ends with nothing stored
    shareWithObligations: number;               // catch-up or agreement rounds still owed
    mean: Record<Metric, number>;
  };
}
export interface HarmSummary { seeds: number; firstSeed: number; lastSeed: number; bots: Record<string, HarmStat> }

const RANDOM_SAMPLES = 20;
const zero = () => Object.fromEntries(METRICS.map((m) => [m, 0])) as Record<Metric, number>;

export function analyseHarm(p: Params, seeds: number[], registry: Record<string, Bot> = BOTS): HarmSummary {
  const names = [...Object.keys(registry), 'random (mean of 20)'];
  const acc: Record<string, any> = {};
  for (const nm of names) acc[nm] = { win: 0, ended: 0, sum: zero(), d: zero(), d2: zero(), wn: 0, wHard: 0, wEmpty: 0, wOwed: 0, wsum: zero() };

  for (const seed of seeds) {
    const w = makeWorld(seed, p);
    const nothing = measure(evaluateBot(w, p, hideAlways).ledger);
    for (const nm of names) {
      const a = acc[nm];
      const evs = nm.startsWith('random')
        ? Array.from({ length: RANDOM_SAMPLES }, (_, i) => evaluateBot(w, p, randomBot(seed * 1000 + i)))
        : [evaluateBot(w, p, registry[nm])];
      const f = 1 / evs.length;
      const here = zero();
      for (const ev of evs) {
        const m = measure(ev.ledger);
        for (const k of METRICS) here[k] += f * m[k];
        a.ended += f * ev.ledger.legacy.endedRound;
        if (ev.ledger.legacy.outcome === 'won') {
          a.win += f; a.wn += f;
          if (m.hardship > 0) a.wHard += f;
          if (m.emptyReserves > 0) a.wEmpty += f;
          if (m.catchupOutstanding + m.agreementRoundsOutstanding > 0) a.wOwed += f;
          for (const k of METRICS) a.wsum[k] += f * m[k];
        }
      }
      for (const k of METRICS) {
        a.sum[k] += here[k];
        const diff = here[k] - nothing[k];
        a.d[k] += diff; a.d2[k] += diff * diff;
      }
    }
  }

  const N = seeds.length;
  const bots: Record<string, HarmStat> = {};
  for (const nm of names) {
    const a = acc[nm];
    const mean = zero(), wmean = zero();
    const vs = {} as Record<Metric, Interval>;
    for (const k of METRICS) {
      mean[k] = a.sum[k] / N;
      wmean[k] = a.wn ? a.wsum[k] / a.wn : 0;
      const m = a.d[k] / N;
      const sd = Math.sqrt(Math.max(0, (a.d2[k] - N * m * m) / (N - 1)));
      const half = (1.96 * sd) / Math.sqrt(N);
      vs[k] = { diff: m, lo: m - half, hi: m + half };
    }
    bots[nm] = {
      legacyWinRate: a.win / N, meanEndedRound: a.ended / N, mean, vsNothing: vs,
      wins: { n: a.wn, shareWithHardship: a.wn ? a.wHard / a.wn : 0, shareWithEmptyReserve: a.wn ? a.wEmpty / a.wn : 0, shareWithObligations: a.wn ? a.wOwed / a.wn : 0, mean: wmean },
    };
  }
  return { seeds: N, firstSeed: seeds[0], lastSeed: seeds[N - 1], bots };
}
