// node scripts/alt.ts [ids...]   writes out/alt-<id>.json
import { writeFileSync } from 'node:fs';
import { analyse } from '../src/analysis.ts';
import { analyseConflict } from '../src/conflict.ts';
import { analyseHarm } from '../src/harm.ts';
import { ALT_BOTS } from '../src/bots.ts';
import { ALT } from './alt-configs.ts';
const ids = process.argv.slice(2);
for (const c of ALT.filter((c) => ids.length === 0 || ids.includes(c.id))) {
  const t = Date.now();
  writeFileSync(new URL(`../out/alt-${c.id}.json`, import.meta.url), JSON.stringify({
    id: c.id, label: c.label, params: c.params, firstSeed: 1, lastSeed: 300,
    summary: analyse(c.params, c.seeds, true, ALT_BOTS), conflict: analyseConflict(c.params, c.seeds, ALT_BOTS), harm: analyseHarm(c.params, c.seeds, ALT_BOTS),
  }, null, 2));
  console.log(`${c.id}: ${((Date.now() - t) / 1000).toFixed(0)}s`);
}
