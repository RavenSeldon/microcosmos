// A game being played: which world, which rules, which actions so far. Everything else is
// recomputed by replaying the actions, so the state can never drift from the engine's.
import type { Params } from '../src/params.ts';
import type { World } from '../src/world.ts';
import { initState, historyRound, blankRecord, step } from '../src/engine.ts';
import type { RoundRecord, State } from '../src/engine.ts';
import { toPublic } from '../src/bots.ts';
import type { PublicRound } from '../src/bots.ts';

export interface Session {
  world: World;
  params: Params;
  actions: number[];
  label: string;            // "World 1005" or a learning world's title
  seed: number | null;      // null for authored worlds
  scenario: string | null;  // learning-world id
}

export interface Played {
  state: State;
  records: RoundRecord[];   // history round + every round played
  history: PublicRound[];   // what the player is allowed to see of those rounds
  over: boolean;
}

export function play(s: Session): Played {
  const state = initState(s.world, s.params);
  const records = [historyRound(s.world, s.params, state)];
  for (const a of s.actions) {
    if (state.status !== 'ongoing') break;
    const rec = blankRecord(s.params, state.round, a);
    step(s.world, s.params, state, a, rec);
    records.push(rec);
  }
  return { state, records, history: records.map(toPublic), over: state.status !== 'ongoing' };
}
