// G1a: the consequence ledger. Pure bookkeeping over the round records; it changes no rule and
// feeds nothing back into play. Every quantity is a plain sum of per-round record fields, so it
// can be re-derived by hand from `scripts/replay.ts`.
import type { Params } from './params.ts';
import type { RoundRecord, State, Cause, Conflict } from './engine.ts';
import { kindOf } from './engine.ts';

export interface Ledger {
  // Result of the playable game under the unchanged v0.3 rules. Kept as a labelled legacy outcome.
  legacy: { outcome: 'won' | 'lost'; causes: Cause[]; endedRound: number };
  roundsEvaluated: number;       // always the full horizon (six)
  district: {
    hardship: number[];          // cumulative unmet need, after any reserve use
    distressRounds: number[];    // rounds with serious unmet need
    reserveInitial: number[];    // reserve entering round one
    reserveFinal: number[];      // reserve after the last round
    agreementDraw: number[];     // reserve spent under an agreement: a chosen use of storage
    emergencyDraw: number[];     // reserve spent because river intake fell short: a forced use
    stored: number[];            // river water put into reserve
  };
  basin: { harm: number; shortRounds: number; flows: number[] }; // harm = sum of deficits below the minimum
  destroyed: number;             // water lost to strikes, station and district alike
  obligations: {
    catchup: number[];           // extra extraction a district is still owed after the last round
    agreementRounds: number[];   // rounds of agreement still running after the last round
    agreementDrawCommitted: number[]; // most reserve those remaining rounds could still draw
  };
  station: { damage: number; finalIntegrity: number; finalExposure: number; strikesByStation: number };
  // G1b: network conflict over the six rounds, by cause, plus any threat still pending at the end.
  conflict: Conflict & { strikes: number; threatOutstanding: number };
  totals: {
    hardship: number; distressRounds: number; reserveChange: number; agreementDraw: number; emergencyDraw: number;
    stored: number; catchupOutstanding: number; agreementRoundsOutstanding: number; agreementDrawCommitted: number;
  };
}

const sum = (a: number[]) => a.reduce((x, y) => x + y, 0);

// `records[0]` is the history round and is excluded from every total.
export function ledgerOf(p: Params, records: RoundRecord[], final: State, legacy: Ledger['legacy']): Ledger {
  const n = p.districts;
  const played = records.slice(1);
  if (played.length !== p.rounds) throw new Error(`ledger needs ${p.rounds} evaluated rounds, got ${played.length}`);
  const zero = () => new Array(n).fill(0);
  const hardship = zero(), distressRounds = zero(), agreementDraw = zero(), emergencyDraw = zero(), stored = zero();
  let harm = 0, shortRounds = 0, destroyed = 0;
  for (const r of played) {
    for (let d = 0; d < n; d++) {
      hardship[d] += r.unmet[d];
      if (r.distress[d]) distressRounds[d]++;
      agreementDraw[d] += r.cover[d];
      emergencyDraw[d] += r.emergency[d];
      stored[d] += r.stored[d];
    }
    const deficit = Math.max(0, p.basinMin - r.flow);
    harm += deficit;
    if (deficit > 0) shortRounds++;
    destroyed += r.destroyed;
  }
  const conflict = { threatsIssued: 0, executed: 0, cancelled: 0, interrupted: 0, retaliation: 0, provoked: 0, unprovoked: 0, absorbed: 0 };
  for (const r of played) for (const k of Object.keys(conflict) as (keyof typeof conflict)[]) conflict[k] += r.conflict[k];
  const reserveInitial = played[0].reserveBefore.slice();
  const reserveFinal = played[played.length - 1].reserveAfter.slice();
  const catchup = final.catchup.slice();
  const agreementRounds = final.agreement.slice();
  const agreementDrawCommitted = agreementRounds.map((k, d) => Math.min(k * p.signal.cover, reserveFinal[d]));
  return {
    legacy,
    roundsEvaluated: played.length,
    district: { hardship, distressRounds, reserveInitial, reserveFinal, agreementDraw, emergencyDraw, stored },
    basin: { harm, shortRounds, flows: played.map((r) => r.flow) },
    destroyed,
    obligations: { catchup, agreementRounds, agreementDrawCommitted },
    station: { damage: p.integrity - final.integrity, finalIntegrity: final.integrity, finalExposure: final.exposure, strikesByStation: played.filter((r) => !r.inert && r.action >= 0 && kindOf(r.action) === 'K').length },
    conflict: { ...conflict, strikes: conflict.executed + conflict.retaliation + conflict.provoked + conflict.unprovoked, threatOutstanding: final.threatFrom >= 0 ? 1 : 0 },
    totals: {
      hardship: sum(hardship), distressRounds: sum(distressRounds), reserveChange: sum(reserveFinal) - sum(reserveInitial),
      agreementDraw: sum(agreementDraw), emergencyDraw: sum(emergencyDraw), stored: sum(stored),
      catchupOutstanding: sum(catchup), agreementRoundsOutstanding: sum(agreementRounds), agreementDrawCommitted: sum(agreementDrawCommitted),
    },
  };
}
