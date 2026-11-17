// G1a fixed-horizon evaluation. Plays the game exactly as before, then, if it ended early,
// lets the world run on with an inert station until round six so every policy is measured over
// the same window. The playable game's result is reported unchanged as the legacy outcome.
import type { Params } from './params.ts';
import type { World } from './world.ts';
import type { RoundRecord } from './engine.ts';
import { initState, historyRound, blankRecord, step, stepInert } from './engine.ts';
import type { Bot, PublicRound } from './bots.ts';
import { toPublic } from './bots.ts';
import type { Ledger } from './ledger.ts';
import { ledgerOf } from './ledger.ts';

export interface Evaluation {
  ledger: Ledger;
  records: RoundRecord[]; // history round + six evaluated rounds
  actions: number[];      // the station's actions during the playable game only
}

function finish(w: World, p: Params, s: ReturnType<typeof initState>, records: RoundRecord[], actions: number[]): Evaluation {
  const legacy = { outcome: s.status as 'won' | 'lost', causes: s.causes.slice(), endedRound: s.round - 1 };
  while (s.round <= p.rounds) {
    const rec = blankRecord(p, s.round, -1);
    stepInert(w, p, s, rec);
    records.push(rec);
  }
  return { ledger: ledgerOf(p, records, s, legacy), records, actions };
}

export function evaluateBot(w: World, p: Params, bot: Bot): Evaluation {
  const s = initState(w, p);
  const records = [historyRound(w, p, s)];
  const history: PublicRound[] = [toPublic(records[0])];
  const actions: number[] = [];
  while (s.status === 'ongoing') {
    const a = bot({ round: s.round, exposure: s.exposure, integrity: s.integrity, basinMin: p.basinMin, history });
    const rec = blankRecord(p, s.round, a);
    step(w, p, s, a, rec);
    records.push(rec);
    history.push(toPublic(rec));
    actions.push(a);
  }
  return finish(w, p, s, records, actions);
}

// A fixed action list. Actions after the game ends are ignored; a list that is too short is an error.
export function evaluateSequence(w: World, p: Params, list: number[]): Evaluation {
  const s = initState(w, p);
  const records = [historyRound(w, p, s)];
  const actions: number[] = [];
  for (const a of list) {
    if (s.status !== 'ongoing') break;
    const rec = blankRecord(p, s.round, a);
    step(w, p, s, a, rec);
    records.push(rec);
    actions.push(a);
  }
  if (s.status === 'ongoing') throw new Error('action list ended before the game did');
  return finish(w, p, s, records, actions);
}
