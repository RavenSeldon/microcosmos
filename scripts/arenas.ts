// For every registered arena, finds a line of play that reaches a shared dawn (beam search: it shows
// that a line exists, not that it is the best one) and writes it to test/arena-journeys.json, which
// test/arenas.test.ts replays. Re-run after changing any arena's numbers: node scripts/arenas.ts
import { writeFileSync } from 'node:fs';
import { ARENAS } from '../src/arenas.ts';
import type { ArenaDef } from '../src/arenas.ts';
import { newGame, advance, unavailable, pairs, strainLine } from '../src/microcosmos.ts';
import type { Choice, Game } from '../src/microcosmos.ts';
const sum = (x: number[]) => x.reduce((a, b) => a + b, 0);
export function legalIn(g: Game, A: ArenaDef): Choice[] {
  const out: Choice[] = [{ type: 'rest' }, { type: 'mediate' }];
  pairs(A).forEach((_, e) => out.push({ type: 'connect', edge: e }, { type: 'release', edge: e }));
  A.worlds.forEach((w, d) => { out.push({ type: 'care', world: d }); if (w.archetype === 'prism') A.worlds.forEach((_, t) => { if (t !== d) out.push({ type: 'ability', world: d, target: t }); }); else out.push({ type: 'ability', world: d }); });
  return out.filter(c => !unavailable(g, c, A));
}
export function dawnLine(A: ArenaDef, width = 120): Choice[] | null {
  type N = { g: Game; cs: Choice[]; u: number; sp: number; dm: number; ac: number };
  const tier = (o: string | null) => o === 'dawn' ? 2 : o === 'peace' ? 1 : 0;
  const val = (x: N) => (x.g.outcome ? tier(x.g.outcome) * 1000 - (x.g.outcome === 'night' ? 500 : 0) : 1000) - x.u * 12 - x.sp * 6 - x.dm * 25 - x.ac * 3
    - sum(A.worlds.map((_, d) => Math.max(0, x.g.used[d] - strainLine(d, A) + 2))) * 3;
  let beam: N[] = [{ g: newGame(A), cs: [], u: 0, sp: 0, dm: 0, ac: 0 }]; const done: N[] = [];
  for (let t = 0; t < A.length && beam.length; t++) {
    const next: N[] = [];
    for (const x of beam) for (const c of legalIn(x.g, A)) {
      const g = advance(x.g, c, A);
      const y = { g, cs: [...x.cs, c], u: x.u + sum(g.last!.unmet), sp: x.sp + g.last!.spilled, dm: x.dm + g.dormant.filter(Boolean).length, ac: x.ac + (c.type === 'rest' ? 0 : 1) };
      (g.outcome ? done : next).push(y);
    }
    next.sort((p, q) => val(q) - val(p)); beam = next.slice(0, width);
  }
  done.sort((p, q) => val(q) - val(p));
  return done[0]?.g.outcome === 'dawn' ? done[0].cs : null;
}
if (import.meta.url === `file://${process.argv[1]}`) {
  const out: Record<string, { version: number; actions: Choice[] }> = {};
  for (const A of ARENAS) { const cs = dawnLine(A); if (!cs) throw new Error(`no dawn found in ${A.id}`); out[A.id] = { version: A.version, actions: cs }; console.log(A.id, 'dawn in', cs.filter(c => c.type !== 'rest').length, 'choices'); }
  writeFileSync(new URL('../test/arena-journeys.json', import.meta.url), JSON.stringify(out, null, 1));
}
