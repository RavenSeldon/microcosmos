// Offensive-action comparison. All under the G1b threat rule, development seeds 1..300 (matched).
// No side effects: safe to import.
import { withParams } from '../src/params.ts';
import { range } from '../src/analysis.ts';
const SEEDS = range(1, 300);
const mk = (m: any) => withParams({ preemption: 'threat', strikeMode: m });
export const ALT = [
  { id: 'strike', label: 'STRIKE as it is (G1b rule)', seeds: SEEDS, params: withParams({ preemption: 'threat' }) },
  { id: 'jam', label: 'Interdiction (no water touched), judged like a strike', seeds: SEEDS, params: mk('jam') },
  { id: 'jam-soft', label: 'Interdiction, only the target resents it', seeds: SEEDS, params: mk('jam-soft') },
  { id: 'shield', label: 'SHIELD', seeds: SEEDS, params: mk('shield') },
  { id: 'reveal', label: 'REVEAL', seeds: SEEDS, params: mk('reveal') },
];
