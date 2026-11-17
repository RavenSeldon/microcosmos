// Builds out/g1a-tables.md and refreshes the table section of RESULTS-G1A.md.
import { readFileSync, writeFileSync, existsSync } from 'node:fs';

const MARK = '<!-- TABLES -->';
const load = (n: string) => JSON.parse(readFileSync(new URL(`../out/${n}.json`, import.meta.url), 'utf8'));
const dev = load('g1a-dev').summary, held = load('g1a-heldout').summary;
const base = load('baseline').summary, heldBase = load('heldout-baseline').summary;
const pct = (x: number) => (100 * x).toFixed(1) + '%';
const f2 = (x: number) => x.toFixed(2);
const sgn = (x: number) => (x >= 0 ? '+' : '−') + Math.abs(x).toFixed(2);
const iv = (v: { diff: number; lo: number; hi: number }) => `${sgn(v.diff)} (${sgn(v.lo)} to ${sgn(v.hi)})`;
const out: string[] = [];
const names = Object.keys(dev.bots);

for (const [label, S] of [['development seeds 1–500', dev], ['held-out seeds 100001–100500', held]] as const) {
  out.push(`### Table A. Consequences over a fixed six rounds, per world (${label})\n`);
  out.push('| Policy | Legacy wins | Game ends at round | District hardship | Basin harm | Water destroyed | Reserve change | Districts ending empty | Station damage |');
  out.push('|---|---:|---:|---:|---:|---:|---:|---:|---:|');
  for (const n of names) { const b = S.bots[n]; out.push(`| ${n} | ${pct(b.legacyWinRate)} | ${f2(b.meanEndedRound)} | ${f2(b.mean.hardship)} | ${f2(b.mean.basinHarm)} | ${f2(b.mean.destroyed)} | ${sgn(b.mean.reserveChange)} | ${f2(b.mean.emptyReserves)} | ${f2(b.mean.stationDamage)} |`); }

  out.push(`\n### Table B. Difference from doing nothing in the same world, with 95% intervals (${label})\n`);
  out.push('| Policy | District hardship | Basin harm | Reserve change | Districts ending empty | Water destroyed |');
  out.push('|---|---:|---:|---:|---:|---:|');
  for (const n of names.filter((n) => !n.startsWith('hide'))) { const v = S.bots[n].vsNothing; out.push(`| ${n} | ${iv(v.hardship)} | ${iv(v.basinHarm)} | ${iv(v.reserveChange)} | ${iv(v.emptyReserves)} | ${iv(v.destroyed)} |`); }

  out.push(`\n### Table C. How reserves were used, and what is still owed after round six (${label})\n`);
  out.push('| Policy | Drawn under agreements | Drawn in emergencies | Catch-up still owed | Agreement rounds still owed | Reserve those rounds can still draw |');
  out.push('|---|---:|---:|---:|---:|---:|');
  for (const n of names) { const m = S.bots[n].mean; out.push(`| ${n} | ${f2(m.agreementDraw)} | ${f2(m.emergencyDraw)} | ${f2(m.catchupOutstanding)} | ${f2(m.agreementRoundsOutstanding)} | ${f2(m.agreementDrawCommitted)} |`); }

  out.push(`\n### Table D. What a legacy win contains (${label})\n`);
  out.push('| Policy | Wins | With any unmet need | With a district ending empty | With obligations still owed | Mean hardship | Mean basin harm | Mean reserve change |');
  out.push('|---|---:|---:|---:|---:|---:|---:|---:|');
  for (const n of names) { const w = S.bots[n].wins; out.push(`| ${n} | ${Math.round(w.n * 10) / 10} | ${pct(w.shareWithHardship)} | ${pct(w.shareWithEmptyReserve)} | ${pct(w.shareWithObligations)} | ${f2(w.mean.hardship)} | ${f2(w.mean.basinHarm)} | ${sgn(w.mean.reserveChange)} |`); }
  out.push('');
}

out.push('### Table E. Do the G1 baseline results replicate on held-out seeds?\n');
out.push('| Measure | Development 1–500 | Held-out 100001–100500 |');
out.push('|---|---:|---:|');
const row = (l: string, a: number, b: number) => out.push(`| ${l} | ${pct(a)} | ${pct(b)} |`);
row('Unwinnable', base.classes.unwinnable, heldBase.classes.unwinnable);
row('Doing nothing wins', base.classes.passiveWins, heldBase.classes.passiveWins);
row('Rescuable', base.classes.rescuable, heldBase.classes.rescuable);
row('Rescuable: STRIKE required', base.amongRescuable.strikeRequired, heldBase.amongRescuable.strikeRequired);
row('Rescuable: winnable with no SIGNAL', base.amongRescuable.winnableWithoutSignal, heldBase.amongRescuable.winnableWithoutSignal);
row('Rescuable: one move suffices', base.amongRescuable.minActive[0], heldBase.amongRescuable.minActive[0]);
for (const n of Object.keys(base.bots)) row(`Bot wins, rescuable: ${n}`, base.bots[n].winRateRescuable, heldBase.bots[n].winRateRescuable);

const text = out.join('\n') + '\n';
writeFileSync(new URL('../out/g1a-tables.md', import.meta.url), text);
const url = new URL('../RESULTS-G1A.md', import.meta.url);
if (existsSync(url)) { const t = readFileSync(url, 'utf8'); const at = t.indexOf(MARK); if (at >= 0) writeFileSync(url, t.slice(0, at + MARK.length) + '\n\n' + text); }
console.log('wrote out/g1a-tables.md');
