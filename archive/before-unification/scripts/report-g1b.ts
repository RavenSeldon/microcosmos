// Builds out/g1b-tables.md and refreshes the table section of RESULTS-G1B.md.
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { G1B } from './g1b-configs.ts';

const MARK = '<!-- TABLES -->';
const load = (id: string) => JSON.parse(readFileSync(new URL(`../out/g1b-${id}.json`, import.meta.url), 'utf8'));
const have = G1B.filter((c) => existsSync(new URL(`../out/g1b-${c.id}.json`, import.meta.url))).map((c) => ({ ...c, d: load(c.id) }));
const pct = (x: number) => (100 * x).toFixed(1) + '%';
const f2 = (x: number) => x.toFixed(2);
const out: string[] = [];

out.push('### Table 1. Leverage regression (full-knowledge search)\n');
out.push('| Configuration | Unwinnable | Doing nothing wins | Rescuable | STRIKE required | Winnable with no SIGNAL | One move suffices |');
out.push('|---|---:|---:|---:|---:|---:|---:|');
for (const c of have) { const s = c.d.summary; out.push(`| ${c.label} | ${pct(s.classes.unwinnable)} | ${pct(s.classes.passiveWins)} | ${pct(s.classes.rescuable)} | ${pct(s.amongRescuable.strikeRequired)} | ${pct(s.amongRescuable.winnableWithoutSignal)} | ${pct(s.amongRescuable.minActive[0])} |`); }

const POL = ['hide x6 (do nothing)', 'cooperate, hide when exposed', 'defuse by signal', 'defuse by strike', 'defuse: signal, else strike', 'guard: strike threats only', 'informed mixed, no listen', 'alternate strike'];
for (const c of have) {
  out.push(`\n### Table 2. Network conflict per world over six rounds — ${c.label}\n`);
  out.push('| Policy | Legacy wins | Threats | Executed | Cancelled | Interrupted | Still pending | Retaliation | Provoked | Unwarned | All district strikes | Worlds with none | Station strikes | Water destroyed | District hardship | Basin harm | Station damage |');
  out.push('|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|');
  for (const n of POL) { const b = c.d.conflict[n], m = b.mean; out.push(`| ${n} | ${pct(b.legacyWinRate)} | ${f2(m.threatsIssued)} | ${f2(m.executed)} | ${f2(m.cancelled)} | ${f2(m.interrupted)} | ${f2(m.threatOutstanding)} | ${f2(m.retaliation)} | ${f2(m.provoked)} | ${f2(m.unprovoked)} | ${f2(m.strikes)} | ${pct(b.worldsWithNoStrike)} | ${f2(m.stationStrikes)} | ${f2(m.destroyed)} | ${f2(m.hardship)} | ${f2(m.basinHarm)} | ${f2(m.stationDamage)} |`); }
}

out.push('\n### Table 3. Bot win rate on rescuable worlds\n');
const names = Object.keys(have[0].d.summary.bots);
out.push(`| Configuration | ${names.join(' | ')} |`);
out.push(`|---|${names.map(() => '---:').join('|')}|`);
for (const c of have) out.push(`| ${c.label} | ${names.map((n) => pct(c.d.summary.bots[n].winRateRescuable)).join(' | ')} |`);

out.push('\n### Table 4. Cooperation against doing nothing in the same world, 95% intervals\n');
out.push('| Configuration | Policy | District hardship | Basin harm | Stored water | Water destroyed |');
out.push('|---|---|---:|---:|---:|---:|');
const sgn = (x: number) => (x >= 0 ? '+' : '−') + Math.abs(x).toFixed(2);
const iv = (v: any) => `${sgn(v.diff)} (${sgn(v.lo)} to ${sgn(v.hi)})`;
for (const c of have) for (const n of ['cooperate, hide when exposed', 'defuse by signal', 'defuse by strike']) { const v = c.d.harm.bots[n].vsNothing; out.push(`| ${c.label} | ${n} | ${iv(v.hardship)} | ${iv(v.basinHarm)} | ${iv(v.reserveChange)} | ${iv(v.destroyed)} |`); }

const text = out.join('\n') + '\n';
writeFileSync(new URL('../out/g1b-tables.md', import.meta.url), text);
const url = new URL('../RESULTS-G1B.md', import.meta.url);
if (existsSync(url)) { const t = readFileSync(url, 'utf8'); const at = t.indexOf(MARK); if (at >= 0) writeFileSync(url, t.slice(0, at + MARK.length) + '\n\n' + text); }
console.log(`wrote out/g1b-tables.md from ${have.length} of ${G1B.length} runs`);
