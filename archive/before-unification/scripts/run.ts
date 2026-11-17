// node scripts/run.ts <config id> [...more ids]      writes out/<id>.json
import { writeFileSync, mkdirSync } from 'node:fs';
import { CONFIGS } from './configs.ts';
import { analyse, range } from '../src/analysis.ts';

mkdirSync(new URL('../out/', import.meta.url), { recursive: true });
const ids = process.argv.slice(2);
for (const c of CONFIGS.filter((c) => ids.length === 0 || ids.includes(c.id))) {
  const t = Date.now();
  const summary = analyse(c.params, range(1, c.seeds));
  writeFileSync(new URL(`../out/${c.id}.json`, import.meta.url), JSON.stringify({ id: c.id, label: c.label, params: c.params, summary }, null, 2));
  console.log(`${c.id}: ${c.seeds} seeds in ${((Date.now() - t) / 1000).toFixed(0)}s`);
}
