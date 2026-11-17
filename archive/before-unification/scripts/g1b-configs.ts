// G1b configurations. No side effects: safe to import from the runner and the report builder.
import { BASE, withParams } from '../src/params.ts';
import { range } from '../src/analysis.ts';

const DEV = range(1, 500), HELDOUT = range(200001, 200500);
export const G1B = [
  { id: 'immediate-shared', label: 'Immediate preemption, one shared slot (v0.3 baseline)', seeds: DEV, params: BASE },
  { id: 'threat-shared', label: 'Conditional threat, one shared slot (G1b rule)', seeds: DEV, params: withParams({ preemption: 'threat' }) },
  { id: 'immediate-isolated', label: 'Immediate preemption, separate lanes (experiment)', seeds: DEV, params: withParams({ slots: 'isolated' }) },
  { id: 'threat-isolated', label: 'Conditional threat, separate lanes (experiment)', seeds: DEV, params: withParams({ preemption: 'threat', slots: 'isolated' }) },
  { id: 'threat-shared-heldout', label: 'Conditional threat, one shared slot, held-out seeds 200001-200500', seeds: HELDOUT, params: withParams({ preemption: 'threat' }) },
];
