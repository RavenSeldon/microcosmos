// G1b runs: the conditional threat, and the network-slot isolation experiment.
//   node scripts/g1b.ts [ids...]     writes out/g1b-<id>.json
//
// 2 x 2 on development seeds 1..500:
//   preemption  immediate (v0.3 baseline)  |  threat (G1b rule, adopted)
//   slots       shared (v0.3: one network event per round)  |  isolated (experiment only)
// plus the G1b rule on a fresh held-out range, 200001..200500, never run before G1b.
import { writeFileSync } from 'node:fs';
import { analyse } from '../src/analysis.ts';
import { G1B } from './g1b-configs.ts';
import { analyseConflict } from '../src/conflict.ts';
import { analyseHarm } from '../src/harm.ts';
import { THREAT_BOTS } from '../src/bots.ts';

const ids = process.argv.slice(2);
for (const c of G1B.filter((c) => ids.length === 0 || ids.includes(c.id))) {
  const t = Date.now();
  const data = {
    id: c.id, label: c.label, params: c.params, firstSeed: c.seeds[0], lastSeed: c.seeds[c.seeds.length - 1],
    summary: analyse(c.params, c.seeds, true, THREAT_BOTS),
    conflict: analyseConflict(c.params, c.seeds, THREAT_BOTS),
    harm: analyseHarm(c.params, c.seeds, THREAT_BOTS),
  };
  writeFileSync(new URL(`../out/g1b-${c.id}.json`, import.meta.url), JSON.stringify(data, null, 2));
  console.log(`${c.id}: ${c.seeds.length} seeds in ${((Date.now() - t) / 1000).toFixed(0)}s`);
}
