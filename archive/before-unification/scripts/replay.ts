// Replay one seed, round by round, with the full hidden ledger.
//   node scripts/replay.ts 12 "SIGNAL A, HIDE, STRIKE C, HIDE, LISTEN B, HIDE"
//   node scripts/replay.ts 12 bot "informed mixed"
import { BASE } from '../src/params.ts';
import { makeWorld } from '../src/world.ts';
import { playSequence, actionName, HIDE } from '../src/engine.ts';
import { BOTS, playBot } from '../src/bots.ts';
import { solve } from '../src/search.ts';
import { LETTERS } from '../src/roster.ts';

const seed = Number(process.argv[2] ?? 1);
const w = makeWorld(seed, BASE);
const L = LETTERS;
function parse(txt: string): number[] {
  return txt.split(',').map((s) => s.trim().toUpperCase()).map((s) => {
    if (s === 'HIDE') return HIDE;
    const [verb, d] = s.split(/\s+/);
    const base = verb === 'LISTEN' ? 0 : verb === 'SIGNAL' ? 6 : verb === 'STRIKE' ? 12 : NaN;
    const a = base + L.indexOf(d);
    if (!Number.isInteger(a) || L.indexOf(d) < 0) throw new Error(`cannot read action "${s}"`);
    return a;
  });
}
const run = process.argv[3] === 'bot' ? playBot(w, BASE, BOTS[process.argv[4]]) : playSequence(w, BASE, parse(process.argv[3] ?? 'HIDE,HIDE,HIDE,HIDE,HIDE,HIDE'));
const sol = solve(w, BASE);

console.log(`seed ${seed} · river ${w.supply}/round · basin minimum ${BASE.basinMin}`);
console.log(`hidden families ${w.family.join(' ')} · starting reserves ${w.reserve0.join(' ')} · slot priority ${w.priority.map((d) => L[d]).join('')}`);
console.log(`search: ${sol.wins.toLocaleString()} of ${sol.total.toLocaleString()} sequences win · doing nothing ${sol.passiveWins ? 'wins' : 'loses'} · fewest strikes to win ${sol.minStrikes} · fewest signals ${sol.minSignals}\n`);
for (const r of run.records) {
  const head = r.round === 0 ? 'history' : `round ${r.round}: ${actionName(r.action)}`;
  const extra = r.listen ? ` -> need ${r.listen.need}, reserve ${r.listen.reserve}` : r.signalResp ? ` -> ${r.signalResp}` : '';
  console.log(`${head}${extra}`);
  for (const e of r.events) console.log(`   network: ${L[e.from]} ${e.type}s ${L[e.to]}${e.result ? ' (' + e.result + ')' : ''} [${e.reason}]`);
  if (r.attackers.length) console.log(`   station hit by ${r.attackers.map((d) => L[d]).join(', ')}`);
  console.log(`   took ${r.river.join(' ')} · need ${r.need.join(' ')} · unmet ${r.unmet.join(' ')} · reserves ${r.reserveAfter.join(' ')} · destroyed ${r.destroyed}`);
  console.log(`   basin flow ${r.flow}${r.flow < BASE.basinMin ? '  SHORT' : ''} · exposure ${r.exposure} · integrity ${r.integrity}`);
}
const status = 'final' in run ? run.status : run.won ? 'won' : 'lost';
console.log(`\nresult: ${status}${run.causes.length ? ' (' + run.causes.join(' + ') + ')' : ''}`);
