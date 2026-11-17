// Builds out/tables.md from out/<config>.json. Every number in RESULTS.md comes from these tables.
import { readFileSync, writeFileSync, existsSync } from 'node:fs';

const MARK = '<!-- TABLES -->';
import { CONFIGS } from './configs.ts';

const pct = (x: number) => (100 * x).toFixed(1) + '%';
const load = (id: string) => JSON.parse(readFileSync(new URL(`../out/${id}.json`, import.meta.url), 'utf8'));
const have = CONFIGS.filter((c) => existsSync(new URL(`../out/${c.id}.json`, import.meta.url))).map((c) => ({ ...c, data: load(c.id) }));
const out: string[] = [];

out.push('### Table 1. Leverage: what the player can change, by configuration\n');
out.push('| Configuration | Seeds | Unwinnable | Doing nothing wins | Rescuable (doing nothing loses, some sequence wins) |');
out.push('|---|---:|---:|---:|---:|');
for (const c of have) { const k = c.data.summary.classes; out.push(`| ${c.label} | ${c.seeds} | ${pct(k.unwinnable)} | ${pct(k.passiveWins)} | ${pct(k.rescuable)} |`); }

out.push('\n### Table 2. Which actions the rescuable worlds need (full-knowledge search)\n');
out.push('| Configuration | Rescuable seeds | Winnable with no STRIKE | STRIKE required | Winnable with no SIGNAL | SIGNAL required | Mean share of all sequences that win |');
out.push('|---|---:|---:|---:|---:|---:|---:|');
for (const c of have) { const r = c.data.summary.amongRescuable; out.push(`| ${c.label} | ${r.n} | ${pct(r.winnableWithoutStrike)} | ${pct(r.strikeRequired)} | ${pct(r.winnableWithoutSignal)} | ${pct(r.signalRequired)} | ${pct(r.meanWinFraction)} |`); }

const base = have.find((c) => c.id === 'baseline');
if (base) {
  out.push(`\n### Table 3. Observation-limited bots at baseline (${base.seeds} seeds)\n`);
  out.push('| Bot | Wins, all seeds | Wins, rescuable seeds | Lost station | Lost basin | Lost district | Mean unmet need (units) | Mean strikes | Mean signals |');
  out.push('|---|---:|---:|---:|---:|---:|---:|---:|---:|');
  for (const [name, b] of Object.entries<any>(base.data.summary.bots)) {
    out.push(`| ${name} | ${pct(b.winRate)} | ${pct(b.winRateRescuable)} | ${pct(b.lossStation)} | ${pct(b.lossBasin)} | ${pct(b.lossDistrict)} | ${b.meanHarm.toFixed(2)} | ${b.meanStrikes.toFixed(2)} | ${b.meanSignals.toFixed(2)} |`);
  }
}

out.push('\n### Table 4. Bot win rate on rescuable seeds, by configuration\n');
const names = base ? Object.keys(base.data.summary.bots) : [];
out.push(`| Configuration | ${names.join(' | ')} |`);
out.push(`|---|${names.map(() => '---:').join('|')}|`);
for (const c of have) out.push(`| ${c.label} | ${names.map((n) => pct(c.data.summary.bots[n].winRateRescuable)).join(' | ')} |`);

out.push('\n### Table 5. Bot win rate on all seeds, by configuration\n');
out.push(`| Configuration | ${names.join(' | ')} |`);
out.push(`|---|${names.map(() => '---:').join('|')}|`);
for (const c of have) out.push(`| ${c.label} | ${names.map((n) => pct(c.data.summary.bots[n].winRate)).join(' | ')} |`);

out.push('\n### Table 7. Fewest SIGNALs or STRIKEs in any winning line, rescuable seeds (full-knowledge search)\n');
out.push('| Configuration | One | Two | Three | Four or more |');
out.push('|---|---:|---:|---:|---:|');
for (const c of have) out.push(`| ${c.label} | ${c.data.summary.amongRescuable.minActive.map(pct).join(' | ')} |`);

out.push('\n### Table 6. How often each bot loses a district to deprivation, by configuration\n');
out.push(`| Configuration | ${names.join(' | ')} |`);
out.push(`|---|${names.map(() => '---:').join('|')}|`);
for (const c of have) out.push(`| ${c.label} | ${names.map((n) => pct(c.data.summary.bots[n].lossDistrict)).join(' | ')} |`);

writeFileSync(new URL('../out/tables.md', import.meta.url), out.join('\n') + '\n');
// Refresh the generated section of RESULTS.md so its tables can never drift from out/*.json.
const resultsUrl = new URL('../RESULTS.md', import.meta.url);
if (existsSync(resultsUrl)) {
  const txt = readFileSync(resultsUrl, 'utf8');
  const at = txt.indexOf(MARK);
  if (at >= 0) writeFileSync(resultsUrl, txt.slice(0, at + MARK.length) + '\n\n' + out.join('\n') + '\n');
}
console.log(`wrote out/tables.md from ${have.length} of ${CONFIGS.length} configurations`);
