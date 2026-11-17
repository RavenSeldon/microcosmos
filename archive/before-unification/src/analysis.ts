// Aggregates the exhaustive search and the bots over a suite of seeds.
import type { Params } from './params.ts';
import { makeWorld } from './world.ts';
import { solve } from './search.ts';
import { BOTS, playBot, randomBot } from './bots.ts';
import type { Bot } from './bots.ts';

export interface BotStat {
  winRate: number;            // over all seeds
  winRateWinnable: number;    // over seeds where some sequence wins
  winRateRescuable: number;   // over seeds where doing nothing loses but some sequence wins
  lossStation: number; lossBasin: number; lossDistrict: number; // share of all seeds (a run can have several causes)
  meanHarm: number; meanDistressRounds: number; meanStrikes: number; meanSignals: number;
}

export interface Summary {
  seeds: number;
  classes: { unwinnable: number; passiveWins: number; rescuable: number }; // shares, sum to 1
  amongRescuable: {
    n: number;
    winnableWithoutStrike: number;  // share
    winnableWithoutSignal: number;
    strikeRequired: number;
    signalRequired: number;
    bothRoutes: number;
    meanWinFraction: number;        // mean share of all 19^6 sequences that win
    minActive: number[];            // share of rescuable seeds whose cheapest win needs 1, 2, 3, 4+ SIGNALs/STRIKEs
  };
  amongPassiveWins: { n: number; meanWinFraction: number };
  bots: Record<string, BotStat>;
  meanStates: number;
}

const RANDOM_SAMPLES = 20;

export function analyse(p: Params, seeds: number[], withBots = true, registry: Record<string, Bot> = BOTS): Summary {
  let unw = 0, pas = 0, res = 0, states = 0;
  let noK = 0, noG = 0, needK = 0, needG = 0, both = 0, wfRes = 0, wfPas = 0;
  const active = [0, 0, 0, 0];
  const names = [...Object.keys(registry), 'random (mean of 20)'];
  const acc: Record<string, any> = {};
  for (const nm of names) acc[nm] = { w: 0, wW: 0, wR: 0, st: 0, ba: 0, di: 0, harm: 0, dr: 0, k: 0, g: 0 };
  let nWinnable = 0;

  for (const seed of seeds) {
    const w = makeWorld(seed, p);
    const sol = solve(w, p);
    states += sol.states;
    const winnable = sol.wins > 0;
    const rescuable = winnable && !sol.passiveWins;
    if (!winnable) unw++;
    else if (sol.passiveWins) { pas++; wfPas += sol.wins / sol.total; }
    else {
      res++; wfRes += sol.wins / sol.total;
      if (sol.minStrikes === 0) noK++; else needK++;
      if (sol.minSignals === 0) noG++; else needG++;
      if (sol.minStrikes === 0 && sol.minSignals === 0) both++;
      active[Math.min(4, sol.minActive) - 1]++;
    }
    if (winnable) nWinnable++;
    if (!withBots) continue;

    for (const nm of names) {
      const runs = nm.startsWith('random')
        ? Array.from({ length: RANDOM_SAMPLES }, (_, i) => playBot(w, p, randomBot(seed * 1000 + i)))
        : [playBot(w, p, registry[nm])];
      const a = acc[nm];
      for (const r of runs) {
        const f = 1 / runs.length;
        if (r.won) { a.w += f; if (winnable) a.wW += f; if (rescuable) a.wR += f; }
        if (r.causes.includes('station')) a.st += f;
        if (r.causes.includes('basin')) a.ba += f;
        if (r.causes.includes('district')) a.di += f;
        a.harm += f * r.harm; a.dr += f * r.distressRounds; a.k += f * r.strikes; a.g += f * r.signals;
      }
    }
  }

  const N = seeds.length;
  const bots: Record<string, BotStat> = {};
  if (withBots) for (const nm of names) {
    const a = acc[nm];
    bots[nm] = {
      winRate: a.w / N, winRateWinnable: nWinnable ? a.wW / nWinnable : 0, winRateRescuable: res ? a.wR / res : 0,
      lossStation: a.st / N, lossBasin: a.ba / N, lossDistrict: a.di / N,
      meanHarm: a.harm / N, meanDistressRounds: a.dr / N, meanStrikes: a.k / N, meanSignals: a.g / N,
    };
  }
  return {
    seeds: N,
    classes: { unwinnable: unw / N, passiveWins: pas / N, rescuable: res / N },
    amongRescuable: {
      n: res, winnableWithoutStrike: res ? noK / res : 0, winnableWithoutSignal: res ? noG / res : 0,
      strikeRequired: res ? needK / res : 0, signalRequired: res ? needG / res : 0, bothRoutes: res ? both / res : 0,
      meanWinFraction: res ? wfRes / res : 0,
      minActive: active.map((x) => (res ? x / res : 0)),
    },
    amongPassiveWins: { n: pas, meanWinFraction: pas ? wfPas / pas : 0 },
    bots,
    meanStates: states / N,
  };
}

export const range = (a: number, b: number) => Array.from({ length: b - a + 1 }, (_, i) => a + i);
export const pct = (x: number) => (100 * x).toFixed(1) + '%';
