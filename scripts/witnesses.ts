// Finds, for every kind of choice the game offers, a situation reached by play in which that choice
// leads to a strictly better journey than any other kind of choice (with the same sensible player
// finishing the journey each time). Writes test/witnesses.json; test/microcosmos.test.ts re-checks it.
// Run: node scripts/witnesses.ts
import { writeFileSync } from 'node:fs';
import { FIRST_ARENA as A } from '../src/arenas.ts';
import { newGame, advance } from '../src/microcosmos.ts';
import type { Choice, Game } from '../src/microcosmos.ts';
import { legal, sensible, finish, score, W } from './strategies.ts';
export const kindOf = (c: Choice) => c.type === 'ability' ? `ability:${W[c.world].id}` : c.type;
export function verdict(g: Game) {
  const res = legal(g).map(c => ({ c, v: score(finish(g, c)) })).sort((x, y) => y.v - x.v);
  const top = res[0], rival = res.find(r => kindOf(r.c) !== kindOf(top.c));
  return { choice: top.c, kind: kindOf(top.c), margin: rival ? top.v - rival.v : Infinity, rival: rival?.c };
}
if (import.meta.url === `file://${process.argv[1]}`) {
  const wanted = new Set(['rest', 'connect', 'release', 'care', 'mediate', ...W.map(w => `ability:${w.id}`)]), found: Record<string, unknown> = {};
  let x = 20261116; const r = () => { x ^= x << 13; x ^= x >>> 17; x ^= x << 5; return ((x >>> 0) % 1e6) / 1e6; };
  for (let game = 0; game < 900 && wanted.size; game++) {
    let g = newGame(A); const prefix: Choice[] = []; const wild = 0.15 + 0.6 * r();
    while (!g.outcome && wanted.size) {
      if (r() < 0.3) { const v = verdict(g); if (wanted.has(v.kind) && v.margin >= (v.kind === 'rest' ? 3 : 12)) { wanted.delete(v.kind); found[v.kind] = { prefix: [...prefix], choice: v.choice, margin: v.margin, rival: v.rival, moment: g.beat + 1 }; console.log('found', v.kind, 'at moment', g.beat + 1, 'margin', v.margin, '| left:', [...wanted].join(' ')); } }
      const L = legal(g), c = r() < wild ? L[Math.floor(r() * L.length)] : sensible(g); prefix.push(c); g = advance(g, c, A);
    }
  }
  writeFileSync(new URL('../test/witnesses.json', import.meta.url), JSON.stringify(found, null, 1));
  console.log(wanted.size ? `NOT FOUND: ${[...wanted].join(', ')}` : 'every kind of choice has a witness');
}
