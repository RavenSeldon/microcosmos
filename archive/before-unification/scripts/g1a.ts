// G1a runs. Baseline rules, unchanged. Writes out/g1a-dev.json, out/g1a-heldout.json and
// out/heldout-baseline.json (the legacy search-and-bot analysis repeated on the held-out range).
//
// Seed ranges:
//   development  1..500        (1..150 were used to choose the river calibration; all 500 were seen in G1)
//   held-out     100001..100500 (never run before G1a; after this run they are no longer untouched)
import { writeFileSync } from 'node:fs';
import { BASE } from '../src/params.ts';
import { analyseHarm } from '../src/harm.ts';
import { analyse, range } from '../src/analysis.ts';

export const DEV = range(1, 500);
export const HELDOUT = range(100001, 100500);
const out = (name: string, data: unknown) => writeFileSync(new URL(`../out/${name}.json`, import.meta.url), JSON.stringify(data, null, 2));

let t = Date.now();
out('g1a-dev', { suite: 'development', params: BASE, summary: analyseHarm(BASE, DEV) });
console.log(`g1a-dev: ${((Date.now() - t) / 1000).toFixed(0)}s`); t = Date.now();
out('g1a-heldout', { suite: 'held-out', params: BASE, summary: analyseHarm(BASE, HELDOUT) });
console.log(`g1a-heldout: ${((Date.now() - t) / 1000).toFixed(0)}s`); t = Date.now();
out('heldout-baseline', { id: 'heldout-baseline', label: 'Baseline rules on held-out seeds 100001-100500', params: BASE, summary: analyse(BASE, HELDOUT) });
console.log(`heldout-baseline: ${((Date.now() - t) / 1000).toFixed(0)}s`);
