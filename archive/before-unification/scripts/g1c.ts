// G1c: outcome alignment. Shared Dawn as the measured outcome, old STRIKE against refined STRIKE
// (network interdiction), under the G1b threat rule.
//   node scripts/g1c.ts dev | heldout      writes out/g1c-<suite>.json
// Development seeds 1..500. Fresh held-out seeds 300001..300500, first run here.
import { writeFileSync } from 'node:fs';
import { withParams } from '../src/params.ts';
import { makeWorld } from '../src/world.ts';
import { solveDawn } from '../src/search.ts';
import { ALT_BOTS } from '../src/bots.ts';
import { evaluateBot } from '../src/evaluate.ts';

const suite = process.argv[2] ?? 'dev';
const first = suite === 'heldout' ? 300001 : 1, n = 500;
const MODES = { 'old STRIKE': withParams({ preemption: 'threat' }), 'refined STRIKE': withParams({ preemption: 'threat', strikeMode: 'jam' }) };
const POLICIES = ['hide x6 (do nothing)', 'cooperate, hide when exposed', 'defuse by signal', 'informed mixed, no listen', 'defuse by strike', 'defuse: signal, else strike', 'protect when the basin is safe'];
const out: any = { suite, firstSeed: first, lastSeed: first + n - 1, modes: {} };
for (const [name, p] of Object.entries(MODES)) {
  const t = Date.now();
  const c = { survivable: 0, dawn: 0, thirdRequired: 0, signalRequired: 0, dawnOnlyBySurviving: 0 };
  const perSeed: Record<number, boolean[]> = {};
  for (let s = first; s < first + n; s++) {
    const r = solveDawn(makeWorld(s, p), p);
    if (r.survivable) c.survivable++;
    if (r.dawn) c.dawn++;
    if (r.dawn && !r.dawnWithoutThird) c.thirdRequired++;
    if (r.dawn && !r.dawnWithoutSignal) c.signalRequired++;
    if (r.survivable && !r.dawn) c.dawnOnlyBySurviving++;
  }
  const bots: any = {};
  for (const b of POLICIES) {
    let survive = 0, dawn = 0, lostBasin = 0, lostStation = 0, distress = 0, used = 0;
    perSeed[0] = [];
    const wins: boolean[] = [], dawns: boolean[] = [];
    for (let s = first; s < first + n; s++) {
      const ev = evaluateBot(makeWorld(s, p), p, ALT_BOTS[b]); const L = ev.ledger;
      const won = L.legacy.outcome === 'won', d = won && L.totals.distressRounds === 0;
      wins.push(won); dawns.push(d);
      if (won) survive++; if (d) dawn++;
      if (L.legacy.causes.includes('basin')) lostBasin++; if (L.legacy.causes.includes('station')) lostStation++;
      distress += L.totals.distressRounds; used += L.station.strikesByStation;
    }
    bots[b] = { survive: survive / n, sharedDawn: dawn / n, lostBasin: lostBasin / n, lostStation: lostStation / n, distressRounds: distress / n, thirdActionUsed: used / n, dawns };
  }
  // paired Shared Dawn differences against 'informed mixed, no listen'
  const ref = bots['informed mixed, no listen'].dawns as boolean[];
  for (const b of POLICIES) {
    const x = bots[b].dawns as boolean[]; let up = 0, down = 0;
    for (let i = 0; i < n; i++) { if (x[i] && !ref[i]) up++; if (!x[i] && ref[i]) down++; }
    const d = (up - down) / n, se = Math.sqrt(up + down - (up - down) ** 2 / n) / n;
    bots[b].dawnVsInformed = { diff: d, lo: d - 1.96 * se, hi: d + 1.96 * se };
    delete bots[b].dawns;
  }
  out.modes[name] = { search: Object.fromEntries(Object.entries(c).map(([k, v]) => [k, v / n])), bots };
  console.log(`${suite} ${name}: ${((Date.now() - t) / 1000).toFixed(0)}s`);
}
writeFileSync(new URL(`../out/g1c-${suite}.json`, import.meta.url), JSON.stringify(out, null, 2));
