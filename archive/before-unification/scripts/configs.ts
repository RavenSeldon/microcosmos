import { BASE, withParams } from '../src/params.ts';
import type { Params } from '../src/params.ts';

// One change at a time against the baseline. `seeds` is the suite size for that run.
export const CONFIGS: { id: string; label: string; seeds: number; params: Params }[] = [
  { id: 'baseline', label: 'Baseline (v0.3 numbers, consecutive rule)', seeds: 500, params: BASE },
  { id: 'cumulative', label: 'Basin fails on cumulative deficit (buffer 6)', seeds: 300, params: withParams({ failure: { basinRule: 'cumulative' } }) },
  { id: 'cumulative3', label: 'Cumulative deficit, buffer 3', seeds: 300, params: withParams({ failure: { basinRule: 'cumulative', basinBuffer: 3 } }) },
  { id: 'hub', label: 'No district-to-district events (hub only)', seeds: 300, params: withParams({ autonomous: false }) },
  { id: 'mix-coop', label: 'Family mix 60 / 25 / 15 (R / E / P)', seeds: 300, params: withParams({ mix: { R: 0.6, E: 0.25, P: 0.15 } }) },
  { id: 'mix-hostile', label: 'Family mix 20 / 40 / 40 (R / E / P)', seeds: 300, params: withParams({ mix: { R: 0.2, E: 0.4, P: 0.4 } }) },
  { id: 'scarcer', label: 'River one unit scarcer (slack -2)', seeds: 300, params: withParams({ slack: -2 }) },
  { id: 'looser', label: 'River one unit looser (slack 0)', seeds: 300, params: withParams({ slack: 0 }) },
  { id: 'fixed60', label: 'Fixed river of 60 for every world (uncalibrated)', seeds: 300, params: withParams({ supplyMode: 'fixed', supply: 60 }) },
];
